import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadAdvanced,
  clearAdvancedCache,
} from "../js/core/advanced-loader.js";
import { countByStatus } from "../js/core/catalog.js";

const fixtureBase = (id) =>
  new URL(`./fixtures/advanced/${id}`, import.meta.url).href;

test("loader: manifest あり版は全ファイルを集約する", async () => {
  clearAdvancedCache();
  const r = await loadAdvanced(
    { id: "fixtureadv" },
    { baseUrl: fixtureBase("fixtureadv") },
  );
  assert.deepEqual(
    r.referenceAdvanced.map((x) => x.name),
    ["advSupported()", "advUnsupported()", "advUnverified()", "advFromPart2()"],
  );
  // 3状態が各1件以上含まれ、part2 の項目が supported を1件足す
  assert.deepEqual(countByStatus(r.referenceAdvanced), {
    total: 4,
    supported: 2,
    unsupported: 1,
    unverified: 1,
  });
  assert.deepEqual(r.referenceOverrides, [
    { name: "baseFn()", summary: "override で差し替えた要約", status: "unverified" },
  ]);
  assert.deepEqual(
    r.templatesAdvanced.map((t) => t.id),
    ["tpl-adv-1"],
  );
  assert.deepEqual(r.glossaryAdvanced, [
    ["高度用語A", "高度モード専用の用語Aの定義"],
    ["高度用語B", "高度モード専用の用語Bの定義"],
  ]);
  assert.ok(r.engineModule, "engine モジュールが返る");
  assert.equal(r.engineModule.engineKind, "fixture-engine");
  assert.equal(r.engineModule.ping(), "pong");
  assert.deepEqual(r.failed, []);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(
    [...r.loaded].sort(),
    [
      "advanced-manifest.js",
      "advanced-engine.js",
      "glossary-advanced.js",
      "reference-part1.js",
      "reference-part2.js",
      "templates-advanced.js",
    ].sort(),
  );
});

test("loader: manifest なし版は既定ファイルを使い、無いファイルは missing", async () => {
  clearAdvancedCache();
  const r = await loadAdvanced(
    { id: "fixtureplain" },
    { baseUrl: fixtureBase("fixtureplain") },
  );
  assert.deepEqual(
    r.referenceAdvanced.map((x) => x.name),
    ["plainSupported()", "plainUnsupported()", "plainUnverified()"],
  );
  assert.deepEqual(countByStatus(r.referenceAdvanced), {
    total: 3,
    supported: 1,
    unsupported: 1,
    unverified: 1,
  });
  assert.deepEqual(
    r.templatesAdvanced.map((t) => t.id),
    ["tpl-plain-1"],
  );
  assert.deepEqual(r.glossaryAdvanced, []);
  assert.equal(r.engineModule, null);
  assert.deepEqual(r.failed, []);
  assert.deepEqual(
    [...r.missing].sort(),
    ["advanced-manifest.js", "glossary-advanced.js"].sort(),
  );
  assert.deepEqual(
    [...r.loaded].sort(),
    ["reference-advanced.js", "templates-advanced.js"].sort(),
  );
});

test("loader: manifest 明示ファイルの失敗と内容不正は failed になる", async () => {
  clearAdvancedCache();
  const r = await loadAdvanced(
    { id: "fixturebroken" },
    { baseUrl: fixtureBase("fixturebroken") },
  );
  // 正常な part は集約される（例外は外に投げない）
  assert.deepEqual(
    r.referenceAdvanced.map((x) => x.name),
    ["brokenOk()"],
  );
  assert.deepEqual(r.templatesAdvanced, []);
  assert.equal(r.engineModule, null);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(
    [...r.failed].sort(),
    ["engine-missing.js", "reference-missing.js", "templates-bad.js"].sort(),
  );
  // 監査 D-3 是正に伴う期待値の是正: 内容不正の templates-bad.js は
  // failed のみに記録され、loaded には入らない（従前の期待値は二重計上を
  // 固定していた。根拠は advanced-interface.md の loaded／failed の区別）。
  assert.deepEqual(
    [...r.loaded].sort(),
    ["advanced-manifest.js", "reference-ok.js"].sort(),
  );
});

test("loader: manifest の省略キーは既定ファイル扱いで不存在は missing（監査 D-2）", async () => {
  clearAdvancedCache();
  const r = await loadAdvanced(
    { id: "fixturepartial" },
    { baseUrl: fixtureBase("fixturepartial") },
  );
  assert.deepEqual(
    r.referenceAdvanced.map((x) => x.name),
    ["partialSupported()"],
  );
  assert.deepEqual(r.failed, []);
  assert.deepEqual(
    [...r.missing].sort(),
    ["glossary-advanced.js", "templates-advanced.js"].sort(),
  );
  assert.deepEqual(
    [...r.loaded].sort(),
    ["advanced-manifest.js", "reference-advanced.js"].sort(),
  );
});

test("loader: failed を含む結果はキャッシュされず再試行される（監査 D-7）", async () => {
  clearAdvancedCache();
  const opts = { baseUrl: fixtureBase("fixturebroken") };
  const first = await loadAdvanced({ id: "fixturebroken" }, opts);
  assert.ok(first.failed.length > 0);
  const second = await loadAdvanced({ id: "fixturebroken" }, opts);
  assert.notEqual(second, first); // 再読込された（失敗が固定されない）
  assert.deepEqual(second.failed, first.failed);
});

test("loader: 存在しない種類 id でも例外を投げず全て missing で返る", async () => {
  clearAdvancedCache();
  const r = await loadAdvanced(
    { id: "fixtureabsent" },
    { baseUrl: fixtureBase("fixtureabsent") },
  );
  assert.deepEqual(r.referenceAdvanced, []);
  assert.deepEqual(r.referenceOverrides, []);
  assert.deepEqual(r.templatesAdvanced, []);
  assert.deepEqual(r.glossaryAdvanced, []);
  assert.equal(r.engineModule, null);
  assert.deepEqual(r.failed, []);
  assert.deepEqual(
    [...r.missing].sort(),
    [
      "advanced-manifest.js",
      "glossary-advanced.js",
      "reference-advanced.js",
      "templates-advanced.js",
    ].sort(),
  );
});

test("loader: 種類 id ごとにキャッシュされ refresh で再読込する", async () => {
  clearAdvancedCache();
  const opts = { baseUrl: fixtureBase("fixtureadv") };
  const first = await loadAdvanced({ id: "fixtureadv" }, opts);
  const second = await loadAdvanced({ id: "fixtureadv" }, opts);
  assert.equal(second, first); // 同一オブジェクト（キャッシュ）
  const refreshed = await loadAdvanced({ id: "fixtureadv" }, { ...opts, refresh: true });
  assert.notEqual(refreshed, first);
  assert.deepEqual(refreshed.referenceAdvanced, first.referenceAdvanced);
  const afterRefresh = await loadAdvanced({ id: "fixtureadv" }, opts);
  assert.equal(afterRefresh, refreshed); // refresh 結果がキャッシュされる
});

test("loader: clearAdvancedCache で再読込される", async () => {
  const opts = { baseUrl: fixtureBase("fixtureplain") };
  const first = await loadAdvanced({ id: "fixtureplain" }, opts);
  clearAdvancedCache();
  const second = await loadAdvanced({ id: "fixtureplain" }, opts);
  assert.notEqual(second, first);
  assert.deepEqual(second.referenceAdvanced, first.referenceAdvanced);
});
