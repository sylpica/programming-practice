import { pathToFileURL } from "node:url";
const root = process.argv[2];
const imp = (p) => import(pathToFileURL(root + p).href);
const { getDefinition } = await imp("/js/types/registry.js");
const d = getDefinition("csharp");
const forms = {
  "zero-div-neg": "int x = 0 / -5;\nConsole.WriteLine(x);",
  "neg-zero-double": "double y = 0.0 / -5;\nConsole.WriteLine(y);",
  "intdiv-neg": "int z = -7 / 2;\nConsole.WriteLine(z);",
};
for (const [k, body] of Object.entries(forms)) {
  const code = "using System;\nclass P { static void Main() {\n" + body + "\n} }";
  try { const r = await d.simulate(code, structuredClone(d.model.defaults)); console.log(k, JSON.stringify(r.paths?.[0]?.outputs ?? r.error ?? null), "err", JSON.stringify(r.error ?? r.paths?.[0]?.error ?? null)); }
  catch(e){ console.log(k, "THREW", String(e).slice(0,200)); }
}
// also try template-style Main-less form used by templates
console.log("template sample code:\n", d.templates[0].code);
