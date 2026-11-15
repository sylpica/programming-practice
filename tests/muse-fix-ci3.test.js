import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as ps } from "../js/types/powershell/index.js";

// RG-164: foreach 文が指定するコレクションが $null のとき、実 PowerShell は
// 0 回反復する（PowerShell 言語仕様 §8.4.4「$null は 0 要素のコレクション
// として扱われる」）。スカラー（$null 以外）は 1 要素、配列は要素ごと。
// パイプライン側は非対称で、$null は ForEach-Object に 1 オブジェクトとして
// 渡る（about_Automatic_Variables）。バッチ2の SH-P6 はこの非対称を取り違え、
// foreach 文にもパイプライン側の規則を適用して 1 回実行にしていた。
// Windows CI（shell-native-audit.py）の実 pwsh が "0" を返して確定した。
const runPs = (code, extra = {}) =>
  ps.simulate(code, { ...structuredClone(ps.model.defaults), ...extra });
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
const outPs = (r) =>
  r.paths.map((p) =>
    p.outputs.filter((o) => o.channel === "pipeline").map((o) => o.text),
  );
const count = (code) => {
  const r = runPs(code);
  assert.deepEqual(errors(r), [], JSON.stringify(errors(r)));
  return outPs(r);
};

test("ci3 foreach over $null literal iterates zero times", () => {
  assert.deepEqual(count("$n=0;foreach($x in $null){$n++};$n"), [["0"]]);
  assert.deepEqual(count('foreach($x in $null){"ran"}'), [[]]);
});

test("ci3 foreach over $null-valued variable and undefined variable iterates zero times", () => {
  assert.deepEqual(count("$a=$null;$n=0;foreach($x in $a){$n++};$n"), [["0"]]);
  assert.deepEqual(count("$n=0;foreach($x in $undefined99){$n++};$n"), [["0"]]);
  assert.deepEqual(count("$n=0;foreach($x in ($null)){$n++};$n"), [["0"]]);
});

test("ci3 foreach over a command whose collected output is a single $null iterates zero times", () => {
  assert.deepEqual(
    count("function F {$null};$n=0;foreach($x in F){$n++};$n"),
    [["0"]],
  );
  assert.deepEqual(
    count("function F {$null};$n=0;foreach($x in (F)){$n++};$n"),
    [["0"]],
  );
  // 配列はパイプラインで展開されるため、@($null) を返す関数も $null を指定する
  assert.deepEqual(
    count("function F {@($null)};$n=0;foreach($x in F){$n++};$n"),
    [["0"]],
  );
  assert.deepEqual(
    count("function F {};$n=0;foreach($x in F){$n++};$n"),
    [["0"]],
  );
});

test("ci3 foreach leaves the loop variable untouched when the collection is $null", () => {
  assert.deepEqual(count("$x=9;foreach($x in $null){};$x"), [["9"]]);
  assert.deepEqual(count("$x=9;foreach($x in $null){};$null -eq $x"), [
    ["False"],
  ]);
  assert.deepEqual(count("foreach($x in 1..3){};$x"), [["3"]]);
});

test("ci3 foreach still iterates scalars once and arrays per element", () => {
  assert.deepEqual(count("$n=0;foreach($x in @()){$n++};$n"), [["0"]]);
  assert.deepEqual(count("$n=0;foreach($x in 5){$n++};$n"), [["1"]]);
  assert.deepEqual(count("$n=0;foreach($x in 0){$n++};$n"), [["1"]]);
  assert.deepEqual(count("$n=0;foreach($x in $false){$n++};$n"), [["1"]]);
  assert.deepEqual(count('$n=0;foreach($x in ""){$n++};$n'), [["1"]]);
  assert.deepEqual(count("$n=0;foreach($x in @{a=1}){$n++};$n"), [["1"]]);
  assert.deepEqual(count("$n=0;foreach($x in @($null)){$n++};$n"), [["1"]]);
  assert.deepEqual(count("$n=0;foreach($x in @(1,$null,2)){$n++};$n"), [
    ["3"],
  ]);
  assert.deepEqual(count("$n=0;foreach($x in $null,$null){$n++};$n"), [
    ["2"],
  ]);
  // @() で包めば、$null を返す関数の出力も 1 要素として数える
  assert.deepEqual(
    count("function F {$null};$n=0;foreach($x in @(F)){$n++};$n"),
    [["1"]],
  );
  assert.deepEqual(
    count('foreach($x in @($null)){if($null -eq $x){"isnull"}}'),
    [["isnull"]],
  );
});

test("ci3 pipeline enumeration of $null is unchanged (one object for ForEach-Object)", () => {
  assert.deepEqual(count("$null|ForEach-Object {1}"), [["1"]]);
  assert.deepEqual(count("$a=$null;$a|ForEach-Object {1}"), [["1"]]);
  assert.deepEqual(count("@()|ForEach-Object {1}"), [[]]);
  assert.deepEqual(count("$n=0;@($null)|ForEach-Object {$n++};$n"), [["1"]]);
  assert.deepEqual(count("$n=0;1,$null,2|ForEach-Object {$n++};$n"), [
    ["3"],
  ]);
});
