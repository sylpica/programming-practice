// AutoHotkey v2 高度モード（ブロックB2）エンジン拡張フック。
// 契約（advanced-interface.md 5.2(e)）：エンジン拡張は本フック経由でのみ
// 行い、エンジン本体（index.js）にモード分岐を持ち込まない。機構の
// advanced-loader が高度モードで本ファイルを読み込み、下記の
// applyAdvancedEngine(definition, merged) を呼ぶことで高度意味論が
// 有効化される。未適用（簡易モード相当）では基礎挙動と完全一致する。
import { enableAdvanced } from "./semantics-advanced.js";

export function applyAdvancedEngine(definition, merged) {
  // definition / merged 引数は現時点では未使用である（将来の機構接続用）。
  // merged の正確な形は契約の未決 R-3 のため未確定であり、B1 初例の確定
  // 後に機構側接続の調整が要る。現段階の有効化は、semantics-advanced.js
  // 側の有効化 API（enableAdvanced）の呼び出しのみで完結する。
  void definition;
  void merged;
  enableAdvanced();
}
