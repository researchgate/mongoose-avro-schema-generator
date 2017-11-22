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

const TYPE_MAPPING = [
    {
        sources: [String, Schema.Types.String],
        typeDefinition: {
            type: AVRO_TYPE_STRING,
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
        sources: [Schema.Types.ObjectId],
        typeDefinition: {
            type: AVRO_TYPE_STRING,
            subtype: 'objectid',
        },
    },
    {
        sources: [Schema.Types.Mixed],
        typeDefinition: {
            type: AVRO_TYPE_STRING,
        },
    },
];

let parse = object => {
    if (object instanceof Array) {
        return parseArray(object);
    }

    let type = typeof object;

    if (type === 'function' && isPrimitive(object)) {
        return parsePrimitive(object);
    }

    if (type === 'object') {
        if (isPrimitiveObject(object)) {
            return parsePrimitiveObject(object);
        }
        if (isArrayObject(object)) {
            return parseArray(object.type);
        }

        return parseObject(object);
    }

    throw new Error('Unable to parse object of type ' + type + ': ' + object);
};

let parseObject = object => {
    let fields = [];
    for (let name in object) {
        if (object.hasOwnProperty(name)) {
            let type = parse(object[name]);
            let field = {
                name: name,
                type: type,
            };

            let defaultValue = getDefault(type, object[name]);
            if (typeof defaultValue !== 'undefined') {
                field.default = defaultValue;
            }

            fields.push(field);
        }
    }

    return {
        type: AVRO_TYPE_RECORD,
        fields: fields,
    };
};

let parseArray = array => {
    return {
        type: AVRO_TYPE_ARRAY,
        items: parse(array[0], false),
    };
};

let parsePrimitive = primitive => {
    let target = getMappedTarget(primitive);
    target = addNull(target);
    return target;
};

let parsePrimitiveObject = primitiveObject => {
    let result = getMappedTarget(primitiveObject.type);
    if (!isRequired(primitiveObject)) {
        return addNull(result);
    }
    return result;
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

let generate = () => {
    let results = [];
    mongoose.modelNames().forEach(name => {
        let schema = mongoose.model(name).schema.obj;
        let document = parse(schema);
        document.name = name;
        results.push(document);
    });

    return results;
};

module.exports = generate;
