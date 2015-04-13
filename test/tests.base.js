QUnit.module('base');

QUnit.test('ok.Base.toString()', function (assert) {
	assert.equal(ok.Base.toString(), 'Base', 'Base class is named appropriately');
	var Sub = ok.Base.extend({
		constructor: function Sub () {}
	});
	assert.equal(Sub.toString(), 'Sub', 'Subclasses are named appropriately');
	var Unnamed = Sub.extend({
		constructor: function () {}
	});
	assert.equal(Unnamed.toString(), '(subclass of Sub)', 'Unnamed constructors reference their superclass');
});