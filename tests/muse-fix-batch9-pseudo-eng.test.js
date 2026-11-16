// 修正バッチ9 pseudo-eng 班（Round 30 擬似言語エンジン欠陥 R30-N4〜N9）の検証。
// 一次情報：IPA 科目Bサンプル問題、令和6年度・令和7年度公開問題 科目B、
// 用語 Ver.5.1 別紙2。監査報告 findings-r30-pseudo.md（D1=N4, D2=N5, D3=N6）、
// findings-r30-par.md（R30-PAR-8=N8, R30-PAR-9=N9）、
// findings-r30-f01b.md（R30F01B-N5=N7）。
import test from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const pseudo = getDefinition("pseudo");
const run = (code, model) => pseudo.simulate(code, model || { globals: {}, args: [] });
const entry = (path, name) => path.groups.flatMap((g) => g.entries).find(([n]) => n === name)?.[1];

// ---- N4（裁定 C1 改訂版）：注釈「実数として計算する」で ÷ が実数除算になる ----

test("FIX9-PSEUDO N4(a) サンプル問5形：注釈ありで整数÷整数が実数除算 0.4", () => {
  const block = run("整数型: a ← 2\n整数型: b ← 5\n実数型: r ← a ÷ b /* 実数として計算する */");
  assert.equal(block.paths[0].error, undefined);
  assert.equal(block.paths[0].vars.r, 0.4);
  const line = run("// 実数として計算する\n整数型: a ← 2\n整数型: b ← 5\n実数型: r ← a ÷ b");
  assert.equal(line.paths[0].vars.r, 0.4);
});

test("FIX9-PSEUDO N4(b) 令和6年問5形：注釈つき式 (1×6)÷(4×3) が 0.5", () => {
  const result = run("実数型: valueL\nvalueL ← (1 × 6) ÷ (4 × 3) /* 実数として計算する */");
  assert.equal(result.paths[0].error, undefined);
  assert.equal(result.paths[0].vars.valueL, 0.5);
});

test("FIX9-PSEUDO N4(c) 注釈なしの従来形は不変（商のまま）", () => {
  assert.equal(run("整数型: q ← 7 ÷ 2").paths[0].vars.q, 3);
  assert.equal(run("整数型: q ← 2 ÷ 5").paths[0].vars.q, 0);
  // 文字列リテラルの中の同文言は注釈ではないので切り替わらない
  const inString = run("文字列型: s ← \"実数として計算する\"\n整数型: q ← 7 ÷ 2");
  assert.equal(inString.paths[0].vars.q, 3);
  // 注釈があっても「の商」は常に trunc のまま
  const quot = run("整数型: q ← 7 ÷ 2 の商 /* 実数として計算する */");
  assert.equal(quot.paths[0].vars.q, 3);
});

// ---- N5：∞ リテラル ----

test("FIX9-PSEUDO N5 ∞／-∞／＋∞（全角符号込み）が実数リテラルとして使える", () => {
  const neg = run("実数型: maxL ← －∞");
  assert.equal(neg.paths[0].error, undefined);
  assert.equal(neg.paths[0].vars.maxL, -Infinity);
  assert.match(entry(neg.paths[0], "maxL"), /-∞/);
  const half = run("実数型: x ← -∞");
  assert.equal(half.paths[0].vars.x, -Infinity);
  const pos = run("実数型: x ← ＋∞\n論理型: big ← x > 100\n論理型: eq ← x = ∞");
  assert.equal(pos.paths[0].vars.x, Infinity);
  assert.equal(pos.paths[0].vars.big, true);
  assert.equal(pos.paths[0].vars.eq, true);
  // 令和6年問5の使い方：初期値 -∞ に対して実数が勝つ
  const init = run("実数型: valueL, maxL ← －∞\nvalueL ← 0.5 /* 実数として計算する */\n論理型: b ← valueL > maxL");
  assert.equal(init.paths[0].vars.b, true);
});

test("FIX9-PSEUDO N5 定義できない ∞ の組合せは捏造せず理由つきで止まる", () => {
  for (const code of ["実数型: x ← ∞ - ∞", "実数型: x ← ∞ ÷ ∞", "実数型: x ← ∞ × 0"]) {
    const result = run(code);
    assert.match(result.paths[0].error.message, /定義されません/, code);
  }
});

// ---- N6：入れ子生成でも葉の総数で上限を数える ----

test("FIX9-PSEUDO N6 入れ子生成の葉総数が 10,000 を超えると理由つきで止まる", () => {
  const over = run("整数型の配列の配列: a ← {6個の {2000個の 0}}");
  assert.match(over.paths[0].error.message, /要素数の指定が大きすぎます/);
  assert.match(over.paths[0].error.message, /12000/);
  const atCap = run("整数型の配列の配列: a ← {5個の {2000個の 0}}\n整数型: n ← a[1]の要素数");
  assert.equal(atCap.paths[0].error, undefined);
  assert.equal(atCap.paths[0].vars.n, 2000);
});

test("FIX9-PSEUDO N6 既存境界は維持（1次元・二次元とも 10,000 正常／超過は停止）", () => {
  assert.equal(run("整数型の配列: a ← {10000個の 0}\n整数型: n ← aの要素数").paths[0].vars.n, 10000);
  assert.match(run("整数型の配列: a ← {10001個の 0}").paths[0].error.message, /大きすぎます/);
  assert.equal(run("整数型の二次元配列: m ← {100行100列の 0}\n整数型: n ← mの行数").paths[0].vars.n, 100);
  assert.match(run("整数型の二次元配列: m ← {101行100列の 0}").paths[0].error.message, /大きすぎます/);
});

// ---- N7：「式 ÷ 式 の商」は除算全体に trunc を適用する ----

