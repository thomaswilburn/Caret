define([
    "storage/syncFS",
    "storage/syncfile",
    "command",
    "util/manos",
    "util/chromePromise"
  ], function(sync, SyncFile, command, M, chromeP) {

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
    loadDefault: function(name) {
      if (defaults[name]) return defaults[name];
      return new Promise(function(ok) {
        require(["util/text!config/" + name], function(raw) {
          defaults[name] = raw;
          ok();
        });
      });
    },
    load: function(name) {
      name = name + ".json";
      if (local[name]) {
        return local[name];
      }

      var self = this;
      if (!pending[name]) pending[name] = new Promise(async function(ok) {
        await self.loadDefault(name);
        var data = await sync.get(name);
        if (data) {
          local[name] = data;
        } else {
          local[name] = defaults[name];
        }
        ok();
        delete pending[name];
      });
        
      return pending[name];
      
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
    pull: async function(...names) {
      var pending = names.map(n => Settings.load(n));
      await Promise.all(pending);
      var collected = {};
      names.forEach(function(name) {
        collected[name] = Settings.get(name);
      });
      return collected;
    }
  };

  command.on("settings:delete-local", function(key) {
    key += ".json";
    local[key] = defaults[key];
    sync.remove(key);
    command.fire("init:restart");
  });

  command.on("settings:change-local", async function() {
    //reload anything that's been used
    var keys = Object.keys(defaults).map(n => n.replace(".json", ""));
    local = {};
    var completed = keys.map(k => Settings.load(k));
    await Promise.all(completed);
    command.fire("init:restart");
  });
  
  command.on("settings:emergency-reset", async function() {
    //unlike the menu item, let's confirm it here in case someone fat-fingers the menu/palette
    await chromeP.notifications.clear("settings:emergency-reset-confirm");
    await chrome.notifications.create("settings:emergency-reset-confirm", {
      type: "basic",
      iconUrl: "icon-128.png",
      title: "Confirm Emergency Reset",
      message: "This will wipe out all your settings and return Caret to its initial condition. Are you sure you want to do this?",
      buttons: [
        { title: "Yes, reset all data" },
        { title: "Cancel emergency reset" }
      ]
    });
  });
  
  chrome.notifications.onButtonClicked.addListener(async function(id, index) {
    if (id != "settings:emergency-reset-confirm") return;
    if (index !== 0) return;
    await chromeP.notifications.clear("settings:emergency-reset-confirm");
    var page = await chromeP.runtime.getBackgroundPage();
    page.emergencyReset();
  });

  return Settings;

});