Module descriptions - storage/\*
================================

file.js
-------

Wraps the chrome.fileSystem APIs in a friendly File constructor. File
objects have the following methods or properties, most of which should
be self explanatory. Most methods return promises, but also accept
node-style callbacks.

-  ``open``
-  ``read``
-  ``write``
-  ``stat``
-  ``retain``
-  ``restore``
-  ``getPath``
-  ``entry`` - contains the actual entry object.

All storage in Caret, regardless of its actual backing structure, goes
through objects adhering to the File interface, which makes it much
easier to open many types of data through the same tab/editor UI. It
also makes persistence much more consistent and less verbose throughout
Caret.

settingsProvider.js
-------------------

The actual singleton returned when modules load configs via the
``settings`` plugin. Provides the following API:

-  ``get`` Retrieves the current settings object by name, with all
   layers \`(project, local, and default) merged over top each other.
-  ``getAsString`` Retrieves the local settings as a string, mostly used
   when opening settings for editing.
-  ``getAsFile``
-  ``load`` Requests a fresh copy of the local settings from sync
   storage, usually called after either writing to settings or when the
   dependent module does not have a settings cache.
-  ``setProject`` Sets the top-most JSON object to be merged when
   calling ``Settings.get()``, used for the project-specific settings
   overrides.
-  ``clearProject`` Removes the top-most JSON object, so that only local
   and default settings are merged.
-  ``pull`` Calls load/get for you on the list of arguments, and returns
   a promise that's fullfilled with a hash of the requested settings.

syncfile.js
-----------

A constructor matching the File interface, but backed by
chrome.storage.sync. Used to open settings "files."

syncFS.js
---------

An abstraction over top of chrome.storage.sync, capable of storing data
larger than the sync storage limit by splitting it into multiple entries
behind the scenes. Returns promises for all methods.
