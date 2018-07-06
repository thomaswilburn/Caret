define([
  "command",
  "settings!sequences"
], function(command, Settings) {

  command.on("*", async function(cmd, argument, callback) {
    var sequences = await Settings.get("sequences");
    
    if (!(cmd in sequences)) return
    for (var item of sequences[cmd]) {
      if (typeof item == "string") {
        item = { command: item }
      }
      await command.fire(item.ace ? "ace:command" : item.command, item.argument || item.ace);
    }
  });

});