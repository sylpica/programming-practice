/* 高度モード B7 G5（関数型・イテレータ系）共通基盤。
 * engine.js の ITER 値（{__iter, kind, used, pos}＋任意の pull/sources/failed）は
 * 「配列バッファ＋pos による単一パス消費」が正規の表現であり、遅延生産は
 * it.pull（1件生産してバッファへ積む関数。枯渇時は engine 内部の EXH シンボルを
 * 返す）で接続されている。EXH は export されていないため、本ファイルのカーソルは
 * pull の戻り値が symbol であることを枯渇の目印として複製実装する
 * （engine の値モデルで symbol が値として現れるのは EXH のみ）。
 * ctx.iterable() は ITER を全量ドレインするため、無限・巨大な供給元では使わず、
 * こちらもカーソル経由で1件ずつ消費する。 */
import { PyAPI } from './engine.js';
import { nativeClassDef, STDLIB_MODULES, makeNativeClass, NOT_HANDLED } from './stdlib-registry.js';

export const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, RANGE, ITER, UNK } = PyAPI;
export const { isNum, isBool, isNone, isList, isTuple, isDict, isSet, isUnk, isFunc, dictKeyId } = PyAPI;

export const CAP = 100000; // 実体化・ドレインの上限（engine の MAX_RANGE と同値）
export const NEEDS_KWARGS = Symbol('g5-needs-kwargs');

export const isIterV = (v) => !!v && typeof v === 'object' && Array.isArray(v.__iter);
export const isNativeV = (v) => !!v && typeof v === 'object' && !!v.__native;
export const isNclsV = (v) => !!v && typeof v === 'object' && !!v.__ncls;
export const METHODREF = (obj, name) => ({ __method: true, obj, name });
export const TYPEVAL = (name) => ({ __type: name });

export function isCallableValue(v) {
  if (!v || typeof v !== 'object') return false;
  if (isFunc(v) || v.__builtin || v.__method || v.__bound || v.__class || v.__ncls) return true;
  if (v.__native) { const d = nativeClassDef(v.__native); return !!(d && d.call); }
  return false;
}

/* __index__ 規則（bool は 0/1、float・文字列は TypeError）。未知値は null を返す。 */
export function indexInt(ctx, v) {
  if (isUnk(v)) return null;
  if (isBool(v)) return v.v ? 1 : 0;
  if (isNum(v) && !v.f) return v.v;
  if (v && v.__instance) {
    const m = lookupClassChain(v.cls, '__index__');
    if (isFunc(m)) {
      const r = ctx.call(m, [v]);
      if (isUnk(r)) return null;
      if (isBool(r)) return r.v ? 1 : 0;
      if (isNum(r) && !r.f) return r.v;
      ctx.err('TypeError', '__index__ returned non-int (type ' + ctx.typeName(r) + ')', '');
    }
  }
  ctx.err('TypeError', "'" + ctx.typeName(v) + "' object cannot be interpreted as an integer", '');
  return null;
}

/* 明確にイテラブルでない値か（未知・集合・ユーザーインスタンス等は false＝未確定寄り） */
export function isClearlyNonIterable(v) {
  if (!v || typeof v !== 'object') return false;
  if (isNum(v) || isBool(v) || isNone(v) || isFunc(v)) return true;
  if (v.__builtin || v.__type || v.__ncls || v.__class || v.__exc || v.__bound || v.__method) return true;
  if (v.__native) { const d = nativeClassDef(v.__native); return !(d && d.iter); }
  return false;
}

function iterFailedDeep(it) {
  if (!it) return false;
  if (it.failed === true) return true;
  return (it.sources || []).some((s) => s && s.failed === true);
}

/* 値から1件ずつ消費するカーソルを作る。
 * 戻り値：{ state:'ok', next() } | { state:'unknown' } | { state:'noniter' }
 * next() は { value } | { done:true } | { unk:true } を返す。 */
export function makeCursor(ctx, v) {
  if (isUnk(v)) return { state: 'unknown' };
  if (isIterV(v)) {
    const it = v;
    return {
      state: 'ok',
      next() {
        if (iterFailedDeep(it)) return { unk: true };
        if ((it.pos || 0) < it.__iter.length) return { value: it.__iter[(it.pos = (it.pos || 0) + 1) - 1] };
        if (it.pull && !it.exhausted) {
          const r = it.pull();
          if (typeof r === 'symbol') { it.exhausted = true; return { done: true }; }
          it.__iter.push(r);
          it.pos = (it.pos || 0) + 1;
          if (iterFailedDeep(it)) return { unk: true };
          if (isUnk(r)) return { unk: true };
          return { value: r };
        }
        return { done: true };
      },
    };
  }
  const seq = ctx.iterable(v);
  if (seq !== null) {
    let i = 0;
    return { state: 'ok', next() { return i < seq.length ? { value: seq[i++] } : { done: true }; } };
  }
  if (isClearlyNonIterable(v)) return { state: 'noniter' };
  return { state: 'unknown' };
}

