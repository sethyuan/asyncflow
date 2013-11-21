/**
  @module asyncflow
*/

"use strict";

var Fiber = require("fibers");

function asyncflow(/*limit, f*/) {
  var limit, f;

  if (typeof(arguments[0]) === "number") {
    limit = arguments[0] < 1 ? Number.POSITIVE_INFINITY : arguments[0];
    f = arguments[1];
  } else {
    limit = Number.POSITIVE_INFINITY;
    f = arguments[0];
  }

  var fiber = Fiber(f);
  if (limit < Number.POSITIVE_INFINITY) {
    fiber.flow = new Flow(limit);
  }
  fiber.run();
};

function wrap(o) {
  if (typeof(o) === "object") return wrapModule(o);
  if (typeof(o) === "function") return wrapFunction(o);
  throw new Error("o should be either a module or a function.");
};

// cwrap for mnemonic for custom wrap.
function cwrap(f, n) {
  if (typeof(n) !== "number" || n < 1) n = 1;

  return function cwrapper() {
    var args = arguments;
    if (args.length !== n) {
      args = Array.prototype.slice.call(args, 0, n);
    }
    return new Future(f, args);
  };
}

function forEach(arr /*, limit, f, cb*/) {
  var limit = arguments.length > 3 ? arguments[1] : Number.POSITIVE_INFINITY;
  var f = arguments[arguments.length - 2];
  var cb = arguments[arguments.length - 1];

  asyncflow(limit, function() {
    try {
      arr.map(f).forEach(function(r) { r.wait() });
      cb(null);
    } catch (e) {
      cb(e);
    }
  });
}

function map(arr /*, limit, f, cb*/) {
  var limit = arguments.length > 3 ? arguments[1] : Number.POSITIVE_INFINITY;
  var f = arguments[arguments.length - 2];
  var cb = arguments[arguments.length - 1];

  asyncflow(limit, function() {
    try {
      var result = arr.map(f).map(function(r) { return r.wait() });
      cb(null, result);
    } catch (e) {
      cb(e);
    }
  });
}

function wrapModule(m) {
  var newm = {};
  var keys = Object.keys(m);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var obj = m[key];
    if (!/Sync$/.test(key) && typeof(obj) === "function") {
      newm[key] = wrapFunction(obj);
    }
  }
  return newm;
}

function wrapFunction(f) {
  return function wrapper() {
    return new Future(f, arguments);
  };
}


/**
  Flow class.
*/
function Flow(limit) {
  this.limit = limit;
  Object.defineProperty(this, "futureStack_", {
    enumerable: false,
    writable: true,
    value: []
  });
  Object.defineProperty(this, "runningNum_", {
    enumerable: false,
    writable: true,
    value: 0
  });
}

Flow.prototype.registerFuture = function(future) {
  this.futureStack_.push(future);
  this.scheduleFuture_();
};

Flow.prototype.futureFinished = function(future) {
  this.runningNum_--;
  this.scheduleFuture_();
};

Flow.prototype.scheduleFuture_ = function() {
  var futures = this.futureStack_;
  if (this.runningNum_ < this.limit && futures.length > 0) {
    var future = futures.shift();
    this.runningNum_++;
    future.run();
  }
};

Object.defineProperty(Flow.prototype, "scheduleFuture_", {enumerable: false});


/**
  Future class.
*/
function Future(f, args) {
  var self = this;

  function run() {
    args[args.length] = function cb() {
      switch (arguments.length) {
      case 0:
        self.result = null;
        break;
      case 1:
        self.result = arguments[0];
        break;
      default:
        var err = arguments[0];
        if (err) throw err;
        if (arguments.length === 2) {
          self.result = arguments[1];
        } else {
          self.result = Array.prototype.slice.call(arguments, 1);
        }
        break;
      }
      if (self.flow_) self.flow_.futureFinished();
      var caller = self.caller;
      if (caller) caller.run();
    };
    args.length++;
    f.apply(undefined, args);
  }
  this.run = run;

  var flow = Fiber.current.flow;
  if (flow) {
    Object.defineProperty(this, "flow_", {
      enumerable: false,
      writable: true,
      value: flow
    });
    flow.registerFuture(this);
  } else {
    run();
  }
}

Future.prototype.wait = function() {
  var result = this.result;
  if (result !== undefined) {
    if (result instanceof Error) {
      result.stack += "\n" + trimErrorStack(new Error().stack, 1);
      throw result;
    } else {
      return result;
    }
  }
  this.caller = Fiber.current;
  Fiber.yield();
  result = this.result;
  if (result instanceof Error) {
    result.stack += "\n" + trimErrorStack(new Error().stack, 1);
    throw result;
  } else {
    return result;
  }
};

function trimErrorStack(stack, lines) {
  var index = -1;
  while (lines-- > 0) {
    index = stack.indexOf("\n", index + 1);
  }
  return stack.substring(index + 1);
}


// Exports
asyncflow.wrap = wrap;
asyncflow.cwrap = cwrap;
asyncflow.forEach = forEach;
asyncflow.map = map;
asyncflow.wrapped = {
  forEach: asyncflow.wrap(forEach),
  map: asyncflow.wrap(map)
};
asyncflow.extension = {
  wrap: function() { return asyncflow.wrap(this) },
  collection: function(method) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this);
      return asyncflow.wrapped[method].apply(undefined, args);
    }
  },
  collectionAsync: function(method) {
    return function() { return asyncflow[method](this) };
  }
};
module.exports = asyncflow;
