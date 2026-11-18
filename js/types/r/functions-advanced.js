// 高度モード B4：R 追加組み込み関数の集約（高度差分）。
// r/index.js から import される。本ファイル群は r/index.js を import しない。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 名前一覧（advancedNames）は names-advanced.js の集約を使う。
import { advancedNames } from "./names-advanced.js";
import { builtins as mathBuiltins } from "./functions-advanced-math.js";
import { builtins as charBuiltins } from "./functions-advanced-char.js";
import { builtins as dataBuiltins } from "./functions-advanced-data.js";
import { builtins as mopupBuiltins } from "./functions-advanced-mopup.js";
// B4S（stats／utils 補完）：班別グループ。
import { builtins as statsdistBuiltins } from "./functions-advanced-statsdist.js";
import { builtins as statsdescBuiltins } from "./functions-advanced-statsdesc.js";
import { builtins as statstestBuiltins } from "./functions-advanced-statstest.js";
import { builtins as statsmodelBuiltins } from "./functions-advanced-statsmodel.js";
import { builtins as statstsBuiltins } from "./functions-advanced-statsts.js";
import { builtins as statsmiscBuiltins } from "./functions-advanced-statsmisc.js";
import { builtins as utilsdataBuiltins } from "./functions-advanced-utilsdata.js";
import { builtins as utilsmiscBuiltins } from "./functions-advanced-utilsmisc.js";

export const advancedBuiltins = new Map([
  ...mathBuiltins,
  ...charBuiltins,
  ...dataBuiltins,
  ...mopupBuiltins,
  ...statsdistBuiltins,
  ...statsdescBuiltins,
  ...statstestBuiltins,
  ...statsmodelBuiltins,
  ...statstsBuiltins,
  ...statsmiscBuiltins,
  ...utilsdataBuiltins,
  ...utilsmiscBuiltins,
]);

export { advancedNames };
