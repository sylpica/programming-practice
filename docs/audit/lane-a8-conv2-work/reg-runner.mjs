// WS-HOOKREG (conv round): REG runner — run in a SEPARATE process per tree.
// Usage: node reg-runner.mjs <treeRoot> <casesJson> <outJson>
// Normalization follows findings-reg.md: topError/notes/truncated/reasons/operations
// + per-path outputs{text,channel}/trace{line,text,category,kind}/error/halt/signal/
// vars/model.variables/groups/facts, JSON-compared. Only elapsed-time keys are dropped.
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
const [root, casesPath, outPath] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(root + p).href);
const { getDefinition } = await imp("/js/types/registry.js");
const cases = JSON.parse(readFileSync(casesPath, "utf8"));

const DROP = new Set(["elapsed", "elapsedMs", "duration", "durationMs", "timeMs"]);
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) { if (!DROP.has(k)) o[k] = clean(val); }
    return o;
  }
  return v;
}
function normalize(r) {
  if (!r || typeof r !== "object") return { raw: r ?? null };
  const n = {
    topError: r.error ?? null,
    notes: r.notes ?? null,
    truncated: r.truncated ?? null,
    reasons: r.reasons ?? null,
    operations: r.operations ?? null,
    paths: (r.paths ?? []).map(p => ({
      outputs: (p.outputs ?? []).map(o => ({ text: o.text ?? null, channel: o.channel ?? null })),
      trace: (p.trace ?? []).map(t => typeof t === "string" ? { text: t } : { line: t.line ?? null, text: t.text ?? null, category: t.category ?? null, kind: t.kind ?? null }),
      error: p.error ?? null,
      halt: p.halt ?? null,
      signal: p.signal ?? null,
      vars: clean(p.vars ?? null),
      modelVariables: clean(p.model?.variables ?? null),
      groups: clean(p.groups ?? null),
      facts: clean(p.facts ?? null),
      response: clean(p.response ?? null),
      fragment: clean(p.fragment ?? null),
    })),
  };
  return n;
}
async function run(defId, code) {
  const d = getDefinition(defId);
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  return normalize(r);
}
const wrapC = (body) => ["#include <stdio.h>", "#include <stdlib.h>", "#include <string.h>", "#include <math.h>", "int main() {", " " + body, " return 0;", "}"].join("\n");

const result = { reg01: {}, reg02: {}, reg03: {}, reg03codes: {} };
for (const [id, body] of cases.reg01) result.reg01[id] = await run("c", wrapC(body));
for (const [id, body] of cases.reg02) result.reg02[id] = await run("c", wrapC(body));
{
  const d = getDefinition("csharp");
  for (const t of d.templates) {
    result.reg03codes[t.id] = t.code;
    result.reg03[t.id] = await run("csharp", t.code);
  }
}
writeFileSync(outPath, JSON.stringify(result, null, 1));
console.log("wrote", outPath, "reg01", Object.keys(result.reg01).length, "reg02", Object.keys(result.reg02).length, "reg03", Object.keys(result.reg03).length);
