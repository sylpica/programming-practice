/* 高度モード B7 G5：functools 全19件の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/functools）と CPython 3.12.3 実走
 * （Placeholder は 3.14 追加のためドキュメントに基づく）。
 *
 * 裁定メモ：
 * - partial／lru_cache のラッパ類は classDef の call フックで実装する。
 *   キーワード引数付き呼び出しは共通基盤の callWithKwargs が、対象が
 *   stdlib 実装（関数・クラス・ネイティブ）の場合に限り kwargs を届ける。
 *   ユーザー定義関数・組み込み関数への kwargs 付き呼び出しは ctx.call が
 *   位置引数専用のため未確定に倒す（基盤要請として報告書に記載）。
 * - lru_cache のキーは dictKeyId で作る。CPython 3.12.3 実走の観測規則：
 *   位置引数1個・キーワードなし・タプルでない場合は型まで含めて区別する
 *   （f(1) と f(1.0) と f(True) は別エントリ）。複数引数・タプル引数・
 *   キーワードありは通常の等価性（f(1, 2) と f(1.0, 2) は同一視）。
 *   typed=True は常時型区別。キーワードは呼び出し順がキーに含まれる
 *   （f(a=1, b=2) と f(b=2, a=1) は別エントリ。実走で確認）。
 * - cached_property／partialmethod／singledispatchmethod はディスクリプタ
 *   プロトコルが要り、エンジンにユーザー定義クラス属性の __get__ フックが
 *   無いため未検証（A-10：diag＋UNK で正直に停止）。total_ordering は
 *   クラスへのメソッド合成、update_wrapper／wraps は関数値への属性保存が
 *   それぞれ必要で、同様に未検証＋基盤要請とする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, registerStdlibClass, makeNative, nativeClassDef } from './stdlib-registry.js';
import {
  NUM, BOOL, NONE, DICT, TUPLE, isNum, isBool, isNone, isUnk, isFunc, isTuple, dictKeyId,
  isCallableValue, makeCursor, callWithKwargs, callNeedsKwargsFallback, NEEDS_KWARGS,
  TYPEVAL, classChainOf,
} from './impl-advanced-g5-common.js';

const { dictSet, dictGet } = PyAPI;

/* ---------------- Placeholder（3.14+、ドキュメントに基づく） ---------------- */
const PLACEHOLDER = makeNative('functools.Placeholder', {});
registerStdlibClass('functools.Placeholder', {
  typeName: '_PlaceholderType',
  repr: () => 'Placeholder',
});

/* ---------------- partial ---------------- */
const PARTIAL_DEF = {
  typeName: 'partial',
  construct(ctx, args, kwargs) {
    kwargs = kwargs || {};
    if (args.length === 0) ctx.err('TypeError', "type 'partial' takes at least one argument", '');
    let func = args[0];
    if (!isCallableValue(func) && !isUnk(func)) ctx.err('TypeError', 'the first argument must be callable', '');
    for (const k of Object.keys(kwargs)) {
      if (kwargs[k] === PLACEHOLDER) ctx.err('TypeError', 'Placeholder cannot be passed to partial() as a keyword argument', '');
    }
    let pargs = args.slice(1);
    let pkwargs = { ...kwargs };
    if (func && func.__native === 'functools.partial') {
      // CPython は partial の入れ子を平坦化し、内側の Placeholder を先に埋める
      const base = func.data;
      const merged = [];
      let ai = 0;
      for (const a of base.args) {
        if (a === PLACEHOLDER && ai < pargs.length) merged.push(pargs[ai++]);
        else merged.push(a);
      }
      while (ai < pargs.length) merged.push(pargs[ai++]);
      pargs = merged;
      pkwargs = { ...base.keywords, ...pkwargs };
      func = base.func;
    }
    return ctx.native('functools.partial', { func, args: pargs, keywords: pkwargs });
  },
  call(ctx, self, args, kwargs) {
    const d = self.data;
    const out = [];
    let ai = 0;
    for (const a of d.args) {
      if (a === PLACEHOLDER) {
        if (ai >= args.length) ctx.err('TypeError', 'partial() call does not provide enough positional arguments to fill all Placeholder slots', '');
        out.push(args[ai++]);
      } else out.push(a);
    }
    while (ai < args.length) out.push(args[ai++]);
    const fkwargs = { ...d.keywords, ...(kwargs || {}) };
    const r = callWithKwargs(ctx, d.func, out, fkwargs);
    return r === NEEDS_KWARGS ? callNeedsKwargsFallback(ctx, 'partial') : r;
  },
  attrs: {
    func: (ctx, self) => self.data.func,
    args: (ctx, self) => TUPLE(self.data.args.slice()),
    keywords: (ctx, self) => {
      const d = DICT();
      for (const [k, v] of Object.entries(self.data.keywords)) dictSet(d, k, v);
      return d;
    },
  },
  repr(ctx, self) {
    const parts = [ctx.repr(self.data.func)];
    for (const a of self.data.args) parts.push(ctx.repr(a));
    for (const [k, v] of Object.entries(self.data.keywords)) parts.push(k + '=' + ctx.repr(v));
    return 'functools.partial(' + parts.join(', ') + ')';
  },
};

