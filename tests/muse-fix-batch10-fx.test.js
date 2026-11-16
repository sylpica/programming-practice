import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ10・Power Apps／UI.Vision 班
// - R31-N11（R31-F01C-N2）: Power Apps Sequence の件数は Microsoft Learn
//   の切り捨て規則に従う（Sequence(0.9) は空表）。上限1,000件は caution
//   で開示し、上限超過と不正は文言を分ける。
// - R31-N13（R31-PLAT-N2 の Power Apps／UI.Vision 分）: 形状不正モデルは
//   汎用文言でなく、モデル／項目名を名指して停止する。
// - 横断スイープ(c): 途中終了した式の文言に内部トークン <eof> を出さない。

const fx = getDefinition("powerapps");
const ui = getDefinition("uivision");

const fxRun = async (code, ...rest) =>
  fx.simulate(code, rest.length ? rest[0] : structuredClone(fx.model.defaults));
const fxErr = async (code, ...rest) => {
  const r = await fxRun(code, ...rest);
  return (r.error ?? r.paths?.[0]?.error)?.message;
};
const fxVar = async (code, name = "N") => {
  const r = await fxRun(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0].model.variables[name];
};

const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });
const uiRun = async (Commands, ...rest) =>
  ui.simulate(
    JSON.stringify({ Name: "m", Commands }),
    rest.length ? rest[0] : structuredClone(ui.model.defaults),
  );
const uiErr = async (Commands, ...rest) => {
  const r = await uiRun(Commands, ...rest);
  return (r.error ?? r.paths?.[0]?.error)?.message;
};
const UI_STORE_ECHO = [cmd("store", "0", "count"), cmd("echo", "${count}")];
const GENERIC =
  /null \/ undefined のプロパティは参照できません|処理中に予期しないエラーが発生しました|null \/ undefined へ書き込めません/;

/* ---------------- N11: Sequence の切り捨て ---------------- */

test("R31-N11 Sequence(2.9) truncates the record count to 2", async () => {
  assert.equal(await fxVar("Set(N, CountRows(Sequence(2.9)))"), 2);
});

test("R31-N11 Sequence(0.9) truncates to 0 and yields an empty table (Learn example)", async () => {
  assert.equal(await fxVar("Set(N, CountRows(Sequence(0.9)))"), 0);
  assert.deepEqual(await fxVar("Set(N, Sequence(0.9))"), []);
});

test("R31-N11 Sequence(0) and integer counts keep working", async () => {
  assert.equal(await fxVar("Set(N, CountRows(Sequence(0)))"), 0);
  assert.equal(await fxVar("Set(N, CountRows(Sequence(3)))"), 3);
  assert.equal(await fxVar("Set(N, CountRows(Sequence(1000)))"), 1000);
  // 上限ちょうどへ切り捨てられる小数は受理する
  assert.equal(await fxVar("Set(N, CountRows(Sequence(1000.9)))"), 1000);
});

test("R31-N11 fractional Start/Step are kept as-is (Learn shows Step 0.5)", async () => {
  assert.deepEqual(await fxVar("Set(N, Sequence(2.9, 10, 0.5))"), [
    { Value: 10 },
    { Value: 10.5 },
  ]);
  assert.deepEqual(await fxVar("Set(N, Sequence(3, 1.5, 0.5))"), [
    { Value: 1.5 },
    { Value: 2 },
    { Value: 2.5 },
  ]);
  assert.equal(await fxVar("Set(N, CountRows(Sequence(3, 1, 0)))"), 3);
});

test("R31-N11 negative counts stop as invalid (Learn range starts at 0)", async () => {
  for (const code of [
    "Set(N, CountRows(Sequence(-3)))",
    "Set(N, CountRows(Sequence(-0.5)))",
    'Set(N, CountRows(Sequence("abc")))',
  ]) {
    const m = await fxErr(code);
    assert.match(m, /Sequenceの行数が不正です/, code);
    assert.doesNotMatch(m, /上限/, code);
  }
});

test("R31-N11 over-limit counts stop naming the model limit of 1,000", async () => {
  for (const code of [
    "Set(N, CountRows(Sequence(1001)))",
    "Set(N, CountRows(Sequence(5000)))",
  ]) {
    const m = await fxErr(code);
    assert.equal(m, "Sequenceの行数が上限（1,000件）を超えています", code);
  }
});

test("R31-N11 Sequence caution discloses truncation and the 1,000 limit", () => {
  const item = fx.reference.find((r) => r.name === "Sequence");
  assert.match(item.caution, /切り捨て/);
  assert.match(item.caution, /この説明では上限1,000件です/);
  assert.match(item.caution, /50,000/);
});

