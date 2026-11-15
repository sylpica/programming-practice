// バッチ5（コア班・共有スクリプトエンジン）修正の回帰テスト。
// 対象：R26-N7（JavaScript：文位置・宣言位置の分割代入を実装し、虚偽の
// Invalid LHS 名指しを解消）／R26-N16（AutoHotkey：三項演算子 ?: と累乗 **
// を実装し、虚偽原因・単独 * の名指しを解消。<< / >> の名指しも是正）。
// 一次情報：実 Node 24.22.1 の実走、AutoHotkey v2 公式ドキュメントの演算子表。
// 共有コア（js/core/script.js）の変更は全て方言ゲート（js／ahk）で閉じ、
// 他方言の挙動不変を対照テストで固定する。
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
const ahk = (code) => run("autohotkey", code);

// ---------- R26-N7：文位置の配列分割代入 ----------
test("R26-N7: swap [a, b] = [b, a] works like Node", async () => {
  const r = await js("let a = 1; let b = 2; [a, b] = [b, a]; console.log(a, b);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["2 1"]]);
});
test("R26-N7: holes, defaults, rest, member/index and nested patterns", async () => {
  const r = await js(
    "let a; let b; [a, , b = 9] = [1]; let [...rest] = [7, 8];" +
    " let o = { p: 0 }; let arr = [0]; [arr[0], o.p] = [5, 6];" +
    " let [n1, [n2]] = [3, [4]]; let [s1] = \"z\";" +
    " console.log(a, b, rest, arr[0], o.p, n1, n2, s1);",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1 9 [\n  7,\n  8\n] 5 6 3 4 z"]]);
});
test("R26-N7: rest may take a nested pattern (Node-verified)", async () => {
  const r = await js("let [x, ...[y, z]] = [1, 2, 3]; console.log(x, y, z);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1 2 3"]]);
});
test("R26-N7: parenthesized object destructuring assignment works", async () => {
  const r = await js("let a; let b; ({a, b} = {a: 10, b: 20}); console.log(a, b);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["10 20"]]);
});
test("R26-N7: declaration destructuring (array and object, defaults/rest)", async () => {
  const r = await js(
    "let [a, b = 2] = [1]; const {p: q, m = 7, ...rest} = {p: 8, x: 1};" +
    " var [c] = [3]; console.log(a, b, q, m, rest.x, c);",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1 2 8 7 1 3"]]);
});
test("R26-N7: invalid targets are still named as Invalid LHS", async () => {
  for (const code of ["[1, b] = [1, 2];", "let [f()] = [1];", "[true] = [1];"]) {
    const r = await js(code);
    assert.ok(
      errors(r).some((e) => e.startsWith("SyntaxError:") && e.includes("代入先が不正") && e.includes("Invalid left-hand side")),
      code + " -> " + JSON.stringify(errors(r)),
    );
  }
});
test("R26-N7: rest not last and declaration member targets are named", async () => {
  const r1 = await js("[...r, a] = [1, 2];");
  assert.ok(errors(r1).some((e) => e.includes("残余要素")), JSON.stringify(errors(r1)));
  const r2 = await js("let o = {}; let [o.p] = [1];");
  assert.ok(errors(r2).some((e) => e.includes("宣言の分割代入では")), JSON.stringify(errors(r2)));
});
test("R26-N7: non-iterable / null RHS stops as TypeError, not a false syntax claim", async () => {
  const r1 = await js("let [q] = null;");
  assert.ok(errors(r1).some((e) => e.startsWith("TypeError:") && e.includes("反復可能")), JSON.stringify(errors(r1)));
  const r2 = await js("let {a} = null;");
  assert.ok(errors(r2).some((e) => e.startsWith("TypeError:")), JSON.stringify(errors(r2)));
});
test("R26-N7: array literal expression statements and normal code are untouched", async () => {
  const r = await js("[1, 2]; let a = [1, 2]; console.log(a[0] + a[1]);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["3"]]);
});
test("R26-N7: other dialects keep the named 分割代入 stop (gate check)", async () => {
  const r = await run("r", "x <- c(1, 2)\nprint(x)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["c(1, 2)"]]);
});

// ---------- R26-N16：AutoHotkey 三項演算子 ----------
test("R26-N16: AHK ternary works in call, assignment and if positions", async () => {
  const r1 = await ahk('MsgBox (1 > 0 ? "y" : "n")');
  assert.deepEqual(errors(r1), []);
  assert.deepEqual(outputs(r1), [["y"]]);
  const r2 = await ahk('x := 0 ? "y" : "n"\nMsgBox x');
  assert.deepEqual(outputs(r2), [["n"]]);
  const r3 = await ahk("x := 5\nif (x > 0 ? true : false) {\n y := 1\n}\nMsgBox y");
  assert.deepEqual(errors(r3), []);
  assert.deepEqual(outputs(r3), [["1"]]);
});
test("R26-N16: AHK ternary is short-circuit and nests right-associatively", async () => {
  const r1 = await ahk("x := 1 ? 5 : 1 / 0\nMsgBox x");
  assert.deepEqual(errors(r1), []);
  assert.deepEqual(outputs(r1), [["5"]]);
  const r2 = await ahk("x := 0 ? 2 : 0 ? 3 : 4\nMsgBox x");
  assert.deepEqual(outputs(r2), [["4"]]);
});
test("R26-N16: AHK power ** evaluates (right-assoc, above unary minus)", async () => {
  const r1 = await ahk("x := 2 ** 3\nMsgBox x");
  assert.deepEqual(errors(r1), []);
  assert.deepEqual(outputs(r1), [["8"]]);
  const r2 = await ahk("x := 2 ** 3 ** 2\nMsgBox x");
  assert.deepEqual(outputs(r2), [["512"]]);
  const r3 = await ahk("x := -2 ** 2\nMsgBox x");
  assert.deepEqual(outputs(r3), [["-4"]]);
});
test("R26-N16: AHK shift operators are named as bit operations, not a separator error", async () => {
  for (const code of ["x := 1 << 2", "x := 8 >> 1", "x := 5 & 3", "x := 1 ^ 2"]) {
    const r = await ahk(code);
    assert.ok(errors(r).some((e) => e.includes("ビット演算")), code + " -> " + JSON.stringify(errors(r)));
    assert.ok(!errors(r).join(" ").includes("区切りが必要です"), code);
  }
});
test("R26-N16: JS ** and R sequence operator are unchanged by the ahk gates", async () => {
  const r = await js("let x = 1 << 2; console.log(x, true ? 1 : 2);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["4 1"]]);
  const rr = await run("r", "x <- 1:3\nprint(x)");
  assert.deepEqual(errors(rr), []);
  assert.deepEqual(outputs(rr), [["c(1, 2, 3)"]]);
});
