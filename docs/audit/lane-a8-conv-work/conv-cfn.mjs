// WS-DATA conv round: CFN-01/02/03/06/07 — reads app sources read-only.
import { readFileSync, writeFileSync } from "node:fs";
import { getDefinition } from "../../../js/types/registry.js";
import { mergeCatalog, countByStatus, itemStatus } from "../../../js/core/catalog.js";
import { loadAdvanced, clearAdvancedCache } from "../../../js/core/advanced-loader.js";
import { load as yamlLoad } from "../../../js/vendor/yaml.js";

const B8 = "/home/hatch/workspace/programming-practice-audit/work/b8-data";
const spec = JSON.parse(readFileSync(`${B8}/cfn-spec.json`, "utf8"));
console.log("spec version:", spec.ResourceSpecificationVersion);
console.log("spec ResourceTypes:", Object.keys(spec.ResourceTypes).length);

// --- build merged catalog exactly as the app does ---
clearAdvancedCache();
const def = getDefinition("cloudformation");
const baseUrl = new URL("../../../js/types/cloudformation/", import.meta.url).href;
const adv = await loadAdvanced({ id: "cloudformation" }, { baseUrl });
console.log("loaded:", JSON.stringify(adv.loaded), "missing:", JSON.stringify(adv.missing), "failed:", JSON.stringify(adv.failed));
console.log("referenceAdvanced:", adv.referenceAdvanced.length, JSON.stringify(countByStatus(adv.referenceAdvanced)));
console.log("templatesAdvanced:", adv.templatesAdvanced.length, "glossaryAdvanced:", adv.glossaryAdvanced.length);
const merged = mergeCatalog(def, adv);
console.log("merged.reference:", merged.reference.length, JSON.stringify(countByStatus(merged.reference)), "problems:", merged.problems.length);
if (merged.problems.length) console.log("problems detail:", JSON.stringify(merged.problems.slice(0, 10)));

const catalog = merged.reference.filter((r) => r.name.startsWith("AWS::") || r.name.startsWith("Alexa::"));
console.log("catalog AWS/Alexa count:", catalog.length);
const baseAws = def.reference.filter((r) => r.name.startsWith("AWS::") || r.name.startsWith("Alexa::"));
console.log("base AWS/Alexa count:", baseAws.length);

// ============ CFN-01 ============
const docsOnly = [
  "AWS::DeviceFarm::DevicePool", "AWS::DeviceFarm::InstanceProfile", "AWS::DeviceFarm::NetworkProfile",
  "AWS::DeviceFarm::Project", "AWS::DeviceFarm::TestGridProject", "AWS::DeviceFarm::VPCEConfiguration",
  "AWS::GameLiftStreams::Application", "AWS::GameLiftStreams::StreamGroup",
  "AWS::IoTManagedIntegrations::CredentialLocker", "AWS::IoTManagedIntegrations::ManagedThing",
  "AWS::IoTManagedIntegrations::ProvisioningProfile", "AWS::SageMaker::ExperimentTrialComponent",
];
const names = catalog.map((r) => r.name);
const nameSet = new Set(names);
console.log("\n=== CFN-01 ===");
console.log("total:", names.length, "unique:", nameSet.size, "dup:", names.length - nameSet.size);
const specSet = new Set(Object.keys(spec.ResourceTypes));
const inSpec = names.filter((n) => specSet.has(n));
const notInSpec = names.filter((n) => !specSet.has(n));
console.log("inSpec:", inSpec.length, "notInSpec:", notInSpec.length);
console.log("notInSpec == docsOnly set?", JSON.stringify([...notInSpec].sort()) === JSON.stringify([...docsOnly].sort()));
console.log("notInSpec list:", JSON.stringify(notInSpec));
const alexa = names.filter((n) => n.startsWith("Alexa::"));
console.log("Alexa:", JSON.stringify(alexa));
const specExtra = [...specSet].filter((n) => !nameSet.has(n));
console.log("spec->catalog missing (reverse diff):", specExtra.length);
// ledger
let tsv = "idx\tname\tinSpec\tclass\tspecProps\tstatus\n";
catalog.forEach((r, i) => {
  const rt = spec.ResourceTypes[r.name];
  tsv += `${i}\t${r.name}\t${rt ? 1 : 0}\t${rt ? "spec" : "docsOnly"}\t${rt ? Object.keys(rt.Properties || {}).length : ""}\t${itemStatus(r)}\n`;
});
writeFileSync(new URL("./ledger-conv-cfn-names.tsv", import.meta.url), tsv);
console.log("ledger written: ledger-conv-cfn-names.tsv");

