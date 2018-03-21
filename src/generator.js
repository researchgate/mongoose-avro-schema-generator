'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KEY_TYPE = 'type';
const KEY_DEFAULT = 'default';
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
        typeDefinition: AVRO_TYPE_STRING,
    },
    {
        sources: [Boolean, Schema.Types.Boolean],
        typeDefinition: AVRO_TYPE_BOOLEAN,
    },
    {
        sources: [Number, Schema.Types.Number],
        typeDefinition: AVRO_TYPE_DOUBLE,
    },
    {
        sources: [Buffer],
        typeDefinition: AVRO_TYPE_BYTES,
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
let mongooseInstance;

let parse = (key, object) => {
    let result = parseDelegated(key, object);
    let defaultValue = getDefault(result.type, object);

    if (typeof defaultValue !== 'undefined') {
        result.default = defaultValue;
    }

    return result;
};

let parseDelegated = (key, object) => {
    if (object instanceof Array) {
        return parseArray(key, object);
    }

    let type = typeof object;

    if (isUnsupportedType(object)) {
        throw new Error('Unsupported type ' + object);
    }

    if (type === 'function' && isPrimitive(object)) {
        return parsePrimitive(key, object);
    }

    if (type === 'object' && !isEmptyObject(object)) {
        if (isArrayObject(object)) {
            return parseArray(key, object.type);
        }

        if (isPrimitiveObject(object)) {
            return parsePrimitiveObject(key, object);
        }

        return parseObject(key, object);
    }

    throw new Error('Unable to parse entity ' + key + ': ' + object);
};

let parseObject = (key, object) => {
    let fields = [];
    for (let name in object) {
        if (object.hasOwnProperty(name) && !isIgnoredType(object[name])) {
            let field = parse(name, object[name]);
            fields.push(field);
        }
    }

    let type = {
        name: key + 'Embedded',
        type: AVRO_TYPE_RECORD,
        fields: fields,
    };

    let result = addNull(type);
    result.name = key;

    return result;
};

let parseArray = (key, array) => {
    let items = parse(key + 'Item', array[0]);
    if (items.type !== 'record') {
        items = items.type;
    }

    let type = {
        type: AVRO_TYPE_ARRAY,
        items: items,
    };

    let result = addNull(type);

    result.name = key;
    return result;
};

let parsePrimitive = (key, primitive) => {
    let mappedType = getMappedType(primitive);
    mappedType = addNull(mappedType);

    return Object.assign({ name: key }, mappedType);
};

let parsePrimitiveObject = (key, primitiveObject) => {
    let mappedType = getMappedType(primitiveObject.type);
    if (!isRequired(primitiveObject)) {
        mappedType = addNull(mappedType);
        return Object.assign({ name: key }, mappedType);
    }

    mappedType = { type: mappedType };

    return Object.assign({ name: key }, mappedType);
};

let isPrimitive = object => {
    if (isEmptyObject(object) || isEmptyArray(object)) {
        return true;
    }

    if (object instanceof Array) {
        return isPrimitive(object[0]);
    }

    return TYPE_MAPPING.some(mapping => {
        return mapping.sources.includes(object);
    });
};

let isPrimitiveObject = object => {
    if (!object.hasOwnProperty(KEY_TYPE) || !isPrimitive(object.type)) {
        return false;
    }

    for (let key in object) {
        if (
            object.hasOwnProperty(key) &&
            key !== KEY_TYPE &&
            (isPrimitive(object[key]) || typeof object[key] === 'object')
        ) {
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
        if (object.hasOwnProperty(key) && key !== KEY_TYPE && key !== KEY_DEFAULT) {
            if (isPrimitive(object[key]) || typeof object[key] === 'object') {
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
        return object === type;
    });
};

let isEmptyObject = object => {
    return typeof object === 'object' && Object.getOwnPropertyNames(object).length === 0;
};

let isEmptyArray = object => {
    return object instanceof Array && object.length === 0;
};

let getMappedType = type => {
    return TYPE_MAPPING.find(mapping => {
        return mapping.sources.includes(type);
    }).typeDefinition;
};

let isRequired = primitiveObject => {
    if (!primitiveObject.hasOwnProperty('required')) {
        return false;
    }

    if (typeof primitiveObject.required === 'function') {
        return primitiveObject.required();
    }

    return primitiveObject.required === true;
};

let addNull = typeDefinition => {
    return { type: ['null', typeDefinition] };
};

let getDefault = (typeDefinition, object) => {
    // if a default is defined inside the object and not a function, we use that
    if (object.hasOwnProperty('default') && !isArrayObject(object) && typeof object.default !== 'function') {
        return object.default;
    }

    // if the type allows null we allow null as default
    if (typeDefinition instanceof Array && typeDefinition.includes('null')) {
        return null;
    }

    return undefined;
};

let init = mongoose => {
    mongooseInstance = mongoose;
};

let generate = (models = [], options = {}) => {
    if (!mongooseInstance) {
        throw new Error(
            'Mongoose Avro Schema Generator was not initialized. Please run the init() method and pass a mongoose instance',
        );
    }

    let results = [];
    namespace = options.namespace || namespace;

    if (models.length === 0) {
        models = mongooseInstance.modelNames();
    }

    models.forEach(name => {
        let model;
        try {
            model = mongooseInstance.model(name);
        } catch (err) {
            throw new Error(`Could not find mongoose schema "${name}": ${err.message}`);
        }

        let schema = model.schema.tree;
        let document;

        try {
            document = parse(name, schema);
        } catch (err) {
            throw new Error(`An error occured while parsing schema "${name}": ${err.message}`);
        }

        // convert the record to a schema object
        document.fields = document.type[1].fields;
        delete document.type;
        delete document.default;

        document.dbtype = 'mongodb';
        document.namespace = namespace;
        document.dbcollection = model.collection.name;
        results.push(document);
    });

    return results;
};

module.exports = {
    init: init,
    generate: generate,
};
