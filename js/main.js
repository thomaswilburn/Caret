chrome.version = window.navigator.appVersion.match(/Chrome\/(\d+)/)[1] * 1 || 0;

require([
    "command",
    "storage/settingsProvider",
    "ui/dialog",
    "ui/projectManager",
    "ui/keys",
    "fileManager",
    "ui/menus",
    "ui/palette",
    "api",
    "storage/syncfile"
  ], function(command, Settings, dialog) {
  
  var frame = chrome.app.window.current();
  
  command.on("app:exit", function() {
    frame.close();
  });
  
  var setTheme = function() {
    Settings.pull("user").then(function(data) {
      var themes = {
        "dark": "css/caret-dark.css",
        "light": "css/caret.css"
      };
      var theme = data.user.uiTheme || "light";
      var url = themes[theme] || themes.dark;
      document.find("#theme").setAttribute("href", url);
    });
  };

  var loadedModules = {
    "editor": false, 
    "fileManager": false, 
    "sessions": false
  };
  
  //the settings manager may also fire init:restart to re-init components after startup
  command.fire("init:startup", function(mod) {
    //ignore callback in non-essential modules
    if (typeof loadedModules[mod] == "undefined") return;
    loadedModules[mod] = true;
    for (var key in loadedModules) {
      if (!loadedModules[key]) {
        return;
      }
    }
    //all specified modules are loaded, app is ready for init:complete
    command.fire("init:complete");
  });
  command.on("init:restart", setTheme);
  setTheme();
  
  var updateID = "caret:update";
  
  var checkUpdates = function(isManual) {
    chrome.runtime.requestUpdateCheck(function(status, details) {
      if (status == "update_available") {
        chrome.runtime.onUpdateAvailable.addListener(function() {
          chrome.notifications.create(updateID, {
            type: "basic",
            iconUrl: "icon-128.png",
            title: "Caret: Update Available",
            message: "An update to Caret version " + details.version + " is available. Would you like to update and restart now?",
            buttons: [ { title: "Yes, update and restart" }, { title: "No thanks" }]
          }, function(id) { updateID = id });
        });
      }
    });
  };
  
  Settings.pull("user").then(function(cfg) {
    if (cfg.user.promptForUpdates !== false) checkUpdates();
  });
  command.on("app:check-for-updates", checkUpdates);
  
  chrome.notifications.onButtonClicked.addListener(function(id, index) {
    if (id != updateID) return;
    if (index === 0) {
      chrome.runtime.reload();
    }
  });
  
});