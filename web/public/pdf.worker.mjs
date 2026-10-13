// Polyfill ECMAScript Stage 3 proposals required by PDF.js v6.4.299 in Worker Scope
if (typeof Map !== "undefined" && !Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function (key, callback) {
    if (this.has(key)) return this.get(key);
    var val = callback();
    this.set(key, val);
    return val;
  };
}

if (typeof Uint8Array !== "undefined" && !Uint8Array.prototype.toHex) {
  Uint8Array.prototype.toHex = function () {
    return Array.from(this).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  };
}

if (typeof Math !== "undefined" && !Math.sumPrecise) {
  Math.sumPrecise = function (iterable) {
    var sum = 0;
    for (var n of iterable) sum += n;
    return sum;
  };
}

if (typeof Promise !== "undefined" && !Promise.withResolvers) {
  Promise.withResolvers = function () {
    var resolve;
    var reject;
    var promise = new Promise(function (res, rej) {
      resolve = res;
      reject = rej;
    });
    return { promise: promise, resolve: resolve, reject: reject };
  };
}

import "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.worker.min.mjs";
