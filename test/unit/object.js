'use strict';

var SchemaObject = require('../..').Object;

describe('schemas', function () {
  describe('.Object', function () {
    it('should has __type__ of SchemaObject', function () {
      var schemaObject = new SchemaObject();
      expect(schemaObject).to.have.property('__type__', 'SchemaObject');
    });

    it('should normalize schema', function () {
      var schema = {
        name: {
          type: String,
          required: true
        },
        age: Number,
        interests: [ String ]
      };

      new SchemaObject(schema); // jshint ignore: line

      expect(schema).to.deep.equal({
        name: {
          name: 'name',
          type: 'string',
          required: true
        },
        age: {
          name: 'age',
          type: 'number'
        },
        interests: {
          name: 'interests',
          type: 'array',
          itemType: String // will be converted later
        }
      });
    });

    it('should return schema-aware object constructor', function () {
      var User = new SchemaObject({
        name: {
          type: String,
          required: true
        },
        age: Number,
        interests: [ String ]
      });
      var user = new User();

      user.name = 123;
      user.age = '18';
      user.interests = [ '11', 22 ];

      expect(user).to.have.property('name', '123');
      expect(user).to.have.property('age', 18);

      expect(user).to.have.property('interests')
        .with.length(2)
        .and.satisfy(function (self) {
          expect(self).to.have.property(0, '11');
          expect(self).to.have.property(1, '22');
          return true;
        });
    });

    it('should return object constructor that accept default values', function () {
      var User = new SchemaObject({
        name: {
          type: String,
          required: true
        },
        age: Number,
        interests: [ String ]
      });
      var user = new User({
        name: 123,
        age: '18',
        interests: [ '11', 22 ]
      });

      expect(user).to.have.property('name', '123');
      expect(user).to.have.property('age', 18);

      expect(user).to.have.property('interests')
        .with.length(2)
        .and.satisfy(function (self) {
          expect(self).to.have.property(0, '11');
          expect(self).to.have.property(1, '22');
          return true;
        });
    });

    it('strict mode');
    it('non-strict mode');
    it('dot-natation option');

    describe('#toObject', function () {
      it('should return primitive object', function () {
        var now = function () {
          return 1415821455000;
        };
        var User = new SchemaObject({
          name: {
            first: String,
            last: String
          },
          age: Number,
          interests: [ String ],
          joined: {
            type: Date,
            default: now
          }
        });
        var user = new User({
          name: {
            first: 'John',
            last: 'Lennon'
          },
          age: '40',
          interests: [
            'singing',
            'composing'
          ]
        });

        var obj = user.toObject();

        expect(obj).to.deep.equal({
          name: {
            first: 'John',
            last: 'Lennon'
          },
          age: 40,
          interests: [
            'singing',
            'composing'
          ],
          joined: new Date(1415821455000)
        });
      });

      it('should not return invisible fields', function () {
        var User = new SchemaObject({
          id: {
            type: String,
            invisible: true
          },
          name: String
        });
        var user = new User({
          id: 1001,
          name: 'John Lennon'
        });

        var obj = user.toObject();

        expect(obj).to.deep.equal({ name: 'John Lennon' });
      });

      it('should call "toObject" method on objects that support', function () {
        var User = new SchemaObject({
          name: String,
          age: Number
        });
        var Department = new SchemaObject({
          name: String,
          boss: User
        });

        var user = new User({
          name: 'John',
          age: 40
        });
        var department = new Department({
          name: 'Marketing',
          boss: user
        });

        var obj = department.toObject();

        expect(obj).to.deep.equal({
          name: 'Marketing',
          boss: {
            name: 'John',
            age: 40
          }
        });
      });

      it('should shallow clone objects', function () {
        var Department = new SchemaObject({
          name: String,
          boss: {}
        });

        var user = {
          name: 'John',
          age: 40
        };
        var department = new Department({
          name: 'Marketing',
          boss: user
        });

        var obj = department.toObject();

        expect(obj.boss).to.not.equal(user);
        expect(obj.boss).to.deep.equal(user);
      });

      it('should call "toObject" transformation method', function () {
        var toObject = sinon.spy(function (obj) {
          obj.name = obj.name.toUpperCase();
        });
        var User = new SchemaObject({ name: String }, { toObject: toObject });
        var user = new User({ name: 'uppercase' });

        expect(user.toObject()).to.have.property('name', 'UPPERCASE');
        expect(toObject).to.have.been.calledOnce;
      });

      it('should use value returned from "toObject" transformation method ' +
        'if available', function () {

        var toObject = sinon.spy(function () {
          return { name: 'I\'m a dictator!' };
        });
        var User = new SchemaObject({ name: String }, { toObject: toObject });
        var user = new User({ name: 'uppercase' });

        expect(user.toObject()).to.have.property('name', 'I\'m a dictator!');
        expect(toObject).to.have.been.calledOnce;
      });
    });

    describe('#toJSON', function () {
      it('should return JSON object', function () {
        var now = function () {
          return 1415821455000;
        };

        var User = new SchemaObject({
          name: {
            first: String,
            last: String
          },
          age: Number,
          interests: [ String ],
          joined: {
            type: Date,
            default: now
          }
        });
        var user = new User({
          name: {
            first: 'John',
            last: 'Lennon'
          },
          age: '40',
          interests: [
            'singing',
            'composing'
          ]
        });

        var json = user.toJSON();
        var dateJson = new Date(1415821455000).toJSON();

        expect(json).to.deep.equal({
          name: {
            first: 'John',
            last: 'Lennon'
          },
          age: 40,
          interests: [
            'singing',
            'composing'
          ],
          joined: dateJson
        });
      });

      it('should not return invisible fields', function () {
        var User = new SchemaObject({
          id: {
            type: String,
            invisible: true
          },
          name: String
        });
        var user = new User({
          id: 1001,
          name: 'John Lennon'
        });

        var json = user.toJSON();

        expect(json).to.deep.equal({ name: 'John Lennon' });
      });

      it('should call "toJSON" method on objects that support', function () {
        var User = new SchemaObject({
          name: String,
          age: Number
        });
        var Department = new SchemaObject({
          name: String,
          boss: User
        });

        var user = new User({
          name: 'John',
          age: 40
        });
        var department = new Department({
          name: 'Marketing',
          boss: user
        });

        var json = department.toJSON();

        expect(json).to.deep.equal({
          name: 'Marketing',
          boss: {
            name: 'John',
            age: 40
          }
        });
      });

      it('should shallow clone objects', function () {
        var Department = new SchemaObject({
          name: String,
          boss: {}
        });

        var user = {
          name: 'John',
          age: 40
        };
        var department = new Department({
          name: 'Marketing',
          boss: user
        });

        var json = department.toJSON();

        expect(json.boss).to.not.equal(user);
        expect(json.boss).to.deep.equal(user);
      });

      it('should call "toJSON" transformation method', function () {
        var toJSON = sinon.spy(function (json) {
          json.name = json.name.toUpperCase();
        });
        var User = new SchemaObject({ name: String }, { toJSON: toJSON });
        var user = new User({ name: 'uppercase' });

        expect(user.toJSON()).to.have.property('name', 'UPPERCASE');
        expect(toJSON).to.have.been.calledOnce;
      });

      it('should use value returned from "toJSON" transformation method if available', function () {
        var toJSON = sinon.spy(function () {
          return { name: 'I\'m a dictator!' };
        });
        var User = new SchemaObject({ name: String }, { toJSON: toJSON });
        var user = new User({ name: 'uppercase' });

        expect(user.toJSON()).to.have.property('name', 'I\'m a dictator!');
        expect(toJSON).to.have.been.calledOnce;
      });
    });

    describe('#clear', function () {
      it('should clear property values', function () {
        var User = new SchemaObject({
          firstName: String,
          lastName: String
        });
        var user = new User({
          firstName: 'John',
          lastName: 'Lennon'
        });

        expect(user).to.have.property('firstName', 'John');
        expect(user).to.have.property('lastName', 'Lennon');

        user.clear();

        expect(user).to.not.have.property('firstName');
        expect(user).to.not.have.property('lastName');
      });
    });

    describe('#getErrors', function () {
      it('should report validation errors', function () {
        var User = new SchemaObject({
          name: String,
          age: Number
        });
        var user = new User({
          name: 'John Lennon',
          age: '40typo'
        });

        expect(user.getErrors()).to.have.length(1)
          .and.have.property(0)
            .that.is.an.instanceOf(TypeError);
      });
    });

    describe('#clearErrors', function () {
      it('should clear validation errors', function () {
        var User = new SchemaObject({
          name: String,
          age: Number
        });
        var user = new User({
          name: 'John Lennon',
          age: '40typo'
        });

        expect(user.getErrors()).to.have.length(1)
          .and.have.property(0)
            .that.is.an.instanceOf(TypeError);

        user.clearErrors();

        expect(user.getErrors()).to.be.empty;
      });
    });
  });
});
