import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ2「フロー系・拡張班」(fc-flow2) の回帰テスト。
// 対象: funcheck declared D-1〜D-6、R23-N3、refacc RA-23〜RA-28、
// RA-53〜RA-58、RA-59〜RA-63。

const fx = getDefinition("powerapps");
const runFx = async (code) =>
  fx.simulate(code, structuredClone(fx.model.defaults));
const fxOk = async (code) => {
  const r = await runFx(code);
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(!err, `${code} => ${err?.message}`);
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const fxErr = async (code, pattern) => {
  const r = await runFx(code);
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err, `${code} should error`);
  if (pattern) assert.match(err.message, pattern);
  return err;
};
const fxOut = (p) => p.outputs.map((o) => o.text);

// ---- D-1: Set × If／Switch（フォールバックなし）は Blank を定義する ----
test("D-1 Set with unmatched If defines the variable as Blank", async () => {
  const p = await fxOk("Set(R, If(false, 1)); Notify(Text(R))");
  assert.deepEqual(fxOut(p), [""]);
  assert.ok("R" in p.model.variables);
  assert.equal(p.model.variables.R, null);
  const p2 = await fxOk(
    "Set(R, If(false, 1)); Notify(Text(IsBlank(R)))",
  );
  assert.deepEqual(fxOut(p2), ["true"]);
});
test("D-1 Set with multi-condition If without else defines Blank", async () => {
  const p = await fxOk("Set(R, If(false, 1, false, 2)); Notify(Text(R))");
  assert.deepEqual(fxOut(p), [""]);
  assert.equal(p.model.variables.R, null);
});
test("D-1 Set with unmatched Switch defines the variable as Blank", async () => {
  const p = await fxOk('Set(R, Switch(9, 1, "one")); Notify(Text(R))');
  assert.deepEqual(fxOut(p), [""]);
  assert.equal(p.model.variables.R, null);
  const p2 = await fxOk(
    'Set(R, Switch(9, 1, "one", 2, "two")); Notify(Text(R))',
  );
  assert.equal(p2.model.variables.R, null);
});
test("D-1 matched If/Switch branches still store their values", async () => {
  assert.deepEqual(fxOut(await fxOk("Set(R, If(true, 1)); Notify(Text(R))")), ["1"]);
  assert.deepEqual(
    fxOut(await fxOk('Set(R, Switch(1, 1, "one")); Notify(Text(R))')),
    ["one"],
  );
  assert.deepEqual(
    fxOut(await fxOk('Set(R, Switch(9, 1, "one", "def")); Notify(Text(R))')),
    ["def"],
  );
  // ネストした無一致 If も Blank になる
  const p = await fxOk("Set(R, If(true, If(false, 1))); Notify(Text(R))");
  assert.equal(p.model.variables.R, null);
});

// ---- D-2: Blank レコードのドット参照は Blank ----
test("D-2 member access on a Blank record yields Blank, not an error", async () => {
  const p = await fxOk(
    "ClearCollect(C, {Value:1}); Notify(Text(LookUp(C, Value=99).Value))",
  );
  assert.deepEqual(fxOut(p), [""]);
  const p2 = await fxOk(
    "ClearCollect(C, {Value:1}); Set(R, LookUp(C, Value=99)); Notify(Text(R.Value))",
  );
  assert.deepEqual(fxOut(p2), [""]);
  assert.equal(p2.model.variables.R, null);
  const p3 = await fxOk("Notify(Text(Blank().Value))");
  assert.deepEqual(fxOut(p3), [""]);
  const p4 = await fxOk(
    "Notify(Text(IsBlank(LookUp(Table({Value:1}), Value=99).Value)))",
  );
  assert.deepEqual(fxOut(p4), ["true"]);
});

// ---- D-3: Value("") は Blank ----
test("D-3 Value of empty string returns Blank", async () => {
  assert.deepEqual(fxOut(await fxOk('Notify(Text(Value("")))')), [""]);
  assert.deepEqual(
    fxOut(await fxOk('Notify(Text(IsBlank(Value(""))))')),
    ["true"],
  );
  assert.deepEqual(fxOut(await fxOk("Notify(Text(Value(Blank())))")), [""]);
});
test("D-3 Value of non-numeric text still errors", async () => {
  await fxErr('Notify(Text(Value("abc")))', /数値へ変換できません/);
});