/* カーソルを最後まで集める。{ items } | { unk:true } | { overflow:true } */
export function collectAll(cur, cap = CAP) {
  const items = [];
  for (;;) {
    const r = cur.next();
    if (r.done) return { items };
    if (r.unk) return { unk: true };
    items.push(r.value);
    if (items.length > cap) return { overflow: true };
  }
}

/* イテラブル引数を検証してカーソルを返す。非イテラブルは errFn で停止する。
 * 未確定なら null を返す（呼び出し側は UNK を返すこと）。 */
export function requireCursor(ctx, v, errFn) {
  const cur = makeCursor(ctx, v);
  if (cur.state === 'noniter') errFn();
  if (cur.state === 'unknown') return null;
  return cur;
}
export function notIterableErr(ctx, v) {
  ctx.err('TypeError', "'" + ctx.typeName(v) + "' object is not iterable", '');
}

/* ---- ユーザー定義クラスの継承チェーン（engine の classChain/classLookup の複製） ---- */
export function classChainOf(cls) {
  const out = [];
  const seen = new Set();
  const walk = (c) => {
    if (!c || seen.has(c)) return;
    seen.add(c);
    out.push(c);
    for (const b of c.bases || []) walk(b);
  };
  walk(cls);
  return out;
}
export function lookupClassChain(cls, name) {
  for (const c of classChainOf(cls)) {
    if (c.cenv && c.cenv.vars && c.cenv.vars.has(name)) return c.cenv.vars.get(name);
  }
  return undefined;
}

/* 属性取得（operator.attrgetter／methodcaller の事前確認用）。
 * { value } | { missing:true } | { unknown:true } を返す。 */
const TYPE_METHODS = {
  str: 'capitalize casefold center count encode endswith expandtabs find format format_map index isalnum isalpha isascii isdecimal isdigit isidentifier islower isnumeric isprintable isspace istitle isupper join ljust lower lstrip maketrans partition removeprefix removesuffix replace rfind rindex rjust rpartition rsplit rstrip split splitlines startswith strip swapcase title translate upper zfill',
  list: 'append clear copy count extend index insert pop remove reverse sort',
  dict: 'clear copy fromkeys get items keys pop popitem setdefault update values',
  tuple: 'count index',
  set: 'add clear copy difference difference_update discard intersection intersection_update isdisjoint issubset issuperset pop remove symmetric_difference symmetric_difference_update union update',
  int: 'as_integer_ratio bit_count bit_length conjugate denominator from_bytes imag is_integer numerator real to_bytes',
  float: 'as_integer_ratio conjugate fromhex hex imag is_integer real',
  bool: 'as_integer_ratio bit_count bit_length conjugate denominator from_bytes imag is_integer numerator real to_bytes',
};
const TYPE_METHOD_SETS = {};
for (const k of Object.keys(TYPE_METHODS)) TYPE_METHOD_SETS[k] = new Set(TYPE_METHODS[k].split(' '));

