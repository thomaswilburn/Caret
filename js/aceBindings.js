define([
    "command",
    "editor",
    "ui/statusbar",
    "settings!user,ace",
    "util/i18n"
  ], function(command, editor, status, Settings, i18n) {

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
        label: i18n.get("setSyntax", mode.label)
      });
    }
    for (var i = 0; i < aceConfig.themes.length; i++) {
      var theme = aceConfig.themes[i];
      command.list.push({
        command: "editor:theme",
        argument: theme.name,
        label: i18n.get("setTheme", theme.label)
      });
    }

    //this is a place to put bindings that don't have direct equivalents in Ace, but are required for Sublime compatibility
    
    //this is now in Ace, but aliased for back-compat
    command.on("sublime:expand-to-line", function(c) {
      editor.execCommand("expandtoline");
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
    
    command.on("sublime:select-or-more-after", function() {
      if (editor.selection.isEmpty()) {
        editor.selection.selectWord();
      } else {
        editor.execCommand("selectMoreAfter");
      }
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

    command.on("sublime:wrap", function(c) {
      var Range = ace.require("ace/range").Range;
      var lang = ace.require("ace/lib/lang");
      var session = editor.getSession();
      var selection = editor.getSelection();
      var isBackwards = editor.selection.isBackwards();
      var selectionLead = isBackwards ? editor.selection.getSelectionLead() : editor.selection.getSelectionAnchor();
      var selectionAnchor = isBackwards ? editor.selection.getSelectionAnchor() : editor.selection.getSelectionLead();
      var startLine = selectionLead.row;
      var endLine = selectionAnchor.row;
      while (startLine > 0) {
        startLine--;
        var line = session.getLine(startLine).replace(/\s+/, "");
        if (line == "") {
          //we'll skip the preceding space
          startLine += 1;
          break;
        }
      }
      var length = session.getLength();
      while (endLine < length) {
        endLine++;
        var line = session.getLine(endLine).replace(/\s+/, "");
        if (line == "") {
          break;
        }
      }
      editor.clearSelection();
      editor.moveCursorTo(startLine, 0);
      selection.selectTo(endLine, 0);
      var indentStartCol = session.getLine(startLine).length - lang.stringTrimLeft(session.getLine(startLine)).length;
      var selectedText = lang.stringTrimLeft(session.doc.getTextRange(new Range(startLine, 0, endLine, 0)).replace(/\n/g, " "));
      var selectedTextParts = selectedText.split(" ");
      var partCount = 0;
      var rulerColumn = editor.renderer.getPrintMarginColumn() - 1;
      var textToAdd = "";
      var indentValue = indentStartCol > 0 ? new Array(indentStartCol + 1).join(' ') : "";
      var lineToAdd = indentValue;
      while (partCount < selectedTextParts.length) {
        if (selectedTextParts[partCount].length + lineToAdd.length + 1 < rulerColumn) {
          lineToAdd += (partCount === 0 ? "" : " ") + selectedTextParts[partCount];
        } else {
          lineToAdd = lang.stringTrimRight(lineToAdd);
          if (lineToAdd.length > 0) {
            lineToAdd += session.doc.getNewLineCharacter();
            textToAdd += lineToAdd;
          }
          if (selectedTextParts[partCount].length + indentValue.length >= rulerColumn) {
            var tmpLine = selectedTextParts[partCount];
            while (tmpLine.length + indentValue.length >= rulerColumn) {
              lineToAdd = indentValue + tmpLine.slice(0, rulerColumn - (indentValue.length + 1));
              lineToAdd = lang.stringTrimRight(lineToAdd);
              lineToAdd += session.doc.getNewLineCharacter();
              textToAdd += lineToAdd;
              tmpLine = tmpLine.slice(rulerColumn - (indentValue.length + 1));
            }
            lineToAdd = indentValue + tmpLine;
          } else {
            lineToAdd = indentValue + selectedTextParts[partCount];
          }
        }
        partCount++;
      }
      textToAdd += lang.stringTrimRight(lineToAdd);
      var theNewText = lang.stringTrimLeft(textToAdd.replace(/\n/g, " "));
      if (theNewText !== selectedText) {
        // Add newline if the text has changed
        textToAdd += session.doc.getNewLineCharacter();
      }
      editor.session.doc.replace(new Range(startLine, 0, endLine, 0), textToAdd);
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
        status.setMessage(i18n.get("recordingMacro"));
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
