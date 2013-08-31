define(["json!config/keys.json", "command", "editor", "dom2"], function(keyConfig, command, editor) {

  /*
  
  - assign standard keys: open, save, save as, close
  - set Sublime keybindings
  
  */
  
  //we need to cancel some keys on keydown to prevent Chrome from passing them to the WM
  window.on("keydown", function(e) {
    var char = String.fromCharCode(e.keyCode);
    if (!e.shiftKey) char = char.toLowerCase();
    var combo = 
      e.ctrlKey ? "^-" + char :
      e.metaKey ? "M-" + char :
      char;
    if (combo in keyConfig) {
      e.preventDefault();
      command.fire(keyConfig[combo]);
    }
  });

});