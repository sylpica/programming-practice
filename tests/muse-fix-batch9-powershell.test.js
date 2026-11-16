// 修正バッチ9・PowerShell班の回帰テスト。
// 対象: R30-N10（改行を跨ぐ括弧式・文位置の型形が、存在しない「;」を
// 原因として停止する）／R30-N11（型付き代入文 [int]$x = "42" が
// 「変数へ代入してください」という虚偽原因で停止する）／
// R30-N12（ValidateLength が配列に対して要素数で検証され、
// ValidateCount と混同されている）。
// 一次情報: Microsoft Learn の ValidateLengthAttribute 定義
// （"Validates that the length of each parameter argument's Length
// falls in the range"、ValidateEnumeratedArgumentsAttribute 派生＝
// 列挙を展開して各要素を個別に検証）、ValidateRangeAttribute 定義
// （"Validates that each parameter argument falls in the range"、
// 同じく列挙型）、ValidateEnumeratedArgumentsAttribute の説明
// （ValidateLength／ValidateRange／ValidatePattern／ValidateSet が
// 列挙型、ValidateCount は引数全体の個数を検証）、型付き変数の形
// （[ValidateLength(8,12)][string]$computername = '...' の明示）、
// about_Parsing／言語仕様（括弧内・演算子の後の改行は文を終えない）。
// RG-263 前提: 括弧なし属性名は型リテラル（param 内）。本バッチの
// 型付き代入は被演算子が代入先のときに限る解釈であり競合しない。
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
const expectValidationErr = (code, pattern) => {
  const r = expectErr(code, pattern);
  assert.equal(
    errors(r)[0].category,
    "ParameterBindingValidationException",
    code,
  );
  return r;
};

// ---------- R30-N10: 改行跨ぎの受理 ----------
test("batch9-ps R30-N10 newline-crossing parenthesized expressions are accepted", () => {
  expectOut("$x=(1 +\n2)\n$x", [["3"]]);
  expectOut("$x=(\n1+2)\n$x", [["3"]]);
  expectOut("$x=(1+2\n)\n$x", [["3"]]);
  expectOut("Write-Output (1 +\n2)", [["3"]]);
  // 括弧の外でも、行末の演算子の後の改行は継続する
  expectOut("$x=1 +\n2\n$x", [["3"]]);
});

test("batch9-ps R30-N10 newline after comma and inside array literals is accepted", () => {
  expectOut("$a=@(1,\n2)\n$a", [["1", "2"]]);
  // 改行区切りの要素列挙は従来どおり
  expectOut("$a=@(1\n2)\n$a", [["1", "2"]]);
  expectOut("$a=@(10)\nWrite-Output ($a[0 +\n1] -eq $null)", [["True"]]);
});

test("batch9-ps R30-N10 newline-crossing condition is accepted", () => {
  expectOut('if(1 -eq\n1){"y"}', [["y"]]);
  expectOut('if(1 -eq\n2){"y"}else{"n"}', [["n"]]);
});

test("batch9-ps R30-N10 attribute before param across a newline is accepted", () => {
  expectOut("function F { [OutputType([int])]\nparam($x) $x }\nF 3", [["3"]]);
  expectOut("function F { [CmdletBinding()]\nparam($x) $x }\nF 3", [["3"]]);
  // param 括弧内の改行（先頭・区切り・型と変数の間）
  expectOut("function F { param(\n[string]$x) $x }\nF 'hi'", [["hi"]]);
  expectOut(
    "function F { param([ValidateLength(1,2)]\n[string]$x) $x }\nF 'ab'",
    [["ab"]],
  );
});

test("batch9-ps R30-N10 newline still terminates statements where PowerShell terminates them", () => {
  // 文の区切りとしての改行は不変（次行を被演算子として取り込まない）
  expectOut("$x=1\n$y=2\n$x+$y", [["3"]]);
  expectOut("Write-Output 1\nWrite-Output 2", [["1", "2"]]);
  expectOut("$x = [int]5\n$x", [["5"]]);
});

test("batch9-ps R30-N10 bare type literal names the type literal, not a phantom separator", () => {
  expectErr("[int]", /型リテラル \[int\]/, /;/);
  expectErr("[int]", /型リテラル \[int\]/, /<eof>/);
  expectErr("$x = [int]\n$y = 2", /型リテラル \[int\]/, /;/);
  expectErr("[string]", /型リテラル \[string\]/);
});

