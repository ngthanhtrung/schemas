'use strict';

var schemas = require('../..');
var schemaField = schemas.field;
var SchemaArray = schemas.Array;
var SchemaObject = schemas.Object;

var util = require('../lib/util');

describe('schemas', function () {
  describe('.field', function () {
    describe('.isNumeric', function () {
      var isNumeric = schemaField.isNumeric;

      it('should check for numeric correctly', function () {
        expect(isNumeric(1)).to.be.true;
        expect(isNumeric(-2.23)).to.be.true;
        expect(isNumeric(-1e-2)).to.be.true;
        expect(isNumeric('.4')).to.be.true;
        expect(isNumeric('-.2e-2')).to.be.true;
        expect(isNumeric('0x27')).to.be.true;
        expect(isNumeric(' 1')).to.be.true;
        expect(isNumeric('1 ')).to.be.true;

        expect(isNumeric(NaN)).to.be.false;
        expect(isNumeric(Infinity)).to.be.false;
        expect(isNumeric(-Infinity)).to.be.false;
        expect(isNumeric(true)).to.be.false;
        expect(isNumeric('')).to.be.false;
        expect(isNumeric('a')).to.be.false;
        expect(isNumeric('10hello')).to.be.false;
      });
    });

    describe('.normalize', function () {
      var normalize = schemaField.normalize;

      it('should mark fields with type of null or undefined as type of "any"', function () {
        var emptyField = normalize(null);
        var emptyType = normalize({ type: null });

        expect(emptyField).to.deep.equal({ type: 'any' });
        expect(emptyType).to.deep.equal({ type: 'any' });
      });

      it('should convert raw types to their string representation', function () {
        expect(normalize(String)).to.deep.equal({ type: 'string' });
        expect(normalize(Number)).to.deep.equal({ type: 'number' });
        expect(normalize(Date)).to.deep.equal({ type: 'date' });
      });

      it('should extend user-defined types correctly', function () {
        var RequiredString = {
          type: String,
          required: true
        };
        var field = normalize({
          type: RequiredString,
          maxLength: 1024
        });

        expect(field).to.deep.equal({
          type: 'string',
          required: true,
          maxLength: 1024
        });
      });

      it('should handle array type correctly', function () {
        var field = normalize({
          type: [ String ]
        });

        expect(field).to.deep.equal({
          type: 'array',
          itemType: String // will be handled later by SchemaArray
        });
      });

      it('should convert object type to SchemaObject', function () {
        var field = normalize({
          type: {
            name: String,
            age: Number,
            school: {
              junior: String,
              high: String
            }
          }
        });

        expect(field).to.have.property('type', 'object');
        expect(field).to.have.property('objectType')
          .that.has.property('__type__', 'SchemaObject');
      });

      it('should keep SchemaObject untouched', function () {
        var User = new SchemaObject({
          name: String,
          age: Number
        });
        var field = normalize({ type: User });

        expect(field).to.have.property('type', 'object');
        expect(field).to.have.property('objectType', User);
      });
    });

    describe('.typecast', function () {
      var typecast = schemaField.typecast;

      it('should transform value', function () {
        var str = 'hello world';
        var transform = sinon.spy();
        var field = {
          type: 'string',
          transform: transform
        };

        typecast(str, undefined, field);

        expect(transform).to.have.been.calledOnce;
        expect(transform).to.have.been.calledWith(str, undefined, field);
      });

      it('should reject value which is object or array for "string" field', function () {
        var obj = {};
        var arr = [];

        expect(function () {
          typecast(obj, undefined, { type: 'string' });
        }).to.throw(TypeError);

        expect(function () {
          typecast(arr, undefined, { type: 'string' });
        }).to.throw(TypeError);
      });

      it('should keep null or undefined value untouched for "string" field', function () {
        var field = { type: 'string' };

        expect(typecast(null, undefined, field)).to.be.null;
        expect(typecast(undefined, undefined, field)).to.be.undefined;
      });

      it('should convert value to string', function () {
        var field = { type: 'string' };

        expect(typecast(1, undefined, field)).to.equal('1');
        expect(typecast(true, undefined, field)).to.equal('true');
      });

      it('should transform string value', function () {
        var stringTransform = sinon.spy();
        var field = {
          type: 'string',
          stringTransform: stringTransform
        };

        typecast('a', undefined, field);

        expect(stringTransform).to.have.been.calledOnce;
        expect(stringTransform).to.have.been.calledWith('a', undefined, field);
      });

      it('should truncate long string', function () {
        var field = {
          type: 'string',
          maxLength: 10,
          truncate: true
        };

        expect(typecast('13 characters', undefined, field))
          .to.equal('13 charact');
      });

      it('should validate string which has enumeration definition', function () {
        expect(function () {
          typecast('a', undefined, {
            type: 'string',
            enum: [ 'b' ]
          });
        }).to.throw(TypeError);
      });

      it('should validate minimum length of string', function () {
        var field = {
          type: 'string',
          minLength: 1
        };
        var test = function () {
          typecast('a', undefined, field);
        };

        expect(test).to.not.throw(TypeError);

        field.minLength = 2;
        expect(test).to.throw(TypeError);
      });

      it('should validate maximum length of string', function () {
        var field = {
          type: 'string',
          maxLength: 4
        };
        var test = function () {
          typecast('abcd', undefined, field);
        };

        expect(test).to.not.throw(TypeError);

        field.maxLength = 3;
        expect(test).to.throw(TypeError);
      });

      it('should validate string by its regular expression definition', function () {
        var field = {
          type: 'string',
          regex: /hello/
        };
        var test = function () {
          typecast('hello world', undefined, field);
        };

        expect(test).to.not.throw(TypeError);

        field.regex = /hi/;
        expect(test).to.throw(TypeError);
      });

      it('should handle boolean value correctly for "number" field', function () {
        var field = { type: 'number' };

        expect(typecast(true, undefined, field)).to.equal(1);
        expect(typecast(false, undefined, field)).to.equal(0);
      });

      it('should reject non-numeric value', function () {
        expect(function () {
          typecast('10gen', undefined, { type: 'number' });
        }).to.throw(TypeError);
      });

      it('should convert value to number', function () {
        var field = { type: 'number' };

        expect(typecast('.04', undefined, field)).to.equal(0.04);
        expect(typecast('.1e-1', undefined, field)).to.equal(0.01);
      });

      it('should transform numeric value', function () {
        var num = 100;
        var numberTransform = sinon.spy();
        var field = {
          type: 'number',
          numberTransform: numberTransform
        };

        typecast(num, undefined, field);

        expect(numberTransform).to.have.been.calledOnce;
        expect(numberTransform).to.have.been.calledWith(num, undefined, field);
      });

      it('should validate minimum value for "number" field', function () {
        var field = {
          type: 'number',
          min: 4
        };
        var test = function () {
          typecast(4, undefined, field);
        };

        expect(test).to.not.throw(TypeError);

        field.min = 5;
        expect(test).to.throw(TypeError);
      });

      it('should validate maximum value for "number" field', function () {
        var field = {
          type: 'number',
          max: 7
        };
        var test = function () {
          typecast(7, undefined, field);
        };

        expect(test).to.not.throw(TypeError);

        field.max = 6.9;
        expect(test).to.throw(TypeError);
      });

      it('should convert string value of "false" to false', function () {
        expect(typecast('false', undefined, { type: 'boolean' })).to.equal(false);
      });

      it('should convert value to boolean', function () {
        expect(typecast('a', undefined, { type: 'boolean' })).to.equal(true);
        expect(typecast(.1, undefined, { type: 'boolean' })).to.equal(true); // jshint ignore: line

        expect(typecast(null, undefined, { type: 'boolean' })).to.equal(false);
        expect(typecast('', undefined, { type: 'boolean' })).to.equal(false);
        expect(typecast(0, undefined, { type: 'boolean' })).to.equal(false);
      });

      it('should transform boolean value', function () {
        var bool = true;
        var booleanTransform = sinon.spy();
        var field = {
          type: 'boolean',
          booleanTransform: booleanTransform
        };

        typecast(bool, undefined, field);

        expect(booleanTransform).to.have.been.calledOnce;
        expect(booleanTransform).to.have.been.calledWith(bool, undefined, field);
      });

      it('should convert object value to array', function () {
        var arr = { 0: 'zero', 1: 'one', 2: 'two' };
        var schemaArr = new SchemaArray();
        var ret = typecast(arr, schemaArr, { type: 'array' });

        expect(ret).to.have.property(0, 'zero');
        expect(ret).to.have.property(1, 'one');
        expect(ret).to.have.property(2, 'two');
      });

      it('should reject invalid array', function () {
        expect(function () {
          typecast('a', undefined, { type: 'array' });
        }).to.throw(TypeError);
      });

      it('should convert to SchemaArray', function () {
        var arr = { 0: 'zero', 1: 'one', 2: 'two' };
        var schemaArr = new SchemaArray();
        var ret = typecast(arr, schemaArr, { type: 'array' });

        expect(ret).to.be.an.instanceOf(SchemaArray);
      });

      it('should ignore invalid object', function () {
        var ret = typecast(1, undefined, { type: 'object' });
        expect(ret).to.deep.equal({});
      });

      it('should clear and set values for SchemaObject if available', function () {
        var User = new SchemaObject({
          name: {
            type: String,
            default: 'Unnamed'
          },
          age: Number
        });
        var user = new User({
          name: 'John',
          age: 18
        });

        var ret = typecast({ age: 20 }, user, {
          type: 'object',
          objectType: User
        });

        expect(ret).to.equal(user);
        expect(ret).to.have.property('name', 'Unnamed');
        expect(ret).to.have.property('age', 20);
      });

      it('should created new SchemaObject if not available and set values then', function () {
        var User = new SchemaObject({
          name: {
            type: String,
            default: 'Unnamed'
          },
          age: Number
        });
        var ret = typecast(null, undefined, {
          type: 'object',
          objectType: User
        });

        expect(ret).to.have.property('name', 'Unnamed');
      });

      it('should convert string value to date', function () {
        var str1 = '2014/11/13 02:44:15 GMT+0700';
        var str2 = 'Thu Nov 13 2014 02:44:15 GMT+0700 (ICT)';

        var field = { type: 'date' };

        var d1 = typecast(str1, undefined, field);
        var d2 = typecast(str2, undefined, field);

        var value = new Date(1415821455000).toISOString();

        expect(d1.toISOString()).to.equal(value);
        // expect(d2.toISOString()).to.equal(value);
      });

      it('should convert numeric value to date', function () {
        var num = 1415821455000;
        var d = typecast(num, undefined, { type: 'date' });
        var value = new Date(1415821455000).toISOString();

        expect(d.toISOString()).to.equal(value);
      });

      it('should reject invalid date', function () {
        expect(function () {
          var str = '2014/30/10';
          typecast(str, undefined, { type: 'date' });
        }).to.throw(TypeError);
      });

      it('should transform date value', function () {
        var d = new Date(1415821455000);
        var dateTransform = sinon.spy();
        var field = {
          type: 'date',
          dateTransform: dateTransform
        };

        typecast(d, undefined, field);

        expect(dateTransform).to.have.been.calledOnce;
        expect(dateTransform).to.have.been.calledWith(d, undefined, field);
      });

      it('should accept any value for "any" field', function () {
        var values = [
          '&!^%@&',
          5198,
          { hello: 'world' },
          new Date(1415821455000)
        ];

        values.forEach(function (value) {
          expect(typecast(value, undefined, { type: 'any' })).to.equal(value);
        });
      });
    });

    describe('.defineGetter', function () {
      var defineGetter = schemaField.defineGetter;

      it('should define getter successfully', function () {
        var obj = util.mockSchemaObject({ hello: 'world' });

        defineGetter.call(obj, 'hello', { type: 'string' });

        expect(obj).to.have.property('hello', 'world');
      });

      it('should support "alias" field', function () {
        var obj = util.mockSchemaObject({ real: 'Hello world' });

        defineGetter.call(obj, 'virtual', {
          type: 'alias',
          target: 'real'
        });

        expect(obj).to.have.property('virtual', 'Hello world');
      });

      it('should support default value', function () {
        var obj = util.mockSchemaObject();
        var field = {
          type: 'string',
          default: 'Hello world'
        };

        defineGetter.call(obj, 'message', field);

        expect(obj).to.have.property('message', 'Hello world');
      });

      it('should support generator for default value', function () {
        var obj = util.mockSchemaObject();
        var now = sinon.stub().returns(1415821455000);
        var field = {
          type: 'date',
          default: now
        };

        defineGetter.call(obj, 'createdAt', field);

        expect(obj).to.have.property('createdAt')
          .that.satisfy(function (createdAt) {
            expect(createdAt.getTime()).to.equal(1415821455000);
            return true;
          });

        expect(now).to.have.been.calledOnce;
      });

      it('should typecast default value', function () {
        var obj = util.mockSchemaObject();
        var field = {
          type: 'number',
          default: '18'
        };

        defineGetter.call(obj, 'age', field);

        expect(obj).to.have.property('age', 18);
      });

      it('should validate default value', function () {
        var obj = util.mockSchemaObject();
        var field = {
          type: 'number',
          default: '18a'
        };

        defineGetter.call(obj, 'age', field);

        obj.age;

        expect(obj).to.have.property('_errors')
          .with.property(0)
            .that.is.an.instanceOf(TypeError);
      });
    });

    describe('.defineSetter', function () {
      var defineSetter = schemaField.defineSetter;

      it('should define setter successfully', function () {
        var obj = util.mockSchemaObject();

        defineSetter.call(obj, 'hello', {
          name: 'hello',
          type: 'string'
        });

        obj.hello = 'world';

        expect(obj).to.have.property('_obj')
          .that.has.property('hello', 'world');
      });

      it('should ignore read-only field', function () {
        var obj = util.mockSchemaObject();

        defineSetter.call(obj, 'hello', {
          name: 'hello',
          type: 'string',
          readOnly: true
        });

        obj.hello = 'world';

        expect(obj).to.have.property('_obj')
          .that.not.has.property('hello');
      });

      it('should typecast value', function () {
        var obj = util.mockSchemaObject();

        defineSetter.call(obj, 'hello', {
          name: 'hello',
          type: 'string'
        });

        obj.hello = 12345;

        expect(obj).to.have.property('_obj')
          .that.has.property('hello', '12345');
      });

      it('should validate value', function () {
        var obj = util.mockSchemaObject();

        defineSetter.call(obj, 'age', {
          name: 'age',
          type: 'number'
        });

        obj.age = 'not a number';

        expect(obj).to.have.property('_errors')
          .with.property(0)
            .that.is.an.instanceOf(TypeError);
      });

      it('should set default value for "object" field', function () {
        var obj = util.mockSchemaObject();

        defineSetter.call(obj, 'name', {
          name: 'name',
          type: 'object',
          default: {
            first: 'John',
            last: 'Lennon'
          }
        });

        expect(obj).to.have.property('_obj')
          .with.property('name')
            .that.deep.equal({
              first: 'John',
              last: 'Lennon'
            });
      });

      it('should support default value generator for "object" field', function () {
        var obj = util.mockSchemaObject();
        var createDefault = sinon.spy(function () {
          return {
            first: 'John',
            last: 'Lennon'
          };
        });

        defineSetter.call(obj, 'name', {
          name: 'name',
          type: 'object',
          default: createDefault
        });

        expect(obj).to.have.property('_obj')
          .with.property('name')
            .that.deep.equal({
              first: 'John',
              last: 'Lennon'
            });

        expect(createDefault).to.have.been.calledOnce;
      });

      it('should initialize SchemaObject on "object" field ' +
        'which has no default value', function () {

        var obj = util.mockSchemaObject();
        var User = new SchemaObject({
          name: String,
          age: Number
        });

        defineSetter.call(obj, 'user', {
          name: 'user',
          type: 'object',
          objectType: User
        });

        expect(obj).to.have.property('_obj')
          .with.property('user')
            .that.is.instanceOf(User);
      });

      it('should initialize SchemaArray on "array" field', function () {
        var obj = util.mockSchemaObject();

        defineSetter.call(obj, 'interests', {
          name: 'interests',
          type: 'array'
        });

        expect(obj).to.have.property('_obj')
          .with.property('interests')
            .that.is.instanceOf(SchemaArray);
      });
    });

    describe('.writeValue', function () {
      var writeValue = schemaField.writeValue;

      it('should write value successfully', function () {
        var obj = util.mockSchemaObject();

        writeValue.call(obj, 'world', { name: 'hello' });

        expect(obj).to.have.property('_obj')
          .that.has.property('hello', 'world');
      });

      it('should call onBeforeValueSet', function () {
        var onBeforeValueSet = sinon.spy();
        var obj = util.mockSchemaObject(null, {
          onBeforeValueSet: onBeforeValueSet
        });

        writeValue.call(obj, 'world', { name: 'hello' });

        expect(onBeforeValueSet).to.have.been.calledOnce;
        expect(onBeforeValueSet).to.have.been.calledWith('world', 'hello');

        expect(obj).to.have.property('_obj')
          .that.has.property('hello', 'world');
      });

      it('should be skipped if onBeforeValueSet has returned false', function () {
        var onBeforeValueSet = sinon.spy(function () {
          return false;
        });
        var obj = util.mockSchemaObject(null, {
          onBeforeValueSet: onBeforeValueSet
        });

        writeValue.call(obj, 'world', { name: 'hello' });

        expect(onBeforeValueSet).to.have.been.calledOnce;
        expect(onBeforeValueSet).to.have.been.calledWith('world', 'hello');

        expect(obj).to.have.property('_obj')
          .that.not.has.property('hello');
      });

      it('should write to target field if current field is "alias"', function () {
        var obj = util.mockSchemaObject();

        writeValue.call(obj, 'world', {
          name: 'hello',
          type: 'alias',
          target: 'hi'
        });

        expect(obj).to.have.property('_obj')
          .that.not.has.property('hello');

        expect(obj).to.have.property('hi', 'world');
      });

      it('should call onValueSet after writing value', function () {
        var onValueSet = sinon.spy();
        var obj = util.mockSchemaObject(null, {
          onValueSet: onValueSet
        });

        writeValue.call(obj, 'world', { name: 'hello' });

        expect(onValueSet).to.have.been.calledOnce;
        expect(onValueSet).to.have.been.calledWith('world', 'hello');

        expect(obj).to.have.property('_obj')
          .that.has.property('hello', 'world');
      });
    });
  });
});
