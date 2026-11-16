// 修正バッチ10 pseudo 班（Round 31 擬似言語欠陥 N1・N2・N3＋内部トークン露出 N8）の検証。
// 一次情報：IPA 用語 Ver.5.1 別紙2（() は最高位の優先順位）、科目Bサンプル問題、
// 令和7年度公開問題 科目B 問5。監査報告 findings-r31-pseudo.md §4、
// findings-round31.md §2 R31-N8。
import test from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const pseudo = getDefinition("pseudo");
const run = (code, model) => pseudo.simulate(code, model || { globals: {}, args: [] });
const q = (code) => run(code).paths[0].vars.q;

// ---- N1：「の商」の付け直しは括弧で明示した被演算子へ及ばない ----

test("FIX10-PSEUDO N1 再現形：括弧内の商は括弧の範囲だけで評価される", () => {
  assert.equal(q("実数型: q ← 9 ÷ (2.5 の商)"), 4);
  assert.equal(q("実数型: q ← 9 ÷ (-2.5 の商)"), -4);
  assert.equal(q("実数型: q ← 2 × (3.5 の商)"), 6);
  assert.equal(q("実数型: q ← 100 ÷ 10 ÷ (2.5 の商)"), 5);
});

test("FIX10-PSEUDO N1 独自値：括弧つき quot 被演算子（÷／×／mod）", () => {
  assert.equal(q("実数型: q ← 15 ÷ (4.5 の商)"), 3); // 除数は 4、15 ÷ 4 の商
  assert.equal(q("実数型: q ← 3 × (2.9 の商)"), 6); // 3 × 2
  assert.equal(q("実数型: q ← 10.5 mod (2.5 の商)"), 0.5); // 10.5 mod 2
  assert.equal(q("実数型: q ← 9 ÷ ((2.5 の商))"), 4); // 二重括弧でも同じ
  assert.equal(q("実数型: q ← 3 × (2.5 の商) × 2"), 12); // × 連鎖の途中でも付け直さない
  assert.equal(q("実数型: q ← -(3.5 の商) × 2"), -6); // 単項符号の外側でも同じ
});

test("FIX10-PSEUDO N1 維持形：括弧なし連鎖・公式形・括弧の外の商は従来どおり", () => {
  assert.equal(q("実数型: q ← 7.5 ÷ 2 の商"), 3);
  assert.equal(q("実数型: q ← 7 ÷ 2.5 の商"), 2);
  assert.equal(q("実数型: q ← (7.0 ÷ 2) の商"), 3); // 商が括弧の外なら trunc のまま
  assert.equal(q("実数型: q ← 9 ÷ ((7.0 ÷ 2) の商)"), 3); // 括弧でくくった商は除数 3
  const arr = run("整数型の配列: array ← {1, 2, 3, 4, 5}\n整数型: q ← (arrayの要素数 ÷ 2 の商)");
  assert.equal(arr.paths[0].vars.q, 2);
});

// ---- N2：属性句「要素の和／行和／列和」は要素自身の実数性を保持する ----

test("FIX10-PSEUDO N2 再現形：実数要素の和を ÷ すると実数除算になる", () => {
  assert.equal(q("a ← {7.0, 8.0}\n実数型: q ← (aの要素の和) ÷ 2"), 7.5);
  assert.equal(q("実数型の二次元配列: a ← {{7.0, 8.0}, {1.0, 2.0}}\n実数型: q ← (aの行番号1の要素の和) ÷ 2"), 7.5);
  assert.equal(q("実数型の二次元配列: a ← {{7.0, 1.0}, {8.0, 2.0}}\n実数型: q ← (aの列番号1の要素の和) ÷ 2"), 7.5);
});

test("FIX10-PSEUDO N2 独自値・隣接形：未宣言二次元配列／変数経由／関数戻り／生成配列", () => {
  assert.equal(q("a ← {{7.0, 8.0}, {1, 2}}\n実数型: q ← (aの行番号1の要素の和) ÷ 2"), 7.5);
  assert.equal(q("a ← {{1, 8.0}, {2, 3}}\n実数型: q ← (aの列番号2の要素の和) ÷ 2"), 5.5);
  assert.equal(q("a ← {1.5, 2.5}\n実数型: q ← (aの要素の和) ÷ 2"), 2);
  assert.equal(q("a ← {{7.0, 8.0}, {1, 2}}\n実数型: q ← (aの要素の和) ÷ 2"), 9); // 二次元総和も実数性を保持
  assert.equal(q("a ← {7.0, 8.0}\ns ← aの要素の和\n実数型: q ← s ÷ 2"), 7.5); // 宣言なし変数経由
  assert.equal(q("a ← {2個の 3.5}\n実数型: q ← (aの要素の和) ÷ 2"), 3.5); // サイズ指定生成経由
  const fn = run("○実数型: f()\n  a ← {7.0, 8.0}\n  return (aの要素の和) ÷ 2\n実数型: q ← f()");
  assert.equal(fn.paths[0].vars.q, 7.5); // 関数戻り経由
});

