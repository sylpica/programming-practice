import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ12（CloudFormation班）: RG-371（第33ラウンド R33-N8／
// findings-r33-f01b §4 R33-F01B-N1）
// Fn::Transform の Parameters が型違いのとき、存在する Name の欠落を
// 虚偽の原因として示していた。AWS 公式仕様（Fn::Transform の構文:
// Name は文字列、Parameters はオブジェクト）に基づき、検証を
// 「指定自体の型／Name の有無／Name の型／Parameters の型」に切り分け、
// それぞれ真因だけを名指す文言で停止させる。
// トップレベル Transform は汎用の正しい文言のまま壊さない（回帰確認）。

const cf = getDefinition("cloudformation");
const cfRun = async (code) =>
  cf.simulate(code, structuredClone(cf.model.defaults));
const HOST_LEAK = /Maximum call stack|Cannot read properties|is not a function|TypeError|RangeError/;

const MISSING_MSG =
  "Fn::Transformの指定にマクロ名（Name）が含まれていません（NameとParametersのオブジェクト、またはその配列で指定してください）";
const SPEC_MSG =
  "Fn::Transformの指定がオブジェクトではありません（NameとParametersのオブジェクト、またはその配列で指定してください）";
const NAME_MSG =
  "Fn::TransformのNameは空でない文字列で指定してください（NameとParametersのオブジェクト、またはその配列で指定してください）";
const PARAMS_MSG =
  "Fn::TransformのParametersはオブジェクトで指定してください（NameとParametersのオブジェクト、またはその配列で指定してください）";
const TRANSFORM_MSG =
  "Transformにはマクロ名またはNameとParametersのオブジェクトを指定してください";

const fnCase = (v) =>
  JSON.stringify({ Resources: { R: { "Fn::Transform": v } } });
const errMsg = async (code) => {
  const r = await cfRun(code);
  assert.ok(r.error, "must stop: " + code);
  assert.doesNotMatch(r.error.message, HOST_LEAK);
  return r.error.message;
};

/* ---------- 本件: Parameters 型違いは Parameters を名指す ---------- */

test("RG-371 Parameters of wrong type names Parameters, never missing Name", async () => {
  for (const p of [42, "x", [], null, true]) {
    const msg = await errMsg(fnCase({ Name: "AddMetadata", Parameters: p }));
    assert.equal(msg, PARAMS_MSG, JSON.stringify(p));
    assert.doesNotMatch(msg, /含まれていません/);
  }
});

test("RG-371 Parameters wrong type in array-form elements names Parameters", async () => {
  assert.equal(
    await errMsg(fnCase([{ Name: "AddMetadata", Parameters: 42 }])),
    PARAMS_MSG,
  );
  // 2番目の要素の型違いも、1番目の正常要素に引きずられず名指す
  assert.equal(
    await errMsg(
      fnCase([{ Name: "AddMetadata" }, { Name: "AddMetadata", Parameters: "x" }]),
    ),
    PARAMS_MSG,
  );
});

test("RG-371 Parameters wrong type nested inside an array element names Parameters", async () => {
  const code = JSON.stringify({
    Resources: { A: [{ "Fn::Transform": { Name: "AddMetadata", Parameters: [] } }] },
  });
  assert.equal(await errMsg(code), PARAMS_MSG);
});

test("RG-371 Parameters wrong type in YAML form names Parameters", async () => {
  const msg = await errMsg(
    "Resources:\n  R:\n    Fn::Transform:\n      Name: AddMetadata\n      Parameters: 42\n",
  );
  assert.equal(msg, PARAMS_MSG);
});

/* ---------- Name の真の欠落は従来文言を維持 ---------- */

test("RG-371 truly missing Name keeps the original message", async () => {
  assert.equal(await errMsg(fnCase({ Parameters: {} })), MISSING_MSG);
  assert.equal(
    await errMsg(fnCase({ Parameters: { Stage: "test" } })),
    MISSING_MSG,
  );
  assert.equal(await errMsg(fnCase({})), MISSING_MSG);
  assert.equal(await errMsg(fnCase([{ Parameters: {} }])), MISSING_MSG);
  assert.equal(
    await errMsg(fnCase([{ Name: "AddMetadata" }, { Parameters: {} }])),
    MISSING_MSG,
  );
  // Name 欠落と Parameters 型違いが重なっても、欠落の指摘自体は真実
  assert.equal(await errMsg(fnCase({ Parameters: 42 })), MISSING_MSG);
});

