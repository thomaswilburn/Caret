define([
    "command",
    "editor",
    "ui/statusbar",
    "settings!user,ace"
  ], function(command, editor, status, Settings) {

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

    command.on("ace:trim-whitespace", function(c) {
      var session = editor.getSession();
      var doc = session.doc;
      var selection = editor.getSelection();
      var lines = doc.getAllLines();
      lines.forEach(function(line, i) {
        var range = selection.getLineRange(i);
        range.end.row = range.start.row;
        range.end.column = line.length;
        if (userConfig.trimEmptyLines) {
          line = line.replace(/\s+$/, "");
        } else {
          line = line.replace(/(\S)\s+$/, "$1");
        }
        doc.replace(range, line);
      });
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
