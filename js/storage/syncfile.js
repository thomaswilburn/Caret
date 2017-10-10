define([
    "storage/syncFS",
    "command"
  ], function(sync, command) {

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
    
  var SyncFile = function(name) {
    this.entry = {};
    if (name) {
      this.open(name);
    }
    this.virtual = true;
  };
  SyncFile.prototype = {
    name: "",
    open: function(name) {
      this.name = name;
      this.entry.name = name;
      return this;
    },
    read: async function() {
      var name = this.name;
      return await sync.get(this.name)
    },
    write: async function(content) {
      await sync.set(this.name, content);
      command.fire("settings:change-local");
    },
    retain: function() { return false; },
    restore: function() { return Promise.reject("Cannot restore sync storage files") }
  };
  
  return SyncFile;
  
});