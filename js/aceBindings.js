define(["command", "editor", "statusbar"], function(command, editor, status) {

    //this is a place to put bindings that don't have direct equivalents in Ace, but are required for Sublime compatibility

    command.on("sublime:expand-to-line", function() {
      editor.execCommand("gotolinestart");
      editor.execCommand("selecttolineend");
    });

    //we also add a command redirect for firing Ace commands via regular command attributes

    command.on("ace:command", function(cmd) {
      editor.execCommand(cmd);
    });
    
    //unbind the keys for the palette, whatever it does.
    editor.commands.bindKey("Ctrl-P", null);
    editor.commands.bindKey("Ctrl-Shift-P", null);
    
    //filter some Ace commands for UI purposes
    var isRecording = false;
    command.on("ace:togglemacro", function() {
      isRecording = !isRecording;
      editor.execCommand("togglerecording");
      editor.focus();
      if (isRecording) {
        status.setMessage("Recording macro...");
      } else {
        status.clearMessage();
      }
    })

});