test("FIX10-PSEUDO N2 維持形：整数だけの和は商のまま、R7問5は完全一致", () => {
  assert.equal(q("a ← {7, 8}\n実数型: q ← (aの要素の和) ÷ 2"), 7);
  assert.equal(q("a ← {{7, 8}, {1, 2}}\n実数型: q ← (aの行番号1の要素の和) ÷ 2"), 7);
  const f = run(`○実数型の二次元配列: f(実数型の二次元配列: data)
  実数型: t ← dataの要素の和
  整数型: row ← dataの行数
  整数型: col ← dataの列数
  実数型の二次元配列: result ← {row行col列の 未定義の値}
  整数型: r, c
  for (r を 1 から row まで 1 ずつ増やす)
    for (c を 1 から col まで 1 ずつ増やす)
      result[r, c] ← (dataの行番号rの要素の和) × (dataの列番号cの要素の和) ÷ t
    endfor
  endfor
  return result
実数型の二次元配列: ans ← f({{82, 6}, {58, 8}})`);
  assert.deepEqual(f.paths[0].vars.ans, [[80, 8], [60, 6]]);
});

// ---- N3：3値以上の出力文は出力文自体を名指して止まる ----

test("FIX10-PSEUDO N3 再現形：3値・4値の出力文は専用文言で止まる", () => {
  const three = run("整数型: a ← 1\n整数型: b ← 2\n整数型: c ← 3\naの値とbの値とcの値をこの順にコンマ区切りで出力する");
  assert.match(three.error.message, /出力文には対応していません/);
  assert.match(three.error.message, /この順にコンマ区切りで出力する/);
  assert.doesNotMatch(three.error.message, /「の」の後は/);
  const four = run("整数型: a ← 1\n整数型: b ← 2\n整数型: c ← 3\n整数型: d ← 4\naの値とbの値とcの値とdの値をこの順にコンマ区切りで出力する");
  assert.match(four.error.message, /出力文には対応していません/);
  assert.doesNotMatch(four.error.message, /「の」の後は/);
});

test("FIX10-PSEUDO N3 維持形：対応形式（式・属性句・添字を含む2値）は正常出力", () => {
  const basic = run("整数型: a ← 3\n整数型: b ← 9\naの値とbの値をこの順にコンマ区切りで出力する");
  assert.deepEqual(basic.paths[0].outputs.map((o) => o.text), ["3, 9"]);
  const rich = run("整数型の配列: a ← {5, 9}\n(a[2])の値と(aの要素数)の値をこの順にコンマ区切りで出力する");
  assert.deepEqual(rich.paths[0].outputs.map((o) => o.text), ["9, 2"]);
  const str = run("文字列型: b ← \"x\"\n\"の値と\"の値とbの値をこの順にコンマ区切りで出力する");
  assert.deepEqual(str.paths[0].outputs.map((o) => o.text), ["“の値と”, “x”"]);
});

// ---- N8（擬似分）：式の途中終了で原因が空にならない ----

test("FIX10-PSEUDO N8 再現形：代入式の途中終了は学習者の言葉で示す", () => {
  const result = run("整数型: x ← ");
  assert.equal(result.error.message, "式を解釈できません（式が途中で終わっています）");
  assert.doesNotMatch(result.error.message, /：$/);
  assert.doesNotMatch(result.error.message, /eof/i);
});

test("FIX10-PSEUDO N8 横断プローブ：宣言・条件・呼出し・配列・for でも空の原因を出さない", () => {
  const cases = [
    "整数型: x ← 1 +",
    "x ← ",
    "整数型: x ← 1 ×",
    "整数型: x ← (1 +",
    "整数型: x ← aの",
    "整数型: x ← a[",
    "a ← {1,",
    "○整数型: f(整数型: a)\n  return a + \n整数型: q ← f(1)",
    "○整数型: f(整数型: a)\n  return a\n整数型: q ← f(1,",
  ];
  for (const code of cases) {
    const result = run(code);
    assert.ok(result.error, code);
    assert.doesNotMatch(result.error.message, /：$/, code);
    assert.doesNotMatch(result.error.message, /eof/i, code);
  }
  const declOnly = run("整数型:");
  assert.match(declOnly.error.message, /宣言が途中で終わっています/);
  const declComma = run("整数型: x,");
  assert.match(declComma.error.message, /変数名が書かれていません/);
  const forEmpty = run("for ()\nendfor");
  assert.match(forEmpty.error.message, /制御記述が書かれていません/);
});
