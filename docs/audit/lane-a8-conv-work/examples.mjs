// 対応288件の例の全件再実走（前回方式：tier1 素実行／tier2 B8 文脈補完）
// 合成カタログは実経路 loadAdvanced → mergeCatalog。高度差分由来 status=supported を全件抽出。
// 失敗集合は B8 生記録 audit3-result.txt の9件と照合する。
import fs from "node:fs";
import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus, countByStatus } from "../../../js/core/catalog.js";

const HDR = `#include <iostream>\n#include <string>\n#include <vector>\n#include <array>\n#include <utility>\n#include <cmath>\n#include <cstdlib>\n#include <cctype>\n#include <cstring>\n#include <numeric>\n#include <algorithm>\n#include <bit>\n#include <numbers>\nint main() {\n`;
const CTX = {
  v: `std::vector<int> v = {3, 1, 2};`,
  a: `std::array<int, 3> a = {1, 2, 3};`,
  s: `std::string s = "abc";`,
  s1: `std::string s1 = "a";`,
  x: `int x = 5;`,
  word: `char word[] = "Tea2026";`,
  text: `char text[] = "green tea";`,
};
function declares(example, name) {
  return new RegExp(`(^|[;{]\\s*)(std::\\w+(<[^>]*>)?|int| double|char|unsigned\\s+\\w+|auto|bool|long|float)\\s+${name}\\s*[=;\\[]`.replace(" double", "double")).test(example)
      || new RegExp(`\\b${name}\\s*=`).test(example) && new RegExp(`(int|double|char|auto|bool|std::)`).test(example.split(name)[0].slice(-40));
}
const def = getDefinition("cpp");
const errors = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
  .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
async function tryRun(code) {
  try { const r = await def.simulate(code, structuredClone(def.model.defaults)); return errors(r); }
  catch (e) { return ["THROW " + e.message]; }
}

const adv = await loadAdvanced(def);
console.log("loader loaded:", adv.loaded?.length, "missing:", adv.missing?.length, "failed:", adv.failed?.length);
const merged = mergeCatalog(def, adv);
console.log("merged counts:", JSON.stringify(countByStatus(merged.reference)), "problems:", (merged.problems || []).length);
const advNames = new Set((adv.referenceAdvanced || []).map((i) => i.name));
const sup = merged.reference.filter((i) => advNames.has(i.name) && itemStatus(i) === "supported");
console.log("advanced supported:", sup.length);
const newSupported = sup.filter((i) => {
  const prev = fs.readFileSync(process.env.HOME + "/workspace/programming-practice-audit/work/lane-a8-exec/docs/audit/lane-a8-work/ledger-cpp-examples.tsv", "utf8");
  return !prev.includes(i.name + "\t");
}).map((i) => i.name);
console.log("not in previous 274 ledger:", JSON.stringify(newSupported));

let tier1 = 0, tier2 = 0; const fails = [];
for (const item of sup) {
  const ex = item.example || "";
  const e1 = await tryRun(HDR + ex + `\n return 0;\n}`);
  if (e1.length === 0) { tier1++; continue; }
  const pre = Object.entries(CTX).filter(([n]) => !declares(ex, n)).map(([, d]) => d).join("\n");
  const e2 = await tryRun(HDR + pre + "\n" + ex + `\n return 0;\n}`);
  if (e2.length === 0) { tier2++; continue; }
  fails.push({ name: item.name, error: e2[0], example: ex.replace(/\n/g, " ⏎ ") });
  console.log("FAIL", item.name, "->", e2[0]);
}
console.log(`RESULT supported ${sup.length}: tier1 ${tier1}, tier2 ${tier2}, fail ${fails.length}`);
const b8 = fs.readFileSync(process.env.HOME + "/workspace/programming-practice-audit/work/b8-data/audit3-result.txt", "utf8").trim().split("\n").map((l) => l.split("\t")[0]);
console.log("B8 9件:", JSON.stringify(b8));
console.log("今回失敗のうち B8 に無いもの（新規失敗候補）:", JSON.stringify(fails.map((f) => f.name).filter((n) => !b8.includes(n))));
console.log("B8 9件のうち今回失敗に無いもの:", JSON.stringify(b8.filter((n) => !fails.map((f) => f.name).includes(n))));
const tsv = ["name\tresult\terror\texample", ...sup.map((i) => i.name).map((n) => {
  const f = fails.find((x) => x.name === n);
  return f ? `${n}\tfail\t${f.error}\t${f.example}` : `${n}\tok\t\t`;
})].join("\n");
fs.writeFileSync(new URL("./ledger-conv-cpp-examples.tsv", import.meta.url), tsv);
fs.writeFileSync(new URL("./examples-result.json", import.meta.url), JSON.stringify({ total: sup.length, tier1, tier2, fails, newSupported }, null, 1));
