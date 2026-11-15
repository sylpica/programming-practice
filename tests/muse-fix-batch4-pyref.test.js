// 修正バッチ4（Python追随班）回帰テスト。
// 対象：課題1＝F-02 リファレンス例外項目の完全性（エンジンが扱える全69名に項目を用意し、
//       名前単位で検索到達できること。CloudFormation 伝播と個票 reference-r2.json の同期を含む）／
//       課題2＝except 側ハンドラ名検証（未定義名→NameError／非例外→TypeError／変数経由・
//       タプル形・評価タイミングを実 CPython 3.12.3 の実走結果と一致させる）。
// 一次情報：docs.python.org 3.12「Built-in Exceptions」（階層・各例外の記述）と
// 実 CPython 3.12.3（当VM の python3）の実走突合せ（報告書 batch4-report-pyref.md に表を掲載）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { definitions, getDefinition } from "../js/types/registry.js";
import { REFERENCE } from "../js/types/python/reference.js";

const py = getDefinition("python");
const cf = getDefinition("cloudformation");
const run = async (def, code) =>
  def.simulate(code, structuredClone(def.model.defaults));
const outputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);
const errKind = (r) => {
  const e = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)[0];
  return e ? (e.message || String(e)).split("：")[0] : null;
};

// docs.python.org 3.12 の例外階層（親）。IOError／EnvironmentError は OSError の別名。
const PARENT = {
  BaseException: null, BaseExceptionGroup: "BaseException", GeneratorExit: "BaseException",
  KeyboardInterrupt: "BaseException", SystemExit: "BaseException", Exception: "BaseException",
  ArithmeticError: "Exception", FloatingPointError: "ArithmeticError", OverflowError: "ArithmeticError",
  ZeroDivisionError: "ArithmeticError", AssertionError: "Exception", AttributeError: "Exception",
  BufferError: "Exception", EOFError: "Exception", ExceptionGroup: "BaseExceptionGroup",
  ImportError: "Exception", ModuleNotFoundError: "ImportError", LookupError: "Exception",
  IndexError: "LookupError", KeyError: "LookupError", MemoryError: "Exception",
  NameError: "Exception", UnboundLocalError: "NameError", OSError: "Exception",
  BlockingIOError: "OSError", ChildProcessError: "OSError", ConnectionError: "OSError",
  BrokenPipeError: "ConnectionError", ConnectionAbortedError: "ConnectionError",
  ConnectionRefusedError: "ConnectionError", ConnectionResetError: "ConnectionError",
  FileExistsError: "OSError", FileNotFoundError: "OSError", InterruptedError: "OSError",
  IsADirectoryError: "OSError", NotADirectoryError: "OSError", PermissionError: "OSError",
  ProcessLookupError: "OSError", TimeoutError: "OSError", ReferenceError: "Exception",
  RuntimeError: "Exception", NotImplementedError: "RuntimeError", RecursionError: "RuntimeError",
  StopAsyncIteration: "Exception", StopIteration: "Exception", SyntaxError: "Exception",
  IndentationError: "SyntaxError", TabError: "IndentationError", SystemError: "Exception",
  TypeError: "Exception", ValueError: "Exception", UnicodeError: "ValueError",
  UnicodeDecodeError: "UnicodeError", UnicodeEncodeError: "UnicodeError",
  UnicodeTranslateError: "UnicodeError", Warning: "Exception", BytesWarning: "Warning",
  DeprecationWarning: "Warning", EncodingWarning: "Warning", FutureWarning: "Warning",
  ImportWarning: "Warning", PendingDeprecationWarning: "Warning", ResourceWarning: "Warning",
  RuntimeWarning: "Warning", SyntaxWarning: "Warning", UnicodeWarning: "Warning",
  UserWarning: "Warning", IOError: "OSError", EnvironmentError: "OSError",
};
const ALL_NAMES = Object.keys(PARENT);
const NEW_NAMES = [
  "BaseExceptionGroup", "ExceptionGroup", "GeneratorExit", "MemoryError", "BufferError",
  "FloatingPointError", "UnboundLocalError", "ReferenceError", "SystemError",
  "StopAsyncIteration", "SyntaxError", "IndentationError", "TabError",
  "UnicodeDecodeError", "UnicodeEncodeError", "UnicodeTranslateError",
  "BlockingIOError", "ChildProcessError", "ConnectionError", "BrokenPipeError",
  "ConnectionAbortedError", "ConnectionRefusedError", "ConnectionResetError",
  "FileExistsError", "InterruptedError", "IsADirectoryError", "NotADirectoryError",
  "PermissionError", "ProcessLookupError", "TimeoutError", "Warning", "UserWarning",
  "DeprecationWarning", "PendingDeprecationWarning", "FutureWarning", "ImportWarning",
  "SyntaxWarning", "RuntimeWarning", "UnicodeWarning", "EncodingWarning", "BytesWarning",
  "ResourceWarning", "IOError", "EnvironmentError",
];

