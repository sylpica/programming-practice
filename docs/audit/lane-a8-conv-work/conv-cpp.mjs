// WS-DATA conv round: C-11 / F-02 / scan reachability / REG-06 (data side). Read-only.
import { readFileSync, writeFileSync } from "node:fs";
import { getDefinition } from "../../../js/types/registry.js";
import { mergeCatalog, countByStatus, itemStatus } from "../../../js/core/catalog.js";
import { loadAdvanced, clearAdvancedCache } from "../../../js/core/advanced-loader.js";

const B8 = "/home/hatch/workspace/programming-practice-audit/work/b8-data";
const nsWork = JSON.parse(readFileSync(`${B8}/cpp-namespace-work.json`, "utf8")).map((x) => x.name);
const memWork = JSON.parse(readFileSync(`${B8}/cpp-members-work.json`, "utf8")).map((x) => x.name);
console.log("mother namespace:", nsWork.length, "members:", memWork.length);
const mother = [...nsWork, ...memWork];
const motherSet = new Set(mother);
console.log("mother union:", motherSet.size, "intersection ns∩mem:", nsWork.filter((n) => new Set(memWork).has(n)).length);

clearAdvancedCache();
const def = getDefinition("cpp");
const baseRefOriginal = def.reference;
const baseUrl = new URL("../../../js/types/cpp/", import.meta.url).href;
const adv = await loadAdvanced({ id: "cpp" }, { baseUrl });
console.log("loaded:", JSON.stringify(adv.loaded), "missing:", JSON.stringify(adv.missing), "failed:", JSON.stringify(adv.failed));
console.log("base reference:", baseRefOriginal.length, JSON.stringify(countByStatus(baseRefOriginal)));
console.log("referenceAdvanced:", adv.referenceAdvanced.length, JSON.stringify(countByStatus(adv.referenceAdvanced)));
const merged = mergeCatalog(def, adv);
console.log("merged:", merged.reference.length, JSON.stringify(countByStatus(merged.reference)), "problems:", merged.problems.length);
if (merged.problems.length) console.log("problems:", JSON.stringify(merged.problems.slice(0, 10)));
console.log("merged templates:", merged.templates.length, "glossary:", merged.glossary.length);

const advNames = adv.referenceAdvanced.map((r) => r.name);
const advSet = new Set(advNames);
console.log("adv unique:", advSet.size, "dup:", advNames.length - advSet.size);
// namespace vs member split in catalog (heuristic: names in mother ns set / mem set, plus renamed)
const catNs = adv.referenceAdvanced.filter((r) => new Set(nsWork).has(r.name));
const catMem = adv.referenceAdvanced.filter((r) => new Set(memWork).has(r.name));
console.log("catalog∩motherNs:", catNs.length, JSON.stringify(countByStatus(catNs.map((r) => ({ status: r.status })))));
console.log("catalog∩motherMem:", catMem.length, JSON.stringify(countByStatus(catMem.map((r) => ({ status: r.status })))));

// set differences mother vs catalog-advanced
const motherOnly = mother.filter((n) => !advSet.has(n));
const catalogOnly = advNames.filter((n) => !motherSet.has(n));
console.log("\n=== set diff ===");
console.log("motherOnly:", motherOnly.length, JSON.stringify(motherOnly));
console.log("catalogOnly:", catalogOnly.length, JSON.stringify(catalogOnly));

// explicit status check
const noExplicit = adv.referenceAdvanced.filter((r) => !["supported", "unsupported", "unverified"].includes(r.status));
console.log("adv items without explicit valid status:", noExplicit.length);

