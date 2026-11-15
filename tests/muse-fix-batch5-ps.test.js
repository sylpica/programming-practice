// 修正バッチ5・PowerShell班の回帰テスト。
// 対象: R26-N1（param 既定値内側への範囲右辺カンマ抑止の継承）／
// R26-N2（引数モードの ++／-- 接着形のホスト例外文言漏出）／
// R26-N21（非整数の範囲端点の虚偽原因）。
// 一次情報: PowerShell 言語仕様 Appendix A 文法 B.2.3
// （range-expression は両辺とも array-literal-expression）・
// B.1.7（generic-token）、言語仕様 §6.4（整数への変換規則＝
// .NET 準拠の偶数丸め）、Microsoft Learn about_Parsing／
// about_Operator_Precedence。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
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

// ---------- R26-N1: param 既定値の内側ではカンマ抑止を継承しない ----------
test("batch5-ps R26-N1 param default interiors parse range commas as expression commas", () => {
  // 括弧・二重括弧・@()・@{}・キャスト・型付き param・単項・添字・
  // メンバー対象の全位置で、文位置 Write-Output (1..3,4) と同じ
  // 変換エラー（対象 @(3, 4)）で停止すること。黙った入れ子配列化や
  // 誤った真偽を返さないこと。
  for (const code of [
    "function f { param($a = (1..3,4)) Write-Output $a }\nf",
    "function f { param($a = ((1..3,4))) Write-Output $a }\nf",
    "function f { param($a = @(1..3,4)) Write-Output $a }\nf",
    "function f { param($a = @((1..3,4))) Write-Output $a }\nf",
    "function f { param($a = @{k = (1..3,4)}) Write-Output $a }\nf",
    "function f { param($a = @{k = 1..3,4}) Write-Output $a }\nf",
    "function f { param($a = [string](1..3,4)) Write-Output $a }\nf",
    "function f { param($a = [int](1..3,4)) Write-Output $a }\nf",
    "function f { param([int]$a = (1..3,4)) Write-Output $a }\nf",
    "function f { param($a = -(1..3,4)) Write-Output $a }\nf",
    "function f { param($a = (1..3,4).Count) Write-Output $a }\nf",
    "function f { param($a = (2 -in 1..5,9)) Write-Output $a }\nf",
  ])
    expectErr(code, /数値へ変換できません：@\(3, 4\)|数値へ変換できません：@\(5, 9\)/);
  expectErr(
    "function f { param($a = (2 -in 1..5,9)) Write-Output $a }\nf",
    /数値へ変換できません：@\(5, 9\)/,
  );
  // 左辺カンマ列も文位置と一致（@(1, 2) への変換エラー）。
  expectErr(
    "function f { param($a = (1,2..3)) Write-Output $a }\nf",
    /数値へ変換できません：@\(1, 2\)/,
  );
  // 黙った誤値（入れ子配列・誤った真偽＋余分な値）が出力されないこと。
  const r = run("function f { param($a = (1..3,4)) Write-Output $a }\nf");
  assert.deepEqual(out(r), [[]]);
});
test("batch5-ps R26-N1 param separator level behaviour is preserved", () => {
  // パラメータ列水準の区切りカンマは従来どおり働く。
  expectOut(
    "function f { param($a = 1..2, $b = 9) Write-Output $a; Write-Output $b }\nf",
    [["1", "2", "9"]],
  );
  expectOut(
    "function f { param($a = -1, $b = 2) Write-Output $a }\nf",
    [["-1"]],
  );
  // 括弧なし既定値・括弧明示の入れ子・@() の通常形は不変。
  expectOut(
    "function f { param($a = (1,2)) Write-Output $a }\nf",
    [["1", "2"]],
  );
  expectOut(
    "function f { param($a = ((1..3),4)) Write-Output $a }\nf",
    [["@(1, 2, 3)", "4"]],
  );
  expectOut(
    "function f { param($a = @(1,2,3)) Write-Output $a }\nf",
    [["1", "2", "3"]],
  );
  expectOut(
    "function f { param($a = @{k = 1..3}) Write-Output $a.k }\nf",
    [["1", "2", "3"]],
  );
});
test("batch5-ps R26-N1 expected-error fixtures stop in the simulator (native pair)", () => {
  const fixtures = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/powershell-error-cases.json", import.meta.url),
    ),
  );
  assert.ok(fixtures.length >= 3);
  for (const [name, code, pattern] of fixtures) {
    const r = run(code);
    assert.ok(errors(r).length > 0, name + ": シミュレータも停止すべき");
    assert.match(errors(r)[0].message, new RegExp(pattern), name);
  }
});

