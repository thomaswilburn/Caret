chrome.version = window.navigator.appVersion.match(/Chrome\/(\d+)/)[1] * 1 || 0;

require([
    "command",
    "editor",
    "storage/settingsProvider",
    "ui/dialog",
    "sessions",
    "util/manos",
    "util/i18n",
    "util/chromePromise",
    "fileManager",
    "api",
    "sequences",
    "ui"
  ], function(command, editor, Settings, dialog, sessions, M, i18n, chromeP) {

  //translate inline strings
  i18n.page();

  var frame = chrome.app.window.current();

  //these are modules that must be loaded before init:complete
  var loadedModules = {
    "editor": false,
    "fileManager": false,
    "sessions": false
  };

  //the settings manager may also fire init:restart to re-init components after startup
  command.fire("init:startup", function(mod) {
    //ignore callback in non-essential modules
    if (typeof loadedModules[mod] == "undefined") return;
    loadedModules[mod] = true;
    for (var key in loadedModules) {
      if (!loadedModules[key]) {
        return;
      }
    }
    //all specified modules are loaded, app is ready for init:complete
    command.fire("init:complete");
  });

  //code to enable update checking
  var updateID = "caret:update";

  var checkUpdates = async function(isManual) {
    var [status, details] = await chromeP.runtime.requestUpdateCheck();
    if (status == "update_available") {
      chrome.runtime.onUpdateAvailable.addListener(async function() {
      await chromeP.notifications.clear(updateID);
      updateID = await chromeP.notifications.create(updateID, {
          type: "basic",
          iconUrl: "icon-128.png",
          title: i18n.get("notificationUpdateAvailable"),
          message: i18n.get("notificationUpdateDetail", details.version),
          buttons: [
            { title: i18n.get("notificationUpdateOK") },
            { title: i18n.get("notificationUpdateWait") }
          ]
        });
      });
    } else {
      if (isManual) {
        updateID = await chromeP.notifications.create(updateID, {
        type: "basic",
        iconUrl: "icon-128.png",
        title: i18n.get("notificationNoUpdateTitle"),
        message: i18n.get("notificationNoUpdateDetail")
        });
      }
    }
  };

  // manage updates on start
  Settings.pull("user").then(async function(cfg) {
    if (cfg.user.promptForUpdates !== false) checkUpdates();
    if (cfg.user.updateNotifications == "launch") {
      var background = await chromeP.runtime.getBackgroundPage();
      var manifest = chrome.runtime.getManifest();
      console.log(background.updateVersion, manifest.version);
      if (background.updateVersion && background.updateVersion != manifest.version) {
        background.showUpdateNotification();
        background.updateVersion = null;
      }
    }
  });
  command.on("app:check-for-updates", checkUpdates);

  //export update notification preference, possibly others
  command.on("init:restart", async function() {
    var cfg = await Settings.pull("user");
    chromeP.storage.sync.set({
      updateNotifications: cfg.user.updateNotifications
    });
  });

  chrome.notifications.onButtonClicked.addListener(function(id, index) {
    if (id != updateID) return;
    if (index == 0) {
      chrome.runtime.reload();
    }
  });

  command.on("app:exit", function() {
    var cancelled = false;
    var tabs = sessions.getAllTabs();
    M.serial(tabs, function(tab, c) {
      if (tab.modified && (!tab.file || !tab.file.virtual)) {
        return dialog(
          i18n.get("dialogUnsaved", tab.fileName),
          [
            { label: i18n.get("dialogSave"), value: "save", shortcut: "s" },
            { label: i18n.get("dialogDiscard"), value: "discard", shortcut: "n" },
            { label: i18n.get("dialogCancel"), value: "cancel", shortcut: "c" }
          ],
          function(value) {
            if (!value || value == "cancel") {
              cancelled = true;
            }
            if (value == "save") {
              return tab.save().then(c);
            }
            c(!cancelled);
          });
      }
      c();
    }, function() {
      if (!cancelled) frame.close();
    })
  });

  //It's nice to be able to launch the debugger from a command stroke
  command.on("app:debug", function() {
    debugger;
  });

  command.on("app:browse", function(url) {
    window.open(url, "target=_blank");
  });

});
