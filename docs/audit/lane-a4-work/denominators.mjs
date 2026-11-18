// 収束ラウンド A4: 分母実測（mergeCatalog）
// VBA / R の合成カタログ件数・status 内訳・problems を実測する。
import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced, clearAdvancedCache } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, countByStatus } from "../../../js/core/catalog.js";

for (const id of ["vba", "r"]) {
  const def = getDefinition(id);
  clearAdvancedCache();
  const adv = await loadAdvanced(def);
  const merged = mergeCatalog(
    { reference: def.reference, templates: def.templates, glossary: def.glossary },
    adv,
  );
  const counts = countByStatus(merged.reference);
  console.log(`== ${id} ==`);
  console.log("base reference:", def.reference.length);
  console.log("advanced failed:", JSON.stringify(adv.failed));
  console.log("merged total:", merged.reference.length);
  console.log("byStatus:", JSON.stringify(counts));
  console.log("problems:", JSON.stringify(merged.problems));
  const names = merged.reference.map((r) => r.name);
  console.log("duplicate names:", names.length - new Set(names).size);
  if (id === "vba") {
    const consts = merged.reference.filter((r) => r.category === "定数");
    console.log("vba category=定数 items:", consts.length);
    console.log("vba const byStatus:", JSON.stringify(countByStatus(consts)));
  }
}
