// 高度A4班 VBA定数チーム（lane-a4-tvba-const）回帰テスト。
// 期待値表は Microsoft Learn の各定数ページ（定数一覧から辿れる22ページ）の
// 表を機械抽出して独立に構築したもので、アプリのデータからは写していない。
// 出典ページは inventory-vba.md の定数280件の「出典」欄が列挙する22 URL と同一。
// 照合: 値（Debug.Print の出力文字列）と型の区別（VarType）。
// 型について: 本アプリの数値モデルでは数値は一律 Double として扱われるため
// （既存テスト adv-b4-vba-eng の「モデルでは数値は Double」参照）、数値定数の
// VarType は実 VBA の Long(3) ではなくモデル上の 5 になる。これは定数テーブル
// の欠陥ではなくインタプリタの数値モデル全体の性質として所見に記録済み。
// ここでは「数値定数は数値型(5)、文字列定数は 8」というモデル内一貫性を固定する。
import test from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced } from "../js/types/vba/reference-advanced.js";

const vba = getDefinition("vba");
// [期待値, 種別(number|string|nullstring), 自項目名（高度差分はグループ名.メンバー名）]
const EXPECTED = {
  "Alias": [64, "number", "FileAttributeConstants.Alias"],
  "Archive": [32, "number", "FileAttributeConstants.Archive"],
  "CDROM": [4, "number", "DriveTypeConstants.CDROM"],
  "Compressed": [128, "number", "FileAttributeConstants.Compressed"],
  "Directory": [16, "number", "FileAttributeConstants.Directory"],
  "Fixed": [2, "number", "DriveTypeConstants.Fixed"],
  "ForAppending": [8, "number", "FileInputOutputConstants.ForAppending"],
  "ForReading": [1, "number", "FileInputOutputConstants.ForReading"],
  "ForWriting": [2, "number", "FileInputOutputConstants.ForWriting"],
  "Hidden": [2, "number", "FileAttributeConstants.Hidden"],
  "Normal": [0, "number", "FileAttributeConstants.Normal"],
  "RAMDisk": [5, "number", "DriveTypeConstants.RAMDisk"],
  "ReadOnly": [1, "number", "FileAttributeConstants.ReadOnly"],
  "Remote": [3, "number", "DriveTypeConstants.Remote"],
  "Removable": [1, "number", "DriveTypeConstants.Removable"],
  "System": [4, "number", "FileAttributeConstants.System"],
  "SystemFolder": [1, "number", "SpecialFolderConstants.SystemFolder"],
  "TemporaryFolder": [2, "number", "SpecialFolderConstants.TemporaryFolder"],
  "Unknown": [0, "number", "DriveTypeConstants.Unknown"],
  "vb3DDKShadow": [-2147483627, "number", "SystemColorConstants.vb3DDKShadow"],
  "vb3DHighlight": [-2147483628, "number", "SystemColorConstants.vb3DHighlight"],
  "vb3DLight": [-2147483626, "number", "SystemColorConstants.vb3DLight"],
  "vbAbort": [3, "number", "vbAbort"],
  "vbAbortRetryIgnore": [2, "number", "vbAbortRetryIgnore"],
  "vbActiveBorder": [-2147483638, "number", "SystemColorConstants.vbActiveBorder"],
  "vbActiveTitleBar": [-2147483646, "number", "SystemColorConstants.vbActiveTitleBar"],
  "vbAlias": [64, "number", "vbAlias"],
  "vbApplicationModal": [0, "number", "vbApplicationModal"],
  "vbApplicationWorkspace": [-2147483636, "number", "SystemColorConstants.vbApplicationWorkspace"],
  "vbAppTaskManager": [3, "number", "vbAppTaskManager"],
  "vbAppWindows": [2, "number", "vbAppWindows"],
  "vbArchive": [32, "number", "vbArchive"],
  "vbArray": [8192, "number", "vbArray"],
  "vbBack": ["\b", "string", "vbBack"],
  "vbBinaryCompare": [0, "number", "vbBinaryCompare"],
  "vbBlack": [0, "number", "vbBlack"],
  "vbBlue": [16711680, "number", "vbBlue"],
  "vbBoolean": [11, "number", "vbBoolean"],
  "vbButtonFace": [-2147483633, "number", "SystemColorConstants.vbButtonFace"],
  "vbButtonShadow": [-2147483632, "number", "SystemColorConstants.vbButtonShadow"],
  "vbButtonText": [-2147483630, "number", "SystemColorConstants.vbButtonText"],
  "vbByte": [17, "number", "vbByte"],
  "vbCalGreg": [0, "number", "vbCalGreg"],
  "vbCalHijri": [1, "number", "vbCalHijri"],
  "vbCancel": [2, "number", "vbCancel"],
  "vbCr": ["\r", "string", "vbCr"],
  "vbCritical": [16, "number", "vbCritical"],
  "vbCrLf": ["\r\n", "string", "vbCrLf"],
  "vbCurrency": [6, "number", "vbCurrency"],
  "vbCyan": [16776960, "number", "vbCyan"],
  "vbDatabaseCompare": [2, "number", "vbDatabaseCompare"],
  "vbDataObject": [13, "number", "vbDataObject"],
  "vbDate": [7, "number", "vbDate"],
  "vbDecimal": [14, "number", "vbDecimal"],
  "vbDefaultButton1": [0, "number", "vbDefaultButton1"],
  "vbDefaultButton2": [256, "number", "vbDefaultButton2"],
  "vbDefaultButton3": [512, "number", "vbDefaultButton3"],
  "vbDefaultButton4": [768, "number", "vbDefaultButton4"],
  "vbDesktop": [-2147483647, "number", "SystemColorConstants.vbDesktop"],
  "vbDirectory": [16, "number", "vbDirectory"],
  "vbDouble": [5, "number", "vbDouble"],
  "vbEmpty": [0, "number", "vbEmpty"],
  "vbError": [10, "number", "vbError"],
  "vbExclamation": [48, "number", "vbExclamation"],
  "vbFalse": [0, "number", "vbFalse"],
  "vbFirstFourDays": [2, "number", "vbFirstFourDays"],
  "vbFirstFullWeek": [3, "number", "vbFirstFullWeek"],
  "vbFirstJan1": [1, "number", "vbFirstJan1"],
  "vbFormCode": [1, "number", "vbFormCode"],
  "vbFormControlMenu": [0, "number", "vbFormControlMenu"],
  "vbFormFeed": ["\f", "string", "vbFormFeed"],
  "vbFriday": [6, "number", "vbFriday"],
  "vbFromUnicode": [128, "number", "vbFromUnicode"],
  "vbGeneralDate": [0, "number", "vbGeneralDate"],
  "vbGet": [2, "number", "vbGet"],
  "vbGrayText": [-2147483631, "number", "SystemColorConstants.vbGrayText"],
  "vbGreen": [65280, "number", "vbGreen"],
  "vbHidden": [2, "number", "vbHidden"],
  "vbHide": [0, "number", "vbHide"],
  "vbHighlight": [-2147483635, "number", "SystemColorConstants.vbHighlight"],
  "vbHighlightText": [-2147483634, "number", "SystemColorConstants.vbHighlightText"],
  "vbHiragana": [32, "number", "vbHiragana"],
  "vbIgnore": [5, "number", "vbIgnore"],
  "vbIMEModeAlpha": [8, "number", "vbIMEModeAlpha"],
  "vbIMEModeAlphaFull": [7, "number", "vbIMEModeAlphaFull"],
  "vbIMEModeDisable": [3, "number", "vbIMEModeDisable"],
  "vbIMEModeHangul": [10, "number", "vbIMEModeHangul"],
  "vbIMEModeHangulFull": [9, "number", "vbIMEModeHangulFull"],
  "vbIMEModeHiragana": [4, "number", "vbIMEModeHiragana"],
  "vbIMEModeKatakana": [5, "number", "vbIMEModeKatakana"],
  "vbIMEModeKatakanaHalf": [6, "number", "vbIMEModeKatakanaHalf"],
  "vbIMEModeNoControl": [0, "number", "vbIMEModeNoControl"],
  "vbIMEModeOff": [2, "number", "vbIMEModeOff"],
  "vbIMEModeOn": [1, "number", "vbIMEModeOn"],
  "vbInactiveBorder": [-2147483637, "number", "SystemColorConstants.vbInactiveBorder"],
  "vbInactiveCaptionText": [-2147483629, "number", "SystemColorConstants.vbInactiveCaptionText"],
  "vbInactiveTitleBar": [-2147483645, "number", "SystemColorConstants.vbInactiveTitleBar"],
  "vbInfoBackground": [-2147483624, "number", "SystemColorConstants.vbInfoBackground"],
  "vbInformation": [64, "number", "vbInformation"],
  "vbInfoText": [-2147483625, "number", "SystemColorConstants.vbInfoText"],
  "vbInteger": [2, "number", "vbInteger"],
  "vbKatakana": [16, "number", "vbKatakana"],
  "vbKey0": [48, "number", "vbKey0"],
  "vbKey1": [49, "number", "vbKey1"],
  "vbKey2": [50, "number", "vbKey2"],
  "vbKey3": [51, "number", "vbKey3"],
  "vbKey4": [52, "number", "vbKey4"],
  "vbKey5": [53, "number", "vbKey5"],
  "vbKey6": [54, "number", "vbKey6"],
  "vbKey7": [55, "number", "vbKey7"],
  "vbKey8": [56, "number", "vbKey8"],
  "vbKey9": [57, "number", "vbKey9"],
  "vbKeyA": [65, "number", "vbKeyA"],
  "vbKeyAdd": [107, "number", "vbKeyAdd"],
  "vbKeyB": [66, "number", "vbKeyB"],
  "vbKeyBack": [8, "number", "vbKeyBack"],
  "vbKeyC": [67, "number", "vbKeyC"],
  "vbKeyCancel": [3, "number", "vbKeyCancel"],
  "vbKeyCapital": [20, "number", "vbKeyCapital"],
  "vbKeyClear": [12, "number", "vbKeyClear"],
  "vbKeyControl": [17, "number", "vbKeyControl"],
  "vbKeyD": [68, "number", "vbKeyD"],
  "vbKeyDecimal": [110, "number", "vbKeyDecimal"],
  "vbKeyDelete": [46, "number", "vbKeyDelete"],
  "vbKeyDivide": [111, "number", "vbKeyDivide"],
  "vbKeyDown": [40, "number", "vbKeyDown"],
  "vbKeyE": [69, "number", "vbKeyE"],
  "vbKeyEnd": [35, "number", "vbKeyEnd"],
  "vbKeyEscape": [27, "number", "vbKeyEscape"],
  "vbKeyExecute": [43, "number", "vbKeyExecute"],
  "vbKeyF": [70, "number", "vbKeyF"],
  "vbKeyF1": [112, "number", "vbKeyF1"],
  "vbKeyF10": [121, "number", "vbKeyF10"],
  "vbKeyF11": [122, "number", "vbKeyF11"],
  "vbKeyF12": [123, "number", "vbKeyF12"],
  "vbKeyF13": [124, "number", "vbKeyF13"],
  "vbKeyF14": [125, "number", "vbKeyF14"],
  "vbKeyF15": [126, "number", "vbKeyF15"],
  "vbKeyF16": [127, "number", "vbKeyF16"],
  "vbKeyF2": [113, "number", "vbKeyF2"],
  "vbKeyF3": [114, "number", "vbKeyF3"],
  "vbKeyF4": [115, "number", "vbKeyF4"],
  "vbKeyF5": [116, "number", "vbKeyF5"],
  "vbKeyF6": [117, "number", "vbKeyF6"],
  "vbKeyF7": [118, "number", "vbKeyF7"],
  "vbKeyF8": [119, "number", "vbKeyF8"],
  "vbKeyF9": [120, "number", "vbKeyF9"],
  "vbKeyG": [71, "number", "vbKeyG"],
  "vbKeyH": [72, "number", "vbKeyH"],
  "vbKeyHelp": [47, "number", "vbKeyHelp"],
  "vbKeyHome": [36, "number", "vbKeyHome"],
  "vbKeyI": [73, "number", "vbKeyI"],
  "vbKeyInsert": [45, "number", "vbKeyInsert"],
  "vbKeyJ": [74, "number", "vbKeyJ"],
  "vbKeyK": [75, "number", "vbKeyK"],
  "vbKeyL": [76, "number", "vbKeyL"],
  "vbKeyLButton": [1, "number", "vbKeyLButton"],
  "vbKeyLeft": [37, "number", "vbKeyLeft"],
  "vbKeyM": [77, "number", "vbKeyM"],
  "vbKeyMButton": [4, "number", "vbKeyMButton"],
  "vbKeyMenu": [18, "number", "vbKeyMenu"],
  "vbKeyMultiply": [106, "number", "vbKeyMultiply"],
  "vbKeyN": [78, "number", "vbKeyN"],
  "vbKeyNumlock": [144, "number", "vbKeyNumlock"],
  "vbKeyNumpad0": [96, "number", "vbKeyNumpad0"],
  "vbKeyNumpad1": [97, "number", "vbKeyNumpad1"],
  "vbKeyNumpad2": [98, "number", "vbKeyNumpad2"],
  "vbKeyNumpad3": [99, "number", "vbKeyNumpad3"],
  "vbKeyNumpad4": [100, "number", "vbKeyNumpad4"],
  "vbKeyNumpad5": [101, "number", "vbKeyNumpad5"],
  "vbKeyNumpad6": [102, "number", "vbKeyNumpad6"],
  "vbKeyNumpad7": [103, "number", "vbKeyNumpad7"],
  "vbKeyNumpad8": [104, "number", "vbKeyNumpad8"],
  "vbKeyNumpad9": [105, "number", "vbKeyNumpad9"],
  "vbKeyO": [79, "number", "vbKeyO"],
  "vbKeyP": [80, "number", "vbKeyP"],
  "vbKeyPageDown": [34, "number", "vbKeyPageDown"],
  "vbKeyPageUp": [33, "number", "vbKeyPageUp"],
  "vbKeyPause": [19, "number", "vbKeyPause"],
  "vbKeyPrint": [42, "number", "vbKeyPrint"],
  "vbKeyQ": [81, "number", "vbKeyQ"],
  "vbKeyR": [82, "number", "vbKeyR"],
  "vbKeyRButton": [2, "number", "vbKeyRButton"],
  "vbKeyReturn": [13, "number", "vbKeyReturn"],
  "vbKeyRight": [39, "number", "vbKeyRight"],
  "vbKeyS": [83, "number", "vbKeyS"],
  "vbKeySelect": [41, "number", "vbKeySelect"],
  "vbKeySeparator": [108, "number", "vbKeySeparator"],
  "vbKeyShift": [16, "number", "vbKeyShift"],
  "vbKeySnapshot": [44, "number", "vbKeySnapshot"],
  "vbKeySpace": [32, "number", "vbKeySpace"],
  "vbKeySubtract": [109, "number", "vbKeySubtract"],
  "vbKeyT": [84, "number", "vbKeyT"],
  "vbKeyTab": [9, "number", "vbKeyTab"],
  "vbKeyU": [85, "number", "vbKeyU"],
  "vbKeyUp": [38, "number", "vbKeyUp"],
  "vbKeyV": [86, "number", "vbKeyV"],
  "vbKeyW": [87, "number", "vbKeyW"],
  "vbKeyX": [88, "number", "vbKeyX"],
  "vbKeyY": [89, "number", "vbKeyY"],
  "vbKeyZ": [90, "number", "vbKeyZ"],
  "vbLet": [4, "number", "vbLet"],
  "vbLf": ["\n", "string", "vbLf"],
  "vbLong": [3, "number", "vbLong"],
  "vbLongDate": [1, "number", "vbLongDate"],
  "vbLongLong": [20, "number", "vbLongLong"],
  "vbLongTime": [3, "number", "vbLongTime"],
  "vbLowerCase": [2, "number", "vbLowerCase"],
  "vbMagenta": [16711935, "number", "vbMagenta"],
  "vbMaximizedFocus": [3, "number", "vbMaximizedFocus"],
  "vbMenuBar": [-2147483644, "number", "SystemColorConstants.vbMenuBar"],
  "vbMenuText": [-2147483641, "number", "SystemColorConstants.vbMenuText"],
  "vbMethod": [1, "number", "vbMethod"],
  "vbMinimizedFocus": [2, "number", "vbMinimizedFocus"],
  "vbMinimizedNoFocus": [6, "number", "vbMinimizedNoFocus"],
  "vbModal": [1, "number", "vbModal"],
  "vbModeless": [0, "number", "vbModeless"],
  "vbMonday": [2, "number", "vbMonday"],
  "vbMsgBoxHelpButton": [16384, "number", "vbMsgBoxHelpButton"],
  "vbMsgBoxRight": [524288, "number", "vbMsgBoxRight"],
  "vbMsgBoxRtlReading": [1048576, "number", "vbMsgBoxRtlReading"],
  "vbMsgBoxSetForeground": [65536, "number", "vbMsgBoxSetForeground"],
  "vbNarrow": [8, "number", "vbNarrow"],
  "vbNewLine": ["\r\n", "string", "vbNewLine"],
  "vbNo": [7, "number", "vbNo"],
  "vbNormal": [0, "number", "vbNormal"],
  "vbNormalFocus": [1, "number", "vbNormalFocus"],
  "vbNormalNoFocus": [4, "number", "vbNormalNoFocus"],
  "vbNull": [1, "number", "vbNull"],
  "vbNullChar": ["\u0000", "string", "vbNullChar"],
  "vbNullString": ["", "nullstring", "vbNullString"],
  "vbObject": [9, "number", "vbObject"],
  "vbObjectError": [-2147221504, "number", "vbObjectError"],
  "vbOK": [1, "number", "vbOK"],
  "vbOKCancel": [1, "number", "vbOKCancel"],
  "vbOKOnly": [0, "number", "vbOKOnly"],
  "vbProperCase": [3, "number", "vbProperCase"],
  "vbQuestion": [32, "number", "vbQuestion"],
  "vbReadOnly": [1, "number", "vbReadOnly"],
  "vbRed": [255, "number", "vbRed"],
  "vbRetry": [4, "number", "vbRetry"],
  "vbRetryCancel": [5, "number", "vbRetryCancel"],
  "vbSaturday": [7, "number", "vbSaturday"],
  "vbScrollBars": [-2147483648, "number", "SystemColorConstants.vbScrollBars"],
  "vbSet": [8, "number", "vbSet"],
  "vbShortDate": [2, "number", "vbShortDate"],
  "vbShortTime": [4, "number", "vbShortTime"],
  "vbSingle": [4, "number", "vbSingle"],
  "vbString": [8, "number", "vbString"],
  "vbSunday": [1, "number", "vbSunday"],
  "vbSystem": [4, "number", "vbSystem"],
  "vbSystemModal": [4096, "number", "vbSystemModal"],
  "vbTab": ["\t", "string", "vbTab"],
  "vbTextCompare": [1, "number", "vbTextCompare"],
  "vbThursday": [5, "number", "vbThursday"],
  "vbTitleBarText": [-2147483639, "number", "SystemColorConstants.vbTitleBarText"],
  "vbTrue": [-1, "number", "vbTrue"],
  "vbTuesday": [3, "number", "vbTuesday"],
  "vbUnicode": [64, "number", "vbUnicode"],
  "vbUpperCase": [1, "number", "vbUpperCase"],
  "vbUseCompareOption": [-1, "number", "vbUseCompareOption"],
  "vbUseDefault": [-2, "number", "vbUseDefault"],
  "vbUserDefinedType": [36, "number", "vbUserDefinedType"],
  "vbUseSystem": [0, "number", "vbUseSystem"],
  "vbUseSystemDayOfWeek": [0, "number", "vbUseSystemDayOfWeek"],
  "vbVariant": [12, "number", "vbVariant"],
  "vbVerticalTab": ["\u000b", "string", "vbVerticalTab"],
  "vbVolume": [8, "number", "vbVolume"],
  "vbWednesday": [4, "number", "vbWednesday"],
  "vbWhite": [16777215, "number", "vbWhite"],
  "vbWide": [4, "number", "vbWide"],
  "vbWindowBackground": [-2147483643, "number", "SystemColorConstants.vbWindowBackground"],
  "vbWindowFrame": [-2147483642, "number", "SystemColorConstants.vbWindowFrame"],
  "vbWindowText": [-2147483640, "number", "SystemColorConstants.vbWindowText"],
  "vbYellow": [65535, "number", "vbYellow"],
  "vbYes": [6, "number", "vbYes"],
  "vbYesNo": [4, "number", "vbYesNo"],
  "vbYesNoCancel": [3, "number", "vbYesNoCancel"],
  "Volume": [8, "number", "FileAttributeConstants.Volume"],
  "WindowsFolder": [0, "number", "SpecialFolderConstants.WindowsFolder"],
};

