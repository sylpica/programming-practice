// CI是正（RG-262 予定）・文字列への ++／-- の回帰テスト。
// 欠陥: バッチ7配信（main b77ea21）の CI validate-shells で、フィクスチャ
// `string increment converts to number`（$s='5'、$s++、Write-Output $s）が
// 実 PowerShell と食い違った。バッチ7の RG-242 は「文字列への ++ は数値
// 変換して増やす（'5'++ → 6）」と裁定し、-- も binary("-") 経由で
// '5'-- → 4 になっていたが、実 PowerShell は文字列への ++／-- を保持値に
// よらず演算子エラーにする（"The '++' operator works only on numbers.
// The operand is a 'System.String'."、出力なし）。R28-N4 の元の所見
// （連結化）も誤りで、正解は「エラーで名指し停止」。
// 本ファイルは棚卸しした全表面（変数／前置形／メンバー・添字の代入先／
// 型付き束縛／文字列でない保持値）を固定する。文字列ケースは修正前は
// 失敗し（数値化・連結・変換エラーのいずれか）、修正後に合格する形。
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
const INC = /\+\+演算子は文字列には使えません/;
const DEC = /--演算子は文字列には使えません/;

// ---------- 変数（後置・前置）: 保持値によらず演算子エラー ----------
test("ci4-inc (RG-262 planned): string variable ++/-- is an operator error for every held string", () => {
  for (const [code, pattern] of [
    ["$s = '5'\n$s++\nWrite-Output $s", INC],
    ["$s = '5'\n$s--\nWrite-Output $s", DEC],
    ["$s = '5'\n++$s\nWrite-Output $s", INC],
    ["$s = '5'\n--$s\nWrite-Output $s", DEC],
    ["$s = '5.5'\n$s++", INC],
    ["$s = '-3'\n$s--", DEC],
    ["$s = 'abc'\n$s++", INC],
    ["$s = 'abc'\n$s--", DEC],
    ["$s = ''\n$s++", INC],
    ["$s = ''\n--$s", DEC],
  ]) {
    const r = expectErr(code, pattern, /数値へ変換できません/);
    assert.deepEqual(out(r), [[]], code + ": 出力は出ない");
  }
  // 文言とカテゴリの確定形（実物の演算子エラーに相当する RuntimeException）
  const r = run("$s = '5'\n$s++");
  assert.equal(errors(r)[0].message, "++演算子は文字列には使えません");
  assert.equal(errors(r)[0].category, "RuntimeException");
  const r2 = run("$s = '5'\n$s--");
  assert.equal(errors(r2)[0].message, "--演算子は文字列には使えません");
  assert.equal(errors(r2)[0].category, "RuntimeException");
  // 停止時点で保持値は書き換わっていない
  assert.equal(r.paths[0].vars.s, "5");
  // 後置を式位置で使っても旧値を返さずに止まる
  expectErr("$s = '5'\nWrite-Output ($s++)", INC);
  expectErr("$s = '5'\n$y = $s--\nWrite-Output $y", DEC);
});

// ---------- メンバー・添字の代入先 ----------
test("ci4-inc (RG-262 planned): string member/index targets are operator errors too", () => {
  expectErr("$h = @{k = '5'}\n$h.k++\nWrite-Output $h.k", INC);
  expectErr("$h = @{k = '5'}\n$h.k--\nWrite-Output $h.k", DEC);
  expectErr("$h = @{k = '5'}\n++$h.k\nWrite-Output $h.k", INC);
  expectErr("$h = @{k = '5'}\n--$h.k\nWrite-Output $h.k", DEC);
  // 引用符付きメンバー名でも同型
  expectErr("$h = @{k = '5'}\n$h.'k'++\nWrite-Output $h.k", INC);
  expectErr("$h = @{k = '5'}\n$h.'k'--\nWrite-Output $h.k", DEC);
  // PSCustomObject の文字列プロパティでも同型
  expectErr("$o = [PSCustomObject]@{k = '5'}\n$o.k++\nWrite-Output $o.k", INC);
  expectErr("$o = [PSCustomObject]@{k = '5'}\n$o.k--\nWrite-Output $o.k", DEC);
  // 添字の代入先でも同型
  expectErr("$a = @('5')\n$a[0]++\nWrite-Output $a[0]", INC);
  expectErr("$a = @('5')\n$a[0]--\nWrite-Output $a[0]", DEC);
  expectErr("$a = @('5')\n++$a[0]\nWrite-Output $a[0]", INC);
  expectErr("$a = @('5')\n--$a[0]\nWrite-Output $a[0]", DEC);
  // 数値のメンバー・添字は不変（対照）
  expectOut("$h = @{k = 5}\n$h.k++\nWrite-Output $h.k", [["6"]]);
  expectOut("$a = @(5)\n$a[0]--\nWrite-Output $a[0]", [["4"]]);
});

