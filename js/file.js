define(["manos"], function(M) {
  
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
      chrome.fileSystem.chooseEntry({
        type: modes[mode]
      }, function(entry) {
        //cancelling acts like an error, but isn't.
        if (!entry) return;
        self.entry = entry;
        c(null, self)
      });
    },
    read: function(c) {
      if (!this.entry) {
        console.error(this);
        c("File not opened", null);
      }
      var reader = new FileReader();
      reader.onload = function() {
        c(null, reader.result);
      };
      reader.onerror = function() {
        console.error("File read error!");
        c(err, null);
      };
      this.entry.file(function(f) {
        reader.readAsText(f);
      });
    },
    write: function(data, c) {
      var self = this;
      if (!this.entry) {
        //guard against cases where we accidentally write before opening
        self.open("save", function() {
          self.write(data, c);
        });
        return;
      }
      c = c || function() {};
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
                c("Couldn't open file as writable", self);
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
              c(err, self);
            }
            writer.onwriteend = function() {
              //after truncation, actually write the file
              writer.onwriteend = function() {
                c(null, self);
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
      if (this.entry) {
        return this.entry.file(function(f) {
          c(null, f);
        });
      }
      return c("No entry");
    },
    retain: function() {
      return chrome.fileSystem.retainEntry(this.entry);
    },
    restore: function(id, c) {
      var self = this;
      chrome.fileSystem.isRestorable(id, function(is) {
        if (is) {
          chrome.fileSystem.restoreEntry(id, function(entry) {
            if (!entry) return c("restoreEntry() failed for " + id, null);
            self.entry = entry;
            c(null, self);
          });
        } else {
          c("isRestorable() returned false for " + id, null);
        }
      });
    },
    getPath: function(c) {
      chrome.fileSystem.getDisplayPath(this.entry, c);
    }
  };
  
  return File;

});