define([
    "command",
    "sessions/state",
    "sessions/addRemove",
    "ui/contextMenus"
  ], function(command, state, addRemove, contextMenus) {

  /*
  This module returns a function that will bind for event delegation to the
  tab container. Most of it is support for drag/drop.
  */

  var enableTabDragDrop = function() {
    var tabContainer = document.querySelector(".tabs");
    var draggedTab = null;

    tabContainer.addEventListener("dragstart", function(e) {
      if (!e.target.matches(".tab")) return;
      e.target.style.opacity = 0;
      setTimeout(() => e.target.classList.add("dragging"), 50);
      e.dataTransfer.setDragImage(e.target, 0, 0);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.clearData("text/plain");
      e.dataTransfer.clearData("text/uri-list");
      e.dataTransfer.setData("application/x-tab-id", e.target.getAttribute("tab-id"));
      draggedTab = e.target;
      draggedTab.ondragend = function() {
        draggedTab = null;
        e.target.style.opacity = null;
        e.target.classList.remove("dragging");
      };
    });

    tabContainer.addEventListener("dragover", function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.dropEffect = "move";
      var tab = e.target.closest(".tab:not(.hovering)");
      if (tab || e.target == tabContainer) {
        var old = tabContainer.querySelector(".hovering");
        if (old) old.classList.remove("hovering");
        if (tab) tab.classList.add("hovering");
      }
    });

    //cancel hover appearance when leaving the tab bar
    tabContainer.addEventListener("drag", function(e) {
      var tabCoords = tabContainer.getBoundingClientRect();
      if (
        e.clientX > tabCoords.left &&
        e.clientX < tabCoords.left + tabCoords.width &&
        e.clientY > tabCoords.top &&
        e.clientY < tabCoords.top + tabCoords.top
      ) return;
      var hovered = tabContainer.querySelector(".hovering");
      if (hovered) hovered.classList.remove("hovering");
    });

    tabContainer.addEventListener("drop", function(e) {
      if (!draggedTab) return;
      e.stopPropagation();
      var location = "before"; //how to position the new tab
      var target; //closest tab to drop event
      if (e.target == tabContainer) {
        //if dropped on the bar, find the nearest tab to go after
        var elements = tabContainer.querySelectorAll(".tab");
        location = "after";
        elements.forEach(function(el) {
          if (el.offsetLeft < e.offsetX) {
            target = el;
          }
        });
      } else {
        //otherwise, find the actual tab element
        target = e.target.closest(".tab");
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
    var tabContainer = document.querySelector(".tabs");
    tabContainer.addEventListener("mousedown", function(e) {
      if (!e.target.matches(".label")) return;
      if (e.button != 1) return;
      e.preventDefault();
      command.fire("session:close-tab", e.target.getAttribute("argument"));
    });
  };

  var closeTabsRight = async function(tabID) {
    tabID = tabID || state.tabs.indexOf(editor.getSession());
    for (var i = state.tabs.length - 1; i > tabID; i--) {
      await addRemove.remove(i);
    }
  };

  var copyFilePath = function(tabIndex) {
    var tabPath = state.tabs[tabIndex].path;
    return window.navigator.clipboard.writeText(tabPath);
  };

  var enableDblClickNewTab = function() {
    var tabContainer = document.querySelector(".tabs");
    tabContainer.addEventListener("dblclick", function(e) {
      e.preventDefault();
      if (e.button == 0)
        command.fire("session:new-file");
    });
  };

  command.on("session:close-to-right", closeTabsRight);

  contextMenus.register("Close", "closeTab", "tabs/:id", args => command.fire("session:close-tab", args.id));
  contextMenus.register("Close tabs to the right", "closeTabsRight", "tabs/:id", args => closeTabsRight(args.id));
  contextMenus.register("Copy file path", "copyFilePath", "tabs/:id", args => copyFilePath(args.id));

  return function() {
    enableTabDragDrop();
    enableTabMiddleClick();
    enableDblClickNewTab();
  };

});