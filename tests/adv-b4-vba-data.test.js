import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { referenceAdvanced, referenceOverrides } from "../js/types/vba/reference-advanced.js";
import { templatesAdvanced } from "../js/types/vba/templates-advanced.js";
import { glossaryAdvanced } from "../js/types/vba/glossary-advanced.js";
import { reference as baseReference, glossary as baseGlossary } from "../js/content.js";

// ADV-B4 VBAデータ班テスト。
// 期待名リストは棚卸し正本 inventory-vba.md の「未収録」＋「参照のみ」行から
// 機械抽出して埋め込んだもの（関数102＝未収録94＋参照のみ8、
// ステートメント65＝未収録63＋参照のみ2、定数46＝未収録46）。
//
// 統合時の契約適合（コーディネーター）：
// - 項目形式はモード機構の確定契約（advanced-interface.md 第4章）に合わせ、
//   supported／reason フィールドを廃止した（状態は status のみ、理由は
//   description へ畳み込み）。
// - 基礎項目の変更は referenceOverrides 経由に一本化した（参照のみ10件は
//   referenceAdvanced でなく referenceOverrides に置く。素の名前重複は
//   契約違反）。
// - Error／Seek は関数と文で同名だが、カタログの照合キーは name のため
//   1項目に統合した（Error は関数の形が対応・文の形は caution で開示、
//   Seek は両形とも未対応）。合計は 213−2＝211件。
const EXPECTED_FUNCS = ["Asc", "Chr", "CVErr", "Format", "Hex", "Oct", "Str", "Atn", "Cos", "Exp", "Log", "Sgn", "Sin", "Sqr", "Tan", "CBool", "CByte", "CCur", "CDate", "CDec", "CLngLng", "CLngPtr", "CSng", "CVar", "CallByName", "Choose", "CreateObject", "DateAdd", "DateDiff", "DatePart", "DateSerial", "DateValue", "Day", "DDB", "Dir", "Environ", "EOF", "Error", "FileAttr", "FileDateTime", "FileLen", "Filter", "FormatCurrency", "FormatDateTime", "FormatNumber", "FormatPercent", "FV", "GetAllSettings", "GetAttr", "GetObject", "GetSetting", "Hour", "IIf", "Input", "InStrRev", "IPmt", "IRR", "IsArray", "IsDate", "IsError", "IsMissing", "IsObject", "Join", "Loc", "LOF", "LTrim", "RTrim", "MacID", "MacScript", "Minute", "MIRR", "Month", "MonthName", "NPer", "NPV", "Partition", "Pmt", "PPmt", "PV", "QBColor", "Rate", "RGB", "Second", "Seek", "Shell", "SLN", "Space", "Spc", "Split", "StrComp", "StrConv", "StrReverse", "Switch", "SYD", "Tab", "TimeSerial", "TimeValue", "TypeName", "VarType", "Weekday", "WeekdayName", "Year"];
const EXPECTED_STMTS = ["AppActivate", "Beep", "Call", "ChDir", "ChDrive", "Close", "Const", "Declare", "Deftype", "DeleteSetting", "Do...Loop", "End", "Enum", "Erase", "Error", "Event", "Exit", "FileCopy", "For Each...Next", "For...Next", "Function", "Get", "GoSub...Return", "GoTo", "If...Then...Else", "Implements", "Input #", "Kill", "Line Input #", "Load", "Lock", "Unlock", "LSet", "MkDir", "Name", "On...GoSub, On...GoTo", "Open", "Option Compare", "Option Private", "Print #", "Private", "Property Get", "Property Let", "Property Set", "Public", "Put", "RaiseEvent", "Randomize", "ReDim", "Reset", "Resume", "RmDir", "RSet", "SaveSetting", "Seek", "SendKeys", "SetAttr", "Static", "Stop", "Type", "Unload", "While...Wend", "Width #", "With", "Write #"];
const EXPECTED_CONSTS = ["DriveTypeConstants.CDROM", "DriveTypeConstants.Fixed", "DriveTypeConstants.RAMDisk", "DriveTypeConstants.Remote", "DriveTypeConstants.Removable", "DriveTypeConstants.Unknown", "FileAttributeConstants.Alias", "FileAttributeConstants.Archive", "FileAttributeConstants.Compressed", "FileAttributeConstants.Directory", "FileAttributeConstants.Hidden", "FileAttributeConstants.Normal", "FileAttributeConstants.ReadOnly", "FileAttributeConstants.System", "FileAttributeConstants.Volume", "FileInputOutputConstants.ForAppending", "FileInputOutputConstants.ForReading", "FileInputOutputConstants.ForWriting", "SpecialFolderConstants.SystemFolder", "SpecialFolderConstants.TemporaryFolder", "SpecialFolderConstants.WindowsFolder", "SystemColorConstants.vb3DDKShadow", "SystemColorConstants.vb3DHighlight", "SystemColorConstants.vb3DLight", "SystemColorConstants.vbActiveBorder", "SystemColorConstants.vbActiveTitleBar", "SystemColorConstants.vbApplicationWorkspace", "SystemColorConstants.vbButtonFace", "SystemColorConstants.vbButtonShadow", "SystemColorConstants.vbButtonText", "SystemColorConstants.vbDesktop", "SystemColorConstants.vbGrayText", "SystemColorConstants.vbHighlight", "SystemColorConstants.vbHighlightText", "SystemColorConstants.vbInactiveBorder", "SystemColorConstants.vbInactiveCaptionText", "SystemColorConstants.vbInactiveTitleBar", "SystemColorConstants.vbInfoBackground", "SystemColorConstants.vbInfoText", "SystemColorConstants.vbMenuBar", "SystemColorConstants.vbMenuText", "SystemColorConstants.vbScrollBars", "SystemColorConstants.vbTitleBarText", "SystemColorConstants.vbWindowBackground", "SystemColorConstants.vbWindowFrame", "SystemColorConstants.vbWindowText"];
const EXPECTED_ALL = [...EXPECTED_FUNCS, ...EXPECTED_STMTS, ...EXPECTED_CONSTS];
const OVERRIDE_10 = ["CallByName", "Dir", "FormatDateTime", "GetAttr", "Shell", "StrConv", "VarType", "Weekday", "SetAttr", "Unload"];
const BASE_CATEGORIES = new Set(baseReference.map((r) => r.category));
const multiset = (arr) => {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return m;
};

