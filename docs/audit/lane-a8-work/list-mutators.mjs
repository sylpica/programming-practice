import { getDefinition } from "../../../js/types/registry.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
const d = getDefinition("cpp");
const baseUrl = new URL("../../../js/types/cpp/", import.meta.url).href;
const adv = await loadAdvanced({ id: "cpp" }, { baseUrl });
const merged = mergeCatalog(d, adv);
const mut = /(assign|clear|insert|emplace|erase|push_back|emplace_back|pop_back|resize|reserve|shrink_to_fit|swap|append|replace|operator\+=|operator=)/;
for (const it of merged.reference) {
  if (!/^std::(vector|string)::/.test(it.name)) continue;
  if (itemStatus(it) !== "supported") continue;
  const tail = it.name.split("::").pop();
  if (mut.test(tail)) console.log(`${it.name} | caution=${JSON.stringify(it.caution || "")}`);
}
