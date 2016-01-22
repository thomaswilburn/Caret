define([
  "command",
  "storage/settingsProvider",
  "ui/statusbar",
  "sessions/state",
  "util/i18n"
], function(command, Settings, status, state, i18n) {
  
  var autosaveTimeout = null;
  var scheduleAutosave = function() {
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    Settings.pull("user").then(function(settings) {
      if(settings.user.autosaveInterval) {
        //schedule next save in minutes
        autosaveTimeout = setTimeout(autosave, settings.user.autosaveInterval * 60 * 1000);
      }
    });
  };
  
  var autosave = function() {
    status.toast(i18n.get("fileAutosaving"));
    state.tabs.forEach(function(tab) {
      if (tab.file && !tab.file.virtual && tab.modified) {
        tab.save();
      }
    });
    scheduleAutosave();
  };
  
  scheduleAutosave();
  command.on("init:restart", scheduleAutosave);
  
  window.on("blur", function() {
    Settings.pull("user").then(function(settings) {
      if (settings.user.autosaveOnBlur) {
        autosave();
      }
    });
  });
  
});