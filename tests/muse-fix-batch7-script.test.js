// バッチ7（スクリプト班：AutoHotkey／Power Automate／JavaScript）修正の
// 回帰テスト。対象：R28-N1（AHK 行頭演算子の継続）／R28-N12（AHK 未完式
// ＋ブロック閉じ } の帰属）／R28-N13（PA 値側 %変数% 始まり形の空白
// すり抜け）／R28-N14（JS 文位置の括弧グループ先頭の分割代入シーケンス）
// ／R28-N15（JS 式位置の不正な残余形の名指し）。
// 一次情報：AutoHotkey v2 公式ドキュメント（Scripts.htm「Splitting a
// Long Line」／Language.htm の Line continuation：カンマまたは式演算子
// （++／-- を除く）で始まる行は直上の行と自動的に結合される。結合は
// 直上の行が実際に式を含むかを問わない）、ECMAScript 文法（括弧内の
// カンマ演算子／分割代入の残余要素に既定値は置けない・残余には代入先
// が必要）と実 Node の挙動、Power Automate の %…% 式記法（条件側の
// 既存挙動との一致）。
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
const ahk = (code) => run("autohotkey", code);
const js = (code) => run("javascript", code);

/* ---------------- R28-N1: AHK 行頭演算子の継続 ---------------- */
test("R28-N1: line starting with + / - continues the previous line", async () => {
  const r = await ahk("x := 2\n+ 3\nMsgBox x");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["5"]]);
  const r2 = await ahk("x := 5\n- 2\nMsgBox x");
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(outputs(r2), [["3"]]);
  const chain = await ahk("x := 1\n+ 2\n+ 3\nMsgBox x");
  assert.deepEqual(errors(chain), []);
  assert.deepEqual(outputs(chain), [["6"]]);
});
test("R28-N1: dot continuation concatenates and member continuation reads the property", async () => {
  const cat = await ahk('x := "a"\n. "b"\nMsgBox x');
  assert.deepEqual(errors(cat), []);
  assert.deepEqual(outputs(cat), [["ab"]]);
  const mem = await ahk("o := {k: 7}\nx := o\n.k\nMsgBox x");
  assert.deepEqual(errors(mem), []);
  assert.deepEqual(outputs(mem), [["7"]]);
  const memChain = await ahk("o := {k: 7}\nx := o\n.k\n+ 1\nMsgBox x");
  assert.deepEqual(errors(memChain), []);
  assert.deepEqual(outputs(memChain), [["8"]]);
});
test("R28-N1: logical, multiplicative, comparison and ternary continuations", async () => {
  const or = await ahk("x := false\n|| true\nMsgBox x");
  assert.deepEqual(errors(or), []);
  assert.deepEqual(outputs(or), [["1"]]);
  const mul = await ahk("x := 2\n* 3\n+ 4\nMsgBox x");
  assert.deepEqual(errors(mul), []);
  assert.deepEqual(outputs(mul), [["10"]]);
  const cmp = await ahk("x := 5\n>= 3\nMsgBox x");
  assert.deepEqual(errors(cmp), []);
  assert.deepEqual(outputs(cmp), [["1"]]);
  const ter = await ahk('x := true\n? "yes"\n: "no"\nMsgBox x');
  assert.deepEqual(errors(ter), []);
  assert.deepEqual(outputs(ter), [["yes"]]);
  const pow = await ahk("x := 2\n** 3\nMsgBox x");
  assert.deepEqual(errors(pow), []);
  assert.deepEqual(outputs(pow), [["8"]]);
  const mod = await ahk("x := 7\n% 3\nMsgBox x");
  assert.deepEqual(errors(mod), []);
  assert.deepEqual(outputs(mod), [["1"]]);
});
test("R28-N1: comma continuation joins a multi-statement line; word operator continues a condition", async () => {
  const comma = await ahk("x := 1\n, y := 2\nMsgBox x + y");
  assert.deepEqual(errors(comma), []);
  assert.deepEqual(outputs(comma), [["3"]]);
  const cond = await ahk('a := 1\nb := 2\nif a = 1\nand b = 2\n MsgBox "both"');
  assert.deepEqual(errors(cond), []);
  assert.deepEqual(outputs(cond), [["both"]]);
  const inBlock = await ahk("if true {\n y := 10\n - 4\n MsgBox y\n}");
  assert.deepEqual(errors(inBlock), []);
  assert.deepEqual(outputs(inBlock), [["6"]]);
});
test("R28-N1: continuation composes with row-end continuation and comments", async () => {
  // 行末継続（RG-228 の正当な継続）と行頭継続の組み合わせで壊れない
  const both = await ahk("x := 2 +\n+ 3\nMsgBox x");
  assert.deepEqual(errors(both), []);
  assert.deepEqual(outputs(both), [["5"]]);
  const chained = await ahk("x := 2 +\n3\n* 4\nMsgBox x");
  assert.deepEqual(errors(chained), []);
  assert.deepEqual(outputs(chained), [["14"]]);
  const prevComment = await ahk("x := 2 ; note\n+ 3\nMsgBox x");
  assert.deepEqual(errors(prevComment), []);
  assert.deepEqual(outputs(prevComment), [["5"]]);
  const ownComment = await ahk("x := 2\n+ 3 ; three\nMsgBox x");
  assert.deepEqual(errors(ownComment), []);
  assert.deepEqual(outputs(ownComment), [["5"]]);
  const across = await ahk("x := 2\n\n; a comment\n+ 3\nMsgBox x");
  assert.deepEqual(errors(across), []);
  assert.deepEqual(outputs(across), [["5"]]);
  const acrossBlock = await ahk("x := 2\n/* multi\nline */\n+ 3\nMsgBox x");
  assert.deepEqual(errors(acrossBlock), []);
  assert.deepEqual(outputs(acrossBlock), [["5"]]);
});
test("R28-N1: ++ / -- and assignment starts are NOT continuations (official exception)", async () => {
  // 公式の例外：++／-- で始まる行は結合されない（前置形自体は従来どおり
  // 名指しで止まる。結合されて黙って化けることはない）
  const pre = await ahk("x := 1\n++x\nMsgBox x");
  assert.ok(errors(pre).length > 0);
  assert.ok(errors(pre)[0].includes("++"));
  const assign = await ahk("x := 1\n:= 5\nMsgBox x");
  assert.ok(errors(assign).length > 0);
});
test("R28-N1: no merge into block boundaries; unsupported operators keep their own naming", async () => {
  const afterClose = await ahk("x := 1\nif true {\n x := 2\n}\n+ 10\nMsgBox x");
  assert.deepEqual(errors(afterClose), []);
  assert.deepEqual(outputs(afterClose), [["2"]]);
  // 継続で届いたビット演算子・整数除算は、同行形と同じ未対応の名指しになる
  for (const [cont, same] of [
    ["x := 1\n<< 3\nMsgBox x", "x := 1 << 3\nMsgBox x"],
    ["x := 6\n& 3\nMsgBox x", "x := 6 & 3\nMsgBox x"],
    ["x := 7\n// 2\nMsgBox x", "x := 7 // 2\nMsgBox x"],
  ]) {
    const a = errors(await ahk(cont));
    const b = errors(await ahk(same));
    assert.ok(a.length > 0, cont);
    assert.deepEqual(a, b, cont);
  }
});

