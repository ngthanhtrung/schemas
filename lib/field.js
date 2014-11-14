'use strict';

var _ = require('lodash');

var SchemaArray = require('./array').Array;
var schemaObject = require('./object');

exports.isNumeric = function (n) {
  return (!isNaN(parseFloat(n, 10)) && isFinite(n));
};

exports.normalize = function (field, name) {
  // Check if user has passed a raw type (`String`, `Number`, etc.) or a hash
  if (field) {
    // Raw type is passed, translate it to `{ type: RawType }`
    if (_.isUndefined(field.type)) {
      field = { type: field };

    // Hash is passed, shallow copy it before processing.
    // User can pass his own custom type and we don't want to modify that object.
    } else {
      field = _.assign({}, field);
    }
  }

  // Field with type of `null` or `undefined` should allow any value
  if (field == null || field.type == null) {
    field || (field = {});
    field.type = 'any';
  }

  // User can pass a custom type and then extend it, for example:
  //
  // ```js
  // var RequiredString = {
  //   type: String,
  //   required: true
  // };
  //
  // var Article = new SchemaObject({
  //   title: {
  //     type: RequiredString,
  //     maxLength: 1024
  //   },
  //   content: String
  // });
  // ```
  //
  // In this example, `title` field is defined with type `RequiredString`
  // and then is extended with `maxLength` property.
  //
  // The code block below is for handling this case.
  if (_.isObject(field.type) && !_.isUndefined(field.type.type)) {
    _.each(field.type, function(value, key) {
      if (_.isUndefined(field[key])) {
        field[key] = value;
      }
    });

    field.type = field.type.type;
  }

  // Raw type will be converted to its string representation, for example:
  //
  // `String` -> `'String'`
  // `Number` -> `'Number'`
  // etc.
  //
  // It will be transformed to lowercase then.
  if (_.isFunction(field.type) && field.type.name) {
    field.type = field.type.name;
  }

  if (_.isString(field.type)) {
    field.type = field.type.toLowerCase();
  }

  // Field with type of `[ ItemType ]` will be converted to `{ type: 'array', itemType: ItemType }`
  if (_.isArray(field.type)) {
    /* istanbul ignore else */
    if (_.size(field.type)) {
      // Fields will be normalized when array is initialized
      field.itemType = field.type[0];
    }
    field.type = 'array';
  }

  // Field with type of `{}` or `SchemaObject`
  // will be converted to `{ type: 'object', objectType: SchemaObject }`
  if (!_.isString(field.type)) {
    if (_.isFunction(field.type)) {
      field.objectType = field.type;

    } else /* istanbul ignore else */ if (_.isObject(field.type)) {
      /* istanbul ignore else */
      if (_.size(field.type)) {
        field.objectType = new schemaObject.Object(field.type);
      }
    }

    field.type = 'object';
  }

  // `name` is used to show what field has errors on validation
  if (name) {
    field.name = name;
  }

  return field;
};

