/* 高度モード差分（ブロックB3）: PowerShell 高度エンジンフック。
 * 契約（advanced-interface.md 第5章 (e)）の予約フック。本フックが高度
 * レジストリ（engine-advanced.js）の有効化の唯一の入口である。
 * 機構との差異（報告書に記録）: 契約 R-3 のとおり applyAdvancedEngine の
 * merged の正確な形は B1 初例で確定する。それまでの間、B3 のエンジン拡張は
 * engine.js／parser.js からレジストリと演算子表を参照し、本フックはその
 * 有効化スイッチとして働く。レジストリ自体は純データであり、フックの形が
 * 確定した後に意味論を変えず移設できる。
 */
import { activateAdvancedCmdlets } from "./engine-advanced.js";

export function applyAdvancedEngine(definition, merged) {
  activateAdvancedCmdlets();
}
