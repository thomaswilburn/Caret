define([
  "settings!",
  "command",
  "sessions",
  "file",
  "manos",
  "dom2"
  ], function(Settings, command, sessions, File, M) {
    
  /*
  It's tempting to store projects in local storage, similar to the way that we retain files for tabs, but this would be a mistake. Reading from storage is a pain, because it wants to store a single level deep, and we'll want to alter parts of the setup individually.
  
  Instead, we'll retain a single file handle to the project file, which (as JSON) will store the IDs of individual directories, the project-specific settings, and (hopefully, one day) build systems. This also gets us around the issues of restored directory order and constantly updating the retained file list--we'll just update it when the project file is saved.
  
  TODO:
  1. Get open directories, navigation, etc working.
  2. Enable project file generation, loading, restoration
  3. Allow projects to create a settings layer
  */

  var guidCounter = 0;

  //FSNodes are used to track filesystem state inside projects
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
    this.project = {};
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
    removeAllDirectories: function() {
      this.directories = [];
      this.render();
    },
    refresh: function() {
      var counter = 0;
      var self = this;
      var check = function() {
        counter++;
        if (counter = self.directories.length) {
          self.render();
        }
      }
      this.directories.forEach(function(d) {
        d.walk(check);
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
        var a = document.createElement("a");
        a.innerHTML = node.label;
        li.append(a);
        if (node.isDirectory) {
          li.classList.add("directory");
          //TODO: Is this open? Add expanded class if so
          var ul = document.createElement("ul");
          for (var i = 0; i < node.children.length; i++) {
            ul.appendChild(walker(node.children[i]));
          }
          li.appendChild(ul);
        } else {
          a.setAttribute("data-node-id", node.id);
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
    setElement: function(el) {
      this.element = el;
      this.bindEvents();
    },
    bindEvents: function() {
      this.element.on("click", function(e) {
        var target = e.target;
      });
    },
    openFile: function(id) {
      //used to open files from the sidebar
      //check in tabMap if it's already open
      //read file
      //open tab
      //map the pathname in the tabMap
      //register for tab close event
    },
    openProjectFile: function() {
      //read project file on user request
      //call setProject with contents
    },
    restoreProject: function() {
      //check local storage for retained project file ID
      //if exists and is valid, restore this file, then call setProject
    },
    setProject: function(project) {
      //project is the JSON from a project file
      //assign settings
      //restore directory entries that can be restored
    }
  };
  
  var pm = new ProjectManager();
  pm.setElement(document.find(".project"));
  command.on("project:add-dir", pm.addDirectory.bind(pm));
  command.on("project:remove-all", pm.removeAllDirectories.bind(pm));
  command.on("project:open-file", pm.openFile.bind(pm));
  command.on("project:refresh-dir", pm.refresh.bind(pm));

});