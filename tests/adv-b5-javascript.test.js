// 高度モード ブロックB5（JavaScript エンジン班）のテスト。
// 対象：js/types/javascript/advanced-calls.js と index.js への統合
// （call スイッチ／メンバ呼び出しディスパッチ／プロパティ読み取り）。
// 期待値は Node v24 実走（ECMA-262）で確認した。ECMA-262 2027草案のみ
// の機能（Math.sumPrecise、Map.prototype.getOrInsert 等）は仕様本文を
// 正本とし、sumPrecise は Python math.fsum とも機械突合した。
// モデル境界：関数値は存在しないためコールバック必須の呼び出しは
// 名指し停止、非同期・GC・動的コード生成・Proxy も名指し停止とする。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (code) => {
  const d = getDefinition("javascript");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message);
const categories = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.category);
const outputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);
const vars = (r) => r.paths?.[0]?.vars || {};
const ok = async (code, expectedOutputs) => {
  const r = await run(code);
  assert.deepEqual(errors(r), [], code);
  if (expectedOutputs) assert.deepEqual(outputs(r), expectedOutputs, code);
  return r;
};
const fails = async (code, pattern, category) => {
  const r = await run(code);
  assert.ok(errors(r).length > 0, code);
  if (pattern) assert.match(errors(r)[0], pattern, code);
  if (category) assert.equal(categories(r)[0], category, code);
  return r;
};

/* ---------------- 優先度1：Math の全関数・定数 ---------------- */
test("B5-JS Math: host-delegated functions match Node", async () => {
  await ok(
    "console.log(Math.max(1, 2, 3), Math.min(4, 2, 8), Math.pow(2, 10), Math.sqrt(16), Math.cbrt(27));",
    ["3 2 1024 4 3"],
  );
  await ok(
    "console.log(Math.max(), Math.min(), Math.hypot(), Math.hypot(3, 4));",
    ["-Infinity Infinity 0 5"],
  );
  await ok(
    "console.log(Math.ceil(-1.5), Math.trunc(-1.5), Math.sign(-5), Math.sign(0), Math.imul(-1, 5), Math.clz32(1));",
    ["-1 -1 -1 0 -5 31"],
  );
  await ok(
    "console.log(Math.max('5', 3), Math.abs('-2'), Math.floor(null));",
    ["5 2 0"],
  );
  await ok(
    "console.log(Math.log(Math.E), Math.log2(8), Math.log10(100), Math.exp(0), Math.expm1(0), Math.log1p(0));",
    ["1 3 2 1 0 0"],
  );
  await ok(
    "console.log(Math.sin(0), Math.cos(0), Math.tan(0), Math.asin(0), Math.acos(1), Math.atan(0), Math.atan2(1, 1) === Math.PI / 4);",
    ["0 1 0 0 0 0 true"],
  );
  await ok(
    "console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0), Math.asinh(0), Math.acosh(1), Math.atanh(0));",
    ["0 1 0 0 0 0"],
  );
  await ok(
    "console.log(Math.fround(1.337), Math.round(2.5), Math.floor(-0.5));",
    ["1.3370000123977661 3 -1"],
  );
  // Math.f16round はホスト委譲のため、ホスト（V8）の版数で有無が変わる
  // （Node 22 の V8 には無い）。有る環境では計算結果を、無い環境では
  // アプリの正直な名指し停止を、それぞれアサートする（修正バッチ21／RG-684）。
  if (typeof Math.f16round === "function") {
    await ok("console.log(Math.f16round(1.5));", ["1.5"]);
  } else {
    await fails("console.log(Math.f16round(1.5));", /^Math\.f16round は未対応です：ホストに実装がありません/, "未対応");
  }
});
test("B5-JS Math: constants via property reads", async () => {
  await ok(
    "console.log(Math.PI, Math.E, Math.SQRT2, Math.SQRT1_2, Math.LN2, Math.LN10, Math.LOG2E, Math.LOG10E);",
    ["3.141592653589793 2.718281828459045 1.4142135623730951 0.7071067811865476 0.6931471805599453 2.302585092994046 1.4426950408889634 0.4342944819032518"],
  );
});
test("B5-JS Math: conversion errors and unknown propagation", async () => {
  await fails("console.log(Math.abs(10n));", /BigIntを通常の数値として使うことはできません/, "TypeError");
  await fails("console.log(Math.max(10n));", /BigIntを数値へ変換できません/, "TypeError");
  await fails("console.log(Math.max(Symbol('x')));", /Symbolを数値へ変換できません/, "TypeError");
  // 未確定値は固定値にせず伝播させる
  const r = await run('let x = prompt("n"); let y = Math.max(x, 1);');
  assert.deepEqual(errors(r), []);
  assert.equal(vars(r).y.kind, "unknown");
  const r2 = await run('let x = prompt("n"); let y = Math.floor(x);');
  assert.equal(vars(r2).y.kind, "unknown");
});
test("B5-JS Math.random and sumPrecise", async () => {
  // 乱数は捏造せず未確定値として扱う
  const r = await run("let y = Math.random();");
  assert.deepEqual(errors(r), []);
  assert.equal(vars(r).y.kind, "unknown");
  assert.equal(vars(r).y.valueType, "number");
  // sumPrecise は仕様本文（2027草案）が正本。fsum と一致する厳密和。
  await ok("console.log(Math.sumPrecise([0.1, 0.2]));", ["0.30000000000000004"]);
  await ok("console.log(Math.sumPrecise([1e16, 1, -1e16]));", ["1"]);
  await ok("console.log(Math.sumPrecise([1e308, 1e308]));", ["Infinity"]);
  await ok("console.log(Math.sumPrecise([0.1, 0.2, 0.3]));", ["0.6"]);
  await ok("console.log(Object.is(Math.sumPrecise([]), -0), Object.is(Math.sumPrecise([-0]), -0), Object.is(Math.sumPrecise([0]), -0));", ["true true false"]);
  await ok("console.log(Math.sumPrecise([5e-324, 5e-324]));", ["1e-323"]);
  await fails("console.log(Math.sumPrecise(['1']));", /要素は数値でなければなりません/, "TypeError");
  await fails("console.log(Math.sumPrecise(5));", /反復可能な値/, "TypeError");
  await ok("console.log(Math.sumPrecise(Set([1, 2, 3])));", ["6"]);
});

