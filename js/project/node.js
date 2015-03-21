define(["util/manos", "util/elementData", "util/dom2"], function(M, elementData) {
  
  var noop = function() {};
  
  var Node = function(entry) {
    this.entry = entry;
    this.name = entry.name
    this.isOpen = false;
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
      var a = this.element.find("a.label");
      if (!a) {
        a = document.createElement("a");
        if (this.isDir) a.className = "directory";
        a.addClass("label");
        this.element.append(a);
      }
      a.innerHTML = this.name;
      if (!this.isOpen) {
        this.element.removeClass("expanded");
        return done();
      }
      this.element.addClass("expanded");
      if (this.isDirty && this.isDir) {
        this.readdir(function() {
          self.renderChildren(function() {
            self.isDirty = false;
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