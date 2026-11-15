// バッチ3（Python 班）修正の回帰テスト。
// 対象：R24-N7（例外階層照合）／R24-N23（from-import の確定計算と import *）／
// §3.2（数値属性の項目化と bool の numerator／denominator 是正）／
// R24-N37・N38（next／dict.pop の syntax 是正）。
// 一次情報：docs.python.org 3.12 と実 CPython 3.12 の挙動。
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getDefinition } from "../js/types/registry.js";
import { REFERENCE } from "../js/types/python/reference.js";

const py = getDefinition("python");
const cf = getDefinition("cloudformation");
const run = async (d, code) => d.simulate(code, structuredClone(d.model.defaults));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));

// ---------- R24-N7：例外階層照合 ----------
const HIERARCHY_CASES = [
  // [子（実発生形）, 親ハンドラ, 捕捉されるべきか]
  ["try:\n    x = [1][5]\nexcept LookupError:\n    print('caught')", true], // IndexError <- LookupError
  ["try:\n    d = {}\n    print(d['k'])\nexcept LookupError:\n    print('caught')", true], // KeyError <- LookupError
  ["try:\n    x = 1 / 0\nexcept ArithmeticError:\n    print('caught')", true], // ZeroDivisionError <- ArithmeticError
  ["try:\n    raise OverflowError('x')\nexcept ArithmeticError:\n    print('caught')", true],
  ["try:\n    raise FileNotFoundError('x')\nexcept OSError:\n    print('caught')", true],
  ["try:\n    raise NotImplementedError('x')\nexcept RuntimeError:\n    print('caught')", true],
  ["try:\n    raise RecursionError('x')\nexcept RuntimeError:\n    print('caught')", true],
  ["try:\n    raise UnicodeError('x')\nexcept ValueError:\n    print('caught')", true],
  ["try:\n    raise ModuleNotFoundError('x')\nexcept ImportError:\n    print('caught')", true],
  ["try:\n    raise KeyError('k')\nexcept Exception:\n    print('caught')", true],
  ["try:\n    raise KeyboardInterrupt()\nexcept BaseException:\n    print('caught')", true],
  // BaseException 直下は Exception で捕捉されない
  ["try:\n    raise KeyboardInterrupt()\nexcept Exception:\n    print('caught')", false],
  ["try:\n    raise SystemExit(0)\nexcept Exception:\n    print('caught')", false],
  // 無関係な親では捕捉されない
  ["try:\n    raise ValueError('x')\nexcept LookupError:\n    print('caught')", false],
];
for (const [code, caught] of HIERARCHY_CASES) {
  test(`R24-N7 hierarchy: ${code.split("\n")[1]?.trim()} -> caught=${caught}`, async () => {
    const r = await run(py, code);
    if (caught) {
      assert.deepEqual(errors(r), []);
      assert.deepEqual(outputs(r), [["caught"]]);
    } else {
      assert.equal(outputs(r).flat().includes("caught"), false);
      assert.ok(errors(r).length > 0, "exception must propagate");
    }
  });
}
test("R24-N7: UnboundLocalError is caught by except NameError", async () => {
  const r = await run(py, "def f():\n    try:\n        print(y)\n    except NameError:\n        print('caught')\n    y = 1\nf()");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["caught"]]);
});
test("R24-N7: tuple form with a parent class, as/else/finally unchanged", async () => {
  const r = await run(py, "try:\n    d = {}\n    print(d['k'])\nexcept (LookupError, TypeError) as e:\n    print('caught')\nelse:\n    print('else')\nfinally:\n    print('fin')");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["caught", "fin"]]);
  const ok = await run(py, "try:\n    print('body')\nexcept LookupError:\n    print('bad')\nelse:\n    print('else')\nfinally:\n    print('fin')");
  assert.deepEqual(outputs(ok), [["body", "else", "fin"]]);
});

// ---------- R24-N23：from-import ----------
test("R24-N23: from math import sqrt computes like math.sqrt", async () => {
  const r = await run(py, "from math import sqrt\nprint(sqrt(9))");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["3.0"]]);
  const attr = await run(py, "import math\nprint(math.sqrt(9))");
  assert.deepEqual(outputs(attr), outputs(r));
});
test("R24-N23: from-import alias and multiple names", async () => {
  const r = await run(py, "from math import fabs as f, floor, ceil\nprint(f(-2.5), floor(2.7), ceil(2.1))");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["2.5 2 3"]]);
});
test("R24-N23: from math import * imports public names", async () => {
  const r = await run(py, "from math import *\nprint(sqrt(16), pi, floor(2.7), fabs(-3))");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["4.0 3.141592653589793 2 3.0"]]);
});
test("R24-N23: from-import of an indeterminate function stays indeterminate like the attribute form", async () => {
  const a = await run(py, "from math import sin\nprint(sin(0.5))");
  const b = await run(py, "import math\nprint(math.sin(0.5))");
  assert.deepEqual(errors(a), []);
  assert.deepEqual(outputs(a), outputs(b));
});

