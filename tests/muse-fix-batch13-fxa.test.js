import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ13・fxa班（Power Apps／Power Automate）
// Codex監査ステップ5で「現行でも有効（B）」と裁定された26件
// （R7-46, 48, 49, 63, 64, 65, 111, 112, 113, 115, 116, 117, 118, 119,
//   123, 124, 214, 215, 216, 220, 225, 226, 227, 228, 229, 231）の回帰テスト。
// 一次情報: Microsoft Learn（Power Fx／Power Automate Desktop）と
// 裁定報告（findings-step5-fxa.md）の SDK 実測。

const fx = getDefinition("powerapps");
const fxRun = async (code, model) =>
  fx.simulate(code, model ?? structuredClone(fx.model.defaults));
const fxErr = async (code, model) => {
  const r = await fxRun(code, model);
  return (r.error ?? r.paths?.[0]?.error)?.message;
};
const fxVar = async (code, name = "R", model) => {
  const r = await fxRun(code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0].model.variables[name];
};
const fxOut = async (code, model) => {
  const r = await fxRun(code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0].outputs.map((o) => o.text);
};

const pa = getDefinition("powerautomate");
const paRun = async (actions, model) =>
  pa.simulate(
    JSON.stringify({ name: "f", actions }),
    model ?? structuredClone(pa.model.defaults),
  );
