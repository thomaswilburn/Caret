define(function() {
  
  return {
    load: function(name, parentRequire, onload, config) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        var data = xhr.response;
        //strip out comments
        data = data.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
        data = JSON.parse(data);
        onload(data);
      };
      xhr.open("GET", name);
      xhr.send();
    }
  }
  
});