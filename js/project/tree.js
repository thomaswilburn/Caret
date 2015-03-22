define([
  "project/node",
  "command",
  "util/elementData",
  "util/dom2"],
function(Node, command, elementData) {
  
  var directories = [];
  var container = document.find(".project");
  container.addClass("show");
  var tree = container.find(".tree");
  
  command.on("project:add-dir", function() {
    chrome.fileSystem.chooseEntry({ type: "openDirectory" }, function(entry) {
      var root = new Node(entry);
      directories.push(root);
      var element = document.createElement("ul");
      var rootElement = document.createElement("li");
      tree.append(element);
      element.append(rootElement);
      root.setElement(rootElement);
      root.isOpen = true;
      root.render();
      
    })
  });
  
  tree.on("click", function(e) {
    if (e.target.hasClass("directory")) {
      var li = e.target.findUp("li");
      var node = elementData.get(li);
      node.toggle();
    }
  });
  
  /* commands to handle:
  project:refresh-dir
  project:add-dir
  project:remove-all
  project:open-file
  */
  
  return {
    getPaths: function() { return [] },
    getDirectories: function() { return directories },
    insertDirectory: function() {},
    clear: function() {}
  }
  
});