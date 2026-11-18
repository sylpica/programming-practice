/* 高度モード B7 G5：operator 全103件の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/operator）と CPython 3.12.3 実走。
 *
 * 方針：二項演算はエンジンの演算（ctx.binop／ctx.compare）へ委譲し、意味と
 * エラー文面をエンジン本体と一致させる。エンジンが表現できない @ 演算は、
 * 既知の型では CPython の TypeError を先行判定し、ユーザー定義クラス・
 * ネイティブでは binop('@') の未確定（UNK＋診断）に委ねる。
 * in-place 系は list／set／dict に対して CPython どおり同一オブジェクトを
 * 変更して返す（エイリアスから見える）。それ以外は通常演算へ委譲する。
 * is_none／is_not_none は 3.12.3 には存在しない（実走で hasattr=False を確認）。
 * 3.13 以降の追加として、ドキュメントに基づき自明な意味論で実装する。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import {
  NUM, BOOL, NONE, LIST, SET, isNum, isBool, isNone, isUnk, isList, isTuple, isDict, isSet,
  isIterV, dictKeyId, getattrOf, getitemOf, makeCursor, collectAll, indexInt,
  callWithKwargs, callNeedsKwargsFallback, NEEDS_KWARGS,
} from './impl-advanced-g5-common.js';

const { dictSet } = PyAPI;

function noKw(ctx, dispName, kwargs) {
  if (kwargs && Object.keys(kwargs).length) {
    ctx.err('TypeError', dispName + '() takes no keyword arguments', '');
  }
}
function bin(name, op) {
  return (ctx, args, kwargs) => {
    noKw(ctx, '_operator.' + name, kwargs);
    if (args.length !== 2) ctx.err('TypeError', name + ' expected 2 arguments, got ' + args.length, '');
    return ctx.binop(op, args[0], args[1]);
  };
}
function cmp(name, op) {
  return (ctx, args, kwargs) => {
    noKw(ctx, '_operator.' + name, kwargs);
    if (args.length !== 2) ctx.err('TypeError', name + ' expected 2 arguments, got ' + args.length, '');
    // ctx.compare はエンジンの BOOL 値（または UNK）を返す
    const r = ctx.compare(op, args[0], args[1]);
    return isUnk(r) ? ctx.unk('operator.' + name + ' の結果') : r;
  };
}
function un(name, impl) {
  return (ctx, args, kwargs) => {
    noKw(ctx, '_operator.' + name, kwargs);
    if (args.length !== 1) ctx.err('TypeError', '_operator.' + name + '() takes exactly one argument (' + args.length + ' given)', '');
    return impl(ctx, args[0]);
  };
}
const KNOWN_NON_CALLABLE = (v) =>
  isNum(v) || isBool(v) || isNone(v) || typeof v === 'string' || isList(v) || isTuple(v) ||
  isDict(v) || isSet(v) || isIterV(v) || !!(v && v.__range);

/* ---- 単項演算 ---- */
function badUnary(ctx, sym, v) {
  ctx.err('TypeError', "bad operand type for unary " + sym + ": '" + ctx.typeName(v) + "'", '');
}
const negImpl = (ctx, v) => {
  if (isUnk(v)) return ctx.unk('operator.neg の結果');
  if (isBool(v)) return NUM(v.v ? -1 : 0, false);
  if (isNum(v)) return NUM(-v.v, v.f);
  if (v && (v.__instance || v.__native)) return ctx.unk('operator.neg の結果（__neg__ は未確定）');
  badUnary(ctx, '-', v);
  return ctx.unk('operator.neg の結果');
};
const posImpl = (ctx, v) => {
  if (isUnk(v)) return ctx.unk('operator.pos の結果');
  if (isBool(v)) return NUM(v.v ? 1 : 0, false);
  if (isNum(v)) return v;
  if (v && (v.__instance || v.__native)) return ctx.unk('operator.pos の結果（__pos__ は未確定）');
  badUnary(ctx, '+', v);
  return ctx.unk('operator.pos の結果');
};
const absImpl = (ctx, v) => {
  if (isUnk(v)) return ctx.unk('operator.abs の結果');
  if (isBool(v)) return NUM(v.v ? 1 : 0, false);
  if (isNum(v)) return NUM(Math.abs(v.v), v.f);
  if (v && (v.__instance || v.__native)) return ctx.unk('operator.abs の結果（__abs__ は未確定）');
  ctx.err('TypeError', "bad operand type for abs(): '" + ctx.typeName(v) + "'", '');
  return ctx.unk('operator.abs の結果');
};
const invImpl = (ctx, v) => {
  if (isUnk(v)) return ctx.unk('operator.inv の結果');
  if (isBool(v)) return NUM(v.v ? -2 : -1, false);
  if (isNum(v) && !v.f) return NUM(~v.v, false);
  if (v && (v.__instance || v.__native)) return ctx.unk('operator.inv の結果（__invert__ は未確定）');
  badUnary(ctx, '~', v);
  return ctx.unk('operator.inv の結果');
};

