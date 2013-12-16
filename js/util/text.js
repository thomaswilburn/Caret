define(function() {
  
  var cache = {};
  
  return {
    load: function(name, parentRequire, onLoad, config) {
      if (name in cache) {
        return onLoad(cache[name]);
      }
      
      var xhr = new XMLHttpRequest();
      xhr.open("GET", name);
      xhr.onload = xhr.onerror = function() {
        onLoad(xhr.responseText);
      }
      xhr.send();
    }
  };
  
});