QUnit.module('core');

QUnit.test('ok', function (assert) {
	assert.ok(ok, 'Found ok');
	assert.ok(typeof ok.VERSION === 'string', 'Has version');
});

// QUnit exposes its own `ok` global
// this is perfect for testing the no-conflict functionality
QUnit.test('ok.noConflict()', function (assert) {
	var okaylib = ok.noConflict();
	assert.equal(ok, QUnit.ok, 'Restore ok global to QUnit function');
	window.ok = okaylib;
});

QUnit.test('ok.inherits()', function (assert) {
	var Superclass = function () { this.c = 'c'; };
	var Subclass = function () {};
	Superclass.prototype.a = 'a';
	Subclass.prototype.b = 'b';
	ok.inherits(Subclass, Superclass);
	var obj = new Subclass();
	assert.ok(obj instanceof Superclass, 'Child class object inherits from super class');
	assert.ok(obj instanceof Subclass, 'Object is still considered instance of sub class');
	assert.equal(obj.a, 'a', 'Prototype is inherited');
	var sup = new Superclass();
	assert.ok(typeof sup.b === 'undefined', 'Superclass prototype is not modified');
	assert.ok(typeof obj.c === 'undefined', 'Superclass constructor is not called on child class');
});

QUnit.test('ok.extendClass()', function (assert) {
	var Superclass = function () {};
	// basic use, no prototype
	var Foo = ok.extendClass(Superclass);
	assert.equal(typeof Foo, 'function', 'Returns a constructor function');
	var foo = new Foo();
	assert.ok(foo instanceof Superclass, 'Child class object inherits from super class');
	assert.ok(foo instanceof Foo, 'Object is still considered instance of sub class');
	// specifying a single prototype
	var Bar = ok.extendClass(Superclass, { test: 123 });
	var bar = new Bar();
	assert.equal(bar.test, 123, 'Child class prototype can be defined');
	// specifying multiple prototypes
	var Baz = ok.extendClass(Superclass, { a: 'AAA' }, { a: 'a', b: 'b' });
	var baz = new Baz();
	assert.equal(baz.a, 'a', 'Multiple prototypes can be defined');
	assert.equal(baz.b, 'b', 'Last prototype has precedence');
	// test for static members
	Superclass.property = '123';
	var Subclass = ok.extendClass(Superclass);
	assert.equal(Subclass.property, '123', 'Subclasses inherit static members');
});

QUnit.test('ok.extendThisClass()', function (assert) {
	var Superclass = function () {};
	Superclass.extend = ok.extendThisClass;
	var Subclass = Superclass.extend({ test: 'TEST' }, { foo: 'bar' });
	var obj = new Subclass();
	assert.ok(obj instanceof Superclass, 'Child class object inherits from super class');
	assert.ok(obj instanceof Subclass, 'Object is still considered instance of sub class');
	assert.ok(obj.test, 'TEST', 'Can still extend prototype');
	assert.ok(obj.foo, 'bar', 'Can still specify multiple prototypes');
	assert.equal(Subclass.extend, ok.extendThisClass, 'Can be extended again');
});

QUnit.test('ok.getSuper()', function (assert) {
	var Superclass = function () {};
	var Subclass = ok.extendClass(Superclass);
	var obj = new Subclass();
	assert.equal(ok.getSuper(obj), Superclass, 'Can get super constructor of instance');
	assert.equal(ok.getSuper(Subclass), Superclass, 'Can get super constructor of constructor');
	assert.equal(ok.getSuper(Subclass.prototype), Superclass, 'Can get super constructor of prototype');
	assert.equal(ok.getSuper(Superclass), Object, 'Returns `Object` if no super class found');
	var Newclass = ok.extendClass(Subclass);
	assert.equal(ok.getSuper(Newclass), Subclass, 'Works with any level of sub class');
});

QUnit.test('ok.getImplementor()', function (assert) {
	var Superclass = function Subclass () {};
	Superclass.prototype.getFoo = function () { return 'foo'; };
	var Subclass = ok.extendClass(Superclass);
	Subclass.prototype.getBar = function () { return 'bar'; };
	var obj = new Subclass();
	obj.getBaz = function () { return 'baz'; };
	assert.equal(ok.getImplementor(obj, 'getFoo'), Superclass, 'Can get super constructor from super method');
	assert.equal(ok.getImplementor(obj, 'getBar'), Subclass, 'Can get constructor from prototype method');
	assert.equal(ok.getImplementor(obj, 'getBaz'), Subclass, 'Can get constructor from instance method');
});

QUnit.test('ok.sup()', function (assert) {
	var Superclass = function Subclass () {};
	Superclass.prototype.sup = ok.sup;
	Superclass.prototype.getFoo = function (n) { return 'f' + new Array(n + 1).join('o'); };
	var Subclass = ok.extendClass(Superclass);
	Subclass.prototype.getFoo = function () { return this.sup('getFoo', arguments).toUpperCase(); };
	var obj = new Subclass();
	assert.equal(obj.sup(), Superclass, 'Can get super constructor');
	assert.equal(obj.sup('getFoo', [2]), 'foo', 'Can call super function with arguments');
	assert.equal(obj.getFoo(2), 'FOO', 'Can call super function inside method');
});

