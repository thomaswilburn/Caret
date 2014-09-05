Module description - sessions/\*
================================

The sessions folder contains functionality that was broken out to keep
``sessions.js`` from getting huge.

addRemove.js
------------

Provides methods for adding, removing, and re-ordering sessions and
their tabs.

binding.js
----------

Event bindings, such as drag/drop and middle click

state.js
--------

Actual tab state as a singleton, imported by other modules to do
re-ordering or other tab manipulation.

switching.js
------------

Provides the utility methods for between tabs, directly or in order.
