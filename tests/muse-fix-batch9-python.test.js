// 修正バッチ9（Python 班）回帰テスト。
// 対象：R30-P-N1（N3：呼出し深さ上限の RecursionError 化）／
//       R30F01B-N1（N26：tuple.index の start／stop）／
//       R30F01B-N2（N27：reversed() の受理範囲）／
//       R30F01B-N3（N28：format() の不正書式を ValueError 化）／
//       R30F01B-N4（N29：type() の3引数形）。
// 一次情報：実 CPython 3.12.3（当 VM の python3）で全期待値を機械突合した。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/python/index.js";

const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const outputs = (r) => (r.paths || []).flatMap((p) => p.outputs.map((o) => o.text));
const errText = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message || String(e))
    .join("\n");
const traceKinds = (r) => (r.paths || []).flatMap((p) => p.trace.map((t) => t.kind));

// ---------- N3（R30-P-N1）：呼出し深さ上限は RecursionError ----------
const SUM_DEF = "def s(k):\n    return 0 if k == 0 else k + s(k - 1)\n";
const INF_DEF = "def f(n):\n    return f(n + 1)\n";

test("N3: recursion within the limit completes exactly (s(39) = 780)", async () => {
  const r = await run(SUM_DEF + "print(s(39))");
  assert.deepEqual(outputs(r), ["780"]);
  assert.equal(r.truncated, false);
  assert.equal(errText(r), "");
});

test("N3: finite recursion past the limit stops honestly, no fabricated completion (s(40))", async () => {
  const r = await run(SUM_DEF + "print(s(40))");
  assert.equal(r.truncated, true);
  assert.match(errText(r), /RecursionError/);
  assert.ok(!outputs(r).includes("820"), "must not print the CPython-correct value it did not compute");
  assert.ok(traceKinds(r).includes("limit"), "must leave a limit-kind trace like other caps");
});

test("N3: infinite recursion raises RecursionError and print never runs", async () => {
  const r = await run(INF_DEF + "print(f(1))");
  assert.equal(r.truncated, true);
  assert.match(errText(r), /RecursionError/);
  assert.ok(traceKinds(r).includes("limit"));
});

test("N3: RecursionError is catchable by user try/except and execution continues", async () => {
  const r = await run(INF_DEF + "try:\n    print(f(1))\nexcept RecursionError:\n    print('caught')\nprint('after')");
  assert.deepEqual(outputs(r), ["caught", "after"]);
  assert.equal(r.truncated, false);
  assert.equal(errText(r), "");
});

test("N3: RecursionError is catchable via parent RuntimeError and as-binding carries the message", async () => {
  const r1 = await run(INF_DEF + "try:\n    print(f(1))\nexcept RuntimeError:\n    print('caught-rt')");
  assert.deepEqual(outputs(r1), ["caught-rt"]);
  const r2 = await run(INF_DEF + "try:\n    print(f(1))\nexcept RecursionError as e:\n    print(e)");
  assert.deepEqual(outputs(r2), ["maximum recursion depth exceeded"]);
});

test("N3: call chain of exactly 40 nested calls completes; fib(15) stays exact", async () => {
  const chain = Array.from({ length: 40 }, (_, i) =>
    `def f${i}(x):\n    return ${i === 39 ? "x + 1" : `f${i + 1}(x) + 1`}`,
  ).join("\n") + "\nprint(f0(0))";
  const r = await run(chain);
  assert.deepEqual(outputs(r), ["40"]);
  assert.equal(r.truncated, false);
  const rf = await run("def fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\nprint(fib(15))");
  assert.deepEqual(outputs(rf), ["610"]);
});

test("N3: user-raised RecursionError is a normal error, not a truncation", async () => {
  const r = await run("try:\n    raise RecursionError('bad')\nexcept RecursionError:\n    print('user-caught')");
  assert.deepEqual(outputs(r), ["user-caught"]);
  assert.equal(r.truncated, false);
  const r2 = await run("raise RecursionError('bad')");
  assert.match(errText(r2), /RecursionError/);
  assert.equal(r2.truncated, false);
});

