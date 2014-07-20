define([
    "sessions/state",
    "sessions/switching",
    "tab",
    "editor",
    "ui/statusbar",
    "ui/dialog",
    "command",
    "util/i18n"
  ], function(state, switching, Tab, editor, status, dialog, command, i18n) {

  var addTab = function(contents, file) {
    var current = editor.getSession();
    var tab;
    //reuse tab if opening a file into an empty tab
    if (file && !current.file && !current.modified) {
      tab = current;
      tab.setValue(contents);
      tab.setFile(file);
      tab.modified = false;
    } else {
      tab = new Tab(contents, file);
      state.stack.unshift(tab);
      state.tabs.push(tab);
    }
    if (file && !file.virtual) {
      file.entry.file(function(f) {
        var loaded = i18n.get("fileLoaded", f.name, f.size);
        status.toast(loaded, 2);
      });
    }
    switching.raise(tab);
    tab.detectSyntax();
    return tab;
  };

  //removeTab looks long, but it handles the async save/don't/cancel flow
  var removeTab = function(index, c) {
    if (!index) {
      index = state.tabs.indexOf(editor.getSession());
    }
    var tab = state.tabs[index];
    state.stack = state.stack.filter(function(t) { return t !== tab });

    var continuation = function() {
      tab.drop();
      state.tabs = state.tabs.filter(function(tab, i) {
        if (i == index) {
          return false;
        }
        return true;
      });
      if (state.tabs.length == 0) {
        return addTab();
      }
      var next = index - 1;
      if (next < 0) {
        next = 0;
      }
      var current = editor.getSession();
      if (tab !== current) {
        command.fire("session:render");
      } else {
        switching.raise(state.tabs[next]);
      }
      if (c) c();
    };

    if (tab.modified) {
      dialog(
        i18n.get("dialogModifiedUnsaved", tab.fileName),
        [
          {label: i18n.get("dialogSave"), value: true, shortcut: "y" },
          {label: i18n.get("dialogDiscard"), value: false, shortcut: "n" },
          { label: i18n.get("dialogCancel"), shortcut: "c" }
        ],
        function(confirm) {
          if (typeof confirm !== "boolean") {
            return;
          }
          if (confirm) {
            return tab.save(continuation);
          }
          continuation();
        });
        return;
    } else {
      continuation();
    }
  };
  
  command.on("session:close-tab", removeTab);

  return {
    add: addTab,
    remove: removeTab
  }

});