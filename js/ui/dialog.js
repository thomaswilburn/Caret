define([
    "editor",
    "util/template!templates/dialog.html"
  ], function(editor, inflate) {
    
  /*
  You can call dialog() to present a modal, since alert() isn't allowed.
  
  Currently, your callback will be passed the value set for the button pressed. Form support is coming.
  */

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
    
    document.body.appendChild(modal);
    setTimeout(function() {
      //trigger enter animations
      modal.classList.remove("enter");
    });
    
    var defaultButton = modal.querySelector("button.default");
    if (!defaultButton) defaultButton = modal.querySelector("button");
    defaultButton.focus();
    
    modal.addEventListener("click", function(e) {
      if (e.target != modal) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      defaultButton.focus();
    });

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
    }

    var clickButton = function(e) {
      var target = e.target;
      if (!target.matches("button")) return;
      modal.remove();
      var value;
      try {
        value = JSON.parse(target.value);
      } catch (err) {
        //do nothing
        value = target.value;
      }
      if (callback) callback(value);
      editor.focus();
    };
    
    modal.onkeydown = onKeyDown;
    modal.onkeypress = onKeyPress;
    modal.onclick = clickButton;

  };

});