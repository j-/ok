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

QUnit.test('ok.Base#mergeProperties', function (assert) {
	var Foo = ok.Base.extend({
		mergeProperties: 'test',
		test: 'foo'
	});
	var foo = Foo.create();
	assert.deepEqual(foo.mergeProperties, ['mergeProperties', 'injects', 'test'], '`mergeProperties` is itself merged');
	assert.deepEqual(foo.test, ['foo'], 'Initial value is converted to array');
	var Bar = Foo.extend({
		test: 'bar'
	});
	var bar = Bar.create();
	assert.deepEqual(bar.mergeProperties, ['mergeProperties', 'injects', 'test'], '`mergeProperties` is unchanged');
	assert.deepEqual(bar.test, ['foo', 'bar'], 'New values are merged into the existing properties');
	var BazQux = Bar.extend({
		test: ['baz', 'qux']
	});
	var bazqux = BazQux.create();
	assert.deepEqual(bazqux.test, ['foo', 'bar', 'baz', 'qux'], 'Multiple values can be defined');
});