import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("r");
const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const outs = async (code) => {
  const r = await run(code);
  const p = r.paths?.[0];
  return { err: (r.error ?? p?.error)?.message ?? null, outs: (p?.outputs ?? []).map((o) => o.text), z: p?.vars?.z };
};
console.log("is.null(sort(NULL)):", JSON.stringify(await outs("z <- sort(NULL); cat(is.null(z))"))); // 実R TRUE
console.log("length(sort(NULL)):", JSON.stringify(await outs("z <- sort(NULL); cat(length(z))"))); // 0
console.log("print(sort(NULL)):", JSON.stringify(await outs("print(sort(NULL))")));
console.log("is.null(rev(numeric(0))):", JSON.stringify(await outs("z <- rev(numeric(0)); cat(is.null(z))"))); // 実R FALSE
console.log("is.null(NULL):", JSON.stringify(await outs("z <- NULL; cat(is.null(z))"))); // TRUE
