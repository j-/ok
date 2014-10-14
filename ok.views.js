(function (ok) {

'use strict';

ok.View = ok.Base.extend({
	el: null,
	ownerDocument: null,
	nodeType: 1,
	tagName: 'div',
	constructor: function (options) {
		options = options || {};
		if (options.tagName) {
			this.tagName = options.tagName;
		}
		if (options.className) {
			this.className = options.className;
		}
		if (options.el) {
			this.setElement(options.el);
		}
		else {
			this.createElement();
			if (options.id) {
				this.el.id = options.id;
			}
		}
		if (options.watch) {
			this.watch = options.watch;
		}
		this.init(options);
	},
	setElement: function (el) {
		this.el = el;
		this.ownerDocument = el.ownerDocument;
	},
	createElement: function () {
		var el = document.createElement(this.tagName);
		if (this.className) {
			el.className = this.className;
		}
		this.setElement(el);
	},
	empty: function () {
		while (this.el.children.length) {
			this.el.removeChild(this.el.firstChild);
		}
	},
	render: function () {
		// no-op
	},
	start: function () {
		// no-op
	},
	stop: function () {
		this.stopListening();
	}
});

ok.SimpleView = ok.View.extend({
	init: function () {
		this.render();
		this.start();
	},
	render: function () {
		this.empty();
		if (this.template) {
			this.innerHTML = this.template(this.watch.get());
		}
	},
	start: function () {
		this.stop();
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
	constructor: function fn (options) {
		fn.old.apply(this, arguments);
		this.children = [];
		this.started = false;
		if (!options) {
			options = {};
		}
		if (options.childOptions) {
			this.childOptions = options.childOptions;
		}
		if (options.defaultConstructor) {
			this.defaultConstructor = options.defaultConstructor;
		}
		this.listenTo(this.watch, 'sort', this.sort.bind(this));
	},
	start: function () {
		this.stop();
		this.started = true;
		_.each(this.children, function (child) {
			var view = child.view;
			view.start();
		});
		this.listenTo(this.watch, 'add', this.addItem.bind(this));
		this.listenTo(this.watch, 'remove', this.removeItem.bind(this));
	},
	stop: function fn () {
		fn.old.apply(this, arguments);
		this.started = false;
		_.each(this.children, function (child) {
			child.view.stop();
		});
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
		view.render();
		// insert into DOM
		if (!nextChild) {
			this.el.appendChild(view.el);
		}
		else {
			this.el.insertBefore(view.el, nextChild.view.el);
		}
		// only start when asked to
		if (this.started) {
			view.start();
		}
	},
	removeItem: function (item) {
		_.each(this.children, function (child, i) {
			if (child && child.item === item) {
				var el = child.view.el;
				el.parentNode.removeChild(el);
				this.children.splice(i, 1);
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

})(okaylib);