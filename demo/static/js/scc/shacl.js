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

async function validateShacl(data, baseUrl) {
    let report = await shaclValidator.validate(data, {baseUrl: baseUrl});
    report.failures.forEach(failure => {
        failure.service = shapeToService[failure.shape.replace('http://example.org/', '')];
        failure.message = failure.message.split('<').join('')
            .split('>').join('').replace('http://example.org/', '');
    });
    removeDisabled(hierarchy, report);
    return report;
}

function removeDisabled(node, report) {
    if (node.disabled) {
        report.failures = report.failures.filter(failure => failure.service !== node.service);
    }
    if (node.nested) {
        node.nested.forEach(nstd => removeDisabled(nstd, report));
    }
}