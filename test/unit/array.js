'use strict';

var SchemaArray = require('../..').Array;

describe('schemas', function () {
  describe('.Array', function () {
    describe('#push', function () {
      it('should typecast pushed elements', function () {
        var arr = new SchemaArray({}, {
          type: 'array',
          itemType: Number // will be converted later
        });

        arr.push(0);
        arr.push('1');
        arr.push(2);

        expect(arr).to.have.property(0, 0);
        expect(arr).to.have.property(1, 1);
        expect(arr).to.have.property(2, 2);
      });

      it('should validate pushed elements', function () {
        expect(function () {
          var arr = new SchemaArray({}, {
            type: 'array',
            itemType: Number
          });

          arr.push('a');
        }).to.throw(TypeError);
      });

      it('should eliminate duplicate elements when in "unique" mode', function () {
        var arr = new SchemaArray({}, {
          type: 'array',
          itemType: Number,
          unique: true
        });

        arr.push(5, 4);
        arr.push(3, 2, 4, 1, 3, 0);

        for (var i = 0; i < 6; i++) {
          expect(arr).to.have.property(i, 5 - i);
        }
      });
    });
  });
});
