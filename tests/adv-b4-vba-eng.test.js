import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 高度モード B4（VBA エンジン班）: functions-advanced.js / constants-advanced.js
// の検証。期待値は一次情報（Microsoft Learn VBA リファレンス各関数ページ、
// QBColor のみ MS-VBAL の戻り値表）から導いた。日付はシリアル値モデル
// （1899-12-30 起点）。詳細は docs/audit/ADV-B4-vba-eng.md。
const vba = getDefinition("vba");
const run = async (code) =>
  vba.simulate(`Sub Main()\n${code}\nEnd Sub`, structuredClone(vba.model.defaults));
const outs = async (code) => {
  const r = await run(code);
  assert.ok(!r.error, `${code} -> ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1, code);
  assert.ok(!r.paths[0].error, `${code} -> ${JSON.stringify(r.paths[0].error)}`);
  return r.paths[0].outputs.map((o) => o.text);
};
const out1 = async (expr) => (await outs(`Debug.Print ${expr}`))[0];
const approx = async (expr, expected, tol = 1e-9) => {
  const got = Number(await out1(expr));
  assert.ok(
    Math.abs(got - expected) <= tol * Math.max(1, Math.abs(expected)),
    `${expr} -> ${got}, expected ${expected}`,
  );
};
const pathErr = async (code, errCode) => {
  const r = await run(code);
  assert.ok(!r.error, `${code} -> top ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1, code);
  assert.ok(r.paths[0].error, `${code} must stop with a path error`);
  if (errCode !== undefined) assert.equal(r.paths[0].error.code, errCode, code);
  return r.paths[0].error;
};

