<p align="center">
  <img alt="Mongoose Avro Schema Creator" src="./.github/logo.svg" width="888">
</p>

<p align="center">
  <a href="https://travis-ci.org/researchgate/mongoose-avro-schema-generator"><img alt="Build Status" src="https://travis-ci.org/researchgate/mongoose-avro-schema-generator.svg?branch=master"></a>
  <a href="https://codecov.io/gh/researchgate/mongoose-avro-schema-generator"><img alt="Codecov" src="https://img.shields.io/codecov/c/github/researchgate/mongoose-avro-schema-generator.svg"></a>
  <a href="https://dependencyci.com/github/researchgate/mongoose-avro-schema-generator"><img alt="Dependency Status" src="https://dependencyci.com/github/researchgate/mongoose-avro-schema-generator/badge"></a>
  <a href="https://www.npmjs.com/package/@researchgate/mongoose-avro-schema-generator"><img alt="NPM version" src="https://img.shields.io/npm/v/@researchgate/mongoose-avro-schema-generator.svg"></a>
</p>

A small node module that generates Apache avro schemas from mongoose schemas.

## Installation

[![Greenkeeper badge](https://badges.greenkeeper.io/researchgate/mongoose-avro-schema-generator.svg)](https://greenkeeper.io/)
```
yarn add mongoose-avro-schema-generator
```

## Basic Usage
In order to generate schemas for all registered mongoose models just import the module and run the `generate()` method.
```
const mongooseAvroSchemaGenerator = require('mongoose-avro-schema-generator');

let avroSchemas = mongooseAvroSchemaGenerator.generate();
```

## Advanced Usage
If you want to restrict the schema generation to a set of models, you can provide them in the first parameter.
```
let avroSchemas = mongooseAvroSchemaGenerator.generate(['User', 'Transaction']);
```
The default is an empty array in which case schemas for all registered models will be loaded.

The Mongoose Avro Schema Generator uses "mongoose" as a default namespace for each schema. You can override that with the `namespace` parameter in the options array. 
```
let avroSchemas = mongooseAvroSchemaGenerator.generate([], { namespace: 'some.custom.namespace' });
```

## Caveats
Be aware of the following.
* The `Schema.Types.Mixed` type is not supported, as well as the equivalent empty object literal `{}` or the empty array `[]`. Trying to generate a schema from a model with such a type will result in an error.
* The avro type `null` will be included automatically if there is no `required : true` set for a field in mongoose.


