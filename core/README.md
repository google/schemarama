# Schema.org Content Checker CORE
NodeJs project for validating Sturctured Data with ShEx (SHACL coming soon). Is mainly used in a form of a bundle as a core part of the Schema.org Content Checker demo (https://www.gnomus042.com/). <br /><br />
**Main tasks:**
- parsing JSON-LS, Microdata, RDFa data using n3;
- validating structures data against ShEx shapes using a minified version of shex.js.

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