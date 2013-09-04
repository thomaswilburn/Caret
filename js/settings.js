define(["command"], function(command) {

  var defaults = {};
  var local = {};
  
  var SyncFile = function(name, c) {
    this.entry = {};
    if (name) {
      this.open(name, c);
    }
  };
  SyncFile.prototype = {
    name: "",
    open: function(name, c) {
      this.name = name;
      this.entry.name = name;
      if (c) {
        c(this);
      }
    },
    read: function(c) {
      var name = this.name;
      chrome.storage.sync.get(this.name, function(data) {
        c(null, data[name]);
      });
    },
    write: function(content, c) {
      var data = {};
      data[this.name] = content;
      var self = this;
      chrome.storage.sync.set(data, function() {
        command.fire("settings:change-local");
        if (c) c(null, self);
      });
    },
    retain: function() { return false; }
  };

  var Settings = {
    get: function(name) {
      if (!name) {
        return local;
      }
      name = name + ".json";
      return local[name];
    },
    getAsFile: function(name) {
      return new SyncFile(name + ".json");
    },
    load: function(name, c) {
      name = name + ".json";
      if (local[name] || defaults[name]) {
        return c();
      }
      
      var onload = function() {
        var raw = this.responseText.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
        defaults[name] = JSON.parse(raw);
        chrome.storage.sync.get(name, function(data) {
          if (data[name]) {
            try {
              local[name] = JSON.parse(data[name]);
            } catch (e) {
              local[name] = defaults[name];
            }
          } else {
            local[name] = defaults[name];
          }
          c();
        });
      };
      
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "config/" + name);
      xhr.onload = onload;
      xhr.send();
    }
  };

  command.on("settings:delete-local", function(key) {
    key += ".json";
    local[key] = defaults[key];
    chrome.storage.sync.remove(key);
  });

  command.on("settings:change-local", function() {
    //reload anything that's been used
    var keys = Object.keys(defaults).map(function(n) { return n.replace(".json", "")});
    local = {};
    defaults = {};
    var completed = 0;
    keys.forEach(function(key) {
      Settings.load(key, function() {
        completed++;
        if (completed == keys.length) {
          command.fire("init:restart");
        }
      });
    });
  });
  
  return {
    load: function(name, parentRequire, onLoad, config) {
      var files = name.split(",");
      var completed = 0;
      
      files.forEach(function(file) {
        Settings.load(file, function() {
          completed++;
          if (completed == files.length) {
            onLoad(Settings);
          }
        })
      });
    }
  }

});