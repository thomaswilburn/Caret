define(["file", "command", "settings!ace,user", "dom2"], function(File, command, Settings) {
  /*
  Module for loading the editor, adding window resizing and other events. Returns the editor straight from Ace.
  */
  var userConfig = Settings.get("user");
  var aceConfig = Settings.get("ace");

  var editor = window.editor = ace.edit("editor");
  
  var themes = document.querySelector(".theme");
  
  //one-time startup
  var init = function() {
    aceConfig.themes.forEach(function(theme) {
      var option = document.createElement("option");
      option.innerHTML = theme.label;
      option.setAttribute("value", theme.name);
      themes.append(option);
    });
    if (userConfig.emulateVim) {
      ace.require("ace/lib/net").loadScript("js/ace/keybinding-vim.js", function() {
        editor.setKeyboardHandler(ace.require("ace/keyboard/vim").handler);
      });
    }
    reset();
  };
  
  //reloaded when settings change
  var reset = function() {
    userConfig = Settings.get("user");
    themes.value = userConfig.defaultTheme;
    editor.setTheme("ace/theme/" + themes.value);
    editor.setShowPrintMargin(userConfig.showMargin || false);
    editor.setPrintMarginColumn(userConfig.wrapLimit || 80);
    editor.setShowInvisibles(userConfig.showWhitespace || false);
    editor.container.style.fontSize = userConfig.fontSize ? userConfig.fontSize + "px" : null;
    editor.container.style.fontFamily = userConfig.fontFamily || null;
    ace.config.loadModule("ace/ext/language_tools", function() {
      editor.setOptions({
        enableBasicAutocompletion: userConfig.autocomplete
      });
    });
  };
  
  command.on("init:startup", init);
  command.on("init:restart", reset);
  
  command.on("editor:theme", function(theme) {
    editor.setTheme("ace/theme/" + theme);
    editor.focus();
  });

  //disable focusing on the editor except by program
  document.find("textarea").setAttribute("tabindex", -1);
  
  return editor;

});