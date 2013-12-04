define([
    "storage/syncFS",
    "command"
  ], function(sync, command) {
    
  window.sync = sync;
    
  var SyncFile = function(name, c) {
    this.entry = {};
    if (name) {
      this.open(name, c);
    }
    this.virtual = true;
  };
  SyncFile.prototype = {
    name: "",
    open: function(name, c) {
      this.name = name;
      this.entry.name = name;
      if (c) {
        c(this);
      }
    },
    read: function(c) {
      var name = this.name;
      sync.get(this.name, function(data) {
        c(null, data[name]);
      });
    },
    write: function(content, c) {
      var self = this;
      sync.set(this.name, content, function() {
        command.fire("settings:change-local");
        if (c) c(null, self);
      });
    },
    retain: function() { return false; }
  };
  
  return SyncFile;
  
});