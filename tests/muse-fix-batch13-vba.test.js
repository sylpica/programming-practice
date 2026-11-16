import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ13（VBA班）: Codex 一周監査ステップ5裁定で「現行でも有効（B）」
// とされた VBA 指摘12件（R7-35／96／194／256／257／258／259／260／262／
// 264／265／266）の回帰テスト。
// 一次情報は Microsoft Learn VBA リファレンス／MS-VBAL（裁定報告の引用が正本）。
const vba = getDefinition("vba");
const run = async (code) =>
  vba.simulate(code, structuredClone(vba.model.defaults));
const outs = async (code) => {
  const r = await run(code);
  assert.ok(!r.error, `${code} -> ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1, code);
  assert.ok(!r.paths[0].error, `${code} -> ${JSON.stringify(r.paths[0].error)}`);
  return r.paths[0].outputs.map((o) => o.text);
};
// 実行時エラー（パスエラー）で停止し、エラー番号が一致すること
const pathErr = async (code, errCode) => {
  const r = await run(code);
  assert.ok(!r.error, `${code} -> top ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1, code);
  assert.ok(r.paths[0].error, `${code} must stop with a path error`);
  if (errCode !== undefined) assert.equal(r.paths[0].error.code, errCode, code);
  return r.paths[0].error;
};
// 実行開始前の停止（コンパイル時相当）: トップレベルエラーで、パスも出力も無い
const topErr = async (code, pattern) => {
  const r = await run(code);
  assert.ok(r.error, `${code} must stop before execution`);
  assert.deepEqual(r.paths, [], code);
  if (pattern) assert.match(r.error.message, pattern, code);
  return r.error;
};

/* ---------------- R7-35: 個数検査は Null／未確定の伝播より先 ---------------- */
test("batch13-vba R7-35 Len(Null, 1) is arity error 450, not Null", async () => {
  await pathErr("Debug.Print Len(Null, 1)", 450);
});
test("batch13-vba R7-35 arity precedes Null for sibling functions", async () => {
  await pathErr('Debug.Print Trim(Null, "x")', 450);
  await pathErr('Debug.Print Replace(Null, "a")', 450);
  await pathErr("Debug.Print CStr(Null, 1)", 450);
  await pathErr("Debug.Print IsNull(Null, Null)", 450);
});
test("batch13-vba R7-35 arity precedes unknown propagation", async () => {
  await pathErr('Debug.Print Len(InputBox("q"), 1)', 450);
});
test("batch13-vba R7-35 correct arity still propagates Null as before", async () => {
  assert.deepEqual(await outs("Debug.Print Len(Null)"), ["Null"]);
  assert.deepEqual(await outs('Debug.Print Len("abc")'), ["3"]);
});

/* ---------------- R7-96: Val の指数部 ---------------- */
test("batch13-vba R7-96 Val reads the exponent part", async () => {
  assert.deepEqual(await outs('Debug.Print Val("1e3")'), ["1000"]);
  assert.deepEqual(await outs('Debug.Print Val("1.2e-2")'), ["0.012"]);
  assert.deepEqual(await outs('Debug.Print Val("1.23E+03")'), ["1230"]);
  assert.deepEqual(await outs('Debug.Print Val(".5e2")'), ["50"]);
  assert.deepEqual(await outs('Debug.Print Val("-2e-1")'), ["-0.2"]);
});
test("batch13-vba R7-96 Val keeps forward-match behaviour around exponents", async () => {
  assert.deepEqual(await outs('Debug.Print Val("1e")'), ["1"]);
  assert.deepEqual(await outs('Debug.Print Val("1e+")'), ["1"]);
  assert.deepEqual(await outs('Debug.Print Val("1e3x")'), ["1000"]);
  assert.deepEqual(await outs('Debug.Print Val("12abc")'), ["12"]);
  assert.deepEqual(await outs('Debug.Print Val("&H10")'), ["16"]);
});

