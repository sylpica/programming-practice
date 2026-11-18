import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced as uiRef } from "../js/types/uivision/reference-advanced.js";
import { templatesAdvanced as uiTpl } from "../js/types/uivision/templates-advanced.js";
import { glossaryAdvanced as uiGlo } from "../js/types/uivision/glossary-advanced.js";
import {
  referenceOverrides as uiOverrides,
} from "../js/types/uivision/reference-advanced.js";
import {
  advancedActionHandlers as uiHandlers,
  advancedStops as uiStops,
  applyAdvancedEngine as uiApplyEngine,
} from "../js/types/uivision/advanced-engine.js";
import { advancedManifest as uiManifest } from "../js/types/uivision/advanced-manifest.js";
import { referenceAdvanced as cmdRef } from "../js/types/cmd/reference-advanced.js";
import { templatesAdvanced as cmdTpl } from "../js/types/cmd/templates-advanced.js";
import { glossaryAdvanced as cmdGlo } from "../js/types/cmd/glossary-advanced.js";
import {
  referenceOverrides as cmdOverrides,
} from "../js/types/cmd/reference-advanced.js";
import {
  advancedCommandHandlers as cmdHandlers,
  advancedAliasNames as cmdAliases,
  advancedStops as cmdStops,
  advancedAliasStops as cmdAliasStops,
  advancedCommandNames as cmdScanNames,
  applyAdvancedEngine as cmdApplyEngine,
} from "../js/types/cmd/advanced-engine.js";
import { advancedManifest as cmdManifest } from "../js/types/cmd/advanced-manifest.js";

// 高度モード ブロックB1 の横断整合性（コーディネーター統合検査）。
// データ班・エンジン班が別々に作った成果物が、名前・ステータス・
// 検索到達性・テンプレート実行可能性で互いに一致することを固定する。

const STATUSES = ["supported", "unsupported", "unverified"];

function checkShape(items, { source }) {
  const seen = new Set();
  for (const r of items) {
    for (const f of ["name", "category", "syntax", "description", "example", "caution"])
      assert.equal(typeof r[f], "string", `${r.name}: ${f} が文字列でない`);
    for (const f of ["name", "category", "syntax", "description", "example", "caution"])
      assert.notEqual(r[f], "", `${r.name}: ${f} が空`);
    assert.ok(STATUSES.includes(r.status), `${r.name}: status が不正`);
    // 機構契約 第3章3.2：高度項目は status 一本化し、supported を併記しない
    assert.ok(!("supported" in r), `${r.name}: 高度項目に supported が併記されている`);
    const key = r.name.toLowerCase();
    assert.ok(!seen.has(key), `${r.name}: 高度側で重複`);
    seen.add(key);
    if (source) assert.equal(typeof r.source, "string", `${r.name}: source が無い`);
  }
  return seen;
}

// アプリのリファレンス検索述語（js/app.js renderRefs/fullRefs と同一）
const findable = (items, q) =>
  items.filter((r) =>
    (r.name + " " + r.category + " " + r.description + " " + r.syntax)
      .toLowerCase()
      .includes(q),
  );

test("B1 uivision reference shape, counts, no base overlap", () => {
  const seen = checkShape(uiRef, { source: false });
  assert.equal(uiRef.length, 108);
  const by = (s) => uiRef.filter((r) => r.status === s).length;
  assert.deepEqual([by("supported"), by("unsupported"), by("unverified")], [64, 44, 0]);
  const base = getDefinition("uivision");
  for (const b of base.reference)
    assert.ok(!seen.has(b.name.toLowerCase()), `基礎層と重複: ${b.name}`);
});

test("B1 cmd reference shape, counts, no base overlap", () => {
  const seen = checkShape(cmdRef, { source: true });
  assert.equal(cmdRef.length, 303);
  const by = (s) => cmdRef.filter((r) => r.status === s).length;
  assert.deepEqual([by("supported"), by("unsupported"), by("unverified")], [34, 269, 0]);
  const base = getDefinition("cmd");
  for (const b of base.reference)
    assert.ok(!seen.has(b.name.toLowerCase()), `基礎層と重複: ${b.name}`);
});

test("B1 uivision engine tables agree with reference statuses", () => {
  const supported = new Set(uiRef.filter((r) => r.status === "supported").map((r) => r.name));
  const engineSupported = new Set([
    ...Object.keys(uiHandlers),
    // 構造コマンドは step/classify 側で実装される
    "do",
    "repeatIf",
    "forEach",
  ]);
  assert.deepEqual([...supported].sort(), [...engineSupported].sort());
  const unsupported = new Set(uiRef.filter((r) => r.status !== "supported").map((r) => r.name));
  assert.deepEqual([...unsupported].sort(), Object.keys(uiStops).sort());
  for (const [name, stop] of Object.entries(uiStops)) {
    const item = uiRef.find((r) => r.name === name);
    assert.equal(stop.status, item.status, `${name}: 停止側 status が不一致`);
    assert.equal(typeof stop.reason, "string");
    assert.notEqual(stop.reason, "");
  }
});

