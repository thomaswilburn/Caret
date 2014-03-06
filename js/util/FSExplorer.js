define(['lib/async'], function(async) {
  var FSExplorer = function(entry) {
    this.entry = entry;
  }
  FSExplorer.prototype = {
    run: function(onProgress, onDone, onError) {
      if (this.currentRunner !== undefined) {
        this.currentRunner.stop();
      }

      var loadRequested = {};
      var loadDone = {};
      var loadFirstItems = [];
      var mustStop = false;

      var explore = function(entry, cb) {
        if (mustStop)
          return cb('stopped');

        var collect = function(list) {
          if (mustStop)
            return cb('stopped');

          loadDone[entry.fullPath] = true;
          if (!mustStop)
            onProgress({entry: entry, status: 'done', items: list});

          if (list.length > 0) {
            directories = list.filter(function(item) { return item.isDirectory; });
            if (directories.length > 0) {
              return async.eachSeries(directories, explore, cb);
            }
          }

          cb();
        };

        loadRequested[entry.fullPath] = true;

        var startJob = function(cb) {
          if (mustStop)
            return cb('stopped');

          if (!loadDone[entry.fullPath]) {
            var reader = entry.createReader();

            if (!mustStop)
              onProgress({entry: entry, status: 'loading'});

            // setTimeout(function() {reader.readEntries(collect, cb)}, 300);
            reader.readEntries(collect, cb);
          } else {
            // item already done, skipping
            cb();
          }
        }

        if (loadFirstItems.length > 0) {
          // loadFirstItems detected, prioritizing
          var items = loadFirstItems.splice(0);
          async.each(items, function(item, cb2) {
            if (mustStop)
              return cb2('stopped');

            entry.getDirectory(item, {},
              function(entry) {
                explore(entry, cb2);
              },
              function(err) {
                cb2(mustStop && 'stopped' || undefined);
              });
          },
          function(err) {
            if (err)
              return onError(err);
            startJob(cb);
          });
        } else {
          startJob(cb);
        }
      }

      var loadFirst = function(path) {
        if (loadRequested[path])
          return false;

        loadRequested[path] = true;
        loadFirstItems.push(path);
        return true;
      }

      var stop = function() {
        mustStop = true;
      }

      var self = this;
      explore(this.entry, function(err) {
        if (err)
          return onError(err);
        onDone();
      });

      this.currentRunner = {
        loadFirst: loadFirst,
        stop: stop
      };
    },
    loadFirst: function(path) {
      if (this.currentRunner === undefined)
        return;
      return this.currentRunner.loadFirst(path);
    },
    stop: function() {
      if (this.currentRunner === undefined)
        return;
      this.currentRunner.stop();
    }
  }

  return FSExplorer;
})