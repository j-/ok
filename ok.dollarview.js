(function (ok, $) {

	'use strict';

	ok.$View = ok.View.extend({
		$: function (selector) {
			return this.$el.find(selector);
		},
		setElement: function fn (el) {
			if (el instanceof $) {
				el = el.get(0);
			}
			fn.old.call(this, el);
			this.$el = $(el);
		}
	});

})(okaylib, jQuery || Zepto || ender || $);