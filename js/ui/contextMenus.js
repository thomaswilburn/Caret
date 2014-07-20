define(function() {
  
  //track all assigned context menus in order to respond
  var registry = {};
  var appID = chrome.runtime.id;
  
  //all context menus created here are handled via onClick
  var onClick = function(info) {
    var id = info.menuItemId;
    var handler = registry[id];
    if (handler) {
      var params = handler.parse(info.linkUrl);
      handler.callback(params);
    }
  };
  
  //provides a chrome-extension:// URL for menus based on a filter string
  var makeURL = function(filter, id) {
    var url = "chrome-extension://" + appID + "/" + filter;
    if (typeof id != "undefined") {
      url += "/" + id;
    }
    return url;
  };
  
  var createRoute = function(route, handler) {
    var parts = route.split("/");
    var positionMap = {};
    var position = 1;
    parts = parts.map(function(s) {
      if (s[0] == ":") {
        //set the key to be used on parsing
        positionMap[position++] = s.replace(/^:/, "");
        return "*";
      }
      return s.replace(/[\^()\[\]]/, function(match) { return "\\" + match });
    });
    var re = new RegExp(parts.map(function(s) { return s == "*" ? "([^\/]+)" : s }).join("\\/"));
    var parser = function(url) {
      var result = re.exec(url);
      if (!result) return result;
      var params = {};
      for (var place in positionMap) {
        var key = positionMap[place];
        params[key] = result[place];
      }
      params.url = url;
      return params;
    };
    return {
      parse: parser,
      regex: re,
      url: makeURL(parts.join("/")),
      callback: handler
    };
  };
  
  chrome.contextMenus.onClicked.addListener(onClick);
  
  return {
    register: function(label, id, route, handler) {
      var compiled = createRoute(route, handler);
      id = id + ":" + appID;
      registry[id] = compiled;
      chrome.contextMenus.create({
        title: label,
        targetUrlPatterns: [ compiled.url ],
        contexts: ["link"],
        id: id
      }, function() {
        if (chrome.runtime.lastError) {
          //It'll complain about re-registration, but there's no harm in it.
          //console.log(chrome.runtime.lastError);
        }
      });
    },
    makeURL: makeURL
  };
  
});