import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
const d = getDefinition("cpp");
const baseUrl = new URL("../../../js/types/cpp/", import.meta.url).href;
const adv = await loadAdvanced({ id: "cpp" }, { baseUrl });
const advNames = new Set(adv.referenceAdvanced.map((r) => r.name));
const missing = d.reference.map((r) => r.name).filter((n) => !advNames.has(n));
console.log("base names not in advanced:", JSON.stringify(missing));
console.log("loaded:", JSON.stringify(adv.loaded));
