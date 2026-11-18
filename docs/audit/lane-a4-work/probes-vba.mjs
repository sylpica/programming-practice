// 収束ラウンド A4: VBA プローブ全46件（probes.md 第1部）の再実行。
// 期待値は probes.md ＋前回ラウンドの裁定変更（0/0=エラー6、V12/V13 はシリアル値モデル）を反映。
import { getDefinition } from "../../../js/types/registry.js";

const vba = getDefinition("vba");
const run = async (code) =>
  vba.simulate(code, structuredClone(vba.model.defaults));
const runMain = async (body) =>
  run(`Sub Main()\n${body}\nEnd Sub`);
const expr = async (e) => {
  const r = await runMain(`Debug.Print ${e}`);
  if (r.error) return { top: r.error };
  const p = r.paths?.[0];
  if (!p) return { nopath: true };
  if (p.error) return { err: p.error };
  return { out: (p.outputs ?? []).map((o) => o.text) };
};

// 各ケース: [id, 実行関数, 期待 {out:[...]} | {errCode:n} | {custom:fn}]
const cases = [];
const E = (id, e, out) => cases.push([id, () => expr(e), { out: [out] }]);
const EC = (id, e, code) => cases.push([id, () => expr(e), { errCode: code }]);
const B = (id, body, out) =>
  cases.push([id, async () => {
    const r = await runMain(body);
    if (r.error) return { top: r.error };
    const p = r.paths?.[0];
    if (!p) return { nopath: true };
    if (p.error) return { err: p.error };
    return { out: (p.outputs ?? []).map((o) => o.text) };
  }, { out }]);
const BC = (id, body, code) =>
  cases.push([id, async () => {
    const r = await runMain(body);
    if (r.error) return { top: r.error };
    const p = r.paths?.[0];
    if (!p) return { nopath: true };
    if (p.error) return { err: p.error };
    return { out: (p.outputs ?? []).map((o) => o.text) };
  }, { errCode: code }]);

