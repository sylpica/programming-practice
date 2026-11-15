// 修正バッチ3・PowerShellパーサ班の回帰テスト。
// 対象は js/types/powershell/parser.js のみ（R24-N1／N2／N3／N30／N31 と
// §3.3 既知残存 Write-Output 1..3）。一次情報は Microsoft Learn
// （about_Comparison_Operators／about_Logical_Operators／
// about_Numeric_Literals＋言語仕様 B.1.9／about_Operator_Precedence／
// about_Switch／about_Parsing）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/powershell/index.js";
import { parsePS } from "../js/types/powershell/parser.js";
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
};

// ---------- R24-N1: SH-P3 追随フォールバックの誤発火（回帰） ----------
test("batch3-psparser R24-N1 composite left operands compare and combine", () => {
  expectOut("1..10 | Where-Object { $_ % 2 -eq 0 }", [
    ["2", "4", "6", "8", "10"],
  ]);
  expectOut(
    "$age=25\nif ($age -ge 18 -and $age -lt 65) { Write-Output \"adult\" }",
    [["adult"]],
  );
  expectOut("Write-Output (5 % 2 -eq 1)", [["True"]]);
  expectOut("Write-Output (\"a\" + \"b\" -eq \"ab\")", [["True"]]);
  expectOut("Write-Output (-5 -lt 0)", [["True"]]);
  expectOut("Write-Output (1..3 -contains 2)", [["True"]]);
  expectOut("$x = 5\nWrite-Output ($x -gt 1 -and $x -lt 10)", [["True"]]);
  expectOut("Write-Output (1 + 1 -ceq 2)", [["True"]]);
});
test("batch3-psparser R24-N1 -f keeps its honest naming (SH-P3 purpose)", () => {
  expectErr("Write-Output (\"{0}\" -f 42)", /未対応：書式演算子 -f/);
  expectErr("Write-Output (1 + 2 -f 3)", /未対応：書式演算子 -f/);
});
test("batch3-psparser R24-N1 sibling naming fallbacks stay honest", () => {
  // 表に無い単一トークン演算子は引き続き名指しする（p === undefined のみ）。
  expectErr(
    "Write-Output ($true -not $false)",
    /未対応または不正なPowerShellの式：-not/,
  );
  // :: は字句解析段階で対象を名指す（従来どおり）。
  expectErr(
    "Write-Output ([math]::Max(1,2))",
    /未対応：\.NET型の静的メンバーアクセス（::）/,
  );
});