// ---- D-4: CountRows(Blank()) は学習者向け文言で止まる ----
test("D-4 CountRows(Blank()) fails with a learner message, no host text", async () => {
  const err = await fxErr(
    "Notify(Text(CountRows(Blank())))",
    /テーブルが必要です/,
  );
  assert.doesNotMatch(
    err.message,
    /Cannot read|null \/ undefined|プロパティは参照できません/,
  );
  await fxErr("Notify(Text(CountRows(5)))", /テーブルが必要です/);
});

// ---- R23-N3: 単一引用符は引用識別子 ----
test("R23-N3 single-quoted name resolves the variable, not a string", async () => {
  assert.deepEqual(fxOut(await fxOk("Set(abc, 42); Notify('abc')")), ["42"]);
  await fxErr("Notify('abc')", /未定義の名前：abc/);
});
test("R23-N3 quoted identifiers with spaces work end to end", async () => {
  assert.deepEqual(
    fxOut(await fxOk("Set('Order Id', 42); Notify('Order Id')")),
    ["42"],
  );
  assert.deepEqual(
    fxOut(await fxOk("Set('Order Id', 42); Set(S, 'Order Id'); Notify(Text(S))")),
    ["42"],
  );
  assert.deepEqual(
    fxOut(await fxOk("Set(R, {'Order Id': 5}); Notify(Text(R.'Order Id'))")),
    ["5"],
  );
});
test("R23-N3 double-quoted strings are unaffected", async () => {
  assert.deepEqual(fxOut(await fxOk('Notify("abc")')), ["abc"]);
});
test("R23-N3 other dialects keep single-quoted strings", async () => {
  const js = getDefinition("javascript");
  const r = await js.simulate(
    "console.log('abc');",
    structuredClone(js.model.defaults),
  );
  assert.ok(!r.error && !r.paths[0].error);
  assert.deepEqual(r.paths[0].outputs.map((o) => o.text), ["abc"]);
});

// ---- RA-53: And／Or は2個以上 ----
test("RA-53 And/Or require at least two arguments", async () => {
  await fxErr("Notify(Text(And(true)))", /引数の数が正しくありません/);
  await fxErr("Notify(Text(Or(false)))", /引数の数が正しくありません/);
  assert.deepEqual(
    fxOut(await fxOk("Notify(Text(And(true, false, true)))")),
    ["false"],
  );
  assert.deepEqual(
    fxOut(await fxOk("Notify(Text(Or(false, true, false)))")),
    ["true"],
  );
  const ref = (n) => fx.reference.find((r) => r.name === n);
  assert.equal(ref("And").syntax, "And(LogicalFormula1, LogicalFormula2 [, LogicalFormula3, ...])");
  assert.equal(ref("Or").syntax, "Or(LogicalFormula1, LogicalFormula2 [, LogicalFormula3, ...])");
});

// ---- RA-54: Filter の複数条件形 ----
test("RA-54 Filter accepts multiple condition formulas (ANDed)", async () => {
  const p = await fxOk(
    "ClearCollect(Items, {Value:1}, {Value:2}, {Value:3}); Notify(Text(CountRows(Filter(Items, Value > 0, Value < 3))))",
  );
  assert.deepEqual(fxOut(p), ["2"]);
  const ref = fx.reference.find((r) => r.name === "Filter");
  assert.equal(ref.syntax, "Filter(Table, Formula1 [, Formula2, ...])");
  assert.match(ref.description, /Andで結合/);
});

// ---- RA-55: Sum の可変長（数値形） ----
test("RA-55 Sum numeric form sums any number of arguments", async () => {
  assert.deepEqual(fxOut(await fxOk("Notify(Text(Sum(1, 2, 3)))")), ["6"]);
  assert.deepEqual(fxOut(await fxOk("Notify(Text(Sum(5)))")), ["5"]);
  assert.deepEqual(fxOut(await fxOk("Notify(Text(Sum(Blank(), 5)))")), ["5"]);
  const ref = fx.reference.find((r) => r.name === "Sum");
  assert.equal(
    ref.syntax,
    "Sum(Table, Formula) または Sum(NumericalFormula1 [, NumericalFormula2, ...])",
  );
});
test("RA-55 Sum table form unchanged; Blank table still errors", async () => {
  const p = await fxOk(
    "ClearCollect(Items, {Value:1}, {Value:2}); Notify(Text(Sum(Items, Value)))",
  );
  assert.deepEqual(fxOut(p), ["3"]);
  await fxErr("Notify(Text(Sum(Blank(), Value)))", /テーブルが必要です/);
});

