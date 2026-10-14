# Node.js Fundamentals

## What is Node.js?
Node is a runtime environment that allows me to run JavaScript outside of a browser.

## How does Node.js differ from running JavaScript in the browser?
Since its running in an different environment, JavaScript in Node cannot access
brower specific features like the DOM. Instead Node provides features like accessing
files or creating servers.

## What is the V8 engine, and how does Node use it?
V8 is the engine that executes JavaScript. Node uses V8 to execute JavaScript code outside of the browser.

## What are some key use cases for Node.js?
Some key cases can be working with files, building backend applications or using CLIs.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.
CommonJS uses things like require() and module.exports, while ES Modules use import and export. They are both used to organize and share code between files.

**CommonJS (default in Node.js):**
```js
const fs = require("fs");
```

**ES Modules (supported in modern Node.js):**
```js
import fs from "fs";
``` 