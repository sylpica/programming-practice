import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("r");
const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const outs = async (code) => {
  const r = await run(code);
  const p = r.paths?.[0];
  return { err: (r.error ?? p?.error)?.message ?? null, outs: (p?.outputs ?? []).map((o) => o.text) };
};
console.log("case1 NaN-in-NA-equiv:", JSON.stringify(await outs("cat(NaN %in% as.numeric(NA))"))); // 実R FALSE
console.log("case2 NA-in-NaN:", JSON.stringify(await outs("cat(NA %in% NaN)"))); // FALSE
console.log("case3 NaN-in-NaN:", JSON.stringify(await outs("cat(NaN %in% NaN)"))); // TRUE
console.log("case4 NA-in-NA:", JSON.stringify(await outs("cat(NA %in% NA)"))); // TRUE