/* ---- matmul（@ はエンジン未対応のため先行判定） ---- */
function matmulImpl(name) {
  return (ctx, args, kwargs) => {
    noKw(ctx, '_operator.' + name, kwargs);
    if (args.length !== 2) ctx.err('TypeError', name + ' expected 2 arguments, got ' + args.length, '');
    const [a, b] = args;
    if (isUnk(a) || isUnk(b)) return ctx.unk('operator.' + name + ' の結果');
    const exotic = (v) => v && (v.__instance || v.__native);
    if (!exotic(a) && !exotic(b)) {
      ctx.err('TypeError', "unsupported operand type(s) for @: '" + ctx.typeName(a) + "' and '" + ctx.typeName(b) + "'", '');
    }
    return ctx.binop('@', a, b); // インスタンス系は __matmul__ の可能性があり未確定に委ねる
  };
}

/* ---- 添字操作 ---- */
function sliceIndices(s, len) {
  // {__slice} から CPython のスライス添字列を作る（step は 0 でない前提）
  const norm = (v, def) => (v === null || v === undefined ? def : v);
  const start0 = s.start, stop0 = s.stop, step0 = s.step;
  const step = step0 === null ? 1 : step0;
  if (step === 0) return null;
  const out = [];
  if (step > 0) {
    let start = norm(start0, 0); if (start < 0) start = Math.max(0, len + start); start = Math.min(start, len);
    let stop = norm(stop0, len); if (stop < 0) stop = Math.max(0, len + stop); stop = Math.min(stop, len);
    for (let i = start; i < stop; i += step) out.push(i);
  } else {
    let start = norm(start0, len - 1); if (start < 0) start = len + start; if (start < 0) return [];
    start = Math.min(start, len - 1);
    let stop = norm(stop0, -1); if (stop0 !== null && stop < 0) stop = len + stop; if (stop0 !== null && stop < 0) stop = -1;
    for (let i = start; i > stop; i += step) out.push(i);
  }
  return out;
}
function sliceParts(ctx, key) {
  const s = key.__slice;
  const conv = (v) => {
    if (v === null || v === undefined) return null;
    const i = indexInt(ctx, v);
    return i;
  };
  return { start: conv(s.start), stop: conv(s.stop), step: conv(s.step) };
}
function setitemImpl(ctx, args, kwargs) {
  noKw(ctx, '_operator.setitem', kwargs);
  if (args.length !== 3) ctx.err('TypeError', 'setitem expected 3 arguments, got ' + args.length, '');
  const [obj, key, val] = args;
  if (isUnk(obj) || isUnk(key) || isUnk(val)) return ctx.unk('operator.setitem の結果');
  const tn = ctx.typeName(obj);
  const noAssign = () => ctx.err('TypeError', "'" + tn + "' object does not support item assignment", '');
  if (isList(obj)) {
    if (key && key.__slice) {
      const parts = sliceParts(ctx, key);
      if (parts.step === 0) ctx.err('ValueError', 'slice step cannot be zero', '');
      const cur = makeCursor(ctx, val);
      if (cur.state === 'noniter') ctx.err('TypeError', "'" + ctx.typeName(val) + "' object is not iterable", '');
      if (cur.state === 'unknown') return ctx.unk('operator.setitem の結果');
      const got = collectAll(cur);
      if (got.unk || got.overflow) return ctx.unk('operator.setitem の結果');
      const arr = obj.__list;
      const idxs = sliceIndices(parts, arr.length);
      if (parts.step !== null && parts.step !== 1) {
        if (got.items.length !== idxs.length) {
          ctx.err('ValueError', 'attempt to assign sequence of size ' + got.items.length + ' to extended slice of size ' + idxs.length, '');
        }
        idxs.forEach((ix, i) => { arr[ix] = got.items[i]; });
        return NONE;
      }
      const start = idxs.length ? idxs[0] : (parts.start === null ? 0 : Math.min(Math.max(parts.start < 0 ? arr.length + parts.start : parts.start, 0), arr.length));
      const delCount = idxs.length;
      arr.splice(start, delCount, ...got.items);
      return NONE;
    }
    const ix = indexInt(ctx, key);
    const arr = obj.__list;
    const i = ix < 0 ? ix + arr.length : ix;
    if (i < 0 || i >= arr.length) ctx.err('IndexError', 'list assignment index out of range', '');
    arr[i] = val;
    return NONE;
  }
  if (isDict(obj)) {
    if (dictKeyId(key) === null) ctx.err('TypeError', "unhashable type: '" + ctx.typeName(key) + "'", '');
    dictSet(obj, key, val);
    return NONE;
  }
  if (typeof obj === 'string' || isTuple(obj) || isSet(obj) || isNum(obj) || isBool(obj) || isNone(obj) || (obj && obj.__range)) noAssign();
  if (obj && obj.__instance) {
    const r = getattrOf(ctx, obj, '__setitem__');
    if (r.value !== undefined) {
      const res = callWithKwargs(ctx, r.value, [key, val], {});
      return res === NEEDS_KWARGS ? callNeedsKwargsFallback(ctx, 'operator.setitem') : NONE;
    }
    if (r.unknown) return ctx.unk('operator.setitem の結果');
    noAssign();
  }
  return ctx.unk('operator.setitem の結果');
}
function delitemImpl(ctx, args, kwargs) {
  noKw(ctx, '_operator.delitem', kwargs);
  if (args.length !== 2) ctx.err('TypeError', 'delitem expected 2 arguments, got ' + args.length, '');
  const [obj, key] = args;
  if (isUnk(obj) || isUnk(key)) return ctx.unk('operator.delitem の結果');
  const tn = ctx.typeName(obj);
  const noDel = () => ctx.err('TypeError', "'" + tn + "' object doesn't support item deletion", '');
  if (isList(obj)) {
    if (key && key.__slice) {
      const parts = sliceParts(ctx, key);
      if (parts.step === 0) ctx.err('ValueError', 'slice step cannot be zero', '');
      const arr = obj.__list;
      const idxs = sliceIndices(parts, arr.length).sort((a, b) => b - a);
      for (const ix of idxs) arr.splice(ix, 1);
      return NONE;
    }
    const ix = indexInt(ctx, key);
    const arr = obj.__list;
    const i = ix < 0 ? ix + arr.length : ix;
    if (i < 0 || i >= arr.length) ctx.err('IndexError', 'list assignment index out of range', '');
    arr.splice(i, 1);
    return NONE;
  }
  if (isDict(obj)) {
    const id = dictKeyId(key);
    if (id === null) ctx.err('TypeError', "unhashable type: '" + ctx.typeName(key) + "'", '');
    if (!obj.__dict.has(id)) ctx.err('KeyError', ctx.repr(key), '');
    obj.__dict.delete(id);
    return NONE;
  }
  if (typeof obj === 'string' || isTuple(obj) || isSet(obj) || isNum(obj) || isBool(obj) || isNone(obj) || (obj && obj.__range)) noDel();
  if (obj && obj.__instance) {
    const r = getattrOf(ctx, obj, '__delitem__');
    if (r.value !== undefined) {
      const res = callWithKwargs(ctx, r.value, [key], {});
      return res === NEEDS_KWARGS ? callNeedsKwargsFallback(ctx, 'operator.delitem') : NONE;
    }
    if (r.unknown) return ctx.unk('operator.delitem の結果');
    noDel();
  }
  return ctx.unk('operator.delitem の結果');
}

