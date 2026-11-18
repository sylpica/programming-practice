import { getDefinition } from "../../../js/types/registry.js";
import { clearAdvancedCache, loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";
const def = getDefinition("r");
clearAdvancedCache();
const adv = await loadAdvanced(def);
const merged = mergeCatalog({ reference: def.reference, templates: def.templates, glossary: def.glossary }, adv);
for (const name of ["factor", "as.factor", "ordered"]) {
  const item = merged.reference.find((i) => i.name === name);
  console.log(name, "=>", item ? itemStatus(item) : "ABSENT");
}
console.log("problems:", JSON.stringify(merged.problems));