// ---------- N26（R30F01B-N1）：tuple.index の start／stop ----------
const TUPLE_INDEX = [
  ["start honored", "t = (1, 2, 2)\nprint(t.index(2, 2))", ["2"]],
  ["stop honored", "t = (2, 2, 2)\nprint(t.index(2, 1, 2))", ["1"]],
  ["negative start", "t = (1, 2, 1)\nprint(t.index(1, -1))", ["2"]],
  ["no args range (existing example)", "print((10, 20, 30).index(20))", ["1"]],
];
for (const [label, code, want] of TUPLE_INDEX) {
  test(`N26: tuple.index ${label}`, async () => {
    const r = await run(code);
    assert.deepEqual(outputs(r), want);
    assert.equal(errText(r), "");
  });
}
test("N26: tuple.index outside the start/stop window raises ValueError like CPython", async () => {
  const r = await run("t = (1, 2, 2)\nprint(t.index(1, 1))");
  assert.deepEqual(outputs(r), []);
  assert.match(errText(r), /ValueError/);
  const r2 = await run("t = (1, 2)\nprint(t.index(9))");
  assert.match(errText(r2), /ValueError/);
});

// ---------- N27（R30F01B-N2）：reversed() の受理範囲 ----------
const REV_OK = [
  ["list", "print(list(reversed([1, 2, 3])))", ["[3, 2, 1]"]],
  ["tuple", "print(list(reversed((1, 2))))", ["[2, 1]"]],
  ["str", "print(list(reversed('abc')))", ["['c', 'b', 'a']"]],
  ["range", "print(list(reversed(range(3))))", ["[2, 1, 0]"]],
  ["dict keys", "print(list(reversed({'a': 1, 'b': 2})))", ["['b', 'a']"]],
  ["dict keys view", "d = {'a': 1, 'b': 2}\nprint(list(reversed(d.keys())))", ["['b', 'a']"]],
  ["custom __len__+__getitem__", "class S:\n    def __len__(self):\n        return 3\n    def __getitem__(self, i):\n        return [10, 20, 30][i]\nprint(list(reversed(S())))", ["[30, 20, 10]"]],
  ["custom __reversed__", "class R:\n    def __reversed__(self):\n        return iter([3, 2, 1])\nprint(list(reversed(R())))", ["[3, 2, 1]"]],
];
for (const [label, code, want] of REV_OK) {
  test(`N27: reversed() accepts ${label}`, async () => {
    const r = await run(code);
    assert.deepEqual(outputs(r), want);
    assert.equal(errText(r), "");
  });
}
const REV_NG = [
  ["set", "print(list(reversed({1, 2})))"],
  ["list iterator", "print(list(reversed(iter([1, 2, 3]))))"],
  ["generator", "print(list(reversed((x for x in [1, 2]))))"],
  ["map object", "print(list(reversed(map(str, [1, 2]))))"],
  ["filter object", "print(list(reversed(filter(None, [1, 2]))))"],
  ["zip object", "print(list(reversed(zip([1, 2]))))"],
  ["enumerate object", "print(list(reversed(enumerate([1, 2]))))"],
  ["reversed iterator itself", "print(list(reversed(reversed([1, 2]))))"],
  ["int", "print(list(reversed(5)))"],
  ["plain instance", "class C:\n    pass\nprint(list(reversed(C())))"],
];
for (const [label, code] of REV_NG) {
  test(`N27: reversed() rejects ${label} with TypeError like CPython`, async () => {
    const r = await run(code);
    assert.deepEqual(outputs(r), []);
    assert.match(errText(r), /TypeError/);
  });
}

