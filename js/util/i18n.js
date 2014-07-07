define(["util/dom2"], function() {
  
  var translationCache = {};
  
  return {
    //process a chunk of template HTML for i18n strings
    process: function(html) {
      return html.replace(/__MSG_(\w+)__/g, function(match, tag) {
        return chrome.i18n.getMessage(tag);
      });
    },
    //process the page for inline strings, marked with .i18n
    page: function() {
      document.findAll(".i18n").forEach(function(element) {
        var original = element.innerHTML;
        var translated = chrome.i18n.getMessage(original);
        if (translated) element.innerHTML = translated;
      });
    },
    //get a message, or return the untranslated text
    //caches results for speed
    get: function(message) {
      //rest params trigger uncached behavior for substitution
      if (!translationCache[message] || arguments.length > 1) {
        var subs = [];
        for (var i = 1; i < arguments.length; i++) subs.push(arguments[i]);
        var translated = chrome.i18n.getMessage(message, subs) || message;
        translationCache[message] = translated;
        return translated;
      }
      return translationCache[message];
    }
  }
  
});