var notification = "upgraded";

window.showUpdateNotification = function(manifest = chrome.runtime.getManifest()) {
  chrome.notifications.create(notification, {
    type: "basic",
    iconUrl: "icon-128.png",
    title: chrome.i18n.getMessage("notificationUpdated"),
    message: chrome.i18n.getMessage("notificationUpdatedDetail", [manifest.version]),
    isClickable: true
  }, function(id) { notification = id });
};

chrome.runtime.onInstalled.addListener(function(e) {
  //this is where we'll track upgrades
  if (!e.previousVersion) return;
  
  var manifest = chrome.runtime.getManifest();
  
  // at some point, we should use these.
  var [major, minor, build] = e.previousVersion.split(".");

  if (e.previousVersion != manifest.version) {

    chrome.storage.sync.get("updateNotifications", function(data) {

      if (data.updateNotifications && data.updateNotifications != "background") return;
    
      //let the user know
      showUpdateNotification(manifest);

    });
  }
  
  // console.log("Upgrading Caret from version " + e.previousVersion);

  /*
  
  As with Android database upgrades, we'll perform these as a series of if statements, ordered by increasing version number. We should also provide a notification that the system is upgrading, and prevent opening new windows until the process finishes. In theory, this script shares a document with background.js, so they can just use a common flag to halt the openWindow process during upgrades.
  
  */

});


chrome.notifications.onClicked.addListener(function(id) {
  if (id != notification) return;
  window.open("https://github.com/thomaswilburn/Caret/blob/master/changelog.rst", "target=_blank");
});