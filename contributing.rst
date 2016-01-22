Contributing to Caret
=====================

Help is always welcome when it comes to making Caret the best editor it can be. This is not just limited to code, but also to documentation, bug reports, and feature requests. To contribute, visit our GitHub repo:

https://github.com/thomaswilburn/Caret

We use GitHub's issue system to track bugs and feature requests, so feel free to start there. You can also grab a copy of the source code from the repo. Feel free to file a pull request, but do note that all contributions must go through a thorough code review before being accepted, and you may be asked to revise your code to match Caret's style and structure. Below are a few notes to help reduce surprises in that department:

- In general, use the Google JS style guide, with a few exceptions due to orneriness.
- Caret style prefers double quotes to single quotes when writing strings. We also ignore the style guide when it comes to AMD module declarations, but other function declarations should follow the Google style. 
- JSDoc is not used in Caret, but would probably be a good idea. Comment heavily, but name your variables and write your code so that comments shouldn't be necessary. You should prefer clarity to cleverness.
- For the most part, we use relatively few outside libraries besides Ace and the ES6 Promise shim. Before including other external libraries, consider whether this is truly necessary. For example, there are libraries for providing async and DOM manipulation in /util that should be used, rather than including caolan's async library or jQuery. This micro-library approach has served Caret well--consider deeply whether you need to include a large external library for your contribution.
- Once AMD modules start to exceed 200 lines, it's a good idea to try breaking them up into primary packages with imported sub-modules. See the "session" module for an example.
- Caret uses Grunt as its build system, and you will need it installed for development. If your contribution generates files, such as templates or CSS, do not check in the generated files, but do make sure that they will be generated as a part of the Grunt "package" task.

You don't have to be a coder to help with Caret — we're always looking for designers, writers, testers, and other non-code tasks. If you'd like suggestions on where to start, send an e-mail. Contact information is available from the main project marketing page at http://thomaswilburn.net/caret

If you want to help with translations
-------------------------------------

- Create a new folder under ``_locales``. Name the folder after one of the supported languages (see https://developer.chrome.com/webstore/i18n?csw=1#localeTable).
- Copy the ``messages.json`` file from the english (en) folder into this new folder.
- Translate the messages.

Instructions on how to change Chrome language for testing can be found here:
https://developer.chrome.com/extensions/i18n#locales-testing

**Note:** If changing the whole Mac OS language settings just to test an app, as described in the instructions, sounds like overkill, you can follow these steps:

- Open a Terminal window.
- Type ``defaults write com.google.Chrome AppleLanguages '(en-US)'`` and press "enter". (set the language you want in the parenthesis).
- Restart Chrome.

(from https://productforums.google.com/forum/#!msg/chrome/KlwkLCRln9g/7vGcFpN7ZRwJ)
