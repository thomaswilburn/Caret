define(function() {
  
  var cache = {};
  var directory = null;
  
  return {
    load: function(name, parentRequire, onLoad, config) {
      if (name in cache) {
        return onLoad(cache[name]);
      }
      
      var getFile = function() {
        directory.getFile(name, {create: false}, function(entry) {
          entry.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function() {
              cache[name] = reader.result;
              onLoad(reader.result);
            };
            reader.readAsText(file);
          });
        });
      };

      if (directory) return getFile();
      chrome.runtime.getPackageDirectoryEntry(function(dir) {
        directory = dir;
        getFile();
      });
    }
  };
  
});