// ============ search reachability (exact copy of app.js refSearchText) ============
function refSearchText(r) {
  let parts = [r.name, r.category, r.description, r.syntax];
  if (Array.isArray(r.inventoryNames)) parts.push(...r.inventoryNames);
  if (typeof r.scan === "string") parts.push(r.scan);
  return parts.filter((x) => typeof x === "string").join(" ").toLowerCase();
}
console.log("\n=== F-02 search ===");
const mergedRef = merged.reference;
let selfFail = [];
for (const it of mergedRef) if (!refSearchText(it).includes(it.name.toLowerCase())) selfFail.push(it.name);
console.log("self-name reachability:", mergedRef.length - selfFail.length, "/", mergedRef.length, "fail:", JSON.stringify(selfFail));
// syntax spellings
let spellTotal = 0, spellFail = [];
const spellRe = /[A-Za-z_][A-Za-z0-9_]*(?:::[~A-Za-z_][A-Za-z0-9_]*)+|[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*/g;
for (const it of mergedRef) {
  const syn = it.syntax || "";
  const spells = syn.match(spellRe) || [];
  for (const s of spells) {
    spellTotal++;
    if (!refSearchText(it).includes(s.toLowerCase())) spellFail.push(`${it.name} :: ${s}`);
  }
}
console.log("syntax spellings:", spellTotal, "fail:", spellFail.length, JSON.stringify(spellFail.slice(0, 10)));
// mother names reachability (any merged item)
const searchTexts = mergedRef.map((r) => refSearchText(r));
const byName = new Map(mergedRef.map((r) => [r.name, r]));
let motherSelf = 0, motherOtherOnly = [], motherNone = [];
for (const n of motherSet) {
  const q = n.toLowerCase();
  const self = byName.has(n) && refSearchText(byName.get(n)).includes(q);
  if (self) { motherSelf++; continue; }
  const anyHit = searchTexts.some((t) => t.includes(q));
  if (anyHit) motherOtherOnly.push(n); else motherNone.push(n);
}
console.log("mother self-reach:", motherSelf, "other-only:", JSON.stringify(motherOtherOnly), "none:", motherNone.length, JSON.stringify(motherNone));
// inventoryNames / scan metadata presence
console.log("adv items with inventoryNames:", adv.referenceAdvanced.filter((r) => Array.isArray(r.inventoryNames)).length,
  "with scan string:", adv.referenceAdvanced.filter((r) => typeof r.scan === "string").length);

// ============ scan reachability ============
console.log("\n=== scan ===");
const MEMBER_DECL = {
  "std::string": (v) => `std::string ${v};`,
  "std::vector": (v) => `std::vector<int> ${v};`,
  "std::array": (v) => `std::array<int, 3> ${v};`,
  "std::pair": (v) => `std::pair<int, int> ${v};`,
};
function fragmentsFor(item) {
  const frags = [item.name];
  const m = item.name.match(/^(std::(?:string|vector|array|pair))::(.+)$/);
  if (m && MEMBER_DECL[m[1]]) {
    const member = m[2];
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(member)) frags.push(`${MEMBER_DECL[m[1]]("objW")} objW.${member};`);
  }
  return frags;
}
function scanReach(referenceToUse, items) {
  def.reference = referenceToUse;
  const reached = new Set();
  const CH = 150;
  for (let s = 0; s < items.length; s += CH) {
    const chunk = items.slice(s, s + CH);
    const code = chunk.flatMap((it) => fragmentsFor(it)).join("\n");
    let out = [];
    try { out = def.scan(code) || []; } catch (e) { console.log("scan threw:", String(e).slice(0, 200)); }
    for (const n of out) reached.add(n);
  }
  return reached;
}
const reachedMerged = scanReach(mergedRef, mergedRef);
const supportedItems = mergedRef.filter((r) => itemStatus(r) === "supported");
const advSupported = adv.referenceAdvanced.filter((r) => itemStatus(r) === "supported");
console.log("scan reached (merged, all items):", [...reachedMerged].filter((n) => byName.has(n)).length);
const supUnreached = advSupported.filter((r) => !reachedMerged.has(r.name)).map((r) => r.name);
console.log("advanced supported:", advSupported.length, "scan-unreached supported:", supUnreached.length, JSON.stringify(supUnreached));
const allAdvUnreached = adv.referenceAdvanced.filter((r) => !reachedMerged.has(r.name)).map((r) => r.name);
console.log("advanced all unreached:", allAdvUnreached.length);
const isIdentName = (n) => n.split("::").every((p) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(p));
const identUnreached = allAdvUnreached.filter(isIdentName);
console.log("advanced unreached with identifier-only names:", identUnreached.length, JSON.stringify(identUnreached.slice(0, 20)));
const nonIdentCount = adv.referenceAdvanced.filter((r) => !isIdentName(r.name)).length;
console.log("advanced non-identifier names total:", nonIdentCount);
// template spot check
{
  const tpl = merged.templates.find((t) => t.id === "cpp-adv-sort-search");
  def.reference = mergedRef;
  const out = def.scan(tpl.code);
  console.log("cpp-adv-sort-search scan:", JSON.stringify(out));
  console.log("cpp-adv-sort-search refs:", JSON.stringify(tpl.refs), "refs⊆scan∪{?}:", JSON.stringify((tpl.refs || []).filter((r) => !out.includes(r))));
}