// ---------- R24-N2: 数値リテラルの末尾検証と .5 形 ----------
test("batch3-psparser R24-N2 leading-dot real literals are accepted", () => {
  expectOut("$x = .5\nWrite-Output $x", [["0.5"]]);
  expectOut("Write-Output (.5)", [["0.5"]]);
  expectOut("Write-Output .5", [["0.5"]]);
  expectOut("$x = .5e2\nWrite-Output $x", [["50"]]);
  expectOut("Write-Output (.5e2)", [["50"]]);
  expectOut("if (.5) { Write-Output \"yes\" }", [["yes"]]);
});
test("batch3-psparser R24-N2 trailing-dot forms do not blame properties", () => {
  expectOut("$x = 1.\nWrite-Output $x", [["1"]]);
  expectOut("Write-Output (1.)", [["1"]]);
  // about_Numeric_Literals の例にある 1.e2 は Double 100。
  expectOut("Write-Output (1.e2)", [["100"]]);
});
test("batch3-psparser R24-N2 incomplete literals name the literal in every position", () => {
  for (const [code, name] of [
    ["$x = 0x", /数値リテラル：0x/],
    ["$x = 0xg", /数値リテラル：0xg/],
    ["$x = 1e", /数値リテラル：1e/],
    ["$x = 1.5e", /数値リテラル：1\.5e/],
    ["$x = 1e+", /数値リテラル：1e\+/],
    ["$x = 0b2", /2進数リテラル（0b2）/],
    ["$x = 0b", /2進数リテラル（0b）/],
    ["$x = 1KBB", /数値リテラル：1KBB/],
    ["$x = 1_000", /数値リテラル：1_000/],
    ["Write-Output (0x)", /数値リテラル：0x/],
    ["Write-Output (1e)", /数値リテラル：1e/],
    ["Write-Output (0b2)", /2進数リテラル（0b2）/],
    ["if (0x) { 1 }", /数値リテラル：0x/],
    ["$a = @(0x, 2)", /数値リテラル：0x/],
  ])
    expectErr(code, name, /\) が必要です|コマンドレット/);
});
test("batch3-psparser R24-N2 argument-mode incomplete literals are string arguments (R27-N5 re-adjudication)", () => {
  // 修正バッチ6（R27-N5）で再裁定：引数モードでは不完全な数値リテラルで
  // 始まる接着形は文法 B.1.7 の generic-token として単一の文字列引数に
  // なる（RG-183／RG-195 の確立済み規則）。式モードの名指し停止は不変。
  expectOut("Write-Output 0x", [["0x"]]);
  expectOut("Write-Output 0b2", [["0b2"]]);
  expectOut("Write-Output 1_000", [["1_000"]]);
});
test("batch3-psparser R24-N2 valid literal forms keep working", () => {
  expectOut("Write-Output 0x1F", [["31"]]);
  expectOut("Write-Output 1KB", [["1024"]]);
  expectOut("Write-Output 1.5KB", [["1536"]]);
  expectOut("Write-Output 0x10KB", [["16384"]]);
  expectOut("Write-Output 1e2", [["100"]]);
  // R23-N2 で固定した 0b の名指しは式モードで維持する。引数モードは
  // 修正バッチ6（R27-N5）の再裁定で generic-token の文字列引数になる。
  expectErr("$x = 0b101", /未対応：2進数リテラル（0b101）/);
  expectOut("Write-Output 0b101", [["0b101"]]);
  // メンバーアクセス（1.Length）は末尾ドットとして消費しない。
  const r = run("$x = 1.Length");
  assert.doesNotMatch(
    JSON.stringify(errors(r).map((e) => e.message)),
    /数値リテラル/,
  );
});

// ---------- R24-N3: カンマ配列リテラルと二項演算子の結合 ----------
test("batch3-psparser R24-N3 comma literals bind as operands", () => {
  expectOut("Write-Output (2 -in 1,2,3)", [["True"]]);
  expectOut("Write-Output ('b' -in 'a','b','c')", [["True"]]);
  expectOut("Write-Output (2 -notin 1,3)", [["True"]]);
  expectOut("Write-Output (1,2,3 -contains 5)", [["False"]]);
  expectOut("if (5 -in 1,2,3) { \"in\" } else { \"out\" }", [["out"]]);
  expectOut("if (1,2,3 -contains 5) { \"has\" } else { \"none\" }", [["none"]]);
  expectOut("Write-Output (1,2,2 -eq 2)", [["2", "2"]]);
  expectOut("Write-Output (1,2,3 -ne 2)", [["1", "3"]]);
  expectOut("Write-Output ('a','b' -match 'b')", [["b"]]);
  expectOut("Write-Output (1,2,3 -eq 2).Count", [["1"]]);
  expectOut("Write-Output (1,2 + 3)", [["1", "2", "3"]]);
  expectOut("Write-Output (1,2,3 + 4)", [["1", "2", "3", "4"]]);
  expectOut("$x = 2 -in 1,2,3\nWrite-Output $x", [["True"]]);
});
test("batch3-psparser R24-N3 scalar-times-array parses as one operation", () => {
  // パーサ側の根本原因（カンマ列の先行分割）は是正され、AST は
  // 2 * @(1,2) になる。値（配列の繰返し 1,2,1,2）は engine.js の
  // binary() が左辺スカラー×右辺配列の繰返しを持たないため engine 側の
  // 残件であり、ここでは AST 形だけを固定する（統合役へ申し送り）。
  const nodes = parsePS("Write-Output (2 * 1,2)");
  const stage = nodes[0].pipe.stages[0];
  const arg = stage.args[0];
  assert.equal(arg.k, "subexpression");
  const inner = arg.pipe.stages[0].value;
  assert.equal(inner.k, "binary");
  assert.equal(inner.op, "*");
  assert.equal(inner.b.k, "array");
  assert.deepEqual(
    inner.b.values.map((v) => v.value),
    [1, 2],
  );
});
test("batch3-psparser R24-N3 comma separators elsewhere are intact", () => {
  expectOut("function F { param($a = 1, $b = 2) $a + $b }\nF", [["3"]]);
  expectOut("function F { param($a = 1 + 2) $a }\nF", [["3"]]);
  expectOut("$a = 1,2,3\nWrite-Output $a.Count", [["3"]]);
  expectOut("switch(1,3){1{\"one\"}default{\"other\"}}", [["one", "other"]]);
  expectOut("$h = @{a = 1,2}\nWrite-Output $h.a.Count", [["2"]]);
});

