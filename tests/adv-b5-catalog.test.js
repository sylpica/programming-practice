// 高度モード ブロックB5（C#＋JavaScript）：高度カタログの構造不変条件。
// 監査 AUD-X 所見 X-05（高度カタログを固定するテストが無い）への対応。
// 件数・ステータス分布は B5 納品時点の確定値で固定する（カタログを意図的に
// 変更する場合はこのテストも同じ変更で更新すること）。
// 棚卸しとの照合：C# 445行＝高度440＋上書き5、JavaScript 721行＝高度702名
// （489項目に収載）＋基礎19行。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced as csRef, referenceOverrides as csOverrides } from "../js/types/csharp/reference-advanced.js";
import { referenceAdvanced as jsRef } from "../js/types/javascript/reference-advanced.js";
import { templatesAdvanced as csTpl } from "../js/types/csharp/templates-advanced.js";
import { templatesAdvanced as jsTpl } from "../js/types/javascript/templates-advanced.js";
import { glossaryAdvanced as csGlo } from "../js/types/csharp/glossary-advanced.js";
import { glossaryAdvanced as jsGlo } from "../js/types/javascript/glossary-advanced.js";
import { advancedManifest as csManifest } from "../js/types/csharp/advanced-manifest.js";
import { advancedManifest as jsManifest } from "../js/types/javascript/advanced-manifest.js";

const STATUSES = ["supported", "unsupported", "unverified"];
const REQUIRED = ["name", "category", "syntax", "description", "example", "status", "returns", "source"];

function checkCatalog(items, label) {
  const names = new Set();
  for (const it of items) {
    for (const f of REQUIRED) assert.ok(typeof it[f] === "string" && it[f].length > 0, `${label}:${it.name} missing ${f}`);
    assert.ok(typeof it.caution === "string", `${label}:${it.name} caution must be a string`);
    assert.ok(STATUSES.includes(it.status), `${label}:${it.name} bad status ${it.status}`);
    assert.ok(!names.has(it.name), `${label}: duplicate name ${it.name}`);
    names.add(it.name);
    if (it.status === "unsupported") assert.ok(it.caution.includes("未対応"), `${label}:${it.name} unsupported without 未対応 in caution`);
    if (it.status === "unverified") assert.ok(it.caution.includes("未検証"), `${label}:${it.name} unverified without 未検証 in caution`);
  }
  return names;
}
const countBy = (items) => items.reduce((a, i) => ((a[i.status] = (a[i.status] || 0) + 1), a), {});

test("adv-b5 catalog C#: 構造・件数・ステータス分布", () => {
  assert.equal(csRef.length, 440);
  assert.deepEqual(countBy(csRef), { supported: 284, unsupported: 156 });
  const names = checkCatalog(csRef, "csharp");
  const base = getDefinition("csharp");
  const baseNames = new Set(base.reference.map((r) => r.name));
  for (const n of names) assert.ok(!baseNames.has(n), `csharp: advanced name duplicates base: ${n}`);
  // ジェネリック項目（名前に < を含む）は到達性のため scan が必須（CS-F12 の教訓）。
  for (const it of csRef) if (it.name.includes("<")) assert.ok(typeof it.scan === "string" && it.scan.length > 0, `csharp:${it.name} generic item without scan`);
});

test("adv-b5 catalog C#: referenceOverrides は基礎項目だけを対象にする", () => {
  assert.equal(csOverrides.length, 5);
  const baseNames = new Set(getDefinition("csharp").reference.map((r) => r.name));
  const seen = new Set();
  for (const ov of csOverrides) {
    assert.ok(baseNames.has(ov.name), `override target not in base: ${ov.name}`);
    assert.ok(!seen.has(ov.name), `duplicate override: ${ov.name}`);
    seen.add(ov.name);
    assert.equal(ov.status, "supported", `override ${ov.name} must be supported`);
    for (const f of REQUIRED) assert.ok(typeof ov[f] === "string" && ov[f].length > 0, `override ${ov.name} missing ${f}`);
  }
});

