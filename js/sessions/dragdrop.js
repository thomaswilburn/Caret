define([
  "command",
  "sessions/addRemove",
  "ui/projectManager",
  "storage/file"
], function(command, addRemove, projectManager, File) {
  
    command.on("session:open-dragdrop", function(items) {
    [].forEach.call(items, async function(entry){
      //only process files
      if (entry.kind !== "file") return;
      entry = entry.webkitGetAsEntry();

      //files get opened in a tab
      if (entry.isFile) {
        var f = new File(entry);
        var data = await f.read();
        addRemove.add(data, f);
      //directories get added to project
      } else if (entry.isDirectory) {
        projectManager.insertDirectory(entry);
      }
    });
  });

  document.body.addEventListener("dragover", function(e) {
    e.preventDefault();
  });

  document.body.addEventListener("drop", function(e) {
    e.preventDefault();
    if (e.dataTransfer.types.indexOf("Files") === -1) return;
    command.fire("session:open-dragdrop", e.dataTransfer.items);
  });
  
});