const ALL_ITEMS = [...referenceAdvanced, ...referenceOverrides];
// 統合で Error／Seek の同名二重が各1件に減るため、期待側からも各1件を引く。
const EXPECTED_COMBINED = [...EXPECTED_ALL];
for (const n of ["Error", "Seek"]) EXPECTED_COMBINED.splice(EXPECTED_COMBINED.indexOf(n), 1);

test("adv-b4 vba-data: 全211件が漏れなく存在する（棚卸しとの多重集合一致）", () => {
  assert.equal(EXPECTED_ALL.length, 213);
  assert.equal(referenceAdvanced.length, 201);
  assert.equal(referenceOverrides.length, 10);
  assert.equal(ALL_ITEMS.length, 211);
  assert.deepEqual(multiset(ALL_ITEMS.map((r) => r.name)), multiset(EXPECTED_COMBINED));
});

test("adv-b4 vba-data: 棚卸しファイル実物から機械抽出した名前とも一致する", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const invPath = join(here, "..", "..", "advanced-inventory", "inventory-vba.md");
  if (!existsSync(invPath)) return; // 棚卸しが同梱されない環境では埋め込みリストで担保
  const text = readFileSync(invPath, "utf8");
  const names = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells[3] === "未収録" || cells[3] === "参照のみ") names.push(cells[1]);
  }
  assert.equal(names.length, 213, "棚卸し側の抽出件数");
  const expected = [...names];
  for (const n of ["Error", "Seek"]) expected.splice(expected.indexOf(n), 1);
  assert.deepEqual(multiset(ALL_ITEMS.map((r) => r.name)), multiset(expected));
});

test("adv-b4 vba-data: スキーマ検証（契約の正規形・status・理由の畳み込み）", () => {
  const ALLOWED = new Set(["name", "category", "syntax", "description", "example", "caution", "status", "returns", "source"]);
  for (const r of ALL_ITEMS) {
    for (const f of ["name", "category", "syntax", "description", "example", "caution"])
      assert.equal(typeof r[f], "string", `${r.name}.${f} は文字列`);
    for (const k of Object.keys(r)) assert.ok(ALLOWED.has(k), `${r.name}: 契約外フィールド ${k}`);
    assert.ok(r.name.length > 0 && r.syntax.length > 0 && r.description.length > 0, r.name);
    assert.ok(r.example.length > 0, `${r.name}.example は非空`);
    assert.ok(BASE_CATEGORIES.has(r.category), `${r.name}.category=${r.category} は基礎カテゴリ慣行の範囲`);
    assert.ok(["supported", "unsupported", "unverified"].includes(r.status), `${r.name}.status`);
    if (r.status === "unsupported") assert.ok(r.description.includes("【未対応の理由】"), `${r.name}: 理由が description に無い`);
    if (r.status === "unverified") assert.ok(r.description.includes("【未検証の理由】"), `${r.name}: 理由が description に無い`);
  }
});

test("adv-b4 vba-data: ステータス内訳は 対応132／未対応79／未検証0", () => {
  // 未対応は統合前81件から Error 文・Seek 文の統合で各1件減り79件。
  const count = (s) => ALL_ITEMS.filter((r) => r.status === s).length;
  assert.equal(count("supported"), 132);
  assert.equal(count("unsupported"), 79);
  assert.equal(count("unverified"), 0);
});

