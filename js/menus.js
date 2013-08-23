define(["json!config/menus.json","dom2"], function(cfg) {
  
  var menubar = document.querySelector(".toolbar");
  
  var walker = function(list) {
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
        var ul = document.createElement("ul");
        ul.className = "menu";
        ul.appendChild(walker(entry.sub));
        li.appendChild(ul);
      }
      fragment.appendChild(li);
    }
    return fragment;
  }
  
  var menuElements = walker(cfg);
  menubar.innerHTML = "";
  menubar.appendChild(menuElements);
  
});