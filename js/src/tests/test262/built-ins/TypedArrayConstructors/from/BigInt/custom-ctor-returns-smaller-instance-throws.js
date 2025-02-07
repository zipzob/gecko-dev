// Copyright (C) 2016 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
es6id: 22.2.2.1
esid: sec-%typedarray%.from
description: >
  Throws a TypeError if a custom `this` returns a smaller instance
info: |
  %TypedArray%.from ( source [ , mapfn [ , thisArg ] ] )

  ...
  7. If usingIterator is not undefined, then
    a. Let values be ? IterableToList(source, usingIterator).
    b. Let len be the number of elements in values.
    c. Let targetObj be ? TypedArrayCreate(C, «len»).
  ...
  10. Let len be ? ToLength(? Get(arrayLike, "length")).
  11. Let targetObj be ? TypedArrayCreate(C, « len »).
  ...
includes: [testBigIntTypedArray.js]
features: [BigInt, Symbol.iterator, TypedArray]
---*/

var sourceItor = [1n, 2n];
var sourceObj = {
  length: 2
};

testWithBigIntTypedArrayConstructors(function(TA) {
  var ctor = function() {
    return new TA(1);
  };
  assert.throws(TypeError, function() {
    TA.from.call(ctor, sourceItor);
  }, "source is using iterator");

  assert.throws(TypeError, function() {
    TA.from.call(ctor, sourceObj);
  }, "source is not using iterator");
});

reportCompare(0, 0);
