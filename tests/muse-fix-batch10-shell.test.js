// 修正バッチ10・シェル班（PowerShell／cmd）の回帰テスト。
// 対象: R31-N10（PS: 検証属性＋型の二重ブラケット代入が虚偽原因
// 「変数・プロパティ・添字へ代入してください」で停止する）／
// R31-N8 の PS 分（式の途中終了で内部トークン "<eof>" が露出する）／
// R31-N13 の cmd／PS 分（形状不正モデルが汎用文言に落ちる）。
// あわせて横断スイープ (a) PS 代入位置のブラケット形の全数、
// (b) モデル形状（cmd／PS × null・数値・文字列・真偽値・配列・{} ＋
// files の型違い・要素の型違い、variables の型違い）、
// (c) cmd の途中終了・不正入力での内部名露出なし、を固定する。
// 一次情報: Microsoft Learn の型付き変数の形
// （[ValidateLength(8,12)][string]$computername = '...' の明示、
// about_Functions_Advanced_Parameters の属性列挙）。実 pwsh は当VMに
// 無いため、検証属性つき代入の受理範囲は広げず、バッチ9 §4 の保証
// （属性ブラケットを名指して停止する・虚偽原因ではない）に揃える。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as ps } from "../js/types/powershell/index.js";
import { definition as cmd } from "../js/types/cmd/index.js";
// モデル省略時のみ既定モデルを使う（null／undefined を明示した場合は
// そのまま渡し、形状検証の対象にする）。
const runPS = (code, ...rest) =>
  ps.simulate(code, rest.length ? rest[0] : structuredClone(ps.model.defaults));
const runCmd = (code, ...rest) =>
  cmd.simulate(code, rest.length ? rest[0] : structuredClone(cmd.model.defaults));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const out = (r) =>
  (r.paths || []).map((p) =>
    p.outputs.filter((o) => o.channel === "pipeline" || o.channel === "stdout").map((o) => o.text),
  );
const expectErrPS = (code, pattern, notPattern) => {
  const r = runPS(code);
  assert.ok(errors(r).length > 0, code + " は停止すべき");
  assert.match(errors(r)[0].message, pattern, code);
  if (notPattern) assert.doesNotMatch(errors(r)[0].message, notPattern, code);
  return r;
};
const expectOutPS = (code, expected) => {
  const r = runPS(code);
  assert.deepEqual(errors(r), [], code + ": " + JSON.stringify(errors(r)));
  assert.deepEqual(out(r), expected, code);
};

// ---------- R31-N10: 二重ブラケット代入はブラケットを名指して止まる ----------
test("batch10-shell R31-N10 double-bracket typed assignment names the brackets, not a false assignment cause", () => {
  // findings-r31-f01b §4 の再現4形
  for (const [code, pattern] of [
    ["[ValidateSet('x','y')][string]$v = 'x'", /未対応の型変換：\[ValidateSet\('x','y'\)\]\[string\]/],
    ["[string][ValidateSet('x','y')]$v = 'x'", /未対応の型変換：\[string\]\[ValidateSet\('x','y'\)\]/],
    ["[ValidateLength(1,2)][int]$v = 5", /未対応の型変換：\[ValidateLength\(1,2\)\]\[int\]/],
    // 検証を満たさない値でも、検証以前に同じ名指しで止まる
    ["[ValidateSet('x','y')][string]$v = 'z'", /ValidateSet/],
  ]) {
    const r = expectErrPS(code, pattern, /代入してください/);
    assert.equal(errors(r)[0].category, "未対応", code);
  }
});

test("batch10-shell R31-N10 sweep: triple, type-stacking, attribute-only and unknown brackets all name the bracket chain", () => {
  for (const [code, pattern] of [
    ["[ValidateSet('x','y')][ValidateLength(1,2)][string]$v = 'x'", /\[ValidateSet\('x','y'\)\]\[ValidateLength\(1,2\)\]\[string\]/],
    ["[string][int]$v = 5", /未対応の型変換：\[string\]\[int\]/],
    ["[int][string]$v = 5", /未対応の型変換：\[int\]\[string\]/],
    ["[int][int]$v = 5", /未対応の型変換：\[int\]\[int\]/],
    ["[Parameter(Mandatory)][string]$v = 'x'", /\[Parameter\(Mandatory\)\]\[string\]/],
    ["[ValidateNotNull()][string]$v = 'x'", /\[ValidateNotNull\(\)\]\[string\]/],
    ["[AllowNull()][string]$v = $null", /\[AllowNull\(\)\]\[string\]/],
    ["[Foo][Bar]$v = 1", /未対応の型変換：\[Foo\]\[Bar\]/],
    ["[int[]][string]$v = 'x'", /未対応の型変換：\[int\[\]\]\[string\]/],
    // 複合代入でも、二項演算側の変換エラーに化けずブラケットを名指す
    ["[ValidateSet('x')][string]$v += 'x'", /\[ValidateSet\('x'\)\]\[string\]/],
    ["[string][int]$v += 1", /\[string\]\[int\]/],
  ])
    expectErrPS(code, pattern, /代入してください/);
});

