# Mongoose Avro Schema Creator

[![Build Status](https://travis-ci.org/researchgate/node-package-blueprint.svg?branch=master)](https://travis-ci.org/researchgate/node-package-blueprint)
[![Codecov](https://img.shields.io/codecov/c/github/researchgate/node-package-blueprint.svg)](https://codecov.io/gh/researchgate/node-package-blueprint)
[![Dependency Status](https://dependencyci.com/github/researchgate/node-package-blueprint/badge)](https://dependencyci.com/github/researchgate/node-package-blueprint)

TODO:
mention Item suffix
mention invalid things

### Notes
* Schema has to exactly represent DB! Use versionKey: false if your DB does not have the __v field for example (which can happen if Mongoose
only reads, but never writes).
* Function defaults are not supported.
* Mixed type is not supported (and never will). Avoid mixed types as well as empty arrays or object literals.
* No support for custom types.
* No support for schemas created from ES6 classes yet.
* Buffer should be used with care.