/* ---------------- 優先度2：グローバル関数と変換 ---------------- */
test("B5-JS globals: parseFloat / isNaN / isFinite / URI codecs", async () => {
  await ok(
    "console.log(parseFloat('  -12.5e2xyz'), parseFloat('px'), parseFloat('0x10'), parseFloat('Infinity'));",
    ["-1250 NaN 0 Infinity"],
  );
  await ok(
    "console.log(isNaN(''), isNaN('x'), isNaN({}), isNaN(undefined), isFinite(null), isFinite('12'), isFinite(1 / 0));",
    ["false true true true true true false"],
  );
  await ok(
    "console.log(encodeURI('https://example.com/?a=b c'), encodeURIComponent('a b&c'), decodeURI('%E3%81%82'), decodeURIComponent('a%20b'));",
    ["https://example.com/?a=b%20c a%20b%26c あ a b"],
  );
  await fails("console.log(decodeURIComponent('%'));", /URI malformed/, "URIError");
  await fails("console.log(isNaN(Symbol('x')));", /Symbolを数値へ変換できません/, "TypeError");
  const r = await run('let x = prompt("n"); let y = parseFloat(x);');
  assert.equal(vars(r).y.kind, "unknown");
});
test("B5-JS Number statics and constants", async () => {
  await ok(
    "console.log(Number.isInteger(3), Number.isInteger(3.5), Number.isInteger('3'), Number.isNaN(NaN), Number.isNaN('NaN'), Number.isFinite(1 / 0), Number.isFinite(5));",
    ["true false false true false false true"],
  );
  await ok(
    "console.log(Number.isSafeInteger(9007199254740991), Number.isSafeInteger(9007199254740992), Number.MAX_VALUE > 1e308, Number.MIN_VALUE > 0, Number.EPSILON);",
    ["true false true true 2.220446049250313e-16"],
  );
  await ok(
    "console.log(Number.parseFloat('2.5px'), Number.parseInt('0x10'), Number.parseInt('10', 2), Number.NaN !== Number.NaN, Number.POSITIVE_INFINITY);",
    ["2.5 16 2 true Infinity"],
  );
});
test("B5-JS String statics", async () => {
  await ok(
    "console.log(String.fromCharCode(65, 66), String.fromCodePoint(0x1F600).length, String.fromCodePoint(65));",
    ["AB 2 A"],
  );
  await fails("console.log(String.fromCodePoint(0x110000));", /Invalid code point/, "RangeError");
  await ok(
    "console.log(String.raw({raw: ['a', 'b', 'c']}, 1, 2));",
    ["a1b2c"],
  );
});
test("B5-JS Object statics: keys/values/entries/fromEntries/assign", async () => {
  await ok(
    "console.log(Object.keys({b: 1, a: 2}), Object.values({a: 5}), Object.entries({a: 5}));",
    ['[\n  "b",\n  "a"\n] [\n  5\n] [\n  [\n    "a",\n    5\n  ]\n]'],
  );
  await ok("console.log(Object.keys('ab'), Object.keys([10, 20]), Object.keys(5));",
    ['[\n  "0",\n  "1"\n] [\n  "0",\n  "1"\n] []']);
  await fails("console.log(Object.keys(null));", /変換できません/, "TypeError");
  const r = await ok("let o = Object.fromEntries([['a', 1], ['b', 2]]); console.log(o.a + o.b);", ["3"]);
  void r;
  await ok("let o = Object.assign({}, {a: 1}, {b: 2}, null, undefined); console.log(o.a, o.b);", ["1 2"]);
  await ok("let t = {x: 1}; console.log(Object.assign(t, {y: 2}) === t, t.y);", ["true 2"]);
  await fails("console.log(Object.fromEntries([1]));", /キーと値の組/, "TypeError");
  await ok("console.log(Object.is(NaN, NaN), Object.is(0, -0), Object.is(-0, -0), Object.is('a', 'a'));", ["true false true true"]);
  await ok("console.log(Object.hasOwn({a: 1}, 'a'), Object.hasOwn({a: 1}, 'b'), Object.hasOwn([1], 'length'));", ["true false true"]);
});
test("B5-JS Object statics: freeze/seal/preventExtensions and descriptors", async () => {
  // 非 strict の実 JavaScript どおり、凍結後の書き込みは黙って無視される
  await ok(
    "let o = Object.freeze({a: 1}); o.a = 2; o.b = 3; console.log(o.a, o.b, Object.isFrozen(o), Object.isExtensible(o));",
    ["1 undefined true false"],
  );
  await ok(
    "let o = Object.seal({a: 1}); o.a = 2; o.b = 3; console.log(o.a, o.b, Object.isSealed(o), Object.isFrozen(o));",
    ["2 undefined true false"],
  );
  await ok(
    "let o = Object.preventExtensions({a: 1}); o.b = 2; console.log(o.b, Object.isExtensible(o));",
    ["undefined false"],
  );
  await ok("console.log(Object.isFrozen(5), Object.isSealed('x'), Object.isExtensible(null));", ["true true false"]);
  await ok(
    "let d = Object.getOwnPropertyDescriptor({a: 7}, 'a'); console.log(d.value, d.writable, d.enumerable, d.configurable, Object.getOwnPropertyDescriptor({a: 7}, 'b'));",
    ["7 true true true undefined"],
  );
  await ok("console.log(Object.getOwnPropertyNames({a: 1}), Object.getOwnPropertySymbols({a: 1}));",
    ['[\n  "a"\n] []']);
  await fails("console.log(Object.getPrototypeOf({}));", /プロトタイプチェーンはこのモデルでは表現できません/, "未対応");
  await fails("console.log(Object.defineProperty({}, 'a', {value: 1}));", /プロパティ記述子/, "未対応");
  await ok("console.log(Object.keys(Object.create(null)));", ["[]"]);
  await fails("console.log(Object.create({}));", /プロトタイプを継承するオブジェクト/, "未対応");
  await fails("console.log(Object.groupBy([1], Math.abs));", /コールバック/, "未対応");
});
test("B5-JS Array statics and constructor", async () => {
  await ok(
    "console.log(Array.isArray([1]), Array.isArray('x'), Array.isArray(Map()), Array.of(1, 'a'), Array(3).length, Array('3'));",
    ['true false false [\n  1,\n  "a"\n] 3 [\n  "3"\n]'],
  );
  await fails("console.log(Array(-1));", /配列の長さが不正です/, "RangeError");
  await fails("console.log(Array(200001));", /上限（200000）/, "RangeError");
  await ok("console.log(Array.from('a' + String.fromCodePoint(0x20BB7)).length, Array.from('a' + String.fromCodePoint(0x20BB7))[1].codePointAt(0), Array.from({length: 2}), Array.from(Set([1, 2])));",
    ['2 134071 [\n  undefined,\n  undefined\n] [\n  1,\n  2\n]']);
  await ok("console.log(Array.from(Map([['a', 1]])));",
    ['[\n  [\n    "a",\n    1\n  ]\n]']);
  await fails("let f = 5; console.log(Array.from([1], f));", /コールバック/, "未対応");
  await fails("console.log(Array.fromAsync([1]));", /非同期/, "未対応");
  await ok("console.log(Object());", ["{}"]);
  await fails("console.log(Object(5));", /ラッパーオブジェクト/, "未対応");
});

/* ---------------- 優先度3：配列メソッド（非コールバック） ---------------- */
test("B5-JS array methods: query and copy", async () => {
  await ok(
    "console.log([10, 20, 30].at(-1), [10, 20, 30].at(5), [1, 2].concat([3], 4), [1, 2, 3].slice(1), [1, 2, 3].slice(-2));",
    ["30 undefined [\n  1,\n  2,\n  3,\n  4\n] [\n  2,\n  3\n] [\n  2,\n  3\n]"],
  );
  await ok(
    "console.log([1, [2, [3, [4]]]].flat(), [1, [2, [3, [4]]]].flat(2), [1, [2]].flat(0), [1, 2].flat(Infinity));",
    ["[\n  1,\n  2,\n  [\n    3,\n    [\n      4\n    ]\n  ]\n] [\n  1,\n  2,\n  3,\n  [\n    4\n  ]\n] [\n  1,\n  [\n    2\n  ]\n] [\n  1,\n  2\n]"],
  );
  await ok(
    "console.log([1, 2, NaN].includes(NaN), [1, 2].includes(3), ['a', 'b'].indexOf('b'), [1, 2, 1].lastIndexOf(1), [NaN].indexOf(NaN));",
    ["true false 1 2 -1"],
  );
  await ok(
    "console.log([1, 2, 3].toReversed(), [1, 2, 3].with(0, 9), [1, 2, 3].with(-1, 9), [1, 2, 3].toSpliced(1, 1, 8, 9));",
    ["[\n  3,\n  2,\n  1\n] [\n  9,\n  2,\n  3\n] [\n  1,\n  2,\n  9\n] [\n  1,\n  8,\n  9,\n  3\n]"],
  );
  await fails("console.log([1, 2].with(2, 9));", /添字が範囲外です/, "RangeError");
});
test("B5-JS array methods: mutation", async () => {
  await ok(
    "let a = [1, 2, 3, 4]; console.log(a.splice(1, 2, 9), a);",
    ["[\n  2,\n  3\n] [\n  1,\n  9,\n  4\n]"],
  );
  await ok(
    "let a = [1, 2, 3, 4, 5]; a.copyWithin(0, 3); console.log(a); let b = [1, 2, 3]; b.fill(7, 1); console.log(b); let c = [3, 1, 2]; c.reverse(); console.log(c);",
    ["[\n  4,\n  5,\n  3,\n  4,\n  5\n]", "[\n  1,\n  7,\n  7\n]", "[\n  2,\n  1,\n  3\n]"],
  );
  await ok(
    "let a = [1, 2, 3]; console.log(a.shift(), a.unshift(0), a);",
    ["1 3 [\n  0,\n  2,\n  3\n]"],
  );
  await ok(
    "let a = Object.freeze([1, 2]); console.log(a[0]);",
    ["1"],
  );
  await fails("let a = Object.freeze([1, 2]); a.fill(9);", /凍結された配列は変更できません/, "TypeError");
});
test("B5-JS array sort: default form only", async () => {
  await ok("console.log([10, 9, 80, 1].sort(), [10, 9, 80, 1].toSorted());",
    ["[\n  1,\n  10,\n  80,\n  9\n] [\n  1,\n  10,\n  80,\n  9\n]"]);
  await ok("let a = ['b', 'a', 'c']; a.sort(); console.log(a); console.log([3, undefined, 1].sort());",
    ['[\n  "a",\n  "b",\n  "c"\n]', '[\n  1,\n  3,\n  undefined\n]']);
  await ok("console.log([2, 1].sort(undefined));", ["[\n  1,\n  2\n]"]);
  await fails("console.log([2, 1].sort(5));", /比較関数は関数値が必要/, "未対応");
});
test("B5-JS array callback boundary and iterators stop by name", async () => {
  for (const [code, label] of [
    ["[1, 2].map(Math.abs);", "Array.prototype.map"],
    ["[1, 2].filter(Math.abs);", "Array.prototype.filter"],
    ["[1, 2].reduce(Math.abs);", "Array.prototype.reduce"],
    ["[1, 2].forEach(Math.abs);", "Array.prototype.forEach"],
    ["[1, 2].find(Math.abs);", "Array.prototype.find"],
    ["[1, 2].some(Math.abs);", "Array.prototype.some"],
    ["[1, 2].every(Math.abs);", "Array.prototype.every"],
    ["[1, 2].flatMap(Math.abs);", "Array.prototype.flatMap"],
  ])
    await fails(code, new RegExp(label.replace(/\./g, "\\.") + " はコールバック"), "未対応");
  await fails("console.log([1, 2].keys());", /反復子オブジェクトは値として/, "未対応");
  await fails("console.log([1, 2].values());", /反復子オブジェクト/, "未対応");
  await fails("console.log([1, 2].entries());", /反復子オブジェクト/, "未対応");
});
test("B5-JS array toString and Object.prototype methods on objects", async () => {
  await ok("console.log([1, null, undefined, [2, 3]].toString(), [1, 2].valueOf() === [1, 2]);",
    ["1,,,2,3 false"]);
  await ok("let a = [1, 2]; console.log(a.valueOf() === a, a.hasOwnProperty('length'), a.hasOwnProperty('5'));", ["true true false"]);
  await ok("let o = {a: 1}; console.log(o.toString(), o.hasOwnProperty('a'), o.propertyIsEnumerable('a'), o.valueOf() === o);",
    ["[object Object] true true true"]);
  await fails("console.log({}.isPrototypeOf({}));", /プロトタイプチェーン/, "未対応");
});

