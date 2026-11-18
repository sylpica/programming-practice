import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("r");
const outs = async (code) => {
  const r = await d.simulate(code, structuredClone(d.model.defaults));
  const p = r.paths?.[0];
  return { err: (r.error ?? p?.error)?.message ?? null, outs: (p?.outputs ?? []).map((o) => o.text), z: p?.vars?.z };
};
for (const [label, code] of [
  ["rev(NULL) is.null", "z <- rev(NULL); cat(is.null(z))"],
  ["rev(NULL) z", "z <- rev(NULL)"],
  ["order(NULL)", "z <- order(NULL)"],
  ["rank(NULL) is.null/len", "z <- rank(NULL); cat(is.null(z), length(z))"],
  ["rank(NULL) z", "z <- rank(NULL)"],
  ["sort.int(NULL) is.null", "z <- sort.int(NULL); cat(is.null(z))"],
]) console.log(label + ":", JSON.stringify(await outs(code)));
