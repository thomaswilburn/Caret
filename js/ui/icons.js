var xhr = new XMLHttpRequest();
xhr.open("GET", "http://fonts.gstatic.com/s/materialicons/v17/2fcrYFNaTjcS6g4U3t-Y5ZjZjT5FdEJ140U2DJYC3mY.woff2", true);
xhr.responseType = "blob";
xhr.onreadystatechange = function() {
    console.log("STATE", xhr.readyState);
    if (xhr.readyState == 4) {
        var myfontblob = window.URL.createObjectURL(xhr.response);
        var newStyle = document.createElement('style');
        newStyle.appendChild(document.createTextNode("\
        @font-face {\
            font-family: 'Material Icons';\
            font-style: normal;\
            font-weight: 400;\
            src: local('Material Icons'), local('MaterialIcons-Regular'), url('" + myfontblob + "') format(woff);\
        }\
        "));
        document.head.appendChild(newStyle);
    }
};
xhr.send();