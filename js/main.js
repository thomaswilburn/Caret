chrome.version = window.navigator.appVersion.match(/Chrome\/(\d+)/)[1] * 1 || 0;

require([
    "command",
    "editor",
    "storage/settingsProvider",
    "ui/dialog",
    "sessions",
    "util/manos",
    "util/i18n",
    "ui/projectManager",
    "ui/keys",
    "fileManager",
    "ui/menus",
    "ui/palette",
    "ui/cli",
    "ui/theme",
    "api",
    "storage/syncfile"
  ], function(command, editor, Settings, dialog, sessions, M, i18n) {
  
  //translate inline strings
  i18n.page();
  
  var frame = chrome.app.window.current();
  
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
  }
  setTheme();

  //these are modules that must be loaded before init:complete
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
  
  //code to enable update checking
  var updateID = "caret:update";
  
  var checkUpdates = function(isManual) {
    chrome.runtime.requestUpdateCheck(function(status, details) {
      if (status == "update_available") {
        chrome.runtime.onUpdateAvailable.addListener(function() {
          chrome.notifications.clear(updateID, function() {
            chrome.notifications.create(updateID, {
              type: "basic",
              iconUrl: "icon-128.png",
              title: i18n.get("notificationUpdateAvailable"),
              message: i18n.get("notificationUpdateDetail", details.version),
              buttons: [ 
                { title: i18n.get("notificationUpdateOK") },
                { title: i18n.get("notificationUpdateWait") }
              ]
            }, function(id) { updateID = id });
          });
        });
      } else {
        if (isManual) chrome.notifications.create(updateID, {
          type: "basic",
          iconUrl: "icon-128.png",
          title: i18n.get("notificationNoUpdateTitle"),
          message: i18n.get("notificationNoUpdateDetail")
        }, function(id) { updateID = id });
      }
    });
  };
  
  Settings.pull("user").then(function(cfg) {
    if (cfg.user.promptForUpdates !== false) checkUpdates();
  });
  command.on("app:check-for-updates", checkUpdates);
  
  chrome.notifications.onButtonClicked.addListener(function(id, index) {
    if (id != updateID) return;
    if (index == 0) {
      chrome.runtime.reload();
    }
  });
  
  command.on("app:exit", function() {
    var cancelled = false;
    var tabs = sessions.getAllTabs();
    M.serial(tabs, function(tab, c) {
      if (tab.modified && (!tab.file || !tab.file.virtual)) {
        return dialog(
          i18n.get("dialogUnsaved", tab.fileName),
          [
            { label: i18n.get("dialogSave"), value: "save", shortcut: "s" },
            { label: i18n.get("dialogDiscard"), value: "discard", shortcut: "n" },
            { label: i18n.get("dialogCancel"), value: "cancel", shortcut: "c" }
          ],
          function(value) {
            if (!value || value == "cancel") {
              cancelled = true;
            }
            if (value == "save") {
              return tab.save().then(c);
            }
            c(!cancelled);
          });
      }
      c();
    }, function() {
      if (!cancelled) frame.close();
    })
  });
  
  command.on("app:minimize", function() {
    frame.minimize();
    editor.focus();
  });
  
  command.on("app:maximize", function() {
    frame.isMaximized() || frame.isFullscreen() ? frame.restore() : frame.maximize();
    editor.focus();
  });
  
  command.on("app:restart", function() {
    chrome.runtime.reload();
  });
  
  //developer command for reloading CSS
  command.on("app:reload-css", function() {
    var link = document.querySelector("link#theme");
    link.href = link.href;
  });
  
  //handle immersive fullscreen
  var onFullscreen = function() {
    Settings.pull("user").then(function(data) {
      if (data.user.immersiveFullscreen) {
        document.find("body").addClass("immersive");
        editor.resize();
      }
    });
  }
  
  frame.onFullscreened.addListener(onFullscreen);
  if (frame.isFullscreen()) {
    onFullscreen();
  }
  
  frame.onRestored.addListener(function() {
    document.find("body").removeClass("immersive");
  });
  
  //It's nice to be able to launch the debugger from a command stroke
  command.on("app:debug", function() {
    debugger;
  });
  
  command.on("app:browse", function(url) {
    window.open(url, "target=_blank");
  });
  
  //kill middle clicks if not handled
  
  document.body.on("click", function(e) {
    if (e.button == 1) {
      e.preventDefault();
    }
  });
  
});
