import { additionalTemplates } from "./additional-templates.js";
import { createCFamily } from "../../core/c-family.js";
export const definition = createCFamily({
  id: "c",
  name: "C",
  extensions: [".c", ".h", ".txt"],
  language: "c",
});

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