/* ---------------- lru_cache / cache ---------------- */
function exactTag(v) {
  if (isBool(v)) return 'bool';
  if (isNum(v)) return v.f ? 'float' : 'int';
  if (typeof v === 'string') return 'str';
  if (isNone(v)) return 'NoneType';
  if (isTuple(v)) return 'tuple';
  if (v && v.__native) return v.__native;
  if (v && v.__instance) return 'cls:' + v.cls.cname;
  return 't';
}
function makeCacheKey(ctx, d, args, kwargs) {
  const kwEntries = Object.entries(kwargs || {});
  const idOf = (v) => {
    const id = dictKeyId(v);
    if (id === null) ctx.err('TypeError', "unhashable type: '" + ctx.typeName(v) + "'", '');
    return id;
  };
  if (d.typed) {
    return 'T|' + args.map((a) => exactTag(a) + ':' + idOf(a)).join('|') + '|K|' +
      kwEntries.map(([k, v]) => k + '=' + exactTag(v) + ':' + idOf(v)).join('|');
  }
  if (args.length === 1 && kwEntries.length === 0 && !isTuple(args[0])) {
    return 'S|' + exactTag(args[0]) + '|' + idOf(args[0]);
  }
  return 'N|' + args.map(idOf).join('|') + '|K|' + kwEntries.map(([k, v]) => k + '=' + idOf(v)).join('|');
}
function cacheInfoValue(ctx, d) {
  return ctx.native('functools.CacheInfo', {
    hits: d.hits, misses: d.misses,
    maxsize: d.maxsize, currsize: d.cache.size,
  });
}
const CACHE_INFO_DEF = {
  typeName: 'CacheInfo',
  attrs: {
    hits: (ctx, self) => NUM(self.data.hits, false),
    misses: (ctx, self) => NUM(self.data.misses, false),
    maxsize: (ctx, self) => (self.data.maxsize === null || self.data.maxsize === undefined ? NONE : NUM(self.data.maxsize, false)),
    currsize: (ctx, self) => NUM(self.data.currsize, false),
  },
  repr(ctx, self) {
    const a = CACHE_INFO_DEF.attrs;
    return 'CacheInfo(hits=' + ctx.repr(a.hits(ctx, self)) + ', misses=' + ctx.repr(a.misses(ctx, self)) +
      ', maxsize=' + ctx.repr(a.maxsize(ctx, self)) + ', currsize=' + ctx.repr(a.currsize(ctx, self)) + ')';
  },
  len: (ctx, self) => 4,
  iter: (ctx, self) => {
    const a = CACHE_INFO_DEF.attrs;
    return [a.hits(ctx, self), a.misses(ctx, self), a.maxsize(ctx, self), a.currsize(ctx, self)];
  },
  getitem(ctx, self, key) {
    const a = CACHE_INFO_DEF.attrs;
    const fields = [a.hits(ctx, self), a.misses(ctx, self), a.maxsize(ctx, self), a.currsize(ctx, self)];
    let ix = null;
    if (isBool(key)) ix = key.v ? 1 : 0;
    else if (isNum(key) && !key.f) ix = key.v;
    else ctx.err('TypeError', 'tuple indices must be integers or slices, not ' + ctx.typeName(key), '');
    const i = ix < 0 ? ix + 4 : ix;
    if (i < 0 || i >= 4) ctx.err('IndexError', 'tuple index out of range', '');
    return fields[i];
  },
  eq(ctx, self, other) {
    const a = CACHE_INFO_DEF.attrs;
    const mine = [a.hits(ctx, self), a.misses(ctx, self), a.maxsize(ctx, self), a.currsize(ctx, self)];
    let theirs = null;
    if (other && other.__native === 'functools.CacheInfo') {
      theirs = [a.hits(ctx, other), a.misses(ctx, other), a.maxsize(ctx, other), a.currsize(ctx, other)];
    } else if (isTuple(other)) theirs = other.__tuple;
    if (!theirs || theirs.length !== 4) return false;
    for (let i = 0; i < 4; i++) {
      const e = ctx.eq(mine[i], theirs[i]);
      if (e !== true) return e === null ? null : false;
    }
    return true;
  },
  hash(ctx, self) {
    const a = CACHE_INFO_DEF.attrs;
    return dictKeyId(TUPLE([a.hits(ctx, self), a.misses(ctx, self), a.maxsize(ctx, self), a.currsize(ctx, self)]));
  },
};
const LRU_WRAPPER_DEF = {
  typeName: '_lru_cache_wrapper',
  call(ctx, self, args, kwargs) {
    const d = self.data;
    kwargs = kwargs || {};
    const hasUnk = args.some(isUnk) || Object.values(kwargs).some(isUnk);
    if (hasUnk) {
      const r = callWithKwargs(ctx, d.func, args, kwargs);
      return r === NEEDS_KWARGS ? callNeedsKwargsFallback(ctx, 'lru_cache のラップ対象') : r;
    }
    const key = makeCacheKey(ctx, d, args, kwargs);
    if (d.cache.has(key)) {
      const entry = d.cache.get(key);
      d.cache.delete(key);
      d.cache.set(key, entry);
      d.hits++;
      return entry;
    }
    d.misses++;
    const r = callWithKwargs(ctx, d.func, args, kwargs);
    if (r === NEEDS_KWARGS) return callNeedsKwargsFallback(ctx, 'lru_cache のラップ対象');
    if (!isUnk(r) && d.maxsize !== 0) {
      if (d.maxsize !== null && d.cache.size >= d.maxsize) {
        d.cache.delete(d.cache.keys().next().value);
      }
      d.cache.set(key, r);
    }
    return r;
  },
  methods: {
    cache_info: (ctx, self) => cacheInfoValue(ctx, self.data),
    cache_clear: (ctx, self) => { self.data.cache.clear(); self.data.hits = 0; self.data.misses = 0; return NONE; },
    cache_parameters: (ctx, self) => {
      const d = DICT();
      dictSet(d, 'maxsize', self.data.maxsize === null ? NONE : NUM(self.data.maxsize, false));
      dictSet(d, 'typed', BOOL(!!self.data.typed));
      return d;
    },
  },
  attrs: {
    __wrapped__: (ctx, self) => self.data.func,
    __name__: (ctx, self) => {
      const f = self.data.func;
      if (isFunc(f)) return f.def && f.def.name ? f.def.name : 'function';
      if (f && f.__method) return f.name;
      if (f && f.__builtin) return f.__builtin;
      return ctx.unk('__name__');
    },
  },
};
function makeWrapper(ctx, func, maxsize, typed) {
  return ctx.native('functools._lru_cache_wrapper', {
    func, maxsize, typed, cache: new Map(), hits: 0, misses: 0,
  });
}
const LRU_DECORATOR_DEF = {
  typeName: 'function',
  call(ctx, self, args, kwargs) {
    if (Object.keys(kwargs || {}).length) ctx.err('TypeError', "lru_cache() got an unexpected keyword argument '" + Object.keys(kwargs)[0] + "'", '');
    if (args.length !== 1) ctx.err('TypeError', 'lru_cache() decorator takes exactly one argument (' + args.length + ' given)', '');
    if (!isCallableValue(args[0]) && !isUnk(args[0])) ctx.err('TypeError', 'the first argument must be callable', '');
    return makeWrapper(ctx, args[0], self.data.maxsize, self.data.typed);
  },
};
registerStdlibClass('functools._lru_cache_decorator', LRU_DECORATOR_DEF);

