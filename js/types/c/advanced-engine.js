// 高度モード（ブロックB6）：C の高度エンジンフック（契約第5章(e)）。
// C 標準ライブラリの意味論拡張（関数テーブル）を、エンジン本体へ
// モード分岐を持ち込まずに導入する唯一の経路。導入後は単一エンジンの
// 一部となり、実行結果はモードで変わらない（契約第1章）。
// merged は契約上の引数だが現時点では未使用（R-3：具体形は未決）。
import { createCLibrary } from "./library-advanced.js";

export function applyAdvancedEngine(definition, merged) {
  if (definition && typeof definition.installAdvancedLibrary === "function") {
    definition.installAdvancedLibrary(createCLibrary);
    return true;
  }
  return false;
}
