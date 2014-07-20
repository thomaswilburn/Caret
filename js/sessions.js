define([
    "sessions/state",
    "sessions/addRemove",
    "sessions/switching",
    "sessions/binding",
    "editor",
    "command",
    "storage/settingsProvider",
    "util/elementData",
    "aceBindings"
  ],
  function(state, addRemove, switching, bindEvents, editor, command, Settings, elementData) {
    
  /*
  
  The sessions module handles tracking tabs, their contents, and their bindings.
  It shares the sessions:* command namespace with the fileManager module.
  
  */

  var syntax = document.find(".syntax");

  command.on("session:syntax", function(mode) {
    var session = editor.getSession();
    if (mode) {
      session.setMode("ace/mode/" + mode);
      session.syntaxMode = mode;
    } else {
      mode = session.syntaxMode;
    }
    syntax.value = mode;
  });

  var renderTabs = function() {
    var tabContainer = document.find(".tabs");
    var current = editor.getSession();
    //find and destroy tabs that do not exist anymore
    tabContainer.findAll(".tab").forEach(function(element) {
      var tab = element.data();
      if (state.tabs.indexOf(tab) == -1) {
        element.remove();
      }
    });
    state.tabs.forEach(function(tab, i) {
      var element = elementData.get(tab);
      if (!element) {
        element = document.createElement("span");
        element.className = "tab enter";
        element.setAttribute("draggable", true);
        element.data(tab);
      }
      element.innerHTML = tab.render(i);
      element.setAttribute("tab-id", i);
      if (tab === current) {
        element.addClass("active");
      } else {
        element.removeClass("active");
      }
      tabContainer.append(element);
    });

    setTimeout(function() {
      //wait for render before triggering the enter animation
      tabContainer.findAll(".enter").forEach(function(element) { element.removeClass("enter") });
    });
  };

  var renderPending = false;
  command.on("session:render", function(c) {
    if (renderPending) return;
    renderPending = setTimeout(function() {
      renderTabs();
      renderPending = false;
      if (c) c();
    })
  }, 100);

  var init = function() {
    Settings.pull("ace").then(function(data) {
      data.ace.modes.forEach(function(mode) {
        var option = document.createElement("option");
        option.innerHTML = mode.label;
        option.value = mode.name;
        syntax.append(option);
      });
    })
    if (!state.tabs.length) addRemove.add("");
    renderTabs();
    bindEvents();
    reset();
    return "sessions";
  };

  var reset = function() {
    state.tabs.forEach(function(tab) {
      tab.detectSyntax();
    });
  };

  command.on("init:startup", init);
  command.on("init:restart", reset);

  var locationMemory = null;

  return {
    addFile: addRemove.add,
    getAllTabs: function() {
      return state.tabs;
    },
    getCurrent: function() {
      return editor.getSession();
    },
    getTabByIndex: function(index) {
      return state.tabs[index];
    },
    getTabByName: function(name) {
      for (var i = 0; i < state.tabs.length; i++) {
        if (state.tabs[i].fileName == name) {
          return state.tabs[i];
        }
      }
      return null;
    },
    getFilenames: function() {
      return state.tabs.map(function(t) { return t.fileName });
    },
    setCurrent: switching.raise,
    raiseBlurred: switching.raiseBlurred,
    saveLocation: function() {
      var session = editor.getSession();
      var position = editor.getCursorPosition();
      locationMemory = {
        tab: session,
        cursor: position
      };
    },
    restoreLocation: function() {
      if (!locationMemory) return;
      switching.raise(locationMemory.tab);
      editor.moveCursorToPosition(locationMemory.cursor);
    },
    renderTabs: renderTabs
  }

});
