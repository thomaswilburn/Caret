define(function() {
  
  var registry = {};
  
  var onClick = function(info) {
    var handler = registry[info.menuItemId];
    if (handler) {
      var params = handler.parse(info.linkUrl);
      handler.callback(params);
    }
  };
  
  var makeURL = function(filter, id) {
    var url = "chrome-extension://" + chrome.runtime.id + "/" + filter;
    if (typeof id != "undefined") {
      url += "/" + id;
    }
    return url;
  };
  
  var createRoute = function(route, handler) {
    var parts = route.split("/");
    var positions = {};
    parts = parts.map(function(s, i) {
      if (s[0] == ":") {
        //set the key to be used on parsing
        positions[i] = s.replace(/^:/, "");
        return "*";
      }
      return s.replace(/[\^()\[\]]/, function(match) { return "\\" + match });
    });
    var re = new RegExp(parts.map(function(s) { return s == "*" ? "([^\/]+)" : s }).join("\\/"));
    var parser = function(url) {
      var result = re.exec(url);
      if (!result) return result;
      var params = {};
      for (var place in positions) {
        var key = positions[place];
        params[key] = result[place];
      }
      params.url = url;
      return params;
    }
    return {
      parse: parser,
      regex: re,
      url: makeURL(parts.join("/")),
      callback: handler
    };
  }
  
  chrome.contextMenus.onClicked.addListener(onClick);
  
  return {
    register: function(label, id, route, handler) {
      var compiled = createRoute(route, handler);
      registry[id] = compiled;
      chrome.contextMenus.create({
        title: label,
        targetUrlPatterns: [ compiled.url ],
        contexts: ["link"],
        id: id
      });
    },
    makeURL: makeURL
  };
  
});