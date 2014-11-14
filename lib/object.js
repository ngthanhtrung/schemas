'use strict';

var _ = require('lodash');
var schemaField = require('./field');

function defineHiddenProperty(obj, prop, value) {
  Object.defineProperty(obj, prop, {
    configurable: false,
    enumerable: false,
    writable: true,
    value: value
  });
}

// Prototype of object constructor created by SchemaObject
var proto = {};

// TODO: JSDoc
exports.Object = function (schema, options) {
  var self = this;

  schema = schema || {};
  options = options || {};

  // All schema fields are normalized
  _.each(schema, function (field, name) {
    schema[name] = schemaField.normalize.call(self, field, name);
  });

  // Return a schema object, which also is a schema-aware object constructor
  var schemaObject = function (defaults) {
    var self = this;

    // Public version of self.
    // Will be overwritten with proxy if available.
    defineHiddenProperty(this, '_this', this);

    // Object used to store values internally
    defineHiddenProperty(this, '_obj', {});

    defineHiddenProperty(this, '_schema', schema);
    defineHiddenProperty(this, '_options', options);
    defineHiddenProperty(this, '_errors', []);

    _.each(schema, function (field, name) {
      // Use getter/typecast to intercept and re-route, transform, etc.
      schemaField.defineGetter.call(self, name, field);
      schemaField.defineSetter.call(self, name, field);
    });

    // Initialize default values
    if (_.isObject(defaults)) {
      _.each(defaults, function (value, key) {
        self[key] = value;
      });
    }
  };

  // Inherits common methods from SchemaObject class
  defineHiddenProperty(schemaObject, '__type__', 'SchemaObject');
  schemaObject.prototype = proto;

  return schemaObject;
};

var toObject = function (method) {
  var self = this;
  var ret = {};

  // Populate all fields in schema
  _.each(this._schema, function (field, name) {
    // Do not return invisible fields
    if (field.invisible) {
      return;
    }

    var value = self._this[name];

    // Clone array
    if (field.type === 'array') {
      ret[name] = value.slice(0);

    // Clone object
    } else if (field.type === 'object') {
      // Call delegation method if available.
      // This allows us to return primitive objects instead of `SchemaObject`s.
      if(_.isFunction(value[method])) {
        ret[name] = value[method]();

      // If is not a `SchemaObject`, shallow clone so that
      // field modification does not affect the original object
      } else /* istanbul ignore else */ if(_.isObject(value)) {
        ret[name] = _.clone(value);
      }

    // Clone date object
    } else if (field.type === 'date') {
      ret[name] = new Date(value.getTime());

      if (_.isFunction(ret[name][method])) {
        ret[name] = ret[name][method]();
      }

    // Values which do not need to be cloned
    } else {
      ret[name] = value;
    }
  });

  // If options contains delegation method, pass through it before returning final object
  if (_.isFunction(this._options[method])) {
    var transformed = this._options[method].call(this, ret);

    if (typeof transformed  !== 'undefined') {
      ret = transformed;
    }
  }

  return ret;
};

// TODO: JSDoc
proto.toObject = function () {
  return toObject.call(this, 'toObject');
};

proto.toJSON = function () {
  return toObject.call(this, 'toJSON');
};

// TODO: JSDoc
proto.clear = function () {
  this._obj = {};
};

// TODO: JSDoc
proto.getErrors = function () {
  return this._errors;
};

// TODO: JSDoc
proto.clearErrors = function () {
  this._errors = [];
};
