// WS-HOOKREG (conv round): CFN hook probes CFN-08..15, CFN-16..18, CFN-B1..B3, B5..B7 (+B4 note text)
// Read-only against the target tree. Usage: node cfn-hook-conv.mjs <treeRoot>
import { pathToFileURL } from "node:url";
const root = process.argv[2];
const imp = (p) => import(pathToFileURL(root + p).href);
const { definition } = await imp("/js/types/cloudformation/index.js");
const { loadAdvanced } = await imp("/js/core/advanced-loader.js");
const { mergeCatalog } = await imp("/js/core/catalog.js");
const eng = await imp("/js/types/cloudformation/advanced-engine.js");
const { applyAdvancedEngine, buildResourceTypeLedger, findUnlistedResourceTypes, unlistedTypeNote, LEDGER_SNAPSHOT_DATE } = eng;

const adv = await loadAdvanced(definition);
const merged = mergeCatalog(definition, adv);
const ledger = buildResourceTypeLedger(merged);
const out = {};
out.setup = {
  loaded: adv.loaded, missing: adv.missing, failed: adv.failed,
  referenceAdvanced: adv.referenceAdvanced.length,
  templatesAdvanced: adv.templatesAdvanced.map(t => t.id),
  mergedReference: merged.reference.length,
  problems: merged.problems ?? merged.problem ?? null,
  ledgerSize: ledger.size, snapshot: LEDGER_SNAPSHOT_DATE,
  has: Object.fromEntries(["AWS::S3::Bucket","AWS::SQS::Queue","AWS::SNS::Topic","AWS::Logs::LogGroup","AWS::CloudFormation::WaitCondition","AWS::CloudFormation::WaitConditionHandle","AWS::CloudFormation::CustomResource","AWS::FakeService::Thing","ＡWS::S3::Bucket","AWS::S3::Bucket "].map(n => [n, ledger.has(n)])),
};
const model = () => structuredClone(definition.model.defaults);
const hooked = () => applyAdvancedEngine({ ...definition }, merged);
const strip = (r) => { if (r == null) return r; const c = JSON.parse(JSON.stringify(r)); delete c.notes; return c; };
const eqNoNotes = (a, b) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));
async function both(code, m) {
  const base = await definition.simulate(code, m ? structuredClone(m) : model());
  const hk = await hooked().simulate(code, m ? structuredClone(m) : model());
  return { base, hk };
}
const summ = (r) => ({ error: r?.error ?? null, notes: r?.notes ?? null, notesCount: Array.isArray(r?.notes) ? r.notes.length : 0, paths: r?.paths?.length ?? null, truncated: r?.truncated ?? null, reasons: r?.reasons ?? null });

