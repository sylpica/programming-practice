// バッチ6（スクリプト班・JavaScript）修正の回帰テスト。
// 対象：R27-N11（複数宣言子）／R27-N13（式位置の分割代入）／
// R27-N14（不正な分割代入形とアロー関数のオブジェクト引数形の名指し）／
// R27-N12（カンマ演算子を実装し虚偽原因を解消）／
// R27-N10（非有限値の最終状態直列化。UI.Vision の RG-208 と同型）。
// 一次情報：ECMAScript 仕様（LexicalDeclaration／AssignmentExpression／
// カンマ演算子）と実 Node の挙動。共有コア（js/core/script.js）の変更は
// 方言ゲート（js／ahk）と文脈ゲート（exprCtx）で閉じ、他方言の不変は
// 既存テスト全件で固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code) => {
  const d = getDefinition(id);
  const model = structuredClone(d.model.defaults);
  if (id === "autohotkey") model.event = null;
  return d.simulate(code, model);
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const js = (code) => run("javascript", code);

// ---------- R27-N11：複数宣言子 ----------
test("R27-N11: let/var/const multiple declarators work like Node", async () => {
  for (const kw of ["let", "var", "const"]) {
    const r = await js(`${kw} a = 1, b = 2; console.log(a, b);`);
    assert.deepEqual(errors(r), [], kw);
    assert.deepEqual(outputs(r), [["1 2"]], kw);
  }
});
test("R27-N11: no-initializer and mixed declarators", async () => {
  const r = await js("let a, b = 5, c; console.log(a, b, c);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["undefined 5 undefined"]]);
  const r2 = await js("let a = 1 + 2, b = a * 2, s = 'x', t = s + 'y'; console.log(a, b, t);");
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(outputs(r2), [["3 6 xy"]]);
});
test("R27-N11: three declarators, array/object initializers, block scope", async () => {
  const r = await js("let a = [1, 2], b = a[0], o = {v: 3}, w = o.v; console.log(b, w);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1 3"]]);
  const blk = await js("if (true) { let a = 1, b = 2; console.log(a, b); }");
  assert.deepEqual(errors(blk), []);
  assert.deepEqual(outputs(blk), [["1 2"]]);
});
test("R27-N11: destructuring declarator mixed with plain declarators", async () => {
  const r = await js("let [a, b] = [1, 2], c = 3; const {p} = {p: 9}, q = 1; console.log(a, b, c, p, q);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1 2 3 9 1"]]);
});
test("R27-N11: for-init multiple declarators (let and var)", async () => {
  const r = await js("for (let i = 0, j = 3; i < j; i++) { console.log(i); }");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["0", "1", "2"]]);
  const v = await js("for (var i = 0, j = 2; i < j; i++) { console.log(i); } console.log(i, j);");
  assert.deepEqual(errors(v), []);
  assert.deepEqual(outputs(v), [["0", "1", "2 2"]]);
});
test("R27-N11: const without initializer and duplicate names still stop by name", async () => {
  const c = await js("const a = 1, b;");
  assert.ok(errors(c).some((e) => e.includes("constには初期化式が必要です")), JSON.stringify(errors(c)));
  const dup = await js("let a = 1, a = 2;");
  assert.ok(errors(dup).some((e) => e.includes("重複")), JSON.stringify(errors(dup)));
  const tdz = await js("let a = b, b = 1;");
  assert.ok(errors(tdz).some((e) => e.includes("初期化前")), JSON.stringify(errors(tdz)));
});

