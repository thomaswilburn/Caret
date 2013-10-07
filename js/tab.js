define(["command"], function(command) {

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
      command.fire("sessions:render");
    });
    
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

    var whenOpen = function() {
      self.file.write(content, function() {
        self.modifiedAt = new Date();
        if (c) c();
      });
      self.modified = false;
      command.fire("sessions:render")
    };

    if (!this.file || as) {
      var file = new File();
      return file.open("save", function(err) {
        self.file = file;
        if (err) {
          dialog(err);
          return;
        }
        self.fileName = file.entry.name;
        delete self.syntaxMode;
        whenOpen();
      });
    }

    whenOpen();
  };
  
  Tab.prototype.drop = function() {
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