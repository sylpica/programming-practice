import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const d = getDefinition("powerapps");
const run = async (code) =>
  d.simulate(code, structuredClone(d.model.defaults));
const first = async (code) => {
  const r = await run(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const outputs = (p) => p.outputs.map((o) => o.text);

// RG-75（統合）: 条件位置のテキストは "true"／"false" のみ変換され、それ以外はエラー
test("RG-75 text conditions convert only true/false and otherwise error", async () => {
  const bad = await run('Notify(If("hello", "T", "F"))');
  assert.match((bad.error || bad.paths[0].error).message, /Boolean に変換できません/);
  const bad0 = await run('Notify(If("0", "T", "F"))');
  assert.match((bad0.error || bad0.paths[0].error).message, /Boolean に変換できません/);
  assert.deepEqual(outputs(await first('Notify(If("true", "T", "F"))')), ["T"]);
  assert.deepEqual(outputs(await first('Notify(If("False", "T", "F"))')), ["F"]);
  assert.deepEqual(outputs(await first('Notify(If(2, "T", "F"))')), ["T"]);
});

// RG-02: division / remainder by zero is an error in Power Fx, never
// Infinity / NaN, on every surface (Notify, trace, stored variable).
for (const code of [
  "Set(r, 1 / 0)",
  "Set(r, -1 / 0)",
  "Set(r, 0 / 0)",
  "Set(r, 1 / Blank())",
  "Notify(Text(1 / 0))",
  "Set(x, 1 / 0); Notify(Text(x))",
]) {
  test("RG-02 division by zero stops: " + code, async () => {
    const r = await run(code);
    const err = r.error || r.paths?.[0]?.error;
    assert.ok(err, "expected an error");
    assert.match(err.message, /0 で割ることはできません/);
    assert.doesNotMatch(JSON.stringify(r.paths || []), /Infinity|NaN/);
  });
}

// RG-50 との統合裁定：Power Fx の % は後置のパーセント演算子のみで、
// 二項の剰余演算子は存在しない（剰余は Mod 関数）。したがって 5 % 0 は
// 剰余の0除算ではなく構文として停止するのが実物どおりの挙動。
test("RG-02/RG-50 binary % is not a Power Fx operator: Set(r, 5 % 0) stops", async () => {
  const r = await run("Set(r, 5 % 0)");
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err, "expected a stop");
  assert.doesNotMatch(JSON.stringify(r.paths || []), /Infinity|NaN/);
});

test("RG-02 ordinary division still works", async () => {
  const p = await first("Notify(Text(2 / 4))");
  assert.deepEqual(outputs(p), ["0.5"]);
});

// RG-16: empty / missing arguments stop as formula errors, and
// ThisRecord outside a record scope stops by name.
for (const code of [
  "Set(x, ); Notify(\"a\")",
  "Notify()",
  "Text(1, 2, 3, 4)",
  "Set(r, ThisRecord)",
  "Set(r, ThisRecord.v)",
]) {
  test("RG-16 invalid call stops: " + code, async () => {
    const r = await run(code);
    const err = r.error || r.paths?.[0]?.error;
    assert.ok(err, "expected an error");
    if (code.includes("ThisRecord"))
      assert.match(err.message, /ThisRecord/);
    else assert.match(err.message, /引数の数が正しくありません/);
  });
}

test("RG-16 Set(x, ) no longer erases an existing value silently", async () => {
  const p = await first("Set(x, 1); Set(y, 2)");
  assert.equal(p.model.variables.x, 1);
  const r = await run("Set(x, 1); Set(x, ); Notify(Text(x))");
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err);
  assert.equal(r.paths[0].model.variables.x, 1);
});

test("RG-16 ThisRecord inside record scopes still works", async () => {
  const p = await first(
    "ClearCollect(t, {v: 3}); Set(s, Sum(t, ThisRecord.v)); Notify(Text(s))",
  );
  assert.deepEqual(outputs(p), ["3"]);
  const q = await first(
    "ForAll(Sequence(3), ThisRecord.Value * 2); Notify(\"ok\")",
  );
  assert.deepEqual(outputs(q), ["ok"]);
});

// RG-15: Text(Value, Format) honours the numeric format argument.
// Expected values are the examples in Microsoft's Text function docs.
for (const [code, expected] of [
  ['Set(r, Text(123.456, "0.00")); Notify(r)', "123.46"],
  ['Set(r, Text(5, "000")); Notify(r)', "005"],
  ['Set(r, Text(1234567, "#,##0")); Notify(r)', "1,234,567"],
  ['Set(r, Text(0.5, "0%")); Notify(r)', "50%"],
  ['Set(r, Text(1234.59, "####.#")); Notify(r)', "1234.6"],
  ['Set(r, Text(8.9, "#.000")); Notify(r)', "8.900"],
  ['Set(r, Text(0.631, "0.#")); Notify(r)', "0.6"],
  ['Set(r, Text(12, "#.0#")); Notify(r)', "12.0"],
  ['Set(r, Text(1234.568, "#.0#")); Notify(r)', "1234.57"],
  ['Set(r, Text(12000, "$ #,###")); Notify(r)', "$ 12,000"],
  ['Set(r, Text(-1234.5, "0.0")); Notify(r)', "-1234.5"],
  ['Set(r, Text(5, "0.00", "en-US")); Notify(r)', "5.00"],
]) {
  test("RG-15 Text format: " + code, async () => {
    const p = await first(code);
    assert.deepEqual(outputs(p), [expected]);
  });
}

