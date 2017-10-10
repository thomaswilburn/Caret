define(function() {
"use strict";

/*

Yes, you're not supposed to extend native prototypes. But in Chrome OS, who cares? Nobody's sharing your context. Why not paper over the cracks in the DOM? This library extends elements to do the following:

- create a findAll() method that returns an array, instead of a nodeList
- create a findUp() method to work up through ancestors
- create remove() and append() that work the way you expect them to.
- alias event listener methods to the much shorter on() and off()
- add a style method that handles prefixed CSS
- ensure that elements have a matches() method
- provide convenience methods for the classList

*/

var el = Element.prototype;
var frag = DocumentFragment.prototype;

el.append = frag.append = function(element) {
  if (typeof element == "string") {
    this.innerHTML += element;
  } else {
    this.appendChild(element);
  }
};

})