// ---------- R27-N13：式位置の分割代入 ----------
test("R27-N13: destructuring assignment in call arguments and parentheses", async () => {
  const r = await js("let a; console.log([a] = [1]); console.log(a);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["[\n  1\n]", "1"]]);
  const p = await js("let a; let y = ([a] = [5]); console.log(a);");
  assert.deepEqual(errors(p), []);
  assert.deepEqual(outputs(p), [["5"]]);
  const multi = await js("let a; console.log('x', [a] = [2]); console.log(a);");
  assert.deepEqual(errors(multi), []);
  assert.deepEqual(outputs(multi), [["x [\n  2\n]", "2"]]);
});
test("R27-N13: destructuring assignment in condition, ternary, object/array elements", async () => {
  const cond = await js("let a; if ([a] = [1]) { console.log(a); }");
  assert.deepEqual(errors(cond), []);
  assert.deepEqual(outputs(cond), [["1"]]);
  const tern = await js("let a; let b = true ? ([a] = [7]) : 0; console.log(a);");
  assert.deepEqual(errors(tern), []);
  assert.deepEqual(outputs(tern), [["7"]]);
  const obj = await js("let a; let o = {v: ([a] = [4])}; console.log(a);");
  assert.deepEqual(errors(obj), []);
  assert.deepEqual(outputs(obj), [["4"]]);
  const arr = await js("let a; let arr = [[a] = [3]]; console.log(a, arr[0][0]);");
  assert.deepEqual(errors(arr), []);
  assert.deepEqual(outputs(arr), [["3 3"]]);
});
test("R27-N13: object destructuring assignment in expression positions", async () => {
  const r = await js("let a; console.log(({a} = {a: 6})); console.log(a);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [['{\n  "a": 6\n}', "6"]]);
  const y = await js("let a; let v = ({a} = {a: 6}); console.log(a);");
  assert.deepEqual(errors(y), []);
  assert.deepEqual(outputs(y), [["6"]]);
});
test("R27-N13: chained destructuring and plain chained assignment are expressions", async () => {
  const r = await js("let a; [a] = [b] = [7]; console.log(a, b);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["7 7"]]);
  const plain = await js("let a = 1; a = b = 3; console.log(a, b);");
  assert.deepEqual(errors(plain), []);
  assert.deepEqual(outputs(plain), [["3 3"]]);
  const paren = await js("let a = 1; let b = (a = 5); console.log(a, b);");
  assert.deepEqual(errors(paren), []);
  assert.deepEqual(outputs(paren), [["5 5"]]);
});
test("R27-N13: statement-position destructuring and plain code are untouched", async () => {
  const r = await js("let a; let b; [a, b] = [b, a];".replace("[a, b] = [b, a]", "a = 1; b = 2; [a, b] = [b, a]") + " console.log(a, b);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["2 1"]]);
  const lit = await js("let a = [3, 1]; let o = {v: 1}; console.log(a[0], o.v);");
  assert.deepEqual(errors(lit), []);
  assert.deepEqual(outputs(lit), [["3 1"]]);
});

// ---------- R27-N12：カンマ演算子（実装で処置） ----------
test("R27-N12: comma operator evaluates left to right and yields the last value", async () => {
  const r = await js("let a = (1, 2); console.log(a);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["2"]]);
  const three = await js("let x = (1, 2, 3); console.log(x);");
  assert.deepEqual(outputs(three), [["3"]]);
  const arg = await js("console.log((5, 6));");
  assert.deepEqual(outputs(arg), [["6"]]);
});
test("R27-N12: comma in assignment statements and separators stay distinct", async () => {
  const r = await js("let a; a = 1, console.log(a);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1"]]);
  // 区切りのカンマ（引数・配列・宣言子）は演算子として消費されない。
  const sep = await js("let a = 1, b = 2; console.log(a, b); console.log([a, b]);");
  assert.deepEqual(errors(sep), []);
  assert.deepEqual(outputs(sep), [["1 2", "[\n  1,\n  2\n]"]]);
});

// ---------- R27-N14：不正な分割代入形とアロー引数形の名指し ----------
test("R27-N14: rest with a default names the rest element, not a bracket", async () => {
  for (const code of ["let [...rest = []] = [1];", "let {a, ...rest = {}} = {a: 1};"]) {
    const r = await js(code);
    assert.ok(
      errors(r).some((e) => e.includes("残余要素") && e.includes("既定値")),
      code + " -> " + JSON.stringify(errors(r)),
    );
  }
});
test("R27-N14: bare rest names the rest element, not a generic expression error", async () => {
  for (const code of ["let {a, ...} = {a: 1};", "let [..., a] = [1];"]) {
    const r = await js(code);
    assert.ok(
      errors(r).some((e) => e.includes("残余要素") && e.includes("代入先")),
      code + " -> " + JSON.stringify(errors(r)),
    );
  }
  // 正当な残余は従来どおり動く。
  const ok = await js("let [...rest] = [1, 2]; let {a, ...o} = {a: 1, b: 2}; console.log(rest, o.b);");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), [["[\n  1,\n  2\n] 2"]]);
});
test("R27-N14: arrow with object-pattern parameter is named like other arrow forms", async () => {
  for (const code of ["const g = ({x}) => x;", "const g = ([a]) => a;", "const g = (a) => a;", "const g = () => 1;"]) {
    const r = await js(code);
    assert.ok(
      errors(r).some((e) => e.includes("未対応") && e.includes("アロー関数")),
      code + " -> " + JSON.stringify(errors(r)),
    );
  }
});

// ---------- R27-N10：非有限値の最終状態直列化 ----------
test("R27-N10: vars JSON round-trip matches the printed output for non-finite values", async () => {
  const cases = [
    ["let x = 1/0; console.log(x);", "x", "Infinity", "Infinity"],
    ["let x = -1/0; console.log(x);", "x", "-Infinity", "-Infinity"],
    ["let x = 0/0; console.log(x);", "x", "NaN", "NaN"],
  ];
  for (const [code, name, printed, stored] of cases) {
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), [[printed]], code);
    const roundTripped = JSON.parse(JSON.stringify(r.paths[0].vars));
    assert.equal(roundTripped[name], stored, code);
  }
});
test("R27-N10: nested non-finite values in arrays and objects are stringified in vars only", async () => {
  const r = await js("let x = [1/0, 0/0]; let o = {v: 1/0}; console.log(x, o.v);");
  assert.deepEqual(errors(r), []);
  const roundTripped = JSON.parse(JSON.stringify(r.paths[0].vars));
  assert.deepEqual(roundTripped.x, ["Infinity", "NaN"]);
  assert.deepEqual(roundTripped.o, { v: "Infinity" });
  // 実行中の数値としての働きは変えない（Infinity + 1 は Infinity のまま）。
  const calc = await js("let x = 1/0; let y = x + 1; console.log(y);");
  assert.deepEqual(outputs(calc), [["Infinity"]]);
  assert.equal(JSON.parse(JSON.stringify(calc.paths[0].vars)).y, "Infinity");
});
