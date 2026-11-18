import { additionalTemplates } from "./additional-templates.js";
import { createCFamily } from "../../core/c-family.js";
import { scanScript } from "../../core/script.js";
export const definition = createCFamily({
  id: "csharp",
  name: "C#",
  extensions: [".cs", ".txt"],
  language: "csharp",
});

// A5班監査: ファクトリ既定の scan は基礎カタログに閉じており、高度
// モードでも高度項目が実行前チップに現れなかった。機構が差し込む
// 有効カタログ（definition.__catalogReference。cmd／Python と同じ
// 方式）があればそちらで走査する。未設定の環境では従来動作のまま。
const factoryScan = definition.scan;
definition.scan = (code) =>
  definition.__catalogReference
    ? scanScript(code, definition.__catalogReference, "csharp")
    : factoryScan(code);

definition.templates.push(...additionalTemplates(definition.model.defaults));

// Complete console programs can be copied into an actual C# project.
function consoleProgram(code) {
  const declaration = code.match(/^class\s+[^\s{]+\s*\{[^{}]*\}\s*/);
  if (declaration) code = code.slice(declaration[0].length);
  return "using System;\n" + (declaration ? declaration[0] + "\n" : "") + "class Program {\n    static void Main() {\n" + code + "\n    }\n}";
}
for (const t of definition.templates) t.code = consoleProgram(t.code);
for (const r of definition.reference) r.example = consoleProgram(r.example);

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
