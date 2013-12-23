# Module descriptions - storage/*

## file.js

Wraps the chrome.fileSystem APIs in a friendly File constructor. File objects
have the following methods or properties, most of which should be self
explanatory. Most methods return promises, but also accept node-style callbacks.

- `open`
- `read`
- `write`
- `stat`
- `retain`
- `restore`
- `getPath`
- `entry` - contains the actual entry object.

All storage in Caret, regardless of its actual backing structure, goes through
objects adhering to the File interface, which makes it much easier to open
many types of data through the same tab/editor UI. It also makes persistence
much more consistent and less verbose throughout Caret.

## syncFile.js

A constructor matching the File interface, but backed by chrome.storage.sync.
Used to open settings "files."

## syncFS.js

An abstraction over top of chrome.storage.sync, capable of storing data larger
than the sync storage limit by splitting it into multiple entries behind the
scenes. Returns promises for all methods.