export function getattrOf(ctx, obj, name) {
  if (isUnk(obj)) {
    if (obj.mod && STDLIB_MODULES.has(obj.mod)) {
      const def = STDLIB_MODULES.get(obj.mod);
      if (def.constants && name in def.constants) return { value: def.constants[name] };
      if (def.data && name in def.data) return { value: def.data[name] };
      if (def.functions && name in def.functions) return { value: METHODREF(obj, name) };
      if (def.classes && name in def.classes) return { value: makeNativeClass(obj.mod + '.' + name) };
      return { missing: true };
    }
    return { unknown: true };
  }
  if (obj && obj.__instance) {
    if (obj.attrs && obj.attrs.has(name)) return { value: obj.attrs.get(name) };
    const cv = lookupClassChain(obj.cls, name);
    if (cv !== undefined) return { value: isFunc(cv) ? { __bound: true, fn: cv, instance: obj } : cv };
    return { missing: true };
  }
  if (isNativeV(obj)) {
    const def = nativeClassDef(obj.__native);
    if (!def) return { unknown: true };
    if (def.attrs && name in def.attrs) return { value: def.attrs[name](ctx, obj) };
    if (def.methods && name in def.methods) return { value: METHODREF(obj, name) };
    if (def.classAttrs && name in def.classAttrs) { const cv = def.classAttrs[name]; return { value: typeof cv === 'function' ? cv(ctx) : cv }; }
    return { missing: true };
  }
  if (isNclsV(obj)) {
    const def = nativeClassDef(obj.__ncls);
    if (!def) return { unknown: true };
    if (def.classAttrs && name in def.classAttrs) { const cv = def.classAttrs[name]; return { value: typeof cv === 'function' ? cv(ctx) : cv }; }
    if (def.classMethods && name in def.classMethods) return { value: METHODREF(obj, name) };
    if (def.methods && name in def.methods) return { value: METHODREF(obj, name) };
    return { missing: true };
  }
  if (obj && obj.__class) {
    const cv = lookupClassChain(obj, name);
    if (cv !== undefined) return { value: cv };
    return { unknown: true };
  }
  if (isFunc(obj)) {
    if (name === '__name__' || name === '__qualname__') return { value: obj.def && obj.def.name ? obj.def.name : 'function' };
    return { unknown: true };
  }
  if (isNum(obj) || isBool(obj)) {
    const iv = isBool(obj) ? (obj.v ? 1 : 0) : obj.v;
    if (name === 'real') return { value: isBool(obj) ? NUM(iv, false) : obj };
    if (name === 'imag') return { value: NUM(0, isNum(obj) ? obj.f : false) };
    if (!obj.f || isBool(obj)) {
      if (name === 'numerator') return { value: NUM(iv, false) };
      if (name === 'denominator') return { value: NUM(1, false) };
    }
    const tn = isBool(obj) ? 'bool' : obj.f ? 'float' : 'int';
    if (TYPE_METHOD_SETS[tn].has(name)) return { value: METHODREF(obj, name) };
    return { missing: true };
  }
  if (typeof obj === 'string') {
    if (TYPE_METHOD_SETS.str.has(name)) return { value: METHODREF(obj, name) };
    return { missing: true };
  }
  if (isList(obj) || isTuple(obj) || isDict(obj) || isSet(obj)) {
    const tn = isList(obj) ? 'list' : isTuple(obj) ? 'tuple' : isDict(obj) ? 'dict' : 'set';
    if (name === '__len__') return { unknown: true };
    if (TYPE_METHOD_SETS[tn].has(name)) return { value: METHODREF(obj, name) };
    return { missing: true };
  }
  if (obj && obj.__range) {
    if (obj.rng && (name === 'start' || name === 'stop' || name === 'step')) return { value: NUM(obj.rng[name === 'start' ? 0 : name === 'stop' ? 1 : 2], false) };
    if (name === 'count' || name === 'index') return { value: METHODREF(obj, name) };
    return { missing: true };
  }
  if (isNone(obj)) return { missing: true };
  return { unknown: true };
}

/* 添字取得（operator.getitem／itemgetter 用）。
 * 値 | { unknown:true } を返し、確定した誤りは ctx.err で停止する。 */
