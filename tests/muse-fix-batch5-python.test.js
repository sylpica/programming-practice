// 修正バッチ5（Python 班）回帰テスト。
// 対象：R26-N3（except ハンドラの動的値：変数束縛タプル／呼出結果が実物どおりに
//       扱われない）／R26-N4（except の入れ子タプルが黙って受理・捕捉される）／
//       R26-N5（KeyError の str 表示が単一文字列引数で引用符を欠く）。
// 一次情報：実 CPython 3.12.3（当VM の python3）の実走突合せと
// docs.python.org「Built-in Exceptions」KeyError の項（__str__ は引数1つのとき repr）。
// 期待値は全て実機で確認した挙動（捕捉の成否／伝播する例外の種類／str 表示）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/python/index.js";

const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const outputs = (r) => (r.paths || []).flatMap((p) => p.outputs.map((o) => o.text));
const errKind = (r) => {
  const e = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)[0];
  return e ? (e.message || String(e)).split("：")[0] : null;
};
const errText = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message || String(e))
    .join("\n");

// ---------- R26-N3：変数に束縛されたタプル値のハンドラ ----------
const N3_VAR_TUPLE = [
  ["var tuple catches", "E = (IndexError, KeyError)\ntry:\n    raise KeyError('k')\nexcept E:\n    print('caught')", { out: ["caught"] }],
  ["var tuple parenthesised catches", "E = (IndexError, KeyError)\ntry:\n    raise KeyError('k')\nexcept (E):\n    print('caught')", { out: ["caught"] }],
  ["var tuple mismatch propagates", "E = (IndexError, KeyError)\ntry:\n    raise ValueError('v')\nexcept E:\n    print('caught')", { err: "ValueError" }],
  ["var tuple with as", "E = (IndexError, KeyError)\ntry:\n    raise KeyError('k')\nexcept E as e:\n    print('caught')", { out: ["caught"] }],
  ["var tuple of parents catches subclass", "E = (LookupError, TypeError)\ntry:\n    raise KeyError('k')\nexcept E:\n    print('caught')", { out: ["caught"] }],
  ["var empty tuple never matches", "E = ()\ntry:\n    raise ValueError('v')\nexcept E:\n    print('caught')", { err: "ValueError" }],
  ["var tuple with non-exception element", "E = (ValueError, 5)\ntry:\n    raise ValueError('v')\nexcept E:\n    print('caught')", { err: "TypeError" }],
  ["var tuple with undefined-free int element via literal", "E = (ValueError, int)\ntry:\n    raise ValueError('v')\nexcept E:\n    print('caught')", { err: "TypeError" }],
  ["var list is TypeError", "E = [ValueError]\ntry:\n    raise ValueError('v')\nexcept E:\n    print('caught')", { err: "TypeError" }],
  ["var holding a function is TypeError", "def f():\n    return 1\ntry:\n    raise ValueError('v')\nexcept f:\n    print('caught')", { err: "TypeError" }],
  ["GeneratorExit via var tuple", "E = (GeneratorExit, ValueError)\ntry:\n    raise GeneratorExit()\nexcept E:\n    print('caught')", { out: ["caught"] }],
];
for (const [label, code, expect] of N3_VAR_TUPLE) {
  test(`R26-N3 var-tuple handler: ${label}`, async () => {
    const r = await run(code);
    if (expect.err) assert.equal(errKind(r), expect.err, `${label}: outputs=${JSON.stringify(outputs(r))}`);
    else { assert.equal(errKind(r), null, label); assert.deepEqual(outputs(r), expect.out, label); }
  });
}

test("R26-N3: var tuple TypeError message no longer falsely calls the tuple itself a non-class", async () => {
  // 是正前の虚偽文言（「「E」の値（tuple）は例外クラスではありません」）が、
  // 正当なタプル値に対して出ないこと（捕捉されること自体は上のケースで確認）。
  const r = await run("E = (IndexError, KeyError)\ntry:\n    raise KeyError('k')\nexcept E:\n    print('caught')");
  assert.equal(errKind(r), null);
  assert.doesNotMatch(errText(r), /値（tuple）は例外クラスではありません/);
});

