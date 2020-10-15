/**
 * Copyright 2020 Anastasiia Byvsheva & Dan Brickley
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
const cmd = require('child_process');
const path = require('path');
const fs = require('fs');
const RdfTerm = require('rdf-string');

const validation = require('../index');
const tempPath = path.join(__dirname, 'data', 'utils', 'temp.txt');

function stringifyFailure(failure) {
    let keys = Object.keys(failure);
    keys.sort();
    return keys.map(key => `${key}:${failure[key]}`).join(';');
}

describe('Parsing tests', function () {
    let baseUrl = 'http://example.org/test';
    let parseCli = (input, base) => {
        let command =`node cli --parse ` +
            `--input ${input} ` +
            `--format nquads ` +
            `--output ${tempPath} ` +
            `--base ${base}`;
        cmd.execSync(command);
        return validation.parseTurtle(fs.readFileSync(tempPath).toString(), base);
    }
    it("should parse JSON-LD", function () {
        let input = path.join(__dirname, 'data', 'tests', 'Thing3.txt').toString();
        let actual = parseCli(input, baseUrl);
        return validation.parseJsonLd(fs.readFileSync(input).toString(), baseUrl)
            .then(expected => assert.deepEqual(actual, expected));
    });
    it("should parse Microdata", function () {
        let input = path.join(__dirname, 'data', 'tests', 'Thing4-Microdata.txt').toString();
        let actual = parseCli(input, baseUrl);
        return validation.parseMicrodata(fs.readFileSync(input).toString(), baseUrl)
            .then(expected => assert.deepEqual(actual, expected));
    });
    it("should parse RDFa", function () {
        let input = path.join(__dirname, 'data', 'tests', 'Thing4-rdfa.txt').toString();
        let actual = parseCli(input, baseUrl);
        return validation.parseRdfa(fs.readFileSync(input).toString(), baseUrl)
            .then(expected => assert.deepEqual(actual, expected));
    });
});

describe('Validation tests', function () {
    let baseUrl = 'http://example.org/test';
    let runValidation = (command, expectedPath) => {
        cmd.execSync(command);
        let actual = JSON.parse(fs.readFileSync(tempPath).toString());
        actual.forEach(failure => delete failure['message']);
        actual = actual.map(stringifyFailure);
        let expected = JSON.parse(fs.readFileSync(expectedPath).toString())
            .map(stringifyFailure);
        actual.sort();
        expected.sort();
        return assert.deepEqual(actual, expected);
    }
    it('should validate ShEx', function () {
        let input = path.join(__dirname, 'data', 'tests', 'Thing4.txt').toString();
        let command = `node cli --validate ` +
            `--shex ${path.join(__dirname, 'data', 'shapes', 'Schema.shex')} ` +
            `--input ${input} ` +
            `--output ${tempPath} ` +
            `--target https://schema.org/validation#Thing ` +
            `--base ${baseUrl} ` +
            `--annotations ${path.join(__dirname, 'data', 'utils', 'annotations.json')}`;
        return runValidation(command, path.join(__dirname, 'data', 'answers', 'Thing-tmmp-annot.json'));
    });

    it('should validate SHACL', function () {
        let input = path.join(__dirname, 'data', 'tests', 'Thing4.txt').toString();
        let command = `node cli --validate ` +
            `--shex ${path.join(__dirname, 'data', 'shapes', 'Schema.shex')} ` +
            `--input ${input} ` +
            `--output ${tempPath} ` +
            `--target https://schema.org/validation#Thing ` +
            `--base ${baseUrl} ` +
            `--annotations ${path.join(__dirname, 'data', 'utils', 'annotations.json')} ` +
            `--subclasses ${path.join(__dirname, 'data', 'utils', 'Schema-subclasses.ttl')}`;
        return runValidation(command, path.join(__dirname, 'data', 'answers', 'Thing-tmmp-annot.json'));
    })
})
