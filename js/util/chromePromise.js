define(function() {
  "use strict";

  var ch = {
    fileSystem: {
      chooseEntry: function(options) {
        return new Promise(function(ok, fail) {
          chrome.fileSystem.chooseEntry(options, function(entries) {
            if (chrome.runtime.lastError) return fail(chrome.runtime.lastError);
            ok(entries);
          });
        });
      },
      getDisplayPath: function(entry) {
        return new Promise(ok => chrome.fileSystem.getDisplayPath(path, ok));
      },
      getWritableEntry: function(entry) {
        return new Promise(ok => chrome.fileSystem.getWritableEntry(entry, ok));
      },
      isRestorable: function(entry) {
        return new Promise(ok => chrome.fileSystem.isRestorable(entry, ok));
      },
      isWritableEntry: function(entry) {
        return new Promise(ok => chrome.fileSystem.isWritableEntry(entry, ok));
      }
    },

    notifications: {
      create: function(id, options) {
        return new Promise(ok => chrome.notifications.create(id, options, ok));
      },
      clear: function(id) {
        return new Promise(ok => chrome.notifications.clear(id, ok));
      }
    },

    runtime: {
      getBackgroundPage: function() {
        return new Promise(ok => chrome.runtime.getBackgroundPage(ok));
      },
      getPlatformInfo: function() {
        return new Promise(ok => chrome.runtime.getPlatformInfo(ok));
      },
      requestUpdateCheck: function() {
        return new Promise(function(ok, fail) {
          chrome.runtime.requestUpdateCheck(function(status, details) {
            ok([status, details]);
          });
        })
      },
      sendMessage: function(id, message, options) {
        return new Promise(function(ok, fail) {
          chrome.runtime.sendMessage(id, message, options, function(response) {
            if (chrome.runtime.lastError) return fail(chrome.runtime.lastError);
            ok(response);
          });
        });
      }
    },

    storage: {
      sync: {
        get: function(keys) {
          return new Promise(function(ok, fail) {
            chrome.storage.sync.get(keys, function(data) {
              if (chrome.runtime.lastError) return fail(chrome.runtime.lastError);
              ok(data);
            });
          });
        },
        set: function(items) {
          return new Promise(function(ok, fail) {
            chrome.storage.sync.set(items, function() {
              if (chrome.runtime.lastError) return fail(chrome.runtime.lastError);
              ok();
            });
          });
        },
        remove: function(key) {
          return new Promise(function(ok, fail) {
            chrome.storage.sync.remove(key, function() {
              if (chrome.runtime.lastError) return fail(chrome.runtime.lastError);
              ok();
            });
          });
        }
      },

      local: {
        get: function(keys) {
          return new Promise(function(ok, fail) {
            chrome.storage.local.get(keys, function(data) {
              if (chrome.runtime.lastError) return fail(chrome.runtime.lastError);
              ok(data);
            });
          });
        },
        set: function(items) {
          return new Promise(function(ok, fail) {
            chrome.storage.local.set(items, function() {
              if (chrome.runtime.lastError) return fail(chrome.runtime.lastError);
              ok();
            });
          });
        },
        remove: function(key) {
          return new Promise(function(ok, fail) {
            chrome.storage.local.remove(key, function() {
              if (chrome.runtime.lastError) return fail(chrome.runtime.lastError);
              ok();
            });
          });
        }
      }
    }
  };

  return ch;
});