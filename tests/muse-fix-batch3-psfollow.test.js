// 修正バッチ3・PowerShell追随班の回帰テスト。
// 対象は js/types/powershell/engine.js のみ：
//  R24-N3 の残り表面（乗算の繰返し意味論。統合時裁定：繰返しは左辺が
//  文字列／配列の形のみで、逆方向は about_Arithmetic_Operators の
//  「左端の型が演算を決める」原則どおり数値変換の成否で決まる）
//  R24-N30 の照合配線（switch の options を既存の -like／-match／-ceq
//  意味論へ配線する）。
// 一次情報は Microsoft Learn「about_Arithmetic_Operators」
// 「about_Type_Conversion」「about_Switch」。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/powershell/index.js";
const run = (code, extra = {}) =>
  d.simulate(code, { ...structuredClone(d.model.defaults), ...extra });
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean),
  out = (r) =>
    r.paths.map((p) =>
      p.outputs.filter((o) => o.channel === "pipeline").map((o) => o.text),
    );
const expectOut = (code, expected) => {
  const r = run(code);
  assert.deepEqual(errors(r), [], code + ": " + JSON.stringify(errors(r)));
  assert.deepEqual(out(r), expected, code);
};
const expectErr = (code, pattern) => {
  const r = run(code);
  assert.ok(errors(r).length > 0, code + " は停止すべき");
  assert.match(errors(r)[0].message, pattern, code);
};

// ---------- R24-N3 残り：逆方向は繰返しにならない（統合時裁定） ----------
// about_Arithmetic_Operators：評価方法は左端のオブジェクトの型で決まり、
// 右辺をその型へ変換できなければ演算は失敗する。乗算は厳密には交換可能
// ではなく、実例 16 + "file" は変換エラー。繰返しの実例は左辺が文字列／
// 配列の形のみのため、数値×配列／数値×非数値文字列は変換エラーで停止する。
test("batch3-psfollow R24-N3 number times array stops with the conversion error", () => {
  expectErr("Write-Output (2 * @(1,2))", /数値へ変換できません：@\(1, 2\)/);
  // パーサ班が根治した括弧なしカンマ形（2 * @(1,2) の AST）も同じ停止。
  expectErr("Write-Output (2 * 1,2)", /数値へ変換できません/);
  expectErr('Write-Output (2 * @("x","y"))', /数値へ変換できません/);
  expectErr("Write-Output (3 * @(7))", /数値へ変換できません/);
});
test("batch3-psfollow R24-N3 number times non-numeric string stops with the conversion error", () => {
  expectErr('Write-Output (3 * "ab")', /数値へ変換できません：ab/);
  expectErr('Write-Output (0 * "ab")', /数値へ変換できません：ab/);
  expectErr('Write-Output (1 * "ab")', /数値へ変換できません：ab/);
});
test("batch3-psfollow R24-N3 forward repetition is unchanged", () => {
  expectOut("Write-Output (@(1,2) * 2)", [["1", "2", "1", "2"]]);
  expectOut('Write-Output ("ab" * 3)', [["ababab"]]);
  expectOut('Write-Output (@(1,2) * "2")', [["1", "2", "1", "2"]]);
  expectOut('Write-Output ("ab" * 0)', [[""]]);
});
test("batch3-psfollow R24-N3 count conversion and rounding apply to the forward form", () => {
  // 言語仕様 §7.6.3 の左辺形の例（2.7→3回）。
  expectOut("Write-Output (@(1,2) * 2.7)", [
    ["1", "2", "1", "2", "1", "2"],
  ]);
  expectErr("Write-Output (@(1,2) * -1)", /繰返し回数は0以上が必要です/);
  // 逆方向は回数の丸め以前に右辺の変換で停止する。
  expectErr("Write-Output (2.7 * @(1,2))", /数値へ変換できません/);
  expectErr("Write-Output (-1 * @(1,2))", /数値へ変換できません/);
});
test("batch3-psfollow R24-N3 numeric multiplication takes precedence over a numeric string", () => {
  // 既存挙動：右辺が数値へ変換できる文字列なら数値積（2 * "3" = 6）。
  expectOut('Write-Output (2 * "3")', [["6"]]);
  expectOut('Write-Output (2 * "3.5")', [["7"]]);
  expectOut("Write-Output (3 * 4)", [["12"]]);
  // 数値文字列×整数は従来どおり文字列の繰返し（左辺が文字列）。
  expectOut('Write-Output ("5" * 2)', [["55"]]);
});
test("batch3-psfollow R24-N3 array times array and string times non-numeric string still stop", () => {
  // 実 PowerShell でも配列×配列はエラー（変換できない値で停止する）。
  expectErr(
    "Write-Output (@(1,2) * @(3,4))",
    /数値へ変換できません：@\(3, 4\)/,
  );
  expectErr('Write-Output ("ab" * "cd")', /数値へ変換できません：cd/);
  expectErr('Write-Output ("ab" * @(1,2))', /数値へ変換できません/);
});
test("batch3-psfollow R24-N3 size guards apply to the forward form (P-N1 discipline)", () => {
  expectErr(
    "Write-Output (@(1,2,3,4,5,6) * 20000)",
    /未確認：繰返し結果がモデルの上限を超えます/,
  );
  expectErr(
    'Write-Output ("ab" * 60000)',
    /未確認：繰返し結果がモデルの上限を超えます/,
  );
  // 逆方向はサイズガード以前に変換で停止する（上限の対象にならない）。
  expectErr("Write-Output (20000 * @(1,2,3,4,5,6))", /数値へ変換できません/);
  expectErr('Write-Output (60000 * "ab")', /数値へ変換できません/);
});
test("batch3-psfollow R24-N3 neighbouring arithmetic is unchanged", () => {
  expectOut('Write-Output ("a" + "b")', [["ab"]]);
  expectOut("Write-Output (@(1,2) + 3)", [["1", "2", "3"]]);
  expectOut("Write-Output (1 + 2)", [["3"]]);
  expectOut('$s = "ab"\n$s *= 3\nWrite-Output $s', [["ababab"]]);
  expectOut("$a = @(1,2)\n$a *= 2\nWrite-Output $a.Count", [["4"]]);
});

