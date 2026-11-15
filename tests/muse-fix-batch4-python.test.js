// バッチ4（Python 班）修正の回帰テスト。
// 対象：R25-N1（例外名前空間の根治）／R25-N5（simulate の変換層）／
// R25-N13（import 説明文面の是正）／R25-N23（from-import の実在検証）。
// 一次情報：docs.python.org 3.12「Built-in Exceptions」の例外階層と
// 実 CPython 3.12.3 の __mro__／実走挙動（報告書 batch4-report-python.md に突合せ記録）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const py = getDefinition("python");
const run = async (code, model) =>
  py.simulate(code, model === undefined ? structuredClone(py.model.defaults) : model);
const errText = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message || String(e))
    .join("\n");
const outputs = (r) => (r.paths || []).map((p) => p.outputs.map((o) => o.text));
const traceText = (r) =>
  (r.paths || []).flatMap((p) => p.trace.map((t) => t.text)).join("\n");

// ---------- R25-N1：全組み込み例外の階層マトリクス ----------
// 親子関係は docs.python.org 3.12 の例外階層図と実 CPython 3.12.3 の __mro__ から転記。
// IOError／EnvironmentError は OSError の別名（同一クラス）。
const PARENT = {
  BaseException: null, BaseExceptionGroup: "BaseException", GeneratorExit: "BaseException",
  KeyboardInterrupt: "BaseException", SystemExit: "BaseException", Exception: "BaseException",
  ArithmeticError: "Exception", FloatingPointError: "ArithmeticError", OverflowError: "ArithmeticError",
  ZeroDivisionError: "ArithmeticError", AssertionError: "Exception", AttributeError: "Exception",
  BufferError: "Exception", EOFError: "Exception", ExceptionGroup: ["BaseExceptionGroup", "Exception"],
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
const ALIAS = { IOError: "OSError", EnvironmentError: "OSError" };
const canon = (n) => ALIAS[n] || n;
function isSub(kind, handler) {
  const target = canon(handler);
  const seen = new Set();
  const stack = [kind];
  while (stack.length) {
    const k = stack.pop();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    if (canon(k) === target) return true;
    const p = PARENT[k];
    if (Array.isArray(p)) stack.push(...p);
    else if (p) stack.push(p);
  }
  return false;
}
const ALL_NAMES = Object.keys(PARENT);
test("R25-N1: hierarchy fixture covers all 69 builtin exception names", () => {
  assert.equal(ALL_NAMES.length, 69);
});

for (const name of ALL_NAMES) {
  test(`R25-N1 matrix: raise ${name} x except Exception/BaseException/parent/self`, async () => {
    const parents = [PARENT[name]].flat().filter(Boolean);
    const handlers = [...new Set(["Exception", "BaseException", ...parents, name])];
    for (const h of handlers) {
      const r = await run(`try:\n    raise ${name}('m')\nexcept ${h}:\n    print('caught')`);
      const got = outputs(r).flat().includes("caught");
      assert.equal(got, isSub(name, h), `${name} x except ${h}`);
    }
    // isinstance も同じ階層で判定される（except ... as e 経由の例外値で確認）
    const parent = parents[0] || name;
    const r2 = await run(
      `try:\n    raise ${name}('m')\nexcept ${name} as e:\n    print(isinstance(e, Exception), isinstance(e, BaseException), isinstance(e, ${parent}))`,
    );
    const exp = [isSub(name, "Exception"), isSub(name, "BaseException"), isSub(name, parent)]
      .map((b) => (b ? "True" : "False"))
      .join(" ");
    assert.deepEqual(outputs(r2), [[exp]], `${name} isinstance`);
  });
}

test("R25-N1: representative families catch through intermediate parents", async () => {
  const cases = [
    ["try:\n    raise PermissionError('x')\nexcept OSError:\n    print('caught')", true],
    ["try:\n    raise ConnectionRefusedError('x')\nexcept ConnectionError:\n    print('caught')", true],
    ["try:\n    raise BrokenPipeError('x')\nexcept OSError:\n    print('caught')", true],
    ["try:\n    raise FloatingPointError('x')\nexcept ArithmeticError:\n    print('caught')", true],
    ["try:\n    raise TabError('x')\nexcept IndentationError:\n    print('caught')", true],
    ["try:\n    raise TabError('x')\nexcept SyntaxError:\n    print('caught')", true],
    ["try:\n    raise UnicodeDecodeError('x')\nexcept UnicodeError:\n    print('caught')", true],
    ["try:\n    raise UnicodeEncodeError('x')\nexcept ValueError:\n    print('caught')", true],
    ["try:\n    raise UserWarning('x')\nexcept Warning:\n    print('caught')", true],
    ["try:\n    raise StopAsyncIteration()\nexcept Exception:\n    print('caught')", true],
    ["try:\n    raise GeneratorExit()\nexcept Exception:\n    print('caught')", false],
    ["try:\n    raise GeneratorExit()\nexcept BaseException:\n    print('caught')", true],
    ["try:\n    raise ExceptionGroup('g', [])\nexcept BaseExceptionGroup:\n    print('caught')", true],
    ["try:\n    raise BaseExceptionGroup('g', [])\nexcept Exception:\n    print('caught')", false],
    // 別名は同一クラスとして双方向に一致する
    ["try:\n    raise IOError('x')\nexcept OSError:\n    print('caught')", true],
    ["try:\n    raise OSError('x')\nexcept IOError:\n    print('caught')", true],
    ["try:\n    raise EnvironmentError('x')\nexcept OSError:\n    print('caught')", true],
  ];
  for (const [code, caught] of cases) {
    const r = await run(code);
    assert.equal(outputs(r).flat().includes("caught"), caught, code);
  }
});

test("R25-N1: raise of an undefined name is a NameError naming it", async () => {
  const r = await run("raise FooError()");
  assert.match(errText(r), /NameError/);
  assert.match(errText(r), /FooError/);
  // 同名の except では捕捉できない（NameError が伝播する）
  const r2 = await run("try:\n    raise FooError()\nexcept FooError:\n    print('caught')");
  assert.equal(outputs(r2).flat().includes("caught"), false);
  assert.match(errText(r2), /NameError/);
  // except NameError では捕捉できる（実 CPython どおり、raise 位置で発生するため）
  const r3 = await run("try:\n    raise FooBarError('x')\nexcept NameError:\n    print('caught')");
  assert.deepEqual(outputs(r3), [["caught"]]);
  // 裸の名前形も同じ
  assert.match(errText(await run("raise NosuchError")), /NameError/);
});

test("R25-N1: raise of non-exception classes/values is a TypeError", async () => {
  for (const code of [
    "class Foo:\n    pass\nraise Foo()",
    "class Foo:\n    pass\nraise Foo",
    "raise 5",
    'raise "x"',
    "raise None",
    "raise int",
    "raise int()",
    "raise print",
    "x = 5\nraise x",
    "def f():\n    return 5\nraise f()",
    "class Foo:\n    pass\nx = Foo()\nraise x",
  ]) {
    assert.match(errText(await run(code)), /TypeError/, code);
  }
});

test("R25-N1: raise of builtin exceptions, aliases and re-raise keep working", async () => {
  assert.match(errText(await run("raise ValueError('x')")), /ValueError：x/);
  assert.match(errText(await run("raise MemoryError")), /MemoryError/);
  // 変数に束縛した例外クラス経由
  assert.match(errText(await run("x = ValueError\nraise x('a')")), /ValueError：a/);
  // except ... as e で受けた例外値の再 raise は元の例外になる
  const r = await run("try:\n    raise ValueError('x')\nexcept ValueError as e:\n    raise e");
  assert.match(errText(r), /ValueError：x/);
  // 名前解決：新規収載名も組み込みとして解決される（NameError にならない）
  assert.deepEqual(outputs(await run("print(isinstance(5, MemoryError))")), [["False"]]);
  assert.deepEqual(outputs(await run("print(MemoryError)")), [["組み込み関数 MemoryError"]]);
});

test("R25-N1: explicitly raised SyntaxError family is catchable, parse errors are not", async () => {
  const r = await run("try:\n    raise SyntaxError('s')\nexcept Exception:\n    print('caught')");
  assert.deepEqual(outputs(r), [["caught"]]);
  const r2 = await run("try:\n    raise IndentationError('s')\nexcept SyntaxError:\n    print('caught')");
  assert.deepEqual(outputs(r2), [["caught"]]);
  // 構文エラーそのものは従来どおり停止する（try で捕捉される対象ではない）
  assert.match(errText(await run("try:\n    return 5\nexcept Exception:\n    print('caught')")), /SyntaxError/);
});

// ---------- R25-N5：simulate の変換層 ----------
test("R25-N5: null model / null code return a learner error instead of throwing", async () => {
  for (const [code, model] of [
    ["print(1)", null],
    [null, structuredClone(py.model.defaults)],
    ["print(1)", undefined],
  ]) {
    const r = await py.simulate(code, model);
    assert.ok(r.error, "error result expected");
    assert.equal(r.paths.length, 0);
    assert.doesNotMatch(r.error.message, /Cannot read properties/);
    assert.match(r.error.message, /null \/ undefined/);
    assert.equal(r.error.category, "TypeError");
  }
});

test("R25-N5: hostile model values do not leak host messages", async () => {
  const evil = {
    get globals() {
      throw new Error("host-marker-xyz");
    },
  };
  const r = await py.simulate("print(1)", evil);
  assert.ok(r.error);
  assert.doesNotMatch(r.error.message, /host-marker-xyz/);
  assert.match(r.error.message, /予期しないエラー/);
});

test("R25-N5: non-null model shapes keep working as before", async () => {
  for (const model of [42, "text", [1, 2], true, {}]) {
    const r = await py.simulate("print(1)", model);
    assert.equal(r.error, undefined, JSON.stringify(model));
    assert.deepEqual(outputs(r), [["1"]]);
  }
  const r = await run("x = 2\nprint(x + 3)");
  assert.deepEqual(outputs(r), [["5"]]);
});

// ---------- R25-N13：import 説明文面 ----------
const IMPORT_FORMS = [
  ["import math\nprint(math.sqrt(9))", "3.0"],
  ["import math as m\nprint(m.sqrt(9))", "3.0"],
  ["from math import sqrt\nprint(sqrt(9))", "3.0"],
  ["from math import sqrt as s\nprint(s(9))", "3.0"],
  ["from math import *\nprint(sqrt(9))", "3.0"],
  ["from math import pi\nprint(pi)", "3.141592653589793"],
];
for (const [code, expected] of IMPORT_FORMS) {
  test(`R25-N13: import step text matches deterministic behaviour: ${code.split("\n")[0]}`, async () => {
    const r = await run(code);
    assert.equal(r.error, undefined);
    assert.deepEqual(outputs(r), [[expected]]);
    const trace = traceText(r);
    // 是正前の虚偽文面（「実行時に決まる値として扱います」）が残っていない
    assert.doesNotMatch(trace, /import した名前は「実行時に決まる値」として扱います/);
    assert.doesNotMatch(trace, /中身を読み込みません/);
    // 実際の束縛を説明する文面になっている
    assert.match(trace, /束縛します|取り込み|使えるようにします/);
    assert.match(trace, /決定的に計算できるもの|実値/);
  });
}

// ---------- R25-N23：from-import の実在検証 ----------
test("R25-N23: importing a nonexistent name from math is an ImportError naming it", async () => {
  const r = await run("from math import nosuchname_xyz\nprint(nosuchname_xyz)");
  assert.match(errText(r), /ImportError/);
  assert.match(errText(r), /nosuchname_xyz/);
  assert.deepEqual(outputs(r), [[]]);
  // 捏造表示（組み込みメソッド）が出ない
  assert.doesNotMatch(traceText(r) + outputs(r).flat().join(""), /組み込みメソッド nosuchname_xyz/);
  // 別名形・大文字違いも同様
  assert.match(errText(await run("from math import nosuchname_xyz as n")), /ImportError/);
  assert.match(errText(await run("from math import SQRT")), /ImportError/);
});

test("R25-N23: ImportError is catchable and earlier names stay bound (CPython order)", async () => {
  const r = await run(
    "try:\n    from math import sqrt, nosuchname_xyz\nexcept ImportError:\n    print('caught')\nprint(sqrt(9))",
  );
  assert.equal(r.error, undefined, errText(r));
  assert.deepEqual(outputs(r), [["caught", "3.0"]]);
});

test("R25-N23: import * still binds exactly the public names of math (61)", async () => {
  const r = await run("from math import *\nprint(sqrt(16), pi, floor(2.7), fabs(-3))");
  assert.deepEqual(outputs(r), [["4.0 3.141592653589793 2 3.0"]]);
  const vars = r.paths[0].vars;
  assert.equal(Object.keys(vars).length, 61);
  for (const n of ["sqrt", "pi", "gcd", "e", "tau", "inf", "nan"]) assert.ok(n in vars, n);
});

test("R25-N23: nonexistent modules keep the existing unsupported stop", async () => {
  assert.match(errText(await run("import nosuchmod_xyz\nprint('after')")), /未対応/);
  assert.match(errText(await run("from nosuchmod_xyz import sqrt\nprint('after')")), /未対応/);
  // 実在名の複数 import・別名は壊れていない
  const r = await run("from math import fabs as f, floor, ceil\nprint(f(-2.5), floor(2.7), ceil(2.1))");
  assert.deepEqual(outputs(r), [["2.5 2 3"]]);
});
