require(["sessions", "menus"], function() {
  
  var frame = chrome.app.window.current();
  
  frame.onBoundsChanged.addListener(function() {
    var bounds = frame.getBounds();
    chrome.storage.local.set({bounds: bounds});
  });
  
});