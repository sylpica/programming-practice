import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { simulate } from "../js/engine.js";

const sim = (s, m = {}, l = {}) => simulate(s, m, l);
const path = (s, m) => {
  let r = sim(s, m);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const outputs = (s, m) => path(s, m).outputs.map((x) => x.text);
const errCode = (s, m) => sim(s, m).paths[0].error?.code;

// ---- F-VBA-01: 条件位置の Null は黙って False にせずエラー94 ----
test("F-VBA-01 Null in a condition raises 94 instead of silently branching", () => {
  assert.equal(
    errCode('If Null Then\nDebug.Print "T"\nElse\nDebug.Print "F"\nEnd If'),
    94,
  );
  assert.equal(
    errCode('x = Null\nIf x Then\nDebug.Print "T"\nEnd If'),
    94,
  );
  assert.equal(
    errCode('Do While Null\nDebug.Print "in"\nLoop\nDebug.Print "after"'),
    94,
  );
  // On Error Resume Next 下では Err.Number に 94 が立つ
  assert.deepEqual(
    outputs(
      'On Error Resume Next\nIf Null Then\nDebug.Print "T"\nEnd If\nDebug.Print Err.Number',
    ),
    ["94"],
  );
  // 通常の条件は従来どおり
  assert.deepEqual(outputs('If True Then\nDebug.Print "T"\nEnd If'), ["T"]);
  assert.equal(errCode('If "hello" Then\nDebug.Print "T"\nEnd If'), 13);
  // Select Case の Null 対象は実 VBA どおり Case Else（条件位置の94とは別規則）
  assert.deepEqual(
    outputs(
      'x = Null\nSelect Case x\nCase 1\nDebug.Print "one"\nCase Else\nDebug.Print "else"\nEnd Select',
    ),
    ["else"],
  );
});

// ---- F-VBA-02: 数値→文字列変換は VBA 既定（有効数字15桁） ----
test("F-VBA-02 numeric-to-string conversion uses the VBA 15-digit form everywhere", () => {
  assert.deepEqual(outputs("Debug.Print CStr(1/3)"), ["0.333333333333333"]);
  assert.deepEqual(outputs("x = CStr(1/3)\nDebug.Print Len(x)"), ["17"]);
  assert.deepEqual(outputs("Debug.Print CStr(0.1+0.2)"), ["0.3"]);
  assert.deepEqual(outputs("Debug.Print CStr(1000000000000000)"), ["1E+15"]);
  assert.deepEqual(outputs("Debug.Print CStr(0.00001)"), ["1E-05"]);
  // String 型変数への代入と & 連結も同じ変換になる（表示と食い違わない）
  assert.deepEqual(outputs("Dim s As String\ns = 1/3\nDebug.Print s"), [
    "0.333333333333333",
  ]);
  assert.deepEqual(outputs('Debug.Print (1/3) & ""'), ["0.333333333333333"]);
  assert.deepEqual(outputs('Debug.Print "n=" & (0.1+0.2)'), ["n=0.3"]);
});

// ---- F-VBA-03: 配列を文字列関数へ渡すと捏造せずエラー13 ----
test("F-VBA-03 arrays passed to string functions raise 13, not fabricated text", () => {
  assert.equal(errCode("x = Array(1,2)\nDebug.Print CStr(x)"), 13);
  assert.equal(errCode("x = Array(1,2)\nDebug.Print Left(x, 1)"), 13);
  assert.equal(errCode("x = Array(1,2,3)\nDebug.Print Len(x)"), 13);
  assert.equal(errCode('x = Array(1,2)\nDebug.Print x & "a"'), 13);
  // 配列そのものの正規の操作は従来どおり
  assert.deepEqual(outputs("x = Array(1,2)\nDebug.Print LBound(x) + UBound(x)"), ["1"]);
});

// ---- F-VBA-04／RA-3: Len は型付き変数に格納バイト数を返す ----
test("F-VBA-04 Len returns storage bytes for typed variables", () => {
  assert.deepEqual(outputs("Dim i As Integer\ni = 7\nDebug.Print Len(i)"), ["2"]);
  assert.deepEqual(outputs("Dim n As Long\nn = 12345\nDebug.Print Len(n)"), ["4"]);
  assert.deepEqual(outputs("Dim d As Double\nd = 1.5\nDebug.Print Len(d)"), ["8"]);
  assert.deepEqual(outputs("Dim b As Boolean\nb = True\nDebug.Print Len(b)"), ["2"]);
  assert.deepEqual(outputs("Dim s As Single\ns = 1.5\nDebug.Print Len(s)"), ["4"]);
  // Variant と String は文字列として文字数（従来の正挙動を維持）
  assert.deepEqual(outputs("v = 12345\nDebug.Print Len(v)"), ["5"]);
  assert.deepEqual(outputs('Dim s As String\ns = "12345"\nDebug.Print Len(s)'), ["5"]);
  assert.deepEqual(outputs('Debug.Print Len("Excel")'), ["5"]);
});

// ---- F-VBA-05: 関数固有の Null 規則を汎用遮断が上書きしない ----
test("F-VBA-05 per-function Null rules win over the generic Null shortcut", () => {
  assert.deepEqual(outputs("Debug.Print IsNumeric(Null)"), ["False"]);
  assert.deepEqual(outputs("Debug.Print IsNumeric(Empty)"), ["True"]);
  assert.equal(errCode('Debug.Print Replace(Null, "a", "b")'), 94);
  assert.equal(errCode('Debug.Print Replace("abc", Null, "b")'), 94);
  assert.equal(errCode("Debug.Print Val(Null)"), 94);
  // Null→Null が文書どおりの関数は従来どおり
  assert.deepEqual(outputs("Debug.Print Len(Null)"), ["Null"]);
  assert.deepEqual(outputs('Debug.Print Left(Null, 1)'), ["Null"]);
  assert.equal(errCode("Debug.Print CStr(Null)"), 94);
  // IsNumeric の通常判定は従来どおり
  assert.deepEqual(outputs('Debug.Print IsNumeric("12")'), ["True"]);
  assert.deepEqual(outputs('Debug.Print IsNumeric("abc")'), ["False"]);
  assert.deepEqual(outputs("Debug.Print IsNumeric(True)"), ["False"]);
});

// ---- F-VBA-06: 整数引数は銀行丸めで暗黙変換される ----
test("F-VBA-06 fractional integer arguments are bankers-rounded, not errors/truncation", () => {
  assert.deepEqual(outputs('Debug.Print Left("Excel", 2.5)'), ["Ex"]);
  assert.deepEqual(outputs('Debug.Print Left("Excel", 3.5)'), ["Exce"]);
  assert.deepEqual(outputs('Debug.Print Right("Excel", 2.5)'), ["el"]);
  assert.deepEqual(outputs('Debug.Print Mid("Excel", 2.5, 2)'), ["xc"]);
  assert.deepEqual(outputs('Debug.Print Mid("Excel", 2, 3.5)'), ["xcel"]);
  assert.deepEqual(outputs('Debug.Print Mid("Excel", 2, 1.5)'), ["xc"]);
  assert.deepEqual(outputs("x = Array(10,20,30,40)\nDebug.Print x(1.5)"), ["30"]);
  assert.deepEqual(outputs("x = Array(10,20,30,40)\nDebug.Print x(2.5)"), ["30"]);
  assert.deepEqual(
    outputs("x = Array(10,20,30,40)\nx(1.5) = 99\nDebug.Print x(2)"),
    ["99"],
  );
  assert.deepEqual(outputs("Debug.Print Round(2.567, 1.5)"), ["2.57"]);
  assert.deepEqual(outputs('Debug.Print Replace("abcabc", "b", "X", 1.5)'), [
    "XcaXc",
  ]);
  // 同根の兄弟表面：Cells の行・列、Dim の配列境界も同じ変換を受ける
  assert.deepEqual(outputs("Debug.Print Cells(1.5, 1).Value", { A2: "りんご" }), [
    "りんご",
  ]);
  assert.deepEqual(outputs("Dim a(2.5) As Long\nDebug.Print UBound(a)"), ["2"]);
  // 変換後も不正な値は従来どおりエラー5
  assert.equal(errCode('Debug.Print Left("Excel", -1)'), 5);
  assert.equal(errCode('Debug.Print Mid("Excel", 0, 1)'), 5);
});

// ---- F-VBA-07: InStr("", "") は 0 ----
test("F-VBA-07 InStr with a zero-length string1 returns 0", () => {
  assert.deepEqual(outputs('Debug.Print InStr("", "")'), ["0"]);
  assert.deepEqual(outputs('Debug.Print InStr("abc", "")'), ["1"]);
  assert.deepEqual(outputs('Debug.Print InStr("", "x")'), ["0"]);
  assert.deepEqual(outputs('Debug.Print InStr("Excel", "c")'), ["3"]);
});

// ---- F-VBA-08: InStr の start/compare 形式と InputBox の4引数以降 ----
test("F-VBA-08 InStr start/compare forms and InputBox extra arguments are valid", () => {
  // start=3 から探すため、位置2の "bc" は対象外で次の一致（位置5）が返る
  assert.deepEqual(outputs('Debug.Print InStr(3, "abcabc", "bc")'), ["5"]);
  assert.deepEqual(outputs('Debug.Print InStr(1, "ABC", "a", 1)'), ["1"]);
  assert.deepEqual(outputs('Debug.Print InStr(1, "ABC", "a", 0)'), ["0"]);
  assert.deepEqual(outputs('Debug.Print InStr(2, "abc", "")'), ["2"]);
  assert.deepEqual(outputs('Debug.Print InStr(9, "abc", "a")'), ["0"]);
  assert.match(
    sim('Debug.Print InStr(1, "ABC", "a", -1)').paths[0].error.message,
    /compare 引数 -1/,
  );
  // InputBox は最大7引数まで有効（結果は未確定のまま）
  let p4 = path('x = InputBox("p", "t", "d", 100)');
  assert.equal(p4.vars.x?.kind, "unknown");
  let p7 = path('x = InputBox("p", "t", "d", 100, 200, "help", 1)');
  assert.equal(p7.vars.x?.kind, "unknown");
  assert.equal(errCode('x = InputBox("p", "t", "d", 100, 200, "help", 1, 2)'), 450);
});

// ---- F-VBA-09: 負の底・小数指数の ^ はエラー5 ----
test("F-VBA-09 power with a negative base and fractional exponent is error 5", () => {
  assert.equal(errCode("Debug.Print (-8) ^ (1/3)"), 5);
  assert.equal(errCode("Debug.Print (-8) ^ 0.5"), 5);
  assert.deepEqual(outputs("Debug.Print (-8) ^ 2"), ["64"]);
  assert.deepEqual(outputs("Debug.Print 0 ^ 0"), ["1"]);
  assert.equal(errCode("Debug.Print 10 ^ 400"), 6);
});

// ---- F-VBA-10／RG-12（VBA側）: String 型変数と数値の + も暗黙変換する ----
test("F-VBA-10 String variables plus numbers follow the VBA implicit conversion", () => {
  assert.deepEqual(outputs('Dim s As String\ns = "5"\nDebug.Print s + 3'), ["8"]);
  assert.deepEqual(outputs('Dim s As String\ns = "5"\nDebug.Print 3 + s'), ["8"]);
  assert.deepEqual(
    outputs('Dim s As String\nDim n As Long\ns = "2"\nn = 3\nDebug.Print s + n'),
    ["5"],
  );
  assert.deepEqual(outputs('Dim s As String\ns = "2"\nv = 3\nDebug.Print s + v'), [
    "5",
  ]);
  assert.deepEqual(outputs('Debug.Print CStr(5) + 3'), ["8"]);
  // 変換できない文字列はエラー13、文字列同士は連結のまま
  assert.equal(errCode('Dim s As String\ns = "a"\nDebug.Print s + 3'), 13);
  assert.deepEqual(
    outputs('Dim s As String\nDim t As String\ns = "5"\nt = "3"\nDebug.Print s + t'),
    ["53"],
  );
  // リテラル・Variant の既存の正挙動に回帰がない
  assert.deepEqual(outputs('Debug.Print "5" + 3'), ["8"]);
  assert.deepEqual(outputs('v = "5"\nDebug.Print v + 3'), ["8"]);
});

// ---- RA-1〜RA-4: リファレンス文面の正確性 ----
test("RA-1..RA-4 reference wording matches the primary VBA documentation", async () => {
  const { getDefinition } = await import("../js/types/registry.js");
  const def = getDefinition("vba");
  const byName = (n) => def.reference.find((r) => r.name === n);
  // RA-1: Nothing は Is Nothing 判定が正規の使い方で、値式位置だけが91
  assert.match(byName("Nothing").description, /Is Nothing/);
  assert.match(byName("Nothing").caution, /値式の位置/);
  assert.match(byName("Nothing").caution, /Is Nothing/);
  assert.doesNotMatch(byName("Nothing").caution, /値としての使用はエラー91/);
  // RA-2: For Each の要素変数はコレクションで特定の型も使える
  assert.match(byName("For Each").caution, /配列の要素変数はVariantのみ/);
  assert.match(byName("For Each").caution, /Range/);
  // RA-3: Len の第2形式（格納バイト数）が説明と returns にある
  assert.match(byName("Len").description, /バイト数/);
  assert.match(byName("Len").returns, /格納に必要なバイト数/);
  // RA-4: Exit For の使用例は For で囲まれた完結形
  assert.match(byName("Exit For").example, /^For /);
  assert.match(byName("Exit For").example, /Next/);
  // F-VBA-08 の実装に合わせ、InStr の「2引数形式のみ」表記が残っていない
  assert.doesNotMatch(byName("InStr").caution, /2引数形式のみ/);
});

test("RA sync: reference-r2.json rows carry the same wording as the definitions", async () => {
  const { getDefinition } = await import("../js/types/registry.js");
  const def = getDefinition("vba");
  const rows = JSON.parse(
    fs.readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"),
  );
  for (const name of ["Nothing", "For Each", "Len", "Exit For", "InStr"]) {
    const row = rows.find((r) => r.kind === "vba" && r.name === name);
    const ref = def.reference.find((r) => r.name === name);
    assert.ok(row, name);
    for (const f of ["description", "returns", "caution", "example"])
      assert.equal(row.fields[f], ref[f], `${name}.${f}`);
  }
});
