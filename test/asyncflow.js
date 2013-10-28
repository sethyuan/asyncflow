"use strict";

var flow = require("../");
var expect = require("chai").expect;
var fs = require("fs");

describe("flow", function() {
  it("wrap a function", function(done) {
    var readdir = flow.wrap(fs.readdir);
    flow(function() {
      var files = readdir(__dirname).val();
      expect(files).to.have.length.of.at.least(1);
      done();
    });
  });

  it("deeper calls", function(done) {
    var readdir = flow.wrap(fs.readdir);
    function foo(cb) {
      flow(function() {
        var files = readdir(__dirname).val();
        cb(null, files);
      });
    }
    var fooo = flow.wrap(foo);
    flow(function() {
      var files = fooo().val();
      expect(files).to.have.length.of.at.least(1);
      done();
    });
  });

  // it("wrap a module", function(done) {
  //   var fs = flow.wrap(require("fs"));
  //   flow(function() {
  //     var files = fs.readdir(__dirname).val();
  //     expect(files).to.have.length.of.at.least(1);
  //     done();
  //   });
  // });

  it("extending function", function(done) {
    Function.prototype.wrap = function() { return flow.wrap(this) };
    var readdir = fs.readdir.wrap();
    flow(function() {
      var files = readdir(__dirname).val();
      expect(files).to.have.length.of.at.least(1);
      done();
    });
  });

  // it("extending module", function(done) {
  //   Object.prototype.wrap = function() { return flow.wrap(this) };
  //   var fs = require("fs").wrap();
  //   flow(function() {
  //     var files = fs.readdir(__dirname).val();
  //     expect(files).to.have.length.of.at.least(1);
  //     done();
  //   });
  // });

  it("parallel calls", function(done) {
    var readdir = flow.wrap(fs.readdir);
    flow(function() {
      var files = readdir(__dirname);
      var files2 = readdir(__dirname + "/..");
      expect(files.val()).to.have.length.of.at.least(1);
      expect(files2.val()).to.have.length.of.at.least(1);
      done();
    });
  });

  // it("limited parallel calls", function(done) {
  //   var fs = flow.wrap(require("fs"));
  //   flow(2, function() {
  //     var files = fs.readdir(__dirname);
  //     var files2 = fs.readdir(__dirname + "/..");
  //     expect(files.val()).to.have.length.of.at.least(1);
  //     expect(files2.val()).to.have.length.of.at.least(1);
  //     done();
  //   });
  // });

  // it("parallel collections", function(done) {
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
