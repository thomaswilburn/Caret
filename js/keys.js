define(["settings!keys", "command", "editor", "dom2"], function(Settings, command, editor) {

  /*
  Still need to set Sublime keybindings
  */
  
  var keycodes = {
    9: "TAB",
    13: "RETURN",
    32: "SPACE",
    37: "LEFT",
    39: "RIGHT",
    38: "UP",
    40: "DOWN"
  };
  
  //need to remove existing Ace conflicts on init:start
  
  //we have to listen on keydown, because keypress will get caught by the window manager
  window.on("keydown", function(e) {
    var char = String.fromCharCode(e.keyCode);
    if (e.keyCode in keycodes) {
      char = keycodes[e.keyCode];
    }
    if (!e.shiftKey) char = char.toLowerCase();
    var combo = 
      e.ctrlKey ? "^-" + char :
      e.metaKey ? "M-" + char :
      char;
    var keyConfig = Settings.get("keys");
    if (combo in keyConfig) {
      e.preventDefault();
      var action = keyConfig[combo];
      if (typeof action == "string") {
        action = {
          command: action
        };
      }
      if (action.ace) {
        return editor.execCommand(action.ace);
      }
      command.fire(action.command, action.argument);
    }
  });

});