for (const code of [
  'Set(r, Text(5, "yyyy"))',
  'Set(r, Text(5, "0.00", "ja-JP"))',
  'Set(r, Text("a", "0.00"))',
]) {
  test("RG-15 unsupported Text format stops by name: " + code, async () => {
    const r = await run(code);
    const err = r.error || r.paths?.[0]?.error;
    assert.ok(err, "expected an error");
    assert.match(err.message, /Text/);
  });
}

// RG-18: LookUp's reduction formula is honoured, and record values are
// never stringified as "[object Object]".
test("RG-18 LookUp with reduction formula returns the column value", async () => {
  const p = await first(
    "ClearCollect(t, {v: 1}, {v: 5}); Notify(Text(LookUp(t, v > 2, v)))",
  );
  assert.deepEqual(outputs(p), ["5"]);
});

test("RG-18 LookUp reduction may be any record-scope formula", async () => {
  const p = await first(
    "ClearCollect(t, {v: 1}, {v: 5}); Set(x, LookUp(t, v > 2, v * 10)); Notify(Text(x))",
  );
  assert.deepEqual(outputs(p), ["50"]);
  const q = await first(
    "ClearCollect(t, {v: 1}, {v: 5}); Notify(Text(LookUp(t, v > 2, ThisRecord.v)))",
  );
  assert.deepEqual(outputs(q), ["5"]);
  const r = await first(
    "ClearCollect(t, {v: 1}, {v: 5}); Set(x, LookUp(t, v > 99, v)); Notify(Text(x))",
  );
  assert.deepEqual(outputs(r), [""]);
});

test("RG-18 record Text() is a human-readable display, not [object Object]", async () => {
  const p = await first(
    "ClearCollect(t, {v: 1}, {v: 5}); Notify(Text(LookUp(t, v > 2)))",
  );
  assert.doesNotMatch(outputs(p)[0], /\[object Object\]/);
  assert.match(outputs(p)[0], /"v": 5/);
});

test("RG-18 Filter + CountRows behaviour is unchanged", async () => {
  const p = await first(
    "ClearCollect(t, {v: 1}, {v: 5}); Notify(Text(CountRows(Filter(t, v > 2))))",
  );
  assert.deepEqual(outputs(p), ["1"]);
});

// RG-50 (R16-N7, function-name part): the official function forms
// And / Or / Not work in any casing, as do capitalised Boolean literals.
for (const [code, expected] of [
  ["Notify(Text(Not(false)))", "true"],
  ["Notify(Text(NOT(true)))", "false"],
  ["Notify(Text(not(false)))", "true"],
  ["Notify(Text(And(true, true)))", "true"],
  ["Notify(Text(And(true, false)))", "false"],
  ["Notify(Text(Or(false, true)))", "true"],
  ["Notify(Text(and(true, true)))", "true"],
  ["Notify(Text(or(false, true)))", "true"],
  ["Notify(Text(IF(true, 1, 2)))", "1"],
  ["Notify(Text(True))", "true"],
  ["Notify(Text(TRUE))", "true"],
  ["Notify(Text(False))", "false"],
]) {
  test("RG-50 function form: " + code, async () => {
    const p = await first(code);
    assert.deepEqual(outputs(p), [expected]);
  });
}

// RG-07（統合）: Power Fx の in／exactin を評価する（文字列の部分一致とテーブルの包含）
test("RG-07 Power Fx in/exactin evaluate substrings and table membership", async () => {
  const v = async (code) => (await first(code)).vars.r;
  assert.equal(await v('Set(r, "ell" in "hello")'), true);
  assert.equal(await v('Set(r, "ELL" in "hello")'), true); // in は大小無区別
  assert.equal(await v('Set(r, "ELL" exactin "hello")'), false); // exactin は区別
  assert.equal(await v('Set(r, "ell" exactin "hello")'), true);
  assert.equal(await v("Set(r, 2 in [1, 2, 3])"), true);
  assert.equal(await v('Set(r, "b" in ["a", "B", "c"])'), true);
  assert.equal(await v('Set(r, {Name: "pen"} in [{Name: "pen", Price: 100}])'), true);
  const bad = await run("Set(r, 1 in 2)");
  assert.ok(bad.error || bad.paths?.[0]?.error);
});

// RG-10 追加表面（R21-N17）: 現在の画面がモデルに無い UpdateContext で
// 生の TypeError を露出しない。画面名を挙げた日本語メッセージで停止する。
test("RG-10 UpdateContext with a missing current screen fails in Japanese", async () => {
  const d = getDefinition("powerapps");
  const bad = structuredClone(d.model.defaults);
  bad.screen = "存在しない画面";
  for (const code of ["UpdateContext({Count: 1})", d.templates.find((t) => t.id === "fx-record").code]) {
    const r = await d.simulate(code, structuredClone(bad));
    const e = r.error || r.paths?.[0]?.error;
    assert.ok(e, code);
    assert.match(e.message, /現在の画面『存在しない画面』がモデルにありません/);
    assert.ok(!/Cannot read properties/.test(e.message), e.message);
  }
  const ok = await d.simulate("UpdateContext({Count: 1})", structuredClone(d.model.defaults));
  assert.ok(!ok.error, JSON.stringify(ok.error));
});
