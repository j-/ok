(function (factory, ok, $) {

// amd
if (typeof define === 'function' && define.amd) {
	define('ok.dollarview', ['ok', 'jquery', 'ok.views'], factory);
}
// commonjs
else if (typeof module !== 'undefined' && typeof require === 'function') {
	ok = require('ok');
	require('ok.views');
	$ = require('jquery');
	factory(ok, $);
	module.exports = ok;
}
// globals
else {
	ok = window.okaylib;
	$ = window.jQuery;
	factory(ok, $);
}

})(function (ok, $) {

'use strict';

ok.$View = ok.View.extend({
	$: function (selector) {
		return this.$el.find(selector);
	},
	setElement: function (el) {
		if (el instanceof $) {
			el = el.get(0);
		}
		ok.View.prototype.setElement.call(this, el);
		this.$el = $(el);
	}
});

});