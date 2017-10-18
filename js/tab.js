define([
    "command",
    "storage/file",
    "settings!ace,user",
    "util/template!templates/tab.html",
    "ui/dialog",
    "util/chromePromise"
  ], function(command, File, Settings, inflate, dialog, chromeP) {
    
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
    this.readOnly = false;
  };
  
  //hopefully this never screws up unaugmented Ace sessions.
  Tab.prototype = Object.create(EditSession.prototype);
  
  Tab.prototype.setFile = function(file) {
    this.file = file;
    this.fileName = file.entry.name;
    this.modifiedAt = new Date();
    this.setPath();
  };

  Tab.prototype.setPath = async function() {
    if (!this.file || this.file.virtual) return;
    var path = await this.file.getPath();
    this.path = path;
    command.fire("session:render");
  };
  
  Tab.prototype.save = async function(as) {
    
    //strip final whitespace, if enabled
    if (Settings.get("user").trimTrailingWhitespace) {
      command.fire("ace:trim-whitespace");
    }
    
    var content = this.getValue();

    if (!this.file || as) {
      var file = new File();
      try {
        await file.open("save");
      } catch(err) {
        if (err.message != "User cancelled") {
          dialog(err.message);
          throw err;
        }
      }
      this.file = file;
      this.fileName = file.entry.name;
      delete this.syntaxMode;
      this.detectSyntax();
    }
    await this.file.write(content);
    this.modifiedAt = new Date();
    this.modified = false;
    this.setPath();
    command.fire("session:render");
  };
  
  Tab.prototype.drop = async function() {
    //let listeners know, like the project manager
    this._emit("close");
    if (!this.file || !chrome.fileSystem.retainEntry) return;
    var id = this.file.retain();
    if (!id) return;
    var data = await chromeP.storage.local.get("retained");
    if (!data.retained) return;
    var filtered = data.retained.filter(item => item != id);
    chrome.storage.local.set({ retained: filtered });  
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
  };

  Tab.prototype.applySettings = async function(syntaxValue) {
    var data = await Settings.pull("user");
    var userConfig = data.user;
    var syntaxConfig = (data.user.syntaxSpecific || {})[syntaxValue] || {};
    
    //merge settings
    for (var k in syntaxConfig) {
      userConfig[k] = syntaxConfig[k];
    }

    this.setUseSoftTabs(!userConfig.useTabs);
    this.setTabSize(userConfig.indentation || 2);
    this.setUseWrapMode(userConfig.wordWrap);
    this.setWrapLimit(userConfig.wrapLimit || null);
    this.setNewLineMode(userConfig.lineEnding || "auto");
    
    this.setUseWorker(userConfig.useWorker);
  };
  
  Tab.prototype.detectSyntax = async function() {
    var syntaxValue = this.syntaxMode || "plain_text";

    await this.applySettings(syntaxValue);

    if (this.file) {
      if (this.file.virtual) {
        //settings files are special
        syntaxValue = "javascript";
        this.setMode("ace/mode/javascript");
      } else if (this.file.entry) {
        var extension = this.file.entry.name.split(".").pop().toLowerCase();
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
  
  Tab.prototype.$startWorker = function() {
    var userConfig = Settings.get("user");

    // call the superclass method to start worker
    EditSession.prototype.$startWorker.call(this);
    
    // configure jsHint worker if applicable
    if (this.syntaxMode === 'javascript' && userConfig.jsHint && this.$worker) {
      this.$worker.send('changeOptions', [userConfig.jsHint]);
    }
  };
  
  return Tab;

});
