define([
    "editor",
    "util/template!templates/extendedDialog.html",
    "util/dom2"
  ], function(editor, inflate) {
    
  /*
  You can call dialog() to present a modal, since alert() isn't allowed.
  
  Currently, your callback will be passed the value set for the button pressed. Form support is limited.
  */

  return function(text, forms, buttons, callback) {
    if (typeof forms == "function" || typeof forms == "undefined") {
      callback = forms;
      buttons = ["ok"];
      forms = [""];
    } else if (typeof buttons == "function" || typeof buttons == "undefined") {
      callback = buttons;
      buttons = ["ok"];
    }
    
    forms = forms.map(function(options) {
	  if (typeof options == "string") {
        return {
          // Assume no forms are wanted
          pretext: "<!--",
          br: "-->"
        };
      }
      return options;
    });

    buttons = buttons.map(function(options) {
      if (typeof options == "string") {
        return {
          label: options,
          value: options
        };
      }
      return options;
    });
    
    var modal = inflate.get("templates/extendedDialog.html", {
      text: text,
      forms: forms,
      buttons: buttons
    });
    
    document.body.append(modal);
    setTimeout(function() {
      //trigger enter animations
      modal.removeClass("enter");
    });

    var inputValues = function() {
	  var value = new Array(modal.getElementsByTagName("input").length);
      for (var i = modal.getElementsByTagName("input").length - 1; i >= 0; i--) {
      	switch (modal.getElementsByTagName("input").item(i).type) {
  	    case "checkbox":
  	    case "radio":
  	      value[i] = [modal.getElementsByTagName("input").item(i).type,
  					  modal.getElementsByTagName("input").item(i).name,
  					  modal.getElementsByTagName("input").item(i).value,
  					  modal.getElementsByTagName("input").item(i).checked];
  	      break;
  	    case "text":
  	    default:
  	      value[i] = [modal.getElementsByTagName("input").item(i).type,
  					  modal.getElementsByTagName("input").item(i).name,
  					  isNaN(parseInt(modal.getElementsByTagName("input").item(i).value)) ?
  					  		initValues[i][2] : modal.getElementsByTagName("input").item(i).value];
  	      break;
      	}
      }
      return value;
    }

    var initValues = inputValues();
    
    var defaultButton = modal.find("button.default");
    if (!defaultButton) defaultButton = modal.find("button");
    defaultButton.focus();
    
    modal.on("click", function(e) {
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
      if (!(e.keyCode == 13 || (e.keyCode >= 48 && e.keyCode <= 57))) {
        e.preventDefault();
      }
      buttons.forEach(function(options) {
        if (typeof options == "string") return;
        if (options.shortcut && options.shortcut == String.fromCharCode(e.charCode)) {
          modal.remove();
          editor.focus();
          if (callback) callback(inputValues());
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
  	  var outValue = inputValues();
  	  outValue.unshift(value);
      if (callback) callback(outValue);
      editor.focus();
    };
    
    modal.onkeydown = onKeyDown;
    modal.onkeypress = onKeyPress;
    modal.onclick = clickButton;

  };

});