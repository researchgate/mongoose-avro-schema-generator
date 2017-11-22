'use strict';

const assert = require('assert');
const generateAvroSchemas = require('../src/index');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

describe('primitive types', function() {
    it('maps object IDs', function() {
        let schema = new Schema({
            _id: Schema.Types.ObjectId,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                fields: [
                    {
                        default: null,
                        name: '_id',
                        type: [
                            'null',
                            {
                                subtype: 'objectid',
                                type: 'string',
                            },
                        ],
                    },
                ],
                name: 'test',
                type: 'record',
            },
        ];

        let result = generateAvroSchemas();
        assert.deepEqual(result, expected);
    });
});