// ---------- R26-N2: 引数モードの ++／-- 接着形 ----------
test("batch5-ps R26-N2 glued ++/-- numeric forms are single string arguments", () => {
  for (const s of [
    "1--2",
    "1++2",
    "12--34",
    "1---2",
    "1+++2",
    "1.5--2",
    "0x1F--1",
    "1e2--3",
    "1--",
    "1++",
    "2--",
    "0.5--0.5",
    "1kb--2",
    "1--2--3",
    "1----2",
    "1----",
  ])
    expectOut("Write-Output " + s, [[s]]);
  // 先行形・符号つき形も単一の文字列引数。
  for (const s of ["--1", "++1", "----1", "-1--2", "+1--2", "-1++2"])
    expectOut("Write-Output " + s, [[s]]);
  // カンマ前後では要素ごとに接着が効く。
  expectOut("Write-Output 1,2--3", [["1", "2--3"]]);
  expectOut("Write-Output 1--2,3", [["1--2", "3"]]);
  expectOut("Write-Output 1--2,3--4", [["1--2", "3--4"]]);
  expectOut("Write-Output 1,++2", [["1", "++2"]]);
  expectOut("Write-Output 1,--2", [["1", "--2"]]);
  expectOut("Write-Output ++1,2", [["++1", "2"]]);
  // 空白で区切られた形は引数が分かれる（接着部分だけが文字列）。
  expectOut("Write-Output 1-- 2", [["1--", "2"]]);
  expectOut("Write-Output 1 --2", [["1", "--2"]]);
  expectOut("Write-Output 1 ++2", [["1", "++2"]]);
  expectOut("Write-Output 1 ++", [["1", "++"]]);
  expectOut("Write-Output -- 1", [["--", "1"]]);
  expectOut("Write-Output --", [["--"]]);
  // 他コマンド・名前付きパラメータ値・パイプラインでも同じ。
  expectErr("Get-Content 1--2", /モデルにファイルがありません/);
  expectOut("Write-Output 1--2 | Write-Output", [["1--2"]]);
});
test("batch5-ps R26-N2 glued string and variable forms in argument mode", () => {
  // 引用文字列への接着は内容に続く文字列として渡る。
  expectOut("Write-Output 'a'++", [["a++"]]);
  expectOut("Write-Output 'a'--2", [["a--2"]]);
  expectOut('Write-Output "a"--2', [["a--2"]]);
  // 単語で始まる接着形は従来どおり。
  expectOut("Write-Output abc--def", [["abc--def"]]);
  expectOut("Write-Output hello++2", [["hello++2"]]);
  // 変数への後置・前置は従来どおり式として評価される。
  expectOut("$x=5\nWrite-Output $x--\nWrite-Output $x", [["5", "4"]]);
  expectOut("$x=5\nWrite-Output $x++\nWrite-Output $x", [["5", "6"]]);
  expectOut("$x=5\nWrite-Output ++$x", [["6"]]);
  expectOut("$x=5\nWrite-Output --$x", [["4"]]);
  // 単独演算子の接着形（RG-183）は不変。
  expectOut("Write-Output 1+2", [["1+2"]]);
  expectOut("Write-Output 1+-2", [["1+-2"]]);
  expectOut("Write-Output 1*2--3", [["1*2--3"]]);
});
test("batch5-ps R26-N2 no host exception text leaks from argument or expression positions", () => {
  // 引数モードの解析経路からホスト例外の生文言が出ないこと。
  // 塞げない形は、対象を名指した学習者向け停止に倒れること。
  for (const code of [
    "Write-Output 1--2",
    "Write-Output (1--)",
    "Write-Output (1++)",
    "Write-Output (++1)",
    "Write-Output (--1)",
    "Write-Output ((1+2)++)",
    "$a = 1--",
    "$a = 'x'++",
    "if ($true) { 1++ }",
    "Write-Output 1..3++",
    "Write-Output 1..3--4",
  ]) {
    const r = run(code);
    for (const e of errors(r))
      assert.doesNotMatch(e.message, HOST_TEXT, code);
  }
  // 式位置のリテラルへの後置は、代入先を名指して止まる。
  expectErr("Write-Output (1--)", /代入先が不正です/);
  expectErr("Write-Output (++1)", /代入先が不正です/);
  expectErr("$a = 'x'++", /代入先が不正です/);
  // 式位置 (1--2) の文言は未確認候補 U-6 のため変更しない。
  expectErr("Write-Output (1--2)", /\) が必要です/);
  // 範囲右辺に接着した形は、文字列への変換エラーとして名指しで止まる。
  expectErr("Write-Output 1..3++", /数値へ変換できません：3\+\+/);
});

