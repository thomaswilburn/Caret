define([
    "sessions",
    "editor",
    "storage/file",
    "ui/dialog",
    "command",
    "storage/settingsProvider",
    "util/manos",
    "storage/nullfile",
    "util/i18n",
    //these next modules are self-contained
    "sessions/dragdrop",
    "sessions/autosave"
  ], function(sessions, editor, File, dialog, command, Settings, M, NullFile, i18n) {
    
  /*
  FileManager splits out the session code that specifically deals with I/O.
  Pretty much the whole file is just bindings to various commands.
  
  Now that session.js is refactored, this could probably move into a submodule,
  except that it gets loaded explicitly on startup.
  */

  command.on("session:new-file", function(content) { return sessions.addFile(content) });
  
  command.on("session:open-file", function(c) {
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
        return f.read(function(err, data) {
          sessions.addFile(data, f);
        });
      });
      Promise.all(files).then(c);
    });
  });
  
  command.on("session:save-file", function(c) {
    sessions.getCurrent()
      .save(c)
      .then(function() {
        command.fire("session:syntax");
      });
  });
  
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
    tab.file.read(function(err, data) {
      tab.setValue(data);
      tab.modified = false;
      tab.modifiedAt = new Date();
      sessions.renderTabs();
      if (c) c();
    });
  });

  //we now autoretain starting after load, every n seconds
  var retainInterval = 5
  var retainLoop = function(c) {
    var tabs = sessions.getAllTabs();
    var keep = [];
    tabs.forEach(function(tab, i) {
      if (!tab.file || tab.file.virtual) return;
      keep[i] = tab.file.retain();
    });
    keep = keep.filter(function(m) { return m });
    chrome.storage.local.set({ retained: keep }, function() {
      setTimeout(retainLoop, retainInterval * 1000);
    });
  };

  command.on("session:check-file", function() {
    if (Settings.get("user").disableReload) return;
    var tab = sessions.getCurrent();
    if (!tab.file || tab.file.virtual) return;
    tab.file.entry.file(function(entry) {
      if (tab.modifiedAt && entry.lastModifiedDate > tab.modifiedAt) {
        if (tab.modified) {
          dialog(
            i18n.get("dialogModifiedBackground"),
            [
              {label: i18n.get("dialogReload"), value: true},
              {label: i18n.get("dialogCancel"), value: false, focus: true}],
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
    Settings.load(name, function() {
      var text = Settings.getAsString(name, true);
      var tab = sessions.addFile(text);
      tab.syntaxMode = "javascript";
      tab.detectSyntax();
      tab.fileName = name + ".json";
      tab.file = new NullFile(text);
      if (c) c();
    });
  });
  
  command.on("session:insert-from-file", function(c) {
    var f = new File();
    f.open(function() {
      f.read(function(err, text) {
        editor.execCommand("insertstring", text);
      });
    });
  });
  
  var openFromLaunchData = function() {
    if (window.launchData) {
      window.launchData.forEach(function(file) {
        var f = new File(file.entry);
        f.read(function(err, contents) {
          sessions.addFile(contents, f);
        });
      });
    }
  };
  
  var openFromRetained = function(done) {
    chrome.storage.local.get("retained", function(data) {
      var failures = [];
      if (!data.retained || !data.retained.length) return done();
      
      //convert raw retained IDs into typed retention objects
      var retained = data.retained.map(function(item) {
        if (typeof item == "string") {
          return {
            type: "file",
            id: item
          };
        }
        return item;
      });
      
      //constructors for restorable types
      var restoreTypes = {
        file: File,
        settings: null, //not yet, will be regular SyncFile
        buffer: null //not yet, will be HTML5 filesystem for scratch files
      }
      
      //try to restore items in order
      M.map(
        retained,
        function(item, i, c) {
          var Type = restoreTypes[item.type] || File;
          var file = new Type();
          file.restore(item.id, function(err) {
            if (err) {
              console.log("Fail restore", file);
              failures.push(item)
              return c(null);
            }
            file.read(function(err, data) {
              if (err) {
                console.log("Failed reading", file)
                failures.push(item);
                return c(null);
              }
              c({
                value: data,
                file: file
              });
            });
          });
        },
        function(restored) {
          restored = restored.filter(function(d) { return d });
          for (var i = 0; i < restored.length; i++) {
            var tab = restored[i];
            sessions.addFile(tab.value, tab.file);
          }
          if (!failures.length) {
            if (done) done();
            return;
          }
          console.log("Removing failed restore IDs", failures);
          chrome.storage.local.get("retained", function(data) {
            if (!data.retained) return;
            chrome.storage.local.set({
              retained: data.retained.filter(function(d) {
                if (typeof d == "string") {
                  d = {
                    type: "file",
                    id: d
                  };
                }
                return !failures.some(function(fail) {
                  return fail.type == d.type && fail.id == d.id;
                });
              })
            });
          });
          if (done) done();
        }
      );
    });
  }
  
  command.on("session:open-launch", openFromLaunchData);
  
  var init = function(complete) {
    Settings.pull("user").then(function(data) {
      if (data.user.disableTabRestore) {
        openFromLaunchData();
        complete("fileManager");
      } else {
        openFromRetained(function() {
          openFromLaunchData();
          //start the retention process
          retainLoop();
          complete("fileManager");
        });
      }
    });
  };
  
  command.on("init:startup", init);
  
  window.on("focus", command.fire.bind(null, "session:check-file"));

});
