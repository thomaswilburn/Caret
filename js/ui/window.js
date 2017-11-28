define([
  "command",
  "storage/settingsProvider"
], function(command, Settings) {

  var frame = chrome.app.window.current();

  var setTheme = async function() {
    var data = await Settings.pull("user");
    var themes = {
      "dark": "css/caret-dark.css",
      "twilight": "css/caret-twilight.css",
      "light": "css/caret.css"
    };
    var theme = data.user.uiTheme || "light";
    var url = themes[theme] || themes.dark;
    document.querySelector("#theme").setAttribute("href", url);
  };
  setTheme();
  command.on("init:restart", setTheme);

  command.on("app:minimize", function() {
    frame.minimize();
    editor.focus();
  });

  command.on("app:maximize", function() {
    frame.isMaximized() || frame.isFullscreen() ? frame.restore() : frame.maximize();
    document.body.classList.toggle("fullscreened", !frame.isMaximized());
    editor.focus();
  });
  
  if (frame.isMaximized() || frame.isFullscreen()) {
    document.body.classList.add("fullscreened");
  }

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
    document.body.classList.add("fullscreened");
    Settings.pull("user").then(function(data) {
      if (data.user.immersiveFullscreen) {
        document.body.classList.add("immersive");
        editor.resize();
      }
    });
  }

  frame.onFullscreened.addListener(onFullscreen);
  if (frame.isFullscreen()) {
    onFullscreen();
  }

  frame.onRestored.addListener(function() {
    document.body.classList.remove("fullscreen");
    document.body.classList.remove("immersive");
  });

  //kill middle clicks if not handled
  document.body.addEventListener("click", function(e) {
    if (e.button == 1) {
      e.preventDefault();
    }
  });

});