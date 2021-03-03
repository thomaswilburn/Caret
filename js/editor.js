define([
    "storage/file",
    "command",
    "settings!ace,user",
    "util/i18n"
  ], function(File, command, Settings, i18n) {
  /*
  Module for loading the editor, adding window resizing and other events. Returns the editor straight from Ace.
  */

  var noop = function() {};

  var userConfig = Settings.get("user");
  var aceConfig = Settings.get("ace");

  var editor = window.editor = ace.edit("editor");
  //disable annoying debug message
  editor.$blockScrolling = Infinity;
  
  var themes = document.querySelector(".theme");
  
  //disable focusing on the editor except by program
  document.querySelector("textarea").setAttribute("tabindex", -1);
  
  //one-time startup
  var init = function() {
    aceConfig.themes.forEach(function(theme) {
      var option = document.createElement("option");
      option.innerHTML = theme.label;
      option.setAttribute("value", theme.name);
      themes.appendChild(option);
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
    editor.setOptions({
      scrollPastEnd: userConfig.scrollPastEnd,
      showGutter: !userConfig.hideGutter,
      cursorStyle: userConfig.cursorStyle || "smooth"
    });
    editor.setBehavioursEnabled(!userConfig.disableBehaviors);
    editor.setShowPrintMargin(userConfig.showMargin || false);
    editor.setPrintMarginColumn(userConfig.wrapLimit || 80);
    editor.setShowInvisibles(userConfig.showWhitespace || false);
    editor.setHighlightActiveLine(userConfig.highlightLine || false);
    
    // did the font change?
    if (editor.container.style.fontFamily != userConfig.fontFamily) {
      var family = userConfig.fontFamily || null;
      if (family) {
        family = family.split(",");
        family.push("monospace");
        family = family.join(",");
      }
      editor.container.style.fontFamily = family;
    }
    
    testFont(userConfig.fontFamily);
    defaultFontSize();
    editor.container.style.lineHeight = userConfig.lineHeight || 1;
    ace.config.loadModule("ace/ext/language_tools", function() {
      editor.setOptions({
        enableBasicAutocompletion: userConfig.autocomplete || false,
        enableLiveAutocompletion: userConfig.autocompleteLive || false
      });
    });
  };

  var testFont = function(family) {
    if (!family) return
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var error = testFontExistence(family, context) || testFontMetrics(family, context);
    if (error) {
      // circular dependency, so require this dynamically
      require(["ui/dialog"], dialog => dialog(i18n.get(error)));
    }
  };

  var testFontExistence = function(family, context) {
    // If the font exists, the "iiii" text will be rendered in that font in both
    // cases below and width1 will equal width2. If the font doesn't exist,
    // however, that text will be rendered in a monospace font in the first case
    // and in a proportional font in the second, and since "i" is typically much
    // wider in a monospace font than in a similarly sized proportional one,
    // width1 will not equal width2.
    context.font = `72px '${family}', monospace`;
    var width1 = family && context.measureText("iiii").width;
    context.font = `72px '${family}', serif`;
    var width2 = family && context.measureText("iiii").width;
    return Math.abs(width1 - width2) > 1 ? "errorMissingFont" : null;
  };

  var testFontMetrics = function(family, context) {
    // If the font is monospace and has no kerning or ligatures, the "WWWWiAfV"
    // text in the first case will be the same width as the "iiiiVAfi" text in
    // the second case, and width1 will equal width2. If the font is
    // proportional, however, "WWWW" will me much wider than "iiii" and width1
    // will not equal width2. Also, if the font supports kerning or ligatures
    // (as Chrome OS's "Noto Sans Mono" monospace font did at some point),
    // "VAfi" will be narrower than iAfV" and width1 will also not equal width2.
    context.font = `72px '${family}'`;
    var width1 = family && context.measureText("WWWWiAfV").width;
    context.font = `72px '${family}'`;
    var width2 = family && context.measureText("iiiiVAfi").width;
    return Math.abs(width1 - width2) > 1 ? "errorProportionalFont" : null;
  };
  
  var defaultFontSize = function(c = noop) {
    var size = Settings.get("user").fontSize;
    editor.container.style.fontSize = size ? size + "px" : null;
    c();
  };
  
  var adjustFontSize = function(delta, c = noop) {
    var current = editor.container.style.fontSize;
    if (current) {
      current = current.replace("px", "") * 1;
    } else {
      current = Settings.get("user").fontSize;
    }
    var adjusted = current + delta;
    editor.container.style.fontSize = adjusted + "px";
    c();
  };
  
  command.on("editor:default-zoom", defaultFontSize);
  command.on("editor:adjust-zoom", adjustFontSize);
  
  command.on("init:startup", init);
  command.on("init:restart", reset);
  
  command.on("editor:theme", function(theme, c = noop) {
    editor.setTheme("ace/theme/" + theme);
    themes.value = theme;
    editor.focus();
    c();
  });
  
  command.on("editor:print", function(c = noop) {
    ace.require("ace/config").loadModule("ace/ext/static_highlight", function(highlighter) {
      var session = editor.getSession();
      var printable = highlighter.renderSync(session.getValue(), session.getMode(), editor.renderer.theme);
      var iframe = document.createElement("iframe");
      var css = "<style>" + printable.css + "</style>";
      var doc = css + printable.html;
      iframe.srcdoc = doc;
      iframe.width = iframe.height = 1;
      iframe.onload = function() {
        iframe.contentWindow.print();
        setTimeout(function() {
          
          iframe.parentElement.removeChild(iframe);
        });
        if (c) c();
      };
      document.body.appendChild(iframe);
    });
  });
  
  command.on("editor:word-count", function(c = noop) {
    var text = editor.getSession().getValue();
    var lines = text.split("\n").length;
    var characters = text.length;
    var words = text.match(/([\u0080-\uFFFF\w]\u0027?)+/g);
    words = words ? words.length : 0;
    command.fire("status:toast", i18n.get("editorWordCount", characters, words, lines));
    c();
  });
  
  return editor;

});
