import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { pyAdvancedReference } from "./helpers-b6.mjs";

// 高度モード ブロックB6・Python班1（組み込み関数・定数・例外）のテスト。
// F-01（典型・境界・異常・組み合わせ）を実装項目ごとに最低1ケース。
// 期待値はローカル python3（3.12.3）の実走で裏付けた（hash の float/int は
// CPython の仕様アルゴリズムを BigInt で再実装し、乱数 415 件を含む実走と
// 全件一致を確認）。版差・モデル差は各テストのコメントと報告書に明記する。
//   - tuple のハッシュ値：ローカル python3（3.12.3・2026-08-31 ビルド）は
//     古典アルゴリズム（CPython ソース Objects/tupleobject.c）と異なる値を
//     返す（例：hash(()) 実走 5740354900026072187 vs 古典 3527539）。
//     本実装は仕様アルゴリズム（古典）で計算し、差異は報告書に記録した。
//   - hash(nan)：実走では実行ごとに変わる値が返るため「実行時に決まる値」。
//   - sentinel：Python 3.15（PEP 661）で追加。3.12.3 には存在しないため、
//     期待値は PEP 661／docs.python.org/3 の記載に基づく。

const py = getDefinition("python");
const run = async (code) =>
  py.simulate(code, structuredClone(py.model.defaults));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const HOST_LEAK =
  /Maximum call stack|Cannot read properties|is not a function|undefined is not/;
const out1 = async (code) => {
  const r = await run(code);
  assert.deepEqual(errors(r), [], code);
  assert.equal(r.paths.length, 1, code);
  return outputs(r)[0];
};
const errKind = async (code, kind) => {
  const r = await run(code);
  const es = errors(r);
  assert.ok(es.length > 0, "must stop: " + code);
  assert.match(es[0].message, new RegExp("^" + kind + "："), es[0].message);
  assert.doesNotMatch(es[0].message, HOST_LEAK);
  return es[0].message;
};
const outUnknown = async (code) => {
  const o = await out1(code);
  assert.ok(
    o.some((t) => t.includes("実行時に決まる")),
    code + " -> " + JSON.stringify(o),
  );
  return o;
};

/* ---------- ascii ---------- */

test("B6-py1 ascii: typical / boundary / combination", async () => {
  assert.deepEqual(await out1('print(ascii("é"))'), ["'\\xe9'"]); // 実走一致
  assert.deepEqual(await out1('print(ascii("あ"))'), ["'\\u3042'"]); // 実走一致
  assert.deepEqual(await out1('print(ascii("😀"))'), ["'\\U0001f600'"]); // 実走一致（8桁形）
  assert.deepEqual(await out1('print(ascii("abc"))'), ["'abc'"]); // ASCII のみは repr と同じ
  assert.deepEqual(await out1("print(ascii(123))"), ["123"]); // 数値にも使える（実走一致）
  assert.deepEqual(await out1('print(ascii(["é"]))'), ["['\\xe9']"]); // 組み合わせ：コンテナの repr にも効く
});

/* ---------- callable ---------- */

test("B6-py1 callable: typical / boundary", async () => {
  assert.deepEqual(await out1("print(callable(len), callable(5))"), ["True False"]);
  assert.deepEqual(await out1("print(callable('x'), callable([1]))"), ["False False"]);
  const code =
    "class C:\n    def __call__(self):\n        return 1\nclass D:\n    pass\nprint(callable(C), callable(C()), callable(D()))";
  assert.deepEqual(await out1(code), ["True True False"]); // クラス・__call__ 持ちは True、素のインスタンスは False（実走一致）
});

/* ---------- getattr / hasattr / setattr / delattr ---------- */

const CLASS_A =
  "class A:\n    x = 10\n    def m(self):\n        return 7\na = A()\n";

test("B6-py1 getattr/hasattr: typical / default / abnormal", async () => {
  assert.deepEqual(await out1(CLASS_A + 'print(getattr(a, "x"))'), ["10"]); // クラス属性
  assert.deepEqual(await out1(CLASS_A + 'print(getattr(a, "m")())'), ["7"]); // メソッドは束縛されて呼べる
  assert.deepEqual(await out1(CLASS_A + 'print(hasattr(a, "x"), hasattr(a, "z"))'), ["True False"]);
  assert.deepEqual(await out1(CLASS_A + 'print(getattr(a, "z", 42))'), ["42"]); // 既定値
  await errKind(CLASS_A + 'print(getattr(a, "z"))', "AttributeError"); // 既定値なしは AttributeError（実走一致）
  await errKind(CLASS_A + "print(getattr(a, 5))", "TypeError"); // 名前が文字列でない（実走一致）
  assert.deepEqual(await out1('print(getattr({"a": 1}, "get")("a"))'), ["1"]); // 辞書のメソッド
  assert.deepEqual(await out1('print(getattr(5, "real"), getattr(5, "numerator"))'), ["5 5"]); // 数値属性
  await errKind('print(getattr(1.5, "numerator"))', "AttributeError"); // float に numerator は無い（実走一致）
});

