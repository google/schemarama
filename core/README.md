# Schema.org Content Checker CORE
NodeJs project for validating Structured Data with ShEx and SHACL. Mainly used in the form of a bundle as a core part of the Schema.org Content Checker demo.
**Main tasks:**
- parsing JSON-LD, Microdata, RDFa data using [n3](https://github.com/rdfjs/N3.js/), [microdata-node](https://github.com/Janpot/microdata-node), [rdf-streaming-parser](https://github.com/rubensworks/rdfa-streaming-parser.js), [jsonld](https://www.npmjs.com/package/jsonld);
- validating structured data against ShEx shapes using a minified version of [shex.js](https://github.com/shexSpec/shex.js); against SHACL shapes using [rdf-validate-shacl](https://github.com/zazuko/rdf-validate-shacl).

## Usage example
**ShEx validation**
```javascript
const ShexValidator = require('./schemarama/shexValidator').Validator;
const annotations = {
    description: 'http://www.w3.org/2000/01/rdf-schema#comment',
    severity: 'http://www.w3.org/2000/01/rdf-schema#label'
}
// shapes - JSON object with shapes in ShEx format
const validator = new ShexValidator(shapes, {annotations: annotations});
const startShape = 'http://schema.org/validation#ValidSchemaThing'
// data - string or n3.js Store, that should be validated
validator.validate(data, startShape, {baseUrl: 'http://example.org/test'}) 
    .then(report => report.failures.forEach(failure => console.log(failure)));
```
**SHACL validation**
```javascript
const ShaclValidator = require('./schemarama/shaclValidator').Validator;
const annotations = {
    description: 'http://www.w3.org/2000/01/rdf-schema#comment',
    severity: 'http://www.w3.org/2000/01/rdf-schema#label'
}
// shapes - JSON object with shapes in ShEx format
const validator = new ShaclValidator(shapes, {annotations: annotations});
// data - string or n3.js Store, that should be validated
validator.validate(data, {baseUrl: 'http://example.org/test'}) 
    .then(report => report.failures.forEach(failure => console.log(failure)));
```
## Bundling
To use this module in the browser, you need to create a bundle with webpack or browserify.<br /><br />
**With Webpack:**
1. ```npx webpack --config webpack.config.js```
2. Collect the created bundle from the dist folder.
<br/><br/>

**With browserify:**<br/>
1. ```gulp build```
2. Collect the created bundle from the dist folder.

(browserify also sompiles the bundle to ES5, which makes it 
compatible with IE11)


## Cli mode
To use this project as a cli, first you need to do an ```npm install```
### Parsing: 
```node cli --parse```<br />
**Required arguments:** <br />
```--input <file path>``` - path to the input file. <br />
**Optional arguments:** <br />
```--output <file path>``` - path to the output file. If not specified, output will be printed to the console. <br />
```--format <format>``` - one of the output formats. Available formats: ```nquads|ntriples|turtle|trig```. 'nquads' is used by default.
### ShEx validation:
```node cli --validate```<br />
**Required arguments:** <br />
```--shex <file path>``` - path to ShEx shapes. Could be either local or URL <br />
```--input <file path>``` - path to the input file. <br />
```--target <shapeURI>``` - target shape, e.g. http://example.org/shex#Thing. <br />
**Optional arguments:**<br />
```--output <file path>``` - path to the output file. If not specified, output will be printed to the console. <br />
```--base <URI>``` - base data URI (@id). If not specified, random URI will be used.<br />
```--annotations <file path>``` - path to the annotation correspondence file, in JSON format, where keys are keys 
in the failure report object and values are annotation predicates. If not specified, annotations will be ignored.
### SHACL validation:
```node cli --validate```
**Required arguments:** <br />
```--shex <file path>``` - path to SHACL shapes. Could be either local or URL <br />
```--input <file path>``` - path to the input file. <br />
**Optional arguments:**<br />
```--output <file path>``` - path to the output file. If not specified, output will be printed to the console. <br />
```--base <URI>``` - base data URI (@id). If not specified, random URI will be used. <br />
```--annotations <file path>``` - path to the annotation correspondence file, in JSON format, where keys are keys 
in the failure report object and values are annotation predicates. If not specified, annotations will be ignored. <br />
```--subclasses <file path>``` - additional triples that should be added to data for every validation. 
Originally used for adding schema.org subclasses structure to the data.
