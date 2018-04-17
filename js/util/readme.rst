Module descriptions - util
==========================

aceLoad.js
----------

Shims Ace's loadScript() async loader so that AMD modules can simply
declare Ace dependencies the same way they declare AMD dependencies.

chromePromise.js
----------------

Wraps the ``chrome.*`` APIs up using Promises for easy interop with ``async``
and ``await``. Doesn't shim everything, only the async functions currently
used by Caret.

i18n.js
-------

Gets translated strings from Chrome's localization system. Language files are
located in _locales.

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
with native ES6 Promises. Mostly unused now that we're on async/await.

template.js
-----------

A plugin that loads a template from disk, then returns the ``inflate``
templating object. Useful for modules that need a template as part of
their dependencies.

text.js
-------

A RequireJS plugin that loads files from Caret's app directory using
XHR. Used to get the default settings JSON through a standard interface.
