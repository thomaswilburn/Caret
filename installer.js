var notification = "upgraded";

var showUpgradeNotification = function() {
  var manifest = chrome.runtime.getManifest();
  chrome.notifications.create(notification, {
    type: "basic",
    iconUrl: "icon-128.png",
    title: chrome.i18n.getMessage("notificationUpdated"),
    message: chrome.i18n.getMessage("notificationUpdatedDetail", [manifest.version]),
    isClickable: true
  }, function(id) {
    notification = id;
    chrome.storage.local.remove("pendingUpgradeNotification");
  });
}

chrome.runtime.onInstalled.addListener(function(e) {
  //this is where we'll track upgrades
  if (!e.previousVersion) return;
  
  var manifest = chrome.runtime.getManifest();
  
  var semver = e.previousVersion.split(".");
  var major = semver[0];
  var minor = semver[1];
  var build = semver[2];
  
  if (e.previousVersion != manifest.version) {
    chrome.storage.local.get("notifyOnUpdates", function(items) {
      switch (items.notifyOnUpdates) {
        case "silent":
          break;
        case "active":
          if (mainWindow) {
            showUpgradeNotification();
          } else {
            chrome.storage.local.set({pendingUpgradeNotification: true});
          }
          break;
        case "realtime":
        default:
          showUpgradeNotification();
          break;
      }
    });
  }
  
  // console.log("Upgrading Caret from version " + e.previousVersion);

  /*
  
  As with Android database upgrades, we'll perform these as a series of if statements, ordered by increasing version number. We should also provide a notification that the system is upgrading, and prevent opening new windows until the process finishes. In theory, this script shares a document with background.js, so they can just use a common flag to halt the openWindow process during upgrades.
  
  */

});

chrome.app.runtime.onLaunched.addListener(function(e) {
  chrome.storage.local.get(["pendingUpgradeNotification", "notifyOnUpdates"], function(items) {
    if (items.pendingUpgradeNotification && items.notifyOnUpdates !== "silent") {
      showUpgradeNotification();
    }
  });
});

chrome.notifications.onClicked.addListener(function(id) {
  if (id != notification) return;
  window.open("https://github.com/thomaswilburn/Caret/blob/master/changelog.rst", "target=_blank");
});