// ============ description parser (2 dialects) ============
function parseDesc(desc) {
  if (desc.includes("このリソースタイプにはプロパティがありません。")) return { kind: "zero-standard", listed: [], required: [], total: 0, nado: false };
  const m = desc.match(/主要プロパティは/);
  if (!m) return { kind: "unparsed", listed: [], required: [], total: null, nado: false };
  const rest = desc.slice(m.index + "主要プロパティは".length);
  const tm = desc.match(/全(\d+)(?:件|個)/);
  const total = tm ? parseInt(tm[1], 10) : null;
  const nado = desc.includes("など");
  let listRaw;
  if (rest.includes("です（プロパティは全")) { listRaw = rest.split("です（プロパティは全")[0]; }
  else if (rest.includes("（全")) { listRaw = rest.split("（全")[0]; }
  else return { kind: "unparsed2", listed: [], required: [], total, nado };
  listRaw = listRaw.replace(/\s*など\s*$/, "");
  const rawTokens = listRaw.split("、").map((t) => t.trim()).filter(Boolean);
  const listed = [], required = [];
  const isB = desc.includes("（必須）");
  if (isB) {
    for (let t of rawTokens) {
      t = t.replace(/\s*など\s*$/, "").trim();
      const req = t.includes("（必須）");
      const nm = t.replace("（必須）", "").trim();
      if (nm) { listed.push(nm); if (req) required.push(nm); }
    }
  } else {
    let reqMode = false;
    for (let t of rawTokens) {
      t = t.replace(/\s*など\s*$/, "").trim();
      if (t.startsWith("必須の")) { reqMode = true; t = t.slice("必須の".length).trim(); }
      else if (t.startsWith("ほかに")) { reqMode = false; t = t.slice("ほかに".length).trim(); }
      if (t) { listed.push(t); if (reqMode) required.push(t); }
    }
  }
  return { kind: isB ? "B" : "A", listed, required, total, nado };
}

// ============ CFN-02 ============
console.log("\n=== CFN-02 ===");
const N = catalog.length;
const idx30 = new Set();
for (let i = 0; i < 30; i++) idx30.add(Math.floor((i * N) / 30));
const sample30 = [...idx30].map((i) => catalog[i]);
const eip = catalog.find((r) => r.name === "AWS::EC2::EIP");
const sample = [...sample30];
if (!sample.includes(eip)) sample.push(eip);
console.log("sample size:", sample.length, "(30 equidistant + EIP)");
function checkDesc(item) {
  const problems = [];
  const rt = spec.ResourceTypes[item.name];
  if (!rt) return { problems: ["not-in-spec(docsOnly)"] , parsed: parseDesc(item.description) };
  const specProps = Object.keys(rt.Properties || {});
  const specReq = specProps.filter((k) => rt.Properties[k].Required === true);
  const p = parseDesc(item.description);
  if (p.kind === "zero-standard") {
    if (specProps.length !== 0) problems.push(`zero-text but spec has ${specProps.length} props`);
    return { problems, parsed: p };
  }
  if (p.kind.startsWith("unparsed")) { problems.push("unparsed dialect"); return { problems, parsed: p }; }
  for (const nm of p.listed) if (!specProps.includes(nm)) problems.push(`listed-not-in-spec: ${nm}`);
  if (p.total !== specProps.length) problems.push(`total mismatch: desc=${p.total} spec=${specProps.length}`);
  if (!p.nado) {
    const a = [...p.listed].sort().join(","), b = [...specProps].sort().join(",");
    if (a !== b) problems.push(`no-nado but listed != spec set`);
  }
  for (const nm of p.required) if (!specReq.includes(nm)) problems.push(`required-false: ${nm}`);
  if (!p.nado) {
    const a = [...p.required].sort().join(","), b = [...specReq].sort().join(",");
    if (a !== b) problems.push(`complete-listing required mismatch: desc=[${a}] spec=[${b}]`);
  }
  return { problems, parsed: p };
}
let sampleBad = 0;
for (const it of sample) {
  const { problems, parsed } = checkDesc(it);
  if (problems.length) { sampleBad++; console.log(`BAD ${it.name}: ${JSON.stringify(problems)} desc=${it.description}`); }
  else console.log(`OK ${it.name} [${parsed.kind}] total=${parsed.total} listed=${parsed.listed.length} nado=${parsed.nado}`);
}
console.log("sample problems:", sampleBad);
// EIP explicit
{
  const p = parseDesc(eip.description);
  const specProps = Object.keys(spec.ResourceTypes["AWS::EC2::EIP"].Properties || {});
  console.log("EIP parsed:", JSON.stringify(p));
  console.log("EIP spec props:", JSON.stringify(specProps));
}
// full-catalog supplement
let fullBad = [];
const dialectCount = {};
for (const it of catalog) {
  const rt = spec.ResourceTypes[it.name];
  if (!rt) continue;
  const { problems, parsed } = checkDesc(it);
  dialectCount[parsed.kind] = (dialectCount[parsed.kind] || 0) + 1;
  if (problems.length) fullBad.push({ name: it.name, problems });
}
console.log("dialect counts (spec items):", JSON.stringify(dialectCount));
console.log("full-catalog desc problems:", fullBad.length);
for (const b of fullBad.slice(0, 20)) console.log("  FULLBAD", b.name, JSON.stringify(b.problems));

