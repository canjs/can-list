var List = require('can-list');
var QUnit = require('steal-qunit');
var Observation = require('can-observation');
var Map = require('can-map');
var canReflect = require('can-reflect');
var canSymbol = require('can-symbol');

QUnit.module('can-list');

test('list attr changes length', function () {
	var l = new List([
		0,
		1,
		2
	]);
	l.attr(3, 3);
	equal(l.length, 4);
});
test('removeAttr on list', function() {
	var l = new List([0, 1, 2]);
	l.removeAttr(1);
	equal(l.attr('length'), 2);
	deepEqual(l.attr(), [0, 2]);
});
test('list splice', function () {
	var l = new List([
		0,
		1,
		2,
		3
	]),
		first = true;
	l.bind('change', function (ev, attr, how, newVals, oldVals) {
		equal(attr, '1');
		if (first) {
			equal(how, 'remove', 'removing items');
			equal(newVals, undefined, 'no new Vals');
		} else {
			deepEqual(newVals, [
				'a',
				'b'
			], 'got the right newVals');
			equal(how, 'add', 'adding items');
		}
		first = false;
	});
	l.splice(1, 2, 'a', 'b');
	deepEqual(l.serialize(), [
		0,
		'a',
		'b',
		3
	], 'serialized');
});
test('list pop', function () {
	var l = new List([
		0,
		1,
		2,
		3
	]);
	l.bind('change', function (ev, attr, how, newVals, oldVals) {
		equal(attr, '3');
		equal(how, 'remove');
		equal(newVals, undefined);
		deepEqual(oldVals, [3]);
	});
	l.pop();
	deepEqual(l.serialize(), [
		0,
		1,
		2
	]);
});
test('remove nested property in item of array map', function () {
	var state = new List([{
		nested: true
	}]);
	state.bind('change', function (ev, attr, how, newVal, old) {
		equal(attr, '0.nested');
		equal(how, 'remove');
		deepEqual(old, true);
	});
	state.removeAttr('0.nested');
	equal(undefined, state.attr('0.nested'));
});
test('pop unbinds', function () {
	var l = new List([{
		foo: 'bar'
	}]);
	var o = l.attr(0),
		count = 0;
	l.bind('change', function (ev, attr, how, newVal, oldVal) {
		count++;
		if (count === 1) {
			equal(attr, '0.foo', 'count is set');
		} else if (count === 2) {
			equal(how, 'remove');
			equal(attr, '0');
		} else {
			ok(false, 'called too many times');
		}
	});

	equal(o.attr('foo'), 'bar', "read foo property");
	o.attr('foo', 'car');
	l.pop();
	o.attr('foo', 'bad');
});
test('splice unbinds', function () {
	var l = new List([{
		foo: 'bar'
	}]);
	var o = l.attr(0),
		count = 0;
	l.bind('change', function (ev, attr, how, newVal, oldVal) {
		count++;
		if (count === 1) {
			equal(attr, '0.foo', 'count is set');
		} else if (count === 2) {
			equal(how, 'remove');
			equal(attr, '0');
		} else {
			ok(false, 'called too many times');
		}
	});
	equal(o.attr('foo'), 'bar');
	o.attr('foo', 'car');
	l.splice(0, 1);
	o.attr('foo', 'bad');
});
test('always gets right attr even after moving array items', function () {
	var l = new List([{
		foo: 'bar'
	}]);
	var o = l.attr(0);
	l.unshift('A new Value');
	l.bind('change', function (ev, attr, how) {
		equal(attr, '1.foo');
	});
	o.attr('foo', 'led you');
});

test('Array accessor methods', 11, function () {
	var l = new List([
		'a',
		'b',
		'c'
	]),
		sliced = l.slice(2),
		joined = l.join(' | '),
		concatenated = l.concat([
			2,
			1
		], new List([0]));
	ok(sliced instanceof List, 'Slice is an Observable list');
	equal(sliced.length, 1, 'Sliced off two elements');
	equal(sliced[0], 'c', 'Single element as expected');
	equal(joined, 'a | b | c', 'Joined list properly');
	ok(concatenated instanceof List, 'Concatenated is an Observable list');
	deepEqual(concatenated.serialize(), [
		'a',
		'b',
		'c',
		2,
		1,
		0
	], 'List concatenated properly');
	l.forEach(function (letter, index) {
		ok(true, 'Iteration');
		if (index === 0) {
			equal(letter, 'a', 'First letter right');
		}
		if (index === 2) {
			equal(letter, 'c', 'Last letter right');
		}
	});
});

