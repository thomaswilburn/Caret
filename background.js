var mainWindow = null;

chrome.app.runtime.onLaunched.addListener(function(launchData) {
  
  if (mainWindow) {
    mainWindow.contentWindow.launchData = launchData;
    mainWindow.contentWindow.require(["command"], function(c) {
      c.fire("session:open-launch");
    });
    return;
  }

  //launchData.items will contain files from file manager
  chrome.storage.local.get("bounds", function(data) {
    var bounds = data.bounds || {
      width: 800,
      height: 600,
      left: 10,
      top: 10
    };
    chrome.app.window.create("main.html", {
        bounds: bounds 
    }, function(win) {
      mainWindow = win;
      win.contentWindow.launchData = launchData;
      mainWindow.onClosed.addListener(function() {
        mainWindow = null;
      });
    });
      
  });
  
});