// ---------- 型付き束縛: 判定は保持値の型で行う ----------
test("ci4-inc (RG-262 planned): typed bindings follow the held value's type", () => {
  // [string] で束縛された保持値は文字列なのでエラー
  expectErr(
    "function f { param([string]$s = '5') $s++\nWrite-Output $s }\nf",
    INC,
  );
  expectErr(
    "function f { param([string]$s = '5') $s--\nWrite-Output $s }\nf",
    DEC,
  );
  expectErr(
    "function f { param([string]$s) $s++\nWrite-Output $s }\nf '5'",
    INC,
  );
  // キャスト代入で文字列として保持された値も同型
  expectErr("$s = [string]'5'\n$s++\nWrite-Output $s", INC);
  expectErr("$s = [string]'5'\n$s--\nWrite-Output $s", DEC);
  // [int] で束縛された保持値は代入時に数値へ変換済みなので数値として増減する
  expectOut(
    "function f { param([int]$x = '5') $x++\nWrite-Output $x }\nf",
    [["6"]],
  );
  expectOut(
    "function f { param([int]$x) $x++\nWrite-Output $x }\nf '5'",
    [["6"]],
  );
  expectOut("$x = [int]'5'\n$x++\nWrite-Output $x", [["6"]]);
  expectOut("$x = [int]'5'\n$x--\nWrite-Output $x", [["4"]]);
  // 文頭の型付き変数宣言（[string]$s = '5' の形）は、修正バッチ9の
  // R30-N11 で型付き代入文として実装された（従来は「変数へ代入して
  // ください」という虚偽原因の SyntaxError で止まる既存制限だった）。
  // 保持値の型による判定は文位置の型付き代入でも同じであり、
  // [string] 束縛の保持値は文字列として、[int] 束縛の保持値は
  // 代入時に変換済みの数値として増減する。
  expectErr("[string]$s = '5'\n$s++\nWrite-Output $s", INC);
  expectErr("[string]$s = '5'\n$s--\nWrite-Output $s", DEC);
  expectOut("[int]$x = '5'\n$x++\nWrite-Output $x", [["6"]]);
  expectOut("[int]$x = '5'\n$x--\nWrite-Output $x", [["4"]]);
});

// ---------- 文字列でない保持値は本件の範囲外（現行維持を固定） ----------
test("ci4-inc (RG-262 planned): non-string held values keep their current behavior", () => {
  // 数値・小数
  expectOut("$n = 5\n$n++\nWrite-Output $n", [["6"]]);
  expectOut("$n = 5\n--$n\nWrite-Output $n", [["4"]]);
  expectOut("$n = 5.5\n$n++\nWrite-Output $n", [["6.5"]]);
  // $null（未定義変数を含む）は 0 として増減する現行挙動を維持
  expectOut("$n = $null\n$n++\nWrite-Output $n", [["1"]]);
  expectOut("$n = $null\n$n--\nWrite-Output $n", [["-1"]]);
  expectOut("$u++\nWrite-Output $u", [["1"]]);
  // 真偽値は数値変換の現行挙動を維持
  expectOut("$b = $true\n$b++\nWrite-Output $b", [["2"]]);
  expectOut("$b = $false\n$b--\nWrite-Output $b", [["-1"]]);
  // 配列: ++ は binary("+") の配列連結、-- は変換エラーという現行の
  // 非対称を維持する（本是正は文字列の保持値だけを対象とする）
  expectOut("$a = @(1, 2)\n$a++\nWrite-Output $a", [["1", "2", "1"]]);
  expectErr("$a = @(1, 2)\n$a--", /数値へ変換できません/);
  // ハッシュテーブルは変換エラーで止まる現行挙動を維持
  expectErr("$h = @{k = 1}\n$h++", /数値へ変換できません/);
});

// ---------- 対照: 文字列の通常演算は不変 ----------
test("ci4-inc (RG-262 planned): ordinary string operations are unchanged", () => {
  // += は文字列追加のまま（++ とは別演算）
  expectOut("$s = '5'\n$s += 1\nWrite-Output $s", [["51"]]);
  expectOut("$s = 'a'\n$s += 'b'\nWrite-Output $s", [["ab"]]);
  // 二項 + の連結も不変
  expectOut("$s = '5'\nWrite-Output ($s + 1)", [["51"]]);
});
