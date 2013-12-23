define([
    "sessions",
    "storage/file",
    "ui/dialog",
    "command",
    "settings!", //not excited, it just runs as a RequireJS plugin,
    "util/manos"
  ], function(sessions, File, dialog, command, Settings, M) {

  var openFile = function() {
    //have to call chooseEntry manually to support multiple files
    var args = {
      type: "openWritableFile"
    };
    if (chrome.version >= 30) {
      args.acceptsMultiple = true;
    }
    chrome.fileSystem.chooseEntry(args, function(files) {
      //annoying array function test, since it's not apparently a real array
      if (!files.slice) {
        files = [ files ];
      };
      files.forEach(function(entry) {
        var f = new File(entry);
        f.read().then(function(data) {
          sessions.addFile(data, f);
        }, dialog);
      });
    });
  };
  
  var openFromLaunchData = function() {
    if (window.launchData) {
      window.launchData.forEach(function(file) {
        var f = new File(file.entry);
        f.read().then(function(contents) {
          sessions.addFile(contents, f);
        }, dialog);
      });
    }
  };
  
  command.on("session:new-file", function(content) { return sessions.addFile(content) });
  command.on("session:open-file", openFile);
  command.on("session:save-file", function(c) { return sessions.getCurrent().save(c) });
  command.on("session:save-file-as", function(c) { 
    var tab = sessions.getCurrent();
    tab.save(true, function() {
      sessions.setSyntax(tab);
      if (c) c();
    });
  });
  
  command.on("session:revert-file", function(c) {
    var tab = sessions.getCurrent();
    if (!tab.file) return;
    tab.file.read().then(function(data) {
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
        //try to restore items in order
        M.map(
          data.retained,
          function(id, i, c) {
            var file = new File();
            file
              .restore(id)
              .then(file.read.bind(file))
              .then(function(data) {
                c({
                  value: data,
                  file: file
                })
              }, function(err) {
                failures.push(id);
              });
          },
          function(restored) {
            restored = restored.filter(function(d) { return d });
            for (var i = 0; i < restored.length; i++) {
              var tab = restored[i];
              console.log(tab.file);
              sessions.addFile(tab.value, tab.file);
            }
            if (!failures.length) return;
            chrome.storage.local.get("retained", function(data) {
              if (!data.retained) return;
              chrome.storage.local.set({
                retained: data.retained.filter(function(d) { return failures.indexOf(d) == -1 })
              });
            });
          }
        );
      }
    });
  };
  
  var reset = function() {
    var tabs = sessions.getAllTabs();
    tabs.forEach(function(tab) {
      if (tab.file && tab.file.virtual) {
        var setting = tab.fileName.replace(".json", "");
        Settings.load(setting, function() {
          var value = Settings.getAsString(setting);
          tab.setValue(value);
          tab.modified = false;
          sessions.renderTabs();
        });
      }
    });
  };
  
  command.on("init:startup", init);
  command.on("init:restart", reset);

});