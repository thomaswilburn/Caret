require([
  "command",
  "settings!user",
  "dialog",
  "keys",
  "fileManager",
  "menus",
  "palette"
  ], function(command, Settings, dialog) {
  
  var frame = chrome.app.window.current();
  
  //store window dimensions on resize
  frame.onBoundsChanged.addListener(function() {
    var bounds = frame.getBounds();
    chrome.storage.local.set({bounds: bounds});
  });
  
  command.on("app:exit", function() {
    frame.close();
  });
  
  var setTheme = function() {
    var user = Settings.get("user");
    var themes = {
      "dark": "css/caret-dark.css",
      "light": "css/caret.css"
    };
    var theme = user.uiTheme || "light";
    var url = themes[theme];
    document.find("#theme").setAttribute("href", url);
  }
  
  //the settings manager may also fire init:restart to re-init components after startup
  command.fire("init:startup");
  command.on("init:restart", setTheme);
  setTheme();
  
  chrome.runtime.requestUpdateCheck(function(status, details) {
    if (status == "update_available") {
      dialog(
        "An update to Caret version " + details.version + " is available. Would you like to restart and update?",
        [{
          label: "Restart",
          value: true
        }, {
          label: "Not now",
          value: false
        }],
        function(restart) {
          if (restart) {
            chrome.runtime.reload();
          }
        }
      );
    }
  });
  
});