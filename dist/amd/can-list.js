/*can-list@3.0.0-pre.6#can-list*/
define(function (require, exports, module) {
    require('can-event');
    var namespace = require('can-util/namespace');
    var Map = require('can-map');
    var bubble = require('can-map/bubble');
    var mapHelpers = require('can-map/map-helpers');
    var canBatch = require('can-event/batch');
    var Observation = require('can-observation');
    var CID = require('can-util/js/cid');
    var isPromise = require('can-util/js/is-promise');
    var makeArray = require('can-util/js/make-array');
    var assign = require('can-util/js/assign');
    var types = require('can-util/js/types');
    var each = require('can-util/js/each');
    var types = require('can-util/js/types');
    var splice = [].splice, spliceRemovesProps = function () {
            var obj = {
                0: 'a',
                length: 1
            };
            splice.call(obj, 0, 1);
            return !obj[0];
        }();
    var List = Map.extend({ Map: Map }, {
            setup: function (instances, options) {
                this.length = 0;
                CID(this, '.map');
                this._setupComputedProperties();
                instances = instances || [];
                var teardownMapping;
                if (isPromise(instances)) {
                    this.replace(instances);
                } else {
                    teardownMapping = instances.length && mapHelpers.addToMap(instances, this);
                    this.push.apply(this, makeArray(instances || []));
                }
                if (teardownMapping) {
                    teardownMapping();
                }
                assign(this, options);
            },
            _triggerChange: function (attr, how, newVal, oldVal) {
                Map.prototype._triggerChange.apply(this, arguments);
                var index = +attr;
                if (!~('' + attr).indexOf('.') && !isNaN(index)) {
                    if (how === 'add') {
                        canBatch.trigger.call(this, how, [
                            newVal,
                            index
                        ]);
                        canBatch.trigger.call(this, 'length', [this.length]);
                    } else if (how === 'remove') {
                        canBatch.trigger.call(this, how, [
                            oldVal,
                            index
                        ]);
                        canBatch.trigger.call(this, 'length', [this.length]);
                    } else {
                        canBatch.trigger.call(this, how, [
                            newVal,
                            index
                        ]);
                    }
                }
            },
            ___get: function (attr) {
                if (attr) {
                    var computedAttr = this._computedAttrs[attr];
                    if (computedAttr && computedAttr.compute) {
                        return computedAttr.compute();
                    }
                    if (this[attr] && this[attr].isComputed && typeof this.constructor.prototype[attr] === 'function') {
                        return this[attr]();
                    } else {
                        return this[attr];
                    }
                } else {
                    return this;
                }
            },
            __set: function (prop, value, current) {
                prop = isNaN(+prop) || prop % 1 ? prop : +prop;
                if (typeof prop === 'number' && prop > this.length - 1) {
                    var newArr = new Array(prop + 1 - this.length);
                    newArr[newArr.length - 1] = value;
                    this.push.apply(this, newArr);
                    return newArr;
                }
                return Map.prototype.__set.call(this, '' + prop, value, current);
            },
            ___set: function (attr, val) {
                this[attr] = val;
                if (+attr >= this.length) {
                    this.length = +attr + 1;
                }
            },
            __remove: function (prop, current) {
                if (isNaN(+prop)) {
                    delete this[prop];
                    this._triggerChange(prop, 'remove', undefined, current);
                } else {
                    this.splice(prop, 1);
                }
            },
            _each: function (callback) {
                var data = this.___get();
                for (var i = 0; i < data.length; i++) {
                    callback(data[i], i);
                }
            },
            serialize: function () {
                return mapHelpers.serialize(this, 'serialize', []);
            },
            splice: function (index, howMany) {
                var args = makeArray(arguments), added = [], i, len, listIndex, allSame = args.length > 2;
                index = index || 0;
                for (i = 0, len = args.length - 2; i < len; i++) {
                    listIndex = i + 2;
                    args[listIndex] = this.__type(args[listIndex], listIndex);
                    added.push(args[listIndex]);
                    if (this[i + index] !== args[listIndex]) {
                        allSame = false;
                    }
                }
                if (allSame && this.length <= added.length) {
                    return added;
                }
                if (howMany === undefined) {
                    howMany = args[1] = this.length - index;
                }
                var removed = splice.apply(this, args);
                if (!spliceRemovesProps) {
                    for (i = this.length; i < removed.length + this.length; i++) {
                        delete this[i];
                    }
                }
                canBatch.start();
                if (howMany > 0) {
                    bubble.removeMany(this, removed);
                    this._triggerChange('' + index, 'remove', undefined, removed);
                }
                if (args.length > 2) {
                    bubble.addMany(this, added);
                    this._triggerChange('' + index, 'add', added, removed);
                }
                canBatch.stop();
                return removed;
            },
            _getAttrs: function () {
                return mapHelpers.serialize(this, 'attr', []);
            },
            _setAttrs: function (items, remove) {
                items = makeArray(items);
                canBatch.start();
                this._updateAttrs(items, remove);
                canBatch.stop();
            },
            _updateAttrs: function (items, remove) {
                var len = Math.min(items.length, this.length);
                for (var prop = 0; prop < len; prop++) {
                    var curVal = this[prop], newVal = items[prop];
                    if (types.isMapLike(curVal) && mapHelpers.canMakeObserve(newVal)) {
                        curVal.attr(newVal, remove);
                    } else if (curVal !== newVal) {
                        this._set(prop + '', newVal);
                    } else {
                    }
                }
                if (items.length > this.length) {
                    this.push.apply(this, items.slice(this.length));
                } else if (items.length < this.length && remove) {
                    this.splice(items.length);
                }
            }
        }), getArgs = function (args) {
            return args[0] && Array.isArray(args[0]) ? args[0] : makeArray(args);
        };
    each({
        push: 'length',
        unshift: 0
    }, function (where, name) {
        var orig = [][name];
        List.prototype[name] = function () {
            var args = [], len = where ? this.length : 0, i = arguments.length, res, val;
            while (i--) {
                val = arguments[i];
                args[i] = bubble.set(this, i, this.__type(val, i));
            }
            res = orig.apply(this, args);
            if (!this.comparator || args.length) {
                this._triggerChange('' + len, 'add', args, undefined);
            }
            return res;
        };
    });
    each({
        pop: 'length',
        shift: 0
    }, function (where, name) {
        List.prototype[name] = function () {
            if (!this.length) {
                return undefined;
            }
            var args = getArgs(arguments), len = where && this.length ? this.length - 1 : 0;
            var res = [][name].apply(this, args);
            this._triggerChange('' + len, 'remove', undefined, [res]);
            if (res && res.removeEventListener) {
                bubble.remove(this, res);
            }
            return res;
        };
    });
    assign(List.prototype, {
        indexOf: function (item, fromIndex) {
            Observation.add(this, 'length');
            for (var i = fromIndex || 0, len = this.length; i < len; i++) {
                if (this.attr(i) === item) {
                    return i;
                }
            }
            return -1;
        },
        join: function () {
            Observation.add(this, 'length');
            return [].join.apply(this, arguments);
        },
        reverse: function () {
            var list = [].reverse.call(makeArray(this));
            return this.replace(list);
        },
        slice: function () {
            Observation.add(this, 'length');
            var temp = Array.prototype.slice.apply(this, arguments);
            return new this.constructor(temp);
        },
        concat: function () {
            var args = [];
            each(makeArray(arguments), function (arg, i) {
                args[i] = arg instanceof List ? arg.serialize() : arg;
            });
            return new this.constructor(Array.prototype.concat.apply(this.serialize(), args));
        },
        forEach: function (cb, thisarg) {
            var item;
            for (var i = 0, len = this.attr('length'); i < len; i++) {
                item = this.attr(i);
                if (cb.call(thisarg || item, item, i, this) === false) {
                    break;
                }
            }
            return this;
        },
        replace: function (newList) {
            if (isPromise(newList)) {
                if (this._promise) {
                    this._promise.__isCurrentPromise = false;
                }
                var promise = this._promise = newList;
                promise.__isCurrentPromise = true;
                var self = this;
                newList.then(function (newList) {
                    if (promise.__isCurrentPromise) {
                        self.replace(newList);
                    }
                });
            } else {
                this.splice.apply(this, [
                    0,
                    this.length
                ].concat(makeArray(newList || [])));
            }
            return this;
        },
        filter: function (callback, thisArg) {
            var filteredList = new this.constructor(), self = this, filtered;
            this.each(function (item, index, list) {
                filtered = callback.call(thisArg | self, item, index, self);
                if (filtered) {
                    filteredList.push(item);
                }
            });
            return filteredList;
        },
        map: function (callback, thisArg) {
            var filteredList = new List(), self = this;
            this.each(function (item, index, list) {
                var mapped = callback.call(thisArg | self, item, index, self);
                filteredList.push(mapped);
            });
            return filteredList;
        }
    });
    var oldIsListLike = types.isListLike;
    types.isListLike = function (obj) {
        return obj instanceof List || oldIsListLike.apply(this, arguments);
    };
    var oldType = Map.prototype.__type;
    Map.prototype.__type = function (value, prop) {
        if (typeof value === 'object' && Array.isArray(value)) {
            var cached = mapHelpers.getMapFromObject(value);
            if (cached) {
                return cached;
            }
            return new List(value);
        }
        return oldType.apply(this, arguments);
    };
    var oldSetup = Map.setup;
    Map.setup = function () {
        oldSetup.apply(this, arguments);
        if (!(this.prototype instanceof List)) {
            this.List = Map.List.extend({ Map: this }, {});
        }
    };
    if (!types.DefaultList) {
        types.DefaultList = List;
    }
    List.prototype.each = List.prototype.forEach;
    Map.List = List;
    module.exports = namespace.List = List;
});