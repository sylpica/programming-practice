import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ4（R25-N4／R25-N6）
// N4: CloudFormation 外側 catch のガード。著作者エラー（名前入り日本語
// 文面＋line／category を持つもの）はバイト単位で素通しし、ホスト例外
// （RangeError／TypeError 等の生文言）だけを学習者向け日本語へ変換する。
// あわせて再帰 YAML エイリアスは走査前の循環検出で原因を名指して止める。
// N6: ImageJ simulate 冒頭の長さ検査を try の内側へ移し、null コードでも
// 例外を投げず変換済みエラー結果を返す。

const cf = getDefinition("cloudformation");
const ij = getDefinition("imagej");
const cfRun = async (code, model) =>
  cf.simulate(code, model ?? structuredClone(cf.model.defaults));
const HOST_LEAK = /Maximum call stack|Cannot read properties|is not a function|MARKER/;

/* ---------------- N4: ホスト例外の変換 ---------------- */

test("R25-N4 recursive YAML alias (list form) stops naming the circular reference", async () => {
  const r = await cfRun("a: &x [*x]");
  assert.match(r.error.message, /循環参照があります/);
  assert.match(r.error.message, /YAMLエイリアスなどが自分自身を参照しています/);
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

test("R25-N4 recursive YAML alias (map form) stops naming the circular reference", async () => {
  const r = await cfRun("a: &x\n  b: *x");
  assert.match(r.error.message, /循環参照があります/);
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

test("R25-N4 self-referencing root alias stops naming the circular reference", async () => {
  const r = await cfRun("a: &root\n  self: *root");
  assert.match(r.error.message, /循環参照があります/);
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

test("R25-N4 shared (non-circular) aliases keep working", async () => {
  const r = await cfRun("a: &x [1, 2]\nb: *x\nc: *x");
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
});

test("R25-N4 finite deep nesting (50/200/1000) keeps working", async () => {
  for (const depth of [50, 200, 1000]) {
    const lines = [];
    for (let i = 0; i < depth; i++) lines.push("  ".repeat(i) + "k" + i + ":");
    lines.push("  ".repeat(depth) + "leaf: 1");
    const r = await cfRun(lines.join("\n"));
    assert.ok(!r.error, `depth=${depth}: ${JSON.stringify(r.error)}`);
    assert.equal(r.paths.length, 1);
  }
});

// 修正バッチ11・fx班（RG-361／R32-F01B-N3）で期待値を更新: R25 時点では
// 「ホスト例外の変換文言」が期待だった3形は、R32 監査で「他種の RG-345
// 水準のモデル形状検証でモデル／項目を名指すべき欠陥」と再判定された。
// 変換の検証（生文言が漏れないこと）は維持し、文言は新しい入口検証の
// 名指し文言＋カテゴリ「モデルエラー」に厳密化した（弱体化ではない）。
test("R25-N4 null model is converted to a learner message", async () => {
  const r = await cf.simulate("Resources: {}", null);
  assert.equal(r.error.message, "モデルはオブジェクト（JSON）で指定してください");
  assert.equal(r.error.category, "モデルエラー");
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

test("R25-N4 undefined model is converted to a learner message", async () => {
  const r = await cf.simulate("Resources: {}", undefined);
  assert.equal(r.error.message, "モデルはオブジェクト（JSON）で指定してください");
  assert.equal(r.error.category, "モデルエラー");
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

test("R25-N4 numeric macro definition is converted, not leaked", async () => {
  const m = structuredClone(cf.model.defaults);
  m.macros = { AddMetadata: 123 };
  const r = await cfRun(
    JSON.stringify({ Transform: "AddMetadata", Resources: {} }),
    m,
  );
  assert.equal(r.error.message, "モデルmacros.AddMetadataは文字列で指定してください");
  assert.equal(r.error.category, "モデルエラー");
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

test("R25-N4 simulate(null) code is converted, not leaked", async () => {
  const r = await cf.simulate(null, structuredClone(cf.model.defaults));
  assert.equal(r.error.message, "null / undefined のプロパティは参照できません");
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

test("R25-N4 simulate(123) code is converted, not leaked", async () => {
  const r = await cf.simulate(123, structuredClone(cf.model.defaults));
  assert.equal(r.error.message, "処理中に予期しないエラーが発生しました");
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

test("R25-N4 a throwing model getter does not leak its marker message", async () => {
  const m = structuredClone(cf.model.defaults);
  Object.defineProperty(m, "event", {
    get() {
      throw new Error("MARKER_GETTER_SECRET");
    },
  });
  const r = await cfRun("Resources: {}", m);
  assert.equal(r.error.message, "処理中に予期しないエラーが発生しました");
  assert.doesNotMatch(r.error.message, HOST_LEAK);
});

/* ---------------- N4: 著作者エラーの素通し（バイト単位） ---------------- */

test("R25-N4 author error: built-in Transform stays byte-identical", async () => {
  const r = await cfRun(
    JSON.stringify({ Transform: "AWS::Include", Resources: {} }),
  );
  assert.equal(
    r.error.message,
    "未対応：組込みTransformの実際の変換・外部サービスへの接続は実装していません：AWS::Include",
  );
  assert.equal(r.error.category, "未対応");
  assert.equal(r.error.line, 1);
});

test("R25-N4 author error: unknown macro stays byte-identical", async () => {
  const r = await cfRun(
    JSON.stringify({ Transform: "NoSuchMacroXYZ", Resources: {} }),
  );
  assert.equal(
    r.error.message,
    "未確認：モデルにマクロ定義がありません：NoSuchMacroXYZ",
  );
  assert.equal(r.error.line, 1);
});

test("R25-N4 author error: non-object template stays byte-identical", async () => {
  const r = await cfRun("# just a comment\n");
  assert.equal(r.error.message, "テンプレートはオブジェクトで指定してください");
});

test("R25-N4 author error: bad Fn::Transform spec stays byte-identical", async () => {
  const r = await cfRun(
    JSON.stringify({ Resources: { B: { "Fn::Transform": { Parameters: {} } } } }),
  );
  assert.equal(
    r.error.message,
    "Fn::Transformの指定にマクロ名（Name）が含まれていません（NameとParametersのオブジェクト、またはその配列で指定してください）",
  );
});

test("R25-N4 author error: bad Transform spec stays byte-identical", async () => {
  const r = await cfRun(JSON.stringify({ Transform: 123, Resources: {} }));
  assert.equal(
    r.error.message,
    "Transformにはマクロ名またはNameとParametersのオブジェクトを指定してください",
  );
});

test("R25-N4 author error: YAML short tag stays byte-identical", async () => {
  const r = await cfRun("Resources:\n  B: !Ref Thing");
  assert.equal(
    r.error.message,
    "未対応：YAML短縮タグ !Ref はこのモデルでは未対応です（Fn::Ref のような完全な表記で書いてください）",
  );
});

test("R25-N4 author error: handler ZeroDivisionError via macro stays byte-identical", async () => {
  const m = structuredClone(cf.model.defaults);
  m.macros = {
    Boom:
      'def handler(event, context):\n    x = 1/0\n    return {"requestId": event["requestId"], "status": "success", "fragment": event["fragment"]}',
  };
  const r = await cfRun(JSON.stringify({ Transform: "Boom", Resources: {} }), m);
  assert.equal(
    r.paths[0].error.message,
    "ZeroDivisionError：0 で割り算（または余り）を求めることはできません",
  );
  assert.equal(r.paths[0].error.line, 2);
});

test("R25-N4 author error: handler KeyError via macro stays byte-identical", async () => {
  const m = structuredClone(cf.model.defaults);
  m.macros = {
    Boom:
      'def handler(event, context):\n    x = event["nope_xyz"]\n    return {"requestId": event["requestId"], "status": "success", "fragment": event["fragment"]}',
  };
  const r = await cfRun(JSON.stringify({ Transform: "Boom", Resources: {} }), m);
  assert.equal(
    r.paths[0].error.message,
    "KeyError：キー 'nope_xyz' は辞書にありません",
  );
  assert.equal(r.paths[0].error.line, 2);
});

/* ---------------- N6: ImageJ 冒頭検査の位置 ---------------- */

test("R25-N6 imagej simulate(null) returns a converted error instead of throwing", async () => {
  const r = await ij.simulate(null, structuredClone(ij.model.defaults));
  assert.deepEqual(r.paths, []);
  assert.equal(r.error.line, 1);
  assert.equal(r.error.message, "null / undefined のプロパティは参照できません");
});

test("R25-N6 imagej simulate(undefined) returns a converted error instead of throwing", async () => {
  const r = await ij.simulate(undefined, structuredClone(ij.model.defaults));
  assert.deepEqual(r.paths, []);
  assert.equal(r.error.message, "null / undefined のプロパティは参照できません");
});

test("R25-N6 imagej length limit message is unchanged", async () => {
  const r = await ij.simulate(
    "x=1;".repeat(30000),
    structuredClone(ij.model.defaults),
  );
  assert.deepEqual(r.paths, []);
  assert.equal(r.error.message, "コードは100000文字以内にしてください");
});

test("R25-N6 imagej normal code still runs", async () => {
  const r = await ij.simulate(
    'print("hi");',
    structuredClone(ij.model.defaults),
  );
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
});
