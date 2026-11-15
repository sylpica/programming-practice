// 修正バッチ6・PowerShell班の回帰テスト。
// 対象: R27-N1（ドットメンバー名が後続の「-」を字句レベルで取り込み、
// 接着した減算・後置 --・比較が黙って $null になる）／
// R27-N2（範囲端点の Int32 範囲外で値を捏造する）／
// R27-N3（文字列リテラルへの後置・前置 -- が変換エラーを名指す非対称）／
// R27-N4（角括弧内の複合形が「] が必要です」という虚偽原因で停止する）／
// R27-N5（引数モードで不完全な数値リテラル始まりの generic-token が
// 字句エラーで死ぬ）。
// 一次情報: PowerShell 言語仕様 Appendix A 文法 B.1.7（generic-token）・
// B.1.10（simple-name の構成文字に「-」は含まれない）・B.1.11
// （type-name／array-type-name／generic-type-name）・B.2 の member-name・
// B.2.4（attribute）・言語仕様 §6.4（整数への変換規則＝[int] 変換。
// 範囲外は .NET の変換規則により Overflow）、Microsoft Learn
// about_Parsing／about_Functions_Advanced_Parameters／
// about_Functions_CmdletBindingAttribute／
// about_Functions_OutputTypeAttribute／about_Type_Operators。
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
const expectErr = (code, pattern, notPattern) => {
  const r = run(code);
  assert.ok(errors(r).length > 0, code + " は停止すべき");
  assert.match(errors(r)[0].message, pattern, code);
  if (notPattern) assert.doesNotMatch(errors(r)[0].message, notPattern, code);
  return r;
};
const HOST_TEXT =
  /Maximum call stack size exceeded|Cannot read properties|Cannot set properties|could not be cloned|is not a function|is not defined/;

