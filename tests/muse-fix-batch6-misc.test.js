import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ6（その他種班：CloudFormation／VBA／Power Automate）
// 対象：R27-N6／R27-N7／R27-N9（findings-round27 §2、findings-r27-f01a §3）
// 一次情報:
//  N6: AWS CloudFormation 公式ドキュメント（Fn::Transform は Name／
//      Parameters のオブジェクト、またはその配列でのみ指定できる）。
//      有無判定は RG-205 がトップレベルで確立した「キーの存在」基準。
//  N7: Microsoft 公式ドキュメントの各定数ページで所属列挙と値を確定した。
//      色＝Color constants（VbColor）、MsgBox＝MsgBox constants
//      （VbMsgBoxStyle／VbMsgBoxResult）、曜日・週＝Date constants
//      （VbDayOfWeek／VbFirstWeekOfYear）、TriState＝Tristate constants、
//      VarType＝VarType constants（VbVarType）、ファイル属性＝GetAttr
//      function（VbFileAttribute）、日付書式＝FormatDateTime function
//      （VbDateTimeFormat）、vbObjectError／vbBack＝Miscellaneous constants。
//  N9: 実 PAD では %変数% で始まる文字列は包み式ではなく解釈エラーになる
//      （RG-207 の包み解釈は、内側の変数名を裸で書く形が正規形）。

/* ---------------- N6: CloudFormation Fn::Transform falsy ---------------- */
const cf = getDefinition("cloudformation");
const cfRun = async (code) => cf.simulate(code, structuredClone(cf.model.defaults));
const FN_MSG = /Fn::Transformの指定にマクロ名（Name）が含まれていません/;
// 修正バッチ12・cfn班（RG-371／R33-N8）で期待値を更新: R27 時点では
// Fn::Transform 自体がスカラーの形も「Name が含まれていません」に一括して
// いたが、真因は指定がオブジェクトでないことであり、原因の切り分けとして
// 専用文言へ変更した。停止自体と Fn::Transform の名指しは維持し、検証は
// 完全一致へ厳密化（弱体化ではない）。空配列は要素が無く Name を含む指定が
// 存在しないため、従来文言（FN_MSG）のまま維持する。
const FN_SPEC_MSG = "Fn::Transformの指定がオブジェクトではありません（NameとParametersのオブジェクト、またはその配列で指定してください）";
const fnCase = (v) => JSON.stringify({ Resources: { A: { "Fn::Transform": v, B: 1 } } });

test("R27-N6 Fn::Transform falsy scalars stop with the Fn::Transform message", async () => {
  for (const v of ["", null, 0, false]) {
    const r = await cfRun(fnCase(v));
    assert.equal(r.error.message, FN_SPEC_MSG, JSON.stringify(v));
  }
});
test("R27-N6 Fn::Transform empty array stops with the Fn::Transform message", async () => {
  const r = await cfRun(fnCase([]));
  assert.match(r.error.message, FN_MSG);
});
test("R27-N6 Fn::Transform falsy in deep nesting and inside arrays stops", async () => {
  const deep = JSON.stringify({ Resources: { A: { P: { Q: { "Fn::Transform": "" } } } } });
  assert.equal((await cfRun(deep)).error.message, FN_SPEC_MSG);
  const inArr = JSON.stringify({ Resources: { A: [{ "Fn::Transform": null }] } });
  assert.equal((await cfRun(inArr)).error.message, FN_SPEC_MSG);
});
test("R27-N6 Fn::Transform falsy in YAML forms stops", async () => {
  assert.equal((await cfRun('Resources:\n  A:\n    Fn::Transform: ""\n    B: 1\n')).error.message, FN_SPEC_MSG);
  assert.equal((await cfRun("Resources:\n  A:\n    Fn::Transform:\n    B: 1\n")).error.message, FN_SPEC_MSG);
});
test("R27-N6 valid Fn::Transform forms keep working (unchanged)", async () => {
  const obj = await cfRun(fnCase({ Name: "AddMetadata", Parameters: { Stage: "test" } }));
  assert.ok(!obj.error, JSON.stringify(obj.error));
  const arr = await cfRun(fnCase([{ Name: "AddMetadata" }]));
  assert.ok(!arr.error, JSON.stringify(arr.error));
  const none = await cfRun(JSON.stringify({ Resources: { A: { B: 1 } } }));
  assert.ok(!none.error, JSON.stringify(none.error));
});
test("R27-N6 top-level empty Transform array stays accepted (RG-205 rule kept)", async () => {
  const r = await cfRun(JSON.stringify({ Transform: [], Resources: {} }));
  assert.ok(!r.error, JSON.stringify(r.error));
});

