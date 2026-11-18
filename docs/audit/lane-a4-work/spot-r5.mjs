import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("r");
const outs = async (code) => {
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const p = r.paths?.[0];
  return { err: (r.error ?? p?.error)?.message ?? null, outs: (p?.outputs ?? []).map((o) => o.text), z: p?.vars?.z };
};
for (const [label, code] of [
  ["order() is.null", "z <- order(); cat(is.null(z))"],
  ["sort.list(NULL)", "z <- sort.list(NULL)"],
  ["order(1:3, NULL)", "z <- order(1:3, NULL)"],
  ["order(NULL, 1:3)", "z <- order(NULL, 1:3)"],
]) console.log(label + ":", JSON.stringify(await outs(code)));
