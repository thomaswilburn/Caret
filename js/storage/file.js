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
      mode = mode || "open";
      //mode is "open" or "save"
      var modes = {
        "open": "openWritableFile",
        "save": "saveFile"
      };
      var deferred = M.deferred();
      
      chrome.fileSystem.chooseEntry({
        type: modes[mode]
      }, function(entry) {
        //cancelling acts like an error, but isn't.
        if (!entry) return deferred.fail(chrome.runtime.lastError);
        self.entry = entry;
        deferred.done(self)
      });
      
      return deferred.promise();
    },
    
    read: function() {
      var self = this;
      var deferred = M.deferred();
      
      if (!self.entry) {
        console.error(self);
        deferred.fail("File not opened");
      }
      var reader = new FileReader();
      reader.onload = function() {
        deferred.done(reader.result);
      };
      reader.onerror = function(err) {
        console.error("File read error!");
        deferred.fail(err);
      };
      self.entry.file(function(f) {
        reader.readAsText(f);
      });
      
      return deferred.promise();
    },
    
    write: function(data) {
      var self = this;
      if (!self.entry) {
        //guard against cases where we accidentally write before opening
        return self.open("save").then(function() {
          return self.write(data, c);
        });
      }
      
      var deferred = M.deferred();
      
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
                deferred.fail("Couldn't open file as writable");
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
              deferred.fail(err);
            }
            writer.onwriteend = function() {
              //after truncation, actually write the file
              writer.onwriteend = function() {
                deferred.done();
                self.onWrite();
              }
              var blob = new Blob([data]);
              writer.write(blob);
            };
            writer.truncate(0);
          });
        }
      );
      
      return deferred.promise();
    },
    
    stat: function() {
      var self = this;
      var promise = new Promise(function(ok, fail) {
        if (self.entry) {
          return self.entry.file(function(f) {
            ok(f);
          });
        }
        fail("No file entry");
      });
      return promise;
    },
    
    retain: function() {
      return chrome.fileSystem.retainEntry(this.entry);
    },
    
    restore: function(id) {
      var self = this;
      var deferred = M.deferred();
      
      chrome.fileSystem.isRestorable(id, function(is) {
        if (is) {
          chrome.fileSystem.restoreEntry(id, function(entry) {
            if (!entry) return deferred.fail("restoreEntry() failed for " + id);
            self.entry = entry;
            deferred.done();
          });
        } else {
          deferred.fail("isRestorable() returned false for " + id);
        }
      });
      
      return deferred.promise();
    },
    
    getPath: function() {
      var self = this;
      var promise = new Promise(function(ok, fail) {
        if (!self.entry) return fail("No backing entry, cannot get path")
        chrome.fileSystem.getDisplayPath(self.entry, ok);
      });
      return promise;
    }
  };
  
  return File;

});