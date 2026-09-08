/* Allows importing server modules (which import `server-only`) from Node scripts. */
const Module = require('node:module');
const path = require('node:path');
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'server-only') return path.join(__dirname, 'empty.cjs');
  return original.call(this, request, ...rest);
};
