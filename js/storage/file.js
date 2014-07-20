define([
    "util/manos"
  ], function(M) {
  
  /*
  
  The File object provides storage backed by the local HDD via the chrome.fileSystem API.
    
  */
  
  var noop = function() {};
  
  var File = function(entry) {
    this.entry = entry || null;
    this.onWrite = noop;
  };
  
  File.prototype = {
    open: function(mode, c) {
      var self = this;
      if (typeof mode == "function") {
        c = mode;
        mode = "open";
      }
      //mode is "open" or "save"
      var modes = {
        "open": "openWritableFile",
        "save": "saveFile"
      };
      
      chrome.fileSystem.chooseEntry({
        type: modes[mode]
      }, function(entry) {
        //cancelling acts like an error, but isn't.
        if (!entry) return c(chrome.runtime.lastError);
        self.entry = entry;
        c(null, self);
      });
    },
    
    read: function(c) {
      var self = this;
      
      if (!self.entry) {
        console.error(self);
        c("File not opened");
      }
      var reader = new FileReader();
      reader.onload = function() {
        c(null, reader.result);
      };
      reader.onerror = function(err) {
        console.error("File read error!");
        c(err);
      };
      self.entry.file(function(f) {
        reader.readAsText(f);
      });
    },
    
    write: function(data, c) {
      var self = this;
      c = c || function() {};
      if (!self.entry) {
        //guard against cases where we accidentally write before opening
        return self.open("save").then(function() {
          return self.write(data, c);
        });
      }
      
      M.chain(
        //check permissions
        function(next) {
          chrome.fileSystem.isWritableEntry(self.entry, next);
        },
        //if read-only, try to open as writable
        function(ok, next) {
          if (!ok) {
            return chrome.fileSystem.getWritableEntry(self.entry, function(entry) {
              if (entry) {
                self.entry = entry;
                next();
              } else {
                c("Couldn't open file as writable");
              }
            });
          }
          next();
        },
        //write file
        function() {
          self.entry.createWriter(function(writer) {
            writer.onerror = function(err) {
              console.error(err);
              c(err);
            }
            writer.onwriteend = function() {
              //after truncation, actually write the file
              writer.onwriteend = function() {
                c();
                self.onWrite();
              }
              var blob = new Blob([data]);
              writer.write(blob);
            };
            writer.truncate(0);
          });
        }
      );
    },
    
    stat: function(c) {
      var self = this;
      if (self.entry) {
        return self.entry.file(function(f) {
          c(null, f);
        });
      }
      c("No file entry");
    },
    
    retain: function() {
      var id = chrome.fileSystem.retainEntry(this.entry);
      return {
        type: "file",
        id: id
      };
    },
    
    restore: function(id, c) {
      var self = this;
      
      chrome.fileSystem.isRestorable(id, function(is) {
        if (is) {
          chrome.fileSystem.restoreEntry(id, function(entry) {
            if (!entry) return c("restoreEntry() failed for " + id);
            self.entry = entry;
            c();
          });
        } else {
          c("isRestorable() returned false for " + id);
        }
      });
    },
    
    getPath: function(c) {
      var self = this;
      if (!self.entry) return fail("No backing entry, cannot get path");
      chrome.fileSystem.getDisplayPath(self.entry, function(path) {
        c(null, path);
      });
    }
  };
  
  return File;

});