test("adv-b5 catalog JS: 構造・件数・ステータス分布・バンドル到達名", () => {
  assert.equal(jsRef.length, 489);
  assert.deepEqual(countBy(jsRef), { supported: 304, unsupported: 160, unverified: 25 });
  const names = checkCatalog(jsRef, "javascript");
  const baseNames = new Set(getDefinition("javascript").reference.map((r) => r.name));
  for (const n of names) assert.ok(!baseNames.has(n), `javascript: advanced name duplicates base: ${n}`);
  // inventoryNames（棚卸し名のバンドル収載）：同一名を異なる2項目が主張しない。
  // 項目名 ∪ inventoryNames の相異なる総数が棚卸しカバー数 702 と一致すること
  // （監査 AUD-JS が棚卸し正本との双方向照合で確認した値）。
  const claimed = new Map();
  for (const it of jsRef) {
    for (const n of it.inventoryNames || []) {
      assert.ok(!claimed.has(n) || claimed.get(n) === it.name, `inventory name claimed by two items: ${n} (${claimed.get(n)} / ${it.name})`);
      claimed.set(n, it.name);
    }
  }
  const union = new Set([...names, ...claimed.keys()]);
  assert.equal(union.size, 702);
});

test("adv-b5 templates: id 一意・refs が実在項目名で解決できる", () => {
  const cases = [
    ["csharp", csTpl, getDefinition("csharp"), csRef],
    ["javascript", jsTpl, getDefinition("javascript"), jsRef],
  ];
  for (const [label, tpl, def, ref] of cases) {
    assert.equal(tpl.length, 8, `${label}: templates`);
    const itemNames = new Set([...def.reference.map((r) => r.name), ...ref.map((r) => r.name)]);
    const baseIds = new Set(def.templates.map((t) => t.id));
    const ids = new Set();
    for (const t of tpl) {
      assert.ok(!ids.has(t.id) && !baseIds.has(t.id), `${label}: duplicate template id ${t.id}`);
      ids.add(t.id);
      assert.ok(typeof t.code === "string" && t.code.length > 0, `${label}:${t.id} empty code`);
      assert.ok(Array.isArray(t.refs) && t.refs.length > 0, `${label}:${t.id} refs`);
      for (const r of t.refs) assert.ok(itemNames.has(r), `${label}:${t.id} ref does not resolve: ${r}`);
    }
  }
});

test("adv-b5 glossary: 件数・基礎との重複なし・形式", () => {
  const cases = [
    ["csharp", csGlo, getDefinition("csharp"), 24],
    ["javascript", jsGlo, getDefinition("javascript"), 21],
  ];
  for (const [label, glo, def, expected] of cases) {
    assert.equal(glo.length, expected, `${label}: glossary count`);
    const baseTerms = new Set(def.glossary.map((g) => g[0]));
    const terms = new Set();
    for (const [term, desc] of glo) {
      assert.ok(typeof term === "string" && term.length > 0 && typeof desc === "string" && desc.length > 0, `${label}: bad glossary entry`);
      assert.ok(!terms.has(term), `${label}: duplicate term ${term}`);
      assert.ok(!baseTerms.has(term), `${label}: term duplicates base glossary: ${term}`);
      terms.add(term);
    }
  }
});

test("adv-b5 manifest: 両種別とも契約のファイル構成を宣言する", () => {
  for (const [label, m] of [["csharp", csManifest], ["javascript", jsManifest]]) {
    assert.deepEqual(m.referenceParts, ["reference-advanced.js"], label);
    assert.equal(m.templatesFile, "templates-advanced.js", label);
    assert.equal(m.glossaryFile, "glossary-advanced.js", label);
    assert.equal(m.engineFile, "advanced-engine.js", label);
  }
});
