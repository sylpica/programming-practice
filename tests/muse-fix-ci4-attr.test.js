// CI是正（RG-263 予定）・括弧なし属性名の型リテラル解釈の回帰テスト。
// 経緯: バッチ7配信（main b77ea21）の CI validate-shells でフィクスチャ
// bare parameter attribute（param([Parameter] $x), f 42）が実 PowerShell
// と食い違った。RG-244／R28-N6 は「文法 B.2.4 では属性が正規形」として
// 括弧なし [Parameter] を属性として解釈したが、実 PowerShell は括弧なし
// の属性名を型リテラル（ParameterAttribute 型への変換）として解釈し、
// 42 の変換に失敗して引数変換エラーで停止する（実測エラー: "Cannot
// process argument transformation on parameter 'x'. Cannot convert the
// "42" value of type "System.Int32" to type
// "System.Management.Automation.ParameterAttribute"."）。
// 本ファイルは棚卸しした全表面を固定する:
// - 既知の属性名（Parameter／ValidateNotNull 系／Allow 系／CmdletBinding）
//   の括弧なし形は型制約であり、非 $null は引数変換エラー、$null は通過。
// - 既定値にも束縛時に変換がかかる。
// - 複数括弧は従来どおり last-wins（最後の型が勝つ）。
// - 括弧つき属性 [Parameter(...)] と未知型 [BogusType] の対照は不変。
// - 文位置の [CmdletBinding]＋param 形は関数属性の位置であり不変。
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
  return r;
};
const ATTR_ERR = (full, value) =>
  new RegExp(
    "引数変換エラー：値を " +
      full.replace(/\./g, "\\.") +
      " へ変換できません：" +
      value,
  );

// ---------- 既知の属性名の括弧なし形は型制約（非 $null は変換エラー） ----------
test("ci4-attr RG-263 bare known attribute names fail conversion for non-null values", () => {
  expectErr(
    "function f { param([Parameter] $x) Write-Output $x }\nf 42",
    ATTR_ERR("System.Management.Automation.ParameterAttribute", "42"),
  );
  expectErr(
    "function f { param([Parameter] $x) Write-Output $x }\nf 'hi'",
    ATTR_ERR("System.Management.Automation.ParameterAttribute", "hi"),
  );
  expectErr(
    "function f { param([ValidateNotNull] $x) Write-Output $x }\nf 3",
    ATTR_ERR("System.Management.Automation.ValidateNotNullAttribute", "3"),
  );
  expectErr(
    "function f { param([ValidateNotNullOrEmpty] $x) Write-Output $x }\nf 'hi'",
    ATTR_ERR(
      "System.Management.Automation.ValidateNotNullOrEmptyAttribute",
      "hi",
    ),
  );
  expectErr(
    "function f { param([ValidateNotNullOrWhitespace] $x) Write-Output $x }\nf 'hi'",
    ATTR_ERR(
      "System.Management.Automation.ValidateNotNullOrWhitespaceAttribute",
      "hi",
    ),
  );
  expectErr(
    "function f { param([AllowNull] $x) Write-Output $x }\nf 3",
    ATTR_ERR("System.Management.Automation.AllowNullAttribute", "3"),
  );
  expectErr(
    "function f { param([AllowEmptyString] $x) Write-Output $x }\nf 'hi'",
    ATTR_ERR("System.Management.Automation.AllowEmptyStringAttribute", "hi"),
  );
  expectErr(
    "function f { param([AllowEmptyCollection] $x) Write-Output $x }\nf @(1)",
    ATTR_ERR(
      "System.Management.Automation.AllowEmptyCollectionAttribute",
      "@\\(1\\)",
    ),
  );
  expectErr(
    "function f { param([CmdletBinding] $x) Write-Output $x }\nf 3",
    ATTR_ERR("System.Management.Automation.CmdletBindingAttribute", "3"),
  );
  // 型名の別表記（〜Attribute サフィックス・完全修飾）も同じ型として裁定する
  expectErr(
    "function f { param([ParameterAttribute] $x) Write-Output $x }\nf 42",
    ATTR_ERR("System.Management.Automation.ParameterAttribute", "42"),
  );
  expectErr(
    "function f { param([System.Management.Automation.ParameterAttribute] $x) Write-Output $x }\nf 42",
    ATTR_ERR("System.Management.Automation.ParameterAttribute", "42"),
  );
});

