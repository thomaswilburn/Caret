define([
    "sessions", 
    "file", 
    "dialog", 
    "command",
    "settings!" //not excited, it just runs as a RequireJS plugin
  ], function(sessions, File, dialog, command, Settings) {

    
  var openFile = function() {
    var f = new File();
    f.open(function(err) {
      if (err) {
        return dialog(err);
      }
      f.read(function(err, data) {
        if (err) {
          dialog(err);
          return;
        }
        sessions.addFile(data, f);
      });
    });
  };
  
  var openFromLaunchData = function() {
    if (window.launchData && window.launchData.items) {
      window.launchData.items.forEach(function(file) {
        var f = new File();
        f.entry = file.entry;
        f.read(function(err, contents) {
          if (err) {
            dialog(err);
            return;
          }
          sessions.addFile(contents, f);
        });
      });
    }
  };
  
  command.on("session:new-file", function() { sessions.addFile() });
  command.on("session:open-file", openFile);
  command.on("session:save-file", function() { sessions.getCurrent().save() });
  command.on("session:save-file-as", function() { sessions.getCurrent().save(true) });
  
  command.on("session:revert-file", function() {
    var tab = sessions.getCurrent();
    if (!tab.file) return;
    tab.file.read(function(err, data) {
      if (err) return;
      tab.setValue(data);
      tab.modified = false;
      sessions.renderTabs();
    });
  });
  
  command.on("session:check-file", function() {
    var tab = sessions.getCurrent();
    if (!tab.file || tab.file.virtual) return;
    tab.file.entry.file(function(entry) {
      if (tab.modifiedAt && entry.lastModifiedDate > tab.modifiedAt) {
        if (tab.modified) {
          dialog(
            "This file has been modified since the last time it was saved. Would you like to reload?",
            [{label: "Reload", value: true}, {label: "Cancel", value: false, focus: true}],
            function(confirmed) {
              if (confirmed) {
                command.fire("session:revert-file");
              } else {
                tab.modifiedAt = new Date();
              }
            }
          );
        } else {
          command.fire("session:revert-file");
        }
      }
    });
  });
  
  command.on("session:open-settings-file", function(name) {
    Settings.load(name, function() {
      var data = Settings.getAsString(name);
      var file = Settings.getAsFile(name);
      sessions.addFile(data, file);
    });
  });
  
  //defaults don't get loaded as files, just as content
  command.on("session:open-settings-defaults", function(name) {
    sessions.addDefaultsFile(name);
  });
  
  command.on("session:open-launch", openFromLaunchData);
  
  var init = function() {
    openFromLaunchData();
    chrome.storage.local.get("retained", function(data) {
      var failures = [];
      if (data.retained && data.retained.length) {
        data.retained.forEach(function(id) {
          var file = new File();
          file.restore(id, function(err, f) {
            if (err) {
              //add failures to be removed asynchronously
              failures.push(id);
              return;
            }
            file.read(function(err, contents) {
              if (err) return;
              sessions.addFile(contents, file);
            });
            return id;
          });
        });
      }
      //after a reasonable delay, filter failures out of retention
      setTimeout(function() {
        chrome.storage.local.get("retained", function(data) {
          if (!data.retained) return;
          chrome.storage.local.set({
            retained: data.retained.filter(function(d) { return failures.indexOf(d) == -1 })
          });
        });
      }, 500);
    });
  };
  
  command.on("init:startup", init);

});