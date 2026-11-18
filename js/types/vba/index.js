import {
  templates,
  reference,
  glossary,
  usedReferences,
  registerReferenceNames,
} from "../../content.js";
import { lex, display } from "../../engine.js";
for (const r of reference) {
  if (["LBound","UBound"].includes(r.name)) r.example = "Dim items(2) As String\n" + r.example;
  if (r.name === "Next") r.example = "For i = 1 To 3\n    Debug.Print i\nNext i";
  if (r.name === "Exit Do") r.example = "Do\n    Exit Do\nLoop";
}
export const definition = {
  id: "vba",
  name: "Excel VBA",
  extensions: [".bas", ".cls", ".frm", ".vba", ".txt"],
  syntax: {
    name: "VBA",
    caseSensitive: false,
    lineComment: "'",
    blockKeywords: ["If", "Select Case", "For", "Do"],
  },
  reference,
  templates,
  glossary,
  model: {
    kind: "sheet",
    title: "モデルシート",
    hint: "値を編集できます。「?」は未確定、空欄はEmpty。文字列を数値と区別するには先頭に ' を付けます。",
    defaults: {
      A1: "商品",
      B1: "点数",
      C1: "判定",
      A2: "りんご",
      B2: 85,
      A3: "みかん",
      B3: 60,
      A4: "ぶどう",
      B4: 45,
    },
  },
  semantics: {
    description:
      "単一シート A1:C5 に対するVBAの部分意味論。Variantと宣言型、配列、分岐、ループ、実行時エラーを区別します。",
    support:
      "単一Sub、Dim、代入、If / ElseIf / Else、Select Case、For / For Each、Do、Exit、固定1次元配列、On Error Resume Next / GoTo 0。未対応：複数シート・外部ブック・With・GoToラベル・1行If・動的配列の要素参照・ReDim（宣言のみ対応）・未確定Step・非線形条件など。",
    sources: [
      {
        title: "Microsoft VBA言語リファレンス",
        url: "https://learn.microsoft.com/office/vba/language/reference/user-interface-help/visual-basic-language-reference",
      },
    ],
  },
  scan(code) {
    try {
      return usedReferences(lex(code));
    } catch {
      return [];
    }
  },
  async simulate(code, model, limits) {
    const { simulate } = await import("../../engine.js");
    let r = simulate(code, model, limits);
    // P-N4: 使用関数解決はパス列挙の後処理で、エンジンの時間上限の対象外
    // だった。トレースの tokens は文ごとに同じ内容が繰り返される
    // （分岐時の structuredClone で配列の同一性は失われる）ため、内容を
    // キーに解決結果を再利用し、後処理の総量を「相異なる文の数」に
    // 比例する量まで圧縮する（トレース件数には比例させない）。
    const refsCache = new Map();
    for (let p of r.paths) {
      for (let t of p.trace) {
        const tokens = t.tokens || [];
        const key = tokens.map((x) => x.type + ":" + x.v).join("\u0001");
        let refs = refsCache.get(key);
        if (!refs) {
          refs = usedReferences(tokens);
          refsCache.set(key, refs);
        }
        t.refs = refs;
      }
      p.groups = [
        {
          title: "変数",
          entries: Object.entries(p.vars).map(([k, v]) => [k, display(v)]),
        },
        {
          title: "セルの変化",
          entries: p.changes.map(([k, v]) => [k, display(v)]),
        },
      ];
    }
    return r;
  },
};

["基礎", "基礎", "基礎", "実践", "実践", "実践", "応用", "応用"].forEach((level, i) => { definition.templates[i].level = level; });

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);

