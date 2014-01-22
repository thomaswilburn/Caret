define(["util/inflate"], function(inflate) {

  /*

  A plugin that pre-loads templates into the util/inflate cache, then passes
  it through (similar to how the settings! plugin works).

  */

  return {
    load: function(name, parentRequire, onLoad, config) {
      var files = name.split(",");
      var pending = files.map(inflate.load);
      Promise.all(pending).then(function() {
        onLoad(inflate);
      });
    }
  }

});