/* ---- in-place 系 ---- */
function inplaceSeq(name, op) {
  return (ctx, args, kwargs) => {
    noKw(ctx, '_operator.' + name, kwargs);
    if (args.length !== 2) ctx.err('TypeError', name + ' expected 2 arguments, got ' + args.length, '');
    return ctx.binop(op, args[0], args[1]);
  };
}
function iaddImpl(name) {
  return (ctx, args, kwargs) => {
    noKw(ctx, '_operator.' + name, kwargs);
    if (args.length !== 2) ctx.err('TypeError', name + ' expected 2 arguments, got ' + args.length, '');
    const [a, b] = args;
    if (isList(a) && !isUnk(b)) {
      const cur = makeCursor(ctx, b);
      if (cur.state === 'noniter') ctx.err('TypeError', "'" + ctx.typeName(b) + "' object is not iterable", '');
      if (cur.state === 'unknown') return ctx.unk('operator.' + name + ' の結果');
      const got = collectAll(cur);
      if (got.unk || got.overflow) return ctx.unk('operator.' + name + ' の結果');
      a.__list.push(...got.items);
      return a;
    }
    return ctx.binop('+', a, b);
  };
}
function imulImpl(ctx, args, kwargs) {
  noKw(ctx, '_operator.imul', kwargs);
  if (args.length !== 2) ctx.err('TypeError', 'imul expected 2 arguments, got ' + args.length, '');
  const [a, b] = args;
  if (isList(a) && !isUnk(b)) {
    const n = indexInt(ctx, b);
    if (n === null) return ctx.unk('operator.imul の結果');
    const orig = a.__list.slice();
    a.__list.length = 0;
    for (let i = 0; i < n; i++) a.__list.push(...orig);
    if (a.__list.length > 100000) return ctx.unk('operator.imul の結果（大きすぎます）');
    return a;
  }
  return ctx.binop('*', a, b);
}
function isetImpl(name, mode) {
  return (ctx, args, kwargs) => {
    noKw(ctx, '_operator.' + name, kwargs);
    if (args.length !== 2) ctx.err('TypeError', name + ' expected 2 arguments, got ' + args.length, '');
    const [a, b] = args;
    if (isSet(a) && isSet(b)) {
      // 集合の内部表現は値の配列（engine の SET）。等価性は ctx.eq で判定する
      const inB = (x) => b.__set.some((y) => ctx.eq(x, y) === true);
      const inA = (x) => a.__set.some((y) => ctx.eq(x, y) === true);
      if (mode === 'and') a.__set = a.__set.filter(inB);
      else if (mode === 'sub') a.__set = a.__set.filter((x) => !inB(x));
      else if (mode === 'or') a.__set = [...a.__set, ...b.__set.filter((x) => !inA(x))];
      else a.__set = [...a.__set.filter((x) => !inB(x)), ...b.__set.filter((x) => !inA(x))];
      return a;
    }
    if (name === 'ior' && isDict(a) && isDict(b)) {
      for (const [, entry] of b.__dict) dictSet(a, entry.k, entry.v);
      return a;
    }
    const op = { iand: '&', ior: '|', isub: '-', ixor: '^' }[name];
    return ctx.binop(op, a, b);
  };
}