/* ---------------- 文字列関数 ---------------- */
test("adv-b4-vba string basics from Learn", async () => {
  assert.equal(await out1('Asc("A")'), "65");
  assert.equal(await out1('Asc("ABC")'), "65"); // 最初の文字のみ
  assert.equal(await out1("Chr(65)"), "A");
  assert.equal(await out1("Len(Chr(0))"), "1");
  assert.equal(await out1("Hex(255)"), "FF");
  assert.equal(await out1("Hex(0)"), "0");
  assert.equal(await out1("Oct(8)"), "10");
  assert.equal(await out1("Str(123)"), " 123"); // 正数には先行スペース
  assert.equal(await out1("Str(-123)"), "-123");
  assert.equal(await out1("Str(0)"), " 0");
  assert.equal(await out1('LTrim("  x  ")'), "x  ");
  assert.equal(await out1('RTrim("  x  ")'), "  x");
  assert.equal(await out1('StrReverse("abc")'), "cba");
  assert.equal(await out1('Space(3) & "x"'), "   x");
});
test("adv-b4-vba Hex/Oct negative two's complement widths", async () => {
  assert.equal(await out1("Hex(-1)"), "FFFF"); // Integer 範囲は16ビット
  assert.equal(await out1("Hex(-32768)"), "8000");
  assert.equal(await out1("Hex(-32769)"), "FFFF7FFF"); // Long 範囲は32ビット
  assert.equal(await out1("Oct(-1)"), "177777");
});
test("adv-b4-vba string errors and Null propagation", async () => {
  await pathErr('Debug.Print Asc("")', 5);
  await pathErr("Debug.Print Chr(256)", 5);
  await pathErr("Debug.Print Chr(-1)", 5);
  assert.equal(await out1("Str(Null)"), "Null"); // Str は Null を返す
  assert.equal(await out1('LTrim(Null)'), "Null");
  await pathErr("Debug.Print Space(-1)", 5);
});
test("adv-b4-vba InStrRev / StrComp", async () => {
  assert.equal(await out1('InStrRev("abcabc", "bc")'), "5");
  assert.equal(await out1('InStrRev("abcabc", "bc", 4)'), "2");
  assert.equal(await out1('InStrRev("abc", "")'), "3"); // 空の検索文字列は start
  assert.equal(await out1('InStrRev("", "a")'), "0");
  assert.equal(await out1('StrComp("a", "b")'), "-1");
  assert.equal(await out1('StrComp("A", "a", 0)'), "-1"); // バイナリ比較
  assert.equal(await out1('StrComp("A", "a", 1)'), "0"); // テキスト比較
  assert.equal(await out1('StrComp(Null, "a")'), "Null");
  await pathErr('Debug.Print StrComp("a", "b", -1)'); // Option Compare 依存は名指し停止
});
test("adv-b4-vba Split / Join / Filter", async () => {
  assert.deepEqual(
    await outs('Dim a\na = Split("a,b,,c", ",")\nDebug.Print UBound(a)\nDebug.Print a(2) & "|" & a(3)'),
    ["3", "|c"],
  );
  assert.deepEqual(
    await outs('Dim a\na = Split("a,b,c", ",", 2)\nDebug.Print a(1)'),
    ["b,c"], // limit で残りは最後の要素に残る
  );
  assert.deepEqual(
    await outs('Dim a\na = Split("")\nDebug.Print UBound(a)'),
    ["-1"], // Split("") は要素なし配列
  );
  assert.equal(await out1('Join(Array("a", "b"), "-")'), "a-b");
  assert.equal(await out1("Join(Array(1, 2))"), "1 2");
  assert.deepEqual(
    await outs('Dim f\nf = Filter(Array("apple", "banana", "apricot"), "ap")\nDebug.Print UBound(f)\nDebug.Print f(1)'),
    ["1", "apricot"],
  );
  assert.deepEqual(
    await outs('Dim f\nf = Filter(Array("apple", "banana"), "ap", False)\nDebug.Print f(0)'),
    ["banana"],
  );
  await pathErr('Debug.Print Join("notarray")', 13);
});
test("adv-b4-vba Partition follows the Learn table", async () => {
  // Learn の表（start=0, stop=99, interval=5）：幅は stop の桁数+1
  assert.equal(await out1("Partition(2, 0, 99, 5)"), "  0:  4");
  assert.equal(await out1("Partition(97, 0, 99, 5)"), " 95: 99");
  assert.equal(await out1("Partition(-1, 0, 99, 5)"), "   : -1");
  assert.equal(await out1("Partition(100, 0, 99, 5)"), "100:   ");
  // interval=1 は number:number
  assert.equal(await out1("Partition(100, 0, 1000, 1)"), " 100: 100");
  assert.equal(await out1("Partition(Null, 0, 99, 5)"), "Null");
  await pathErr("Debug.Print Partition(1, 0, 0, 5)", 5);
});

/* ---------------- 数学関数 ---------------- */
test("adv-b4-vba math functions", async () => {
  await approx("Sin(0)", 0);
  await approx("Cos(0)", 1);
  await approx("Tan(0)", 0);
  await approx("Atn(1)", Math.PI / 4, 1e-12);
  await approx("Exp(1)", Math.E, 1e-12);
  await approx("Log(10)", Math.log(10), 1e-12);
  await approx("Sqr(2)", Math.SQRT2, 1e-12);
  assert.equal(await out1("Sgn(-5)"), "-1");
  assert.equal(await out1("Sgn(0)"), "0");
  assert.equal(await out1("Sgn(3.5)"), "1");
  assert.equal(await out1("Sin(Null)"), "Null");
  await pathErr("Debug.Print Sqr(-1)", 5);
  await pathErr("Debug.Print Log(0)", 5);
  await pathErr("Debug.Print Exp(1000)", 6);
  await pathErr("Debug.Print Sin(1, 2)", 450);
});