test("FIX9-PSEUDO N7 連鎖形の商は ÷ 全体の結果の trunc", () => {
  assert.equal(run("実数型: q ← 7.5 ÷ 2 の商").paths[0].vars.q, 3);
  assert.equal(run("実数型: q ← 7 ÷ 2.5 の商").paths[0].vars.q, 2);
  assert.equal(run("実数型: q ← 7.5 ÷ -2 の商").paths[0].vars.q, -3);
});

test("FIX9-PSEUDO N7 既存の正しい形は壊れない", () => {
  const arr = run("整数型の配列: array ← {1, 2, 3, 4, 5}\n整数型: q ← (arrayの要素数 ÷ 2 の商)\n整数型: p ← arrayの要素数 ÷ 2 の商");
  assert.equal(arr.paths[0].vars.q, 2);
  assert.equal(arr.paths[0].vars.p, 2);
  assert.equal(run("実数型: q ← 3.7 の商").paths[0].vars.q, 3);
  assert.equal(run("実数型: q ← (7.0 ÷ 2) の商").paths[0].vars.q, 3);
});

// ---- N8：文字列リテラルの中身は全角正規化しない ----

test("FIX9-PSEUDO N8 リテラル内の全角文字は原文どおり保持される", () => {
  const result = run("文字列型: s ← \"ａｂｃ\"\n文字列型: d ← \"１２３\"\n文字列型: t ← \"a＝b：c（d）\"");
  assert.equal(result.paths[0].vars.s, "ａｂｃ");
  assert.equal(result.paths[0].vars.d, "１２３");
  assert.equal(result.paths[0].vars.t, "a＝b：c（d）");
  const eq = run("論理型: b ← \"ａ\" ＝ \"a\"");
  assert.equal(eq.paths[0].vars.b, false);
});

test("FIX9-PSEUDO N8 コード側の全角正規化は従来どおり働く", () => {
  const result = run("整数型： x ← １ ＋ ２\n文字列型: s ← \"ab\"\n整数型: n ← sの文字数");
  assert.equal(result.paths[0].error, undefined);
  assert.equal(result.paths[0].vars.x, 3);
  assert.equal(result.paths[0].vars.n, 2);
});

// ---- N9：未対応の出力文は出力文自体を真因として名指す ----

test("FIX9-PSEUDO N9 「X の値を出力する」は出力形式を案内して止まる", () => {
  const result = run("整数型: x ← 5\nx の値を出力する");
  assert.equal(result.error.category, "未対応");
  assert.match(result.error.message, /出力文には対応していません/);
  assert.match(result.error.message, /この順にコンマ区切りで出力する/);
  assert.doesNotMatch(result.error.message, /「の」の後は/);
  // 対応形式は従来どおり動く
  const ok = run("整数型: a ← 1\n整数型: b ← 2\naの値とbの値をこの順にコンマ区切りで出力する");
  assert.deepEqual(ok.paths[0].outputs.map((o) => o.text), ["1, 2"]);
});

// ---- 公式問題の完成形の回帰（従来どおり一致することの確認） ----

test("FIX9-PSEUDO 公式回帰 サンプル問2（逆順・÷ の商）と問5断片", () => {
  const rev = run(`整数型の配列: array ← {1, 2, 3, 4, 5}
整数型: right, left
整数型: tmp
for (left を 1 から (arrayの要素数 ÷ 2 の商) まで 1 ずつ増やす)
  right ← arrayの要素数 - left + 1
  tmp ← array[left]
  array[left] ← array[right]
  array[right] ← tmp
endfor`);
  assert.deepEqual(rev.paths[0].vars.array, [5, 4, 3, 2, 1]);
});

test("FIX9-PSEUDO 公式回帰 令和6年問3断片（サイズ指定生成＋二次元代入）と問5断片", () => {
  const m = run("整数型: nodeNum ← 3\n整数型の二次元配列: adjMatrix ← {nodeNum行nodeNum列の 0}\n整数型: u ← 1\n整数型: v ← 2\nadjMatrix[u, v] ← 1\nadjMatrix[v, u] ← 1");
  assert.deepEqual(m.paths[0].vars.adjMatrix, [[0, 1, 0], [1, 0, 0], [0, 0, 0]]);
  const frag = run("実数型: valueL, maxL ← －∞\n整数型の配列: arrayM ← {3個の 0}\narrayM[1]の値を1増やす\nvalueL ← (1 × 6) ÷ (4 × 3) /* 実数として計算する */");
  assert.equal(frag.paths[0].error, undefined);
  assert.equal(frag.paths[0].vars.valueL, 0.5);
  assert.equal(frag.paths[0].vars.arrayM[0], 1);
});

test("FIX9-PSEUDO 公式回帰 令和7年問2 change（n=12 → 4）と問5 f（理論度数）", () => {
  const change = run(`○整数型: change(整数型: n)
  整数型: count ← 0
  整数型: rest ← n
  while (rest ≧ 0)
    count ← count + (rest ÷ 5 の商) + 1
    rest ← rest - 10
  endwhile
  return count
整数型: ans ← change(12)`);
  assert.equal(change.paths[0].vars.ans, 4);
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

test("FIX9-PSEUDO 開示：÷・注釈・実数型・サイズ指定生成・出力する の caution に裁定が明記される", () => {
  const byName = (name) => pseudo.reference.find((item) => item.name === name);
  assert.match(byName("÷").caution, /実数として計算する/);
  assert.match(byName("÷").caution, /注釈がなければ既定の解釈/);
  assert.match(byName("注釈").caution, /実数として計算する/);
  assert.match(byName("実数型").caution, /∞/);
  assert.match(byName("サイズ指定生成").caution, /葉の要素の総数/);
  assert.match(byName("出力する").caution, /の値を出力する/);
});
