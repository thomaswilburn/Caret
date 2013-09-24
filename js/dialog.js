define(["editor", "dom2"], function(editor) {

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

    var onKey = function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      //check escape
      if (e.keyCode == 27) {
        modal.remove();
        editor.focus();
        if (callback) callback();
      }
    };

    modal.onkeydown = onKey;

    var clickButton = function() {
      modal.remove();
      var value = JSON.parse(this.value);
      if (callback) callback(value);
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

    setTimeout(function() {
      //ensure focus, even from palette (which normally refocuses editor)
      var button = modal.find("button.default");
      if (!button) button = modal.find("button");
      button.focus();
    });

  }

});