define(["editor"], function(editor) {

    var external = "";
    var element = document.find(".status-text");
    var update = function() {
      var selection = editor.getSelection();
      var displayText = "";
      if (selection.isEmpty()) {
        var cursor = selection.getCursor();
        displayText = (cursor.row + 1) + ":" + (cursor.column + 1);
      } else {
        displayText = editor.getCopyText().length + " characters selected";
      }
      if (external) {
        displayText += " - " + external;
      }
      element.innerHTML = displayText;
    };
    editor.on("changeSelection", update);
    
    var toastTimeout = null;
    
    return {
      setMessage: function(msg) {
        external = msg;
        if (toastTimeout !== null) {
          clearTimeout(toastTimeout);
          toastTimeout = null;
        }
        update();
      },
      clearMessage: function() {
        external = "";
        update();
      },
      toast: function(msg, seconds) {
        external = msg;
        if (toastTimeout !== null) {
          clearTimeout(toastTimeout);
        }
        toastTimeout = setTimeout(function() {
          external = "";
          update();
          toastTimeout = null;
        }, seconds ? seconds * 1000 : 5000)
      }
    }

});