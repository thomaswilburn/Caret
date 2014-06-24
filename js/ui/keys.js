define([
    "settings!keys,user",
    "command",
    "editor",
    "util/dom2",
    "util/aceLoad!js/ace/keybinding-vim.js"
  ], function(Settings, command, editor) {
  
  var keycodes = {
    9: "Tab",
    13: "Return",
    27: "Esc",
    32: "Space",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "Left",
    39: "Right",
    38: "Up",
    40: "Down",
    186: ";",
    187: "=",
    189: "-",
    190: ".",
    192: "`",
    220: "\\",
    222: "'"
  };
  
  var defaultAceCommands = ace.require("./commands/default_commands").commands;
  var AceCommandManager = ace.require("./commands/command_manager").CommandManager;
  var vimHandler = ace.require("ace/keyboard/vim").handler;
  var useragent = ace.require("ace/lib/useragent");

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
        
      //convert to Ace-style binding (use Command rather than Cmd)
      key = key
        .replace("Cmd-", "Command-")
        .replace("Opt-", "Option-")
        .replace("Control-", "Ctrl-");

      //Conversion between Mac and Windows
      if(useragent.isMac) {
          key = key
            .replace("Alt", "Option")
            .replace("Ctrl", "Command")
          //use MacCtrl to replace real Control on Mac
            .replace("MacCtrl", "Ctrl");
      } else {
          key = key
            .replace("Option", "Alt")
            .replace("Command", "Ctrl")
            .replace("MacCtrl", "Ctrl");
      }
          
      converted[key.toLowerCase()] = value;
    }
    return converted;
  };
  
  //need to auto-bind Ace keys, remove Ace conflicts
  var bindAce = function() {
    var handler = new AceCommandManager(useragent.isMac ? "mac" : "win", defaultAceCommands);
    var bindings = normalizeKeys(Settings.get("keys"));
    var ckb = handler.commandKeyBinding;
    for (var k in bindings) {
      var action = bindings[k];
      //if (!action.ace) continue;
      var parsed = handler.parseKeys(k);
      var existing = handler.findKeyCommand(parsed.hashId, parsed.key);
      var aceCommand = action.command == "ace:command" ? action.argument : action.ace;
      if (!aceCommand && ckb[parsed.hashId] && ckb[parsed.hashId][parsed.key]) {
        delete ckb[parsed.hashId][parsed.key];
      } else {
        handler.bindKey(k, aceCommand);
      }
    }
    handler.commandKeyBinding = ckb;
    //remove all existing bindings
    while(editor.keyBinding.removeKeyboardHandler(editor.getKeyboardHandler()));
    //add our new bindings
    editor.keyBinding.setDefaultHandler(handler);
    if (Settings.get("user").emulateVim) {
      editor.setKeyboardHandler(vimHandler);
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
    //Make Command key on Mac works as Ctrl key
    if (useragent.isMac && e.metaKey) prefixes.push("Command");
    if (e.ctrlKey) prefixes.push("Ctrl");
    if (e.altKey) prefixes.push(useragent.isMac ? "Option" : "Alt");
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