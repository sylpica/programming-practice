// 修正バッチ4・PowerShell班の回帰テスト。
// 対象: R25-N2（範囲右辺のカンマ）／R25-N3（外側 catch の変換）／
// R25-N10 の PS 分（数値リテラル直後の .＋数字）／R25-N12（引数モードの
// 接着演算子）／R25-N16（PathInfo 表示の Provider 行重複）。
// 一次情報: PowerShell 言語仕様 Appendix A 文法 B.2.3（range-expression）・
// B.1.7（generic-token）・B.1.9.2（数値リテラル）、Microsoft Learn
// about_Operator_Precedence／about_Parsing。
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

// ---------- R25-N2: 範囲演算子の右辺のカンマ（文法 B.2.3） ----------
test("batch4-ps R25-N2 range right operand takes an array literal and fails conversion", () => {
  // 1..3,4 は 1..(3,4) と parse され、複数要素配列→整数の変換で止まる。
  // 括弧明示形 1..(3,4) の従来挙動（変換エラー）と一致すること。
  for (const code of [
    "Write-Output (1..3,4)",
    "Write-Output (1..3,4).Count",
    "Write-Output (5 -in 1..5,9)",
    "Write-Output (2 -eq 1..2,3)",
    "Write-Output (1..2,3..4)",
    "$x = 1..3,4",
  ])
    expectErr(code, /数値へ変換できません/, /@\(1, 2, 3\)/);
  expectErr("Write-Output (1..3,4)", /数値へ変換できません：@\(3, 4\)/);
  expectErr("Write-Output (5 -in 1..5,9)", /数値へ変換できません：@\(5, 9\)/);
  expectErr("Write-Output (2 -eq 1..2,3)", /数値へ変換できません：@\(2, 3\)/);
  // 黙った誤値（入れ子配列・誤った真偽）が返らないこと。
  const r = run("Write-Output (1..3,4)");
  assert.deepEqual(out(r), [[]]);
});
test("batch4-ps R25-N2 ordinary ranges are unchanged", () => {
  expectOut("Write-Output (1..3)", [["1", "2", "3"]]);
  expectOut("Write-Output 1..3", [["1", "2", "3"]]);
  expectOut("Write-Output (2..(5))", [["2", "3", "4", "5"]]);
  expectOut("foreach($i in 1..3){$i}", [["1", "2", "3"]]);
  // 左辺のカンマ列は従来どおり文法どおりに変換エラー（対照）。
  expectErr("Write-Output (1,2..3)", /数値へ変換できません：@\(1, 2\)/);
  // param 既定値のカンマは区切りのまま（noComma 文脈を壊さない）。
  expectOut(
    "function f { param($a = 1..2, $b = 9) Write-Output $b }\nf",
    [["9"]],
  );
});
test("batch4-ps R25-N2 expected-error fixture stops in the simulator (native pair)", () => {
  // tests/shell-native-audit.py と対になるシミュレータ側の検証。
  // 実シェル側がエラーになることは同スクリプトが検証する。
  const fixtures = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/powershell-error-cases.json", import.meta.url),
    ),
  );
  assert.ok(fixtures.length >= 1);
  for (const [name, code, pattern] of fixtures) {
    const r = run(code);
    assert.ok(errors(r).length > 0, name + ": シミュレータも停止すべき");
    assert.match(errors(r)[0].message, new RegExp(pattern), name);
  }
});

// ---------- R25-N3: 外側 catch の変換 ----------
const HOST_TEXT =
  /Maximum call stack size exceeded|Cannot read properties|could not be cloned|MARKER/;
test("batch4-ps R25-N3 circular hashtable no longer leaks the host RangeError", () => {
  for (const code of [
    '$h=@{}; $h["self"]=$h',
    '$h=@{}; $g=@{}; $h["g"]=$g; $g["h"]=$h',
    '$h=@{}; $h["self"]=$h; Write-Output $h["a"]',
  ]) {
    const r = run(code);
    assert.ok(r.error, code + " はトップレベルで停止すべき");
    assert.doesNotMatch(r.error.message, HOST_TEXT, code);
    assert.notEqual(r.error.category, "SyntaxError", code);
    assert.match(r.error.message, /処理中に予期しないエラーが発生しました/, code);
  }
});
test("batch4-ps R25-N3 model-boundary host exceptions are converted", () => {
  const nul = d.simulate("Write-Output 1", null);
  assert.ok(nul.error);
  assert.doesNotMatch(nul.error.message, HOST_TEXT);
  assert.equal(nul.error.category, "TypeError");
  for (const extra of [
    { variables: { f: () => 1 } },
    { variables: { s: Symbol("x") } },
  ]) {
    const r = run("Write-Output 1", extra);
    assert.ok(r.error, JSON.stringify(extra));
    assert.doesNotMatch(r.error.message, HOST_TEXT);
    assert.notEqual(r.error.category, "SyntaxError");
  }
  const getterModel = { ...structuredClone(d.model.defaults) };
  Object.defineProperty(getterModel, "variables", {
    get() {
      throw new Error("MARKER-GETTER-XYZ");
    },
  });
  const g = d.simulate("Write-Output 1", getterModel);
  assert.ok(g.error);
  assert.doesNotMatch(g.error.message, HOST_TEXT);
});
test("batch4-ps R25-N3 author errors pass through unconverted", () => {
  // 外側 catch に届く著作者エラー（PracticeError）は文面・カテゴリを保つ。
  const long = run("Write-Output 1" + " ".repeat(100001));
  assert.equal(
    long.error.message,
    "PowerShellコードは100000文字以内で指定してください",
  );
  assert.equal(long.error.category, "limit");
  expectErr(
    "Write-Output (1.5.2)",
    /未対応または不正な数値リテラル：1\.5\.2/,
  );
  // パス内エラーも従来どおり。
  expectErr("Write-Output (1..(3,4))", /数値へ変換できません：@\(3, 4\)/);
  // 非循環の入れ子ハッシュテーブルは従来どおり動作する（対照）。
  expectOut('$h=@{inner=@{x=5}}\nWrite-Output $h.inner.x', [["5"]]);
});