test('Concatenated list items Equal original', function() {
	var l = new List([
		{ firstProp: "Some data" },
		{ secondProp: "Next data" }
	]),
	concatenated = l.concat([
		{ hello: "World" },
		{ foo: "Bar" }
	]);

	ok(l[0] === concatenated[0], "They are Equal");
	ok(l[1] === concatenated[1], "They are Equal");

});

test('Lists with maps concatenate properly', function() {
	var Person = Map.extend();
	var People = List.extend({
		Map: Person
	},{});
	var Genius = Person.extend();
	var Animal = Map.extend();

	var me = new Person({ name: "John" });
	var animal = new Animal({ name: "Tak" });
	var genius = new Genius({ name: "Einstein" });
	var hero = { name: "Ghandi" };

	var people = new People([]);
	var specialPeople = new People([
		genius,
		hero
	]);

	people = people.concat([me, animal, specialPeople], specialPeople, [1, 2], 3);

	ok(people.attr('length') === 8, "List length is right");
	ok(people[0] === me, "Map in list === vars created before concat");
	ok(people[1] instanceof Person, "Animal got serialized to Person");
});

test('splice removes items in IE (#562)', function () {
	var l = new List(['a']);
	l.splice(0, 1);
	ok(!l.attr(0), 'all props are removed');
});

test('reverse triggers add/remove events (#851)', function() {
	expect(6);
	var l = new List([1,2,3]);

	l.bind('change', function() {
		ok(true, 'change should be called');
	});
	l.bind('set', function() { ok(false, 'set should not be called'); });
	l.bind('add', function() { ok(true, 'add called'); });
	l.bind('remove', function() { ok(true, 'remove called'); });
	l.bind('length', function() { ok(true, 'length should be called'); });

	l.reverse();
});

test('filter', function(){
	var l = new List([{id: 1, name: "John"}, {id: 2, name: "Mary"}]);

	var filtered = l.filter(function(item){
		return item.name === "Mary";
	});

	notEqual(filtered._cid, l._cid, "not same object");
	equal(filtered.length, 1, "one item");
	equal(filtered[0].name, "Mary", "filter works");
});


test('removing expandos on lists', function(){
	var list = new List(["a","b"]);

	list.removeAttr("foo");

	equal(list.length, 2);
});

test('No Add Events if List Splice adds the same items that it is removing. (#1277, #1399)', function() {
	var list = new List(["a","b"]);

	list.bind('add', function() {
		ok(false, 'Add callback should not be called.');
	});

	list.bind('remove', function() {
		ok(false, 'Remove callback should not be called.');
	});

  var result = list.splice(0, 2, "a", "b");

  deepEqual(result, ["a", "b"]);
});

test("add event always returns an array as the value (#998)", function() {
	var list = new List([]),
		msg;
	list.bind("add", function(ev, newElements, index) {
		deepEqual(newElements, [4], msg);
	});
	msg = "works on push";
	list.push(4);
	list.pop();
	msg = "works on attr()";
	list.attr(0, 4);
	list.pop();
	msg = "works on replace()";
	list.replace([4]);
});

test("Setting with .attr() out of bounds of length triggers add event with leading undefineds", function() {
	var list = new List([1]);
	list.bind("add", function(ev, newElements, index) {
		deepEqual(newElements, [undefined, undefined, 4],
				  "Leading undefineds are included");
		equal(index, 1, "Index takes into account the leading undefineds from a .attr()");
	});
	list.attr(3, 4);
});

test("No events should fire if removals happened on empty arrays", function() {
	var list = new List([]),
		msg;
	list.bind("remove", function(ev, removed, index) {
		ok(false, msg);
	});
	msg = "works on pop";
	list.pop();
	msg = "works on shift";
	list.shift();
	ok(true, "No events were fired.");
});