// ---------- R26-N3：呼出結果のハンドラ ----------
const N3_CALL = [
  ["call returns class catches", "def f():\n    return ValueError\ntry:\n    raise ValueError('v')\nexcept f():\n    print('caught')", { out: ["caught"] }],
  ["call returns tuple catches", "def f():\n    return (ValueError, TypeError)\ntry:\n    raise TypeError('v')\nexcept f():\n    print('caught')", { out: ["caught"] }],
  ["call returns parent catches", "def f():\n    return Exception\ntry:\n    raise ValueError('v')\nexcept f():\n    print('caught')", { out: ["caught"] }],
  ["call returns mismatch propagates", "def f():\n    return TypeError\ntry:\n    raise ValueError('v')\nexcept f():\n    print('caught')", { err: "ValueError" }],
  ["call returns number is TypeError", "def f():\n    return 5\ntry:\n    raise ValueError('v')\nexcept f():\n    print('caught')", { err: "TypeError" }],
  ["call returns string is TypeError", "def f():\n    return 'ValueError'\ntry:\n    raise ValueError('v')\nexcept f():\n    print('caught')", { err: "TypeError" }],
  ["call returns tuple with bad element is TypeError", "def f():\n    return (ValueError, 5)\ntry:\n    raise ValueError('v')\nexcept f():\n    print('caught')", { err: "TypeError" }],
  ["call with kwargs returns class", "def f(x=ValueError):\n    return x\ntry:\n    raise TypeError('t')\nexcept f(x=TypeError):\n    print('caught')", { out: ["caught"] }],
  ["call in tuple element catches", "def g():\n    return KeyError\nE = ValueError\ntry:\n    raise KeyError('k')\nexcept (E, g()):\n    print('caught')", { out: ["caught"] }],
  ["method call result is TypeError", "try:\n    raise ValueError('v')\nexcept 'abc'.upper():\n    print('caught')", { err: "TypeError" }],
  ["builtin call result is TypeError", "try:\n    raise ValueError('v')\nexcept len('ab'):\n    print('caught')", { err: "TypeError" }],
  ["subscripted call result catches", "def g():\n    return KeyError\nD = {'g': g}\ntry:\n    raise KeyError('k')\nexcept D['g']():\n    print('caught')", { out: ["caught"] }],
];
for (const [label, code, expect] of N3_CALL) {
  test(`R26-N3 call handler: ${label}`, async () => {
    const r = await run(code);
    if (expect.err) assert.equal(errKind(r), expect.err, `${label}: outputs=${JSON.stringify(outputs(r))}`);
    else { assert.equal(errKind(r), null, label); assert.deepEqual(outputs(r), expect.out, label); }
  });
}

test("R26-N3: handler call that raises propagates its own exception, not the original", async () => {
  const r = await run("def boom():\n    raise RuntimeError('boom')\ntry:\n    raise ValueError('v')\nexcept boom():\n    print('caught')");
  assert.equal(errKind(r), "RuntimeError");
});

test("R26-N3: exception instance held in a variable is a TypeError handler", async () => {
  const code = "try:\n    raise ValueError('orig')\nexcept ValueError as e:\n    saved = e\n    try:\n        raise TypeError('t')\n    except saved:\n        print('caught')";
  assert.equal(errKind(await run(code)), "TypeError");
});

test("R26-N3: constructor-call handler stays TypeError, and its undefined argument is a NameError", async () => {
  assert.equal(errKind(await run("try:\n    raise ValueError('v')\nexcept ValueError('x'):\n    print('caught')")), "TypeError");
  // 実 CPython では引数が呼び出し前に評価されるため NameError が優先する
  assert.equal(errKind(await run("try:\n    raise ValueError('v')\nexcept ValueError(UndefinedXYZ):\n    print('caught')")), "NameError");
});

