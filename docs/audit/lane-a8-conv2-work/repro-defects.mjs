import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";

const d = getDefinition("cpp");
const baseUrl = new URL("../../../js/types/cpp/", import.meta.url).href;
const adv = await loadAdvanced(d, { baseUrl });
const merged = mergeCatalog(d.reference, adv);
const pair = merged.reference.find((r) => r.name === "std::pair");
console.log("pair status:", itemStatus(pair));
console.log("pair example:", JSON.stringify(pair.example));
console.log("pair caution:", JSON.stringify(pair.caution || null));
const nullItem = merged.reference.find((r) => r.name === "std::NULL");
console.log("NULL status:", nullItem ? itemStatus(nullItem) : "NO ITEM");
console.log("NULL caution:", nullItem ? JSON.stringify(nullItem.caution || null) : null);

d.reference = merged.reference;
const run = async (label, body) => {
  const code = `#include <iostream>\n#include <string>\n#include <utility>\nint main() {\n${body}\n return 0;\n}`;
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
  const outs = (r.paths || []).map((p) => p.outputs.map((o) => o.text).join(""));
  console.log(label, "errs:", JSON.stringify(errs), "outs:", JSON.stringify(outs));
};
await run("pair-example-as-is", `std::pair<int, std::string> p{1, "one"}; auto n = p.first; std::cout << n << " " << p.second;`);
await run("pair-example-explicit", `std::pair<int, std::string> p{1, "one"}; int n = p.first; std::cout << n << " " << p.second;`);
await run("std::NULL", `std::cout << std::NULL;`);
await run("NULL-plain", `std::cout << NULL;`);
