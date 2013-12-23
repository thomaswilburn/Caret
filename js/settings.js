define([
    "command",
    "storage/syncFS",
    "storage/syncfile"
  ], function(command, sync, SyncFile) {

  var defaults = {};
  var local = {};
  var project = {};
  
  var clone = function(item) {
    var cloneArray = function(a) {
      var n = [];
      for (var i = 0; i < a.length; i++) {
        if (a[i] instanceof Array) {
          n[i] = cloneArray(a[i]);
        } else if (typeof a[i] == "object") {
          n[i] = cloneObject(a[i]);
        } else {
          n[i] = a[i];
        }
      }
      return n;
    };
    var cloneObject = function(o) {
      var n = {};
      for (var key in o) {
        if (o[key] instanceof Array) {
          n[key] = cloneArray(o[key]);
        } else if (typeof o[key] == "object") {
          n[key] = cloneObject(o[key]);
        } else {
          n[key] = o[key];
        }
      }
      return n;
    };
    if (item instanceof Array) {
      return cloneArray(item);
    }
    return cloneObject(item);
  };
  
  //track transfers to prevent multiple requests
  var pending = {};

  var Settings = {
    get: function(name) {
      name = name + ".json";
      var comments = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
      var original = clone(JSON.parse(defaults[name].replace(comments, "")));
      var custom = {};
      try {
        custom = JSON.parse(local[name].replace(comments, ""));
      } catch (e) {
        //parse failed
      }
      //flat arrays (like menus.json) just get returned, not merged
      if (custom && custom instanceof Array) {
        return custom;
      }
      for (var key in custom) {
        original[key] = custom[key];
      }
      //override settings with project settings
      for (var key in project) {
        original[key] = project[key];
      }
      return original;
    },
    getAsString: function(name, original) {
      name = name + ".json";
      if (original) {
        return defaults[name];
      }
      return local[name] || defaults[name];
    },
    getAsFile: function(name) {
      return new SyncFile(name + ".json");
    },
    load: function(name, c) {
      name = name + ".json";
      if (local[name]) {
        return c();
      }
      
      //if a request is out, tag along with it
      if (pending[name]) {
        pending[name].push(c);
        return;
      }
      
      var merge = function() {
        sync.get(name).then(function(data) {
          if (data) {
            local[name] = data;
          } else {
            local[name] = defaults[name];
          }
          for (var i = 0; i < pending[name].length; i++) {
            pending[name][i]();
          }
          delete pending[name]
        });
      };
      
      pending[name] = [c]
      
      if (defaults[name]) {
        return merge();
      }
      
      require(["util/text!config/" + name], function(raw) {
        defaults[name] = raw;
        merge();
      });
    },
    setProject: function(settings) {
      project = settings;
      command.fire("settings:change-local");
    },
    clearProject: function() {
      project = {};
      command.fire("settings:change-local");
    }
  };

  command.on("settings:delete-local", function(key) {
    key += ".json";
    local[key] = defaults[key];
    sync.remove(key);
    command.fire("init:restart");
  });

  command.on("settings:change-local", function() {
    //reload anything that's been used
    var keys = Object.keys(defaults).map(function(n) { return n.replace(".json", "")});
    local = {};
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
      if (name.length == 0) {
        return onLoad(Settings);
      }
      
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