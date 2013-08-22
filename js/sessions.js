define(["editor", "command", "file"], function(editor, command, File) {

  /*
  
  - test loading a session from an external file
  - test loading two sessions, switching between them
  - get tabs up and running
  - get/set/display theme per tab
  - expose API for creating/get/set/dropSession
  - retain file handles after shutdown
  
  */
  
  var tabs = [];
  var current;
  var Session = ace.require("ace/edit_session").EditSession;
  
  var renderTabs = function() {
    var tabContainer = document.querySelector(".tabs");
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
  
  var addTab = function(contents, file) {
    contents = contents || "";
    var current = editor.getSession();
    var session;
    if (tabs.length == 1 && !current.file && !current.modified) {
      session = current;
      session.setValue(contents);
    } else {
      session = new Session(contents);
      tabs.push(session);
      editor.setSession(session);
    }
    session.fileName = file ? file.entry.name : "untitled.txt";
    session.file = file;
    session.save = function(as) {
      if (session.modified || as) {
        var content = this.getValue();
        if (!this.file) {
          var file = this.file = new File();
          file.open("save", function() {
            file.write(content);
            session.file = file;
            session.fileName = file.entry.name;
            renderTabs();
          });
        } else {
          this.file.write(content);
        }
        this.modified = false;
      }
    }
    session.modified = false;
    session.once("change", function() {
      session.modified = true;
      renderTabs();
    });
    renderTabs();
  };
  
  var removeTab = function(index) {
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
    renderTabs();
  };
  
  var raiseTab = function(index) {
    var tab = tabs[index];
    current = tab;
    editor.setSession(tab);
    renderTabs();
  };
  
  var openFile = function() {
    var f = new File();
    f.open(function(file) {
      f.read(function(err, data) {
        addTab(data, file);
      });
    });
  }
  
  addTab("");
  
  renderTabs();
  
  command.on("session:new-file", function() { addTab() });
  command.on("session:open-file", openFile);
  command.on("session:raise-tab", raiseTab);
  command.on("session:save-file", function() { editor.getSession().save() });
  command.on("session:save-file-as", function() { editor.getSession().save(true) });
  command.on("session:close-tab", removeTab);

});