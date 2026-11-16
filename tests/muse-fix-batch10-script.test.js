// バッチ10（script基盤・JavaScript班）修正の回帰テスト。
// 対象：R31-N4（JS for-of／for-in の名指し）／R31-N5（JS 未対応構文の
// 後続トークン原因群＋new の全位置名指し）／R31-N6（オブジェクト内
// スプレッド源の裸の数値リテラルの字句化）／R31-N8 の script 系分
// （式の途中終了で <eof>／END が露出する件）／R31-N13 の JS＋script系
// モデル分（モデル形状の入口検証）。
// あわせて横断スイープで処置した同根表面（文頭キーワード群、オブジェ
// クトリテラルのメソッド／アクセサ／計算済みキー、省略記法・数値キー
// の受理、配列の穴、for (;;) の巻き上げ走査）と、壊してはいけない
// 対照（switch 文・in・instanceof・アロー関数・async function・
// do-while・識別子としての yield／await）も固定する。
// 一次情報：ECMA-262／MDN と実 Node 24 の挙動。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code, model) => {
  const d = getDefinition(id);
  return d.simulate(
    code,
    model === undefined ? structuredClone(d.model.defaults) : model,
  );
};
const js = (code, model) => run("javascript", code, model);
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message);
const outputs = (r) => (r.paths || []).map((p) => p.outputs.map((o) => o.text));

