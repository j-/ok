/*!
 * ok.js: Model/View/Controller framework
 * @module ok
 */
(function (factory, root, _, ok) {

/* global define, require, module */

// amd
if (typeof define === 'function' && define.amd) {
	define('ok', ['underscore'], factory);
}
// commonjs
else if (typeof module !== 'undefined' && typeof require === 'function') {
	_ = require('underscore');
	ok = factory(_, root);
	module.exports = ok;
}
// globals
else {
	ok = factory(root._, root);
	root.ok = ok;
	root.okaylib = ok;
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
	VERSION: '0.5.6'
};

if (!_) {
	throw new Error('ok relies on underscore (underscorejs.org)');
}

// prevent global namespace collisions
var _old = root ? root.ok : null;
ok.noConflict = root ? function () {
	root.ok = _old;
	return ok;
} : _.constant(ok);

// internal reference to common prototypes
var $Array = Array.prototype;
var $Object = Object.prototype;
var $Function = Function.prototype;

// convenience functions
var slice = function (arr, start, end) {
	return $Array.slice.call(arr, start, end);
};
var hasProperty = function (obj, property) {
	return $Object.hasOwnProperty.call(obj, property);
};
var isObject = function (obj) {
	return $Object.toString.call(obj) === '[object Object]';
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
 * @param {...Object} protos Prototype object
 * @return {Function} Child constructor function
 */
ok.extendClass = function (Parent) {
	var protos = slice(arguments, 1);
	var statics = {};
	var proto = _.reduce(protos, function (proto, item) {
		if (typeof item === 'function') {
			_.extend(statics, item);
			item = item.prototype;
		}
		return _.extend(proto, item);
	}, {});
	var mergedProto = ok.mergePrototypes(Parent.prototype, proto);
	// sub class
	var Class = proto && hasProperty(proto, 'constructor') ?
		proto.constructor :
		function Class () { return Parent.apply(this, arguments); };
	ok.inherits(Class, Parent);
	// copy static properties from super class to sub class
	_.extend(Class, Parent);
	_.extend(Class, statics);
	// copy prototype from super class to sub class
	_.extend(Class.prototype, proto);
	_.extend(Class.prototype, mergedProto);
	// shortcut
	Class.fn = Class.prototype;
	Class.__super__ = Parent.prototype;
	return Class;
};

/**
 * Takes a prototype object and returns a child constructor which inherits from
 *   the current context (`this`, must be a function) and implements the new
 *   prototype. Can be passed multiple prototypes which will each be applied in
 *   the order they are given.
 * @this {Function} Parent Superconstructor function
 * @param {...Object} protos Prototype objects
 * @return {Function} Child constructor function
 */
ok.extendThisClass = function () {
	var protos = slice(arguments);
	protos.unshift(this);
	return ok.extendClass.apply(this, protos);
};

/**
 * Extend a native constructor, like Array, Error, String etc.
 * @param {Function} native Native constructor to extend
 * @param {...Object} [protos] Extended prototypes
 * @return {Function} Child constructor function
 */
ok.extendNative = function () {
	var args = slice(arguments);
	var proto = {
		include: ok.include,
		sup: ok.sup,
		clone: ok.cloneThis,
		mergeProperties: ['mergeProperties']
	};
	var statics = {
		create: ok.createThis,
		extend: ok.extendThisClass,
		include: ok.include,
		toString: ok.classToString
	};
	args.splice(1, 0, proto, ok.Events.fn);
	var Result = ok.extendClass.apply(ok, args);
	Result.include = ok.include;
	Result.include(statics);
	return Result;
};

/**
 * Get the super constructor of a given constructor or prototype. Derives the
 *   parent from the given child's `__super__` property which is automatically
 *   assigned by `ok.extendClass()`. If a super constructor is not found,
 *   `Object` is returned.
 * @param {Function|Object} obj Constructor or prototype
 * @return {Function} Parent constructor
 */
ok.getSuper = function (obj) {
	var Class = (typeof obj === 'function') ? obj : obj.constructor;
	var superProto = Class.__super__;
	var Super = superProto ? superProto.constructor : Object;
	return Super;
};

/**
 * Get the class which implemented a given method or property.
 * @param {Function|Object} obj Constructor or prototype
 * @param {String} method Method or property name
 * @return {Function} Constructor which implements the given method or property
 */
ok.getImplementor = function (obj, method) {
	var Class = (typeof obj === 'function') ? obj : obj.constructor;
	var Super;
	// avoid infinite loop
	if (Class === Object) {
		// method can only be found on Object
		if (hasProperty($Object, method)) {
			return Object;
		}
		// method cannot be found
		return null;
	}
	// this instance implements the method
	if (_.isObject(obj) && hasProperty(obj, method)) {
		return Class;
	}
	// this class implements the method
	if (hasProperty(Class.prototype, method)) {
		return Class;
	}
	// this class does not implement the method
	Super = ok.getSuper(Class);
	return ok.getImplementor(Super, method);
};

/**
 * Calls a super function if it is implemented, no-op otherwise. If no arguments
 *   are given, the super constructor will be returned.
 * @param {String=} method Method to call. If no method given, the super
 *   constructor itself will be called.
 * @param {Array} args Arguments to send to super function. Can be an arguments
 *   object or an array.
 * @return {*} Result of super function call
 */
ok.sup = function (first, args) {
	var superFn, result;
	var Class = this.constructor;
	var Super = this.__currentSuper__ ?
		ok.getSuper(this.__currentSuper__) :
		ok.getSuper(Class);
	this.__currentSuper__ = Super;
	if (typeof first === 'string') {
		Super = ok.getImplementor(Super, first);
		superFn = Super && Super.prototype[first];
		result = (typeof superFn === 'function') ?
			superFn.apply(this, args) :
			undefined;
	}
	else if (_.isArray(first) || _.isArguments(first)) {
		result = Super.apply(this, first);
	}
	else {
		result = Super;
	}
	delete this.__currentSuper__;
	return result;
};

/**
 * Return a new instance of a constructor.
 * @param {Function} Class Constructor
 * @param {Array} args Arguments passed through to constructor
 * @return {Object} New instance of given constructor
 */
ok.createWithArguments = function (Class, args) {
	args = slice(args);
	args.unshift(null);
	// from http://stackoverflow.com/a/18240186
	// also see http://stackoverflow.com/a/8843181
	return new ($Function.bind.apply(Class, args))();
};

/**
 * Return a new instance of this constructor.
 * @this {Function} Constructor to create a new instance of
 * @param {Array} args Arguments passed through to constructor
 * @return {Object} New instance of given constructor
 */
ok.createThisWithArguments = function (args) {
	return ok.createWithArguments(this, args);
};

/**
 * Return a new instance of a constructor.
 * @param {Function} Class Constructor
 * @param {...*} args Arguments passed through to constructor
 * @return {Object} New instance of given constructor
 */
ok.create = function (Class) {
	var args = slice(arguments, 1);
	return ok.createWithArguments(Class, args);
};

/**
 * Return a new instance of the current context (`this`, must be a function)
 * @this {Function} Class Constructor
 * @param {...*} args Arguments passed through to constructor
 * @return {Object} New instance of this constructor
 */
ok.createThis = function () {
	return ok.createWithArguments(this, arguments);
};

/**
 * Apply members to the current context.
 * @this {*} Object to apply map to
 * @param {Object} map Key/value pairs to apply
 * @return {*} Context for chaining
 */
ok.include = function (map) {
	return _.extend(this, map);
};

/**
 * Naiive clone implementation based on expected get/set pattern used by Base.
 * @this {Object} instance Instance to clone
 * @param {...*} args Arguments to pass to clone's constructor
 * @return {Object} Clone of this instance
 */
ok.cloneThis = function () {
	var data;
	var Constructor = this.constructor;
	var clone = ok.createThis.apply(Constructor, arguments);
	if (typeof this.get === 'function' && typeof clone.set === 'function') {
		data = this.get();
		clone.set(data);
	}
	return clone;
};

/**
 * Return a plain array representing the given object.
 * @param {Arguments|Array|Object} obj Object to convert to plain array
 * @return {Array} Plain array
 */
ok.toArray = function (obj) {
	var result = [];
	if (obj === undefined || obj === null) {
		result.push(obj);
	}
	else if (typeof obj.forEach === 'function') {
		obj.forEach(function (item) {
			result.push(item);
		});
	}
	else if (typeof obj.length === 'number') {
		_.forEach(slice(obj), function (item) {
			result.push(item);
		});
	}
	else {
		result.push(obj);
	}
	return result;
};

/**
 * Combine variables. Arrays will be concatenated, and objects will be merged.
 *   Inputs will not be modified.
 * @param {...*} Values to merge
 * @result {Object|Array} Merged value
 */
ok.mergeValues = function () {
	// merge if any argument is an object
	if (_.any(arguments, isObject)) {
		return _.reduce(arguments, function (result, arg) {
			return _.extend(result, arg);
		}, {});
	}
	// otherwise concatenate as array
	return $Array.concat.apply([], _.without(arguments, null, undefined));
};

/**
 * Combine two prototypes using the `mergeProperties` property of the first.
 *   Each property existing in both prototypes will be merged.
 * @param {Object} oldProto First prototype
 * @param {Object} newProto Second prototype
 * @return {Object} Merged prototype
 */
ok.mergePrototypes = function (oldProto, newProto) {
	var properties;
	var mergedProto = {};
	oldProto = oldProto || {};
	newProto = newProto || {};
	properties = _.uniq(ok.mergeValues(
		oldProto.mergeProperties,
		newProto.mergeProperties
	));
	_.forEach(properties, function (prop) {
		mergedProto[prop] = ok.mergeValues(
			oldProto[prop],
			newProto[prop]
		);
	});
	return mergedProto;
};

/**
 * Returns a constructor's name.
 * @this {Function} Constructor to convert to string
 * @return {String} String representation of this class
 */
ok.classToString = function (Class) {
	var thisName = String(this.name);
	var result;
	if (thisName) {
		result = Class ? '(subclass of ' + thisName + ')' : thisName;
	}
	else {
		result = ok.getSuper(this).toString(this);
	}
	return result;
};

/**
 * Class which implements the observable pattern. Exposes methods for listening
 *   to and triggering arbitrary events.
 * @constructor
 */
ok.Events = function Events () {};

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
ok.Events.fn = ok.Events.prototype;

/**
 * Base class. All ok.js classes extend from this base (except {@link Items}).
 * @constructor
 * @augments {module:ok.Events}
 * @param {...*} args Arguments passed to through to {@link module:ok.Base#init}
 */
ok.Base = function Base (/* args... */) {
	var args = slice(arguments);
	if (this.init) {
		this.init.apply(this, args);
	}
};
ok.Base.fn = ok.Base.prototype;
_.extend(ok.Base.fn, ok.Events.fn);

/**
 * Initialization for this instance.
 * @virtual
 */
ok.Base.fn.init = function () {
	// no-op
};

/**
 * Naiive clone implementation based on expected get/set pattern used by Base.
 * @param {...*} args Arguments to pass to clone's constructor
 * @return {Object} Clone of this instance
 */
ok.Base.fn.clone = ok.cloneThis;

/**
 * Call a super function in the prototype chain.
 * @param {String=} method Method to call. If no method given, the super
 *   constructor itself will be called.
 * @param {Array} args Arguments to send to super function. Can be an arguments
 *   object or an array.
 * @see module:ok.sup
 */
ok.Base.fn.sup = ok.sup;

/**
 * Defines which properties will be merged when this class is extended. Can
 *   itself be merged.
 * @property {String[]}
 * @see module:ok.mergePrototypes
 */
ok.Base.fn.mergeProperties = ['mergeProperties'];

/**
 * Extend the current object or prototype's members.
 * @see module:ok.include
 */
ok.Base.fn.include = ok.include;

/**
 * Extend the current class's static members.
 * @see module:ok.include
 */
ok.Base.include = ok.include;

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
 * Returns the constructor's name.
 * @static
 * @return {String} String representation of this class
 * @see module:ok.classToString
 */
ok.Base.toString = ok.classToString;

/**
 * Define partial functionality to be mixed in with other classes. Methods are
 *   defined in a way that allows for use as a static function as well. The
 *   first argument is reserved for the function's context.
 * @constructor
 * @augments {module:ok.Base}
 * @param {Object} statics Mixin members
 */
ok.Mixin = ok.Base.extend({
	constructor: function Mixin (statics) {
		var mixin;
		var proto = {};
		_.forEach(statics, function (item, key) {
			if (typeof item === 'function') {
				proto[key] = function () {
					var args = slice(arguments);
					args.unshift(this);
					return item.apply(mixin, args);
				};
			}
			else {
				proto[key] = item;
			}
		});
		mixin = ok.Base.extend(proto);
		_.extend(mixin, statics);
		delete mixin.fn.constructor;
		return mixin;
	}
});

/**
 * Data node. Exposes common interface for child classes.
 * @constructor
 * @augments {module:ok.Base}
 * @param {...*} args Arguments passed to through to {@link module:ok.Base#init}
 */
ok.Data = ok.Base.extend(/** @lends module:ok.Data.prototype */{
	// rename constructor
	constructor: function Data () {
		return ok.Base.apply(this, arguments);
	},
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
	constructor: function Property (initValue) {
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
		var oldValue = this._value;
		if (oldValue !== newValue) {
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
	constructor: function Map (properties) {
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
		_.forEach(properties, function (prop, name) {
			prop = this.getProperty(name);
			this.stopListening(prop, EVENT_CHANGE);
		}, this);
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
		_.forEach(properties, function (property) {
			this.initProperty(name, property);
		});
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
		if (!prop) {
			Constructor = this.getConstructor(name, value);
			prop = new Constructor();
			prop = this.setProperty(name, prop);
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
	getConstructor: function (name/*, value*/) {
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
		var map = this.properties;
		var pairs = _.map(map, function (prop, name) {
			return [name, prop.get()];
		});
		var result = _.object(pairs);
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
		_.forEach(attrs, function (val, name) {
			this.setValue(name, val);
		}, this);
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
		this.unsetProperty(name);
		this.properties[name] = prop;
		this.listenTo(prop, EVENT_CHANGE, this.change);
		return prop;
	},
	/**
	 * Remove a single property from the map
	 * @param {String} name Property name
	 * @return {?module:ok.Property} Removed property or `null`
	 */
	unsetProperty: function (name) {
		var prop = this.properties[name];
		if (prop) {
			this.stopListening(prop, EVENT_CHANGE, this.change);
			delete this.properties[name];
			return prop;
		}
		return null;
	}
});

/**
 * Extended array with added convenience methods and events.
 * @class
 * @augments {Array}
 * @augments {module:ok.Base}
 */
ok.Items = ok.extendNative(Array, /** @lends module:ok.Items.prototype */{
	constructor: function Items (items) {
		if (!(this instanceof ok.Items)) {
			return ok.createWithArguments(ok.Items, arguments);
		}
		Array.call(this);
		if (items) {
			this.set(ok.toArray(items));
		}
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
	 * Remove all items from the array
	 * @return {int} New length after items have been removed (always zero)
	 * @fires remove
	 */
	empty: function () {
		this.remove();
		return this.length;
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
	 * Set the contents of this array. Empties it first.
	 * @param {Array} items New contents of array
	 * @return {int} New length after items have been added
	 * @fires remove
	 * @fires add
	 */
	set: function (items) {
		var args = slice(items);
		args.unshift(0);
		this.empty();
		this.insert.apply(this, args);
		return this.length;
	},
	/**
	 * Get the item at a given index. Can be negative. If no index is given, a
	 *   reference to the array will be returned.
	 * @param {int=} Index of item to get
	 * @return {?ok.Items|*} Item at given index or whole array
	 */
	get: function (index) {
		if (arguments.length < 1) {
			return this;
		}
		if (index < 0) {
			index = this.length + index;
		}
		if (hasProperty(this, index)) {
			return this[index];
		}
		return null;
	},
	/**
	 * Return a plain array representation of this object.
	 * @return {Array}
	 */
	toArray: function () {
		return ok.toArray(this);
	}
});

var invokeMethod = function (obj, methodName, args) {
	var result;
	args = slice(args);
	args.unshift(obj);
	result = _[methodName].apply(_, args);
	return result;
};

// these methods return a copy of input array which we then wrap
var itemsMethodsWrap = ['collect', 'compact', 'difference', 'filter', 'flatten',
	'foldl', 'foldr', 'initial', 'inject', 'intersection', 'invoke', 'map',
	'partition', 'pluck', 'reduceRight', 'reject', 'rest', 'select', 'shuffle',
	'sortBy', 'union', 'uniq', 'unique', 'where', 'without', 'zip'];

_.forEach(itemsMethodsWrap, function (methodName) {
	ok.Items.fn[methodName] = function () {
		var result = invokeMethod(this, methodName, arguments);
		result = ok.Items.create(result);
		return result;
	};
});

// these methods return a value within the array or another result not an array
var itemsMethodsNowrap = ['all', 'any', 'contains', 'countBy', 'detect', 'each',
	'every', 'find', 'findWhere', 'forEach', 'groupBy', 'include', 'indexBy',
	'indexOf', 'lastIndexOf', 'max', 'min', 'object', 'reduce', 'size', 'some',
	'sortedIndex'];

_.forEach(itemsMethodsNowrap, function (methodName) {
	ok.Items.fn[methodName] = function () {
		var result = invokeMethod(this, methodName, arguments);
		return result;
	};
});

// these are special methods whose return value depends on their inputs
var itemsMethodsSpecial = ['sample', 'first', 'last'];

_.forEach(itemsMethodsSpecial, function (methodName) {
	ok.Items.fn[methodName] = function () {
		var result = invokeMethod(this, methodName, arguments);
		if (arguments.length > 0) {
			result = ok.Items.create(result);
		}
		return result;
	};
});

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
	constructor: function Collection (items) {
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
		this.listenTo(this.items, EVENT_ADD, this.triggerAdd);
		this.listenTo(this.items, EVENT_REMOVE, this.triggerRemove);
		this.listenTo(this.items, EVENT_SORT, this.triggerSort);
		this.listenTo(this.items, EVENT_ADD, this.updateLength);
		this.listenTo(this.items, EVENT_REMOVE, this.updateLength);
		this.listenTo(this.items, EVENT_ADD, this.watchItem);
		this.listenTo(this.items, EVENT_REMOVE, this.unwatchItem);
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
		this.trigger(EVENT_ADD, item, index);
	},
	/**
	 * Handler for the internal items storage array. Called when an item is
	 *   removed.
	 * @param {*} item Newly removed item
	 * @fires remove
	 */
	triggerRemove: function (item) {
		this.trigger(EVENT_REMOVE, item);
	},
	/**
	 * Handler for the internal items storage array. Called when the array is
	 *   sorted.
	 * @param {Array.<*>} items Items array after it has been sorted
	 * @fires sort
	 */
	triggerSort: function (items) {
		this.trigger(EVENT_SORT, items);
	},
	/**
	 * Handler for the internal items storage array. Called when the array is
	 *   changed.
	 * @param {Array.<*>} items Items array after it has been sorted
	 * @fires change
	 */
	triggerChange: function (item, newValue, oldValue) {
		this.trigger(EVENT_CHANGE, item, newValue, oldValue);
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
	add: function () {
		var items = _.flatten(arguments);
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
		this.listenTo(item, EVENT_CHANGE, this.triggerChange);
	},
	/**
	 * Stop watching an item for changes
	 * @param {*} item Item in `items` array
	 */
	unwatchItem: function (item) {
		this.stopListening(item, EVENT_CHANGE, this.triggerChange);
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
		this.items.forEach(function (comparedTo, newIndex) {
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
	getConstructor: function (/*value*/) {
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
	 * @fires remove
	 */
	empty: function () {
		return this.items.empty();
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
		var result = this.items.invoke('get');
		return result;
	},
	/**
	 * Determine if an item already exists in this collection
	 * @param {*} item Item to find
	 * @return {?*} Item, or `null` if not found
	 */
	identify: function (item) {
		var contained = this.items.contains(item);
		return contained ? item : null;
	},
	/**
	 * Used to compare two items when sorting.
	 * @param {*} a Left item for comparison
	 * @param {*} b Right item for comparison
	 * @return {int} A negative value means `a` is smaller than `b`. A positive
	 *   value means `a` is larger than `b`. A zero value means `a` and `b` are
	 *   equal.
	 */
	comparator: function (/*a, b*/) {
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

_.forEach(itemsMethodsWrap, function (methodName) {
	ok.Collection.fn[methodName] = function () {
		var result;
		var args = slice(arguments);
		args.unshift(this.items);
		result = _[methodName].apply(_, args);
		result = ok.Items.create(result);
		return result;
	};
});

_.forEach(itemsMethodsNowrap, function (methodName) {
	ok.Collection.fn[methodName] = function () {
		var result;
		var args = slice(arguments);
		args.unshift(this.items);
		result = _[methodName].apply(_, args);
		return result;
	};
});

_.forEach(itemsMethodsSpecial, function (methodName) {
	ok.Collection.fn[methodName] = function () {
		var result;
		var args = slice(arguments);
		var len = args.length;
		args.unshift(this.items);
		result = _[methodName].apply(_, args);
		if (len > 0) {
			result = ok.Items.create(result);
		}
		return result;
	};
});

/**
 * Controllers are the 'glue' that sits between models/collections and views.
 * @class
 * @augments {module:ok.Base}
 */
ok.Controller = ok.Base.extend(/** @lends module:ok.Controller.prototype */{
	// rename constructor
	constructor: function Controller () {
		return ok.Base.apply(this, arguments);
	}
});

/**
 * Extended error constructor. Can extended to create custom error classes.
 * @class
 * @augments {Error}
 * @augments {module:ok.Base}
 * @param {Object} options Instance members
 * @param {String=} options.name Error name
 * @param {String=} options.message Description of error
 * @param {String=} options.url Optional URL to display with the error
 */
ok.Error = ok.extendNative(Error, /** @lends module:ok.Error.prototype */{
	constructor: function Error (message, options) {
		if (typeof message === 'string') {
			this.message = message;
		}
		else {
			options = message;
		}
		this.include(options);
	},
	/**
	 * Error variant. Used to classify errors.
	 * @property {String}
	 */
	name: 'ok.Error',
	/**
	 * Display the contents of this error. Always shows the name. If the message
	 *   exists it is also displayed. A URL to, for example, help documentation
	 *   can be displayed as well.
	 * @return {String} Contents of this error
	 */
	toString: function () {
		var message = this.message;
		var name = this.name;
		var url = this.url;
		var result = name;
		if (message) {
			result +=  ': ' + message;
		}
		if (url) {
			result += ' (' + url + ')';
		}
		return result;
	}
});

return ok;

}, this);