// ============ REG-06 data side (base-only control) ============
console.log("\n=== REG-06 base-only ===");
const baseTexts = baseRefOriginal.map((r) => refSearchText(r));
let baseLeakNames = [];
for (const n of advSet) {
  const q = n.toLowerCase();
  if (baseTexts.some((t) => t.includes(q))) baseLeakNames.push(n);
}
console.log("advanced names appearing in base search text:", baseLeakNames.length, JSON.stringify(baseLeakNames));
const reachedBase = scanReach(baseRefOriginal, adv.referenceAdvanced);
const baseScanLeak = adv.referenceAdvanced.filter((r) => reachedBase.has(r.name)).map((r) => r.name);
console.log("advanced names resolved by base-only scan:", baseScanLeak.length, JSON.stringify(baseScanLeak));
const sampleNames = ["std::sort", "std::accumulate", "std::binary_search", "std::numbers::pi", "std::string::npos", "std::vector::push_back", "std::popcount", "std::clamp", "std::stoi"];
for (const n of sampleNames) {
  const inBase = baseTexts.some((t) => t.includes(n.toLowerCase()));
  const selfMerged = byName.has(n) && refSearchText(byName.get(n)).includes(n.toLowerCase());
  console.log(`  ${n}: baseHit=${inBase} mergedSelfHit=${selfMerged} mergedStatus=${byName.has(n) ? itemStatus(byName.get(n)) : "ABSENT"}`);
}
def.reference = baseRefOriginal; // restore
// template refs (cpp advanced)
console.log("\n=== cpp template refs ===");
const advTpl = merged.templates.filter((t) => String(t.id).startsWith("cpp-adv-"));
let totRefs = 0, dangling = 0, nonSup = 0;
for (const t of advTpl) {
  for (const r of t.refs || []) {
    totRefs++;
    const target = byName.get(r);
    if (!target) { dangling++; console.log(`DANGLING ${t.id} -> ${r}`); }
    else if (itemStatus(target) !== "supported") { nonSup++; console.log(`NONSUP ${t.id} -> ${r} [${itemStatus(target)}]`); }
  }
  console.log(`${t.id}: refs=${(t.refs || []).length}`);
}
console.log("total refs:", totRefs, "dangling:", dangling, "non-supported targets:", nonSup);
// ledger
let tsv = "name\tinMother\tmotherKind\tstatus\tsearchSelf\tscanReached\n";
const nsSet = new Set(nsWork);
for (const it of mergedRef) {
  tsv += `${it.name}\t${motherSet.has(it.name) ? 1 : 0}\t${nsSet.has(it.name) ? "ns" : motherSet.has(it.name) ? "mem" : ""}\t${itemStatus(it)}\t${refSearchText(it).includes(it.name.toLowerCase()) ? 1 : 0}\t${reachedMerged.has(it.name) ? 1 : 0}\n`;
}
for (const n of motherOnly) tsv += `${n}\t1\t${nsSet.has(n) ? "ns" : "mem"}\tABSENT\t0\t0\n`;
writeFileSync(new URL("./ledger-conv-cpp-names.tsv", import.meta.url), tsv);
console.log("ledger written: ledger-conv-cpp-names.tsv");
console.log("\nDONE CPP");