/* ---------------- 優先度3：文字列メソッド ---------------- */
test("B5-JS string methods: basics", async () => {
  await ok(
    "console.log('hello'.charAt(1), 'hello'.charCodeAt(0), String.fromCodePoint(0x20BB7).codePointAt(0), 'hello'.at(-1), 'hello'[1]);",
    ["e 104 134071 o e"],
  );
  await ok(
    "console.log('hello world'.slice(6), 'hello'.substring(1, 3), 'hello'.concat('!', '?'), 'abc'.repeat(3), 'abc'.repeat(0));",
    ["world el hello!? abcabcabc "],
  );
  await fails("console.log('abc'.repeat(-1));", /Invalid count value/, "RangeError");
  await ok(
    "console.log('  a b  '.trim(), '  a'.trimStart(), 'a  '.trimEnd(), 'ABC'.toLowerCase(), 'abc'.toUpperCase());",
    ["a b a a abc ABC"],
  );
  await ok(
    "console.log('hello'.startsWith('he'), 'hello'.endsWith('lo'), 'hello'.includes('ell'), 'hello'.indexOf('l'), 'hello'.lastIndexOf('l'));",
    ["true true true 2 3"],
  );
  await ok(
    "console.log('x'.padStart(3, 'ab'), 'x'.padEnd(3), ''.padStart(2, 'ab'));",
    ["abx x   ab"],
  );
  await fails("console.log('abc'.localeCompare('abd'));", /ロケール/, "未確認");
});
test("B5-JS string methods: split and replace forms", async () => {
  await ok(
    "console.log('a,b,,c'.split(','), 'a,b,c'.split(',', 2), 'abc'.split(''), ''.split(','), 'abc'.split());",
    ['[\n  "a",\n  "b",\n  "",\n  "c"\n] [\n  "a",\n  "b"\n] [\n  "a",\n  "b",\n  "c"\n] [\n  ""\n] [\n  "abc"\n]'],
  );
  await ok(
    "console.log('aab'.replace('a', 'b'), 'aaa'.replaceAll('a', 'b'), 'a-a'.replaceAll('-', '+'));",
    ["bab bbb a+a"],
  );
  await ok(
    "console.log('2020-01-02'.split(RegExp('-')), 'a1b2'.split(RegExp('[0-9]')));",
    ['[\n  "2020",\n  "01",\n  "02"\n] [\n  "a",\n  "b",\n  ""\n]'],
  );
  await ok(
    "console.log('John Smith'.replace(RegExp('(\\\\w+)\\\\s(\\\\w+)'), '$2 $1'), 'aaa'.replace(RegExp('a', 'g'), 'b'));",
    ["Smith John bbb"],
  );
  await fails("console.log('aaa'.replaceAll(RegExp('a'), 'b'));", /g フラグが必要です/, "TypeError");
});
test("B5-JS string methods: match/search with RegExp", async () => {
  await ok(
    "console.log('a1b2'.match(RegExp('[0-9]', 'g')), 'abc'.match(RegExp('x')), 'abc'.search(RegExp('c')), 'abc'.search('b'));",
    ['[\n  "1",\n  "2"\n] null 2 1'],
  );
  const r = await ok(
    "let m = '2020-01'.match(RegExp('(\\\\d+)-(\\\\d+)')); console.log(m[0], m[1], m[2], m.index, m.input);",
    ["2020-01 2020 01 0 2020-01"],
  );
  void r;
  await fails("console.log('abc'.matchAll(RegExp('a', 'g')));", /反復子オブジェクト/, "未対応");
  await ok("console.log(('cafe' + String.fromCharCode(0x301)).normalize() === 'caf' + String.fromCharCode(0xE9), 'a'.isWellFormed(), String.fromCharCode(0xD800).isWellFormed(), String.fromCharCode(0xD800).toWellFormed().charCodeAt(0));",
    ["true true false 65533"]);
});
test("B5-JS string methods: unknown propagation", async () => {
  const r = await run('let x = prompt("s"); let y = x.charAt(0); let z = "abc".indexOf(x);');
  assert.deepEqual(errors(r), []);
  assert.equal(vars(r).y.kind, "unknown");
  assert.equal(vars(r).z.kind, "unknown");
});

/* ---------------- JSON ---------------- */
test("B5-JS JSON.parse and stringify of model values", async () => {
  await ok("console.log(JSON.parse('{\"a\": [1, null, true]}').a);", ["[\n  1,\n  null,\n  true\n]"]);
  await fails("console.log(JSON.parse('{bad'));", /JSON\.parse/, "SyntaxError");
  await fails("let r = 5; console.log(JSON.parse('{}', r));", /コールバック/, "未対応");
  await ok("console.log(JSON.stringify({d: Date(0)}), JSON.stringify(Set([1])), JSON.stringify(Map()));",
    ['{"d":"1970-01-01T00:00:00.000Z"} {} {}']);
  await ok("console.log(JSON.stringify(Uint8Array([1, 2])), JSON.stringify(Symbol('x')));",
    ['{"0":1,"1":2} undefined']);
  await ok("console.log(JSON.stringify({x: JSON.rawJSON('1.5')}), JSON.isRawJSON(JSON.rawJSON('1')), JSON.isRawJSON({}));",
    ['{"x":1.5} true false']);
  // 実 JavaScript でも rawJSON のトップレベルはプリミティブのみ
  await fails("console.log(JSON.rawJSON('[1, 2]'));", /JSON\.rawJSON/, "SyntaxError");
  await fails("console.log(JSON.rawJSON('{'));", /JSON\.rawJSON/, "SyntaxError");
});

