define(function() {
  /*
  SyncFS is a crappy way to use chrome.storage.sync for entries larger than 4KB.
  This will work until chrome.syncFileSystem is more offline-friendly.
  Entries are set with a string if they're less than 3KB, otherwise the keyed entry
  stores the number of 3KB chunks used, and those are stored at key + chunkNumber.
  */
  
  var cache = null;
  var requests = [];
  var pending = false;
  
  var decode = function(key) {
    //extracts multiple entries from a single key
    //presumes cache is set first
    var seed = cache[key];
    if (!seed) return null;
    if (typeof seed == "string") return seed;
    var pieces = [];
    for (var i = 0; i < seed; i++) {
      pieces.push(cache[key + i]);
    }
    var whole = pieces.join("");
    return whole;
  };
  
  return {
    get: function(key, callback) {
      if (cache) {
        var result = decode(key);
        return callback(result);
      }
      requests.push(callback);
      if (pending) return;
      
      chrome.storage.sync.get(function(all) {
        cache = all;
        var result = decode(key);
        return callback(result);
      });
    },
    set: function(key, data, callback) {
      cache = null;
      data = data;
      if (data.length < 3000) {
        var hash = {};
        hash[key] = data;
        chrome.storage.sync.set(hash, callback);
      } else {
        var chunks = [];
        for (var i = 0; i < data.length; i += 3000) {
          chunks.push(data.substr(i, i + 3000));
        }
        var hash = {};
        hash[key] = chunks.length;
        chunks.map(function(chunk, i) {
          hash[key + i] = chunk;
        });
        chrome.storage.sync.set(hash, callback)
      }
    },
    remove: function(key, callback) {
      var seed = cache[key];
      if (typeof seed == "number") {
        for (var i = 0; i < seed; i++) {
          chrome.storage.sync.remove(key + i);
        }
      }
      chrome.storage.sync.remove(key, callback);
      cache = null;
    }
  }
  
  
});