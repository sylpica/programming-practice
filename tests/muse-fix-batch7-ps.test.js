// 修正バッチ7・PowerShell班の回帰テスト。
// 対象: R28-N2（メンバーアクセス直後に接着した「/」＋数値が黙って $null 化／
// 誤値化する）／R28-N3（浮動小数点の 0 除算・0 剰余が虚偽原因で停止する）／
// R28-N4（文字列型の代入先への ++ が文字列連結になる）／
// R28-N5（引用符付き／変数メンバー名が「プロパティ名が必要です」で停止する）／
// R28-N6（括弧なし属性 [Parameter] が型キャストとして誤帰属される）／
// R28-N7（三項演算子が「) が必要です」で停止する）。
// 一次情報: PowerShell 言語仕様 Appendix A 文法 B.1.10（simple-name の構成
// 文字）・B.2（member-name: simple-name／string-literal／
// string-constant-expression／variable／( expression )）・B.2.4（attribute）・
// 言語仕様 7.4（三項＝条件演算子）、Microsoft Learn
// about_Arithmetic_Operators／about_Assignment_Operators（++ は数値であるか
// 数値へ変換可能でなければならない）／DivideByZeroException（浮動小数点値を
// 0 で割っても例外は発生せず ±Infinity／NaN になる）。
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

