define([
    "command",
    "storage/file",
    "util/manos",
    "settings!ace",
    "util/template!templates/tab.html"
  ], function(command, File, M, Settings, inflate) {

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
  }
  
  Tab.prototype.save = function(as, c) {
    if (typeof as == "function") {
      c = as;
      as = false;
    }
    var content = this.getValue();
    var self = this;
    var deferred = M.deferred();

    var whenOpen = function() {
      self.file.write(content).then(function() {
        self.modifiedAt = new Date();
        self.modified = false;
        command.fire("session:render");
        deferred.done();
      }, deferred.fail.bind(deferred));
    };

    if (!self.file || as) {
      var file = new File();
      file.open("save")
        .then(function() {
          self.file = file;
          self.fileName = file.entry.name;
          delete self.syntaxMode;
        }, function(err) {
          dialog(err);
          deferred.fail();
        })
        .then(whenOpen);
    } else {
      whenOpen();
    }
    
    if (c) M.pton(deferred, c);
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
      animation: this.animationClass
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
    var syntaxValue = "plain_text";
    if (this.syntaxMode) {
      syntaxValue = this.syntaxMode;
    } else if (this.file) {
      if (this.file.virtual) {
        //settings files are special
        syntaxValue = "javascript";
        this.setMode("ace/mode/javascript");
      } else if (this.file.entry) {
        var found = false;
        var extension = this.file.entry.name.split(".").pop();
        //this won't ever change, safe to get each time
        var aceConfig = Settings.get("ace");
        for (var i = 0; i < aceConfig.modes.length; i++) {
          var mode = aceConfig.modes[i];
          if (mode.extensions.indexOf(extension) > -1) {
            this.setMode("ace/mode/" + mode.name);
            syntaxValue = mode.name;
            break;
          }
        }
      }
      this.syntaxMode = syntaxValue;
    }
    this.setMode("ace/mode/" + syntaxValue);
    return syntaxValue;
  }
  
  return Tab;

});