# Schema.org Content Checker **(work-in-progress)**
Status: this is a proof of concept being created as part of a Google Internship. 
The intent is to demonstrate how standards-based description of search service 
information requirements can be used to configure structured data validation in a 
way the highlights all the diverse incentives that exist for using a particular 
piece of schema markup. In other words, it uses new approaches to data format definition
which search engines can use to tell sites exactly which schema.org markup structures 
are needed for pages to be eligible for particular features.

The prototype includes examples based on current Google, 
and other search features, but should be viewed as an illustrative 
technology demonstration - i.e. the definitions may be inaccurate and incomplete. 
Ideally such definitions would be published by the relevant organizations, perhaps 
through bodies such as [Schema.org](https://schema.org). Demo is currently hosted on 
[schemarama-demo.site](https://schemarama-demo.site/)

**Developer:** Anastasiia Byvsheva anastasiia.byvsheva@gmail.com <br />
**Google contact:** Dan Brickley danbri@google.com <br />

## How to run it?
There are two options to run it on your local machine:
* You can install all requirements from `requirements.txt` (`pip3 install -r requirements.txt`) and run it with 
`python3 app.py`.
* Alternatively, you can build and run it in [Docker](https://docs.docker.com/get-docker/): <br />
```docker build -t scc .```<br />
```docker run -p 5000:5000 scc```<br />

## How to use it?
### Basic validation
UI of schemarama demo was inspired by [SDTT](https://search.google.com/structured-data/testing-tool/), so should be 
familiar and easy to use. To start the validation, please paste your markup to the input field on the left (or use one 
of the tests to play with the tool), then press the round button on the center of the screen. The validation report will 
appear on the right:

<p align="center"><img src="/demo/assets/validation-report.jpg?raw=true" alt="validation report, containing structured 
view of the data and list of failures, organised as a table with 4 columns: severity tag, property, message and list of 
failing services" height="300px"/></p>

Each row of the report include a severity sign (red hexagons are errors, yellow triangles are warnings and grey circles 
are info about how to make the data better), failing property name and a basic description of why this property has 
failed the validation. On the right you can find a list of services, which fail the validation. 

The demo supports ShEx and SHACL, you can change the validation language on the top right corner. 

### Services hierarchy
The demo gives an opportunity to validate data against multiple target services, which the user is planning to use for 
their markup (e.g. Google, Yandex, Bing, Pinterest, ...). Hierarchy field on the right allows to select the bunch of
target services and to perform validation only against their requirements:
 
<p align="center"><img src="/demo/assets/services-hierarchy.jpg?raw=true" alt="hierarchy of services, structured as a tree,
with a checkbox near each node to enable or disable validation" width="400px"/></p>

Services information will appear on the right side of the validation report as their icons. Clicking on one of these 
icons will take you to the documentation page of this property for the selected service; hovering the icon will give you
some details about the property in the context of target service.
