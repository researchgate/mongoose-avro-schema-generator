'use strict';

const assert = require('assert');
const salute = require('../src/index');

describe('test', () => {
    it('the return salutes you', done => {
        let result = salute();
        assert.equal("Say hello to RG's Blueprint!", result);
        done();
    });
});
