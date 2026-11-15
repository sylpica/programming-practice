// バッチ8（AutoHotkey／JavaScript 班）修正の回帰テスト。対象：
// R29-N26（AHK 単語演算子の大小無視）／R29-N27（AHK コマンド形式呼出
// 行への行継続）／R29-N28（AHK 括弧内包中の行頭演算子継続）／
// R29-N29（JS 波括弧なし if 本体に続く else／else if と波括弧なし
// do-while 本体）／R29-N30（JS 残余＋既定値の名指しの全式位置への伝播）。
// 一次情報：AutoHotkey v2 公式ドキュメント（名前・キーワードの大小
// 無区別、Scripts.htm「Splitting a Long Line」の継続規則＝直上の行が
// 実際に式を含むかを問わない行単位の結合）、ECMAScript 文法
// （IfStatement／DoWhileStatement の単一文本体、分割代入の残余要素に
// 既定値は置けない・残余には代入先が必要）と実 Node の挙動。
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

/* ---------------- R29-N26: AHK 単語演算子の大小無視 ---------------- */
test("R29-N26: AND / OR / NOT in upper and mixed case work as operators", async () => {
  for (const [code, expected] of [
    ["x := true AND true\nMsgBox x", "1"],
    ["x := true And false\nMsgBox x", "0"],
    ["x := false OR true\nMsgBox x", "1"],
    ["x := false Or false\nMsgBox x", "0"],
    ["x := NOT false\nMsgBox x", "1"],
    ["x := Not true\nMsgBox x", "0"],
    ["x := NOT false AND true\nMsgBox x", "1"],
    ["x := true aNd NOT false\nMsgBox x", "1"],
  ]) {
    const r = await ahk(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), [[expected]], code);
  }
});
test("R29-N26: upper-case word operators work in conditions and continuations", async () => {
  const cond = await ahk("if true AND true {\n MsgBox 1\n}");
  assert.deepEqual(errors(cond), []);
  assert.deepEqual(outputs(cond), [["1"]]);
  const cont = await ahk("x := true\nAND true\nMsgBox x");
  assert.deepEqual(errors(cont), []);
  assert.deepEqual(outputs(cont), [["1"]]);
  const contOr = await ahk("x := false\nOr true\nMsgBox x");
  assert.deepEqual(errors(contOr), []);
  assert.deepEqual(outputs(contOr), [["1"]]);
});
test("R29-N26: identifier case handling is unchanged (vars case-insensitive, in/is semantics untouched)", async () => {
  // 変数名は従来どおり大小無区別（是正の影響範囲は演算子・キーワードのみ）
  const v = await ahk("Foo := 5\nMsgBox foo");
  assert.deepEqual(errors(v), []);
  assert.deepEqual(outputs(v), [["5"]]);
  // In という変数名も従来どおり使える（in の同一行形は UC-5 のまま未対応）
  const named = await ahk("In := 5\nMsgBox In");
  assert.deepEqual(errors(named), []);
  assert.deepEqual(outputs(named), [["5"]]);
  const inSameLine = await ahk("x := 'a' in 'abc'\nMsgBox x");
  assert.ok(errors(inSameLine).length > 0);
  assert.match(errors(inSameLine)[0], /代入の区切りが必要です/);
  // 小文字形は従来どおり
  const lower = await ahk("x := true and not false\nMsgBox x");
  assert.deepEqual(errors(lower), []);
  assert.deepEqual(outputs(lower), [["1"]]);
});

/* ---------------- R29-N27: AHK コマンド形式呼出行への行継続 ---------------- */
test("R29-N27: line-leading operator continues a command-form call line", async () => {
  const plus = await ahk("MsgBox 2\n+ 3");
  assert.deepEqual(errors(plus), []);
  assert.deepEqual(outputs(plus), [["5"]]);
  const dot = await ahk("MsgBox 'a'\n. 'b'");
  assert.deepEqual(errors(dot), []);
  assert.deepEqual(outputs(dot), [["ab"]]);
  const variable = await ahk("x := 10\nMsgBox x\n+ 3");
  assert.deepEqual(errors(variable), []);
  assert.deepEqual(outputs(variable), [["13"]]);
  const commented = await ahk("MsgBox 2 ; note\n+ 3");
  assert.deepEqual(errors(commented), []);
  assert.deepEqual(outputs(commented), [["5"]]);
});
test("R29-N27: line-end continuation into a command-form call line", async () => {
  const basic = await ahk("MsgBox 2 +\n3");
  assert.deepEqual(errors(basic), []);
  assert.deepEqual(outputs(basic), [["5"]]);
  const chain = await ahk("MsgBox 2 +\n3 +\n4");
  assert.deepEqual(errors(chain), []);
  assert.deepEqual(outputs(chain), [["9"]]);
  const mixed = await ahk("MsgBox 2 +\n3\n* 4");
  assert.deepEqual(errors(mixed), []);
  assert.deepEqual(outputs(mixed), [["14"]]);
  // 代入文の行末継続は従来どおり（同じ結合経路で不変）
  const assign = await ahk("x := 2 +\n3\nMsgBox x");
  assert.deepEqual(errors(assign), []);
  assert.deepEqual(outputs(assign), [["5"]]);
});
test("R29-N27: parenthesized call keeps call-result semantics; incomplete+statement still names the dedicated cause", async () => {
  // 括弧形式の呼出結果への加算は破棄されるのが正しい（実物どおり）
  const paren = await ahk("MsgBox(2)\n+ 3");
  assert.deepEqual(errors(paren), []);
  assert.deepEqual(outputs(paren), [["2"]]);
  // 未完の式に文が続く形は RG-228 の専用文言のまま（行末結合に化けない）
  const stmt = await ahk("x := 2 +\nMsgBox x");
  assert.match(errors(stmt)[0] || "", /式が途中で終わっています：1行目の式が未完成のまま、次の文が始まっています/);
  const brace = await ahk("if true {\n x := 2 +\n}\nMsgBox x");
  assert.match(errors(brace)[0] || "", /式が途中で終わっています：2行目の式が未完成のまま/);
});