// ============ CFN-03 ============
console.log("\n=== CFN-03 ===");
const zeroTargets = ["AWS::CloudFormation::WaitConditionHandle", "AWS::Route53::DelegationSet", "AWS::DevOpsGuru::LogAnomalyDetectionIntegration", "AWS::ApplicationSignals::Discovery"];
for (const n of zeroTargets) {
  const it = catalog.find((r) => r.name === n);
  const rt = spec.ResourceTypes[n];
  const specProps = rt ? Object.keys(rt.Properties || {}).length : "N/A";
  const hasStd = it.description.includes("このリソースタイプにはプロパティがありません。");
  let exProps = null, exErr = null;
  try {
    const doc = yamlLoad(it.example);
    const first = Object.values(doc || {})[0];
    exProps = first && first.Properties ? Object.keys(first.Properties) : [];
  } catch (e) { exErr = String(e).slice(0, 120); }
  console.log(`${n}: stdText=${hasStd} specProps=${specProps} exampleProps=${JSON.stringify(exProps)} exErr=${exErr}`);
  console.log(`  desc: ${it.description}`);
  console.log(`  example: ${JSON.stringify(it.example)}`);
}
// exhaustiveness: spec-zero items in catalog & standard-text items
const specZero = catalog.filter((r) => { const rt = spec.ResourceTypes[r.name]; return rt && Object.keys(rt.Properties || {}).length === 0; }).map((r) => r.name);
const stdTextItems = catalog.filter((r) => r.description.includes("このリソースタイプにはプロパティがありません。")).map((r) => r.name);
console.log("spec-zero catalog items:", JSON.stringify(specZero));
console.log("standard-zero-text items:", JSON.stringify(stdTextItems));

// ============ CFN-06 ============
console.log("\n=== CFN-06 ===");
function refSearchText(r) {
  let parts = [r.name, r.category, r.description, r.syntax];
  if (Array.isArray(r.inventoryNames)) parts.push(...r.inventoryNames);
  if (typeof r.scan === "string") parts.push(r.scan);
  return parts.filter((x) => typeof x === "string").join(" ").toLowerCase();
}
const reach = (item, query) => merged.reference.filter((r) => refSearchText(r).includes(query.toLowerCase())).includes(item);
// 25 items: Alexa + 2 docsOnly + 5 longest + equidistant fill
const picks = new Map();
const addPick = (it) => { if (it) picks.set(it.name, it); };
addPick(catalog.find((r) => r.name === "Alexa::ASK::Skill"));
addPick(catalog.find((r) => r.name === "AWS::DeviceFarm::Project"));
addPick(catalog.find((r) => r.name === "AWS::SageMaker::ExperimentTrialComponent"));
const byLen = [...catalog].sort((a, b) => b.name.length - a.name.length || catalog.indexOf(a) - catalog.indexOf(b));
for (let i = 0; i < 5; i++) addPick(byLen[i]);
for (let i = 0; picks.size < 25 && i < N; i++) addPick(catalog[Math.floor((i * N) / 40)]);
console.log("picks:", picks.size, JSON.stringify([...picks.keys()]));
let cfn06bad = 0;
for (const it of picks.values()) if (!reach(it, it.name)) { cfn06bad++; console.log("UNREACHABLE:", it.name); }
console.log("CFN-06 unreachable in 25:", cfn06bad);
// full supplement
let fullUnreach = 0;
for (const it of catalog) if (!reach(it, it.name)) { fullUnreach++; if (fullUnreach <= 5) console.log("FULL UNREACHABLE:", it.name); }
console.log("CFN-06 full-catalog unreachable:", fullUnreach, "/", catalog.length);

