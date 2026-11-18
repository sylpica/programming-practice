import { test } from "node:test";
import assert from "node:assert/strict";
import { definition } from "../js/types/cloudformation/index.js";
import {
  applyAdvancedEngine,
  buildResourceTypeLedger,
  findUnlistedResourceTypes,
  LEDGER_SNAPSHOT_DATE,
} from "../js/types/cloudformation/advanced-engine.js";

// ブロックB8（cfn-engine班）: 高度モード用フック advanced-engine の検証。
// 台帳は merged.reference の AWS::／Alexa:: 項目名から作る。台帳外の
// AWS::／Alexa:: タイプはエラーにせず注記（result.notes／scan 結果の
// notes プロパティ）を追加する。Custom:: と
// AWS::CloudFormation::CustomResource は注記対象にしない。
// フック未適用時は基礎の挙動が完全に不変であること。

const LEDGER_ITEMS = [
  { name: "AWS::S3::Bucket" },
  { name: "AWS::Lambda::Function" },
  { name: "Alexa::ASK::Skill" },
];
const merged = {
  reference: [...definition.reference, ...LEDGER_ITEMS],
};

// フックは渡した definition を書き換えるため、検証用の浅いコピーに適用する
// （元の definition は「フックなし」検証のために温存する）。
function hookedDefinition() {
  return applyAdvancedEngine({ ...definition }, merged);
}
const model = () => structuredClone(definition.model.defaults);
const template = (resources) => JSON.stringify({ Resources: resources });

/* ---------- 台帳の構築 ---------- */

test("ledger is built from AWS::/Alexa:: names in merged.reference only", () => {
  const ledger = buildResourceTypeLedger(merged);
  assert.ok(ledger.has("AWS::S3::Bucket"));
  assert.ok(ledger.has("Alexa::ASK::Skill"));
  // 基礎リファレンスの項目（Transform 等）は台帳に入らない
  assert.ok(!ledger.has("Transform"));
  assert.equal(ledger.size, LEDGER_ITEMS.length);
});

test("findUnlistedResourceTypes flags only unlisted AWS::/Alexa:: types", () => {
  const ledger = buildResourceTypeLedger(merged);
  const hits = findUnlistedResourceTypes(
    {
      Resources: {
        Known: { Type: "AWS::S3::Bucket" },
        New: { Type: "AWS::NewService::Thing" },
        Custom: { Type: "Custom::MyResource" },
        CfnCustom: { Type: "AWS::CloudFormation::CustomResource" },
        NoType: { Properties: {} },
      },
    },
    ledger,
  );
  assert.deepEqual(hits, [
    { logicalId: "New", type: "AWS::NewService::Thing" },
  ]);
});

/* ---------- フックなしでは従来挙動 ---------- */

test("without the hook, simulate has no notes and scan has no notes property", async () => {
  const code = template({ New: { Type: "AWS::NewService::Thing" } });
  const r = await definition.simulate(code, model());
  assert.equal(r.error, undefined);
  assert.equal(r.notes, undefined);
  const names = definition.scan(code);
  assert.equal(names.notes, undefined);
});

/* ---------- simulate: 台帳内タイプは注記なし ---------- */

test("simulate: in-ledger types produce no notes and identical result", async () => {
  const hooked = hookedDefinition();
  const code = template({
    Bucket: { Type: "AWS::S3::Bucket" },
    Fn: { Type: "AWS::Lambda::Function" },
    Skill: { Type: "Alexa::ASK::Skill" },
  });
  const base = await definition.simulate(code, model());
  const r = await hooked.simulate(code, model());
  assert.equal(r.error, undefined);
  assert.equal(r.notes, undefined);
  assert.deepEqual(r, base);
});

/* ---------- simulate: 台帳外 AWS:: タイプは注記あり（エラーにしない） ---------- */

test("simulate: unlisted AWS:: type adds a note, never an error", async () => {
  const hooked = hookedDefinition();
  const code = template({ New: { Type: "AWS::NewService::Thing" } });
  const r = await hooked.simulate(code, model());
  assert.equal(r.error, undefined);
  assert.ok(Array.isArray(r.paths) && r.paths.length > 0);
  assert.equal(r.notes.length, 1);
  assert.match(r.notes[0], /AWS::NewService::Thing/);
  assert.match(r.notes[0], /New/);
  // 台帳が 2026-11-16 時点のスナップショットである旨が文面に入る
  assert.ok(r.notes[0].includes(LEDGER_SNAPSHOT_DATE));
  assert.match(r.notes[0], /エラーではなく/);
});

