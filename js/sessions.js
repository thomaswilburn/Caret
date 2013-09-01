define([
    "editor",
    "dialog",
    "command",
    "file",
    "json!config/ace.json"
  ], 
  function(editor, dialog, command, File, cfg) {
  
  var tabs = [];
  var Session = ace.require("ace/edit_session").EditSession;
  
  var syntax = document.find(".syntax");
  cfg.modes.forEach(function(mode) {
    var option = document.createElement("option");
    option.innerHTML = mode.label;
    option.value = mode.name;
    syntax.append(option);
  });
  
  syntax.value = "javascript";
  command.on("session:syntax", function(mode) {
    editor.getSession().setMode("ace/mode/" + mode);
  });
  
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
    tab.setTabSize(2);
    if (tab.file) {
      var extension = tab.file.entry.name.split(".").pop();
      console.log(extension);
      for (var i = 0; i < cfg.modes.length; i++) {
        var mode = cfg.modes[i];
        if (mode.extensions.indexOf(extension) > -1) {
          tab.setMode("ace/mode/" + mode.name);
          syntax.value = mode.name;
          break;
        }
      }
    }
  };
  
  var saveFile = function(as) {
    if (this.modified || as) {
      var content = this.getValue();
      if (!this.file) {
        var file = this.file = new File();
        file.open("save", function() {
          file.write(content);
          this.file = file;
          this.fileName = file.entry.name;
          renderTabs();
        });
      } else {
        this.file.write(content);
      }
      this.modified = false;
      renderTabs();
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
    return raiseTab(index - 1);
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
  
  addTab("");
  
  renderTabs();
  
  command.on("session:new-file", function() { addTab() });
  command.on("session:open-file", openFile);
  command.on("session:raise-tab", raiseTab);
  command.on("session:save-file", function() { editor.getSession().save() });
  command.on("session:save-file-as", function() { editor.getSession().save(true) });
  command.on("session:close-tab", removeTab);
  command.on("session:change-tab", switchTab);

});