test("B1 cmd engine tables agree with reference statuses", () => {
  const supported = new Set(
    cmdRef.filter((r) => r.status === "supported").map((r) => r.name.toLowerCase()),
  );
  const engineSupported = new Set([
    ...Object.keys(cmdHandlers),
    ...cmdAliases.map((a) => a.toLowerCase()),
  ]);
  assert.deepEqual([...supported].sort(), [...engineSupported].sort());
  const unsupported = new Set(
    cmdRef.filter((r) => r.status !== "supported").map((r) => r.name.toLowerCase()),
  );
  const stopNames = new Set(cmdStops.map((s) => s.name.toLowerCase()));
  assert.deepEqual([...unsupported].sort(), [...stopNames].sort());
  for (const s of cmdStops) {
    const item = cmdRef.find((r) => r.name.toLowerCase() === s.name.toLowerCase());
    assert.equal(s.status, item.status, `${s.name}: 停止側 status が不一致`);
    assert.equal(typeof s.reason, "string");
    assert.notEqual(s.reason, "");
  }
  // 別名停止（B1A-19）: 項目名が文脈つき見出し（"import (diskpart)" 等）で
  // 実行名と一致しない2系統は、別名停止として実行名側を対応づける。
  assert.deepEqual(
    cmdAliasStops.map((s) => s.name).sort(),
    ["import", "route"],
  );
  for (const s of cmdAliasStops) {
    assert.equal(s.status, "unsupported");
    assert.equal(typeof s.reason, "string");
    assert.notEqual(s.reason, "");
  }
  for (const itemName of ["import (diskpart)", "import (shadowdisk)", "route ws2008"])
    assert.ok(unsupported.has(itemName), `別名停止の対応項目が無い: ${itemName}`);
  // scan 用の名前集合が高度全件（複合名含む）を覆う
  const scan = new Set(cmdScanNames.map((n) => n.toLowerCase()));
  for (const r of cmdRef) assert.ok(scan.has(r.name.toLowerCase()), `scan 欠落: ${r.name}`);
});

test("B1 every advanced item is findable by name search (F-02)", () => {
  for (const items of [uiRef, cmdRef])
    for (const r of items) {
      assert.ok(
        findable(items, r.name.toLowerCase()).some((x) => x.name === r.name),
        `名前で到達できない: ${r.name}`,
      );
      // 複合名は各トークンでも到達できる
      for (const token of r.name.toLowerCase().split(/\s+/))
        assert.ok(
          findable(items, token).some((x) => x.name === r.name),
          `トークン ${token} で到達できない: ${r.name}`,
        );
    }
});

test("B1 name resolution over the advanced catalog is case-insensitive", () => {
  // 合成後のカタログに対する名前解決（機構側 mergeCatalog の前提）の
  // 到達性を、B1 側の照合として固定する。
  const resolve = (items, name) =>
    items.find((r) => r.name.toLowerCase() === String(name).trim().toLowerCase());
  for (const r of uiRef) assert.equal(resolve(uiRef, r.name)?.name, r.name);
  assert.equal(resolve(uiRef, "CSVREAD")?.name, "csvRead");
  for (const r of cmdRef) assert.equal(resolve(cmdRef, r.name)?.name, r.name);
  assert.equal(resolve(cmdRef, "SC CONFIG")?.name, "sc config");
  assert.equal(resolve(uiRef, "存在しない名前"), undefined);
  assert.equal(resolve(cmdRef, "存在しない名前"), undefined);
});

test("B1 mechanism contract: manifest, overrides, engine hook", () => {
  // 機構契約 advanced-interface.md 第5章の形式に一致すること。
  for (const [manifest, dir] of [
    [uiManifest, "uivision"],
    [cmdManifest, "cmd"],
  ]) {
    assert.deepEqual(manifest.referenceParts, ["reference-advanced.js"]);
    assert.equal(manifest.templatesFile, "templates-advanced.js");
    assert.equal(manifest.glossaryFile, "glossary-advanced.js");
    assert.equal(manifest.engineFile, "advanced-engine.js");
    for (const f of [
      ...manifest.referenceParts,
      manifest.templatesFile,
      manifest.glossaryFile,
      manifest.engineFile,
    ])
      assert.ok(
        fs.existsSync(new URL(`../js/types/${dir}/${f}`, import.meta.url)),
        `${dir}: manifest 記載ファイルが無い: ${f}`,
      );
  }
  // B1 は基礎項目を変更しないため overrides は空（第5章(b)、第6章規則2）
  assert.deepEqual(uiOverrides, []);
  assert.deepEqual(cmdOverrides, []);
  // applyAdvancedEngine フックがテーブルを definition へ登録する
  const uiDef = {};
  assert.equal(uiApplyEngine(uiDef, null), uiDef);
  assert.equal(uiDef.advancedEngine.actionHandlers, uiHandlers);
  assert.equal(uiDef.advancedEngine.stops, uiStops);
  const cmdDef = {};
  assert.equal(cmdApplyEngine(cmdDef, null), cmdDef);
  assert.equal(cmdDef.advancedEngine.commandHandlers, cmdHandlers);
  assert.equal(cmdDef.advancedEngine.stops, cmdStops);
  assert.equal(cmdDef.advancedEngine.aliasStops, cmdAliasStops);
});

