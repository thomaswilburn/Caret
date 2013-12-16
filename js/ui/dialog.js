define([
    "editor",
    "util/dom2"
  ], function(editor) {

  return function(text, buttons, callback) {
    if (typeof buttons == "function" || typeof buttons == "undefined") {
      callback = buttons;
      buttons = ["ok"];
    }
    
    var modal = document.find("template#dialog").content.cloneNode(true).find(".modal-overlay");
    
    var buttonRow = modal.find(".button-row");
    var message = modal.find(".text");
    message.innerHTML = text;
    
    document.body.append(modal);

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
      })
    }

    modal.onkeydown = onKeyDown;
    modal.onkeypress = onKeyPress;

    var clickButton = function() {
      modal.remove();
      try {
        var value = JSON.parse(this.value);
        if (callback) callback(value);
      } catch (err) {
        //do nothing
      }
      editor.focus();
    };

    buttons.forEach(function(options) {
      var button = document.createElement("button");
      if (typeof options == "string") {
        options = {
          label: options,
          value: options
        }
      }
      button.innerHTML = options.label;
      button.value = JSON.stringify(options.value);
      if (options.focus) {
        button.className = "default";
      }
      buttonRow.append(button);
      button.on("click", clickButton);
    });

    var button = modal.find("button.default");
    if (!button) button = modal.find("button");
    button.focus();

  }

});