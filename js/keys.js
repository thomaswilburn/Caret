define(["settings!keys", "command", "editor", "dom2"], function(Settings, command, editor) {

  /*
  Still need to set Sublime keybindings
  */
  
  var keycodes = {
    9: "tab",
    13: "return",
    32: "space",
    37: "left",
    39: "right",
    38: "up",
    40: "down"
  };
  
  //we have to listen on keydown, because keypress will get caught by the window manager
  window.on("keydown", function(e) {
    var char = String.fromCharCode(e.keyCode);
    if (!e.shiftKey) char = char.toLowerCase();
    if (e.keyCode in keycodes) {
      char = keycodes[e.keyCode];
    }
    var combo = 
      e.ctrlKey ? "^-" + char :
      e.metaKey ? "M-" + char :
      char;
    var keyConfig = Settings.get("keys");
    if (combo in keyConfig) {
      e.preventDefault();
      command.fire(keyConfig[combo]);
    }
  });

});