/* ---------------- R7-194: Long 範囲外の引数はオーバーフロー6 ---------------- */
test("batch13-vba R7-194 out-of-Long lengths overflow (error 6)", async () => {
  await pathErr('Debug.Print Left("abcd", 2147483648)', 6);
  await pathErr('Debug.Print Right("abcd", 2147483648)', 6);
  await pathErr('Debug.Print Mid("abcd", 1, 2147483648)', 6);
  await pathErr('Debug.Print Mid("abcd", 2147483648, 1)', 6);
  await pathErr('Debug.Print Left("abcd", -2147483649)', 6);
});
test("batch13-vba R7-194 Long-range check sweeps sibling Long arguments", async () => {
  await pathErr("Debug.Print Cells(2147483648, 1)", 6);
  await pathErr("Dim a(3)\nDebug.Print a(2147483648)", 6);
  await pathErr('Debug.Print InStr(2147483648, "abc", "a")', 6);
  await pathErr('Debug.Print Replace("aaa", "a", "b", 2147483648)', 6);
  await pathErr("Debug.Print Round(1.5, 2147483648)", 6);
});
test("batch13-vba R7-194 in-range Long lengths and banker rounding unchanged", async () => {
  assert.deepEqual(await outs('Debug.Print Left("abcd", 2147483647)'), ["abcd"]);
  assert.deepEqual(await outs('Debug.Print Left("abcd", 1.5)'), ["ab"]);
  assert.deepEqual(await outs('Debug.Print Left("abcd", 2.5)'), ["ab"]);
  assert.deepEqual(await outs('Debug.Print Mid("abcd", 1, 1.5)'), ["ab"]);
});

/* ---------------- R7-256: Range 変数への Let 代入は既定メンバー Value ---------------- */
test("batch13-vba R7-256 typed Range variable Let writes through to Value", async () => {
  assert.deepEqual(
    await outs('Dim r As Range\nSet r = Range("A1")\nr = 7\nDebug.Print Range("A1").Value'),
    ["7"],
  );
});
test("batch13-vba R7-256 Variant holding a Range also writes through", async () => {
  assert.deepEqual(
    await outs('Dim r\nSet r = Range("A1")\nr = 7\nDebug.Print Range("A1").Value'),
    ["7"],
  );
  // 変数側から読み戻してもセルの値が見える（変数が数値に置換されていない）
  assert.deepEqual(
    await outs('Dim r\nSet r = Range("A1")\nr = 7\nDebug.Print r.Value'),
    ["7"],
  );
});
test("batch13-vba R7-256 multi-cell Range Let writes every cell; Set still replaces", async () => {
  const r = await run('Dim r As Range\nSet r = Range("A1:A2")\nr = 9\nDebug.Print Range("A1").Value\nDebug.Print Range("A2").Value');
  assert.ok(!r.error && !r.paths[0].error, JSON.stringify(r));
  assert.deepEqual(r.paths[0].outputs.map((o) => o.text), ["9", "9"]);
  assert.deepEqual(
    await outs('Dim r As Range\nSet r = Range("A1")\nSet r = Range("A2")\nDebug.Print r.Value'),
    ["りんご"],
  );
});

/* ---------------- R7-257: Option Explicit は実行前に未宣言を止める ---------------- */
test("batch13-vba R7-257 undeclared name in unreachable code stops before any output", async () => {
  const e = await topErr(
    'Option Explicit\nIf False Then\n    Debug.Print missingR7\nEnd If\nDebug.Print "AFTER"',
    /変数が定義されていません：missingr7/,
  );
  assert.equal(e.line, 3);
});
test("batch13-vba R7-257 dead assignment target and dead loop variable are also compile-time", async () => {
  await topErr(
    'Option Explicit\nIf False Then\n    ghost = 1\nEnd If\nDebug.Print "AFTER"',
    /変数が定義されていません：ghost/,
  );
  await topErr(
    'Option Explicit\nFor i = 1 To 3\n    Debug.Print i\nNext i',
    /変数が定義されていません：i/,
  );
});
test("batch13-vba R7-257 declared code and built-in constants still run under Option Explicit", async () => {
  assert.deepEqual(
    await outs("Option Explicit\nDim n As Long\nn = 5\nDebug.Print n"),
    ["5"],
  );
  assert.deepEqual(await outs("Option Explicit\nDebug.Print vbYesNo"), ["4"]);
  assert.deepEqual(
    await outs("Option Explicit\nDim i As Long\nFor i = 1 To 2\n    Debug.Print i\nNext i"),
    ["1", "2"],
  );
});

