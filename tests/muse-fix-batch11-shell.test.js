// 修正バッチ11・シェル班（PowerShell）の回帰テスト。
// 対象: RG-354（R32-PAR-8）PowerShell 代入ファミリーの隣接形。
// (1) 多重代入 $a, $b = 1, 2（実 PowerShell で合法）が「変数・プロパティ・
// 添字へ代入してください」という虚偽原因で停止していた。多重代入その
// ものを名指して止める（実装はしない）。
// (2) 括弧内リテラル代入 (5 = 3) 等が「) が必要です」という虚偽原因で
// 停止していた。不正な代入先そのものを名指して止める。
// (3) 横断スイープ: 括弧内代入式の各位置（引数／条件／for ヘッダ／配列
// リテラル内／添字内／メンバー名括弧内）で、位置依存の虚偽原因が残ら
// ないことと、正常形（連鎖代入・複合代入の括弧内形・型付き代入）が
// 壊れていないことを固定する。
// 一次情報: Microsoft Learn about_Assignment_Operators（多重代入
// 「Assigning multiple variables」$a, $b, $c = 1, 2, 3／代入構文
// <assignable-expression> <assignment-operator> <value>、代入できる式は
// 変数とプロパティ）／about_Operators「Grouping assignment statements」
// （括弧で囲んだ代入は値を返す）。実 pwsh は当VMに無いため、受理範囲は
// 既存の正常形＋従来から右辺位置で受理されていた形の位置依存解消に限る。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as ps } from "../js/types/powershell/index.js";
const runPS = (code) => ps.simulate(code, structuredClone(ps.model.defaults));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const out = (r) =>
  (r.paths || []).map((p) =>
    p.outputs.filter((o) => o.channel === "pipeline").map((o) => o.text),
  );
const expectErrPS = (code, pattern, notPattern) => {
  const r = runPS(code);
  assert.ok(errors(r).length > 0, code + " は停止すべき");
  assert.match(errors(r)[0].message, pattern, code);
  if (notPattern) assert.doesNotMatch(errors(r)[0].message, notPattern, code);
  return r;
};
const expectOutPS = (code, expected) => {
  const r = runPS(code);
  assert.deepEqual(errors(r), [], code + ": " + JSON.stringify(errors(r)));
  assert.deepEqual(out(r), expected, code);
};
const MULTI = /未対応：多重代入/;
const NOT_FALSE = /代入してください|\) が必要です/;

// ---------- (1) 多重代入は多重代入そのものを名指して止まる ----------
test("batch11-shell RG-354 multiple assignment at statement level names multiple assignment", () => {
  for (const code of [
    "$a, $b = 1, 2",
    "$a, $b, $c = 1, 2, 3",
    "$a,$b=1,2",
    "$a , $b = 1 , 2",
    "$a, $b = $b, $a",
    "$a, $b = 1",
    "$a, $b = (1, 2)",
    "${a}, $b = 1, 2",
    // メンバー・添字が混ざる形も多重代入である
    "$a[0], $b = 1, 2",
    "$a, $obj = 1, 2",
    // 括弧で囲んだカンマ列も同じ左辺の形である
    "($a, $b) = 1, 2",
  ]) {
    const r = expectErrPS(code, MULTI, NOT_FALSE);
    assert.equal(errors(r)[0].category, "未対応", code);
  }
});

test("batch11-shell RG-354 multiple assignment in expression positions names multiple assignment", () => {
  for (const code of [
    "($a, $b = 1, 2)",
    "Write-Output ($a, $b = 1, 2)",
    "($a, $b = 1, 2) | Write-Output",
    "if ($a, $b = 1, 2) { 1 }",
    "while ($a, $b = 1, 2) { 1 }",
    "for ($a, $b = 1, 2; $false; ) { 1 }",
    "$x = ($a, $b = 1, 2)",
    "$h = @{k = ($a, $b = 1, 2)}",
    "@($a, $b = 1, 2)",
  ])
    expectErrPS(code, MULTI, NOT_FALSE);
});

test("batch11-shell RG-354 compound assignment to multiple targets names the compound form", () => {
  for (const code of ["$a, $b += 1, 2", "($a, $b += 1)"])
    expectErrPS(code, /代入先が不正です：複数の代入先への複合代入（\+=）/, NOT_FALSE);
  // 要素に代入できない形が混ざれば、その要素が真因として名指される
  const r = expectErrPS(
    "$a, 5 = 1, 2",
    /代入先が不正です：数値リテラル 5には代入できません/,
    NOT_FALSE,
  );
  assert.equal(errors(r)[0].category, "SyntaxError");
  expectErrPS(
    "($a, 5 = 1, 2)",
    /代入先が不正です：数値リテラル 5には代入できません/,
    NOT_FALSE,
  );
});