// ---------- N28（R30F01B-N3）：format() の不正書式 ----------
const FMT_VALUE_ERROR = [
  ["unknown code for int", "print(format(5, 'q'))"],
  ["numeric code for str", "print(format('a', 'd'))"],
  ["hex code for str", "print(format('a', 'x'))"],
  ["d for float", "print(format(5.5, 'd'))"],
  ["s for int", "print(format(5, 's'))"],
  ["s for bool", "print(format(True, 's'))"],
  ["precision for integer", "print(format(5, '.2d'))"],
  ["sign for str", "print(format('a', '+s'))"],
  ["alt for str", "print(format('a', '#s'))"],
  ["= alignment for str", "print(format('a', '=5'))"],
  ["grouping for str", "print(format('a', ',s'))"],
  ["z for str", "print(format('a', 'z'))"],
  ["malformed spec", "print(format(5, '10.2.3f'))"],
];
for (const [label, code] of FMT_VALUE_ERROR) {
  test(`N28: format() ${label} raises ValueError like CPython`, async () => {
    const r = await run(code);
    assert.deepEqual(outputs(r), []);
    assert.match(errText(r), /ValueError/);
  });
}
test("N28: format() with a spec on a list and a non-str spec raise TypeError like CPython", async () => {
  const r = await run("print(format([1], '>5'))");
  assert.match(errText(r), /TypeError/);
  const r2 = await run("print(format(5, 5))");
  assert.match(errText(r2), /TypeError/);
});
const FMT_OK = [
  ["float .2f (reference example)", "print(format(3.14159, '.2f'))", ["3.14"]],
  ["zero-padded hex", "print(format(255, '08x'))", ["000000ff"]],
  ["percent", "print(format(0.25, '%'))", ["25.000000%"]],
  ["bool as int (CPython: '1')", "print(format(True, 'd'))", ["1"]],
  ["bool empty spec (CPython: 'True')", "print(format(True, ''))", ["True"]],
  ["bool padded as int", "print(format(True, '>5'))", ["    1"]],
  ["str width", "print(format('a', '>5'))", ["    a"]],
  ["list empty spec is str()", "print(format([1], ''))", ["[1]"]],
  ["f-string valid spec", "print(f'{3.14159:.2f}')", ["3.14"]],
];
for (const [label, code, want] of FMT_OK) {
  test(`N28: format() ${label} still computes`, async () => {
    const r = await run(code);
    assert.deepEqual(outputs(r), want);
    assert.equal(errText(r), "");
  });
}
test("N28: format() invalid spec is catchable as ValueError; valid-but-unsupported 'g' stays unknown, not an error", async () => {
  const r = await run("try:\n    print(format(5, 'q'))\nexcept ValueError:\n    print('ve-caught')");
  assert.deepEqual(outputs(r), ["ve-caught"]);
  const rg = await run("print(format(5.5, 'g'))");
  assert.equal(errText(rg), "");
  assert.ok(outputs(rg)[0].includes("実行時に決まる"), "g is valid but unsupported: must stay honestly unknown");
  const rf = await run("print(f'{5:q}')");
  assert.match(errText(rf), /ValueError/);
});

// ---------- N29（R30F01B-N4）：type() の3引数形 ----------
test("N29: type('A', (), {}) creates a class; type(A()) reports it (finding's repro)", async () => {
  const r = await run("A = type('A', (), {})\nprint(type(A()))");
  assert.deepEqual(outputs(r), ["<class 'A'>"]);
  assert.equal(errText(r), "");
});
test("N29: attributes from the namespace dict are readable on class and instance", async () => {
  const r = await run("A = type('A', (), {'x': 42})\nprint(A().x)\nprint(A.x)");
  assert.deepEqual(outputs(r), ["42", "42"]);
});
test("N29: methods and __init__ from the namespace dict work through the existing class machinery", async () => {
  const r = await run("def greet(self):\n    return 'hi'\nA = type('A', (), {'greet': greet})\nprint(A().greet())");
  assert.deepEqual(outputs(r), ["hi"]);
  const r2 = await run("def init(self, v):\n    self.v = v\nC = type('C', (), {'__init__': init})\nprint(C(99).v)");
  assert.deepEqual(outputs(r2), ["99"]);
});
test("N29: isinstance follows the dynamic class and its user-class bases; type() returns the real class", async () => {
  const r = await run("A = type('A', (), {'x': 42})\nB = type('B', (A,), {'y': 7})\nb = B()\nprint(b.x, b.y)\nprint(isinstance(b, A), isinstance(b, B))\nprint(isinstance(A(), A))");
  assert.deepEqual(outputs(r), ["42 7", "True True", "True"]);
  const r2 = await run("A = type('A', (), {})\nprint(type(A()) == A)\nprint(type(A()) is A)");
  assert.deepEqual(outputs(r2), ["True", "True"]);
});
test("N29: builtin base is honoured by isinstance (value semantics are not reproduced)", async () => {
  const r = await run("B = type('B', (int,), {})\nprint(isinstance(B(), int))\nprint(isinstance(B(), object))");
  assert.deepEqual(outputs(r), ["True", "True"]);
});
test("N29: invalid 3-arg calls raise TypeError with truthful reasons; 2-arg form names the real rule", async () => {
  for (const code of ["A = type('A', ())", "A = type(123, (), {})", "A = type('A', 123, {})", "A = type('A', (), [])", "A = type('A', (5,), {})"]) {
    const r = await run(code);
    assert.match(errText(r), /TypeError/, code);
    assert.ok(!errText(r).includes("1 個必要ですが、3 個"), `false arity reason must be gone: ${code}`);
  }
});
test("N29: one-arg type() and class statements are unchanged", async () => {
  const r = await run("print(type(3.5).__name__)\nclass P:\n    x = 5\nprint(P().x)\nprint(isinstance(P(), P))");
  assert.deepEqual(outputs(r), ["float", "5", "True"]);
  assert.equal(errText(r), "");
});