// ---------- §3.2：数値属性 ----------
// 実 CPython 3.12 で確認した全12組合せ。
const NUMERIC_PROPS = [
  // [式, 期待出力 or AttributeError]
  ["print((5).real, (5).imag, (5).numerator, (5).denominator)", "5 0 5 1"],
  ["print((1.5).real, (1.5).imag)", "1.5 0.0"],
  ["print((1.5).numerator)", "AttributeError"],
  ["print((1.5).denominator)", "AttributeError"],
  ["print(True.real, True.imag, True.numerator, True.denominator)", "1 0 1 1"],
  ["print(False.real, False.imag, False.numerator, False.denominator)", "0 0 0 1"],
];
for (const [code, want] of NUMERIC_PROPS) {
  test(`§3.2 numeric props: ${code}`, async () => {
    const r = await run(py, code);
    if (want === "AttributeError") {
      assert.ok(errors(r).some((e) => e.includes("AttributeError")), JSON.stringify(errors(r)));
    } else {
      assert.deepEqual(errors(r), []);
      assert.deepEqual(outputs(r), [[want]]);
    }
  });
}
test("§3.2: bundled reference item for numeric attributes exists and is accurate", async () => {
  const item = REFERENCE.find((r) => r.id === "数値の属性");
  assert.ok(item, "missing bundled item");
  for (const key of ["summary", "syntax", "args", "returns", "example", "expected", "pitfalls", "doc"])
    assert.ok(item[key], `field missing: ${key}`);
  assert.match(item.doc, /^https:\/\/docs\.python\.org\//);
  for (const name of ["real", "imag", "numerator", "denominator"])
    assert.ok(item.summary.includes(name) || item.syntax.includes(name), `not explained: ${name}`);
  const r = await run(py, item.example);
  assert.deepEqual(errors(r), []);
  assert.equal(outputs(r)[0].join("\n"), item.expected);
  // CloudFormation 伝播先でも例が動く（監査テストと同じ条件）。
  const cfRef = cf.reference.find((x) => x.name === "数値の属性");
  assert.ok(cfRef, "not propagated to cloudformation");
  const rc = await run(cf, cfRef.example);
  assert.deepEqual(errors(rc), []);
});

// ---------- 個票 r2 同期 ----------
// 正規方式：fields の JSON をキーソートした sha256
// （Python json.dumps(ensure_ascii=False, sort_keys=True) と等価な直列化）。
const dumpsSorted = (fields) =>
  "{" + Object.keys(fields).sort().map((k) => `${JSON.stringify(k)}: ${JSON.stringify(fields[k])}`).join(", ") + "}";
const shaOf = (fields) => createHash("sha256").update(dumpsSorted(fields)).digest("hex");
const r2 = JSON.parse(readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"));
test("§3.2/R24-N7: r2 python rows are in sync for the new item and corrected cautions", () => {
  const byName = new Map(py.reference.map((r) => [r.name, r]));
  for (const name of ["数値の属性", "Exception", "NameError", "ModuleNotFoundError", "FileNotFoundError", "ArithmeticError", "LookupError", "UnicodeError", "KeyboardInterrupt", "SystemExit"]) {
    const row = r2.find((x) => x.kind === "python" && x.name === name);
    assert.ok(row, `r2 row missing: ${name}`);
    const ref = byName.get(name);
    assert.equal(row.fields.description, ref.description, name);
    assert.equal(row.fields.caution, ref.caution, name);
    assert.equal(row.fields.example, ref.example, name);
    assert.equal(row.sha256, shaOf(row.fields), `sha mismatch: ${name}`);
  }
  assert.equal(r2.filter((x) => x.kind === "python").length, py.reference.length);
});

// ---------- R24-N37/N38：syntax 是正 ----------
test("R24-N37/N38: next and dict.pop syntax no longer imply a None default", () => {
  const next = REFERENCE.find((r) => r.id === "next");
  assert.equal(next.syntax, "next(iterator)\nnext(iterator, default)");
  const pop = REFERENCE.find((r) => r.id === "dict.pop");
  assert.equal(pop.syntax, "dict.pop(key[, default])");
});
