QUnit.module('views');

QUnit.test('ok.View()', function (assert) {
	var view = new ok.View();
	assert.ok(view instanceof ok.View, 'Can create views');
	assert.deepEqual(view.classNames, ['ok-view'], 'Views have "ok-view" class by default');
	assert.deepEqual(ok.toArray(view.el.classList), ['ok-view'], 'Classes are applied to view element');
	assert.equal(view.tagName, 'div', 'Views are divs by default');
	assert.equal(view.el.tagName.toLowerCase(), 'div', 'Views elements are divs by default');
	var custom = new ok.View({
		tagName: 'p',
		classNames: 'custom-paragraph'
	});
	assert.equal(custom.tagName, 'p', 'Tag name property is set on init');
	assert.equal(custom.el.tagName.toLowerCase(), 'p', 'Can make views a tag other than div');
	assert.deepEqual(custom.classNames, ['ok-view', 'custom-paragraph'], 'Classes can be set on views');
	assert.deepEqual(ok.toArray(custom.el.classList), ['ok-view', 'custom-paragraph'], 'Classes can be set on view elements');
});

QUnit.test('ok.View#isStarted', function (assert) {
	var view = new ok.View();
	assert.equal(view.isStarted, false, 'Views are not started by default');
	view.start();
	assert.equal(view.isStarted, true, 'View can be started');
	view.stop();
	assert.equal(view.isStarted, false, 'View can be stopped');
});

QUnit.test('ok.View#setElement()', function (assert) {
	var a = document.createElement('h1');
	var b = document.createElement('h2');
	var view = new ok.View({
		el: a
	});
	assert.equal(view.el, a, 'Views can be initialized with an element');
	view.setElement(b);
	assert.equal(view.el, b, 'View element can be set');
});
