// WS-HOOKREG (conv round): REG-05 single-engine check (simple vs advanced) in target tree.
// Usage: node reg05-conv.mjs <treeRoot>
import { pathToFileURL } from "node:url";
const root = process.argv[2];
const imp = (p) => import(pathToFileURL(root + p).href);
const { getDefinition } = await imp("/js/types/registry.js");
const { loadAdvanced } = await imp("/js/core/advanced-loader.js");
const { mergeCatalog } = await imp("/js/core/catalog.js");

const DROP = new Set(["elapsed", "elapsedMs", "duration", "durationMs", "timeMs"]);
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") { const o = {}; for (const [k, val] of Object.entries(v)) { if (!DROP.has(k)) o[k] = clean(val); } return o; }
  return v;
}
const norm = (r) => JSON.stringify(clean(r));
const stripNotes = (r) => { const c = clean(JSON.parse(JSON.stringify(r))); delete c.notes; return JSON.stringify(c); };

const out = {};
// --- C++ CPP-01 / CPP-04 ---
{
  const cpp = getDefinition("cpp");
  const adv = await loadAdvanced(cpp);
  const merged = mergeCatalog(cpp, adv);
  out.cppSetup = { baseRef: cpp.reference.length, mergedRef: merged.reference.length, baseTpl: cpp.templates.length, mergedTpl: merged.templates.length, loaded: adv.loaded.length, missing: adv.missing, failed: adv.failed, problems: merged.problems ?? null, engineModule: adv.engineModule ? "present" : null };
  const codes = {
    "CPP-01": ["#include <iostream>", "#include <vector>", "#include <algorithm>", "int main() {", " std::vector<int> v = {5, 2, 8, 1, 9, 3};", " std::sort(v.begin(), v.end());", " for (int x : v) std::cout << x << \" \";", " std::cout << std::binary_search(v.begin(), v.end(), 8) << std::binary_search(v.begin(), v.end(), 4);", " return 0;", "}"].join("\n"),
    "CPP-04": ["#include <iostream>", "#include <string>", "int main() {", " std::string s = \"banana\";", " std::cout << s.find(\"na\") << \" \" << s.rfind(\"na\") << \" \" << s.substr(1, 3) << \" \" << (s.find(\"q\") == std::string::npos);", " return 0;", "}"].join("\n"),
  };
  out.cpp = {};
  for (const [id, code] of Object.entries(codes)) {
    const simple = await cpp.simulate(code, structuredClone(cpp.model.defaults));
    // advanced mode as in worker: keep merged catalog on the definition, simulate with same engine
    const advDef = { ...cpp, __catalogReference: merged.reference };
    const advanced = await advDef.simulate(code, structuredClone(cpp.model.defaults));
    out.cpp[id] = {
      simpleOutputs: simple.paths?.[0]?.outputs ?? null,
      simpleTraceSteps: simple.paths?.[0]?.trace?.length ?? null,
      simpleVars: simple.paths?.[0]?.vars ?? null,
      simpleError: simple.error ?? simple.paths?.[0]?.error ?? null,
      identical: norm(simple) === norm(advanced),
    };
  }
}
// --- CFN: simple (no hook) vs advanced (hook) ---
{
  const { definition } = await imp("/js/types/cloudformation/index.js");
  const eng = await imp("/js/types/cloudformation/advanced-engine.js");
  const adv = await loadAdvanced(definition);
  const merged = mergeCatalog(definition, adv);
  const hookedDef = () => eng.applyAdvancedEngine({ ...definition }, merged);
  const model = () => structuredClone(definition.model.defaults);
  const cases = {
    fake: JSON.stringify({ Resources: { Thing: { Type: "AWS::FakeService::Thing" } } }),
    fakeYaml: "Resources:\n  Thing:\n    Type: AWS::FakeService::Thing\n",
    bucket: JSON.stringify({ Resources: { Bucket: { Type: "AWS::S3::Bucket" } } }),
    custom: JSON.stringify({ Resources: { A: { Type: "Custom::MyResource" }, B: { Type: "AWS::CloudFormation::CustomResource" } } }),
  };
  out.cfn = {};
  for (const [id, code] of Object.entries(cases)) {
    const simple = await definition.simulate(code, model());
    const hk = hookedDef();
    const advanced = await hk.simulate(code, model());
    const advanced2 = await hk.simulate(code, model());
    out.cfn[id] = {
      simpleNotes: simple.notes ?? null,
      advancedNotes: advanced.notes ?? null,
      eqExceptNotes: stripNotes(simple) === stripNotes(advanced),
      fullEq: norm(simple) === norm(advanced),
      rerunNotesCount: advanced2.notes?.length ?? 0,
      rerunFullEq: norm(advanced) === norm(advanced2),
    };
  }
  const sBase = definition.scan(cases.fake);
  const sHook = hookedDef().scan(cases.fake);
  out.cfn.scanFake = { baseElems: [...sBase], hookElems: [...sHook], baseNotes: sBase.notes ?? null, hookNotes: sHook.notes ?? null };
}
console.log(JSON.stringify(out, null, 1));
