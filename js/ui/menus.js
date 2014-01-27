define([
    "settings!menus,keys",
    "editor",
    "ui/dialog",
    "command",
    "util/template!templates/menuItem.html",
    "util/dom2"
  ], function(Settings, editor, dialog, command, inflate) {
  
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
        fragment.append(preset);
        continue;
      }
      if (entry.minVersion && entry.minVersion > chrome.version) {
        continue;
      }
      var isAce = entry.command == "ace:command";
      var data = {
        command: entry.command,
        argument: entry.argument,
        shortcut: isAce ? findKeyCombo(entry.argument) : findKeyCombo(entry.command, entry.argument),
        hasChildren: entry.sub && !!entry.sub.length,
        isRoot: !depth,
        retainFocus: entry.retainFocus,
        label: entry.label
      };
      var element = inflate.get("templates/menuItem.html", data);
      if (entry.sub) {
        var children = walker(entry.sub, depth + 1);
        element.find("ul").append(children);
      }
      fragment.append(element);
    }
    return fragment;
  };
  
  var findKeyCombo = function(command, arg) {
    var keys = Settings.get("keys");
    //check key config
    for (var key in keys) {
      var action = keys[key];
      var verb = action.ace || action.command || action;
      var object = action.argument;
      if (verb == command) {
        if (arg && object !== arg) continue;
        //transform old keys and lower-case
        key = key
          //back-compat
          .replace(/(\^|M)-([A-Z]+)$/, "$1-Shift-$2")
          .replace(/\^-/g, "Ctrl-")
          .replace(/M-/g, "Alt-")
          //capitalize keys for lazy people
          .replace(/(^|-)([a-z])/g, function(match) { return match.toUpperCase(); });
        return key;
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
  };
  Menu.prototype = {
    create: function() {
      var cfg = Settings.get("menus");
      var elements = walker(cfg, 0);
      this.element.innerHTML = "";
      this.element.append(elements);
    },
    bindEvents: function() {
      var self = this;
      var menubar = this.element;
      var clickElsewhere = function(e) {
        if (e.target.matches(".toolbar *")) return;
        self.deactivate();
        self.active = false;
        document.body.off("click", clickElsewhere);
      };
      menubar.addEventListener("click", function(e) {
        document.body.on("click", clickElsewhere);
        var el = e.target;
        if (el.hasClass("top")) {
          el.toggle("active");
          self.active = !self.active;
        } else {
          self.active = false;
        }
        if (!self.active && !el.hasClass("no-refocus")) {
          editor.focus();
        }
        menubar
          .findAll(".active")
          .filter(function(n) { return n != el })
          .forEach(function(n) { n.removeClass("active") });
      });
      menubar.addEventListener("mousemove", function(e) {
        var el = e.target;
        if (el.hasClass("top") && self.active) {
          self.deactivate();
          el.addClass("active");
        }
      });
    },
    deactivate: function() {
      this.element.findAll(".active").forEach(function(node) { node.removeClass("active") });
    }
  };
  
  var menu = new Menu();
  
  command.on("init:startup", menu.create.bind(menu));
  command.on("init:restart", menu.create.bind(menu));

  command.on("app:about", function() {
    inflate.load("templates/about.html").then(function() {
      dialog(
        inflate.getHTML("templates/about.html", {
          version: chrome.runtime.getManifest().version
        }),
        ["ok"]
      );
    });
  });
  
});