/* ---------------- R31-N4: for-of / for-in ---------------- */
test("R31-N4: for-of / for-in with let/const/var names the loop form", async () => {
  for (const [code, pattern] of [
    ["let a=[1,2]; for (let v of a) console.log(v);", /for-of 文/],
    ["let a=[1,2]; for (const v of a) console.log(v);", /for-of 文/],
    ["let a=[1,2]; for (var v of a) console.log(v);", /for-of 文/],
    ["let o={a:1}; for (let k in o) console.log(k);", /for-in 文/],
    ["let a=[1,2]; for (let v in a) console.log(v);", /for-in 文/],
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", pattern, code);
    assert.doesNotMatch(errors(r)[0] || "", /宣言の区切り/, code);
  }
  // 既存の名指し（分割代入形・宣言なし形）は維持する
  const destr = await js("for (let [x] of [[1]]) console.log(x);");
  assert.match(errors(destr)[0] || "", /分割代入（for-of \/ for-in の反復変数）/);
  const bare = await js("let a=[1,2]; for (v of a) console.log(v);");
  assert.match(errors(bare)[0] || "", /：of/);
});

/* ---------------- R31-N5: 後続トークン原因群 ---------------- */
test("R31-N5: statement-head constructs name themselves", async () => {
  for (const [code, pattern] of [
    ["function foo() {}", /関数定義（function）/],
    ["function* g() { yield 1; }", /ジェネレータ関数（function\*）/],
    ["class Foo { bar() {} }", /class 宣言/],
    ["class Foo {}", /class 宣言/],
    ["try { console.log(1); } catch (e) { console.log(2); }", /try 文/],
    ["try { } finally { }", /try 文/],
    ["throw 1;", /throw 文/],
    ["if (true) { throw 1; }", /throw 文/],
    ["with ({a:1}) { console.log(a); }", /with 文/],
    ["export const x = 1;", /export 文/],
    ["import x from 'y';", /import 文/],
    ["debugger;", /debugger 文/],
    ["label: for (let i=0;i<1;i++) { break label; }", /ラベル（label:）/],
    ["let x = 1; lbl: console.log(1);", /ラベル（lbl:）/],
    ["catch (e) { }", /catch 節/],
    ["finally { }", /finally 節/],
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", pattern, code);
  }
});

test("R31-N5: expression-head constructs name themselves in every position", async () => {
  for (const [code, pattern] of [
    ["let x = function() { return 1; };", /関数式（function）/],
    ["let x = function() {};", /関数式（function）/],
    ["void function() {};", /関数式（function）/],
    ["let gen = function*() { yield 1; };", /ジェネレータ関数（function\*）/],
    ["let C = class { };", /class 式/],
    ["let x = class Foo {};", /class 式/],
    ["let y = yield 1;", /yield 演算子/],
    ["let x = await foo();", /await 演算子/],
    ["let x = await 1;", /await 演算子/],
    ["let f = async function() {};", /async function/],
    ["async function foo() {}", /async function/],
    ["let f = async x => x;", /アロー関数/],
    ["let m = import.meta;", /import 式/],
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", pattern, code);
    assert.doesNotMatch(errors(r)[0] || "", /宣言の区切り/, code);
  }
});

test("R31-N5: new names itself in every position", async () => {
  for (const code of [
    "console.log(new Date());",
    "console.log(new Date(2024, 1, 29));",
    "console.log(new Array(1, 2));",
    "console.log(1, new Date());",
    "let d = new Date();",
    "let a = new Array(3);",
    "new Date();",
    "if (new Date()) console.log(1);",
    "while (new Date()) { break; }",
    "let x = true ? new Date() : null;",
    "let a = [new Date()];",
    "let o = { d: new Date() };",
    "let o = {}; o.x = new Date();",
    "console.log(typeof new Date());",
    "let x = !new Date();",
    "let x = -new Date();",
    "for (let i = 0; i < 1; i++) { console.log(new Date()); }",
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", /new 演算子/, code);
  }
});

test("R31-N5: ** and **= name the operator like in/instanceof", async () => {
  for (const [code, pattern] of [
    ["let x = 2; console.log(x ** 2);", /\*\* 演算子/],
    ["console.log(2 ** 3);", /\*\* 演算子/],
    ["let x = 2; let y = x ** 2;", /\*\* 演算子/],
    ["console.log((2) ** 3);", /\*\* 演算子/],
    ["let x = 5; x **= 2;", /\*\*= 演算子/],
    ["let x = 5; console.log(x **= 2);", /\*\*= 演算子/],
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", pattern, code);
    // 旧挙動の「式を解釈できません：*=」（別演算子の名指し）ではないこと
    assert.doesNotMatch(errors(r)[0] || "", /^式を解釈できません/, code);
  }
  // 通常の乗算・複合代入は従来どおり動く
  const ok = await js("let x = 5; x *= 2; console.log(x); let y = 2 * 3; console.log(y);");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), [["10", "6"]]);
});

test("R31-N5: object-literal inner forms name themselves; shorthand and numeric keys work", async () => {
  for (const [code, pattern] of [
    ["let o = { foo() { return 1; } };", /オブジェクトリテラルのメソッド/],
    ["let o = { async foo() {} };", /オブジェクトリテラルのメソッド/],
    ["let o = { *gen() { yield 1; } };", /オブジェクトリテラルのメソッド/],
    ["let o = { get x() { return 1; } };", /get アクセサ/],
    ["let o = { set x(v) { } };", /set アクセサ/],
    ["let o = { [1+1]: 2 };", /計算済みプロパティ名/],
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", pattern, code);
    assert.doesNotMatch(errors(r)[0] || "", /：: が必要です|フィールド名/, code);
  }
  const shorthand = await js("let y = 2; let o = { y }; console.log(o.y);");
  assert.deepEqual(errors(shorthand), []);
  assert.deepEqual(outputs(shorthand), [["2"]]);
  const numeric = await js("let o = { 42: 'x' }; console.log(o[42]);");
  assert.deepEqual(errors(numeric), []);
  assert.deepEqual(outputs(numeric), [["x"]]);
  // get/set を通常のキーとして使う形は従来どおり動く
  const plain = await js("let o = { get: 1, set: 2 }; console.log(o.get, o.set);");
  assert.deepEqual(errors(plain), []);
  assert.deepEqual(outputs(plain), [["1 2"]]);
});

test("R31-N5 controls: already-correct namings and supported forms are intact", async () => {
  for (const [code, pattern] of [
    ["switch (1) { case 1: break; }", /switch 文/],
    ["let o={a:1}; console.log('a' in o);", /in 演算子/],
    ["console.log([] instanceof Array);", /instanceof 演算子/],
    ["let f = (x) => x;", /アロー関数/],
    ["let f = async () => 1;", /アロー関数/],
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", pattern, code);
  }
  const doWhile = await js("let x = 1; do { x++; } while (x < 3); console.log(x);");
  assert.deepEqual(errors(doWhile), []);
  assert.deepEqual(outputs(doWhile), [["3"]]);
  // yield／await を識別子として使う形は従来どおり動く
  const ident = await js("let yield = 1; let await = 2; console.log(yield + await);");
  assert.deepEqual(errors(ident), []);
  assert.deepEqual(outputs(ident), [["3"]]);
});

test("sweep: sparse array holes are undefined elements", async () => {
  const r = await js("let a = [1, , 2]; console.log(a.length); console.log(a[1]);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["3", "undefined"]]);
});

/* ---------------- R31-N6: スプレッド源の数値リテラル ---------------- */
test("R31-N6: bare numeric literal spread sources evaluate like Node", async () => {
  for (const code of [
    "let o = {...42, x:1}; console.log(o.x);",
    "let o = {...1.5}; console.log(1);",
    "let o = {...10n}; console.log(1);",
    "let o = {...42n, x:1}; console.log(o.x);",
    "let o = {...0x10, x:1}; console.log(o.x);",
    "let o = {...0b101, x:1}; console.log(o.x);",
    "let o = {...0o17, x:1}; console.log(o.x);",
    "let o = {...1e3, x:1}; console.log(o.x);",
    "let o = {...1_000, x:1}; console.log(o.x);",
    "let o = {...5., x:1}; console.log(o.x);",
  ]) {
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), [["1"]], code);
  }
  // 数値スプレッドは列挙可能プロパティを持たないため無視され、
  // 文字列スプレッドは添字プロパティになる（実 Node どおり）
  const mixed = await js("let o = {...42, ...'ab'}; console.log(o[0], o[1]);");
  assert.deepEqual(errors(mixed), []);
  assert.deepEqual(outputs(mixed), [["a b"]]);
  // 従来の正常形（変数源・括弧形・単項形・真偽／null／配列源）は維持
  for (const [code, expected] of [
    ["let a={p:7}; let o={...a, q:99}; console.log(o.p, o.q);", ["7 99"]],
    ["let o = {...(42), x:1}; console.log(o.x);", ["1"]],
    ["let o = {...-42, x:1}; console.log(o.x);", ["1"]],
    ["let o = {...true, x:1}; console.log(o.x);", ["1"]],
    ["let o = {...null, x:1}; console.log(o.x);", ["1"]],
    ["let o = {...[9,8]}; console.log(o[0], o[1]);", ["9 8"]],
    ["let n = 42; let o = {...n, x:1}; console.log(o.x);", ["1"]],
  ]) {
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), [expected], code);
  }
  // 配列・引数位置のスプレッドは従来どおり名指し停止（字句化の修正で
  // 3ドットが正しく届くようになったこともあわせて固定する）
  for (const code of ["let a = [...42];", "console.log(...[1,2]);"]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", /スプレッド構文（\.\.\.）/, code);
  }
  // 文字列中の ... や通常の数値リテラルは字句化の変更の影響を受けない
  const plain = await js("let s = 'a...b'; console.log(s); console.log(1.5); console.log(.5); console.log(5.);");
  assert.deepEqual(errors(plain), []);
  assert.deepEqual(outputs(plain), [["a...b", "1.5", "0.5", "5"]]);
  // 同じ字句経路を使う他方言の通常形も維持する
  const rr = await run("r", "x <- c(1,2)\nprint(x[1])");
  assert.deepEqual(errors(rr), []);
  const fx = await run("powerapps", "Set(x, 1.5); Notify(Text(x))");
  assert.deepEqual(errors(fx), []);
});

/* ---------------- R31-N8（script系分）: EOF 露出 ---------------- */
test("R31-N8: truncated expressions never leak <eof> in script.js dialects", async () => {
  for (const [id, codes] of Object.entries({
    javascript: ["let x = ", "let x = 1 +", "console.log(", "let x = [1,", "if (", "let x = {a:", "x =", "let x = 1 *", "foo("],
    r: ["x <- ", "print(", "x <- 1 +", "x <- c(1,"],
    c: ["int x = ", "int x = 1 +"],
    cpp: ["int x = "],
    csharp: ["int x = ", "int x = 1 +"],
    powershell: ["$x = "],
  })) {
    for (const code of codes) {
      const r = await run(id, code);
      const msg = errors(r)[0] || "";
      assert.ok(msg, `${id}: ${code} should stop`);
      assert.doesNotMatch(msg, /<eof>/, `${id}: ${code}`);
    }
  }
  // JS／R は途中終了そのものを学習者の言葉で示す
  for (const [id, code] of [
    ["javascript", "let x = "],
    ["javascript", "let x = 1 +"],
    ["r", "x <- "],
    ["c", "int x = "],
  ]) {
    const r = await run(id, code);
    assert.match(errors(r)[0] || "", /途中で終わっています/, `${id}: ${code}`);
  }
});

test("R31-N8: Python never leaks the END token", async () => {
  for (const code of ["x = ", "x = 1 +", "x = 1 *"]) {
    const r = await run("python", code);
    const msg = errors(r)[0] || "";
    assert.ok(msg, code);
    assert.doesNotMatch(msg, /「END」/, code);
    assert.match(msg, /文末/, code);
  }
  // AutoHotkey の既存文言（対照）は維持する
  const ahk = await run("autohotkey", "x := ");
  assert.match(errors(ahk)[0] || "", /途中で終わっています/);
});

/* ---------------- R31-N13（JS＋script系モデル分） ---------------- */
test("R31-N13: non-object models name the model itself", async () => {
  for (const id of ["javascript", "r", "autohotkey", "powerautomate"]) {
    const d = getDefinition(id);
    for (const model of [null, 123, "x", []]) {
      const r = await run(id, d.templates[0].code, model);
      assert.match(
        errors(r)[0] || "",
        /モデルはオブジェクト/,
        `${id} model=${JSON.stringify(model)}`,
      );
      assert.doesNotMatch(errors(r)[0] || "", /null \/ undefined/, `${id}`);
    }
  }
  // Python はモデル null（R31-N13 が名指した表面）だけをモデル名で
  // 停止する。非 null のプリミティブ形状は、既存の R25-N5 テストが
  // 「従来どおり動く」ことを固定しているため、その受理を維持する
  // （汎用文言・虚偽原因に落ちる形ではない）。
  const pyNull = await run("python", "print(1)", null);
  assert.match(errors(pyNull)[0] || "", /モデルはオブジェクト/);
  assert.doesNotMatch(errors(pyNull)[0] || "", /null \/ undefined/);
  for (const model of [123, "x", []]) {
    const r = await run("python", "print(1)", model);
    assert.deepEqual(errors(r), [], `python model=${JSON.stringify(model)}`);
  }
});

test("R31-N13: missing or mistyped required items name the item", async () => {
  // JavaScript：dom とその必須項目
  for (const [model, pattern] of [
    [{}, /モデルdomはオブジェクト/],
    [{ dom: "x" }, /モデルdomはオブジェクト/],
    [{ dom: { selectors: {}, body: {} } }, /モデルdom\.elementsはオブジェクト/],
    [{ dom: { elements: {}, selectors: {} } }, /モデルdom\.bodyはオブジェクト/],
    [
      { variables: [], dom: { elements: {}, selectors: {}, body: {} } },
      /モデルvariablesはオブジェクト/,
    ],
    [
      { dom: { elements: {}, selectors: 1, body: {} } },
      /モデルdom\.selectorsはオブジェクト/,
    ],
  ]) {
    const r = await js("console.log(1);", model);
    assert.match(errors(r)[0] || "", pattern, JSON.stringify(model));
    assert.equal(r.error?.category, "モデルエラー");
  }
  // script系：項目の型違い
  for (const [id, code, model, pattern] of [
    ["python", "print(1)", { globals: 42 }, /モデルglobalsはオブジェクト/],
    ["python", "print(1)", { globals: [] }, /モデルglobalsはオブジェクト/],
    ["r", "print(1)", { variables: 42, files: {} }, /モデルvariablesはオブジェクト/],
    ["r", "print(1)", { variables: {}, files: [] }, /モデルfilesはオブジェクト/],
    [
      "autohotkey",
      "MsgBox 1",
      { event: null, variables: {}, windows: {}, keys: [] },
      /モデルwindowsは配列/,
    ],
    [
      "autohotkey",
      "MsgBox 1",
      { event: 42, variables: {}, windows: [], keys: [] },
      /モデルeventは文字列または null/,
    ],
    ["powerautomate", '{"actions": []}', { variables: {}, files: [], sentMail: [] }, /モデルfilesはオブジェクト/],
    ["powerautomate", '{"actions": []}', { variables: {}, files: {}, sentMail: {} }, /モデルsentMailは配列/],
  ]) {
    const r = await run(id, code, model);
    assert.match(errors(r)[0] || "", pattern, `${id} ${JSON.stringify(model)}`);
  }
  // 欠落がフォールバックで等価になるモデル（{}）は受理を維持する
  for (const [id, code] of [
    ["python", "print(1)"],
    ["r", "print(1)"],
    ["powerautomate", '{"actions": []}'],
  ]) {
    const r = await run(id, code, {});
    assert.deepEqual(errors(r), [], id);
  }
  // AutoHotkey の {} は windows 欠落として項目名で停止する
  const ahkEmpty = await run("autohotkey", "MsgBox 1", {});
  assert.match(errors(ahkEmpty)[0] || "", /モデルwindowsは配列/);
});

/* ---------------- 横断スイープ分：for (;;) ---------------- */
test("sweep: for(;;) and empty-test for loops run in JavaScript", async () => {
  const r = await js("for (;;) { break; } console.log(9);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["9"]]);
  const r2 = await js("for (;false;) { } console.log(9);");
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(outputs(r2), [["9"]]);
});