// ---------- $null はそのまま $null（引数なし・既定値なし・明示 $null） ----------
test("ci4-attr RG-263 null binds through bare attribute types without error", () => {
  expectOut(
    "function f { param([Parameter] $x) Write-Output ($null -eq $x) }\nf",
    [["True"]],
  );
  expectOut(
    "function f { param([Parameter] $x) Write-Output ($null -eq $x) }\nf $null",
    [["True"]],
  );
  expectOut(
    "function f { param([ValidateNotNull] $x) Write-Output ($null -eq $x) }\nf",
    [["True"]],
  );
  expectOut(
    "function f { param([AllowNull] $x) Write-Output ($null -eq $x) }\nf $null",
    [["True"]],
  );
  // 単独キャスト式でも同規則
  expectOut("Write-Output ($null -eq [Parameter]$null)", [["True"]]);
});

// ---------- 既定値にも束縛時に変換がかかる ----------
test("ci4-attr RG-263 default values are converted at bind time", () => {
  expectErr(
    "function f { param([Parameter] $x = 9) Write-Output $x }\nf",
    ATTR_ERR("System.Management.Automation.ParameterAttribute", "9"),
  );
  // 引数を渡しても、その値が変換対象になる（既定値は使われない）
  expectErr(
    "function f { param([Parameter] $x = 9) Write-Output $x }\nf 5",
    ATTR_ERR("System.Management.Automation.ParameterAttribute", "5"),
  );
  // 既定値が $null の場合は変換が成功し、そのまま使われる
  expectOut(
    "function f { param([Parameter] $x = $null) Write-Output ($null -eq $x) }\nf",
    [["True"]],
  );
});

// ---------- 複数括弧の組合せ（last-wins） ----------
test("ci4-attr RG-263 multiple bracket groups keep last-wins type resolution", () => {
  // [string] が最後 → 通常の文字列変換で通る
  expectOut(
    "function f { param([Parameter] [string] $x) Write-Output $x }\nf 'hi'",
    [["hi"]],
  );
  // [Parameter] が最後 → ParameterAttribute への変換で止まる
  expectErr(
    "function f { param([string] [Parameter] $x) Write-Output $x }\nf 'hi'",
    ATTR_ERR("System.Management.Automation.ParameterAttribute", "hi"),
  );
});

// ---------- 単独キャスト式も同じ変換規則 ----------
test("ci4-attr RG-263 standalone casts to attribute types follow the same rule", () => {
  expectErr(
    "Write-Output ([Parameter]42)",
    ATTR_ERR("System.Management.Automation.ParameterAttribute", "42"),
  );
  expectErr(
    "Write-Output ([ValidateNotNull]3)",
    ATTR_ERR("System.Management.Automation.ValidateNotNullAttribute", "3"),
  );
});

// ---------- 対照: 括弧つき属性と未知型は不変 ----------
test("ci4-attr RG-263 parenthesized attributes and unknown types are unchanged", () => {
  expectOut(
    "function f { param([Parameter()] $x) Write-Output $x }\nf 42",
    [["42"]],
  );
  expectOut(
    "function f { param([Parameter(Mandatory=$true)] $x) Write-Output $x }\nf 42",
    [["42"]],
  );
  expectErr(
    "function f { param([Parameter(Mandatory=$true)] $x) Write-Output $x }\nf",
    /必須パラメータ/,
  );
  expectErr(
    "function f { param([BogusType] $x) Write-Output $x }\nf 1",
    /未対応の型変換：\[BogusType\]/,
  );
  expectErr("Write-Output ([BogusType]1)", /未対応の型変換：\[BogusType\]/);
});

// ---------- 文位置の [CmdletBinding]＋param は関数属性の位置（不変） ----------
test("ci4-attr RG-263 statement-position CmdletBinding before param is unchanged", () => {
  expectOut(
    "function f { [CmdletBinding] param($x) Write-Output $x }\nf 7",
    [["7"]],
  );
  expectOut(
    "function f { [CmdletBinding()] param($x) Write-Output $x }\nf 7",
    [["7"]],
  );
});
