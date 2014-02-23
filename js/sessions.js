define([
    "sessions/state",
    "sessions/addRemove",
    "sessions/switching",
    "sessions/binding",
    "editor",
    "ui/contextMenus",
    "command",
    "tab",
    "storage/settingsProvider",
    "util/manos",
    "aceBindings"
  ],
  function(state, addRemove, switching, bindEvents, editor, contextMenus, command, Tab, Settings, M) {
    
  /*
  
  The sessions module handles tracking tabs, their contents, and their bindings.
  It shares the sessions:* command namespace with the fileManager module.
  
  */

  var syntax = document.find(".syntax");

  var renderTabs = function() {
    var tabContainer = document.find(".tabs");
    var contents = "";
    var current = editor.getSession();
    tabContainer.innerHTML = "";
    state.tabs.forEach(function(tab, i) {
      var element = tab.render(i);
      if (tab === current) {
        element.addClass("active");
      }
      tabContainer.append(element);
    });
    setTimeout(function() {
      //wait for render before triggering the enter animation
      tabContainer.findAll(".enter").forEach(function(element) { element.removeClass("enter") });
    });
    command.fire("session:retain-tabs");
  };

  command.on("session:render", renderTabs);

  var closeTabsRight = function(tabID) {
    tabID = tabID || state.tabs.indexOf(editor.getSession());
    var toClose = [];
    for (var i = state.tabs.length - 1; i > tabID; i--) {
      toClose.push(i);
    }
    M.serial(toClose, addRemove.remove);
  };

  command.on("session:close-to-right", closeTabsRight);

  contextMenus.register("Close", "closeTab", "tabs/:id", function(args) {
    command.fire("session:close-tab", args.id);
  });
  contextMenus.register("Close tabs to the right", "closeTabsRight", "tabs/:id", function(args) {
    closeTabsRight(args.id);
  });

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

  command.on("session:syntax", function(mode) {
    var session = editor.getSession();
    if (mode) {
      session.setMode("ace/mode/" + mode);
      session.syntaxMode = mode;
    } else {
      mode = session.syntaxMode;
    }
    syntax.value = mode;
    editor.focus();
  });

  var locationMemory = null;

  return {
    addFile: addRemove.add,
    addDefaultsFile: function(name) {
      var tab = addRemove.add(Settings.getAsString(name, true));
      tab.syntaxMode = "javascript";
      tab.detectSyntax();
      tab.fileName = name + ".json";
      renderTabs();
    },
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