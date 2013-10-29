/**
  @module asyncflow
*/

"use strict";

var Fiber = require("fibers");
var util = require("util");

function asyncflow(/*limit, f*/) {
  var limit, f;

  if (typeof(arguments[0]) === "number") {
    limit = arguments[0] < 1 ? Number.POSITIVE_INFINITY : arguments[0];
    f = arguments[1];
  } else {
    limit = Number.POSITIVE_INFINITY;
    f = arguments[0];
  }

  var fiber = new Fiber(f);
  fiber.flow = new Flow(limit);
  fiber.run();
  // var caller = Fiber.current;
  // var fiber = new Fiber(function() {
  //   f();
  //   var caller = Fiber.current.caller;
  //   if (caller) caller.run();
  // });
  // fiber.flow = new Flow(limit);
  // fiber.run();
  // if (caller && fiber.started) {
  //   fiber.caller = caller;
  //   Fiber.yield();
  // }
};

function wrap(o) {
  if (typeof(o) === "object") return wrapModule(o);
  if (typeof(o) === "function") return wrapFunction(o);
  throw new Error("o should be either a module or a function.");
};

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
  this.futureStack_ = [];
  this.runningFutures_ = {};
  this.runningNum_ = 0;
  Object.defineProperty(this, "futureStack_", {enumerable: false});
  Object.defineProperty(this, "runningFutures_", {enumerable: false});
  Object.defineProperty(this, "runningNum_", {enumerable: false});
}

Flow.prototype.registerFuture = function(future) {
  this.futureStack_.push(future);
  this.scheduleFuture_();
};

Flow.prototype.futureFinished = function(future) {
  delete this.runningFutures_[future];
  this.runningNum_--;
  this.scheduleFuture_();
};

Flow.prototype.scheduleFuture_ = function() {
  var futures = this.futureStack_;
  if (this.runningNum_ < this.limit && futures.length > 0) {
    var future = futures.shift();
    this.runningFutures_[future] = true;
    this.runningNum_++;
    future.fiber_.run();
  }
};

Object.defineProperty(Flow.prototype, "scheduleFuture_", {enumerable: false});


/**
  Future class.
*/
function Future(f, args) {
  var self = this;
  this.fiber_ = new Fiber(function() {
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
      var fiber = self.fiber_;
      if (fiber.started && fiber.yielded) {
        fiber.yielded = undefined;
        fiber.run();
      }
    };
    args.length++;
    try {
      f.apply(undefined, args);
      Fiber.current.yielded = true;
      Fiber.yield();
    } finally {
      if (self.flow_) self.flow_.futureFinished();
      var caller = self.fiber_.caller;
      if (caller !== undefined) caller.run();
    }
  });
  Object.defineProperty(this, "fiber_", {enumerable: false});
  var flow = Fiber.current.flow;
  if (flow) {
    // First level under an asyncflow.
    this.flow_ = flow;
    Object.defineProperty(this, "flow_", {enumerable: false});
    flow.registerFuture(this);
  } else {
    // Deeper level of an asyncflow.
    this.fiber_.run();
  }
}

Future.prototype.wait = function() {
  var result = this.result;
  if (result !== undefined) {
    if (result instanceof Error) throw result;
    else return result;
  }
  this.fiber_.caller = Fiber.current;
  Fiber.yield();
  result = this.result;
  if (result instanceof Error) throw result;
  else return result;
};


// Exports
asyncflow.wrap = wrap;
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
  }
};
module.exports = asyncflow;
