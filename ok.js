/*!
 * ok.js: Model/View/Controller framework
 * @module ok
 */
(function (factory, root) {

'use strict';

var _, ok;

// project uses amd
if (typeof define === 'function' && define.amd) {
	define('ok', ['underscore'], factory);
}
else {
	// project uses commonjs
	if (typeof module !== 'undefined' && typeof require === 'function') {
		_ = require('underscore');
		ok = factory(_, root);
		module.exports = ok;
	}
	// project is browser
	else {
		ok = factory(root._, root);
		root.ok = ok;
		root.okaylib = ok;
	}
}

})(function (_, root) {

'use strict';

/**
 * @exports ok
 */
var ok = {
	/**
	 * Current version of ok.js
	 * @const {string}
	 */
	VERSION: '0.4.0'
};

if (!root) {
	root = this;
}
var _old = root.ok;
ok.noConflict = function () {
	root.ok = _old;
	return ok;
};

// internal reference to common prototypes
var $Array = Array.prototype;
var $Object = Object.prototype;

// convenience functions
var slice = function (arr, start, end) {
	return $Array.slice.call(arr, start, end);
};
var hasProperty = function (obj, property) {
	return $Object.hasOwnProperty.call(obj, property);
};

/**
 * Notification of data being added to a collection
 * @event add
 * @property {*} item Item which has been added
 */
var EVENT_ADD = 'add';

/**
 * Notification of data being removed from a collection
 * @event remove
 * @property {*} item Item which has been removed
 */
var EVENT_REMOVE = 'remove';

/**
 * Notification of a change of data
 * @event change
 * @property {module:ok.Events} triggeredBy Reference to the object that
 *   fired the event
 * @property {*} newValue New value which has just been set
 * @property {*} oldValue Old value which has just been overwritten
 */
var EVENT_CHANGE = 'change';

/**
 * Notification of data being sorted
 * @event sort
 * @property {module:ok.Items} items Collection of newly sorted items
 */
var EVENT_SORT = 'sort';

/**
 * Insert a superconstructor into the prototype chain for a constructor
 * @param {Function} Child Constructor function
 * @param {Function} Parent Superconstructor function
 */
ok.inherits = function (Child, Parent) {
	// from backbone. surrogate class.
	var Class = function () {
		this.constructor = Child;
	};
	Class.prototype = Parent.prototype;
	Child.prototype = new Class();
	Child.__super__ = Parent.prototype;
};

/**
 * Takes a superconstructor and returns a child constructor with its
 *   prototype extended
 * @param {Function} Parent Superconstructor function
 * @param {Object=} proto Prototype object
 * @return {Function} Child constructor function
 */
ok.extendClass = function (Parent, proto) {
	var name, value;
	// sub class
	var Child = proto && hasProperty(proto, 'constructor') ?
		proto.constructor :
		function () {
			return Parent.apply(this, arguments);
		};
	ok.inherits(Child, Parent);
	// copy static properties from super class to sub class
	for (name in Parent) {
		if (hasProperty(Parent, name)) {
			Child[name] = Parent[name];
		}
	}
	// copy prototype from super class to sub class
	for (name in proto) {
		if (hasProperty(proto, name)) {
			value = proto[name];
			Child.prototype[name] = value;
		}
	}
	return Child;
};

/**
 * Takes a prototype object and returns a child constructor which inherits from
 *   the current context (`this`, must be a function) and implements the new
 *   prototoype.
 * @this {Function} Parent Superconstructor function
 * @param {Object} proto Prototype object
 * @return {Function} Child constructor function
 */
ok.extendThisClass = function (proto) {
	return ok.extendClass(this, proto);
};

/**
 * Return a new instance of a constructor.
 * @param {Function} Class Constructor
 * @param {...*} args Arguments passed through to constructor
 * @return {Object} New instance of given constructor
 */
ok.create = function (Class) {
	// from http://stackoverflow.com/a/18240186
	// also see http://stackoverflow.com/a/8843181
	var args = slice(arguments, 1);
	args.unshift(null);
	return new (Function.prototype.bind.apply(Class, args));
};

/**
 * Return a new instance of the current context (`this`, must be a function)
 * @this {Function} Class Constructor
 * @param {...*} args Arguments passed through to constructor
 * @return {Object} New instance of this constructor
 */
ok.createThis = function () {
	var args = slice(arguments);
	args.unshift(this);
	return ok.create.apply(null, args);
};

/**
 * Class which implements the observable pattern. Exposes methods for listening
 *   to and triggering arbitrary events.
 * @constructor
 */
ok.Events = function () {};

var eventIndex = 0;
ok.Events.prototype = {
	/**
	 * Adds a callback to the event queue which is executed when an event fires
	 * @param {string} event Event name
	 * @param {Function} fn Callback function. Executed when event fires.
	 * @param {*=} context Optional context to apply to callback
	 */
	on: function (event, fn, context) {
		this._events = this._events || {};
		var e = this._events[event] || (this._events[event] = []);
		e.push([fn, context]);
	},
	/**
	 * Observe another object by adding a callback to its event queue which is
	 *   executed when an event fires
	 * @param {Events} obj Object to listen to
	 * @param {string} event Event name
	 * @param {Function} fn Callback function. Executed when event fires.
	 * @param {*=} context Optional context to apply to callback
	 */
	listenTo: function (obj, event, fn, context) {
		var listeningTo = this._listeningTo || (this._listeningTo = {});
		var id = obj._listenId || (obj._listenId = eventIndex++);
		listeningTo[id] = obj;
		if (!fn && typeof event === 'object') {
			fn = this;
		}
		if (!context) {
			context = this;
		}
		obj.on(event, fn, context);
	},
	/**
	 * Removes a callback from the event queue
	 * @param {string} event Event name
	 * @param {Function} fn Callback function. No longer executed when event
	 *   fires.
	 */
	off: function (event, fn) {
		this._events = this._events || {};
		var e = this._events[event];
		if (e) {
			for (var i = 0, l = e.length; i < l; i++) {
				if (e[i][0] === fn) {
					e.splice(i, 1);
					i--;
					l--;
				}
			}
		}
	},
	/**
	 * Stop observing another object
	 * @param {Events=} obj Object to stop observing. Omit to stop observing all
	 *   objects.
	 * @param {string=} event Event name. Omit to stop observing all events on
	 *   this object.
	 * @param {Function} fn Callback function. Stops this function executing
	 *   when `event` is triggered.
	 */
	stopListening: function (obj, event, fn) {
		var listeningTo = this._listeningTo;
		if (!listeningTo) {
			return;
		}
		var remove = !event && !fn;
		if (!fn && typeof event === 'object') {
			fn = this;
		}
		if (obj) {
			(listeningTo = {})[obj._listenId] = obj;
		}
		for (var id in listeningTo) {
			obj = listeningTo[id];
			obj.off(event, fn, this);
			if (remove) {
				delete this._listeningTo[id];
			}
		}
	},
	/**
	 * Trigger an event and execute all callbacks in the event queue
	 * @param {string} event Event name
	 * @param {...*} args Event arguments passed through to all callbacks
	 */
	trigger: function (event/*, args... */) {
		this._events = this._events || {};
		var e = this._events[event];
		if (e) {
			for (var i = 0, l = e.length; i < l; i++){
				e[i][0].apply(e[i][1] || this, slice(arguments, 1));
			}
		}
	}
};

/**
 * Base class. All ok.js classes extend from this base (except {@link Items}).
 * @constructor
 * @augments {module:ok.Events}
 * @param {...*} args Arguments passed to through to {@link module:ok.Base#init}
 */
ok.Base = function (/* args... */) {
	var args = slice(arguments);
	if (this.init) {
		this.init.apply(this, args);
	}
};
_.extend(ok.Base.prototype, ok.Events.prototype);

/**
 * Initialization for this instance.
 * @virtual
 */
ok.Base.prototype.init = function () {
	// no-op
};

/**
 * Create a new instance of this class
 * @static
 * @function
 * @param {...*} args Arguments passed through to the constructor function
 * @see module:ok.createThis
 */
ok.Base.create = ok.createThis;

/**
 * Create a new child constructor which extends from this class
 * @static
 * @function
 * @param {Object} proto Prototype object
 * @see module:ok.extendThisClass
 */
ok.Base.extend = ok.extendThisClass;

/**
 * Data node. Exposes common interface for child classes.
 * @constructor
 * @augments {module:ok.Base}
 * @param {...*} args Arguments passed to through to {@link module:ok.Base#init}
 */
ok.Data = ok.Base.extend(/** @lends module:ok.Data.prototype */{
	/**
	 * Get the simple data representation of this element
	 * @virtual
	 * @return {?*} Data
	 */
	get: function () {
		return null;
	},
	/**
	 * Set the simple data representation of this element
	 * @virtual
	 * @param {?(...*)} args Data
	 */
	set: function () {
		// no-op
	}
});

/**
 * Properties are data containers.
 * @class
 * @augments {module:ok.Data}
 * @param {...*} args Passed through to {@link #init}
 */
ok.Property = ok.Data.extend(/** @lends module:ok.Property.prototype */{
	/**
	 * Raw value storage
	 * @type {*}
	 * @private
	 */
	_value: null,
	/**
	 * Properties which are not initialized with a value will be given this
	 *   value by default
	 * @type {*}
	 */
	defaultValue: null,
	/**
	 * Optionally initialize this property with a value
	 * @param {*=} initValue Initial value for this property
	 */
	constructor: function (initValue) {
		if (arguments.length) {
			this.set(initValue);
		}
		else {
			this.set(this.defaultValue);
		}
		ok.Data.apply(this, arguments);
	},
	/**
	 * Getter which returns the internal value
	 * @return {*} Value of this property
	 */
	getValue: function () {
		return this._value;
	},
	/**
	 * Replace the internal property with a new value and trigger a 'change'
	 * @param {*} newValue New property value
	 * @fires change
	 */
	setValue: function (newValue) {
		if (this._value !== newValue) {
			var oldValue = this._value;
			this._value = newValue;
			this.trigger(EVENT_CHANGE, this, newValue, oldValue);
		}
	},
	/**
	 * Sugar for {@link #getValue}
	 * @return {*} Value of this property
	 */
	get: function () {
		return this.getValue();
	},
	/**
	 * Sugar for {@link #setValue}
	 * @param {*} newValue New property value
	 * @fires change
	 */
	set: function (newValue) {
		this.setValue(newValue);
	}
});

/**
 * Maps are a collection of properties associated with property names.
 * @class
 * @augments {module:ok.Data}
 * @param {...*} args Passed through to {@link #init}
 */
ok.Map = ok.Data.extend(/** @lends module:ok.Map.prototype */{
	/**
	 * Internal hash which persists properties
	 * @type {Object}
	 */
	properties: null,
	/**
	 * Define constructors for each property
	 * @type {?Object}
	 */
	schema: null,
	/**
	 * Optional hash of properties to initialize all instances with
	 * @type {?Object}
	 */
	defaults: null,
	/**
	 * All new properties will be declared using this constructor
	 * @type {Function}
	 * @default {@link module:ok.Property}
	 */
	defaultConstructor: ok.Property,
	/**
	 * Initialize properties hash by extending {@link #defaults} with
	 *   `properties`
	 * @param {Object=} properties Hash of properties to initialize this with
	 */
	constructor: function (properties) {
		ok.Data.apply(this, arguments);
		var defaults = this.getDefaults();
		if (!this.properties) {
			this.properties = {};
		}
		if (defaults) {
			this.initProperties(defaults);
		}
		if (properties) {
			this.setMap(properties);
		}
	},
	/**
	 * Remove all events listeners
	 * @deprecated Use {@link #stopListening} (with no arguments) instead
	 */
	destroy: function () {
		var properties = this.properties;
		var prop;
		for (var name in properties) {
			if (hasProperty(properties, name)) {
				prop = this.getProperty(name);
				this.stopListening(prop, EVENT_CHANGE);
			}
		}
	},
	/**
	 * Get defaults hash. If it is a function, execute it and use the result.
	 * @return {Object} Defaults
	 */
	getDefaults: function () {
		var defaults = this.constructor.prototype.defaults;
		if (typeof defaults === 'function') {
			return defaults.apply(this);
		}
		else {
			return defaults;
		}
	},
	/**
	 * Declare the values of a hash of properties
	 * @param {Object} properties Hash of properties and values
	 */
	initProperties: function (properties) {
		properties = properties || {};
		for (var name in properties) {
			this.initProperty(name, properties[name], properties);
		}
	},
	/**
	 * Declare the value of a single property
	 * @param {string} name Property name
	 * @param {*} value Property value
	 * @return {module:ok.Property} New property instance
	 */
	initProperty: function (name, value) {
		var prop = this.getProperty(name);
		var Constructor;
		var context = this;
		if (!prop) {
			Constructor = this.getConstructor(name, value);
			prop = new Constructor();
			prop = this.setProperty(name, prop);
			this.listenTo(prop, EVENT_CHANGE, this.change);
		}
		if (typeof value !== 'undefined') {
			prop.set(value);
		}
		return prop;
	},
	/**
	 * Called when a property is changed
	 * @param {module:ok.Property} changed Property which has changed
	 * @param {*} newValue New value which has just been set
	 * @param {*} oldValue Old value which has just been overwritten
	 * @fires change
	 */
	change: function (changed, newValue, oldValue) {
		this.trigger(EVENT_CHANGE, changed, newValue, oldValue);
	},
	/**
	 * Determines what constructor to use when initializing a property
	 * @param {string} name Property name
	 * @param {*} value Property value
	 * @return {Function} Constructor function
	 */
	getConstructor: function (name, value) {
		var constructor = this.schema && this.schema[name];
		return constructor || this.defaultConstructor;
	},
	/**
	 * Get the values of one or more properties
	 * @param {...string=} name Optional property names. If omitted, a map of
	 *   all properties will be returned. If one property name is given then the
	 *   value of that property will be returned. Otherwise, if more than one
	 *   property name is given, the values of those properties will be returned
	 *   as an array.
	 * @return {Object|Array|*} Result of the get operation depending on the
	 *   number of property names given.
	 */
	get: function (name) {
		var args = arguments;
		var len = args.length;
		if (len === 0) {
			return this.getMap();
		}
		else if (len === 1) {
			return this.getValue(name);
		}
		else {
			return this.getValues.apply(this, args);
		}
	},
	/**
	 * Get the values of all properties
	 * @return {Object} Map of all properties. Each property has had its `get`
	 *   function invoked.
	 */
	getMap: function () {
		var result = {};
		var map = this.properties;
		for (var name in map) {
			if (hasProperty(map, name)) {
				result[name] = map[name].get();
			}
		}
		return result;
	},
	/**
	 * Get the value of a single property
	 * @param {string} name Property name
	 * @return {*} Result of property's `get` function when invoked.
	 */
	getValue: function (name) {
		var prop = this.getProperty(name);
		return prop && prop.get();
	},
	/**
	 * Get the value of multiple properties
	 * @param {...string} names Property names
	 * @return {Array} Array of values from each property's `get` function
	 */
	getValues: function () {
		var result = [];
		var args = arguments;
		var l = args.length;
		var name, value;
		for (var i = 0; i < l; i++) {
			name = args[i];
			value = this.getValue(name);
			result.push(value);
		}
		return result;
	},
	/**
	 * Get a single property by name
	 * @param {string} name Property name
	 * @return {module:ok.Property} Property object
	 */
	getProperty: function (name) {
		return this.properties[name];
	},
	/**
	 * Get a single property by name. Shorthand for `getProperty()`.
	 * @param {string} name Property name
	 * @return {module:ok.Property} Property object
	 */
	property: function (name) {
		return this.getProperty(name);
	},
	/**
	 * Set the value of one or more properties
	 * @method module:ok.Map#set
	 * @param {Object} attrs Hash of property names and values to set
	 */
	/**
	 * Set the value of a single property
	 * @param {string} name Property name
	 * @param {*} newValue Property value
	 */
	set: function (name, newValue) {
		if (arguments.length > 1) {
			this.setValue(name, newValue);
		}
		else {
			var attrs = name;
			this.setMap(attrs);
		}
	},
	/**
	 * Set values of properties using an object
	 * @param {Object} attrs Hash of property names and values to set
	 */
	setMap: function (attrs) {
		attrs = attrs || {};
		for (var name in attrs) {
			if (hasProperty(attrs, name)) {
				this.setValue(name, attrs[name]);
			}
		}
	},
	/**
	 * Set the value of a single property
	 * @param {string} name Property name
	 * @param {*} newValue Property value
	 */
	setValue: function (name, newValue) {
		var property = this.getProperty(name);
		if (!property) {
			this.initProperty(name, newValue);
		}
		else {
			property.set(newValue);
		}
	},
	/**
	 * Set a single property to a new value
	 * @param {string} name Property name
	 * @param {module:ok.Property} prop Property object
	 * @return {module:ok.Property} The new property
	 */
	setProperty: function (name, prop) {
		this.properties[name] = prop;
		return prop;
	}
});

/**
 * Extended array with added convenience methods and events.
 * @class
 * @augments {Array}
 * @augments {module:ok.Events}
 */
ok.Items = ok.extendClass(Array, /** @lends module:ok.Items.prototype */{
	constructor: function () {
		Array.call(this);
	},
	/**
	 * Remove an item off the top of the stack
	 * @return {*} Value of popped item
	 * @fires remove
	 */
	pop: function () {
		var item = $Array.pop.apply(this);
		this.trigger(EVENT_REMOVE, item);
		return item;
	},
	/**
	 * Push new items to the top of the stack
	 * @param {...*} New items to push
	 * @return {int} New length after items have been pushed
	 * @fires add
	 */
	push: function (/* items... */) {
		var items = slice(arguments);
		var item;
		for (var i = 0, l = items.length; i < l; i++) {
			item = items[i];
			$Array.push.call(this, item);
			this.trigger(EVENT_ADD, item, this.length);
		}
		return this.length;
	},
	/**
	 * Shift a single item from the bottom of the stack
	 * @return {*} Value of shifted item
	 * @fires remove
	 */
	shift: function () {
		var item = $Array.shift.apply(this);
		this.trigger(EVENT_REMOVE, item);
		return item;
	},
	/**
	 * Sorts the items according to a given comparison function
	 * @param {Function} compare Compare function
	 * @return {module:ok.Items} Newly sorted items array
	 * @fires sort
	 */
	sort: function () {
		var result = $Array.sort.apply(this, arguments);
		this.trigger(EVENT_SORT, this);
		return result;
	},
	/**
	 * Remove and/or insert items.
	 * @param {int} index Position to begin splicing
	 * @param {int=} remove Count of items to remove. Can be 0. If omitted, all
	 *   items until the end of the array will be removed.
	 * @param {...*=} newItems Items to be inserted at this index
	 * @return {int} The number of items which have been removed
	 * @fires add
	 * @fires remove
	 */
	splice: function (index, remove/*, newItems... */) {
		var newItems = slice(arguments, 2);
		var removed = 0;
		if (remove > 0) {
			removed = this.remove(index, remove);
		}
		if (newItems.length) {
			this.insert.apply(this, [index].concat(newItems));
		}
		return removed;
	},
	/**
	 * Add new items to the bottom of the stack
	 * @param {...*} items Items to add
	 * @return {int} New length after items have been added
	 * @fires add
	 */
	unshift: function (/* items... */) {
		var items = slice(arguments);
		var item;
		for (var i = 0, l = items.length; i < l; i++) {
			item = items[i];
			$Array.unshift.call(this, item);
			this.trigger(EVENT_ADD, item, 0);
		}
		return this.length;
	},
	/**
	 * Remove items from the array
	 * @param {int=} start Start index. If omitted, will start at 0.
	 * @param {int=} length Number of items to remove. If omitted, will remove
	 *   all items until the end of the array.
	 * @return {Array} Collection of removed items
	 * @fires remove
	 */
	remove: function (start, length) {
		var removed, item;
		if (arguments.length < 1) {
			start = 0;
		}
		if (arguments.length < 2) {
			length = this.length - start;
		}
		removed = [];
		while (start < this.length && length-- > 0) {
			item = this[start];
			$Array.splice.call(this, start, 1);
			this.trigger(EVENT_REMOVE, item);
			removed.push(item);
		}
		return removed;
	},
	/**
	 * Insert items into the array
	 * @param {int} start Starting index
	 * @param {...*} items New items to insert
	 * @return {int} New length after items have been added
	 * @fires add
	 */
	insert: function (start/*, items... */) {
		var items = slice(arguments, 1);
		var item, index;
		for (var i = 0, l = items.length; i < l; i++) {
			item = items[i];
			index = start + i;
			$Array.splice.call(this, index, 0, item);
			this.trigger(EVENT_ADD, item, index);
		}
		return this.length;
	},
	/**
	 * Get the item at a given index. Can be negative.
	 * @param {int} Index
	 * @return {*?} Item at given index
	 */
	get: function (index) {
		if (index < 0) {
			index = this.length + index;
		}
		if (hasProperty(this, index)) {
			return this[index];
		}
		return null;
	}
});
_.extend(ok.Items.prototype, ok.Events.prototype);

/**
 * Create a new instance of this class
 * @static
 * @function
 * @param {...*} args Arguments passed through to the constructor function
 * @see module:ok.createThis
 */
ok.Items.create = ok.createThis;

/**
 * Create a new child constructor which extends from this class
 * @static
 * @function
 * @param {Object} proto Prototype object
 * @see module:ok.extendThisClass
 */
ok.Items.extend = ok.extendThisClass;

/**
 * Collections maintain an array of items
 * @class
 * @augments {module:ok.Data}
 * @param {...*} items Initialize the collection with these items
 */
ok.Collection = ok.Data.extend(/** @lends module:ok.Collection.prototype */{
	/**
	 * Internal array of items
	 * @type {module:ok.Items}
	 */
	items: null,
	/**
	 * Length of items array. Kept in sync with items array.
	 * @type {int}
	 */
	length: 0,
	/**
	 * All new properties will be declared using this constructor
	 * @type {Function}
	 */
	defaultConstructor: ok.Property,
	/**
	 * Initialize with items
	 */
	constructor: function (items) {
		this.items = new ok.Items();
		this.start();
		if (items) {
			this.add(items);
		}
		this.init();
	},
	/**
	 * Begin listening to changes on the internal items storage array
	 */
	start: function () {
		this.stop();
		this.listenTo(this.items, 'add', this.triggerAdd);
		this.listenTo(this.items, 'remove', this.triggerRemove);
		this.listenTo(this.items, 'sort', this.triggerSort);
		this.listenTo(this.items, 'add', this.updateLength);
		this.listenTo(this.items, 'remove', this.updateLength);
		this.listenTo(this.items, 'add', this.watchItem);
		this.listenTo(this.items, 'remove', this.unwatchItem);
	},
	/**
	 * Stop listening to change on the internal items storage array
	 */
	stop: function () {
		this.stopListening(this.items);
	},
	/**
	 * Handler for the internal items storage array. Called when an item is
	 *   added.
	 * @param {*} item Newly added item
	 * @param {int} index Position of new item
	 * @fires add
	 */
	triggerAdd: function (item, index) {
		this.trigger('add', item, index);
	},
	/**
	 * Handler for the internal items storage array. Called when an item is
	 *   removed.
	 * @param {*} item Newly removed item
	 * @fires remove
	 */
	triggerRemove: function (item) {
		this.trigger('remove', item);
	},
	/**
	 * Handler for the internal items storage array. Called when the array is
	 *   sorted.
	 * @param {Array.<*>} items Items array after it has been sorted
	 * @fires sort
	 */
	triggerSort: function (items) {
		this.trigger('sort', items);
	},
	/**
	 * Handler for the internal items storage array. Called when the array is
	 *   changed.
	 * @param {Array.<*>} items Items array after it has been sorted
	 * @fires change
	 */
	triggerChange: function (item, newValue, oldValue) {
		this.trigger('change', item, newValue);
	},
	/**
	 * Maintain the length property of this collection. Keep it in sync with the
	 *   length of the internal items storage array.
	 */
	updateLength: function () {
		this.length = this.items.length;
	},
	/**
	 * Add one or more items
	 * @param {*|Array.<*>} items A single item or array of items which will be
	 *   added to this collection
	 * @fires add
	 */
	add: function (items) {
		if (!_.isArray(items)) {
			items = [items];
		}
		for (var i = 0, l = items.length; i < l; i++) {
			this.addItem(items[i], this.items.length);
		}
	},
	/**
	 * Add a single item to this collection
	 * @param {*} item Item to add to collection
	 * @param {int} index Position to add the item
	 * @fires add
	 */
	addItem: function (item/*, index*/) {
		var old = item;
		var Constructor;
		if (!(item instanceof ok.Base)) {
			Constructor = this.getConstructor(item);
			item = new Constructor(item);
		}
		var identified = this.identify(item);
		if (identified) {
			identified.set(old);
		}
		else {
			var index = this.findInsertIndex(item);
			this.items.insert(index + 1, item);
		}
	},
	/**
	 * Watch a new item for changes
	 * @param {*} item New item in `items` array
	 */
	watchItem: function (item) {
		this.listenTo(item, 'change', this.triggerChange);
	},
	/**
	 * Stop watching an item for changes
	 * @param {*} item Item in `items` array
	 */
	unwatchItem: function (item) {
		this.stopListening(item, 'change', this.triggerChange);
	},
	/**
	 * Determine where a newly inserted item would fit in this collection. Find
	 *   the index of the item to insert after, or -1 to insert at the first
	 *   index.
	 * @param {*} item Item to be added to collection
	 * @return {int} Index of the item to insert after
	 * @todo Rephrase
	 */
	findInsertIndex: function (item) {
		var index = -1;
		_.each(this.items, function (comparedTo, newIndex) {
			if (this.comparator(comparedTo, item) <= 0) {
				index = newIndex;
				return false;
			}
		}, this);
		return index;
	},
	/**
	 * Determines what constructor to use when initializing a property
	 * @param {*} value New item value
	 * @return {Function} Constructor for new item
	 */
	getConstructor: function (value) {
		return this.defaultConstructor;
	},
	/**
	 * Remove a specific item from the collection
	 * @param {*} item Item to remove
	 * @return {int} Number of items which have been removed
	 * @fires remove
	 */
	remove: function (item) {
		var items = this.items;
		var removed = 0;
		for (var i = 0, l = items.length; i < l; i++) {
			if (items[i] === item) {
				items.splice(i, 1);
				i--;
				removed++;
			}
		}
		return removed;
	},
	/**
	 * Remove all items from this collection
	 */
	empty: function () {
		return this.items.remove();
	},
	/**
	 * Reset the entire collection
	 * @param {Array.<*>=} newItems New items to add to the collection
	 * @fires remove
	 * @fires add
	 */
	set: function (newItems) {
		this.empty();
		if (newItems) {
			this.add(newItems);
		}
	},
	/**
	 * Returns an array of each item's value. Invokes `get()` on all children.
	 * @return {Array.<*>} Serialized array
	 */
	get: function () {
		var items = this.items;
		var result = [];
		for (var i = 0, l = items.length; i < l; i++) {
			result.push(items[i].get());
		}
		return result;
	},
	/**
	 * Determine if an item already exists in this collection
	 * @param {*} item Item to find
	 * @return {?*} Item, or `null` if not found
	 */
	identify: function (item) {
		var items = this.items;
		for (var i = 0, l = items.length; i < l; i++) {
			if (items[i] === item) {
				return items[i];
			}
		}
		return null;
	},
	/**
	 * Iterate through this collection's items and invoke a callback function
	 *   with a reference to each item
	 * @param {Function} iterator Callback function
	 * @param {*=} context Optional context to apply to callback function. Will
	 *   use the collection by default.
	 */
	each: function (iterator, context) {
		if (arguments.length < 2) {
			context = this;
		}
		_.each(this.items, iterator, context);
	},
	/**
	 * Used to compare two items when sorting.
	 * @param {*} a Left item for comparison
	 * @param {*} b Right item for comparison
	 * @return {int} A negative value means `a` is smaller than `b`. A positive
	 *   value means `a` is larger than `b`. A zero value means `a` and `b` are
	 *   equal.
	 */
	comparator: function (a, b) {
		return 0;
	},
	/**
	 * Sort the collection.
	 * @param {Function=} comparator Comparator function. Receives two items and
	 *   is expected to return a signed integer which will be used to determine
	 *   the items' order. If omitted, the collection's {@link
	 *   module:ok.Collection#comparator} will be used.
	 */
	sort: function (comparator) {
		if (comparator) {
			this.comparator = comparator;
		}
		this.items.sort(this.comparator);
	},
	/**
	 * Get the item at a given index
	 * @param {int} index Index of item
	 * @return Item at given index
	 */
	at: function (index) {
		return this.items.get(index);
	}
});

/**
 * Controllers are the 'glue' that sits between models/collections and views.
 * @class
 * @augments {module:ok.Base}
 */
ok.Controller = ok.Base.extend(/** @lends module:ok.Controller.prototype */{

});

return ok;

}, this);