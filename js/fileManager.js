define([
    "sessions",
    "storage/file",
    "ui/dialog",
    "command",
    "storage/settingsProvider",
    "util/manos",
    "ui/projectManager"
  ], function(sessions, File, dialog, command, Settings, M, projectManager) {

  var openFile = function(c) {
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
      }
      files.map(function(entry) {
        var f = new File(entry);
        return f.read().then(function(data) {
          sessions.addFile(data, f);
        }, dialog);
      });
      Promise.all(files).then(c);
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

  var openFromDropEvent = function(items) {
    [].forEach.call(items, function(entry){
      //only process files
      if (entry.kind !== "file") return;
      entry = entry.webkitGetAsEntry();

      //files get opened in a tab
      if (entry.isFile) {
        var f = new File(entry);
        return f.read().then(function(data) {
          sessions.addFile(data, f);
        }, dialog);
      //directories get added to project
      } else if (entry.isDirectory) {
        projectManager.insertDirectory(entry);
      }
    });
  };

  document.body.on("dragover", function(e) {
    e.preventDefault();
  });

  document.body.on("drop", function(e) {
    e.preventDefault();
    if (e.dataTransfer.types.indexOf("Files") === -1) return;
    command.fire("session:open-dragdrop", e.dataTransfer.items);
  });
  
  command.on("session:open-dragdrop", openFromDropEvent);

  command.on("session:new-file", function(content) { return sessions.addFile(content) });
  command.on("session:open-file", openFile);
  command.on("session:save-file", function(c) { sessions.getCurrent().save(c) });
  command.on("session:save-file-as", function(c) { 
    var tab = sessions.getCurrent();
    tab.save(true).then(function() {
      var mode = tab.detectSyntax();
      sessions.renderTabs();
      command.fire("session:syntax", mode);
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
      c();
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
  
  command.on("session:open-settings-file", function(name, c) {
    Settings.load(name, function() {
      var data = Settings.getAsString(name);
      var file = Settings.getAsFile(name);
      sessions.addFile(data, file);
      if (c) c();
    });
  });
  
  //defaults don't get loaded as files, just as content
  command.on("session:open-settings-defaults", function(name, c) {
    sessions.addDefaultsFile(name);
    if (c) c();
  });
  
  command.on("session:open-launch", openFromLaunchData);
  
  var init = function(complete) {
    openFromLaunchData();
    Settings.pull("user").then(function(data) {
      if (data.user.disableTabRestore) complete("fileManager");
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
                  });
                }, function(err) {
                  failures.push(id);
                  c(null);
                });
            },
            function(restored) {
              restored = restored.filter(function(d) { return d });
              for (var i = 0; i < restored.length; i++) {
                var tab = restored[i];
                sessions.addFile(tab.value, tab.file);
              }
              complete("fileManager");
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
    });
  };
  
  var reset = function() {
    var tabs = sessions.getAllTabs();
    var virtuals = [];
    tabs.forEach(function(tab) {
      if (tab.file && tab.file.virtual) {
        var v = tab.file.read().then(function(data) {
          tab.setValue(data);
          tab.modified = false;
        });
        virtuals.push(v);
      }
    });
    Promise.all(virtuals).then(function() {
      setTimeout(sessions.renderTabs, 10);
    });
  };
  
  command.on("init:startup", init);
  command.on("init:restart", reset);

});