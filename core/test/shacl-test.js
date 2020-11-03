/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ShaclValidator = require('../shaclValidator').Validator;

const testsPath = path.join(__dirname, 'data', 'tests');
const answersPath = path.join(__dirname, 'data', 'expected');
const shapesPath = path.join(__dirname, 'data', 'shapes');
const utilsPath = path.join(__dirname, 'data', 'utils');


function stringifyFailure(failure) {
    const keys = Object.keys(failure);
    keys.sort();
    return keys.map(key => `${key}:${failure[key]}`).join(';');
}

async function test(validator, test, valid) {
    const data = fs.readFileSync(path.join(testsPath, test)).toString();
    const answer = JSON.parse(fs.readFileSync(path.join(answersPath, valid)).toString());
    const res = await validator.validate(data, {baseUrl: 'http://example.org/test'});
    res.failures.forEach(failure => delete failure['message']);

    const actual = res.failures.map(stringifyFailure);
    const expected = answer.map(stringifyFailure);
    actual.sort();
    expected.sort();

    return assert.deepEqual(actual, expected);
}

describe('SHACL Missing property tests', function () {
    const shapes = fs.readFileSync(path.join(shapesPath, 'Schema.shacl')).toString();
    const subclasses = fs.readFileSync(path.join(utilsPath, 'Schema-subclasses.ttl')).toString();
    const validator = new ShaclValidator(shapes, {subclasses: subclasses});
    it("should return error if the property is missing", function () {
        return test(validator, 'Thing1.txt', 'Thing-mp.json');
    });
    it("should not fail if data has all required properties", function () {
        return test(validator, 'Thing2.txt', 'empty.json')
    });
});


describe('SHACL Type mismatch tests', function () {
    const shapes = fs.readFileSync(path.join(shapesPath, 'Schema.shacl')).toString();
    const subclasses = fs.readFileSync(path.join(utilsPath, 'Schema-subclasses.ttl')).toString();
    const validator = new ShaclValidator(shapes, {subclasses: subclasses});
    it("should fail with TypeMismatch if regex is failing", function () {
        return test(validator, 'Thing3.txt', 'Thing-tm.json');
    });
    it("should fail with TypeMismatch and MissingProperty", function () {
        return test(validator, 'Thing4.txt', 'Thing-tmmp.json');
    })
});

describe('SHACL Annotation tests', function () {
    const shapes = fs.readFileSync(path.join(shapesPath, 'Schema.shacl')).toString();
    const subclasses = fs.readFileSync(path.join(utilsPath, 'Schema-subclasses.ttl')).toString();
    const annotations = {
        description: 'http://www.w3.org/2000/01/rdf-schema#comment',
        severity: 'http://www.w3.org/2000/01/rdf-schema#label'
    }
    const validator = new ShaclValidator(shapes, {subclasses: subclasses, annotations: annotations});
    it("should add annotations if specified", function () {
        return test(validator, 'Thing4.txt', 'Thing-tmmp-annot.json');
    });
});


describe('SHACL Extension tests', function () {
    const shapes = fs.readFileSync(path.join(shapesPath, 'Schema.shacl')).toString();
    const subclasses = fs.readFileSync(path.join(utilsPath, 'Schema-subclasses.ttl')).toString();
    const validator = new ShaclValidator(shapes, {subclasses: subclasses});
    it("should deal with extensions", function () {
        return test(validator, 'CreativeWork1.txt', 'CreativeWork-extension.json');
    });
});

describe('SHACL Input data formats tests', function () {
    const shapes = fs.readFileSync(path.join(shapesPath, 'Schema.shacl')).toString();
    const subclasses = fs.readFileSync(path.join(utilsPath, 'Schema-subclasses.ttl')).toString();
    const validator = new ShaclValidator(shapes, {subclasses: subclasses});
    it("should support JSON-LD", function () {
        return test(validator, 'Thing4.txt', 'Thing-tmmp.json');
    });
    it("should support Microdata", function () {
        return test(validator, 'Thing4-Microdata.txt', 'Thing-tmmp.json');
    });
    it("should support RDFa", function () {
        return test(validator, 'Thing4-rdfa.txt', 'Thing-tmmp.json');
    });
});