/* ---------------- 型変換 ---------------- */
test("adv-b4-vba conversion functions", async () => {
  assert.equal(await out1("CBool(0)"), "False");
  assert.equal(await out1('CBool("True")'), "True");
  assert.equal(await out1("CByte(127.5)"), "128"); // 銀行丸め
  assert.equal(await out1("CByte(126.5)"), "126");
  await pathErr("Debug.Print CByte(300)", 6);
  await pathErr("Debug.Print CByte(-1)", 6);
  await approx("CCur(1.123456)", 1.1235, 1e-12); // 4桁へ丸め
  await approx("CDec(1.5)", 1.5);
  await approx("CSng(1.5)", 1.5);
  assert.equal(await out1("CLngLng(2147483648)"), "2147483648"); // Long の範囲外も可
  assert.equal(await out1("CLngPtr(2.5)"), "2");
  assert.equal(await out1("CVar(Null)"), "Null"); // CVar は Null を保持
  await pathErr("Debug.Print CBool(Null)", 94);
  await pathErr("Debug.Print CByte(Null)", 94);
  await pathErr('Debug.Print CBool("abc")', 13);
});

/* ---------------- 制御・判定 ---------------- */
test("adv-b4-vba IIf evaluates both branches like real VBA", async () => {
  assert.equal(await out1("IIf(True, 1, 2)"), "1");
  assert.equal(await out1("IIf(False, 1, 2)"), "2");
  // 実 VBA の IIf は選ばれなかった分岐も評価する（Sqr(-1) のエラーが出る）
  await pathErr("Debug.Print IIf(True, 1, Sqr(-1))", 5);
  await pathErr("Debug.Print IIf(Null, 1, 2)", 94);
});
test("adv-b4-vba Choose / Switch", async () => {
  assert.equal(await out1('Choose(2, "a", "b", "c")'), "b");
  assert.equal(await out1('Choose(0, "a", "b")'), "Null"); // 範囲外は Null
  assert.equal(await out1('Choose(3, "a", "b")'), "Null");
  assert.equal(await out1("Choose(Null, 1, 2)"), "Null");
  assert.equal(await out1("Switch(False, 1, True, 2)"), "2");
  assert.equal(await out1("Switch(False, 1)"), "Null"); // 一致なしは Null
  await pathErr("Debug.Print Switch(True)", 5); // 奇数個は引数不正
});
test("adv-b4-vba Is functions, TypeName, VarType, Error, CVErr", async () => {
  assert.equal(await out1("IsArray(Array(1))"), "True");
  assert.equal(await out1("IsArray(1)"), "False");
  assert.equal(await out1('IsDate("2023/1/1")'), "True");
  assert.equal(await out1('IsDate("February 12, 1969")'), "True");
  assert.equal(await out1('IsDate("2023/13/1")'), "False");
  assert.equal(await out1("IsDate(45000)"), "False"); // 数値式は日付とみなさない
  assert.equal(await out1("IsError(CVErr(2042))"), "True");
  assert.equal(await out1("IsError(2042)"), "False");
  assert.equal(await out1("IsObject(1)"), "False");
  assert.equal(await out1("IsMissing(1)"), "False");
  assert.equal(await out1("VarType(Null)"), "1");
  assert.equal(await out1("VarType(Empty)"), "0");
  assert.equal(await out1("VarType(True)"), "11");
  assert.equal(await out1('VarType("x")'), "8");
  assert.equal(await out1("VarType(1)"), "5"); // モデルでは数値は Double
  assert.equal(await out1("VarType(Array(1, 2))"), "8204"); // vbArray + vbVariant
  assert.equal(await out1("VarType(CVErr(2042))"), "10");
  assert.equal(await out1('TypeName("x")'), "String");
  assert.equal(await out1("TypeName(Array(1))"), "Variant()");
  assert.equal(await out1("TypeName(Null)"), "Null");
  assert.equal(await out1("Error(11)"), "Division by zero");
  assert.equal(await out1("Error(5)"), "Invalid procedure call or argument");
  assert.equal(await out1("Error(9999)"), "Application-defined or object-defined error");
});