test("B1 advanced templates trace clean on base defaults and refs resolve", async () => {
  const cases = [
    ["uivision", uiTpl, uiRef],
    ["cmd", cmdTpl, cmdRef],
  ];
  for (const [id, templates, advanced] of cases) {
    const def = getDefinition(id);
    const names = new Set(
      [...def.reference, ...advanced].map((r) => r.name.toLowerCase()),
    );
    assert.ok(templates.length >= 3, `${id}: テンプレートが3件未満`);
    for (const t of templates) {
      for (const ref of t.refs ?? [])
        assert.ok(names.has(ref.toLowerCase()), `${id}/${t.id}: refs が解決できない: ${ref}`);
      const r = await def.simulate(t.code, structuredClone(def.model.defaults));
      assert.equal(r.error, undefined, `${id}/${t.id}: ${JSON.stringify(r.error)}`);
      for (const p of r.paths)
        assert.equal(p.error, undefined, `${id}/${t.id}: ${JSON.stringify(p.error)}`);
    }
  }
});

test("B1 advanced glossaries are well-formed and do not duplicate base terms", () => {
  const cases = [
    ["uivision", uiGlo],
    ["cmd", cmdGlo],
  ];
  for (const [id, glossary] of cases) {
    const def = getDefinition(id);
    const baseTerms = new Set((def.glossary ?? []).map(([term]) => term));
    assert.ok(glossary.length >= 1, `${id}: 用語集が空`);
    for (const [term, definition] of glossary) {
      assert.equal(typeof term, "string");
      assert.equal(typeof definition, "string");
      assert.notEqual(term, "");
      assert.notEqual(definition, "");
      assert.ok(!baseTerms.has(term), `${id}: 基礎用語と重複: ${term}`);
    }
  }
});

test("B1 advanced data files stay out of precache (A-11)", () => {
  const precache = fs.readFileSync(new URL("../precache.js", import.meta.url), "utf8");
  // 判定は PROGRAMMING_ASSETS（precache 収載集合）への所属で行う。
  // precache.js には遅延集合（PROGRAMMING_LAZY_ASSETS）も同居するため、
  // 素の文字列検索では遅延側の記載に当たってしまう（修正バッチ20）。
  const assets = new Set(
    JSON.parse(precache.match(/self\.PROGRAMMING_ASSETS=(\[.*?\]);/s)[1]).map(
      (p) => p.replace(/^\.\//, ""),
    ),
  );
  // 統合第1弾で差異 D-2 を機構契約（advanced-interface.md 第7.2章）側へ
  // 解消：データ差分と advanced-manifest.js は precache から除外し、SW の
  // ランタイムキャッシュ（network-first）で扱う。ブロック単体時の「静的
  // 合成のため engine／manifest は含める」というピンは、統合判断により
  // 本形へ置き換えた（台帳 RG-604）。
  // 修正バッチ20（RG-681）での是正：cmd／UI.Vision の advanced-engine.js
  // は各 index.js から静的 import される起動ファイルであり（cmd/index.js
  // と uivision/index.js の import 文が一次資料）、ファイル名だけで遅延
  // 扱いするとオフライン初回起動が成立しないことが実測で判明したため、
  // 除外対象から外した。分類は到達方法で行い、静的閉包 ⊆ precache は
  // tests/muse-precache-closure.test.js が機械検査する。
  for (const f of [
    "js/types/uivision/reference-advanced.js",
    "js/types/uivision/templates-advanced.js",
    "js/types/uivision/glossary-advanced.js",
    "js/types/uivision/advanced-manifest.js",
    "js/types/cmd/reference-advanced.js",
    "js/types/cmd/templates-advanced.js",
    "js/types/cmd/glossary-advanced.js",
    "js/types/cmd/advanced-manifest.js",
  ])
    assert.ok(!assets.has(f), `precache に入っている: ${f}`);
});
