define([
    "storage/syncFS",
    "command",
    "util/manos"
  ], function(sync, command, M) {

  /*

  SyncFile is a wrapper around Chrome's synchronized storage use the same
  interface as the File module. This means you can assign a SyncFile
  containing Caret's settings JSON to a tab just as you would a regular file,
  and the tab can read/write from it without any customization. The one
  difference is the virtual flag, which is used to prevent some file-only
  behaviors (such as retainEntry calls).

  As soon as chrome.syncFileSystem allows us to create a filesystem even if
  the device is offline for the first request, we'll swap these over to a
  wrapper around file entries from that storage. The change should remain
  entirely transparent as far as other modules are concerned, although there
  are some abstraction leaks in settings.js that we'll need to handle.
  
  */
    
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
      var self = this;
      var promise = new Promise(function(ok, fail) {
        resolve(self);
      });
      if (c) M.pton(promise, c);
      return promise;
    },
    read: function(c) {
      var name = this.name;
      return sync.get(this.name);
    },
    write: function(content, c) {
      var self = this;
      return sync.set(this.name, content).then(function() {
        command.fire("settings:change-local");
      });
    },
    retain: function() { return false; },
    restore: function() { return new Promise.reject() }
  };
  
  return SyncFile;
  
});