define([
    "editor",
    "dialog",
    "command",
    "file",
    "settings!ace,user",
    "aceBindings"
  ], 
  function(editor, dialog, command, File, Settings) {
  
  var tabs = [];
  var Session = ace.require("ace/edit_session").EditSession;
  var cfg = Settings.get("ace");
  var userConfig = Settings.get("user");

  var augmentTab = function(session, file) {
    
    if (file) {
      session.file = file;
      session.fileName = file.entry.name;
    } else {
      session.fileName = "untitled.txt";
    }
    
    setTabSyntax(session);

    if (session.isTab) {
      session.retain();
      session.setUnmodified();
      return;
    };
    session.isTab = true;
    
    session.setUndoManager(new ace.UndoManager());
    
    session.save = function(as) {
      if (this.modified || as) {
        var content = this.getValue();
        var self = this;

        var whenOpen = function() {
          self.file.write(content);
          self.setUnmodified();
          renderTabs();
        }

        if (!this.file) {
          var file = this.file = new File();
          return file.open("save", function() {
            self.fileName = file.entry.name;
            self.retain();
            whenOpen();
          });
        }

        whenOpen();
      }
    };
    
    session.raise = function(backgrounded) {
      editor.setSession(session);
      syntax.value = session.syntaxMode || "plain_text";
      renderTabs();
      if (!backgrounded) {
        editor.focus();
      }
    };
    
    session.retain = function() {
      if (!this.file || !chrome.fileSystem.retainEntry) return;
      var id = this.file.retain();
      if (!id) return;
      chrome.storage.local.get("retained", function(data) {
        data.retained = data.retained || [];
        if (data.retained.indexOf(id) == -1) {
          data.retained.push(id);
          chrome.storage.local.set({ retained: data.retained });
        }
      });
    };
    session.retain();
    
    session.drop = function() {
      if (!this.file || !chrome.fileSystem.retainEntry) return;
      var id = this.file.retain();
      if (!id) return;
      chrome.storage.local.get("retained", function(data) {
        var filtered = data.retained.filter(function(item) { return item != id });
        chrome.storage.local.set({ retained: filtered });
      });
    };
    
    session.setUnmodified = function() {
      var self = this;
      this.modified = false;
      this.once("change", function() {
        self.modified = true;
        renderTabs();
      });
    };
    session.setUnmodified();
  
  };
  
  var renderTabs = function() {
    var tabContainer = document.find(".tabs");
    var contents = "";
    var current = editor.getSession();
    tabContainer.innerHTML = "";
    tabs.forEach(function(tab, index) {
      var span = document.createElement("span");
      span.setAttribute("command", "session:raise-tab");
      span.setAttribute("argument", index);
      if (tab === current) {
        span.className = "active";
      }
      span.innerHTML = tab.fileName + (tab.modified ? " *" : "");
      var close = document.createElement("a");
      close.innerHTML = "&times;";
      close.className = "close";
      close.setAttribute("command", "session:close-tab");
      close.setAttribute("argument", index);
      span.append(close);
      tabContainer.append(span);
    });
  };
  
  var setTabSyntax = function(tab) {
    tab.setTabSize(userConfig.indentation || 2);
    tab.setUseWrapMode(userConfig.wordWrap);
    var syntaxValue = "plain_text";
    if (tab.file) {
      var found = false;
      var extension = tab.file.entry.name.split(".").pop();
      for (var i = 0; i < cfg.modes.length; i++) {
        var mode = cfg.modes[i];
        if (mode.extensions.indexOf(extension) > -1) {
          tab.setMode("ace/mode/" + mode.name);
          syntaxValue = mode.name;
          break;
        }
      }
    }
    syntax.value = syntaxValue;
    tab.syntaxMode = syntaxValue;
  };
  
  var addTab = function(contents, file) {
    contents = contents || "";
    var current = editor.getSession();
    var session;
    //reuse tab if opening a file into an empty tab
    if (file && !current.file && !current.modified) {
      session = current;
      session.setValue(contents);
    } else {
      session = new Session(contents);
      tabs.push(session);
    }
    augmentTab(session, file);
    session.raise();
    return session;
  };
  
  var removeTab = function(index) {
    if (!index) {
      index = tabs.indexOf(editor.getSession());
    }
    var tab = tabs[index];

    var continuation = function() {
      tab.drop();
      tabs = tabs.filter(function(tab, i) {
        if (i == index) {
          //tab.save();
          return false;
        }
        return true;
      });
      if (tabs.length == 0) {
        return addTab();
      }
      var next = index - 1;
      if (next < 0) {
        next = 0;
      }
      raiseTab(next);
    }

    if (tab.modified) {
      dialog(
        tab.fileName + " has been modified. Do you want to save changes?",
        [{label: "Save", value: true}, {label: "Don't save", value: false}],
        function(confirm) {
          if (confirm) {
            tab.save();
          }
          continuation();
        })
    } else {
      continuation();
    }
  };
  
  var raiseTab = function(index) {
    var tab = tabs[index];
    tab.raise();
  };
  
  var switchTab = function(shift) {
    shift = shift || 1;
    var current = editor.getSession();
    var currentIndex = tabs.indexOf(current);
    var shifted = (currentIndex + shift) % tabs.length;
    if (shifted < 0) {
      shifted = tabs.length + shifted;
    }
    raiseTab(shifted);
  }
  
  var openFile = function() {
    var f = new File();
    f.open(function(file) {
      f.read(function(err, data) {
        addTab(data, file);
      });
    });
  };
  
  var openFromLaunchData = function() {
    if (window.launchData) {
      window.launchData.items.forEach(function(file) {
        var f = new File();
        f.entry = file.entry;
        f.read(function(err, contents) {
          addTab(contents, f);
        })
      })
    }
  }
  
  var syntax = document.find(".syntax");
  
  var init = function() {
    cfg.modes.forEach(function(mode) {
      var option = document.createElement("option");
      option.innerHTML = mode.label;
      option.value = mode.name;
      syntax.append(option);
    });
    addTab("");
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
              addTab(contents, file);
            });
            return id;
          });
        });
      }
      reset();
      //after a reasonable delay, filter failures out of retention
      setTimeout(function() {
        chrome.storage.local.get("retained", function(data) {
          chrome.storage.local.set({
            retained: data.retained.filter(function(d) { return failures.indexOf(d) == -1 })
          });
        });
      }, 500);
    });
  };
  
  var reset = function() {
    cfg = Settings.get("ace");
    userConfig = Settings.get("user");
  };
  
  command.on("init:startup", init);
  command.on("init:restart", reset);
  
  command.on("session:syntax", function(mode) {
    editor.getSession().setMode("ace/mode/" + mode);
    editor.focus();
  });
  
  command.on("session:new-file", function() { addTab() });
  command.on("session:open-file", openFile);
  command.on("session:raise-tab", raiseTab);
  command.on("session:save-file", function() { editor.getSession().save() });
  command.on("session:save-file-as", function() { editor.getSession().save(true) });
  command.on("session:close-tab", removeTab);
  command.on("session:change-tab", switchTab);

  command.on("session:open-settings-file", function(name) {
    Settings.load(name, function() {
      var data = Settings.getAsString(name);
      var file = Settings.getAsFile(name);
      //since we allow comments, it's a good idea to tweak the display to JS mode
      addTab(data, file).setMode("ace/mode/javascript");
    });
  });
  
  command.on("session:open-launch", openFromLaunchData);
  
  var locationMemory = null;
  
  return {
    addFile: addTab,
    getCurrent: function() {
      return editor.getSession();
    },
    getTabByIndex: function(index) {
      return tabs[index];
    },
    getTabByName: function(name) {
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].fileName == name) {
          return tabs[i];
        }
      }
      return null;
    },
    getFilenames: function() {
      return tabs.map(function(t) { return t.fileName });
    },
    setCurrent: function(tab) {
      tab.raise();
    },
    saveLocation: function() {
      var session = editor.getSession();
      var position = editor.getCursorPosition();
      locationMemory = {
        tab: session,
        cursor: position
      }
    },
    restoreLocation: function() {
      locationMemory.tab.raise();
      editor.moveCursorToPosition(locationMemory.cursor);
    }
  }

});