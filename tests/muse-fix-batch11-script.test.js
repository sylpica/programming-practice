// バッチ11（script班）修正の回帰テスト。
// 対象：RG-347（R32-PAR-1：JS for await の虚偽原因）／RG-348（R32-PAR-2
// の JS 分：複合代入の「=」断片）／RG-349（R32-PAR-3 の JS・R 分：
// メンバー末尾形）／RG-350（R32-PAR-4：JS オブジェクトリテラルの複合
// 形）／RG-355（R32-F01C-N1：R の <- の式位置）／RG-358（R32-F01C-N2：
// AutoHotkey 文形式呼出し・条件の括弧継続）。
// 一次情報：ECMA-262／実 Node、R Language Definition、AutoHotkey v2
// 公式ドキュメント。いずれも実走で再現形と対照形を固定する。
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
const js = (code) => run("javascript", code);
const rr = (code) => run("r", code);
const ahkD = getDefinition("autohotkey");
const ahk = (code) =>
  ahkD.simulate(code, structuredClone({ ...ahkD.model.defaults, event: null }));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message);
const outputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);
const vars = (r) => r.paths?.[0]?.vars || {};

/* ---------------- RG-347: for await ---------------- */
test("RG-347: for await names the for await form in every shape", async () => {
  for (const code of [
    "for await (const v of [1]) console.log(v);",
    "for await (let v of [1]) {}",
    "for await (var v of [1]) {}",
    "for await (v of [1]) {}",
    "for await (let k in {a:1}) {}",
    "for await (let [x] of [[1]]) {}",
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", /for await 文/, code);
    assert.doesNotMatch(errors(r)[0] || "", /\( が必要です/, code);
  }
  // 対照：通常の for は動作し、for-of の既存名指しは維持される
  const ok = await js("for (let i = 0; i < 2; i++) console.log(i);");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), ["0", "1"]);
  const of = await js("let a=[1,2]; for (let v of a) console.log(v);");
  assert.match(errors(of)[0] || "", /for-of 文/);
});

/* ---------------- RG-348: JS compound assignment ---------------- */
test("RG-348: all standard compound assignments run (variable target)", async () => {
  for (const [code, expected] of [
    ["let x=8; x %= 2; console.log(x);", "0"],
    ["let x=8; x <<= 2; console.log(x);", "32"],
    ["let x=8; x >>= 2; console.log(x);", "2"],
    ["let x=8; x >>>= 2; console.log(x);", "2"],
    ["let x=8; x &= 2; console.log(x);", "0"],
    ["let x=8; x |= 2; console.log(x);", "10"],
    ["let x=8; x ^= 2; console.log(x);", "10"],
    ["let x=-8; x >>= 1; console.log(x);", "-4"],
    ["let x=-8; x >>>= 1; console.log(x);", "2147483644"],
  ]) {
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), [expected], code);
  }
});

test("RG-348: compound assignments run for member and index targets", async () => {
  for (const [code, expected] of [
    ["let o={x:8}; o.x <<= 1; console.log(o.x);", "16"],
    ["let o={x:8}; o.x %= 3; console.log(o.x);", "2"],
    ["let o={x:8}; o.x >>= 1; console.log(o.x);", "4"],
    ["let a=[8]; a[0] <<= 1; console.log(a[0]);", "16"],
    ["let a=[8]; a[0] >>>= 1; console.log(a[0]);", "4"],
    ["let a=[8]; a[0] &= 12; console.log(a[0]);", "8"],
    ["let a=[8]; a[0] |= 7; console.log(a[0]);", "15"],
    ["let a=[8]; a[0] ^= 15; console.log(a[0]);", "7"],
  ]) {
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), [expected], code);
  }
});

