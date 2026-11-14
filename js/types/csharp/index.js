import { additionalTemplates } from "./additional-templates.js";
import { createCFamily } from "../../core/c-family.js";
export const definition = createCFamily({
  id: "csharp",
  name: "C#",
  extensions: [".cs", ".txt"],
  language: "csharp",
});

definition.templates.push(...additionalTemplates(definition.model.defaults));
