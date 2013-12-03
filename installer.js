//chrome.runtime.onInstalled.addListener(function(e) {
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
    start: function() {
      this.count++;
      //show notification while upgrading
    },
    finish: function() {
      this.count--;
      if (this.count == 0) {
        console.log("All upgrades complete");
        //hide notification when all processes finish.
        //if a window open request was filed, call openWindow and clear the flag
        //can use timeout as the flag, if we want, but should probably rename as pending
      }
    }
  };

  //start backing up settings to syncFileSystem
  if (true) {
    process.start();
    chrome.storage.sync.get(function(sync) {
      var saved = {};
      var check = function() {
        for (var name in sync) {
          console.log(name);
          if (!(name in saved)) {
            return;
          }
        }
        process.finish();
      }
      chrome.syncFileSystem.requestFileSystem(function(fs) {
        window.fs = fs;
        var root = fs.root;
        for (var name in sync) {
          root.getFile(name, {create: true}, function(f) {
            f.createWriter(function(writer) {
              writer.onwriteend = function() {
                writer.onwriteend = check;
                writer.write(new Blob([sync[name]]));
              };
              writer.truncate(0);
            });
          }, function() {
            process.fail("http://example.com");
          };
        }
      });
    });
  }
  
//});