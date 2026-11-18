// 収束ラウンド第2回 A4班スポット実測：CONV-A4-01 成立／RG-634 維持／SP-21 整合。
// TREE_ROOT 環境変数で対象ツリーを切り替える（前回ツリーとの機械比較用）。
import { pathToFileURL } from "node:url";
const ROOT = process.env.TREE_ROOT;
const imp = (p) => import(pathToFileURL(ROOT + p));
const { getDefinition } = await imp("/js/types/registry.js");
const { loadAdvanced, clearAdvancedCache } = await imp("/js/core/advanced-loader.js");
const { mergeCatalog } = await imp("/js/core/catalog.js");

const d = getDefinition("r");
const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const outs = (r) => (r.paths?.[0]?.outputs ?? []).map((o) => o.text);
const errOf = (r) => {
  const e = r.error ?? r.paths?.[0]?.error ?? null;
  return e == null ? null : (e.message ?? String(e));
};
const show = async (label, code) => {
  const r = await run(code);
  console.log(`${label}\terr=${errOf(r)}\touts=${JSON.stringify(outs(r))}`);
};

// --- CONV-A4-01（実 R 4.3.3 の第1回実測が期待値） ---
await show("sort(NULL) is.null", "z <- sort(NULL); cat(is.null(z)); print(sort(NULL))");
await show("sort.int(NULL) is.null", "z <- sort.int(NULL); cat(is.null(z))");
await show("sort(numeric(0)) not null", "z <- sort(numeric(0)); cat(is.null(z), length(z))");
await show("order() is.null", "z <- order(); cat(is.null(z))");
await show("order(NULL)", "order(NULL)");
await show("order(NULL, 1:3)", "order(NULL, 1:3)");
await show("order(1:3, NULL)", "order(1:3, NULL)");
await show("sort.list(NULL)", "sort.list(NULL)");
await show("rev(NULL) is.null", "z <- rev(NULL); cat(is.null(z))");
await show("rank(NULL) length", "cat(length(rank(NULL)))");
await show("sort normal", "cat(sort(c(3, 1, 2)))");
await show("order normal", "cat(order(c(3, 1, 2)))");
await show("sort char", 'cat(sort(c("b", "a")))');

// --- RG-634（NA 名属性の表示層） ---
await show("RG-634 setNames print", 'print(setNames(c(1, 2, 3), "a"))');
await show("RG-634 NA name print", 'v <- c(1, 2); names(v) <- c("x", NA); print(v)');
await show("RG-634 names()", 'cat(names(setNames(c(1, 2, 3), "a")))');

// --- SP-21：名前照合表の件数と F-04 caution（データ側）の在席 ---
const vbaNames = (await imp("/js/types/vba/reference-advanced-names.js")).referenceAdvancedNames;
const rNames = (await imp("/js/types/r/reference-advanced-names.js")).referenceAdvancedNames;
console.log(`names-table vba=${vbaNames.length} r=${rNames.length}`);

for (const id of ["vba", "r"]) {
  const def = getDefinition(id);
  clearAdvancedCache();
  const adv = await loadAdvanced(def);
  const merged = mergeCatalog({ reference: def.reference, templates: def.templates, glossary: def.glossary }, adv);
  if (id === "vba") {
    for (const nm of ["VarType", "TypeName", "Hex", "Oct"]) {
      const it = merged.reference.find((x) => x.name === nm);
      console.log(`F04 ${nm}: status=${it?.status ?? it?.support ?? "?"} caution=${JSON.stringify(it?.caution ?? null)}`);
    }
    // 高度専用名が合成カタログに在席し、名前表とも一致すること
    const mergedNames = new Set(merged.reference.map((x) => x.name));
    const missing = vbaNames.filter((n) => !mergedNames.has(n.name ?? n));
    console.log(`vba names-table all present in merged: missing=${missing.length}`);
  } else {
    const mergedNames = new Set(merged.reference.map((x) => x.name));
    const missing = rNames.filter((n) => !mergedNames.has(n.name ?? n));
    console.log(`r names-table all present in merged: missing=${missing.length}`);
  }
}
