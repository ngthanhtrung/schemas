'use strict';

var schemas = require('../..');

describe('schemas', function () {
  it('should create new SchemaObject', function () {
    var ret = schemas({ name: String });
    expect(ret).to.have.property('__type__', 'SchemaObject');
  });
});
