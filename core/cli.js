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
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const n3 = require('n3');

const ShexValidator = require('./shexValidator').Validator;
const utils = require('./util');
const parser = require('./parser');

class CliError extends Error {
    constructor(message) {
        super(message);
        this.name = "CliError";
    }
}

function cliFormatToN3(val) {
    switch (val) {
        case undefined:
            return 'N-Quads';
        case 'nquads':
            return 'N-Quads';
        case 'ntriples':
            return 'N-Triples';
        case 'turtle':
            return 'application/turtle';
        case 'trig':
            return 'application/trig';
        default:
            throw new CliError('Unknown output format');
    }
}

function writeResult(val, args) {
    if (!args.output) {
        console.log(val);
    } else {
        fs.writeFileSync(args.output, val);
    }
}

function writeQuads(quads, output, format) {
    const writer = new n3.Writer({format: cliFormatToN3(format)});
    quads.forEach(quad => writer.addQuad(quad.subject, quad.predicate, quad.object));
    writer.end((error, result) => {
        if (error) throw new CliError(error);
        writeResult(result, args);
    });
}

async function validateShEx(data, base, args) {
    args.service = args.service || '';
    const shapes = await utils.loadData(args.shex);
    const annotations = args.annotations ? JSON.parse(await utils.loadData(args.annotations)) : undefined;
    const validator = new ShexValidator(shapes, {annotations: annotations});
    const report = await validator.validate(data, args.target, {baseUrl: base});
    writeResult(JSON.stringify(report.failures, undefined, 2), args);
}

async function validateShacl(data, base, args) {
    const shapes = await utils.loadData(args.shacl);
    let subclasses, annotations;
    if (args.subclasses) {
        subclasses = await utils.loadData(args.subclasses);
    }
    if (args.annotations) {
        annotations = JSON.parse(await utils.loadData(args.annotations));
    }
    const validator = new ShaclValidator(shapes, {
        subclasses: subclasses,
        annotations: annotations
    });
    const report = validator.validate(data, {baseUrl: base});
    writeResult(JSON.stringify(report.failures, undefined, 2), args);
}

/**
 * @param {args} args
 * @return {Promise<void>}
 */
async function main(args) {
    if (!args.input) throw new CliError('No input file path specified');
    if (args.output && !fs.existsSync(path.parse(args.output).dir)) throw new CliError(`Output directory \'${path.parse(args.output).dir}\' doesn\'t exist`);
    const data = fs.readFileSync(args.input).toString();
    const base = args.base || 'http://example.org/';
    if (args.parse) {
        const quads = await parser.stringToQuads(data, base);
        writeQuads(quads, args.output, args.format);
    } else if (args.validate) {
        if (args.shex && args.shacl) throw new CliError('Validation is possible for ShEx or SHACL, but not for both');
        else if (!args.shex && !args.shacl) throw new CliError('No shapes provided for validation');
        const components = utils.quadsToShapes(await parser.stringToQuads(data, base));
        for (const [iri, component] of components.entries()) {
            if (args.shex) await validateShEx(component, iri, args);
            else if (args.shacl) await validateShacl(component, iri, args);
        }
    }
}

/**
 * @typedef {{
 *     input: string
 *     output: string|undefined
 *     parse: boolean|undefined
 *     format: string|undefined
 *     validate: boolean|undefined
 *     shex: string|undefined
 *     shacl: string|undefined
 *     base: string|undefined
 *     target: string|undefined
 *     annotations: string|undefined
 *     subclasses: string|undefined
 * }} args - possible options for args
 */

const args = minimist(process.argv.slice(2));
main(args);