/* ---------------- BigInt／Symbol／Error ---------------- */
test("B5-JS BigInt statics and prototype", async () => {
  await ok("console.log(BigInt.asIntN(8, 255n), BigInt.asUintN(8, -1n), BigInt.asIntN(1, 1n));", ["-1n 255n -1n"]);
  await fails("console.log(BigInt.asIntN(8, 5));", /Cannot convert/, "TypeError");
  await ok("console.log((255n).toString(16), 10n.valueOf() === 10n);", ["ff true"]);
});
test("B5-JS Symbol values", async () => {
  await ok(
    "console.log(typeof Symbol('id'), String(Symbol('id')), Symbol('a') === Symbol('a'), Symbol() === Symbol());",
    ["symbol Symbol(id) false false"],
  );
  await ok(
    "console.log(Symbol.for('k') === Symbol.for('k'), Symbol.keyFor(Symbol.for('k')), Symbol.keyFor(Symbol('k')));",
    ["true k undefined"],
  );
  await ok("console.log(typeof Symbol.iterator, Symbol('desc').description, Symbol().description);",
    ["symbol desc undefined"]);
  await ok("console.log(Symbol('x').toString(), String(Symbol()));", ["Symbol(x) Symbol()"]);
  await fails("console.log(Symbol.keyFor(5));", /シンボルでなければなりません/, "TypeError");
  await fails("console.log(Math.max(Symbol('x')));", /Symbolを数値へ変換できません/, "TypeError");
});
test("B5-JS Error constructors", async () => {
  await ok(
    "let e = TypeError('boom'); console.log(e.name, e.message, e.toString(), Error().message === '');",
    ["TypeError boom TypeError: boom true"],
  );
  await ok(
    "console.log(RangeError('r').name, SyntaxError('s').name, ReferenceError('x').name, EvalError('v').name, URIError('u').name);",
    ["RangeError SyntaxError ReferenceError EvalError URIError"],
  );
  await ok(
    "let a = AggregateError([1, 2], 'multi'); console.log(a.name, a.message, a.errors, a.toString());",
    ["AggregateError multi [\n  1,\n  2\n] AggregateError: multi"],
  );
  await ok(
    "let s = SuppressedError(Error('e'), Error('s'), 'm'); console.log(s.name, s.error.message, s.suppressed.message);",
    ["SuppressedError e s"],
  );
  await ok("console.log(Error.isError(Error('x')), Error.isError({}), Error.isError(TypeError('y')));", ["true false true"]);
  await ok("console.log(String(Error('oops')), JSON.stringify(Error('x')));", ["Error: oops {}"]);
});

/* ---------------- RegExp ---------------- */
test("B5-JS RegExp construction, exec/test, flags", async () => {
  await ok(
    "let re = RegExp('a+', 'gi'); console.log(re.source, re.flags, re.global, re.ignoreCase, re.multiline, re.lastIndex, re.toString());",
    ["a+ gi true true false 0 /a+/gi"],
  );
  await ok(
    "let re = RegExp('a', 'g'); console.log(re.exec('aa').index, re.lastIndex, re.exec('aa').index, re.lastIndex, re.exec('aa'), re.lastIndex);",
    ["0 1 1 2 null 0"],
  );
  await ok(
    "let re = RegExp('\\\\d+'); let m = re.exec('ab123'); console.log(m[0], m.index, m.input, re.test('x'), re.test('1'));",
    ["123 2 ab123 false true"],
  );
  await fails("console.log(RegExp('('));", /RegExp/, "SyntaxError");
  await fails("console.log(RegExp('a', 'x'));", /RegExp/, "SyntaxError");
  // Node 実走どおり、先頭の英数字は \xHH 形式へエスケープされる。
  // RegExp.escape はホスト委譲のため、ホスト（V8）の版数で有無が変わる
  // （Node 22 の V8 には無い）。有る環境では計算結果を、無い環境では
  // アプリの正直な名指し停止を、それぞれアサートする（修正バッチ21／RG-684）。
  if (typeof RegExp.escape === "function") {
    await ok("console.log(RegExp.escape('a.b*c'), RegExp());", ["\\x61\\.b\\*c /(?:)/"]);
  } else {
    await fails("console.log(RegExp.escape('a.b*c'), RegExp());", /^RegExp\.escape は未対応です：ホストに実装がありません/, "未対応");
  }
  await ok("console.log('caa'.replace(RegExp('a+'), 'X'), 'caa'.match(RegExp('a+'))[0]);", ["cX aa"]);
});

/* ---------------- Map／Set／WeakMap／WeakSet ---------------- */
test("B5-JS Map semantics", async () => {
  await ok(
    "let m = Map(); console.log(m.size, m.set('a', 1) === m, m.get('a'), m.get('x'), m.has('a'), m.delete('a'), m.delete('a'), m.size);",
    ["0 true 1 undefined true true false 0"],
  );
  await ok(
    "let m = Map([['a', 1], ['b', 2], ['a', 3]]); console.log(m.size, m.get('a'));",
    ["2 3"],
  );
  await ok(
    "let m = Map(); m.set(NaN, 1); m.set(-0, 2); console.log(m.get(NaN), m.get(0), m.size);",
    ["1 2 2"],
  );
  await ok(
    "let m = Map(); console.log(m.getOrInsert('k', 5), m.getOrInsert('k', 9), m.get('k'));",
    ["5 5 5"],
  );
  await fails("let m = Map(); m.getOrInsertComputed('k', Math.abs);", /コールバック/, "未対応");
  await fails("let m = Map(); m.forEach(Math.abs);", /コールバック/, "未対応");
  await fails("let m = Map(); console.log(m.entries());", /反復子オブジェクト/, "未対応");
  await fails("console.log(Map([1]));", /キーと値の組/, "TypeError");
  await ok("console.log(String(Map()), JSON.stringify(Map([['a', 1]])));", ["[object Map] {}"]);
  await fails("console.log(Map.groupBy([1], Math.abs));", /コールバック/, "未対応");
});
test("B5-JS Set semantics and algebra", async () => {
  await ok(
    "let s = Set([1, 2, 2, 3]); console.log(s.size, s.has(2), s.add(4) === s, s.delete(2), s.has(2), s.size);",
    ["3 true true true false 3"],
  );
  await ok("console.log(Set('aba').size, Set([NaN, NaN]).size);", ["2 1"]);
  await ok(
    "let a = Set([1, 2, 3]), b = Set([2, 3, 4]); console.log(a.union(b).size, a.intersection(b).size, a.difference(b).size, a.symmetricDifference(b).size);",
    ["4 2 1 2"],
  );
  await ok(
    "let a = Set([1, 2]), b = Set([1, 2, 3]); console.log(a.isSubsetOf(b), b.isSupersetOf(a), a.isDisjointFrom(Set([9])));",
    ["true true true"],
  );
  await fails("let s = Set([1]); s.forEach(Math.abs);", /コールバック/, "未対応");
  await fails("let s = Set([1]); console.log(s.values());", /反復子オブジェクト/, "未対応");
});
test("B5-JS WeakMap and WeakSet", async () => {
  await ok(
    "let wm = WeakMap(); let k = {id: 1}; console.log(wm.set(k, 5) === wm, wm.get(k), wm.has(k), wm.delete(k), wm.get(k));",
    ["true 5 true true undefined"],
  );
  await fails("let wm = WeakMap(); wm.set(1, 5);", /キーはオブジェクトでなければなりません/, "TypeError");
  await ok(
    "let ws = WeakSet(); let k = {}; console.log(ws.add(k) === ws, ws.has(k), ws.delete(k), ws.has(k));",
    ["true true true false"],
  );
  await fails("let ws = WeakSet(); ws.add('x');", /キーはオブジェクトでなければなりません/, "TypeError");
});

