/* 高度モード差分（ブロックB3）: ImageJ 組み込み関数の高度レジストリ。
 *
 * 基礎エンジン（engine.js の simBuiltin）は、基礎スイッチで扱わない関数名を
 * ここへ委譲する。ただし委譲が働くのは activateAdvancedBuiltins() が呼ばれた
 * 後だけ（高度モードの合成時）。簡易モードでは advancedEntry() が常に
 * undefined を返すため、基礎の挙動（未対応として停止）は一切変わらない。
 *
 * レジストリの値（名前は ImageJ の公式名・大文字小文字は公式表記）:
 *   - 関数 (S, e, args, refs, H) => 値        … 対応（実装あり）
 *   - { unsupported: "理由" }                  … 未対応として名指し停止
 *   - { unverified: "理由" }                   … 未検証として名指し停止
 * H は基礎の { step, warn, img, needImg, num, truthy } に加えて
 * { err(msg, cause), unk, isUnk(v), fmt(v), numArg(v), int(v),
 *   putPixel(img,x,y,v), roiBounds(), writeRef(name, v),
 *   readRef(name)（REF 引数の変数名で現値を読む。未定義なら undefined） } を含む。
 * ハンドラは引数の個数・型を基礎の文面慣行で検証すること
 * （例: err(name + " の引数の数が違います", "…")）。
 *
 * 本体は engine-advanced-pure.js（純粋関数）と engine-advanced-state.js
 * （状態関数）に分割され、ここで統合される。
 */
import { PURE } from "./engine-advanced-pure.js";
import { STATE } from "./engine-advanced-state.js";

const REGISTRY = Object.assign({}, PURE, STATE);
let active = false;

export function activateAdvancedBuiltins() {
  active = true;
}
export function advancedActive() {
  return active;
}
export function advancedEntry(name) {
  if (!active) return undefined;
  return Object.prototype.hasOwnProperty.call(REGISTRY, name)
    ? REGISTRY[name]
    : undefined;
}
export function advancedNames() {
  return Object.keys(REGISTRY);
}
/* FIX-IJB (D): 書き戻し（REF）接続マップ。基礎 engine.js の evCall が
 * 高度有効時のみ参照する（簡易モードでは REF 判定に一切影響しない）。
 * ref99: 先頭から全引数を変数名として渡す（基礎 REF_FNS の 99 と同じ規約）。
 * skip1: 第2引数以降を変数名として渡す（基礎 REF_FNS_SKIP の 1 と同じ規約）。 */
const ADV_REF99 = {
  "Plot.getLimits": 99, "Roi.getFloatBounds": 99, "Roi.getContainedPoints": 99,
  "Roi.getFeretPoints": 99, "Roi.getSplineAnchors": 99,
  "Stack.getUnits": 99, "Stack.getDisplayMode": 99, "Stack.getActiveChannels": 99,
  "Stack.getOrthoViews": 99, "Stack.getOrthoViewsIDs": 99,
  "toScaled": 99, "toUnscaled": 99, "Table.showArrays": 99
};
const ADV_REF_SKIP1 = { "Fit.getEquation": 1, "Overlay.getBounds": 1 };
export function advancedRefMaps() {
  return { ref99: ADV_REF99, skip1: ADV_REF_SKIP1 };
}
