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

Build and run it with [Docker](https://docs.docker.com/docker-for-windows/install/): <br />
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

## How to customize it?

If you want to set up a schemarama-demo-like web-site for your sets of shapes, based on the code from this repo, 
here are a few steps you should follow:

1. Replace ShEx/SHACL files. [ShEx](validation/shex) and [SHACL](validation/shacl) shapes are 
located in separate folders. In this repo we keep small one-shape files for easy references, but the actual validator 
uses only [full.shexj](validation/shex/full.shexj) with ShExJ shapes and [full.shacl](validation/shacl/full.shacl),
so only contents of these files should be replaced with your shapes. 
    * If you only have ShEx OR SHACL shapes, the easiest way to remove one of the languages from the UI would be to remove 
language selector on the top right corner. To do so, remove the option you **DON'T** need in [scc.html](templates/scc.html) 
(you just need to remove line 23 if you don't have ShEx shapes, and line 24 if you don't have SHACL shapes).
 2. Change the HTML and CSS. 
    * Replace `<title>` tag (line 5) content with the title you would like to use in [base.html](templates/base.html).
    * Replace `<div class="title">` (line 21) contents with the title you would like to use in [scc.html](templates/scc.html).
    * Change styles. If you want to change the colors, it's possible to change the color scheme by changing it in [scc.css](static/css/scc.css), 
    `:root` block (lines 18-20). For example, the pink color scheme would look like this:
    ```css
        :root {
            --main: #f188cc;
            --main-transparent: rgba(241, 136, 204, 0.7);
            --background: #fafafa;
        }
    ```
    If you need to make more complex changes, you will need to have basic knowledge of CSS. If you are a beginner, 
    some tutorials (like [w3schools](https://www.w3schools.com/css/) or [tutorialspoint](https://www.tutorialspoint.com/css/index.htm))
    can be helpful.
    
This easy steps should be enough to customize this demo for your needs, **BUT**
**If you face issues or have a concern, please feel free to ping us by creating an issue**