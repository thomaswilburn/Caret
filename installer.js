/*
For right now, run upgrades each time the background page reloads, just to be safe.

chrome.runtime.onInstalled.addListener(function(e) {
  //this is where we'll track upgrades
  if (!e.previousVersion) return;
  
  var semver = e.previousVersion.split(".");
  var major = semver[0];
  var minor = semver[1];
  var build = semver[2];
  
  console.log("Upgrading Caret from version " + e.previousVersion);
*/
  
  /*
  
  As with Android database upgrades, we'll perform these as a series of if statements, ordered by increasing
  version number. We should also provide a notification that the system is upgrading, and prevent opening new
  windows until the process finishes. In theory, this script shares a document with background.js, so they can
  just use a common flag to halt the openWindow process during upgrades.
  
  */

  //upgrade object tracks async upgrade processes, and handles notifications
  var upgrade = {
    count: 0,
    notification: true,
    openWhenComplete: false,
    errorURL: null,
    openWindow_: null,
    noop: function() {},
    start: function() {
      this.count++;
      if (!this.notification) {
        chrome.notifications.create("caret:upgrading", {
          type: "basic",
          iconUrl: "icon-128.png",
          title: "Caret: Upgrading...",
          message: "Please wait while Caret upgrades its background files."
        }, function(id) {
          this.notification = id;
        });
        this.notification = true;
      }
      if (pending) {
        clearTimeout(pending);
        this.openWhenComplete = true;
      }
      this.openWindow_ = openWindow;
      openWindow = function() {
        upgrade.openWhenComplete = true;
      }
    },
    finish: function() {
      this.count--;
      if (this.count <= 0) {
        chrome.notifications.clear("caret:upgrading", upgrade.noop);
        openWindow = upgrade.openWindow_;
        if (upgrade.openWhenComplete) {
          openWindow();
          upgrade.openWhenComplete = false;
        }
      }
    },
    fail: function(url) {
      upgrade.errorURL = url;
      chrome.notifications.create("caret:upgrade-error", {
        type: "basic",
        iconUrl: "icon-128.png",
        title: "Upgrade was unsuccessful",
        message: "Part of the Caret upgrade was unsuccessful. Click here for more information.",
        isClickable: true
      }, upgrade.noop);
      chrome.notifications.onClicked.addListener(function(id) {
        if (id == "caret:upgrade-error") {
          window.open(upgrade.errorURL, "_blank");
        }
      })
      this.finish();
    }
  };

  //start backing up settings to syncFileSystem
  //currently not gated on version
  if (true) {
    upgrade.start();
    console.log("Upgrade: migrating settings from storage to syncFileSystem");
    chrome.storage.sync.get(function(sync) {
      var saved = {};
      var check = function() {
        for (var name in sync) {
          if (!(name in saved)) {
            return;
          }
        }
        upgrade.finish();
      }
      chrome.syncFileSystem.requestFileSystem(function(fs) {
        if (!fs) {
          return upgrade.fail("https://gist.github.com/thomaswilburn/7773707");
        }
        window.fs = fs;
        var root = fs.root;
        for (var name in sync) {
          root.getFile(name, {create: true}, function(f) {
            f.createWriter(function(writer) {
              writer.onwriteend = function() {
                writer.onwriteend = function() {
                  saved[f.name] = f;
                  check();
                };
                writer.write(new Blob([sync[name]]));
              };
              writer.truncate(0);
            });
          }, function() {
            upgrade.fail("https://gist.github.com/thomaswilburn/7773707");
          });
        }
      });
    });
  }
  
/*
});
*/