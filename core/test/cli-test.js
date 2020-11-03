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
const cmd = require('child_process');
const path = require('path');
const fs = require('fs');

const validation = require('../index');
const tempPath = path.join(__dirname, 'data', 'utils', 'temp.txt');

function stringifyFailure(failure) {
    const keys = Object.keys(failure);
    keys.sort();
    return keys.map(key => `${key}:${failure[key]}`).join(';');
}

describe('Parsing tests', function () {
    const baseUrl = 'http://example.org/test';
    const parseCli = (input, base) => {
        const command =`node cli --parse ` +
            `--input ${input} ` +
            `--format nquads ` +
            `--output ${tempPath} ` +
            `--base ${base}`;
        cmd.execSync(command);
        return validation.parseNQuads(fs.readFileSync(tempPath).toString(), baseUrl);
    };
    it("should parse JSON-LD", function () {
        const input = path.join(__dirname, 'data', 'tests', 'Thing3.txt').toString();
        const actual = parseCli(input, baseUrl);
        return validation.parseJsonLd(fs.readFileSync(input).toString(), baseUrl)
            .then(expected => assert.deepEqual(actual, expected));
    });
    it("should parse Microdata", function () {
        const input = path.join(__dirname, 'data', 'tests', 'Thing4-Microdata.txt').toString();
        const actual = parseCli(input, baseUrl);
        return validation.parseMicrodata(fs.readFileSync(input).toString(), baseUrl)
            .then(expected => assert.deepEqual(actual, expected));
    });
    it("should parse RDFa", function () {
        const input = path.join(__dirname, 'data', 'tests', 'Thing4-rdfa.txt').toString();
        const actual = parseCli(input, baseUrl);
        return validation.parseRdfa(fs.readFileSync(input).toString(), baseUrl)
            .then(expected => {
                assert.deepEqual(actual, expected)
            });
    });
});

describe('Validation tests', function () {
    const baseUrl = 'http://example.org/test';
    const runValidation = (command, expectedPath) => {
        cmd.execSync(command);
        let actual = JSON.parse(fs.readFileSync(tempPath).toString());
        actual.forEach(failure => delete failure['message']);
        actual = actual.map(stringifyFailure);
        const expected = JSON.parse(fs.readFileSync(expectedPath).toString())
            .map(stringifyFailure);
        actual.sort();
        expected.sort();
        return assert.deepEqual(actual, expected);
    }
    it('should validate ShEx', function () {
        const input = path.join(__dirname, 'data', 'tests', 'Thing4.txt').toString();
        const command = `node cli --validate ` +
            `--shex ${path.join(__dirname, 'data', 'shapes', 'Schema.shex')} ` +
            `--input ${input} ` +
            `--output ${tempPath} ` +
            `--target https://schema.org/validation#Thing ` +
            `--base ${baseUrl} ` +
            `--annotations ${path.join(__dirname, 'data', 'utils', 'annotations.json')}`;
        return runValidation(command, path.join(__dirname, 'data', 'expected', 'Thing-tmmp-annot.json'));
    });

    it('should validate SHACL', function () {
        const input = path.join(__dirname, 'data', 'tests', 'Thing4.txt').toString();
        const command = `node cli --validate ` +
            `--shex ${path.join(__dirname, 'data', 'shapes', 'Schema.shex')} ` +
            `--input ${input} ` +
            `--output ${tempPath} ` +
            `--target https://schema.org/validation#Thing ` +
            `--base ${baseUrl} ` +
            `--annotations ${path.join(__dirname, 'data', 'utils', 'annotations.json')} ` +
            `--subclasses ${path.join(__dirname, 'data', 'utils', 'Schema-subclasses.ttl')}`;
        return runValidation(command, path.join(__dirname, 'data', 'expected', 'Thing-tmmp-annot.json'));
    })
})
