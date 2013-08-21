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
  
  var current = editor.getSession();
  
  var renderTabs = function() {
    var tabContainer = document.querySelector(".tabs");
    var contents = "";
    tabs.forEach(function(tab, index) {
      // add close button
      // add "active" state
      contents += "<a command='session:raise-tab' argument='" + index + "'>" + tab.fileName + "</a>";
    });
    tabContainer.innerHTML = contents;
  }
  
  var addTab = function(contents, file) {
    var session = ace.createEditSession(contents);
    session.fileName = file.entry.name;
    session.file = file;
    tabs.push(session);
    current = session;
    renderTabs();
    return session;
  };
  
  var removeTab = function(index) {
    
  };
  
  var raiseTab = function(index) {
    var tab = tabs[index];
    current = tab;
    editor.setSession(tab);
  };
  
  var openFile = function() {
    var f = new File();
    f.open(function(file) {
      f.read(function(err, data) {
        var session = addTab(data, file);
        editor.setSession(session);
      });
    });
  }
  
  command.on("session:open-file", openFile);
  command.on("session:raise-tab", raiseTab);

});