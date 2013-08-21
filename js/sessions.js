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
      contents += "<a command='session:raise-tab' argument='" + index + "'>" + index + "</a>";
    });
    tabContainer.innerHTML = contents;
  }
  
  var addTab = function() {
    var session = ace.createEditSession("", "ace/mode/text");
    tabs.push(session);
    current = session;
    renderTabs();
    return session;
  };
  
  var raiseTab = function(index) {
    var tab = tabs[index];
    editor.setSession(tab);
  }
  
  var openFile = function() {
    var f = new File();
    f.open(function(file) {
      f.read(function(err, data) {
        var session = addTab();
        session.setValue(data);
        editor.setSession(session);
      });
    });
  }
  
  command.on("session:open-file", openFile);
  command.on("session:raise-tab", raiseTab);

});