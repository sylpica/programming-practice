// ブロックB3 統合: PowerShell 高度演算子（コーディネーター実装）の検証。
// 一次情報: Microsoft Learn about_Operator_Precedence /
// about_Arithmetic_Operators / about_Comparison_Operators /
// about_Split / about_Join / about_Type_Operators / about_Operators。
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

test("advops bitwise operators follow Learn semantics", () => {
  assert.deepEqual(run("Write-Output (6 -band 3)"), ["2"]);
  assert.deepEqual(run("Write-Output (6 -bor 3)"), ["7"]);
  assert.deepEqual(run("Write-Output (6 -bxor 3)"), ["5"]);
  assert.deepEqual(run("Write-Output (-bnot 0)"), ["-1"]);
  assert.deepEqual(run("Write-Output (1 -shl 4)"), ["16"]);
  assert.deepEqual(run("Write-Output (256 -shr 4)"), ["16"]);
  // 比較より緩く結合する: (2 -band 3) -eq 2 ではなく 2 -band (3 -eq 2 の結果は偽=0) ではない。
  // Learn: 比較が上位 → 6 -band 3 -eq 2 は 6 -band (3 -eq 2)=6 -band 0=0 の比較ではなく、
  // (6 -band 3) と 2 の -eq でもない。被演算子の取り合いは -eq が勝つため
  // 6 -band (3 -eq 2) = 6 -band 0 = 0 が式の値になる。
  assert.deepEqual(run("Write-Output (6 -band 3 -eq 2)"), ["0"]);
});

test("advops -xor is logical xor", () => {
  assert.deepEqual(run("Write-Output ($true -xor $false)"), ["True"]);
  assert.deepEqual(run("Write-Output ($true -xor $true)"), ["False"]);
});

test("advops -replace is case-insensitive by default, -creplace is sensitive", () => {
  assert.deepEqual(run('Write-Output ("Hello" -replace "l", "L")'), ["HeLLo"]);
  assert.deepEqual(run('Write-Output ("Hello" -creplace "L", "x")'), ["Hello"]);
  assert.deepEqual(run('Write-Output ("Hello" -creplace "l", "L")'), ["HeLLo"]);
  assert.deepEqual(run('Write-Output ("a1b2" -replace "\\d", "#")'), ["a#b#"]);
  assert.deepEqual(run('Write-Output ("john smith" -replace "(\\w+) (\\w+)", "$2 $1")'), ["smith john"]);
});

test("advops -split and -join binary and unary forms", () => {
  assert.deepEqual(run('Write-Output ("a,b,c" -split ",").Count'), ["3"]);
  assert.deepEqual(run('Write-Output ("a,b,c" -split ",")[1]'), ["b"]);
  assert.deepEqual(run('Write-Output (("a,b,c" -split ",", 2)[1])'), ["b,c"]);
  assert.deepEqual(run('Write-Output (@("a","b") -join "-")'), ["a-b"]);
  // FIX-PS-A（D1）で期待値を是正: 単項 -join の既定区切りは空文字列
  // （Microsoft Learn about_Join）。従来の "a b" は一次情報と矛盾する
  // 期待値だったため "ab" へ変更する。
  assert.deepEqual(run('Write-Output (-join @("a","b"))'), ["ab"]);
  assert.deepEqual(run('Write-Output (-split "  a  b  c ").Count'), ["3"]);
});

test("advops type operators -is/-isnot/-as", () => {
  assert.deepEqual(run("Write-Output (1 -is [int])"), ["True"]);
  assert.deepEqual(run("Write-Output (1 -is [long])"), ["False"]);
  assert.deepEqual(run("Write-Output (1.5 -is [double])"), ["True"]);
  assert.deepEqual(run('Write-Output ("x" -is [string])'), ["True"]);
  assert.deepEqual(run("Write-Output (@(1,2) -is [array])"), ["True"]);
  assert.deepEqual(run("Write-Output (@{a=1} -is [hashtable])"), ["True"]);
  assert.deepEqual(run("Write-Output (1 -isnot [string])"), ["True"]);
  assert.deepEqual(run('Write-Output ("42" -as [int])'), ["42"]);
  // 変換できない -as は $null を返す（出力行にはならないのがアプリの慣行）
  assert.deepEqual(run('Write-Output (("abc" -as [int]) -eq $null)'), ["True"]);
  assert.deepEqual(run('Write-Output ("abc" -as [int])'), []);
  assert.deepEqual(run("Write-Output (1 -as [string])"), ["1"]);
});

test("advops null-coalescing ?? evaluates lazily", () => {
  assert.deepEqual(run("Write-Output ($null ?? 7)"), ["7"]);
  assert.deepEqual(run("Write-Output (3 ?? 7)"), ["3"]);
  assert.deepEqual(run('$x = $null\nWrite-Output ($x ?? "fallback")'), ["fallback"]);
  // 三項より緩く結合する: ($c ? 1 : 2) ?? 3
  assert.deepEqual(run("Write-Output (($false ? 1 : 2) ?? 3)"), ["2"]);
});

test("advops -f format operator subset", () => {
  assert.deepEqual(run('Write-Output ("{0}" -f 42)'), ["42"]);
  assert.deepEqual(run('Write-Output ("{0:D5}" -f 42)'), ["00042"]);
  assert.deepEqual(run('Write-Output ("{0:X}" -f 255)'), ["FF"]);
  assert.deepEqual(run('Write-Output ("{0:F2}" -f 3.14159)'), ["3.14"]);
  assert.deepEqual(run('Write-Output ("{0:N1}" -f 1234567.89)'), ["1,234,567.9"]);
  assert.deepEqual(run('Write-Output ("{0} + {1} = {2}" -f 1, 2, 3)'), ["1 + 2 = 3"]);
  assert.deepEqual(run('Write-Output ("[{0,6}]" -f 42)'), ["[    42]"]);
  assert.deepEqual(run('Write-Output ("[{0,-6}]" -f 42)'), ["[42    ]"]);
  assert.deepEqual(run('Write-Output ("{{0}}" -f 42)'), ["{0}"]);
  const e = runErr('Write-Output ("{0:C}" -f 42)');
  assert.match(e, /未検証/);
});

test("advops bare switches of advanced cmdlets parse in advanced mode", () => {
  assert.deepEqual(run("Write-Output (Test-Json '{\"a\":1}')"), ["True"]);
  assert.deepEqual(run("Write-Output (@(1,2) | ConvertTo-Json -Compress)"), ["[1,2]"]);
  assert.deepEqual(run('$h = \'{"a":1}\' | ConvertFrom-Json -AsHashtable\nWrite-Output $h["a"]'), ["1"]);
  assert.deepEqual(run('Write-Output (Split-Path "C:\\a\\b.txt" -Leaf)'), ["b.txt"]);
  assert.deepEqual(run('Write-Output ("hello" | Select-String -Quiet -Pattern "ell")'), ["True"]);
});

test("advops null-conditional access stops with its own name in advanced mode", () => {
  const e = runErr('$a = $null\nWrite-Output ($a?.Length)');
  assert.match(e, /null条件アクセス/);
  const e2 = runErr('$a = @(1)\nWrite-Output ($a?[0])');
  assert.match(e2, /null条件アクセス/);
});
