// ブロックB6 のテスト用ヘルパー。契約形式（advanced-interface.md）の
// 差分ファイル群から、各班テストが使う合成カタログビューを組み立てる。
// 機構側ローダー（loadAdvanced＋mergeCatalog）の統合後はそちらが正本で、
// 本ヘルパーはブロック内検証専用。
import { referenceAdvanced as cMath } from "../js/types/c/ref-math-advanced.js";
import { referenceAdvanced as cString } from "../js/types/c/ref-string-advanced.js";
import { referenceAdvanced as cStdlib } from "../js/types/c/ref-stdlib-advanced.js";
import { referenceAdvanced as cStdio } from "../js/types/c/ref-stdio-advanced.js";
import { referenceAdvanced as cWide } from "../js/types/c/ref-wide-advanced.js";
import { referenceAdvanced as cUnsup } from "../js/types/c/ref-unsupported-advanced.js";
import { templatesAdvanced as cTemplates } from "../js/types/c/templates-advanced.js";
import { glossaryAdvanced as cGlossary } from "../js/types/c/glossary-advanced.js";
import { referenceAdvanced as pyBuiltins, referenceOverrides as pyBuiltinsOv } from "../js/types/python/ref-builtins-advanced.js";
import { referenceAdvanced as pyTypes, referenceOverrides as pyTypesOv } from "../js/types/python/ref-types-advanced.js";
import { referenceAdvanced as pySpecial } from "../js/types/python/ref-special-advanced.js";
import { templatesAdvanced as pyTpl } from "../js/types/python/templates-advanced.js";
import { PY_ITEM_EXPECTED, PY_TEMPLATE_EXPECTED, PY_GLOSSARY_RAW } from "./fixtures-b6-python.mjs";

export const cAdvanced = {
  reference: [...cMath, ...cString, ...cStdlib, ...cStdio, ...cWide, ...cUnsup],
  templates: cTemplates,
  glossary: cGlossary,
};

// 班テストが使う旧形ビュー（id／expected／supported を復元）
const withLegacy = (r) => ({
  ...r,
  id: r.name,
  expected: PY_ITEM_EXPECTED[r.name],
  supported: r.status === "supported",
});
export const pyAdvancedReference = [...pyBuiltins, ...pyBuiltinsOv, ...pyTypes, ...pyTypesOv, ...pySpecial].map(withLegacy);
export const pyTypeItems = [...pyTypes, ...pyTypesOv].map(withLegacy);
export const pySpecialItems = pySpecial.map(withLegacy);
export const pyAdvancedTemplates = pyTpl.map((t) => ({ ...t, expected: PY_TEMPLATE_EXPECTED[t.id] }));
export const pyAdvancedGlossaryRaw = PY_GLOSSARY_RAW;
