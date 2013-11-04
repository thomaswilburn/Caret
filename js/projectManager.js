define([
  "settings!",
  "command",
  "sessions",
  "file",
  "dom2"
  ], function(Settings, command, sessions, File) {

  var guidCounter = 0;

  var FSNode = function(entry) {
    this.children = [];
    this.id = guidCounter++;
    if (entry) this.setEntry(entry);
  };
  FSNode.prototype = {
    isDirectory: false,
    entry: null,
    tab: null,
    id: null,
    label: null,
    setEntry: function(entry, c) {
      this.entry = entry;
      this.label = entry.name;
      this.isDirectory = entry.isDirectory;
    },
    walk: function(done) {
      var self = this;
      var entries = [];
      var reader = this.entry.createReader();
      var inc = 1;
      var check = function() {
        inc--;
        if (inc == 0) {
          return done(self);
        }
      };
      var collect = function(list) {
        if (list.length == 0) return complete();
        entries.push.apply(entries, list);
        reader.readEntries(collect);
      };
      var complete = function() {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (entry.name[0] == "." && entry.isDirectory) continue;
          var node = new FSNode(entry);
          self.children.push(node);
          if (node.isDirectory) {
            inc++;
            node.walk(check);
          }
        }
        check();
      };
      reader.readEntries(collect);
    }
  };
  
  var ProjectManager = function() {
    this.directories = [];
    this.tabMap = {};
    this.expanded = {};
  };
  ProjectManager.prototype = {
    element: null,
    addDirectory: function(c) {
      var self = this;
      chrome.fileSystem.chooseEntry({ type: "openDirectory" }, function(d) {
        var root = new FSNode(d);
        self.directories.push(root);
        root.walk(self.render.bind(self));
      });
    },
    render: function() {
      if (!this.element) return;
      this.element.innerHTML = "";
      if (this.directories.length == 0) {
        this.element.classList.remove("show");
        return;
      }
      this.element.classList.add("show");
      var walker = function(node) {
        var li = document.createElement("li");
        li.innerHTML = node.label;
        //check the tabMap for expansion, being open
        //add classes to match
        if (node.isDirectory) {
          li.classList.add("directory");
          var ul = document.createElement("ul");
          for (var i = 0; i < node.children.length; i++) {
            ul.appendChild(walker(node.children[i]));
          }
          li.appendChild(ul);
        }
        return li;
      };
      var trees = this.directories.map(walker);
      var list = document.createElement("ul");
      trees.forEach(function(dir) {
        dir.classList.add("expanded");
        list.appendChild(dir);
      });
      this.element.appendChild(list);
    },
    bindEvents: function() {
      //register for tree expansion, refresh
      //opening files will go through standard command flow
    },
    openFile: function(id) {
      //check in tabMap if it's already open
      //read file
      //open tab
      //map the pathname in the tabMap
      //register for tab close event
    },
    removeAllDirectories: function() {
      this.directories = [];
      this.render();
    }
  };
  
  var pm = new ProjectManager();
  pm.element = document.find(".project");
  command.on("project:add-dir", pm.addDirectory.bind(pm));
  command.on("project:remove-all", pm.removeAllDirectories.bind(pm));
  command.on("project:open-file", pm.openFile.bind(pm));

});