import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("cpp");
const run = async (body) => {
  const code = `#include <iostream>\n#include <string>\n#include <vector>\nint main() {\n${body}\n return 0;\n}`;
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
  const outs = (r.paths || []).map((p) => p.outputs.map((o) => o.text).join(""));
  console.log(JSON.stringify(body), "=> errors:", JSON.stringify(errs), "outputs:", JSON.stringify(outs));
};
await run(`enum class Color { Red, Green }; std::cout << (int)Color::Green;`);
await run(`enum Color { Red, Green }; std::cout << Green;`);
await run(`struct Point { int x; int y; }; Point p{1, 2}; std::cout << p.x;`);
await run(`namespace ns { int f() { return 1; } }`);
await run(`typedef std::string::size_type Pos;`);
await run(`using Pos = std::string::size_type;`);
await run(`std::cout << std::string::npos;`);
await run(`std::string s = "abc"; std::cout << (s.find("q") == std::string::npos);`);
await run(`const std::string::iterator it2 = s.begin();`);
await run(`std::vector<int> v = {1}; for (std::vector<int>::iterator it = v.begin(); it != v.end(); ++it) std::cout << *it;`);
