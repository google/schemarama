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

class ShexLocalization {
    /**
     * Recursively parses ShExJ structure in order to find target nodes
     * @param rootNode - current ShExJ root node
     * @param isTarget - lambda to determine if the current node is target
     * @private
     * @returns array of target ShExJ objects
     */
    _findNodes(rootNode, isTarget) {
        if (isTarget(rootNode)) return [rootNode];
        const foundTargets = [];
        if (typeof rootNode === 'string') return foundTargets;
        else if (Array.isArray(rootNode)) {
            for (const val of rootNode)
                foundTargets.push(...this._findNodes(val, isTarget));
        } else if (typeof rootNode === 'object') {
            for (const val of Object.values(rootNode))
                foundTargets.push(...this._findNodes(val, isTarget));
        }
        return foundTargets;
    }

    /**
     * Adds
     * @param node - ShExJ node to be annotated
     * @param label - links external annotation and ShExJ node
     * @private
     */
    _addAnnotationLabelToShape(node, label) {
        const annotation = {
            'type': 'Annotation',
            'predicate': rdfs('label'),
            'object': {'value': label}
        }
        // if node already has annotation, append the new one, else create annotations property
        if (node.hasOwnProperty('annotations')) node['annotations'].push(annotation);
        else node['annotations'] = [annotation];
    }

    /**
     * Adds annotation template for ShEx, assigning uuid based labels to properties
     * @param shexj - ShExJ shapes
     * @param annotations - annotations list
     */
    generateAnnotationsTemplate(shexj, annotations) {
        const template = {};
        for (const shape of shexj['shapes']) {
            const propertyNodes = this._findNodes(shape, (node) =>
                typeof node === 'object' &&
                node.hasOwnProperty('type') &&
                node['type'] === 'TripleConstraint');
            for (const node of propertyNodes) {
                const label = uuidv4();
                template[label] = {
                    'shape': shape.id,
                    'property': node.predicate,
                }
                for (const annotation of annotations) {
                    template[label][annotation] = '';
                }
                this._addAnnotationLabelToShape(node, label);
            }
        }
        return {
            template: template,
            shapes: shexj
        };
    }

    /**
     * Annotates ShExJ shapes with existing uuid labels from annotation templates
     * @param shexj - ShExJ shapes
     * @param template - annotations template
     */
    annotateShapes(shexj, template) {
        const shapesMapper = new Map();
        for (const shape of shexj['shapes']) {
            const propertyNodes = this._findNodes(shape, (node) =>
                typeof node === 'object' &&
                node.hasOwnProperty('type') &&
                node['type'] === 'TripleConstraint');
            for (const node of propertyNodes)
                shapesMapper.set(`${shape.id}__${node.predicate}`, node);
        }
        for (const [label, val] of Object.entries(template)) {
            const shapeNode = shapesMapper.get(`${val.shape}__${val.property}`);
            this._addAnnotationLabelToShape(shapeNode, label);
        }
    }

    /**
     * Default failure messages for ShEx
     * @returns {Object.<string, number>}
     */
    static failureMessagesTranslationTemplate() {
        return {
            'ClosedShapeViolation': 'Unexpected property %(property)',
            'TypeMismatch': 'Value provided for property %(property) has an unexpected type',
            'MissingProperty': 'Property %(property) not found',
            'ExcessTripleViolation': 'Property %(property) has a cardinality issue',
            'NegatedProperty': 'Negated property %(property)',
            'BooleanSemActFailure': 'Property %(property) failed semantic action with code: \'%(code)\''
        }
    }
}

// TODO Shacl localization

module.exports = {
    ShexLocalization: ShexLocalization,
}