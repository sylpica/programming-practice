import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("vba");
const run = async (code) => {
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const p = r.paths?.[0];
  return { err: (r.error ?? p?.error)?.message ?? null, outs: (p?.outputs ?? []).map((o) => o.text) };
};
console.log("Option Explicit at module head:", JSON.stringify(await run("Option Explicit\nSub Main()\nDim n As Long\nn = 1\nDebug.Print n\nEnd Sub")));
console.log("Option Base 1 at module head:", JSON.stringify(await run("Option Base 1\nSub Main()\nDim a(3) As Long\nDebug.Print LBound(a)\nEnd Sub")));
