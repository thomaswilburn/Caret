define([
    "sessions/state",
    "sessions/addRemove",
    "sessions/switching",
    "sessions/binding",
    "editor",
    "command",
    "settings!ace",
    "aceBindings"
  ],
  function(state, addRemove, switching, bindEvents, editor, command, Settings) {
    
  /*
  
  The sessions module handles tracking tabs, their contents, and their bindings.
  It shares the sessions:* command namespace with the fileManager module.
  
  */

  var syntax = document.querySelector(".syntax");

  command.on("session:syntax", function(mode) {
    var session = editor.getSession();
    if (mode) {
      session.setMode("ace/mode/" + mode);
      session.syntaxMode = mode;
    } else {
      mode = session.syntaxMode;
    }
    syntax.value = mode;
    session.applySettings(mode);
  });

  var previousTab = null;
  var renderTabs = function() {
    var tabContainer = document.querySelector(".tabs");
    var contents = "";
    var current = editor.getSession();
    if (previousTab !== current) {
      previousTab = current.path ? current : null;
      command.fire("session:active-tab", current);
    }
    tabContainer.innerHTML = "";
    state.tabs.forEach(function(tab, i) {
      var element = tab.render(i);
      if (tab === current) {
        element.classList.add("active");
      }
      tabContainer.appendChild(element);
    });
    setTimeout(function() {
      //wait for render before triggering the enter animation
      tabContainer.querySelectorAll(".enter").forEach(element => element.classList.remove("enter"));
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
    var ace = Settings.get("ace");
    ace.modes.forEach(function(mode) {
      var option = document.createElement("option");
      option.innerHTML = mode.label;
      option.value = mode.name;
      syntax.appendChild(option);
    });
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
      return state.tabs.map(t => t.fileName);
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
    renderTabs
  }

});