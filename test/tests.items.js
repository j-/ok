QUnit.module('items');

QUnit.test('ok.Items()', function (assert) {
	assert.equal(typeof ok.Items, 'function', 'Is constructor');
	assert.ok(new ok.Items() instanceof ok.Items, 'Can be constructed with new');
	assert.ok(ok.Items.create() instanceof ok.Items, 'Can be constructed with #create()');
	assert.ok(ok.Items() instanceof ok.Items, 'Can be constructed with invokation');
	var items = new ok.Items([1, 2, 3, 4, 5]);
	assert.ok(items instanceof Array, 'Inherits from native array constructor');
	assert.ok(items instanceof ok.Items, 'Object is instance of ok.Items');
	assert.equal(items.length, 5, 'Can be initialized with an array');
	assert.equal(items[4], 5, 'Items can be accessed with [] syntax');
	assert.equal(typeof items.clone, 'function', 'Implements ok.Base#clone()');
	assert.equal(typeof ok.Items.create, 'function', 'Implements ok.Base#create()');
	assert.equal(typeof ok.Items.extend, 'function', 'Implements ok.Base#extend()');
});

QUnit.test('ok.Items#pop()', function (assert) {
	assert.expect(8);
	var items = new ok.Items([1, 2, 3, 4, 5]);
	var item;
	assert.equal(items.length, 5, 'Array is expected length before popping');
	item = items.pop();
	assert.equal(items.length, 4, 'Array length has been decremented');
	assert.equal(item, 5, 'Popped item was returned');
	item = items.pop();
	assert.equal(items.length, 3, 'Array length has been decremented');
	assert.equal(item, 4, 'Popped item was returned');
	items.on('remove', function (item) {
		assert.ok(true, 'Remove event fired');
		assert.equal(item, 3, 'Popped item was sent to event handler');
		assert.equal(items.length, 2, 'Array length has been decremented');
	});
	items.pop();
});

QUnit.test('ok.Items#push()', function (assert) {
	// tests pending
	assert.expect(0);
});

QUnit.test('ok.Items#shift()', function (assert) {
	// tests pending
	assert.expect(0);
});

QUnit.test('ok.Items#sort()', function (assert) {
	assert.expect(16);
	var digits = new ok.Items([3, 1, 4, 1, 5]);
	var colors = new ok.Items(['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']);
	var result;
	digits.on('sort', function (items) {
		assert.ok(true, 'Sort event fired');
		assert.equal(items, digits, 'Items array was sent to event handler');
	});
	result = digits.sort();
	assert.equal(result, digits, 'Items array is returned after sort');
	assert.equal(digits.length, 5, 'Length is the same after sorting');
	assert.equal(digits[0], 1, 'Default sort was applied correctly');
	assert.equal(digits[1], 1, 'Default sort was applied correctly');
	assert.equal(digits[2], 3, 'Default sort was applied correctly');
	assert.equal(digits[3], 4, 'Default sort was applied correctly');
	assert.equal(digits[4], 5, 'Default sort was applied correctly');
	colors.sort(function (left, right) {
		return left.length - right.length;
	});
	assert.equal(colors[0], 'red', 'Can sort with custom comparator');
	assert.equal(colors[1], 'blue', 'Can sort with custom comparator');
	assert.equal(colors[2], 'green', 'Can sort with custom comparator');
	assert.equal(colors[3], 'orange', 'Can sort with custom comparator');
	assert.equal(colors[4], 'yellow', 'Can sort with custom comparator');
	assert.equal(colors[5], 'indigo', 'Can sort with custom comparator');
	assert.equal(colors[6], 'violet', 'Can sort with custom comparator');
});

QUnit.test('ok.Items#splice()', function (assert) {
	// tests pending
	assert.expect(0);
});

QUnit.test('ok.Items#unshift()', function (assert) {
	// tests pending
	assert.expect(0);
});

QUnit.test('ok.Items#remove()', function (assert) {
	// tests pending
	assert.expect(0);
});

QUnit.test('ok.Items#empty()', function (assert) {
	// tests pending
	assert.expect(0);
});

QUnit.test('ok.Items#insert()', function (assert) {
	// tests pending
	assert.expect(0);
});

QUnit.test('ok.Items#set()', function (assert) {
	var items = new ok.Items(['one', 'two', 'three']);
	assert.equal(items.length, 3, 'Items length is as expected');
	items.set(['1', '2']);
	assert.equal(items.length, 2, 'Items length has been modified');
	assert.equal(items[0], '1', 'Set was applied correctly');
	assert.equal(items[1], '2', 'Set was applied correctly');
});

QUnit.test('ok.Items#get()', function (assert) {
	var items = new ok.Items(['lorem', 'ipsum', 'dolor', 'sit', 'amet']);
	assert.equal(items.get(), items, 'Returns self when given no arguments');
	assert.equal(items.get(3), 'sit', 'Returns item when given index');
	assert.equal(items.get(-2), 'sit', 'Can be given a negative index');
	assert.equal(items.get(99), undefined, 'Returns undefined when out of bounds');
	assert.equal(items.get(-99), undefined, 'Returns undefined when out of bounds');
});

QUnit.test('ok.Items#each()', function (assert) {
	assert.expect(11);
	var items = new ok.Items([0, 2, 4, 6, 8]);
	var result = items.each(function (val, i, arr) {
		assert.equal(arr, items, 'Items array is passed to iteratee');
		assert.equal(val, i * 2, 'Value and index are passed to iteratee');
	});
	assert.equal(result, items, 'Items array is returned');
});

QUnit.test('ok.Items#forEach()', function (assert) {
	assert.expect(11);
	var items = new ok.Items([0, 2, 4, 6, 8]);
	var result = items.forEach(function (val, i, arr) {
		assert.equal(arr, items, 'Items array is passed to iteratee');
		assert.equal(val, i * 2, 'Value and index are passed to iteratee');
	});
	assert.equal(result, items, 'Items array is returned');
});

QUnit.test('ok.Items#map()', function (assert) {
	assert.expect(17);
	var items = new ok.Items([0, 2, 4, 6, 8]);
	var result = items.map(function (val, i, arr) {
		assert.equal(arr, items, 'Items array is passed to iteratee');
		assert.equal(val, i * 2, 'Value and index are passed to iteratee');
		return val / 2;
	});
	assert.equal(result[0], 0, 'Map was applied correctly');
	assert.equal(result[1], 1, 'Map was applied correctly');
	assert.equal(result[2], 2, 'Map was applied correctly');
	assert.equal(result[3], 3, 'Map was applied correctly');
	assert.equal(result[4], 4, 'Map was applied correctly');
	assert.ok(result !== items, 'New array is returned');
	assert.ok(result instanceof ok.Items, 'Result is instanceof ok.Items');
});