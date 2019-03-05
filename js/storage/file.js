define([
    "util/chromePromise"
  ], function(chromeP) {
  
  /*
  
  The File object provides storage backed by the local HDD via the chrome.fileSystem API.
    
  */
  
  var noop = function() {};
  
  var File = function(entry) {
    this.entry = entry || null;
    this.onWrite = noop;
  };
  
  File.prototype = {
    open: async function(mode) {
      var self = this;
      //mode is "open" or "save"
      var modes = {
        "open": "openWritableFile",
        "save": "saveFile"
      };
      
      var entry = await chromeP.fileSystem.chooseEntry({ type: modes[mode] });
      //cancelling acts like an error, but isn't.
      if (!entry) throw chrome.runtime.lastError;
      this.entry = entry;
    },
    
    read: function() {
      var self = this;
      
      return new Promise(function(ok, fail) {
        if (!self.entry) {
          console.error(self);
          fail("File not opened");
        }
        var reader = new FileReader();
        reader.onload = function() {
          ok(reader.result);
        };
        reader.onerror = function(err) {
          console.error("File read error!");
          fail(err);
        };
        self.entry.file(function(f) {
          reader.readAsText(f);
        });
      });
    },
    
    write: async function(data) {
      var self = this;
      
      if (!self.entry) {
        //guard against cases where we accidentally write before opening
        await self.open("save");
        try {
          await self.write(data);
          ok();
        } catch(err) {
          fail(err);
        }
      };

      var isWritable = await chromeP.fileSystem.isWritableEntry(this.entry);
      if (!isWritable) {
        var w = await chromeP.fileSystem.getWritableEntry(this.entry);
        this.entry = w;
      }

      return new Promise((ok, fail) => {
        this.entry.createWriter(function(writer) {
          writer.onerror = function(err) {
            console.error(err);
            fail(err);
          }
          writer.onwriteend = function() {
            //after truncation, actually write the file
            writer.onwriteend = function() {
              ok();
              self.onWrite();
            }
            var blob = new Blob([data]);
            writer.write(blob);
          };
          writer.truncate(0);
        }, function(err) {
          console.error(err);
          fail(err);
        });
      });
    },
    
    stat: function() {
      var self = this;
      return new Promise(function(ok, fail) {
        if (self.entry) {
          return self.entry.file(function(f) {
            ok(f);
          });
        }
        fail("No file entry");
      });
    },
    
    retain: function() {
      var id = chrome.fileSystem.retainEntry(this.entry);
      return {
        type: "file",
        id: id
      };
    },
    
    restore: async function(id) {
      var isRestorable = await chromeP.fileSystem.isRestorable(id);
      if (isRestorable) {
        var entry = await chromeP.fileSystem.restoreEntry(id);
        if (!entry) throw "restoreEntry() failed for " + id;
        this.entry = entry;
        return entry;
      } else {
        throw "isRestorable() returned false for " + id;
      }
    },
    
    getPath: async function() {
      if (!this.entry) throw "No backing entry, cannot get path";
      var path = await chromeP.fileSystem.getDisplayPath(this.entry);
      return path;
    }
  };
  
  return File;

});