export function getitemOf(ctx, obj, key) {
  if (isUnk(obj) || isUnk(key)) return { unknown: true };
  const tn = ctx.typeName(obj);
  const idxErr = (kind, msg) => ctx.err(kind, msg, '');
  if (key && key.__slice) {
    // スライスキー（operator.getitem／itemgetter 用）。list／tuple／str のみ確定させる
    if (isDict(obj)) idxErr('TypeError', "unhashable type: 'slice'");
    if (isList(obj) || isTuple(obj) || typeof obj === 'string') {
      const raw = key.__slice;
      if (isUnk(raw.start) || isUnk(raw.stop) || isUnk(raw.step)) return { unknown: true };
      const conv = (v) => (v === null || v === undefined ? null : indexInt(ctx, v));
      const start = conv(raw.start);
      const stop = conv(raw.stop);
      const step = conv(raw.step);
      if (start === null && raw.start !== null && raw.start !== undefined) return { unknown: true };
      if (stop === null && raw.stop !== null && raw.stop !== undefined) return { unknown: true };
      if (step === null && raw.step !== null && raw.step !== undefined) return { unknown: true };
      const st = step === null ? 1 : step;
      if (st === 0) idxErr('ValueError', 'slice step cannot be zero');
      const arr = isList(obj) ? obj.__list : isTuple(obj) ? obj.__tuple : Array.from(obj);
      const len = arr.length;
      const idxs = [];
      if (st > 0) {
        let s = start === null ? 0 : start; if (s < 0) s = Math.max(0, len + s); s = Math.min(s, len);
        let e = stop === null ? len : stop; if (e < 0) e = Math.max(0, len + e); e = Math.min(e, len);
        for (let i = s; i < e; i += st) idxs.push(i);
      } else {
        let s = start === null ? len - 1 : start; if (s < 0) s = len + s;
        if (s >= 0) {
          s = Math.min(s, len - 1);
          let e = stop === null ? -1 : stop; if (stop !== null && e < 0) e = len + e; if (stop !== null && e < 0) e = -1;
          for (let i = s; i > e; i += st) idxs.push(i);
        }
      }
      const picked = idxs.map((i) => arr[i]);
      if (typeof obj === 'string') return { value: picked.join('') };
      return { value: isList(obj) ? LIST(picked) : TUPLE(picked) };
    }
    return { unknown: true };
  }
  if (isList(obj) || isTuple(obj)) {
    const arr = isList(obj) ? obj.__list : obj.__tuple;
    const label = isList(obj) ? 'list' : 'tuple';
    const ix = indexIntOrNull(ctx, key);
    if (ix === 'bad') idxErr('TypeError', label + ' indices must be integers or slices, not ' + ctx.typeName(key));
    if (ix === null) return { unknown: true };
    const i = ix < 0 ? ix + arr.length : ix;
    if (i < 0 || i >= arr.length) idxErr('IndexError', label + ' index out of range');
    return { value: arr[i] };
  }
  if (typeof obj === 'string') {
    const ix = indexIntOrNull(ctx, key);
    if (ix === 'bad') idxErr('TypeError', 'string indices must be integers');
    if (ix === null) return { unknown: true };
    const chars = Array.from(obj);
    const i = ix < 0 ? ix + chars.length : ix;
    if (i < 0 || i >= chars.length) idxErr('IndexError', 'string index out of range');
    return { value: chars[i] };
  }
  if (obj && obj.__range) {
    const ix = indexIntOrNull(ctx, key);
    if (ix === 'bad') idxErr('TypeError', 'range indices must be integers or slices, not ' + ctx.typeName(key));
    if (ix === null) return { unknown: true };
    const arr = obj.__range;
    const i = ix < 0 ? ix + arr.length : ix;
    if (i < 0 || i >= arr.length) idxErr('IndexError', 'range object index out of range');
    return { value: arr[i] };
  }
  if (isDict(obj)) {
    if (dictKeyId(key) === null) idxErr('TypeError', "unhashable type: '" + ctx.typeName(key) + "'");
    const v = PyAPI.dictGet(obj, key);
    if (v === undefined) idxErr('KeyError', ctx.repr(key));
    return { value: v };
  }
  if (isSet(obj)) idxErr('TypeError', "'set' object is not subscriptable");
  if (isNativeV(obj)) {
    const def = nativeClassDef(obj.__native);
    if (def && def.getitem) {
      const r = def.getitem(ctx, obj, key);
      if (r !== NOT_HANDLED) return { value: r };
    }
    idxErr('TypeError', "'" + tn + "' object is not subscriptable");
  }
  if (obj && obj.__instance) {
    const m = lookupClassChain(obj.cls, '__getitem__');
    if (isFunc(m)) {
      const r = ctx.call(m, [obj, key]);
      return isUnk(r) ? { unknown: true } : { value: r };
    }
    if (m !== undefined) return { unknown: true };
    idxErr('TypeError', "'" + tn + "' object is not subscriptable");
  }
  if (isNum(obj) || isBool(obj) || isNone(obj) || isFunc(obj) || isIterV(obj)) {
    idxErr('TypeError', "'" + tn + "' object is not subscriptable");
  }
  return { unknown: true };
}
/* indexInt の「型違い」を例外にせず印で返す版（getitem の文面分岐用） */
export function indexIntOrNull(ctx, v) {
  if (isUnk(v)) return null;
  if (isBool(v)) return v.v ? 1 : 0;
  if (isNum(v) && !v.f) return v.v;
  if (v && v.__instance) {
    const m = lookupClassChain(v.cls, '__index__');
    if (isFunc(m)) {
      const r = ctx.call(m, [v]);
      if (isUnk(r)) return null;
      if (isBool(r)) return r.v ? 1 : 0;
      if (isNum(r) && !r.f) return r.v;
      return 'bad';
    }
    return 'bad';
  }
  return 'bad';
}

