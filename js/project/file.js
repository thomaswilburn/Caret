define([
  "project/tree",
  "command",
  "storage/file",
  "storage/settingsProvider",
  "sessions",
  "ui/dialog",
  "util/manos"
], function(projectTree, command, File, Settings, session, dialog, M) {
  var projectConfig;
  var projectFile;
  
  var generateProject = function() {
    var project = projectConfig || {};
    //everything but "folders" is left as-is
    //run through all directories, retain them, and add to the structure
    project.folders = projectTree.getDirectories().map(function(node) {
      var id = chrome.fileSystem.retainEntry(node.entry);
      return {
        retained: id,
        path: node.entry.fullPath
      };
    });
    var json = JSON.stringify(project, null, 2);
    if (projectFile) {
      projectFile.write(json);
    } else {
      var file = new File();
      var watch = watchProjectFile;
      file.open("save", function() {
        file.write(json);
        var id = file.retain();
        chrome.storage.local.set({retainedProject: id});
        file.onWrite = watch;
        projectFile = file;
      });
    }
    return json;
  };
  
  openProjectFile: function() {
    var file = new File();
    file.open(function() {
      file.read(function(err, data) {
        loadProject(data);
        var retained = file.retain();
        chrome.storage.local.set({retainedProject: retained});
        projectFile = file;
        file.onWrite = watchProjectFile;
      });
    });
  };
  
  var watchProjectFile = function() {
    projectFile.read(function(err, data) {
      loadProject(data);
    });
  };
  
  var loadProject = function(project) {
    //project is the JSON from a project file
    if (typeof project == "string") {
      project = JSON.parse(project);
    }
    projectConfig = project;
    //assign settings
    if (project.settings) {
      Settings.setProject(project.settings);
    }
    this.loading = true;
    this.element.addClass("loading");
    //restore directory entries that can be restored
    this.directories = [];
    blacklist = blacklistRegExp();
    //TODO: untangle this from tree view
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
  };
  
  var editProjectFile = function() {
    if (!this.projectFile) {
      return dialog(i18n.get("projectNoCurrentProject"));
    }
    projectFile.read(function(err, data) {
      sessions.addFile(data, projectFile);
    });
  };
  
  var clearProject = function(keepRetained) {
    projectFile = null;
    projectConfig = {};
    projectTree.clear();
    Settings.clearProject();
    if (!keepRetained) chrome.storage.local.remove("retainedProject");
  };
    
});