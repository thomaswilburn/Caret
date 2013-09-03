define(["file", "command", "settings!ace,user", "dom2"], function(File, command, Settings) {
  /*
  Module for loading the editor, adding window resizing and other events. Returns the editor straight from Ace.
  */
  var userConfig = Settings.get("user");
  var aceConfig = Settings.get("ace");

  var editor = window.editor = ace.edit("editor");
  var session = window.session = editor.getSession();
  session.setMode("ace/mode/javascript");
  
  var container = document.body.find(".editor-container");
  var containerSize = container.getBoundingClientRect();
  
  window.on("resize", function() {
    var size = container.getBoundingClientRect();
    var editorDiv = document.body.find("#editor");
    editorDiv.style.width = size.width + "px";
    editorDiv.style.height = size.height + "px";
    editor.resize();
  });
  window.dispatchEvent(new Event("resize"));
  
  var themes = document.querySelector(".theme");
  
  //one-time startup
  var init = function() {
    aceConfig.themes.forEach(function(theme) {
      var option = document.createElement("option");
      option.innerHTML = theme.alt || theme.label;
      option.setAttribute("value", theme.name);
      themes.append(option);
    });
    reset();
  };
  
  //reloaded when settings change
  var reset = function() {
    themes.value = userConfig.defaultTheme;
    editor.setTheme("ace/theme/" + themes.value);
  }
  
  command.on("init:startup", init);
  command.on("init:restart", reset);
  
  command.on("editor:theme", function(theme) {
    editor.setTheme("ace/theme/" + theme);
  });
  
  return editor;

});