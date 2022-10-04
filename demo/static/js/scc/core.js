/*
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

let shaclShapes, subclasses, shexShapes, hierarchy, shapeToService;
let shexValidator, shaclValidator;
let ip;

let annotations = {
    url: 'http://schema.org/url',
    description: 'http://schema.org/description',
    severity: 'http://schema.org/identifier'
}

$(document).ready(async () => {
    $.getJSON("https://api.ipify.org/?format=json", function(e) {
        ip = e.ip;
    });
    [shaclShapes, subclasses, shexShapes, hierarchy, shapeToService, undefined] = await Promise.all([
      fetch(`validation/shacl/full.shacl`).then(resp => resp.text()),
      fetch(`validation/shacl/subclasses.ttl`).then(resp => resp.text()),
      fetch(`validation/shex/full.json`).then(resp => resp.json()),
      fetch(`hierarchy.json`).then(resp => resp.json()),
      fetch(`validation/shapeToService.json`).then(resp => resp.json()),
      fetch(`tests.json`).then(resp => resp.json()).then(j => initTests(j.tests)),
    ]);
    constructHierarchySelector(hierarchy, 0);
    shexValidator = new schemarama.ShexValidator(shexShapes, {annotations: annotations});
    shaclValidator = new schemarama.ShaclValidator(shaclShapes, {
        annotations: annotations,
        subclasses: subclasses,
    });
});

function randomString(length = 16) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function replacePrefix(text) {
    text = text.split(/https?:\/\/schema.org\//g).join('');
    text = text.split(/http:\/\/www.w3.org\/1999\/02\/22-rdf-syntax-ns#/g).join('@');
    text = text.split(/http:\/\/www.w3.org\/2000\/01\/rdf-schema#/g).join('@');
    text = text.split(/http:\/\/www.w3.org\/ns\/rdfa#/g).join('');
    return text;
}


async function validate(data, lang) {
    const baseUrl = `${window.location.href}${randomString()}`;
    const shapes = schemarama.quadsToShapes(await schemarama.stringToQuads(data, baseUrl));
    for (const [id, shape] of shapes) {
        let report;
        let type = shape.getObjects(id, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        if (type.length === 0) return;
        type = replacePrefix(type[0].value);
        if (lang === 'shex') {
            report = await validateShex(shape, type, id);
        } else if (lang === 'shacl') {
            report = await validateShacl(shape, id);
        }
        if (report == null) {
            report = {
                failures: [],
                store: shape,
                baseUrl: id
            }
        } else {
            report.failures = minifyFailuresList(report.failures);
        }
        addReport(type, report);
    }

}

function minifyFailuresList(failures) {
    const properties = {};
    for (const item of failures) {
        let key = item.property;
        if (properties[key] && properties[key].services.filter(x => x.service === item.service).length > 0) continue;
        if (!properties[key]) {
            properties[key] = {
                property: item.property,
                severity: item.severity,
                message: item.message,
                services: [],
            }
        }
        properties[key].services.push({
            service: item.service,
            description: item.description,
            url: item.url
        });
    }
    return Object.values(properties);
}
