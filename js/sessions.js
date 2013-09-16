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
  var syntax = document.find(".syntax");

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
      session.modified = false;
      renderTabs();
      return;
    }
    session.isTab = true;
    
    session.setUndoManager(new ace.UndoManager());
    
    session.save = function(as, c) {
      if (typeof as == "function") {
        c = as;
        as = false;
      }
      var content = this.getValue();
      var self = this;

      var whenOpen = function() {
        self.file.write(content, c);
        self.modified = false;
        renderTabs();
      };

      if (!this.file || as) {
        var file = new File();
        return file.open("save", function(err) {
          self.file = file;
          if (err) {
            dialog(err);
            return;
          }
          self.fileName = file.entry.name;
          self.retain();
          whenOpen();
        });
      }

      whenOpen();
    };
    
    session.raise = function() {
      editor.setSession(session);
      syntax.value = session.syntaxMode || "plain_text";
      editor.focus();
      renderTabs();
    };

    session.raiseBlurred = function() {
      editor.setSession(session);
      syntax.value = session.syntaxMode || "plain_text";
      renderTabs();
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
        if (!data.retained) return;
        var filtered = data.retained.filter(function(item) { return item != id });
        chrome.storage.local.set({ retained: filtered });
      });
    };
    
    //once() is buggier than on(), not sure why
    session.on("change", function() {
      if (session.modified) return;
      session.modified = true;
      renderTabs();
    });
  
  };
  
  var renderTabs = function() {
    var tabContainer = document.find(".tabs");
    var contents = "";
    var current = editor.getSession();
    tabContainer.innerHTML = "";
    tabs.forEach(function(tab, index) {
      var span = document.createElement("span");
      span.setAttribute("draggable", true);
      span.setAttribute("command", "session:raise-tab");
      span.setAttribute("argument", index);
      span.className = "tab";
      if (tab === current) {
        span.className += " active";
      }
      span.innerHTML = tab.fileName + (tab.modified ? " &bull;" : "");
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
    tab.setWrapLimit(userConfig.wrapLimit || null);
    tab.setUseWorker(userConfig.useWorker);
    var syntaxValue = "plain_text";
    if (tab.syntaxMode) {
      syntaxValue = tab.syntaxMode;
    } else if (tab.file) {
      if (tab.file.virtual) {
        //settings files are special
        syntaxValue = "javascript";
        tab.setMode("ace/mode/javascript");
      } else if (tab.file.entry) {
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
      tab.syntaxMode = syntaxValue;
    }
    tab.setMode("ace/mode/" + syntaxValue);
    syntax.value = syntaxValue;
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
    };

    if (tab.modified) {
      dialog(
        tab.fileName + " has been modified. Do you want to save changes?",
        [{label: "Save", value: true}, {label: "Don't save", value: false}],
        function(confirm) {
          if (typeof confirm == "undefined") {
            return;
          }
          if (confirm) {
            return tab.save(continuation);
          }
          continuation();
        });
        return;
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
  };
  
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
        addTab(data, f);
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
          addTab(contents, f);
        });
      });
    }
  };
  
  var enableTabDragDrop = function() {
    var tabContainer = document.find(".tabs");
    var draggedTab = null;
    tabContainer.on("dragstart", function(e) {
      if (!e.target.matches(".tab")) return;
      e.target.style.opacity = .4;
      setTimeout(function() {
        e.target.classList.add("dragging");
      }, 50);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/x-tab-id", e.target.getAttribute("argument"));
      draggedTab = e.target;
      draggedTab.ondragend = function() {
        draggedTab = null;
        e.target.style.opacity = null;
        e.target.classList.remove("dragging");
      };
    });
    tabContainer.on("dragover", function(e) { 
      e.preventDefault();
      e.dropEffect = "move";
    });
    tabContainer.on("dragenter", function(e) {
      if (!e.target.matches(".tab")) return;
      e.target.classList.add("hovering");
    });
    tabContainer.on("dragleave", function(e) {
      if (!e.target.matches(".tab")) return;
      e.target.classList.remove("hovering");
    });
    tabContainer.on("drop", function(e) {
      if (!draggedTab) return;
      var target = e.target;
      var location = "before";
      var x = e.offsetX;
      while (!target.matches(".tab")) {
        if (target == tabContainer) {
          var elements = tabContainer.findAll(".tab");
          location = "after";
          elements.forEach(function(el) {
            if (el.offsetLeft < x) {
              target = el;
            }
          });
          break;
        }
        target = target.parentElement;
        x += target.offsetLeft;
      }
      var from = tabs[e.dataTransfer.getData("application/x-tab-id") * 1];
      var onto = tabs[target.getAttribute("argument") * 1];
      var reordered = [];
      tabs.forEach(function(t) {
        if (t == from) return;
        if (t == onto && location == "before") {
          reordered.push(from);
        }
        reordered.push(t);
        if (t == onto && location == "after") {
          reordered.push(from);
        }
      });
      tabs = reordered;
      renderTabs();
    });
  };
  
  var init = function() {
    cfg.modes.forEach(function(mode) {
      var option = document.createElement("option");
      option.innerHTML = mode.label;
      option.value = mode.name;
      syntax.append(option);
    });
    addTab("");
    enableTabDragDrop();
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
          if (!data.retained) return;
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
    tabs.forEach(function(tab) {
      setTabSyntax(tab);
    })
  };
  
  command.on("init:startup", init);
  command.on("init:restart", reset);
  
  command.on("session:syntax", function(mode) {
    var session = editor.getSession();
    session.setMode("ace/mode/" + mode);
    session.syntaxMode = mode;
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
      addTab(data, file);
    });
  });
  
  //defaults don't get loaded as files, just as content
  command.on("session:open-settings-defaults", function(name) {
    Settings.load(name, function() {
      var tab = addTab(Settings.getAsString(name, true));
      tab.syntaxMode = "javascript";
      setTabSyntax(tab);
      tab.fileName = name + ".json";
      renderTabs();
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
      };
    },
    restoreLocation: function() {
      if (!locationMemory) return;
      locationMemory.tab.raise();
      editor.moveCursorToPosition(locationMemory.cursor);
    }
  }

});