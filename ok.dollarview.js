(function (ok, $) {

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

})(okaylib, jQuery || Zepto || ender || $);