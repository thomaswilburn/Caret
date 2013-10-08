define(["command", "editor", "statusbar"], function(command, editor, status) {

    //this is a place to put bindings that don't have direct equivalents in Ace, but are required for Sublime compatibility

    command.on("sublime:expand-to-line", function() {
      editor.execCommand("gotolinestart");
      editor.execCommand("selecttolineend");
    });
    
    command.on("sublime:expand-to-paragraph", function() {
      var session = editor.getSession();
      var selection = editor.getSelection();
      var currentLine = editor.getCursorPosition().row;
      var startLine = currentLine;
      var endLine = currentLine;
      while (startLine > 0) {
        startLine--;
        var line = session.getLine(startLine);
        if (line == "") {
          //we'll skip the preceding space
          startLine += 1;
          break;
        }
      }
      var length = session.getLength();
      while (endLine < length) {
        endLine++;
        var line = session.getLine(endLine);
        if (line == "") {
          break;
        }
      }
      editor.clearSelection();
      editor.moveCursorTo(startLine);
      selection.selectTo(endLine);
    });
    
    command.on("sublime:expand-to-matching", function() {
      editor.execCommand("jumptomatching");
      editor.execCommand("selecttomatching");
    })

    //we also add a command redirect for firing Ace commands via regular command attributes
    command.on("ace:command", editor.execCommand.bind(editor));
    
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