test("batch10-shell R31-N10 sweep: member/index targets and parenthesised assignment expressions name the brackets", () => {
  expectErrPS(
    "$h=@{k=0}\n[ValidateSet('x')][int]$h.k = 1",
    /\[ValidateSet\('x'\)\]\[int\]/,
    /代入してください/,
  );
  expectErrPS(
    "$a=@(0)\n[ValidateSet('x')][int]$a[0] = 1",
    /\[ValidateSet\('x'\)\]\[int\]/,
    /代入してください/,
  );
  // 括弧内の代入式では、従来は「) が必要です」という虚偽原因だった
  for (const code of [
    "Write-Output ([ValidateSet('x','y')][string]$v = 'x')",
    "([string][int]$v = 5)",
    "if ([ValidateSet('x')][string]$v = 'x') { 1 }",
    "for ([ValidateSet('x')][string]$v = 'x'; $false;) { }",
    "$y = [ValidateSet('x')][string]$v = 'x'",
    "$a = @([ValidateSet('x')][string]$v = 'x')",
  ])
    expectErrPS(code, /未対応の型変換：\[/, /代入してください|\) が必要です/);
});

test("batch10-shell R31-N10 maintained: single-bracket naming, RG-310 typed assignment, param stacking and validation", () => {
  // 単一ブラケット形の名指し（バッチ9 §4 の保証）は不変
  expectErrPS("[ValidateLength(1,2)]$v = 'abc'", /^未対応の型変換：\[ValidateLength\(1,2\)\]$/, /代入してください/);
  expectErrPS("[ValidateSet('x','y')]$v = 'x'", /^未対応の型変換：\[ValidateSet\('x','y'\)\]$/, /代入してください/);
  // RG-310: 型付き代入は従来どおり変換して動く
  expectOutPS('[int]$x = "42"\nWrite-Output ($x + 1)', [["43"]]);
  expectOutPS("$h=@{k=0}\n[int]$h.k = '7'\n$h.k", [["7"]]);
  expectOutPS('Write-Output ([int]$y = "42")\n$y', [["42", "42"]]);
  // param 位置の属性積み重ねは従来どおり正常動作し、検証も働く
  expectOutPS(
    "function F { param([Parameter(Mandatory)][ValidateNotNull()][string]$x) $x }\nF 'hi'",
    [["hi"]],
  );
  expectOutPS(
    "function F { param([ValidateLength(1,2)][string]$x) $x }\nF 'ab'",
    [["ab"]],
  );
  expectErrPS(
    "function F { param([ValidateLength(1,2)][string]$x) $x }\nF 'abc'",
    /検証属性 ValidateLength に一致しません/,
  );
  // 代入先が実際に変数・プロパティ・添字でない形では、従来の
  // 「代入してください」が真因のままであることも確認する
  expectErrPS("[int]5 = 3", /変数・プロパティ・添字へ代入してください/);
});

// ---------- R31-N8 (PS): 途中終了は内部トークンを出さない ----------
test("batch10-shell R31-N8 truncated PowerShell expressions name truncation in learner words, never <eof>", () => {
  for (const code of [
    "$x = ",
    "$x = 1 +",
    "$x = 1 -",
    "$x = 'a' +",
    "$x = $true -and",
    "$x = -",
    "-not",
    "Write-Output (1 +",
    "Write-Output (",
    "$x = @(",
    "$a = @(1,",
    "$h = @{a=",
    "$h = @{",
    "1 |",
    "$x = 1 |",
    "if (",
    "while (",
    "foreach ($x in",
    "$x[",
    "$x = 1..",
    "1..",
    "switch (1) {",
    "$x = 1; $y =",
  ]) {
    const r = expectErrPS(code, /式が途中で終わっています/, /<eof>/);
    assert.equal(errors(r)[0].category, "SyntaxError", code);
    // トレース・グループ等の表示表面にも内部トークンを残さない
    assert.doesNotMatch(JSON.stringify(r), /<eof>/, code);
  }
  // パラメータ値の途中終了はパラメータを名指したうえで途中終了を示す
  expectErrPS("Get-Content -Path (1 +", /Get-Content -path（.*式が途中で終わっています/, /<eof>/);
});

