define(["command", "editor"], function(command, editor) {

    //this is a place to put bindings that don't have direct equivalents in Ace, but are required for Sublime compatibility

    command.on("sublime:expand-to-line", function() {
      editor.execCommand("gotolinestart");
      editor.execCommand("selecttolineend");
    });

    //we also add a command redirect for firing Ace commands via regular command attributes

    command.on("ace:command", function(cmd) {
      editor.execCommand(cmd);
    });

});