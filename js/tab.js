define([
    "command",
    "storage/file",
    "util/manos"
  ], function(command, File, M) {

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
      return;
    }

    whenOpen();
    
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
  
  return Tab;

});