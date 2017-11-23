'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const mongooseAvroSchemaGenerator = require('../src/index');
const cleanupModels = require('./cleanupModels');

const Schema = mongoose.Schema;

/**
 * TODO Test case for empty arrays/objects
 * TODO Test case for mixed type
 * TODO Test case for nastily nested objects
 * TODO Test case for invalid schema names
 * TODO Test case for ignored virtual type
 * TODO Test case for type {} (should equal to mixed)
 * TODO Test case for projects as parameters
 * TODO Test case for namespace
 */
describe('appmiral test', function() {
    afterEach(function() {
        cleanupModels();
    });

    it('parses component model', function() {
        let ComponentSchema = new Schema(
            {
                _id: String,
                repo: String,
                currentVersion: String,
                dependencies: [String],
                wikiUrls: {},
                type: String,
                docker: [
                    {
                        path: String,
                        baseImages: [String],
                        usedIn: {
                            baseImage: [String],
                            kubernetesContainer: [String],
                        },
                    },
                ],
                k8s: [
                    {
                        services: [String],
                        deployments: [
                            {
                                name: String,
                                containers: [
                                    {
                                        name: String,
                                        image: String,
                                    },
                                ],
                                extras: [String],
                            },
                        ],
                        kubernetesFile: String,
                    },
                ],
                metadata: {
                    name: { type: String, required: true },
                    type: { type: String, default: 'test' },
                    status: { type: String },
                    description: { type: String },
                    test: {
                        bla: String,
                        blub: String,
                    },
                    technicalContacts: { type: [String] },
                    productContacts: { type: [String] },
                    group: { type: String },
                    modules: [
                        {
                            name: { type: String },
                            technicalContacts: { type: [String] },
                            productContacts: { type: [String] },
                        },
                    ],
                },
            },
            { collection: 'projectInfos' },
        );
        mongoose.model('ProjectInfo', ComponentSchema);

        let expected = [];

        let result = mongooseAvroSchemaGenerator.generate();
        console.dir(result, { depth: null, colors: true });
    });
});

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
                type: [
                    'null',
                    {
                        type: 'string',
                    },
                ],
            },
            {
                default: null,
                name: 'schemaString',
                type: [
                    'null',
                    {
                        type: 'string',
                    },
                ],
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
                type: [
                    'null',
                    {
                        type: 'boolean',
                    },
                ],
            },
            {
                default: null,
                name: 'schemaBoolean',
                type: [
                    'null',
                    {
                        type: 'boolean',
                    },
                ],
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
                type: [
                    'null',
                    {
                        type: 'double',
                    },
                ],
            },
            {
                default: null,
                name: 'schemaNumber',
                type: [
                    'null',
                    {
                        type: 'double',
                    },
                ],
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
                type: [
                    'null',
                    {
                        type: 'bytes',
                    },
                ],
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
                type: [
                    'null',
                    {
                        type: 'double',
                    },
                ],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();
        assertHasFields(result, expected);
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
                type: ['null', { type: 'double' }],
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
                type: { type: 'double' },
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
                type: ['null', { type: 'double' }],
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
                type: ['null', { type: 'double' }],
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
                    type: ['null', { type: 'double' }],
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
                    type: ['null', { type: 'double' }],
                },
                type: 'array',
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
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
                        type: ['null', { type: 'double' }],
                    },
                ],
            },
        ];

        let result = mongooseAvroSchemaGenerator.generate();

        assertHasFields(result, expected);
    });

    it('parses embedded documents with key "type"', function() {});

    it('parses arrays', function() {});
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
