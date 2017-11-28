<p align="center">
  <img alt="Mongoose Avro Schema Creator" src="./.github/logo.svg" width="888">
</p>

<p align="center">
  <a href="https://travis-ci.org/researchgate/mongoose-avro-schema-generator"><img alt="Build Status" src="https://travis-ci.org/researchgate/mongoose-avro-schema-generator.svg?branch=master"></a>
  <a href="https://codecov.io/gh/researchgate/mongoose-avro-schema-generator"><img alt="Codecov" src="https://img.shields.io/codecov/c/github/researchgate/mongoose-avro-schema-generator.svg"></a>
  <a href="https://dependencyci.com/github/researchgate/mongoose-avro-schema-generator"><img alt="Dependency Status" src="https://dependencyci.com/github/researchgate/mongoose-avro-schema-generator/badge"></a>
  <a href="https://www.npmjs.com/package/@researchgate/mongoose-avro-schema-generator"><img alt="NPM version" src="https://img.shields.io/npm/v/@researchgate/mongoose-avro-schema-generator.svg"></a>
</p>

A node module that generates Apache avro schemas from mongoose schemas.

## Getting Started
### Prerequesites
The Mongoose Avro Schema Generator requires `node >= 9.2.0`. All dependencies will be installed automatically.

### Installation
Using yarn:
```shell
yarn add @researchgate/mongoose-avro-schema-generator
```

Using npm:
```shell
npm install @researchgate/mongoose-avro-schema-generator
```

### Quick Start
In order to generate schemas for all registered mongoose models just import the module and run the `generate()` method.
Let's first register a simple mongoose model.
```js
let schema = new Schema({
    something: String,
});
mongoose.model('mySchema', schema);
```
Now we import the Mongoose Avro Schema Generator and call the `generate()` method.
```js
const mongooseAvroSchemaGenerator = require('mongoose-avro-schema-generator');
```
Then `mongooseAvroSchemaGenerator.generate()` will output an array of all generated schemas.
```json
[
    {
        "dbcollection": "myschemas",
        "dbtype": "mongodb",
        "fields": [
            {
                "default": null,
                "name": "something",
                "type": ["null", "string"]
            },
            {
                "default": null,
                "name": "_id",
                "type": [
                    "null",
                    {
                        "subtype": "objectid",
                        "type": "string"
                    }
                ]
            },
            {
                "default": null,
                "name": "__v",
                "type": ["null", "double"]
            }
        ],
        "name": "mySchema",
        "namespace": "some.namespace",
        "type": "record"
    }
]
```
Please note that the schema also contains the auto-generated fields `_id` and `_v`. In the following chapter we will have a look at further details.

## Usage
In this chapter we will learn how the Mongoose Avro Schema Generator generates Avro schemas.

### Nullable Fields
The avro type `null` will be included automatically if there is no `required : true` set for a field in mongoose.
Hence the avro schema for the following mongoose schema
```js
let schema = new Schema({
    something: { type: String },
});
mongoose.model('mySchema', schema);
```
will have union type of `null` and `string`
```json
{
    "default": null,
    "name": "something",
    "type": ["null", "string"]
}
```
However if we add the required attribute
```js
let schema = new Schema({
    something: { type: String, required: true },
});
mongoose.model('mySchema', schema);
```
The type will be restricted to string
```json
{
  "name": "something",
  "type": "string"
}
```
We note that also the default value of `null` has been removed.

### Default Values
Default values are either defined explicitly or are implicitly inferred.

#### Explicit Defaults
The mongoose schema
```js
new Schema({
    something: { type: String, default: 'foo' },
});
```
will lead to an avro schema with the following field
```json
{
    "default": "foo",
    "name": "something",
    "type": ["null", "string"]
}
```
#### Implicit Defaults
If a field can be null and no explicit default value is defined, the default will be set to `null`, if the type is an array however, the default will be the empty array `[]`.
```js
new Schema({
    something: { type: [String] },
});
```
will generate an avro schema with the following field
```
{
    name: 'something',
    default: [],
    items: {
        name: 'somethingItem',
        default: null,
        type: ['null', 'string'],
    },
    type: 'array',
},
```
### Array Items
As the avro schema specification requires each each record to have a name, records appearing as item of an array will have the name if the array with the suffix "Item". 

### Unallowed Types.
The `Schema.Types.Mixed` type is not supported, as well as the equivalent empty object literal `{}` or the empty array `[]`. Trying to generate a schema from a model with such a type will result in an error.

### Customizing Schema Generation 
If you want to restrict the schema generation to a set of models, you can provide them in the first parameter.
```js
mongooseAvroSchemaGenerator.generate(['User', 'Transaction']);
```
The default is an empty array in which case schemas for all registered models will be loaded.

The Mongoose Avro Schema Generator uses "mongoose" as a default namespace for each schema. You can override that with the `namespace` parameter in the options array. 
```js
mongooseAvroSchemaGenerator.generate([], { namespace: 'some.custom.namespace' });
```

## Complex Example
Let's register a schema with mongoose.
```js
const mongoose = require('mongoose');
const mongooseAvroSchemaGenerator = require('mongoose-avro-schema-generator');

let schema = new Schema({
    something: { type: [[Number]], default: ['foo'] },
    else: [String]
});
mongoose.model('mySchema', schema);
```
Then `mongoosevroSchemaGenerator.generate(['mySchema'], { namespace: 'some.namespace' })` will return the following avro schema:
```json
[
    {
        "dbcollection": "myschemas",
        "dbtype": "mongodb",
        "fields": [
            {
                "default": ["foo"],
                "items": {
                    "default": [],
                    "items": {
                        "default": null,
                        "name": "somethingItemItem",
                        "type": ["null", "double"]
                    },
                    "name": "somethingItem",
                    "type": "array"
                },
                "name": "something",
                "type": "array"
            },
            {
                "default": [],
                "items": {
                    "default": null,
                    "name": "elseItem",
                    "type": ["null", "string"]
                },
                "name": "else",
                "type": "array"
            },
            {
                "default": null,
                "name": "_id",
                "type": [
                    "null",
                    {
                        "subtype": "objectid",
                        "type": "string"
                    }
                ]
            },
            {
                "default": null,
                "name": "__v",
                "type": ["null", "double"]
                
            }
        ],
        "name": "mySchema",
        "namespace": "some.namespace",
        "type": "record"
    }
]
```