// アプリのリファレンス検索述語（js/app.js の renderRefs／fullRefs と同一：
// name／category／description／syntax の小文字部分一致。バッチ4 文書班の明文化どおり）
const searchHit = (r, q) =>
  (r.name + " " + r.category + " " + r.description + " " + r.syntax)
    .toLowerCase()
    .includes(q.toLowerCase());

// ---------- 課題1：全例外名の項目存在と到達性 ----------
test("F-02(pyref): all 69 builtin exception names have a python reference item", () => {
  assert.equal(ALL_NAMES.length, 69);
  assert.equal(NEW_NAMES.length, 44);
  for (const name of ALL_NAMES) {
    const r = py.reference.find((x) => x.name === name);
    assert.ok(r, `missing reference item: ${name}`);
    assert.equal(r.category, "例外", name);
    assert.equal(r.supported, true, name);
  }
  assert.equal(py.reference.length, 213); // 166 + 例外44件 + 修正バッチ6 R27-N20 組み込み定数3件
});

test("F-02(pyref): every exception name reaches its own item via the app search predicate (0 unreachable)", () => {
  const unreachable = [];
  for (const name of ALL_NAMES) {
    const r = py.reference.find((x) => x.name === name);
    if (!r || !searchHit(r, name)) unreachable.push(name);
  }
  assert.deepEqual(unreachable, []);
});

test("F-02(pyref): new exception items state the correct parent class and official doc", () => {
  for (const name of NEW_NAMES) {
    const e = REFERENCE.find((x) => x.id === name);
    assert.ok(e, name);
    const parent = PARENT[name];
    assert.ok(
      e.summary.includes(parent),
      `${name}: summary does not name parent ${parent}: ${e.summary}`,
    );
    assert.equal(
      e.doc,
      `https://docs.python.org/ja/3.12/library/exceptions.html#${name}`,
      name,
    );
    assert.ok(e.syntax.includes(name), `${name}: syntax does not enumerate the name`);
  }
});

test("F-02(pyref): new exception examples run clean in python and match expected", async () => {
  for (const name of NEW_NAMES) {
    const e = REFERENCE.find((x) => x.id === name);
    const r = await run(py, e.example);
    assert.equal(errKind(r), null, `${name}: ${errKind(r)}`);
    assert.deepEqual(outputs(r), [e.expected], name);
  }
});

test("F-02(pyref): new exception items propagate to CloudFormation and their handler examples run clean", async () => {
  assert.equal(cf.reference.length, 224); // 177 + 伝播44件 + 修正バッチ6 R27-N20 組み込み定数3件の伝播
  for (const name of NEW_NAMES) {
    const r = cf.reference.find((x) => x.name === name);
    assert.ok(r, `missing in cloudformation: ${name}`);
    assert.ok(
      r.example.startsWith("def handler(event, context):"),
      `${name}: example is not handler-wrapped`,
    );
    const sim = await run(cf, r.example);
    assert.equal(errKind(sim), null, `${name} (cf): ${errKind(sim)}`);
    assert.ok(sim.paths.length >= 1, `${name} (cf): no paths`);
  }
});

// ---------- 課題1：個票 reference-r2.json の同期 ----------
const dumpsSorted = (fields) =>
  "{" +
  Object.keys(fields)
    .sort()
    .map((k) => `${JSON.stringify(k)}: ${JSON.stringify(fields[k])}`)
    .join(", ") +
  "}";
const shaOf = (fields) =>
  createHash("sha256").update(dumpsSorted(fields)).digest("hex");
const r2 = JSON.parse(
  readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"),
);

