chrome.runtime.onInstalled.addListener(function(e) {
  //this is where we'll track upgrades
  if (!e.previousVersion) return;
  
  var semver = e.previousVersion.split(".");
  var major = semver[0];
  var minor = semver[1];
  var build = semver[2];
  
  
});