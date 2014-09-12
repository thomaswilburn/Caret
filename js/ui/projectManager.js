define([
    "settings!user",
    "command",
    "sessions",
    "storage/file",
    "util/manos",
    "ui/dialog",
    "ui/contextMenus",
    "editor",
    "util/template!templates/projectDir.html,templates/projectFile.html",
    "util/i18n",
    "util/dom2"
  ], function(Settings, command, sessions, File, M, dialog, context, editor, inflate, i18n) {

  /*
  It's tempting to store projects in local storage, similar to the way that we
  retain files for tabs, but this would be a mistake. Reading from storage is a
  pain, because it wants to store a single level deep, and we'll want to alter
  parts of the setup individually.

  Instead, we'll retain a single file handle to the project file, which (as
  JSON) will store the IDs of individual directories, the project-specific
  settings, and (hopefully, one day) build systems. This also gets us around
  the issues of restored directory order and constantly updating the retained
  file list--we'll just update it when the project file is saved.
  */

  var guidCounter = 0;
  
  //pseudo-worker to let the UI thread breathe
  var queue = [];
  var working = false;
  var tick = function(fn) {
    if (fn) queue.push(fn);
    if (fn && working) return;
    working = true;
    //start work on the next frame
    var process = function() {
      var then = Date.now();
      while (queue.length) {
        var now = Date.now();
        if (now - then > 10) {
          return setTimeout(process);
        }
        var next = queue.shift();
        next();
      }
      working = false;
    };
    setTimeout(process);
  };
  
  //FSNodes are used to track filesystem state inside projects
  //We don't use the typical File object, because we're not really reading them
  //Nodes form a tree starting at the root directory
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
    
    //walk will asynchronously collect the file tree
    walk: function(blacklist, done) {
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
        entries.forEach(function(entry) {
          //skip dot dirs, but not files
          if (entry.name[0] == "." && entry.isDirectory) return;
          //skip ignored files
          if (blacklist) {
            if (blacklist.test(entry.name)) return;
          }
          
          var node = new FSNode(entry);
          self.children.push(node);
          if (node.isDirectory) {
            inc++;
            //give the UI thread a chance to breathe
            tick(function() { node.walk(blacklist, check); });
          }
        });
        check();
      };
      reader.readEntries(collect);
    }
  };

  // The Project Manager actually handles rendering and interfacing with the rest
  // of the code. Commands are bound to a singleton instance, but it's technically
  // not picky about being the only one.

  var ProjectManager = function(element) {
    this.directories = [];
    this.pathMap = {};
    this.expanded = {};
    this.project = null;
    this.projectFile = null;
    if (element) {
      this.setElement(element);
    }
    this.loading = false;
    var self = this;
    chrome.storage.local.get("retainedProject", function(data) {
      if (data.retainedProject) {
        var retained = data.retainedProject;
        if (typeof retained == "string") {
          retained = {
            id: retained
          };
        }
        self.loading = true;
        self.render();
        var file = new File();
        var onFail = function() {
          self.loading = false;
          self.render();
          chrome.storage.local.remove("retainedProject");
        }
        file.onWrite = self.watchProjectFile.bind(self);
        file.restore(retained.id, function(err, f) {
          if (err) {
            return onFail();
          }
          file.read(function(err, data) {
            if (err) {
              return onFail();
            }
            self.projectFile = file;
            self.loadProject(JSON.parse(data));
          });
        });
      }
    });
  };
  
  var blacklistRegExp = function() {
    var blacklist = Settings.get("user").ignoreFiles;
    if (blacklist) {
      return new RegExp(blacklist);
    }
    
    return null;
  }
  
  ProjectManager.prototype = {
    element: null,
    
    addDirectory: function(c) {
      var self = this;
      chrome.fileSystem.chooseEntry({ type: "openDirectory" }, function(d) {
        if (!d) return;
        self.insertDirectory(d);
      });
    },
    
    insertDirectory: function(entry) {
      var root;
      this.element.addClass("loading");
      //ensure we aren't duplicating
      this.directories.forEach(function(directoryNode){
        if (directoryNode.entry.fullPath === entry.fullPath) {
          root = directoryNode;
        }
      });
      
      //if this is the first, go ahead and start the slideout
      if (!this.directories.length) {
        this.element.addClass("show");
      }
      
      if (!root) {
        root = new FSNode(entry);
        this.directories.push(root);
      }
      
      //if the directory was there, we still want
      //to refresh it, in response to the users
      //interaction
      var self = this;
      tick(function() {
        root.walk(blacklistRegExp(), function() {
          self.render()
        });
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
      this.element.addClass("loading");
      var check = function() {
        counter++;
        if (counter == self.directories.length) {
          //render() should get rid of the class, but let's be sure
          self.element.removeClass("loading");
          self.render();
        }
      };
      blacklist = blacklistRegExp();
      this.directories.forEach(function(d) {
        d.walk(blacklist, check);
      });
    },
    
    render: function() {
      if (!this.element) return;
      
      //Ace doesn't know about non-window resize events
      //moving the panel will screw up its dimensions
      setTimeout(function() {
        editor.resize();
      }, 500);

      var tree = this.element.find(".tree");
      this.pathMap = {};
      if (this.directories.length == 0 && !this.loading) {
        this.element.removeClass("show");
        tree.innerHTML = "";
        return;
      }
      var self = this;
      this.element.addClass("show");
      if (this.loading) {
        this.element.addClass("loading");
      }
      
      var walker = function(node) {
        var li = document.createElement("li");
        if (node.isDirectory) {
          var isRoot = self.directories.indexOf(node) != -1;
          var nodeData = {
            label: node.label,
            path: node.entry.fullPath,
            contextMenu: context.makeURL(isRoot ? "root/directory" : "directory", node.id)
          };
          var a = inflate.get("templates/projectDir.html", nodeData);
          li.append(a);
          if (self.expanded[node.entry.fullPath]) {
            li.addClass("expanded");
          }
          var ul = document.createElement("ul");
          node.children.sort(function(a, b) {
            if (a.isDirectory != b.isDirectory) {
              //sneaky casting trick
              return ~~b.isDirectory - ~~a.isDirectory;
            }
            if (a.label < b.label) return -1;
            if (a.label > b.label) return 1;
            return 0;
          });
          for (var i = 0; i < node.children.length; i++) {
            ul.append(walker(node.children[i]));
          }
          li.append(ul);
        } else {
          var nodeData = {
            path: node.entry.fullPath,
            contextMenu: context.makeURL("file", node.entry.fullPath.replace(/[\/\\]/g, "@")),
            label: node.label
          };
          var a = inflate.get("templates/projectFile.html", nodeData)
          li.append(a);
          self.pathMap[node.entry.fullPath] = node;
        }
        return li;
      };
      
      //we give the load bar a chance to display before rendering
      tick(function() {
        var trees = self.directories.map(walker);
        var list = document.createElement("ul");
        trees.forEach(function(dir) {
          dir.classList.add("root");
          dir.classList.add("expanded");
          list.appendChild(dir);
        });
        
        tree.innerHTML = "";
        tree.appendChild(list);
        if (!self.loading) {
          self.element.removeClass("loading");
        }
      });
    },
    
    setElement: function(el) {
      this.element = el;
      this.bindEvents();
    },
    
    bindEvents: function() {
      var self = this;
      this.element.on("click", function(e) {
        e.preventDefault();
        var target = e.target;
        if (target.hasClass("directory")) {
          target.parentElement.toggle("expanded");
          var path = target.getAttribute("data-full-path");
          self.expanded[path] = !!!self.expanded[path];
        }
        editor.focus();
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
            tab.file.getPath(function(err, p) {
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
            });
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
          self.loadProject(data);
          var retained = file.retain();
          chrome.storage.local.set({retainedProject: retained});
          self.projectFile = file;
          file.onWrite = self.watchProjectFile.bind(self);
        });
      });
    },
    
    watchProjectFile: function() {
      var self = this;
      this.projectFile.read(function(err, data) {
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
      this.loading = true;
      this.element.addClass("loading");
      //restore directory entries that can be restored
      this.directories = [];
      blacklist = blacklistRegExp();
      M.map(
        project.folders,
        function(folder, index, c) {
          chrome.fileSystem.restoreEntry(folder.retained, function(entry) {
            //remember, you can only restore project directories you'd previously opened
            if (!entry) return c();
            var node = new FSNode(entry);
            //if this is the first, go ahead and start the slideout
            if (!self.directories.length) {
              self.element.addClass("show");
            }
            self.directories.push(node);
            node.walk(blacklist, c);
          });
        },
        function() {
          self.loading = false;
          self.render();
        }
      );
    },
    
    editProjectFile: function() {
      if (!this.projectFile) {
        return dialog(i18n.get("projectNoCurrentProject"));
      }
      var self = this;
      this.projectFile.read(function(err, data) {
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
    },
    
    getPaths: function() {
      return Object.keys(this.pathMap);
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

  context.register("Remove from Project", "removeDirectory", "root/directory/:id", pm.removeDirectory.bind(pm));
  
  var setAutoHide = function() {
    var hide = Settings.get("user").autoHideProject;
    if (hide) {
      pm.element.classList.add("autohide");
    } else {
      pm.element.classList.remove("autohide");
    }
  }
  
  command.on("init:startup", setAutoHide);
  command.on("init:restart", setAutoHide);

  return pm;

});
