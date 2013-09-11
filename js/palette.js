define([
  "sessions",
  "command",
  "editor",
  "settings!menus",
  "dom2"
  ], function(sessions, command, editor, Settings) {
  
  /*
  
  TODO:
    - add reference mode
    - add command support
  
  */
  
  var resultTemplate = document.find("#palette-result").content;

  var re = {
    file: /^([^:#@]*)/,
    line: /:(\d*)/,
    reference: /@([^:#]*)/,
    search: /#([^:@]*)/
  };
  
  var prefixes = {
    ":": "line",
    "@": "reference",
    "#": "search"
  };
  
  var modes = {
    "line": ":",
    "search": "#",
    "reference": "@"
  };
  
  var Palette = function() {
    this.results = [];
    this.selected = 0;
    this.element = document.find(".palette");
    this.input = this.element.find("input");
    this.resultList = this.element.find(".results");
    this.commandMode = false;
    this.bindInput();
  };
  Palette.prototype = {
    bindInput: function() {
      var input = this.input;
      var self = this;

      input.on("blur", function() {
        self.deactivate();
      });
      
      input.on("keydown", function(e) {
        if (e.keyCode == 27) {
          sessions.restoreLocation();
          return input.blur();
        }
        if (e.keyCode == 13) {
          e.stopImmediatePropagation();
          e.preventDefault();
          self.executeCurrent();
          return;
        }
        if (e.keyCode == 38 || e.keyCode == 40) {
          e.preventDefault();
          e.stopImmediatePropagation();
          self.navigateList(e.keyCode == 38 ? -1 : 1);
          self.render();
        }
      });
      
      input.on("keyup", function(e) {
        self.parse(input.value);
      });
    },
    parse: function(query) {
      var startsWith = query[0];
      if (startsWith in prefixes) {
        this.commandMode = false;
      }
      if (this.commandMode) {
        this.findCommands(query);
      } else {
        this.findLocations(query);
      }
      this.render();
    },
    findCommands: function(query) {
      if (query.length == 0) return this.results = [];
      var fuzzyCommand = new RegExp(query.split("").join(".*"), "i");
      var results = [];
      var menus = Settings.get("menus");
      var menuWalker = function(menu) {
        for (var i = 0; i < menu.length; i++) {
          var item = menu[i];
          if (fuzzyCommand.test(item.label)) {
            results.push(item);
          }
          if (item.sub) {
            menuWalker(item.sub);
          }
        }
      };
      menuWalker(menus);
      this.results = results;
    },
    findLocations: function(query) {
      var file = re.file.test(query) && re.file.exec(query)[1];
      var line = re.line.test(query) && Number(re.line.exec(query)[1]) - 1;
      var search = re.search.test(query) && re.search.exec(query)[1];
      var reference = re.reference.test(query) && re.reference.exec(query)[1];
      var results = [];
      
      var openFileNames = sessions.getFilenames();
      var tabs;
      
      if (file) {
        var fuzzyFile = new RegExp(file.split("").join(".*"), "i");
        var matches = openFileNames.filter(function(name) {
          return fuzzyFile.test(name);
        });
        results = matches.map(sessions.getTabByName);
      } else {
        results = [ sessions.getCurrent() ];
      }
      
      if (search) {
        results = results.filter(function(t) { 
          return t.getValue().toLowerCase().indexOf(search.toLowerCase()) > -1;
        });
      }

      this.results = results;

      if (results.length) {
        results[this.selected].raiseBlurred();
        if (line) {
          editor.clearSelection();
          editor.moveCursorTo(line, 0);
        }
      }
    },
    executeCurrent: function() {
      var current = this.results[this.selected];
      if (!current) return;
      if (this.commandMode) {
        command.fire(current.command, current.argument);
      }
      this.deactivate();
      editor.focus();
    },
    activate: function(mode) {
      this.results = [];
      this.selected = 0;
      this.render();
      this.element.classList.add("active");
      this.input.focus();
      this.input.value = "";
      if (mode) {
        this.commandMode = mode == "command";
        this.input.value = modes[mode] || "";
      }
    },
    deactivate: function() {
      this.element.classList.remove("active");
    },
    navigateList: function(interval) {
      this.selected = (this.selected + interval) % this.results.length;
      if (this.selected < 0) {
        this.selected = this.results.length + this.selected;
      }
      var current = this.results[this.selected];
      if (current && current.raise) {
        current.raiseBlurred(true);
      }
      this.render();
    },
    render: function() {
      var self = this;
      this.element.find(".mode").innerHTML = this.commandMode ? "Command:" : "Go To:";
      this.resultList.innerHTML = "";
      this.results.slice(0, 10).forEach(function(r, i) {
        var element = resultTemplate.cloneNode(true).find("li");
        element.innerHTML = r.fileName || r.label;
        if (i == self.selected) {
          element.classList.add("current");
        }
        self.resultList.appendChild(element);
      });
    }
  };
  
  var palette = new Palette();
  
  command.on("palette:open", function(mode) {
    sessions.saveLocation();
    palette.activate(mode);
  });

  return palette;
  
});