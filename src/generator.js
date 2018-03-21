'use strict';

const KEY_TYPE = 'type';
const KEY_DEFAULT = 'default';
const AVRO_TYPE_RECORD = 'record';
const AVRO_TYPE_ARRAY = 'array';
const AVRO_TYPE_STRING = 'string';
const AVRO_TYPE_LONG = 'long';
const AVRO_TYPE_BOOLEAN = 'boolean';
const AVRO_TYPE_DOUBLE = 'double';
const AVRO_TYPE_BYTES = 'bytes';

class Generator {
    constructor(mongoose, namespace = 'mongoose') {
        this.mongoose = mongoose;
        this.namespace = namespace;

        this._initializeMongooseTypeMapping(mongoose);
    }

    generate(models = []) {
        let results = [];

        if (models.length === 0) {
            models = this.mongoose.modelNames();
        }

        models.forEach(name => {
            let model;
            try {
                model = this.mongoose.model(name);
            } catch (err) {
                throw new Error(`Could not find mongoose schema "${name}": ${err.message}`);
            }

            let schema = model.schema.tree;
            let document;

            try {
                document = this._parse(name, schema);
            } catch (err) {
                throw new Error(`An error occured while parsing schema "${name}": ${err.message}`);
            }

            // convert the record to a schema object
            document.fields = document.type[1].fields;
            delete document.type;
            delete document.default;

            document.dbtype = 'mongodb';
            document.namespace = this.namespace;
            document.dbcollection = model.collection.name;
            results.push(document);
        });

        return results;
    }

    _initializeMongooseTypeMapping(mongoose) {
        this.typeMapping = [
            {
                sources: [String, mongoose.Schema.Types.String],
                typeDefinition: AVRO_TYPE_STRING,
            },
            {
                sources: [Boolean, mongoose.Schema.Types.Boolean],
                typeDefinition: AVRO_TYPE_BOOLEAN,
            },
            {
                sources: [Number, mongoose.Schema.Types.Number],
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
                sources: [mongoose.Schema.Types.ObjectId],
                typeDefinition: {
                    type: AVRO_TYPE_STRING,
                    subtype: 'objectid',
                },
            },
        ];
        this.ignoredTypes = [mongoose.VirtualType]; // We ignore the virtual type since it is only used internally by mongoose.
        this.unsupportedTypes = [mongoose.Schema.Types.Mixed]; // We cannot support the mixed type because avro has to know the actual type.
    }

    _parse(key, object) {
        let result = this._parseDelegated(key, object);
        let defaultValue = this._getDefault(result.type, object);

        if (typeof defaultValue !== 'undefined') {
            result.default = defaultValue;
        }

        return result;
    }

    _parseDelegated(key, object) {
        if (object instanceof Array) {
            return this._parseArray(key, object);
        }

        let type = typeof object;

        if (this._isUnsupportedType(object)) {
            throw new Error('Unsupported type ' + object);
        }

        if (type === 'function' && this._isPrimitive(object)) {
            return this._parsePrimitive(key, object);
        }

        if (type === 'object' && !Generator._isEmptyObject(object)) {
            if (this._isArrayObject(object)) {
                return this._parseArray(key, object.type);
            }

            if (this._isPrimitiveObject(object)) {
                return this._parsePrimitiveObject(key, object);
            }

            return this._parseObject(key, object);
        }

        throw new Error('Unable to parse entity ' + key + ': ' + object);
    }

    _parseObject(key, object) {
        let fields = [];
        for (let name in object) {
            if (object.hasOwnProperty(name) && !this._isIgnoredType(object[name])) {
                let field = this._parse(name, object[name]);
                fields.push(field);
            }
        }

        let type = {
            name: key + 'Embedded',
            type: AVRO_TYPE_RECORD,
            fields: fields,
        };

        let result = Generator._addNull(type);
        result.name = key;

        return result;
    }

    _parseArray(key, array) {
        let items = this._parse(key + 'Item', array[0]);
        items = items.type;

        let type = {
            type: AVRO_TYPE_ARRAY,
            items: items,
        };

        let result = Generator._addNull(type);

        result.name = key;
        return result;
    }

    _parsePrimitive(key, primitive) {
        let mappedType = this._getMappedType(primitive);
        mappedType = Generator._addNull(mappedType);

        return Object.assign({ name: key }, mappedType);
    }

    _parsePrimitiveObject(key, primitiveObject) {
        let mappedType = this._getMappedType(primitiveObject.type);
        if (!Generator._isRequired(primitiveObject)) {
            mappedType = Generator._addNull(mappedType);
            return Object.assign({ name: key }, mappedType);
        }

        mappedType = { type: mappedType };

        return Object.assign({ name: key }, mappedType);
    }

    _isPrimitive(object) {
        if (Generator._isEmptyObject(object) || Generator._isEmptyArray(object)) {
            return true;
        }

        if (object instanceof Array) {
            return this._isPrimitive(object[0]);
        }

        return this.typeMapping.some(mapping => {
            return mapping.sources.includes(object);
        });
    }

    _isPrimitiveObject(object) {
        if (!object.hasOwnProperty(KEY_TYPE) || !this._isPrimitive(object.type)) {
            return false;
        }

        for (let key in object) {
            if (
                object.hasOwnProperty(key) &&
                key !== KEY_TYPE &&
                (this._isPrimitive(object[key]) || typeof object[key] === 'object')
            ) {
                return false;
            }
        }

        return true;
    }

    _isArrayObject(object) {
        if (!object.hasOwnProperty(KEY_TYPE) || !(object.type instanceof Array) || !this._isPrimitive(object.type[0])) {
            return false;
        }

        for (let key in object) {
            if (object.hasOwnProperty(key) && key !== KEY_TYPE && key !== KEY_DEFAULT) {
                if (this._isPrimitive(object[key]) || typeof object[key] === 'object') {
                    return false;
                }
            }
        }

        return true;
    }

    _isIgnoredType(object) {
        return this.ignoredTypes.some(type => {
            return object instanceof type;
        });
    }

    _isUnsupportedType(object) {
        return this.unsupportedTypes.some(type => {
            return object === type;
        });
    }

    _getMappedType(type) {
        return this.typeMapping.find(mapping => {
            return mapping.sources.includes(type);
        }).typeDefinition;
    }

    static _isEmptyObject(object) {
        return typeof object === 'object' && Object.getOwnPropertyNames(object).length === 0;
    }

    static _isEmptyArray(object) {
        return object instanceof Array && object.length === 0;
    }

    static _isRequired(primitiveObject) {
        if (!primitiveObject.hasOwnProperty('required')) {
            return false;
        }

        if (typeof primitiveObject.required === 'function') {
            return primitiveObject.required();
        }

        return primitiveObject.required === true;
    }

    static _addNull(typeDefinition) {
        return { type: ['null', typeDefinition] };
    }

    _getDefault(typeDefinition, object) {
        // if a default is defined inside the object and not a function, we use that
        if (object.hasOwnProperty('default') && !this._isArrayObject(object) && typeof object.default !== 'function') {
            return object.default;
        }

        // if the type allows null we allow null as default
        if (typeDefinition instanceof Array && typeDefinition.includes('null')) {
            return null;
        }

        return undefined;
    }
}

module.exports = Generator;
