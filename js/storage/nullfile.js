define(function() {
  
  // The null file is the equivalent of dev/null--you can read/write, but you get nothing
  // It's used for things like settings files, which can't be saved.
  
  var NullFile = function(content) {
    this.content = content;
  };
  NullFile.prototype = {
    virtual: true,
    open: function(mode, c) {
      if (typeof mode == "function") {
        c = mode;
      }
      c(null, this);
    },
    read: function(c) {
      c(null, this.content || "");
    },
    write: function(data, c) {
      if (c) c();
    },
    stat: function(c) {
      c("Can't stat a null file");
    },
    retain: function() {
      return null;
    },
    restore: function(id, c) {
      c("Can't restore a null file");
    },
    getPath: function(c) {
      c(null, "/dev/null");
    }
  };
  
  return NullFile;
  
});