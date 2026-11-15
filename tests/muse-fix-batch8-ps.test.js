// 修正バッチ8・PowerShell班の回帰テスト。
// 対象: R29-N10（ValidateNotNullOrEmpty／ValidateNotNullOrWhiteSpace の
// 検証未実装＝黙った受理）／R29-N9（検証・許可系属性の空括弧形と文位置
// [OutputType] 括弧なし形の未対応停止）／R29-N2（整数値の小数 1.0 の
// double 由来が関数引数・戻り値・パイプライン $_・foreach スカラーを
// 跨ぐと失われる）／R29-N11（複合代入 %= の未対応と原因の = 誤帰属）／
// R29-N12（メンバー直後に接着した -= の誤帰属・誤値）／R29-N13（括弧
// 付き代入式の「) が必要です」虚偽原因）／R29-N14（部分式 $() の
// 「変数の形式」虚偽原因）。
// 一次情報: Microsoft Learn の各検証属性クラス定義
// （ValidateNotNullOrEmptyAttribute は $null・空文字列・空コレクションを
// 拒否、ValidateNotNullOrWhiteSpaceAttribute はそれに加えて空白のみの
// 文字列を拒否）、about_Functions_Advanced_Parameters（属性の標準表記は
// () 付き）、PowerShell 言語仕様 §7.1.1（グループ化括弧）／§7.11（代入）
// ／§7.4、about_Assignment_Operators（%= を含む複合代入）、
// about_Operator_Precedence（$() は部分式演算子）。
// RG-263 前提: 括弧なし属性名は型リテラルであり、本ファイルの検証は
// 全て括弧つき属性形に対するものである（括弧なし形の対照も含む）。
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
  assert.equal(
    errors(r)[0].category,
    "ParameterBindingValidationException",
    code,
  );
  if (notPattern) assert.doesNotMatch(errors(r)[0].message, notPattern, code);
  return r;
};
const expectAnyErr = (code, pattern) => {
  const r = run(code);
  assert.ok(errors(r).length > 0, code + " は停止すべき");
  assert.match(errors(r)[0].message, pattern, code);
  return r;
};

// ---------- R29-N10: Validate 系の検証意味論（括弧つき形） ----------
test("batch8-ps R29-N10 ValidateNotNullOrEmpty() rejects null, empty string and empty collection", () => {
  const f = (arg) =>
    `function F { param([ValidateNotNullOrEmpty()] $x) 'ok' }\nF ${arg}`;
  expectErr(f("$null"), /検証属性 ValidateNotNullOrEmpty に一致しません：\$x に \$null/);
  expectErr(f("''"), /検証属性 ValidateNotNullOrEmpty に一致しません：\$x に 空文字列/);
  expectErr(f("@()"), /検証属性 ValidateNotNullOrEmpty に一致しません：\$x に 空のコレクション/);
  // 空白のみの文字列は OrEmpty では受理する（OrWhiteSpace との区別）
  expectOut(f("' '"), [["ok"]]);
  expectOut(f("'a'"), [["ok"]]);
  expectOut(f("@(1)"), [["ok"]]);
});

test("batch8-ps R29-N10 ValidateNotNullOrWhiteSpace() also rejects whitespace-only strings and names itself", () => {
  const f = (arg) =>
    `function F { param([ValidateNotNullOrWhiteSpace()] $x) 'ok' }\nF ${arg}`;
  expectErr(f("' '"), /検証属性 ValidateNotNullOrWhiteSpace に一致しません：\$x に 空白のみの文字列/);
  expectErr(f("''"), /検証属性 ValidateNotNullOrWhiteSpace に一致しません：\$x に 空文字列/);
  expectErr(f("@()"), /検証属性 ValidateNotNullOrWhiteSpace に一致しません/);
  // 属性名の取り違え（ValidateNotNull とだけ名指す）がないこと
  expectErr(f("$null"), /検証属性 ValidateNotNullOrWhiteSpace に一致しません/, /検証属性 ValidateNotNull に/);
  expectOut(f("' a '"), [["ok"]]);
});

