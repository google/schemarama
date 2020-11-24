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

const n3 = require('n3');
const namespace = require('@rdfjs/namespace');
const {v4: uuidv4} = require('uuid');

const parser = require('./parser.js');

const rdfs = namespace('http://www.w3.org/2000/01/rdf-schema#');
const rdf = namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const shacl = namespace('http://www.w3.org/ns/shacl#');

class ShExTemplateGenerator {
    findNodes(node, isTarget) {
        if (isTarget(node))
            return [node];
        const targets = [];
        if (typeof node === 'string') return targets;
        else if (Array.isArray(node)) {
            for (const val of node)
                targets.push(...this.findNodes(val, isTarget));
        } else if (typeof node === 'object') {
            for (const val of Object.values(node))
                targets.push(...this.findNodes(val, isTarget));
        }
        return targets;
    }

    addAnnotationToShape(shapeNode, id) {
        const annotation = {
            'type': 'Annotation',
            'predicate': rdfs('label'),
            'object': {'value': id}
        }
        if (shapeNode.hasOwnProperty('annotations')) shapeNode['annotations'].push(annotation);
        else shapeNode['annotations'] = [annotation];
    }

    /**
     * Adds annotation template for ShEx, assigning uuids to properties
     * @param shexj
     * @param annotations
     */
    createTemplate(shexj, annotations) {
        const template = {};
        for (const shape of shexj['shapes']) {
            const propertyNodes = this.findNodes(shape, (node) =>
                typeof node === 'object' &&
                node.hasOwnProperty('type') &&
                node['type'] === 'TripleConstraint');
            for (const node of propertyNodes) {
                const id = uuidv4();
                template[id] = {
                    'shape': shape.id,
                    'property': node.predicate,
                }
                for (const annot of annotations) {
                    template[id][annot] = '';
                }
                this.addAnnotationToShape(node, id);
            }
        }
        return {
            template: template,
            shapes: shexj
        };
    }

    annotateShapes(shexj, template) {
        const shapesMapper = new Map();
        for (const shape of shexj['shapes']) {
            const propertyNodes = this.findNodes(shape, (node) =>
                typeof node === 'object' &&
                node.hasOwnProperty('type') &&
                node['type'] === 'TripleConstraint');
            for (const node of propertyNodes)
                shapesMapper.set(`${shape.id}__${node.predicate}`, node);
        }
        for (const [id, val] of Object.entries(template)) {
            const shapeNode = shapesMapper.get(`${val.shape}__${val.property}`);
            this.addAnnotationToShape(shapeNode, id);
        }
    }
}


class ShaclTemplateGenerator {
    storeToString(store) {
        const writer = new n3.Writer({
            prefixes: {
                '': 'http://schema.org/validation#',
                schema: 'http://schema.org/',
                rdf: rdf(''),
                rdfs: rdfs(''),
                sh: shacl('')
            }
        });
        writer.addQuads(store.getQuads());
        return new Promise((res, rej) => {
            writer.end((error, text) => {
                if (error)
                    rej(error);
                else
                    res(text)
            });
        });
    }

    async createTemplate(shaclShapes, annotations) {
        const template = {};
        const shapesStore = parser.parseTurtle(shaclShapes, 'http://example.org/');
        for (const quad of shapesStore.getQuads(null, shacl('property'), null)) {
            // TODO check for properties without paths
            const property = shapesStore.getObjects(quad.object, shacl('path'))[0].value;
            const id = uuidv4();
            template[id] = {
                'shape': quad.subject.value,
                'property': property,
            }
            for (const annot of annotations)
                template[id][annot] = '';
            shapesStore.addQuad(quad.object.value, rdfs('label'), id);
        }
        return this.storeToString(shapesStore);
    }

    annotateShapes(shaclShapes, template) {
        const shapesStore = parser.parseTurtle(shaclShapes, 'http://example.org/');
        for (const [id, val] of Object.entries(template)) {
            const propertyShapes = shapesStore.getObjects(val.shape, shacl('property'));
            for (const shape of propertyShapes) {
                if (shapesStore.getQuads(shape, shacl('path'), val.property).length > 0) {
                    shapesStore.addQuad(shape, rdfs('label'), id);
                    break;
                }
            }
        }
        return this.storeToString(shapesStore);
    }
}

module.exports = {
    ShExTemplateGenerator: ShExTemplateGenerator,
    ShaclTemplateGenerator: ShaclTemplateGenerator
}
