define([
  "project/node",
  "command",
  "util/dom2"],
function(Node, command) {
  
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
      root.element = rootElement;
      root.isOpen = true;
      root.render();
      
    })
  });
  
});