define([
    "command",
    "storage/settingsProvider",
  ], function(command, Settings) {
    
  /* A plugin that handles loading Settings "synchronously" */
  
  return {
    load: function(name, parentRequire, onLoad, config) {
      if (name.length === 0) {
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
        });
      });
    }
  };

});