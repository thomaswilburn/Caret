chrome.app.runtime.onLaunched.addListener(function(launchData) {
    //launchData.items will contain files from file manager
    chrome.app.window.create("main.html", {
        bounds: {
            width: 800,
            height: 600,
            left: 0,
            top: 0
        }
    });
});