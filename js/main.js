require(["editor", "file"], function(editor, File) {
  
  var f = new File();
  f.open(function(file) {
    f.read(function(err, data) {
      editor.getSession().setValue(data);
    });
  });
  
});