// ---------- R26-N3：添字・属性・条件式などの式形（兄弟表面） ----------
const N3_EXPR_FORMS = [
  ["subscript class catches", "L = [ValueError]\ntry:\n    raise ValueError('v')\nexcept L[0]:\n    print('caught')", { out: ["caught"] }],
  ["subscript tuple value catches", "L = [(ValueError, TypeError)]\ntry:\n    raise TypeError('v')\nexcept L[0]:\n    print('caught')", { out: ["caught"] }],
  ["subscript non-exception is TypeError", "L = [5]\ntry:\n    raise ValueError('v')\nexcept L[0]:\n    print('caught')", { err: "TypeError" }],
  ["attribute class catches", "class H:\n    exc = ValueError\ntry:\n    raise ValueError('v')\nexcept H.exc:\n    print('caught')", { out: ["caught"] }],
  ["conditional handler true branch", "try:\n    raise ValueError('v')\nexcept (ValueError if True else TypeError):\n    print('caught')", { out: ["caught"] }],
  ["conditional handler false branch", "try:\n    raise TypeError('v')\nexcept (ValueError if False else TypeError):\n    print('caught')", { out: ["caught"] }],
  ["starred tuple handler catches", "try:\n    raise TypeError('v')\nexcept (*[ValueError, TypeError],):\n    print('caught')", { out: ["caught"] }],
  ["handler subscript KeyError propagates as KeyError", "D = {}\ntry:\n    raise ValueError('v')\nexcept D['x']:\n    print('caught')", { err: "KeyError" }],
];
for (const [label, code, expect] of N3_EXPR_FORMS) {
  test(`R26-N3 expr-form handler: ${label}`, async () => {
    const r = await run(code);
    if (expect.err) assert.equal(errKind(r), expect.err, `${label}: outputs=${JSON.stringify(outputs(r))}`);
    else { assert.equal(errKind(r), null, label); assert.deepEqual(outputs(r), expect.out, label); }
  });
}

// ---------- R26-N3／RG-175：評価順序・遅延性の維持 ----------
test("R26-N3 laziness: call handler is not evaluated when no exception occurs", async () => {
  const r = await run("def boom():\n    raise RuntimeError('boom')\ntry:\n    pass\nexcept boom():\n    print('caught')\nprint('after')");
  assert.equal(errKind(r), null);
  assert.deepEqual(outputs(r), ["after"]);
});

test("R26-N3 laziness: a matching first handler skips a later call handler", async () => {
  const r = await run("def boom():\n    raise RuntimeError('boom')\ntry:\n    raise ValueError('v')\nexcept ValueError:\n    print('first')\nexcept boom():\n    print('second')");
  assert.equal(errKind(r), null);
  assert.deepEqual(outputs(r), ["first"]);
});

test("R26-N3 order: tuple elements are evaluated left to right and stop at a raising element", async () => {
  const code = "def a():\n    print('a')\n    return ValueError\ndef b():\n    print('b')\n    raise RuntimeError('boom')\ndef c():\n    print('c')\n    return TypeError\ntry:\n    raise ValueError('v')\nexcept (a(), b(), c()):\n    print('caught')";
  const r = await run(code);
  assert.equal(errKind(r), "RuntimeError");
  assert.deepEqual(outputs(r), ["a", "b"]); // c は評価されない（実 CPython のタプル構築と同じ）
});

test("R26-N3 order: evaluation errors beat validation errors in a tuple handler", async () => {
  // (5, 未定義名) は検証エラーの TypeError ではなく評価エラーの NameError（実 CPython 実測）
  assert.equal(errKind(await run("try:\n    raise ValueError('v')\nexcept (5, UndefinedXYZ):\n    print('caught')")), "NameError");
  // 全要素を検証してから照合する（先頭が一致しても非例外要素があれば TypeError）
  assert.equal(errKind(await run("try:\n    raise ValueError('v')\nexcept (ValueError, int):\n    print('caught')")), "TypeError");
});

