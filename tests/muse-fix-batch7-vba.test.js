import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ7（VBA班）: R28-N8／N9／N10／N11（findings-round28 §2、
// findings-r28-sem SEM-N2、findings-r28-f01a F01A-N1、findings-r28-f04a F04A-N1／N2）
// 一次情報:
//  N8: 実 VBA では組み込み定数への代入はコンパイルエラー
//      （Assignment to constant not permitted）で実行自体が始まらない。
//      各定数ページも「同名の定数は定義できない」旨を明記する。
//  N9: Microsoft Learn「Constants (Visual Basic for Applications)」索引配下の
//      各定数ページ（StrConv／Shell／CallType／IMEStatus／QueryClose／Form／
//      Calendar／Keycode constants、InStr function の Settings 表）で値を確定。
//      StrConv の 256／512／1024 は Microsoft Learn の VbStrConv 列挙ページが
//      Visual Basic 定数との等価を明記することで確定した。
//  N10: Microsoft Learn「SetAttr statement」の Settings 表（vbNormal／
//      vbReadOnly／vbHidden／vbSystem／vbArchive／vbAlias のみ）。
//  N11: 比較定数は InStr function の Settings 表、vbVolume は Dir function の
//      Settings 表が正本。

const vba = getDefinition("vba");
const run = async (code) => vba.simulate(code, structuredClone(vba.model.defaults));
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const outs = async (code) => {
  const r = await run(code);
  assert.deepEqual(errs(r), [], code);
  return r.paths[0].outputs.map((o) => o.text);
};
const CONST_ASSIGN = /には代入できません（組み込み定数への代入はエラーです）/;

/* ---------------- R28-N8: 定数への代入は名指し停止 ---------------- */
const ASSIGN_FORMS = [
  ["plain (enum)", "vbYes = 99\nDebug.Print vbYes", "vbyes"],
  ["plain (string constant)", 'vbCrLf = "x"\nDebug.Print Len(vbCrLf)', "vbcrlf"],
  ["plain (vbTab)", 'vbTab = "x"', "vbtab"],
  ["plain (vbNullString)", 'vbNullString = "x"', "vbnullstring"],
  ["plain (new family)", "vbUpperCase = 9", "vbuppercase"],
  ["plain (KeyCode)", "vbKeyA = 1", "vbkeya"],
  ["plain (Calendar)", "vbCalGreg = 9", "vbcalgreg"],
  ["Let form", "Let vbYes = 99", "vbyes"],
  ["Set form", 'Set vbYes = Range("A1")', "vbyes"],
  ["case-insensitive", "VBYES = 99", "vbyes"],
];
for (const [label, code, key] of ASSIGN_FORMS) {
  test(`R28-N8 assignment to a built-in constant stops naming it: ${label}`, async () => {
    const r = await run(code);
    const all = errs(r);
    assert.ok(all.length >= 1, code + " must stop");
    assert.match(all[0].message, CONST_ASSIGN, code);
    assert.match(all[0].message, new RegExp(key), code);
    // 状態・trace・出力の矛盾の根絶: 定数名が変数として残らない
    for (const p of r.paths || []) assert.ok(!(key in (p.vars || {})), `${key} must not appear in final vars`);
    assert.deepEqual((r.paths?.[0]?.outputs || []).map((o) => o.text), [], code);
  });
}
test("R28-N8 Option Explicit no longer gives the false 'not defined' cause", async () => {
  const r = await run("Option Explicit\nvbYes = 99\nDebug.Print vbYes");
  const all = errs(r);
  assert.ok(all.length >= 1);
  assert.match(all[0].message, CONST_ASSIGN);
  assert.doesNotMatch(all[0].message, /変数が定義されていません/);
});
test("R28-N8 Dim shadowing a constant name stops naming it (scalar and array)", async () => {
  for (const code of ["Dim vbYes As Long\nvbYes = 42\nDebug.Print vbYes", "Dim vbYes(2) As Long", "Dim vbKeyA As Long", "Dim vbCrLf As String"]) {
    const r = await run(code);
    const all = errs(r);
    assert.ok(all.length >= 1, code);
    assert.match(all[0].message, /同じ名前の変数は宣言できません（組み込み定数です）/, code);
  }
});
test("R28-N8 constant as For / For Each variable stops naming it", async () => {
  const forms = [
    "For vbYes = 1 To 3\nNext vbYes",
    "For vbYes = 1 To x\nNext vbYes",
    "Dim a(2) As Long\nFor Each vbYes In a\nNext vbYes",
    'For Each vbYes In Range("A1:A2")\nNext vbYes',
  ];
  for (const code of forms) {
    const r = await run(code);
    const all = errs(r);
    assert.ok(all.length >= 1, code);
    assert.match(all[0].message, CONST_ASSIGN, code);
  }
});
test("R28-N8 adjacent surfaces already stop and stay stopped (no silent write)", async () => {
  // 複合代入は VBA に存在せず一律パースで停止する（通常変数でも同じ）。
  // 添字形・メンバー形の代入先も汎用文言で停止し、黙った書き込みは起きない。
  for (const code of ["vbYes += 1", "x = 1\nx += 1", "vbYes(1) = 5", "vbYes.Value = 5", "Const vbYes = 1", "ReDim vbYes(3)"]) {
    const r = await run(code);
    assert.ok(errs(r).length >= 1, code + " must stop");
    for (const p of r.paths || []) assert.ok(!("vbyes" in (p.vars || {})), code);
  }
});
test("R28-N8 ordinary variables are unaffected (Dim / assign / For / For Each)", async () => {
  assert.deepEqual(await outs("Dim x As Long\nx = 5\nFor x = 1 To 2\nNext x\nDebug.Print x"), ["3"]);
  assert.deepEqual(await outs("Dim vbFoo As Long\nvbFoo = 7\nDebug.Print vbFoo"), ["7"]);
  assert.deepEqual(await outs("Dim a(1) As Long\nDim e As Variant\nFor Each e In a\nNext e\nDebug.Print \"done\""), ["done"]);
  assert.deepEqual(await outs("Debug.Print vbYes, vbYesNo + vbQuestion"), ["6, 36"]);
});

