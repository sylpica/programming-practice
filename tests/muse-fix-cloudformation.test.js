import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const d = getDefinition("cloudformation");
const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));

// RG-63: 先頭の不可視文字は JSON／YAML 判定をすり抜けず、文字を名指して止まる
test("RG-63 leading invisible character stops with the character named", async () => {
  const r = await run("\u200b{\"Resources\":{\"Bucket\":{\"Type\":\"AWS::S3::Bucket\"}}}");
  assert.match(r.error.message, /ゼロ幅スペース（U\+200B/);
  assert.doesNotMatch(r.error.message, /document separator|yaml/i);
});

// RG-63／R19-N5: 不正な YAML はライブラリの生エラーではなくアプリ自身の言葉で止まる
test("RG-63/N5 malformed YAML stops in the app's own words with a line hint", async () => {
  const r = await run("Resources:\n  Bucket:\n    Type: \"AWS::S3::Bucket\n");
  assert.match(r.error.message, /YAMLとして読み取れませんでした（\d+行目付近/);
  assert.doesNotMatch(r.error.message, /unexpected|document separator|Type: "AWS/);
});

// RG-66: 打ち切られたハンドラは「辞書形式」ではなく打ち切りを原因として示す
test("RG-66 truncated handler reports truncation, not a dict complaint", async () => {
  const r = await run("def handler(event, context):\n    x = 0\n    while True:\n        x += 1\n");
  assert.equal(r.truncated, true);
  const e = r.paths[0].error;
  assert.match(e.message, /打ち切られたため/);
  assert.doesNotMatch(e.message, /辞書形式/);
});

// RG-66 対照: 本当に辞書でない値を返した場合は従来どおり辞書形式の原因を示す
test("RG-66 a genuine non-dict return keeps the dict message", async () => {
  const r = await run("def handler(event, context):\n    return 42\n");
  assert.match(r.paths[0].error.message, /辞書形式のレスポンスを返す必要があります/);
});

// RG-69: 先頭行の # コメントでハンドラ経路へ誤判定しない
test("RG-69 a leading comment line does not route a template to the handler path", async () => {
  const r = await run("# 先頭コメント\nResources:\n  Bucket:\n    Type: AWS::S3::Bucket\n");
  assert.ok(!r.error, JSON.stringify(r.error));
  const only = await run("# just a comment\n");
  assert.match(only.error.message, /オブジェクトで指定してください/);
});
test("RG-69 a handler preceded by comment lines is still a handler", async () => {
  const code = "# 説明コメント\ndef handler(event, context):\n    fragment = event[\"fragment\"]\n    fragment[\"Metadata\"] = {\"Stage\": \"dev\"}\n    return {\"requestId\": event[\"requestId\"], \"status\": \"success\", \"fragment\": fragment}\n";
  const r = await run(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
});
