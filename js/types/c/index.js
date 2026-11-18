import { additionalTemplates } from "./additional-templates.js";
import { createCFamily } from "../../core/c-family.js";
export const definition = createCFamily({
  id: "c",
  name: "C",
  extensions: [".c", ".h", ".txt"],
  language: "c",
});

// 高度モード（ブロックB6）：C 標準ライブラリの意味論拡張は、契約
// （advanced-interface.md 第5章(e)）に従い advanced-engine.js の
// applyAdvancedEngine フック経由で導入する。本ファイルへ高度差分を
// 静的に取り込まない。高度差分カタログ（ref-*-advanced.js 等）は
// advanced-manifest.js の宣言に従いモード機構のローダーが合成する。

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