/* ---------------- N7: VBA 組み込み定数族の完成 ---------------- */
const vba = getDefinition("vba");
const vbaRun = async (code) => vba.simulate(code, structuredClone(vba.model.defaults));
const vbaOuts = async (code) => {
  const r = await vbaRun(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0].outputs.map((o) => o.text);
};
// Microsoft 公式ドキュメントで確定した値（名前→表示値）
const EXPECTED = {
  vbBlack: "0", vbRed: "255", vbGreen: "65280", vbYellow: "65535",
  vbBlue: "16711680", vbMagenta: "16711935", vbCyan: "16776960", vbWhite: "16777215",
  vbOKOnly: "0", vbOKCancel: "1", vbAbortRetryIgnore: "2", vbYesNoCancel: "3",
  vbYesNo: "4", vbRetryCancel: "5", vbCritical: "16", vbQuestion: "32",
  vbExclamation: "48", vbInformation: "64", vbDefaultButton1: "0",
  vbDefaultButton2: "256", vbDefaultButton3: "512", vbDefaultButton4: "768",
  vbApplicationModal: "0", vbSystemModal: "4096", vbMsgBoxHelpButton: "16384",
  vbMsgBoxSetForeground: "65536", vbMsgBoxRight: "524288", vbMsgBoxRtlReading: "1048576",
  vbOK: "1", vbCancel: "2", vbAbort: "3", vbRetry: "4", vbIgnore: "5", vbYes: "6", vbNo: "7",
  vbUseSystem: "0", vbUseSystemDayOfWeek: "0", vbSunday: "1", vbMonday: "2",
  vbTuesday: "3", vbWednesday: "4", vbThursday: "5", vbFriday: "6", vbSaturday: "7",
  vbFirstJan1: "1", vbFirstFourDays: "2", vbFirstFullWeek: "3",
  vbUseDefault: "-2", vbTrue: "-1", vbFalse: "0",
  vbEmpty: "0", vbNull: "1", vbInteger: "2", vbLong: "3", vbSingle: "4", vbDouble: "5",
  vbCurrency: "6", vbDate: "7", vbString: "8", vbObject: "9", vbError: "10",
  vbBoolean: "11", vbVariant: "12", vbDataObject: "13", vbDecimal: "14", vbByte: "17",
  vbLongLong: "20", vbUserDefinedType: "36", vbArray: "8192",
  vbObjectError: "-2147221504",
  vbGeneralDate: "0", vbLongDate: "1", vbShortDate: "2", vbLongTime: "3", vbShortTime: "4",
  vbNormal: "0", vbReadOnly: "1", vbHidden: "2", vbSystem: "4", vbVolume: "8",
  vbDirectory: "16", vbArchive: "32", vbAlias: "64",
};
test("R27-N7 all newly defined VBA constants return their documented values", async () => {
  const names = Object.keys(EXPECTED);
  assert.equal(names.length, 83); // 数値定数83件（＋文字列定数 vbBack で計84件を新規定義）
  for (const name of names)
    assert.deepEqual(await vbaOuts(`Debug.Print ${name}`), [EXPECTED[name]], name);
});
test("R27-N7 vbBack is the backspace character Chr(8)", async () => {
  assert.deepEqual(await vbaOuts("Debug.Print Len(vbBack)"), ["1"]);
  // Chr 関数はモデル未対応のため、連結長と非空であることで Chr(8) の1文字であることを固定する
  assert.deepEqual(await vbaOuts("Debug.Print Len(\"a\" & vbBack & \"b\"), vbBack = vbNullChar"), ["3, False"]);
});
test("R27-N7 If r = vbYes branches correctly (no silent Empty comparison)", async () => {
  const code = "r = 6\nIf r = vbYes Then\n Debug.Print \"yes\"\nElse\n Debug.Print \"no\"\nEnd If";
  assert.deepEqual(await vbaOuts(code), ["yes"]);
  const code2 = "r = 2\nIf r = vbYes Then\n Debug.Print \"yes\"\nElse\n Debug.Print \"no\"\nEnd If";
  assert.deepEqual(await vbaOuts(code2), ["no"]);
});
test("R27-N7 constants are defined under Option Explicit (no false-cause stop)", async () => {
  assert.deepEqual(await vbaOuts("Option Explicit\nDebug.Print vbYesNo"), ["4"]);
  assert.deepEqual(await vbaOuts("Option Explicit\nDebug.Print vbRed + vbSunday + vbArray"), ["8448"]);
});
test("R27-N7 constants work in arithmetic, concatenation and Select Case", async () => {
  assert.deepEqual(await vbaOuts("Debug.Print vbYesNo + vbQuestion"), ["36"]);
  assert.deepEqual(await vbaOuts("x = vbCritical\nSelect Case x\n Case vbCritical\n  Debug.Print \"crit\"\n Case Else\n  Debug.Print \"other\"\nEnd Select"), ["crit"]);
  assert.deepEqual(await vbaOuts("Debug.Print \"val=\" & vbYes"), ["val=6"]);
});
test("R27-N7 constant names are case-insensitive like other VBA constants", async () => {
  assert.deepEqual(await vbaOuts("Debug.Print VBYESNO, vbyes, VbReD"), ["4, 6, 255"]);
});

