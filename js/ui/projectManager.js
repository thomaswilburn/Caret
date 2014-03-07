define([
    "settings!user",
    "command",
    "sessions",
    "storage/file",
    "util/manos",
    "util/FSExplorer",
    "ui/dialog",
    "ui/contextMenus",
    "editor",
    "util/template!templates/projectDir.html,templates/projectFile.html",
    "util/dom2"
  ], function(Settings, command, sessions, File, M, FSExplorer, dialog, context, editor, inflate) {
    
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
  var pathIDs = {};

  var sortProjectItems = function(a, b) {
    var aa = a.childNodes[0];
    var bb = b.childNodes[0];
    var aData = aa.dataset['fullPath'] || aa.getAttribute('argument');
    var bData = bb.dataset['fullPath'] || bb.getAttribute('argument');

    if (aData > bData)
      return 1;

    if (aData < bData)
      return -1;

    return 0;
  };

  var createProjectElement = function(entry, isRoot) {
    var li = document.createElement("li");
    if (entry.isDirectory) {
      var nodeData = {
        label: entry.name,
        path: entry.fullPath,
        contextMenu: context.makeURL(isRoot ? "root/directory" : "directory", pathIDs[entry.fullPath])
      };
      var a = inflate.get("templates/projectDir.html", nodeData);
      // a.addClass('loading');
      li.append(a);
      if (this.expanded[entry.fullPath]) {
        li.addClass("expanded");
      }
      var ul = document.createElement("ul");
      li.append(ul);
    } else {
      var nodeData = {
        path: entry.fullPath,
        contextMenu: context.makeURL("file", entry.fullPath.replace(/[\/\\]/g, "@")),
        label: entry.name
      };
      var a = inflate.get("templates/projectFile.html", nodeData)
      li.append(a);
      this.pathMap[entry.fullPath] = entry;
    }
    return li;
  };

  var fsOnProgress = function(data) {
    if (pathIDs[data.entry.fullPath] === undefined)
      pathIDs[data.entry.fullPath] = guidCounter++;

    //skip ignored dirs
    var blacklist = Settings.get("user").ignoreFiles;
    if (blacklist) {
      blacklist = new RegExp(blacklist);
      if (blacklist.test(data.entry.name))
        return;
    }

    this.renderDirectory(data);
  }

  var fsOnDone = function() {
    // onDone
    console.log('done');
  }

  var fsOnError = function(err) {
    // onError
    console.log('error', err);
  }
  
  // The Project Manager actually handles rendering and interfacing with the rest
  // of the code. Commands are bound to a singleton instance, but it's technically
  // not picky about being the only one.
  
  var ProjectManager = function(element) {
    this.directories = [];
    this.directoriesMap = {};
    this.pathMap = {};
    this.expanded = {};
    this.project = null;
    this.projectFile = null;
    if (element) {
      this.setElement(element);
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
    });
  };
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
      //ensure we aren't duplicating
      for (var i in this.directories) {
        if (this.directories[i].entry.fullPath === entry.fullPath)
          root = directoryNode;
      }

      if (!root) {
        root = new FSExplorer(entry);
        this.directories.push(root);
        this.directoriesMap[entry.fullPath] = root;
      }

      this.render();

      //if the directory was there, we still want
      //to refresh it, in response to the users
      //interaction
      root.run(fsOnProgress.bind(this), fsOnDone.bind(this), fsOnError.bind(this));
    },
    removeDirectory: function(args) {
      var xpath;
      this.directories = this.directories.filter(function(dir) {
        if (pathIDs[dir.entry.fullPath] != args.id)
          return true;
        
        dir.stop();
        xpath = './/li/a[@data-full-path="' + dir.entry.fullPath + '"]/..';
        document.evaluate(xpath, this.elementUl).iterateNext().remove();
      }.bind(this));
      this.render();
    },
    removeAllDirectories: function() {
      for (var i in this.directories) {
        this.directories[i].stop();
      }
      this.directories = [];
      this.render();
    },
    refresh: function() {
      for (var i in this.directories) {
        this.directories[i].run(fsOnProgress.bind(this), fsOnDone.bind(this), fsOnError.bind(this));
      }
    },
    render: function() {
      if (!this.element) return;
      //Ace doesn't know about non-window resize events
      //moving the panel will screw up its dimensions
      setTimeout(function() {
        editor.resize();
      }, 500);
      if (this.directories.length == 0) {
        this.element.removeClass("show");
        this.element.innerHTML = "";
        return;
      }
      var self = this;
      this.element.addClass("show");
      if (!this.element.hasChildNodes()) {
        this.elementUl = document.createElement("ul");
        this.element.appendChild(this.elementUl);
      }
    },
    renderDirectory: function(data) {
      var isRoot = (data.entry.fullPath.split('/').length - 1) == 1;
      var xpath = './/li/a[@data-full-path="' + data.entry.fullPath + '"]/..';
      var li = document.evaluate(xpath, this.elementUl).iterateNext();

      if (li === null && isRoot) {
        li = createProjectElement.bind(this)(data.entry, isRoot);
        li.classList.add("root");
        li.classList.add("expanded");
        this.elementUl.appendChild(li);
      }

      if (li === null) {
        throw "li is null";
      }

      var liul = document.evaluate('./ul', li).iterateNext();
      var liA = document.evaluate('./a[@data-full-path]', li).iterateNext();

      switch (data.status) {
        case 'loading':
          // if (!liA.hasClass('loading'))
          //   liA.addClass('loading');
          break;

        case 'done':
          if (liA.hasClass('loading'))
            liA.removeClass('loading');

          var existingMap = {};
          var i;
          var item;
          var argName;

          var blacklist = Settings.get("user").ignoreFiles;

          for (i in data.items) {
            item = data.items[i];

            //skip ignored files/dirs
            if (blacklist) {
              blacklist = new RegExp(blacklist);
              if (blacklist.test(item.name))
                continue;
            }

            argName = 'data-full-path';
            if (!item.isDirectory)
              argName = 'argument';

            xpath = './li/a[@' + argName + '="' + item.fullPath + '"]/..';
            if (document.evaluate(xpath, liul).iterateNext() == null)
              liul.appendChild(createProjectElement.bind(this)(item));

            if (this.expanded[item.fullPath])
              this.directoryPriorityLoad(item.fullPath);

            existingMap[item.fullPath] = true;
          }

          var dirItems = [];
          var fileItems = [];
          var toRemove = [];
          var res;
          var resA;
          var iter = document.evaluate('./li', liul);
          while (res = iter.iterateNext()) {
            resA = res.childNodes[0];

            if (existingMap[resA.dataset['fullPath'] || resA.getAttribute('argument')] === undefined)
              toRemove.push(res);
            else {
              if (resA.hasClass('directory'))
                dirItems.push(res);
              else
                fileItems.push(res);
            }
          }

          dirItems.sort(sortProjectItems);
          fileItems.sort(sortProjectItems);

          for (i in dirItems) {
            liul.appendChild(dirItems[i]);
          }
          for (i in fileItems) {
            liul.appendChild(fileItems[i]);
          }
          for (i in toRemove) {
            toRemove[i].remove();
          }

          break;
      }
    },
    directoryPriorityLoad: function(path) {
      if (this.directoriesMap['/' + path.split('/')[1]].loadFirst(path)){
        var xpath = './/li/a[@data-full-path="' + path + '"]';
        var liA = document.evaluate(xpath, this.elementUl).iterateNext();
        if (!liA.hasClass('loading'))
          liA.addClass('loading');
      }
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
          var path = target.dataset["fullPath"];
          self.expanded[path] = !!!self.expanded[path];
          self.directoryPriorityLoad(path);
        }
      });
    },
    openFile: function(path) {
      var self = this;
      var found = false;
      var entry = this.pathMap[path];
      if (entry === undefined) return;
      //walk through existing tabs to see if it's already open
      var tabs = sessions.getAllTabs();
      chrome.fileSystem.getDisplayPath(entry, function(path) {
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
            var file = new File(entry);
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
      for (var i in this.directories) {
        this.directories[i].stop();
      }
      //restore directory entries that can be restored
      this.directories = [];
      var folder;
      for (var i in project.folders) {
        folder = project.folders[i];
        chrome.fileSystem.restoreEntry(folder.retained, function(entry) {
          if (!entry)
            return;
          self.insertDirectory(entry);
        });
      }
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
      for (var i in this.directories) {
        this.directories[i].stop();
      }
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
  
  return pm;

});