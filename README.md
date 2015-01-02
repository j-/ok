`ok`
==

Extensible MVC library

## Installing

### Clone repo

Clone with git:

```sh
$ git clone https://github.com/j-/ok.git
```

### Server

Use [npm](https://www.npmjs.org/) to install:

```sh
$ npm install --save okaylib
```

### Client

The `ok` client library depends on [underscore](http://underscorejs.org/).

Use [bower](http://bower.io/) to install:

```sh
bower install --save okaylib
```

Or include the JS file:

```html
<script src="https://cdn.rawgit.com/j-/ok/0.5.1/ok.js"></script>
```

## Using

### Server

Load the module:

```js
var ok = require('okaylib');
```

### AMD

Using an AMD library like [require.js](http://requirejs.org/):

```js
require(['okaylib'], function (ok) {

});
```

Or you may be able to use the [CommonJS style](http://requirejs.org/docs/api.html#cjsmodule):

```js
define(function (require) {
	var ok = require('okaylib');
});
```

### Global

If AMD and CommonJS detection fails, `ok` will expose two globals, `ok` and `okaylib`. If there is a naming conflict you can call `ok.noConflict()` to restore the `ok` global to its value before `ok` was loaded.

## Documentation

`ok` is documented with [jsdoc](http://usejsdoc.org/) style comments for generating docs.

### Installing jsdoc

Install the jsdoc binary with npm:

```sh
$ npm install --global jsdoc
```

### Generating docs

In the `ok/` directory:

```sh
$ jsdoc .
```

Documentation will be generated in `ok/out/`.

## License

[MIT license](LICENSE).