/* ---------------- Date ---------------- */
test("B5-JS Date construction and UTC accessors", async () => {
  await ok(
    "let d = Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6)); console.log(d.getTime(), d.toISOString(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCDay(), d.getUTCHours());",
    ["1577934245006 2020-01-02T03:04:05.006Z 2020 0 2 4 3"],
  );
  await ok(
    "console.log(Date.parse('2020-01-01'), Date.parse('2020-01-01T00:00:00Z'), Date.UTC(2020, 0, 1), Date.UTC(99, 0, 1) === Date.UTC(1999, 0, 1));",
    ["1577836800000 1577836800000 1577836800000 true"],
  );
  await ok(
    "let d = Date(0); console.log(d.setUTCFullYear(2021), d.getTime(), d.setTime(0), d.toUTCString(), d.toJSON());",
    ["1609459200000 1609459200000 0 Thu, 01 Jan 1970 00:00:00 GMT 1970-01-01T00:00:00.000Z"],
  );
  await ok(
    "let d = Date('2020-13-01'); console.log(d.getTime(), d.toJSON());",
    ["NaN null"],
  );
  await fails("let d = Date('2020-13-01'); console.log(d.toISOString());", /Invalid time value/, "RangeError");
  await ok("console.log(Date(0).valueOf(), Number(Date(0)), String(Date(0)));",
    ["0 0 Thu, 01 Jan 1970 00:00:00 GMT"]);
});
test("B5-JS Date: now is unknown, local-time surface is unverified, non-ISO parse stops", async () => {
  const r = await run("let y = Date.now();");
  assert.deepEqual(errors(r), []);
  assert.equal(vars(r).y.kind, "unknown");
  const r2 = await run("let d = Date();");
  assert.equal(vars(r2).d.kind, "unknown");
  await fails("let d = Date(0); console.log(d.getFullYear());", /現地時間/, "未確認");
  await fails("let d = Date(0); console.log(d.getHours());", /現地時間/, "未確認");
  await fails("let d = Date(0); d.setHours(5);", /現地時間/, "未確認");
  await fails("console.log(Date.parse('2020/01/01'));", /ISO 8601/, "未確認");
  await fails("console.log(Date.parse('Jan 1 2020'));", /ISO 8601/, "未確認");
});
test("B5-JS Date stringification: explicit local-time methods stop by name, never generically", async () => {
  // 回帰：DATE_UTC_GETTERS の素の添字参照が Object.prototype の継承
  // プロパティ（toString／toLocaleString）を拾い、存在しないホスト
  // メソッド呼び出しの TypeError が汎用文言に化けていた。
  for (const method of [
    "toString", "toDateString", "toTimeString",
    "toLocaleString", "toLocaleDateString", "toLocaleTimeString",
  ]) {
    // A5班監査で期待値を是正：toLocaleDateString／toLocaleTimeString
    // はカタログ caution がロケール依存を理由としており、停止文言も
    // ロケール＋現地時間の併記に統一された（従来の一律「は現地時間」
    // は caution と食い違う文言を固定していた）。
    const reason =
      method === "toLocaleDateString" || method === "toLocaleTimeString"
        ? "はロケール"
        : "は現地時間";
    const r = await fails(
      `console.log(Date(0).${method}());`,
      new RegExp(`Date\\.prototype\\.${method} ${reason}`),
      "未確認",
    );
    assert.doesNotMatch(errors(r)[0], /予期しないエラー/, method);
  }
  // 引数付き・変数経由でも同じ名前付き停止になる
  await fails("console.log(Date(0).toLocaleString('en-US'));", /Date\.prototype\.toLocaleString は現地時間/, "未確認");
  await fails("let d = Date(0); console.log(d.toString());", /Date\.prototype\.toString は現地時間/, "未確認");
  // Object.prototype 系の名前も汎用エラーにはならない。
  // JS-B5-04 修正後は hasOwnProperty／propertyIsEnumerable が Date でも
  // Node どおりの真偽値（内部スロットは own でないため false）を返し、
  // isPrototypeOf だけが従来の名指し停止へ届く。
  await ok("console.log(Date(0).hasOwnProperty('time'), Date(0).propertyIsEnumerable('time'));", ["false false"]);
  {
    const r = await run("console.log(Date(0).isPrototypeOf(Date(0)));");
    assert.ok(errors(r).length > 0);
    assert.doesNotMatch(errors(r)[0], /予期しないエラー/);
  }
  // UTC 系は従来どおり確定値を返す
  await ok("console.log(Date(0).toUTCString(), Date(0).toISOString(), Date(0).getUTCFullYear());",
    ["Thu, 01 Jan 1970 00:00:00 GMT 1970-01-01T00:00:00.000Z 1970"]);
});
test("B5-JS Date stringification: implicit conversion uses the UTC display form", async () => {
  // 表示（console.log）はモデルの ISO 形式、文字列変換は UTC 形式で
  // いずれも決定的。+ 連結と join が "[object Object]" に化けないこと。
  await ok("console.log(Date(0));", ["1970-01-01T00:00:00.000Z"]);
  await ok("console.log(String(Date(0)), Date(0) + '', '' + Date(0));",
    ["Thu, 01 Jan 1970 00:00:00 GMT Thu, 01 Jan 1970 00:00:00 GMT Thu, 01 Jan 1970 00:00:00 GMT"]);
  await ok("console.log(Date(0) + 1, 1 + Date(0));",
    ["Thu, 01 Jan 1970 00:00:00 GMT1 1Thu, 01 Jan 1970 00:00:00 GMT"]);
  await ok("let s = ''; s += Date(0); console.log(s);", ["Thu, 01 Jan 1970 00:00:00 GMT"]);
  await ok("console.log([Date(0), 1].join('-'), [1, [Date(0)]] + '');",
    ["Thu, 01 Jan 1970 00:00:00 GMT-1 1,Thu, 01 Jan 1970 00:00:00 GMT"]);
  await ok("alert(Date(0));", ["Thu, 01 Jan 1970 00:00:00 GMT"]);
  await ok("console.log(Date('2020-13-01') + '', Date('2020-13-01'));", ["Invalid Date Invalid Date"]);
  // 通常オブジェクトの中の Date は実 JavaScript どおり外側の
  // "[object Object]" の内側に隠れる（文字列化の対象位置ではない）
  await ok("let o = {d: Date(0)}; console.log(o + '');", ["[object Object]"]);
  // テンプレートリテラルはこの方言では全般に名前付き未対応停止
  await fails("console.log(`x`);", /この構文は説明に対応していません/, "未対応");
});
test("B5-JS stringification siblings: other model values in + and DataView toString", async () => {
  await ok("console.log(Map() + '', Set([1]) + '', RegExp('a') + '', Error('e') + '', Uint8Array([1, 2]) + '');",
    ["[object Map] [object Set] /a/ Error: e 1,2"]);
  await fails("console.log(Symbol('s') + '');", /Symbolを文字列へ変換できません/, "TypeError");
  await fails("console.log(Symbol('s') + 1);", /Symbolを数値へ変換できません/, "TypeError");
  await ok("console.log(String(Symbol('s')));", ["Symbol(s)"]);
  // DV_METHODS の `in` 判定（プロトタイプ継承）で素通りしていた表面
  await ok("let dv = DataView(ArrayBuffer(4)); console.log(dv.toString(), dv.valueOf() === dv);",
    ["[object DataView] true"]);
});

/* ---------------- ArrayBuffer／TypedArray／DataView ---------------- */
test("B5-JS ArrayBuffer and DataView", async () => {
  await ok(
    "let buf = ArrayBuffer(4); let dv = DataView(buf); dv.setInt16(0, 0x1234); console.log(dv.getUint8(0), dv.getUint8(1), dv.getInt16(0), buf.byteLength, ArrayBuffer.isView(dv), ArrayBuffer.isView(buf));",
    ["18 52 4660 4 true false"],
  );
  await ok(
    "let buf = ArrayBuffer(8); let dv = DataView(buf); dv.setFloat64(0, 1.5); dv.setBigInt64(0, 0n); console.log(dv.getFloat64(0), dv.getBigInt64(0));",
    ["0 0n"],
  );
  await fails("let dv = DataView(ArrayBuffer(2)); console.log(dv.getInt32(0));", /Offset is outside the bounds/, "RangeError");
  await fails("console.log(ArrayBuffer(200001));", /上限/, "RangeError");
  await ok(
    "let buf = ArrayBuffer(3); let b2 = buf.slice(1); console.log(b2.byteLength, buf.byteLength, buf.detached); let b3 = buf.transfer(); console.log(buf.byteLength, buf.detached, b3.byteLength);",
    ["2 3 false", "0 true 3"],
  );
  await fails("console.log(DataView({}));", /ArrayBuffer でなければなりません/, "TypeError");
});
test("B5-JS TypedArray construction and element access", async () => {
  await ok(
    "let ta = Uint8Array([255, 300, -1, 1.9]); console.log(ta[0], ta[1], ta[2], ta[3], ta.length, ta.byteLength, ta.BYTES_PER_ELEMENT);",
    ["255 44 255 1 4 4 1"],
  );
  await ok(
    "console.log(Int8Array([128, -129])[0], Int8Array([128, -129])[1], Uint8ClampedArray([300, -5, 0.5]).toString(), Int16Array([-1])[0]);",
    ["-128 127 255,0,0 -1"],
  );
  await ok(
    "let ta = Uint8Array(3); ta[0] = 7; ta[5] = 9; console.log(ta.toString(), ta[5]);",
    ["7,0,0 undefined"],
  );
  await ok(
    "console.log(Float64Array([0.1, 2]).toString(), BigInt64Array([1n, -2n]).toString(), BigUint64Array([-1n])[0]);",
    ["0.1,2 1,-2 18446744073709551615n"],
  );
  await ok(
    "let buf = ArrayBuffer(4); let ta = Uint8Array(buf); ta[0] = 9; let dv = DataView(buf); console.log(dv.getUint8(0)); let sub = ta.subarray(0, 1); sub[0] = 3; console.log(ta[0]);",
    ["9", "3"],
  );
  await fails("console.log(Uint32Array(ArrayBuffer(3), 0).length);", /割り切れません/, "RangeError");
  await fails("let ta = Uint8Array(200001);", /上限/, "RangeError");
});
test("B5-JS TypedArray methods", async () => {
  await ok(
    "let ta = Float64Array([3, 1, 10]); ta.sort(); console.log(ta.toString(), Uint8Array([3, 1]).toSorted().toString(), Int8Array([1, 2, 3]).at(-1));",
    ["1,3,10 1,3 3"],
  );
  await ok(
    "let ta = Uint8Array([1, 2, 3]); ta.fill(9, 1); console.log(ta.toString(), ta.includes(9), ta.indexOf(2), ta.join('-'), ta.with(0, 5).toString(), ta.slice(1).toString());",
    ["1,9,9 true -1 1-9-9 5,9,9 9,9"],
  );
  await ok(
    "let ta = Uint8Array(3); ta.set([7, 8], 1); console.log(ta.toString()); let tb = Uint8Array(2); tb.set(Uint8Array([4, 5])); console.log(tb.toString());",
    ["0,7,8", "4,5"],
  );
  await fails("let ta = Uint8Array(1); ta.set([1, 2]);", /範囲を超えます/, "RangeError");
  await fails("console.log(Uint8Array([1]).map(Math.abs));", /コールバック/, "未対応");
  await fails("console.log(Uint8Array([1]).keys());", /反復子オブジェクト/, "未対応");
  await fails("console.log(Float64Array([1]).sort(5));", /比較関数は関数値が必要/, "未対応");
});
test("B5-JS Uint8Array base64 and hex", async () => {
  await ok(
    "console.log(Uint8Array.fromHex('ff00').toString(), Uint8Array.fromBase64('aGk=').toString());",
    ["255,0 104,105"],
  );
  await ok(
    "let ta = Uint8Array([104, 105]); console.log(ta.toBase64(), ta.toHex());",
    ["aGk= 6869"],
  );
  await fails("console.log(Uint8Array.fromHex('fg'));", /16進数文字列が不正です/, "SyntaxError");
  await fails("console.log(Uint8Array.fromBase64('a!'));", /Base64文字列が不正です/, "SyntaxError");
  await ok(
    "let ta = Uint8Array(2); console.log(ta.setFromHex('abcd').written, ta.toString());",
    ["2 171,205"],
  );
});