/* ---------- Name の型違いは Name を名指す ---------- */

test("RG-371 Name of wrong type names Name, never missing Name", async () => {
  for (const n of [123, null, "", true, [], {}]) {
    const msg = await errMsg(fnCase({ Name: n }));
    assert.equal(msg, NAME_MSG, JSON.stringify(n));
    assert.doesNotMatch(msg, /含まれていません/);
  }
  // Name と Parameters の両方が型違いなら、先に Name を名指す
  assert.equal(
    await errMsg(fnCase({ Name: 123, Parameters: 42 })),
    NAME_MSG,
  );
});

/* ---------- 指定自体がオブジェクトでない形 ---------- */

test("RG-371 non-object Fn::Transform spec names the spec form", async () => {
  for (const v of [42, "x", null, true, [42], [["x"]], [{ Name: "AddMetadata" }, 42]]) {
    const msg = await errMsg(fnCase(v));
    assert.equal(msg, SPEC_MSG, JSON.stringify(v));
    assert.doesNotMatch(msg, /含まれていません/);
  }
});

test("RG-371 empty Fn::Transform array keeps the original message (no spec exists)", async () => {
  // 要素が無く Name を含む指定が存在しないため、従来文言は真実であり維持
  assert.equal(await errMsg(fnCase([])), MISSING_MSG);
});

/* ---------- 合法形は受理され、正常に実行される ---------- */

test("RG-371 Parameters omitted / empty / valid object forms run normally", async () => {
  const withProps = (spec) =>
    JSON.stringify({
      Resources: {
        Bucket: {
          Properties: { "Fn::Transform": spec, BucketName: "b" },
        },
      },
    });
  // Parameters 欠落は合法（空が渡る）
  let r = await cfRun(withProps({ Name: "AddMetadata" }));
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(
    r.paths[0].fragment.Resources.Bucket.Properties.Metadata.Stage,
    "dev",
  );
  // Parameters 空オブジェクトも合法
  r = await cfRun(withProps({ Name: "AddMetadata", Parameters: {} }));
  assert.ok(!r.error, JSON.stringify(r.error));
  // Parameters が正しいオブジェクトなら値が渡る
  r = await cfRun(
    withProps({ Name: "AddMetadata", Parameters: { Stage: "prod" } }),
  );
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(
    r.paths[0].fragment.Resources.Bucket.Properties.Metadata.Stage,
    "prod",
  );
  // 配列形の正常要素も従来どおり実行される
  r = await cfRun(withProps([{ Name: "AddMetadata", Parameters: { Stage: "test" } }]));
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(
    r.paths[0].fragment.Resources.Bucket.Properties.Metadata.Stage,
    "test",
  );
});

/* ---------- トップレベル Transform の回帰（文言・挙動不変） ---------- */

test("RG-371 top-level Transform keeps its generic correct message for all bad forms", async () => {
  const bad = [
    { Name: "AddMetadata", Parameters: 42 },
    { Name: "AddMetadata", Parameters: "x" },
    { Name: "AddMetadata", Parameters: [] },
    { Name: "AddMetadata", Parameters: null },
    123,
    null,
    "",
    false,
    0,
    {},
    { Name: "" },
    { Name: null },
    { Name: 123 },
    [123],
    [""],
    [null],
  ];
  for (const t of bad) {
    const msg = await errMsg(
      JSON.stringify({ Transform: t, Resources: {} }),
    );
    assert.equal(msg, TRANSFORM_MSG, JSON.stringify(t));
  }
});

test("RG-371 top-level Transform valid forms and empty array stay accepted", async () => {
  for (const t of [
    "AddMetadata",
    ["AddMetadata"],
    { Name: "AddMetadata" },
    { Name: "AddMetadata", Parameters: { Stage: "test" } },
    [],
  ]) {
    const r = await cfRun(JSON.stringify({ Transform: t, Resources: {} }));
    assert.ok(!r.error, JSON.stringify(t) + ": " + JSON.stringify(r.error));
    assert.equal(r.paths.length, 1);
  }
});