QUnit.test('ok.create()', function (assert) {
	var Superclass = function () {};
	var obj = ok.create(Superclass);
	assert.ok(obj instanceof Superclass, 'Created objects are instances of their classes');
	var Foo = function (a, b, c) { this.value = a + b + c };
	var foo = ok.create(Foo, 3, 4, 5);
	assert.equal(foo.value, 12, 'Arguments are passed to constructor');
	var arr = ok.create(Array, 5);
	assert.ok(arr instanceof Array, 'Native objects can be constructed');
	assert.equal(arr.length, 5, 'Arguments are passed to native constructors');
});

QUnit.test('ok.createThis()', function (assert) {
	var Foo = function (a, b, c) { this.value = a + b + c };
	Foo.create = ok.createThis;
	var foo = Foo.create(3, 4, 5);
	assert.ok(foo instanceof Foo, 'Created objects are instances of their classes');
	assert.equal(foo.value, 12, 'Arguments are passed to constructor');
});

QUnit.test('ok.cloneThis()', function (assert) {
	var Foo = function (a, b, c) { this.value = a + b + c };
	Foo.prototype.get = function () { return { value: this.value }; };
	Foo.prototype.set = function (state) { _.extend(this, state); };
	Foo.prototype.clone = ok.cloneThis;
	var foo = new Foo(3, 4, 5);
	var bar = foo.clone();
	assert.ok(bar instanceof Foo, 'Cloned objects are instances of the same class');
	assert.equal(bar.value, 12, 'State is cloned');
});

QUnit.test('ok.toArray()', function (assert) {
	var result;
	// arguments test
	result = ok.toArray((function () { return arguments; })(1, 2, 3));
	assert.ok(result instanceof Array, 'Arguments: result should be an array');
	assert.equal(result.length, 3, 'Arguments: result should have correct length');
	assert.equal(result[2], 3, 'Arguments: result should have correct items');
	assert.ok(!Object.prototype.hasOwnProperty.call(result, 'callee'), 'Arguments: should not copy `callee`');
	// array test
	result = ok.toArray([1, 2, 3]);
	assert.ok(result instanceof Array, 'Array: result should be an array');
	assert.equal(result.length, 3, 'Array: result should have correct length');
	assert.equal(result[2], 3, 'Array: result should have correct items');
	// ok.Items test
	result = ok.toArray(ok.Items([1, 2, 3]));
	assert.ok(result instanceof Array, 'Items: result should be an array');
	assert.equal(result.length, 3, 'Items: result should have correct length');
	assert.equal(result[2], 3, 'Items: result should have correct items');
	// document tests
	if (typeof document !== 'undefined') {
		// html collection test
		var container = document.createElement('div');
		container.appendChild(document.createElement('h1'));
		container.appendChild(document.createElement('h2'));
		container.appendChild(document.createElement('h3'));
		result = ok.toArray(container.children);
		assert.ok(result instanceof Array, 'HTMLCollection: result should be an array');
		assert.equal(result.length, 3, 'HTMLCollection: result should have correct length');
		assert.equal(result[2].tagName.toLowerCase(), 'h3', 'HTMLCollection: result should have correct items');
		// node list test
		result = ok.toArray(container.childNodes);
		assert.ok(result instanceof Array, 'NodeList: result should be an array');
		assert.equal(result.length, 3, 'NodeList: result should have correct length');
		assert.equal(result[2].tagName.toLowerCase(), 'h3', 'NodeList: result should have correct items');
	}
});

QUnit.test('ok.mergeValues()', function (assert) {
	// combine arrays
	var arr1 = ['a', 'b'];
	var arr2 = ['d'];
	var arr = ok.mergeValues(arr1, 'c', arr2, undefined, ['e']);
	assert.ok(_.isArray(arr), 'Arrays combine into an array');
	assert.deepEqual(arr, ['a', 'b', 'c', 'd', 'e'], 'Array values can be merged');
	assert.equal(arr1.length, 2, 'Input was not modified');
	assert.deepEqual(arr1, ['a', 'b'], 'Input was not modified');
	// combine objects
	var obj1 = { foo: 'bar' };
	var obj2 = { baz: 'qux' };
	var obj = ok.mergeValues(obj1, undefined, obj2, null);
	assert.ok(_.isObject(obj), 'Objects combine into an object');
	assert.equal(obj.foo, 'bar', 'Object values can be merged');
	assert.equal(obj.baz, 'qux', 'Object values can be merged');
	assert.ok(!obj1.hasOwnProperty('baz'), 'Input was not modified');
	assert.ok(!obj2.hasOwnProperty('foo'), 'Input was not modified');
	// combine strings
	var str1 = 'foo';
	var str2 = 'bar';
	var str = ok.mergeValues(str1, str2);
	assert.ok(_.isArray(str), 'Strings combine into an array');
	assert.equal(str.length, 2, 'Output length is correct');
	assert.deepEqual(str, ['foo', 'bar'], 'Output value is correct');
	assert.equal(str1, 'foo', 'String values are not modified');
	assert.equal(str2, 'bar', 'String values are not modified');
	// other tests
	assert.ok(ok.mergeValues() instanceof Array, 'Returns an array if no inputs');
	assert.equal(ok.mergeValues(null), 0, 'Null values have no effect on merge');
	assert.equal(ok.mergeValues(undefined), 0, 'Undefined values have no effect on merge');
});