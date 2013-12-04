var mainWindow = null;
var pending = null;
var upgrading = false;
var files = [];

var openWindow = function() {
  
  //if window exists, re-use it
  if (mainWindow) {
    mainWindow.contentWindow.launchData = files;
    mainWindow.contentWindow.require(["command"], function(c) {
      c.fire("session:open-launch");
    });
    mainWindow.focus();
    mainWindow.drawAttention();
    files = [];
    pending = null;
    return;
  }
  
  //otherwise, open a new window
  var defaults = {
    width: 800,
    height: 600,
    left: 50,
    top: 50
  };
  chrome.app.window.create("main.html", {
      bounds: defaults,
      id: "caret:main"
  }, function(win) {
    mainWindow = win;
    win.contentWindow.launchData = files;
    mainWindow.onClosed.addListener(function() {
      mainWindow = null;
    });
    files = [];
    pending = null;
  });
}

var launch = function(launchData) {
  
  if (launchData && launchData.items) files.push.apply(files, launchData.items);
  //we delay opening the actual window to give multiple file events time to fire
  if (pending !== null) return;
  if (upgrading) return;
  pending = setTimeout(openWindow, 250);
  
};

chrome.app.runtime.onLaunched.addListener(launch);
chrome.app.runtime.onRestarted.addListener(launch);