test("adv-b4 vba-data: 名前の重複なし。Error／Seek は関数・文を統合した1項目", () => {
  const m = multiset(ALL_ITEMS.map((r) => r.name));
  const dups = [...m.entries()].filter(([, c]) => c > 1);
  assert.deepEqual(dups, []);
  const err = ALL_ITEMS.find((r) => r.name === "Error");
  assert.equal(err.status, "supported", "Error は関数の形が対応");
  assert.ok(err.syntax.includes("／"), "Error の syntax は関数の形と文の形を併記");
  assert.ok(err.caution.includes("文として使う形"), "Error の文の形の未対応を caution で開示");
  const seek = ALL_ITEMS.find((r) => r.name === "Seek");
  assert.equal(seek.status, "unsupported", "Seek は両形とも未対応");
  assert.ok(seek.syntax.includes("／"), "Seek の syntax は関数の形と文の形を併記");
});

test("adv-b4 vba-data: 基礎との重なりは referenceOverrides の10件だけ（素の重複なし）", () => {
  const baseNames = new Set(baseReference.map((r) => r.name));
  const overlap = [...new Set(referenceAdvanced.map((r) => r.name))].filter((n) => baseNames.has(n));
  assert.deepEqual(overlap, [], "referenceAdvanced に基礎と同名の項目を置かない（契約違反）");
  assert.deepEqual(referenceOverrides.map((r) => r.name).sort(), [...OVERRIDE_10].sort());
  for (const r of referenceOverrides) assert.ok(baseNames.has(r.name), `${r.name}: override の対象が基礎に実在する`);
});

test("adv-b4 vba-data: 定数46件はメンバー名単位で全件 supported", () => {
  const consts = referenceAdvanced.filter((r) => r.category === "定数");
  assert.equal(consts.length, 46);
  assert.deepEqual(multiset(consts.map((r) => r.name)), multiset(EXPECTED_CONSTS));
  for (const r of consts) {
    assert.equal(r.status, "supported", r.name);
    assert.match(r.name, /^[A-Za-z]+Constants\.[A-Za-z0-9]+$/, r.name);
    assert.ok(r.description.includes("値"), `${r.name}: description に値を含む`);
  }
});

test("adv-b4 vba-data: テンプレート5件の形式と使用項目の範囲", () => {
  assert.equal(templatesAdvanced.length, 5);
  // 合成カタログ：基礎 → referenceOverrides で差し替え → referenceAdvanced を追加
  const byName = new Map();
  for (const r of baseReference) byName.set(r.name, r);
  for (const r of referenceOverrides) byName.set(r.name, r);
  for (const r of referenceAdvanced) byName.set(r.name, r);
  const effStatus = (r) => r.status ?? (r.supported === false ? "unsupported" : "supported");
  const ids = new Set();
  for (const t of templatesAdvanced) {
    assert.ok(t.id && !ids.has(t.id), "id 一意");
    ids.add(t.id);
    for (const f of ["title", "code", "intro"]) assert.ok(typeof t[f] === "string" && t[f].length > 0, `${t.id}.${f}`);
    assert.ok(Array.isArray(t.refs) && t.refs.length > 0, `${t.id}.refs`);
    for (const ref of t.refs) assert.ok(byName.has(ref), `${t.id}.refs: ${ref} は基礎＋高度のいずれかに存在`);
    // コード中の識別子が既知のリファレンス名に一致するものは、すべて supported であること
    // （End Sub の End／Sub はプロシージャの終端・開始の構文であり、End 文そのものではないため除外）
    const idents = new Set(t.code.match(/[A-Za-z][A-Za-z0-9]*/g) || []);
    for (const id of idents) {
      if (id === "End" || id === "Sub") continue;
      const hit = [...byName.values()].find((r) => r.name.toLowerCase() === id.toLowerCase());
      if (hit) assert.equal(effStatus(hit), "supported", `${t.id}: ${hit.name} は supported のものだけ使う`);
    }
  }
});

test("adv-b4 vba-data: 用語集は12件以上・基礎用語集と重複なし", () => {
  assert.ok(glossaryAdvanced.length >= 12);
  const baseTerms = new Set(baseGlossary.map((g) => g[0]));
  for (const pair of glossaryAdvanced) {
    assert.ok(Array.isArray(pair) && pair.length === 2, "用語集は [用語, 説明] の対");
    assert.ok(pair[0].length > 0 && pair[1].length > 0, pair[0]);
    assert.ok(!baseTerms.has(pair[0]), `${pair[0]} は基礎用語集と重複しない`);
  }
});

test("adv-b4 vba-data: registry 経由で VBA 定義が読み込める（既存配線を壊さない）", async () => {
  const { getDefinition } = await import("../js/types/registry.js");
  const vba = getDefinition("vba");
  assert.equal(vba.id, "vba");
  assert.ok(vba.reference.length >= 338);
});