/* ---------------- R29-N28: AHK 括弧内包中の行頭演算子継続 ---------------- */
test("R29-N28: line-leading operator continuation works inside parentheses", async () => {
  const basic = await ahk("x := (2\n+ 3)\nMsgBox x");
  assert.deepEqual(errors(basic), []);
  assert.deepEqual(outputs(basic), [["5"]]);
  const nested = await ahk("x := ((2\n+ 3))\nMsgBox x");
  assert.deepEqual(errors(nested), []);
  assert.deepEqual(outputs(nested), [["5"]]);
  const word = await ahk("x := (true\nand true)\nMsgBox x");
  assert.deepEqual(errors(word), []);
  assert.deepEqual(outputs(word), [["1"]]);
  const callArg = await ahk("MsgBox('a'\n. 'b')");
  assert.deepEqual(errors(callArg), []);
  assert.deepEqual(outputs(callArg), [["ab"]]);
  const callArgPlus = await ahk("MsgBox(2\n+ 3)");
  assert.deepEqual(errors(callArgPlus), []);
  assert.deepEqual(outputs(callArgPlus), [["5"]]);
});
test("R29-N28: continuation inside an if condition matches the single-line form", async () => {
  // if (式) == 値 の形は同一行形自体が UC-2（未確認候補）の表面であり、
  // 継続形が同一行形と完全に同じ挙動になることが是正の到達点。
  const multi = errors(await ahk("if (2\n+ 3) == 5 {\n MsgBox 1\n}"));
  const single = errors(await ahk("if (2 + 3) == 5 {\n MsgBox 1\n}"));
  assert.deepEqual(multi, single);
  // 条件の括弧内包で継続が成立し値が確定する形は動作する
  const ok = await ahk("x := 0\nif (2\n+ 3 = 5) {\n x := 1\n}\nMsgBox x");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), [["1"]]);
});

