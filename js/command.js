define(["dom2"], function() {

  /*
  
  A module for translating UI interactions into events for the rest of the application. Basically it's a pubsub with a dom layer. Listens for menu events, as well as offering an API for firing and subscribing to arbitrary events.
  
  */
  
  var commands = {};
  
  var fire = function(command, argument) {
    if (!commands[command]) return;
    var registry = commands[command];
    for (var i = 0; i < registry.length; i++) {
      var entry = registry[i];
      setTimeout(function() {
        entry.callback.call(entry.scope || null, argument);
      });
    }
  }
  
  var register = function(command, listener, scope) {
    if (!commands[command]) {
      commands[command] = [];
    }
    commands[command].push({
      callback: listener,
      scope: scope
    });
  }
  
  //delegate for all elements that have a command attribute
  //may want to add more listeners for other UI elements (select)
  document.body.on("click", function(e) {
    //delegate all items with a command attribute
    if (e.target.hasAttribute("command")) {
      var command = e.target.getAttribute("command");
      var arg = e.target.getAttribute("argument");
      fire(command, arg);
    }
  });
  
  return {
    fire: fire,
    on: register
  };

});