/* ---- getter クラス群 ---- */
const ATTRGETTER_DEF = {
  typeName: 'attrgetter',
  construct(ctx, args, kwargs) {
    noKw(ctx, 'attrgetter', kwargs);
    if (args.length === 0) ctx.err('TypeError', 'attrgetter expected 1 argument, got 0', '');
    for (const a of args) {
      if (typeof a !== 'string') ctx.err('TypeError', 'attribute name must be a string', '');
    }
    return ctx.native('operator.attrgetter', { names: args.slice() });
  },
  call(ctx, self, args, kwargs) {
    noKw(ctx, 'attrgetter', kwargs);
    if (args.length !== 1) ctx.err('TypeError', 'attrgetter expected 1 argument, got ' + args.length, '');
    const out = [];
    for (const path of self.data.names) {
      let cur = args[0];
      for (const part of path.split('.')) {
        const r = getattrOf(ctx, cur, part);
        if (r.unknown) return ctx.unk('operator.attrgetter の結果');
        if (r.missing) ctx.err('AttributeError', "'" + ctx.typeName(cur) + "' object has no attribute '" + part + "'", '');
        cur = r.value;
      }
      out.push(cur);
    }
    const { TUPLE } = PyAPI;
    return out.length === 1 ? out[0] : TUPLE(out);
  },
};
const ITEMGETTER_DEF = {
  typeName: 'itemgetter',
  construct(ctx, args, kwargs) {
    noKw(ctx, 'itemgetter', kwargs);
    if (args.length === 0) ctx.err('TypeError', 'itemgetter expected 1 argument, got 0', '');
    return ctx.native('operator.itemgetter', { keys: args.slice() });
  },
  call(ctx, self, args, kwargs) {
    noKw(ctx, 'itemgetter', kwargs);
    if (args.length !== 1) ctx.err('TypeError', 'itemgetter expected 1 argument, got ' + args.length, '');
    const out = [];
    for (const key of self.data.keys) {
      const r = getitemOf(ctx, args[0], key);
      if (r.unknown) return ctx.unk('operator.itemgetter の結果');
      out.push(r.value);
    }
    const { TUPLE } = PyAPI;
    return out.length === 1 ? out[0] : TUPLE(out);
  },
};
const METHODCALLER_DEF = {
  typeName: 'methodcaller',
  construct(ctx, args, kwargs) {
    if (args.length === 0) ctx.err('TypeError', 'methodcaller needs at least one argument, the method name', '');
    if (typeof args[0] !== 'string') ctx.err('TypeError', 'method name must be a string', '');
    return ctx.native('operator.methodcaller', { name: args[0], args: args.slice(1), kwargs: kwargs || {} });
  },
  call(ctx, self, args, kwargs) {
    noKw(ctx, 'methodcaller', kwargs);
    if (args.length !== 1) ctx.err('TypeError', 'methodcaller expected 1 argument, got ' + args.length, '');
    const r = getattrOf(ctx, args[0], self.data.name);
    if (r.unknown) return ctx.unk('operator.methodcaller の結果');
    if (r.missing) ctx.err('AttributeError', "'" + ctx.typeName(args[0]) + "' object has no attribute '" + self.data.name + "'", '');
    const merged = { ...self.data.kwargs, ...(kwargs || {}) };
    const res = callWithKwargs(ctx, r.value, self.data.args, merged);
    return res === NEEDS_KWARGS ? callNeedsKwargsFallback(ctx, 'operator.methodcaller') : res;
  },
};

