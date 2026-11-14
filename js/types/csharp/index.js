import { additionalTemplates } from "./additional-templates.js";
import { createCFamily } from "../../core/c-family.js";
export const definition = createCFamily({
  id: "csharp",
  name: "C#",
  extensions: [".cs", ".txt"],
  language: "csharp",
});

definition.templates.push(...additionalTemplates(definition.model.defaults));

// Complete console programs can be copied into an actual C# project.
function consoleProgram(code) {
  const declaration = code.match(/^class Counter \{ public int Value; \}\n?/);
  if (declaration) code = code.slice(declaration[0].length);
  return "using System;\n" + (declaration ? declaration[0] + "\n" : "") + "class Program {\n    static void Main() {\n" + code + "\n    }\n}";
}
for (const t of definition.templates) t.code = consoleProgram(t.code);
for (const r of definition.reference) r.example = consoleProgram(r.example);

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
