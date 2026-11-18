/* 高度モード B7 G4 共通ヘルパー（コレクション・データ構造系）。
 * 各 impl-advanced-*.js から使う小さな道具集。登録の副作用はない。 */
import { PyAPI } from './engine.js';
import { nativeClassDef } from './stdlib-registry.js';

export const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, ITER, UNK, ELLIPSIS, NOTIMPLEMENTED } = PyAPI;
export const { isNum, isBool, isNone, isList, isTuple, isDict, isSet, isUnk, isFunc, dictGet, dictSet, dictKeyId } = PyAPI;
export const I = (v) => NUM(v, false);
export const F = (v) => NUM(v, true);

export function noKwargs(ctx, kwargs, fname) {
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', fname + '() にキーワード引数「' + ks[0] + '」はありません', 'キーワード引数なしで呼び出してください');
}
export function arity(ctx, args, min, max, fname) {
  if (args.length < min || args.length > max) ctx.err('TypeError', fname + '() の引数の数が合いません（' + args.length + '個渡されました）', 'リファレンスで使い方を確認してください');
}
export function intVal(ctx, v) {
  if (isBool(v)) return v.v ? 1 : 0;
  if (isNum(v)) return v.v;
  return null;
}
export function isIntVal(ctx, v) {
  return (isNum(v) && !v.f) || isBool(v);
}
/* 3値比較：-1/0/1。決まらなければ null（呼び出し側で未確定に倒す）。
 * 比較できない組は ctx.compare が TypeError で止める（CPython どおり）。 */
export function cmp3(ctx, a, b) {
  const lt = ctx.compare('<', a, b);
  if (isUnk(lt)) return null;
  if (lt === true || (isBool(lt) && lt.v)) return -1;
  const gt = ctx.compare('>', a, b);
  if (isUnk(gt)) return null;
  if (gt === true || (isBool(gt) && gt.v)) return 1;
  const e = ctx.eq(a, b);
  if (e === null) return null;
  return 0;
}
export function truthyB(ctx, v) {
  const t = ctx.truthy(v);
  return t;
}
/* 辞書の [k, v] ペア配列（挿入順） */
export function dictPairs(d) {
  const out = [];
  for (const e of d.__dict.values()) out.push([e.k, e.v]);
  return out;
}
export function dictFromPairs(pairs) {
  const d = DICT();
  for (const [k, v] of pairs) dictSet(d, k, v);
  return d;
}
/* キーの探索：ハッシュ ID が決まればそれで、決まらなければ等価走査 */
export function findKey(ctx, pairs, key) {
  const id = dictKeyId(key);
  for (let i = 0; i < pairs.length; i++) {
    const kid = dictKeyId(pairs[i][0]);
    if (id !== null && kid !== null) { if (id === kid) return i; continue; }
    if (ctx.eq(pairs[i][0], key) === true) return i;
  }
  return -1;
}
export function pairsGet(ctx, pairs, key) {
  const i = findKey(ctx, pairs, key);
  return i < 0 ? undefined : pairs[i][1];
}
export function pairsSet(ctx, pairs, key, value) {
  const i = findKey(ctx, pairs, key);
  if (i < 0) pairs.push([key, value]); else pairs[i][1] = value;
}
/* iterable をエンジン値の配列にする。できなければ TypeError で止める */
export function toArray(ctx, v, fname) {
  const items = ctx.iterable(v);
  if (items === null) {
    if (isUnk(v)) return null;
    ctx.err('TypeError', fname + ' の引数にはリストなどの「並び」を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  }
  return items;
}
/* 安定ソート（key 関数・reverse 対応）。キーが決まらなければ null */
export function sortedVals(ctx, items, keyFn, reverse) {
  const deco = items.map((v, i) => ({ v, i, k: keyFn ? ctx.call(keyFn, [v]) : v }));
  for (const d of deco) if (isUnk(d.k)) return null;
  deco.sort((a, b) => {
    const c = cmp3(ctx, a.k, b.k);
    if (c === null) return a.i - b.i;
    return (reverse ? -c : c) || (a.i - b.i);
  });
  return deco.map((d) => d.v);
}
export function isCallableVal(v) {
  if (!v || typeof v !== 'object') return false;
  if (isFunc(v) || v.__builtin || v.__method || v.__bound || v.__ncls || v.__class) return true;
  if (v.__native) { const d = nativeClassDef(v.__native); return !!(d && d.call); }
  return false;
}
/* ハッシュ文字列（タプル状の値用）。決まらなければ null */
export function tupleHash(vals) {
  const ids = vals.map((v) => dictKeyId(v));
  if (ids.some((x) => x === null)) return null;
  return 't:' + ids.map((s) => s.length + ':' + s).join(',');
}
/* 値の型表示名（エラーメッセージ用） */
export function tn(ctx, v) { return ctx.typeName(v); }
/* slice 疑似オブジェクト（{__slice, lo, hi, step}）を添字列に展開する */
export function sliceIndices(ctx, key, len) {
  const iv = (b, def) => {
    if (b === null || b === undefined || isNone(b)) return def;
    const n = intVal(ctx, b);
    if (n === null) ctx.err('TypeError', 'スライスの番号には整数か None を使ってください', '');
    return n;
  };
  let step = iv(key.step, 1);
  if (step === 0) ctx.err('ValueError', 'スライスの間隔（3つ目の数）を 0 にはできません', '');
  let lo, hi;
  if (step > 0) {
    lo = iv(key.lo, 0); hi = iv(key.hi, len);
    if (lo < 0) lo = Math.max(0, lo + len); if (lo > len) lo = len;
    if (hi < 0) hi = Math.max(0, hi + len); if (hi > len) hi = len;
  } else {
    lo = iv(key.lo, len - 1); hi = iv(key.hi, -1);
    if (lo < 0) lo = lo + len < 0 ? -1 : lo + len; if (lo >= len) lo = len - 1;
    if (hi < 0) hi = hi + len < -1 ? -1 : hi + len; if (hi >= len) hi = len - 1;
  }
  const idx = [];
  if (step > 0) for (let k = lo; k < hi; k += step) idx.push(k);
  else for (let k = lo; k > hi; k += step) idx.push(k);
  return idx;
}
export function indexNorm(ctx, v, len, fname) {
  const n = intVal(ctx, v);
  if (n === null) ctx.err('TypeError', fname + ' の番号には整数を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  let i = Math.trunc(n);
  if (i < 0) i += len;
  return i;
}