// ---- RA-56: Patch の複数変更レコード ----
test("RA-56 Patch merges multiple change records, later wins", async () => {
  const p = await fxOk(
    'Patch(Orders, Defaults(Orders), {Name:"A"}, {Done:true})',
  );
  assert.equal(p.model.dataSources.Orders.length, 1);
  assert.equal(p.model.dataSources.Orders[0].Name, "A");
  assert.equal(p.model.dataSources.Orders[0].Done, true);
  const p2 = await fxOk(
    'Patch(Orders, Defaults(Orders), {Name:"A"}, {Name:"B"})',
  );
  assert.equal(p2.model.dataSources.Orders[0].Name, "B");
  const ref = fx.reference.find((r) => r.name === "Patch");
  assert.equal(
    ref.syntax,
    "Patch(Source, BaseRecord, ChangeRecord1 [, ChangeRecord2, ...])",
  );
});

// ---- RA-57: Notify の任意引数 ----
test("RA-57 Notify accepts NotificationType and Timeout", async () => {
  assert.deepEqual(
    fxOut(await fxOk('Notify("hi", NotificationType.Success)')),
    ["hi"],
  );
  assert.deepEqual(
    fxOut(await fxOk('Notify("hi", NotificationType.Success, 5)')),
    ["hi"],
  );
  await fxErr('Notify("hi", "bogus")', /NotificationType が正しくありません/);
  await fxErr(
    'Notify("hi", NotificationType.Success, -1)',
    /Timeout は0以上の数値/,
  );
  const ref = fx.reference.find((r) => r.name === "Notify");
  assert.equal(ref.syntax, "Notify(Message [, NotificationType [, Timeout]])");
  assert.match(ref.description, /既定はInformation/);
});

// ---- RA-58: Value の LanguageTag ----
test("RA-58 Value accepts an en-US language tag and rejects others", async () => {
  assert.deepEqual(
    fxOut(await fxOk('Notify(Text(Value("12", "en-US")))')),
    ["12"],
  );
  await fxErr('Notify(Text(Value("12", "ja-JP")))', /言語タグは未対応です/);
  const ref = fx.reference.find((r) => r.name === "Value");
  assert.equal(ref.syntax, "Value(Text [, LanguageTag])");
  assert.match(ref.returns, /入力がBlankまたは空文字列の場合はBlank/);
  assert.match(ref.caution, /en-USのみ対応/);
});

// ---- UI.Vision ----
const uv = getDefinition("uivision");
const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });
const uvCode = (commands) => JSON.stringify({ Name: "t", Commands: commands });
const runUv = async (commands) =>
  uv.simulate(uvCode(commands), structuredClone(uv.model.defaults));
const uvOk = async (commands) => {
  const r = await runUv(commands);
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(!err, err?.message);
  return r.paths[0];
};
const uvOut = (p) => p.outputs.map((o) => o.text);
const OPEN = cmd("open", "https://example.test/form");

// ---- D-5: 製品綴り elseIf ----
test("D-5 product spelling elseIf selects its branch", async () => {
  const p = await uvOk([
    OPEN,
    cmd("store", "2", "X"),
    cmd("if", "${X} == 1"),
    cmd("echo", "one"),
    cmd("elseIf", "${X} == 2"),
    cmd("echo", "two"),
    cmd("end"),
    cmd("echo", "after"),
  ]);
  assert.deepEqual(uvOut(p), ["two", "after"]);
  const names = uv.scan(
    uvCode([cmd("elseIf", "${X} == 2"), cmd("elseif", "${X} == 3")]),
  );
  assert.deepEqual(names, ["elseif"]);
  const ref = uv.reference.find((r) => r.name === "elseif");
  assert.match(ref.description, /elseIf/);
});