// ---------- R24-N30：switch オプションの照合配線 ----------
test("batch3-psfollow R24-N30 -Wildcard matches with -like semantics", () => {
  expectOut(
    'switch -Wildcard ("abc") { "a*" { "wild" } default { "none" } }',
    [["wild"]],
  );
  expectOut(
    'switch -Wildcard ("abc") { "a?c" { "q" } default { "none" } }',
    [["q"]],
  );
  expectOut(
    'switch -Wildcard ("abc") { "b*" { "wild" } default { "none" } }',
    [["none"]],
  );
  // 既定は大小区別なし（about_Switch：Wildcard の比較は case-insensitive）。
  expectOut('switch -Wildcard ("abc") { "A*" { "wild" } }', [["wild"]]);
});
test("batch3-psfollow R24-N30 -Regex matches with -match semantics and sets $Matches", () => {
  expectOut(
    'switch -Regex ("abc123") { "[0-9]+" { "regex" } default { "none" } }',
    [["regex"]],
  );
  expectOut(
    'switch -Regex ("https://x") { "^(http)" { "proto:" + $Matches[1] } }',
    [["proto:http"]],
  );
  expectOut(
    'switch -Regex ("ABC") { "^abc" { "ci" } default { "none" } }',
    [["ci"]],
  );
});
test("batch3-psfollow R24-N30 -CaseSensitive makes exact matching case-sensitive (-ceq)", () => {
  expectOut(
    'switch -CaseSensitive ("ABC") { "abc" { "lower" } "ABC" { "upper" } }',
    [["upper"]],
  );
  // 対照：オプションなし／-Exact は従来どおり大小区別なしの -eq。
  expectOut('switch ("ABC") { "abc" { "lower" } }', [["lower"]]);
  expectOut('switch -Exact ("ABC") { "abc" { "lower" } }', [["lower"]]);
  expectOut(
    'switch -Exact -CaseSensitive ("ABC") { "abc" { "lower" } default { "none" } }',
    [["none"]],
  );
});
test("batch3-psfollow R24-N30 -CaseSensitive combines with -Wildcard and -Regex", () => {
  expectOut(
    'switch -CaseSensitive -Wildcard ("abc") { "A*" { "cs" } default { "none" } }',
    [["none"]],
  );
  expectOut(
    'switch -Wildcard -CaseSensitive ("abc") { "a*" { "cs" } }',
    [["cs"]],
  );
  expectOut(
    'switch -CaseSensitive -Regex ("ABC") { "^abc" { "ci" } "^ABC" { "cs" } }',
    [["cs"]],
  );
});
test("batch3-psfollow R24-N30 conflicting match modes: the last one wins", () => {
  // about_Switch の Note：競合するパラメーターは最後の指定が優先する。
  // -Regex が最後なら "^a" は正規表現として解釈され、"a*" も正規表現
  // （a の0回以上）として "abc" に一致する。
  expectOut(
    'switch -Wildcard -Regex ("abc") { "^a" { "regex-style" } }',
    [["regex-style"]],
  );
  // -Wildcard が最後なら "^a" はリテラルとして扱われ一致しない。
  expectOut(
    'switch -Regex -Wildcard ("abc") { "^a" { "regex-style" } "a*" { "like-style" } }',
    [["like-style"]],
  );
});
test("batch3-psfollow R24-N30 options are ignored for non-string clauses", () => {
  // about_Switch：照合節が文字列でなければパラメーターは無視される。
  expectOut('switch -Wildcard (3) { 3 { "three" } default { "none" } }', [
    ["three"],
  ]);
  // 数値節 3 は -Regex でも部分一致にならず、13 とは一致しない。
  expectOut('switch -Regex (13) { 3 { "three" } default { "none" } }', [
    ["none"],
  ]);
  expectOut('switch -CaseSensitive (3) { 3 { "three" } }', [["three"]]);
});
test("batch3-psfollow R24-N30 collections, default and break keep working with options", () => {
  expectOut(
    'switch -Wildcard ("a.txt","b.md") { "*.txt" { "textfile" } default { "other" } }',
    [["textfile", "other"]],
  );
  expectOut(
    'switch -Wildcard ("abc") { "a*" { "wild"; break } "ab*" { "also" } }',
    [["wild"]],
  );
  expectOut("switch (1,3){1{\"one\"}default{\"other\"}}", [
    ["one", "other"],
  ]);
});
