define([
  "command",
  "settings!sequences",
  "util/manos"
], function(command, Settings, M) {

  command.on("*", function(cmd, argument, callback) {
    Settings.load("sequences", function() {
      var sequences = Settings.get("sequences");
      if (cmd in sequences) {
        M.serial(sequences[cmd], function(item, next) {
          if (typeof item == "string") {
            item = { command: item }
          }
          command.fire(item.ace ? "ace:command" : item.command, item.argument || item.ace, next);
        });
      }
    });
  });

});