// ---- V1〜V24 意味論 ----
E("V1a", "Round(2.5)", "2");
E("V1b", "Round(3.5)", "4");
E("V1c", "Round(-2.5)", "-2");
E("V2a", "CInt(0.5)", "0");
E("V2b", "CInt(1.5)", "2");
E("V2c", "CLng(2.5)", "2");
E("V2d", "CInt(-1.5)", "-2");
E("V3a", "Int(-1.5)", "-2");
E("V3b", "Fix(-1.5)", "-1");
E("V3c", "Int(1.9)", "1");
E("V3d", "Fix(1.9)", "1");
E("V4", 'Val("1.5e3")', "1500");
E("V5a", 'Val("&HFF")', "255");
E("V5b", 'Val(" 123 abc")', "123");
E("V5c", 'Val("abc")', "0");
B("V6a", 'Debug.Print "a" & Null', ["a"]);
// "a" + Null = Null: Debug.Print Null の表示を観測（期待は Null 値であること）
cases.push(["V6b", () => expr('"a" + Null'), { observe: "Null伝播" }]);
B("V7", 'Debug.Print (2 < "10")\nDebug.Print ("10" = 10)\nDebug.Print (Empty = 0)\nDebug.Print (Empty = "")', ["True", "True", "True", "True"]);
EC("V8", "CStr(Null)", 94);
EC("V9a", "1 / 0", 11);
EC("V9b", "0 / 0", 6); // 前回裁定: MS-VBAL 5.6.9.3.5 で 0/0 はエラー6
B("V10", "Debug.Print (False And Null)\nDebug.Print (True Or Null)\nDebug.Print IsNull(True And Null)\nDebug.Print IsNull(Not Null)", ["False", "True", "True", "True"]);
B("V11", "Dim v As Variant\nDebug.Print IsEmpty(v)\nDebug.Print IsNull(v)\nv = Null\nDebug.Print IsEmpty(v)\nDebug.Print IsNull(v)", ["True", "False", "False", "True"]);
B("V12", 'Debug.Print Year(DateSerial(2026, 2, 29)) & "/" & Month(DateSerial(2026, 2, 29)) & "/" & Day(DateSerial(2026, 2, 29))\nDebug.Print Year(DateSerial(2026, 13, 1)) & "/" & Month(DateSerial(2026, 13, 1)) & "/" & Day(DateSerial(2026, 13, 1))', ["2026/3/1", "2027/1/1"]);
B("V13", 'Dim d As Variant\nd = DateAdd("m", 1, DateSerial(2026, 1, 31))\nDebug.Print Year(d) & "/" & Month(d) & "/" & Day(d)\nDebug.Print DateDiff("d", DateSerial(2026, 1, 1), DateSerial(2026, 1, 10))', ["2026/2/28", "9"]);
// 日付リテラル形（既裁定のモデル限界の現況観測）
cases.push(["V13-lit", () => expr('DateDiff("d", #2026-01-01#, #2026-01-10#)'), { observe: "日付リテラル" }]);
E("V14a", 'Format(1234.567, "#,##0.00")', "1,234.57");
E("V14b", 'Format(0.25, "0%")', "25%");
B("V15a", "Dim a As Variant\na = Array(10, 20, 30)\nDebug.Print LBound(a)\nDebug.Print UBound(a)", ["0", "2"]);
cases.push(["V15b", async () => {
  const r = await run("Option Base 1\nSub Main()\nDim a As Variant\na = Array(10, 20, 30)\nDebug.Print LBound(a)\nDebug.Print UBound(a)\nEnd Sub");
  if (r.error) return { top: r.error };
  const p = r.paths?.[0];
  if (p?.error) return { err: p.error };
  return { out: (p?.outputs ?? []).map((o) => o.text) };
}, { out: ["1", "3"] }]);
E("V16a", 'String(3, "abc")', "aaa");
E("V16b", "String(2, 65)", "AA");
E("V16c", "Len(Space(2))", "2");
E("V17a", 'InStr("abcabc", "bc")', "2");
E("V17b", 'InStrRev("abcabc", "bc")', "5");
E("V17c", 'InStr(1, "ABC", "a", vbTextCompare)', "1");
E("V18a", 'Replace("a-b-a", "a", "x")', "x-b-x");
E("V18b", 'Replace("a-b-a", "a", "x", -1, 1)', "x-b-a");
B("V19", 'Dim s As Variant\ns = Split("a,b,,c", ",")\nDebug.Print UBound(s) - LBound(s) + 1\nDebug.Print Join(Array("a", "b"), "-")', ["4", "a-b"]);
E("V20a", 'Asc("A")', "65");
E("V20b", "Chr(65)", "A");
E("V20c", 'AscW("あ")', "12354");
E("V20d", "ChrW(12354)", "あ");
E("V21a", "Hex(255)", "FF");
E("V21b", "Oct(64)", "100");
E("V21c", "Hex(CLng(-1))", "FFFFFFFF");
E("V22a", "Sqr(2)", "1.4142135623731");
E("V22b", "Sgn(0)", "0");
E("V22c", "Sgn(-0.5)", "-1");
E("V23a", "VarType(123)", "2");
E("V23b", "VarType(123456)", "3");
E("V23c", 'VarType("x")', "8");
E("V23d", "VarType(Array(1))", "8204");
E("V24a", 'Choose(2, "a", "b", "c")', "b");
cases.push(["V24b", () => expr('IsNull(Choose(5, "a", "b"))'), { out: ["True"] }]);

