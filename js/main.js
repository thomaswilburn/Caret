require([
  "command",
  "settings!user",
  "keys",
  "sessions",
  "menus",
  "palette"
  ], function(command, Settings) {
  
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
  
});