// ---------- R25-N10 (PS): 数値リテラル直後の .＋数字 ----------
test("batch4-ps R25-N10 dotted numeric continuations name the literal in every position", () => {
  for (const [code, literal] of [
    ["Write-Output (1.5.2)", "1.5.2"],
    ["$x = 1.5.2", "1.5.2"],
    ["Write-Output (1.5e2.3)", "1.5e2.3"],
    ["Write-Output (0x1F.2)", "0x1F.2"],
    ["Write-Output (.5.2)", ".5.2"],
  ]) {
    const r = expectErr(
      code,
      new RegExp("未対応または不正な数値リテラル：" + literal.replaceAll(".", "\\.")),
      /\) が必要です/,
    );
    // 文位置で 1.5 と .2 の2文に黙って分割されないこと
    // （字句段階の停止なので出力は一切出ない）。
    assert.deepEqual(out(r).flat(), [], code);
  }
  // 引数モードの 1.5.2 は、修正バッチ6（R27-N5）の再裁定で文法 B.1.7 の
  // generic-token として単一の文字列引数になる（2文への分割ではない）。
  expectOut("Write-Output 1.5.2", [["1.5.2"]]);
});
test("batch4-ps R25-N10 legitimate dotted forms are unchanged", () => {
  expectOut("Write-Output (1.5)", [["1.5"]]);
  expectOut("Write-Output (.5)", [["0.5"]]);
  expectOut("Write-Output (1.e2)", [["100"]]);
  expectOut("Write-Output (1.)", [["1"]]);
  expectOut("Write-Output (1..3)", [["1", "2", "3"]]);
  // メンバーアクセス形の現行仕様（.NETメソッド呼び出しとして名指し停止）は不変。
  expectErr("Write-Output 5.ToString()", /未対応：\.NETメソッド呼び出し ToString/);
  expectErr(
    "$x=5\nWrite-Output $x.ToString()",
    /未対応：\.NETメソッド呼び出し ToString/,
  );
});

// ---------- R25-N12: 引数モードの接着演算子 ----------
test("batch4-ps R25-N12 glued numeric operator forms are single string arguments", () => {
  expectOut("Write-Output 1+2", [["1+2"]]);
  expectOut("Write-Output 3-2", [["3-2"]]);
  expectOut("Write-Output 2*3", [["2*3"]]);
  expectOut("Write-Output 6/2", [["6/2"]]);
  expectOut("Write-Output 10%3", [["10%3"]]);
  expectOut("Write-Output 1.5+2", [["1.5+2"]]);
  expectOut("Write-Output 0x1F+1", [["0x1F+1"]]);
  expectOut("Write-Output 1+2+3", [["1+2+3"]]);
  expectOut("Write-Output 1,2+3", [["1", "2+3"]]);
  expectOut("Write-Output 5 1+2", [["5", "1+2"]]);
});
test("batch4-ps R25-N12 expression and spaced forms are unchanged", () => {
  expectOut("Write-Output (1+2)", [["3"]]);
  expectOut("Write-Output (5 % 2)", [["1"]]);
  expectOut("$x=1+2\nWrite-Output $x", [["3"]]);
  expectOut("Write-Output 1 + 2", [["1", "+", "2"]]);
  expectOut("Write-Output 1..3", [["1", "2", "3"]]);
  expectOut("Write-Output a+b", [["a+b"]]);
  // 負数・正数形の現行挙動は変えない。
  expectOut("Write-Output -3", [["-3"]]);
  expectOut("Write-Output +3", [["3"]]);
  // 括弧内・添字内は式モードのまま。
  expectOut("Write-Output (5 -in 1,2)", [["False"]]);
  expectOut('$a=@(10,20,30)\nWrite-Output $a[1+1]', [["30"]]);
});

// ---------- R25-N16: PathInfo 表示の Provider 行重複 ----------
test("batch4-ps R25-N16 PathInfo display lists each property once", () => {
  for (const code of ["Write-Output $PWD", "Write-Output (Get-Location)"]) {
    const r = run(code);
    assert.deepEqual(errors(r), [], code);
    const text = out(r)[0][0];
    const lines = text.split("\n");
    assert.equal(
      lines.filter((l) => l === "Provider : Name : FileSystem").length,
      1,
      code + ": " + text,
    );
    assert.deepEqual(
      lines,
      [
        "Path : C:\\Practice",
        "ProviderPath : C:\\Practice",
        "Drive : Name : C",
        "Root : C:\\",
        "CurrentLocation : Practice",
        "Provider : Name : FileSystem",
      ],
      code,
    );
  }
  const drive = run("Write-Output $PWD.Drive");
  assert.deepEqual(out(drive)[0][0].split("\n"), [
    "Name : C",
    "Root : C:\\",
    "CurrentLocation : Practice",
    "Provider : Name : FileSystem",
  ]);
  // 値そのものは変更していないこと。
  expectOut("Write-Output $PWD.Provider.Name", [["FileSystem"]]);
  expectOut("Write-Output $PWD.Drive.Provider.Name", [["FileSystem"]]);
});
