define([
    "sessions",
    "command",
    "editor",
    "storage/file",
    "settings!user",
    "ui/statusbar",
    "ui/projectManager",
  ], function(sessions, command, editor, File, Settings, status, project) {

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

      this.currentSearch = {
        matches: 0,
        running: true
      };

      var isCaseSensitive = this.currentSearch.isCaseSensitive = this.element.find("#search-case-check").checked;
      var displayQuery = this.input.value;
      this.currentSearch.searchQuery = isCaseSensitive ? displayQuery : displayQuery.toUpperCase();

      var resultsTab = this.currentSearch.resultsTab = sessions.addFile("Searching for:\n" + displayQuery + "\n");
      resultsTab.fileName = "Results: " + displayQuery;
      resultsTab.addEventListener('close', function() {
        self.currentSearch.running = false;
      })

      var fileEntryList = this.getFlatFileEntryList();
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
      for (var i = 0; i < 10; i++) {
        consecutiveIOs++;
        searchMoreOrExit();
      };
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
      };

      return fileList;
    },

    searchFile: function(nodeEntry, cb) {
      var self = this;
      var prevLine = "";
      var options = this.currentSearch;

      chrome.fileSystem.getDisplayPath(nodeEntry, function(path) {
        var file = new File(nodeEntry);
          if (!options.running) {
            return cb();
          }

          file.read(function(err, data) {
            var lines = data.split("\n");
            var line, msg;
            var firstFind = true;
            var printedLines = {}; // only print each line once per file per search

            for (var i = 0; i < lines.length && options.running; i++) {
              compareLine = options.isCaseSensitive ? lines[i] : lines[i].toUpperCase();
              if (compareLine.indexOf(options.searchQuery) > -1) {
                if (++options.matches >= self.maxMatches) {
                  options.running = false;
                }
                msg = "";
                if (!printedLines[i] && !printedLines[i-1]) { // only add break if it and the line before it have not been printed
                  if (firstFind) {
                    msg += "\n" + nodeEntry.fullPath + "\n";
                    firstFind = false;
                  } else {
                    msg += "...\n";
                  }
                  msg += self.formatResultCode(i-1, prevLine);
                  msg += self.formatResultCode(i, lines[i]);
                  printedLines[i] = true;
                }

                if (i < lines.length - 1) {
                  msg += self.formatResultCode(i+1, lines[i+1]);
                  printedLines[i+1] = true;
                }
                self.appendToResults(msg);
              }
              prevLine = lines[i];
            }

            cb();
          });
      });
    },

    printSearchSummary: function(searchedEverything, filesScanned) {
      this.appendToResults("\n\n" + this.currentSearch.matches + " matches found. " + filesScanned + " files scanned.");
      if (!searchedEverything) {
        this.appendToResults("\nSearch was cancelled. You can change the maximum number of search results allowed in User Preferences.")
      }
      this.currentSearch.running = false;
    },

    formatResultCode: function(lineNumber, code) {
      return "  " + (lineNumber+1) + ": " + code + "\n";
    },

    appendToResults: function(text) {
      if (text === "") {
        return;
      }

      var resultsTab = this.currentSearch.resultsTab;
      var insertRow = resultsTab.doc.getLength();
      resultsTab.doc.insert({row: insertRow, column: 0}, text);
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
