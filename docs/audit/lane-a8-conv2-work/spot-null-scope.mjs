// 収束第2回 A8班：欠陥2（std::NULL 名指し停止）の波及範囲スポットチェック
import { getDefinition } from "../../../js/types/registry.js";

const HDR = `#include <iostream>\n#include <string>\n#include <vector>\n#include <cstddef>\nint main() {\n`;
const wrap = (b) => HDR + b + `\n return 0;\n}`;
async function runCpp(body) {
  const d = getDefinition("cpp");
  const r = await d.simulate(wrap(body), structuredClone(d.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
  const outs = (r.paths || []).flatMap((p) => (p.outputs || []).map((o) => o.text));
  return { errs, outs };
}
async function runC(code) {
  const d = getDefinition("c");
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
  const outs = (r.paths || []).flatMap((p) => (p.outputs || []).map((o) => o.text));
  return { errs, outs };
}
console.log("cpp std::NULL      :", JSON.stringify(await runCpp(`std::cout << std::NULL;`)));
console.log("cpp nullptr assign :", JSON.stringify(await runCpp(`int* p = nullptr; std::cout << (p == nullptr);`)));
console.log("cpp NULL plain     :", JSON.stringify(await runCpp(`std::cout << NULL;`)));
console.log("cpp NULL compare   :", JSON.stringify(await runCpp(`int* p = NULL; std::cout << (p == NULL);`)));
console.log("c   NULL printf    :", JSON.stringify(await runC(`#include <stdio.h>\n#include <stddef.h>\nint main() { printf("%d", NULL == 0); return 0; }`)));
console.log("c   nullptr word   :", JSON.stringify(await runC(`#include <stdio.h>\nint main() { printf("ok"); return 0; }`)));
