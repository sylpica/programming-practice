// 高度モード B4：R 高度リファレンス項目の集約（高度差分）。
// 項目形式は docs/audit/ADV-B4-SPEC.md 第2章。
// referenceOverrides は基礎項目のステータス上書き（同名はそちらが優先）。
import { referenceAdvanced as part1 } from "./reference-advanced-part1.js";
import { referenceAdvanced as part2 } from "./reference-advanced-part2.js";
// B4S（stats／utils 補完）：part3=分布、part4=記述、part5=検定、part6=モデル、
// part7=時系列、part8=多変量他、part9=utilsデータ、part10=utils一般。
import { referenceAdvanced as part3 } from "./reference-advanced-part3.js";
import { referenceAdvanced as part4 } from "./reference-advanced-part4.js";
import { referenceAdvanced as part5 } from "./reference-advanced-part5.js";
import { referenceAdvanced as part6 } from "./reference-advanced-part6.js";
import { referenceAdvanced as part7 } from "./reference-advanced-part7.js";
import { referenceAdvanced as part8 } from "./reference-advanced-part8.js";
import { referenceAdvanced as part9 } from "./reference-advanced-part9.js";
import { referenceAdvanced as part10 } from "./reference-advanced-part10.js";
import { referenceOverrides } from "./reference-advanced-overrides.js";

export const referenceAdvanced = [
  ...part1,
  ...part2,
  ...part3,
  ...part4,
  ...part5,
  ...part6,
  ...part7,
  ...part8,
  ...part9,
  ...part10,
];
export { referenceOverrides };