test("simulate: unlisted Alexa:: type adds a note", async () => {
  const hooked = hookedDefinition();
  const code = template({ Skill: { Type: "Alexa::ASK::NewThing" } });
  const r = await hooked.simulate(code, model());
  assert.equal(r.error, undefined);
  assert.equal(r.notes.length, 1);
  assert.match(r.notes[0], /Alexa::ASK::NewThing/);
});

test("simulate: YAML template with unlisted type adds a note", async () => {
  const hooked = hookedDefinition();
  const code = "Resources:\n  New:\n    Type: AWS::NewService::Thing\n";
  const r = await hooked.simulate(code, model());
  assert.equal(r.error, undefined);
  assert.equal(r.notes.length, 1);
  assert.match(r.notes[0], /AWS::NewService::Thing/);
});

/* ---------- simulate: 正規の例外は注記なし ---------- */

test("simulate: Custom:: and AWS::CloudFormation::CustomResource get no note", async () => {
  const hooked = hookedDefinition();
  const code = template({
    Custom: { Type: "Custom::MyResource" },
    CfnCustom: { Type: "AWS::CloudFormation::CustomResource" },
  });
  const r = await hooked.simulate(code, model());
  assert.equal(r.error, undefined);
  assert.equal(r.notes, undefined);
});

/* ---------- simulate: ハンドラ形では event.fragment が検査対象 ---------- */

test("simulate: handler form checks model.event.fragment Resources", async () => {
  const hooked = hookedDefinition();
  const m = model();
  m.event.fragment = {
    Resources: { New: { Type: "AWS::NewService::Thing" } },
  };
  const handler = [
    "def handler(event, context):",
    '    return {"requestId": event["requestId"], "status": "success", "fragment": event["fragment"]}',
  ].join("\n");
  const r = await hooked.simulate(handler, m);
  assert.equal(r.error, undefined);
  assert.equal(r.notes.length, 1);
  assert.match(r.notes[0], /AWS::NewService::Thing/);
});

/* ---------- scan: 注記は notes プロパティ、要素は基礎と同一 ---------- */

test("scan: unlisted type attaches notes, elements unchanged from base scan", () => {
  const hooked = hookedDefinition();
  const code = template({ New: { Type: "AWS::NewService::Thing" } });
  const baseNames = definition.scan(code);
  const names = hooked.scan(code);
  assert.deepEqual([...names], [...baseNames]);
  assert.equal(names.length, baseNames.length);
  assert.equal(names.notes.length, 1);
  assert.match(names.notes[0], /AWS::NewService::Thing/);
});

test("scan: in-ledger and exempt types attach no notes", () => {
  const hooked = hookedDefinition();
  for (const type of [
    "AWS::S3::Bucket",
    "Custom::MyResource",
    "AWS::CloudFormation::CustomResource",
  ]) {
    const names = hooked.scan(template({ R: { Type: type } }));
    assert.equal(names.notes, undefined, type);
  }
});

/* ---------- 冪等性・空台帳ガード ---------- */

test("applying the hook twice does not duplicate notes", async () => {
  const def = { ...definition };
  applyAdvancedEngine(def, merged);
  applyAdvancedEngine(def, merged);
  const r = await def.simulate(
    template({ New: { Type: "AWS::NewService::Thing" } }),
    model(),
  );
  assert.equal(r.notes.length, 1);
});

test("empty ledger leaves the definition untouched (no false notes)", async () => {
  const def = { ...definition };
  const returned = applyAdvancedEngine(def, { reference: [] });
  assert.equal(returned, def);
  assert.equal(def.simulate, definition.simulate);
  assert.equal(def.scan, definition.scan);
  const r = await def.simulate(
    template({ New: { Type: "AWS::NewService::Thing" } }),
    model(),
  );
  assert.equal(r.notes, undefined);
});
