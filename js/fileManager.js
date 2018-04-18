define([
    "sessions",
    "editor",
    "storage/file",
    "ui/dialog",
    "command",
    "storage/settingsProvider",
    "storage/nullfile",
    "util/i18n",
    "util/chromePromise",
    //these next modules are self-contained
    "sessions/dragdrop",
    "sessions/autosave"
  ], function(sessions, editor, File, dialog, command, Settings, NullFile, i18n, chromeP) {
    
  /*
  FileManager splits out the session code that specifically deals with I/O.
  Pretty much the whole file is just bindings to various commands.
  
  Now that session.js is refactored, this could probably move into a submodule,
  except that it gets loaded explicitly on startup.
  */

  command.on("session:new-file", content => sessions.addFile(content));
  
  command.on("session:open-file", async function() {
    //have to call chooseEntry manually to support multiple files
    var args = {
      type: "openWritableFile",
      acceptsMultiple: true
    };
    var files = await chromeP.fileSystem.chooseEntry(args);
    if (!files) return;
    //annoying array function test, since it's not apparently a real array
    if (!files.slice) {
      files = [ files ];
    }
    files = files.map(async function(entry) {
      var f = new File(entry);
      var data = await f.read();
      sessions.addFile(data, f);
    });

    await Promise.all(files);
  });
  
  command.on("session:save-file", async function() {
    await sessions.getCurrent().save()
    command.fire("session:syntax");
  });
  
  command.on("session:save-all", async function() {
    var tabs = sessions.getAllTabs();

    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (tab.modified && tab.file) await tab.save(false);
      command.fire("session:syntax");
    }

  });
  
  command.on("session:save-file-as", async function() {
    var tab = sessions.getCurrent();
    await tab.save(true);
    var mode = tab.detectSyntax();
    sessions.renderTabs();
    await command.fire("session:syntax", mode);
  });
  
  command.on("session:revert-file", async function() {
    var tab = sessions.getCurrent();
    if (!tab.file) return;
    var data = await tab.file.read();
    tab.setValue(data);
    tab.modified = false;
    tab.modifiedAt = new Date();
    sessions.renderTabs();
  });

  //we now autoretain starting after load, every n seconds
  var retainInterval = 5
  var retainLoop = async function(c) {
    var tabs = sessions.getAllTabs();
    var keep = [];
    tabs.forEach(function(tab, i) {
      if (!tab.file || tab.file.virtual) return;
      keep[i] = tab.file.retain();
    });
    keep = keep.filter(m => m);
    await chromeP.storage.local.set({ retained: keep });
    setTimeout(retainLoop, retainInterval * 1000);
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
  
  command.on("session:open-settings-file", async function(name) {
    await Settings.load(name);
    var data = Settings.getAsString(name);
    var file = Settings.getAsFile(name);
    sessions.addFile(data, file);
  });
  
  //defaults don't get loaded as files, just as content
  command.on("session:open-settings-defaults", async function(name) {
    await Settings.load(name);
    var text = Settings.getAsString(name, true);
    var tab = sessions.addFile(text);
    tab.syntaxMode = "javascript";
    tab.detectSyntax();
    tab.fileName = name + ".json";
    tab.file = new NullFile(text);
  });
  
  command.on("session:insert-from-file", async function() {
    var f = new File();
    await f.open();
    var text = f.read();
    editor.execCommand("insertstring", text);
  });
  
  var openFromLaunchData = function() {
    if (window.launchData) {
      window.launchData.forEach(async function(file) {
        var f = new File(file.entry);
        var contents = await f.read();
        sessions.addFile(contents, f);
      });
    }
  };
  
  var openFromRetained = async function() {
    var data = await chromeP.storage.local.get("retained");
    var failures = [];
    var restored = [];
    if (!data.retained || !data.retained.length) return;
    
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
    for (var i = 0; i < retained.length; i++) {
      var item = retained[i];
      var Type = restoreTypes[item.type] || File;
      var file = new Type();
      try {
        await file.restore(item.id);
        var data = await file.read();
        restored[i] = { value: data, file }
      } catch(err) {
        console.log("Fail restore or read", err, file);
        failures.push(item);
      }
    }
    restored = restored.filter(d => d);
    for (var i = 0; i < restored.length; i++) {
      var tab = restored[i];
      sessions.addFile(tab.value, tab.file);
    }
    if (!failures.length) {
      return;
    }

    var local = await chromeP.storage.local.get("retained");
    if (!local.retained) return;
    await chromeP.storage.local.set({
      retained: local.retained.filter(function(d) {
        // convert old retained IDs to new-style objects
        if (typeof d == "string") {
          d = {
            type: "file",
            id: d
          };
        }
        // remove failures from the set
        return !failures.some(fail => fail.type == d.type && fail.id == d.id);
      })
    });
  }
  
  command.on("session:open-launch", openFromLaunchData);
  
  var init = async function() {
    var data = await Settings.pull("user");
    if (data.user.disableTabRestore) {
      openFromLaunchData();
      return "fileManager";
    } else {
      await openFromRetained();
      openFromLaunchData();
      //start the retention process
      retainLoop();
      return "fileManager";
    }
  };
  
  command.on("init:startup", init);
  
  window.addEventListener("focus", command.fire.bind(null, "session:check-file"));

});
