define([
  "command",
  "storage/settingsProvider",
  "ui/statusbar",
  "sessions/state"
], function(command, Settings, status, state) {
  
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
    status.toast("Executing autosave for all tabs...");
    state.tabs.forEach(function(tab) {
      if (tab.file && !tab.file.virtual) {
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