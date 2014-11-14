'use strict';

var inherits = require('util').inherits;
var _ = require('lodash');

var schemaField = require('./field');

var push = [].push;
var map = [].map;

var SchemaArray = exports.Array = function (self, field) {
  this._self = self;
  this._field = field || {};

  if (this._field.itemType) {
    this._field.itemType = schemaField.normalize.call(
      this._self,
      this._field.itemType
    );
  }
};

inherits(SchemaArray, Array);

SchemaArray.prototype.push = function () {
  var values;

  if (this._field.itemType) {
    values = map.call(arguments, function (value) {
      return schemaField.typecast.call(this._self, value, undefined, this._field.itemType);
    }, this);
  } else {
    values = arguments;
  }

  if (this._field.unique) {
    values = _.uniq(values);
    values = _.difference(values, _.toArray(this));
  }

  return push.apply(this, values);
};
