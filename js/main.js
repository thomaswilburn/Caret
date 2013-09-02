require(["command", "keys", "sessions", "menus"], function(command) {
  
  var frame = chrome.app.window.current();
  
  //store window dimensions on resize
  frame.onBoundsChanged.addListener(function() {
    var bounds = frame.getBounds();
    chrome.storage.local.set({bounds: bounds});
  });
  
  command.on("app:exit", function() {
    frame.close();
  });
  
  command.fire("init:startup");
  
});