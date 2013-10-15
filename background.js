var mainWindow = null;

var openWindow = function(launchData) {
  
  if (mainWindow) {
    mainWindow.contentWindow.launchData = launchData;
    mainWindow.contentWindow.require(["command"], function(c) {
      c.fire("session:open-launch");
    });
    mainWindow.focus();
    mainWindow.drawAttention();
    return;
  }

  //launchData.items will contain files from file manager
  chrome.storage.local.get("bounds", function(data) {
    var defaults = {
      width: 800,
      height: 600,
      left: 50,
      top: 50
    };
    var bounds = data.bounds || defaults;
    //sanity check the bounds information -- also need to add maximums
    if (bounds.left < 0 || bounds.top < 0 || bounds.width < 0 || bounds.height < 0) {
      bounds = defaults;
    }
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
  
};

chrome.app.runtime.onLaunched.addListener(openWindow);
chrome.app.runtime.onRestarted.addListener(openWindow);