define(["util/chromePromise"], function(chromeP) {
  
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
    get: async function(key) {
      if (cache) {
        return decode(key);
      }

      if (!pending) pending = new Promise(async function(ok, fail) {
        var all = await chromeP.storage.sync.get();
        cache = all;
        pending = null;
        ok();
      });

      return pending.then(_ => decode(key));
    },
    set: async function(key, data) {
      console.log("cleared cache");
      cache = null;
      var hash = {};
      if (data.length < 3000) {
        hash[key] = data;
      } else {
        var chunks = [];
        for (var i = 0; i < data.length; i += 3000) {
          chunks.push(data.substr(i, 3000));
        }
        hash[key] = chunks.length;
        chunks.forEach((chunk, i) => hash[key + i] = chunk);
      }
      await chromeP.storage.sync.set(hash);
    },
    remove: async function(key) {
      var seed = cache[key];  
      if (typeof seed == "number") {
        var all = new Array(seed).map(i => chromeP.storage.sync.remove(key + i));
        return Promise.all(all);
      }
      cache = null;
      await chromeP.storage.sync.remove(key, ok);
    }
  }
  
  
});