test("batch10-shell R31-N8 maintained: non-EOF naming is unchanged", () => {
  expectErrPS("Write-Output ($true -not $false)", /未対応または不正なPowerShellの式：-not/);
  expectErrPS("[int]", /型リテラル \[int\]/, /<eof>/);
  expectErrPS("$x = [int", /\] が必要です/, /<eof>/);
  expectErrPS("Write-Output ((1)", /\) が必要です/, /<eof>/);
  expectErrPS("$x.", /プロパティ名が必要です/, /<eof>/);
  expectErrPS("param(", /paramには\$変数が必要です/, /<eof>/);
});

// ---------- R31-N13 (cmd/PS): モデル自体の形状を名指す ----------
test("batch10-shell R31-N13 non-object models are named as model errors in both shell types", () => {
  for (const [name, run, code] of [
    ["powershell", runPS, "Write-Output 1"],
    ["cmd", runCmd, "echo hi"],
  ]) {
    for (const model of [null, undefined, 123, "x", true, false, []]) {
      const r = run(code, model);
      assert.ok(errors(r).length > 0, name + " / " + String(model));
      assert.match(errors(r)[0].message, /^モデルはオブジェクトで指定してください$/, name + " / " + String(model));
      assert.equal(errors(r)[0].category, "モデルエラー", name + " / " + String(model));
      assert.doesNotMatch(
        errors(r)[0].message,
        /処理中に予期しないエラーが発生しました|null \/ undefined/,
        name + " / " + String(model),
      );
    }
    // {} は欠けた項目を既定で補う従来の受理を維持する
    assert.deepEqual(errors(run(code, {})), [], name + " / {}");
    assert.deepEqual(errors(run(code)), [], name + " / defaults");
  }
});

test("batch10-shell R31-N13 sweep: files and variables shape errors name the model field in both shell types", () => {
  for (const [name, run, code] of [
    ["powershell", runPS, "Write-Output 1"],
    ["cmd", runCmd, "echo hi"],
  ]) {
    const withModel = (extra) => ({
      ...structuredClone(name === "cmd" ? cmd.model.defaults : ps.model.defaults),
      ...extra,
    });
    // files の型違いは既存の名指しを維持
    for (const files of [123, "x", {}])
      assert.match(
        errors(run(code, withModel({ files })))[0].message,
        /^モデルfilesは配列で指定してください$/,
        name,
      );
    // files の要素の型違いも既存の名指しを維持
    for (const files of [[123], [null], [{}], [{ path: 123, type: "file" }], [{ path: "a", type: "bogus" }], ["x"], [[]]])
      assert.match(
        errors(run(code, withModel({ files })))[0].message,
        /^モデルfilesにはpathとtype\(file\/directory\)が必要です$/,
        name + " / " + JSON.stringify(files),
      );
    assert.match(
      errors(run(code, withModel({ files: [{ path: "a.txt", type: "file", content: 123 }] })))[0].message,
      /^モデルのファイル内容は文字列または未確定値で指定してください$/,
      name,
    );
    // variables の型違い（cmd では文字列が汎用文言に落ちていた形を含む）
    for (const variables of ["x", 123, []]) {
      const r = run(code, withModel({ variables }));
      assert.match(
        errors(r)[0].message,
        /^モデルvariablesはオブジェクトで指定してください$/,
        name + " / variables=" + JSON.stringify(variables),
      );
      assert.equal(errors(r)[0].category, "モデルエラー", name);
    }
    // variables の null は基盤の既定（未指定）として従来どおり受理する
    assert.deepEqual(errors(run(code, withModel({ variables: null }))), [], name);
  }
});

// ---------- 横断スイープ (c): cmd の途中終了・不正入力で内部名が出ない ----------
test("batch10-shell sweep-cmd truncated or invalid cmd input never leaks internal names", () => {
  for (const code of [
    "if (",
    "echo (",
    "for %%i in (",
    'echo "abc',
    "echo ^",
    'set /a "N=1+"',
    'set /a "N=("',
    "echo %X",
    "echo %",
    "goto",
    "call",
    "type",
    "echo hi >",
    "for %%i in (1,2) do",
    "ver",
  ]) {
    const r = runCmd(code);
    assert.doesNotMatch(
      JSON.stringify(r),
      /<eof>|__CMD_VALUE|Cannot read properties|Cannot set properties/,
      code,
    );
    assert.doesNotMatch(
      JSON.stringify(errors(r).map((e) => e.message)),
      /処理中に予期しないエラーが発生しました/,
      code,
    );
  }
});
