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
  
  var updateID = "caret:update";
  
  chrome.runtime.requestUpdateCheck(function(status, details) {
    if (status == "update_available" && Settings.get("user").promptForUpdates !== false) {
      chrome.notifications.create(updateID, {
        type: "basic",
        iconUrl: "icon-128.png",
        title: "Caret: Update Available",
        message: "An update to Caret version " + details.version " is available. Would you like to update and restart now?",
        buttons: [ { title: "Yes, update and restart" }, { title: "No thanks" }]
      }, function(id) { console.log(id); updateID = id });
    }
  });
  
  chrome.notifications.onButtonClicked.addListener(function(id, index) {
    if (id != updateID) return;
    if (index == 0) {
      chrome.runtime.reload();
    }
  });
  
});