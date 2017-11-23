'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KEY_TYPE = 'type';
const AVRO_TYPE_RECORD = 'record';
const AVRO_TYPE_ARRAY = 'array';
const AVRO_TYPE_STRING = 'string';
const AVRO_TYPE_LONG = 'long';
const AVRO_TYPE_BOOLEAN = 'boolean';
const AVRO_TYPE_DOUBLE = 'double';
const AVRO_TYPE_BYTES = 'bytes';

const TYPE_MAPPING = [
    {
        sources: [String, Schema.Types.String],
        typeDefinition: {
            type: AVRO_TYPE_STRING,
        },
    },
    {
        sources: [Boolean, Schema.Types.Boolean],
        typeDefinition: {
            type: AVRO_TYPE_BOOLEAN,
        },
    },
    {
        sources: [Number, Schema.Types.Number],
        typeDefinition: {
            type: AVRO_TYPE_DOUBLE,
        },
    },
    {
        sources: [Buffer],
        typeDefinition: {
            type: AVRO_TYPE_BYTES,
        },
    },
    {
        sources: [Date],
        typeDefinition: {
            type: AVRO_TYPE_LONG,
            subtype: 'date',
        },
    },
    {
        sources: [Schema.Types.ObjectId],
        typeDefinition: {
            type: AVRO_TYPE_STRING,
            subtype: 'objectid',
        },
    },
];

const IGNORED_TYPES = [mongoose.VirtualType]; // We ignore the virtual type since it is only used internally by mongoose.
const UNSUPPORTED_TYPES = [Schema.Types.Mixed]; // We cannot support the mixed type because avro has to know the actual type.

let namespace = 'mongoose';

let parse = (key, object) => {
    if (object instanceof Array) {
        return parseArray(key, object);
    }

    let type = typeof object;

    if (type === 'function' && isPrimitive(object)) {
        return parsePrimitive(key, object);
    }

    if (type === 'object') {
        if (isUnsupportedType(object)) {
            throw new Error('Unsupported type ' + object);
        }

        if (isPrimitiveObject(object)) {
            return parsePrimitiveObject(key, object);
        }
        if (isArrayObject(object)) {
            return parseArray(key, object.type);
        }

        return parseObject(key, object);
    }

    throw new Error('Unable to parse entity' + key + ': ' + object);
};

let parseObject = (key, object) => {
    let fields = [];
    for (let name in object) {
        if (object.hasOwnProperty(name) && !isIgnoredType(object[name])) {
            let field = parse(name, object[name]);

            let defaultValue = getDefault(field.type, object[name]);
            if (typeof defaultValue !== 'undefined') {
                field.default = defaultValue;
            }

            fields.push(field);
        }
    }

    return {
        type: AVRO_TYPE_RECORD,
        fields: fields,
        name: key,
    };
};

let parseArray = (key, array) => {
    return {
        name: key,
        type: AVRO_TYPE_ARRAY,
        items: parse(key + 'Item', array[0]),
    };
};

let parsePrimitive = (key, primitive) => {
    let target = getMappedTarget(primitive);
    target = addNull(target);
    return { name: key, type: target };
};

let parsePrimitiveObject = (key, primitiveObject) => {
    let target = getMappedTarget(primitiveObject.type);
    if (!isRequired(primitiveObject)) {
        return { name: key, type: addNull(target) };
    }
    return { name: key, type: target };
};

let isPrimitive = type => {
    return TYPE_MAPPING.some(mapping => {
        return mapping.sources.includes(type);
    });
};

let isPrimitiveObject = object => {
    if (!object.hasOwnProperty(KEY_TYPE) || !isPrimitive(object.type)) {
        return false;
    }

    for (let key in object) {
        if (object.hasOwnProperty(key) && key !== KEY_TYPE && isPrimitive(object[key])) {
            return false;
        }
    }

    return true;
};

let isArrayObject = object => {
    if (!object.hasOwnProperty(KEY_TYPE) || !(object.type instanceof Array) || !isPrimitive(object.type[0])) {
        return false;
    }

    for (let key in object) {
        if (object.hasOwnProperty(key)) {
            if (
                (key !== KEY_TYPE && isPrimitive(object[key])) ||
                (object.key instanceof Array && isPrimitive(object.key[0]))
            ) {
                return false;
            }
        }
    }

    return true;
};

let isIgnoredType = object => {
    return IGNORED_TYPES.some(type => {
        return object instanceof type;
    });
};

let isUnsupportedType = object => {
    return UNSUPPORTED_TYPES.some(type => {
        return object instanceof type;
    });
};

let getMappedTarget = type => {
    return TYPE_MAPPING.find(mapping => {
        return mapping.sources.includes(type);
    }).typeDefinition;
};

let isRequired = primitiveObject => {
    if (!primitiveObject.hasOwnProperty('required')) {
        return false;
    }

    if (primitiveObject.required !== true) {
        return false;
    }

    if (typeof primitiveObject.required === 'function') {
        return primitiveObject.required();
    }

    return true;
};

let addNull = typeDefinition => {
    return ['null', typeDefinition];
};

let getDefault = (typeDefinition, object) => {
    // if a default is defined inside the object and not a function, we use that
    if (object.hasOwnProperty('default') && typeof object !== 'function') {
        return object.default;
    }

    // if object is an array the default will be set to [] unless a default is defined explicitly
    if (object instanceof Array) {
        return [];
    }

    // if the type allows null we allow null as default
    if (typeDefinition instanceof Array && typeDefinition.includes('null')) {
        return null;
    }

    return undefined;
};

let generate = (models = [], options = {}) => {
    let results = [];
    namespace = options.namespace || namespace;

    if (models.length === 0) {
        models = mongoose.modelNames();
    }

    models.forEach(name => {
        let model = mongoose.model(name);
        let schema = model.schema.tree;

        let document = {};
        document = Object.assign(document, parse(name, schema));

        document.dbtype = 'mongodb';
        document.namespace = namespace;
        document.dbcollection = model.collection.name;
        results.push(document);
    });

    return results;
};

module.exports = { generate: generate };
