'use strict';

exports.mockSchemaObject = function (defaults, options) {
  var ret = {
    _obj: defaults || {},
    _options: options || {},
    _errors: []
  };

  ret._this = ret;

  return ret;
};
