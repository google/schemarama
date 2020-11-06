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

const Store = require('n3').Store;
const Parser = require('n3').Parser;
const jsonld = require('jsonld');
const Readable = require('stream').Readable;
const RdfaParser = require('rdfa-streaming-parser').RdfaParser;
const MicrodataParser = require('microdata-rdf-streaming-parser').MicrodataRdfParser;

const errors = require('./errors.js');

/**
 * Parses json-ld to quads into the n3.Store
 * @param {string} text - input data
 * @param {string} baseUrl - main shape URL
 * @return {Promise<Store>}
 */
async function parseJsonLd(text, baseUrl) {
    const data = JSON.parse(text);
    const nquads = await jsonld.toRDF(data, {format: 'application/n-quads', base: baseUrl});
    return parseNQuads(nquads, baseUrl);
}


/**
 * Parse RDFa to quads into the n3.Store
 * @param {string} text - input data
 * @param {string} baseUrl - main shape URL
 * @return {Promise<Store>}
 */
async function parseRdfa(text, baseUrl) {
    const textStream = new Readable();
    textStream.push(text);
    textStream.push(null);
    return new Promise((res, rej) => {
        const store = new Store();
        const rdfaParser = new RdfaParser({baseIRI: baseUrl, contentType: 'text/html'});
        textStream.pipe(rdfaParser)
            .on('data', quad => {
                store.addQuad(quad);
            })
            .on('error', err => rej(err))
            .on('end', () => {
                if (store.getQuads().length === 0) res(undefined);
                res(store)
            });
    });
}

/**
 * Parses microdata to quads into the n3.Store
 * @param {string} text - input data
 * @param {string} baseUrl - main shape URL
 * @return {Promise<Store>}
 */
async function parseMicrodata(text, baseUrl) {
    const textStream = new Readable();
    textStream.push(text);
    textStream.push(null);
    return new Promise((res, rej) => {
        const store = new Store();
        const rdfaParser = new MicrodataParser({baseIRI: baseUrl});
        textStream.pipe(rdfaParser)
            .on('data', quad => {
                store.addQuad(quad);
            })
            .on('error', err => rej(err))
            .on('end', () => {
                if (store.getQuads().length === 0) res(undefined);
                res(store);
            });
    });
}

/**
 * @param {string} text - input data
 * @param {string} baseUrl - main shape URL
 * @return {Store}
 */
function parseNQuads(text, baseUrl) {
    const turtleParser = new Parser({
        format: 'application/n-quads',
        baseIRI: baseUrl,
    });
    const store = new Store();
    turtleParser.parse(text).forEach(quad => {
        store.addQuad(quad);
    });
    return store;
}


/**
 * @param {string} text - input data
 * @param {string} baseUrl - main shape URL
 * @return {Store}
 */
function parseTurtle(text, baseUrl) {
    const turtleParser = new Parser({
        format: 'text/turtle',
        baseIRI: baseUrl,
    });
    const store = new Store();
    turtleParser.parse(text).forEach(quad => {
        store.addQuad(quad);
    });
    return store;
}

/**
 * Helper for trying to parse input text into a certain format
 * @param {*} parser parser function
 * @returns {Promise<undefined|Store>}
 */
async function tryParse(parser) {
    let quads;
    try {
        quads = await parser();
    } catch (e) {
    }
    return quads;
}

/**
 * Transforms input to quads
 * @param {string} text - input data
 * @param {string} url - main shape URL
 * @returns {Promise<Store>}
 */
async function stringToQuads(text, url) {
    const jsonParser = async () => await parseJsonLd(text, url);
    const microdataParser = async () => await parseMicrodata(text, url);
    const rdfaParser = async () => await parseRdfa(text, url);
    const res = await tryParse(jsonParser) ||
        await tryParse(microdataParser) ||
        await tryParse(rdfaParser);
    if (res === undefined || res.getQuads().length === 0) {
        throw new errors.InvalidDataError('Error while parsing the data. ' +
            'This could be caused by incorrect data or incorrect data format. ' +
            'Possible formats: json-ld, microdata, rdfa');
    }
    return res;
}

module.exports = {
    parseJsonLd: parseJsonLd,
    parseMicrodata: parseMicrodata,
    parseRdfa: parseRdfa,
    parseNQuads: parseNQuads,
    parseTurtle: parseTurtle,
    stringToQuads: stringToQuads,
};