// ---------- R27-N1: メンバー名は「-」で終わり、後続は演算子として読む ----------
test("batch6-ps R27-N1 glued subtraction after dot member evaluates like real PowerShell", () => {
  expectOut("$h = @{k = 10}\n$y = $h.k-1\nWrite-Output $y", [["9"]]);
  expectOut("$s = 'abc'\nWrite-Output ($s.Length-1)", [["2"]]);
  expectOut("$a = @(1,2,3)\nWrite-Output ($a.Count-1)", [["2"]]);
  expectOut("$h = @{a = @{b = 7}}\nWrite-Output ($h.a.b-1)", [["6"]]);
  expectOut("$o = [PSCustomObject]@{k = 3}\nWrite-Output ($o.k-1)", [["2"]]);
  expectOut("Write-Output ('abc'.Length-1)", [["2"]]);
  // ハッシュ値・配列要素・for 初期化の各位置でも同型
  expectOut("$h = @{k = 10}\n$x = @{v = $h.k-1}\nWrite-Output $x.v", [["9"]]);
  expectOut("$h = @{k = 10}\n$a = @($h.k-1)\nWrite-Output $a[0]", [["9"]]);
  expectOut(
    "$h = @{k = 10}\nfor ($i = $h.k-1; $i -lt 11; $i++) { Write-Output $i }",
    [["9", "10"]],
  );
  // 空白形・括弧形（従来から正常な対照）は不変
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k - 1)", [["9"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k -1)", [["9"]]);
  // 引用つきキーにハイフンを含む実在メンバーは添字形で従来どおり読め、
  // ドット形は ($h.k) - 1 として解釈される（実物どおり）
  expectOut(
    "$h = @{'k-1' = 99}\nWrite-Output ($h.k-1)\nWrite-Output $h['k-1']",
    [["-1", "99"]],
  );
});
test("batch6-ps R27-N1 glued postfix and comparison after dot member", () => {
  expectOut(
    "$h = @{k = 10}\n$x = $h.k--\nWrite-Output $x\nWrite-Output $h.k",
    [["10", "9"]],
  );
  expectOut("$h = @{k = 10}\n$h.k++\nWrite-Output $h.k", [["11"]]);
  expectOut("$h = @{k = 10}\nWrite-Output (++$h.k)", [["11"]]);
  expectOut("$h = @{k = 10}\nWrite-Output (--$h.k)", [["9"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k-- + 1)", [["11"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k---1)", [["9"]]);
  // 比較形：残りの数値が別文として実行されず、比較の右辺になる
  expectOut("$h = @{k = 10}\n$y = $h.k-eq 10\nWrite-Output $y", [["True"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k-gt 5)", [["True"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k-1 -eq 9)", [["True"]]);
  // 波及形：条件の黙った誤分岐とループ非終了が解消する
  expectOut(
    "$h = @{k = 10}\nif ($h.k--) { Write-Output 'yes' }\nWrite-Output $h.k",
    [["yes", "9"]],
  );
  expectOut(
    "$h = @{k = 3}\nwhile ($h.k -gt 0) { $h.k-- }\nWrite-Output 'done'",
    [["done"]],
  );
  // 引数モードは変数形の確立済み規則と同型（メンバー値と -1 の2引数）
  expectOut("$x = 5\nWrite-Output $x-1", [["5", "-1"]]);
  expectOut("$h = @{k = 10}\nWrite-Output $h.k-1", [["10", "-1"]]);
  expectOut("$h = @{k = 10}\nWrite-Output $h.k--", [["10"]]);
  // 読み取り専用プロパティへの後置 -- は ++ と同じ代入不可で止まる
  expectErr("$a = @(1,2,3)\n$a.Count--", /この添字・プロパティへ代入できません/);
  expectErr("$s = 'abc'\n$s.Length--", /この添字・プロパティへ代入できません/);
});

// ---------- R27-N2: 範囲端点の [int] 変換は Int32 の範囲で検査する ----------
test("batch6-ps R27-N2 range endpoints outside Int32 stop with Overflow naming the value", () => {
  for (const [code, value] of [
    ["Write-Output (3000000000..3000000001)", /3000000000/],
    ["Write-Output (2147483647.5..2147483647)", /2147483647\.5/],
    ["Write-Output (2147483648..2147483648)", /2147483648/],
    ["Write-Output (4294967296..4294967296)", /4294967296/],
    ["$x = 3000000000\nWrite-Output ($x..$x)", /3000000000/],
    ["Write-Output ('3000000000'..'3000000000')", /3000000000/],
    ["Write-Output (3..-3000000000)", /-3000000000/],
  ]) {
    const r = expectErr(code, /System\.Int32 へ変換できません/);
    assert.match(errors(r)[0].message, value, code);
    assert.doesNotMatch(errors(r)[0].message, HOST_TEXT, code);
  }
});
test("batch6-ps R27-N2 range endpoints inside Int32 are unchanged", () => {
  expectOut("Write-Output (2147483647..2147483647)", [["2147483647"]]);
  expectOut("Write-Output (-2147483648..-2147483648)", [["-2147483648"]]);
  expectOut("Write-Output (2147483647.4..2147483647)", [["2147483647"]]);
  expectOut("Write-Output (-2147483648.5..-2147483648)", [["-2147483648"]]);
  expectOut("Write-Output (1.5..3.5)", [["2", "3", "4"]]);
});

// ---------- R27-N3: リテラルへの ++／-- は真因（代入先）で止める ----------
test("batch6-ps R27-N3 literal increment/decrement names the assignment target for both operators", () => {
  for (const code of [
    "$a = 'x'--",
    "$a = 'x'++",
    "Write-Output ('x'--)",
    "Write-Output ('x'++)",
    "Write-Output (--'x')",
    "Write-Output (++'x')",
    "Write-Output (1--)",
    "Write-Output (1++)",
    "--1",
    "++1",
    "$a = '5'--",
    "$a = '5'++",
  ]) {
    const r = expectErr(code, /代入先が不正です/, /数値へ変換できません/);
    assert.doesNotMatch(errors(r)[0].message, HOST_TEXT, code);
  }
  // CI是正（RG-262 予定）の波及是正: 旧対照は「変換可能な文字列変数への
  // 後置 -- は数値として動作する」としていたが、実 PowerShell は文字列
  // への -- を保持値によらず演算子エラーにするため、対照をエラー側へ
  // 書き換える（数値変数への後置 -- の対照は batch7 R28-N4 側に残る）。
  expectErr(
    "$x = '5'\n$y = $x--\nWrite-Output $y\nWrite-Output $x",
    /--演算子は文字列には使えません/,
  );
});

// ---------- R27-N4: 角括弧の内容全体を読む ----------
test("batch6-ps R27-N4 qualified and array type casts work", () => {
  expectOut("$a = [int[]](1,2)\nWrite-Output $a", [["1", "2"]]);
  expectOut("$a = [string[]](1,2)\nWrite-Output $a", [["1", "2"]]);
  expectOut("$a = [double[]](1,2)\nWrite-Output $a", [["1", "2"]]);
  expectOut("$a = [bool[]](1,0)\nWrite-Output $a", [["True", "False"]]);
  expectOut("$a = [int[]]5\nWrite-Output $a", [["5"]]);
  expectOut("$a = [System.Int32[]](1,2)\nWrite-Output $a", [["1", "2"]]);
  expectOut("$a = [System.String]7\nWrite-Output $a", [["7"]]);
  expectOut("$a = [System.Int32]'42'\nWrite-Output $a", [["42"]]);
  expectOut("$a = [System.Double]'1.5'\nWrite-Output $a", [["1.5"]]);
  expectOut("$a = [System.Boolean]1\nWrite-Output $a", [["True"]]);
  expectOut("Write-Output ([int[]](1,2)).Count", [["2"]]);
  expectOut("if ([System.String]7 -eq '7') { Write-Output 'yes' }", [["yes"]]);
  // 対応しない複合型は型名そのものを名指して止める（] は存在する）
  expectErr(
    "$a = [System.Collections.Generic.List[int]]@(1,2)",
    /未対応の型変換：\[System\.Collections\.Generic\.List\[int\]\]/,
    /\] が必要です/,
  );
  expectErr("$a = [int[,]]5", /未対応の型変換：\[int\[,\]\]/, /\] が必要です/);
  expectErr("$a = [int64]5", /未対応の型変換：\[int64\]/, /\] が必要です/);
});
test("batch6-ps R27-N4 parameter attributes parse and bind", () => {
  expectOut(
    "function f { param([ValidateSet('a','b')]$a = 'a') Write-Output $a }\nf",
    [["a"]],
  );
  expectOut(
    "function f { param([ValidateSet('a','b')]$a = 'a') Write-Output $a }\nf 'b'",
    [["b"]],
  );
  expectErr(
    "function f { param([ValidateSet('a','b')]$a = 'a') Write-Output $a }\nf 'c'",
    /ValidateSet/,
    /\] が必要です/,
  );
  expectErr(
    "function f { param([ValidateSet('a','b')]$a = 'c') Write-Output $a }\nf",
    /ValidateSet/,
  );
  expectOut(
    "function f { param([Parameter(Mandatory=$true)]$a = 5) Write-Output $a }\nf 7",
    [["7"]],
  );
  expectOut(
    "function f { param([Parameter(Mandatory=$true)]$a) Write-Output $a }\nf -a 3",
    [["3"]],
  );
  expectErr(
    "function f { param([Parameter(Mandatory=$true)]$a = 5) Write-Output $a }\nf",
    /Mandatory/,
    /\] が必要です/,
  );
  expectErr(
    "function f { param([Parameter(Mandatory)]$a) Write-Output $a }\nf",
    /Mandatory/,
  );
  expectOut(
    "function f { param([Parameter(Mandatory=$false)]$a = 5) Write-Output $a }\nf",
    [["5"]],
  );
  expectOut(
    "function f { param([Parameter()]$a = 5) Write-Output $a }\nf",
    [["5"]],
  );
  expectOut(
    "function f { param([Alias('x')]$a = 5) Write-Output $a }\nf -x 7",
    [["7"]],
  );
  expectErr(
    "function f { param([Alias('x')]$a = 5) Write-Output $a }\nf -z 7",
    /関数のパラメータがありません：z/,
  );
  // 属性と型制約の積み重ね、完全修飾型・配列型の型制約、既定値内のキャスト
  expectOut(
    "function f { param([Parameter(Mandatory=$true)][ValidateSet('a','b')][string]$a = 'a') Write-Output $a }\nf 'b'",
    [["b"]],
  );
  expectOut(
    "function f { param([System.String]$a = 'x') Write-Output $a }\nf 7",
    [["7"]],
  );
  expectOut(
    "function f { param([int[]]$a = (1,2)) Write-Output $a }\nf",
    [["1", "2"]],
  );
  expectOut(
    "function f { param($a = [System.Int32]'42') Write-Output $a }\nf",
    [["42"]],
  );
  // 関数属性 [CmdletBinding()]／[OutputType(...)] + param
  expectOut(
    "function f { [CmdletBinding()] param($a = 5) Write-Output $a }\nf",
    [["5"]],
  );
  expectOut(
    "function f { [OutputType([int])] param($a = 5) Write-Output $a }\nf",
    [["5"]],
  );
  // 未対応の属性は属性名を名指して止める
  expectErr(
    "function f { param([Foo()]$a = 5) Write-Output $a }\nf",
    /未対応のパラメータ属性：\[Foo\(\)\]/,
    /\] が必要です/,
  );
});