function parseMaxsize(ctx, v) {
  if (isUnk(v)) return 'unknown';
  if (isNone(v)) return null;
  if (isBool(v)) return v.v ? 1 : 0;
  if (isNum(v) && !v.f) return Math.max(0, v.v);
  ctx.err('TypeError', 'Expected first argument to be an integer, a callable, or None', '');
  return 128;
}
function lruCacheFn(ctx, args, kwargs) {
  kwargs = kwargs || {};
  for (const k of Object.keys(kwargs)) {
    if (k !== 'maxsize' && k !== 'typed') ctx.err('TypeError', "lru_cache() got an unexpected keyword argument '" + k + "'", '');
  }
  if (args.length > 1) ctx.err('TypeError', 'lru_cache() takes at most 1 positional argument (' + args.length + ' given)', '');
  let maxsize = 128;
  let typed = false;
  let funcArg = null;
  let maxsizeSet = false;
  if (args.length === 1) {
    if (isCallableValue(args[0])) funcArg = args[0];
    else { maxsize = parseMaxsize(ctx, args[0]); maxsizeSet = true; }
  }
  if ('maxsize' in kwargs) {
    if (maxsizeSet) ctx.err('TypeError', "lru_cache() got multiple values for argument 'maxsize'", '');
    maxsize = parseMaxsize(ctx, kwargs.maxsize);
  }
  if (maxsize === 'unknown') return ctx.unk('lru_cache の結果');
  if ('typed' in kwargs) {
    const t = ctx.truthy(kwargs.typed);
    if (t === null) return ctx.unk('lru_cache の結果');
    typed = t;
  }
  if (funcArg) return makeWrapper(ctx, funcArg, maxsize, typed);
  return ctx.native('functools._lru_cache_decorator', { maxsize, typed });
}
function cacheFn(ctx, args, kwargs) {
  kwargs = kwargs || {};
  for (const k of Object.keys(kwargs)) {
    if (k !== 'user_function') ctx.err('TypeError', "cache() got an unexpected keyword argument '" + k + "'", '');
  }
  let func = null;
  if (args.length === 1) func = args[0];
  else if (args.length === 0 && 'user_function' in kwargs) func = kwargs.user_function;
  else if (args.length === 0) ctx.err('TypeError', "cache() missing 1 required positional argument: 'user_function'", '');
  else ctx.err('TypeError', 'cache() takes 1 positional argument but ' + args.length + ' were given', '');
  if (!isCallableValue(func) && !isUnk(func)) ctx.err('TypeError', 'the first argument must be callable', '');
  if (isUnk(func)) return ctx.unk('cache の結果');
  return makeWrapper(ctx, func, null, false);
}

