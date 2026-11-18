import { getDefinition } from "../../../js/types/registry.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
const d = getDefinition("cpp");
const baseUrl = new URL("../../../js/types/cpp/", import.meta.url).href;
const adv = await loadAdvanced({ id: "cpp" }, { baseUrl });
const merged = mergeCatalog(d, adv);
const domains = [
  [/^std::acos[fl]?$/, (x) => x >= -1 && x <= 1, "acos [-1,1]"],
  [/^std::asin[fl]?$/, (x) => x >= -1 && x <= 1, "asin [-1,1]"],
  [/^std::acosh[fl]?$/, (x) => x >= 1, "acosh >=1"],
  [/^std::atanh[fl]?$/, (x) => Math.abs(x) < 1, "atanh |x|<1"],
  [/^std::log[fl]?$/, (x) => x > 0, "log >0"],
  [/^std::log2[fl]?$/, (x) => x > 0, "log2 >0"],
  [/^std::log10[fl]?$/, (x) => x > 0, "log10 >0"],
  [/^std::log1p[fl]?$/, (x) => x > -1, "log1p >-1"],
  [/^std::sqrt[fl]?$/, (x) => x >= 0, "sqrt >=0"],
  [/^std::exp[fl]?$/, () => true, "exp"],
  [/^std::pow[fl]?$/, () => true, "pow"],
];
let hits = 0;
for (const it of merged.reference) {
  if (!it.example) continue;
  for (const [re, ok, label] of domains) {
    if (!re.test(it.name)) continue;
    const m = it.example.match(new RegExp(it.name.replace("std::", "std::") + "\\((-?[0-9]*\\.?[0-9]+)\\)"));
    if (!m) continue;
    const x = parseFloat(m[1]);
    if (!ok(x)) {
      hits++;
      console.log(`VIOLATION ${it.name} [${itemStatus(it)}] example=${it.example} (${label}, x=${x})`);
    }
  }
}
console.log("total violations:", hits);
