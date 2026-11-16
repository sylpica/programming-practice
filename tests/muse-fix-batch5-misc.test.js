import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ5（その他言語班）: R26-N13／N14／N15／N17／N18
// 一次情報:
//  N13: Microsoft VBA-Docs「Miscellaneous constants」（vbCr／vbLf／
//       vbNewLine／vbNullChar／vbNullString／vbFormFeed／vbVerticalTab）と
//       VbCompareMethod（vbBinaryCompare=0／vbTextCompare=1／
//       vbDatabaseCompare=2）。
//  N14: AWS CloudFormation 公式ドキュメント（Transform はマクロ名／
//       その配列／Name・Parameters オブジェクトのみ）。
//  N15: Microsoft Learn Power Fx リファレンス（If は条件＋結果の組が
//       必須、Switch は末尾の単独引数を Default として受ける）。
//  N17: 値側の %…% 式記法（PAD）と条件側の解釈を揃える（アプリ内整合）。
//  N18: RG-02 と同型の表示矛盾是正（echo と最終状態の一致）。

/* ---------------- N13: VBA 比較定数・文字列定数 ---------------- */
const vba = getDefinition("vba");
const vbaRun = async (code) => vba.simulate(code, structuredClone(vba.model.defaults));
const vbaOuts = async (code) => {
  const r = await vbaRun(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  return r.paths[0].outputs.map((o) => o.text);
};

test("R26-N13 InStr with vbTextCompare finds case-insensitively", async () => {
  assert.deepEqual(await vbaOuts('Debug.Print InStr(1, "Excel", "C", vbTextCompare)'), ["3"]);
});
test("R26-N13 Replace with vbTextCompare replaces case-insensitively", async () => {
  assert.deepEqual(await vbaOuts('Debug.Print Replace("A-B", "a", "x", 1, -1, vbTextCompare)'), ["x-B"]);
});
test("R26-N13 vbBinaryCompare keeps case-sensitive comparison", async () => {
  assert.deepEqual(await vbaOuts('Debug.Print InStr(1, "Excel", "C", vbBinaryCompare)'), ["0"]);
  assert.deepEqual(await vbaOuts('Debug.Print InStr(1, "Excel", "c", vbBinaryCompare)'), ["3"]);
});
test("R26-N13 compare constants print as their numeric values", async () => {
  assert.deepEqual(await vbaOuts("Debug.Print vbBinaryCompare, vbTextCompare, vbDatabaseCompare"), ["0, 1, 2"]);
});
test("R26-N13 constants are defined under Option Explicit", async () => {
  assert.deepEqual(await vbaOuts("Option Explicit\nDebug.Print vbTextCompare"), ["1"]);
});
test("R26-N13 string constants of the same family are defined", async () => {
  assert.deepEqual(
    await vbaOuts("Debug.Print Len(vbCr), Len(vbLf), Len(vbNewLine), Len(vbNullChar), Len(vbNullString), Len(vbFormFeed), Len(vbVerticalTab)"),
    ["1, 1, 2, 1, 0, 1, 1"],
  );
  assert.deepEqual(await vbaOuts("Debug.Print vbCr & vbLf = vbCrLf"), ["True"]);
});
test("R26-N13 vbDatabaseCompare in InStr is error 5 (Excel behaviour)", async () => {
  assert.deepEqual(
    await vbaOuts('On Error Resume Next\nx = InStr(1, "Excel", "C", vbDatabaseCompare)\nDebug.Print Err.Number'),
    ["5"],
  );
});
test("R26-N13 numeric compare argument keeps working (unchanged)", async () => {
  assert.deepEqual(await vbaOuts('Debug.Print InStr(1, "Excel", "C", 1)'), ["3"]);
});

/* ---------------- N14: CloudFormation Transform 検証 ---------------- */
const cf = getDefinition("cloudformation");
const cfRun = async (code) => cf.simulate(code, structuredClone(cf.model.defaults));
const TRANSFORM_MSG = "Transformにはマクロ名またはNameとParametersのオブジェクトを指定してください";

test("R26-N14 Transform empty string stops naming Transform", async () => {
  const r = await cfRun(JSON.stringify({ Transform: "", Resources: {} }));
  assert.equal(r.error.message, TRANSFORM_MSG);
});
test("R26-N14 Transform null stops naming Transform", async () => {
  const r = await cfRun(JSON.stringify({ Transform: null, Resources: {} }));
  assert.equal(r.error.message, TRANSFORM_MSG);
});
test("R26-N14 YAML Transform empty / null stops naming Transform", async () => {
  assert.equal((await cfRun('Transform: ""\nResources: {}')).error.message, TRANSFORM_MSG);
  assert.equal((await cfRun("Transform:\nResources: {}")).error.message, TRANSFORM_MSG);
});
test("R26-N14 Transform false / 0 stop naming Transform", async () => {
  assert.equal((await cfRun(JSON.stringify({ Transform: false, Resources: {} }))).error.message, TRANSFORM_MSG);
  assert.equal((await cfRun(JSON.stringify({ Transform: 0, Resources: {} }))).error.message, TRANSFORM_MSG);
});
test("R26-N14 Transform array elements '' / null / number stop naming Transform", async () => {
  for (const t of [[""], [null], [123], ["", "AddMetadata"]]) {
    const r = await cfRun(JSON.stringify({ Transform: t, Resources: {} }));
    assert.equal(r.error.message, TRANSFORM_MSG, JSON.stringify(t));
  }
});
test("R26-N14 Transform object with empty / null Name stops naming Transform", async () => {
  for (const t of [{ Name: "" }, { Name: null }, { Name: 123 }, {}]) {
    const r = await cfRun(JSON.stringify({ Transform: t, Resources: {} }));
    assert.equal(r.error.message, TRANSFORM_MSG, JSON.stringify(t));
  }
});
test("R26-N14 empty Transform array stays accepted (no macros)", async () => {
  const r = await cfRun(JSON.stringify({ Transform: [], Resources: {} }));
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
});
// 修正バッチ12・cfn班（RG-371／R33-N8）で期待値を更新: R26 時点では
// Name の型違い（""／null／123）も「含まれていません」に一括していたが、
// Name キーが存在する形で「含まれていません」は虚偽の原因になるため、
// Name の型違いは Name を名指す文言へ切り分けた。Name の真の欠落（{}）は
// 従来文言のまま。検証は正規表現一致から完全一致へ厳密化（弱体化ではない）。
test("R26-N14 Fn::Transform empty / null Name stops naming Fn::Transform", async () => {
  for (const spec of [{ Name: "" }, { Name: null }, { Name: 123 }]) {
    const r = await cfRun(JSON.stringify({ Resources: { A: { "Fn::Transform": spec } } }));
    assert.equal(
      r.error.message,
      "Fn::TransformのNameは空でない文字列で指定してください（NameとParametersのオブジェクト、またはその配列で指定してください）",
      JSON.stringify(spec),
    );
  }
  const missing = await cfRun(JSON.stringify({ Resources: { A: { "Fn::Transform": {} } } }));
  assert.equal(
    missing.error.message,
    "Fn::Transformの指定にマクロ名（Name）が含まれていません（NameとParametersのオブジェクト、またはその配列で指定してください）",
  );
});
test("R26-N14 valid Transform forms keep working (unchanged)", async () => {
  for (const t of ["AddMetadata", ["AddMetadata"], { Name: "AddMetadata" }]) {
    const r = await cfRun(JSON.stringify({ Transform: t, Resources: {} }));
    assert.ok(!r.error, JSON.stringify(t) + ": " + JSON.stringify(r.error));
  }
  const r = await cfRun(JSON.stringify({ Resources: { A: { "Fn::Transform": { Name: "AddMetadata" } } } }));
  assert.ok(!r.error, JSON.stringify(r.error));
});

/* ---------------- N15: Power Fx If / Switch 最小引数 ---------------- */
const fx = getDefinition("powerapps");
const fxRun = async (code) => fx.simulate(code, structuredClone(fx.model.defaults));
const fxErr = async (code) => {
  const r = await fxRun(code);
  return (r.error ?? r.paths?.[0]?.error)?.message;
};
const fxR = async (code) => {
  const r = await fxRun(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  return r.paths[0].model.variables.R;
};

test("R26-N15 If() is an argument-count error", async () => {
  assert.equal(await fxErr("Set(R, If())"), "If の引数の数が正しくありません（2 個以上が必要です。空の引数は書けません）");
});
test("R26-N15 If(condition) alone is an argument-count error", async () => {
  assert.equal(await fxErr("Set(R, If(true))"), "If の引数の数が正しくありません（2 個以上が必要です。空の引数は書けません）");
});
test("R26-N15 bare If() / If(true) statements are argument-count errors", async () => {
  assert.match(await fxErr("If()"), /If の引数の数が正しくありません/);
  assert.match(await fxErr("If(true)"), /If の引数の数が正しくありません/);
});
test("R26-N15 If nested as a value is an argument-count error", async () => {
  assert.match(await fxErr("Notify(If(true))"), /If の引数の数が正しくありません/);
  assert.match(await fxErr("UpdateContext({R: If()})"), /If の引数の数が正しくありません/);
});
test("R26-N15 Switch() / Switch(value) are argument-count errors, not generic text", async () => {
  assert.equal(await fxErr("Set(R, Switch())"), "Switch の引数の数が正しくありません（2 個以上が必要です。空の引数は書けません）");
  assert.equal(await fxErr("Set(R, Switch(1))"), "Switch の引数の数が正しくありません（2 個以上が必要です。空の引数は書けません）");
  assert.match(await fxErr("Switch()"), /Switch の引数の数が正しくありません/);
});
test("R26-N15 Switch(value, default) keeps the Default interpretation", async () => {
  assert.equal(await fxR("Set(R, Switch(1, 1))"), 1);
  assert.equal(await fxR("Set(R, Switch(1, 2))"), 2);
  assert.equal(await fxR('Set(R, Text(Switch(1, "def")))'), "def");
});
test("R26-N15 normal If / Switch forms keep working (unchanged)", async () => {
  assert.equal(await fxR("Set(R, If(true, 42))"), 42);
  assert.equal(await fxR("Set(R, If(false, 1, false))"), false);
  assert.equal(await fxR("Set(R, If(false, 1, true, 2, 3))"), 2);
  assert.equal(await fxR('Set(R, Switch(2, 1, "a", "d"))'), "d");
  assert.equal(await fxR('Set(R, Switch(2, 1, "a"))'), null);
});

/* ---------------- N17: Power Automate %…% 条件 ---------------- */
const pa = getDefinition("powerautomate");
const paRun = async (actions) =>
  pa.simulate(JSON.stringify({ name: "f", actions }), structuredClone(pa.model.defaults));
const paOuts = async (actions) => {
  const r = await paRun(actions);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0].outputs.map((o) => o.text);
};
const branch = (condition, extra = []) => [
  { action: "If", condition },
  { action: "Display message", value: "yes" },
  { action: "Else" },
  { action: "Display message", value: "no" },
  { action: "End" },
  ...extra,
];

test("R26-N17 If condition wrapped in %...% evaluates arithmetic", async () => {
  assert.deepEqual(await paOuts(branch("%4 / 2 > 0%")), ["yes"]);
  assert.deepEqual(await paOuts(branch("%4 / 2 < 0%")), ["no"]);
});
test("R26-N17 Else if condition wrapped in %...% evaluates", async () => {
  const r = await paRun([
    { action: "Set variable", target: "N", value: 10 },
    { action: "If", condition: "%N% > 100" },
    { action: "Display message", value: "big" },
    { action: "Else if", condition: "%N / 2 == 5%" },
    { action: "Display message", value: "mid" },
    { action: "Else" },
    { action: "Display message", value: "small" },
    { action: "End" },
  ]);
  assert.deepEqual(r.paths[0].outputs.map((o) => o.text), ["mid"]);
});
test("R26-N17 wrapped condition with parentheses and %var% mix evaluates", async () => {
  assert.deepEqual(
    await paOuts([
      { action: "Set variable", target: "N", value: 3 },
      ...branch("% ( %N% + 1 ) * 2 == 8 %"),
    ]),
    ["yes"],
  );
});
test("R26-N17 wrapped condition with modulo evaluates", async () => {
  assert.deepEqual(
    await paOuts([
      { action: "Set variable", target: "N", value: 7 },
      ...branch("%N % 2 == 1%"),
    ]),
    ["yes"],
  );
});
test("R26-N17 Loop condition wrapped in %...% evaluates", async () => {
  const r = await paRun([
    { action: "Set variable", target: "Count", value: 0 },
    { action: "Loop condition", condition: "%Count * 1 < 3%" },
    { action: "Increase variable", target: "Count", value: 1 },
    { action: "End" },
  ]);
  assert.equal(r.paths[0].vars.Count, 3);
  const r2 = await paRun([
    { action: "Set variable", target: "Count", value: 0 },
    { action: "Loop condition", condition: "% %Count% + 1 <= 3 %" },
    { action: "Increase variable", target: "Count", value: 1 },
    { action: "End" },
  ]);
  assert.equal(r2.paths[0].vars.Count, 3);
});
test("R26-N17 division by zero inside wrapped condition keeps the true-cause error", async () => {
  const r = await paRun(branch("%1 / 0 > 0%"));
  assert.match(r.paths[0].error.message, /0 で除算しました/);
});
test("R26-N17 unwrapped conditions keep working (unchanged)", async () => {
  assert.deepEqual(
    await paOuts([
      { action: "Set variable", target: "A", value: 1 },
      { action: "Set variable", target: "B", value: 1 },
      ...branch("%A% == %B%"),
    ]),
    ["yes"],
  );
  assert.deepEqual(
    await paOuts([
      { action: "Set variable", target: "N", value: 7 },
      ...branch("%N% % 2 == 1"),
    ]),
    ["yes"],
  );
  assert.deepEqual(await paOuts(branch("%True%")), ["yes"]);
});

/* ---------------- N18: UI.Vision 非有限数の最終状態 ---------------- */
const ui = getDefinition("uivision");
const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });
const uiRun = async (Commands) =>
  ui.simulate(JSON.stringify({ Name: "m", Commands }), structuredClone(ui.model.defaults));