/* ---------------- reduce ---------------- */
function reduceFn(ctx, args, kwargs) {
  kwargs = kwargs || {};
  for (const k of Object.keys(kwargs)) {
    if (k !== 'initial') ctx.err('TypeError', 'reduce() takes no keyword arguments', '');
  }
  if (args.length < 2) ctx.err('TypeError', 'reduce expected at least 2 arguments, got ' + args.length, '');
  if (args.length > 3) ctx.err('TypeError', 'reduce expected at most 3 arguments, got ' + args.length, '');
  const fn = args[0];
  const cur = makeCursor(ctx, args[1]);
  if (cur.state === 'noniter') ctx.err('TypeError', 'reduce() arg 2 must support iteration', '');
  if (cur.state === 'unknown') return ctx.unk('reduce の結果');
  let acc;
  let started = false;
  if (args.length === 3) { acc = args[2]; started = true; }
  else if ('initial' in kwargs) { acc = kwargs.initial; started = true; }
  let count = 0;
  for (;;) {
    const r = cur.next();
    if (r.done) break;
    if (r.unk) return ctx.unk('reduce の結果');
    if (++count > 100000) return ctx.unk('reduce の結果（大きすぎます）');
    if (!started) { acc = r.value; started = true; continue; }
    acc = ctx.call(fn, [acc, r.value]);
    if (isUnk(acc)) return ctx.unk('reduce の結果');
  }
  if (!started) ctx.err('TypeError', 'reduce() of empty iterable with no initial value', '');
  return acc;
}

