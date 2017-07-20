define([
    "command",
    "sessions/state",
    "sessions/addRemove",
    "ui/contextMenus",
    "util/manos",
    "util/dom2"
  ], function(command, state, addRemove, contextMenus, M) {
    
  /*
  This module returns a function that will bind for event delegation to the
  tab container. Most of it is support for drag/drop.
  */

  var enableTabDragDrop = function() {
    var tabContainer = document.find(".tabs");
    var draggedTab = null;
    
    tabContainer.on("dragstart", function(e) {
      if (!e.target.matches(".tab")) return;
      e.target.style.opacity = 0;
      setTimeout(() => e.target.addClass("dragging"), 50);
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
      var tab = e.target.findUp(".tab:not(.hovering)");
      if (tab || e.target == tabContainer) {
        var old = tabContainer.find(".hovering");
        if (old) old.removeClass("hovering");
        if (tab) tab.addClass("hovering");
      }
    });
    
    //cancel hover appearance when leaving the tab bar
    tabContainer.on("drag", function(e) {
      var tabCoords = tabContainer.getBoundingClientRect();
      if (
        e.clientX > tabCoords.left &&
        e.clientX < tabCoords.left + tabCoords.width &&
        e.clientY > tabCoords.top &&
        e.clientY < tabCoords.top + tabCoords.top
      ) return;
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
    tabContainer.on("mousedown", function(e) {
      if (!e.target.matches(".label")) return;
      if (e.button != 1) return;
      e.preventDefault();
      command.fire("session:close-tab", e.target.getAttribute("argument"));
    });
  };
  
  var closeTabsRight = function(tabID) {
    tabID = tabID || state.tabs.indexOf(editor.getSession());
    var toClose = [];
    for (var i = state.tabs.length - 1; i > tabID; i--) {
      toClose.push(i);
    }
    M.serial(toClose, addRemove.remove);
  };

  var enableDblClickNewTab = function() {
    var tabContainer = document.find(".tabs");
    tabContainer.on("dblclick", function(e) {
      e.preventDefault();
      if (e.button == 0)
        command.fire("session:new-file");
    });
  };

  command.on("session:close-to-right", closeTabsRight);

  contextMenus.register("Close", "closeTab", "tabs/:id", args => command.fire("session:close-tab", args.id));
  contextMenus.register("Close tabs to the right", "closeTabsRight", "tabs/:id", args => closeTabsRight(args.id));
  
  return function() {
    enableTabDragDrop();
    enableTabMiddleClick();
    enableDblClickNewTab();
  };

});