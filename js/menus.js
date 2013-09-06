define([
  "settings!menus",
  "editor",
  "dialog",
  "command",
  "dom2"
  ], function(Settings, editor, dialog, command) {
  
  var cfg = Settings.get("menus");
  
  var menubar = document.find(".toolbar");
  
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
      if (entry.command) li.setAttribute("command", entry.command);
      if (entry.argument) li.setAttribute("argument", entry.argument);
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
  }
  
  var menuElements = walker(cfg, 0);
  menubar.innerHTML = "";
  menubar.appendChild(menuElements);

  menubar.addEventListener("click", function(e) {
    menubar.focus();
    var el = e.target;
    if (el.classList.contains("top")) {
      el.classList.toggle("active");
    }
    menubar
      .findAll(".active")
      .filter(function(n) { return n != el })
      .forEach(function(n) { n.classList.remove("active") });
  });

  editor.on("focus", function(e) {
    menubar.findAll(".active").forEach(function(node) { node.classList.remove("active"); });
  });

  command.on("app:about", function() {
    dialog(
      document.find("#about").content.cloneNode(true).find("div").innerHTML,
      ["ok"]
    );
  })
  
});