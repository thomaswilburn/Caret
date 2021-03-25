Caret
=====

Caret is a lightweight-but-powerful programmer's editor running as a Chrome
Packaged App. Inspired by Sublime and built on top of the Ace editing
component, it offers:

-  multiple cursors
-  tabbed editing and retained files
-  syntax highlighting and themes
-  command palette/smart go to
-  hackable, synchronized configuration files
-  project files and folder view
-  fast project-wide string search

More information, links to Caret in the Chrome Web Store, and an
external package file are available at http://thomaswilburn.net/caret.
Documentation can be found in the
`wiki <https://github.com/thomaswilburn/Caret/wiki>`_.

You can also load Caret from source code, either to hack around on or
to try the absolute bleeding edge. You'll need to have Node and NPM
installed first, then follow these steps:

0. Clone this repo to your local machine
1. Run ``npm install`` to get the development dependencies (Grunt, LESS,
   and some other packages)
2. Run ``npm run build``, which will generate the CSS files from the LESS
   source
3. Visit ``chrome://extensions`` and enable Developer Mode.
4. Still on the extensions page, click the button marked "Load unpacked
   extension..." and select the directory containing Caret's
   manifest.json.

