import { getDefinition } from "../../../js/types/registry.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";

const d = getDefinition("cpp");
const baseUrl = new URL("../../../js/types/cpp/", import.meta.url).href;
const adv = await loadAdvanced({ id: "cpp" }, { baseUrl });
const merged = mergeCatalog(d.reference, adv);
const names = new Set(merged.reference.map((r) => r.name));
const candidates = [
  "optional", "variant", "tuple", "span", "any", "expected", "function",
  "complex", "bitset", "valarray", "shared_ptr", "unique_ptr", "weak_ptr",
  "priority_queue", "multimap", "multiset", "unordered_multimap",
  "unordered_multiset", "forward_list", "basic_string", "initializer_list",
  "atomic", "lock_guard", "unique_lock", "scoped_lock", "shared_lock",
  "promise", "future", "packaged_task", "jthread", "barrier", "latch",
  "counting_semaphore", "binary_semaphore", "stop_source", "stop_token",
];
for (const c of candidates) {
  const full = "std::" + c;
  const it = merged.reference.find((r) => r.name === full);
  console.log(`${c}: ${it ? `EXISTS status=${itemStatus(it)} syntax=${(it.syntax || "").slice(0, 60)}` : "absent"}`);
}
