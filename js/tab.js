define([
    "command",
    "storage/file",
    "util/manos",
    "settings!ace,user",
    "util/template!templates/tab.html",
    "ui/dialog"
  ], function(command, File, M, Settings, inflate, dialog) {
    
  /*
  
  Tabs are just augmented versions of regular Ace sessions. We add properties
  to track the attached file, detect syntax, render the tab UI, and fire events
  when the tab is removed.
  
  */

  var EditSession = ace.require("ace/edit_session").EditSession;
  
  var Tab = function(contents, file) {
    contents = contents || "";
    EditSession.call(this, contents, "ace/mode/text");
    
    if (contents) {
      this.setValue(contents);
    }
    
    if (file) {
      this.setFile(file);
    } else {
      this.fileName = "untitled.txt";
    }
    
    this.modified = false;
    this.setUndoManager(new ace.UndoManager());
    
    var self = this;
    this.on("change", function() {
      if (self.modified) return;
      self.modified = true;
      command.fire("session:render");
    });
    
    this.animationClass = "enter";
    
  };
  
  //hopefully this never screws up unaugmented Ace sessions.
  Tab.prototype = EditSession.prototype;
  
  Tab.prototype.setFile = function(file) {
    this.file = file;
    this.fileName = file.entry.name;
    this.modifiedAt = new Date();
    var self = this;
    if (!this.file.virtual) file.getPath(function(err, path) {
      self.path = path;
      command.fire("session:render");
    });
  }
  
  Tab.prototype.save = function(as) {
    
    //strip final whitespace, if enabled
    if (Settings.get("user").trimTrailingWhitespace) {
      command.fire("ace:trim-whitespace");
    }
    
    var content = this.getValue();
    var self = this;
    var deferred = M.deferred();

    var whenOpen = function() {
      self.file.write(content, function(err) {
        if (err) {
          return deferred.fail(err);
        }
        self.modifiedAt = new Date();
        self.modified = false;
        command.fire("session:render");
        deferred.done();
      });
    };

    if (!self.file || as) {
      var file = new File();
      file.open("save", function(err) {
        if (err) {
          if (err.message != "User cancelled") dialog(err.message);
          return deferred.fail(err);
        }
        self.file = file;
        self.fileName = file.entry.name;
        delete self.syntaxMode;
        self.detectSyntax();
        whenOpen();
      });
    } else {
      whenOpen();
    }
    
    return deferred.promise();
  };
  
  Tab.prototype.drop = function() {
    //let listeners know, like the project manager
    this._emit("close");
    if (!this.file || !chrome.fileSystem.retainEntry) return;
    var id = this.file.retain();
    if (!id) return;
    chrome.storage.local.get("retained", function(data) {
      if (!data.retained) return;
      var filtered = data.retained.filter(function(item) { return item != id });
      chrome.storage.local.set({ retained: filtered });
    });
  };
  
  Tab.prototype.render = function(index) {
    var element = inflate.get("templates/tab.html", {
      index: index,
      fileName: this.fileName,
      modified: this.modified,
      animation: this.animationClass,
      path: this.path
    });
    this.animationClass = "";
    return element;
  }
  
  Tab.prototype.detectSyntax = function(userConfig) {
    //settings are async
    var self = this;
    Settings.pull("user").then(function(data) {
      var userConfig = data.user;
      self.setUseSoftTabs(!userConfig.useTabs);
      self.setTabSize(userConfig.indentation || 2);
      self.setUseWrapMode(userConfig.wordWrap);
      self.setWrapLimit(userConfig.wrapLimit || null);
      self.setNewLineMode(userConfig.lineEnding || "auto");
      self.setUseWorker(userConfig.useWorker);
    });
    //syntax, however, is sync
    var syntaxValue = this.syntaxMode || "plain_text";
    if (this.file) {
      if (this.file.virtual) {
        //settings files are special
        syntaxValue = "javascript";
        this.setMode("ace/mode/javascript");
      } else if (this.file.entry) {
        var extension = this.file.entry.name.split(".").pop();
        //this won't ever change, safe to get each time
        var aceConfig = Settings.get("ace");
        for (var i = 0; i < aceConfig.modes.length; i++) {
          var mode = aceConfig.modes[i];
          if (mode.extensions.indexOf(extension) > -1) {
            syntaxValue = mode.name;
            break;
          }
        }
      }
    }
    this.setMode("ace/mode/" + syntaxValue);
    this.syntaxMode = syntaxValue;
    //update the UI
    command.fire("session:syntax");
    return syntaxValue;
  }
  
  return Tab;

});