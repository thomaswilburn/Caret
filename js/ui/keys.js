define([
    "settings!keys",
    "command",
    "editor",
    "util/dom2"
  ], function(Settings, command, editor) {
  
  var keycodes = {
    9: "Tab",
    13: "Return",
    32: "Space",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "Left",
    39: "Right",
    38: "Up",
    40: "Down",
    187: "=",
    189: "-"
  };
  
  var defaultAceCommands = ace.require("./commands/default_commands").commands;
  var AceCommandManager = ace.require("./commands/command_manager").CommandManager;
  
  //back-compat: we now use Ace-style bindings (Ctrl-X) instead of Vim-style (^-x)
  var normalizeKeys = function(config) {
    var converted = {};
    for (var key in config) {
      var value = config[key];
      //detect old syntax
      if (key.indexOf("^-") > -1 || key.indexOf("M-") > -1) {
        key = key
          .replace(/\^-/g, "Ctrl-")
          .replace(/M-/g, "Alt-")
          .replace(/-([A-Z]+)$/, "-Shift-$1")
          .replace(/-([a-z]+)$/, function(match) { return match.toUpperCase() });
      }
      converted[key.toLowerCase()] = value;
    }
    return converted;
  };
  
  //need to remove existing Ace conflicts
  var bindAce = function() {
    var handler = new AceCommandManager("win", defaultAceCommands);
    editor.setKeyboardHandler(handler);
    var bindings = normalizeKeys(Settings.get("keys"));
    for (var k in bindings) {
      var action = bindings[k];
      //if (!action.ace) continue;
      handler.bindKey(k, action.ace);
    }
  };
  command.on("init:startup", bindAce);
  command.on("init:restart", bindAce);
  
  //we have to listen on keydown, because keypress will get caught by the window manager
  window.on("keydown", function(e) {
    var char = String.fromCharCode(e.keyCode);
    if (e.keyCode in keycodes) {
      char = keycodes[e.keyCode];
    }
    var prefixes = [];
    if (e.ctrlKey) prefixes.push("Ctrl");
    if (e.altKey) prefixes.push("Alt");
    if (e.shiftKey) prefixes.push("Shift");
    var combo = prefixes.length ? prefixes.join("-") + "-" + char : char;
    combo = combo.toLowerCase();
    var keyConfig = normalizeKeys(Settings.get("keys"));
    if (combo in keyConfig) {
      e.preventDefault();
      var action = keyConfig[combo];
      if (typeof action == "string") {
        action = {
          command: action
        };
      }
      if (action.ace) {
        //we're going to bind these directly on startup
        //so we shouldn't act on them
        return;// editor.execCommand(action.ace);
      }
      command.fire(action.command, action.argument);
    }
  });

});