/* -------- N7 リファレンス項目化（新規84＋RG-204の10＝94件） -------- */
const NEW_ITEM_NAMES = [
  ...Object.keys(EXPECTED), "vbBack",
  "vbBinaryCompare", "vbTextCompare", "vbDatabaseCompare",
  "vbCr", "vbLf", "vbNewLine", "vbNullChar", "vbNullString", "vbFormFeed", "vbVerticalTab",
];
test("R27-N7 every defined constant has its own supported reference entry", () => {
  assert.equal(NEW_ITEM_NAMES.length, 94);
  assert.equal(vba.reference.length, 338, "91 + 94 (batch6 constants) + 141 (batch7 constants, R28-N9) + 12 (batch8 reference-only owners: 6 cfnvba + 6 vbasweep)");
  const byName = new Map(vba.reference.map((r) => [r.name, r]));
  for (const name of NEW_ITEM_NAMES) {
    const r = byName.get(name);
    assert.ok(r, name + " must exist as a reference entry");
    assert.equal(r.supported, true, name);
    for (const f of ["category", "syntax", "description", "example", "caution", "returns", "source"])
      assert.ok(typeof r[f] === "string" && r[f].length > 0, `${name}.${f}`);
  }
});
test("R27-N7 reference examples for the new constants run without error", async () => {
  const byName = new Map(vba.reference.map((r) => [r.name, r]));
  for (const name of NEW_ITEM_NAMES) {
    const r = await vbaRun(byName.get(name).example);
    assert.ok(!r.error && !r.paths[0].error, `${name}: ${JSON.stringify(r.error || r.paths[0].error)}`);
  }
});
const dumpsSorted = (fields) =>
  "{" + Object.keys(fields).sort().map((k) => `${JSON.stringify(k)}: ${JSON.stringify(fields[k])}`).join(", ") + "}";
