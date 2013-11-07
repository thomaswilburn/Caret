define([
  "settings!",
  "command",
  "sessions",
  "file",
  "manos",
  "dialog",
  "contextMenus",
  "dom2"
  ], function(Settings, command, sessions, File, M, dialog, context) {
    
  /*
  It's tempting to store projects in local storage, similar to the way that we retain files for tabs, but this would be a mistake. Reading from storage is a pain, because it wants to store a single level deep, and we'll want to alter parts of the setup individually.
  
  Instead, we'll retain a single file handle to the project file, which (as JSON) will store the IDs of individual directories, the project-specific settings, and (hopefully, one day) build systems. This also gets us around the issues of restored directory order and constantly updating the retained file list--we'll just update it when the project file is saved.
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
        self.children = [];
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
  
  var ProjectManager = function(element) {
    this.directories = [];
    this.pathMap = {};
    this.expanded = {};
    this.project = null;
    this.projectFile = null;
    if (element) {
      this.setElement(element)
    }
    var self = this;
    chrome.storage.local.get("retainedProject", function(data) {
      if (data.retainedProject) {
        var file = new File();
        file.onWrite = self.watchProjectFile.bind(self);
        file.restore(data.retainedProject, function(err, f) {
          if (err) {
            return chrome.storage.local.remove("retainedProject");
          }
          file.read(function(err, data) {
            if (err) return;
            self.projectFile = file;
            self.loadProject(JSON.parse(data));
          });
        });
      }
    })
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
    removeDirectory: function(args) {
      this.directories = this.directories.filter(function(node) {
        return node.id != args.id;
      });
      this.render();
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
        this.element.removeClass("show");
        return;
      }
      var self = this;
      this.element.addClass("show");
      this.pathMap = {};
      var walker = function(node, depth) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        li.append(a);
        if (node.isDirectory) {
          a.innerHTML = node.label;
          a.setAttribute("data-full-path", node.entry.fullPath);
          a.addClass("directory");
          if (depth == 0) {
            a.href = context.makeURL("root", node.id);
          } else {
            a.href = context.makeURL("directory", node.id);
          }
          a.setAttribute("command", null);
          if (self.expanded[node.entry.fullPath]) {
            li.addClass("expanded");
          }
          var ul = document.createElement("ul");
          node.children.sort(function(a, b) {
            if (a.isDirectory != b.isDirectory) {
              //sneaky casting trick
              return b.isDirectory * 1 - a.isDirectory * 1;
            }
            if (a.label < b.label) return -1;
            if (a.label > b.label) return 1;
            return 0;
          });
          for (var i = 0; i < node.children.length; i++) {
            ul.append(walker(node.children[i], depth+1));
          }
          li.append(ul);
        } else {
          var path = node.entry.fullPath;
          a.innerHTML = node.label;
          a.setAttribute("argument", path);
          a.setAttribute("command", "project:open-file");
          self.pathMap[path] = node;
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
      var self = this;
      this.element.on("click", function(e) {
        var target = e.target;
        if (target.hasClass("directory")) {
          target.parentElement.toggle("expanded");
          var path = target.getAttribute("data-full-path");
          self.expanded[path] = !!!self.expanded[path]; 
        }
      });
    },
    openFile: function(path) {
      var self = this;
      var found = false;
      var node = this.pathMap[path];
      if (!node) return;
      //walk through existing tabs to see if it's already open
      var tabs = sessions.getAllTabs();
      chrome.fileSystem.getDisplayPath(node.entry, function(path) {
        //look through the tabs for matching display paths
        M.map(
          tabs,
          function(tab, i, c) {
            if (!tab.file || tab.file.virtual) {
              return c(false);
            }
            tab.file.getPath(function(p) {
              if (p == path) {
                sessions.setCurrent(tab);
                found = true;
              }
              //we don't actually use the result
              c();
            });
          },
          //if no match found, create a tab
          function() {
            if (found) return;
            var file = new File(node.entry);
            file.read(function(err, data) {
              sessions.addFile(data, file);
            })
          }
        );
      });
    },
    generateProject: function() {
      var project = this.project || {};
      //everything but "folders" is left as-is
      //run through all directories, retain them, and add to the structure
      project.folders = this.directories.map(function(node) {
        var id = chrome.fileSystem.retainEntry(node.entry);
        return {
          retained: id,
          path: node.entry.fullPath
        };
      });
      var json = JSON.stringify(project, null, 2);
      if (this.projectFile) {
        this.projectFile.write(json);
      } else {
        var file = new File();
        var watch = this.watchProjectFile.bind(this);
        var self = this;
        file.open("save", function() {
          file.write(json);
          var id = file.retain();
          chrome.storage.local.set({retainedProject: id});
          file.onWrite = watch;
          self.projectFile = file;
        });
      }
      return json;
    },
    openProjectFile: function() {
      var file = new File();
      var self = this;
      file.open(function() {
        file.read(function(err, data) {
          if (err) return;
          self.loadProject(data);
          var id = file.retain();
          chrome.storage.local.set({retainedProject: id});
          self.projectFile = file;
        });
        file.onWrite = self.watchProjectFile;
      });
    },
    watchProjectFile: function() {
      var self = this;
      this.projectFile.read(function(err, data) {
        if (err) return;
        self.loadProject(data);
      });
    },
    loadProject: function(project) {
      var self = this;
      //project is the JSON from a project file
      if (typeof project == "string") {
        project = JSON.parse(project);
      }
      this.project = project;
      //assign settings
      if (project.settings) {
        Settings.setProject(project.settings);
      }
      //restore directory entries that can be restored
      this.directories = [];
      M.map(
        project.folders,
        function(folder, index, c) {
          chrome.fileSystem.restoreEntry(folder.retained, function(entry) {
            //remember, you can only restore project directories you'd previously opened
            if (!entry) return c();
            var node = new FSNode(entry);
            self.directories.push(node);
            node.walk(c);
          });
        },
        function() {
          self.render();
        }
      );
    },
    editProjectFile: function() {
      if (!this.projectFile) {
        return dialog("No project opened.");
      }
      var self = this;
      this.projectFile.read(function(err, data) {
        if (err) return;
        sessions.addFile(data, self.projectFile);
      });
    },
    clearProject: function(keepRetained) {
      this.projectFile = null;
      this.directories = [];
      this.project = {};
      Settings.clearProject();
      if (!keepRetained) chrome.storage.local.remove("retainedProject");
      this.render();
    }
  };
  
  var pm = new ProjectManager(document.find(".project"));
  command.on("project:add-dir", pm.addDirectory.bind(pm));
  command.on("project:remove-all", pm.removeAllDirectories.bind(pm));
  command.on("project:generate", pm.generateProject.bind(pm));
  command.on("project:open-file", pm.openFile.bind(pm));
  command.on("project:refresh-dir", pm.refresh.bind(pm));
  command.on("project:open", pm.openProjectFile.bind(pm));
  command.on("project:edit", pm.editProjectFile.bind(pm));
  command.on("project:clear", pm.clearProject.bind(pm));
  
  context.register("Remove from Project", "removeDirectory", "root/:id", pm.removeDirectory.bind(pm));

});