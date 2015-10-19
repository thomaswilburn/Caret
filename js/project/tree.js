define([
  "project/node",
  "command",
  "util/elementData",
  "util/i18n",
  "ui/contextMenus",
  "util/manos",
  "util/dom2"
], function(Node, command, elementData, i18n, context, M) {
  
  var directories = [];
  var pathMap = {};
  var container = document.find(".project");
  var tree = container.find(".tree");
  
  var setVisible = function() {
    if (directories.length) {
      container.addClass("show");
    } else {
      container.removeClass("show");
    }
  };
  
  var addDirectory = function() {
    chrome.fileSystem.chooseEntry({ type: "openDirectory" }, function(entry) {
      if (!entry) return;
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
        //after initial render, do the walk for path lookup
        root.walk(function(node, c) {
          pathMap[node.entry.fullPath] = node;
          //make sure the children are read and populated, then continue
          if (node.isDir) {
            node.readdir(c);
          } else c();
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
  
  var removeAll = function() {
    tree.innerHTML = "";
    directories = [];
    pathmap = {};
    setVisible();
  };
  
  //toggle directories, or open files directly
  tree.on("click", function(e) {
    var li = e.target.findUp("li");
    var node = elementData.get(li);
    if (!li || !node) return;
    e.preventDefault();
    if (e.target.hasClass("directory")) {
      node.toggle();
    } else {
      node.openFile();
    }
  });
  
  command.on("project:refresh-dir", function() {
    pathMap = {};
    directories.forEach(function(dir) {
      M.chain(
        dir.readdir.bind(dir),
        dir.render.bind(dir),
        function() { 
          dir.walk(function(node, c) {
            pathMap[node.entry.fullPath] = node;
            if (node.isDir) {
              node.readdir(c);
            } else c();
          });
        }
      );
    });
  });
  command.on("project:add-dir", addDirectory);
  command.on("project:open-file", function(path) {
    var node = pathMap[path];
    if (node) node.openFile();
  });
  command.on("project:remove-all", removeAll);
  
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
    clear: removeAll
  }
  
});