// ---------- R26-N21: 非整数の範囲端点（言語仕様 §6.4 の偶数丸め） ----------
test("batch5-ps R26-N21 fractional range endpoints round half-to-even per §6.4", () => {
  expectOut("Write-Output (1.5..3)", [["2", "3"]]); // [int]1.5=2
  expectOut("Write-Output (1..3.5)", [["1", "2", "3", "4"]]); // [int]3.5=4
  expectOut("Write-Output (2.5..5)", [["2", "3", "4", "5"]]); // [int]2.5=2
  expectOut("Write-Output (0.5..2)", [["0", "1", "2"]]); // [int]0.5=0
  expectOut("Write-Output (3.5..1)", [["4", "3", "2", "1"]]); // 降順
  expectOut("Write-Output (-1.5..1)", [["-2", "-1", "0", "1"]]); // [int](-1.5)=-2
  expectOut("Write-Output (-2.5..0)", [["-2", "-1", "0"]]); // [int](-2.5)=-2
  expectOut("Write-Output (1.4..3)", [["1", "2", "3"]]);
  expectOut("Write-Output (1.6..3)", [["2", "3"]]);
  expectOut("Write-Output (0.4..2)", [["0", "1", "2"]]);
  expectOut("Write-Output (2..0.5)", [["2", "1", "0"]]);
  // 引数モード・代入位置でも同じ。
  expectOut("Write-Output 1.5..3", [["2", "3"]]);
  expectOut("$a = 2.5..4\nWrite-Output $a", [["2", "3", "4"]]);
});
test("batch5-ps R26-N21 string and integer endpoints are unchanged, limit stays truthful", () => {
  expectOut("Write-Output ('2'..4)", [["2", "3", "4"]]);
  expectOut("Write-Output ('2.5'..5)", [["2", "3", "4", "5"]]);
  expectOut("Write-Output (1..3)", [["1", "2", "3"]]);
  expectOut("Write-Output (3..1)", [["3", "2", "1"]]);
  expectOut("Write-Output ($null..2)", [["0", "1", "2"]]);
  // 丸めた後の端点差が実際に上限を超える場合は、上限の名指しが真因。
  expectErr("Write-Output (1.5..10003.5)", /整数範囲のモデル上限/);
  expectErr("Write-Output (0..10001)", /整数範囲のモデル上限/);
  // 配列端点の変換エラー（RG-176）は不変。
  expectErr("Write-Output (1..3,4)", /数値へ変換できません：@\(3, 4\)/);
});
