import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("cpp");
const run = async (body) => {
  const code = `#include <iostream>\n#include <string>\n#include <vector>\n#include <cmath>\nint main() {\n${body}\n return 0;\n}`;
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
  const outs = (r.paths || []).map((p) => p.outputs.map((o) => o.text).join(""));
  console.log(JSON.stringify(body.slice(0, 80)), "=> errors:", JSON.stringify(errs), "outputs:", JSON.stringify(outs));
};
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin(); std::advance(it, 1.5);`);
await run(`std::vector<int> v = {10, 20, 30}; auto it = v.begin() + 1.5; std::cout << *it;`);
await run(`double r = std::acosh(1.5); std::cout << r;`);
await run(`double r = std::acosh(0.5); std::cout << r;`);
