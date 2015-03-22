define([
  "project/node",
  "command",
  "util/elementData",
  "util/i18n",
  "ui/contextMenus",
  "util/dom2"
], function(Node, command, elementData, i18n, context) {
  
  var directories = [];
  var pathMap = {};
  var container = document.find(".project");
  container.addClass("show");
  var tree = container.find(".tree");
  
  var setVisible = function() {
    if (this.directories.length) {
      container.addClass("show");
    } else {
      container.removeClass("show");
    }
  };
  
  var addDirectory = function() {
    chrome.fileSystem.chooseEntry({ type: "openDirectory" }, function(entry) {
      var root = new Node(entry);
      directories.push(root);
      var element = document.createElement("ul");
      var rootElement = document.createElement("li");
      tree.append(element);
      element.append(rootElement);
      root.setElement(rootElement);
      root.isOpen = true;
      root.isRoot = true;
      root.render(function() {
        root.walk(function(node) {
          pathMap[node.entry.fullPath] = node;
        });
      });
      setVisible();
    });
  };
  
  var removeDirectory = function(id) {
    directories = directories.filter(function(node) {
      if (node.id == id) {
        node.element.remove();
        return false;
      }
      return true;
    });
    setVisible();
  };
  
  tree.on("click", function(e) {
    var li = e.target.findUp("li");
    var node = elementData.get(li);
    if (!li || !node) return;
    if (e.target.hasClass("directory")) {
      node.toggle();
    } else {
      node.openFile();
    }
  });
  
  /* commands to handle:
  project:refresh-dir
  project:add-dir
  project:remove-all
  project:open-file (for the palette)
  */
  
  command.on("project:add-dir", addDirectory);
  command.on("project:open-file", function(path) {
    var node = pathMap[path];
    if (node) node.openFile();
  });
  
  context.register(
    i18n.get("projectRemoveDirectory"),
    "removeDirectory",
    "root/directory/:id",
    function(args) {
      removeDirectory(args.id);
    }
  );
  
  return {
    getPaths: function() { return Object.keys(pathMap) },
    getDirectories: function() { return directories },
    insertDirectory: addDirectory,
    clear: function() {
      tree.innerHTML = "";
      directories = [];
      pathmap = {};
      setVisible();
    }
  }
  
});