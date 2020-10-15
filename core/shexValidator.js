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
const shex = require('./third_party/shex/shex');
const utils = require('./util');
const errors = require('./errors');

const TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

class ValidationReport {
    /**
     * @param {object} jsonReport - report from shex.js, which needs to be simplified
     * @param {object} schema - parsed shapes in ShExJ format
     * @param {object} annotations
     */
    constructor(jsonReport, schema, annotations) {
        this.failures = [];
        this.shapes = new Map();
        schema.shapes.forEach(shape => {
            this.shapes.set(shape.id, this.getShapeCore(shape));
        });
        this.simplify(jsonReport, undefined, undefined);
        this.removeMissingIfTypeMismatch();
        this.annotations = annotations;
    }

    /**
     * Simplifies shex.js nested report into a linear structure
     * @param {object} jsonReport
     * @param {string|undefined} parentNode
     * @param {string|undefined} parentShape
     */
    simplify(jsonReport, parentNode, parentShape) {

        if (Array.isArray(jsonReport)) {
            jsonReport.forEach(err => this.simplify(err, parentNode, parentShape));
            return;
        }
        // STEP 1: if report doesn't contain errors, MissingProperty @type or failures
        // that doesn't need to be added, return
        if (!jsonReport.type ||
            jsonReport.type === 'ShapeAndResults' ||
            jsonReport.type === 'ShapeOrResults' ||
            jsonReport.property === TYPE ||
            jsonReport.constraint && jsonReport.constraint.predicate === TYPE ||
            jsonReport.type === 'NodeConstraintViolation' ||
            jsonReport.type === 'ShapeOrFailure' ||
            jsonReport.type === 'ShapeTest') {
            return;
        }

        // STEP 2: if array or intermediate nested structure, simplify nested values
        if (jsonReport.type === 'ShapeAndFailure' ||
            jsonReport.type === 'Failure' ||
            jsonReport.type === 'SemActFailure' ||
            jsonReport.type === 'FailureList' ||
            jsonReport.type === 'ExtendedResults' ||
            jsonReport.type === 'ExtensionFailure' ||
            (!jsonReport.type) && jsonReport.errors) {
            const node = jsonReport.node;
            this.simplify(jsonReport.errors, node || parentNode, jsonReport.shape || parentShape);
            return;
        }
        // STEP 3: handle closed shape errors
        if (jsonReport.type === 'ClosedShapeViolation') {
            jsonReport.unexpectedTriples.forEach(trpl => {
                let failure = {
                    type: jsonReport.type,
                    property: trpl.predicate,
                    message: `Unexpected property ${trpl.predicate}`,
                    node: parentNode,
                    shape: parentShape
                }
                this.failures.push(failure);
            });
            return;
        }
        // STEP 4: fill out the failure
        const failure = {
            type: jsonReport.type,
            property: jsonReport.property || (jsonReport.constraint && jsonReport.constraint.predicate),
            message: '',
            node: (jsonReport.triple && jsonReport.triple.subject) || parentNode,
            shape: parentShape,
        };
        switch (jsonReport.type) {
            case 'TypeMismatch':
                failure.message = `Value provided for property ${failure.property} has a wrong type`;
                this.simplify(jsonReport.errors, undefined, undefined);
                break;
            case 'MissingProperty':
                failure.message = `Property ${failure.property} not found`;
                break;
            case 'ExcessTripleViolation':
                failure.message = `Property ${failure.property} has a cardinality issue`;
                break;
            case 'BooleanSemActFailure':
                if (!jsonReport.ctx.predicate) return;
                failure.message = `Property ${failure.property} failed semantic action with code js:'${jsonReport.code}'`;
                break;
            case 'NegatedProperty':
                failure.message = `Negated property ${failure.property}`;
                break;
            default:
                throw new errors.ShexValidationError(`Unknown failure type ${jsonReport.type}`);
        }
        this.failures.push(failure);
    }

    /**
     * Recursively parses ShExJ Shape structure to get the core Shape with properties
     * @param {object} node
     * @returns {object}
     */
    getShapeCore(node) {
        if (node.type === 'Shape') {
            return node;
        }
        if (node.shapeExprs) {
            return node.shapeExprs
                .map(/** @param {*} nestedStruct */nestedStruct => this.getShapeCore(nestedStruct))
                .filter(/** @param {*} nestedStruct */nestedStruct => nestedStruct !== undefined);
        }
    }

    /**
     * Gets annotations for specific property in shape from the ShExJ shape
     * @param {string} shape
     * @param {string} property
     * @returns {Map<string, string>}
     */
    getAnnotations(shape, property) {
        const mapper = new Map();
        if (!this.shapes.get(shape) || this.shapes.get(shape).length === 0) return mapper;
        let propStructure = this.shapes.get(shape).expression.expressions
            .filter(/** @param {{predicate: string}} x */x => x.predicate === property)[0];
        if (!propStructure || !propStructure.annotations) return mapper;
        propStructure.annotations.forEach(/** @param {{predicate: string, object:{value: string}}} x*/x => {
            mapper.set(x.predicate, x.object.value);
        });
        return mapper;
    }

    /**
     * Hack for removing MissingProperty violations if the same property has TypeMismatch violation
     */
    removeMissingIfTypeMismatch() {
        const typeMismatches = this.failures.filter(x => x.type === 'TypeMismatch');
        const missings = [];
        for (const typeMismatch of typeMismatches) {
            missings.push(this.failures.filter(x => x.property === typeMismatch.property && x.type === 'MissingProperty')[0]);
            this.failures = this.failures.filter(x => !missings.includes(x));
        }
    }

    /**
     * Transforms a temporary report failures to structured data report failures
     * @returns {[StructuredDataFailure]}
     */
    toStructuredDataReport() {
        return this.failures.map(err => {
            /** @type StructuredDataFailure */
            let failure = {
                property: err.property,
                message: err.message,
                shape: err.shape,
                severity: 'error'
            }
            if (err.shape && err.property && this.annotations) {
                let shapeAnnotations = this.getAnnotations(err.shape, err.property);
                for (const [key, value] of Object.entries(this.annotations)) {
                    let annotation = shapeAnnotations.get(value) || failure[key];
                    if (annotation) failure[key] = annotation;
                }
            }
            return failure;
        });
    }
}

class ShexValidator {
    /**
     * @param {object|string} shapes - ShExJ shapes
     * @param {{annotations:object|undefined}} options
     */
    constructor(shapes, options={}) {
        if (typeof shapes === 'string') {
            this.shapes = shex.Parser.construct('', {}, {}).parse(shapes);
        } else {
            this.shapes = shapes;
        }
        this.annotations = options.annotations;
    }

    /**
     * Validates data against ShEx shapes
     * @param {string} data
     * @param {string} shape -  identifier of the target shape
     * @param {{ baseUrl: string|undefined }} options
     * @returns {Promise<{baseUrl: string, quads: Store, report: [StructuredDataFailure]}>}
     */
    async validate(data, shape, options = {}) {
        const baseUrl = options.baseUrl || utils.randomUrl();
        const quads = await utils.inputToQuads(data, baseUrl);
        const db = shex.Util.makeN3DB(quads);
        const validator = shex.Validator.construct(this.shapes);
        const errors = new ValidationReport(validator.validate(db, [{
            node: baseUrl,
            shape: shape,
        }]), this.shapes, this.annotations);
        return {
            baseUrl: baseUrl,
            quads: quads,
            failures: errors.toStructuredDataReport()
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

module.exports = {Validator: ShexValidator}