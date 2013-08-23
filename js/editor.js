define(["file", "command", "json!config/ace.json", "dom2"], function(File, command, cfg) {
  /*
  Module for loading the editor, adding window resizing and other events. Returns the editor straight from Ace.
  */

  var editor = window.editor = ace.edit("editor");
  var session = window.session = editor.getSession();
  session.setMode("ace/mode/javascript");
  editor.setTheme("ace/theme/chrome");
  
  var container = document.body.query(".editor-container").pop();
  var containerSize = container.getBoundingClientRect();
  
  window.on("resize", function() {
    var size = container.getBoundingClientRect();
    var editorDiv = document.body.query("#editor").pop();
    editorDiv.style.width = size.width + "px";
    editorDiv.style.height = size.height + "px";
    editor.resize();
  });
  window.dispatchEvent(new Event("resize"));
  
  var themes = document.querySelector(".theme");
  cfg.themes.forEach(function(theme) {
    var option = document.createElement("option");
    option.innerHTML = theme.alt || theme.label;
    option.setAttribute("value", theme.name);
    themes.append(option);
  });
  
  themes.value = "chrome";
  
  command.on("editor:theme", function(theme) {
    editor.setTheme("ace/theme/" + theme);
  });
  
  return editor;

});