test("B6-py1 setattr/delattr: typical / abnormal / combination", async () => {
  assert.deepEqual(
    await out1("class A:\n    pass\na = A()\nsetattr(a, \"v\", 3)\nprint(a.v)"),
    ["3"],
  );
  assert.deepEqual(
    await out1("class A:\n    pass\na = A()\na.x = 1\ndelattr(a, \"x\")\nprint(hasattr(a, \"x\"))"),
    ["False"],
  );
  await errKind(CLASS_A + 'delattr(a, "x")', "AttributeError"); // インスタンスからクラス属性は消せない（実走一致）
  assert.deepEqual(
    await out1(CLASS_A + 'delattr(A, "x")\nprint(hasattr(A, "x"))'),
    ["False"], // クラス自体からは消せる
  );
  await errKind("setattr([1], \"x\", 1)", "AttributeError"); // 組み込み型への設定（実走一致）
  await errKind("o = object()\nsetattr(o, \"x\", 1)", "AttributeError"); // object() への設定（実走一致）
  await errKind(CLASS_A + 'delattr(a, "zzz")', "AttributeError"); // 無い属性の削除
});

/* ---------- dir / globals / locals / vars ---------- */

test("B6-py1 dir: no-arg / with-arg / function scope", async () => {
  assert.deepEqual(await out1("x = 1\ny = 2\nprint(dir())"), ["['x', 'y']"]);
  assert.deepEqual(await out1("print(dir([1, 2]))"), [
    "['append', 'clear', 'copy', 'count', 'extend', 'index', 'insert', 'pop', 'remove', 'reverse', 'sort']",
  ]);
  assert.deepEqual(
    await out1("def f():\n    a = 1\n    b = 2\n    return dir()\nprint(f())"),
    ["['a', 'b']"], // 関数内ではその関数のローカル名だけ（実 CPython の dir() と同じ範囲）
  );
  assert.deepEqual(
    await out1("class A:\n    x = 1\na = A()\na.y = 2\nprint(dir(a))"),
    ["['x', 'y']"], // インスタンス属性＋クラス属性
  );
});

test("B6-py1 globals/locals/vars: typical / abnormal / combination", async () => {
  assert.deepEqual(await out1("a = 10\nprint(sorted(globals()))"), ["['a']"]);
  assert.deepEqual(await out1('a = 10\nprint(globals()["a"])'), ["10"]);
  assert.deepEqual(await out1("b = 3\nprint(sorted(locals()))"), ["['b']"]);
  assert.deepEqual(
    await out1("def f():\n    x = 5\n    return locals()\nprint(f())"),
    ["{'x': 5}"], // 実走一致
  );
  assert.deepEqual(
    await out1("class A:\n    pass\na = A()\na.x = 1\nprint(vars(a))"),
    ["{'x': 1}"],
  );
  assert.deepEqual(await out1('class A:\n    x = 1\nprint(vars(A)["x"])'), ["1"]); // クラスの __dict__
  assert.deepEqual(await out1("c = 9\nprint(vars()[\"c\"])"), ["9"]); // 引数なし vars() は locals()
  await errKind("print(vars(5))", "TypeError"); // __dict__ を持たない値（実走一致）
  assert.deepEqual(
    await out1("class A:\n    pass\na = A()\nsetattr(a, \"k\", 9)\nprint(vars(a)[\"k\"])"),
    ["9"], // 組み合わせ：setattr の結果が vars に見える
  );
});

/* ---------- hash / id ---------- */

test("B6-py1 hash: int / bool (CPython algorithm, verified vs python3)", async () => {
  assert.deepEqual(await out1("print(hash(42), hash(0), hash(-2))"), ["42 0 -2"]);
  assert.deepEqual(await out1("print(hash(-1))"), ["-2"]); // -1 は -2 に調整される（実走一致）
  assert.deepEqual(await out1("print(hash(True), hash(False))"), ["1 0"]);
  assert.deepEqual(await out1("print(hash(123456789))"), ["123456789"]);
});