/* ---------------- Reflect ---------------- */
test("B5-JS Reflect subset", async () => {
  await ok(
    "let o = {a: 3}; console.log(Reflect.get(o, 'a'), Reflect.set(o, 'b', 4), o.b, Reflect.has(o, 'a'), Reflect.has(o, 'toString'), Reflect.ownKeys(o));",
    ["3 true 4 true true [\n  \"a\",\n  \"b\"\n]"],
  );
  await ok(
    "let o = {a: 1}; console.log(Reflect.deleteProperty(o, 'a'), Reflect.has(o, 'a'), Reflect.getOwnPropertyDescriptor({x: 9}, 'x').value);",
    ["true false 9"],
  );
  await fails("console.log(Reflect.apply(Math.abs, null, []));", /動的な適用/, "未対応");
  await fails("console.log(Reflect.getPrototypeOf({}));", /プロトタイプチェーン/, "未対応");
});

/* ---------------- 名指し停止（非同期／GC／コード生成／Proxy／共有メモリ） ---------------- */
test("B5-JS named stops keep their reasons distinct", async () => {
  await fails("console.log(Promise.resolve(1));", /Promise\.resolve は非同期処理のため未対応/, "未対応");
  await fails("console.log(Promise.all([]));", /非同期処理/, "未対応");
  await fails("let p = Promise(function() {});", /この構文は説明に対応していません/, "未対応");
  await fails("console.log(eval('1 + 1'));", /動的コード実行/, "未対応");
  await fails("console.log(Function('return 1'));", /動的関数生成/, "未対応");
  await fails("console.log(Proxy({}, {}));", /Proxy のメタ操作/, "未対応");
  await fails("console.log(Proxy.revocable({}, {}));", /Proxy のメタ操作/, "未対応");
  await fails("console.log(WeakRef({}));", /ガベージコレクション/, "未対応");
  await fails("console.log(FinalizationRegistry(Math.abs));", /ガベージコレクション/, "未対応");
  await fails("console.log(SharedArrayBuffer(8));", /共有メモリ/, "未対応");
  await fails("console.log(Atomics.add(Uint8Array(1), 0, 1));", /共有メモリ上の原子操作/, "未対応");
  await fails("console.log(Iterator.from([1]));", /反復子オブジェクトは値として/, "未対応");
  await fails("console.log(DisposableStack());", /コールバック（defer／adopt／use）/, "未対応");
});
test("B5-JS typeof for new names", async () => {
  await ok(
    "console.log(typeof Math.max, typeof Math.sumPrecise, typeof Object.keys, typeof JSON.parse, typeof Promise.resolve, typeof Symbol.for, typeof eval, typeof encodeURI, typeof Atomics.add, typeof Reflect.get);",
    ["function function function function function function function function function function"],
  );
  await ok("console.log(typeof Map, typeof Uint8Array, typeof WeakRef, typeof Symbol.iterator);",
    ["function function function symbol"]);
});

/* ---------------- シャドーイング・既存挙動の維持 ---------------- */
test("B5-JS shadowing and pre-existing behaviour are preserved", async () => {
  await fails("let parseFloat = 5; console.log(parseFloat('1'));", /関数ではありません/, "TypeError");
  await fails("let Math = {max: 5}; console.log(Math.max(1, 2));", /関数ではありません/, "TypeError");
  await ok("let Math = {max: 5}; console.log(Math.max);", ["5"]);
  await ok("console.log(Math.abs(-3), Math.floor(-1.2), Math.round(-1.5), parseInt('12px', 10));", ["3 -2 -1 12"]);
  await ok("console.log(JSON.stringify({a: 1}), [1, 2, 3].join('-'));", ['{"a":1} 1-2-3']);
  await fails("console.log(console.warn('x'));", /このJavaScript関数は説明に対応していません：console\.warn/, "エラー");
  await fails("foo.bar();", /未定義の名前：foo/, "ReferenceError");
  // DOM モデルの既存挙動
  await ok(
    "const result = document.getElementById('result'); result.textContent = '完了'; console.log(result.textContent, document.getElementById('name').value);",
    ["完了 学習者"],
  );
  await ok("console.log(typeof Math.abs, typeof nothingHere);", ["function undefined"]);
});
test("B5-JS display of model values in final state", async () => {
  const r = await run(
    "let m = Map([['a', 1]]); let d = Date(0); let re = RegExp('a+', 'g'); let e = Error('x'); let ta = Uint8Array([1, 2]); console.log(m, d, re, e, ta);",
  );
  assert.deepEqual(errors(r), []);
  const text = outputs(r)[0];
  assert.match(text, /Map/);
  assert.match(text, /1970-01-01T00:00:00\.000Z/);
  assert.match(text, /\/a\+\/g/);
  assert.match(text, /Error: x/);
  assert.match(text, /Uint8Array/);
});

