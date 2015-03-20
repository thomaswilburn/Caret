define(["util/manos", "util/dom2"], function(M) {
  
  var noop = function() {};
  
  var Node = function(entry) {
    this.entry = entry;
    this.name = entry.name
    this.isOpen = true;
    this.isDirty = true;
    this.isDir = entry.isDirectory;
    this.children = [];
  };
  
  Node.prototype = {
    entry: null,
    isOpen: false,
    isDirty: false,
    isDir: false,
    path: null,
    name: null,
    parent: null,
    children: null,
    element: null,
    toggle: function(done) {
      
    },
    render: function(done) {
      var self = this;
      done = done || noop;
      if (!this.element) return done();
      var a = this.element.find("a.label");
      if (!a) {
        a = document.createElement("a");
        a.className = "label";
        this.element.append(a);
      }
      a.innerHTML = this.name;
      if (!this.isOpen) return done();
      if (this.isDirty && this.isDir) {
        this.readdir(function() {
          self.renderChildren(done);
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
          item.element = li;
          ul.append(li);
        }
        item.render();
      }, done)
    },
    readdir: function(done) {
      var self = this;
      var reader = this.entry.createReader();
      var entries = [];
      var collect = function(list) {
        if (!list.length) return complete();
        entries.push.apply(entries, list);
        reader.readEntries(collect);
      };
      var complete = function() {
        self.children = entries.map(function(entry) {
          return new Node(entry);
        });
        done();
      };
      reader.readEntries(collect);
      
    }
  };
  
  return Node;
  
});