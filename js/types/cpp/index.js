import { createCFamily } from "../../core/c-family.js";
export const definition = createCFamily({
  id: "cpp",
  name: "C++",
  extensions: [".cpp", ".cc", ".cxx", ".hpp", ".txt"],
  language: "cpp",
});
