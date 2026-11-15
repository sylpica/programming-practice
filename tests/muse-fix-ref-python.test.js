// R22 リファレンス完全性修正（Python＋CloudFormation 担当）の検証。
// 報告書 reference-completeness-round22.md の Python 節・CloudFormation 節に対する処置を固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { REFERENCE } from "../js/types/python/reference.js";

const py = getDefinition("python");
const cf = getDefinition("cloudformation");
const run = async (d, code) => d.simulate(code, structuredClone(d.model.defaults));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));

const NEW_PY = [
  // 組み込み関数16
  "float", "bool", "reversed", "ord", "chr", "divmod", "pow", "any", "all",
  "repr", "hex", "bin", "oct", "format", "next", "iter",
  // str 26
  "str.upper", "str.lower", "str.title", "str.capitalize", "str.strip",
  "str.lstrip", "str.rstrip", "str.rsplit", "str.replace", "str.find",
  "str.index", "str.rfind", "str.rindex", "str.count", "str.startswith",
  "str.endswith", "str.isdigit", "str.isdecimal", "str.isnumeric",
  "str.isalpha", "str.isalnum", "str.isspace", "str.isascii",
  "str.isidentifier", "str.islower", "str.isupper",
  // list 9
  "list.extend", "list.insert", "list.pop", "list.remove", "list.index",
  "list.count", "list.reverse", "list.copy", "list.clear",
  // dict 8
  "dict.keys", "dict.values", "dict.update", "dict.pop", "dict.setdefault",
  "dict.popitem", "dict.copy", "dict.clear",
  // set 14
  "set.add", "set.remove", "set.discard", "set.update", "set.clear",
  "set.pop", "set.intersection_update", "set.difference_update",
  "set.symmetric_difference_update", "set.union", "set.intersection",
  "set.difference", "set.symmetric_difference", "set.copy",
  // tuple / range 4
  "tuple.count", "tuple.index", "range.count", "range.index",
  // 構文12（global／nonlocal は global の1項目）
  "def", "class", "return", "break", "continue", "pass", "del", "assert",
  "raise", "global", "comprehension", "f-string",
  // math 4
  "math.sqrt", "math.fabs", "math.floor", "math.ceil",
  // 例外 25
  "Exception", "BaseException", "ValueError", "TypeError", "KeyError",
  "IndexError", "ZeroDivisionError", "NameError", "AttributeError",
  "RuntimeError", "StopIteration", "AssertionError", "ImportError",
  "ModuleNotFoundError", "OSError", "FileNotFoundError",
  "NotImplementedError", "ArithmeticError", "LookupError", "OverflowError",
  "RecursionError", "UnicodeError", "EOFError", "KeyboardInterrupt",
  "SystemExit",
];
const NEW_CF = ["region", "accountId", "transformId", "errorMessage"];
// フォールバック受理のみ（項目化しない裁定）
const FALLBACK_BUILTINS = [
  "ascii", "breakpoint", "bytearray", "bytes", "callable", "classmethod",
  "compile", "complex", "delattr", "dir", "eval", "exec", "frozenset",
  "getattr", "globals", "hasattr", "hash", "help", "id", "issubclass",
  "locals", "memoryview", "object", "property", "setattr", "slice",
  "staticmethod", "super", "vars",
];
const FALLBACK_METHODS = [
  "str.casefold", "str.center", "str.encode", "str.expandtabs",
  "str.format_map", "str.isprintable", "str.istitle", "str.ljust",
  "str.maketrans", "str.partition", "str.removeprefix", "str.removesuffix",
  "str.rjust", "str.rpartition", "str.splitlines", "str.swapcase",
  "str.translate", "str.zfill", "dict.fromkeys", "set.isdisjoint",
  "set.issubset", "set.issuperset",
];

test("R22-ref python: totals after additions", () => {
  assert.equal(NEW_PY.length, 118);
  assert.equal(py.reference.length, 166); // 42 + 118 + 5 (R23-N6 math 定数) + 1 (修正バッチ3 数値の属性)
  assert.equal(cf.reference.length, 177); // 49 + 118 (Python伝播) + 4 (固有) + 5 (R23-N6 伝播) + 1 (修正バッチ3 数値の属性 伝播)
});

