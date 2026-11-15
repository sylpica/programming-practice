// バッチ3（JavaScript／共有スクリプトエンジン班）修正の回帰テスト。
// 対象：R24-N12（代入ターゲット検証を右辺評価より前に）／R24-N13（不正な
// 数値リテラルを名指す）／R24-N24（引数欠落は undefined）／R24-N25
// （typeof のグローバル名解決）／R24-N15 の JS 部分（in／instanceof を
// 名指す）／R24-N36（UI.Vision サンドボックスの undefined）。
// 一次情報：ECMAScript 仕様と実 Node（v24）の挙動。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const js = (code) => run("javascript", code);

// ---------- R24-N12：代入ターゲットの構文検証が先 ----------
test("R24-N12: literal target names the form, not the undefined RHS name", async () => {
  const r = await js("1 = x;");
  assert.ok(errors(r).some((e) => e.startsWith("SyntaxError:") && e.includes("代入先が不正")), JSON.stringify(errors(r)));
  assert.ok(!errors(r).join(" ").includes("未定義の名前"), JSON.stringify(errors(r)));
});
test("R24-N12: call result and binary result targets are named as forms", async () => {
  for (const code of ["Math.abs(1) = 2;", "(1 + 2) = 3;"]) {
    const r = await js(code);
    assert.ok(errors(r).some((e) => e.includes("代入先が不正")), code);
  }
});
test("R24-N12: valid assignment targets still work (JS)", async () => {
  const r = await js("let o = {}; o.x = 3; let a = [1, 2]; a[0] = 9; let v = 1; v = 5; console.log(o.x, a[0], v);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["3 9 5"]]);
});
test("R24-N12: no regression for R / AutoHotkey / C assignment forms", async () => {
  const r = await run("r", "x <- 1\nprint(x)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1"]]);
  const ahk = await run("autohotkey", "#Requires AutoHotkey v2.0\n^!n:: {\n    x := 1\n    SendText \"ok\"\n}");
  assert.deepEqual(errors(ahk), []);
  const c = await run("c", '#include <stdio.h>\nint main(void) { int x = 5; int *p = &x; *p = 9; printf("%d", x); return 0; }');
  assert.deepEqual(errors(c), []);
  assert.deepEqual(outputs(c), [["9"]]);
});

// ---------- R24-N13：不正な数値リテラル ----------
for (const lit of ["1e", "0x", "0b2", "0o8", "1.5n", "0xZZ"]) {
  test(`R24-N13: invalid literal ${lit} is named`, async () => {
    const r = await js(`console.log(${lit});`);
    assert.ok(errors(r).some((e) => e.includes("数値リテラルの書き方が不正") && e.includes(lit)), JSON.stringify(errors(r)));
    assert.ok(!errors(r).join(" ").includes(") が必要です"), JSON.stringify(errors(r)));
  });
}
test("R24-N13: valid literals still evaluate (incl. radix BigInt)", async () => {
  const r = await js("console.log(1_000, 0xFF, 0b101, 0o17, 1e5, 1.5e-3, 123n, 0x1Fn, 0b101n, 0o17n);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1000 255 5 15 100000 0.0015 123n 31n 5n 15n"]]);
});
test("R24-N13: pre-existing literal messages are preserved", async () => {
  const zero = await js("console.log(08);");
  assert.ok(errors(zero).some((e) => e.includes("先行ゼロ")), JSON.stringify(errors(zero)));
  const suffix = await js("console.log(1f);");
  assert.ok(errors(suffix).some((e) => e.includes("型接尾辞")), JSON.stringify(errors(suffix)));
  const sep = await js("console.log(1__0);");
  assert.ok(errors(sep).some((e) => e.includes("1__0")), JSON.stringify(errors(sep)));
});

// ---------- R24-N24：引数欠落は undefined ----------
test("R24-N24: Math functions with no argument give NaN (real Node behaviour)", async () => {
  const r = await js("console.log(Math.abs(), Math.floor(), Math.round());");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["NaN NaN NaN"]]);
});
test("R24-N24: JSON.stringify() with no argument gives undefined", async () => {
  const r = await js("console.log(JSON.stringify());");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["undefined"]]);
});
test("R24-N24: other no-arg builtins match Node", async () => {
  const r = await js("console.log(Number(), String() === '', Boolean(), parseInt(), document.getElementById());");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["0 true false NaN null"]]);
  const el = await js("console.log(document.createElement().tagName);");
  assert.deepEqual(outputs(el), [["UNDEFINED"]]);
});

// ---------- R24-N25：typeof のグローバル名解決 ----------
test("R24-N25: typeof over major globals matches Node", async () => {
  const r = await js("console.log(typeof BigInt, typeof Array, typeof Object, typeof Symbol, typeof Function, typeof Date, typeof Map, typeof Set, typeof Promise, typeof Proxy, typeof Error, typeof RegExp, typeof parseFloat, typeof isNaN, typeof isFinite, typeof Math, typeof JSON, typeof console, typeof document, typeof globalThis, typeof window, typeof Intl, typeof Reflect, typeof undefined, typeof NaN, typeof Infinity, typeof parseInt, typeof nosuchname);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [[
    "function function function function function function function function function function function function function function function object object object object object object object object undefined number number function undefined",
  ]]);
});
test("R24-N25: typeof still respects user shadowing", async () => {
  const r = await js("let BigInt = 5; console.log(typeof BigInt);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["number"]]);
});

// ---------- R24-N15（JS）：未対応演算子を名指す ----------
for (const [code, op] of [["console.log(0 in [9, 8]);", "in 演算子"], ["console.log(5 instanceof Number);", "instanceof 演算子"]]) {
  test(`R24-N15: ${op} is named honestly`, async () => {
    const r = await js(code);
    assert.ok(errors(r).some((e) => e.includes(op)), JSON.stringify(errors(r)));
    assert.ok(!errors(r).join(" ").includes(") が必要です"), JSON.stringify(errors(r)));
  });
}
test("R24-N15: supported operators are unaffected", async () => {
  const r = await js("console.log(1 + 2, 7, 2 * 3, 10 % 3);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["3 7 6 1"]]);
});

// ---------- R24-N36：UI.Vision サンドボックスの undefined ----------
const uvRun = (cmds) => run("uivision", JSON.stringify({ Commands: cmds }));
const C = (Command, Target = "", Value = "") => ({ Command, Target, Value });
test("R24-N36: executeScript_Sandbox return undefined; stores undefined without a false ReferenceError", async () => {
  const r = await uvRun([C("executeScript_Sandbox", "return undefined;", "R"), C("echo", "[${R}]")]);
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["[undefined]"]]);
});
test("R24-N36: NaN / Infinity also resolve as defined globals in the sandbox", async () => {
  for (const [expr, want] of [["NaN", "NaN"], ["Infinity", "Infinity"], ["null", "null"]]) {
    const r = await uvRun([C("executeScript_Sandbox", `return ${expr};`, "R"), C("echo", "[${R}]")]);
    assert.deepEqual(errors(r), [], expr);
    assert.deepEqual(outputs(r), [[`[${want}]`]], expr);
  }
});