/* ---------------- JS-FIX2a：監査 AUD-JS のエンジン系所見の修正 ---------------- */
test("FIX2a JS-B5-01: %TypedArray%.from / .of for all 12 constructors", async () => {
  // 全12種：from([1, 2]) と of(3) が Node 実走と同じ要素列になる
  for (const name of [
    "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array",
    "Uint16Array", "Int32Array", "Uint32Array", "Float32Array",
    "Float64Array",
  ]) {
    await ok(`console.log(${name}.from([1, 2]).toString(), ${name}.of(3).toString());`, ["1,2 3"], );
  }
  // Float16Array は要素変換をホスト DataView に委譲するため、ホスト
  // （V8）の版数で有無が変わる（Node 22 の V8 には無い）。有る環境では
  // 計算結果を、無い環境ではアプリの正直な名指し停止を、それぞれ
  // アサートする（修正バッチ21／RG-684）。
  if (typeof Float16Array === "function") {
    await ok("console.log(Float16Array.from([1, 2]).toString(), Float16Array.of(3).toString());", ["1,2 3"]);
  } else {
    await fails("console.log(Float16Array.from([1, 2]).toString(), Float16Array.of(3).toString());", /^Float16Array は未対応です：ホストに実装がありません/, "未対応");
  }
  await ok("console.log(BigInt64Array.from([1n, 2n]).toString(), BigUint64Array.of(3n).toString());", ["1,2 3"]);
  // 配列状・文字列・Set・既存 TypedArray からの変換（Node 実走どおり）
  await ok("console.log(Uint8Array.from({length: 2, 0: 7, 1: 8}).toString(), Uint8Array.from('ab').toString(), Uint8Array.from(Set([1, 2])).toString(), Uint8Array.from(Int16Array([300])).toString());",
    ["7,8 0,0 1,2 44"]);
  await ok("console.log(Uint8Array.from(5).length, Int16Array.from([1.9]).toString());", ["0 1"]);
  await fails("console.log(Uint8Array.from(null));", /null \/ undefined/, "TypeError");
  // 第2引数（変換コールバック）形だけが名前付き未対応停止
  await fails("console.log(Uint8Array.from([1], 5));", /Uint8Array\.from（第2引数の変換関数） はコールバック/, "未対応");
  await fails("let f = 5; console.log(Float64Array.from([1], f));", /コールバック/, "未対応");
});
test("FIX2a JS-B5-02: static BYTES_PER_ELEMENT for all 12 constructors", async () => {
  await ok(
    "console.log(Int8Array.BYTES_PER_ELEMENT, Uint8Array.BYTES_PER_ELEMENT, Uint8ClampedArray.BYTES_PER_ELEMENT, Int16Array.BYTES_PER_ELEMENT, Uint16Array.BYTES_PER_ELEMENT, Int32Array.BYTES_PER_ELEMENT, Uint32Array.BYTES_PER_ELEMENT, Float32Array.BYTES_PER_ELEMENT, Float64Array.BYTES_PER_ELEMENT, Float16Array.BYTES_PER_ELEMENT, BigInt64Array.BYTES_PER_ELEMENT, BigUint64Array.BYTES_PER_ELEMENT);",
    ["1 1 1 2 2 4 4 4 8 2 8 8"],
  );
  // インスタンス経由（従来どおり）も壊れていない
  await ok("console.log(Uint8Array([1]).BYTES_PER_ELEMENT);", ["1"]);
  // Float16Array の静的読み取りはアプリ自身の表で答えるためホストに
  // 依存しない（上の12種一括の行で両環境とも固定）。一方、インスタンス
  // 生成はホスト DataView への委譲を含むため、ホスト（V8）の版数で
  // 有無が変わる（Node 22 の V8 には無い）。有る環境では値を、無い
  // 環境ではアプリの正直な名指し停止をアサートする（修正バッチ21／RG-684）。
  if (typeof Float16Array === "function") {
    await ok("console.log(Float16Array([1]).BYTES_PER_ELEMENT);", ["2"]);
  } else {
    await fails("console.log(Float16Array([1]).BYTES_PER_ELEMENT);", /^Float16Array は未対応です：ホストに実装がありません/, "未対応");
  }
});
test("FIX2a JS-B5-03: [Symbol.toStringTag] and [Symbol.unscopables] reads", async () => {
  await ok(
    "console.log(Map()[Symbol.toStringTag], Set()[Symbol.toStringTag], WeakMap()[Symbol.toStringTag], WeakSet()[Symbol.toStringTag], Date(0)[Symbol.toStringTag], RegExp('a')[Symbol.toStringTag], Error('e')[Symbol.toStringTag], TypeError('e')[Symbol.toStringTag], ArrayBuffer(1)[Symbol.toStringTag], DataView(ArrayBuffer(1))[Symbol.toStringTag], Uint8Array(1)[Symbol.toStringTag], BigInt64Array(1)[Symbol.toStringTag]);",
    ["Map Set WeakMap WeakSet Date RegExp Error Error ArrayBuffer DataView Uint8Array BigInt64Array"],
  );
  // Float16Array の生成はホスト（V8）の版数で有無が変わる（Node 22 の
  // V8 には無い）。有る環境では toStringTag の値を、無い環境ではアプリの
  // 正直な名指し停止をアサートする（修正バッチ21／RG-684）。
  if (typeof Float16Array === "function") {
    await ok("console.log(Float16Array(1)[Symbol.toStringTag]);", ["Float16Array"]);
  } else {
    await fails("console.log(Float16Array(1)[Symbol.toStringTag]);", /^Float16Array は未対応です：ホストに実装がありません/, "未対応");
  }
  await ok(
    "console.log({}[Symbol.toStringTag], [1][Symbol.toStringTag], 'x'[Symbol.toStringTag], (1)[Symbol.toStringTag], true[Symbol.toStringTag], 10n[Symbol.toStringTag], Symbol('s')[Symbol.toStringTag], Math[Symbol.toStringTag], JSON[Symbol.toStringTag]);",
    ["Object Array String Number Boolean BigInt Symbol Math JSON"],
  );
  // unscopables：Node v24 実走の16キーが全て true の通常オブジェクト
  const r = await run("console.log([1, 2][Symbol.unscopables]);");
  assert.deepEqual(errors(r), []);
  const parsed = JSON.parse(outputs(r)[0]);
  assert.deepEqual(Object.keys(parsed), [
    "at", "copyWithin", "entries", "fill", "find", "findIndex", "findLast",
    "findLastIndex", "flat", "flatMap", "includes", "keys", "toReversed",
    "toSorted", "toSpliced", "values",
  ]);
  assert.ok(Object.values(parsed).every((v) => v === true));
  // 対象外の Symbol キーは従来挙動（undefined のまま）
  await ok("console.log([1][Symbol.species], Map()[Symbol.iterator]);", ["undefined undefined"]);
});
test("FIX2a JS-B5-04: hasOwnProperty / propertyIsEnumerable on every receiver kind", async () => {
  // 文字列：length と範囲内インデックスが own、列挙可能はインデックスのみ
  await ok("console.log('abc'.hasOwnProperty('length'), 'abc'.hasOwnProperty('1'), 'abc'.hasOwnProperty('3'), 'abc'.propertyIsEnumerable('1'), 'abc'.propertyIsEnumerable('length'));", ["true true false true false"]);
  // 数値・真偽値・BigInt・Symbol 値は全て false
  await ok("console.log((42.5).hasOwnProperty('x'), (42.5).propertyIsEnumerable('x'), true.hasOwnProperty('x'), 10n.hasOwnProperty('x'), Symbol('s').hasOwnProperty('description'), Symbol('s').propertyIsEnumerable('description'));", ["false false false false false false"]);
  // コレクション・Date・バッファ系は own なし（内部フィールドも own でない）
  await ok("console.log(Map().hasOwnProperty('size'), Set().hasOwnProperty('size'), WeakMap().hasOwnProperty('entries'), WeakSet().hasOwnProperty('values'), Date(0).hasOwnProperty('time'), ArrayBuffer(1).hasOwnProperty('byteLength'), DataView(ArrayBuffer(1)).hasOwnProperty('buffer'));", ["false false false false false false false"]);
  // RegExp は lastIndex だけ own（列挙不可）、source／flags は own でない
  await ok("let re = RegExp('a', 'g'); console.log(re.hasOwnProperty('lastIndex'), re.propertyIsEnumerable('lastIndex'), re.hasOwnProperty('source'), re.hasOwnProperty('flags'));", ["true false false false"]);
  // エラー：message は own（列挙不可）、AggregateError の errors も own、name は own でない
  await ok("let e = Error('m'); let a = AggregateError([1], 'm'); let s = SuppressedError(Error('x'), Error('y'), 'm'); console.log(e.hasOwnProperty('message'), e.propertyIsEnumerable('message'), e.hasOwnProperty('name'), a.hasOwnProperty('errors'), a.propertyIsEnumerable('errors'), s.hasOwnProperty('error'), s.hasOwnProperty('suppressed'));", ["true false false true false true true"]);
  // TypedArray：範囲内インデックスは own かつ列挙可能、length 等は own でない
  await ok("let ta = Uint8Array([9, 8]); console.log(ta.hasOwnProperty('0'), ta.hasOwnProperty('2'), ta.propertyIsEnumerable('1'), ta.propertyIsEnumerable('length'), ta.hasOwnProperty('length'), ta.hasOwnProperty('byteLength'), ta.hasOwnProperty('BYTES_PER_ELEMENT'));", ["true false true false false false false"]);
  // 利用者が代入したプロパティはモデル値でも own かつ列挙可能になる
  await ok("let m = Map(); m.foo = 1; let d = Date(0); d.bar = 2; console.log(m.hasOwnProperty('foo'), m.propertyIsEnumerable('foo'), d.hasOwnProperty('bar'), d.propertyIsEnumerable('bar'));", ["true true true true"]);
  // 通常オブジェクト・配列は既存挙動を維持
  await ok("let o = {a: 1}; let arr = [10, 20]; console.log(o.hasOwnProperty('a'), o.propertyIsEnumerable('a'), arr.hasOwnProperty('length'), arr.propertyIsEnumerable('length'), arr.propertyIsEnumerable('0'));", ["true true true false true"]);
});
test("FIX2a JS-B5-05: named stops for isPrototypeOf / __defineGetter__ etc. on every receiver", async () => {
  for (const code of [
    "console.log(Map().isPrototypeOf(Map()));",
    "console.log('abc'.isPrototypeOf('x'));",
    "console.log((5).isPrototypeOf(5));",
    "console.log(Uint8Array(1).isPrototypeOf(Uint8Array(1)));",
    "console.log(RegExp('a').isPrototypeOf(RegExp('a')));",
  ])
    await fails(code, /Object\.prototype\.isPrototypeOf は未対応です：プロトタイプチェーンはこのモデルでは表現できません/, "未対応");
  for (const name of ["__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"])
    for (const code of [
      `console.log(Map().${name}('x', 5));`,
      `console.log([1].${name}('x', 5));`,
      `console.log('abc'.${name}('x', 5));`,
    ])
      await fails(code, new RegExp("Object\\.prototype\\." + name + " はコールバック"), "未対応");
});
test("FIX2a JS-B5-05: toLocaleString unverified stops and string/boolean real values", async () => {
  for (const code of [
    "console.log(Map().toLocaleString());",
    "console.log(Set().toLocaleString());",
    "console.log(WeakMap().toLocaleString());",
    "console.log(WeakSet().toLocaleString());",
    "console.log(RegExp('a').toLocaleString());",
    "console.log(Error('e').toLocaleString());",
    "console.log(ArrayBuffer(1).toLocaleString());",
    "console.log(DataView(ArrayBuffer(1)).toLocaleString());",
    "console.log(Symbol('s').toLocaleString());",
  ])
    await fails(code, /toLocaleString はロケールに依存するため未確認です/, "未確認");
  // 文字列・真偽値はロケール非依存で toString と同一（Node 実走確認）
  await ok("console.log('abc'.toLocaleString(), true.toLocaleString(), false.toLocaleString());", ["abc true false"]);
  // 既存の正しい挙動（Date／Number／配列）は維持
  await fails("console.log(Date(0).toLocaleString());", /Date\.prototype\.toLocaleString は現地時間/, "未確認");
  await fails("console.log((5).toLocaleString());", /Number\.prototype\.toLocaleString/, "未確認");
});
test("FIX2a JS-B5-06: method value reads never leak host function sources", async () => {
  const r = await run("let m = Map(); console.log(m.toString, m.valueOf, m.hasOwnProperty);");
  assert.deepEqual(errors(r), []);
  assert.doesNotMatch(outputs(r)[0], /native code|function toString/);
  assert.match(outputs(r)[0], /実行時に決まる：メソッド toString の値（関数値）/);
  await ok("console.log([1, 2].toString, 'abc'.valueOf, (5).toString, true.valueOf, 10n.toString, Symbol('s').toString);",
    ["実行時に決まる：メソッド toString の値（関数値） 実行時に決まる：メソッド valueOf の値（関数値） 実行時に決まる：メソッド toString の値（関数値） 実行時に決まる：メソッド valueOf の値（関数値） 実行時に決まる：メソッド toString の値（関数値） 実行時に決まる：メソッド toString の値（関数値）"]);
  await ok("console.log([1]['toString'], Date(0)['valueOf']);",
    ["実行時に決まる：メソッド toString の値（関数値） 実行時に決まる：メソッド valueOf の値（関数値）"]);
  // typeof は実 JavaScript どおり "function" のまま
  await ok("console.log(typeof Map().toString, typeof [1].push, typeof 'a'.charAt, typeof (5).toFixed);", ["function function function function"]);
  // 利用者自身の同名プロパティはそのまま読める（ガードは own を横取りしない）
  await ok("let o = {toString: 42, valueOf: 'v'}; console.log(o.toString, o.valueOf);", ["42 v"]);
  // 呼び出し経路には影響しない
  await ok("console.log(Map().toString(), [1, 2].toString(), 'abc'.toString());", ["[object Map] 1,2 abc"]);
  // Reflect.get 経由でも漏れない
  const rr = await run("console.log(Reflect.get(Map(), 'toString'));");
  assert.deepEqual(errors(rr), []);
  assert.doesNotMatch(outputs(rr)[0], /native code/);
});
test("FIX2a JS-B5-10: JSON.stringify embeds RawJSON without host JSON.rawJSON", async () => {
  await ok("console.log(JSON.stringify(JSON.rawJSON('123')));", ["123"]);
  await ok("console.log(JSON.stringify({x: JSON.rawJSON('1.5'), y: [JSON.rawJSON('true'), JSON.rawJSON('null')]}));", ['{"x":1.5,"y":[true,null]}']);
  await ok("console.log(JSON.stringify(JSON.rawJSON('\"a\\\\nb\"')), JSON.stringify([JSON.rawJSON('-0.5'), JSON.rawJSON('-0.5')]));", ['"a\\nb" [-0.5,-0.5]']);
  // 利用者の文字列がプレースホルダ風でも誤置換しない
  await ok("console.log(JSON.stringify({s: 'rawjson', x: JSON.rawJSON('7')}));", ['{"s":"rawjson","x":7}']);
  // replacer／space を伴う形でも埋め込みが保たれる
  await ok("console.log(JSON.stringify({x: JSON.rawJSON('1')}, ['x'], 2));", ['{\n  "x": 1\n}']);
});
test("FIX2a JS-B5-11: Iterator helper names stop by name on any receiver", async () => {
  for (const name of ["drop", "take", "chunks", "windows", "toArray"])
    for (const code of [
      `console.log([1, 2, 3].${name}(1));`,
      `console.log(Map().${name}(1));`,
      `console.log('abc'.${name}(1));`,
    ])
      await fails(code, new RegExp("Iterator\\.prototype\\." + name + " は未対応です：反復子オブジェクトは値としてこのモデルでは表現できません"), "未対応");
  // 同名・近名の正規ディスパッチは横取りしない
  await fails("console.log([1, 2].map(Math.abs));", /Array\.prototype\.map はコールバック/, "未対応");
  await ok("console.log([1, 2, 3].slice(1).toString(), Set([1]).union(Set([2])).size);", ["2,3 2"]);
});
test("FIX2a JS-B5-09/10: honest stops when host features are absent (child process)", async () => {
  const { spawnSync } = await import("node:child_process");
  const registryUrl = new URL("../js/types/registry.js", import.meta.url).href;
  const script = `
    delete globalThis.Float16Array;
    delete Math.f16round;
    delete DataView.prototype.getFloat16;
    delete DataView.prototype.setFloat16;
    delete JSON.rawJSON;
    delete RegExp.escape;
    const { getDefinition } = await import(${JSON.stringify(registryUrl)});
    const d = getDefinition("javascript");
    const cases = [
      "console.log(Float16Array([1.5]));",
      "console.log(Math.f16round(1.5));",
      "let dv = DataView(ArrayBuffer(4)); console.log(dv.getFloat16(0));",
      "let dv = DataView(ArrayBuffer(4)); dv.setFloat16(0, 1.5);",
      "console.log(JSON.stringify(JSON.rawJSON('123')));",
      "console.log(JSON.stringify({x: JSON.rawJSON('1.5')}));",
      "console.log(RegExp.escape('a.b'));",
      "console.log(Uint8Array.fromBase64('aGk=').toString(), Uint8Array([1]).toString(), Math.max(1, 2));",
    ];
    const out = [];
    for (const code of cases) {
      const r = await d.simulate(code, structuredClone(d.model.defaults));
      const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message + " [" + e.category + "]");
      out.push({ outs: (r.paths?.[0]?.outputs || []).map((o) => o.text), errs });
    }
    console.log(JSON.stringify(out));
  `;
  const proc = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: new URL("..", import.meta.url).pathname,
    encoding: "utf8",
    timeout: 60000,
  });
  assert.equal(proc.status, 0, proc.stderr);
  const results = JSON.parse(proc.stdout.trim().split("\n").pop());
  assert.match(results[0].errs[0], /^Float16Array は未対応です：ホストに実装がありません/, "Float16Array");
  assert.equal(results[0].errs[0].includes("未対応"), true);
  assert.match(results[1].errs[0], /^Math\.f16round は未対応です：ホストに実装がありません/);
  assert.match(results[2].errs[0], /^DataView\.prototype\.getFloat16 は未対応です：ホストに実装がありません/);
  assert.match(results[3].errs[0], /^DataView\.prototype\.setFloat16 は未対応です：ホストに実装がありません/);
  for (const i of [0, 1, 2, 3])
    assert.doesNotMatch(results[i].errs[0], /is not a function|view\[|host\[|Math\[fn\]/);
  // ホストに JSON.rawJSON が無くても stringify は生 JSON を返す（黙って undefined にしない）
  assert.deepEqual(results[4], { outs: ["123"], errs: [] });
  assert.deepEqual(results[5], { outs: ['{"x":1.5}'], errs: [] });
  // 既存の正直な停止・自前実装は壊れていない
  assert.match(results[6].errs[0], /^RegExp\.escape は未対応です：ホストに実装がありません/);
  assert.deepEqual(results[7], { outs: ["104,105 1 2"], errs: [] });
});
