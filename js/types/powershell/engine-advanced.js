/* 高度モード差分（ブロックB3）: PowerShell コマンドレット・自動変数の
 * 高度レジストリ。
 *
 * 基礎エンジン（engine.js）は、基礎の known 表にもユーザー定義関数にも無い
 * コマンド名をここへ委譲する。ただし委譲が働くのは
 * activateAdvancedCmdlets() が呼ばれた後だけ（高度モードの合成時）。
 * 簡易モードでは advancedCmdlet()/advancedAutovar() が常に undefined を
 * 返すため、基礎の挙動（未対応として停止）は一切変わらない。
 *
 * コマンドレット登録の形（キーは小文字の正式名）:
 *   { params: ["path", "recurse", ...],        // 受け付ける名前付き引数（小文字）
 *     run: (ctx) => [{ s, values }, ...] }      // 対応（実装あり）
 *   { params: [...], unsupported: "理由" }       // 未対応として名指し停止
 *   { params: [...], unverified: "理由" }        // 未検証として名指し停止
 * ctx = { c, s, api, input, hasInput, args, params, p, fail, text,
 *         enumerate, scalar, object, hash, isUnknown, unknown,
 *         fsEntry, listFiles, writeFile, makeDirectory, removeEntry,
 *         copyEntry, windowsPath, resolvedPath, inputValue }
 *   - args/params は評価済みの値（基礎の read 適用後）。
 *   - p(name, index, fallback) は基礎と同じ束縛ヘルパー。
 *   - 戻り値は基礎コマンドレットと同じ [{ s, values }] 形式。
 *   - 停止は fail("文面", c.line) を使う（基礎の文面慣行に従う）。
 *
 * 自動変数登録の形（キーは小文字名）:
 *   (s, H) => 値    H = { unknown, hash, object }
 *   未検証の変数は H.unknown("未検証：$名前 は…", "ps:adv:名前") を返す。
 *
 * 本体は engine-advanced-cmdlets.js と engine-advanced-vars.js に分割され、
 * ここで統合される。
 */
import { CMDLETS, ADVANCED_SWITCHES } from "./engine-advanced-cmdlets.js";
import { AUTOVARS } from "./engine-advanced-vars.js";

export { ADVANCED_SWITCHES };

let active = false;

export function activateAdvancedCmdlets() {
  active = true;
}
export function advancedActive() {
  return active;
}
export function advancedCmdlet(canonical) {
  if (!active) return undefined;
  const key = String(canonical).toLowerCase();
  return Object.prototype.hasOwnProperty.call(CMDLETS, key)
    ? CMDLETS[key]
    : undefined;
}
export function advancedAutovar(lower, s, H) {
  if (!active) return undefined;
  return Object.prototype.hasOwnProperty.call(AUTOVARS, lower)
    ? AUTOVARS[lower](s, H)
    : undefined;
}
export function advancedCmdletNames() {
  return Object.keys(CMDLETS);
}
export function advancedAutovarNames() {
  return Object.keys(AUTOVARS);
}
