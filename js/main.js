require(["command", "keys", "sessions", "menus", "palette"], function(command) {
  
  var frame = chrome.app.window.current();
  
  //store window dimensions on resize
  frame.onBoundsChanged.addListener(function() {
    var bounds = frame.getBounds();
    chrome.storage.local.set({bounds: bounds});
  });
  
  command.on("app:exit", function() {
    frame.close();
  });
  
  //the settings manager may also fire init:restart to re-init components after startup
  command.fire("init:startup");
  
});