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
const SHACLValidator = require('rdf-validate-shacl');
const namedNode = require('n3').DataFactory.namedNode;

const parser = require('./parser');
const utils = require('./util');

/**
 * Adds shacl base prefix to value
 * @param {string} value
 * @return {string}
 */
function SHACL(value) {
    return 'http://www.w3.org/ns/shacl#' + value;
}

class ShaclValidator {
    /**
     * @param {string} shaclSchema - shacl shapes in string format
     * @param {{
     *     annotations: object|undefined,
     *     subclasses: string
     * }} options
     */
    constructor(shaclSchema, options) {
        if (options.subclasses) {
            this.subclasses = parser.parseTurtle(options.subclasses);
        }
        this.shapes = parser.parseTurtle(shaclSchema);
        this.annotations = options.annotations || {};
        this.validator = new SHACLValidator(this.shapes.getQuads());
    }

    /**
     * Transforms SHACL severity to string
     * @param {string} val
     * @returns {string}
     */
    getSeverity(val) {
        switch (val) {
            case SHACL('Info'):
                return 'info';
            case SHACL('Warning'):
                return 'warning';
            default:
                return 'error';
        }
    }

    /**
     * Gets schema: annotations for some predicate
     * @param {namedNode} property - property, which should have an annotation
     * @param {namedNode} annotation - annotation predicate
     * @returns {string|undefined}
     */
    getAnnotation(property, annotation) {
        const quads = this.shapes.getQuads(property, annotation, undefined);
        if (quads.length > 0) return quads[0].object.value;
    }

    /**
     * Transform standard shacl failure to structured data failure
     * @param {object} shaclFailure
     * @returns {StructuredDataFailure}
     */
    toStructuredDataFailure(shaclFailure) {
        // finds a source shape if property is failing
        let sourceShape = this.shapes.getQuads(undefined, SHACL('property'), shaclFailure.sourceShape)[0];
        // if the whole shape is failing then leave sourceShape
        if (!sourceShape) sourceShape = shaclFailure.sourceShape;
        else sourceShape = sourceShape.subject;
        const failure = {
            property: shaclFailure.path ? shaclFailure.path.value : undefined,
            message: shaclFailure.message.length > 0 ?
                shaclFailure.message.map(x => x.value).join(". ") : undefined,
            shape: sourceShape.id,
            severity: this.getSeverity(shaclFailure.severity.value),
        }
        for (const [key, value] of Object.entries(this.annotations)) {
            const annotation = this.getAnnotation(shaclFailure.sourceShape, namedNode(value));
            if (annotation) failure[key] = annotation;
        }
        return failure;
    }

    /**
     * @param {string|Store} data
     * @param {{baseUrl: string|undefined}} options
     * @returns {Promise<{baseUrl: string, store: Store, failures: [StructuredDataFailure]}>}
     */
    async validate(data, options={}) {
        const baseUrl = options.baseUrl || utils.randomUrl();
        if (typeof data === 'string') {
            data = await parser.stringToQuads(data, baseUrl);
        }
        let report;
        if (this.subclasses) {
            const quadsWithSubclasses = data.getQuads();
            quadsWithSubclasses.push(...this.subclasses.getQuads());
            report = this.validator.validate(quadsWithSubclasses).results
                .map(x => this.toStructuredDataFailure(x));
        } else {
            report = this.validator.validate(data.getQuads()).results
                .map(x => this.toStructuredDataFailure(x));
        }
        return {
            baseUrl: baseUrl,
            store: data,
            failures: report,
        };
    }
}

/**
 * @typedef {{
 *     property: string,
 *     message: string,
 *     severity: 'error'|'warning'|'info',
 *     shape: string
 * }} StructuredDataFailure
 */

module.exports = {
    Validator: ShaclValidator,
}