// ---------- (2) 括弧内リテラル代入は不正な代入先を名指して止まる ----------
test("batch11-shell RG-354 literal assignment targets in parentheses name the invalid target", () => {
  for (const [code, pattern] of [
    ["(5 = 3)", /代入先が不正です：数値リテラル 5には代入できません/],
    ["Write-Output (5 = 3)", /代入先が不正です：数値リテラル 5には代入できません/],
    ["(5 += 3)", /代入先が不正です：数値リテラル 5には代入できません/],
    ["(5 *= 2)", /代入先が不正です：数値リテラル 5には代入できません/],
    ["('x' = 3)", /代入先が不正です：文字列リテラルには代入できません/],
    ["Write-Output ('x' = 3)", /代入先が不正です：文字列リテラルには代入できません/],
    ["('x' += 'y')", /代入先が不正です：文字列リテラルには代入できません/],
    ["($a + $b = 3)", /代入先が不正です：演算式の結果には代入できません/],
    ["((5) = 3)", /代入先が不正です：括弧内の式の結果には代入できません/],
    ["([int]5 = 3)", /代入先が不正です：型変換の結果には代入できません/],
  ]) {
    const r = expectErrPS(code, pattern, NOT_FALSE);
    assert.equal(errors(r)[0].category, "SyntaxError", code);
  }
});

test("batch11-shell RG-354 invalid assignment targets in every parenthesised position name the target", () => {
  for (const code of [
    "if (5 = 3) { 1 }",
    "(((5 = 3)))",
    "$((5 = 3))",
    "$x = (5 = 3)",
    "$x = [int](5 = 3)",
    "[int](5 = 3)",
    "-(5 = 3)",
    "1 + (5 = 3)",
    "(5 = 3) + 1",
    "$h = @{k = (5 = 3)}",
    "@{k = (5 = 3)}",
    "@((5 = 3), 1)",
    "@(1, (5 = 3))",
    "$a = @(1, (5 = 3))",
    // 添字内も式の位置であり、リテラルへの代入は代入先が真因
    "$a = @(10,20); $a[5 = 3]",
    "$a = @(10,20); ($a[5 = 3])",
  ])
    expectErrPS(code, /代入先が不正です：/, NOT_FALSE);
});

// ---------- (3) 対照: 正常な代入形は壊れていない ----------
test("batch11-shell RG-354 maintained: parenthesised, chained, compound and typed assignments still work", () => {
  expectOutPS("Write-Output ($a = 5)", [["5"]]);
  expectOutPS("($a = 5)", [["5"]]);
  expectOutPS("($a = 5)\n$a", [["5", "5"]]);
  expectOutPS("Write-Output ($a = $b = 1)", [["1"]]);
  expectOutPS("$a = $b = 1\n$a + $b", [["2"]]);
  expectOutPS("($a = $b = $c = 7); $c", [["7", "7"]]);
  expectOutPS("$a = 5; ($a += 2); $a", [["7", "7"]]);
  expectOutPS("($a -= 1)", [["-1"]]);
  expectOutPS("([int]$x = '42')", [["42"]]);
  expectOutPS("if ($a = 5) { Write-Output $a }", [["5"]]);
  expectOutPS("$arr = @(0,0); ($arr[0] = 5); $arr", [["5", "5", "0"]]);
  expectOutPS("for ($i = 0; $i -lt 2; $i++) { $i }", [["0", "1"]]);
  // $() 内の代入文は従来どおり文として処理され出力しない
  expectOutPS("$($a = 5)", [[]]);
  expectOutPS("$(($a = 5))", [["5"]]);
});

test("batch11-shell RG-354 maintained: statement-level non-multiple targets keep the batch10 naming", () => {
  // バッチ10で固定された文位置の文言は不変（[int]5 = 3 のピン留めを含む）
  expectErrPS("[int]5 = 3", /変数・プロパティ・添字へ代入してください/);
  expectErrPS("5 = 3", /変数・プロパティ・添字へ代入してください/);
  expectErrPS("$(5 = 3)", /変数・プロパティ・添字へ代入してください/);
  // 引数モードの "=" は従来どおり文字列引数として渡る
  expectOutPS("Write-Output $a, $b = 1, 2", [["=", "1", "2"]]);
});

// ---------- (3) スイープ: 配列リテラル内・添字内・メンバー名括弧内の位置依存解消 ----------
test("batch11-shell RG-354 sweep: assignment expressions inside array literals work in every position", () => {
  // 従来は代入文の右辺でのみ漏れて受理され、文頭では虚偽原因だった
  expectOutPS("@($a = 5)", [["5"]]);
  expectOutPS("@($a = 5, 6)", [["5", "6"]]);
  expectOutPS("@($a += 5)", [["5"]]);
  expectOutPS("@($a = 5; $b = 6)", [["5", "6"]]);
  expectOutPS("@($a = 5; $a)", [["5", "5"]]);
  expectOutPS("$x = @($a = 5); $x", [["5"]]);
  expectOutPS("Write-Output @($a = 5)", [["5"]]);
  expectOutPS("@(($a = 5))", [["5"]]);
});

test("batch11-shell RG-354 sweep: assignment expressions inside index and member-name parentheses work", () => {
  // 添字内の代入式（実 PowerShell で受理される形）
  expectOutPS("$a = @(10,20); $a[$i = 1]", [["20"]]);
  expectOutPS("$a = @(10,20); $a[$i = 1]\n$i", [["20", "1"]]);
  expectOutPS("$a = @(10,20); ($a[$i = 1])", [["20"]]);
  // メンバー名の括弧内の代入式
  expectOutPS("$h = @{k=5}; $h.($k = 'k')", [["5"]]);
});
