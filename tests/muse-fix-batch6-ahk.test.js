// バッチ6（スクリプト班・AutoHotkey）修正の回帰テスト。
// 対象：R27-N15（行末未完の式が後続文を飲み込む。バッチ5で悪化した
// 機構の根本是正）と R27-N8（複合代入・連鎖代入の名指しと実装）。
// 一次情報：AutoHotkey v2 公式ドキュメント Variables.htm（代入演算子
// 一覧・連鎖代入・カンマの多文演算子）と Scripts.htm の継続行規則。
// 検査は変換前形が残る準備層（phaseB）に置く：コマンド形式の文は
// rewriteSegment で呼出式に化けるため、共有パーサ側では文／式の
// 区別が原理的に付かない。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (code) => {
  const d = getDefinition("autohotkey");
  const model = structuredClone(d.model.defaults);
  model.event = null;
  return d.simulate(code, model);
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const topError = (r) => r.error || null;

// ---------- R27-N15：未完の式＋コマンド形式文 ----------
test("R27-N15: ternary/binary/empty RHS followed by a command-form statement stops naming the incomplete expression", async () => {
  const cases = [
    "x := 1 ? 2 :\nMsgBox x",
    "x := 1 ?\nMsgBox x",
    "x := 2 *\nMsgBox x",
    "x := 2 -\nMsgBox x",
    "x :=\nMsgBox x",
    "x := 2 +\nSendText \"A\"",
    "x := 2 +\ny := 3",
    "x := 2 +\nx += 3",
    "x := !\nMsgBox x",
    "if true {\n y := 1 ? 2 :\n MsgBox y\n}",
  ];
  for (const code of cases) {
    const r = await run(code);
    const e = topError(r);
    assert.ok(e, code + " should stop at parse level");
    assert.equal(e.category, "SyntaxError", code);
    assert.match(e.message, /式が途中で終わっています/, code);
    assert.match(e.message, /行目の式が未完成/, code);
    assert.deepEqual(outputs(r), [], code + " must not execute anything");
  }
});
test("R27-N15: attribution points at the incomplete line", async () => {
  const r = await run("x := 1 ? 2 :\nMsgBox x");
  assert.equal(topError(r).line, 1);
  const nested = await run("if true {\n y := 1 ? 2 :\n MsgBox y\n}");
  assert.equal(topError(nested).line, 2);
});
test("R27-N15: legitimate continuations keep working", async () => {
  const cases = [
    ["x := 2 +\n3\nMsgBox x", ["5"]],
    ["x :=\n5\nMsgBox x", ["5"]],
    ["x := \"a\" .\n\"b\"\nMsgBox x", ["ab"]],
    ["x := [1,\n2]\nMsgBox x[2]", ["2"]],
    ["x := 2 + ; comment\n3\nMsgBox x", ["5"]],
    ["x := 2 +\n(y := 3)\nMsgBox x", ["5"]],
    ["x := 2 +\ny\nMsgBox x", null], // y 未定義の NameError（真因）になる
  ];
  for (const [code, expected] of cases) {
    const r = await run(code);
    assert.equal(topError(r), null, code);
    if (expected) assert.deepEqual(outputs(r), [expected], code);
    else assert.ok(errors(r).some((e) => e.includes("未定義の名前：y")), code);
  }
});
test("R27-N15: complete statements and templates are untouched", async () => {
  const cases = [
    ["x := 5\nMsgBox x", ["5"]],
    ["x := 1.5\nMsgBox x", ["1.5"]],
    ["a := [10, 20]\na[2] += 5\nMsgBox a[2]\nMsgBox a[1]++\nMsgBox a[1]", ["25", "10", "11"]],
    ["total := 0\nfor idx, v in [10, 20] {\n total += v\n}\nMsgBox total", ["30"]],
    ["Loop 2 {\n MsgBox A_Index\n}", ["1", "2"]],
  ];
  for (const [code, expected] of cases) {
    const r = await run(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), [expected], code);
  }
});

// ---------- R27-N8：複合代入・連鎖代入 ----------
test("R27-N8: bit compound assignments stop naming the operator (base bit ops are unsupported)", async () => {
  for (const op of ["&=", "|=", "^=", "<<=", ">>=", ">>>="]) {
    const r = await run(`x := 6\nx ${op} 1\nMsgBox x`);
    assert.equal(topError(r), null, op);
    assert.ok(
      errors(r).some((e) => e.includes("未対応") && e.includes(op) && e.includes("ビット演算は未対応")),
      op + " -> " + JSON.stringify(errors(r)),
    );
    // 演算子で停止し、値は書き換わらない。
    assert.deepEqual(r.paths.map((p) => p.vars.x), [6], op);
  }
});
test("R27-N8: **= names that AutoHotkey has no such assignment operator", async () => {
  const r = await run("x := 2\nx **= 3\nMsgBox x");
  const e = topError(r);
  assert.ok(e && e.category === "未対応", JSON.stringify(e));
  assert.match(e.message, /\*\*=/);
  assert.match(e.message, /AutoHotkeyに \*\*= という代入演算子はありません/);
});
test("R27-N8: chained assignment is implemented (right-associative, returns the value)", async () => {
  const r = await run("x := y := 5\nMsgBox x\nMsgBox y");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["5", "5"]]);
  const re = await run("x := 1\ny := 2\nx := y := 9\nMsgBox x\nMsgBox y");
  assert.deepEqual(errors(re), []);
  assert.deepEqual(outputs(re), [["9", "9"]]);
  const paren = await run("x := 2\ny := (x := 7)\nMsgBox y");
  assert.deepEqual(errors(paren), []);
  assert.deepEqual(outputs(paren), [["7"]]);
});
test("R27-N8: comma multi-statement line keeps both assignments (legal AHK)", async () => {
  const r = await run("a := 1, b := 2\nMsgBox a\nMsgBox b");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1", "2"]]);
});
test("R27-N8: supported compounds still work, including subscript targets", async () => {
  const r = await run("x := 5\nx .= \"a\"\nMsgBox x\ny := 3\ny += 2\nMsgBox y");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["5a", "5"]]);
  const idx = await run("arr := [1, 2]\narr[1] += 5\nMsgBox arr[1]");
  assert.deepEqual(errors(idx), []);
  assert.deepEqual(outputs(idx), [["6"]]);
  const idxStop = await run("arr := [1, 2]\narr[1] &= 3\nMsgBox arr[1]");
  assert.ok(errors(idxStop).some((e) => e.includes("&=")), JSON.stringify(errors(idxStop)));
});