/* ---- その他の関数 ---- */
function containsImpl(ctx, args, kwargs) {
  noKw(ctx, '_operator.contains', kwargs);
  if (args.length !== 2) ctx.err('TypeError', 'contains expected 2 arguments, got ' + args.length, '');
  const [a, b] = args;
  if (!isUnk(a) && (isNum(a) || isBool(a) || isNone(a))) {
    ctx.err('TypeError', "argument of type '" + ctx.typeName(a) + "' is not iterable", '');
  }
  const r = ctx.compare('in', b, a);
  return isUnk(r) ? ctx.unk('operator.contains の結果') : r;
}
function countOfImpl(ctx, args, kwargs) {
  noKw(ctx, '_operator.countOf', kwargs);
  if (args.length !== 2) ctx.err('TypeError', 'countOf expected 2 arguments, got ' + args.length, '');
  const cur = makeCursor(ctx, args[0]);
  if (cur.state === 'noniter') ctx.err('TypeError', "'" + ctx.typeName(args[0]) + "' object is not iterable", '');
  if (cur.state === 'unknown') return ctx.unk('operator.countOf の結果');
  let n = 0;
  let steps = 0;
  for (;;) {
    const r = cur.next();
    if (r.done) break;
    if (r.unk) return ctx.unk('operator.countOf の結果');
    if (++steps > 100000) return ctx.unk('operator.countOf の結果（大きすぎます）');
    const e = ctx.eq(r.value, args[1]);
    if (e === null) return ctx.unk('operator.countOf の結果');
    if (e) n++;
  }
  return NUM(n, false);
}
function indexOfImpl(ctx, args, kwargs) {
  noKw(ctx, '_operator.indexOf', kwargs);
  if (args.length !== 2) ctx.err('TypeError', 'indexOf expected 2 arguments, got ' + args.length, '');
  const cur = makeCursor(ctx, args[0]);
  if (cur.state === 'noniter') ctx.err('TypeError', "'" + ctx.typeName(args[0]) + "' object is not iterable", '');
  if (cur.state === 'unknown') return ctx.unk('operator.indexOf の結果');
  let i = 0;
  for (;;) {
    const r = cur.next();
    if (r.done) break;
    if (r.unk) return ctx.unk('operator.indexOf の結果');
    if (i > 100000) return ctx.unk('operator.indexOf の結果（大きすぎます）');
    const e = ctx.eq(r.value, args[1]);
    if (e === null) return ctx.unk('operator.indexOf の結果');
    if (e) return NUM(i, false);
    i++;
  }
  ctx.err('ValueError', 'sequence.index(x): x not in sequence', '');
  return ctx.unk('operator.indexOf の結果');
}
function lengthHintImpl(ctx, args, kwargs) {
  noKw(ctx, '_operator.length_hint', kwargs);
  if (args.length === 0) ctx.err('TypeError', 'length_hint expected at least 1 argument, got 0', '');
  if (args.length > 2) ctx.err('TypeError', 'length_hint expected at most 2 arguments, got ' + args.length, '');
  let def = NUM(0, false);
  if (args.length === 2) {
    if (isUnk(args[1])) return ctx.unk('operator.length_hint の結果');
    indexInt(ctx, args[1]); // 型検証（エラー文面は CPython と同じ）
    def = args[1];
  }
  const v = args[0];
  if (isUnk(v)) return ctx.unk('operator.length_hint の結果');
  if (typeof v === 'string') return NUM([...v].length, false);
  if (isList(v)) return NUM(v.__list.length, false);
  if (isTuple(v)) return NUM(v.__tuple.length, false);
  if (isDict(v)) return NUM(v.__dict.size, false);
  if (isSet(v)) return NUM(v.__set.length, false);
  if (v && v.__range && v.rng) {
    const [start, stop, step] = v.rng;
    const n = step > 0 ? Math.max(0, Math.ceil((stop - start) / step)) : Math.max(0, Math.ceil((start - stop) / -step));
    return NUM(n, false);
  }
  if (isIterV(v)) {
    // iter() 由来のシーケンスイテレータは pull 方式だが、残り要素数が確定する
    // 種類だけは先読みして数える（バッファへの追加は消費順序を変えない）
    const SEQ_KINDS = ['list_iterator', 'tuple_iterator', 'str_iterator', 'str_ascii_iterator', 'dict_keyiterator', 'set_iterator', 'range_iterator'];
    if (v.pull && SEQ_KINDS.includes(v.kind) && !v.exhausted) {
      let guard = 0;
      while (!v.exhausted && guard++ < 100000) {
        const r = v.pull();
        if (typeof r === 'symbol') { v.exhausted = true; break; }
        v.__iter.push(r);
      }
    }
    if (!v.pull || SEQ_KINDS.includes(v.kind)) return NUM(Math.max(0, v.__iter.length - (v.pos || 0)), false);
    return def;
  }
  if (v && v.__instance) {
    // A6監査PYF-02：__length_hint__ を定義したクラスでは、未対応の
    // object.__length_hint__ を既定値で黙って代用しない（CPython は
    // __len__ より __length_hint__ を優先する）。
    const lh = getattrOf(ctx, v, '__length_hint__');
    if (lh.value !== undefined) ctx.err('未対応', 'object.__length_hint__（長さのヒントのカスタマイズ）はこの説明では対応していません', '');
    const m = getattrOf(ctx, v, '__len__');
    if (m.value !== undefined) {
      const r = callWithKwargs(ctx, m.value, [], {});
      if (isNum(r) && !r.f) return r;
      return ctx.unk('operator.length_hint の結果');
    }
    return def;
  }
  return def;
}
function callImpl(ctx, args, kwargs) {
  if (args.length === 0) ctx.err('TypeError', 'call expected at least 1 argument, got 0', '');
  const target = args[0];
  if (!isUnk(target) && KNOWN_NON_CALLABLE(target)) {
    ctx.err('TypeError', "'" + ctx.typeName(target) + "' object is not callable", '');
  }
  const r = callWithKwargs(ctx, target, args.slice(1), kwargs || {});
  return r === NEEDS_KWARGS ? callNeedsKwargsFallback(ctx, 'operator.call') : r;
}
function getitemFn(ctx, args, kwargs) {
  noKw(ctx, '_operator.getitem', kwargs);
  if (args.length !== 2) ctx.err('TypeError', 'getitem expected 2 arguments, got ' + args.length, '');
  const r = getitemOf(ctx, args[0], args[1]);
  return r.unknown ? ctx.unk('operator.getitem の結果') : r.value;
}

