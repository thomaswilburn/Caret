CHANGELOG
=========

1.6.22
------

You can now resize the project panel, thanks to some great work from Konstantin (thanks!). 
This only works if autohide is not set.

1.6.19
------

Added support for custom JSHint options (Thanks, Matt!). Set the ``jsHint`` property in your user preferences to send configuration to JSHint. You may need to toggle ``useWorker`` off and on to trigger the changes.

1.6.18
------

Added a toggle (``showHiddenDirectories``) to display dot-prefixed directories in the project manager (disabled by default).

1.6.16
------

File extension for syntax detection is now case-insensitive. Added ``4th`` as a valid Forth extension.

1.6.15
------

Fix a bug where closing a settings file (like the user preferences) would always to try to save the file to the drive instead of to synchronized storage where it's supposed to go.

1.6.14
------

Fixed a bug where directories with the same name couldn't be added as projects directories. Switched to a changelog on GitHub (here!) not in the web store.

1.6.13
------

Adds the ability to fire command sequences.

VERY IMPORTANT NOTE: This version also begins to deprecate custom themes. If you have custom themes, they are going away soon.

1.6.11
------

Fixes an issue with the search bar when there are many top-level entries in a project.

1.6.8
-----

Fixed the spelling of reStructuredText. Remove wildcards from the manifest, which should stop Caret from opening .zip files.

1.6.7
-----

Updated Ace to version 1.2.3, which enables the reStructured Text syntax mode.

1.6.6
-----

Enabled many of those new syntax modes with their own extensions, and added coloring to the search results. NOTE: this version introduces a big change to the way that we register for file handlers on Chrome OS. If you notice that you're no longer seeing Caret in the list of applications when you try to open a file from Files, please file a bug or send me a support request. Thanks!

1.6.5
-----

Added a ton of new syntax modes and file extensions. Fixed more tab overflow bugs--eventually, we'll get them all.

1.6.3
-----

Add syntax highlighting for .phtml files. Fix an annoying tab overflow issue again.

1.6.2
-----

Project search now maintains a history of past searches using the up/down keys. Fix some bugs with the project listing and `ignoreFiles` settings. Added .vb and .vba extensions for Visual Basic syntax.

1.6.1
-----

Project search results are now clickable jump links, and fix some minor bugs with the search process.

1.6.0
-----

I'm thrilled to announce that I was wrong, and that project-wide search (including unopened files) has come to Caret, thanks to a lovely contribution by @brismuth. With that in mind, I've bumped it to 1.6, since this will form the basis for a number of much-requested features, including a replacement for Ace's anemic search widget.