exports.typecast = function (value, originalValue, field) {
  if (field.transform) {
    value = field.transform.call(this, value, originalValue, field);
  }

  switch (field.type) {
    case 'string':
      if (_.isObject(value) || _.isArray(value)) {
        throw new TypeError('TBD');
      }

      if (value == null) {
        return value;
      }

      value = value + '';

      if (field.stringTransform) {
        value = field.stringTransform.call(this, value, originalValue, field);
      }

      if (field.truncate && !_.isUndefined(field.maxLength)) {
        value = value.substr(0, field.maxLength);
      }

      if (_.isArray(field.enum) && !~field.enum.indexOf(value)) {
        throw new TypeError('TBD');
      }

      if (!_.isUndefined(field.minLength) && value.length < field.minLength) {
        throw new TypeError('TBD');
      }

      if (!_.isUndefined(field.maxLength) && value.length > field.maxLength) {
        throw new TypeError('TBD');
      }

      if (field.regex && !field.regex.test(value)) {
        throw new TypeError('TBD');
      }

      return value;

    case 'number':
      if (_.isBoolean(value)) {
        value = (value ? 1 : 0);
      }

      if (_.isArray(value) || _.isObject(value) || !exports.isNumeric(value)) {
        throw new TypeError('TBD');
      }

      value = value * 1;

      if (field.numberTransform) {
        value = field.numberTransform.call(this, value, originalValue, field);
      }

      if (!_.isUndefined(field.min) && value < field.min) {
        throw new TypeError('TBD');
      }

      if (!_.isUndefined(field.max) && value > field.max) {
        throw new TypeError('TBD');
      }

      return value;

    case 'boolean':
      if (value === 'false') {
        return false;
      }

      value = (value ? true : false);

      if (field.booleanTransform) {
        value = field.booleanTransform.call(this, value, originalValue, field);
      }

      return value;

    case 'array':
      if (_.isObject(value)) {
        value = _.toArray(value);
      }

      if (!_.isArray(value)) {
        value = [];
      }

      // Arrays are never set directly.
      // Instead, the values are copied to the existing SchemaArray instance.
      originalValue.length = 0;

      _.each(value, function (item) {
        originalValue.push(item);
      });

      return originalValue;

    case 'object':
      /* istanbul ignore else */
      if (!_.isObject(value)) {
        value = {};
      }

      if (field.objectType) {
        var schemaObject;

        if (!_.isUndefined(originalValue)) {
          schemaObject = originalValue;
          schemaObject.clear();
        } else {
          schemaObject = new field.objectType();
        }

        _.each(value, function(v, k) {
          schemaObject[k] = v;
        });

        value = schemaObject;
      }

      return value;

    case 'date':
      if (_.isString(value)) {
        value = Date.parse(value);
      }

      if (_.isNumber(value)) {
        value = new Date(value);
      }

      if (!_.isDate(value) || isNaN(value.getTime())) {
        throw new TypeError('TBD');
      }

      if (field.dateTransform) {
        value = field.dateTransform.call(this, value, originalValue, field);
      }

      return value;
  }

  return value;
};

exports.defineGetter = function (name, field) {
  var self = this;
  var realName = (field.type === 'alias' ? field.target : name);

  this.__defineGetter__(name, function () {
    try {
      var value = self._obj[realName];

      if (_.isUndefined(value) && !_.isUndefined(field.default)) {
        value = exports.typecast.call(
          this,
          (_.isFunction(field.default) ? field.default.call(this) : field.default),
          value,
          field
        );
      }

      return value;

    } catch (err) {
      self._errors.push(err);
    }
  });
};

exports.defineSetter = function (name, field) {
  var self = this;
  var writeValue = exports.writeValue;

  this.__defineSetter__(name, function (value) {
    if (field.readOnly) {
      return;
    }

    try {
      value = exports.typecast.call(self, value, self._this[name], field);
      writeValue.call(self._this, value, field);

    } catch (err) {
      self._errors.push(err);
    }
  });

  /* istanbul ignore else */
  if (field.type !== 'alias') {
    var value;

    if (field.type === 'object') {
      if (field.default) {
        if (_.isFunction(field.default)) {
          value = field.default.call(this);
        } else {
          value = _.clone(field.default);
        }
      } else {
        /* istanbul ignore next */
        value = (field.objectType ? new field.objectType() : {});
      }
    } else if (field.type === 'array') {
      value = new SchemaArray(self, field);
    }

    writeValue.call(self._this, value, field);
  }
};

exports.writeValue = function (value, field) {
  if (_.isFunction(this._options.onBeforeValueSet)) {
    if (this._options.onBeforeValueSet.call(this, value, field.name) === false) {
      return;
    }
  }

  if (field.type === 'alias') {
    this[field.target] = value;
    return;
  }

  this._obj[field.name] = value;

  if (_.isFunction(this._options.onValueSet)) {
    this._options.onValueSet.call(this, value, field.name);
  }
};
