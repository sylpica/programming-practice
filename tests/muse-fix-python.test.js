import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
const run = async (code) => {
  const d = getDefinition("python");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const first = async (code) => {
  const r = await run(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const out = (p) => p.outputs.map((o) => o.text);
const errMsg = async (code) => {
  const r = await run(code);
  const e = r.error || r.paths?.[0]?.error;
  assert.ok(e, "expected an error for: " + JSON.stringify(code));
  return e.message || String(e);
};

// RG-11 (Python): leading-zero decimal integer literals are a SyntaxError
test("RG-11 leading-zero integer literals name the form and stop", async () => {
  for (const lit of ["077", "08", "09", "0123", "007", "0_1"]) {
    const m = await errMsg("print(" + lit + ")");
    assert.match(m, /SyntaxError/, lit);
    assert.ok(m.includes(lit), lit + " -> " + m);
  }
});
test("RG-11 zero, floats and radix literals keep working", async () => {
  const p = await first("print(0)\nprint(00)\nprint(0.5)\nprint(077.0)\nprint(0x10)\nprint(0o17)\nprint(0b101)\nprint(10)\nprint(1_000)");
  assert.deepEqual(out(p), ["0", "0", "0.5", "77.0", "16", "15", "5", "10", "1000"]);
});

// RG-15 (Python): keyword arguments are never silently ignored
test("RG-15 dict.get keyword argument is a TypeError naming it", async () => {
  assert.match(await errMsg('d = {"a": 1}\nprint(d.get("b", default=0))'), /TypeError/);
  assert.match(await errMsg('d = {"a": 1}\nprint(d.get("b", default=0))'), /default/);
  assert.match(await errMsg('d = {"a": 1}\nprint(d.pop("a", default=0))'), /default/);
  assert.match(await errMsg('d = {"a": 1}\nprint(d.setdefault("b", default=0))'), /default/);
  assert.match(await errMsg('d = {"a": 1}\nprint(d.get("a", 0, 1))'), /TypeError/);
  // positional form keeps working, update() keywords are real keys
  assert.deepEqual(out(await first('d = {"a": 1}\nprint(d.get("b", 5))')), ["5"]);
  assert.deepEqual(out(await first('d = {"a": 1}\nd.update(b=2)\nprint(d)')), ["{'a': 1, 'b': 2}"]);
});
test("RG-15 unknown keyword arguments on representative builtins/methods name the argument", async () => {
  for (const [code, kw] of [
    ["print(1, bogus=2)", "bogus"],
    ["print(len([1, 2], bogus=1))", "bogus"],
    ["x = [3, 1]\nprint(sorted(x, bogus=1))", "bogus"],
    ["x = [3, 1]\nx.sort(bogus=1)", "bogus"],
    ['s = "a,b"\nprint(s.split(bogus=1))', "bogus"],
    ['s = "hello"\nprint(s.upper(bogus=1))', "bogus"],
    ["print(sum([1, 2], bogus=10))", "bogus"],
    ["print(list(enumerate([10, 20], bogus=5)))", "bogus"],
    ["lst = [1, 2]\nlst.append(3, bogus=1)", "bogus"],
    ['print(int("10", bogus=1))', "bogus"],
  ]) {
    const m = await errMsg(code);
    assert.match(m, /TypeError/, code);
    assert.ok(m.includes(kw), code + " -> " + m);
  }
});
test("RG-15 legitimate keyword arguments keep working (and int base is honoured)", async () => {
  const p = await first('print(1, 2, sep="-")\nprint(sorted([3, 1], reverse=True))\nprint(round(1.567, ndigits=2))\nprint(sum([1, 2], start=10))\nprint(list(enumerate([10, 20], start=5)))\nprint(int("ff", base=16))\nprint(list(zip([1, 2], [3], strict=False)))\nprint(min([], default=0))\ns = "a,b"\nprint(s.split(sep=","))');
  assert.deepEqual(out(p), ["1-2", "[3, 1]", "1.57", "13", "[(5, 10), (6, 20)]", "255", "[(1, 3)]", "0", "['a', 'b']"]);
});

// RG-46: NaN equality follows CPython, identity shortcut preserved elsewhere
test("RG-46 NaN self comparison is False / True for !=", async () => {
  const p = await first("n = float('nan')\nprint(n == n)\nprint(n != n)\nprint(n <= n)\nprint(n >= n)\nprint(n < n)\nprint(n > n)\nprint(n == 1)\nprint(n != 1)");
  assert.deepEqual(out(p), ["False", "True", "False", "False", "False", "False", "False", "True"]);
});
test("RG-46 identity shortcut keeps its correct behaviour", async () => {
  const p = await first("n = float('nan')\nprint(n in [n])\nprint([n] == [n])\nx = [1, 2]\nprint(x == x)\ny = [1, 2]\nprint(x == y)\nprint(1 == 1.0)");
  assert.deepEqual(out(p), ["True", "True", "True", "True", "True"]);
});

// RG-36: tab / space mixed indentation
test("RG-36 mixed tab and space indentation in one block is an IndentationError", async () => {
  assert.match(await errMsg("if True:\n\tx = 1\n    y = 2\nprint(x)"), /IndentationError/);
  assert.match(await errMsg("if True:\n    x = 1\n\ty = 2\nprint(x)"), /IndentationError/);
  assert.match(await errMsg("if True:\n \tx = 1\nprint(x)"), /IndentationError/);
});
test("RG-36 tab-only and space-only blocks still run", async () => {
  assert.deepEqual(out(await first("if True:\n\tx = 1\n\ty = 2\nprint(x, y)")), ["1 2"]);
  assert.deepEqual(out(await first("if True:\n    x = 1\n    y = 2\nprint(x, y)")), ["1 2"]);
  // different blocks may use different styles (CPython accepts this)
  assert.deepEqual(out(await first("if True:\n\tx = 1\nif True:\n    y = 2\nprint(x, y)")), ["1 2"]);
});

// ---- RG-56（統合）: 代入文経由の深い式でも深さが原因として表示される ----
test("RG-56 deep expressions via assignment report depth, not a false syntax cause", async () => {
  const deep = "(".repeat(820) + "1" + ")".repeat(820);
  for (const code of [
    "x = " + deep,
    "x = " + "abs(".repeat(1200) + "-1" + ")".repeat(1200),
    "x = [y for y in " + deep.replace("1", "[1]") + "]",
  ]) {
    const msg = await errMsg(code);
    assert.match(msg, /入れ子が深すぎ/, code.slice(0, 30));
    assert.doesNotMatch(msg, /文の終わり方が正しくありません/);
  }
});

// ---- RG-65（統合）: 静的に確定した大きな range と while の打ち切り告知 ----
test("RG-65 N7 huge static range fabricates no zero-iteration path", async () => {
  const r = await run("total = 0\nfor i in range(200000):\n    total += i\nprint(total)");
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, "single representative path");
  assert.equal(r.truncated, true);
  assert.ok((r.reasons || []).length > 0);
  const p = r.paths[0];
  assert.notEqual(p.vars.total, "0");
  assert.match(String(p.vars.total), /不明/);
});
test("RG-65 N7 break inside a huge static range still exits truthfully", async () => {
  const p = await first("for i in range(200000):\n    if i == 1:\n        break\nprint('done')");
  assert.deepEqual(out(p), ["done"]);
});
test("RG-65 boundary range(100000) still executes fully", async () => {
  const p = await first("total = 0\nfor i in range(100000):\n    total += i\nprint(total)");
  assert.deepEqual(out(p), ["4999950000"]);
});
test("RG-65 N8 while truncation sets truncated and reasons", async () => {
  const r = await run("x = 0\nwhile True:\n    x += 1");
  assert.equal(r.truncated, true);
  assert.ok((r.reasons || []).length > 0);
  const r2 = await run("x = 0\nwhile x < 100000:\n    x += 1");
  assert.equal(r2.truncated, true);
});

// RG-82 (R21-N13): round() with negative ndigits is a defined, deterministic
// rounding in CPython (ties to even at the 10^(-ndigits) place). It must be
// computed exactly, not degraded to an unknown value.
test("RG-82 round() with negative ndigits matches CPython", async () => {
  const cases = [
    ["print(round(1250, -2))", "1200"],
    ["print(round(1350, -2))", "1400"],
    ["print(round(123.456, -1))", "120.0"],
    ["print(round(123.456, -2))", "100.0"],
    ["print(round(999, -2))", "1000"],
    ["print(round(450, -2))", "400"],
    ["print(round(550, -2))", "600"],
    ["print(round(15, -1))", "20"],
    ["print(round(25, -1))", "20"],
    ["print(round(5, -1))", "0"],
    ["print(round(40, -2))", "0"],
    ["print(round(-1250, -2))", "-1200"],
    ["print(round(-40.0, -2))", "-0.0"],
    ["print(round(0.4, -1))", "0.0"],
    ["print(round(1250, -10))", "0"],
  ];
  for (const [code, expected] of cases) {
    const p = await first(code);
    assert.deepEqual(out(p), [expected], code);
  }
});
test("RG-82 round() negative ndigits keeps working through variables", async () => {
  const p = await first("x = round(1250, -2)\nprint(x)");
  assert.deepEqual(out(p), ["1200"]);
});
