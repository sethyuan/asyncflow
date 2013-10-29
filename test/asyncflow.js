"use strict";

var flow = require("../");
var expect = require("chai").expect;
var fs = require("fs");

describe("flow", function() {
  it("wrap a function", function(done) {
    var readdir = flow.wrap(fs.readdir);
    flow(function() {
      var files = readdir(__dirname).wait();
      expect(files).to.have.length.of.at.least(1);
      done();
    });
  });

  it("no yield", function(done) {
    var readdir = flow.wrap(fs.readdir);
    function foo(cb) {
      process.nextTick(function() {
        cb(null, []);
      });
    }
    var fooo = flow.wrap(foo);
    flow(function() {
      var files = fooo().wait();
      expect(files).to.have.length.of.at.least(0);
      done();
    });
  });

  it("error passed to callback", function(done) {
    function errorFunction(cb) {
      setTimeout(function() {
        cb(new Error("custom error"));
      }, 10);
    }

    var fun = flow.wrap(errorFunction);
    flow(function() {
      expect(fun().wait).to.throw(Error);
      done();
    });
  });

  it("error thrown in function", function(done) {
    function errorFunction(cb) {
      setTimeout(function() {
        cb(null);
      }, 10);
      throw new Error("custom error");
    }

    var fun = flow.wrap(errorFunction);
    flow(function() {
      expect(fun).to.throw(Error);
      done();
    });
  });

  it("deeper calls", function(done) {
    var readdir = flow.wrap(fs.readdir);
    function foo(cb) {
      flow(function() {
        var files = readdir(__dirname).wait();
        cb(null, files);
      });
    }
    var fooo = flow.wrap(foo);
    flow(function() {
      var files = fooo().wait();
      expect(files).to.have.length.of.at.least(1);
      done();
    });
  });

  it("nested flows", function(done) {
    var total = 0;

    function count(cb) {
      setTimeout(function() {
        total++;
        cb();
      }, 50);
    }

    var c = flow.wrap(count);

    flow(function() {
      c().wait();
      flow(function() {
        c().wait();
      });
      expect(total).to.equal(2);
      done();
    });
  });

  it("nested flows - no yield", function(done) {
    var total = 0;

    function count(cb) {
      setTimeout(function() {
        total++;
        cb();
      }, 50);
    }

    var c = flow.wrap(count);

    flow(function() {
      c().wait();
      flow(function() {
        c();
      });
      expect(total).to.equal(1);
      done();
    });
  });

  it("wrap a module", function(done) {
    var fs = flow.wrap(require("fs"));
    flow(function() {
      var files = fs.readdir(__dirname).wait();
      expect(files).to.have.length.of.at.least(1);
      done();
    });
  });

  it("extending function", function(done) {
    Function.prototype.wrap = function() { return flow.wrap(this) };
    var readdir = fs.readdir.wrap();
    flow(function() {
      var files = readdir(__dirname).wait();
      expect(files).to.have.length.of.at.least(1);
      done();
    });
  });

  it("extending module", function(done) {
    Object.prototype.wrap = function() { return flow.wrap(this) };
    var fs = require("fs").wrap();
    flow(function() {
      var files = fs.readdir(__dirname).wait();
      expect(files).to.have.length.of.at.least(1);
      done();
    });
  });

  it("parallel calls", function(done) {
    var readdir = flow.wrap(fs.readdir);
    flow(function() {
      var files = readdir(__dirname);
      var files2 = readdir(__dirname + "/..");
      expect(files.wait()).to.have.length.of.at.least(1);
      expect(files2.wait()).to.have.length.of.at.least(1);
      done();
    });
  });

  it("limited parallel calls", function(done) {
    var fs = flow.wrap(require("fs"));
    flow(2, function() {
      var files = fs.readdir(__dirname);
      var files2 = fs.readdir(__dirname + "/..");
      expect(files.wait()).to.have.length.of.at.least(1);
      expect(files2.wait()).to.have.length.of.at.least(1);
      done();
    });
  });

  it("parallel forEach", function(done) {
    var total = 0;

    function count(n, cb) {
      setTimeout(function() {
        total++;
        cb();
      }, 50);
    }

    var nums = [1, 2, 3, 4, 5];

    flow(function() {
      flow.forEach(nums, flow.wrap(function(n, i, a, cb) { count(n, cb) }));
      expect(total).to.equal(5);
      done();
    });
  });

  it("limited parallel forEach", function(done) {
    var total = 0;

    function count(n) {
      var cb = arguments[arguments.length - 1];
      setTimeout(function() {
        total++;
        cb();
      }, 50);
    }

    var c = flow.wrap(count);
    var nums = [1, 2, 3, 4, 5];

    var start = Date.now();
    flow(function() {
      flow.forEach(nums, 3, c);
      var end = Date.now();
      expect(total).to.equal(5);
      expect(end - start).to.be.above(100);
      done();
    });
  });

  // it("parallel map", function(done) {
  //   function incNumber(n, cb) {
  //     setTimeout(function() {
  //       cb(n + 1);
  //     }, 100);
  //   }

  //   var incnum = flow.wrap(incNumber);
  //   var nums = [1, 2, 3, 4, 5];

  //   flow(function() {
  //     var incnums = flow.map(nums, incnum);
  //     expect(incnums).to.have.length(nums.length);
  //     expect(incnums[0]).to.be.a("number");
  //     done();
  //   });
  // });

  // it("extending collections", function(done) {
  //   Array.prototype.pmap = function() { return flow.map(this) };

  //   function incNumber(n, cb) {
  //     setTimeout(function() {
  //       cb(n + 1);
  //     }, 100);
  //   }

  //   var incnum = flow.wrap(incNumber);
  //   var nums = [1, 2, 3, 4, 5];

  //   flow(function() {
  //     var incnums = nums.pmap(incnum);
  //     expect(incnums).to.have.length(nums.length);
  //     expect(incnums[0]).to.be.a("number");
  //     done();
  //   });
  // });

  // it("limited parallel collections", function(done) {
  //   function incNumber(n, cb) {
  //     setTimeout(function() {
  //       cb(n + 1);
  //     }, 100);
  //   }

  //   var incnum = flow.wrap(incNumber);
  //   var nums = [1, 2, 3, 4, 5];

  //   flow(function() {
  //     var incnums = flow.map(nums, 2, incnum);
  //     expect(incnums).to.have.length(nums.length);
  //     expect(incnums[0]).to.be.a("number");
  //     done();
  //   });
  // });
});