// ============ CFN-07 ============
console.log("\n=== CFN-07 ===");
function checkExample(item) {
  const problems = [];
  let doc;
  try { doc = yamlLoad(item.example); } catch (e) { return [`yaml-error: ${String(e).slice(0, 100)}`]; }
  if (!doc || typeof doc !== "object") return ["yaml-not-object"];
  const entries = Object.values(doc);
  if (entries.length !== 1) problems.push(`top-level entries=${entries.length}`);
  const res = entries[0];
  if (!res || typeof res !== "object") return [...problems, "resource-not-object"];
  if (res.Type !== item.name) problems.push(`Type mismatch: ${res.Type} != ${item.name}`);
  const exProps = res.Properties ? Object.keys(res.Properties) : [];
  const rt = spec.ResourceTypes[item.name];
  if (rt) {
    const specProps = Object.keys(rt.Properties || {});
    for (const p of exProps) if (!specProps.includes(p)) problems.push(`example-prop-not-in-spec: ${p}`);
  } else {
    const listed = parseDesc(item.description).listed;
    for (const p of exProps) if (!listed.includes(p)) problems.push(`example-prop-not-in-listed(docsOnly): ${p}`);
  }
  return problems;
}
const idx50 = new Set();
for (let i = 0; i < 50; i++) idx50.add(Math.floor((i * N) / 50));
const sample50 = [...idx50].map((i) => catalog[i]);
let s50bad = 0;
for (const it of sample50) { const pr = checkExample(it); if (pr.length) { s50bad++; console.log(`EXBAD ${it.name}: ${JSON.stringify(pr)}`); } }
console.log("sample50 problems:", s50bad, "names:", JSON.stringify(sample50.map((x) => x.name)));
// templates
console.log("--- templates-advanced (CFN) ---");
for (const t of adv.templatesAdvanced) {
  const typesInCode = [...new Set([...String(t.code || "").matchAll(/AWS::[A-Za-z0-9]+::[A-Za-z0-9]+|Alexa::[A-Za-z0-9]+::[A-Za-z0-9]+/g)].map((m) => m[0]))];
  console.log(`template ${t.id}: types=${JSON.stringify(typesInCode)} refs=${JSON.stringify(t.refs)}`);
  for (const tn of typesInCode) {
    const inCat = nameSet.has(tn);
    const inSpec = specSet.has(tn);
    console.log(`  ${tn}: inCatalog=${inCat} inSpec=${inSpec}`);
  }
  // JSON templates: parse and check props subset
  try {
    const parsed = JSON.parse(t.code);
    const walk = (o) => {
      if (!o || typeof o !== "object") return;
      if (typeof o.Type === "string" && spec.ResourceTypes[o.Type]) {
        const sp = Object.keys(spec.ResourceTypes[o.Type].Properties || {});
        const pp = o.Properties ? Object.keys(o.Properties).filter((k) => k !== "Fn::Transform") : [];
        const bad = pp.filter((k) => !sp.includes(k));
        console.log(`  resource ${o.Type}: props=${JSON.stringify(pp)} bad=${JSON.stringify(bad)}`);
      }
      for (const v of Object.values(o)) walk(v);
    };
    walk(parsed);
  } catch { console.log("  (non-JSON template; type-name check only)"); }
  for (const r of t.refs || []) console.log(`  ref ${r}: resolves=${merged.reference.some((x) => x.name === r)}`);
}
// full supplement
let fullExBad = [];
for (const it of catalog) { const pr = checkExample(it); if (pr.length) fullExBad.push({ name: it.name, pr }); }
console.log("full-catalog example problems:", fullExBad.length);
for (const b of fullExBad.slice(0, 10)) console.log("  EXFULLBAD", b.name, JSON.stringify(b.pr));
// ledger examples
let etsv = "name\ttypeValue\texampleProps\tproblems\n";
for (const it of catalog) {
  let tv = "", ep = "";
  try { const doc = yamlLoad(it.example); const res = Object.values(doc || {})[0]; tv = res?.Type ?? ""; ep = res?.Properties ? Object.keys(res.Properties).join(",") : ""; } catch { tv = "YAML_ERROR"; }
  etsv += `${it.name}\t${tv}\t${ep}\t${checkExample(it).join(";")}\n`;
}
writeFileSync(new URL("./ledger-conv-cfn-examples.tsv", import.meta.url), etsv);
console.log("ledger written: ledger-conv-cfn-examples.tsv");
console.log("\nDONE CFN");
