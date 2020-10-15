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

const fs = require('fs');
const axios = require('axios');

const jsonld = require('jsonld');
const n3 = require('n3');
const Store = n3.Store;
const streamify = require('streamify-string');
const RdfaParser = require('rdfa-streaming-parser').RdfaParser;
const microdata = require('./third_party/micriodata-node/microdata-node');

const errors = require('./errors');


/**
 * Loads related data (shapes, context, etc.) from remote or local source
 * @param {string} link url to the remote source or local path
 * @return {*}
 */
async function loadData(link) {
    if (link.match("^https?://")) {
        return (await axios.get(link)).data;
    }
    return fs.readFileSync(link).toString();
}

/**
 * Removes duplicates from objects array
 * @param {[object]} items
 * @param {[string]} keys
 * @returns {[object]}
 */
function uniqueBy(items, keys) {
    let seen = {};
    return items.filter(function (item) {
        let val = '';
        keys.forEach(key => val += item[key]);
        return seen.hasOwnProperty(val) ? false : (seen[val] = true);
    })
}

/**
 *  Generates random URL as base
 *  @param {number} length
 *  @return {string}
 */
function randomUrl(length = 16) {
    let result = 'https://example.org/';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Parses json-ld to quads into the n3.Store
 * @param {string} text input data
 * @param {string} baseUrl
 * @return {Store}
 */
async function parseJsonLd(text, baseUrl) {
    let data = JSON.parse(text);
    data['@id'] = baseUrl;
    const nquads = await jsonld.toRDF(data, { format: 'application/n-quads' });
    return parseTurtle(nquads, baseUrl);
}


/**
 * Parse RDFa to quads into the n3.Store
 * @param {string} text input data
 * @param {string} baseUrl
 * @return {Promise<Store>}
 */
async function parseRdfa(text, baseUrl) {
    const textStream = streamify(text);
    return new Promise((res, rej) => {
        let store = new Store();
        const rdfaParser = new RdfaParser({baseIRI: baseUrl, contentType: 'text/html'});
        textStream.pipe(rdfaParser)
            .on('data', quad => {
                store.addQuad(quad);
            })
            .on('error', err => rej(err))
            .on('end', () => res(store));
    });
}


/**
 * Parses microdata to quads into the n3.Store
 * @param {string} text
 * @param {string} baseUrl
 * @return {Store}
 */
async function parseMicrodata(text, baseUrl) {
    const nquads = microdata.toRdf(text, {base: baseUrl}).split('_:0').join(`<${baseUrl}>`);
    if (nquads.length === 0) throw errors.InvalidDataError('Format is not Microdata');
    return parseTurtle(nquads, baseUrl);
}


/**
 *
 */
function parseTurtle(text, baseIRI) {
    const turtleParser = new n3.Parser({
        baseIRI: baseIRI,
        format: "text/turtle"
    });
    let store = new Store();
    turtleParser.parse(text).forEach(quad => {
        store.addQuad(quad);
    });
    return store;
}

/**
 * Helper for trying to parse input text into a certain format
 * @param parser parser function
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
 * @param text - input data
 * @param baseUrl
 * @returns {Promise<Store>}
 */
async function inputToQuads(text, baseUrl) {
    const jsonParser = async () => await parseJsonLd(text, baseUrl);
    const rdfaParser = async () => await parseRdfa(text, baseUrl);
    const microdataParser = async () => await parseMicrodata(text, baseUrl);
    let res = await tryParse(jsonParser) || await tryParse(microdataParser) || await tryParse(rdfaParser);
    if (!res || res.getQuads().length === 0) throw new errors.InvalidDataError("Error while parsing the data." +
        "This could be caused by incorrect data or incorrect data format. Possible formats: json-ld, microdata, rdfa");
    return res;
}

module.exports = {
    randomUrl: randomUrl,
    loadData: loadData,
    uniqueBy: uniqueBy,
    inputToQuads: inputToQuads,
    parseTurtle: parseTurtle,
    parseMicrodata: parseMicrodata,
    parseRdfa: parseRdfa,
    parseJsonLd: parseJsonLd,
};