/* ---------------- cmp_to_key ---------------- */
let keyWrapperSerial = 0;
function cmpToKeyFn(ctx, args, kwargs) {
  kwargs = kwargs || {};
  for (const k of Object.keys(kwargs)) {
    if (k !== 'mycmp') ctx.err('TypeError', "cmp_to_key() got an unexpected keyword argument '" + k + "'", '');
  }
  if (args.length === 0 && !('mycmp' in kwargs)) ctx.err('TypeError', "cmp_to_key() missing required argument 'mycmp' (pos 1)", '');
  if (args.length > 1) ctx.err('TypeError', 'cmp_to_key() takes at most 1 argument (' + args.length + ' given)', '');
  const cmp = args.length === 1 ? args[0] : kwargs.mycmp;
  const qual = 'functools.KeyWrapper#' + ++keyWrapperSerial;
  registerStdlibClass(qual, {
    typeName: 'KeyWrapper',
    construct(c2, cargs, ckwargs) {
      if (Object.keys(ckwargs || {}).length) c2.err('TypeError', 'KeyWrapper() takes no keyword arguments', '');
      if (cargs.length === 0) c2.err('TypeError', "KeyWrapper() missing 1 required positional argument: 'obj'", '');
      if (cargs.length > 1) c2.err('TypeError', 'KeyWrapper() takes 2 positional arguments but ' + (cargs.length + 1) + ' were given', '');
      return c2.native(qual, { obj: cargs[0], cmp });
    },
    compare(c2, self, op, other) {
      if (!other || other.__native !== qual) return null;
      const r = c2.call(cmp, [self.data.obj, other.data.obj]);
      if (isUnk(r)) return null;
      const n = c2.num(r);
      if (n === null) c2.err('TypeError', "'<' not supported between instances of '" + c2.typeName(r) + "' and 'int'", '');
      if (op === '<') return n < 0;
      if (op === '<=') return n <= 0;
      if (op === '>') return n > 0;
      if (op === '>=') return n >= 0;
      return null;
    },
    eq(c2, self, other) {
      // eq フックには静的 ctx しか渡らず、比較関数を呼べない（基盤要請）。
      // 同一オブジェクト同士は eqVal 側で処理されるため、ここでは未確定を返す。
      return null;
    },
    hash: () => null, // CPython 3.12.3 実走：KeyWrapper は unhashable
    attrs: { obj: (c2, self) => self.data.obj },
  });
  return ctx.ncls(qual);
}

