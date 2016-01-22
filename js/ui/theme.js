define([
  "command",
  "settings!theme",
  "util/template!templates/theme.css",
  "util/dom2"
], function(command, Settings, inflate) {
  
  var element = document.querySelector("#caret-theme");
  
  var config = {
    isDark: false,
    cssText: "",
    cssClass: "ace-caret"
  };
  
  var updateTheme = function(c) {
    var theme = Settings.get("theme");
    config.isDark = theme.dark;
    var data = { blocks: [] };
    theme.styles[""] = theme.editor;
    for (var selector in theme.styles) {
      var block = {
        selector: selector.split(/,\s*/).map(function(s) { return ".ace-caret " + s }).join(", "),
        styles: []
      };
      var definition = theme.styles[selector];
      for (var prop in definition) {
        block.styles.push({
          prop: prop,
          value: definition[prop]
        });
      }
      data.blocks.push(block);
    }
    var css = inflate.getHTML("templates/theme.css", data);
    element.innerHTML = css;
  }
  
  ace.define("ace/theme/caret", [], function() {
    return config;
  });
  
  updateTheme();
  command.on("init:restart", updateTheme);
  
})