define(["dom2"], function() {

  return function(text, buttons, callback) {
    if (typeof buttons == "function") {
      callback = buttons;
      buttons = ["ok", "cancel"];
    }
    var modal = document.createElement("div");
    modal.className = "modal-overlay";
    var dialog = document.createElement("div");
    dialog.className = "dialog";
    dialog.innerHTML = text;
    var buttonRow = document.createElement("div");
    buttonRow.className = "button-row";
    modal.append(dialog);
    dialog.append(buttonRow);

    var clickButton = function() {
      modal.remove();
      var value = JSON.parse(this.value);
      callback(value);
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
    document.body.append(modal);
  }

});