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
  }
  
  var setTabSyntax = function(tab) {
    tab.setTabSize(userConfig.indentation || 2);
    tab.setUseWrapMode(userConfig.wordWrap);
    if (tab.file) {
      var found = false;
      var extension = tab.file.entry.name.split(".").pop();
      for (var i = 0; i < cfg.modes.length; i++) {
        var mode = cfg.modes[i];
        if (mode.extensions.indexOf(extension) > -1) {
          tab.setMode("ace/mode/" + mode.name);
          syntax.value = mode.name;
          found = true;
          break;
        }
      }
      if (!found) {
        syntax.value = "plain_text";
        tab.setMode("ace/mode/plain_text");
      }
    }
  };
  
  var saveFile = function(as) {
    if (this.modified || as) {
      var content = this.getValue();
      var self = this;

      var whenOpen = function() {
        self.file.write(content);
        self.modified = false;
        self.once("change", function() {
          self.modified = true;
          renderTabs();
        });
        renderTabs();
      }

      if (!this.file) {
        var file = this.file = new File();
        return file.open("save", function() {
          self.fileName = file.entry.name;
          whenOpen();
        });
      }

      whenOpen();
    }
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
      editor.setSession(session);
    }
    session.fileName = file ? file.entry.name : "untitled.txt";
    session.file = file;
    setTabSyntax(session);
    session.save = saveFile;
    session.modified = false;
    session.once("change", function() {
      session.modified = true;
      renderTabs();
    });
    editor.focus();
    renderTabs();
  };
  
  var removeTab = function(index) {
    if (!index) {
      index = tabs.indexOf(editor.getSession());
    }
    var tab = tabs[index];

    var continuation = function() {
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
    editor.setSession(tab);
    renderTabs();
    editor.focus();
  };
  
  var switchTab = function(shift) {
    shift = shift || 1;
    var current = editor.getSession();
    var currentIndex = tabs.indexOf(current);
    var shifted = (currentIndex + shift) % tabs.length;
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
  
  var syntax = document.find(".syntax");
  
  var init = function() {
    cfg.modes.forEach(function(mode) {
      var option = document.createElement("option");
      option.innerHTML = mode.label;
      option.value = mode.name;
      syntax.append(option);
    });
    addTab("");
    reset();
  };
  
  var reset = function() {
    cfg = Settings.get("ace");
    userConfig = Settings.get("user");
    syntax.value = "javascript";
    editor.getSession().setMode("ace/mode/" + syntax.value);
    tabs.forEach(setTabSyntax);
  };
  
  command.on("init:startup", init);
  command.on("init:restart", reset);
  
  command.on("session:syntax", function(mode) {
    editor.getSession().setMode("ace/mode/" + mode);
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
      var data = JSON.stringify(Settings.get(name), null, 2);
      var file = Settings.getAsFile(name);
      addTab(data, file);
    });
  });
  
  return {
    addFile: addTab
  }

});