// ---------- R28-N2: メンバー直後の接着「/」は除算として読む ----------
test("batch7-ps R28-N2 glued division after dot member evaluates like real PowerShell", () => {
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k/2)", [["5"]]);
  expectOut("$h = @{k = 10}\n$y = $h.k/2\nWrite-Output $y", [["5"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k/-2)", [["-5"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k/2*3)", [["15"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k/2/2)", [["2.5"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k/2.5)", [["4"]]);
  expectOut("$s = 'abcdef'\nWrite-Output ($s.Length/2+1)", [["4"]]);
  expectOut("$h = @{a = @{b = 20}}\nWrite-Output ($h.a.b/2)", [["10"]]);
  expectOut("$o = [PSCustomObject]@{k = 10}\nWrite-Output ($o.k/2)", [["5"]]);
  expectOut("$a = @(@{k = 10})\nWrite-Output ($a[0].k/2)", [["5"]]);
  expectOut("Write-Output ('abcdef'.Length/2)", [["3"]]);
  // 変数形・括弧形の除数も接着で読める
  expectOut("$h = @{k = 10}\n$x = 2\nWrite-Output ($h.k/$x)", [["5"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k/(2+3))", [["2"]]);
  // 条件位置でも黙って誤分岐しない
  expectOut(
    "$h = @{k = 10}\nif ($h.k/2 -eq 5) { 'five' } else { 'other' }",
    [["five"]],
  );
  // 複合代入 /= も接着形で対象メンバーへ届く
  expectOut("$h = @{k = 10}\n$h.k/=2\nWrite-Output $h.k", [["5"]]);
  // 整数の 0 除算は接着形でも従来どおりエラー（無言化しない）
  expectErr("$h = @{k = 10}\nWrite-Output ($h.k/0)", /0による除算/);
  // 対照（従来から正常な形）は不変
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k /2)", [["5"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k/ 2)", [["5"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k / 2)", [["5"]]);
  expectOut("$x = 10\nWrite-Output ($x/2)", [["5"]]);
  expectOut("$a = @(10)\nWrite-Output ($a[0]/2)", [["5"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k%3)", [["1"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k*3)", [["30"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k+3)", [["13"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k-3)", [["7"]]);
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k-1/2)", [["9.5"]]);
});

// ---------- R28-N3: 浮動小数点の 0 除算・0 剰余は ±Infinity／NaN ----------
test("batch7-ps R28-N3 floating point division and modulo by zero follow IEEE 754", () => {
  expectOut("Write-Output (1.0/0)", [["Infinity"]]);
  expectOut("Write-Output (1/0.0)", [["Infinity"]]);
  expectOut("Write-Output (-1.0/0)", [["-Infinity"]]);
  expectOut("Write-Output (0.0/0.0)", [["NaN"]]);
  expectOut("Write-Output (5.5 % 0)", [["NaN"]]);
  expectOut("Write-Output (5 % 0.0)", [["NaN"]]);
  expectOut("Write-Output (1.5/0)", [["Infinity"]]);
  // 変数形（代入時に小数リテラルだった値）も同型
  expectOut("$x = 1.0\n$y = 0.0\nWrite-Output ($x/$y)", [["Infinity"]]);
  expectOut("$x = 5.5\nWrite-Output ($x % 0)", [["NaN"]]);
  // キャストで小数化した値も同型
  expectOut("Write-Output ([double]1/0)", [["Infinity"]]);
  // 数値文字列の小数形も同型（.NET の文字列→数値変換は小数形を double にする）
  expectOut("Write-Output ('1.0'/0)", [["Infinity"]]);
  // 条件位置では Infinity が大小比較に使える
  expectOut("if ((1.0/0) -gt 100) { Write-Output 'big' }", [["big"]]);
  expectOut("Write-Output ((0.0/0.0) -eq (0.0/0.0))", [["False"]]);
  // 最終状態でも出力表示と矛盾しない（RG-223 と同じ往復規則）
  const r = run("$x = 1.0/0");
  assert.deepEqual(errors(r), []);
  assert.equal(JSON.parse(JSON.stringify(r.paths[0].vars)).x, "Infinity");
  // 整数同士の 0 除算・0 剰余は従来どおり実行時エラー
  expectErr("Write-Output (1/0)", /0による除算/);
  expectErr("Write-Output (5 % 0)", /0による除算/);
  expectErr("$x = 1\n$y = 0\nWrite-Output ($x/$y)", /0による除算/);
  // 整数変数へ整数を代入し直したら小数扱いは残らない
  expectErr("$x = 1.0\n$x = 1\n$y = 0\nWrite-Output ($x/$y)", /0による除算/);
  // 通常の浮動小数点演算は不変
  expectOut("Write-Output (5.5/2)", [["2.75"]]);
  expectOut("Write-Output (5/2)", [["2.5"]]);
});

// ---------- R28-N4: 文字列への ++ は数値増加（連結ではない） ----------
test("batch7-ps R28-N4 increment of a numeric string converts to a number", () => {
  expectOut("$s = '5'\n$s++\nWrite-Output $s", [["6"]]);
  expectOut("$s = '5'\n++$s\nWrite-Output $s", [["6"]]);
  expectOut("$s = '5.5'\n$s++\nWrite-Output $s", [["6.5"]]);
  expectOut("$s = '-3'\n$s++\nWrite-Output $s", [["-2"]]);
  // 後置の返値は変換前の値（実物どおり旧値）で、変数側は数値になる
  expectOut("$s = '5'\nWrite-Output ($s++)\nWrite-Output $s", [["5", "6"]]);
  // メンバー・添字の代入先でも同型
  expectOut("$h = @{k = '5'}\n$h.k++\nWrite-Output $h.k", [["6"]]);
  expectOut("$a = @('5')\n$a[0]++\nWrite-Output $a[0]", [["6"]]);
  // 変換できない文字列はエラー（連結でごまかさない）
  expectErr("$s = 'abc'\n$s++", /数値へ変換できません/);
  expectErr("$s = 'abc'\n++$s", /数値へ変換できません/);
  expectErr("$s = ''\n$s++", /数値へ変換できません/);
  // -- と += の実物挙動は壊さない（-- は数値意味論、+= は文字列追加）
  expectOut("$s = '5'\n$s--\nWrite-Output $s", [["4"]]);
  expectErr("$s = 'abc'\n$s--", /数値へ変換できません/);
  expectOut("$s = '5'\n$s += 1\nWrite-Output $s", [["51"]]);
  // 数値への ++ は不変
  expectOut("$n = 5\n$n++\nWrite-Output $n", [["6"]]);
});

// ---------- R28-N5: member-name の正規生成（引用符・変数・式） ----------
test("batch7-ps R28-N5 quoted and variable member names are accepted", () => {
  expectOut("$h = @{k = 10}\nWrite-Output ($h.'k')", [["10"]]);
  expectOut('$h = @{k = 10}\nWrite-Output ($h."k")', [["10"]]);
  expectOut("$h = @{'my key' = 10}\nWrite-Output ($h.'my key')", [["10"]]);
  expectOut("$s = 'abc'\nWrite-Output ($s.'Length')", [["3"]]);
  // ハイフンを含む実在キーは引用形ではそのまま読める（分割しない）
  expectOut("$h = @{'k-1' = 99}\nWrite-Output ($h.'k-1')", [["99"]]);
  // 変数メンバー名
  expectOut("$n = 'k'\n$h = @{k = 10}\nWrite-Output ($h.$n)", [["10"]]);
  expectOut("$n = 'Length'\n$s = 'abcd'\nWrite-Output ($s.$n)", [["4"]]);
  // 二重引用符の展開で決まる名前
  expectOut("$p = 'k'\n$h = @{k = 7}\nWrite-Output ($h.\"$p\")", [["7"]]);
  // 括弧式のメンバー名
  expectOut("$h = @{k = 10}\nWrite-Output ($h.('k'))", [["10"]]);
  // 書き込み側（代入・++）でも同型
  expectOut("$h = @{k = 10}\n$h.'k' = 20\nWrite-Output $h.k", [["20"]]);
  expectOut("$n = 'k'\n$h = @{k = 10}\n$h.$n = 30\nWrite-Output $h.k", [["30"]]);
  expectOut("$h = @{k = '5'}\n$h.'k'++\nWrite-Output $h.k", [["6"]]);
  // 存在しない名前は従来どおり $null（捏造しない）
  expectOut("$h = @{k = 10}\nWrite-Output ($null -eq $h.'missing')", [["True"]]);
  // 名前が無い形は従来どおり「プロパティ名が必要です」で止まる
  expectErr("$h = @{k = 10}\nWrite-Output ($h.)", /プロパティ名が必要です/);
});

// ---------- R28-N6: 括弧なし属性 [Parameter] は属性として読む ----------
test("batch7-ps R28-N6 bare Parameter attribute is not treated as a type cast", () => {
  expectOut(
    "function f { param([Parameter] $x) Write-Output $x }\nf 42",
    [["42"]],
  );
  expectOut(
    "function f { param([Parameter] [string] $x) Write-Output $x }\nf 'hi'",
    [["hi"]],
  );
  expectOut(
    "function f { param([string] [Parameter] $x) Write-Output $x }\nf 'hi'",
    [["hi"]],
  );
  // 検証系の括弧なし属性も同型に属性として読む
  expectOut(
    "function f { param([ValidateNotNull] $x) Write-Output $x }\nf 3",
    [["3"]],
  );
  expectOut(
    "function f { param([Parameter] $x = 9) Write-Output $x }\nf",
    [["9"]],
  );
  // 括弧つき形（従来から正常）は不変
  expectOut(
    "function f { param([Parameter(Mandatory=$true)] $x) Write-Output $x }\nf 42",
    [["42"]],
  );
  expectErr(
    "function f { param([Parameter(Mandatory=$true)] $x) Write-Output $x }\nf",
    /必須パラメータ/,
  );
  // 型制約そのものは不変（未知の型は型名を名指して止まる）
  expectErr(
    "function f { param([BogusType] $x) Write-Output $x }\nf 1",
    /未対応の型変換：\[BogusType\]/,
  );
});

// ---------- R28-N7: 三項演算子 ----------
test("batch7-ps R28-N7 ternary operator evaluates the selected branch", () => {
  expectOut("Write-Output ($true ? 1 : 2)", [["1"]]);
  expectOut("Write-Output ($false ? 1 : 2)", [["2"]]);
  expectOut("$x = 5\nWrite-Output ($x -gt 3 ? 'big' : 'small')", [["big"]]);
  expectOut("$x = 2\nWrite-Output ($x -gt 3 ? 'big' : 'small')", [["small"]]);
  expectOut("$y = $false ? 10 : 20\nWrite-Output $y", [["20"]]);
  expectOut("Write-Output ((1 -eq 1) ? 'yes' : 'no')", [["yes"]]);
  // 入れ子・連鎖
  expectOut("Write-Output ($false ? 1 : $true ? 2 : 3)", [["2"]]);
  expectOut("Write-Output ($true ? $false ? 1 : 2 : 3)", [["2"]]);
  // 条件位置・引数位置
  expectOut("if ($true ? $true : $false) { Write-Output 'on' }", [["on"]]);
  // 選ばれなかった側は評価しない（0 除算があっても止まらない）
  expectOut("Write-Output ($true ? 1 : (1/0))", [["1"]]);
  expectOut("Write-Output ($false ? (1/0) : 2)", [["2"]]);
  // 文字列・数値の混在、$null 条件
  expectOut("Write-Output ($null ? 1 : 2)", [["2"]]);
  // 「:」が無い形は三項演算子の不足として名指す（虚偽の「)」にしない）
  const r = expectErr("Write-Output ($true ? 1)", /:/);
  assert.doesNotMatch(errors(r)[0].message, HOST_TEXT);
});
