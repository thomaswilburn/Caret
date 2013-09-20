define(["dom2"], function() {

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
        if (callback) callback();
      }
    };

    modal.onkeydown = onKey;

    var clickButton = function() {
      modal.remove();
      var value = JSON.parse(this.value);
      if (callback) callback(value);
    };

    buttons.forEach(function(options) {
      var button = document.createElement("button");
      if (typeof options == "string") {
        options = {
          label: options,
          value: JSON.stringify(options)
        }
      }
      button.innerHTML = options.label;
      button.value = options.value;
      buttonRow.append(button);
      button.on("click", clickButton);
    });

    setTimeout(function() {
      //ensure focus, even from palette (which normally refocuses editor)
      modal.find("button").focus();
    });

  }

});