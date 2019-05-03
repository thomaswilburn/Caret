define([
    "command",
    "settings!api"
  ], function(command, Settings) {

  var noop = function() {};

  //handles sending custom messages based on Caret commands (builds, plugins, etc)
  var targets = Settings.get("api");
  command.on("init:restart", () => targets = Settings.get("api"));

  command.on("api:execute", async function(id, c = noop) {
    if (!( id in targets )) return c();
    var config = targets[id];
    var message = {};
    //shallow-copy config message, just in case
    //TODO: replace with Object.assign()
    for (var key in config.message) {
      //if we implement message variables, this would be the place to handle them.
      message[key] = config.message[key];
    }
    if (config.sendEditorContext) {
      //add context information to the message
      message.context = {
        selection: editor.session.getTextRange(),
        path: ""
      };

      if (editor.session.file && editor.session.file.getPath) {
        var path = await editor.session.file.getPath();
        message.context.path = path;
      }

    }
    chrome.runtime.sendMessage(config.id, message, null, function() {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
      c(chrome.runtime.lastError);
    });
  });

  //External apps can send messages by matching Caret's command/argument config objects
  chrome.runtime.onMessageExternal.addListener(async function(message, sender, c = noop) {
    var result = await command.fire(message.command, message.argument);
    c(null, result);
  });
});