/* ---------------- R28-N12: AHK 未完式＋ブロック閉じ ---------------- */
test("R28-N12: incomplete expression followed by } uses the RG-228 dedicated message", async () => {
  const r = await ahk("if true {\n x := 2 +\n}\nMsgBox x");
  assert.ok(errors(r).length > 0);
  assert.match(errors(r)[0], /式が途中で終わっています：2行目の式が未完成のまま、次の文が始まっています/);
  const elseForm = await ahk("if true {\n x := 2 +\n} else {\n MsgBox 1\n}");
  assert.match(errors(elseForm)[0], /式が途中で終わっています：2行目の式が未完成のまま/);
  const topLevel = await ahk("x := 2 +\n}\nMsgBox x");
  assert.match(errors(topLevel)[0], /式が途中で終わっています：1行目の式が未完成のまま/);
});
test("R28-N12: statement follower keeps the dedicated message; valid blocks are untouched", async () => {
  const stmt = await ahk("if true {\n x := 2 +\n MsgBox x\n}");
  assert.match(errors(stmt)[0], /式が途中で終わっています：2行目の式が未完成のまま/);
  const ok = await ahk("if true {\n x := 2 + 3\n}\nMsgBox x");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), [["5"]]);
});

/* ---------------- R28-N13: Power Automate 値側の空白すり抜け ---------------- */
const pa = getDefinition("powerautomate");
const paRun = async (actions) =>
  pa.simulate(JSON.stringify({ name: "f", actions }), structuredClone(pa.model.defaults));
