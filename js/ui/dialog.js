define([
    "editor",
    "util/template!templates/dialog.html",
    "util/dom2"
  ], function(editor, inflate) {

  return function(text, buttons, callback) {
    if (typeof buttons == "function" || typeof buttons == "undefined") {
      callback = buttons;
      buttons = ["ok"];
    }
    
    buttons = buttons.map(function(options) {
      if (typeof options == "string") {
        return {
          label: options,
          value: options
        };
      }
      return options;
    });
    
    var modal = inflate.get("templates/dialog.html", {
      text: text,
      buttons: buttons
    });
    
    document.body.append(modal);
    
    var defaultButton = modal.find("button.default");
    if (!defaultButton) defaultButton = modal.find("button");
    defaultButton.focus();

    var onKeyDown = function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
      }
      //check escape
      if (e.keyCode == 27) {
        modal.remove();
        editor.focus();
        if (callback) callback();
      }
    };
    
    var onKeyPress = function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      //allow Enter to trigger clicks
      if (e.keyCode != 13) {
        e.preventDefault();
      }
      buttons.forEach(function(options) {
        if (typeof options == "string") return;
        if (options.shortcut && options.shortcut == String.fromCharCode(e.charCode)) {
          modal.remove();
          editor.focus();
          if (callback) callback(options.value);
        }
      });
    };

    var clickButton = function(e) {
      var target = e.target;
      if (!target.matches("button")) return;
      modal.remove();
      try {
        var value = JSON.parse(target.value);
        if (callback) callback(value);
      } catch (err) {
        //do nothing
      }
      editor.focus();
    };
    
    modal.onkeydown = onKeyDown;
    modal.onkeypress = onKeyPress;
    modal.onclick = clickButton;

  };

});