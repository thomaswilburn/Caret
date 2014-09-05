Module descriptions - core
==========================

This document serves as basic documentation for Caret's AMD modules.
It's not exhaustive, but it will serve as a starting place for anyone
wanting to dive in a little deeper.

Caret's execution starts in main.js, which mostly serves as bootstrap
for the other modules. It also registers command listeners for the UI
themes, various window events, and app-level commands like
``app:check-for-updates``. After that, we really get down to business.

In addition to the module folders, which contain their own readme files,
there are also folders for the current Ace build (ace) and any external
libraries used by Caret, such as the ES6 Promises shim (lib).

aceBindings.js
--------------

Takes care of any messiness between Caret and Ace APIs. Registers the
``ace:command`` listener, as well as a bunch of Sublime emulation
commands. Exposes no external methods or data.

api.js
------

Registers for chrome.runtime.onMessageExternal events, patching them
into the command module, and dispatches messages from ``api:execute``
commands. Exposes no external methods or data.

command.js
----------

Serves as a messaging buffer between modules, and from declarative DOM
attributes to modules. Exposes three properties: ``fire()`` for sending
commands, ``on()`` for subscribing to them, and an array called ``list``
that can be used to add palette-only items at runtime.

editor.js
---------

Sets up the Ace editor and registers for events in the ``editor:*``
namespace. Returns the Ace object.

fileManager.js
--------------

Handles opening files from launch data, retained handles, and user
commands. Exposes no external methods or data.

sessions.js
-----------

Manages Caret's tabs, including all UI interaction with the tab bar and
the process of adding or removing tabs. Exposes a number of methods and
manipulating the tab structure. Most of the actual session code is
loaded from the ``/sessions`` folder, to make the file more manageable.

settings.js
-----------

Runs as a RequireJS plugin, so that dependent modules can rely on having
settings available on startup, but actually just returns the same
singleton as ``storage/settingsProvider``.

tab.js
------

Exposes a Tab constructor to dependents, which is an augmented Ace
EditorSession. Tabs do additional setup work to support Caret, as well
as adding methods for saving files and dropping retained file handles.