const paErr = async (actions) => {
  const r = await paRun(actions);
  return r.error?.message || r.paths?.[0]?.error?.message || null;
};
const setN = (n) => [{ action: "Set variable", target: "N", value: n }];
const WRAP_MSG = /%変数% で始まる文字列は式として解釈できません/;

test("R28-N13: value-side %var%-starting form stops even when padded with whitespace", async () => {
  for (const v of [" %N% + 1%", "%N% + 1% ", " %N% + 1% ", "\t%N% + 1%\t"]) {
    const msg = await paErr([...setN(3), { action: "Set variable", target: "R", value: v }]);
    assert.match(msg || "", WRAP_MSG, JSON.stringify(v));
    const msg2 = await paErr([...setN(3), { action: "Display message", value: v }]);
    assert.match(msg2 || "", WRAP_MSG, JSON.stringify(v));
  }
  const fe = await paErr([
    ...setN(3),
    { action: "For each", target: "It", value: " %N% + 1%" },
    { action: "Display message", value: "x" },
    { action: "End" },
  ]);
  assert.match(fe || "", WRAP_MSG);
});
test("R28-N13: genuine wrapped forms with padding evaluate; plain text keeps its spaces", async () => {
  const wrapped = await paRun([...setN(3), { action: "Set variable", target: "R", value: " %N + 1% " }]);
  assert.ok(!wrapped.error && !wrapped.paths[0].error);
  assert.equal(wrapped.paths[0].vars.R, 4);
  const single = await paRun([...setN(3), { action: "Set variable", target: "R", value: " %N% " }]);
  assert.equal(single.paths[0].vars.R, 3);
  const text = await paRun([...setN(3), { action: "Set variable", target: "R", value: "  hello  " }]);
  assert.equal(text.paths[0].vars.R, "  hello  ");
  // 末尾 % のない形は PAD の通常の文字列補間として正当（本件に含めない）
  const interp = await paRun([...setN(3), { action: "Set variable", target: "R", value: "%N% + 1" }]);
  assert.equal(interp.paths[0].vars.R, "3 + 1");
});
test("R28-N13: condition side with padding still stops (unchanged)", async () => {
  const flow = [
    ...setN(3),
    { action: "If", condition: " %N% + 1 > 3% " },
    { action: "Display message", value: "yes" },
    { action: "Else" },
    { action: "Display message", value: "no" },
    { action: "End" },
  ];
  assert.ok(await paErr(flow));
});

