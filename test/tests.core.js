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