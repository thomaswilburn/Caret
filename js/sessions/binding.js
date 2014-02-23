define([
    "command",
    "sessions/state",
    "util/dom2"
  ], function(command, state) {

  var enableTabDragDrop = function() {
    var tabContainer = document.find(".tabs");
    var draggedTab = null;
    tabContainer.on("dragstart", function(e) {
      if (!e.target.matches(".tab")) return;
      e.target.style.opacity = .4;
      setTimeout(function() {
        e.target.addClass("dragging");
      }, 50);
      e.dataTransfer.setDragImage(e.target, 0, 0);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.clearData("text/plain");
      e.dataTransfer.clearData("text/uri-list");
      e.dataTransfer.setData("application/x-tab-id", e.target.getAttribute("tab-id"));
      draggedTab = e.target;
      draggedTab.ondragend = function() {
        draggedTab = null;
        e.target.style.opacity = null;
        e.target.removeClass("dragging");
      };
    });
    tabContainer.on("dragover", function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.dropEffect = "move";
      var old = tabContainer.find(".hovering")
      if (old) old.removeClass("hovering");
      var tab = e.target.findUp(".tab:not(.hovering)");
      if (tab) {
        tab.addClass("hovering");
      }
    });
    tabContainer.on("dragleave", function(e) {
      if (e.target !== tabContainer) return;
      var hovered = tabContainer.find(".hovering");
      if (hovered) hovered.removeClass("hovering");
    });
    tabContainer.on("drop", function(e) {
      if (!draggedTab) return;
      e.stopPropagation();
      var location = "before"; //how to position the new tab
      var target; //closest tab to drop event
      if (e.target == tabContainer) {
        //if dropped on the bar, find the nearest tab to go after
        var elements = tabContainer.findAll(".tab");
        location = "after";
        elements.forEach(function(el) {
          if (el.offsetLeft < e.offsetX) {
            target = el;
          }
        });
      } else {
        //otherwise, find the actual tab element
        target = e.target.findUp(".tab");
      }
      var fromIndex = e.dataTransfer.getData("application/x-tab-id") * 1;
      var toIndex = target.getAttribute("tab-id") * 1;
      var from = state.tabs[fromIndex];
      var to = state.tabs[toIndex];
      if (from != to) {
        var reordered = [];
        state.tabs.forEach(function(t) {
          if (t == from) return;
          if (t == to && location == "before") {
            reordered.push(from);
          }
          reordered.push(t);
          if (t == to && location == "after") {
            reordered.push(from);
          }
        });
        state.tabs = reordered;
      }
      command.fire("session:render");
    });
  };
  
  var enableTabMiddleClick = function() {
    var tabContainer = document.find(".tabs");
    tabContainer.on("click", function(e) {
      if (!e.target.matches(".tab")) return;
      if (e.button != 1) return;
      e.preventDefault();
      command.fire("session:close-tab", e.target.getAttribute("argument"));
    });
  };
  
  return function() {
    enableTabDragDrop();
    enableTabMiddleClick();
  };

});