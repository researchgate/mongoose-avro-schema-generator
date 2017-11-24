'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const mongooseAvroSchemaGenerator = require('../src/generator');
const cleanupModels = require('./cleanupModels');

const Schema = mongoose.Schema;

describe('schema meta data', function() {
    const MODEL_NAME = 'test';

    beforeEach(function() {
        let schema = new Schema({});
        mongoose.model(MODEL_NAME, schema);
    });

    afterEach(function() {
        cleanupModels();
    });

    it('has the name of the model', function() {
        let expected = {
            name: MODEL_NAME,
        };
        let result = mongooseAvroSchemaGenerator.generate();

        assertHasAttributes(result, expected);
    });

    it('has type record', function() {
        let expected = {
            type: 'record',
        };
        let result = mongooseAvroSchemaGenerator.generate();

        assertHasAttributes(result, expected);
    });

    it('has mongodb dbtype', function() {
        let expected = {
            dbtype: 'mongodb',
        };
        let result = mongooseAvroSchemaGenerator.generate();

        assertHasAttributes(result, expected);
    });

    it('uses default namespace if namespace was not provided in options', function() {
        let expected = {
            namespace: 'mongoose',
        };
        let result = mongooseAvroSchemaGenerator.generate();

        assertHasAttributes(result, expected);
    });

    it('uses namespace provided in options', function() {
        let namespace = 'some.namespace';
        let expected = {
            namespace: namespace,
        };
        let result = mongooseAvroSchemaGenerator.generate([], { namespace: namespace });

        assertHasAttributes(result, expected);
    });

    it('uses the collection name provided by mongoose', function() {
        let expected = {
            dbcollection: mongoose.model('test').collection.name,
        };
        let result = mongooseAvroSchemaGenerator.generate();

        assertHasAttributes(result, expected);
    });
});