// CFN-08
{
  const code = JSON.stringify({ Resources: { Bucket: { Type: "AWS::S3::Bucket" }, Queue: { Type: "AWS::SQS::Queue" } } });
  const { base, hk } = await both(code);
  const bs = definition.scan(code); const hs = hooked().scan(code);
  out.cfn08 = { hooked: summ(hk), eqNoNotes: eqNoNotes(base, hk), scanNotes: hs.notes ?? null, scanElemEq: JSON.stringify([...hs]) === JSON.stringify([...bs]) };
}
// CFN-09
{
  const code = JSON.stringify({ Resources: { Thing: { Type: "AWS::FakeService::Thing" } } });
  const { base, hk } = await both(code);
  const bs = definition.scan(code); const hs = hooked().scan(code);
  out.cfn09 = { hooked: summ(hk), noteText: hk.notes?.[0] ?? null, eqNoNotes: eqNoNotes(base, hk), scanNotes: hs.notes ?? null, scanElemEq: JSON.stringify([...hs]) === JSON.stringify([...bs]), baseScanNotes: bs.notes ?? null };
}
// CFN-10 / 11
for (const [key, type] of [["cfn10", "Custom::MyResource"], ["cfn11", "AWS::CloudFormation::CustomResource"]]) {
  const code = JSON.stringify({ Resources: { R: { Type: type } } });
  const { base, hk } = await both(code);
  out[key] = { hooked: summ(hk), eqNoNotes: eqNoNotes(base, hk), fullEq: JSON.stringify(base) === JSON.stringify(hk) };
}
// CFN-12
{
  const code = JSON.stringify({ Resources: { First: { Type: "AWS::FakeService::Thing" }, Second: { Type: "AWS::FakeService::Thing" } } });
  const { hk } = await both(code);
  const nested = { Resources: { First: { Type: "AWS::FakeService::Thing" }, Second: { Type: "AWS::FakeService::Thing" } }, Inner: { Resources: { First: { Type: "AWS::FakeService::Thing" }, Third: { Type: "AWS::FakeService::Thing" } } } };
  const dup = { Resources: { A: { Type: "AWS::FakeService::Thing" } }, Inner: { Resources: { A: { Type: "AWS::FakeService::Thing" } } } };
  out.cfn12 = { simNotes: hk.notes ?? null, directNested: findUnlistedResourceTypes(nested, ledger), directDup: findUnlistedResourceTypes(dup, ledger) };
}
// CFN-13
{
  const code = JSON.stringify({ Resources: { Thing: { Type: "AWS::FakeService::Thing" } } });
  const h = hooked();
  const r1 = await h.simulate(code, model()); const r2 = await h.simulate(code, model());
  const dbl = { ...definition }; applyAdvancedEngine(dbl, merged); applyAdvancedEngine(dbl, merged);
  const rd = await dbl.simulate(code, model());
  const frag = r1.paths?.[0]?.fragment;
  const refeed = await h.simulate(JSON.stringify(frag), model());
  const s1 = h.scan(code); const s2 = h.scan(code);
  const before = JSON.stringify(definition.model.defaults);
  const shared = model(); const ra = await h.simulate(code, shared); const rb = await h.simulate(code, shared);
  out.cfn13 = { run1: summ(r1), run2: summ(r2), runsEq: JSON.stringify(r1) === JSON.stringify(r2), doubleApply: summ(rd), refeed: summ(refeed), scan1: s1.notes?.length ?? 0, scan2: s2.notes?.length ?? 0, sharedA: summ(ra), sharedB: summ(rb), defaultsUnchanged: JSON.stringify(definition.model.defaults) === before };
}
// CFN-14
{
  const code = JSON.stringify({ Resources: { Thing: { Type: "AWS::FakeService::Thing" } } });
  const r = await definition.simulate(code, model());
  const s = definition.scan(code);
  out.cfn14 = { sim: summ(r), scanNotes: s.notes ?? null };
}
// CFN-15
{
  const code = JSON.stringify({ Resources: { Bucket: { Type: "aws::s3::bucket" } } });
  const { base, hk } = await both(code);
  out.cfn15 = { hooked: summ(hk), eqNoNotes: eqNoNotes(base, hk), direct: findUnlistedResourceTypes(JSON.parse(code), ledger) };
}
// CFN-16..18 templates
async function runTemplate(id) {
  const t = merged.templates.find(x => x.id === id) || adv.templatesAdvanced.find(x => x.id === id);
  if (!t) return { missing: true };
  const { base, hk } = await both(t.code);
  const frag = hk.paths?.[0]?.fragment;
  const allText = JSON.stringify(hk);
  return {
    intro: t.intro, title: t.title,
    hooked: summ(hk), eqNoNotes: eqNoNotes(base, hk),
    fragment: frag ?? null,
    outputs: hk.paths?.[0]?.outputs ?? null,
    traceTexts: (hk.paths?.[0]?.trace ?? []).map(x => typeof x === "string" ? x : (x.text ?? JSON.stringify(x))),
    leakObjectObject: allText.includes("[object Object]"), leakSet: allText.includes("__set"),
  };
}
out.cfn16 = await runTemplate("cfn-adv-multi-resource");
out.cfn17 = await runTemplate("cfn-adv-fn-transform-loggroup");
{
  // CFN-17 auxiliary: macro AddFake injects unlisted type into transformed fragment
  const m = model();
  m.macros.AddFake = "def handler(event, context):\n    fragment = event[\"fragment\"]\n    fragment[\"Resources\"][\"Injected\"] = {\"Type\": \"AWS::FakeService::Thing\"}\n    return {\"requestId\": event[\"requestId\"], \"status\": \"success\", \"fragment\": fragment}";
  const code = JSON.stringify({ Transform: "AddFake", Resources: { Bucket: { Type: "AWS::S3::Bucket" } } });
  const base = await definition.simulate(code, structuredClone(m));
  const hk = await hooked().simulate(code, structuredClone(m));
  out.cfn17aux = { base: summ(base), hooked: summ(hk), noteText: hk.notes?.[0] ?? null, eqNoNotes: eqNoNotes(base, hk), fragHasInjected: JSON.stringify(hk.paths?.[0]?.fragment ?? {}).includes("Injected") };
}
out.cfn18a = await runTemplate("cfn-adv-handler-type-count");
out.cfn18b = await runTemplate("cfn-adv-handler-params-stage");
// CFN-B1
for (const [key, type] of [["cfnB1num", 123], ["cfnB1list", ["AWS::S3::Bucket"]]]) {
  const code = JSON.stringify({ Resources: { R: { Type: type } } });
  try {
    const { base, hk } = await both(code);
    out[key] = { hooked: summ(hk), base: summ(base), eqNoNotes: eqNoNotes(base, hk), direct: findUnlistedResourceTypes(JSON.parse(code), ledger) };
  } catch (e) { out[key] = { threw: String(e) }; }
}
// CFN-B2
for (const [key, code] of [["cfnB2empty", "{}"], ["cfnB2emptyRes", JSON.stringify({ Resources: {} })]]) {
  try {
    const { base, hk } = await both(code);
    out[key] = { hooked: summ(hk), eqNoNotes: eqNoNotes(base, hk) };
  } catch (e) { out[key] = { threw: String(e) }; }
}
// CFN-B3
{
  const res = {};
  const known = ["AWS::S3::Bucket", "AWS::SQS::Queue", "AWS::SNS::Topic"];
  for (let i = 0; i < 150; i++) res["K" + i] = { Type: known[i % 3] };
  for (let i = 0; i < 50; i++) res["U" + i] = { Type: `AWS::Fake${i}::Thing` };
  const code = JSON.stringify({ Resources: res });
  const { base, hk } = await both(code);
  out.cfnB3 = { hooked: summ(hk), eqNoNotes: eqNoNotes(base, hk), distinctNoteTypes: new Set((hk.notes ?? []).map(n => n.match(/Type「([^」]+)」/)?.[1])).size };
}
// CFN-B4 note text generation only
{
  const evil = "AWS::X::<script>alert(1)</script>";
  const hits = findUnlistedResourceTypes({ Resources: { R: { Type: evil } } }, ledger);
  out.cfnB4 = { hits, noteText: hits.length ? unlistedTypeNote(hits[0]) : null, noteContainsRaw: hits.length ? unlistedTypeNote(hits[0]).includes(evil) : null };
  const code = JSON.stringify({ Resources: { R: { Type: evil } } });
  const { hk } = await both(code);
  out.cfnB4.simNotes = hk.notes ?? null;
}
// CFN-B5
for (const [key, type] of [["cfnB5space", "AWS::S3::Bucket "], ["cfnB5full", "ＡWS::S3::Bucket"]]) {
  const code = JSON.stringify({ Resources: { R: { Type: type } } });
  const { base, hk } = await both(code);
  out[key] = { type, nfkc: type.normalize("NFKC"), ledgerHasOriginal: ledger.has(type), ledgerHasNFKC: ledger.has(type.normalize("NFKC")), hooked: summ(hk), noteText: hk.notes?.[0] ?? null, noteContainsOriginal: hk.notes?.[0]?.includes(type) ?? null, eqNoNotes: eqNoNotes(base, hk), direct: findUnlistedResourceTypes(JSON.parse(code), ledger) };
}
// CFN-B6 circular
{
  const circ = { Resources: { R: { Type: "AWS::FakeService::Thing" } } };
  circ.self = circ; circ.Resources.R.loop = circ;
  const direct = findUnlistedResourceTypes(circ, ledger);
  // handler form with circular model fragment
  const m = model();
  const frag = { Resources: { New: { Type: "AWS::FakeService::Thing" } } };
  frag.self = frag;
  m.event.fragment = frag;
  const handler = "def handler(event, context):\n    return {\"requestId\": event[\"requestId\"], \"status\": \"success\", \"fragment\": event[\"fragment\"]}";
  let simRes = null, simErr = null;
  try { const hk = await hooked().simulate(handler, m); simRes = summ(hk); } catch (e) { simErr = String(e); }
  out.cfnB6 = { direct, sim: simRes, simErr };
}
// CFN-B7
{
  const items = {};
  for (const name of ["AWS::CloudFormation::WaitCondition", "AWS::CloudFormation::WaitConditionHandle"]) {
    const it = merged.reference.find(x => x.name === name);
    items[name] = it ? JSON.parse(JSON.stringify(it)) : null;
  }
  out.cfnB7 = { ledgerBoth: ledger.has("AWS::CloudFormation::WaitCondition") && ledger.has("AWS::CloudFormation::WaitConditionHandle"), items };
}
console.log(JSON.stringify(out, null, 1));