const FUNCTIONS = {
  add: bin('add', '+'), sub: bin('sub', '-'), mul: bin('mul', '*'),
  truediv: bin('truediv', '/'), floordiv: bin('floordiv', '//'), mod: bin('mod', '%'),
  pow: bin('pow', '**'), lshift: bin('lshift', '<<'), rshift: bin('rshift', '>>'),
  and_: bin('and_', '&'), or_: bin('or_', '|'), xor: bin('xor', '^'),
  concat: (ctx, args, kwargs) => {
    noKw(ctx, '_operator.concat', kwargs);
    if (args.length !== 2) ctx.err('TypeError', 'concat expected 2 arguments, got ' + args.length, '');
    const a = args[0];
    // CPython の concat はシーケンス専用で、数値同士なら binop の加算に落ちてはいけない
    if (isNum(a) || isBool(a) || isNone(a)) ctx.err('TypeError', "'" + ctx.typeName(a) + "' object can't be concatenated", '');
    return ctx.binop('+', a, args[1]);
  },
  matmul: matmulImpl('matmul'), imatmul: matmulImpl('imatmul'),
  lt: cmp('lt', '<'), le: cmp('le', '<='), eq: cmp('eq', '=='), ne: cmp('ne', '!='),
  ge: cmp('ge', '>='), gt: cmp('gt', '>'),
  neg: un('neg', negImpl), pos: un('pos', posImpl), abs: un('abs', absImpl),
  inv: un('inv', invImpl), invert: un('invert', invImpl),
  not_: un('not_', (ctx, v) => {
    if (isUnk(v)) return ctx.unk('operator.not_ の結果');
    const t = ctx.truthy(v);
    return t === null ? ctx.unk('operator.not_ の結果') : BOOL(!t);
  }),
  truth: un('truth', (ctx, v) => {
    if (isUnk(v)) return ctx.unk('operator.truth の結果');
    const t = ctx.truthy(v);
    return t === null ? ctx.unk('operator.truth の結果') : BOOL(t);
  }),
  index: un('index', (ctx, v) => {
    const i = indexInt(ctx, v);
    return i === null ? ctx.unk('operator.index の結果') : NUM(i, false);
  }),
  is_: cmp('is_', 'is'), is_not: cmp('is_not', 'is not'),
  is_none: un('is_none', (ctx, v) => BOOL(isNone(v))),
  is_not_none: un('is_not_none', (ctx, v) => BOOL(!isNone(v))),
  contains: containsImpl, countOf: countOfImpl, indexOf: indexOfImpl,
  getitem: getitemFn, setitem: setitemImpl, delitem: delitemImpl,
  length_hint: lengthHintImpl, call: callImpl,
  iadd: iaddImpl('iadd'), iconcat: iaddImpl('iconcat'), imul: imulImpl,
  isub: inplaceSeq('isub', '-'), itruediv: inplaceSeq('itruediv', '/'),
  ifloordiv: inplaceSeq('ifloordiv', '//'), imod: inplaceSeq('imod', '%'),
  ipow: inplaceSeq('ipow', '**'), ilshift: inplaceSeq('ilshift', '<<'),
  irshift: inplaceSeq('irshift', '>>'),
  iand: isetImpl('iand', 'and'), ior: isetImpl('ior', 'or'),
};
// isub は集合では差集合の in-place になるため isetImpl に差し替える
FUNCTIONS.isub = (ctx, args, kwargs) => {
  if (args.length === 2 && isSet(args[0]) && isSet(args[1])) return isetImpl('isub', 'sub')(ctx, args, kwargs);
  return inplaceSeq('isub', '-')(ctx, args, kwargs);
};
FUNCTIONS.ixor = isetImpl('ixor', 'xor');
// ダンダー別名（CPython の operator では本体と同一オブジェクト）
for (const [alias, base] of [
  ['__add__', 'add'], ['__sub__', 'sub'], ['__mul__', 'mul'], ['__truediv__', 'truediv'],
  ['__floordiv__', 'floordiv'], ['__mod__', 'mod'], ['__pow__', 'pow'],
  ['__lshift__', 'lshift'], ['__rshift__', 'rshift'], ['__and__', 'and_'],
  ['__or__', 'or_'], ['__xor__', 'xor'], ['__matmul__', 'matmul'], ['__imatmul__', 'imatmul'],
  ['__lt__', 'lt'], ['__le__', 'le'], ['__eq__', 'eq'], ['__ne__', 'ne'],
  ['__ge__', 'ge'], ['__gt__', 'gt'], ['__neg__', 'neg'], ['__pos__', 'pos'],
  ['__abs__', 'abs'], ['__inv__', 'inv'], ['__invert__', 'invert'],
  ['__concat__', 'concat'], ['__contains__', 'contains'], ['__getitem__', 'getitem'],
  ['__setitem__', 'setitem'], ['__delitem__', 'delitem'],
  ['__iadd__', 'iadd'], ['__iconcat__', 'iconcat'], ['__imul__', 'imul'],
  ['__isub__', 'isub'], ['__itruediv__', 'itruediv'], ['__ifloordiv__', 'ifloordiv'],
  ['__imod__', 'imod'], ['__ipow__', 'ipow'], ['__ilshift__', 'ilshift'],
  ['__irshift__', 'irshift'], ['__iand__', 'iand'], ['__ior__', 'ior'], ['__ixor__', 'ixor'],
  ['__index__', 'index'], ['__call__', 'call'], ['__not__', 'not_'],
]) {
  FUNCTIONS[alias] = FUNCTIONS[base];
}

registerStdlibModule('operator', {
  functions: FUNCTIONS,
  classes: {
    attrgetter: ATTRGETTER_DEF,
    itemgetter: ITEMGETTER_DEF,
    methodcaller: METHODCALLER_DEF,
  },
});
