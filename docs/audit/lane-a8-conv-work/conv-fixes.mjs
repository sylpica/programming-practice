// WS-DATA conv round: correction presence checks A8-6 / A8-7 / A8-12 + F-03 glossary. Read-only.
import { getDefinition } from "../../../js/types/registry.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";
import { loadAdvanced, clearAdvancedCache } from "../../../js/core/advanced-loader.js";

async function build(id) {
  clearAdvancedCache();
  const def = getDefinition(id);
  const baseUrl = new URL(`../../../js/types/${id}/`, import.meta.url).href;
  const adv = await loadAdvanced({ id }, { baseUrl });
  const merged = mergeCatalog(def, adv);
  return { def, adv, merged, byName: new Map(merged.reference.map((r) => [r.name, r])) };
}
const cpp = await build("cpp");
const cfn = await build("cloudformation");

console.log("=== A8-6: std::vector / std::pair ===");
for (const n of ["std::vector", "std::pair"]) {
  const it = cpp.byName.get(n);
  console.log(`-- ${n}: exists=${!!it} status=${it ? itemStatus(it) : "-"}`);
  if (it) console.log(JSON.stringify(it, null, 1));
}
console.log("\n=== A8-7: iterator types (12) ===");
const iterNames = [];
for (const cls of ["string", "vector", "array"]) for (const k of ["iterator", "const_iterator", "reverse_iterator", "const_reverse_iterator"]) iterNames.push(`std::${cls}::${k}`);
for (const n of iterNames) {
  const it = cpp.byName.get(n);
  console.log(`${n}: exists=${!!it} status=${it ? itemStatus(it) : "-"} caution=${it ? JSON.stringify(it.caution || "") : "-"}`);
}
console.log("\n=== A8-12: invalidation caution on 23 mutators ===");
const mutators = [
  "std::string::append", "std::string::assign", "std::string::clear", "std::string::erase",
  "std::string::insert", "std::string::operator+=", "std::string::operator=", "std::string::pop_back",
  "std::string::push_back", "std::string::replace", "std::string::resize", "std::string::swap",
  "std::vector::assign", "std::vector::clear", "std::vector::emplace", "std::vector::emplace_back",
  "std::vector::erase", "std::vector::insert", "std::vector::operator=", "std::vector::pop_back",
  "std::vector::push_back", "std::vector::resize", "std::vector::swap",
];
let okCount = 0;
for (const n of mutators) {
  const it = cpp.byName.get(n);
  const c = it?.caution || "";
  const has = c.includes("無効化");
  if (has) okCount++;
  console.log(`${n}: exists=${!!it} status=${it ? itemStatus(it) : "-"} hasInvalidationCaution=${has} caution=${JSON.stringify(c)}`);
}
console.log("mutators with invalidation caution:", okCount, "/", mutators.length);

console.log("\n=== F-03: glossary presence in merged catalogs ===");
console.log("cpp base glossary:", cpp.def.glossary?.length ?? cpp.merged.glossary.length, "merged glossary:", cpp.merged.glossary.length);
console.log("cpp glossaryAdvanced:", cpp.adv.glossaryAdvanced.length, JSON.stringify(cpp.adv.glossaryAdvanced.map((g) => g[0])));
const cppWords = new Set(cpp.merged.glossary.map((g) => (Array.isArray(g) ? g[0] : g.word)));
let cppMiss = cpp.adv.glossaryAdvanced.filter((g) => !cppWords.has(g[0]));
console.log("cpp advanced glossary words missing from merged:", cppMiss.length, JSON.stringify(cppMiss.map((g) => g[0])));
console.log("cfn merged glossary:", cfn.merged.glossary.length);
console.log("cfn glossaryAdvanced:", cfn.adv.glossaryAdvanced.length, JSON.stringify(cfn.adv.glossaryAdvanced.map((g) => g[0])));
const cfnWords = new Set(cfn.merged.glossary.map((g) => (Array.isArray(g) ? g[0] : g.word)));
let cfnMiss = cfn.adv.glossaryAdvanced.filter((g) => !cfnWords.has(g[0]));
console.log("cfn advanced glossary words missing from merged:", cfnMiss.length, JSON.stringify(cfnMiss.map((g) => g[0])));
console.log("glossary problems cpp:", cpp.merged.problems.filter((p) => p.kind === "glossary-duplicate").length,
  "cfn:", cfn.merged.problems.filter((p) => p.kind === "glossary-duplicate").length);
console.log("\nDONE FIXES");