test('setting an index out of bounds does not create an array', function() {
	expect(1);
	var l = new List();

	l.attr('1', 'foo');
	equal(l.attr('1'), 'foo');
});

test('splice with similar but less items works (#1606)', function() {
	var list = new List([ 'aa', 'bb', 'cc']);

	list.splice(0, list.length, 'aa', 'cc', 'dd');
	deepEqual(list.attr(), ['aa', 'cc', 'dd']);

	list.splice(0, list.length, 'aa', 'cc');
	deepEqual(list.attr(), ['aa', 'cc']);
});

test('filter returns same list type (#1744)', function() {
	var ParentList = List.extend();
	var ChildList = ParentList.extend();

	var children = new ChildList([1,2,3]);

	ok(children.filter(function() {}) instanceof ChildList);
});

test('reverse returns the same list instance (#1744)', function() {
	var ParentList = List.extend();
	var ChildList = ParentList.extend();

	var children = new ChildList([1,2,3]);
	ok(children.reverse() === children);
});


test("slice and join are observable by a compute (#1884)", function(){
	expect(2);

	var list = new List([1,2,3]);

	var sliced = new Observation(function(){
		return list.slice(0,1);
	});
	canReflect.onValue(sliced, function(newVal){
		deepEqual(newVal.attr(), [2], "got a new List");
	});

	var joined = new Observation(function(){
		return list.join(",");
	});
	canReflect.onValue(joined, function(newVal){
		equal(newVal, "2,3", "joined is observable");
	});


	list.shift();


});


test("list is always updated with the last promise passed to replace (#2136)", function(){

	var list = new List();

	stop();

	list.replace( new Promise( function( resolve ) {
		setTimeout( function(){
			resolve([ "A" ]);

			setTimeout(function(){
				equal(list.attr(0), "B", "list set to last promise's value");
				start();
			},10);

		}, 20 );
	}));

	list.replace( new Promise( function( resolve ) {
		setTimeout( function(){
			resolve([ "B" ]);
		}, 10 );
	}));
});

test('forEach callback', function () {
	var list = new List([]),
		counter = 0;
	list.attr(9, 'foo');

	list.forEach(function (element, index, list) {
		counter++;
	});
	equal(counter, 1, 'Should not be invoked for uninitialized attr keys');
});

test('each callback', function () {
	var list = new List([]),
		counter = 0;
	list.attr(9, 'foo');

	list.each(function (item, index) {
		counter++;
	});
	equal(counter, 1, 'Should not be invoked for uninitialized attr keys');
});

test('filter with context', function(){
	var l = new List([{id: 1}]);
	var context = {};
	var contextWasCorrect = false;

	l.filter(function(){
		contextWasCorrect = (this === context);
		return true;
	}, context);

	equal(contextWasCorrect, true, "context was correctly passed");
});

test('map with context', function(){
	var l = new List([{id: 1}]);
	var context = {};
	var contextWasCorrect = false;

	l.map(function(){
		contextWasCorrect = (this === context);
		return true;
	}, context);

	equal(contextWasCorrect, true, "context was correctly passed");
});

test("works with can-reflect", 11, function(){
	var a = new Map({ foo: 4 });
	var b = new List([ "foo", "bar" ]);

	QUnit.equal( canReflect.getKeyValue(b, "0"), "foo", "unbound value");

	var handler = function(newValue){
		QUnit.equal(newValue, "quux", "observed new value");
	};
	QUnit.ok(!canReflect.isValueLike(b), "isValueLike is false");
	QUnit.ok(canReflect.isMapLike(b), "isMapLike is true");
	QUnit.ok(canReflect.isListLike(b), "isListLike is false");

	QUnit.ok( !canReflect.keyHasDependencies(b, "length"), "keyHasDependencies -- false");

	b._computedAttrs["length"] = {  // jshint ignore:line
		compute: new Observation(function() {
			return a.attr("foo");
		}, null)
	};
	b._computedAttrs["length"].compute.start();  // jshint ignore:line
	QUnit.ok( canReflect.keyHasDependencies(b, "length"), "keyHasDependencies -- true");

	canReflect.onKeysAdded(b, handler);
	canReflect.onKeysRemoved(b, handler);
	var handlers = b[canSymbol.for("can.meta")].handlers;


	QUnit.ok(handlers.get(["add"]).length, "add handler added");
	QUnit.ok(handlers.get(["remove"]).length, "remove handler added");

	b.push("quux");

	QUnit.equal( canReflect.getKeyValue(b, "length"), "4", "bound value");
	// sanity checks to ensure that handler doesn't get called again.
	b.pop();

});

