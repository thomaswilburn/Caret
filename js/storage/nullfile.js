define(function() {
  
  // The null file is the equivalent of dev/null--you can read/write, but you get nothing
  // It's used for things like settings files, which can't be saved.
  
  var NullFile = function(content) {
    this.content = content;
  };
  NullFile.prototype = {
    virtual: true,
    open: function(mode) {
      return Promise.resolve(this);
    },
    read: function(c) {
      return Promise.resolve(this.content || "");
    },
    write: async function(data) {
      return Promise.resolve();
    },
    stat: function() {
      return Promise.reject("Can't stat a null file");
    },
    retain: function() {
      return Promise.resolve();
    },
    restore: function(id) {
      return Promise.reject("Can't restore a null file");
    },
    getPath: function(c) {
      return Promise.resolve("/dev/null");
    }
  };
  
  return NullFile;
  
});