// ---------- R27-N5: 引数モードの不完全リテラルは generic-token ----------
test("batch6-ps R27-N5 incomplete numeric literals become string arguments in argument mode", () => {
  for (const [code, text] of [
    ["Write-Output 123abc", "123abc"],
    ["Write-Output 1.5.2", "1.5.2"],
    ["Write-Output 0x", "0x"],
    ["Write-Output 1e", "1e"],
    ["Write-Output 0b2", "0b2"],
    ["Write-Output 0b101", "0b101"],
    ["Write-Output 1_000", "1_000"],
    ["Write-Output 0x--1", "0x--1"],
    ["Write-Output 123abc--1", "123abc--1"],
    ["Write-Output 1e--2", "1e--2"],
    ["Write-Output 1e+--2", "1e+--2"],
  ])
    expectOut(code, [[text]]);
  // カンマ要素・名前付きパラメータ値でも同じ規則
  expectOut("Write-Output 1,123abc", [["1", "123abc"]]);
  expectOut("Write-Output 123abc,456", [["123abc", "456"]]);
  expectOut("Write-Output -InputObject 123abc", [["123abc"]]);
  // 完全なリテラルで始まる接着形（RG-183／RG-195）は不変
  expectOut("Write-Output 1+2", [["1+2"]]);
  expectOut("Write-Output 0x1F--1", [["0x1F--1"]]);
});
test("batch6-ps R27-N5 expression mode still names incomplete literals (RG-182)", () => {
  for (const [code, literal] of [
    ["$a = 123abc", /未対応または不正な数値リテラル：123abc/],
    ["$a = 1.5.2", /未対応または不正な数値リテラル：1\.5\.2/],
    ["Write-Output (123abc)", /未対応または不正な数値リテラル：123abc/],
    ["Write-Output (1.5.2)", /未対応または不正な数値リテラル：1\.5\.2/],
    ["Write-Output (1,123abc)", /未対応または不正な数値リテラル：123abc/],
    ["$a = 0b101", /未対応：2進数リテラル（0b101）/],
    ["$h = @{k = 123abc}", /未対応または不正な数値リテラル：123abc/],
    ["$h = @{123abc = 1}", /未対応または不正な数値リテラル：123abc/],
    [
      "switch (1) { 123abc { 'x' } default { 'd' } }",
      /未対応または不正な数値リテラル：123abc/,
    ],
  ]) {
    const r = expectErr(code, literal);
    assert.doesNotMatch(errors(r)[0].message, HOST_TEXT, code);
  }
});