/* ---------------- R28-N14: JS 文位置の括弧グループ先頭の分割代入シーケンス ---------------- */
test("R28-N14: parenthesized sequence starting with array destructuring works", async () => {
  const r = await js("let a, b; ([a] = [5], [b] = [6]); console.log(a + b);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["11"]]);
  const mixed = await js("let a, x; ([a] = [1], x = 2); console.log(a, x);");
  assert.deepEqual(errors(mixed), []);
  assert.deepEqual(outputs(mixed), [["1 2"]]);
  const three = await js("let a, b, c; ([a] = [1], [b] = [2], [c] = [3]); console.log(a, b, c);");
  assert.deepEqual(errors(three), []);
  assert.deepEqual(outputs(three), [["1 2 3"]]);
  const block = await js("let a; if (true) { ([a] = [1], a = 2); } console.log(a);");
  assert.deepEqual(errors(block), []);
  assert.deepEqual(outputs(block), [["2"]]);
});
test("R28-N14: object-first sequence and outer comma chain also work", async () => {
  const obj2 = await js("let a, x; ({a} = {a: 9}, x = 2); console.log(a, x);");
  assert.deepEqual(errors(obj2), []);
  assert.deepEqual(outputs(obj2), [["9 2"]]);
  const outer = await js("let a, x, y; ([a] = [1], x = 2), y = 3; console.log(a, x, y);");
  assert.deepEqual(errors(outer), []);
  assert.deepEqual(outputs(outer), [["1 2 3"]]);
});
test("R28-N14: controls stay intact (single, double paren, expression position, plain first)", async () => {
  const single = await js("let a; ([a] = [1]); console.log(a);");
  assert.deepEqual(errors(single), []);
  assert.deepEqual(outputs(single), [["1"]]);
  const dbl = await js("let a, b; (([a] = [5], [b] = [6])); console.log(a + b);");
  assert.deepEqual(errors(dbl), []);
  assert.deepEqual(outputs(dbl), [["11"]]);
  const exprPos = await js("let a, b; let y = ([a] = [1], [b] = [2], 9); console.log(a, b, y);");
  assert.deepEqual(errors(exprPos), []);
  assert.deepEqual(outputs(exprPos), [["1 2 9"]]);
  const plainFirst = await js("let a, x; (x = 1, [a] = [2]); console.log(a, x);");
  assert.deepEqual(errors(plainFirst), []);
  assert.deepEqual(outputs(plainFirst), [["2 1"]]);
});

/* ---------------- R28-N15: JS 式位置の不正な残余形の名指し ---------------- */
// 接尾辞はコードベース内で残余要素の名指し文言にだけ現れる一意な部分
const REST_DEFAULT_MSG = /には既定値を指定できません/;
const REST_TARGET_MSG = /には代入先が必要です/;

test("R28-N15: rest with default in expression position names the true cause", async () => {
  const stmt = await js("let a; [a, ...r = []] = [1, 2];");
  assert.match(errors(stmt)[0] || "", REST_DEFAULT_MSG);
  const paren = await js("let a; ([a, ...r = []] = [1, 2]);");
  assert.match(errors(paren)[0] || "", REST_DEFAULT_MSG);
  const obj = await js("let a; let o = {a: 1, b: 2}; ({a, ...r = {}} = o);");
  assert.match(errors(obj)[0] || "", REST_DEFAULT_MSG);
  const rhs = await js("let a; let y = ([a, ...r = []] = [1, 2]);");
  assert.match(errors(rhs)[0] || "", REST_DEFAULT_MSG);
  const arg = await js("let a; console.log([a, ...r = []] = [1, 2]);");
  assert.match(errors(arg)[0] || "", REST_DEFAULT_MSG);
  const nested = await js("let a; [[a, ...r = []]] = [[1, 2]];");
  assert.match(errors(nested)[0] || "", REST_DEFAULT_MSG);
});
test("R28-N15: bare rest in expression position names the missing target", async () => {
  const arr = await js("let a; [a, ...] = [1, 2];");
  assert.match(errors(arr)[0] || "", REST_TARGET_MSG);
  const obj = await js("let o = {a: 1}; ({a, ...} = o);");
  assert.match(errors(obj)[0] || "", REST_TARGET_MSG);
});
test("R28-N15: declaration position unchanged; genuine spread keeps its own naming", async () => {
  const decl = await js("let [a, ...r = []] = [1, 2];");
  assert.match(errors(decl)[0] || "", REST_DEFAULT_MSG);
  const declObj = await js("let {a, ...r = {}} = {a: 1};");
  assert.match(errors(declObj)[0] || "", REST_DEFAULT_MSG);
  // 本物のスプレッド要素（リテラル位置）は従来どおりスプレッド構文の名指し
  const spread = await js("let arr = [...[1, 2]]; console.log(arr);");
  assert.match(errors(spread)[0] || "", /スプレッド構文/);
  assert.doesNotMatch(errors(spread)[0] || "", REST_DEFAULT_MSG);
  // R29-N30 で裁定変更：`...対象 = 既定値` の断片は、式位置によらず
  // 残余＋既定値の名指しで一貫させる（バッチ7の「= が続かないリテラル
  // 形はスプレッド名指し」という切り分けは、オブジェクト値・三項・
  // 論理・呼出引数等の位置で真因が化ける R29-N30 の是正により置換）。
  // 本物のスプレッド（上の [...[1, 2]] 形）は従来どおりスプレッド名指し。
  const spreadAssign = await js("let r; let arr = [...r = [1]]; console.log(arr);");
  assert.match(errors(spreadAssign)[0] || "", REST_DEFAULT_MSG);
});
test("R28-N15: valid rest assignment and literal defaults keep working", async () => {
  const valid = await js("let a, r; [a, ...r] = [1, 2, 3]; console.log(a, r.length);");
  assert.deepEqual(errors(valid), []);
  assert.deepEqual(outputs(valid), [["1 2"]]);
  const litDefault = await js("let x; let arr = [x = 5]; console.log(arr[0], x);");
  assert.deepEqual(errors(litDefault), []);
  assert.deepEqual(outputs(litDefault), [["5 5"]]);
});