const paErr = async (actions, model) => {
  const r = await paRun(actions, model);
  return (r.error ?? r.paths?.[0]?.error)?.message;
};
const paOk = async (actions, model) => {
  const r = await paRun(actions, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const S = (target, value) => ({ action: "Set variable", target, value });
const D = (value) => ({ action: "Display message", value });

/* ---------------- R7-48: Filter／LookUp の条件は fxTruth ---------------- */

test("R7-48 Filter with text \"false\" condition keeps no rows", async () => {
  assert.deepEqual(
    await fxOut('Set(R,Filter(Table({x:1}),"false")); Notify(Text(CountRows(R)))'),
    ["0"],
  );
  assert.deepEqual(
    await fxOut('Set(R,Filter(Table({x:1}),"true")); Notify(Text(CountRows(R)))'),
    ["1"],
  );
});

test("R7-48 multi-condition Filter also uses fxTruth", async () => {
  assert.equal(
    await fxVar('Set(R,CountRows(Filter(Table({x:1}), true, "false")))'),
    0,
  );
});

/* ---------------- R7-49: Value の指数・百分率 ---------------- */

test("R7-49 Value converts percent and exponent forms (en-US)", async () => {
  assert.equal(await fxVar('Set(R,Value("10%"))'), 0.1);
  assert.equal(await fxVar('Set(R,Value("1e3"))'), 1000);
  assert.equal(await fxVar('Set(R,Value("-2.5e-1"))'), -0.25);
  assert.equal(await fxVar('Set(R,Value("12.5"))'), 12.5);
});

test("R7-49 Value still stops on genuinely non-numeric text", async () => {
  assert.match(await fxErr('Set(R,Value("abc"))'), /数値へ変換できません/);
  assert.match(await fxErr('Set(R,Value("1e"))'), /数値へ変換できません/);
});

/* ---------------- R7-63: Table の展開とスカラー拒否 ---------------- */

test("R7-63 Table expands table arguments", async () => {
  assert.equal(await fxVar("Set(R,CountRows(Table(Table({x:1},{x:2}))))"), 2);
  assert.equal(
    await fxVar("Set(R,CountRows(Table({x:1},Table({x:2},{x:3}))))"),
    3,
  );
});

test("R7-63 Table rejects scalar arguments as a type error", async () => {
  assert.match(
    await fxErr("Set(R,Table(1,2))"),
    /Table の引数はレコードまたはテーブルで指定してください/,
  );
  assert.match(
    await fxErr('Set(R,Table("a"))'),
    /Table の引数はレコードまたはテーブルで指定してください/,
  );
});

/* ---------------- R7-64: And／Or の短絡 ---------------- */

test("R7-64 function And/Or short-circuit past division by zero", async () => {
  assert.equal(await fxVar("Set(R,And(false, 1/0 = 0))"), false);
  assert.equal(await fxVar("Set(R,Or(true, 1/0 = 0))"), true);
});

test("R7-64 And/Or still evaluate when the result is not yet decided", async () => {
  assert.match(await fxErr("Set(R,And(true, 1/0 = 0))"), /0 で割ることはできません/);
  assert.equal(await fxVar("Set(R,And(true, 1 < 2))"), true);
  assert.equal(await fxVar("Set(R,Or(false, 1 < 2))"), true);
});

/* ---------------- R7-65: テーブルの暗黙変換を型エラーに ---------------- */

test("R7-65 tables are not implicitly converted to scalar types", async () => {
  assert.match(await fxErr("Set(R,Not(Table()))"), /真偽値として使えません/);
  assert.match(
    await fxErr("Set(R,CountRows(Sequence(Table())))"),
    /Sequenceの引数は数値で指定してください/,
  );
  assert.match(
    await fxErr("Set(R,Text(Table()))"),
    /文字列に変換できません/,
  );
  // レコードの Text() は RG-18 の人間可読表示が既存仕様のため維持。
  assert.match(await fxVar("Set(R,Text(LookUp(Table({v:5}),v=5)))"), /"v": 5/);
});

/* ---------------- R7-111／112: スコープ分離と遷移後再計算 ---------------- */

test("R7-111 context variables shadow globals on the same screen", async () => {
  const r = await fxRun("UpdateContext({X:1}); Set(X,2); Set(Result,X)");
  assert.equal(r.paths[0].model.variables.Result, 1);
  // グローバル側は Set の値で保持される（別スコープ）。
  assert.equal(r.paths[0].model.variables.X, 2);
  assert.equal(r.paths[0].model.screens.Home.context.X, 1);
});

test("R7-111 globals survive navigation away from a same-named context variable", async () => {
  const r = await fxRun("Set(X,100);UpdateContext({X:1});Navigate(Detail);Set(Result,X)");
  assert.equal(r.paths[0].model.variables.Result, 100);
});

test("R7-112 bindings are recalculated with the new screen's context after Navigate", async () => {
  const model = structuredClone(fx.model.defaults);
  model.screens = { Home: { context: { X: 1 } }, Detail: { context: { X: 2 } } };
  model.bindings = { "Label1.Text": "Text(X)" };
  const r = await fxRun("Navigate(Detail)", model);
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  assert.equal(r.paths[0].model.screen, "Detail");
  assert.equal(r.paths[0].model.controls.Label1.Text, "2");
});

/* ---------------- R7-113: 変数経由レコードの Patch ---------------- */

test("R7-113 Patch finds a record stored through a variable", async () => {
  const model = structuredClone(fx.model.defaults);
  model.dataSources.Orders = [{ ID: 1, Done: false }];
  const r = await fxRun(
    "Set(r,LookUp(Orders,ID=1)); Patch(Orders,r,{Done:true})",
    model,
  );
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  assert.deepEqual(r.paths[0].model.dataSources.Orders, [{ ID: 1, Done: true }]);
});

test("R7-113 Patch still stops for a record that matches nothing", async () => {
  const model = structuredClone(fx.model.defaults);
  model.dataSources.Orders = [{ ID: 1, Done: false }];
  assert.match(
    await fxErr("Patch(Orders,{ID:99,Done:false},{Done:true})", model),
    /更新するレコードがデータソースにありません/,
  );
});

/* ---------------- R7-115: Blank だけの Sum ---------------- */

test("R7-115 Sum of only Blank values is Blank, not 0", async () => {
  assert.equal(await fxVar("Set(R,IsBlank(Sum(Table({x:Blank()}),x)))"), true);
  assert.equal(await fxVar("Set(R,Sum(Table({x:Blank()},{x:5}),x))"), 5);
  assert.equal(await fxVar("Set(R,IsBlank(Sum(Blank())))"), true);
});

/* ---------------- R7-116〜119: Text 書式 ---------------- */

test("R7-116 Text(Blank(), format) formats Blank as 0", async () => {
  assert.equal(await fxVar('Set(R,Text(Blank(),"0"))'), "0");
  assert.equal(await fxVar('Set(R,Text(Blank(),"0.00"))'), "0.00");
  // 書式なしは従来どおり空文字列。
  assert.equal(await fxVar("Set(R,Text(Blank()))"), "");
});

test("R7-117 # placeholders suppress unneeded zeros and decimal points", async () => {
  assert.equal(await fxVar('Set(R,IsBlank(Text(0,"#")))'), true);
  assert.equal(await fxVar('Set(R,Text(1,"0.##"))'), "1");
  assert.equal(await fxVar('Set(R,Text(0,"#.00"))'), ".00");
  assert.equal(await fxVar('Set(R,Text(0,"0"))'), "0");
});

test("R7-118 Text rounding follows decimal half-up, not JS toFixed", async () => {
  assert.equal(await fxVar('Set(R,Text(1.005,"0.00"))'), "1.01");
  assert.equal(await fxVar('Set(R,Text(2.675,"0.00"))'), "2.68");
  assert.equal(await fxVar('Set(R,Text(123.456,"0.00"))'), "123.46");
});

test("R7-119 literals inside the integer digits stay in place", async () => {
  assert.equal(await fxVar('Set(R,Text(1,"00-00"))'), "00-01");
  assert.equal(await fxVar('Set(R,Text(1000,"00-00"))'), "10-00");
});

test("R7-116-119 existing format surfaces keep working", async () => {
  assert.equal(await fxVar('Set(R,Text(1234567,"#,##0"))'), "1,234,567");
  assert.equal(await fxVar('Set(R,Text(0.5,"0%"))'), "50%");
  assert.equal(await fxVar('Set(R,Text(5,"000"))'), "005");
  assert.equal(await fxVar('Set(R,Text(12,"#.0#"))'), "12.0");
  assert.equal(await fxVar('Set(R,Text(-1234.5,"0.0"))'), "-1234.5");
});

/* ---------------- R7-214／215: 列の和集合と Value 列 ---------------- */

test("R7-214 missing cells in a union-schema table are Blank", async () => {
  assert.deepEqual(await fxVar("Set(R,ForAll(Table({a:1},{b:2}), IsBlank(a)))"), [
    { Value: false },
    { Value: true },
  ]);
  assert.equal(
    await fxVar("Set(R,Sum(Table({a:1},{b:2}),If(IsBlank(a),10,a)))"),
    11,
  );
  assert.equal(
    await fxVar("Set(R,CountRows(Filter(Table({a:1},{b:2}),IsBlank(a))))"),
    1,
  );
  assert.equal(
    await fxVar("Set(R,LookUp(Table({a:1},{b:2}),IsBlank(a),b))"),
    2,
  );
});

test("R7-215 nested ForAll tables land in the Value column", async () => {
  assert.deepEqual(
    await fxVar("Set(R,ForAll(ForAll(Sequence(2),Sequence(2)),CountRows(Value)))"),
    [{ Value: 2 }, { Value: 2 }],
  );
});

/* ---------------- R7-216／220: Switch 型検査と引数数 ---------------- */

test("R7-216 Switch stops on match type mismatch instead of taking the default", async () => {
  assert.match(
    await fxErr('Set(R,Switch("1",1,"one","default"))'),
    /Switch の一致値の型が比較値と一致しません/,
  );
  assert.match(
    await fxErr('Set(R,Switch(true,1,"one","default"))'),
    /Switch の一致値の型が比較値と一致しません/,
  );
  // 動作数式形（lowerBehavior 経由）でも同じ検査が効く。
  assert.match(
    await fxErr('Switch("1",1,Set(R,"one"),Set(R,"default"))'),
    /Switch の一致値の型が比較値と一致しません/,
  );
  // 同型の正常一致は維持。
  assert.equal(await fxVar('Set(R,Switch(1,1,"one","default"))'), "one");
});

test("R7-220 Switch with two arguments is an argument-count error", async () => {
  assert.match(await fxErr("Set(R,Switch(1,1))"), /Switch の引数の数が正しくありません（3 個以上が必要です/);
  assert.match(await fxErr("Switch(1,1)"), /Switch の引数の数が正しくありません/);
  assert.match(await fxErr("Set(AuditResult,99);Switch(1,1)"), /Switch の引数の数が正しくありません/);
});

/* ---------------- R7-46: PAD 必須 target 欠落 ---------------- */

test("R7-46 Write text to file without target stops naming target and writes no undefined file", async () => {
  const r = await paRun([{ action: "Write text to file", value: "hi" }]);
  assert.match((r.error ?? r.paths[0].error).message, /Write text to file にはファイルパス（target）が必要です/);
  assert.ok(!("undefined" in (r.paths[0]?.model.files ?? {})));
});

test("R7-46 Read text from file / Display input dialog without target stop naming target", async () => {
  assert.match(
    await paErr([{ action: "Read text from file", value: "C:/model/input.txt" }, D("done")]),
    /Read text from file には出力変数名（target）が必要です/,
  );
  assert.match(
    await paErr([{ action: "Display input dialog", value: "質問" }]),
    /Display input dialog には出力変数名（target）が必要です/,
  );
});

/* ---------------- R7-123: PAD 変数名の大小同一視 ---------------- */

test("R7-123 PAD variable references are case-insensitive", async () => {
  const p = await paOk([S("Name", "abc"), D("%name%")]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["abc"]);
  const p2 = await paOk([S("Name", "abc"), S("x", "%NAME%")]);
  assert.equal(p2.vars.x, "abc");
  // 条件中の参照も同一視する。
  const p3 = await paOk([
    S("Count", 5),
    { action: "If", condition: "%count% > 3" },
    D("big"),
    { action: "Else" },
    D("small"),
    { action: "End" },
  ]);
  assert.deepEqual(p3.outputs.map((o) => o.text), ["big"]);
  // 大小だけ違う Set は同一変数を更新する（別変数を作らない）。
  const p4 = await paOk([S("Name", "a"), S("name", "b")]);
  assert.deepEqual(Object.keys(p4.vars), ["Name"]);
  assert.equal(p4.vars.Name, "b");
});

/* ---------------- R7-124: %% エスケープ ---------------- */

test("R7-124 %% is an escaped literal percent", async () => {
  const p = await paOk([D("100%%")]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["100%"]);
  const p2 = await paOk([S("Price", 20), D("%%Price%%")]);
  assert.deepEqual(p2.outputs.map((o) => o.text), ["%Price%"]);
});

/* ---------------- R7-225: %式% の区切り ---------------- */

test("R7-225 multiple variable references in one string expand", async () => {
  const p = await paOk([S("A", "Hello"), S("B", "world"), D("%A% %B%")]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["Hello world"]);
});

test("R7-225 embedded %expression% in text is evaluated", async () => {
  const p = await paOk([S("N", 1), D("total=%N + 1%")]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["total=2"]);
  // R27-N9 の曖昧形（"%N% + 1%" 全体）は従来どおり停止する。
  assert.match(
    await paErr([S("N", 1), S("x", "%N% + 1%")]),
    /%変数% で始まる文字列は式として解釈できません/,
  );
});

/* ---------------- R7-226: Loop 境界の null ---------------- */

test("R7-226 Loop with explicit null bounds stops naming the bound", async () => {
  assert.match(
    await paErr([{ action: "Loop", target: "Index", from: null, to: 2, step: 1 }, D("%Index%"), { action: "End" }]),
    /Loopの開始値（from）が必要です/,
  );
  assert.match(
    await paErr([{ action: "Loop", target: "Index", from: 1, to: 2, step: null }, D("%Index%"), { action: "End" }]),
    /Loopの増分（step）が必要です/,
  );
  // step 省略時の既定値1は維持。
  const p = await paOk([{ action: "Loop", target: "Index", from: 1, to: 2 }, D("%Index%"), { action: "End" }]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["1", "2"]);
});

/* ---------------- R7-227: PAD 予約語 ---------------- */

test("R7-227 PAD reserved words cannot be variable names", async () => {
  assert.match(await paErr([S("If", 7), D("AFTER")]), /予約語のため使えません/);
  assert.match(await paErr([S("if", 7)]), /予約語のため使えません/);
  assert.match(
    await paErr([{ action: "Display input dialog", target: "Loop", value: "q" }]),
    /予約語のため使えません/,
  );
});

/* ---------------- R7-228: PAD プロパティ語彙 ---------------- */

test("R7-228 list Count and text Length are the PAD properties", async () => {
  const p = await paOk([S("Items", [1, 2]), S("x", "%Items.Count%")]);
  assert.equal(p.vars.x, 2);
  const p2 = await paOk([S("Word", "hello"), S("x", "%Word.Length%")]);
  assert.equal(p2.vars.x, 5);
  // リストに Length は無い（Count へ案内する）。
  assert.match(
    await paErr([S("Items", [1, 2]), S("x", "%Items.length%")]),
    /リストに Length プロパティはありません.*Count/,
  );
  assert.match(
    await paErr([S("Word", "hello"), S("x", "%Word.Count%")]),
    /文字列に Count プロパティはありません.*Length/,
  );
});

/* ---------------- R7-229: 入力ダイアログ参照の区別 ---------------- */

test("R7-229 Display input dialog reference distinguishes the unsupported ButtonPressed output", () => {
  const item = pa.reference.find((r) => r.name === "Display input dialog");
  assert.match(item.returns, /UserInput/);
  assert.match(item.returns, /ButtonPressed は本モデルでは未対応/);
  assert.match(item.returns, /生成されません/);
});

/* ---------------- R7-231: PAD 順序比較の型検査 ---------------- */

test("R7-231 PAD ordering comparisons reject mixed types", async () => {
  assert.match(
    await paErr([S("Result", '%1 >= "1"%')]),
    /異なる型同士の順序比較はできません（数値 と 文字列）/,
  );
  assert.match(
    await paErr([S("Result", '%1 > ""%')]),
    /異なる型同士の順序比較はできません/,
  );
  // 同型の順序比較は維持。
  const p = await paOk([S("Result", "%2 > 1%")]);
  assert.equal(p.vars.Result, true);
});
