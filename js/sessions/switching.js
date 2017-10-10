define([
    "sessions/state",
    "editor",
    "command"
  ], function(state, editor, command) {
    
  /*
  Various functions for swapping between tags, either from clicks or keyboard.
  */
    
  var stackOffset = 0;
      
  var raiseTab = function(tab) {
    editor.setSession(tab);
    editor.setReadOnly(tab.readOnly);
    command.fire("session:syntax");
    command.fire("session:render");
    editor.focus();
    command.fire("session:check-file");
  };

  var raiseBlurred = function(tab) {
    editor.setSession(tab);
    command.fire("session:syntax", tab.syntaxMode || "plain_text");
    command.fire("session:render");
    command.fire("session:check-file");
  };

  var resetStack = function(tab) {
    var raised = tab || state.stack[stackOffset];
    state.stack = state.stack.filter(t => t != raised);
    state.stack.unshift(raised);
  }

  var watchCtrl = function(e) {
    if (e.keyCode == 17) {
      resetStack();
      document.body.removeEventListener("keyup", watchCtrl);
      ctrl = false;
    }
  };

  var ctrl = false;

  // most-recent order
  var switchTab = function(arg, c) {
    arg = arg || 1;
    if (!ctrl) {
      ctrl = true;
      stackOffset = 0;
      document.body.addEventListener("keyup", watchCtrl);
    }
    stackOffset = (stackOffset + arg) % state.stack.length;
    if (stackOffset < 0) stackOffset = state.stack.length + stackOffset;
    raiseTab(state.stack[stackOffset]);
    if (c) c();
  };

  //left-to-right order
  var switchTabLinear = function(shift, c) {
    shift = shift || 1;
    var current = editor.getSession();
    var currentIndex = state.tabs.indexOf(current);
    var shifted = (currentIndex + shift) % state.tabs.length;
    if (shifted < 0) {
      shifted = state.tabs.length + shifted;
    }
    var tab = state.tabs[shifted];
    raiseTab(tab);
    resetStack(tab);
    if (c) c();
  };

  command.on("session:raise-tab", function(index) {
    var tab = state.tabs[index];
    raiseTab(tab);
    resetStack(tab);
  });
  command.on("session:change-tab", switchTab);
  command.on("session:change-tab-linear", switchTabLinear);
  
  return {
    raise: raiseTab,
    raiseBlurred: raiseBlurred,
    switchTab: switchTab,
    switchLinear: switchTabLinear
  };
  
});