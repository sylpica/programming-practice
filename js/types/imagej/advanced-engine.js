/* 高度モード差分（ブロックB3）: ImageJ 高度エンジンフック。
 * 契約（advanced-interface.md 第5章 (e)）の予約フック。本フックが高度
 * レジストリ（engine-advanced.js）の有効化の唯一の入口である。
 * 機構との差異（報告書に記録）: 契約 R-3 のとおり applyAdvancedEngine の
 * merged の正確な形は B1 初例で確定する。それまでの間、B3 のエンジン拡張は
 * engine.js のフォールスルーからレジストリを参照し、本フックはその有効化
 * スイッチとして働く。レジストリ自体は純データ（関数テーブル）であり、
 * フックの形が確定した後に意味論を変えず移設できる。
 */
import { activateAdvancedBuiltins } from "./engine-advanced.js";

export function applyAdvancedEngine(definition, merged) {
  activateAdvancedBuiltins();
}