test("RG-348: compound assignments run in expression position; ** stays named", async () => {
  const r = await js("let x=8; let y = (x %= 3); console.log(x, y);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["2 2"]);
  const r2 = await js("let x=5; console.log(x %= 2);");
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(outputs(r2), ["1"]);
  const r3 = await js("let x=10n; x <<= 2n; console.log(x);");
  assert.deepEqual(errors(r3), []);
  assert.deepEqual(outputs(r3), ["40n"]);
  // 二項 ** が未対応のままである以上、**= も演算子全体の名指しを保つ
  const pow = await js("let x=2; x **= 3; console.log(x);");
  assert.match(errors(pow)[0] || "", /\*\*= 演算子/);
  const powExpr = await js("let x=5; let y = (x **= 2);");
  assert.match(errors(powExpr)[0] || "", /\*\*= 演算子/);
  const binPow = await js("let x=5; x ** 2;");
  assert.match(errors(binPow)[0] || "", /\*\* 演算子/);
  // 対照：従来の複合代入は不変
  const plus = await js("let x=8; x += 2; console.log(x);");
  assert.deepEqual(outputs(plus), ["10"]);
});

/* ---------------- RG-349: member trailing forms ---------------- */
test("RG-349: JS trailing dot names the missing member name", async () => {
  for (const code of [
    "let a={b:1}; let x = a.;",
    "let a={b:1}; let x = a.b.;",
    "let a=[1]; let x = a[0].;",
    "let a={b:1}; let x = a..b;",
    "let a={b:1}; console.log(a.);",
    "let a={b:1}; let arr=[a.];",
    "let a={b:1}; let o={k: a.};",
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", /「\.」のあとには名前/, code);
  }
  const ok = await js("let a={b:1}; console.log(a.b);");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), ["1"]);
});

test("RG-349: R trailing $ and :: name the missing name", async () => {
  for (const code of [
    "x <- a$",
    "df <- data.frame(b = c(1, 2))\nx <- df$",
    "df <- data.frame(b = c(1, 2))\nx <- df$;",
    "df <- data.frame(b = c(1, 2))\nprint(df$)",
    "x <- a::",
  ]) {
    const r = await rr(code);
    assert.match(errors(r)[0] || "", /のあとには名前/, code);
    assert.doesNotMatch(errors(r)[0] || "", /代入の区切り|\) が必要です/, code);
  }
  const ok = await rr("df <- data.frame(b = c(1, 2))\nprint(df$b)");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), ["c(1, 2)"]);
  // 対照：-> の既存名指しは不変
  const arrow = await rr("1 -> y\nprint(y)");
  assert.match(errors(arrow)[0] || "", /->/);
});

