define([
  "util/manos",
  "util/elementData",
  "sessions",
  "storage/file",
  "util/template!templates/projectDir.html,templates/projectFile.html",
  "ui/contextMenus",
  "util/dom2"
], function(M, elementData, sessions, File, inflate, context) {
  
  //TODO: create a promise for when the directory is ready
  //TODO: move rendering out into a separate NodeView
  
  var noop = function() {};
  var guid = 0;
  
  var Node = function(entry) {
    this.entry = entry;
    this.name = entry.name
    this.isDirty = true;
    this.isDir = entry.isDirectory;
    this.children = [];
    this.id = guid++;
  };
  
  Node.prototype = {
    id: null,
    entry: null,
    isOpen: false,
    isDirty: false,
    isDir: false,
    isRoot: false,
    path: null,
    name: null,
    parent: null,
    children: null,
    element: null,
    toggle: function(done) {
      this.isOpen = !this.isOpen;
      this.render(done);
    },
    setElement: function(element) {
      this.element = element;
      elementData.set(element, this);
    },
    render: function(done) {
      var self = this;
      done = done || noop;
      if (!this.element) return done();
      //render the label
      var template;
      var menu;
      if (this.isDir) {
        template = "templates/projectDir.html";
        menu = context.makeURL(this.isRoot ? "root/directory" : "directory", this.id);
      } else {
        template = "templates/projectFile.html";
        menu = context.makeURL("file", this.entry.fullPath.replace(/[\/\\]/g, "@"));
      }
      var a = this.element.find("a.label");
      if (!a) {
        a = document.createElement("a");
        this.element.append(a);
      }
      a.outerHTML = inflate.getHTML(template, {
        label: this.name,
        path: this.entry.fullPath,
        contextMenu: menu
      });
      if (!this.isOpen) {
        this.element.removeClass("expanded");
        return done();
      }
      //only render children if open
      this.element.addClass("expanded");
      if (this.isDirty && this.isDir) {
        this.readdir(function() {
          self.renderChildren(function() {
            done();
          });
        });
      } else {
        this.renderChildren(done);
      }
    },
    renderChildren: function(done) {
      var ul = this.element.find("ul.children");
      if (!ul) {
        ul = document.createElement("ul");
        ul.className = "children";
        this.element.append(ul);
      }
      M.map(this.children, function(item, i, c) {
        if (!item.element) {
          var li = document.createElement("li");
          item.setElement(li);
          ul.append(li);
        }
        item.render(c);
      }, done)
    },
    readdir: function(done) {
      //TODO: track entries, compare to existing, do not duplicate
      var self = this;
      var reader = this.entry.createReader();
      var entries = [];
      var collect = function(list) {
        if (!list.length) return complete();
        entries.push.apply(entries, list);
        reader.readEntries(collect);
      };
      var complete = function() {
        M.map(entries, function(entry, i, c) {
          var node = new Node(entry);
          if (node.isDir) {
            return node.readdir(function() {
              c(node);
            });
          }
          return c(node);
        }, function(children) {
          self.children = children;
          self.isDirty = false;
          done();
        });
      };
      reader.readEntries(collect);
      
    },
    walk: function(f, done) {
      M.map(this.children, function(node, i, c) {
        f(node);
        node.walk(f, c);
      }, done);
    },
    openFile: function() {
      var self = this;
      var tabs = sessions.getAllTabs();
      var found = false;
      chrome.fileSystem.getDisplayPath(this.entry, function(path) {
        //look through the tabs for matching display paths
        M.map(
          tabs,
          function(tab, i, c) {
            if (!tab.file || tab.file.virtual) {
              return c(false);
            }
            tab.file.getPath(function(err, p) {
              if (p == path) {
                sessions.setCurrent(tab);
                found = true;
              }
              //we don't actually use the result
              c();
            });
          },
          //if no match found, create a tab
          function() {
            if (found) return;
            var file = new File(self.entry);
            file.read(function(err, data) {
              sessions.addFile(data, file);
            });
          }
        );
      });
    }
  };
  
  return Node;
  
});