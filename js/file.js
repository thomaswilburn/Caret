define(function() {
  
  /*
  
  Unfortunately, mimicking Node isn't really feasible given the Chrome OS security model, but we still don't want to deal with the annoying Chrome filesystem APIs. This module wraps those in a more usable File object.
    
  */
  
  var File = function() {
    this.entry = null;
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
        if (!entry) return;
        self.entry = entry;
        c(self)
      });
    },
    read: function(c) {
      var reader = new FileReader();
      reader.onload = function(data) {
        c(null, reader.result);
      };
      reader.onerror = function(err) {
        c(err, null);
      };
      this.entry.file(function(f) {
        reader.readAsText(f);
      });
    },
    write: function(data, c) {
      var self = this;
      c = c || function() {};
      this.entry.createWriter(function(writer) {
        writer.onerror = function(err) {
          console.error(err);
          c(err, self);
        }
        writer.onwriteend = function() {
          //after truncation, actually write the file
          writer.onwriteend = function() {
            c(null, self);
          }
          var blob = new Blob([data]);
          writer.write(blob);
        };
        writer.truncate(0);
      });
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
            self.entry = entry;
            c(null, self);
          });
        } else {
          c("Could not restore file");
        }
      });
    }
  };
  
  return File;

});