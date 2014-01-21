define([
    "util/dom2"
  ], function() {
    
  /*
  
  A simple, Mustache-compatible templating library that doesn't use eval, so
  it's safe for Chrome apps. It's not fast, but templating is rarely our
  bottleneck.
  
  */
    
  var cache = {};
  var fragment = document.createDocumentFragment();
  var fragBody = document.createElement("body");
  fragment.append(fragBody);
  
  var parse = function(html) {
    fragBody.innerHTML = html;
    return fragBody.children[0];
  };
  
  var process = function(template, data) {
    var searcher = /\{\{([^\}]+)\}\}/;
    var found, before, after, replacement;
    while (found = searcher.exec(template)) {
      var tag = found[1];
      before = template.substr(0, found.index);
      if (tag[0] == "#") {
        var key = tag.substr(1);
        //it's a section, let's replace it
        var findEnding = new RegExp("\\{\\{/" + key + "\\}\\}");
        var ending = findEnding.exec(template);
        after = template.substr(ending.index + ending[0].length);
        var contents = template.substr(found.index + found[0].length, ending.index - (found.index + found[0].length));
        
        var value = data[key];
        var replacement = "";
        //switch based on the type
        if (value.map) {
          //arrays get a loop
          var boundProcess = process.bind(null, contents);
          replacement = value.map(boundProcess).join("");
        } else if (typeof value == "object") {
          //objects get re-templated
          replacement = process(contents, value);
        } else if (value) {
          //otherwise we evaluate for truthiness in the current scope
          replacement = process(contents, data);
        }
      } else {
        after = template.substr(found.index + found[0].length);
        replacement = data[tag];
      }
      template = before + replacement + after;
    }
    return template;
  };
  
  var inflateHTML = function(id, data) {
    var template = cache[id];
    if (!template) return null;
    return process(template, data);
  };
  
  var inflate = function(id, data) {
    var html = inflateHTML(id, data);
    return parse(html);
  };
  
  //load existing templates from DOM
  document.findAll("template").forEach(function(template) {
    var id = template.getAttribute("id");
    cache[id] = template.innerHTML;
  });
  
  var load = function(path) {
    return new Promise(function(ok) {
      require(["util/text!" + path], function(text) {
        cache[path] = text;
        ok();
      });
    });
  }
  
  return {
    get: inflate,
    getHTML: inflateHTML,
    getAsync: function(id, data) {
      if (cache[id]) {
        return Promise.resolve(inflate(id, data));
      }
      return load(id).then(function() {
        var rendered = inflate(id, data);
        return Promise.resolve(rendered);
      });
    }
  }
  
});