Module description - ui/\*
==========================

cli.js
------

Creates the UI and bindings for a "command line" that can run Caret
commands directly. Useful when testing a new command, since you don't
need to change keys.json or menu.json in order to run it.

contextMenus.js
---------------

Simplifies the process of adding Chrome context menus to page links,
including adding a basic REST-style router for getting parameters out of
the link URL. Exposes a ``register`` method for setting up the actual
menu and its callback, and a ``makeURL`` method to help with making
route URLs that correctly start with the app's extension ID.

dialog.js
---------

Exposes a function that will pop up a dialog box, since Chrome apps are
not allowed to use ``alert()``, ``confirm()``, or ``prompt()``.
Reasonably customizable.

keys.js
-------

Reads the local keyboard settings and registers on the document body to
convert them into commands. Also handles unbinding any Ace commands that
would otherwise collide. Exposes no external methods or data.

menus.js
--------

Generates the menu bar from the local menu settings file. Exposes no
external methods or data at this time.

palette.js
----------

Sets up the command palette and returns it as a singleton for any other
modules that might want to trigger it or alter its data, although it is
recommended that other modules simply send ``palette:*`` commands
instead.

projectManager.js
-----------------

Tracks any current project settings, files, and navigable directories.
Exposes the manager object to dependent modules, primarily so that the
palette can get the list of files for Go To File.

statusbar.js
------------

Sets the status text, and returns an interface with ``setMessage()``,
``clearMessage()``, and ``toast()`` methods. It's recommended to use the
``status:*`` commands instead of requiring this module directly.