/* ---------------- 日付・時刻 ---------------- */
test("adv-b4-vba DateSerial / DateValue / TimeSerial / TimeValue", async () => {
  assert.equal(await out1("DateSerial(2023, 1, 1)"), "44927");
  assert.equal(await out1("DateSerial(2024, 2, 29)"), "45351"); // うるう年
  assert.equal(await out1("DateSerial(2023, 13, 1)"), "45292"); // 月の繰り越し=2024/1/1
  assert.equal(await out1("DateSerial(2023, 3, 0)"), "44985"); // 日0=前月末(2/28)
  assert.equal(await out1("Year(DateSerial(99, 1, 1))"), "1999"); // 2桁年は1930-1999側
  assert.equal(await out1("Year(DateSerial(29, 1, 1))"), "2029"); // 0-29は2000年代
  assert.equal(await out1('DateValue("2023/1/1")'), "44927");
  assert.equal(await out1('DateValue("February 12, 1969")'), "25246");
  await approx('TimeValue("12:00 PM")', 0.5, 1e-12);
  await approx('TimeValue("1:02:03")', (3600 + 120 + 3) / 86400, 1e-12);
  await approx("TimeSerial(12, 0, 0)", 0.5, 1e-12);
  assert.equal(await out1("Hour(TimeSerial(25, 0, 0))"), "1"); // 繰り上がり
  assert.equal(await out1("Minute(TimeSerial(0, 90, 0))"), "30");
  await pathErr('Debug.Print DateValue("not a date")', 13);
});
test("adv-b4-vba date part getters and Weekday", async () => {
  // 45000 = 2023-03-15（水曜）
  assert.equal(await out1("Year(45000)"), "2023");
  assert.equal(await out1("Month(45000)"), "3");
  assert.equal(await out1("Day(45000)"), "15");
  assert.equal(await out1("Weekday(45000)"), "4"); // 日曜=1 で水曜=4
  assert.equal(await out1("Weekday(45000, vbMonday)"), "3"); // 月曜=1 では 3
  // Learn の Weekday 使用例：1969-02-12 は水曜で 4
  assert.equal(await out1('Weekday(CDate("February 12, 1969"))'), "4");
  assert.equal(await out1("Hour(0.5)"), "12");
  assert.equal(await out1("Minute(0.5)"), "0");
  assert.equal(await out1("Second(0.5)"), "0");
  assert.equal(await out1("Day(Null)"), "Null");
  assert.equal(await out1('WeekdayName(4)'), "Wednesday");
  assert.equal(await out1('WeekdayName(1, True)'), "Sun");
  assert.equal(await out1('WeekdayName(1, False, vbMonday)'), "Monday");
  assert.equal(await out1("MonthName(2)"), "February");
  assert.equal(await out1("MonthName(2, True)"), "Feb");
  await pathErr("Debug.Print MonthName(13)", 9);
  await pathErr("Debug.Print Weekday(45000, 0)"); // vbUseSystem は名指し停止
});
test("adv-b4-vba CDate accepted formats", async () => {
  assert.equal(await out1('CDate("2023/03/15")'), "45000");
  assert.equal(await out1('Year(CDate("3/15/2023"))'), "2023"); // en-US 順
  assert.equal(await out1('Month(CDate("2023年3月15日"))'), "3");
  await approx('CDate("12:00 PM")', 0.5, 1e-12);
  assert.equal(await out1("CDate(45000)"), "45000");
  await pathErr('Debug.Print CDate("45000")', 13); // 数値文字列は日付でない
  await pathErr("Debug.Print CDate(Null)", 94);
});
test("adv-b4-vba DateAdd", async () => {
  assert.equal(await out1('DateAdd("d", 1, 45000)'), "45001");
  assert.equal(await out1('Month(DateAdd("m", 1, DateSerial(2023, 1, 31)))'), "2");
  assert.equal(await out1('Day(DateAdd("m", 1, DateSerial(2023, 1, 31)))'), "28"); // 月末切り詰め
  assert.equal(await out1('Day(DateAdd("m", 1, DateSerial(2024, 1, 31)))'), "29"); // うるう年
  assert.equal(await out1('Year(DateAdd("yyyy", -1, DateSerial(2024, 2, 29)))'), "2023");
  assert.equal(await out1('Day(DateAdd("yyyy", -1, DateSerial(2024, 2, 29)))'), "28");
  assert.equal(await out1('DateAdd("ww", 1, 44927)'), "44934");
  assert.equal(await out1('Hour(DateAdd("h", 3, 0))'), "3");
  assert.equal(await out1('DateAdd("d", 1, Null)'), "Null");
  await pathErr('Debug.Print DateAdd("x", 1, 45000)', 5);
});
test("adv-b4-vba DateDiff boundary counting (Learn)", async () => {
  // Learn：12/31 と翌 1/1 の yyyy 差は 1
  assert.equal(await out1('DateDiff("yyyy", DateSerial(2022, 12, 31), DateSerial(2023, 1, 1))'), "1");
  assert.equal(await out1('DateDiff("m", DateSerial(2023, 1, 31), DateSerial(2023, 2, 1))'), "1");
  assert.equal(await out1('DateDiff("q", DateSerial(2023, 2, 1), DateSerial(2023, 5, 1))'), "1");
  assert.equal(await out1('DateDiff("d", 45000, 45010)'), "10");
  assert.equal(await out1('DateDiff("d", 45010, 45000)'), "-10");
  // w：date1 の曜日を date2 まで数える（date2 を含み date1 を含まない）
  assert.equal(await out1('DateDiff("w", DateSerial(2023, 1, 2), DateSerial(2023, 1, 9))'), "1"); // 月→月
  assert.equal(await out1('DateDiff("w", DateSerial(2023, 1, 2), DateSerial(2023, 1, 8))'), "0"); // 月→日
  // ww：週の開始日（日曜）を数える
  assert.equal(await out1('DateDiff("ww", DateSerial(2023, 1, 1), DateSerial(2023, 1, 8))'), "1");
  assert.equal(await out1('DateDiff("ww", DateSerial(2023, 1, 8), DateSerial(2023, 1, 1))'), "-1");
  // h は境界の数（1:30→2:20 は 1）
  assert.equal(await out1('DateDiff("h", "2023/1/1 1:30:00", "2023/1/1 2:20:00")'), "1");
  assert.equal(await out1('DateDiff("s", "2023/1/1 0:00:00", "2023/1/1 0:01:30")'), "90");
});
test("adv-b4-vba DatePart incl. week rules", async () => {
  assert.equal(await out1('DatePart("q", DateSerial(2023, 5, 15))'), "2");
  assert.equal(await out1('DatePart("y", DateSerial(2024, 12, 31))'), "366"); // うるう年
  assert.equal(await out1('DatePart("y", DateSerial(2023, 12, 31))'), "365");
  assert.equal(await out1('DatePart("w", 45000)'), "4");
  assert.equal(await out1('DatePart("ww", DateSerial(2023, 1, 1))'), "1");
  assert.equal(await out1('DatePart("ww", DateSerial(2023, 12, 31))'), "53");
  // ISO 週相当（月曜始まり＋4日ルール）：2023-01-01 は 2022 年の第52週
  assert.equal(await out1('DatePart("ww", DateSerial(2023, 1, 1), vbMonday, vbFirstFourDays)'), "52");
  assert.equal(await out1('DatePart("h", 0.5)'), "12");
});
test("adv-b4-vba FormatDateTime", async () => {
  assert.equal(await out1("FormatDateTime(45000)"), "3/15/2023");
  assert.equal(await out1("FormatDateTime(45000, vbLongDate)"), "Wednesday, March 15, 2023");
  assert.equal(await out1("FormatDateTime(45000, vbShortDate)"), "3/15/2023");
  assert.equal(await out1("FormatDateTime(0.5, vbLongTime)"), "12:00:00 PM");
  assert.equal(await out1("FormatDateTime(0.75, vbShortTime)"), "18:00");
  await pathErr("Debug.Print FormatDateTime(45000, 9)", 5);
});

