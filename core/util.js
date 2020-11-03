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
const axios = require('axios');

const jsonld = require('jsonld');
const n3 = require('n3');
const Store = n3.Store;
const RdfaParser = require('rdfa-streaming-parser').RdfaParser;

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
    const seen = {};
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
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Finds strongly connected components in the data graph
 * @param {Store} store
 * @return {Map<string, number>} - map from subject uris to
 * component ids
 */
function stronglyConnectedComponents(store) {
    const nodes = [...new Set(store.getSubjects()
        .map(x => x.id))];

    const order = [];
    let component = [];
    let componentIdx = 0;
    const components = new Map();
    const used = new Map();

    const forwardDfs = (v) => {
        used.set(v, true);
        for (const quad of store.getQuads(v, undefined, undefined)) {
            if (nodes.includes(quad.object.id) && !used.get(quad.object.id))
                forwardDfs(quad.object.id);
        }
        order.push(v);
    }

    const backwardDfs = (v) => {
        used.set(v, true);
        component.push(v);
        for (const quad of store.getQuads(undefined, undefined, v)) {
            if (!used.get(quad.subject.id))
                backwardDfs(quad.subject.id);
        }
    }

    for (const node of nodes) used.set(node, false);
    for (const node of nodes) {
        if (!used.get(node))
            forwardDfs(node);
    }
    for (const node of nodes) used.set(node, false);
    for (let i = 0; i < nodes.length; i++) {
        const node = order[nodes.length-1-i];
        if (!used.get(node)) {
            backwardDfs(node);
            component.forEach(x => components.set(x, componentIdx));
            componentIdx++;
            component = [];
        }
    }
    return components;
}

/**
 * Parses quads to multiple stores which represent root nodes
 * in the data graph
 * @param {Store} store
 */
function quadsToShapes(store) {
    const components = stronglyConnectedComponents(store);
    const notRoot = new Set();
    for (const quad of store.getQuads()) {
        if (components.has(quad.subject.id) &&
            components.has(quad.object.id) &&
            components.get(quad.subject.id) !== components.get(quad.object.id)) {
            notRoot.add(components.get(quad.object.id));
        }
    }

    const shapes = new Map();
    for (const [node, component] of components.entries()) {
        if (!notRoot.has(component)) {
            shapes.set(node, getShape(node, store, shapes, []));
            notRoot.add(component);
        }
    }
    return shapes;
}

/**
 * Recursively gets all triples, related to the shape
 * @param {any} id - id of the constructed shape
 * @param {Store} store - store, containing all the triples
 * @param {Map<any, Store>} shapes - map [id -> shape Store]
 * @param {Array<any>} parsed - array for tracking recursive loops
 */
function getShape(id, store, shapes, parsed) {
    const shapeQuads = store.getQuads(id, undefined, undefined);
    if (shapeQuads.length === 0) return;
    parsed.push(id);
    for (const quad of store.getQuads(id, undefined, undefined)) {
        if (parsed.includes(quad.object.id)) {
            shapeQuads.push(quad);
            continue;
        }
        let nestedStore;
        if (shapes.get(quad.object)) {
            nestedStore = shapes.get(quad.object.id);
        } else {
            nestedStore = getShape(quad.object.id, store, shapes, parsed);
        }
        if (nestedStore && nestedStore.getQuads().length > 0) {
            shapeQuads.push(...nestedStore.getQuads());
        }
    }
    const shapeStore = new Store();
    for (const quad of shapeQuads) {
        shapeStore.addQuad(quad);
    }
    return shapeStore;
}


module.exports = {
    randomUrl: randomUrl,
    loadData: loadData,
    uniqueBy: uniqueBy,
    quadsToShapes: quadsToShapes,
};