/* ---------------- R29-N29: JS 波括弧なし本体＋else／do-while ---------------- */
test("R29-N29: else after an unbraced if body (assignment form)", async () => {
  const f = await js("let x; if (false) x = 1; else x = 2; console.log(x);");
  assert.deepEqual(errors(f), []);
  assert.deepEqual(outputs(f), [["2"]]);
  const t = await js("let x; if (true) x = 1; else x = 2; console.log(x);");
  assert.deepEqual(errors(t), []);
  assert.deepEqual(outputs(t), [["1"]]);
  const blockElse = await js("let x; if (false) x = 1; else { x = 2; } console.log(x);");
  assert.deepEqual(errors(blockElse), []);
  assert.deepEqual(outputs(blockElse), [["2"]]);
  const blockThen = await js("let x; if (false) { x = 1; } else x = 2; console.log(x);");
  assert.deepEqual(errors(blockThen), []);
  assert.deepEqual(outputs(blockThen), [["2"]]);
});
test("R29-N29: else-if chains and call/update bodies without braces", async () => {
  const chain = await js("let x; if (false) x = 1; else if (true) x = 2; else x = 3; console.log(x);");
  assert.deepEqual(errors(chain), []);
  assert.deepEqual(outputs(chain), [["2"]]);
  const chainLast = await js("let x = 0; if (false) x = 1; else if (false) x = 2; else x = 3; console.log(x);");
  assert.deepEqual(errors(chainLast), []);
  assert.deepEqual(outputs(chainLast), [["3"]]);
  const call = await js("if (false) console.log(1); else console.log(2);");
  assert.deepEqual(errors(call), []);
  assert.deepEqual(outputs(call), [["2"]]);
  const update = await js("let n = 0; if (false) n++; else n = 5; console.log(n);");
  assert.deepEqual(errors(update), []);
  assert.deepEqual(outputs(update), [["5"]]);
  // dangling else は最も近い if に結ぶ（実文法どおり）
  const dangling = await js("let x = 0; if (true) if (false) x = 1; else x = 2; console.log(x);");
  assert.deepEqual(errors(dangling), []);
  assert.deepEqual(outputs(dangling), [["2"]]);
  // for 本体が波括弧なし if-else の形も動作する
  const forBody = await js("let s = 0; for (let i = 0; i < 3; i++) if (i == 1) s += 10; else s += 1; console.log(s);");
  assert.deepEqual(errors(forBody), []);
  assert.deepEqual(outputs(forBody), [["12"]]);
});
test("R29-N29: do-while with an unbraced body", async () => {
  const update = await js("let n = 0; do n++; while (n < 3); console.log(n);");
  assert.deepEqual(errors(update), []);
  assert.deepEqual(outputs(update), [["3"]]);
  const assign = await js("let n = 0; do n = n + 1; while (n < 3); console.log(n);");
  assert.deepEqual(errors(assign), []);
  assert.deepEqual(outputs(assign), [["3"]]);
  const callComma = await js("let n = 0; do console.log(n), n++; while (n < 2);");
  assert.deepEqual(errors(callComma), []);
  assert.deepEqual(outputs(callComma), [["0", "1"]]);
  // 対照：波括弧あり do-while・波括弧なし while・else なし if は従来どおり
  const braced = await js("let n = 0; do { n++; } while (n < 3); console.log(n);");
  assert.deepEqual(errors(braced), []);
  assert.deepEqual(outputs(braced), [["3"]]);
  const noElse = await js("let x = 0; if (true) x = 5; console.log(x);");
  assert.deepEqual(errors(noElse), []);
  assert.deepEqual(outputs(noElse), [["5"]]);
});

/* ---------------- R29-N30: JS 残余＋既定値の名指しの全式位置への伝播 ---------------- */
const REST_DEFAULT_MSG = /には既定値を指定できません/;
const REST_TARGET_MSG = /には代入先が必要です/;

test("R29-N30: rest with default names the true cause in every expression position", async () => {
  for (const code of [
    "let o = {k: [...r = []]};", // オブジェクト値
    "let y = {p: {...r = {}}};", // オブジェクト値に内包されたオブジェクト形
    "let y = true ? [...r = []] : 0;", // 三項分岐
    "let y = false || [...r = []];", // 論理演算（||）
    "let y = true && [...r = []];", // 論理演算（&&）
    "console.log([...r = []]);", // 呼出引数
    "let q; (q = [...r = []]);", // 代入右辺の括弧
    "let arr = [[...r = []]];", // 配列要素の入れ子
    "let arr = [0]; let z = arr[[...r = []]];", // 添字位置
    "let y = ![...r = []];", // 単項演算の被演算子
    "console.log([{...r = {}}] = [{}]);", // 呼出引数内のパターン形
    "let y = [[...r = []]] = [[1]];", // 入れ子パターン形
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", REST_DEFAULT_MSG, code);
  }
});
test("R29-N30: bare rest without a target names the missing target in expression positions", async () => {
  for (const code of [
    "let o = {k: [...]};",
    "let y = true ? [...] : 0;",
    "console.log([...]);",
    "let y = [{...}] = [{}];",
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", REST_TARGET_MSG, code);
  }
});
test("R29-N30: genuine spread and valid forms keep their existing behaviour", async () => {
  // 本物のスプレッド（対象＋既定値の断片ではない形）はスプレッド名指しを維持
  for (const code of [
    "let a = [...[1]];",
    "let r = [1]; let a = [...r];",
    "let o = {k: [...r]};",
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", /スプレッド構文/, code);
    assert.doesNotMatch(errors(r)[0] || "", REST_DEFAULT_MSG, code);
  }
  // 正当な残余・リテラル既定値は従来どおり動作する
  const valid = await js("let a, r; [a, ...r] = [1, 2, 3]; console.log(a, r.length);");
  assert.deepEqual(errors(valid), []);
  assert.deepEqual(outputs(valid), [["1 2"]]);
  const litDefault = await js("let x; let arr = [x = 5]; console.log(arr[0], x);");
  assert.deepEqual(errors(litDefault), []);
  assert.deepEqual(outputs(litDefault), [["5 5"]]);
  // 宣言位置・文位置・while 条件・for-of 宣言の名指しは従来どおり
  for (const code of [
    "let [...r = []] = [1];",
    "let a; [a, ...r = []] = [1, 2];",
    "for (let [...r = []] of [[1]]) { }",
  ]) {
    const r = await js(code);
    assert.match(errors(r)[0] || "", REST_DEFAULT_MSG, code);
  }
});
