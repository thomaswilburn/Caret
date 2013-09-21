define([
  "sessions",
  "command",
  "editor",
  "settings!menus",
  "statusbar",
  "dom2"
  ], function(sessions, command, editor, Settings, status) {
  
  /*
  
  TODO:
    - add reference mode
    - add search mode
  
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
          return;
        }
        self.selected = 0;
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
          //skip dividers and other special cases
          if (typeof item == "string") continue;
          if (item.command && fuzzyCommand.test(item.palette || item.label)) {
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
      
      var tabs;
      
      if (file) {
        var fuzzyFile = new RegExp(file.split("").join(".*"), "i");
        tabs = sessions.getAllTabs().filter(function(tab) {
          return fuzzyFile.test(tab.fileName);
        });
      } else {
        tabs = [ sessions.getCurrent() ];
      }
      
      if (search) {
        results = results.filter(function(t) { 
          return t.getValue().toLowerCase().indexOf(search.toLowerCase()) > -1;
        });
      }

      this.results = tabs;

      if (this.results.length) {
        this.results[this.selected].raiseBlurred();
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
        status.toast("Executing: " + current.label + "...");
      } else {
        command.fire("session:check-file");
      }
      this.deactivate();
      editor.focus();
    },
    activate: function(mode) {
      this.results = [];
      this.selected = 0;
      this.input.value = "";
      this.commandMode = mode == "command";
      this.input.value = modes[mode] || "";
      this.render();
      this.element.classList.add("active");
      this.input.focus();
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
        current.raiseBlurred();
      }
      this.render();
    },
    render: function() {
      var self = this;
      this.element.find(".mode").innerHTML = this.commandMode ? "Command:" : "Go To:";
      this.resultList.innerHTML = "";
      this.results.slice(0, 10).forEach(function(r, i) {
        var element = resultTemplate.cloneNode(true).find("li");
        element.innerHTML = r.fileName || r.palette || r.label;
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