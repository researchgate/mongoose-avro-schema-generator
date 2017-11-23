'use strict';

let mongoose = require('mongoose');

module.exports = () => {
    mongoose.modelNames().forEach(name => {
        delete mongoose.models[name];
        delete mongoose.modelSchemas[name];
    });
};