// ---- VC1〜VC9 定数（代表形。280件全数は別バッチで照合） ----
B("VC1", "Debug.Print vbOK\nDebug.Print vbCancel\nDebug.Print vbAbort\nDebug.Print vbRetry\nDebug.Print vbIgnore\nDebug.Print vbYes\nDebug.Print vbNo", ["1", "2", "3", "4", "5", "6", "7"]);
B("VC2", "Debug.Print vbOKOnly\nDebug.Print vbOKCancel\nDebug.Print vbAbortRetryIgnore\nDebug.Print vbYesNoCancel\nDebug.Print vbYesNo\nDebug.Print vbRetryCancel\nDebug.Print vbCritical\nDebug.Print vbQuestion\nDebug.Print vbExclamation\nDebug.Print vbInformation", ["0", "1", "2", "3", "4", "5", "16", "32", "48", "64"]);
B("VC3", "Debug.Print vbEmpty\nDebug.Print vbNull\nDebug.Print vbInteger\nDebug.Print vbLong\nDebug.Print vbSingle\nDebug.Print vbDouble\nDebug.Print vbCurrency\nDebug.Print vbDate\nDebug.Print vbString\nDebug.Print vbObject\nDebug.Print vbError\nDebug.Print vbBoolean\nDebug.Print vbVariant\nDebug.Print vbDecimal\nDebug.Print vbByte\nDebug.Print vbLongLong\nDebug.Print vbArray", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "17", "20", "8192"]);
B("VC4", "Debug.Print Len(vbCrLf)\nDebug.Print Asc(vbCr)\nDebug.Print Asc(vbLf)\nDebug.Print Asc(vbTab)\nDebug.Print Asc(vbBack)\nDebug.Print Asc(vbFormFeed)\nDebug.Print Asc(vbVerticalTab)\nDebug.Print Len(vbNullChar)\nDebug.Print Asc(vbNullChar)", ["2", "13", "10", "9", "8", "12", "11", "1", "0"]);
B("VC5", 'Debug.Print vbSunday\nDebug.Print vbMonday\nDebug.Print vbSaturday\nDebug.Print vbFirstJan1\nDebug.Print vbFirstFourDays\nDebug.Print vbFirstFullWeek\nDebug.Print Weekday(DateSerial(2026, 11, 15))', ["1", "2", "7", "1", "2", "3", "1"]);
B("VC6", "Debug.Print vbUpperCase\nDebug.Print vbLowerCase\nDebug.Print vbProperCase\nDebug.Print vbWide\nDebug.Print vbNarrow\nDebug.Print vbKatakana\nDebug.Print vbHiragana\nDebug.Print vbUnicode\nDebug.Print vbFromUnicode", ["1", "2", "3", "4", "8", "16", "32", "64", "128"]);
B("VC7", 'Debug.Print StrConv("アイウ", vbHiragana)\nDebug.Print StrConv("ｱｲｳ", vbWide)\nDebug.Print StrConv("アイウ", vbNarrow)\nDebug.Print StrConv("abc", vbUpperCase)', ["あいう", "アイウ", "ｱｲｳ", "ABC"]);
E("VC8", "vbObjectError", "-2147221504");
B("VC9", "Debug.Print vbBinaryCompare\nDebug.Print vbTextCompare\nDebug.Print vbDatabaseCompare\nDebug.Print vbBlack\nDebug.Print vbRed\nDebug.Print vbGreen\nDebug.Print vbBlue\nDebug.Print vbWhite", ["0", "1", "2", "0", "255", "65280", "16711680", "16777215"]);

// ---- VB1〜VB13 境界・敵対的 ----
EC("VB1a", 'Mid("abc", 0, 2)', 5);
EC("VB1b", 'Left("abc", -1)', 5);
EC("VB2a", "CInt(40000)", 6);
EC("VB2b", "CByte(256)", 6);
BC("VB3a", "Dim n As Long\nn = 2147483647\nn = n + 1", 6);
BC("VB3b", "Dim i As Integer\ni = 32767\ni = i + 1", 6);
EC("VB4a", 'CInt("12a")', 13);
EC("VB4b", 'CDate("2026/2/29")', 13);
EC("VB5a", "Sqr(-1)", 5);
EC("VB5b", "Log(0)", 5);
EC("VB6", "IIf(True, 1, 1 / 0)", 11);
E("VB7", 'Val("１２３")', "0");
B("VB8", 'Debug.Print Len("𐮷")\nDebug.Print LenB("あ")\nDebug.Print LenB("𐮷")', ["2", "2", "4"]);
// VB9/VB10 は未確認保持の確認（別途、開示文面を点検）
cases.push(["VB11", async () => {
  const r = await run("Option Explicit\nSub Main()\nDebug.Print nosuchvar\nEnd Sub");
  return { raw: r };
}, { observe: "Option Explicit 解析時帰属" }]);
cases.push(["VB12", async () => {
  const r = await runMain("Exit For");
  return { raw: r };
}, { observe: "Exit For 構造違反" }]);
cases.push(["VB13", () => expr('Len(String(1000000, "a"))'), { observe: "String(1M) Len" }]);

let pass = 0, fail = 0;
for (const [id, fn, exp] of cases) {
  let res;
  try { res = await fn(); } catch (e) { res = { thrown: String(e) }; }
  if (exp.observe) {
    console.log(`OBSERVE ${id} [${exp.observe}]: ${JSON.stringify(res).slice(0, 400)}`);
    continue;
  }
  let ok = false, actual = "";
  if (exp.errCode != null) {
    const code = res.err?.code ?? res.top?.code ?? null;
    ok = code === exp.errCode;
    actual = `errCode=${code} res=${JSON.stringify(res).slice(0, 200)}`;
  } else {
    ok = JSON.stringify(res.out) === JSON.stringify(exp.out);
    actual = `out=${JSON.stringify(res.out)} top=${JSON.stringify(res.top ?? null)} err=${JSON.stringify(res.err ?? null)}`;
  }
  if (ok) { pass++; console.log(`PASS ${id}`); }
  else { fail++; console.log(`FAIL ${id}: expected ${JSON.stringify(exp)} | ${actual}`); }
}
console.log(`== VBA probes: pass=${pass} fail=${fail} ==`);
