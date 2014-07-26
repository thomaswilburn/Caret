define(function() {
  
  /*
  
  Storing JS data on HTML elements has, in the past, been a likely source of
  memory leaks one way or the other. In this module, we create a set of
  matching WeakMaps for connecting data to DOM and vice versa. The dom2 module
  uses this to emulate jQuery's data() method, and other modules can import this
  to ask for an element given a JS object (such as a tab instance).
  
  */
  
  var elements = new WeakMap();
  var objects = new WeakMap();
  
  return {
    get: function(key) {
      var map = key instanceof HTMLElement ? elements : objects;
      return map.get(key);
    },
    set: function(key, value) {
      var isDom = key instanceof HTMLElement;
      var forward = isDom ? elements : objects;
      var reverse = isDom ? objects : elements;
      forward.set(key, value);
      reverse.set(value, key);
    },
    "delete": function(key) {
      var isDom = key instanceof HTMLElement;
      var forward = isDom ? elements : objects;
      var reverse = isDom ? objects : elements;
      var data = forward.get(key);
      forward.delete(key);
      reverse.delete(data);
    }
  }
  
  
});