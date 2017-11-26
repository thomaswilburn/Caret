chrome.runtime.onInstalled.addListener(function(e) {
  //this is where we'll track upgrades
  if (!e.previousVersion) return;
  
  var manifest = chrome.runtime.getManifest();
  
  var semver = e.previousVersion.split(".");
  var major = semver[0];
  var minor = semver[1];
  var build = semver[2];
  
  if (e.previousVersion == manifest.version) {
    return;
  }
  
  // console.log("Upgrading Caret from version " + e.previousVersion);

  /*
  
  As with Android database upgrades, we'll perform these as a series of if statements, ordered by increasing version number. We should also provide a notification that the system is upgrading, and prevent opening new windows until the process finishes. In theory, this script shares a document with background.js, so they can just use a common flag to halt the openWindow process during upgrades.
  
  */

});
