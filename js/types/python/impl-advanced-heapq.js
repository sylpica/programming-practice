/* 高度モード B7 G4：heapq モジュール（13件）。
 * CPython の _siftup/_siftdown ロジックをエンジンの LIST 値に対して移植する。
 * 比較は ctx.compare へ委譲する。*_max 系は 3.14 で追加（ドキュメントで意味論を確認し
 * 通常版の鏡像として実装）。merge/nlargest/nsmallest のみ key を取る。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { NONE, LIST, ITER, isList, isNone, isUnk, arity, intVal, sortedVals } from './impl-advanced-g4-common.js';

function needList(ctx, v, fname) {
  if (!isList(v)) ctx.err('TypeError', fname + "() argument must be list, not " + ctx.typeName(v), fname + '() はリストに対して働きます');
  return v.__list;
}
function lt(ctx, a, b) {
  const r = ctx.compare('<', a, b);
  if (isUnk(r)) return null;
  return r === true || (r && r.__bool && r.v);
}
function siftdown(ctx, heap, startpos, pos) {
  const newitem = heap[pos];
  while (pos > startpos) {
    const parentpos = (pos - 1) >> 1;
    const parent = heap[parentpos];
    const c = lt(ctx, newitem, parent);
    if (c === null) return false;
    if (c) { heap[pos] = parent; pos = parentpos; } else break;
  }
  heap[pos] = newitem;
  return true;
}
function siftup(ctx, heap, pos) {
  const endpos = heap.length;
  const startpos = pos;
  const newitem = heap[pos];
  let childpos = 2 * pos + 1;
  while (childpos < endpos) {
    const rightpos = childpos + 1;
    if (rightpos < endpos) {
      const c = lt(ctx, heap[childpos], heap[rightpos]);
      if (c === null) return false;
      if (!c) childpos = rightpos;
    }
    heap[pos] = heap[childpos];
    pos = childpos;
    childpos = 2 * pos + 1;
  }
  heap[pos] = newitem;
  return siftdown(ctx, heap, startpos, pos);
}
function siftdownMax(ctx, heap, startpos, pos) {
  const newitem = heap[pos];
  while (pos > startpos) {
    const parentpos = (pos - 1) >> 1;
    const parent = heap[parentpos];
    const c = lt(ctx, parent, newitem);
    if (c === null) return false;
    if (c) { heap[pos] = parent; pos = parentpos; } else break;
  }
  heap[pos] = newitem;
  return true;
}
function siftupMax(ctx, heap, pos) {
  const endpos = heap.length;
  const startpos = pos;
  const newitem = heap[pos];
  let childpos = 2 * pos + 1;
  while (childpos < endpos) {
    const rightpos = childpos + 1;
    if (rightpos < endpos) {
      const c = lt(ctx, heap[rightpos], heap[childpos]);
      if (c === null) return false;
      if (!c) childpos = rightpos;
    }
    heap[pos] = heap[childpos];
    pos = childpos;
    childpos = 2 * pos + 1;
  }
  heap[pos] = newitem;
  return siftdownMax(ctx, heap, startpos, pos);
}
function heapifyArr(ctx, arr, max) {
  for (let i = (arr.length >> 1) - 1; i >= 0; i--) {
    const ok = max ? siftupMax(ctx, arr, i) : siftup(ctx, arr, i);
    if (!ok) return false;
  }
  return true;
}
function heapifyImpl(max) {
  return (ctx, args) => {
    arity(ctx, args, 1, 1, max ? 'heapify_max' : 'heapify');
    const arr = needList(ctx, args[0], max ? 'heapify_max' : 'heapify');
    if (!heapifyArr(ctx, arr, max)) return ctx.unk('ヒープ化の結果');
    return NONE;
  };
}
function pushImpl(max) {
  return (ctx, args) => {
    arity(ctx, args, 2, 2, max ? 'heappush_max' : 'heappush');
    const arr = needList(ctx, args[0], max ? 'heappush_max' : 'heappush');
    arr.push(args[1]);
    const ok = max ? siftdownMax(ctx, arr, 0, arr.length - 1) : siftdown(ctx, arr, 0, arr.length - 1);
    if (!ok) return ctx.unk('heappush の結果');
    return NONE;
  };
}
function popImpl(max) {
  return (ctx, args) => {
    arity(ctx, args, 1, 1, max ? 'heappop_max' : 'heappop');
    const arr = needList(ctx, args[0], max ? 'heappop_max' : 'heappop');
    const last = arr.pop();
    if (arr.length) {
      const ret = arr[0];
      arr[0] = last;
      const ok = max ? siftupMax(ctx, arr, 0) : siftup(ctx, arr, 0);
      if (!ok) return ctx.unk('heappop の結果');
      return ret;
    }
    if (last === undefined) ctx.err('IndexError', 'index out of range', '空のヒープからは取り出せません');
    return last;
  };
}
function pushpopImpl(max) {
  return (ctx, args) => {
    arity(ctx, args, 2, 2, max ? 'heappushpop_max' : 'heappushpop');
    const arr = needList(ctx, args[0], max ? 'heappushpop_max' : 'heappushpop');
    const item = args[1];
    if (arr.length) {
      const c = max ? lt(ctx, item, arr[0]) : lt(ctx, arr[0], item);
      if (c === null) return ctx.unk('heappushpop の結果');
      if (c) {
        const ret = arr[0];
        arr[0] = item;
        const ok = max ? siftupMax(ctx, arr, 0) : siftup(ctx, arr, 0);
        if (!ok) return ctx.unk('heappushpop の結果');
        return ret;
      }
    }
    return item;
  };
}
function replaceImpl(max) {
  return (ctx, args) => {
    arity(ctx, args, 2, 2, max ? 'heapreplace_max' : 'heapreplace');
    const arr = needList(ctx, args[0], max ? 'heapreplace_max' : 'heapreplace');
    if (!arr.length) ctx.err('IndexError', 'index out of range', '空のヒープでは置き換えできません');
    const ret = arr[0];
    arr[0] = args[1];
    const ok = max ? siftupMax(ctx, arr, 0) : siftup(ctx, arr, 0);
    if (!ok) return ctx.unk('heapreplace の結果');
    return ret;
  };
}
function nlargestImpl(largest) {
  return (ctx, args, kwargs) => {
    arity(ctx, args, 2, 2, largest ? 'nlargest' : 'nsmallest');
    const n = intVal(ctx, args[0]);
    if (n === null) ctx.err('TypeError', (largest ? 'nlargest' : 'nsmallest') + '() の第1引数には整数を使ってください', '');
    const keyFn = kwargs && 'key' in kwargs && !isNone(kwargs.key) ? kwargs.key : null;
    const arr = (function () {
      const a = ctx.iterable(args[1]);
      return a;
    })();
    if (arr === null || arr === undefined || (arr && arr.__unk)) return ctx.unk('結果');
    const sorted = sortedVals(ctx, arr, keyFn, largest);
    if (sorted === null) return ctx.unk('結果');
    return LIST(sorted.slice(0, Math.max(0, n)));
  };
}
function mergeFn(ctx, args, kwargs) {
  const keyFn = kwargs && 'key' in kwargs && !isNone(kwargs.key) ? kwargs.key : null;
  const rev = kwargs && 'reverse' in kwargs ? ctx.truthy(kwargs.reverse) === true : false;
  const seqs = [];
  for (const a of args) {
    const arr = ctx.iterable(a);
    if (arr === null || arr === undefined || (arr && arr.__unk)) return ctx.unk('merge の結果');
    seqs.push(arr.slice());
  }
  const keyOf = (v) => (keyFn ? ctx.call(keyFn, [v]) : v);
  const out = [];
  const heads = seqs.map(() => 0);
  for (;;) {
    let best = -1, bestKey = null;
    for (let s = 0; s < seqs.length; s++) {
      if (heads[s] >= seqs[s].length) continue;
      const k = keyOf(seqs[s][heads[s]]);
      if (best < 0) { best = s; bestKey = k; continue; }
      const c = lt(ctx, k, bestKey);
      if (c === null) return ctx.unk('merge の結果');
      if (rev ? !c && ctx.eq(k, bestKey) !== true : c) { best = s; bestKey = k; }
    }
    if (best < 0) break;
    out.push(seqs[best][heads[best]++]);
  }
  return ITER(out, 'generator');
}

registerStdlibModule('heapq', {
  functions: {
    heapify: heapifyImpl(false),
    heapify_max: heapifyImpl(true),
    heappop: popImpl(false),
    heappop_max: popImpl(true),
    heappush: pushImpl(false),
    heappush_max: pushImpl(true),
    heappushpop: pushpopImpl(false),
    heappushpop_max: pushpopImpl(true),
    heapreplace: replaceImpl(false),
    heapreplace_max: replaceImpl(true),
    merge: mergeFn,
    nlargest: nlargestImpl(true),
    nsmallest: nlargestImpl(false),
  },
});