// ---------- R24-N30: switch オプション ----------
test("batch3-psparser R24-N30 switch options are parsed into the AST", () => {
  assert.deepEqual(
    parsePS("switch -Wildcard ('abc') { 'a*' { 1 } }")[0].options,
    ["wildcard"],
  );
  assert.deepEqual(
    parsePS("switch -Regex -CaseSensitive ('abc') { '^a' { 1 } }")[0].options,
    ["regex", "casesensitive"],
  );
  assert.deepEqual(parsePS("switch ('abc') { 'abc' { 1 } }")[0].options, []);
});
test("batch3-psparser R24-N30 no false missing-paren cause for options", () => {
  expectErr(
    "switch -File notes.txt { 'x' { 1 } }",
    /未対応：switchの -File オプション/,
    /\( が必要です/,
  );
  expectErr(
    "switch -Wildcard -File notes.txt { 'x' { 1 } }",
    /未対応：switchの -File オプション/,
    /\( が必要です/,
  );
  expectErr(
    "switch -Foo ('abc') { 'abc' { 1 } }",
    /未対応：switchのオプション -Foo/,
    /\( が必要です/,
  );
  // -Exact は従来の -eq 照合そのものであり、そのまま動作する。
  expectOut("switch -Exact ('abc') { 'abc' { \"exact\" } }", [["exact"]]);
  expectOut("switch -Wildcard ('abc') { 'abc' { \"exact\" } }", [["exact"]]);
});

// ---------- R24-N31: 引数モードの演算子トークン ----------
test("batch3-psparser R24-N31 standalone operators are string arguments", () => {
  expectOut("Write-Output 1 + 2", [["1", "+", "2"]]);
  expectOut("Write-Output 'a' + 'b'", [["a", "+", "b"]]);
  expectOut("Write-Output 2 * 3", [["2", "*", "3"]]);
  // 同種の記号も一掃する（従来は - が単項化し % が式エラーになっていた）。
  expectOut("Write-Output 1 - 2", [["1", "-", "2"]]);
  expectOut("Write-Output 5 % 2", [["5", "%", "2"]]);
});
test("batch3-psparser R24-N31 adjacent operator forms keep expression reading", () => {
  expectOut("Write-Output -5", [["-5"]]);
  expectOut("Write-Output (5 % 2)", [["1"]]);
  expectOut("Write-Output (1 + 2)", [["3"]]);
});

// ---------- §3.3 既知残存: 引数モードの範囲 ----------
test("batch3-psparser argument-mode range expressions are accepted", () => {
  expectOut("Write-Output 1..3", [["1", "2", "3"]]);
  expectOut("Write-Output 10..8", [["10", "9", "8"]]);
  expectOut("Write-Output 1..-2", [["1", "0", "-1", "-2"]]);
  expectOut("$x = 1..3\nWrite-Output $x", [["1", "2", "3"]]);
});