/* ---------------- singledispatch ---------------- */
const BUILTIN_PARENTS = { bool: ['int'] };
function funcNameOf(f) {
  if (isFunc(f)) return f.def && f.def.name ? f.def.name : 'function';
  if (f && f.__method) return f.name;
  if (f && f.__builtin) return f.__builtin;
  return 'singledispatch';
}
const TYPE_BUILTIN_NAMES = ['int', 'float', 'str', 'bool', 'list', 'tuple', 'dict', 'set', 'range', 'type', 'object', 'frozenset', 'bytes', 'complex'];
const EXC_NAMES_SET = new Set(['BaseException', 'Exception', 'ArithmeticError', 'ZeroDivisionError', 'OverflowError', 'LookupError', 'IndexError', 'KeyError', 'ValueError', 'TypeError', 'AttributeError', 'RuntimeError', 'StopIteration', 'NameError', 'OSError', 'NotImplementedError', 'RecursionError']);
function isClassValue(v) {
  if (!v || typeof v !== 'object') return false;
  if (v.__class || v.__ncls || v.__type) return true;
  if (v.__builtin) return TYPE_BUILTIN_NAMES.includes(v.__builtin) || EXC_NAMES_SET.has(v.__builtin);
  return false;
}
function classCandidates(ctx, clsVal) {
  // クラス値そのものと、その親クラスの候補（先に現れたものが優先）
  const out = [];
  const pushObj = () => { if (!out.some((c) => c.__type === 'object')) out.push(TYPEVAL('object')); };
  if (clsVal && clsVal.__union) {
    for (const el of clsVal.__union) out.push(...classCandidates(ctx, el));
    pushObj();
    return out;
  }
  if (clsVal && clsVal.__class) {
    for (const c of classChainOf(clsVal)) out.push(c);
    for (const b of clsVal.baseTypeNames || []) out.push(TYPEVAL(b));
    pushObj();
    return out;
  }
  if (clsVal && clsVal.__ncls) {
    const seen = new Set();
    const queue = [clsVal.__ncls];
    while (queue.length) {
      const q = queue.shift();
      if (seen.has(q)) continue;
      seen.add(q);
      out.push(q === clsVal.__ncls ? clsVal : ctx.ncls(q));
      const def = nativeClassDef(q);
      if (def && def.parents) for (const p of def.parents) queue.push(p);
    }
    pushObj();
    return out;
  }
  const name = clsVal && clsVal.__type ? clsVal.__type : clsVal && clsVal.__builtin ? clsVal.__builtin : null;
  if (name !== null) {
    out.push(TYPEVAL(name));
    for (const p of BUILTIN_PARENTS[name] || []) out.push(TYPEVAL(p));
    pushObj();
    return out;
  }
  pushObj();
  return out;
}
function valueCandidates(ctx, v) {
  const obj = TYPEVAL('object');
  if (isBool(v)) return [TYPEVAL('bool'), TYPEVAL('int'), obj];
  if (isNum(v)) return [TYPEVAL(v.f ? 'float' : 'int'), obj];
  if (typeof v === 'string') return [TYPEVAL('str'), obj];
  if (isNone(v)) return [TYPEVAL('NoneType'), obj];
  if (PyAPI.isList(v)) return [TYPEVAL('list'), obj];
  if (isTuple(v)) return [TYPEVAL('tuple'), obj];
  if (PyAPI.isDict(v)) return [TYPEVAL('dict'), obj];
  if (PyAPI.isSet(v)) return [TYPEVAL('set'), obj];
  if (v && v.__range) return [TYPEVAL('range'), obj];
  if (v && Array.isArray(v.__iter)) return [TYPEVAL(v.kind), obj];
  if (isFunc(v)) return [TYPEVAL('function'), obj];
  if (v && v.__instance) {
    const out = [];
    for (const c of classChainOf(v.cls)) out.push(c);
    for (const b of v.cls.baseTypeNames || []) out.push(TYPEVAL(b));
    out.push(obj);
    return out;
  }
  if (v && v.__native) {
    const out = [ctx.ncls(v.__native)];
    out.push(...classCandidates(ctx, ctx.ncls(v.__native)).slice(1));
    return out;
  }
  if (v && v.__exc) return [TYPEVAL(String(v.kind).split('.').pop()), TYPEVAL('Exception'), obj];
  return [obj];
}
function dispatchLookup(ctx, sdData, candidates) {
  for (const c of candidates) {
    const f = dictGet(sdData.registry, c);
    if (f !== undefined) return f;
  }
  return sdData.func;
}
function doRegister(ctx, sdSelf, clsVal, func) {
  if (clsVal && clsVal.__union) {
    for (const el of clsVal.__union) doRegister(ctx, sdSelf, el, func);
    return;
  }
  dictSet(sdSelf.data.registry, clsVal, func);
}
function annotationClassOf(func) {
  if (!isFunc(func) || !func.def || !func.def.params || !func.def.params.length) return null;
  const ann = func.def.params[0].ann;
  if (!ann) return null;
  if (ann.k === 'name') {
    const t = ann.name;
    if (['int', 'float', 'str', 'bool', 'list', 'tuple', 'dict', 'set', 'frozenset', 'bytes', 'bytearray', 'complex', 'object'].includes(t)) return TYPEVAL(t);
    if (t === 'None') return TYPEVAL('NoneType');
  }
  return null;
}
const SD_REGISTER_DECORATOR_DEF = {
  typeName: 'function',
  call(ctx, self, args, kwargs) {
    if (args.length !== 1) ctx.err('TypeError', 'register() decorator takes exactly one argument (' + args.length + ' given)', '');
    doRegister(ctx, self.data.sd, self.data.cls, args[0]);
    return args[0];
  },
};
registerStdlibClass('functools._register_decorator', SD_REGISTER_DECORATOR_DEF);

