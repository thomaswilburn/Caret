define(["dom2"], function() {

  /*
  
  A module for translating UI interactions into events for the rest of the application. Basically it's a pubsub with a dom layer. Listens for menu events, as well as offering an API for firing and subscribing to arbitrary events.
  
  */
  
  var commands = {};
  
  var fire = function(command, argument) {
    if (!commands[command]) return;
    var registry = commands[command].slice();
    registry.forEach(function(entry) {
        entry.callback.apply(entry.scope || null, argument instanceof Array ? argument : [argument] );
    });
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
    //cancel on inputs, selectboxes
    if (["input", "select"].indexOf(e.target.tagName.toLowerCase()) >= 0) return;
    //delegate all items with a command attribute
    if (e.target.hasAttribute("command")) {
      var command = e.target.getAttribute("command");
      var arg = e.target.getAttribute("argument");
      fire(command, arg);
      e.preventDefault();
    }
  });
  
  document.body.on("change", function(e) {
    if (e.target.hasAttribute("command")) {
      var command = e.target.getAttribute("command");
      var arg = e.target.value;
      fire(command, arg);
    }
  });
  
  return {
    fire: fire,
    on: register
  };

});