test("B6-py1 hash: float (CPython float-hash algorithm, verified vs python3)", async () => {
  assert.deepEqual(await out1("print(hash(1.0), hash(2.0), hash(100.0))"), ["1 2 100"]);
  assert.deepEqual(await out1("print(hash(-1.0))"), ["-2"]); // 実走一致（整数化できる小数は int と同じ）
  assert.deepEqual(await out1("print(hash(float('inf')), hash(float('-inf')))"), ["314159 -314159"]); // 実走一致
  // 0.5 のハッシュは 1152921504606846976（2^60）で実走と一致するが、
  // エンジンの数値モデル（安全な整数の範囲）を超えるため「実行時に決まる値」に倒す
  await outUnknown("print(hash(0.5))");
  await outUnknown("print(hash(3.14))"); // 同上（322818021289917443 は正確に表せない）
});

test("B6-py1 hash: tuple (classic CPython algorithm) / unhashable / runtime-varying", async () => {
  // 以下は CPython ソースの古典タプルハッシュで計算した値（報告書に実走との差異を記録）
  assert.deepEqual(await out1("print(hash(()))"), ["3527539"]);
  assert.deepEqual(await out1("print(hash((0,)))"), ["3430018387555"]);
  assert.deepEqual(await out1("print(hash((1,)))"), ["3430019387558"]);
  assert.deepEqual(await out1("print(hash((True,)))"), ["3430019387558"]); // True の要素ハッシュは 1
  await outUnknown("print(hash((1, 2)))"); // 古典値 3713081631934410656 は安全な整数の範囲外のため未確定に倒す
  await errKind("print(hash([1]))", "TypeError"); // 実走一致：unhashable type: 'list'
  await errKind("print(hash((1, [2])))", "TypeError"); // 要素にハッシュ不可を含む（実走一致）
  await errKind("print(hash({1, 2}))", "TypeError");
  await outUnknown('print(hash("abc"))'); // 文字列は実行ごとに変わる
  await outUnknown("print(hash(None))"); // None もアドレス依存（実走で確認）
  await outUnknown("print(hash(float('nan')))"); // 実走では実行ごとに変わる
});

test("B6-py1 id: always runtime-determined", async () => {
  assert.deepEqual(await out1("x = [1, 2]\nprint(id(x))"), [
    "実行時に決まる：オブジェクトの識別値（id）",
  ]);
});

/* ---------- issubclass ---------- */

test("B6-py1 issubclass: typical / tuple / abnormal / user class", async () => {
  assert.deepEqual(await out1("print(issubclass(bool, int), issubclass(int, bool))"), ["True False"]);
  assert.deepEqual(await out1("print(issubclass(ValueError, Exception), issubclass(Exception, ValueError))"), ["True False"]);
  assert.deepEqual(await out1("print(issubclass(int, object), issubclass(int, (str, int)))"), ["True True"]);
  assert.deepEqual(await out1("print(issubclass(ImportCycleError, ImportError))"), ["True"]); // B6 で追加した階層
  assert.deepEqual(await out1("print(issubclass(PythonFinalizationError, RuntimeError))"), ["True"]);
  await errKind("print(issubclass(5, int))", "TypeError"); // 実走一致：arg 1 must be a class
  await errKind("print(issubclass(int, 5))", "TypeError");
  assert.deepEqual(
    await out1("class A:\n    pass\nB = type(\"B\", (A,), {})\nprint(issubclass(B, A), issubclass(A, object))"),
    ["True True"], // type() で作ったサブクラスと継承辿り
  );
});

/* ---------- object / sentinel ---------- */

test("B6-py1 object: typical / abnormal", async () => {
  assert.deepEqual(await out1("o = object()\nprint(type(o))"), ["<class 'object'>"]);
  assert.deepEqual(await out1("o = object()\nprint(isinstance(o, object))"), ["True"]);
  await errKind("print(object(1))", "TypeError"); // 実走一致：object() takes no arguments
  await errKind('o = object()\nprint(getattr(o, "x"))', "AttributeError"); // 実走一致
});