/* ---------------- N13: Power Apps モデル形状 ---------------- */

test("R31-N13 Power Apps non-object models name the model itself", async () => {
  for (const model of [null, 123, "x", [], undefined]) {
    const m = await fxErr("Set(X, 1)", model);
    assert.equal(m, "モデルはオブジェクトで指定してください", String(model));
    assert.doesNotMatch(m, GENERIC);
  }
});

test("R31-N13 Power Apps {} and screens defects name screens", async () => {
  assert.equal(await fxErr("Set(X, 1)", {}), "モデルにscreensがありません");
  const missing = structuredClone(fx.model.defaults);
  delete missing.screens;
  assert.equal(await fxErr("Set(X, 1)", missing), "モデルにscreensがありません");
  for (const bad of [null, 123, "x", []]) {
    const model = structuredClone(fx.model.defaults);
    model.screens = bad;
    const m = await fxErr("Set(X, 1)", model);
    assert.equal(m, "モデルscreensはオブジェクトで指定してください", String(bad));
    assert.doesNotMatch(m, GENERIC);
  }
});

test("R31-N13 Power Apps each defaults item is named when missing or mistyped", async () => {
  const cases = [
    [(m) => delete m.screen, "モデルにscreenがありません"],
    [(m) => (m.screen = 123), "モデルscreenは文字列で指定してください"],
    [(m) => delete m.controls, "モデルにcontrolsがありません"],
    [(m) => (m.controls = 123), "モデルcontrolsはオブジェクトで指定してください"],
    [(m) => delete m.variables, "モデルにvariablesがありません"],
    [(m) => (m.variables = 123), "モデルvariablesはオブジェクトで指定してください"],
    [(m) => delete m.collections, "モデルにcollectionsがありません"],
    [(m) => (m.collections = "x"), "モデルcollectionsはオブジェクトで指定してください"],
    [(m) => delete m.dataSources, "モデルにdataSourcesがありません"],
    [(m) => (m.dataSources = []), "モデルdataSourcesはオブジェクトで指定してください"],
    [(m) => delete m.defaults, "モデルにdefaultsがありません"],
    [(m) => (m.defaults = 123), "モデルdefaultsはオブジェクトで指定してください"],
    [(m) => delete m.bindings, "モデルにbindingsがありません"],
    [(m) => (m.bindings = 123), "モデルbindingsはオブジェクトで指定してください"],
    [(m) => delete m.language, "モデルにlanguageがありません"],
    [(m) => (m.language = 123), "モデルlanguageは文字列で指定してください"],
  ];
  for (const [mutate, expected] of cases) {
    const model = structuredClone(fx.model.defaults);
    mutate(model);
    const m = await fxErr("Set(X, 1)", model);
    assert.equal(m, expected);
    assert.doesNotMatch(m, GENERIC);
  }
});

test("R31-N13 Power Apps nested model items are named", async () => {
  const cases = [
    [(m) => (m.screens.Home = 123), "モデルscreens.Homeはオブジェクトで指定してください"],
    [(m) => (m.screens.Home.context = 123), "モデルscreens.Home.contextはオブジェクトで指定してください"],
    [(m) => (m.controls.Input1 = 123), "モデルcontrols.Input1はオブジェクトで指定してください"],
    [(m) => (m.dataSources.Orders = 123), "モデルdataSources.Ordersは配列で指定してください"],
    [(m) => (m.defaults.Orders = 123), "モデルdefaults.Ordersはオブジェクトで指定してください"],
    [(m) => (m.collections = { Items: 123 }), "モデルcollections.Itemsは配列で指定してください"],
    [(m) => (m.bindings["Label1.Text"] = 123), "モデルbindings.Label1.Textは文字列で指定してください"],
  ];
  for (const [mutate, expected] of cases) {
    const model = structuredClone(fx.model.defaults);
    mutate(model);
    const m = await fxErr("Set(X, 1)", model);
    assert.equal(m, expected);
    assert.doesNotMatch(m, GENERIC);
  }
});

test("R31-N13 Power Apps valid model and unknown-screen behaviour are unchanged", async () => {
  const r = await fxRun('Set(X, 1); Notify(Text(X))');
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.deepEqual(r.paths[0].outputs.map((o) => o.text), ["1"]);
  // screen の指す画面が screens に無いことは入口検証の対象外で、
  // UpdateContext 側の既存の名指し停止（RG-10）が従来どおり働く。
  const bad = structuredClone(fx.model.defaults);
  bad.screen = "存在しない画面";
  assert.equal(
    await fxErr("UpdateContext({Count: 1})", bad),
    "現在の画面『存在しない画面』がモデルにありません",
  );
});

