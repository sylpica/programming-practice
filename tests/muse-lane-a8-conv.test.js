// 高度A8班・収束判定ラウンドの回帰テスト。
// 検出欠陥：(1) 対応項目 std::pair の正規の例が、開示なしに
// 「auto のスカラー推論は未対応」で実行不能だった（例文を明示型の
// 形へ是正）。(2) 未対応項目 std::NULL が、変換層で std:: を落とされ
// 基盤エンジンの NULL リテラルとして評価され、未対応表示に反して
// 黙って成功していた（変換層で名指し停止に是正）。
// 期待値は実走（g++ の実在性：std::NULL は実C++に存在しない）と
// カタログ表示との整合で確定した。無修飾 NULL の従来挙動と
// std::nullptr が壊れていないことも対照で確認する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { loadAdvanced } from "../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus } from "../js/core/catalog.js";

const errs = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const outs = (r) => (r.paths || []).map((p) => p.outputs.map((o) => o.text).join(""));
const cpp = (body) =>
  `#include <iostream>\n#include <string>\n#include <utility>\nint main() {\n${body}\n return 0;\n}`;

async function mergedCpp() {
  const d = getDefinition("cpp");
  const baseUrl = new URL("../js/types/cpp/", import.meta.url).href;
  const adv = await loadAdvanced(d, { baseUrl });
  const merged = mergeCatalog(d.reference, adv);
  return { d, merged };
}

test("A8収束-1: std::pair 項目の例がそのまま実行できる", async () => {
  const { d, merged } = await mergedCpp();
  const pair = merged.reference.find((r) => r.name === "std::pair");
  assert.equal(itemStatus(pair), "supported");
  d.reference = merged.reference;
  const r = await d.simulate(cpp(pair.example), structuredClone(d.model.defaults));
  assert.deepEqual(errs(r), [], `pair example failed: ${JSON.stringify(errs(r))}`);
});

test("A8収束-2: std::NULL は名指しの未対応で止まる（黙った成功をしない）", async () => {
  const { d, merged } = await mergedCpp();
  const item = merged.reference.find((r) => r.name === "std::NULL");
  assert.equal(itemStatus(item), "unsupported");
  d.reference = merged.reference;
  const r = await d.simulate(cpp(`std::cout << std::NULL;`), structuredClone(d.model.defaults));
  assert.ok(
    errs(r).some((e) => e.includes("std::NULL") && e.includes("未対応")),
    `expected named stop for std::NULL, got ${JSON.stringify(errs(r))} outs ${JSON.stringify(outs(r))}`,
  );
  assert.deepEqual(outs(r).filter((o) => o !== ""), []);
});

test("A8収束-3: 無修飾 NULL と std::nullptr の従来挙動は不変", async () => {
  const d = getDefinition("cpp");
  const r1 = await d.simulate(cpp(`std::cout << NULL;`), structuredClone(d.model.defaults));
  assert.deepEqual(errs(r1), []);
  assert.deepEqual(outs(r1), ["null"]);
  const r2 = await d.simulate(cpp(`int* p = nullptr; std::cout << (p == nullptr);`), structuredClone(d.model.defaults));
  assert.deepEqual(errs(r2), [], `nullptr regression: ${JSON.stringify(errs(r2))}`);
});