describe('primitive types', function() {
    afterEach(function() {
        cleanupModels();
    });

    it('maps string to string', function() {
        let schema = new Schema({
            nativeString: String,
            schemaString: Schema.Types.String,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                default: null,
                name: 'nativeString',
                type: ['null', 'string'],
            },
            {
                default: null,
                name: 'schemaString',
                type: ['null', 'string'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();
        assertHasFields(result, expected);
    });

    it('maps booleans to boolean', function() {
        let schema = new Schema({
            nativeBoolean: Boolean,
            schemaBoolean: Schema.Types.Boolean,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                default: null,
                name: 'nativeBoolean',
                type: ['null', 'boolean'],
            },
            {
                default: null,
                name: 'schemaBoolean',
                type: ['null', 'boolean'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();
        assertHasFields(result, expected);
    });

    it('maps numbers to double', function() {
        let schema = new Schema({
            nativeNumber: Number,
            schemaNumber: Schema.Types.Number,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                default: null,
                name: 'nativeNumber',
                type: ['null', 'double'],
            },
            {
                default: null,
                name: 'schemaNumber',
                type: ['null', 'double'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();
        assertHasFields(result, expected);
    });

    it('maps buffer to bytes', function() {
        let schema = new Schema({
            buffer: Buffer,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                default: null,
                name: 'buffer',
                type: ['null', 'bytes'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();
        assertHasFields(result, expected);
    });

    it('maps date to long with date subtype', function() {
        let schema = new Schema({
            date: Date,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                default: null,
                name: 'date',
                type: [
                    'null',
                    {
                        type: 'long',
                        subtype: 'date',
                    },
                ],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();
        assertHasFields(result, expected);
    });

    it('maps object IDs to string', function() {
        let schema = new Schema({
            _id: Schema.Types.ObjectId,
        });
        mongoose.model('test', schema);

        let expected = [
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
        ];

        let result = mongooseAvroSchemaGenerator.generate();
        assertHasFields(result, expected);
    });

    it('parses primitives defined as objects with type property', function() {
        let schema = new Schema({
            some: { type: Number },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                default: null,
                name: 'some',
                type: ['null', 'double'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();
        assertHasFields(result, expected);
    });

    it('includes autogenerated fields', function() {
        let schema = new Schema({
            some: Number,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: null,
                type: ['null', 'double'],
            },
            {
                name: '_id',
                default: null,
                type: ['null', { type: 'string', subtype: 'objectid' }],
            },
            {
                name: '__v',
                default: null,
                type: ['null', 'double'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('excludes virtual type field "id"', function() {
        let schema = new Schema({
            some: Number,
        });
        mongoose.model('test', schema);

        let result = mongooseAvroSchemaGenerator.generate();

        assertNotHasFields(result, ['id']);
    });
});

describe('nullable', function() {
    afterEach(function() {
        cleanupModels();
    });

    it('includes null as type if not required', function() {
        let schema = new Schema({
            some: Number,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: null,
                type: ['null', 'double'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('does not include null as type if required', function() {
        let schema = new Schema({
            some: { type: Number, required: true },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: 'double',
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });
});

describe('defaults', function() {
    afterEach(function() {
        cleanupModels();
    });

    it('uses defined default', function() {
        let schema = new Schema({
            some: { type: Number, default: 12 },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: 12,
                type: ['null', 'double'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('uses null if value is not required and no default defined', function() {
        let schema = new Schema({
            some: Number,
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: null,
                type: ['null', 'double'],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('uses empty array for arrays', function() {
        let schema = new Schema({
            some: [Number],
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: [],
                items: {
                    name: 'someItem',
                    default: null,
                    type: ['null', 'double'],
                },
                type: 'array',
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('uses defined default for arrays', function() {
        let schema = new Schema({
            some: { type: [Number], default: ['bla'] },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: ['bla'],
                items: {
                    name: 'someItem',
                    default: null,
                    type: ['null', 'double'],
                },
                type: 'array',
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });
});

describe('unallowed types', function() {
    afterEach(function() {
        cleanupModels();
    });

    it('throws exception if schema definition contains mixed type explicitly', function() {
        let schema = new Schema({
            some: Schema.Types.Mixed,
        });
        mongoose.model('test', schema);

        assert.throws(() => {
            mongooseAvroSchemaGenerator.generate();
        }, /Unable to parse entity/);
    });

    it('throws exception if schema definition contains mixed type as empty object', function() {
        let schema = new Schema({
            some: {},
        });
        mongoose.model('test', schema);

        assert.throws(() => {
            mongooseAvroSchemaGenerator.generate();
        }, /Unsupported type/);
    });

    it('throws exception if schema definition contains mixed type as empty array', function() {
        let schema = new Schema({
            some: [],
        });
        mongoose.model('test', schema);

        assert.throws(() => {
            mongooseAvroSchemaGenerator.generate();
        }, /Unable to parse entity/);
    });
});

describe('recursive types', function() {
    afterEach(function() {
        cleanupModels();
    });

    it('parses embedded documents as records', function() {
        let schema = new Schema({
            some: {
                thing: { type: Number },
            },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: 'record',
                fields: [
                    {
                        name: 'thing',
                        default: null,
                        type: ['null', 'double'],
                    },
                ],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses embedded documents with key "type"', function() {
        let schema = new Schema({
            some: {
                type: { type: Number },
            },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: 'record',
                fields: [
                    {
                        name: 'type',
                        default: null,
                        type: ['null', 'double'],
                    },
                ],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses arrays', function() {
        let schema = new Schema({
            some: [Number],
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: 'array',
                items: {
                    name: 'someItem',
                    default: null,
                    type: ['null', 'double'],
                },
                default: [],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses arrays of records', function() {
        let schema = new Schema({
            some: [
                {
                    thingA: String,
                    thingB: { type: Number, required: true },
                },
            ],
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: 'array',
                items: {
                    name: 'someItem',
                    type: 'record',
                    fields: [
                        {
                            name: 'thingB',
                            type: 'double',
                        },
                        {
                            name: 'thingA',
                            type: ['null', 'string'],
                            default: null,
                        },
                    ],
                },
                default: [],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses record with arrays', function() {
        let schema = new Schema({
            some: {
                thing: [String],
            },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: 'record',
                fields: [
                    {
                        name: 'thing',
                        type: 'array',
                        items: {
                            name: 'thingItem',
                            type: ['null', 'string'],
                            default: null,
                        },
                        default: [],
                    },
                ],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('does not parse empty arrays', function() {
        let schema = new Schema({
            some: [],
        });
        mongoose.model('test', schema);

        assert.throws(() => {
            mongooseAvroSchemaGenerator.generate();
        }, /Unable to parse entity/);
    });

    it('does not parse empty object literals', function() {
        let schema = new Schema({
            some: {},
        });
        mongoose.model('test', schema);

        assert.throws(() => {
            mongooseAvroSchemaGenerator.generate();
        }, /Unsupported type/);
    });
});

describe('multiple models', function() {
    beforeEach(function() {
        let schema1 = new Schema({
            some: Number,
        });
        mongoose.model('test1', schema1);
        let schema2 = new Schema({
            thing: String,
        });
        mongoose.model('test2', schema2);
        let schema3 = new Schema({
            thing: Boolean,
        });
        mongoose.model('test3', schema3);
    });

    afterEach(function() {
        cleanupModels();
    });

    it('parses all defined models', function() {
        let expected = ['test1', 'test2', 'test3'];

        let result = mongooseAvroSchemaGenerator.generate();
        assertSchemaNames(result, expected);
    });

    it('parses selected models', function() {
        let expected = ['test1', 'test2'];

        let result = mongooseAvroSchemaGenerator.generate(['test1', 'test2']);
        assertSchemaNames(result, expected);
    });

    it('throws exception if model name is undefined', function() {
        assert.throws(() => {
            mongooseAvroSchemaGenerator.generate(['test1', 'test2', 'testX']);
        }, /Could not find mongoose schema/);
    });
});

let assertHasAttributes = (result, attributes) => {
    assert(result.length === 1, 'Result did not contain exactly one schema');

    for (let key in attributes) {
        if (attributes.hasOwnProperty(key)) {
            assert(result[0].hasOwnProperty(key), 'Result did not have expected attribute field');
            assert.deepEqual(
                result[0][key],
                attributes[key],
                'Found attribute field, but value does not match expectation',
            );
        }
    }
};

let assertHasFields = (result, fields) => {
    assert(result.length === 1, 'Result did not contain exactly one schema');

    fields.forEach(field => {
        let actual = result[0].fields.find(resultField => {
            return resultField.name === field.name;
        });

        assert.deepEqual(actual, field, 'Found field, but field does not match expectation');
    });
};

let assertNotHasFields = (result, fieldNames) => {
    assert(result.length === 1, 'Result did not contain exactly one schema');

    let unexpectedFields = result[0].fields
        .filter(field => {
            return fieldNames.includes(field.name);
        })
        .map(field => {
            return field.name;
        });

    assert(unexpectedFields.length === 0, `Unexpected fields: ${unexpectedFields.join()}`);
};

let assertSchemaNames = (result, schemaNames) => {
    let namesInResult = result.map(schema => {
        return schema.name;
    });

    assert.deepEqual(namesInResult, schemaNames, 'Result did not contain expected schema names');
};
