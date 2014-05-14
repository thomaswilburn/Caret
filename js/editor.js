define([
    "storage/file",
    "command",
    "settings!ace,user",
    "util/dom2"
  ], function(File, command, Settings) {
  /*
  Module for loading the editor, adding window resizing and other events. Returns the editor straight from Ace.
  */
  var userConfig = Settings.get("user");
  var aceConfig = Settings.get("ace");

  var editor = window.editor = ace.edit("editor");
  
  var themes = document.querySelector(".theme");
  
  //disable focusing on the editor except by program
  document.find("textarea").setAttribute("tabindex", -1);
  
  //one-time startup
  var init = function() {
    aceConfig.themes.forEach(function(theme) {
      var option = document.createElement("option");
      option.innerHTML = theme.label;
      option.setAttribute("value", theme.name);
      themes.append(option);
    });
    reset();
    //let main.js know this module is ready
    return "editor";
  };
  
  //reloaded when settings change
  var reset = function() {
    userConfig = Settings.get("user");
    themes.value = userConfig.defaultTheme;
    editor.setTheme("ace/theme/" + themes.value);
    editor.setOption("scrollPastEnd", userConfig.scrollPastEnd);
    editor.setShowPrintMargin(userConfig.showMargin || false);
    editor.setPrintMarginColumn(userConfig.wrapLimit || 80);
    editor.setShowInvisibles(userConfig.showWhitespace || false);
    editor.setHighlightActiveLine(userConfig.highlightLine || false);
    editor.container.style.fontFamily = userConfig.fontFamily || null;
    defaultFontSize();
    ace.config.loadModule("ace/ext/language_tools", function() {
      editor.setOptions({
        enableBasicAutocompletion: userConfig.autocomplete
      });
    });
  };
  
  var defaultFontSize = function(c) {
    var size = Settings.get("user").fontSize;
    editor.container.style.fontSize = size ? size + "px" : null;
    if (c) c();
  };
  
  var adjustFontSize = function(delta, c) {
    var current = editor.container.style.fontSize;
    if (current) {
      current = current.replace("px", "") * 1;
    } else {
      current = Settings.get("user").fontSize;
    }
    var adjusted = current + delta;
    editor.container.style.fontSize = adjusted + "px";
    if (c) c();
  };
  
  command.on("editor:default-zoom", defaultFontSize);
  command.on("editor:adjust-zoom", adjustFontSize);
  
  command.on("init:startup", init);
  command.on("init:restart", reset);
  
  command.on("editor:theme", function(theme, c) {
    editor.setTheme("ace/theme/" + theme);
    themes.value = theme;
    editor.focus();
    if (c) c();
  });
  
  command.on("editor:print", function(c) {
    ace.require("ace/config").loadModule("ace/ext/static_highlight", function(static) {
      var session = editor.getSession();
      var printable = static.renderSync(session.getValue(), session.getMode(), editor.renderer.theme);
      var iframe = document.createElement("iframe");
      var css = "<style>" + printable.css + "</style>";
      var doc = css + printable.html;
      iframe.srcdoc = doc;
      iframe.width = iframe.height = 1;
      iframe.style.display = "none";
      document.body.append(iframe);
      setTimeout(function() {
        iframe.contentWindow.print();
        setTimeout(function() {
          iframe.remove();
        });
      });
    });
  });
  
  command.on("editor:word-count", function(c) {
    var text = editor.getSession().getValue();
    var lines = text.split("\n").length + " lines";
    var characters = text.length + " characters";
    var words = text.match(/\b\S+\b/g);
    words = words ? words.length : 0;
    command.fire("status:toast", [characters, words, lines].join(", "));
  });
  
  return editor;

});