test("R22-ref python: every new item exists and is supported", () => {
  for (const id of NEW_PY) {
    const r = py.reference.find((x) => x.name === id);
    assert.ok(r, `missing python reference: ${id}`);
    assert.equal(r.supported, true, `not supported: ${id}`);
    assert.ok(r.description && r.returns && r.example && r.source, `fields incomplete: ${id}`);
    assert.match(r.source, /^https:\/\/docs\.python\.org\//, `doc not official: ${id}`);
  }
});

test("R22-ref python: new examples run clean and match expected", async () => {
  for (const id of NEW_PY) {
    const e = REFERENCE.find((x) => x.id === id);
    const r = await run(py, e.example);
    assert.deepEqual(errors(r), [], `${id}: ${JSON.stringify(errors(r))}`);
    assert.equal(r.paths.length, 1, `${id}: paths`);
    assert.equal(outputs(r)[0].join("\n"), e.expected, `${id}: expected mismatch`);
  }
});

test("R22-ref python: new examples also run inside a CloudFormation handler", async () => {
  for (const id of NEW_PY) {
    const ref = cf.reference.find((x) => x.name === id);
    assert.ok(ref, `missing in cloudformation: ${id}`);
    const r = await run(cf, ref.example);
    assert.deepEqual(errors(r), [], `${id} (cf): ${JSON.stringify(errors(r))}`);
    assert.ok(r.paths.length >= 1, `${id} (cf): no paths`);
  }
});

test("R22-ref python: scan resolves new builtin names", () => {
  for (const [code, want] of [
    ['print(float("1.5"))', "float"],
    ["print(bool(1))", "bool"],
    ["print(pow(2, 3))", "pow"],
    ["print(list(reversed([1])))", "reversed"],
    ["print(next(iter([1])))", "next"],
    ["print(divmod(7, 2))", "divmod"],
    ["print(any([1]))", "any"],
  ]) {
    assert.ok(py.scan(code).includes(want), `scan ${code} should include ${want}`);
  }
});

// アプリ側 resolveReferenceName（js/app.js）と同じ規則：ドット区切り名は
// そのまま、または末尾側の部分名でリファレンス名に解決される。
function resolveReferenceName(name, referenceNames) {
  if (referenceNames.indexOf(name) >= 0) return name;
  const parts = name.split(".");
  for (let i = 1; i < parts.length; i++) {
    const candidate = parts.slice(i).join(".");
    if (referenceNames.indexOf(candidate) >= 0) return candidate;
  }
  return null;
}

test("R22-ref python: method names resolve to their items", () => {
  const names = py.reference.map((r) => r.name);
  const methods = NEW_PY.filter((id) => id.includes("."));
  assert.ok(methods.length >= 60);
  for (const id of methods) {
    // 完全なドット名（str.strip 等）がそのまま項目に解決される
    assert.equal(resolveReferenceName(id, names), id, `unresolved: ${id}`);
    // エンジンが dynCalls／collectUsed で出す末尾名（strip 等）からは、
    // その末尾名を持つ項目群（型ごとの同名メソッドを含む）に到達できる
    const short = id.split(".").at(-1);
    const owners = names.filter((n) => n.split(".").at(-1) === short);
    assert.ok(owners.includes(id), `short name ${short} does not reach ${id}`);
  }
});

test("R22-ref python: with text matches the partial-execution implementation", async () => {
  const w = py.reference.find((r) => r.name === "with");
  assert.equal(w.supported, true); // RA-20: 分類を実挙動（本文を実行する部分対応）に一致させた
  assert.match(w.caution, /部分対応/);
  assert.match(w.caution, /本文は実行される/);
  assert.doesNotMatch(w.caution, /未対応として停止します。$/);
  // 項目の使用例は部分実行の実態どおりエラーなく本文が実行される
  const e = REFERENCE.find((x) => x.id === "with");
  const r = await run(py, e.example);
  assert.deepEqual(errors(r), []);
  assert.equal(outputs(r)[0].join("\n"), e.expected);
  // 一方で open との組み合わせは open 自体が未対応のため停止する（従来どおり）
  const r2 = await run(py, 'with open("model.txt") as f:\n    print(7)');
  assert.ok(errors(r2).length);
});

test("R22-ref cloudformation: four intrinsic items exist with contracts", async () => {
  for (const name of NEW_CF) {
    const r = cf.reference.find((x) => x.name === name);
    assert.ok(r, `missing cloudformation reference: ${name}`);
    assert.equal(r.supported, true, `not supported: ${name}`);
    assert.ok(r.description && r.returns && r.example, `fields incomplete: ${name}`);
    assert.match(r.source, /^https:\/\/docs\.aws\.amazon\.com\//, `source not AWS: ${name}`);
    const sim = await run(cf, r.example);
    assert.deepEqual(errors(sim), [], `${name}: ${JSON.stringify(errors(sim))}`);
  }
  // errorMessage は失敗応答の理由として実際に読まれる
  const m = structuredClone(cf.model.defaults);
  m.macros.Fail =
    'def handler(event, context):\n    return {"requestId": event["requestId"], "status": "failure", "errorMessage": "変換できませんでした", "fragment": event["fragment"]}';
  const rr = await cf.simulate('{"Transform":"Fail"}', m);
  assert.ok(errors(rr).some((e) => /変換できませんでした/.test(e.message)), JSON.stringify(errors(rr)));
});

test("R22-ref python: fallback-only names stay unitemized by design", () => {
  const names = new Set(py.reference.map((r) => r.name));
  for (const n of FALLBACK_BUILTINS) assert.ok(!names.has(n), `should not be itemized: ${n}`);
  for (const n of FALLBACK_METHODS) assert.ok(!names.has(n), `should not be itemized: ${n}`);
  // フォールバック受理の実態：名前は受理されるが呼び出しは未対応として止まる
  return (async () => {
    const r = await run(py, 'print(ascii("a"))');
    assert.ok(errors(r).some((e) => /未対応/.test(e.message)));
    const r2 = await run(py, 's = "Ab"\nprint(s.casefold())');
    assert.ok(errors(r2).some((e) => /casefold/.test(e.message)));
  })();
});