test("B6-py1 sentinel (PEP 661 / Python 3.15; not in python3 3.12)", async () => {
  assert.deepEqual(await out1('M = sentinel("MISSING")\nprint(M)'), ["MISSING"]); // repr は名前
  assert.deepEqual(await out1('M = sentinel("MISSING")\nprint(M.__name__, M.__module__)'), ["MISSING __main__"]);
  assert.deepEqual(await out1('M = sentinel("M", "REP")\nprint(M)'), ["REP"]); // repr の指定
  assert.deepEqual(await out1('M = sentinel("M", module="mymod")\nprint(M.__module__)'), ["mymod"]);
  assert.deepEqual(
    await out1('M = sentinel("M")\nprint(M == M, sentinel("M") == M, M is M)'),
    ["True False True"], // 同一性で比較される（同名でも別物）
  );
  assert.deepEqual(await out1('M = sentinel("M")\nd = {M: 1}\nprint(d[M])'), ["1"]); // ハッシュ可能（同一性）
  assert.deepEqual(await out1('M = sentinel("M")\nprint(type(M))'), ["<class 'sentinel'>"]);
  assert.deepEqual(await out1('M = sentinel("M")\nprint(getattr(M, "__name__"))'), ["M"]); // getattr 経由でも読める
  await outUnknown('M = sentinel("M")\nprint(hash(M))'); // ハッシュは同一性（アドレス）依存
  await errKind("print(sentinel(5))", "TypeError"); // 名前は文字列必須
  await errKind('M = sentinel("M")\nsetattr(M, "x", 1)', "AttributeError"); // 属性は変更できない
});

/* ---------- constants ---------- */

test("B6-py1 constants: True/False/None supported; site constants unverified", async () => {
  assert.deepEqual(await out1("print(True, False, None)"), ["True False None"]);
  await errKind("print(copyright)", "NameError"); // 未検証：エンジンでは未定義名として停止（裁定メモ）
  await errKind("print(credits)", "NameError");
  await errKind("print(license)", "NameError");
  await errKind("print(quit)", "NameError"); // 未対応：site 定数は定義しない
  await errKind("print(exit)", "NameError");
});

/* ---------- new exceptions ---------- */

test("B6-py1 exceptions: ImportCycleError / PythonFinalizationError hierarchy", async () => {
  assert.deepEqual(
    await out1('try:\n    raise ImportCycleError("loop")\nexcept ImportError:\n    print("caught")'),
    ["caught"], // ImportError のサブクラスとして捕捉（docs 3.15 の階層記載）
  );
  assert.deepEqual(
    await out1('try:\n    raise PythonFinalizationError("fin")\nexcept RuntimeError:\n    print("caught")'),
    ["caught"], // RuntimeError のサブクラスとして捕捉
  );
  await errKind(
    'try:\n    raise ImportCycleError("loop")\nexcept ModuleNotFoundError:\n    print("no")',
    "ImportCycleError", // 兄弟クラスでは捕捉されない
  );
  assert.deepEqual(
    await out1('try:\n    raise PythonFinalizationError("fin")\nexcept Exception:\n    print("caught")'),
    ["caught"],
  );
  await errKind("print(WindowsError)", "NameError"); // 未検証：階層に登録しない（裁定メモ）
});

/* ---------- unsupported builtins stop as 未対応 ---------- */

test("B6-py1 unsupported builtins: eval/exec/compile/breakpoint/help/aiter/anext/__import__/open", async () => {
  await errKind('print(eval("1 + 1"))', "未対応");
  await errKind('exec("x = 1")', "未対応");
  await errKind('print(compile("1 + 1", "<string>", "eval"))', "未対応");
  await errKind("breakpoint()", "未対応");
  await errKind("help(len)", "未対応");
  await errKind("print(aiter([1]))", "未対応");
  await errKind("print(anext([1]))", "未対応");
  await errKind('print(__import__("math"))', "未対応");
  await errKind('print(open("memo.txt"))', "未対応"); // 従来挙動（高度側で unsupported として上書き収載）
});

/* ---------- advanced reference catalog (this team's items) ---------- */

test("B6-py1 reference: 35 items with status breakdown and runnable examples", async () => {
  const adv = pyAdvancedReference;
  const mine = adv.filter((r) =>
    ["ascii", "callable", "delattr", "dir", "getattr", "globals", "hasattr", "hash", "id", "issubclass", "locals", "setattr", "vars", "object", "sentinel", "aiter", "anext", "breakpoint", "compile", "eval", "exec", "help", "__import__", "open", "False", "True", "None", "copyright", "credits", "license", "quit", "exit", "ImportCycleError", "PythonFinalizationError", "WindowsError"].includes(r.id),
  );
  assert.equal(mine.length, 35);
  assert.equal(mine.filter((r) => r.status === "supported").length, 20);
  assert.equal(mine.filter((r) => r.status === "unsupported").length, 11);
  assert.equal(mine.filter((r) => r.status === "unverified").length, 4);
  for (const r of mine) {
    assert.equal(r.supported, r.status === "supported", r.id);
    assert.match(r.source, /^https:\/\/docs\.python\.org\/3\//, r.id);
  }
  // supported の example はエンジンで実行でき、expected と一致する
  for (const r of mine.filter((x) => x.status === "supported")) {
    const got = await out1(r.example);
    assert.deepEqual(got, r.expected.split("\n"), r.id + " example");
  }
});
