chrome.runtime.onInstalled.addListener(function(e) {
  //this is where we'll track upgrades
  if (!e.previousVersion) return;
  
  var semver = e.previousVersion.split(".");
  var major = semver[0];
  var minor = semver[1];
  var build = semver[2];
  
  /*
  
  As with Android database upgrades, we'll perform these as a series of if statements, ordered by increasing
  version number. We should also provide a notification that the system is upgrading, and prevent opening new
  windows until the process finishes. In theory, this script shares a document with background.js, so they can
  just use a common flag to halt the openWindow process during upgrades.
  
  */

  var process = {
    count: 0,
    notification: null,
    openWhenComplete: false,
    errorURL: null,
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
    },
    finish: function() {
      this.count--;
      if (this.count <= 0) {
        chrome.notifications.clear("caret:upgrading", process.noop);
      }
    },
    fail: function(url) {
      process.errorURL = url;
      chrome.notifications.create("caret:upgrade-error", {
        type: "basic",
        iconUrl: "icon-128.png",
        title: "Upgrade was unsuccessful",
        message: "Part of the Caret upgrade process was unsuccessful. Click here for more information.",
        isClickable: true
      }, process.noop);
      chrome.notifications.onClicked.addListener(function(id) {
        if (id == "caret:upgrade-error") {
          window.open(process.errorURL);
        }
      })
      this.finish();
    }
  };

  //start backing up settings to syncFileSystem
  if (true) {
    process.start();
    chrome.storage.sync.get(function(sync) {
      var saved = {};
      var check = function() {
        for (var name in sync) {
          if (!(name in saved)) {
            return;
          }
        }
        process.finish();
      }
      chrome.syncFileSystem.requestFileSystem(function(fs) {
        if (!fs) {
          return process.fail("http://example.com");
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
            process.fail("http://example.com");
          });
        }
      });
    });
  }
  
});