define([
    "util/manos"
  ], function(M) {
  
  /*
  
  Unfortunately, mimicking Node isn't really feasible given the Chrome OS security model, but we still don't want to deal with the annoying Chrome filesystem APIs. This module wraps those in a more usable File object.
    
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
      var deferred = M.deferred();
      
      chrome.fileSystem.chooseEntry({
        type: modes[mode] || "open"
      }, function(entry) {
        //cancelling acts like an error, but isn't.
        if (!entry) return deferred.fail(chrome.runtime.lastError);
        self.entry = entry;
        deferred.done(self)
      });
    
      if (c) M.pton(deferred, c);
      return deferred.promise();
    },
    
    read: function(c) {
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
      
      if (c && typeof c == "function") M.pton(deferred, c);
      return deferred.promise();
    },
    
    write: function(data, c) {
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
      
      if (c) M.pton(deferred, c);
      return deferred.promise();
    },
    
    stat: function(c) {
      var self = this;
      var promise = new Promise(function(ok, fail) {
        if (self.entry) {
          return self.entry.file(function(f) {
            ok(f);
          });
        }
        fail("No file entry");
      });
      if (c) M.pton(promise, c);
      return promise;
    },
    
    retain: function() {
      return chrome.fileSystem.retainEntry(this.entry);
    },
    
    restore: function(id, c) {
      var self = this;
      var deferred = M.deferred();
      
      chrome.fileSystem.isRestorable(id, function(is) {
        if (is) {
          chrome.fileSystem.restoreEntry(id, function(entry) {
            if (!entry) return fail("restoreEntry() failed for " + id);
            self.entry = entry;
            deferred.done();
          });
        } else {
          deferred.fail("isRestorable() returned false for " + id);
        }
      });
      
      if (c) M.pton(deferred, c);
      return deferred.promise();
    },
    
    getPath: function(c) {
      var self = this;
      var promise = new Promise(function(ok, fail) {
        chrome.fileSystem.getDisplayPath(this.entry, ok);
      });
      if (c) M.pton(promise, c);
      return promise;
    }
  };
  
  return File;

});