test("F-02(pyref): reference-r2 rows for python/cloudformation are fully in sync (fields + sha256)", () => {
  assert.equal(r2.length, 1260); // 919 + python 44 + cloudformation 44 + 修正バッチ6 R27-N20 python 3 + cloudformation 伝播3（統合時に追加）+ R27-N7 VBA 定数94 + 修正バッチ7 R28-N9 VBA 定数141 + 修正バッチ8 VBA 参照専用12
  for (const [kind, def] of [
    ["python", py],
    ["cloudformation", cf],
  ]) {
    const rows = r2.filter((x) => x.kind === kind);
    assert.equal(rows.length, def.reference.length, kind);
    const byName = new Map(def.reference.map((r) => [r.name, r]));
    for (const row of rows) {
      const ref = byName.get(row.name);
      assert.ok(ref, `${kind}/${row.name}: row without definition`);
      assert.equal(row.supported, ref.supported, `${kind}/${row.name} supported`);
      for (const f of ["description", "returns", "caution", "example", "source"])
        assert.equal(row.fields[f], ref[f], `${kind}/${row.name}.${f}`);
      assert.equal(row.sha256, shaOf(row.fields), `${kind}/${row.name} sha256`);
    }
  }
});

// ---------- 課題2：except ハンドラ名検証（実 CPython 3.12.3 突合せ） ----------
// expect は実 CPython 3.12.3 の実走結果（標準出力／最終エラーの種類）。
// 報告書 batch4-report-pyref.md の突合せ表と同一のケース集合。
const HANDLER_CASES = [
  // 例外が起きなければハンドラ式は評価されない
  ["no-raise fake handler", "try:\n    pass\nexcept FooError:\n    print('h')\nprint('after')", { out: ["after"] }],
  ["no-raise int handler", "try:\n    pass\nexcept int:\n    print('h')\nprint('after')", { out: ["after"] }],
  ["no-raise fake handler with finally", "try:\n    pass\nexcept FooError:\n    print('h')\nfinally:\n    print('fin')\nprint('after')", { out: ["fin", "after"] }],
  // 未定義名・非例外名
  ["fake handler", "try:\n    raise ValueError('v')\nexcept FooError:\n    print('h')", { err: "NameError" }],
  ["int handler", "try:\n    raise ValueError('v')\nexcept int:\n    print('h')", { err: "TypeError" }],
  ["str literal handler", "try:\n    raise ValueError('v')\nexcept 'ValueError':\n    print('h')", { err: "TypeError" }],
  ["plain class handler", "class Foo:\n    pass\ntry:\n    raise ValueError('v')\nexcept Foo:\n    print('h')", { err: "TypeError" }],
  ["call handler (instance)", "try:\n    raise ValueError('v')\nexcept ValueError('x'):\n    print('h')", { err: "TypeError" }],
  ["attr handler (math.pi)", "import math\ntry:\n    raise ValueError('v')\nexcept math.pi:\n    print('h')", { err: "TypeError" }],
  // タプル形：全要素を評価・検証してから照合する
  ["tuple (ValueError, FooError)", "try:\n    raise ValueError('v')\nexcept (ValueError, FooError):\n    print('h')", { err: "NameError" }],
  ["tuple (FooError, ValueError)", "try:\n    raise ValueError('v')\nexcept (FooError, ValueError):\n    print('h')", { err: "NameError" }],
  ["tuple (int, FooError) -> NameError wins", "try:\n    raise ValueError('v')\nexcept (int, FooError):\n    print('h')", { err: "NameError" }],
  ["tuple (ValueError, int) -> TypeError even on match", "try:\n    raise ValueError('v')\nexcept (ValueError, int):\n    print('h')", { err: "TypeError" }],
  ["tuple (KeyError, int) mismatch", "try:\n    raise ValueError('v')\nexcept (KeyError, int):\n    print('h')", { err: "TypeError" }],
  ["tuple plain catch", "try:\n    raise ValueError('v')\nexcept (KeyError, ValueError):\n    print('caught')", { out: ["caught"] }],
  ["tuple without parens", "try:\n    raise ValueError('v')\nexcept KeyError, ValueError:\n    print('caught')", { out: ["caught"] }],
  ["tuple with as", "try:\n    raise ValueError('v')\nexcept (KeyError, ValueError) as e:\n    print('caught')", { out: ["caught"] }],
  ["empty tuple never matches", "try:\n    raise ValueError('v')\nexcept ():\n    print('h')", { err: "ValueError" }],
  // ハンドラの評価順：先行が一致すれば後続は評価されない／不一致なら次が評価される
  ["first match skips bad second handler", "try:\n    raise ValueError('v')\nexcept ValueError:\n    print('v')\nexcept FooError:\n    print('f')\nprint('after')", { out: ["v", "after"] }],
  ["second handler evaluated after mismatch", "try:\n    raise KeyError('k')\nexcept ValueError:\n    print('v')\nexcept FooError:\n    print('f')", { err: "NameError" }],
  ["bad first handler blocks good second", "try:\n    raise ValueError('v')\nexcept (KeyError, int):\n    print('1')\nexcept ValueError:\n    print('2')", { err: "TypeError" }],
  // ハンドラ式のエラーは外側の try で捕捉でき、finally も実行される
  ["handler NameError caught by outer", "try:\n    try:\n        raise ValueError('v')\n    except FooError:\n        print('inner')\nexcept NameError:\n    print('outer NameError caught')", { out: ["outer NameError caught"] }],
  ["handler TypeError caught by outer", "try:\n    try:\n        raise ValueError('v')\n    except int:\n        print('inner')\nexcept TypeError:\n    print('outer TypeError caught')", { out: ["outer TypeError caught"] }],
  ["finally runs on handler error", "try:\n    try:\n        raise ValueError('v')\n    except FooError:\n        print('inner')\n    finally:\n        print('fin')\nexcept NameError:\n    print('outer')", { out: ["fin", "outer"] }],
  // 変数経由のハンドラ
  ["variable holding exception class", "E = ValueError\ntry:\n    raise ValueError('v')\nexcept E:\n    print('caught')", { out: ["caught"] }],
  ["variable in tuple", "E = ValueError\ntry:\n    raise ValueError('v')\nexcept (KeyError, E):\n    print('caught')", { out: ["caught"] }],
  ["variable mismatch propagates", "E = ValueError\ntry:\n    raise KeyError('k')\nexcept E:\n    print('caught')", { err: "KeyError" }],
  ["variable holding int class", "X = int\ntry:\n    raise ValueError('v')\nexcept X:\n    print('h')", { err: "TypeError" }],
  ["variable holding a number", "X = 5\ntry:\n    raise ValueError('v')\nexcept X:\n    print('h')", { err: "TypeError" }],
  ["variable holding None", "X = None\ntry:\n    raise ValueError('v')\nexcept X:\n    print('h')", { err: "TypeError" }],
  ["unbound local handler name", "def f():\n    try:\n        raise ValueError('v')\n    except E:\n        print('h')\n    E = ValueError\nf()", { err: "UnboundLocalError" }],
  // 壊さない表面：裸 except・正確名・親クラス・別名
  ["bare except", "try:\n    raise ValueError('v')\nexcept:\n    print('bare')", { out: ["bare"] }],
  ["parent class catch", "try:\n    raise PermissionError('x')\nexcept OSError:\n    print('caught')", { out: ["caught"] }],
  ["alias handler IOError for OSError", "try:\n    raise OSError('x')\nexcept IOError:\n    print('caught')", { out: ["caught"] }],
  ["exact name with as", "try:\n    raise ValueError('v')\nexcept ValueError as e:\n    print('caught')", { out: ["caught"] }],
];

for (const [label, code, expect] of HANDLER_CASES) {
  test(`except-handler (CPython 3.12.3 parity): ${label}`, async () => {
    const r = await run(py, code);
    if (expect.err) {
      assert.equal(errKind(r), expect.err, `${label}: outputs=${JSON.stringify(outputs(r))}`);
    } else {
      assert.equal(errKind(r), null, `${label}: unexpected error`);
      assert.deepEqual(outputs(r), expect.out, label);
    }
  });
}

test("except-handler: totals across all definitions stay 1327 after the propagation", () => {
  let n = 0;
  for (const d of definitions) n += d.reference.length;
  assert.equal(n, 1340); // 1086 + 修正バッチ6 R27-N20 組み込み定数3件×2種（Python＋CloudFormation伝播）+ R27-N7 VBA 定数94件 + 修正バッチ7 R28-N9 VBA 定数141件 + 修正バッチ8 13件（PowerShell 三項演算子1件＋VBA 参照専用12件）
});
