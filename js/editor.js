define(["file", "dom2"], function(File) {
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
  
  return editor;

});