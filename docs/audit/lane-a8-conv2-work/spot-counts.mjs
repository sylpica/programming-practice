import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, countByStatus } from "../../../js/core/catalog.js";

for (const id of ["cpp", "cloudformation"]) {
  const d = getDefinition(id);
  const baseUrl = new URL(`../../../js/types/${id === "cpp" ? "cpp" : "cloudformation"}/`, import.meta.url).href;
  const adv = await loadAdvanced(d, { baseUrl });
  const merged = mergeCatalog(d, adv);
  const advRef = adv && adv.referenceAdvanced ? adv.referenceAdvanced : null;
  console.log(id, "advanced:", advRef ? advRef.length : null, countByStatus(advRef || []), "| merged:", merged.reference.length, countByStatus(merged.reference), "| problems:", JSON.stringify(merged.problems));
  if (id === "cloudformation") {
    const disc = (advRef || []).find((r) => r.name === "AWS::ApplicationSignals::Discovery");
    console.log("CFN Discovery caution:", JSON.stringify(disc && disc.caution), "| desc tail:", disc ? disc.description.slice(-40) : null);
  }
}
