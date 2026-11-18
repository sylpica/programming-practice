/* 高度モード B7 G4：bisect モジュール（6件）。
 * CPython の二分探索をそのまま移植する。key は 3.10+ の bisect 側のみ。
 * 比較は ctx.compare へ委譲。insort はリストの insert を直接呼ぶ
 * （タプルでは CPython どおり AttributeError になる）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { NONE, I, isList, isNone, isUnk, arity, intVal } from './impl-advanced-g4-common.js';

function rangeArgs(ctx, args, kwargs, fname, withKey) {
  const a = args[0];
  let arr = null;
  if (isList(a)) arr = a.__list;
  else {
    const it = ctx.iterable(a);
    if (it === null || it === undefined || (it && it.__unk)) return null;
    arr = it;
  }
  const x = args[1];
  let lo = 0, hi = arr.length;
  if (args.length >= 3 && args[2] !== undefined) { lo = intVal(ctx, args[2]); }
  if (args.length >= 4 && args[3] !== undefined) { hi = intVal(ctx, args[3]); }
  if (kwargs) {
    if ('lo' in kwargs) lo = intVal(ctx, kwargs.lo);
    if ('hi' in kwargs && !isNone(kwargs.hi)) hi = intVal(ctx, kwargs.hi);
  }
  if (lo === null || hi === null) ctx.err('TypeError', fname + '() の範囲には整数を使ってください', '');
  if (lo < 0) ctx.err('ValueError', 'lo must be non-negative', '');
  if (hi > arr.length) hi = arr.length;
  let keyFn = null;
  if (withKey && kwargs && 'key' in kwargs && !isNone(kwargs.key)) keyFn = kwargs.key;
  return { arr, x, lo, hi, keyFn };
}
function bisectLeft(ctx, args, kwargs, fname) {
  const r = rangeArgs(ctx, args, kwargs, fname, true);
  if (!r) return ctx.unk('探索結果');
  let { lo, hi } = r;
  const keyOf = (v) => (r.keyFn ? ctx.call(r.keyFn, [v]) : v);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const c = ctx.compare('<', keyOf(r.arr[mid]), r.x);
    if (isUnk(c)) return ctx.unk('探索結果');
    if (c === true || (c && c.__bool && c.v)) lo = mid + 1; else hi = mid;
  }
  return I(lo);
}
function bisectRight(ctx, args, kwargs, fname) {
  const r = rangeArgs(ctx, args, kwargs, fname, true);
  if (!r) return ctx.unk('探索結果');
  let { lo, hi } = r;
  const keyOf = (v) => (r.keyFn ? ctx.call(r.keyFn, [v]) : v);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const c = ctx.compare('<', r.x, keyOf(r.arr[mid]));
    if (isUnk(c)) return ctx.unk('探索結果');
    if (c === true || (c && c.__bool && c.v)) hi = mid; else lo = mid + 1;
  }
  return I(lo);
}
function insort(ctx, args, kwargs, fname, right) {
  const r = rangeArgs(ctx, args, kwargs, fname, true);
  if (!r) return ctx.unk('insort の結果');
  let { lo, hi } = r;
  const keyOf = (v) => (r.keyFn ? ctx.call(r.keyFn, [v]) : v);
  const keyX = r.keyFn ? ctx.call(r.keyFn, [r.x]) : r.x;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const c = right ? ctx.compare('<', keyX, keyOf(r.arr[mid])) : ctx.compare('<', keyOf(r.arr[mid]), keyX);
    if (isUnk(c)) return ctx.unk('insort の結果');
    if (c === true || (c && c.__bool && c.v)) { if (right) hi = mid; else lo = mid + 1; } else { if (right) lo = mid + 1; else hi = mid; }
  }
  const target = args[0];
  if (!isList(target)) ctx.err('AttributeError', "'" + ctx.typeName(target) + "' object has no attribute 'insert'", 'insort はリストに対してだけ使えます');
  target.__list.splice(lo, 0, r.x);
  return NONE;
}

registerStdlibModule('bisect', {
  functions: {
    bisect: (ctx, args, kwargs) => { arity(ctx, args, 2, 4, 'bisect'); return bisectRight(ctx, args, kwargs, 'bisect'); },
    bisect_left: (ctx, args, kwargs) => { arity(ctx, args, 2, 4, 'bisect_left'); return bisectLeft(ctx, args, kwargs, 'bisect_left'); },
    bisect_right: (ctx, args, kwargs) => { arity(ctx, args, 2, 4, 'bisect_right'); return bisectRight(ctx, args, kwargs, 'bisect_right'); },
    insort: (ctx, args, kwargs) => { arity(ctx, args, 2, 4, 'insort'); return insort(ctx, args, kwargs, 'insort', true); },
    insort_left: (ctx, args, kwargs) => { arity(ctx, args, 2, 4, 'insort_left'); return insort(ctx, args, kwargs, 'insort_left', false); },
    insort_right: (ctx, args, kwargs) => { arity(ctx, args, 2, 4, 'insort_right'); return insort(ctx, args, kwargs, 'insort_right', true); },
  },
});