async function runLines(lines) {
  const r = await vba.simulate(`Sub Main()\n${lines.join("\n")}\nEnd Sub`, structuredClone(vba.model.defaults));
  assert.ok(!r.error, r.error ? r.error.message : "");
  return r.paths[0].outputs.map((o) => o.text);
}

test("VBA定数280件: 値と型の全数照合（Learn独立期待値表）", async () => {
  const names = Object.keys(EXPECTED);
  assert.equal(names.length, 280);
  for (let i = 0; i < names.length; i += 20) {
    const chunk = names.slice(i, i + 20);
    const lines = [];
    for (const n of chunk) { lines.push(`Debug.Print ${n}`); lines.push(`Debug.Print VarType(${n})`); }
    const outs = await runLines(lines);
    chunk.forEach((n, idx) => {
      const [expected, kind] = EXPECTED[n];
      assert.equal(outs[idx * 2], String(expected), `${n} の値`);
      assert.equal(outs[idx * 2 + 1], kind === "number" ? "5" : "8", `${n} の VarType（モデル）`);
    });
  }
});

test("VC1〜VC9: プローブ種の明示照合", async () => {
  const one = async (expr) => (await runLines([`Debug.Print ${expr}`]))[0];
  // VC1 MsgBox 戻り値
  assert.deepEqual(await runLines(["Debug.Print vbOK","Debug.Print vbCancel","Debug.Print vbAbort","Debug.Print vbRetry","Debug.Print vbIgnore","Debug.Print vbYes","Debug.Print vbNo"]), ["1","2","3","4","5","6","7"]);
  // VC4 文字列定数
  assert.equal(await one("Len(vbCrLf)"), "2");
  assert.equal(await one("vbCr = Chr(13)"), "True");
  assert.equal(await one("vbLf = Chr(10)"), "True");
  assert.equal(await one("vbTab = Chr(9)"), "True");
  assert.equal(await one("vbBack = Chr(8)"), "True");
  assert.equal(await one("vbFormFeed = Chr(12)"), "True");
  assert.equal(await one("vbVerticalTab = Chr(11)"), "True");
  assert.equal(await one("Len(vbNullChar)"), "1");
  assert.equal(await one("Asc(vbNullChar)"), "0");
  // VC5 曜日（日付リテラルは本エンジン未対応のため DateSerial で代替。2026-11-15 は日曜日）
  assert.equal(await one("Weekday(DateSerial(2026, 11, 15))"), "1");
  // VC7 StrConv 実挙動
  assert.equal(await one('StrConv("アイウ", vbHiragana)'), "あいう");
  assert.equal(await one('StrConv("ｱｲｳ", vbWide)'), "アイウ");
  assert.equal(await one('StrConv("アイウ", vbNarrow)'), "ｱｲｳ");
  assert.equal(await one('StrConv("abc", vbUpperCase)'), "ABC");
  // VC8
  assert.equal(await one("vbObjectError"), "-2147221504");
  // Calendar 定数（Learn calendar-constants で確定: vbCalGreg=0, vbCalHijri=1。再裁定済み）
  assert.equal(await one("vbCalGreg"), "0");
  assert.equal(await one("vbCalHijri"), "1");
});

