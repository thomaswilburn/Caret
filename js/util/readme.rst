Module descriptions - util
==========================

aceLoad.js
----------

Shims Ace's loadScript() async loader so that AMD modules can simply
declare Ace dependencies the same way they declare AMD dependencies.

dom2.js
-------

Instead of using an MVC framework like Backbone or a view binding
library like Angular, Caret modifies the DOM prototypes to have a more
jQuery-like UI with this module. Since Chrome apps cannot share a page
with external scripts, and since we know that the Chrome DOM prototypes
are stable, this is a safe and easy way to get sensible DOM
manipulation. Exposes no methods or data, but does modify the Document,
DocumentFragment, Element, and Window prototypes.

inflate.js
----------

Chrome OS disallows using ``eval()`` or ``new Function()``, which means
many template libraries simply won't work without pre-compiling the
templates. Instead of going that route, recognizing that template speed
is almost never a bottleneck for Caret, inflate.js provides
Mustache-compatible templating that can load from the filesystem or the
DOM (loaded automatically by ID). Exposes the following methods:

-  ``load``- Pulls a template from the given filesystem path. Returns a
   promise that resolves when the template is ready.
-  ``loadHTML`` - Directly insert HTML into the template cache for use.
-  ``get`` - Fills a template with data and returns a DOM element.
-  ``getHTML`` - Fills a template with data and returns the string
   representation
-  ``getAsync`` - Used to simultaneously load and fill a template.
   Returns a promise that resolves with the filled template as a DOM
   element.

manos.js
--------

A lightweight library for handling async code, this serves as the "hands
of fate" for your callbacks. Provides ``serial()`` and ``map()`` for
async array manipulation, and ``pton()`` and ``deferred`` for working
with native ES6 Promises.

template.js
-----------

A plugin that loads a template from disk, then returns the ``inflate``
templating object. Useful for modules that need a template as part of
their dependencies.

text.js
-------

A RequireJS plugin that loads files from Caret's app directory using
XHR. Used to get the default settings JSON through a standard interface.