/* ---------------- RG-350: object literal combinations ---------------- */
test("RG-350: object literal modifier combinations name the form", async () => {
  for (const [code, pattern] of [
    ["let o={get ['x'](){return 1}};", /get アクセサ（計算済みプロパティ名）/],
    ["let o={set ['x'](v){}};", /set アクセサ（計算済みプロパティ名）/],
    ["let o={async ['g'](){}};", /async メソッド（計算済みプロパティ名）/],
    ["let o={async *g(){}};", /async ジェネレータメソッド/],
    ["let o={async *['g'](){}};", /async ジェネレータメソッド/],
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", pattern, code);
    assert.doesNotMatch(errors(r)[0] || "", /: が必要です/, code);
  }
  // 対照：単独形の既存名指しは維持される
  for (const [code, pattern] of [
    ["let o={get x(){return 1}};", /get アクセサ/],
    ["let o={async m(){}};", /オブジェクトリテラルのメソッド/],
    ["let o={*g(){}};", /オブジェクトリテラルのメソッド/],
    ["let o={['x']:1};", /計算済みプロパティ名/],
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", pattern, code);
  }
});

/* ---------------- RG-355: R assignment as expression ---------------- */
test("RG-355: R <- works in expression positions and returns the value", async () => {
  const r1 = await rr("x <- 1\nprint(x <- x + 1)\nprint(x)");
  assert.deepEqual(errors(r1), []);
  assert.deepEqual(outputs(r1), ["c(2)", "c(2)"]);
  assert.deepEqual(vars(r1).x, [2]);

  const r2 = await rr("print(sum(v <- c(1, 2)))\nprint(v)");
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(outputs(r2), ["3", "c(1, 2)"]);
  assert.deepEqual(vars(r2).v, [1, 2]);

  const r3 = await rr("x <- (y <- 3)\nprint(x)\nprint(y)");
  assert.deepEqual(errors(r3), []);
  assert.deepEqual(outputs(r3), ["3", "3"]);

  const r4 = await rr("if ((z <- 2) > 1) { print(z) }");
  assert.deepEqual(errors(r4), []);
  assert.deepEqual(outputs(r4), ["2"]);
  assert.equal(vars(r4).z, 2);

  // 連鎖代入は右結合で全てに代入される
  const r5 = await rr("a <- b <- 5\nprint(a)\nprint(b)");
  assert.deepEqual(errors(r5), []);
  assert.deepEqual(outputs(r5), ["5", "5"]);
  const r6 = await rr("x <- y <- z <- 1\nprint(x + y + z)");
  assert.deepEqual(errors(r6), []);
  assert.deepEqual(outputs(r6), ["c(3)"]);
});

test("RG-355: R expression assignment matches statement semantics for index/member", async () => {
  const stmt = await rr("x <- c(1, 2, 3)\nx[2] <- 9\nprint(x)");
  assert.deepEqual(outputs(stmt), ["c(1, 9, 3)"]);
  const expr = await rr("x <- c(1, 2, 3)\nprint(x[2] <- 9)\nprint(x)");
  assert.deepEqual(errors(expr), []);
  assert.deepEqual(outputs(expr), ["9", "c(1, 9, 3)"]);

  const dfExpr = await rr(
    "df <- data.frame(a = c(1, 2))\nprint(df$a <- c(9, 9))\nprint(df$a)",
  );
  assert.deepEqual(errors(dfExpr), []);
  assert.deepEqual(outputs(dfExpr), ["c(9, 9)", "c(9, 9)"]);
});

/* ---------------- RG-358: AHK statement-form continuation ---------------- */
test("RG-358: AHK statement-form calls evaluate the whole argument expression", async () => {
  for (const [code, expected] of [
    ["MsgBox (2 + 3) * 4", ["20"]],
    ["MsgBox (10 - 3) - 2", ["5"]],
    ['MsgBox ("a" . "b") . "c"', ["abc"]],
    ["x := 3\nMsgBox (x + 1) * 2", ["8"]],
    ["MsgBox ((2 + 3)) * 4", ["20"]],
    ["MsgBox (1 + 1) . \"x\"", ["2x"]],
    ["y := 4\nMsgBox (y) * (y)", ["16"]],
  ]) {
    const r = await ahk(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), expected, code);
  }
  // 2引数形の第1引数も行末までが対象
  const two = await ahk('MsgBox (2 + 3) * 4, "T"');
  assert.deepEqual(errors(two), []);
  assert.deepEqual(outputs(two), ["20"]);
  // Click の括弧始まり引数列も同根として解消する
  const click = await ahk("Click (10), (20)");
  assert.deepEqual(errors(click), []);
});

test("RG-358: AHK if/while conditions continue after a leading parenthesized part", async () => {
  const r1 = await ahk('x := 5\nif (x) > 3 {\n MsgBox "big"\n}');
  assert.deepEqual(errors(r1), []);
  assert.deepEqual(outputs(r1), ["big"]);

  const r2 = await ahk("i := 0\nwhile (i + 1) <= 3 {\n i += 1\n}\nMsgBox i");
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(outputs(r2), ["3"]);
  assert.equal(vars(r2).i, 3);

  const r3 = await ahk('x := 2\nif (x) = 2 {\n MsgBox "eq"\n}');
  assert.deepEqual(outputs(r3), ["eq"]);

  const r4 = await ahk(
    'x := 1\nif (x) > 3 {\n MsgBox "big"\n} else if (x) > 0 {\n MsgBox "small"\n}',
  );
  assert.deepEqual(errors(r4), []);
  assert.deepEqual(outputs(r4), ["small"]);
});

test("RG-358 controls: previously correct AHK forms are unchanged", async () => {
  for (const [code, expected] of [
    ["MsgBox((2 + 3) * 4)", ["20"]],
    ["MsgBox 2 + 3 * 4", ["14"]],
    ["x := (2 + 3) * 4\nMsgBox x", ["20"]],
    ['x := 5\nif (x > 3) {\n MsgBox "big"\n}', ["big"]],
    ["MsgBox (5)", ["5"]],
  ]) {
    const r = await ahk(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), expected, code);
  }
});
