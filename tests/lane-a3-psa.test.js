// FIX-PS-A（PowerShell パーサ・演算子修正）の回帰テスト。
// 対象欠陥: 監査 T4 D1／D2／D3／D5／D6／D10 と T2 §4-3（$$／$^）。
// 一次情報: Microsoft Learn about_Join / about_Operator_Precedence /
// about_Comparison_Operators / about_Redirection /
// about_Automatic_Variables / about_Pipeline_Chain_Operators、
// .NET 公式「Substitutions in Regular Expressions」。
// この VM に実 pwsh は無いため、期待値は上記一次情報からの導出である。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition } from "../js/types/powershell/index.js";
import { applyAdvancedEngine } from "../js/types/powershell/advanced-engine.js";

applyAdvancedEngine(definition);

function run(code) {
  const r = definition.simulate(code, structuredClone(definition.model.defaults));
  const errs = [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
  assert.deepEqual(errs, [], code + " -> " + JSON.stringify(errs));
  return r.paths.flatMap((p) => p.outputs.map((o) => o.text ?? o));
}
function runErr(code) {
  const r = definition.simulate(code, structuredClone(definition.model.defaults));
  const errs = [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
  assert.ok(errs.length > 0, code + " は停止するはず");
  return JSON.stringify(errs);
}

test("FIX-PS-A D1: unary -join uses the empty separator (about_Join)", () => {
  assert.deepEqual(run('Write-Output (-join ("a","b"))'), ["ab"]);
  assert.deepEqual(run('Write-Output (-join @("a","b"))'), ["ab"]);
  // 二項形の明示区切りは不変。
  assert.deepEqual(run('Write-Output (@("a","b") -join "-")'), ["a-b"]);
  assert.deepEqual(run('Write-Output (("a","b") -join "-")'), ["a-b"]);
});

test("FIX-PS-A D2: ?? chains and ?? in the ternary else branch", () => {
  assert.deepEqual(run("Write-Output ($null ?? $null ?? 7)"), ["7"]);
  assert.deepEqual(run("Write-Output (1 ?? 2 ?? 3)"), ["1"]);
  assert.deepEqual(run("Write-Output ($false ? 1 : $null ?? 3)"), ["3"]);
  assert.deepEqual(run('Write-Output ($true ? "a" : "b" ?? "c")'), ["a"]);
  // 従来から正しかった形は不変。
  assert.deepEqual(run("Write-Output ($null ?? 7)"), ["7"]);
  assert.deepEqual(run("Write-Output (($false ? 1 : 2) ?? 3)"), ["2"]);
  assert.deepEqual(run("$x = $null\nWrite-Output ($x ?? 1 ?? 2)"), ["1"]);
});

test("FIX-PS-A D2: ?? stays looser than the ternary operator", () => {
  // $a ?? $c ? x : y は $a ?? ($c ? x : y) と結合する。
  assert.deepEqual(run('Write-Output ($null ?? $true ? "y" : "n")'), ["y"]);
  assert.deepEqual(run('Write-Output ($null ?? $false ? "y" : "n")'), ["n"]);
});

test("FIX-PS-A D3: -f precedence sits between .. and * / %", () => {
  // 2 * "{0}" -f 3 は 2 * ("{0}" -f 3) = 6（修正前は変換エラー）。
  assert.deepEqual(run('Write-Output (2 * "{0}" -f 3)'), ["6"]);
  assert.deepEqual(run('Write-Output (2 * "{0}" -f 3 -eq 6)'), ["True"]);
  // -f は加算より上位: ("{0}" -f 1) + 1 = "11"。
  assert.deepEqual(run('Write-Output ("{0}" -f 1 + 1)'), ["11"]);
  // -f は範囲 .. より下位: 右辺が範囲を取り、配列として書式化される。
  assert.deepEqual(run('Write-Output ("{0}" -f 1..2)'), ["1"]);
  // -f は比較より上位。
  assert.deepEqual(run('Write-Output ("{0}" -f 3 -eq "3")'), ["True"]);
  // 結合が変わらない従来形。
  assert.deepEqual(run('Write-Output ("{0}" -f 3)'), ["3"]);
  assert.deepEqual(run('Write-Output (1 + "{0}" -f 3)'), ["4"]);
  // (2 * 3) -f 1 は従来どおり評価側が左辺を名指して止める。
  assert.ok(runErr('Write-Output (2 * 3 -f 1)').includes("-f の左辺は書式文字列です"));
});

test("FIX-PS-A D6: -replace ${...} substitutions follow .NET rules", () => {
  // 有効な名前でも番号でもない ${name} はリテラルとして残る。
  assert.deepEqual(run(`Write-Output ("x" -replace '(x)', '\${nope}')`), ["${nope}"]);
  // 数字のみの ${1} は番号グループとして解釈される。${0} は全体一致。
  assert.deepEqual(run(`Write-Output ("x" -replace '(x)', '\${1}')`), ["x"]);
  assert.deepEqual(run(`Write-Output ("x" -replace '(x)', '\${0}')`), ["x"]);
  assert.deepEqual(run(`Write-Output ("abc" -replace '(b)', '[\${1}]')`), ["a[b]c"]);
  // 名前つきグループは従来どおり。
  assert.deepEqual(run(`Write-Output ("x" -replace '(?<w>x)', '\${w}')`), ["x"]);
  // $番号形式の不存在グループのリテラル残し（従来から正しい）は不変。
  assert.deepEqual(run(`Write-Output ("x" -replace '(x)', '$2')`), ["$2"]);
  assert.deepEqual(run(`Write-Output ("john smith" -replace '(\\w+) (\\w+)', '$2 $1')`), ["smith john"]);
});

test("FIX-PS-A D5/D10: compound operators stop with their full name", () => {
  assert.ok(runErr("$x = 1 && Write-Output 2").includes("未対応：&&（"));
  assert.ok(runErr("Write-Output 1 || Write-Output 2").includes("未対応：||（"));
  assert.ok(runErr("$x ??= 7").includes("未対応：??=（"));
  assert.ok(runErr("$x = $null\n$x ??= 7").includes("未対応：??=（"));
  assert.ok(runErr("Write-Output 'hi' > out.txt").includes("未対応：>（"));
  assert.ok(runErr("Write-Output 'hi' >> out.txt").includes("未対応：>>（"));
  assert.ok(runErr("Write-Output 1 > out.txt").includes("未対応：>（"));
  assert.ok(runErr("Get-Content missing.txt 2> err.txt").includes("未対応：2>（"));
  assert.ok(runErr("Get-Content missing.txt 2>> err.txt").includes("未対応：2>>（"));
  assert.ok(runErr("Get-Content missing.txt 2>&1").includes("未対応：2>&1（"));
});

test("FIX-PS-A D5: single & and operator-like strings are not misclassified", () => {
  // 単独の &（呼び出し演算子）は && と名指されない（従来文言のまま）。
  const amp = runErr('& "Write-Output" 1');
  assert.ok(!amp.includes("未対応：&&"), amp);
  // 文字列リテラル内の演算子形は式として解釈されない。
  assert.deepEqual(run("Write-Output 'a&&b'"), ["a&&b"]);
  assert.deepEqual(run("Write-Output 'a||b'"), ["a||b"]);
  assert.deepEqual(run('Write-Output "a>b"'), ["a>b"]);
});

test("FIX-PS-A2: $$ and $^ reach the same unverified AUTOVARS response as the braced forms", () => {
  // コーディネーター裁定（FIX-PS-A2）: 未検証の自動変数は「ラベルつき
  // 未確定値を返す」が一貫した設計であり、裸形のパーサ拒否だけが異常。
  // FIX-PS-A の「裸形を名指し未対応停止にする」変更は取り消し、裸形も
  // 波括弧形 ${$}／${^} と同じ AUTOVARS の未検証応答に届くよう是正した。
  // 裸形はエラーにならず、未検証の未確定値を返す。
  assert.match(run("Write-Output $$")[0], /実行時に決まる：未検証/);
  assert.match(run("Write-Output $^")[0], /実行時に決まる：未検証/);
  // 裸形と波括弧形の応答は同一である。
  assert.deepEqual(run("Write-Output $$"), run("Write-Output ${$}"));
  assert.deepEqual(run("Write-Output $^"), run("Write-Output ${^}"));
  // 波括弧形の分類は従来どおり未検証のまま変えない（既存テスト
  // adv-b3-powershell.test.js の固定どおり）。
  assert.match(run("Write-Output ${$}")[0], /実行時に決まる：未検証/);
  assert.match(run("Write-Output ${^}")[0], /実行時に決まる：未検証/);
  // 式位置でも裸形が同じ未検証応答に届く。
  assert.match(run("Write-Output ($$)")[0], /実行時に決まる：未検証/);
  assert.match(run("Write-Output ($^)")[0], /実行時に決まる：未検証/);
});
