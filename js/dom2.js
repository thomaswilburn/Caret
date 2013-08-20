(function() {
"use strict";

/*

Yes, you're not supposed to extend native prototypes. But in ChromeOS, who cares? Nobody's sharing your context. Why not paper over the cracks in the DOM? This library extends elements to do the following:

- create a query() method that returns an array, instead of a nodeList
- create remove() and append() that work the way you expect them to.
- alias event listener methods to the much shorter on() and off()
- add a style method that handles prefixed CSS

*/

var el = Element.prototype;
var doc = Document.prototype;
var win = Window.prototype;

el.query = doc.query = function(selector) {
    var a = [];
    a.push.apply(a, this.querySelectorAll(selector));
    return a;
};

el.remove = function() {
    this.parent.removeChild(this);
};

el.append = function(element) {
    if (typeof element == "string") {
        this.innerHTML += element;
    } else {
        this.appendChild(element);
    }
};

win.on = el.on = function(type, listener) {
    this.addEventListener(type, listener);
    return this;
};

win.off = el.off = function(type, listener) {
    this.removeEventListener(type, listener);
};

el.css = function(style, one) {
    if (typeof style === "string") {
        var hash = {};
        hash[style] = one;
        style = hash;
    }
    for (var key in style) {
        var val = style[key];
        if (key.indexOf("-") > 0) {
            key.replace(/-(\w)/g, function(_, match) {
                return match.toUpperCase();
            });
        }
        if (!(key in this.style)) {
            ["webkit", "moz", "ms"].some(function(prefix) {
                var test = prefix + key[0].toUpperCase() + key.substr(1);
                if (test in this.style) {
                    key = test;
                    return true;
                }
            }, this);
        }
        this.style[key] = val;
    }
}

})();