/* ---------------- 財務 ---------------- */
test("adv-b4-vba financial FV/PV/Pmt/NPer/Rate roundtrips and known values", async () => {
  await approx("FV(0.1, 1, -100)", 100, 1e-12);
  await approx("PV(0.1, 1, -100)", 90.9090909090909, 1e-12);
  await approx("Pmt(0.1, 2, 1000)", -576.190476190476, 1e-12);
  await approx("Pmt(0.07, 3, 1000)", -381.05166568166965, 1e-12);
  await approx("Rate(3, -381.05166568166965, 1000)", 0.07, 1e-9);
  await approx("NPer(0.1, -100, 500)", 7.27254089734171, 1e-12);
  await approx("Pmt(0, 4, 1000)", -250, 1e-12); // rate=0 の退化形
  await approx("FV(0, 4, -250, 100)", 900, 1e-12); // 符号規約：FV=-(PV+Pmt*n)
  await approx("FV(0, 4, -250, -100)", 1100, 1e-12); // 貯蓄型（PV も負）では 1100
  // Learn の PV 使用例：PV(0.0825, 20, -50000, 1000000, 1) ≒ 316,811.96
  await approx("PV(0.0825, 20, -50000, 1000000, 1)", 316811.9577883197, 1e-9);
  await pathErr("Debug.Print Rate(2, 100, 500)"); // 符号条件を満たさず収束しない→エラー5
});
test("adv-b4-vba IPmt/PPmt incl. annuity due", async () => {
  await approx("IPmt(0.1, 1, 2, 1000)", -100, 1e-12);
  await approx("PPmt(0.1, 1, 2, 1000)", -476.190476190476, 1e-12);
  await approx("IPmt(0.1, 1, 3, 1000, 0, 1)", 0, 1e-12); // 期首払いの第1期は利息0
  await approx("IPmt(0.1, 2, 3, 1000, 0, 1)", -63.44410876132934, 1e-9);
  await approx("IPmt(0.1, 3, 3, 1000, 0, 1)", -33.23262839879162, 1e-9);
  await pathErr("Debug.Print IPmt(0.1, 4, 3, 1000)", 5); // per > nper
});
test("adv-b4-vba NPV/IRR/MIRR", async () => {
  await approx("NPV(0.1, Array(100, 100))", 173.55371900826447, 1e-12);
  await approx("IRR(Array(-100, 110))", 0.1, 1e-9);
  // Learn の IRR 使用例（-70000, 22000, 25000, 28000, 31000）≒ 17.74%
  await approx("IRR(Array(-70000, 22000, 25000, 28000, 31000))", 0.17743588442252733, 1e-6);
  await approx("MIRR(Array(-1000, 300, 400, 500), 0.1, 0.1)", 0.0922317710801408, 1e-9);
  await pathErr("Debug.Print IRR(Array(100, 110))", 5); // 正負が揃わない
  await pathErr("Debug.Print IRR(Array(-100, -110))", 5);
});
test("adv-b4-vba SLN/SYD/DDB", async () => {
  await approx("SLN(1000, 100, 5)", 180, 1e-12);
  await approx("SYD(1000, 100, 5, 1)", 300, 1e-12);
  await approx("SYD(1000, 100, 5, 5)", 60, 1e-12);
  await approx("DDB(1000, 100, 10, 1)", 200, 1e-12);
  await approx("DDB(1000, 100, 10, 2)", 160, 1e-12); // 簿価逓減
  await pathErr("Debug.Print SYD(1000, 100, 5, 6)", 5);
  await pathErr("Debug.Print DDB(1000, 100, 10, 11)", 5);
});

