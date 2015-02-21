define([
    "command",
    "settings!api"
  ], function(command, Settings) {

  //handles sending custom messages based on Caret commands (builds, plugins, etc)
  var targets = Settings.get("api");
  command.on("init:restart", function() {
    targets = Settings.get("api");
  });

  command.on("api:execute", function(id, c) {
    if (!id in targets) return c();
    var config = targets[id];
    var message = {};
    //shallow-copy config message, just in case
    //TODO: replace with Object.assign()
    for (var key in config.message) {
      //if we implement message variables, this would be the place to handle them.
      message[key] = config.message[key];
    }
    var send = function() {
      chrome.runtime.sendMessage(config.id, message, null, function() {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        }
        if (c) c(chrome.runtime.lastError);
      });
    };
    if (config.sendEditorContext) {
      //add context information to the message
      message.context = {
        selection: editor.session.getTextRange()
      };

      if (editor.session.file && editor.session.file.getPath) {
        editor.session.file.getPath(function(err, path) {
          message.context.path = path;
          send();
        });
      } else {
        //no path for Caret config files or unsaved "untitled.txt"
        message.context.path = "";
        send();
      }

    } else {
      //send message as-is
      send();
    }
  });

  //External apps can send messages by matching Caret's command/argument config objects
  chrome.runtime.onMessageExternal.addListener(function(message, sender, c) {
    command.fire(message.command, message.argument, c);
  });
});