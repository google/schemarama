/*
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

let shaclShapes, subclasses, shexShapes, hierarchy, shapeToService;
let shexValidator, shaclValidator;

let annotations = {
    url: 'http://schema.org/url',
    description: 'http://schema.org/description',
    severity: 'http://schema.org/identifier'
}

$(document).ready(async () => {
    await $.get(`shacl/shapes`, (res) => shaclShapes = res);
    await $.get(`shacl/subclasses`, (res) => subclasses = res);
    await $.get(`shex/shapes`, (res) => shexShapes = JSON.parse(res));
    await $.get(`hierarchy`, (res) => {
        hierarchy = res;
        constructHierarchySelector(hierarchy, 0);
    });
    await $.get(`services/map`, (res) => shapeToService = res);
    $.get(`tests`, (res) => initTests(res.tests));

    shexValidator = new schemarama.ShexValidator(shexShapes, {annotations: annotations});
    shaclValidator = new schemarama.ShaclValidator(shaclShapes, {
        annotations: annotations,
        subclasses: subclasses,
    });
});

async function getType(data, baseUrl) {
    try {
        let quads = await schemarama.inputToQuads(data, baseUrl);
        let typeQuads = quads.getQuads(baseUrl, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', undefined);
        if (typeQuads.length === 0) {
            alert('No type detected, validation is not possible');
        } else {
            return typeQuads[0].object.value;
        }
    } catch (err) {
        alert(err.message);
    }
}

function randomString(length=16) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function removeUrls(text) {
    return text.replaceAll(/https?:\/\/[^\s]+[\/#]/g, '');
}

async function validate(data, lang) {
    let report;
    let baseUrl = `${window.location.href}${randomString()}`;
    let type = (await getType(data, baseUrl)).replace(/.*[/#]/, '');
    if (lang === 'shex') {
        report = await validateShex(data, type, baseUrl);
    } else if (lang === 'shacl') {
        report = await validateShacl(data, baseUrl);
    }
    let dataItems = parseDataItems(report.quads, report.baseUrl, 0);
    addReport(type, minifyFailuresList(report.failures), dataItems);
}

function parseDataItems(dataset, shapeId, indent) {
    let dataItems = [];
    let shape = dataset.getQuads(shapeId, undefined, undefined);
    shape.forEach(quad => {
        dataItems.push(dataItemLayout(quad.predicate.value, quad.object.value, indent));
        dataItems.push(...parseDataItems(dataset, quad.object, indent + 1));
    });
    return dataItems;
}

function minifyFailuresList (failures) {
    let properties = {};
    failures.forEach(item => {
        let key = item.property;
        if (properties[key] && properties[key].services.filter(x => x.service === item.service).length > 0) return;
        if (properties[key]) {
            properties[key].services.push({
                service: item.service,
                description: item.description,
                url: item.url
            });
        } else properties[key] = {
            property: item.property,
            severity: item.severity,
            message: item.message,
            services: [{
                service: item.service,
                description: item.description,
                url: item.url
            }]
        };
    });
    return Object.values(properties);
}