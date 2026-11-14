// RG-10 追加表面（統合・R19-N4）: 入力 null は生 TypeError でなく検証メッセージで停止
test("RG-10 surface a null document gets the array-required message", async () => {
  const { getDefinition } = await import("../js/types/registry.js");
  for (const [id, key] of [["powerautomate", "actions"], ["uivision", "Commands"]]) {
    const d = getDefinition(id);
    const r = await d.simulate("null", structuredClone(d.model.defaults));
    assert.match((r.error || r.paths?.[0]?.error).message, new RegExp(key + " 配列が必要です"));
    assert.doesNotMatch((r.error || r.paths?.[0]?.error).message, /Cannot read properties/);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
const run = async (id, code, model) => {
  let d = getDefinition(id);
  return d.simulate(code, model || structuredClone(d.model.defaults));
};
const first = async (id, code, model) => {
  let r = await run(id, code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const output = (p) => p.outputs.map((o) => o.text).join("\n");
const pa = (actions) => JSON.stringify({ name: "学習フロー", actions });
const uiv = (Commands) => JSON.stringify({ Name: "練習マクロ", Commands });
const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });

/* RG-17: ImageJ 対応関数の実装不備 */
test("RG-17 changeValues actually replaces known pixels in range", async () => {
  let p = await first("imagej", "setPixel(2, 2, 50); changeValues(0, 255, 9); print(getPixel(2, 2));");
  assert.equal(output(p), "9");
  let q = await first("imagej", "changeValues(90, 110, 7); print(getPixel(0, 0));");
  assert.equal(output(q), "7");
  let r = await first("imagej", "setPixel(1, 1, 20); changeValues(90, 110, 7); print(getPixel(1, 1));");
  assert.equal(output(r), "20");
});
test("RG-17 setMinAndMax is reflected by getMinAndMax", async () => {
  let p = await first("imagej", "setMinAndMax(10, 200); getMinAndMax(lo, hi); print(lo, hi);");
  assert.equal(output(p), "10 200");
  let q = await first("imagej", "getMinAndMax(lo, hi); print(lo, hi);");
  assert.equal(output(q), "0 255");
});
test("RG-17 endsWith with empty suffix is 1, d2s keeps Infinity/NaN intact", async () => {
  let p = await first("imagej", 'print(endsWith("abc", "")); print(endsWith("abc", "c")); print(endsWith("abc", "d"));');
  assert.equal(output(p), "1\n1\n0");
  let q = await first("imagej", "print(d2s(1.0 / 0.0, 2)); print(d2s(0.0 / 0.0, 2)); print(d2s(-1.0 / 0.0, 2)); print(d2s(3.14159, 2));");
  assert.equal(output(q), "Infinity\nNaN\n-Infinity\n3.14");
});
test("RG-17 selectionType returns codes for line and polyline selections", async () => {
  assert.equal(output(await first("imagej", "makeLine(0, 0, 10, 10); print(selectionType());")), "5");
  assert.equal(output(await first("imagej", "xs=newArray(0,10,10); ys=newArray(0,0,10); makeSelection(\"polyline\", xs, ys); print(selectionType());")), "6");
  assert.equal(output(await first("imagej", "makeLine(0, 0, 10, 10, 20, 0); print(selectionType());")), "6");
  assert.equal(output(await first("imagej", "makeRectangle(1, 2, 3, 4); print(selectionType());")), "0");
  assert.equal(output(await first("imagej", "xs=newArray(0,10); ys=newArray(0,10); makeSelection(\"point\", xs, ys); print(selectionType());")), "10");
  assert.equal(output(await first("imagej", "print(selectionType());")), "-1");
});
test("RG-17 getBoundingRect accepts unassigned output variables", async () => {
  let p = await first("imagej", "makeRectangle(1, 2, 3, 4); getBoundingRect(x, y, w, h); print(x, y, w, h);");
  assert.equal(output(p), "1 2 3 4");
  let q = await first("imagej", "getBoundingRect(x, y, w, h); print(w, h);");
  assert.equal(output(q), "512 512");
});
test("RG-17 other output-argument functions accept unassigned variables", async () => {
  assert.equal(output(await first("imagej", "getDimensions(w, h, ch, sl, fr); print(w, h, ch);")), "512 512 1");
  assert.equal(output(await first("imagej", "makeRectangle(1, 2, 3, 4); getSelectionBounds(x, y, w, h); print(x, y, w, h);")), "1 2 3 4");
  assert.equal(output(await first("imagej", "setThreshold(10, 100); getThreshold(lo, hi); print(lo, hi);")), "10 100");
  assert.equal(output(await first("imagej", "getVoxelSize(vw, vh, vd, unit); print(vw, unit);")), "1 pixels");
  let p = await first("imagej", "getStatistics(area, mean, mn, mx, std); print(area);");
  assert.equal(output(p), "262144");
});

/* RG-26: ImageJ macro "…" { } 定義は本文を実行しない */
test("RG-26 macro definition registers only and does not execute its body", async () => {
  let p = await first("imagej", 'macro "Macro 1" { print("This is Macro 1"); }');
  assert.equal(output(p), "");
  let q = await first("imagej", 'print("before"); macro "M" { print("inside"); } print("after");');
  assert.equal(output(q), "before\nafter");
  let r = await first("imagej", 'macro "M" { var gx = 7; print("inside"); } print("done");');
  assert.equal(output(r), "done");
  assert.ok(!Object.hasOwn(r.vars, "gx"));
});

/* RG-41: パス条件ラベルはコードの表記を忠実に引用する */
test("RG-41 condition labels do not add () to bare built-in calls", async () => {
  let p = await first("imagej", 'if (nImages == 0) { print("none"); } else { print("some"); }');
  assert.ok(p.trace.some((t) => t.text.includes("条件（nImages == 0）")), JSON.stringify(p.trace));
  assert.ok(!p.trace.some((t) => t.text.includes("nImages()")));
  let q = await first("imagej", 'if (nResults == 0) { print("none"); }');
  assert.ok(q.trace.some((t) => t.text.includes("条件（nResults == 0）")));
  let r = await first("imagej", 'if (nSlices > 1) { print("stack"); } else { print("single"); }');
  assert.ok(r.trace.some((t) => t.text.includes("条件（nSlices > 1）")));
  let s = await first("imagej", 'if (getWidth() > 100) { print("wide"); }');
  assert.ok(s.trace.some((t) => t.text.includes("条件（getWidth() > 100）")));
  let t2 = await first("imagej", 'x = 5; if (x == 5) { print("five"); }');
  assert.ok(t2.trace.some((t) => t.text.includes("条件（x == 5）")));
});

/* RG-02 (Power Automate 分): 0除算は明示エラーにする */
test("RG-02 Power Automate division/modulo by zero is an explicit error, not Infinity/NaN", async () => {
  for (let expr of ["%1 / 0%", "%1.5 / 0%", "%0 / 0%", "%5 % 0%"]) {
    let p = await first("powerautomate", pa([{ action: "Set variable", target: "x", value: expr }]));
    assert.ok(p.error, expr);
    assert.match(p.error.message, /0 で除算しました/);
    assert.ok(!Object.hasOwn(p.vars, "x"), expr);
    assert.ok(!JSON.stringify(p.vars).includes("Infinity"));
  }
  let viaVar = await first("powerautomate", pa([
    { action: "Set variable", target: "x", value: 1 },
    { action: "Set variable", target: "y", value: "%x / 0%" },
  ]));
  assert.match(viaVar.error.message, /0 で除算しました/);
  let ok = await first("powerautomate", pa([
    { action: "Set variable", target: "a", value: "%7 / 2%" },
    { action: "Set variable", target: "b", value: "%7 % 3%" },
  ]));
  assert.equal(ok.vars.a, 3.5);
  assert.equal(ok.vars.b, 1);
});

/* RG-34: Power Automate の公式ブールリテラル True/False */
test("RG-34 Power Automate accepts PAD boolean literals True/False", async () => {
  let p = await first("powerautomate", pa([
    { action: "Set variable", target: "t", value: "%True%" },
    { action: "Set variable", target: "f", value: "%False%" },
    { action: "Set variable", target: "lt", value: "%true%" },
    { action: "Set variable", target: "lf", value: "%false%" },
  ]));
  assert.equal(p.vars.t, true);
  assert.equal(p.vars.f, false);
  assert.equal(p.vars.lt, true);
  assert.equal(p.vars.lf, false);
  let yes = await first("powerautomate", pa([
    { action: "If", condition: "%True%" },
    { action: "Display message", value: "yes" },
    { action: "Else" },
    { action: "Display message", value: "no" },
    { action: "End" },
  ]));
  assert.equal(output(yes), "yes");
  let no = await first("powerautomate", pa([
    { action: "If", condition: "%False%" },
    { action: "Display message", value: "yes" },
    { action: "Else" },
    { action: "Display message", value: "no" },
    { action: "End" },
  ]));
  assert.equal(output(no), "no");
  let msg = await first("powerautomate", pa([
    { action: "Display message", value: "結果：%True%" },
  ]));
  assert.equal(output(msg), "結果：True");
});

/* RG-22: UI.Vision のテキスト由来変数をスクリプト評価では数値として扱う */
test("RG-22 UI.Vision official while idiom counts 0, 1, 2 with numeric typing", async () => {
  let p = await first("uivision", uiv([
    cmd("store", "0", "count"),
    cmd("while", "${count} < 3"),
    cmd("echo", "${count}"),
    cmd("executeScript_Sandbox", "return ${count} + 1;", "count"),
    cmd("end"),
  ]));
  assert.equal(output(p), "0\n1\n2");
  assert.equal(p.vars.count, 3);
  let q = await first("uivision", uiv([
    cmd("store", "42", "n"),
    cmd("executeScript_Sandbox", "return ${n} * 2;", "doubled"),
    cmd("store", "abc", "s"),
    cmd("executeScript_Sandbox", "return ${s} + \"!\";", "shouted"),
    cmd("store", "007", "code"),
    cmd("echo", "${code}"),
  ]));
  assert.equal(q.vars.doubled, 84);
  assert.equal(q.vars.shouted, "abc!");
  assert.equal(output(q), "007");
  assert.equal(q.vars.n, "42");
});

/* RG-10: 入力形式・ブロック検証の原因表示 */
test("RG-10 JSON syntax errors name the actual problem", async () => {
  let paTrailing = await run("powerautomate", '{"name":"学習フロー","actions":[{"action":"Set variable","target":"x","value":1,}]}');
  assert.match(paTrailing.error.message, /末尾のカンマ/);
  assert.doesNotMatch(paTrailing.error.message, /キーは文字列/);
  let uivTrailing = await run("uivision", '{"Name":"m","Commands":[{"Command":"echo","Target":"a","Value":""},]}');
  assert.match(uivTrailing.error.message, /末尾のカンマ|値が抜けています/);
  assert.doesNotMatch(uivTrailing.error.message, /キーは文字列/);
  let cfnCut = await run("cloudformation", '{"Resources": {"Bucket": ');
  assert.match(cfnCut.error.message, /途中で終わっています/);
  let unquotedKey = await run("powerautomate", "{name: 1}");
  assert.match(unquotedKey.error.message, /キーは文字列で指定してください/);
  let badLiteral = await run("powerautomate", '{"name": abc}');
  assert.match(badLiteral.error.message, /JSONの値が不正です：abc/);
  let openString = await run("powerautomate", '{"name": "abc}');
  assert.match(openString.error.message, /文字列が閉じられていません/);
});
test("RG-10 CloudFormation YAML short tags become an unsupported declaration", async () => {
  let code = [
    'AWSTemplateFormatVersion: "2010-09-09"',
    "Resources:",
    "  Bucket:",
    "    Type: AWS::S3::Bucket",
    "    Properties:",
    "      BucketName: !If [IsProd, prod, dev]",
  ].join("\n");
  let r = await run("cloudformation", code);
  assert.match(r.error.message, /未対応：YAML短縮タグ !If/);
  assert.doesNotMatch(r.error.message, /unknown tag/);
});
test("RG-10 UI.Vision forEach block reports the start command as unsupported", async () => {
  let r = await run("uivision", uiv([
    cmd("executeScript_Sandbox", "return [1, 2];", "items"),
    cmd("forEach", "${items}", "item"),
    cmd("echo", "${item}"),
    cmd("end"),
  ]));
  assert.equal(r.paths.length, 1);
  assert.match(r.paths[0].error.message, /このコマンドは説明に対応していません：forEach/);
  assert.doesNotMatch(r.paths[0].error.message, /対応する開始アクションがありません/);
  let noEnd = await run("uivision", uiv([cmd("forEach", "${items}", "item"), cmd("echo", "x")]));
  assert.match(noEnd.error.message, /forEach に対応するEndがありません/);
});

/* RG-25: CloudFormation の未設定値 "undefined" をメッセージに混入させない */
test("RG-25 array-form Fn::Transform runs model macros in order", async () => {
  let code = JSON.stringify({
    Resources: {
      Bucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          "Fn::Transform": [
            { Name: "AddMetadata", Parameters: { Stage: "prod" } },
          ],
          BucketName: "practice-bucket",
        },
      },
    },
  });
  let p = await first("cloudformation", code);
  assert.equal(p.fragment.Resources.Bucket.Properties.Metadata.Stage, "prod");
  assert.doesNotMatch(JSON.stringify(p), /undefined/);
  let missing = await run("cloudformation", JSON.stringify({
    Resources: { Bucket: { "Fn::Transform": [{ Parameters: {} }] } },
  }));
  assert.match(missing.error.message, /マクロ名（Name）が含まれていません/);
  assert.doesNotMatch(JSON.stringify(missing), /undefined/);
  let missingObj = await run("cloudformation", JSON.stringify({
    Resources: { Bucket: { "Fn::Transform": { Parameters: {} } } },
  }));
  assert.match(missingObj.error.message, /マクロ名（Name）が含まれていません/);
});
test("RG-25 handler response without status reports the missing status", async () => {
  let noStatus = await first("cloudformation", [
    "def handler(event, context):",
    '    return {"requestId": event["requestId"], "fragment": event["fragment"]}',
  ].join("\n"));
  assert.match(noStatus.error.message, /statusが含まれていません/);
  assert.doesNotMatch(JSON.stringify(noStatus), /undefined/);
  let failed = await first("cloudformation", [
    "def handler(event, context):",
    '    return {"requestId": event["requestId"], "status": "failure", "errorMessage": "boom", "fragment": event["fragment"]}',
  ].join("\n"));
  assert.equal(failed.error.message, "マクロが失敗しました：boom");
});
