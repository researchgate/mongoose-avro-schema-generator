'use strict';

const describe = require('mocha').describe;
const assert = require('assert');
const mongoose = require('mongoose');
const Generator = require('../src/generator');
const cleanupModels = require('./cleanupModels');
const Schema = mongoose.Schema;

let mongooseAvroSchemaGenerator = new Generator(mongoose);

describe('schema meta data', function() {
    const MODEL_NAME = 'test';

    beforeEach(function() {
        let schema = new Schema({});
        mongoose.model(MODEL_NAME, schema);
    });

    afterEach(function() {
        cleanupModels();
    });

    it('has name of the model', function() {
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

    it('does not have a default', function() {
        let unexpectedFields = ['default'];
        let result = mongooseAvroSchemaGenerator.generate();

        assertNotHasAttributes(result, unexpectedFields);
    });

    it('has dbtype mongodb', function() {
        let expected = {
            dbtype: 'mongodb',
        };
        let result = mongooseAvroSchemaGenerator.generate();

        assertHasAttributes(result, expected);
    });

    it('has default namespace if namespace was not provided in options', function() {
        let expected = {
            namespace: 'mongoose',
        };
        let result = mongooseAvroSchemaGenerator.generate();

        assertHasAttributes(result, expected);
    });

    it('has namespace provided in constructor', function() {
        let namespace = 'some.namespace';
        let expected = {
            namespace: namespace,
        };
        let mongooseAvroSchemaGeneratorWithNamespace = new Generator(mongoose, namespace);

        let result = mongooseAvroSchemaGeneratorWithNamespace.generate([], { namespace: namespace });

        assertHasAttributes(result, expected);
    });

    it('has collection name provided by mongoose', function() {
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

    it('includes null as type if not required when required property is set to false', function() {
        let schema = new Schema({
            some: { type: Number, required: false },
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

    it('does not include null as type if required defined as function', function() {
        let schema = new Schema({
            some: {
                type: Number,
                required: () => {
                    return true;
                },
            },
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

    it('does not include null as type if required for complex type', function() {
        let schema = new Schema({
            some: { type: Date, required: true },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: { type: 'long', subtype: 'date' },
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

    it('uses null as default for arrays', function() {
        let schema = new Schema({
            some: [Number],
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: null,
                type: [
                    'null',
                    {
                        type: 'array',
                        items: ['null', 'double'],
                    },
                ],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('ignores defined defaults for arrays', function() {
        let schema = new Schema({
            some: { type: [Number], default: 'bla' },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: null,
                type: [
                    'null',
                    {
                        type: 'array',
                        items: ['null', 'double'],
                    },
                ],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('ignores defined defaults for arrays of arrays', function() {
        let schema = new Schema({
            some: { type: [[Number]], default: ['bla'] },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                default: null,
                type: [
                    'null',
                    {
                        type: 'array',
                        items: [
                            'null',
                            {
                                type: 'array',
                                items: ['null', 'double'],
                            },
                        ],
                    },
                ],
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
        }, /Unsupported type/);
    });

    it('throws exception if schema definition contains mixed type as empty object', function() {
        let schema = new Schema({
            some: {},
        });
        mongoose.model('test', schema);

        assert.throws(() => {
            mongooseAvroSchemaGenerator.generate();
        }, /Unable to parse entity/);
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

    it('throws exception if schema definition contains mixed type named "type" as empty array', function() {
        let schema = new Schema({
            type: [],
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
                type: [
                    'null',
                    {
                        name: 'someEmbedded',
                        type: 'record',
                        fields: [
                            {
                                name: 'thing',
                                default: null,
                                type: ['null', 'double'],
                            },
                        ],
                    },
                ],
                default: null,
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
                type: [
                    'null',
                    {
                        name: 'someEmbedded',
                        type: 'record',
                        fields: [
                            {
                                name: 'type',
                                default: null,
                                type: ['null', 'double'],
                            },
                        ],
                    },
                ],
                default: null,
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses embedded documents with key "type" that also contain other fields', function() {
        let schema = new Schema({
            some: {
                type: Number,
                thing: String,
            },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: [
                    'null',
                    {
                        name: 'someEmbedded',
                        type: 'record',
                        fields: [
                            {
                                name: 'type',
                                default: null,
                                type: ['null', 'double'],
                            },
                            {
                                name: 'thing',
                                default: null,
                                type: ['null', 'string'],
                            },
                        ],
                    },
                ],
                default: null,
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses embedded documents with key "type" that also contains an array field', function() {
        let schema = new Schema({
            some: {
                type: [Number],
                thing: String,
            },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: [
                    'null',
                    {
                        name: 'someEmbedded',
                        type: 'record',
                        fields: [
                            {
                                default: null,
                                name: 'type',
                                type: [
                                    'null',
                                    {
                                        type: 'array',
                                        items: ['null', 'double'],
                                    },
                                ],
                            },
                            {
                                name: 'thing',
                                default: null,
                                type: ['null', 'string'],
                            },
                        ],
                    },
                ],
                default: null,
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses embedded documents with key "type" that also contain an embedded document', function() {
        let schema = new Schema({
            some: {
                type: [Number],
                thing: {
                    other: String,
                },
            },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: [
                    'null',
                    {
                        name: 'someEmbedded',
                        type: 'record',
                        fields: [
                            {
                                name: 'type',
                                default: null,
                                type: [
                                    'null',
                                    {
                                        type: 'array',
                                        items: ['null', 'double'],
                                    },
                                ],
                            },
                            {
                                name: 'thing',
                                type: [
                                    'null',
                                    {
                                        type: 'record',
                                        name: 'thingEmbedded',
                                        fields: [
                                            {
                                                name: 'other',
                                                type: ['null', 'string'],
                                                default: null,
                                            },
                                        ],
                                    },
                                ],
                                default: null,
                            },
                        ],
                    },
                ],
                default: null,
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses embedded documents with key "type" that contain additional properties', function() {
        let schema = new Schema({
            some: {
                type: [Number],
                thing: true,
            },
        });
        mongoose.model('test', schema);

        let expected = [
            {
                default: null,
                name: 'some',
                type: [
                    'null',
                    {
                        type: 'array',
                        items: ['null', 'double'],
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
                type: [
                    'null',
                    {
                        type: 'array',
                        items: ['null', 'double'],
                    },
                ],
                default: null,
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
                type: [
                    'null',
                    {
                        type: 'array',
                        items: [
                            'null',
                            {
                                type: 'record',
                                name: 'someItemEmbedded',
                                fields: [
                                    {
                                        name: 'thingA',
                                        type: ['null', 'string'],
                                        default: null,
                                    },
                                    {
                                        name: 'thingB',
                                        type: 'double',
                                    },
                                ],
                            },
                        ],
                    },
                ],
                default: null,
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses array of arrays', function() {
        let schema = new Schema({
            some: [[String]],
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: [
                    'null',
                    {
                        type: 'array',
                        items: [
                            'null',
                            {
                                type: 'array',
                                items: ['null', 'string'],
                            },
                        ],
                    },
                ],
                default: null,
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses array of arrays of records', function() {
        let schema = new Schema({
            some: [
                [
                    {
                        thing: String,
                    },
                ],
            ],
        });
        mongoose.model('test', schema);

        let expected = [
            {
                name: 'some',
                type: [
                    'null',
                    {
                        type: 'array',
                        items: [
                            'null',
                            {
                                type: 'array',
                                items: [
                                    'null',
                                    {
                                        name: 'someItemItemEmbedded',
                                        type: 'record',
                                        fields: [
                                            {
                                                name: 'thing',
                                                type: ['null', 'string'],
                                                default: null,
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                default: null,
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
                type: [
                    'null',
                    {
                        name: 'someEmbedded',
                        type: 'record',
                        fields: [
                            {
                                name: 'thing',
                                type: [
                                    'null',
                                    {
                                        type: 'array',
                                        items: ['null', 'string'],
                                    },
                                ],
                                default: null,
                            },
                        ],
                    },
                ],
                default: null,
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

    it('does not parse empty array of array', function() {
        let schema = new Schema({
            some: [[]],
        });
        mongoose.model('test', schema);

        assert.throws(() => {
            mongooseAvroSchemaGenerator.generate();
        }, /Unable to parse entity/);
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

describe('example from readme', function() {
    afterEach(function() {
        cleanupModels();
    });

    it('matches the array with record example from the README.md', function() {
        let schema = new Schema({
            some: [{ thing: String }],
        });
        mongoose.model('mySchema', schema);

        let expected = [
            {
                name: 'some',
                type: [
                    'null',
                    {
                        type: 'array',
                        items: [
                            'null',
                            {
                                name: 'someItemEmbedded',
                                type: 'record',
                                fields: [
                                    {
                                        name: 'thing',
                                        type: ['null', 'string'],
                                        default: null,
                                    },
                                ],
                            },
                        ],
                    },
                ],
                default: null,
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('matches the main example from the README.md', function() {
        let schema = new Schema({
            something: { type: [[Number]], default: ['foo'] },
            else: [String],
        });
        mongoose.model('mySchema', schema);

        let mongooseAvroSchemaGeneratorWithNamespace = new Generator(mongoose, 'some.namespace');

        let expected = [
            {
                dbcollection: 'myschemas',
                dbtype: 'mongodb',
                type: 'record',
                fields: [
                    {
                        name: 'something',
                        default: null,
                        type: [
                            'null',
                            {
                                type: 'array',
                                items: [
                                    'null',
                                    {
                                        items: ['null', 'double'],
                                        type: 'array',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'else',
                        type: [
                            'null',
                            {
                                items: ['null', 'string'],
                                type: 'array',
                            },
                        ],
                        default: null,
                    },
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
                    {
                        default: null,
                        name: '__v',
                        type: ['null', 'double'],
                    },
                ],
                name: 'mySchema',
                namespace: 'some.namespace',
            },
        ];

        let avro = mongooseAvroSchemaGeneratorWithNamespace.generate(['mySchema']);

        assert.deepEqual(avro, expected);
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

let assertNotHasAttributes = (result, attributes) => {
    assert(result.length === 1, 'Result did not contain exactly one schema');

    let violations = [];

    Object.keys(result[0]).forEach(attribute => {
        if (attributes.includes(attribute)) {
            violations.push(attribute);
        }
    });

    assert(violations.length === 0, `Found unexpected attribute fields ${violations.join(',')}`);
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
