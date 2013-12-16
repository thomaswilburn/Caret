define([
    "util/dom2"
  ], function() {

  /*
  
  A module for translating UI interactions into events for the rest of the application. Basically it's a pubsub with a dom layer. Listens for menu events, as well as offering an API for firing and subscribing to arbitrary events.
  
  */
  
  var commands = {};
  
  //commands can pass a callback, although most don't respond that way
  var fire = function(command, argument, callback) {
    if (!commands[command]) return;
    var registry = commands[command].slice();
    registry.forEach(function(entry) {
        var result = entry.callback.apply(entry.scope || null, argument instanceof Array ? argument : [argument], callback);
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
  
  var facade = {
    fire: fire,
    on: register,
    list: []
  };
  
  //this is kind of a hack, since it updates as async
  //we'll have to investigate a Require plugin if this is needed at startup
  //alternatively, we could have init wait for the loaded event
  var listRequest = new XMLHttpRequest();
  listRequest.open("GET", "config/commands.json");
  listRequest.onerror = listRequest.onLoad = function() {
    if (listRequest.responseText) {
      var list = JSON.parse(listRequest.responseText);
      facade.list.push.apply(facade.list, list);
      fire("command:loaded-list");
    }
  }
  
  return facade;

});