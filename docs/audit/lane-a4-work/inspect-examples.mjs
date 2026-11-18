import { getDefinition } from "../../../js/types/registry.js";
import { clearAdvancedCache, loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";

for (const lang of ["r", "vba"]) {
  const def = getDefinition(lang);
  clearAdvancedCache();
  const adv = await loadAdvanced(def);
  const merged = mergeCatalog({ reference: def.reference, templates: def.templates, glossary: def.glossary }, adv);
  const sup = merged.reference.filter((i) => itemStatus(i) === "supported");
  const withEx = sup.filter((i) => i.example && String(i.example).trim());
  console.log(`== ${lang}: supported=${sup.length} withExample=${withEx.length}`);
  for (const i of withEx.slice(0, 3)) console.log(`  [${i.name}] ${JSON.stringify(i.example)}`);
  const baseNames = new Set(def.reference.map((i) => i.name));
  const advOnly = withEx.filter((i) => !baseNames.has(i.name));
  console.log(`  advanced-origin examples: ${advOnly.length}`);
}