/* ---------------- 書式 ---------------- */
test("adv-b4-vba Format numeric", async () => {
  assert.equal(await out1('Format(1234.567, "#,##0.00")'), "1,234.57");
  assert.equal(await out1('Format(2.5, "0")'), "3"); // Format は四捨五入
  assert.equal(await out1('Format(1.5, "0")'), "2");
  assert.equal(await out1('Format(-2.5, "0")'), "-3");
  assert.equal(await out1('Format(0.5, "0%")'), "50%");
  assert.equal(await out1('Format(12345, "0.00E+00")'), "1.23E+04");
  assert.equal(await out1('Format(-123, "0.00;(#0.00)")'), "(123.00)"); // セクション
  assert.equal(await out1('Format(0, "0.00;(#0.00);ZERO")'), "ZERO");
  assert.equal(await out1('Format(123.4, "Fixed")'), "123.40");
  assert.equal(await out1('Format(1234.5, "Standard")'), "1,234.50");
  assert.equal(await out1('Format(0.25, "Percent")'), "25.00%");
  assert.equal(await out1('Format(1, "Yes/No")'), "Yes");
  assert.equal(await out1('Format(0, "Yes/No")'), "No");
  await pathErr('Debug.Print Format(1, "[Red]0")'); // 色指定子は名指し停止
});
test("adv-b4-vba Format date and string", async () => {
  assert.equal(await out1('Format(DateSerial(1969, 2, 12), "mmmm dd, yyyy")'), "February 12, 1969");
  assert.equal(await out1('Format(DateSerial(1969, 2, 12), "yyyy-mm-dd")'), "1969-02-12");
  assert.equal(await out1('Format(TimeSerial(13, 5, 9), "hh:nn:ss")'), "01:05:09");
  assert.equal(await out1('Format(DateSerial(2023, 3, 15), "Long Date")'), "Wednesday, March 15, 2023");
  assert.equal(await out1('Format("abc", ">&&&")'), "ABC");
  assert.equal(await out1('Format("ABC", "<&&&")'), "abc");
});
test("adv-b4-vba FormatNumber/Currency/Percent", async () => {
  assert.equal(await out1("FormatNumber(1234.567)"), "1,234.57");
  assert.equal(await out1("FormatNumber(1234.5, 0)"), "1,235");
  assert.equal(await out1("FormatNumber(-1234.5)"), "-1,234.50");
  assert.equal(await out1("FormatNumber(-1234.5, 2, -1, -1)"), "(1,234.50)"); // 括弧指定
  assert.equal(await out1("FormatNumber(0.5, 2, 0)"), ".50"); // 先行ゼロなし
  assert.equal(await out1("FormatCurrency(1234.5)"), "$1,234.50");
  assert.equal(await out1("FormatCurrency(-123.4)"), "($123.40)"); // en-US 既定
  assert.equal(await out1("FormatPercent(0.1234)"), "12.34%");
  assert.equal(await out1("FormatPercent(-0.5, 0)"), "-50%");
  await pathErr("Debug.Print FormatNumber(Null)", 94);
});

