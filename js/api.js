define(["command", "settings!api"], function(command, Settings) {
  //handles sending custom messages based on Caret commands (builds, plugins, etc)
  var targets = Settings.get("api");
  command.on("init:restart", function() {
    targets = Settings.get("api");
  });
  
  command.on("api:execute", function(id) {
    if (!id in targets) return;
    var config = targets[id];
    chrome.runtime.sendMessage(config.id, config.message);
  });
  
  
  //External apps can send messages by matching Caret's command/argument config objects
  chrome.runtime.onMessageExternal.addListener(function(message, sender, c) {
    command.fire(message.command, message.argument, c);
  });
});