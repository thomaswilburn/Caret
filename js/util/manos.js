define(function() {

  var slice = Array.prototype.slice;

  return {
    chain: function() {
      var fools = slice.call(arguments);
      var i = -1;
      var next = function() {
        i++;
        var f = fools[i];
        var args = slice.call(arguments);
        args.push(next);
        if (f) {
          f.apply(null, args);
        }
      };
      next();
    },
    map: function(a, f, c) {
      var mapped = [];
      var completed = 0;
      var check = function(index, value) {
        mapped[index] = value;
        completed++;
        if (completed == a.length) {
          c(mapped);
        }
      };
      for (var i = 0; i < a.length; i++) {
        f(a[i], i, check.bind(null, i));
      }
    },
    serial: function(a, f, c) {
      var i = -1;
      var next = function(result) {
        //early exit signal
        if (result === false) {
          if (c) return c(false);
        }
        i++;
        var item = a[i];
        if (typeof item == "undefined") {
          if (c) c();
        } else {
          f(item, next);
        }
      };
      next();
    },
    //promise-to-node -- tacks node-style callbacks onto a promise
    pton: function(promise, c) {
      promise.then(function(success) {
        c(null, success);
      }, function(err) {
        c(err);
      });
    },
    //mimic $.Deferred for less nesting.
    deferred: function() {
      var resolve, reject;
      var promise = new Promise(function(ok, fail) {
        resolve = ok;
        reject = fail;
      });
      
      return {
        done: resolve,
        fail: reject,
        then: promise.then.bind(promise),
        promise: function() { return promise }
      };
    }
  };

});