/* ---------------- StrConv・色 ---------------- */
test("adv-b4-vba StrConv cases and width/kana conversions", async () => {
  assert.equal(await out1('StrConv("abc", vbUpperCase)'), "ABC");
  assert.equal(await out1('StrConv("ABC", vbLowerCase)'), "abc");
  assert.equal(await out1('StrConv("hello world", vbProperCase)'), "Hello World");
  assert.equal(await out1('StrConv("ABC 123", vbWide)'), "ＡＢＣ　１２３");
  assert.equal(await out1('StrConv("ＡＢＣ　１２３", vbNarrow)'), "ABC 123");
  assert.equal(await out1('StrConv("ｱｲｳ", vbWide)'), "アイウ");
  assert.equal(await out1('StrConv("アイウ", vbNarrow)'), "ｱｲｳ");
  assert.equal(await out1('StrConv("ｶﾞ", vbWide)'), "ガ"); // 濁点の合成
  assert.equal(await out1('StrConv("ガ", vbNarrow)'), "ｶﾞ");
  assert.equal(await out1('StrConv("あいう", vbKatakana)'), "アイウ");
  assert.equal(await out1('StrConv("アイウ", vbHiragana)'), "あいう");
  await pathErr('Debug.Print StrConv("abc", vbUnicode)'); // バイト配列モデル無し→名指し停止
  await pathErr('Debug.Print StrConv("abc", vbWide + vbNarrow)', 5); // 相互排他
});
test("adv-b4-vba RGB / QBColor", async () => {
  assert.equal(await out1("RGB(255, 0, 0)"), "255");
  assert.equal(await out1("RGB(0, 255, 0)"), "65280");
  assert.equal(await out1("RGB(0, 0, 255)"), "16711680");
  assert.equal(await out1("RGB(300, 0, 0)"), "255"); // 255超は255（MS-VBAL）
  await pathErr("Debug.Print RGB(-1, 0, 0)", 5);
  assert.equal(await out1("QBColor(0)"), "0");
  assert.equal(await out1("QBColor(1)"), "8388608"); // &H800000（MS-VBAL 表）
  assert.equal(await out1("QBColor(7)"), "12632256"); // &HC0C0C0
  assert.equal(await out1("QBColor(15)"), "16777215");
  await pathErr("Debug.Print QBColor(16)", 5);
});

