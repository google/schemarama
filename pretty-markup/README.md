# Pretty markup
A tiny demo for displaying pretty ladder-like **JSON-LD, Microdata or RDFa** structured data using schemarama core. 
Heavily inspired by Google's [Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool/) 
structured data view.<br />
<img src="/pretty-markup/assets/pretty-markup.jpg?raw=true" alt="initial structured data in json-ld format on the left, structured data view representation on the right"/>

Pretty markup helps to make large pieces of structured data more understandable. It uses three main concepts
to achieve this goal:
* **Structure:** each triple is displayed as a *triple row*, *subject* is displayed on the left side, *object* is 
displayed on the right, *subject* is marked with a color stripe.
* **Color:** different nodes are highlighted with different color stripes on the left part of each triple row. 
It helps to easily find all triples of the target node. 
* **Padding:** ladder-like structure helps to easily find nested nodes, which are displayed with different padding, 
depending on the depth.

There are also two representation options:
* html
* text 

## How to use it?
If you want to play with it, just open `demo.html` in your favourite browser to play with it! You can change the markup 
in the input textarea on the top of the page, structured view will be updated after every change.   

If you want to use it for your project, you will need to include `schemarama-parsing.bundle` for the core logic, 
`layout.js` for pretty markup functions and `style.css` with specific styles.

Generating and adding pretty markup view to a div:
```js
/**
 * @param {string} data - string representation of the structured data
 */
async function addPrettyMarkup(data) {
    const prettyMarkupDiv = document.getElementById('pretty-markup');
    const elements = await prettyMarkupHtml(data);
    for (const el of elements) {
        prettyMarkupDiv.appendChild(el);
    }
}
```

Generating textual representation of structured data and adding it to the textarea:
```js
/**
 * @param {string} data - string representation of the structured data
 */
async function addPrettyMarkup(data) {
    const prettyMarkupTextarea = document.getElementById('text-pretty-markup');
    prettyMarkupTextarea.value = await prettyMarkupText(data);
}
```

## How it works?
Pretty markup uses [schemarama core](https://github.com/google/schemarama/tree/main/core) to parse the markup and
display it in the structured data view.  