define([
  "command",
  "sessions/addRemove",
  "ui/projectManager",
  "storage/file"
], function(command, addRemove, projectManager, File) {
  
    command.on("session:open-dragdrop", function(items) {
    [].forEach.call(items, function(entry){
      //only process files
      if (entry.kind !== "file") return;
      entry = entry.webkitGetAsEntry();

      //files get opened in a tab
      if (entry.isFile) {
        var f = new File(entry);
        return f.read(function(err, data) {
          addRemove.add(data, f);
        });
      //directories get added to project
      } else if (entry.isDirectory) {
        projectManager.insertDirectory(entry);
      }
    });
  });

  document.body.on("dragover", function(e) {
    e.preventDefault();
  });

  document.body.on("drop", function(e) {
    e.preventDefault();
    if (e.dataTransfer.types.indexOf("Files") === -1) return;
    command.fire("session:open-dragdrop", e.dataTransfer.items);
  });
  
});