// ---- D-6: #LNF 時の !statusOK ----
test("D-6 storeText #LNF sets !statusOK to false", async () => {
  const p = await uvOk([
    OPEN,
    cmd("storeText", "id=nope", "R"),
    cmd("echo", "status=${!statusOK}"),
    cmd("echo", "R=${R}"),
  ]);
  assert.deepEqual(uvOut(p), ["status=false", "R=#LNF"]);
});
test("D-6 storeValue #LNF sets !statusOK to false", async () => {
  const p = await uvOk([
    OPEN,
    cmd("storeValue", "id=nope", "R"),
    cmd("echo", "status=${!statusOK}"),
  ]);
  assert.deepEqual(uvOut(p), ["status=false"]);
});
test("D-6 successful storeText keeps !statusOK true", async () => {
  const p = await uvOk([
    OPEN,
    cmd("storeText", "id=result", "R"),
    cmd("echo", "status=${!statusOK}"),
  ]);
  assert.deepEqual(uvOut(p), ["status=true"]);
});
test("D-6 !statusOK is sticky until manually reset with store", async () => {
  const p = await uvOk([
    OPEN,
    cmd("storeText", "id=nope", "R"),
    cmd("store", "ok", "X"),
    cmd("echo", "status=${!statusOK}"),
  ]);
  assert.deepEqual(uvOut(p), ["status=false"]);
  const p2 = await uvOk([
    OPEN,
    cmd("storeText", "id=nope", "R"),
    cmd("store", "true", "!statusOK"),
    cmd("echo", "status=${!statusOK}"),
  ]);
  assert.deepEqual(uvOut(p2), ["status=true"]);
  const ref = uv.reference.find((r) => r.name === "!statusOK");
  assert.match(ref.description, /#LNF/);
  assert.match(ref.returns, /#LNF/);
});

// ---- RA-61: assertText はパターン照合 ----
test("RA-61 assertText matches glob patterns", async () => {
  await uvOk([OPEN, cmd("click", "id=submit"), cmd("assertText", "id=result", "完*")]);
  await uvOk([OPEN, cmd("click", "id=submit"), cmd("assertText", "id=result", "完了")]);
  await uvOk([OPEN, cmd("click", "id=submit"), cmd("assertText", "id=result", "regexp:完.")]);
  const bad = await runUv([
    OPEN,
    cmd("click", "id=submit"),
    cmd("assertText", "id=result", "exact:完*"),
  ]);
  assert.match(
    (bad.error || bad.paths[0].error).message,
    /テキストが一致しません/,
  );
  const ref = uv.reference.find((r) => r.name === "assertText");
  assert.match(ref.description, /パターン/);
  assert.doesNotMatch(ref.description, /期待文字列と完全一致で検証/);
});

// ---- RA-62: echo の color 引数 ----
test("RA-62 echo documents the optional color argument", async () => {
  const ref = uv.reference.find((r) => r.name === "echo");
  assert.equal(ref.syntax, "echo | テキスト | 色（任意）");
  assert.match(ref.description, /色/);
  assert.match(ref.caution, /#shownotification/);
  const p = await uvOk([OPEN, cmd("echo", "hello", "green")]);
  assert.deepEqual(uvOut(p), ["hello"]);
});

// ---- RA-63: UI.Vision 出典 ----
test("RA-63 break/continue/!statusOK/!errorIgnore sources resolve to sections", () => {
  const ref = (n) => uv.reference.find((r) => r.name === n);
  assert.equal(ref("break").source, "https://ui.vision/rpa/docs/selenium-ide#break");
  assert.equal(ref("continue").source, "https://ui.vision/rpa/docs/selenium-ide#continue");
  assert.equal(ref("!statusOK").source, "https://ui.vision/rpa/docs/#!statusok");
  assert.equal(ref("!errorIgnore").source, "https://ui.vision/rpa/docs/#!errorignore");
});

// ---- CloudFormation RA-23〜RA-28 ----
const cf = getDefinition("cloudformation");
test("RA-23/RA-24 handler examples actually use their own field and run", async () => {
  for (const name of [
    "errorMessage",
    "region",
    "accountId",
    "transformId",
    "templateParameterValues",
    "fragment",
    "params",
    "requestId",
    "status",
  ]) {
    const ref = cf.reference.find((r) => r.name === name);
    // errorMessage／status はイベントの入力ではなく応答のキーとして使う項目
    assert.ok(
      name === "errorMessage" || name === "status"
        ? ref.example.includes(`"${name}":`)
        : ref.example.includes(`event["${name}"]`),
      `${name} example must use ${name}`,
    );
    const r = await cf.simulate(
      ref.example,
      structuredClone(cf.model.defaults),
    );
    const err = r.error || r.paths?.[0]?.error;
    assert.ok(!err, `${name} example error: ${err?.message}`);
    assert.ok(r.paths.length >= 1);
  }
  const em = cf.reference.find((r) => r.name === "errorMessage");
  assert.match(em.example, /"status": "failure"/);
  assert.match(em.example, /errorMessage/);
});
test("RA-25 Fn::Transform wording excludes itself from the fragment", () => {
  const ref = cf.reference.find((r) => r.name === "Fn::Transform");
  assert.match(ref.description, /Fn::Transform自身はfragmentに含まれません/);
});
test("RA-26 params description states top-level Transform passes empty params", () => {
  const ref = cf.reference.find((r) => r.name === "params");
  assert.match(ref.description, /トップレベルTransformのマクロでは空が渡されます/);
});
test("RA-27 Transform returns the whole converted template", () => {
  const ref = cf.reference.find((r) => r.name === "Transform");
  assert.equal(ref.returns, "変換後のテンプレート全体（Transform節を除く）");
});
test("RA-28 fragment definition matches the groups display scope", () => {
  const ref = cf.reference.find((r) => r.name === "fragment");
  assert.match(ref.description, /Transform節を除くテンプレート全体/);
  assert.match(ref.description, /Fn::Transformでは同階層の兄弟範囲/);
  const gloss = cf.glossary.find((g) => g[0].includes("断片"));
  assert.match(gloss[1], /Transform節を除くテンプレート全体/);
  assert.match(gloss[1], /Fn::Transform自身を除く/);
});

// ---- RA-59／RA-60: Power Automate 出典アンカー ----
test("RA-59/RA-60 Power Automate sources use resolvable anchors", () => {
  const pa = getDefinition("powerautomate");
  const ref = (n) => pa.reference.find((r) => r.name === n);
  assert.ok(ref("Else if").source.endsWith("conditionals#elseif"));
  assert.ok(ref("Write text to file").source.endsWith("file#writetext"));
  assert.ok(ref("Display input dialog").source.endsWith("display#inputdialog"));
  assert.ok(ref("Display message").source.endsWith("display#showmessagedialog"));
  assert.equal(
    ref("End").source,
    "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/flowcontrol#end",
  );
});

// ---- r2 個票の同期 ----
test("r2 rows for changed items match the live definitions (sha256 untouched)", () => {
  const rows = JSON.parse(
    fs.readFileSync(
      new URL("../docs/audit/reference-r2.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(rows.length, 1007); // 統合時：R23-N6 の Python math 定数＋CloudFormation 伝播で +10、修正バッチ3「数値の属性」×2種で +2、修正バッチ4 Python追随班の例外44件×2種で +88
  const targets = {
    cloudformation: ["Transform", "Fn::Transform", "fragment", "params", "region", "accountId", "transformId", "templateParameterValues", "errorMessage"],
    powerapps: ["Filter", "Sum", "Patch", "Value", "Notify"],
    powerautomate: ["Else if", "Write text to file", "Display input dialog", "Display message", "End"],
    uivision: ["echo", "elseif", "assertText", "break", "continue", "!statusOK", "!errorIgnore"],
  };
  for (const [kind, names] of Object.entries(targets)) {
    const def = getDefinition(kind);
    for (const name of names) {
      const row = rows.find((r) => r.kind === kind && r.name === name);
      const ref = def.reference.find((r) => r.name === name);
      assert.ok(row && ref, `${kind}/${name}`);
      assert.deepEqual(row.fields, {
        description: ref.description ?? "",
        returns: ref.returns ?? "",
        caution: ref.caution ?? "",
        example: ref.example ?? "",
        source: ref.source ?? "",
      });
      assert.match(row.sha256, /^[0-9a-f]{64}$/);
    }
  }
});
