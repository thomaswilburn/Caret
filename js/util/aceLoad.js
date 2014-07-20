define(function() {
  return {
    load: function(name, parentRequire, onLoad, config) {
      ace.require("ace/lib/net").loadScript(name, function() {
        onLoad();
      });
    }
  }
});