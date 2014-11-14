'use strict';

var SchemaObject = require('./object').Object;

exports = module.exports = function (schema, options) {
  return new SchemaObject(schema, options);
};

exports.field = require('./field');
exports.Array = require('./array').Array;
exports.Object = SchemaObject;
