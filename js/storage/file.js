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
      var promise = new Promise(function(resolve, reject) {
        chrome.fileSystem.chooseEntry({
          type: modes[mode] || "open"
        }, function(entry) {
          //cancelling acts like an error, but isn't.
          if (!entry) return reject(chrome.runtime.lastError);
          self.entry = entry;
          resolve(self)
        });
      });
      if (c) M.pton(promise, c);
      return promise;
    },
    read: function(c) {
      var self = this;
      var promise = new Promise(function(resolve, reject) {
        if (!self.entry) {
          console.error(this);
          reject("File not opened");
        }
        var reader = new FileReader();
        reader.onload = function() {
          resolve(reader.result);
        };
        reader.onerror = function(err) {
          console.error("File read error!");
          reject(err);
        };
        self.entry.file(function(f) {
          reader.readAsText(f);
        });
      });
      if (c) M.pton(promise, c);
      return promise;
    },
    write: function(data, c) {
      var self = this;
      if (!self.entry) {
        //guard against cases where we accidentally write before opening
        return self.open("save").then(function() {
          return self.write(data, c);
        });
      }
      var promise = new Promise(function(resolve, reject) {
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
                  reject("Couldn't open file as writable");
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
                reject(err);
              }
              writer.onwriteend = function() {
                //after truncation, actually write the file
                writer.onwriteend = function() {
                  resolve(self);
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
      if (c) M.pton(promise, c);
      return promise;
    },
    stat: function(c) {
      var self = this;
      var promise = new Promise(function(resolve, reject) {
        if (self.entry) {
          return self.entry.file(function(f) {
            resolve(f);
          });
        }
        reject("No file entry");
      });
      if (c) M.pton(promise, c);
      return promise;
    },
    retain: function() {
      return chrome.fileSystem.retainEntry(this.entry);
    },
    restore: function(id, c) {
      var self = this;
      var promise = new Promise(function(resolve, reject) {
        chrome.fileSystem.isRestorable(id, function(is) {
          if (is) {
            chrome.fileSystem.restoreEntry(id, function(entry) {
              if (!entry) return reject("restoreEntry() failed for " + id);
              self.entry = entry;
              resolve(self);
            });
          } else {
            reject("isRestorable() returned false for " + id);
          }
        });
      });
      if (c) M.pton(promise, c);
      return promise;
    },
    getPath: function(c) {
      var self = this;
      var promise = new Promise(function(resolve, reject) {
        chrome.fileSystem.getDisplayPath(this.entry, resolve);
      });
      if (c) M.pton(c);
      return promise;
    }
  };
  
  return File;

});