/* ---------------- 定数46件 ---------------- */
test("adv-b4-vba advanced constants resolve by member name", async () => {
  const expected = {
    CDROM: "4", Fixed: "2", RAMDisk: "5", Remote: "3", Removable: "1", Unknown: "0",
    Alias: "64", Archive: "32", Compressed: "128", Directory: "16", Hidden: "2",
    Normal: "0", ReadOnly: "1", System: "4", Volume: "8",
    ForAppending: "8", ForReading: "1", ForWriting: "2",
    SystemFolder: "1", TemporaryFolder: "2", WindowsFolder: "0",
    vbScrollBars: "-2147483648", vbDesktop: "-2147483647", vbActiveTitleBar: "-2147483646",
    vbInactiveTitleBar: "-2147483645", vbMenuBar: "-2147483644", vbWindowBackground: "-2147483643",
    vbWindowFrame: "-2147483642", vbMenuText: "-2147483641", vbWindowText: "-2147483640",
    vbTitleBarText: "-2147483639", vbActiveBorder: "-2147483638", vbInactiveBorder: "-2147483637",
    vbApplicationWorkspace: "-2147483636", vbHighlight: "-2147483635", vbHighlightText: "-2147483634",
    vbButtonFace: "-2147483633", vbButtonShadow: "-2147483632", vbGrayText: "-2147483631",
    vbButtonText: "-2147483630", vbInactiveCaptionText: "-2147483629", vb3DHighlight: "-2147483628",
    vb3DDKShadow: "-2147483627", vb3DLight: "-2147483626", vbInfoText: "-2147483625",
    vbInfoBackground: "-2147483624",
  };
  const names = Object.keys(expected);
  assert.equal(names.length, 46);
  const code = names.map((n) => `Debug.Print ${n}`).join("\n");
  const got = await outs(code);
  assert.deepEqual(got, names.map((n) => expected[n]));
});

/* ---------------- 未対応関数は名指しで止まる ---------------- */
test("adv-b4-vba environment-dependent functions stay named stops", async () => {
  for (const [expr, name] of [
    ['Dir("x")', "dir"], ['Shell("x")', "shell"], ['GetAttr("x")', "getattr"],
    ['CallByName(1, "x", 1)', "callbyname"], ['Environ("PATH")', "environ"],
    ['FileLen("x")', "filelen"], ['CreateObject("x")', "createobject"],
  ]) {
    const e = await pathErr(`Debug.Print ${expr}`);
    assert.ok(e.message.includes(name), `${expr} -> ${e.message}`);
  }
});
