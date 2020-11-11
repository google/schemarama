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

async function validateShex(data, type, baseUrl) {
    return await recursiveValidate(hierarchy, type, data, baseUrl);
}

async function recursiveValidate(node, type, data, baseUrl) {
    if (node.disabled) return;
    let startShape = `http://schema.org/shex#Valid${node.service}${type}`;
    let report;
    try {
        report = await shexValidator.validate(data, startShape, {baseUrl: baseUrl});
    } catch (e) {
        if (e.message.includes(`shape ${startShape} not found in:`)) {
            //console.log(`Shape ${startShape} is not defined, validation skipped`);
            return;
        } else {
            throw e;
        }
    }
    report.failures.forEach(failure => failure.service = node.service);
    let nestedFailures = [];
    node.nested = node.nested || [];
    for (const nstd of node.nested) {
        let nstdReport = await recursiveValidate(nstd, type, data, baseUrl);
        if (nstdReport && nstdReport.failures.length > 0) {
            nestedFailures.push(...nstdReport.failures);
        }
    }
    report.failures = mergeFailures(report.failures, nestedFailures);
    return report;
}

function mergeFailures(a, b) {
    let existingProperties = new Set(a.map(item => item.property));
    b = b.filter(x => !existingProperties.has(x.property));
    if (b.length > 0) a.push(...b);
    return a;
}