/* ---------------- N13: UI.Vision モデル形状 ---------------- */

test("R31-N13 UI.Vision non-object models name the model itself", async () => {
  for (const model of [null, 123, "x", [], undefined]) {
    const m = await uiErr(UI_STORE_ECHO, model);
    assert.equal(m, "モデルはオブジェクトで指定してください", String(model));
    assert.doesNotMatch(m, GENERIC);
  }
});

test("R31-N13 UI.Vision {} and pages defects name pages", async () => {
  assert.equal(await uiErr(UI_STORE_ECHO, {}), "モデルにpagesがありません");
  const missing = structuredClone(ui.model.defaults);
  delete missing.pages;
  assert.equal(await uiErr(UI_STORE_ECHO, missing), "モデルにpagesがありません");
  for (const bad of [null, 123, "x", []]) {
    const model = structuredClone(ui.model.defaults);
    model.pages = bad;
    const m = await uiErr(UI_STORE_ECHO, model);
    assert.equal(m, "モデルpagesはオブジェクトで指定してください", String(bad));
    assert.doesNotMatch(m, GENERIC);
  }
});

test("R31-N13 UI.Vision each defaults item is named when missing or mistyped", async () => {
  const cases = [
    [(m) => delete m.url, "モデルにurlがありません"],
    [(m) => (m.url = 123), "モデルurlは文字列で指定してください"],
    [(m) => delete m.variables, "モデルにvariablesがありません"],
    [(m) => (m.variables = 123), "モデルvariablesはオブジェクトで指定してください"],
    [(m) => delete m.clicks, "モデルにclicksがありません"],
    [(m) => (m.clicks = 123), "モデルclicksは配列で指定してください"],
    [(m) => (m.clicks = {}), "モデルclicksは配列で指定してください"],
  ];
  for (const [mutate, expected] of cases) {
    const model = structuredClone(ui.model.defaults);
    mutate(model);
    const m = await uiErr(UI_STORE_ECHO, model);
    assert.equal(m, expected);
    assert.doesNotMatch(m, GENERIC);
  }
});

test("R31-N13 UI.Vision nested page/element items are named", async () => {
  const url = "https://example.test/form";
  const cases = [
    [(m) => (m.pages[url] = 123), `モデルpages.${url}はオブジェクトで指定してください`],
    [(m) => (m.pages[url].elements = 123), `モデルpages.${url}.elementsはオブジェクトで指定してください`],
    [
      (m) => (m.pages[url].elements["id=name"] = 123),
      `モデルpages.${url}.elements.id=nameはオブジェクトで指定してください`,
    ],
  ];
  for (const [mutate, expected] of cases) {
    const model = structuredClone(ui.model.defaults);
    mutate(model);
    const m = await uiErr(UI_STORE_ECHO, model);
    assert.equal(m, expected);
    assert.doesNotMatch(m, GENERIC);
  }
});

test("R31-N13 UI.Vision valid model keeps working (elements key itself is optional)", async () => {
  const r = await uiRun(UI_STORE_ECHO);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.deepEqual(r.paths[0].outputs.map((o) => o.text), ["0"]);
  const noElements = structuredClone(ui.model.defaults);
  delete noElements.pages["https://example.test/form"].elements;
  const r2 = await uiRun(UI_STORE_ECHO, noElements);
  assert.ok(!r2.error, JSON.stringify(r2.error));
});

/* ---------------- 横断スイープ(c): <eof> を出さない ---------------- */

test("Sweep(c) Power Apps truncated formulas never surface <eof>", async () => {
  for (const code of ["Set(X,", "Notify(", "Sequence(", "If(true,", "("]) {
    const m = await fxErr(code);
    assert.equal(m, "式を解釈できません（式が途中で終わっています）", code);
    assert.doesNotMatch(m, /<eof>/);
  }
  // bindings の数式が途中終了している場合（実行中の再解析経路）も同様。
  const model = structuredClone(fx.model.defaults);
  model.bindings = { "Label1.Text": "Text(" };
  const r = await fxRun("Set(X, 1)", model);
  assert.doesNotMatch(JSON.stringify(r), /<eof>/);
});

test("Sweep(c) UI.Vision truncated conditions/scripts never surface <eof>", async () => {
  for (const Commands of [
    [cmd("while", "${count} <"), cmd("end")],
    [cmd("executeScript_Sandbox", "return 1 +", "r")],
  ]) {
    const m = await uiErr(Commands);
    assert.equal(m, "式を解釈できません（式が途中で終わっています）");
    assert.doesNotMatch(m, /<eof>/);
  }
});
