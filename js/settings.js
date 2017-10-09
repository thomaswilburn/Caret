define([
    "command",
    "storage/settingsProvider",
  ], function(command, Settings) {
    
  /* A plugin that handles loading Settings "synchronously" */
  
  return {
    load: async function(name, parentRequire, onLoad, config) {
      if (name.length == 0) {
        return onLoad(Settings);
      }
      
      var files = name.split(",");
      var completed = 0;
      
      var completed = files.map(f => Settings.load(f));
      await Promise.all(completed);
      onLoad(Settings);
    }
  };

});