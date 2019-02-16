define([
    "settings!user",
    "command",
    "sessions",
    "storage/file",
    "ui/dialog",
    "ui/contextMenus",
    "editor",
    "util/template!templates/projectDir.html,templates/projectFile.html",
    "util/i18n",
    "util/chromePromise"
  ], function(Settings, command, sessions, File, dialog, context, editor, inflate, i18n, chromeP) {

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
    setEntry: function(entry) {
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
          if (!Settings.get("user").showHiddenDirectories) {
            if (entry.name[0] == "." && entry.isDirectory) return;
          }
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
  
  // min / max sidebar width
  var MIN_WIDTH = 100;
  var MAX_WIDTH = 500;

  // The Project Manager actually handles rendering and interfacing with the rest
  // of the code. Commands are bound to a singleton instance, but it's technically
  // not picky about being the only one.

  var ProjectManager = function(element) {
    this.directories = [];
    this.pathMap = {};
    this.expanded = {};
    this.project = null;
    this.projectFile = null;
    this.resizing = false;

    if (element) {
      this.setElement(element);
    }

    this.loading = false;
    this.initRetained();
  };

  var blacklistRegExp = function(config) {
    //avoid race condition when reloading
    var blacklist = (config || Settings.get("user")).ignoreFiles;
    if (blacklist) {
      return new RegExp(blacklist);
    }

    return null;
  }

  ProjectManager.prototype = {
    element: null,

    initRetained: async function() {
      var data = await chromeP.storage.local.get("retainedProject");
      if (data.retainedProject) {
        var retained = data.retainedProject;
        if (typeof retained == "string") {
          retained = {
            id: retained
          };
        }
        this.loading = true;
        this.render();
        var file = new File();
        var onFail = function() {
          this.loading = false;
          this.render();
          chrome.storage.local.remove("retainedProject");
        }
        file.onWrite = this.watchProjectFile.bind(this);
        try {
          var f = await file.restore(retained.id);
          var data = await file.read();
          this.projectFile = file;
          this.loadProject(JSON.parse(data));
        } catch(err) {
          onFail(err);
        }
      }
    },

    addDirectory: async function() {
      var d = await chromeP.fileSystem.chooseEntry({ type: "openDirectory" });
      if (!d) return;
      this.insertDirectory(d);
    },

    insertDirectory: async function(entry) {
      var root;
      this.element.classList.add("loading");
      //ensure we aren't duplicating
      var path = await chromeP.fileSystem.getDisplayPath(entry);
      this.directories.forEach(function(directoryNode){
        if (directoryNode.path == path) {
          root = directoryNode;
        }
      });

      //if this is the first, go ahead and start the slideout
      if (!this.directories.length) {
        this.element.classList.add("show");
      }

      if (!root) {
        root = new FSNode(entry);
        root.path = path;
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
      this.directories = this.directories.filter(node => node.id != args.id);
      this.render();
    },

    removeAllDirectories: function() {
      this.directories = [];
      this.render();
    },

    refresh: function() {
      var counter = 0;
      var self = this;
      this.element.classList.add("loading");
      var check = function() {
        counter++;
        if (counter == self.directories.length) {
          //render() should get rid of the class, but let's be sure
          self.element.classList.remove("loading");
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

      var current = editor.getSession();
      var tree = this.element.querySelector(".tree");
      this.pathMap = {};
      if (this.directories.length == 0 && !this.loading) {
        this.element.classList.remove("show");
        this.element.style.width = null;
        tree.innerHTML = "";
        return;
      }
      var self = this;
      this.element.classList.add("show");
      if (this.loading) {
        this.element.classList.add("loading");
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
          li.appendChild(a);
          if (self.expanded[node.entry.fullPath]) {
            li.classList.add("expanded");
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
            ul.appendChild(walker(node.children[i]));
          }
          li.append(ul);
        } else {
          var nodeData = {
            path: node.entry.fullPath,
            contextMenu: context.makeURL("file", node.entry.fullPath.replace(/[\/\\]/g, "@")),
            className: current.path && current.path.endsWith(node.entry.fullPath) ? "active-file" : "",
            label: node.label
          };
          var a = inflate.get("templates/projectFile.html", nodeData)
          li.appendChild(a);
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
          self.element.classList.remove("loading");
        }
      });
    },

    setElement: function(el) {
      this.element = el;
      this.bindEvents();
    },

    bindEvents: function() {
      var self = this;
      this.element.addEventListener("click", function(e) {
        e.preventDefault();
        var target = e.target;
        if (target.classList.contains("directory")) {
          target.parentElement.classList.toggle("expanded");
          var path = target.getAttribute("data-full-path");
          self.expanded[path] = !!!self.expanded[path];
        }
        editor.focus();
      });
      
      // make sure width is not set in element `style`
      this.element.style.width = null;
  
      var handle = this.element.querySelector('.project-resizer');
      
      this.startResize = this.startResize.bind(this);
      this.stopResize = this.stopResize.bind(this);
      this.resize = this.resize.bind(this);
      
      handle.addEventListener('mousedown', this.startResize);
      
    },
    

    startResize: function (e) {
      // do not resize when 'autohide' is on
      if (this.element.classList.contains('autohide')) return;

      e.preventDefault();
      e.stopPropagation();

      this.element.classList.add('resizing');
      this.resizing = true;

      document.addEventListener('mousemove', this.resize);
      document.addEventListener('mouseup', this.stopResize);
    },

    resize: function (e) {
      if (!this.resizing) return;

      var mouseX = e.pageX;
      if (mouseX > MIN_WIDTH && mouseX < MAX_WIDTH) {
        this.element.style.width = e.pageX + 8 + 'px';
      }
    },

    stopResize: function (e) {
      if (!this.resizing) return;

      e.preventDefault();
      e.stopPropagation();

      this.element.classList.remove('resizing');
      this.resizing = false;

      document.removeEventListener('mousemove', this.resize);
      document.removeEventListener('mouseup', this.stopResize);

      //Ace doesn't know about non-window resize events
      //moving the panel will screw up its dimensions
      setTimeout(function() {
        editor.resize();
      }, 100);
    },

    openFile: async function(path) {
      var self = this;
      var found = false;
      var node = this.pathMap[path];
      if (!node) return;
      //walk through existing tabs to see if it's already open
      var tabs = sessions.getAllTabs();
      var path = await chromeP.fileSystem.getDisplayPath(node.entry);
      //look through the tabs for matching display paths

      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (!tab.file || tab.file.virtual) {
          continue;
        }
        var p = await tab.file.getPath();
        if (p == path) {
          return sessions.setCurrent(tab);
        }
      }
      var file = new File(node.entry);
      var data = await file.read();
      sessions.addFile(data, file);
    },

    generateProject: async function() {
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
        await file.open("save");
        await file.write(json);
        var id = file.retain();
        chrome.storage.local.set({retainedProject: id});
        file.onWrite = watch;
        this.projectFile = file;
      }
      return json;
    },

    openProjectFile: async function() {
      var file = new File();
      await file.open();
      var data = await file.read();
      this.loadProject(data);
      var retained = file.retain();
      chrome.storage.local.set({retainedProject: retained});
      this.projectFile = file;
      file.onWrite = this.watchProjectFile.bind(this);
    },

    watchProjectFile: async function() {
      var data = await this.projectFile.read();
      this.loadProject(data);
    },

    loadProject: async function(project) {
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
      this.element.classList.add("loading");
      //restore directory entries that can be restored
      this.directories = [];
      blacklist = blacklistRegExp(project.settings);
      var completed = project.folders.map(async function(folder) {
        var entry = await chromeP.fileSystem.restoreEntry(folder.retained);
        //remember, you can only restore project directories you'd previously opened
        if (!entry) return;
        var path = await chromeP.fileSystem.getDisplayPath(entry);
        var node = new FSNode(entry);
        node.path = path;
        //if this is the first, go ahead and start the slideout
        if (!self.directories.length) {
          self.element.classList.add("show");
        }
        self.directories.push(node);
        return new Promise(ok => node.walk(blacklist, ok));
      });
      await Promise.all(completed);
      self.loading = false;
      self.render();
    },

    editProjectFile: async function() {
      if (!this.projectFile) {
        return dialog(i18n.get("projectNoCurrentProject"));
      }
      var data = await this.projectFile.read();
      sessions.addFile(data, this.projectFile);
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
    },
    
    changeActiveTab: function(tab) {
      var tree = this.element.querySelector(".tree");
      tree.querySelectorAll(".active-file").forEach(element => element.classList.remove("active-file"));
      if (!tab || !tab.path) return;

      var projectArgument = tab.path.replace(/^.*\/Caret\//, "/Caret/");
      var matchingFile = tree.querySelector('a[argument="' + projectArgument + '"]')
      if (!matchingFile) return;

      matchingFile.classList.add("active-file");
    },
    
  };

  var pm = new ProjectManager(document.querySelector(".project"));
  command.on("project:add-dir", pm.addDirectory.bind(pm));
  command.on("project:remove-all", pm.removeAllDirectories.bind(pm));
  command.on("project:generate", pm.generateProject.bind(pm));
  command.on("project:open-file", pm.openFile.bind(pm));
  command.on("project:refresh-dir", pm.refresh.bind(pm));
  command.on("project:open", pm.openProjectFile.bind(pm));
  command.on("project:edit", pm.editProjectFile.bind(pm));
  command.on("project:clear", pm.clearProject.bind(pm));
  command.on("session:active-tab", pm.changeActiveTab.bind(pm));

  context.register("Remove from Project", "removeDirectory", "root/directory/:id", pm.removeDirectory.bind(pm));

  var setAutoHide = function() {
    var hide = Settings.get("user").autoHideProject;
    if (hide) {
      pm.element.classList.add("autohide");
      pm.element.style.width = null;
    } else {
      pm.element.classList.remove("autohide");
    }
  }

  command.on("init:startup", setAutoHide);
  command.on("init:restart", setAutoHide);

  return pm;

});
