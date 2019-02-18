define([
    "settings!keys,user",
    "command",
    "editor",
    "util/chromePromise",
    "util/aceLoad!js/ace/keybinding-vim.js"
  ], function(Settings, command, editor, chromeP) {

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
  var Range = ace.require("ace/range").Range;

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

  //need to auto-bind Ace keys, remove Ace conflicts
  var bindAce = async function() {
    var platform = await chromeP.runtime.getPlatformInfo();
    var os = platform.os == "mac" ? "mac" : "win";
    var handler = new AceCommandManager(os, defaultAceCommands);
    var bindings = normalizeKeys(Settings.get("keys"));
    var ckb = handler.commandKeyBinding;
    for (var k in bindings) {
      //unbind keys that we take over from Ace
      if (ckb[k]) {
        delete ckb[k];
      }
      var action = bindings[k];
      if (!action) continue;
      //if a key is defined with an Ace command, bind it via their handler
      if (action.ace || action.command == "ace:command") {
        handler.bindKey(k, action.ace || action.argument);
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
  }
  command.on("init:startup", bindAce);
  command.on("init:restart", bindAce);

  //we have to listen on keydown, because keypress will get caught by the window manager
  window.addEventListener("keydown", function(e) {
    var char = String.fromCharCode(e.keyCode);
    if (e.keyCode in keycodes) {
      char = keycodes[e.keyCode];
    }
    var prefixes = [];
    //On Mac, Cmd is metakey. Elsewhere, Chrome ignores it, so should be safe.
    if (e.metaKey || e.ctrlKey) prefixes.push("Ctrl");
    if (e.altKey) prefixes.push("Alt");
    if (e.shiftKey) prefixes.push("Shift");
    var combo = prefixes.length ? prefixes.join("-") + "-" + char : char;
    combo = combo.toLowerCase();
    var keyConfig = normalizeKeys(Settings.get("keys"));
    //if the key is set with a valid command in the config
    if (combo in keyConfig && keyConfig[combo]) {
      e.preventDefault();
      var action = keyConfig[combo];
      if (!action) return;
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

  // Return command when the line is to be cut or copied
  // Only do this if no characters have been selected
  var getLineCutCopyCommand = function(e) {
    if (!e.metaKey && !e.ctrlKey) return;
    if (!editor.selection.isEmpty()) return;

    var char = String.fromCharCode(e.keyCode).toLowerCase();
    var commands = {
      c: "copy",
      x: "cut"
    };
    return commands[char];
  };

  var resetPosition = (command, session) => (
    command === 'cut' ? resetCutPosition(session) : resetCopyPosition()
  );

  // Reset the selection position to where the user had previously selected to
  // copy the row
  var resetCopyPosition = () => (position, index) => {
    var row = position.row;
    var column = position.column;
    var newRange = new Range(row, column, row, column);
    var action = index === 0 ? 'setRange' : 'addRange';
    editor.selection[action](newRange);
  };

  // Reset the selection position to the end of the next row now that the row
  // has been cut
  var resetCutPosition = (session) => (position, index) => {
    var row = position.row - index;
    var column = session.getLine(row).length;
    var newRange = new Range(row, column, row, column);
    var action = index === 0 ? 'setRange' : 'addRange';
    editor.selection[action](newRange);
  };

  var createOrExtendRange = function(start, end, previousRange) {
    const range = new Range(start.row, start.column, end.row, end.column);

    // If the ranges intersect, create a new combined range
    if (previousRange && previousRange.intersects(range)) {
      const previous = previousRange.start;
      return new Range(previous.row, previous.column, end.row, end.column);
    }

    return range;
  };

  var getRange = function(isLastRow, session, position, previousRange) {
    // Last row selection needs to select from the end of the previous row to
    // the end of the current row
    if (isLastRow) {
      var previousRowColumn = session.getLine(position.row - 1).length;
      var column = session.getLine(position.row).length;
      var start = { row: position.row - 1, column: previousRowColumn };
      var end = { row: position.row, column: column };
      return createOrExtendRange(start, end, previousRange);
    }

    // Row selection needs to select from the start of the current row to the
    // start of the next row
    var start = { row: position.row, column: 0 };
    var end = { row: position.row + 1, column: 0 };
    return createOrExtendRange(start, end, previousRange);
  };

  // Support copying and cutting entire lines
  window.addEventListener("keydown", function(e) {
    var command = getLineCutCopyCommand(e);
    if (!command) return;

    var session = editor.getSession();

    // Select the entire line
    var previousRange = null;
    var positions = editor.selection.getAllRanges().map(function(range) {
      var position = Object.assign({}, range.start);
      var isLastRow = position.row + 1 === session.getLength();
      var range = getRange(isLastRow, session, position, previousRange);
      editor.selection.addRange(range);
      previousRange = range;
      return position;
    });

    // Run matching command
    e.preventDefault();
    document.execCommand(command);

    // Reset selection to original position or close to for cut lines
    positions.forEach(resetPosition(command, session));
  });

  // cancel esc, but only on keyup
  window.addEventListener("keyup", function(e) {
    if (e.keyCode == 27) e.preventDefault();
  });

});
