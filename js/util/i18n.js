define(["util/dom2"], function() {
  
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
    get: function(message) {
      return chrome.i18n.getMessage(message) || message;
    }
  }
  
});