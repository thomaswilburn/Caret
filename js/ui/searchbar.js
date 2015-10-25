define([
    "sessions",
    "command",
    "editor",
    "storage/file",
    "settings!user",
    "ui/statusbar",
    "ui/projectManager",
    "util/i18n"
  ], function(sessions, command, editor, File, Settings, status, project, i18n) {

  var Searchbar = function() {
    var self = this;
    this.element = document.find(".searchbar");
    this.input = this.element.find(".search-box");
    this.maxMatches = Settings.get("user").maxSearchMatches || 50;

    command.on("init:restart", function() {
      self.maxMatches = Settings.get("user").maxSearchMatches || 50;
    });

    this.currentSearch = {
      matches: 0,
      running: false
    };

    this.bindInput();
    this.bindButtons();
  };

  Searchbar.prototype = {
    bindInput: function() {
      var input = this.input;
      var self = this;

      input.on("keydown", function(e) {
        //escape
        if (e.keyCode == 27) {
          self.deactivate();
          return;
        }
        //enter
        if (e.keyCode == 13) {
          e.stopImmediatePropagation();
          e.preventDefault();
          self.search();
          return;
        }
      });
    },

    bindButtons: function() {
      var self = this;
      var findAll = this.element.find("button.find-all");
      var close = this.element.find("a.close");

      findAll.on("click", function() {
        self.search();
      });
      close.on("click", function() {
        self.deactivate();
      });
    },

    // todo add regex support
    // todo add search history
    // we don't have to worry about the files blacklist because they are already removed from the project structure
    search: function() {
      if (this.currentSearch.running) {
        return false;
      }
      var self = this;

      var isCaseSensitive = this.element.find("#search-case-check").checked;
      var displayQuery = this.input.value;

      var resultsTab = sessions.addFile(i18n.get("searchDisplayQuery", displayQuery));

      this.currentSearch = {
        matches: 0,
        running: true,
        searchQuery: new RegExp(displayQuery, isCaseSensitive ? "g" : "ig"),
        resultsTab: resultsTab
      };

      resultsTab.fileName = i18n.get("searchTabName", displayQuery);
      resultsTab.addEventListener("close", function() {
        self.currentSearch.running = false;
      });

      var fileEntryList = this.getFlatFileEntryList();
      if (fileEntryList.length < 1) { // exit early if there are no directories added
        self.appendToResults(i18n.get("searchNoDirectories"));
        this.currentSearch.running = false;
        return;
      }

      var filesScanned = 0;
      var consecutiveIOs = 0;

      function searchMoreOrExit() {
        var searchedEverything = fileEntryList.length === 0;
        if (!searchedEverything && self.currentSearch.running) {
          var file = fileEntryList.pop();
          filesScanned++;
          self.searchFile(file, searchMoreOrExit);
        } else if (--consecutiveIOs === 0) { // check if the file that just finished is the last one
          self.printSearchSummary(searchedEverything, filesScanned);
        }
      }

      // we queue multiple files to be read at once so the cpu doesn't wait each time
      for (var i = 0; i < 10 && i < fileEntryList.length; i++) {
        consecutiveIOs++;
        searchMoreOrExit();
      }
    },

    // the array is returned in reverse order so we can use .pop() later
    getFlatFileEntryList: function() {
      var fileList = [];

      function searchDirectory(node) {
        for (var i = node.children.length - 1; i >= 0; i--) {
          var childNode = node.children[i];
          if (childNode.isDirectory) {
            searchDirectory(childNode);
          } else if (childNode.entry.isFile) {
            fileList.push(childNode.entry);
          }
        }
      }

      for (var i = project.directories.length - 1; i >= 0; i--) {
        searchDirectory(project.directories[i]);
      }

      return fileList;
    },

    searchFile: function(nodeEntry, c) {
      var self = this;
      var options = this.currentSearch;

      chrome.fileSystem.getDisplayPath(nodeEntry, function(path) {
        var file = new File(nodeEntry);
        if (!options.running) {
          return c();
        }

        var printResult = function(index, str) {
          self.appendToResults(self.formatResultCode(index, str));
        };

        file.read(function(err, data) {
          var lines = data.split("\n");
          var firstFindInFile = true;
          var printedLines = {}; // only print each line once per file per search

          for (var i = 0; i < lines.length; i++) {
            line = lines[i];
            if (line.match(options.searchQuery)) {
              options.matches++;
              
              if (options.matches >= self.maxMatches) {
                options.running = false;
                break;
              }

              if (firstFindInFile) { // only add a filename if it is the first result for the file
                self.appendToResults("\n" + nodeEntry.fullPath + "\n");
                firstFindInFile = false;
              } else if (!printedLines[i] && !printedLines[i-1] && !printedLines[i-2]) { // add break if immediately previous lines not included
                self.appendToResults("...\n");
              }

              if (!printedLines[i-1] && i > 1) { // don't print line number 0
                printResult(i-1, lines[i-1]);
                printedLines[i-1] = true;
              }

              if (!printedLines[i]) {
                printResult(i, lines[i]);
                printedLines[i] = true;
              }

              if (i < lines.length - 1) { // always print the line following the search result, if it exists
                printResult(i+1, lines[i+1]);
                printedLines[i+1] = true;
              }
            }
          }

          c();
        });
      });
    },

    printSearchSummary: function(searchedEverything, filesScanned) {
      this.appendToResults(i18n.get("searchSummary", this.currentSearch.matches, filesScanned));
      if (!searchedEverything) {
        this.appendToResults(i18n.get("searchCancelled"));
      }
      this.currentSearch.running = false;
    },

    formatResultCode: function(lineNumber, code) {
      return "  " + (lineNumber + 1) + ": " + code + "\n";
    },

    appendToResults: function(text) {
      if (text === "") {
        return;
      }

      var resultsTab = this.currentSearch.resultsTab;
      var insertRow = resultsTab.doc.getLength();
      resultsTab.doc.insert({row: insertRow, column: 0}, text);
      resultsTab.modified = false;
    },

    activate: function(mode) {
      var highlighted = editor.getSelectedText();
      if (highlighted) {
        this.input.value = highlighted;
      }

      this.element.addClass("active");
      this.input.focus();
    },

    deactivate: function() {
      this.currentSearch.running = false; // cancel search
      this.element.removeClass("active");
    }
  };

  var searchbar = new Searchbar();

  command.on("searchbar:show-project-search", function() {
    searchbar.activate();
  });

  return searchbar;
});
