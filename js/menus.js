define([
  "settings!menus,keys",
  "editor",
  "dialog",
  "command",
  "dom2"
  ], function(Settings, editor, dialog, command) {
  
  var commands = editor.commands.commands;
  
  var walker = function(list, depth) {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < list.length; i++) {
      var entry = list[i];
      if (typeof entry == "string") {
        var preset;
        switch (entry) {
          case "divider":
            preset = document.createElement("hr");
            break;
        }
        fragment.appendChild(preset);
        continue;
      }
      var li = document.createElement("li");
      li.innerHTML = entry.label;
      if (entry.command) {
        li.setAttribute("command", entry.command);
        var shortcut = findKeyCombo(entry.command == "ace:command" ? entry.argument : entry.command);
        if (shortcut) {
          li.innerHTML += "<span class=shortcut>" + shortcut + "</span>";
        }
        if (entry.argument) li.setAttribute("argument", entry.argument);
      }
      if (entry.sub) {
        if (depth) {
          li.className = "parent";
        } else {
          li.className = "top";
        }
        var ul = document.createElement("ul");
        ul.className = "menu";
        ul.appendChild(walker(entry.sub, depth + 1));
        li.appendChild(ul);
      }
      fragment.appendChild(li);
    }
    return fragment;
  };
  
  var findKeyCombo = function(command) {
    var keys = Settings.get("keys");
    //check key config
    for (var key in keys) {
      var action = keys[key];
      var verb = action.ace || action.command || action;
      if (verb == command) {
        var char = key.split("-").pop();
        if (/[A-Z]$/.test(char)) {
          char = "Shift-" + char.toUpperCase();
        } else {
          char = char[0].toUpperCase() + char.substr(1);
        }
        var prefix = "";
        if (key.indexOf("^") > -1) {
          prefix += "Ctrl-";
        }
        if (key.indexOf("M-") > -1) {
          prefix += "Alt-";
        }
        return prefix + char;
      }
    }
    for (var cmd in editor.commands.commands) {
      if (cmd == command && editor.commands.commands[cmd].bindKey.win) {
        return editor.commands.commands[cmd].bindKey.win.split("|").shift();
      }
    }
    return false;
  };
  
  var Menu = function() {
    this.element = document.find(".toolbar");
    this.active = false;
    this.bindEvents();
  }
  Menu.prototype = {
    create: function() {
      var cfg = Settings.get("menus");
      var elements = walker(cfg, 0);
      this.element.innerHTML = "";
      this.element.appendChild(elements);
    },
    bindEvents: function() {
      var self = this;
      var menubar = this.element;
      menubar.addEventListener("click", function(e) {
        menubar.focus();
        var el = e.target;
        if (el.classList.contains("top")) {
          el.classList.toggle("active");
          self.active = !self.active;
        } else {
          self.active = false;
        }
        menubar
          .findAll(".active")
          .filter(function(n) { return n != el })
          .forEach(function(n) { n.classList.remove("active") });
      });
      menubar.addEventListener("mousemove", function(e) {
        var el = e.target;
        if (el.classList.contains("top") && self.active) {
          self.deactivate();
          el.classList.add("active");
        }
      });
    },
    deactivate: function() {
      this.element.findAll(".active").forEach(function(node) { node.classList.remove("active") });
    }
  };
  
  var menu = new Menu();
  
  command.on("init:startup", menu.create.bind(menu));
  command.on("init:restart", menu.create.bind(menu));

  editor.on("focus", menu.deactivate.bind(menu));

  command.on("app:about", function() {
    var content = document.find("#about").content.cloneNode(true).find("div").innerHTML;
    var manifest = chrome.runtime.getManifest();
    content = content.replace("%VERSION%", manifest.version);
    dialog(
      content,
      ["ok"]
    );
  });
  
});