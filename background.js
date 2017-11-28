/*
The background process is responsible for opening Caret windows in response to
app launches, choosing a file in the Files app on Chrome OS, and external
messages.
*/

var mainWindow = null;
var pending = null;
var files = [];
var commands = [];

var openWindow = function() {
  
  //if window exists, re-use it
  if (mainWindow) {
    //attach any new files to the window, and re-trigger "open from launch"
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
      id: "caret:main",
      frame: "none",
      minWidth: 640,
      minHeight: 480
  }, function(win) {
    mainWindow = win;
    win.contentWindow.launchData = files;
    win.contentWindow.launchCommands = commands;
    mainWindow.onClosed.addListener(function() {
      mainWindow = null;
      chrome.storage.local.remove("isOpen");
    });
    files = [];
    commands = [];
    pending = null;
    chrome.storage.local.set({isOpen: true});
  });
}

var launch = function(launchData) {
  if (launchData && launchData.items) files.push.apply(files, launchData.items);
  //we delay opening the actual window to give multiple file events time to fire
  if (pending !== null) return;
  pending = setTimeout(openWindow, 250);
};
chrome.app.runtime.onLaunched.addListener(launch);

var onMessage = function(message, sender, sendResponse) {
  //main window will pick up the message, if it's open
  //we also allow extensions to suppress launch behavior for spurious messages
  if (mainWindow || message.quiet || !message.command) {
    //if it is open, and the command is loud enough, flash the window
    if (mainWindow && message.command && !message.quiet) {
      mainWindow.drawAttention();
    }
    return;
  }
  commands.push({
    message: message,
    sender: sender,
    sendResponse: sendResponse
  });
  //as with files, delay to accumulate multiple messages
  if (pending !== null) return;
  pending = setTimeout(openWindow, 250);
};
chrome.runtime.onMessageExternal.addListener(onMessage);

//relaunch on reboot, if the window was open at shutdown
chrome.app.runtime.onRestarted.addListener(function() {
  chrome.storage.local.get("isOpen", function(data) {
    if (data.isOpen) launch();
  });
});

// setup for launcher context menus
// currently this is just for emergency reset
chrome.contextMenus.create({
  title: "Emergency Reset",
  contexts: [ "launcher" ],
  id: chrome.runtime.id + ":factory-reset"
}, function() {
  if (chrome.runtime.lastError) console.log(chrome.runtime.lastError);
});

window.emergencyReset = function() {
  if (mainWindow) mainWindow.close();
  var cleared = {
    local: false,
    sync: false
  };
  var check = function(storage) {
    cleared[storage] = true;
    if (cleared.local && cleared.sync) {
      chrome.notifications.create("app:factory-reset-complete", {
        type: "basic",
        iconUrl: "icon-128.png",
        title: "Emergency Reset Complete",
        message: "Caret has been reset to the default settings."
      }, function() {});
    }
  };
  chrome.storage.local.clear(check.bind(null, "local"));
  chrome.storage.sync.clear(check.bind(null, "sync"));
};

chrome.contextMenus.onClicked.addListener(function(data) {
  if (data.menuItemId != chrome.runtime.id + ":factory-reset") return;
  emergencyReset();
});

var installNotification = "upgraded";

window.showUpdateNotification = function(manifest = chrome.runtime.getManifest()) {
  chrome.notifications.create(installNotification, {
    type: "basic",
    iconUrl: "icon-128.png",
    title: chrome.i18n.getMessage("notificationUpdated"),
    message: chrome.i18n.getMessage("notificationUpdatedDetail", [manifest.version]),
    isClickable: true
  }, function(id) { installNotification = id });
};

chrome.runtime.onInstalled.addListener(function(e) {
  if (!e.previousVersion) return;
  // set a flag for launch updates
  window.updateVersion = e.previousVersion;
  
  var manifest = chrome.runtime.getManifest();
  
  // at some point, we should use these.
  var [major, minor, build] = e.previousVersion.split(".");

  if (e.previousVersion != manifest.version) {

    chrome.storage.sync.get("updateNotifications", function(data) {

      if (data.updateNotifications && data.updateNotifications != "background") return;
    
      //let the user know
      showUpdateNotification(manifest);

    });
  }

});

chrome.notifications.onClicked.addListener(function(id) {
  if (id != installNotification) return;
  window.open("https://github.com/thomaswilburn/Caret/blob/master/changelog.rst", "target=_blank");
});