const OPEN = cmd("open", "https://example.test/form");

test("R26-N18 executeScript 1/0 final state matches echo (Infinity)", async () => {
  const r = await uiRun([OPEN, cmd("executeScript_Sandbox", "return 1 / 0;", "r"), cmd("echo", "${r}")]);
  assert.equal(r.paths[0].outputs[0].text, "Infinity");
  assert.equal(JSON.parse(JSON.stringify(r.paths[0].vars)).r, "Infinity");
  assert.equal(r.paths[0].groups[0].entries.find(([k]) => k === "r")[1], "Infinity");
});
test("R26-N18 executeScript 0/0 final state matches echo (NaN)", async () => {
  const r = await uiRun([OPEN, cmd("executeScript_Sandbox", "return 0 / 0;", "r"), cmd("echo", "${r}")]);
  assert.equal(r.paths[0].outputs[0].text, "NaN");
  assert.equal(JSON.parse(JSON.stringify(r.paths[0].vars)).r, "NaN");
});
test("R26-N18 executeScript -1/0 final state matches echo (-Infinity)", async () => {
  const r = await uiRun([OPEN, cmd("executeScript_Sandbox", "return -1 / 0;", "r"), cmd("echo", "${r}")]);
  assert.equal(r.paths[0].outputs[0].text, "-Infinity");
  assert.equal(JSON.parse(JSON.stringify(r.paths[0].vars)).r, "-Infinity");
});
test("R26-N18 nested non-finite values in arrays are not null after serialization", async () => {
  const r = await uiRun([OPEN, cmd("executeScript_Sandbox", "return [0 / 0, [1 / 0]];", "r")]);
  assert.deepEqual(JSON.parse(JSON.stringify(r.paths[0].vars)).r, ["NaN", ["Infinity"]]);
});
test("R26-N18 finite results stay numeric (unchanged)", async () => {
  const r = await uiRun([OPEN, cmd("executeScript_Sandbox", "return 1 + 2;", "r")]);
  assert.equal(r.paths[0].vars.r, 3);
});
test("R26-N18 NaN still behaves as NaN inside conditions during execution", async () => {
  const r = await uiRun([
    OPEN,
    cmd("executeScript_Sandbox", "return 0 / 0;", "r"),
    cmd("if", "${r} == ${r}"),
    cmd("echo", "eq"),
    cmd("else"),
    cmd("echo", "ne"),
    cmd("end"),
  ]);
  assert.deepEqual(r.paths[0].outputs.map((o) => o.text), ["ne"]);
});