const SD_DEF = {
  typeName: 'function',
  call(ctx, self, args, kwargs) {
    if (args.length === 0) ctx.err('TypeError', funcNameOf(self.data.func) + ' requires at least 1 positional argument', '');
    const impl = dispatchLookup(ctx, self.data, valueCandidates(ctx, args[0]));
    const r = callWithKwargs(ctx, impl, args, kwargs || {});
    return r === NEEDS_KWARGS ? callNeedsKwargsFallback(ctx, 'singledispatch') : r;
  },
  methods: {
    register(ctx, self, args, kwargs) {
      if (Object.keys(kwargs || {}).length) ctx.err('TypeError', "register() got an unexpected keyword argument '" + Object.keys(kwargs)[0] + "'", '');
      if (args.length === 0) ctx.err('TypeError', "register() missing 1 required positional argument: 'cls'", '');
      if (args.length > 2) ctx.err('TypeError', 'register() takes at most 2 arguments (' + args.length + ' given)', '');
      const first = args[0];
      const firstIsClass = isClassValue(first) || !!(first && first.__union);
      if (args.length === 2) {
        if (!firstIsClass) ctx.err('TypeError', 'Invalid first argument to `register()`. ' + ctx.repr(first) + ' is not a class or union type.', '');
        doRegister(ctx, self, first, args[1]);
        return args[1];
      }
      if (firstIsClass) {
        return ctx.native('functools._register_decorator', { sd: self, cls: first });
      }
      if (isCallableValue(first)) {
        const cls = annotationClassOf(first);
        if (cls === null) ctx.err('TypeError', 'Invalid first argument to `register()`: ' + ctx.repr(first) + '. Use either `@register(some_class)` or plain `@register` on an annotated function.', '');
        doRegister(ctx, self, cls, first);
        return first;
      }
      ctx.err('TypeError', 'Invalid first argument to `register()`: ' + ctx.repr(first) + '. Use either `@register(some_class)` or plain `@register` on an annotated function.', '');
      return NONE;
    },
    dispatch(ctx, self, args, kwargs) {
      if (Object.keys(kwargs || {}).length) ctx.err('TypeError', "dispatch() got an unexpected keyword argument '" + Object.keys(kwargs)[0] + "'", '');
      if (args.length !== 1) ctx.err('TypeError', 'dispatch() takes exactly one argument (' + args.length + ' given)', '');
      const clsVal = args[0];
      if (!isClassValue(clsVal) && !(clsVal && clsVal.__union)) {
        ctx.err('TypeError', 'Invalid first argument to `dispatch()`. ' + ctx.repr(clsVal) + ' is not a class.', '');
      }
      return dispatchLookup(ctx, self.data, classCandidates(ctx, clsVal));
    },
  },
  attrs: {
    registry: (ctx, self) => self.data.registry,
  },
};
function singledispatchFn(ctx, args, kwargs) {
  kwargs = kwargs || {};
  for (const k of Object.keys(kwargs)) {
    if (k !== 'func') ctx.err('TypeError', "singledispatch() got an unexpected keyword argument '" + k + "'", '');
  }
  if (args.length === 0 && !('func' in kwargs)) ctx.err('TypeError', "singledispatch() missing 1 required positional argument: 'func'", '');
  if (args.length > 1) ctx.err('TypeError', 'singledispatch() takes 1 positional argument but ' + args.length + ' were given', '');
  const func = args.length === 1 ? args[0] : kwargs.func;
  if (isUnk(func)) return ctx.unk('singledispatch の結果');
  const registry = DICT();
  dictSet(registry, TYPEVAL('object'), func);
  return ctx.native('functools.singledispatch', { func, registry });
}