test("定数280件: リファレンス自項目の到達性（D-05）と値文面の一致", () => {
  const merged = [...vba.reference];
  const seen = new Set(merged.map((r) => r.name.toLowerCase()));
  for (const r of referenceAdvanced) if (!seen.has(r.name.toLowerCase())) { merged.push(r); seen.add(r.name.toLowerCase()); }
  const refSearchText = (r) => {
    let parts = [r.name, r.category, r.description, r.syntax];
    if (Array.isArray(r.inventoryNames)) parts.push(...r.inventoryNames);
    if (typeof r.scan === "string") parts.push(r.scan);
    return parts.filter((x) => typeof x === "string").join(" ").toLowerCase();
  };
  for (const [name, [expected, kind, ownName]] of Object.entries(EXPECTED)) {
    const item = merged.find((r) => r.name === ownName);
    assert.ok(item, `${name}: 自項目 ${ownName} が存在すること`);
    assert.ok(refSearchText(item).includes(name.toLowerCase()), `${name}: メンバー名クエリで自項目に到達すること`);
    if (kind === "number") {
      const text = [item.description, item.caution, item.returns].filter(Boolean).join(" ");
      for (const m of text.matchAll(/数値定数（(-?\d+)）/g)) assert.equal(parseInt(m[1]), expected, `${name}: 文面の数値定数表記`);
      for (const m of text.matchAll(/定数自体の値は\s*(-?\d+)/g)) assert.equal(parseInt(m[1]), expected, `${name}: 文面の値表記`);
      for (const m of text.matchAll(/10進数では\s*(-?\d+)/g)) assert.equal(parseInt(m[1]), expected, `${name}: 文面の10進表記`);
    }
  }
});

test("同名衝突メンバー（Dir系 vb* と FSO系 接頭辞なし）の値一致", async () => {
  const one = async (expr) => (await runLines([`Debug.Print ${expr}`]))[0];
  for (const base of ["Normal","ReadOnly","Hidden","System","Volume","Directory","Archive","Alias"]) {
    assert.equal(await one("vb" + base), await one(base), `${base} の衝突解決`);
  }
});
