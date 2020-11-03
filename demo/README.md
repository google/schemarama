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
through bodies such as [Schema.org](https://schema.org). Demo is currently hosted<br />
**Developer:** Anastasiia Byvsheva anastasiia.byvsheva@gmail.com <br />
**Google contact:** Dan Brickley danbri@google.com <br />

## How to run it?

You can install all requirements from ```requirements.txt``` and run it with 
```python3 app.py```. <br />
Alternatively, you can build and run it in Docker: <br />
```docker build -t scc .```<br />
```docker run -p 5000:5000 scc```<br />

**IMPORTANT** <br />
This demo won't work without the schemarama.bundle. You should build it from the 
*core* validation package, using the webpack bundler. Then you should place it in 
the ```demo/static/js/libs``` folder.
