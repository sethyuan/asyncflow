# asyncflow

## 1 Phrase Description

asyncflow is an expressive, capable and easy to use async flow library based on [node-fibers](https://github.com/laverdet/node-fibers).

## Features

* Write asynchronous code in synchronous style
* Wrap existing async functions to call them in synchronous style
* Exceptions are supported and thrown in typical JavaScript fashion
* Concurrency limit is easily expressed
* Parallel calls and parallel collection functions are also supported

## Installation

```bash
$ npm install asyncflow
```

## Quick Example

Say NO to callback hell.

```js
var flow = require("asyncflow");

var query = flow.wrap(db.query);
var writeBack = flow.wrap(db.writeBack);

flow(function() {
  var data = query("...").wait();
  if (data.length > 1) {
    // These two writeBacks will run in parallel.
    var ok1 = writeBack("...", data[0]);
    var ok2 = writeBack("...", data[1]);
    if (ok1.wait() && ok2.wait()) {
      console.log("Successful write back");
    }
  } else {
    data = query("xxx").wait();
    writeBack("...", data).wait();
  }
});
```

The above example code demonstrates some of the magic of **asyncflow**. The wrapped functions `query` and `writeBack` runs in a synchronous maner within the _flow block_. Behind the scenes however, none of the code above blocks the Node.js event loop for waiting at any moment.

Now, imagine writing this logic using nested callbacks...

## Documentation

Read the [Tutorial](https://github.com/sethyuan/asyncflow/wiki/Tutorial) to get started and know how to use **asyncflow**.

Read the [Guide](https://github.com/sethyuan/asyncflow/wiki/Guide) to understand the various important concepts.

Read the [API](https://github.com/sethyuan/asyncflow/wiki/API) to know what's available.

## License

(The MIT License)

Copyright (c) 2013 Seth Yuan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