/* ---------------- R7-258: Option 文の配置・重複 ---------------- */
test("batch13-vba R7-258 Option inside a procedure is rejected", async () => {
  await topErr("Sub Main()\n    Option Base 1\n    Debug.Print 1\nEnd Sub", /Option Base はモジュールの先頭/);
  await topErr("Sub Main()\n    Option Explicit\nEnd Sub", /Option Explicit はモジュールの先頭/);
});
test("batch13-vba R7-258 Option after a declaration is rejected", async () => {
  await topErr("Dim a(3)\nOption Base 1\nDebug.Print LBound(a)", /Option Base はモジュールの先頭/);
  await topErr('Dim x\nOption Explicit\nDebug.Print "AFTER"', /Option Explicit はモジュールの先頭/);
});
test("batch13-vba R7-258 duplicate Option statements are rejected", async () => {
  await topErr("Option Base 0\nOption Base 1\nDim a(3)\nDebug.Print LBound(a)", /Option Base はモジュール内で1回だけ/);
  await topErr('Option Explicit\nOption Explicit\nDebug.Print "AFTER"', /Option Explicit はモジュール内で1回だけ/);
});
test("batch13-vba R7-258 module-head Options in either order still work", async () => {
  assert.deepEqual(await outs("Option Base 1\nDim a(3)\nDebug.Print LBound(a)"), ["1"]);
  assert.deepEqual(await outs("Option Explicit\nOption Base 1\nDim a(3)\nDebug.Print LBound(a)"), ["1"]);
  assert.deepEqual(await outs("Option Base 1\nOption Explicit\nDim a(3)\nDebug.Print LBound(a)"), ["1"]);
});

/* ---------------- R7-259: 0 / 0 はオーバーフロー6 ---------------- */
test("batch13-vba R7-259 0 / 0 raises Overflow (6), not Division by zero (11)", async () => {
  assert.deepEqual(
    await outs("On Error Resume Next\nDebug.Print 0 / 0\nDebug.Print Err.Number"),
    ["6"],
  );
  await pathErr("Debug.Print 0 / 0", 6);
});
test("batch13-vba R7-259 nonzero division by zero stays error 11", async () => {
  assert.deepEqual(
    await outs("On Error Resume Next\nDebug.Print 1 / 0\nDebug.Print Err.Number"),
    ["11"],
  );
  assert.deepEqual(
    await outs("On Error Resume Next\nDebug.Print 0 \\ 0\nDebug.Print Err.Number"),
    ["11"],
  );
  assert.deepEqual(
    await outs("On Error Resume Next\nDebug.Print 5 Mod 0\nDebug.Print Err.Number"),
    ["11"],
  );
});

/* ---------------- R7-260: スカラー変数への添字は静的エラー ---------------- */
test("batch13-vba R7-260 indexing a Long variable stops before execution (not trappable 13)", async () => {
  const e = await topErr(
    'Dim n As Long\nOn Error Resume Next\nDebug.Print n(0)\nDebug.Print "AFTER"',
    /配列が必要です：n は Long 型/,
  );
  assert.equal(e.line, 3);
});
test("batch13-vba R7-260 other scalar declared types are static too", async () => {
  await topErr("Dim s As String\nDebug.Print s(0)", /配列が必要です：s は String 型/);
  await topErr("Dim d As Double\nDebug.Print d(0)", /配列が必要です：d は Double 型/);
  await topErr("Dim b As Boolean\nDebug.Print b(0)", /配列が必要です：b は Boolean 型/);
});
test("batch13-vba R7-260 Variant content and real arrays keep runtime behaviour", async () => {
  // Variant の中身は実行時まで分からないため、従来どおり実行時エラー13
  await pathErr("Dim v\nv = 5\nDebug.Print v(0)", 13);
  assert.deepEqual(await outs("Dim a(3)\na(1) = 42\nDebug.Print a(1)"), ["42"]);
});

/* ---------------- R7-262: Round は有限値から Infinity を作らない ---------------- */
test("batch13-vba R7-262 Round of a huge finite value returns the value itself", async () => {
  assert.deepEqual(await outs("Debug.Print Round(1E+308, 2)"), ["1E+308"]);
  assert.deepEqual(await outs("Debug.Print Round(-1E+308, 2)"), ["-1E+308"]);
  assert.deepEqual(await outs("Debug.Print Round(1E+308, 15)"), ["1E+308"]);
});
test("batch13-vba R7-262 ordinary banker rounding is unchanged", async () => {
  assert.deepEqual(await outs("Debug.Print Round(2.5)"), ["2"]);
  assert.deepEqual(await outs("Debug.Print Round(3.5)"), ["4"]);
  assert.deepEqual(await outs("Debug.Print Round(123.456, 1)"), ["123.5"]);
  assert.deepEqual(await outs("Debug.Print Round(0.125, 2)"), ["0.12"]);
});

