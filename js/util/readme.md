# Module descriptions - util

## dom2.js

Instead of using an MVC framework like Backbone or a view binding library like
Angular, Caret modifies the DOM prototypes to have a more jQuery-like UI with
this module. Since Chrome apps cannot share a page with external scripts, and
since we know that the Chrome DOM prototypes are stable, this is a safe and
easy way to get sensible DOM manipulation. Exposes no methods or data, but
does modify the Document, DocumentFragment, Element, and Window prototypes.

## manos.js

A lightweight library for handling async code, this serves as the "hands of
fate" for your callbacks. Provides `serial()` and `map()` for async array
manipulation, and `pton()` and `deferred` for working with native ES6
Promises.

## text.js

A RequireJS plugin that loads files from Caret's app directory using XHR. Used
to get the default settings JSON through a standard interface.
