define([
    "command",
    "editor",
    "ui/statusbar",
    "settings!user,ace",
    "ui/extendedDialog"
  ], function(command, editor, status, Settings, extendedDialog) {

    var userConfig = Settings.get("user");
    command.on("init:restart", function() {
      userConfig = Settings.get("user");
    });

    //load the syntax commands and set them up in the command listings
    var aceConfig = Settings.get("ace");
    for (var i = 0; i < aceConfig.modes.length; i++) {
      var mode = aceConfig.modes[i];
      command.list.push({
        command: "session:syntax",
        argument: mode.name,
        label: "Set Syntax: " + mode.label
      });
    }
    for (var i = 0; i < aceConfig.themes.length; i++) {
      var theme = aceConfig.themes[i];
      command.list.push({
        command: "editor:theme",
        argument: theme.name,
        label: "Set Theme: " + theme.label
      });
    }

    //this is a place to put bindings that don't have direct equivalents in Ace, but are required for Sublime compatibility
    command.on("sublime:expand-to-line", function(c) {
      editor.execCommand("gotolinestart");
      editor.execCommand("selecttolineend");
      if (c) c();
    });

    command.on("sublime:expand-to-paragraph", function(c) {
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
      if (c) c();
    });

    command.on("sublime:expand-to-matching", function(c) {
      var Range = ace.require("ace/range").Range;
      var position = editor.getCursorPosition();
      var line = editor.getSession().getLine(position.row);
      var depth = 0;
      var openers = {
        "(": ")",
        "{": "}"
      };
      var closers = {
        ")": "(",
        "}": "{"
      };
      //look for tokens inside the line first
      var matchable = /(['"({])/;
      for (var i = position.column; i >= 0; i--) {
        if (matchable.test(line[i])) {
          var match = line[i];
          if (match in openers) {
            match = openers[match];
          }
          for (var j = position.column + 1; j < line.length; j++) {
            if (line[j] == match && depth == 0) {
              var selection = editor.getSession().getSelection();
              selection.setRange(new Range(position.row, i + 1, position.row, j));
              return;
            } else if (line[j] == match) {
              depth--;
            } else if (line[j] == closers[match]) {
              depth++;
            }
          }
        }
      }
      //if we couldn't find any matching pairs, we'll just use the default multiline bracket selection
      //this is a little wonky, but it's better than nothing.
      editor.execCommand("jumptomatching");
      editor.execCommand("selecttomatching");
      if (c) c();
    });

    command.on("sublime:tabs-to-spaces", function(c) {
      var session = editor.getSession();
      var text = session.getValue();
      var spaces = new Array(userConfig.indentation + 1).join(" ");
      text = text.replace(/\t/g, spaces);
      session.setValue(text);
      if (c) c();
    });

    command.on("sublime:spaces-to-tabs", function(c) {
      var session = editor.getSession();
      var text = session.getValue();
      var replace = new RegExp(new Array(userConfig.indentation + 1).join(" "), "g");
      text = text.replace(replace, "\t");
      session.setValue(text);
      if (c) c();
    });
    
    command.on("ace:set-newline-mode", function(type, c) {
      editor.session.doc.setNewLineMode(type);
      if (c) c();
    });
    
    command.on("ace:trim-whitespace", function(c) {
      var session = editor.getSession();
      var folds = session.getAllFolds();
      var doc = session.doc;
      var trimEmpty = userConfig.trimEmptyLines;
      var Search = ace.require("./search").Search;
      var re = trimEmpty ? /\s+$/ : /(\S)\s+$/;
      var search = new Search().set({
        wrap: true,
        needle: re
      });
      var ranges = search.findAll(session);
      ranges.forEach(function(range) {
        var original = session.getTextRange(range);
        var replaced = original.replace(re, trimEmpty ? "" : "$1");
        doc.replace(range, replaced);
      });
      session.unfold();
      session.addFolds(folds);
      if (c) c();
    });

    command.on("npp:column-editor", function(c) {
      var initNum = 0;
      var incNum = 0;
      var leadingZero = false;
      var base = 10;
      extendedDialog(
        "Column editor",
        [{pretext: "Initial number: ", type: "text", name: "initnum", value: "0", misc: "size=\"4\""},
         {pretext: "Increment by: ", type: "text", name: "incnum", value: "1", misc: "size=\"4\"", br: "<br>"},
         {type: "checkbox", name: "padding", value: "pad", posttext: "Leading zeroes", br: "<br>"},
         {type: "radio", name: "base", value: "decimal", misc: "checked=\"checked\"", posttext: "Decimal"},
         {type: "radio", name: "base", value: "hex", posttext: "Hex"},
         {type: "radio", name: "base", value: "octal", posttext: "Octal"},
         {type: "radio", name: "base", value: "binary", posttext: "Binary", br:"<br>"}],
        [{label: "OK", value: true, focus: true, shortcut: "\r"}],
        function(inputs) {
          // inputs[0] = type, inputs[1] = name, inputs[2] = value, inputs[3] = checked (if radio/checkbox)
          for (var i = 0; i < inputs.length; i++) {
            if (inputs[i][0] == "text") {
              if (inputs[i][1] == "initnum") {
                initNum = parseInt(inputs[i][2]);
              } else if (inputs[i][1] == "incnum") {
                incNum = parseInt(inputs[i][2]);
              }
            } else if (inputs[i][0] == "checkbox") {
              if (inputs[i][1] == "padding") {
                leadingZero = inputs[i][3];
              }
            } else if (inputs[i][0] == "radio") {
              if ((inputs[i][1] == "base") && inputs[i][3]) {
                switch (inputs[i][2])
                {
                  case "binary":
                    base = 2;
                    break;
                  case "octal":
                    base = 8;
                    break;
                  case "hex":
                    base = 16;
                    break;
                  case "decimal":
                  default:
                    base = 10;
                    break;
                }
              }
            }
          }
          editor.execCommand({
            exec:function() {
              var Range = ace.require("ace/range").Range;
              var ranges = editor.selection.rangeList.ranges;
              var maxNumLength = (((ranges.length - 1) * incNum) + initNum).toString(base).length;
              var padZero = new Array(maxNumLength + 1).join('0');
              var counter = initNum - incNum;
              // If multiple selections don't exist, rangeList will return 0 so replace with single range
              if (ranges.length < 1) {
                ranges = [editor.selection.getRange()];
              }
              for (var i = 0; i < ranges.length; i++) {
                var number = (counter + incNum).toString(base).toUpperCase();
                if (leadingZero && (number.length < maxNumLength)) {
                  number = (padZero + number).substr(-maxNumLength);
                }
                editor.session.doc.replace(ranges[i], number);
                counter += incNum;
              }
            },
            readOnly: true,
            scrollIntoView: "none"
          })
        }
      );
      if (c) c();
    });

    //we also add a command redirect for firing Ace commands via regular command attributes
    command.on("ace:command", editor.execCommand.bind(editor));

    //unbind the keys for the palette, whatever it does.
    editor.commands.bindKey("Ctrl-P", null);
    editor.commands.bindKey("Ctrl-Shift-P", null);

    //filter some Ace commands for UI purposes
    var isRecording = false;
    command.on("ace:togglemacro", function(c) {
      isRecording = !isRecording;
      editor.execCommand("togglerecording");
      editor.focus();
      if (isRecording) {
        status.setMessage("Recording macro...");
      } else {
        status.clearMessage();
      }
      if (c) c();
    });

    //API bindings
    command.on("editor:insert", function(text, c) {
      editor.insert(text);
      if (c) c();
    });

});