test("batch8-ps R29-N10 ValidateNotNull() rejects only null", () => {
  const f = (arg) =>
    `function F { param([ValidateNotNull()] $x) 'ok' }\nF ${arg}`;
  expectErr(f("$null"), /検証属性 ValidateNotNull に一致しません：\$x に \$null/);
  expectOut(f("''"), [["ok"]]);
  expectOut(f("@()"), [["ok"]]);
});

test("batch8-ps R29-N10 sibling validation attributes are enforced (Count/Length/Range/Pattern/Set)", () => {
  expectErr(
    "function F { param([ValidateCount(1,2)] $x) 'ok' }\nF @(1,2,3)",
    /検証属性 ValidateCount に一致しません/,
  );
  expectOut("function F { param([ValidateCount(1,2)] $x) 'ok' }\nF @(1)", [["ok"]]);
  expectErr(
    "function F { param([ValidateLength(2,3)] $x) 'ok' }\nF 'a'",
    /検証属性 ValidateLength に一致しません/,
  );
  expectOut("function F { param([ValidateLength(2,3)] $x) 'ok' }\nF 'ab'", [["ok"]]);
  expectErr(
    "function F { param([ValidateRange(1,10)] $x) 'ok' }\nF 20",
    /検証属性 ValidateRange に一致しません/,
  );
  expectOut("function F { param([ValidateRange(1,10)] $x) 'ok' }\nF 5", [["ok"]]);
  expectErr(
    "function F { param([ValidatePattern('^[a-z]+$')] $x) 'ok' }\nF 'abc123'",
    /検証属性 ValidatePattern に一致しません/,
  );
  expectOut(
    "function F { param([ValidatePattern('^[a-z]+$')] $x) 'ok' }\nF 'abc'",
    [["ok"]],
  );
  expectErr(
    "function F { param([ValidateSet('a','b')] $x) 'ok' }\nF 'c'",
    /検証属性 ValidateSet に一致しません/,
  );
  // ValidateScript はモデル化できないため、黙って受理せず属性名を名指して止める
  expectAnyErr(
    "function F { param([ValidateScript({$_ -gt 0})] $x) 'ok' }\nF 1",
    /未対応のパラメータ属性：\[ValidateScript/,
  );
});

test("batch8-ps R29-N10 Allow*() exemptions compose with Validate*()", () => {
  expectOut(
    "function F { param([ValidateNotNullOrEmpty()][AllowEmptyString()] $x) 'ok' }\nF ''",
    [["ok"]],
  );
  expectErr(
    "function F { param([ValidateNotNullOrEmpty()][AllowEmptyString()] $x) 'ok' }\nF $null",
    /検証属性 ValidateNotNullOrEmpty/,
  );
  expectOut(
    "function F { param([ValidateNotNullOrEmpty()][AllowEmptyCollection()] $x) 'ok' }\nF @()",
    [["ok"]],
  );
  expectOut(
    "function F { param([ValidateNotNull()][AllowNull()] $x) 'ok' }\nF $null",
    [["ok"]],
  );
  // 型制約との併記順序によらない
  expectErr(
    "function F { param([string][ValidateNotNullOrEmpty()] $x) 'ok' }\nF ''",
    /検証属性 ValidateNotNullOrEmpty/,
  );
  expectErr(
    "function F { param([ValidateNotNullOrEmpty()][string] $x) 'ok' }\nF ''",
    /検証属性 ValidateNotNullOrEmpty/,
  );
});

// ---------- R29-N9: 空括弧形と文位置形の受理 ----------
test("batch8-ps R29-N9 empty-parentheses attribute forms are accepted", () => {
  expectOut("function F { param([AllowNull()] $x) 'ok' }\nF $null", [["ok"]]);
  expectOut("function F { param([AllowEmptyString()] $x) 'ok' }\nF ''", [["ok"]]);
  expectOut(
    "function F { param([AllowEmptyCollection()] $x) 'ok' }\nF @()",
    [["ok"]],
  );
  expectOut("function F { param([Parameter()] $x) $x }\nF 42", [["42"]]);
  // 括弧なし形は RG-263 の型リテラルのまま（属性化しない）
  expectAnyErr(
    "function F { param([ValidateNotNullOrEmpty] $x) $x }\nF 'hi'",
    /引数変換エラー：値を System\.Management\.Automation\.ValidateNotNullOrEmptyAttribute へ変換できません/,
  );
});

test("batch8-ps R29-N9 statement-position OutputType forms before param are accepted", () => {
  expectOut("function F { [OutputType] param($x) $x }\nF 3", [["3"]]);
  expectOut("function F { [OutputType()] param($x) $x }\nF 3", [["3"]]);
  expectOut("function F { [OutputType([string])] param($x) $x }\nF 3", [["3"]]);
  expectOut(
    "function F { [CmdletBinding()] [OutputType] param($x) $x }\nF 3",
    [["3"]],
  );
});

// ---------- R29-N2: double 由来の境界伝播 ----------
test("batch8-ps R29-N2 double provenance crosses function arguments", () => {
  expectOut("function F($x) { Write-Output ($x/0) }\nF 1.0", [["Infinity"]]);
  expectOut("function F($x) { Write-Output ($x % 0) }\nF 1.0", [["NaN"]]);
  expectOut("$d = 1.0\nfunction F($x) { Write-Output ($x/0) }\nF $d", [["Infinity"]]);
  expectOut("function F($x) { Write-Output ($x/0) }\nF ([double]1)", [["Infinity"]]);
  expectOut(
    "function F { param([double]$x) Write-Output ($x/0) }\nF 1",
    [["Infinity"]],
  );
  // 整数引数は従来どおり整数の 0 除算エラー
  expectAnyErr("function F($x) { Write-Output ($x/0) }\nF 1", /0による除算です/);
  // 引数名と呼び出し側変数名が同じでも、呼び出し側の由来は漏れない
  expectAnyErr(
    "$x = 1.0\nfunction F($x) { Write-Output ($x/0) }\nF 1",
    /0による除算です/,
  );
  // 逆向き（呼び出し側が整数・引数が小数）も同名で正しく伝わる
  expectOut("$x = 1\nfunction F($x) { Write-Output ($x/0) }\nF 1.0", [["Infinity"]]);
});

test("batch8-ps R29-N2 double provenance crosses function return values", () => {
  expectOut("function F { return 1.0 }\n$v = F\nWrite-Output ($v/0)", [["Infinity"]]);
  expectOut("function F { 1.0 }\n$v = F\nWrite-Output ($v/0)", [["Infinity"]]);
  expectOut(
    "function F { $x = 1.0; return $x }\n$v = F\nWrite-Output ($v % 0)",
    [["NaN"]],
  );
  expectAnyErr(
    "function F { return 1 }\n$v = F\nWrite-Output ($v/0)",
    /0による除算です/,
  );
});

test("batch8-ps R29-N2 double provenance crosses pipeline $_ and foreach scalars", () => {
  expectOut("1.0 | ForEach-Object { Write-Output ($_/0) }", [["Infinity"]]);
  expectOut(
    "1.0 | Where-Object { $_ -gt 0 } | ForEach-Object { Write-Output ($_/0) }",
    [["Infinity"]],
  );
  expectOut("foreach ($v in 1.0) { Write-Output ($v/0) }", [["Infinity"]]);
  expectOut("$d = 1.0\nforeach ($v in $d) { Write-Output ($v/0) }", [["Infinity"]]);
  // 既知限界（ハッシュ／配列要素）は様相不変：整数の 0 除算エラーのまま
  expectAnyErr("$h = @{k = 1.0}\nWrite-Output ($h.k/0)", /0による除算です/);
  expectAnyErr("foreach ($v in @(1.0)) { Write-Output ($v/0) }", /0による除算です/);
});

// ---------- R29-N11: 複合代入 %= ----------
test("batch8-ps R29-N11 %= compound assignment works on all targets", () => {
  expectOut("$x = 10\n$x %= 3\nWrite-Output $x", [["1"]]);
  expectOut("$x = 10\n$x%=3\nWrite-Output $x", [["1"]]);
  expectOut("$h = @{k = 10}\n$h.k %= 3\nWrite-Output $h.k", [["1"]]);
  expectOut("$a = @(10)\n$a[0] %= 3\nWrite-Output $a[0]", [["1"]]);
  // 他の複合代入の受理表（棚卸し対照）
  expectOut("$x = 10\n$x += 3\n$x -= 3\n$x *= 2\n$x /= 4\nWrite-Output $x", [["5"]]);
});

// ---------- R29-N12: メンバー接着 -= ----------
test("batch8-ps R29-N12 glued -= after members assigns like the spaced form", () => {
  expectOut("$h = @{k = 10}\n$h.k-=3\nWrite-Output $h.k", [["7"]]);
  expectOut("$h = @{k = 10}\n$h.k-= 3\nWrite-Output $h.k", [["7"]]);
  expectOut("$h = @{k = 10}\n$h.k-=-3\nWrite-Output $h.k", [["13"]]);
  expectOut(
    "$o = [PSCustomObject]@{k = 10}\n$o.k-=3\nWrite-Output $o.k",
    [["7"]],
  );
  expectOut("$h = @{a = @{k = 10}}\n$h.a.k-=3\nWrite-Output $h.a.k", [["7"]]);
  expectOut("$a = @(@{k = 10})\n$a[0].k-=3\nWrite-Output $a[0].k", [["7"]]);
  // 式位置の接着減算・後置 -- は不変
  expectOut("$h = @{k = 10}\nWrite-Output ($h.k-3)", [["7"]]);
  expectOut("$h = @{k = 10}\n$x = $h.k--\nWrite-Output $x\nWrite-Output $h.k", [["10", "9"]]);
});

// ---------- R29-N13: 括弧付き代入式 ----------
test("batch8-ps R29-N13 parenthesized assignment expressions return the assigned value", () => {
  expectOut("Write-Output ($x = 5)", [["5"]]);
  expectOut("($x = 5)\nWrite-Output $x", [["5", "5"]]);
  expectOut("(($x = 5))", [["5"]]);
  expectOut("$y = ($x = 5)\nWrite-Output $y\nWrite-Output $x", [["5", "5"]]);
  expectOut("if (($x = 5) -eq 5) { 'yes' }\nWrite-Output $x", [["yes", "5"]]);
  expectOut("if ($x = 5) { 'yes' }\nWrite-Output $x", [["yes", "5"]]);
  expectOut("$x = 0\nwhile (($x += 1) -lt 2) { }\nWrite-Output $x", [["2"]]);
  expectOut(
    "Write-Output ($true ? ($x = 5) : 0)\nWrite-Output $x",
    [["5", "5"]],
  );
  // 連鎖代入（文位置・右結合）
  expectOut("$y = $x = 5\nWrite-Output $y\nWrite-Output $x", [["5", "5"]]);
  // 文位置の単独形は従来どおり出力なし（代入文）
  expectOut("$x = 5\nWrite-Output $x", [["5"]]);
});

// ---------- R29-N14: 部分式 $() ----------
test("batch8-ps R29-N14 subexpression $() evaluates in expression positions", () => {
  expectOut("Write-Output $(1 + 1)", [["2"]]);
  expectOut("$x = $(2 * 3)\nWrite-Output $x", [["6"]]);
  expectOut("$h = @{k = 10}\nWrite-Output $($h.k / 2)", [["5"]]);
  expectOut("Write-Output $($x = 5; $x + 1)", [["6"]]);
  expectOut("Write-Output $(1,2)", [["1", "2"]]);
  // 空の $() は出力なし
  expectOut("Write-Output $()\nWrite-Output 'after'", [["after"]]);
  expectOut("$x = $()\nWrite-Output ($null -eq $x)", [["True"]]);
  // 補間内は不変
  expectOut('"val=$(1 + 1)"', [["val=2"]]);
});
