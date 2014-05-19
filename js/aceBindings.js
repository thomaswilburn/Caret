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
      editor.execCommand({
          exec:function() {
            var isBackwards = editor.selection.isBackwards();
            var selectionStart = isBackwards ? editor.selection.getSelectionLead() : editor.selection.getSelectionAnchor();
            var selectionEnd = isBackwards ? editor.selection.getSelectionAnchor() : editor.selection.getSelectionLead();
            
            editor.clearSelection();
            
            editor.selection.moveCursorTo(selectionStart.row, 0);
            editor.selection.selectTo(selectionEnd.row + 1, 0);
          },
          multiSelectAction: "forEach"
      })
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

    command.on("sublime:join-lines", function(c) {
      editor.execCommand({
          exec:function() {
            var lang = ace.require("ace/lib/lang");
            var Range = ace.require("ace/range").Range;
            var isBackwards = editor.selection.isBackwards();
            var selectionStart = isBackwards ? editor.selection.getSelectionLead() : editor.selection.getSelectionAnchor();
            var selectionEnd = isBackwards ? editor.selection.getSelectionAnchor() : editor.selection.getSelectionLead();
            var firstLineEndCol = editor.session.doc.getLine(selectionStart.row).length
            var selectedText = editor.session.doc.getTextRange(editor.selection.getRange());
            var insertLine = editor.session.doc.getLine(selectionStart.row);

            selectedText = selectedText.replace(/\n\s*/, " ");
            var selectedCount = selectedText.length;

            for (var i = selectionStart.row + 1; i <= selectionEnd.row + 1; i++) {
              var curLine = lang.stringTrimLeft(lang.stringTrimRight(editor.session.doc.getLine(i)));
              
              if (curLine.length !== 0) {
                  curLine = " " + curLine;
              }

              insertLine += curLine;
            };

            if (selectionEnd.row + 1 < (editor.session.doc.getLength() - 1)) {
              // Don't insert a newline at the end of the document
              insertLine += editor.session.doc.getNewLineCharacter();
            }

            editor.clearSelection();
            editor.session.doc.replace(new Range(selectionStart.row, 0, selectionEnd.row + 2, 0), insertLine);

            if (selectedCount > 0) {
              // Select the text that was previously selected
              editor.selection.moveCursorTo(selectionStart.row, selectionStart.column);
              editor.selection.selectTo(selectionStart.row, selectionStart.column + selectedCount);
            } else {
              // If the joined line had something in it, start the cursor at that something
              firstLineEndCol = editor.session.doc.getLine(selectionStart.row).length > firstLineEndCol ? (firstLineEndCol + 1) : firstLineEndCol;
              editor.selection.moveCursorTo(selectionStart.row, firstLineEndCol);
            }
          },
          multiSelectAction: "forEach"
      })
      if (c) c();
    });

    command.on("sublime:invert-selection", function(c) {
      var Range = ace.require("ace/range").Range;
      var endRow = editor.session.doc.getLength() - 1;
      var endCol = editor.session.doc.getLine(endRow).length;
      var initialScroll = editor.session.getScrollTop();
      var ranges = editor.selection.rangeList.ranges;
      var newRanges = [];
      var tmpRanges = ranges;

      // If multiple selections don't exist, rangeList will return 0 so replace with single range
      if (ranges.length < 1) {
        ranges = [editor.selection.getRange()];
      }

      for (var i = 0; i < ranges.length; i++) {
        if (i == (ranges.length - 1)) {
          // The last selection must connect to the end of the document, unless it already does
          if (!(ranges[i].end.row === endRow && ranges[i].end.column === endCol)) {
              newRanges.push(new Range(ranges[i].end.row, ranges[i].end.column, endRow, endCol));
          }
        }

        if (i === 0) {
          // The first selection must connect to the start of the document, unless it already does
          if (!(ranges[i].start.row === 0 && ranges[i].start.column === 0)) {
              newRanges.push(new Range(0, 0, ranges[i].start.row, ranges[i].start.column));
          }
        } else {
          newRanges.push(new Range(ranges[i-1].end.row, ranges[i-1].end.column, ranges[i].start.row, ranges[i].start.column));
        }
      }
      
      editor.exitMultiSelectMode();
      editor.clearSelection();

      // Set the main cursor to the last range that will be seen
      editor.selection.moveCursorTo(newRanges[newRanges.length-1].end.row, newRanges[newRanges.length-1].end.column, false);
      
      for(var i = 0; i < newRanges.length; i++) {
          editor.selection.addRange(newRanges[i], false);
      }
      
      // Make it so the user sees no change in scrolling
      editor.session.setScrollTop(initialScroll);
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
