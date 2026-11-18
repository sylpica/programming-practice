import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus, countByStatus } from "../../../js/core/catalog.js";
const def = getDefinition("cpp");
const adv = await loadAdvanced(def);
const merged = mergeCatalog(def, adv);
const byName = new Map(merged.reference.map(i=>[i.name,i]));
console.log("counts", JSON.stringify(countByStatus(merged.reference)), "problems", (merged.problems||[]).length);
for (const n of ["std::string::npos","std::isalpha","std::vector","std::pair","std::string::iterator","std::vector::iterator","std::array::iterator","std::string::size_type","std::NULL","std::forward"]) {
  const it = byName.get(n); if (!it) { console.log(n, "NOT FOUND"); continue; }
  console.log(n, "| status=", itemStatus(it), "| returns=", it.returns||"", "| caution=", it.caution||"");
}
const advSup = merged.reference.filter(i=>new Set(adv.referenceAdvanced.map(x=>x.name)).has(i.name)&&itemStatus(i)==="supported");
console.log("adv supported count:", advSup.length);