import { referenceAdvancedNames } from "./reference-advanced-names.js";
// A4-V-D06-1: 高度項目名（referenceAdvanced／referenceOverrides の全名）を
// usedReferences の照合表へ登録し、高度関数・定数グループ項目が使用中
// チップに解決されるようにする。簡易モードでは実効カタログに高度項目が
// 無いため、refs に高度名が混ざっても app.js の usedTraceNames／
// resolveReferenceName が落とし、表示は変わらない。
// 登録から除く名前（12件）：
// ・「#」を含む項目（Print #／Input # 等のファイル入出力文）: 字句解析器
//   自身が # を未対応として停止するため、受理されるコードのトークン列に
//   現れ得ない。ピース化すると "print" 等に化けて Debug.Print や同名の
//   変数へ誤って一致するため、登録しない。
// ・「...」を含む項目（Do...Loop 等の句項目）: ピースに "." が連続して
//   実際のトークン列と一致し得ない。対象の文自体は基礎項目（Do／For 等）
//   で解決される。
// 収束ラウンド横断班 SP-21 修正：項目データ本体（reference-advanced.js）は
// ローダーによる遅延読み込みの対象（契約 7.1）であり、静的 import すると
// 簡易モードでもダウンロードされてしまうため、ここでは名前だけの照合表
// （reference-advanced-names.js）から登録する。あわせて A4-F-04 の caution
// 開示（VarType／TypeName／Hex／Oct）は reference-advanced.js の項目データ
// 側へ移した（開示文の内容は同一）。
registerReferenceNames(
  referenceAdvancedNames.filter((n) => !n.includes("#") && !n.includes("...")),
);
// A4-V-到達1: 基礎定数項目へ、棚卸し（inventory-vba.md）のフルネーム
// 「グループ名.メンバー名」を検索用メタデータ inventoryNames として
// 付与し、フルネーム検索で自項目へ到達できるようにする。項目名・表示名
// は変えない。対応表は棚卸しの記載を正として転記したもの。
const VBA_CONSTANT_FULLNAMES = {
  "vbAbort": "VbMsgBoxResult.vbAbort",
  "vbAbortRetryIgnore": "VbMsgBoxStyle.vbAbortRetryIgnore",
  "vbAlias": "DirGetAttrSetAttrConstants.vbAlias",
  "vbAppTaskManager": "VbQueryClose.vbAppTaskManager",
  "vbAppWindows": "VbQueryClose.vbAppWindows",
  "vbApplicationModal": "VbMsgBoxStyle.vbApplicationModal",
  "vbArchive": "DirGetAttrSetAttrConstants.vbArchive",
  "vbArray": "VbVarType.vbArray",
  "vbBack": "Constants.vbBack",
  "vbBinaryCompare": "VbCompareMethod.vbBinaryCompare",
  "vbBlack": "ColorConstants.vbBlack",
  "vbBlue": "ColorConstants.vbBlue",
  "vbBoolean": "VbVarType.vbBoolean",
  "vbByte": "VbVarType.vbByte",
  "vbCalGreg": "VbCalendar.vbCalGreg",
  "vbCalHijri": "VbCalendar.vbCalHijri",
  "vbCancel": "VbMsgBoxResult.vbCancel",
  "vbCr": "Constants.vbCr",
  "vbCrLf": "Constants.vbCrLf",
  "vbCritical": "VbMsgBoxStyle.vbCritical",
  "vbCurrency": "VbVarType.vbCurrency",
  "vbCyan": "ColorConstants.vbCyan",
  "vbDataObject": "VbVarType.vbDataObject",
  "vbDatabaseCompare": "VbCompareMethod.vbDatabaseCompare",
  "vbDate": "VbVarType.vbDate",
  "vbDecimal": "VbVarType.vbDecimal",
  "vbDefaultButton1": "VbMsgBoxStyle.vbDefaultButton1",
  "vbDefaultButton2": "VbMsgBoxStyle.vbDefaultButton2",
  "vbDefaultButton3": "VbMsgBoxStyle.vbDefaultButton3",
  "vbDefaultButton4": "VbMsgBoxStyle.vbDefaultButton4",
  "vbDirectory": "DirGetAttrSetAttrConstants.vbDirectory",
  "vbDouble": "VbVarType.vbDouble",
  "vbEmpty": "VbVarType.vbEmpty",
  "vbError": "VbVarType.vbError",
  "vbExclamation": "VbMsgBoxStyle.vbExclamation",
  "vbFalse": "VbTriState.vbFalse",
  "vbFirstFourDays": "VbFirstWeekOfYear.vbFirstFourDays",
  "vbFirstFullWeek": "VbFirstWeekOfYear.vbFirstFullWeek",
  "vbFirstJan1": "VbFirstWeekOfYear.vbFirstJan1",
  "vbFormCode": "VbQueryClose.vbFormCode",
  "vbFormControlMenu": "VbQueryClose.vbFormControlMenu",
  "vbFormFeed": "Constants.vbFormFeed",
  "vbFriday": "VbDayOfWeek.vbFriday",
  "vbFromUnicode": "VbStrConv.vbFromUnicode",
  "vbGeneralDate": "VbDateTimeFormat.vbGeneralDate",
  "vbGet": "VbCallType.vbGet",
  "vbGreen": "ColorConstants.vbGreen",
  "vbHidden": "DirGetAttrSetAttrConstants.vbHidden",
  "vbHide": "VbAppWinStyle.vbHide",
  "vbHiragana": "VbStrConv.vbHiragana",
  "vbIMEModeAlpha": "VbIMEStatus.vbIMEModeAlpha",
  "vbIMEModeAlphaFull": "VbIMEStatus.vbIMEModeAlphaFull",
  "vbIMEModeDisable": "VbIMEStatus.vbIMEModeDisable",
  "vbIMEModeHangul": "VbIMEStatus.vbIMEModeHangul",
  "vbIMEModeHangulFull": "VbIMEStatus.vbIMEModeHangulFull",
  "vbIMEModeHiragana": "VbIMEStatus.vbIMEModeHiragana",
  "vbIMEModeKatakana": "VbIMEStatus.vbIMEModeKatakana",
  "vbIMEModeKatakanaHalf": "VbIMEStatus.vbIMEModeKatakanaHalf",
  "vbIMEModeNoControl": "VbIMEStatus.vbIMEModeNoControl",
  "vbIMEModeOff": "VbIMEStatus.vbIMEModeOff",
  "vbIMEModeOn": "VbIMEStatus.vbIMEModeOn",
  "vbIgnore": "VbMsgBoxResult.vbIgnore",
  "vbInformation": "VbMsgBoxStyle.vbInformation",
  "vbInteger": "VbVarType.vbInteger",
  "vbKatakana": "VbStrConv.vbKatakana",
  "vbKey0": "KeyCodeConstants.vbKey0",
  "vbKey1": "KeyCodeConstants.vbKey1",
  "vbKey2": "KeyCodeConstants.vbKey2",
  "vbKey3": "KeyCodeConstants.vbKey3",
  "vbKey4": "KeyCodeConstants.vbKey4",
  "vbKey5": "KeyCodeConstants.vbKey5",
  "vbKey6": "KeyCodeConstants.vbKey6",
  "vbKey7": "KeyCodeConstants.vbKey7",
  "vbKey8": "KeyCodeConstants.vbKey8",
  "vbKey9": "KeyCodeConstants.vbKey9",
  "vbKeyA": "KeyCodeConstants.vbKeyA",
  "vbKeyAdd": "KeyCodeConstants.vbKeyAdd",
  "vbKeyB": "KeyCodeConstants.vbKeyB",
  "vbKeyBack": "KeyCodeConstants.vbKeyBack",
  "vbKeyC": "KeyCodeConstants.vbKeyC",
  "vbKeyCancel": "KeyCodeConstants.vbKeyCancel",
  "vbKeyCapital": "KeyCodeConstants.vbKeyCapital",
  "vbKeyClear": "KeyCodeConstants.vbKeyClear",
  "vbKeyControl": "KeyCodeConstants.vbKeyControl",
  "vbKeyD": "KeyCodeConstants.vbKeyD",
  "vbKeyDecimal": "KeyCodeConstants.vbKeyDecimal",
  "vbKeyDelete": "KeyCodeConstants.vbKeyDelete",
  "vbKeyDivide": "KeyCodeConstants.vbKeyDivide",
  "vbKeyDown": "KeyCodeConstants.vbKeyDown",
  "vbKeyE": "KeyCodeConstants.vbKeyE",
  "vbKeyEnd": "KeyCodeConstants.vbKeyEnd",
  "vbKeyEscape": "KeyCodeConstants.vbKeyEscape",
  "vbKeyExecute": "KeyCodeConstants.vbKeyExecute",
  "vbKeyF": "KeyCodeConstants.vbKeyF",
  "vbKeyF1": "KeyCodeConstants.vbKeyF1",
  "vbKeyF10": "KeyCodeConstants.vbKeyF10",
  "vbKeyF11": "KeyCodeConstants.vbKeyF11",
  "vbKeyF12": "KeyCodeConstants.vbKeyF12",
  "vbKeyF13": "KeyCodeConstants.vbKeyF13",
  "vbKeyF14": "KeyCodeConstants.vbKeyF14",
  "vbKeyF15": "KeyCodeConstants.vbKeyF15",
  "vbKeyF16": "KeyCodeConstants.vbKeyF16",
  "vbKeyF2": "KeyCodeConstants.vbKeyF2",
  "vbKeyF3": "KeyCodeConstants.vbKeyF3",
  "vbKeyF4": "KeyCodeConstants.vbKeyF4",
  "vbKeyF5": "KeyCodeConstants.vbKeyF5",
  "vbKeyF6": "KeyCodeConstants.vbKeyF6",
  "vbKeyF7": "KeyCodeConstants.vbKeyF7",
  "vbKeyF8": "KeyCodeConstants.vbKeyF8",
  "vbKeyF9": "KeyCodeConstants.vbKeyF9",
  "vbKeyG": "KeyCodeConstants.vbKeyG",
  "vbKeyH": "KeyCodeConstants.vbKeyH",
  "vbKeyHelp": "KeyCodeConstants.vbKeyHelp",
  "vbKeyHome": "KeyCodeConstants.vbKeyHome",
  "vbKeyI": "KeyCodeConstants.vbKeyI",
  "vbKeyInsert": "KeyCodeConstants.vbKeyInsert",
  "vbKeyJ": "KeyCodeConstants.vbKeyJ",
  "vbKeyK": "KeyCodeConstants.vbKeyK",
  "vbKeyL": "KeyCodeConstants.vbKeyL",
  "vbKeyLButton": "KeyCodeConstants.vbKeyLButton",
  "vbKeyLeft": "KeyCodeConstants.vbKeyLeft",
  "vbKeyM": "KeyCodeConstants.vbKeyM",
  "vbKeyMButton": "KeyCodeConstants.vbKeyMButton",
  "vbKeyMenu": "KeyCodeConstants.vbKeyMenu",
  "vbKeyMultiply": "KeyCodeConstants.vbKeyMultiply",
  "vbKeyN": "KeyCodeConstants.vbKeyN",
  "vbKeyNumlock": "KeyCodeConstants.vbKeyNumlock",
  "vbKeyNumpad0": "KeyCodeConstants.vbKeyNumpad0",
  "vbKeyNumpad1": "KeyCodeConstants.vbKeyNumpad1",
  "vbKeyNumpad2": "KeyCodeConstants.vbKeyNumpad2",
  "vbKeyNumpad3": "KeyCodeConstants.vbKeyNumpad3",
  "vbKeyNumpad4": "KeyCodeConstants.vbKeyNumpad4",
  "vbKeyNumpad5": "KeyCodeConstants.vbKeyNumpad5",
  "vbKeyNumpad6": "KeyCodeConstants.vbKeyNumpad6",
  "vbKeyNumpad7": "KeyCodeConstants.vbKeyNumpad7",
  "vbKeyNumpad8": "KeyCodeConstants.vbKeyNumpad8",
  "vbKeyNumpad9": "KeyCodeConstants.vbKeyNumpad9",
  "vbKeyO": "KeyCodeConstants.vbKeyO",
  "vbKeyP": "KeyCodeConstants.vbKeyP",
  "vbKeyPageDown": "KeyCodeConstants.vbKeyPageDown",
  "vbKeyPageUp": "KeyCodeConstants.vbKeyPageUp",
  "vbKeyPause": "KeyCodeConstants.vbKeyPause",
  "vbKeyPrint": "KeyCodeConstants.vbKeyPrint",
  "vbKeyQ": "KeyCodeConstants.vbKeyQ",
  "vbKeyR": "KeyCodeConstants.vbKeyR",
  "vbKeyRButton": "KeyCodeConstants.vbKeyRButton",
  "vbKeyReturn": "KeyCodeConstants.vbKeyReturn",
  "vbKeyRight": "KeyCodeConstants.vbKeyRight",
  "vbKeyS": "KeyCodeConstants.vbKeyS",
  "vbKeySelect": "KeyCodeConstants.vbKeySelect",
  "vbKeySeparator": "KeyCodeConstants.vbKeySeparator",
  "vbKeyShift": "KeyCodeConstants.vbKeyShift",
  "vbKeySnapshot": "KeyCodeConstants.vbKeySnapshot",
  "vbKeySpace": "KeyCodeConstants.vbKeySpace",
  "vbKeySubtract": "KeyCodeConstants.vbKeySubtract",
  "vbKeyT": "KeyCodeConstants.vbKeyT",
  "vbKeyTab": "KeyCodeConstants.vbKeyTab",
  "vbKeyU": "KeyCodeConstants.vbKeyU",
  "vbKeyUp": "KeyCodeConstants.vbKeyUp",
  "vbKeyV": "KeyCodeConstants.vbKeyV",
  "vbKeyW": "KeyCodeConstants.vbKeyW",
  "vbKeyX": "KeyCodeConstants.vbKeyX",
  "vbKeyY": "KeyCodeConstants.vbKeyY",
  "vbKeyZ": "KeyCodeConstants.vbKeyZ",
  "vbLet": "VbCallType.vbLet",
  "vbLf": "Constants.vbLf",
  "vbLong": "VbVarType.vbLong",
  "vbLongDate": "VbDateTimeFormat.vbLongDate",
  "vbLongLong": "VbVarType.vbLongLong",
  "vbLongTime": "VbDateTimeFormat.vbLongTime",
  "vbLowerCase": "VbStrConv.vbLowerCase",
  "vbMagenta": "ColorConstants.vbMagenta",
  "vbMaximizedFocus": "VbAppWinStyle.vbMaximizedFocus",
  "vbMethod": "VbCallType.vbMethod",
  "vbMinimizedFocus": "VbAppWinStyle.vbMinimizedFocus",
  "vbMinimizedNoFocus": "VbAppWinStyle.vbMinimizedNoFocus",
  "vbModal": "FormShowConstants.vbModal",
  "vbModeless": "FormShowConstants.vbModeless",
  "vbMonday": "VbDayOfWeek.vbMonday",
  "vbMsgBoxHelpButton": "VbMsgBoxStyle.vbMsgBoxHelpButton",
  "vbMsgBoxRight": "VbMsgBoxStyle.vbMsgBoxRight",
  "vbMsgBoxRtlReading": "VbMsgBoxStyle.vbMsgBoxRtlReading",
  "vbMsgBoxSetForeground": "VbMsgBoxStyle.vbMsgBoxSetForeground",
  "vbNarrow": "VbStrConv.vbNarrow",
  "vbNewLine": "Constants.vbNewLine",
  "vbNo": "VbMsgBoxResult.vbNo",
  "vbNormal": "DirGetAttrSetAttrConstants.vbNormal",
  "vbNormalFocus": "VbAppWinStyle.vbNormalFocus",
  "vbNormalNoFocus": "VbAppWinStyle.vbNormalNoFocus",
  "vbNull": "VbVarType.vbNull",
  "vbNullChar": "Constants.vbNullChar",
  "vbNullString": "Constants.vbNullString",
  "vbOK": "VbMsgBoxResult.vbOK",
  "vbOKCancel": "VbMsgBoxStyle.vbOKCancel",
  "vbOKOnly": "VbMsgBoxStyle.vbOKOnly",
  "vbObject": "VbVarType.vbObject",
  "vbObjectError": "Constants.vbObjectError",
  "vbProperCase": "VbStrConv.vbProperCase",
  "vbQuestion": "VbMsgBoxStyle.vbQuestion",
  "vbReadOnly": "DirGetAttrSetAttrConstants.vbReadOnly",
  "vbRed": "ColorConstants.vbRed",
  "vbRetry": "VbMsgBoxResult.vbRetry",
  "vbRetryCancel": "VbMsgBoxStyle.vbRetryCancel",
  "vbSaturday": "VbDayOfWeek.vbSaturday",
  "vbSet": "VbCallType.vbSet",
  "vbShortDate": "VbDateTimeFormat.vbShortDate",
  "vbShortTime": "VbDateTimeFormat.vbShortTime",
  "vbSingle": "VbVarType.vbSingle",
  "vbString": "VbVarType.vbString",
  "vbSunday": "VbDayOfWeek.vbSunday",
  "vbSystem": "DirGetAttrSetAttrConstants.vbSystem",
  "vbSystemModal": "VbMsgBoxStyle.vbSystemModal",
  "vbTab": "Constants.vbTab",
  "vbTextCompare": "VbCompareMethod.vbTextCompare",
  "vbThursday": "VbDayOfWeek.vbThursday",
  "vbTrue": "VbTriState.vbTrue",
  "vbTuesday": "VbDayOfWeek.vbTuesday",
  "vbUnicode": "VbStrConv.vbUnicode",
  "vbUpperCase": "VbStrConv.vbUpperCase",
  "vbUseCompareOption": "VbCompareMethod.vbUseCompareOption",
  "vbUseDefault": "VbTriState.vbUseDefault",
  "vbUseSystem": "VbDayOfWeek.vbUseSystem",
  "vbUseSystemDayOfWeek": "VbFirstWeekOfYear.vbUseSystemDayOfWeek",
  "vbUserDefinedType": "VbVarType.vbUserDefinedType",
  "vbVariant": "VbVarType.vbVariant",
  "vbVerticalTab": "Constants.vbVerticalTab",
  "vbVolume": "DirGetAttrSetAttrConstants.vbVolume",
  "vbWednesday": "VbDayOfWeek.vbWednesday",
  "vbWhite": "ColorConstants.vbWhite",
  "vbWide": "VbStrConv.vbWide",
  "vbYellow": "ColorConstants.vbYellow",
  "vbYes": "VbMsgBoxResult.vbYes",
  "vbYesNo": "VbMsgBoxStyle.vbYesNo",
  "vbYesNoCancel": "VbMsgBoxStyle.vbYesNoCancel",
};
for (const r of reference) {
  const full = VBA_CONSTANT_FULLNAMES[r.name];
  if (full) r.inventoryNames = [...(r.inventoryNames || []), full];
}
