// 収束ラウンド A4: 全項目 example 実走電池（VBA 539 + R 2,045）
// 宣言（対応／未対応）と挙動（実行可／停止）のマトリクスを統合ビルドで再測する。
// VBA は example を Sub Main で包む（完全性チームと同一方式）。
import { getDefinition } from "../../../js/types/registry.js";
import { clearAdvancedCache, loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";

const lang = process.argv[2];
const def = getDefinition(lang);
clearAdvancedCache();
const adv = await loadAdvanced(def);
const merged = mergeCatalog({ reference: def.reference, templates: def.templates, glossary: def.glossary }, adv);

const runVba = async (example) => {
  const code = /^\s*(Sub|Function|Property)\b/m.test(example) ? example : `Sub Main()\n${example}\nEnd Sub`;
  const r = await def.simulate(code, structuredClone(def.model.defaults));
  const p = r.paths?.[0];
  const err = r.error ?? p?.error ?? null;
  const blob = JSON.stringify([p?.outputs ?? [], p?.groups ?? [], p?.trace ?? []]);
  return { err: err ? (err.message ?? String(err)) : null, objObj: blob.includes("[object Object]") };
};
const runR = async (example) => {
  const r = await def.simulate(example, structuredClone(def.model.defaults));
  const p = r.paths?.[0];
  const err = r.error ?? p?.error ?? null;
  const blob = JSON.stringify([p?.outputs ?? [], p?.groups ?? [], p?.trace ?? []]);
  return { err: err ? (err.message ?? String(err)) : null, objObj: blob.includes("[object Object]") };
};
const run = lang === "vba" ? runVba : runR;

const stats = { supported: { ok: 0, stop: [] }, unsupported: { ok: [], stop: 0 } };
let objObjCount = 0;
let n = 0;
for (const item of merged.reference) {
  const status = itemStatus(item);
  const ex = item.example && String(item.example).trim() ? String(item.example) : null;
  if (!ex) { console.log(`NOEXAMPLE ${status} ${item.name}`); continue; }
  const { err, objObj } = await run(ex);
  if (objObj) objObjCount++;
  n++;
  if (n % 400 === 0) console.error(`...${n}`);
  if (status === "supported") {
    if (err) stats.supported.stop.push(`${item.name} :: ${err}`);
    else stats.supported.ok++;
  } else {
    if (err) stats.unsupported.stop++;
    else stats.unsupported.ok.push(item.name);
  }
}
console.log(`LANG=${lang} total=${n} objectObject=${objObjCount}`);
console.log(`SUPPORTED ok=${stats.supported.ok} stop=${stats.supported.stop.length}`);
for (const s of stats.supported.stop) console.log(`  SUP-STOP ${s}`);
console.log(`UNSUPPORTED stop=${stats.unsupported.stop} ok=${stats.unsupported.ok.length}`);
for (const s of stats.unsupported.ok) console.log(`  UNS-OK ${s}`);