// ---------- R26-N4：except の入れ子タプルは TypeError ----------
const N4_CASES = [
  ["nested literal tuple", "try:\n    raise KeyError('k')\nexcept ((IndexError, KeyError), TypeError):\n    print('caught')"],
  ["nested single literal tuple", "try:\n    raise ValueError('v')\nexcept ((ValueError,),):\n    print('caught')"],
  ["empty tuple element", "try:\n    raise ValueError('v')\nexcept ((), ValueError):\n    print('caught')"],
  ["nested tuple via variable", "E = ((IndexError, KeyError), TypeError)\ntry:\n    raise KeyError('k')\nexcept E:\n    print('caught')"],
  ["nested element via variable", "E = (IndexError, (KeyError,))\ntry:\n    raise KeyError('k')\nexcept E:\n    print('caught')"],
  ["literal tuple containing a tuple-valued variable", "E = (IndexError, KeyError)\ntry:\n    raise KeyError('k')\nexcept (E, TypeError):\n    print('caught')"],
  ["literal tuple element is a call returning a tuple", "def f():\n    return (ValueError, TypeError)\ntry:\n    raise TypeError('v')\nexcept (f(), KeyError):\n    print('caught')"],
];
for (const [label, code] of N4_CASES) {
  test(`R26-N4 nested tuple rejected: ${label}`, async () => {
    const r = await run(code);
    assert.equal(errKind(r), "TypeError", `${label}: outputs=${JSON.stringify(outputs(r))}`);
    assert.ok(!outputs(r).includes("caught"), label);
  });
}

test("R26-N4 guard: isinstance still accepts nested tuples (real CPython behaviour)", async () => {
  const r = await run("print(isinstance(5, (str, (int, float))))");
  assert.equal(errKind(r), null);
  assert.deepEqual(outputs(r), ["True"]);
});

// ---------- R26-N5：KeyError の str は引数1つのとき repr ----------
const N5_PRINTS = [
  ["string arg via print(e)", "try:\n    raise KeyError('k')\nexcept KeyError as e:\n    print(e)", ["'k'"]],
  ["string arg via str(e)", "try:\n    raise KeyError('k')\nexcept KeyError as e:\n    print(str(e))", ["'k'"]],
  ["string arg via f-string", "try:\n    raise KeyError('k')\nexcept KeyError as e:\n    print(f'{e}')", ["'k'"]],
  ["string arg via f-string !s", "try:\n    raise KeyError('k')\nexcept KeyError as e:\n    print(f'{e!s}')", ["'k'"]],
  ["repr(e) is unchanged", "try:\n    raise KeyError('k')\nexcept KeyError as e:\n    print(repr(e))", ["KeyError('k')"]],
  ["variable string arg", "k = 'mykey'\ntry:\n    raise KeyError(k)\nexcept KeyError as e:\n    print(e)", ["'mykey'"]],
  ["int arg", "try:\n    raise KeyError(5)\nexcept KeyError as e:\n    print(e)", ["5"]],
  ["tuple arg", "try:\n    raise KeyError(('a', 'b'))\nexcept KeyError as e:\n    print(e)", ["('a', 'b')"]],
  ["None arg", "try:\n    raise KeyError(None)\nexcept KeyError as e:\n    print(e)", ["None"]],
  ["list arg", "try:\n    raise KeyError([1, 2])\nexcept KeyError as e:\n    print(e)", ["[1, 2]"]],
  ["dict arg", "try:\n    raise KeyError({'a': 1})\nexcept KeyError as e:\n    print(e)", ["{'a': 1}"]],
  ["bool arg", "try:\n    raise KeyError(True)\nexcept KeyError as e:\n    print(e)", ["True"]],
  ["zero args", "try:\n    raise KeyError()\nexcept KeyError as e:\n    print(e)", [""]],
  ["two args", "try:\n    raise KeyError('a', 'b')\nexcept KeyError as e:\n    print(e)", ["('a', 'b')"]],
  ["alias raise", "K = KeyError\ntry:\n    raise K('k')\nexcept KeyError as e:\n    print(e)", ["'k'"]],
  ["ValueError control stays unquoted", "try:\n    raise ValueError('k')\nexcept ValueError as e:\n    print(e)", ["k"]],
];
for (const [label, code, expect] of N5_PRINTS) {
  test(`R26-N5 KeyError str: ${label}`, async () => {
    const r = await run(code);
    assert.equal(errKind(r), null, label);
    assert.deepEqual(outputs(r), expect, label);
  });
}

test("R26-N5: uncaught KeyError display line uses the quoted str", async () => {
  assert.match(errText(await run("raise KeyError('k')")), /KeyError：'k'/);
  // 再 raise でも同じ str が保たれる
  const r = await run("try:\n    raise KeyError('k')\nexcept KeyError as e:\n    raise e");
  assert.match(errText(r), /KeyError：'k'/);
});
