import { getDefinition } from "../../../js/types/registry.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";

const d = getDefinition("cpp");
const baseUrl = new URL("../../../js/types/cpp/", import.meta.url).href;
const adv = await loadAdvanced({ id: "cpp" }, { baseUrl });
const merged = mergeCatalog(d.reference, adv);
const byName = new Map(merged.reference.map((r) => [r.name, r]));
const targets = [
  "std::vector", "std::pair", "std::array", "std::string", "std::NULL",
  "std::string::iterator", "std::string::const_iterator", "std::string::reverse_iterator", "std::string::const_reverse_iterator",
  "std::vector::iterator", "std::vector::const_iterator", "std::vector::reverse_iterator", "std::vector::const_reverse_iterator",
  "std::array::iterator", "std::array::const_iterator", "std::array::reverse_iterator", "std::array::const_reverse_iterator",
  "std::string::size_type", "std::vector::size_type", "std::pair::first_type",
];
for (const name of targets) {
  const it = byName.get(name);
  if (!it) { console.log(`== ${name}: NOT FOUND`); continue; }
  console.log(`== ${name} [status=${itemStatus(it)}]`);
  console.log(JSON.stringify(it, null, 1).slice(0, 1600));
  console.log("");
}
