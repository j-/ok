(function (factory, ok) {

// amd
if (typeof define === 'function' && define.amd) {
	define('ok.views', ['ok'], factory);
}
// commonjs
else if (typeof module !== 'undefined' && typeof require === 'function') {
	ok = require('ok');
	factory(ok);
	module.exports = ok;
}
// globals
else {
	ok = window.okaylib;
	factory(ok);
}

})(function (ok) {

'use strict';

ok.View = ok.Base.extend({
	mergeProperties: ['classNames'],
	classNames: ['ok-view'],
	injects: ['el', 'watch', 'isStarted'],
	el: null,
	tagName: 'div',
	id: null,
	isStarted: false,
	childViews: null,
	constructor: function (options) {
		options = options || {};
		if (options.tagName) {
			this.tagName = options.tagName;
		}
		if (options.classNames) {
			this.classNames = ok.mergeValues(this.classNames, options.classNames);
		}
		if (options.el) {
			this.setElement(options.el);
		}
		else {
			this.createElement();
			if (options.id || this.id) {
				this.el.id = options.id || this.id;
			}
		}
		if (options.watch) {
			this.watch = options.watch;
		}
		this.isStarted = false;
		this.childViews = new ok.Items();
		this.init(options);
	},
	setElement: function (el) {
		this.el = el;
	},
	createElement: function () {
		var el = document.createElement(this.tagName);
		_.forEach(this.classNames, function (className) {
			el.classList.add(className);
		});
		this.setElement(el);
	},
	empty: function () {
		while (this.el.childNodes.length) {
			this.el.removeChild(this.el.firstChild);
		}
	},
	render: function () {
		this.renderChildViews();
	},
	start: function () {
		this.stop();
		this.isStarted = true;
		this.startChildViews();
	},
	stop: function () {
		this.isStarted = false;
		this.stopListening();
		this.stopChildViews();
	},
	addChildView: function (view, options) {
		if (typeof view === 'function') {
			view = this.create(view, options);
		}
		this.childViews.push(view);
		if (this.isStarted) {
			view.start();
		}
		return view;
	},
	removeChildView: function (view) {
		var index = this.childViews.indexOf(view);
		if (index >= 0) {
			this.childViews.remove(index, 1);
		}
		if (this.isStarted) {
			view.stop();
		}
	},
	renderChildViews: function () {
		this.childViews.invoke('render');
	},
	startChildViews: function () {
		this.childViews.invoke('start');
	},
	stopChildViews: function () {
		this.childViews.invoke('stop');
	}
});

ok.SimpleView = ok.View.extend({
	constructor: function () {
		ok.View.apply(this, arguments);
		this.render();
		this.start();
	},
	render: function () {
		this.empty();
		if (this.template) {
			this.el.innerHTML = this.template(this.watch.get());
		}
	},
	start: function () {
		this.sup('start');
		if (this.watch) {
			this.listenTo(this.watch, 'change', this.render.bind(this));
		}
	}
});

ok.CollectionView = ok.View.extend({
	defaultConstructor: ok.View,
	childOptions: null,
	started: false,
	resort: true,
	constructor: function (options) {
		ok.View.apply(this, arguments);
		this.children = [];
		if (!options) {
			options = {};
		}
		if (options.childOptions) {
			this.childOptions = options.childOptions;
		}
		if (options.defaultConstructor) {
			this.defaultConstructor = options.defaultConstructor;
		}
	},
	start: function () {
		this.sup('start');
		this.listenTo(this.watch, 'add', this.addItem.bind(this));
		this.listenTo(this.watch, 'remove', this.removeItem.bind(this));
		this.listenTo(this.watch, 'sort', this.sort.bind(this));
	},
	render: function () {
		this.empty();
		this.watch.each(this.addItem, this);
	},
	sort: function () {
		this.render();
	},
	addItem: function (item, index) {
		var view = this.getItemView(item);
		var items = this.watch.items;
		var nextChild = _.find(this.children, function (child) {
			return _.indexOf(items, child.item) - 1 === index;
		});
		this.children.push({
			item: item,
			view: view
		});
		this.addChildView(view);
		view.render();
		// insert into DOM
		if (!nextChild) {
			this.el.appendChild(view.el);
		}
		else {
			this.el.insertBefore(view.el, nextChild.view.el);
		}
	},
	removeItem: function (item) {
		_.each(this.children, function (child, i) {
			if (child && child.item === item) {
				var view = child.view;
				var el = view.el;
				el.parentNode.removeChild(el);
				this.children.splice(i, 1);
				this.removeChildView(view);
				view.stop();
				return false;
			}
		}, this);
	},
	getConstructor: function (/* item */) {
		return this.defaultConstructor;
	},
	getItemView: function (item) {
		var Constructor = this.getConstructor(item);
		var options = _.extend({
			watch: item
		}, this.getChildOptions());
		var view = new Constructor(options);
		return view;
	},
	getChildOptions: function () {
		return this.childOptions;
	}
});

});