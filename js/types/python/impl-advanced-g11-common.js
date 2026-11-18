/* 高度モード B7 G11（アーカイブ・圧縮・永続化系）共通ヘルパ。
 *
 * bytes 表現の調査結果（報告書 b7-g11-report.md に詳述）：
 * engine.js の値モデルに bytes 型は存在しない。bytes リテラルは常に
 * UNK('バイト列（bytes）') になり、組み込み bytes()/bytearray() と
 * str.encode() は「対応外」で停止する。したがって利用者コードが書いた
 * bytes を入力・出力とする意味論は実値で確定できず、本群では
 * 未検証（diag＋UNK の正直な停止）または未対応（ctx.err('未対応') で停止）
 * に倒す。G7 のような群内ネイティブ bytes 型は、群をまたぐ値の互換性が
 * 無く基盤側の統一が要るため本群では作らない（基盤要請として報告）。 */
import { PyAPI } from './engine.js';

export const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, RANGE, ITER, UNK } = PyAPI;
export const I = (v) => NUM(v, false);
export const F = (v) => NUM(v, true);

export function noKwargs(ctx, kwargs, label) {
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', label + ' にキーワード引数「' + ks[0] + '」はありません', 'キーワード引数なしで呼び出してください');
}
export function arity(ctx, args, min, max, label) {
  if (args.length < min || args.length > max) {
    ctx.err('TypeError', label + ' の引数の数が合いません（' + args.length + '個渡されました）', 'リファレンスで使い方を確認してください');
  }
}

/* 未対応の関数：理由を述べてその場で停止する（g3／g6 の先例パターン）。 */
export const unsupportedFn = (label, reason) => (ctx) =>
  ctx.err('未対応', label + ' は' + reason + 'ため、本アプリの高度モードでは未対応です', '');

/* 未検証の関数：diag で未検証と注記し、未確定値を返す（正直な停止。A-10）。 */
export const unverifiedFn = (label, reason) => (ctx) => {
  ctx.diag('未検証：' + label + ' は' + reason + 'ため、この説明では値を確定できません');
  return ctx.unk(label + '（未検証）');
};

/* 未対応クラス：生成しようとすると理由を述べて停止する。 */
export const unsupportedClass = (typeName, label, reason) => ({
  typeName,
  construct: (ctx) => ctx.err('未対応', label + ' は' + reason + 'ため、本アプリの高度モードでは未対応です', ''),
});

/* 未検証クラス：生成は未確定値として正直に停止する。 */
export const unverifiedClass = (typeName, label, reason) => ({
  typeName,
  construct: (ctx) => {
    ctx.diag('未検証：' + label + ' は' + reason + 'ため、この説明では値を確定できません');
    return ctx.unk(label + '（未検証）');
  },
});

/* 例外クラスの定義（対応付け）。construct は書かない（エンジンが例外値を作る）。 */
export const excDef = (typeName, qualname, parents) => ({
  typeName, exc: qualname, excParents: parents,
});

/* bytes を表す未確定値（定数・属性の束ね値用）。 */
export const bytesUnk = () => UNK('バイト列（bytes）');
