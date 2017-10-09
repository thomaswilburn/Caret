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
    open: function(mode) {
      var self = this;
      //mode is "open" or "save"
      var modes = {
        "open": "openWritableFile",
        "save": "saveFile"
      };
      
      return new Promise(function(ok, fail) {
        chrome.fileSystem.chooseEntry({
          type: modes[mode]
        }, function(entry) {
          //cancelling acts like an error, but isn't.
          if (!entry) return fail(chrome.runtime.lastError);
          self.entry = entry;
          ok(self);
        });
      });
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
    
    write: function(data) {
      var self = this;
      
      return new Promise(async function(ok, fail) {
        if (!self.entry) {
          //guard against cases where we accidentally write before opening
          await self.open("save");
          try {
            await self.write(data);
            ok();
          } catch(err) {
            fail(err);
          }
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
                  fail("Couldn't open file as writable");
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
            });
          }
        );
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
    
    restore: function(id) {
      var self = this;

      return new Promise(function(ok, fail) {
        
        chrome.fileSystem.isRestorable(id, function(is) {
          if (is) {
            chrome.fileSystem.restoreEntry(id, function(entry) {
              if (!entry) return fail("restoreEntry() failed for " + id);
              self.entry = entry;
              ok();
            });
          } else {
            fail("isRestorable() returned false for " + id);
          }
        });
      });
    },
    
    getPath: function() {
      var self = this;
      return new Promise(function(ok, fail) {
        if (!self.entry) return fail("No backing entry, cannot get path");
        chrome.fileSystem.getDisplayPath(self.entry, function(path) {
          ok(path);
        });
      });
    }
  };
  
  return File;

});