<p align="center">
  <img alt="Mongoose Avro Schema Creator" src="./.github/logo.svg" width="888">
</p>
A small node module that generates Apache avro schemas from mongoose schemas.

## Installation
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