/* ユーザー定義関数のパラメータ並びを使い、kwargs を位置引数へ変換できる
 * 場合だけ変換する。変換できるのは、kwargs が位置引数の直後から連続した
 * 末尾領域を埋める場合に限る（途中のパラメータはデフォルト任せにできない
 * ため）。*args／**kwargs／キーワード専用引数が絡む場合は null を返す。 */
function bindKwargsPositional(fn, args, kwargs) {
  const params = fn.def && fn.def.params;
  if (!params) return null;
  if (params.some((p) => p.star || p.bare)) return null;
  const kwOnlyNames = new Set(params.filter((p) => p.kwOnly).map((p) => p.name));
  if (Object.keys(kwargs).some((k) => kwOnlyNames.has(k))) return null;
  const names = params.filter((p) => !p.kwOnly).map((p) => p.name);
  const out = args.slice();
  const covered = new Set();
  let maxIx = args.length - 1;
  for (const [k, v] of Object.entries(kwargs)) {
    const ix = names.indexOf(k);
    if (ix < 0 || ix < args.length || covered.has(ix)) return null;
    covered.add(ix);
    out[ix] = v;
    if (ix > maxIx) maxIx = ix;
  }
  for (let i = args.length; i <= maxIx; i++) if (!covered.has(i)) return null;
  out.length = maxIx + 1;
  return out;
}

/* キーワード引数付きで呼び出す。ctx.call は位置引数専用のため、対象が
 * stdlib の関数・クラス・ネイティブ呼び出し可能オブジェクトのときは定義を
 * 直接叩いて kwargs を届ける。ユーザー定義関数はパラメータ並びで位置引数へ
 * 変換できる場合に限り届ける。それ以外は NEEDS_KWARGS。 */
export function callWithKwargs(ctx, fn, args, kwargs) {
  const kwKeys = Object.keys(kwargs || {});
  if (!kwKeys.length) return ctx.call(fn, args);
  if (isUnk(fn)) return ctx.call(fn, args);
  if (fn && fn.__bound && isFunc(fn.fn)) return callWithKwargs(ctx, fn.fn, [fn.instance, ...args], kwargs);
  if (isFunc(fn)) {
    const bound = bindKwargsPositional(fn, args, kwargs);
    if (bound !== null) return ctx.call(fn, bound);
    return NEEDS_KWARGS;
  }
  if (isNativeV(fn)) {
    const def = nativeClassDef(fn.__native);
    if (def && def.call) return def.call(ctx, fn, args, kwargs);
    return NEEDS_KWARGS;
  }
  if (isNclsV(fn)) {
    const def = nativeClassDef(fn.__ncls);
    if (def && def.construct) return def.construct(ctx, args, kwargs);
    return NEEDS_KWARGS;
  }
  if (fn && fn.__method) {
    const obj = fn.obj;
    if (obj && isUnk(obj) && obj.mod && STDLIB_MODULES.has(obj.mod)) {
      const mdef = STDLIB_MODULES.get(obj.mod);
      if (mdef.functions && fn.name in mdef.functions) return mdef.functions[fn.name](ctx, args, kwargs);
      if (mdef.classes && fn.name in mdef.classes) {
        const cdef = nativeClassDef(obj.mod + '.' + fn.name);
        if (cdef && cdef.construct) return cdef.construct(ctx, args, kwargs);
      }
      return NEEDS_KWARGS;
    }
    if (isNativeV(obj)) {
      const def = nativeClassDef(obj.__native);
      if (def && def.methods && fn.name in def.methods) return def.methods[fn.name](ctx, obj, args, kwargs);
      if (def && def.attrs && fn.name in def.attrs) return callWithKwargs(ctx, def.attrs[fn.name](ctx, obj), args, kwargs);
      return NEEDS_KWARGS;
    }
    if (isNclsV(obj)) {
      const def = nativeClassDef(obj.__ncls);
      if (def && def.classMethods && fn.name in def.classMethods) return def.classMethods[fn.name](ctx, args, kwargs);
      return NEEDS_KWARGS;
    }
    return NEEDS_KWARGS;
  }
  return NEEDS_KWARGS;
}
export function callNeedsKwargsFallback(ctx, what) {
  ctx.diag(what + '：キーワード引数付きの呼び出しは、このエンジンでは対象が標準ライブラリ実装の場合にだけ再現できます（基盤要請：ctx への kwargs 付き call の追加）');
  return ctx.unk(what + 'の結果');
}