QUnit.test("can-reflect setKeyValue", function(){
	var a = new Map({ "a": "b" });

	canReflect.setKeyValue(a, "a", "c");
	QUnit.equal(a.attr("a"), "c", "setKeyValue");
});

QUnit.test("can-reflect getKeyDependencies", function() {
	var a = new Map({ foo: 4 });
	var b = new List([ "foo", "bar" ]);


	ok(!canReflect.getKeyDependencies(b, "length"), "No dependencies before binding");

	b._computedAttrs.length = {
		compute: new Observation(function() {
			return a.attr("foo");
		}, null)
	};
	b._computedAttrs.length.compute.start();

	ok(canReflect.getKeyDependencies(b, "length"), "dependencies exist");
	ok(canReflect.getKeyDependencies(b, "length").valueDependencies.has(b._computedAttrs.length.compute), "dependencies returned");

});

QUnit.test("registered symbols", function() {
	var a = new Map({ "a": "a" });

	ok(a[canSymbol.for("can.isMapLike")], "can.isMapLike");
	equal(a[canSymbol.for("can.getKeyValue")]("a"), "a", "can.getKeyValue");
	a[canSymbol.for("can.setKeyValue")]("a", "b");
	equal(a.attr("a"), "b", "can.setKeyValue");

	function handler(val) {
		equal(val, "c", "can.onKeyValue");
	}

	a[canSymbol.for("can.onKeyValue")]("a", handler);
	a.attr("a", "c");

	a[canSymbol.for("can.offKeyValue")]("a", handler);
	a.attr("a", "d"); // doesn't trigger handler
});

QUnit.test("onPatches", function () {
	var list = new List([ "a", "b" ]);
	var PATCHES = [
		[ { deleteCount: 2, index: 0, type: "splice" } ],
		[ { index: 0, insert: ["A", "B"], deleteCount: 0, type: "splice" } ]
	];

	var handlerCalls = 0;
	var handler = function (patches) {
		QUnit.deepEqual(patches, PATCHES[handlerCalls], "patches looked right for " + handlerCalls);
		handlerCalls++;
	};

	list[canSymbol.for("can.onPatches")](handler, "notify");

	list.replace(["A", "B"]);

	list[canSymbol.for("can.offPatches")](handler, "notify");

	list.replace(["1", "2"]);
});


QUnit.test("can.onInstancePatches basics", function(){
    var People = List.extend({});

    var calls = [];
    function handler(obj, patches) {
        calls.push([obj, patches]);
    }

    People[canSymbol.for("can.onInstancePatches")](handler);

    var list = new People([1,2]);
    list.push(3);
    list.attr("count", 8);
    People[canSymbol.for("can.offInstancePatches")](handler);
    list.push(4);
    list.attr("count", 7);

    QUnit.deepEqual(calls,[
        [list,  [{type: "splice", index: 2, deleteCount: 0, insert: [3]} ] ],
        [list, [{type: "set",    key: "count", value: 8} ] ]
    ]);
});

QUnit.test("can.onInstanceBoundChange basics", function(){

    var People = List.extend({});

    var calls = [];
    function handler(obj, patches) {
        calls.push([obj, patches]);
    }

    People[canSymbol.for("can.onInstanceBoundChange")](handler);

    var people = new People([]);
    var bindHandler = function(){};
    canReflect.onKeyValue(people,"length", bindHandler);
	canReflect.offKeyValue(people,"length", bindHandler);

    People[canSymbol.for("can.offInstanceBoundChange")](handler);
	canReflect.onKeyValue(people,"length", bindHandler);
	canReflect.offKeyValue(people,"length", bindHandler);

    QUnit.deepEqual(calls,[
        [people,  true ],
        [people, false ]
    ]);
});