/* ---------------- 未検証（A-10：diag＋UNK で正直に停止） ---------------- */
function unverifiedFn(name, reason) {
  return (ctx) => {
    ctx.diag('functools.' + name + ' は未検証のため、この説明では再現しません（' + reason + '）');
    return ctx.unk('functools.' + name + ' の結果（未検証）');
  };
}
function unverifiedClass(name, reason) {
  return {
    typeName: name,
    construct(ctx) {
      ctx.diag('functools.' + name + ' は未検証のため、この説明では再現しません（' + reason + '）');
      return ctx.unk('functools.' + name + ' の結果（未検証）');
    },
  };
}

registerStdlibModule('functools', {
  data: { Placeholder: PLACEHOLDER },
  functions: {
    cache: cacheFn,
    lru_cache: lruCacheFn,
    reduce: reduceFn,
    cmp_to_key: cmpToKeyFn,
    singledispatch: singledispatchFn,
    total_ordering: unverifiedFn('total_ordering', 'ユーザー定義クラスへ比較メソッドを合成する仕組みがエンジンにありません'),
    update_wrapper: unverifiedFn('update_wrapper', '関数値へ属性を保存・読み出す仕組みがエンジンにありません'),
    wraps: unverifiedFn('wraps', '関数値へ属性を保存・読み出す仕組みがエンジンにありません'),
  },
  classes: {
    partial: PARTIAL_DEF,
    CacheInfo: CACHE_INFO_DEF,
    _lru_cache_wrapper: LRU_WRAPPER_DEF,
    singledispatch: SD_DEF,
    partialmethod: unverifiedClass('partialmethod', 'ディスクリプタとしてメソッドに束縛する仕組みがエンジンにありません'),
    cached_property: unverifiedClass('cached_property', '属性アクセス時の計算とインスタンス属性への書き込みフックがエンジンにありません'),
    singledispatchmethod: unverifiedClass('singledispatchmethod', 'ディスクリプタとしてメソッドに束縛する仕組みがエンジンにありません'),
  },
});