const shaOf = (fields) => createHash("sha256").update(dumpsSorted(fields)).digest("hex");
test("R27-N7 reference-r2.json VBA rows are in sync with sha256 recomputed canonically", () => {
  const rows = JSON.parse(readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"));
  const vbaRows = rows.filter((r) => r.kind === "vba");
  assert.equal(vbaRows.length, vba.reference.length);
  const byName = new Map(vba.reference.map((r) => [r.name, r]));
  for (const name of NEW_ITEM_NAMES) {
    const row = vbaRows.find((r) => r.name === name);
    assert.ok(row, `r2 row missing: ${name}`);
    const ref = byName.get(name);
    for (const f of ["description", "returns", "caution", "example", "source"])
      assert.equal(row.fields[f], ref[f], `${name}.${f}`);
    assert.equal(row.sha256, shaOf(row.fields), `${name}: sha256`);
  }
});

/* ---------------- N9: Power Automate %変数% で始まる包み形 ---------------- */
const pa = getDefinition("powerautomate");
const paRun = async (actions) =>
  pa.simulate(JSON.stringify({ name: "f", actions }), structuredClone(pa.model.defaults));
const paErr = async (actions) => {
  const r = await paRun(actions);
  return r.error?.message || r.paths?.[0]?.error?.message || null;
};
const branch = (condition, setup = []) => [
  ...setup,
  { action: "If", condition },
  { action: "Display message", value: "yes" },
  { action: "Else" },
  { action: "Display message", value: "no" },
  { action: "End" },
];
const setN = (n) => [{ action: "Set variable", target: "N", value: n }];

test("R27-N9 If condition starting with %var% no longer silently mis-branches", async () => {
  // 3 + 1 > 3 は真だが、従来は剰余式に化けて Else 側へ流れていた
  assert.ok(await paErr(branch("%N% + 1 > 3%", setN(3))), "must stop, not branch");
  assert.ok(await paErr(branch("%N% - 1 > 1%", setN(3))), "must stop, not branch");
  const ab = [{ action: "Set variable", target: "A", value: 10 }, { action: "Set variable", target: "B", value: 3 }];
  assert.ok(await paErr(branch("%A% - %B% > 5%", ab)), "must stop, not branch");
});
test("R27-N9 Else if and Loop condition surfaces stop the same way", async () => {
  const elseifFlow = [
    ...setN(3),
    { action: "If", condition: "%N% > 100" },
    { action: "Display message", value: "big" },
    { action: "Else if", condition: "%N% + 1 > 3%" },
    { action: "Display message", value: "mid" },
    { action: "Else" },
    { action: "Display message", value: "small" },
    { action: "End" },
  ];
  assert.ok(await paErr(elseifFlow));
  const loopFlow = [
    ...setN(3),
    { action: "Loop condition", condition: "%N% + 1 > 3%" },
    { action: "Display message", value: "in" },
    { action: "End" },
  ];
  assert.ok(await paErr(loopFlow));
});
test("R27-N9 Set value starting with %var% stops naming the form (was silently 0)", async () => {
  const msg = await paErr([...setN(3), { action: "Set variable", target: "R", value: "%N% + 1%" }]);
  assert.match(msg, /%変数% で始まる文字列は式として解釈できません/);
  const msg2 = await paErr([...setN(3), { action: "Display message", value: "%N% + 1%" }]);
  assert.match(msg2, /%変数% で始まる文字列は式として解釈できません/);
});
test("R27-N9 genuine wrapped forms and %var% comparisons keep working (unchanged)", async () => {
  const outs = async (actions) => {
    const r = await paRun(actions);
    assert.ok(!r.error && !r.paths[0].error, JSON.stringify(r.error || r.paths[0].error));
    return r.paths[0].outputs.map((o) => o.text);
  };
  assert.deepEqual(await outs(branch("%N + 1 > 3%", setN(3))), ["yes"]);
  assert.deepEqual(await outs(branch("%4 / 2 > 0%")), ["yes"]);
  assert.deepEqual(await outs(branch("%N % 2 == 1%", setN(7))), ["yes"]);
  assert.deepEqual(await outs(branch("% ( %N% + 1 ) * 2 == 8 %", setN(3))), ["yes"]);
  const ab = [{ action: "Set variable", target: "A", value: 1 }, { action: "Set variable", target: "B", value: 1 }];
  assert.deepEqual(await outs(branch("%A% == %B%", ab)), ["yes"]);
  const r = await paRun([...setN(3), { action: "Set variable", target: "R", value: "%N + 1%" }]);
  assert.equal(r.paths[0].vars.R, 4);
  const single = await paRun([...setN(3), { action: "Set variable", target: "R", value: "%N%" }]);
  assert.equal(single.paths[0].vars.R, 3);
});
