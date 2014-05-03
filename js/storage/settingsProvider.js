define([
    "storage/syncFS",
    "storage/syncfile",
    "command",
    "util/manos"
  ], function(sync, SyncFile, command, M) {

  var defaults = {};
  var local = {};
  var project = {};
  
  var clone = function(item) {
    var copy = function(value) {
      if (value instanceof Array) {
        return cloneArray(value);
      } else if (typeof value == "object") {
        return cloneObject(value);
      } else {
        return value;
      }
    };
    var cloneArray = function(a) {
      var n = [];
      for (var i = 0; i < a.length; i++) {
        n[i] = copy(a[i]);
      }
      return n;
    };
    var cloneObject = function(o) {
      var n = {};
      for (var key in o) {
        n[key] = copy(o[key]);
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
      var custom;
      try {
        custom = JSON.parse(local[name].replace(comments, ""));
      } catch (e) {
        //parse failed
        return original;
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
    },
    //load/get all requested settings via a promise
    pull: function() {
      var deferred = M.deferred();
      var names = [].slice.call(arguments);
      var pending = names.map(function(name) {
        return new Promise(function(ok) {
          Settings.load(name, ok);
        });
      });
      Promise.all(pending).then(function() {
        var collected = {};
        names.forEach(function(name) {
          collected[name] = Settings.get(name);
        });
        deferred.done(collected);
      });
      return deferred.promise();
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
  
  command.on("settings:emergency-reset", function() {
    //unlike the menu item, let's confirm it here in case someone fat-fingers the menu/palette
    chrome.notifications.clear("settings:emergency-reset-confirm", function() {
      chrome.notifications.create("settings:emergency-reset-confirm", {
        type: "basic",
        iconUrl: "icon-128.png",
        title: "Confirm Emergency Reset",
        message: "This will wipe out all your settings and return Caret to its initial condition. Are you sure you want to do this?",
        buttons: [
          { title: "Yes, reset all data" },
          { title: "Cancel emergency reset" }
        ]
      }, function() {});
    });
  });
  
  chrome.notifications.onButtonClicked.addListener(function(id, index) {
    if (id != "settings:emergency-reset-confirm") return;
    if (index !== 0) return;
    chrome.runtime.getBackgroundPage(function(page) {
      page.emergencyReset();
    });
  });

  return Settings;

});