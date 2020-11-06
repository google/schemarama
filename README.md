
# schemarama

This project provides data validation facilities for use with Schema.org 
and related approaches to structured data publication. It integrates 
existing opensource tooling for data extraction (JSON-LD, RDFa, Microdata)
and validation (ShEx, SHACL), providing a framework for schema.org content 
checking that focusses on documenting the positive incentives for including
various data "shapes", rather than on simply giving errors and warnings.

It is designed to work with both ShEx and SHACL approaches to validation,
and to distinguish between validation that is based solely on schema.org 
definitions, from validation with respect to the information needs of 
some product, platform or service feature. Multiple validation definitions 
can be used when checking a single piece of content, allowing users to 
understand the larger ecosystem of data consuming applications that their
markup may be eligible for.

This is an initial release, and is not recommended for production use at this
time. 

For background on the underlying technologies, see the book, 
"[Validating RDF data](https://book.validatingrdf.com/)".