/* ---------------- R7-264: InputBox の不正な文字列引数 ---------------- */
test("batch13-vba R7-264 InputBox(Null) is error 94, not an indeterminate answer", async () => {
  await pathErr("Dim answer\nanswer = InputBox(Null)\nDebug.Print answer", 94);
});
test("batch13-vba R7-264 InputBox(Array()) is error 13; Null in later positions is 94 too", async () => {
  await pathErr("Dim answer\nanswer = InputBox(Array())\nDebug.Print answer", 13);
  await pathErr('Dim answer\nanswer = InputBox("q", Null)\nDebug.Print answer', 94);
  await pathErr('Dim answer\nanswer = InputBox("q", "t", Array(1))\nDebug.Print answer', 13);
});
test("batch13-vba R7-264 ordinary InputBox stays indeterminate", async () => {
  const got = await outs('Dim answer\nanswer = InputBox("名前は？")\nDebug.Print answer');
  assert.equal(got.length, 1);
  assert.match(got[0], /InputBox の入力による/);
  const gotNum = await outs("Dim answer\nanswer = InputBox(123)\nDebug.Print answer");
  assert.match(gotNum[0], /InputBox の入力による/);
});

/* ---------------- R7-265: 数値と Null の And／Or ---------------- */
test("batch13-vba R7-265 numeric And/Or with Null resolve determinately", async () => {
  assert.deepEqual(await outs("Debug.Print 0 And Null"), ["0"]);
  assert.deepEqual(await outs("Debug.Print Null And 0"), ["0"]);
  assert.deepEqual(await outs("Debug.Print 1 Or Null"), ["1"]);
  assert.deepEqual(await outs("Debug.Print Null Or 1"), ["1"]);
  assert.deepEqual(await outs("Debug.Print 5 And Null"), ["0"]);
  assert.deepEqual(await outs("Debug.Print 5 Or Null"), ["5"]);
});
test("batch13-vba R7-265 Boolean special cases and Xor are unchanged", async () => {
  assert.deepEqual(await outs("Debug.Print False And Null"), ["False"]);
  assert.deepEqual(await outs("Debug.Print True Or Null"), ["True"]);
  assert.deepEqual(await outs("Debug.Print True And Null"), ["Null"]);
  assert.deepEqual(await outs("Debug.Print False Or Null"), ["Null"]);
  assert.deepEqual(await outs("Debug.Print 1 Xor Null"), ["Null"]);
  assert.deepEqual(await outs("Debug.Print Null And Null"), ["Null"]);
});

/* ---------------- R7-266: ループ外の Exit For／Exit Do は静的エラー ---------------- */
test("batch13-vba R7-266 unreachable Exit For outside a loop stops before execution", async () => {
  await topErr('If False Then\n    Exit For\nEnd If\nDebug.Print "AFTER"', /Exit for が対応するループの外にあります/);
  await topErr('If False Then\n    Exit Do\nEnd If\nDebug.Print "AFTER"', /Exit do が対応するループの外にあります/);
});
test("batch13-vba R7-266 Exit Do inside only a For is still invalid", async () => {
  await topErr("For i = 1 To 3\n    Exit Do\nNext i", /Exit do が対応するループの外にあります/);
});
test("batch13-vba R7-266 Exit inside the matching loop still works", async () => {
  assert.deepEqual(
    await outs('For i = 1 To 5\n    If i = 3 Then\n        Exit For\n    End If\nNext i\nDebug.Print "done"'),
    ["done"],
  );
  assert.deepEqual(
    await outs('Do\n    Exit Do\nLoop\nDebug.Print "done"'),
    ["done"],
  );
  // 外側の For に対応する Exit For は、内側の Do の中からでも有効
  assert.deepEqual(
    await outs('For i = 1 To 3\n    Do\n        Exit For\n    Loop\nNext i\nDebug.Print "done"'),
    ["done"],
  );
});
