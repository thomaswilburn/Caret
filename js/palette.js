define(["sessions", "command", "editor", "dom2"], function(sessions, command, editor) {
  
  /*
  
  Palette's going to need some refactoring:
    - when querying, set the results list. Results are attached to the element via JSON.
    - need separate method for handing a result over to be located, so it can be done from query and from list
    - should probably separate out parsing for commands and for content into two methods.
    - all in all, needs to be more of a component, less of dom spaghetti
  */
  
  var palette = document.find(".palette");
  var input = palette.find("input");
  var resultList = palette.find(".results");
  var resultTemplate = document.find("#palette-result").content;
  var isCommand = false;
  
  var last = null;
  
  var re = {
    file: /^([^:#@]*)/,
    line: /:(\d*)/,
    reference: /@([^:#]*)/,
    search: /#([^:@]*)/
  };
  
  var prefixes = {
    ":": "line",
    "@": "reference",
    "#": "search"
  };
  
  var modes = {
    "line": ":",
    "search": "#",
    "reference": "@"
  };
  
  var parseRequest = function(query) {
    var first = query[0];
    var mode = prefixes[first] || isCommand ? "command" : "file";
    var results = [];
    
    if (isCommand) {
      
      //search for commands in menus, keys, ace
      
    } else {
    
      //search through files for query results
      var file = re.file.test(query) && re.file.exec(query)[1];
      var line = re.line.test(query) && Number(re.line.exec(query)[1]);
      var search = re.search.test(query) && re.search.exec(query)[1];
      var reference = re.reference.test(query) && re.reference.exec(query)[1];
      
      var openFileNames = sessions.getFilenames();
      var tabs;
      
      if (file) {
        var fuzzyFile = new RegExp(file.split("").join(".*"));
        var matches = openFileNames.filter(function(name) {
          return fuzzyFile.test(name);
        });
        tabs = matches.map(sessions.getTabByName);
        results.push(matches.join(", "));
      } else {
        results.push("File: current file");
        tabs = [ sessions.getCurrent() ];
      }
      
      if (line) {
        results.push("Line: " + line);
      }
      
      if (search) {
        results.push("Search: " + search);
      }
      
      if (reference) {
        results.push("Reference: " + reference);
      }
      
    }
    
    resultList.innerHTML = "";
    results.forEach(function(r, i) {
      var element = resultTemplate.cloneNode(true).find("li");
      element.innerHTML = r;
      if (!i) {
        element.classList.add("current");
      }
      element.setAttribute("data-result", JSON.stringify(r));
      resultList.appendChild(element);
    });
    
    var firstResult = results[0];
    if (firstResult) {
      //goto tab, location selected
    }
  };
  
  var navigateList = function() {};
  
  command.on("palette:open", function(mode) {
    palette.classList.add("active");
    isCommand = mode == "command";
    palette.find(".mode").innerHTML = isCommand ?
      "Command:" : "Go To:"
    input.value = modes[mode] || "";
    input.focus();
    //store starting position
    sessions.saveLocation();
  });
  
  input.on("blur", function() {
    palette.classList.remove("active");
    if (last) {
      //restore position on cancel
      sessions.restoreLocation();
    }
  });
  
  input.on("keydown", function(e) {
    if (e.keyCode == 27) {
      return input.blur();
    }
    if (e.keyCode == 38 || e.keyCode == 40) {
      navigateList(e.keyCode == 38 ? "up" : "down");
    }
  });
  
  input.on("keyup", function(e) {
    parseRequest(input.value);
  });
  
});