// ---------- R30-N11: 型付き代入文 ----------
test("batch9-ps R30-N11 typed assignment converts like real PowerShell", () => {
  expectOut('[int]$x="42"\n$x', [["42"]]);
  expectOut("[string]$x=42\n$x", [["42"]]);
  expectOut('[int]$x = "42"\nWrite-Output ($x + 1)', [["43"]]);
  expectOut('[double]$x="1.5"\n$x', [["1.5"]]);
  expectOut('[bool]$x=1\n$x', [["True"]]);
  // 配列型への型付き代入（要素ごとの変換）
  expectOut('[int[]]$a="1","2"\n$a', [["1", "2"]]);
  // メンバーへの型付き代入
  expectOut('$h=@{k=0}\n[int]$h.k="7"\n$h.k', [["7"]]);
  // 括弧内の型付き代入式は変換後の値を返す（RG-271 の隣接形）
  expectOut('Write-Output ([int]$y = "42")\n$y', [["42", "42"]]);
  // [double] 型付き代入の double 由来（整数値でも浮動小数点除算になる）
  expectOut("[double]$d = 1\nWrite-Output ($d/0)", [["Infinity"]]);
});

test("batch9-ps R30-N11 unconvertible typed assignment stops as a conversion error", () => {
  const r = expectErr('[int]$x="abc"', /数値へ変換できません：abc/, /代入してください/);
  assert.equal(errors(r)[0].category, "RuntimeException");
  expectErr('[int]$x="abc"', /変換/, /変数・プロパティ・添字へ代入してください/);
});

test("batch9-ps R30-N11 ordinary assignment and cast assignment are unchanged", () => {
  expectOut('$x="42"\n$x', [["42"]]);
  expectOut('$x=[int]"42"\n$x', [["42"]]);
  expectOut("function F { param([int]$x) $x }\nF '42'", [["42"]]);
});

// ---------- R30-N12: ValidateLength の列挙意味論 ----------
test("batch9-ps R30-N12 ValidateLength validates each element's length, not the element count", () => {
  // par班の再現1: 要素数3・各要素の長さ1 → 受理（従来は要素数で拒否）
  expectOut(
    "function F { param([ValidateLength(1,2)] $x) 'ok' }\nF @(\"a\",\"b\",\"c\")",
    [["ok"]],
  );
  // par班の再現2: 要素数1・唯一の文字列の長さ3 → 拒否（従来は受理）
  expectValidationErr(
    "function F { param([ValidateLength(1,2)] $x) 'ok' }\nF @(\"abc\")",
    /検証属性 ValidateLength に一致しません：\$x の長さは 3 です/,
  );
  // 途中の要素だけが範囲外でも拒否し、その要素の長さを名指す
  expectValidationErr(
    "function F { param([ValidateLength(1,2)] $x) 'ok' }\nF @(\"a\",\"abcd\")",
    /検証属性 ValidateLength に一致しません：\$x の長さは 4 です/,
  );
  // スカラー文字列は従来どおり
  expectOut("function F { param([ValidateLength(2,3)] $x) 'ok' }\nF 'ab'", [["ok"]]);
  expectValidationErr(
    "function F { param([ValidateLength(2,3)] $x) 'ok' }\nF 'a'",
    /検証属性 ValidateLength に一致しません/,
  );
});

test("batch9-ps R30-N12 ValidateCount still validates the element count", () => {
  expectValidationErr(
    "function F { param([ValidateCount(1,2)] $x) 'ok' }\nF @(\"a\",\"b\",\"c\")",
    /検証属性 ValidateCount に一致しません：\$x の要素数は 3 です/,
  );
  expectOut("function F { param([ValidateCount(1,2)] $x) 'ok' }\nF @(\"a\")", [["ok"]]);
});

test("batch9-ps R30-N12 sibling enumerated attributes validate each element (Range/Pattern)", () => {
  // ValidateRange: 配列の各要素を検証する（従来は配列全体が常に範囲外）
  expectOut("function F { param([ValidateRange(1,10)] $x) 'ok' }\nF @(5,9)", [["ok"]]);
  expectValidationErr(
    "function F { param([ValidateRange(1,10)] $x) 'ok' }\nF @(5,20)",
    /検証属性 ValidateRange に一致しません：\$x の値 20 は範囲外です/,
  );
  expectOut("function F { param([ValidateRange(1,10)] $x) 'ok' }\nF 5", [["ok"]]);
  expectValidationErr(
    "function F { param([ValidateRange(1,10)] $x) 'ok' }\nF 20",
    /検証属性 ValidateRange に一致しません/,
  );
  // ValidatePattern: 配列の各要素を検証する（従来は空白連結文字列で検証）
  expectOut(
    "function F { param([ValidatePattern('^[a-z]+$')] $x) 'ok' }\nF @('ab','cd')",
    [["ok"]],
  );
  expectValidationErr(
    "function F { param([ValidatePattern('^[a-z]+$')] $x) 'ok' }\nF @('ab','c1')",
    /検証属性 ValidatePattern に一致しません：\$x の値 c1 はパターンに一致しません/,
  );
  expectOut(
    "function F { param([ValidatePattern('^[a-z]+$')] $x) 'ok' }\nF 'abc'",
    [["ok"]],
  );
});