/* ---------------- R28-N9: 列挙外だった定数族の完成 ---------------- */
const NEW_VALUES = {
  "vbUpperCase": 1,
  "vbLowerCase": 2,
  "vbProperCase": 3,
  "vbWide": 4,
  "vbNarrow": 8,
  "vbKatakana": 16,
  "vbHiragana": 32,
  "vbUnicode": 64,
  "vbFromUnicode": 128,
  "vbSimplifiedChinese": 256,
  "vbTraditionalChinese": 512,
  "vbLinguisticCasing": 1024,
  "vbHide": 0,
  "vbNormalFocus": 1,
  "vbMinimizedFocus": 2,
  "vbMaximizedFocus": 3,
  "vbNormalNoFocus": 4,
  "vbMinimizedNoFocus": 6,
  "vbMethod": 1,
  "vbGet": 2,
  "vbLet": 4,
  "vbSet": 8,
  "vbIMEModeNoControl": 0,
  "vbIMEModeOn": 1,
  "vbIMEModeOff": 2,
  "vbIMEModeDisable": 3,
  "vbIMEModeHiragana": 4,
  "vbIMEModeKatakana": 5,
  "vbIMEModeKatakanaHalf": 6,
  "vbIMEModeAlphaFull": 7,
  "vbIMEModeAlpha": 8,
  "vbIMEModeHangulFull": 9,
  "vbIMEModeHangul": 10,
  "vbFormControlMenu": 0,
  "vbFormCode": 1,
  "vbAppWindows": 2,
  "vbAppTaskManager": 3,
  "vbModeless": 0,
  "vbModal": 1,
  "vbCalGreg": 0,
  "vbCalHijri": 1,
  "vbUseCompareOption": -1,
  "vbKeyLButton": 1,
  "vbKeyRButton": 2,
  "vbKeyCancel": 3,
  "vbKeyMButton": 4,
  "vbKeyBack": 8,
  "vbKeyTab": 9,
  "vbKeyClear": 12,
  "vbKeyReturn": 13,
  "vbKeyShift": 16,
  "vbKeyControl": 17,
  "vbKeyMenu": 18,
  "vbKeyPause": 19,
  "vbKeyCapital": 20,
  "vbKeyEscape": 27,
  "vbKeySpace": 32,
  "vbKeyPageUp": 33,
  "vbKeyPageDown": 34,
  "vbKeyEnd": 35,
  "vbKeyHome": 36,
  "vbKeyLeft": 37,
  "vbKeyUp": 38,
  "vbKeyRight": 39,
  "vbKeyDown": 40,
  "vbKeySelect": 41,
  "vbKeyPrint": 42,
  "vbKeyExecute": 43,
  "vbKeySnapshot": 44,
  "vbKeyInsert": 45,
  "vbKeyDelete": 46,
  "vbKeyHelp": 47,
  "vbKeyNumlock": 144,
  "vbKeyA": 65,
  "vbKeyB": 66,
  "vbKeyC": 67,
  "vbKeyD": 68,
  "vbKeyE": 69,
  "vbKeyF": 70,
  "vbKeyG": 71,
  "vbKeyH": 72,
  "vbKeyI": 73,
  "vbKeyJ": 74,
  "vbKeyK": 75,
  "vbKeyL": 76,
  "vbKeyM": 77,
  "vbKeyN": 78,
  "vbKeyO": 79,
  "vbKeyP": 80,
  "vbKeyQ": 81,
  "vbKeyR": 82,
  "vbKeyS": 83,
  "vbKeyT": 84,
  "vbKeyU": 85,
  "vbKeyV": 86,
  "vbKeyW": 87,
  "vbKeyX": 88,
  "vbKeyY": 89,
  "vbKeyZ": 90,
  "vbKey0": 48,
  "vbKey1": 49,
  "vbKey2": 50,
  "vbKey3": 51,
  "vbKey4": 52,
  "vbKey5": 53,
  "vbKey6": 54,
  "vbKey7": 55,
  "vbKey8": 56,
  "vbKey9": 57,
  "vbKeyNumpad0": 96,
  "vbKeyNumpad1": 97,
  "vbKeyNumpad2": 98,
  "vbKeyNumpad3": 99,
  "vbKeyNumpad4": 100,
  "vbKeyNumpad5": 101,
  "vbKeyNumpad6": 102,
  "vbKeyNumpad7": 103,
  "vbKeyNumpad8": 104,
  "vbKeyNumpad9": 105,
  "vbKeyMultiply": 106,
  "vbKeyAdd": 107,
  "vbKeySeparator": 108,
  "vbKeySubtract": 109,
  "vbKeyDecimal": 110,
  "vbKeyDivide": 111,
  "vbKeyF1": 112,
  "vbKeyF2": 113,
  "vbKeyF3": 114,
  "vbKeyF4": 115,
  "vbKeyF5": 116,
  "vbKeyF6": 117,
  "vbKeyF7": 118,
  "vbKeyF8": 119,
  "vbKeyF9": 120,
  "vbKeyF10": 121,
  "vbKeyF11": 122,
  "vbKeyF12": 123,
  "vbKeyF13": 124,
  "vbKeyF14": 125,
  "vbKeyF15": 126,
  "vbKeyF16": 127
};
test("R28-N9 all 141 newly completed constants return their documented values", async () => {
  const names = Object.keys(NEW_VALUES);
  assert.equal(names.length, 141);
  for (const name of names)
    assert.deepEqual(await outs(`Debug.Print ${name}`), [String(NEW_VALUES[name])], name);
});
test("R28-N9 constants no longer silently mis-branch and work under Option Explicit", async () => {
  assert.deepEqual(await outs('If vbUpperCase = 1 Then\n Debug.Print "yes"\nElse\n Debug.Print "no"\nEnd If'), ["yes"]);
  assert.deepEqual(await outs("Option Explicit\nDebug.Print vbWide, vbIMEModeOn, vbCalGreg, vbKeyReturn"), ["4, 1, 0, 13"]);
  assert.deepEqual(await outs("x = 1\nIf x = vbIMEModeOn Then\n Debug.Print \"on\"\nEnd If"), ["on"]);
  assert.deepEqual(await outs('Debug.Print InStr(1, "ABC", "a", vbTextCompare)'), ["1"]);
});
test("R28-N9 vbUseCompareOption flows as -1 into InStr (Option Compare stop, not Empty)", async () => {
  const r = await run('Debug.Print InStr(1, "abc", "a", vbUseCompareOption)');
  const all = errs(r);
  assert.ok(all.length >= 1);
  assert.match(all[0].message, /Option Compare/);
});
const NEW_NAMES = ["vbUpperCase", "vbLowerCase", "vbProperCase", "vbWide", "vbNarrow", "vbKatakana", "vbHiragana", "vbUnicode", "vbFromUnicode", "vbSimplifiedChinese", "vbTraditionalChinese", "vbLinguisticCasing", "vbHide", "vbNormalFocus", "vbMinimizedFocus", "vbMaximizedFocus", "vbNormalNoFocus", "vbMinimizedNoFocus", "vbMethod", "vbGet", "vbLet", "vbSet", "vbIMEModeNoControl", "vbIMEModeOn", "vbIMEModeOff", "vbIMEModeDisable", "vbIMEModeHiragana", "vbIMEModeKatakana", "vbIMEModeKatakanaHalf", "vbIMEModeAlphaFull", "vbIMEModeAlpha", "vbIMEModeHangulFull", "vbIMEModeHangul", "vbFormControlMenu", "vbFormCode", "vbAppWindows", "vbAppTaskManager", "vbModeless", "vbModal", "vbCalGreg", "vbCalHijri", "vbUseCompareOption", "vbKeyLButton", "vbKeyRButton", "vbKeyCancel", "vbKeyMButton", "vbKeyBack", "vbKeyTab", "vbKeyClear", "vbKeyReturn", "vbKeyShift", "vbKeyControl", "vbKeyMenu", "vbKeyPause", "vbKeyCapital", "vbKeyEscape", "vbKeySpace", "vbKeyPageUp", "vbKeyPageDown", "vbKeyEnd", "vbKeyHome", "vbKeyLeft", "vbKeyUp", "vbKeyRight", "vbKeyDown", "vbKeySelect", "vbKeyPrint", "vbKeyExecute", "vbKeySnapshot", "vbKeyInsert", "vbKeyDelete", "vbKeyHelp", "vbKeyNumlock", "vbKeyA", "vbKeyB", "vbKeyC", "vbKeyD", "vbKeyE", "vbKeyF", "vbKeyG", "vbKeyH", "vbKeyI", "vbKeyJ", "vbKeyK", "vbKeyL", "vbKeyM", "vbKeyN", "vbKeyO", "vbKeyP", "vbKeyQ", "vbKeyR", "vbKeyS", "vbKeyT", "vbKeyU", "vbKeyV", "vbKeyW", "vbKeyX", "vbKeyY", "vbKeyZ", "vbKey0", "vbKey1", "vbKey2", "vbKey3", "vbKey4", "vbKey5", "vbKey6", "vbKey7", "vbKey8", "vbKey9", "vbKeyNumpad0", "vbKeyNumpad1", "vbKeyNumpad2", "vbKeyNumpad3", "vbKeyNumpad4", "vbKeyNumpad5", "vbKeyNumpad6", "vbKeyNumpad7", "vbKeyNumpad8", "vbKeyNumpad9", "vbKeyMultiply", "vbKeyAdd", "vbKeySeparator", "vbKeySubtract", "vbKeyDecimal", "vbKeyDivide", "vbKeyF1", "vbKeyF2", "vbKeyF3", "vbKeyF4", "vbKeyF5", "vbKeyF6", "vbKeyF7", "vbKeyF8", "vbKeyF9", "vbKeyF10", "vbKeyF11", "vbKeyF12", "vbKeyF13", "vbKeyF14", "vbKeyF15", "vbKeyF16"];
test("R28-N9 every new constant has its own supported reference entry with all fields", () => {
  assert.equal(NEW_NAMES.length, 141);
  assert.equal(vba.reference.length, 338, "185 + 141 (batch7 constants) + 12 (batch8 reference-only owners: 6 cfnvba + 6 vbasweep)");
  const byName = new Map(vba.reference.map((r) => [r.name, r]));
  for (const name of NEW_NAMES) {
    const r = byName.get(name);
    assert.ok(r, name + " must exist as a reference entry");
    assert.equal(r.supported, true, name);
    for (const f of ["category", "syntax", "description", "example", "caution", "returns", "source"])
      assert.ok(typeof r[f] === "string" && r[f].length > 0, `${name}.${f}`);
    assert.equal(r.returns, `数値定数（${NEW_VALUES[name]}）`, name);
  }
});
test("R28-N9 reference examples for the new constants run and scan resolves each name", async () => {
  const byName = new Map(vba.reference.map((r) => [r.name, r]));
  for (const name of NEW_NAMES) {
    const r = await run(byName.get(name).example);
    assert.deepEqual(errs(r), [], `${name}: ${JSON.stringify(errs(r))}`);
    assert.ok(vba.scan(`x = ${name}`).includes(name), name + " must resolve through scan");
  }
});

/* ---------------- R28-N10: vbDirectory の説明文 ---------------- */
test("R28-N10 vbDirectory description no longer claims SetAttr", () => {
  const r = vba.reference.find((x) => x.name === "vbDirectory");
  assert.ok(r);
  assert.doesNotMatch(r.description, /SetAttr/);
  assert.match(r.description, /GetAttr／Dir で使います/);
  assert.equal(r.returns, "数値定数（16）");
});

/* ---------------- R28-N11: 出典 URL の正本化 ---------------- */
test("R28-N11 sources point at the pages that actually document the constants", () => {
  const byName = new Map(vba.reference.map((r) => [r.name, r]));
  const INSTR = "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/instr-function.md";
  const DIR = "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/dir-function.md";
  for (const n of ["vbBinaryCompare", "vbTextCompare", "vbDatabaseCompare"])
    assert.equal(byName.get(n).source, INSTR, n);
  assert.equal(byName.get("vbVolume").source, DIR, "vbVolume");
});
