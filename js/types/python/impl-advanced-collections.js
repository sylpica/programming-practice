/* 高度モード B7 G4：collections モジュール（46件）。
 * 一次情報：公式ドキュメント 3.15（library/collections）と CPython 3.12.3 実走。
 * 辞書系はエンジンの DICT 値を内包し、キー意味論（ハッシュ・等価・挿入順）を
 * エンジンに委ねる。namedtuple は registerStdlibClass による動的クラス登録。 */
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
import {
  NUM, BOOL, NONE, LIST, TUPLE, DICT, ITER, I, isNum, isBool, isNone, isList, isTuple, isDict, isUnk,
  dictGet, dictSet, dictPairs, dictFromPairs, findKey, toArray, isCallableVal, tupleHash,
  noKwargs, arity, intVal, sliceIndices, indexNorm,
} from './impl-advanced-g4-common.js';

/* 辞書として読める値（dict 本体・辞書系ネイティブ・MappingProxy）の DICT を返す */
export function dictOfValue(v) {
  if (isDict(v)) return v;
  if (v && v.__native && v.data) {
    if (isDict(v.data.dict)) return v.data.dict;
    if (isDict(v.data.mapping)) return v.data.mapping;
  }
  return null;
}
export function pairsOfValue(v) {
  const d = dictOfValue(v);
  return d ? dictPairs(d) : null;
}
function rebuildDict(d, pairs) {
  d.__dict.clear();
  for (const [k, v] of pairs) dictSet(d, k, v);
}
/* dict 初期化（位置引数0〜1個＋kwargs）→ 新しい DICT */
function initDict(ctx, args, kwargs, fname) {
  const d = DICT();
  if (args.length > 1) ctx.err('TypeError', fname + '() の位置引数は最大で1つです', '');
  if (args.length === 1) {
    const src = args[0];
    const pairs = pairsOfValue(src);
    if (pairs) { for (const [k, v] of pairs) dictSet(d, k, v); }
    else {
      const items = toArray(ctx, src, fname);
      if (items === null) return null;
      for (const it of items) {
        const kv = toArray(ctx, it, fname);
        if (kv === null) return null;
        if (kv.length !== 2) ctx.err('ValueError', fname + '() の要素はキーと値のペア（2要素）でなければなりません', '');
        if (!dictSet(d, kv[0], kv[1])) ctx.err('TypeError', '辞書のキーにできない型です（' + ctx.typeName(kv[0]) + '）', '');
      }
    }
  }
  for (const k of Object.keys(kwargs || {})) dictSet(d, k, kwargs[k]);
  return d;
}
function dictEqPairs(ctx, pa, pb) {
  if (pa.length !== pb.length) return false;
  for (const [k, v] of pa) {
    const i = findKey(ctx, pb, k);
    if (i < 0) return false;
    const e = ctx.eq(v, pb[i][1]);
    if (e !== true) return e;
  }
  return true;
}
/* 辞書系共通メソッド（get/keys/values/items/setdefault/pop/clear/update） */
function dictCommonMethods(qualname, extra) {
  const M = {
    get: (ctx, self, args, kwargs) => {
      arity(ctx, args, 1, 2, 'get'); noKwargs(ctx, kwargs, 'get');
      const v = dictGet(self.data.dict, args[0]);
      return v === undefined ? (args.length === 2 ? args[1] : NONE) : v;
    },
    keys: (ctx, self) => LIST(dictPairs(self.data.dict).map(([k]) => k)),
    values: (ctx, self) => LIST(dictPairs(self.data.dict).map(([, v]) => v)),
    items: (ctx, self) => LIST(dictPairs(self.data.dict).map(([k, v]) => TUPLE([k, v]))),
    setdefault: (ctx, self, args, kwargs) => {
      arity(ctx, args, 1, 2, 'setdefault'); noKwargs(ctx, kwargs, 'setdefault');
      const cur = dictGet(self.data.dict, args[0]);
      if (cur !== undefined) return cur;
      const dv = args.length === 2 ? args[1] : NONE;
      dictSet(self.data.dict, args[0], dv);
      return dv;
    },
    pop: (ctx, self, args, kwargs) => {
      arity(ctx, args, 1, 2, 'pop'); noKwargs(ctx, kwargs, 'pop');
      const pairs = dictPairs(self.data.dict);
      const i = findKey(ctx, pairs, args[0]);
      if (i < 0) { if (args.length === 2) return args[1]; ctx.err('KeyError', ctx.repr(args[0]), ''); }
      const v = pairs[i][1];
      pairs.splice(i, 1); rebuildDict(self.data.dict, pairs);
      return v;
    },
    clear: (ctx, self) => { self.data.dict.__dict.clear(); return NONE; },
    update: (ctx, self, args, kwargs) => {
      const nd = initDict(ctx, args, kwargs || {}, 'update');
      if (nd === null) return ctx.unk('update の結果');
      for (const [k, v] of dictPairs(nd)) dictSet(self.data.dict, k, v);
      return NONE;
    },
    copy: (ctx, self) => ctx.native(qualname, { dict: dictFromPairs(dictPairs(self.data.dict)) }),
  };
  return Object.assign(M, extra || {});
}
function dictReprOf(ctx, d) {
  return '{' + dictPairs(d).map(([k, v]) => ctx.repr(k) + ': ' + ctx.repr(v)).join(', ') + '}';
}

/* ================= Counter ================= */
function counterCounts(self) { return dictPairs(self.data.dict); }
function counterResult(ctx, pairs) { return ctx.native('collections.Counter', { dict: dictFromPairs(pairs) }); }
function countBinop(ctx, self, op, other, reflected) {
  if (!other || other.__native !== 'collections.Counter') return ctx.NOT_HANDLED;
  const A = counterCounts(self), B = counterCounts(other);
  const numOf = (v) => (isNum(v) ? v.v : isBool(v) ? (v.v ? 1 : 0) : null);
  const out = [];
  const seen = new Set();
  const calc = (av, bv) => {
    if (av === null || bv === null) return undefined;
    if (op === '+') return av + bv;
    if (op === '-') return av - bv;
    if (op === '&') return Math.min(av, bv);
    return Math.max(av, bv);
  };
  for (const [k, v] of A) {
    const bi = findKey(ctx, B, k);
    const bv = bi >= 0 ? numOf(B[bi][1]) : 0;
    const r = calc(numOf(v), bv);
    if (r === undefined) return ctx.NOT_HANDLED;
    if (r > 0) out.push([k, isNum(v) && !v.f ? I(r) : NUM(r, true)]);
    seen.add(k);
  }
  for (const [k, v] of B) {
    if (seen.has(k) || findKey(ctx, A, k) >= 0) continue;
    const r = calc(0, numOf(v));
    if (r === undefined) return ctx.NOT_HANDLED;
    if (r > 0) out.push([k, isNum(v) && !v.f ? I(r) : NUM(r, true)]);
  }
  return counterResult(ctx, out);
}
const CounterDef = {
  typeName: 'Counter',
  parents: ['collections.abc.MutableMapping'],
  construct: (ctx, args, kwargs) => {
    const d = DICT();
    const self = { __native: 'collections.Counter', mod: 'collections', data: { dict: d } };
    counterUpdate(ctx, self, args, kwargs || {}, false);
    return self;
  },
  methods: dictCommonMethods('collections.Counter', {
    elements: (ctx, self) => {
      const out = [];
      for (const [k, v] of counterCounts(self)) {
        const n = intVal(ctx, v);
        if (n === null) ctx.err('TypeError', 'elements() のカウントには整数を使ってください', '');
        for (let i = 0; i < n; i++) out.push(k);
      }
      return ITER(out, 'itertools.chain');
    },
    most_common: (ctx, self, args, kwargs) => {
      arity(ctx, args, 0, 1, 'most_common');
      let n = null;
      if (args.length === 1 && !isNone(args[0])) { n = intVal(ctx, args[0]); if (n === null) ctx.err('TypeError', 'most_common() の引数には整数か None を使ってください', ''); }
      noKwargs(ctx, kwargs, 'most_common');
      const pairs = counterCounts(self).map(([k, v], i) => ({ k, v, i }));
      pairs.sort((a, b) => {
        const av = isNum(a.v) ? a.v.v : NaN, bv = isNum(b.v) ? b.v.v : NaN;
        if (bv !== av) return bv - av;
        return a.i - b.i;
      });
      const sel = n === null ? pairs : pairs.slice(0, Math.max(0, n));
      return LIST(sel.map(({ k, v }) => TUPLE([k, v])));
    },
    subtract: (ctx, self, args, kwargs) => { counterUpdate(ctx, self, args, kwargs || {}, true); return NONE; },
    update: (ctx, self, args, kwargs) => { counterUpdate(ctx, self, args, kwargs || {}, false); return NONE; },
    total: (ctx, self) => {
      let acc = I(0);
      for (const [, v] of counterCounts(self)) { acc = ctx.binop('+', acc, v); if (isUnk(acc)) return acc; }
      return acc;
    },
  }),
  classMethods: {
    fromkeys: (ctx) => ctx.err('NotImplementedError', 'Counter.fromkeys() is undefined. Use Counter(iterable) instead.', ''),
  },
  getitem: (ctx, self, key) => {
    if (key && key.__slice) return ctx.NOT_HANDLED;
    const v = dictGet(self.data.dict, key);
    return v === undefined ? I(0) : v;
  },
  setitem: (ctx, self, key, value) => {
    if (!dictSet(self.data.dict, key, value)) ctx.err('TypeError', '辞書のキーにできない型です（' + ctx.typeName(key) + '）', '');
    return true;
  },
  contains: (ctx, self, item) => dictGet(self.data.dict, item) !== undefined,
  len: (ctx, self) => self.data.dict.__dict.size,
  iter: (ctx, self) => dictPairs(self.data.dict).map(([k]) => k),
  repr: (ctx, self) => {
    const pairs = counterCounts(self).map(([k, v], i) => ({ k, v, i }));
    if (!pairs.length) return 'Counter()';
    pairs.sort((a, b) => { const av = isNum(a.v) ? a.v.v : NaN, bv = isNum(b.v) ? b.v.v : NaN; return (bv - av) || (a.i - b.i); });
    return 'Counter({' + pairs.map(({ k, v }) => ctx.repr(k) + ': ' + ctx.repr(v)).join(', ') + '})';
  },
  eq: (ctx, self, other) => {
    const op = pairsOfValue(other);
    if (op === null) return false;
    return dictEqPairs(ctx, counterCounts(self), op);
  },
  hash: () => null,
  truthy: (ctx, self) => self.data.dict.__dict.size > 0,
  binop: (ctx, self, op, other, reflected) => {
    if (['+', '-', '&', '|'].includes(op)) return countBinop(ctx, self, op, other, reflected);
    return ctx.NOT_HANDLED;
  },
};
function counterUpdate(ctx, self, args, kwargs, subtract) {
  if (args.length > 1) ctx.err('TypeError', '引数は最大で1つです', '');
  const bump = (key, delta, isCount) => {
    const cur = dictGet(self.data.dict, key);
    let nv;
    if (isCount) {
      const base = cur === undefined ? I(0) : cur;
      nv = ctx.binop(subtract ? '-' : '+', base, delta);
    } else {
      nv = delta;
    }
    if (!dictSet(self.data.dict, key, nv)) ctx.err('TypeError', '辞書のキーにできない型です（' + ctx.typeName(key) + '）', '');
  };
  if (args.length === 1) {
    const src = args[0];
    const pairs = pairsOfValue(src);
    if (pairs) { for (const [k, v] of pairs) bump(k, v, true); }
    else {
      const items = toArray(ctx, src, 'Counter');
      if (items === null) return;
      for (const el of items) bump(el, I(1), true);
    }
  }
  for (const k of Object.keys(kwargs || {})) bump(k, kwargs[k], true);
}

/* ================= OrderedDict ================= */
const OrderedDictDef = {
  typeName: 'OrderedDict',
  parents: ['collections.abc.MutableMapping'],
  construct: (ctx, args, kwargs) => {
    const d = initDict(ctx, args, kwargs || {}, 'OrderedDict');
    if (d === null) return ctx.unk('OrderedDict の中身');
    return ctx.native('collections.OrderedDict', { dict: d });
  },
  methods: dictCommonMethods('collections.OrderedDict', {
    move_to_end: (ctx, self, args, kwargs) => {
      arity(ctx, args, 1, 1, 'move_to_end');
      let last = true;
      if (kwargs && 'last' in kwargs) last = ctx.truthy(kwargs.last) === true;
      if (args.length === 2) last = ctx.truthy(args[1]) === true;
      const pairs = dictPairs(self.data.dict);
      const i = findKey(ctx, pairs, args[0]);
      if (i < 0) ctx.err('KeyError', ctx.repr(args[0]), '');
      const [pair] = pairs.splice(i, 1);
      if (last) pairs.push(pair); else pairs.unshift(pair);
      rebuildDict(self.data.dict, pairs);
      return NONE;
    },
    popitem: (ctx, self, args, kwargs) => {
      arity(ctx, args, 0, 1, 'popitem');
      let last = true;
      if (args.length === 1) last = ctx.truthy(args[0]) === true;
      if (kwargs && 'last' in kwargs) last = ctx.truthy(kwargs.last) === true;
      const pairs = dictPairs(self.data.dict);
      if (!pairs.length) ctx.err('KeyError', 'dictionary is empty', '');
      const pair = last ? pairs.pop() : pairs.shift();
      rebuildDict(self.data.dict, pairs);
      return TUPLE([pair[0], pair[1]]);
    },
  }),
  getitem: (ctx, self, key) => {
    if (key && key.__slice) return ctx.NOT_HANDLED;
    const v = dictGet(self.data.dict, key);
    if (v === undefined) ctx.err('KeyError', ctx.repr(key), '');
    return v;
  },
  setitem: (ctx, self, key, value) => {
    if (!dictSet(self.data.dict, key, value)) ctx.err('TypeError', '辞書のキーにできない型です（' + ctx.typeName(key) + '）', '');
    return true;
  },
  contains: (ctx, self, item) => dictGet(self.data.dict, item) !== undefined,
  len: (ctx, self) => self.data.dict.__dict.size,
  iter: (ctx, self) => dictPairs(self.data.dict).map(([k]) => k),
  repr: (ctx, self) => {
    if (!self.data.dict.__dict.size) return 'OrderedDict()';
    return 'OrderedDict(' + dictReprOf(ctx, self.data.dict) + ')';
  },
  eq: (ctx, self, other) => {
    const op = pairsOfValue(other);
    if (op === null) return false;
    if (other && other.__native === 'collections.OrderedDict') {
      const pa = dictPairs(self.data.dict);
      if (pa.length !== op.length) return false;
      for (let i = 0; i < pa.length; i++) {
        if (ctx.eq(pa[i][0], op[i][0]) !== true) return false;
        if (ctx.eq(pa[i][1], op[i][1]) !== true) return false;
      }
      return true;
    }
    return dictEqPairs(ctx, dictPairs(self.data.dict), op);
  },
  hash: () => null,
  truthy: (ctx, self) => self.data.dict.__dict.size > 0,
};

/* ================= defaultdict ================= */
function defaultdictMissing(ctx, self, key) {
  const f = self.data.factory;
  if (!f) ctx.err('KeyError', ctx.repr(key), '');
  const v = ctx.call(f, []);
  if (isUnk(v)) return v;
  dictSet(self.data.dict, key, v);
  return v;
}
const defaultdictDef = {
  typeName: 'defaultdict',
  parents: ['collections.abc.MutableMapping'],
  construct: (ctx, args, kwargs) => {
    let factory = null;
    let rest = args;
    if (args.length >= 1) {
      const f = args[0];
      if (isNone(f)) { factory = null; rest = args.slice(1); }
      else if (isCallableVal(f)) { factory = f; rest = args.slice(1); }
      else ctx.err('TypeError', 'first argument must be callable or None', '');
    }
    const d = initDict(ctx, rest, kwargs || {}, 'defaultdict');
    if (d === null) return ctx.unk('defaultdict の中身');
    return ctx.native('collections.defaultdict', { dict: d, factory });
  },
  methods: dictCommonMethods('collections.defaultdict', {
    __missing__: (ctx, self, args) => { arity(ctx, args, 1, 1, '__missing__'); return defaultdictMissing(ctx, self, args[0]); },
    copy: (ctx, self) => ctx.native('collections.defaultdict', { dict: dictFromPairs(dictPairs(self.data.dict)), factory: self.data.factory }),
  }),
  attrs: {
    default_factory: (ctx, self) => self.data.factory || NONE,
  },
  getitem: (ctx, self, key) => {
    if (key && key.__slice) return ctx.NOT_HANDLED;
    const v = dictGet(self.data.dict, key);
    if (v !== undefined) return v;
    return defaultdictMissing(ctx, self, key);
  },
  setitem: (ctx, self, key, value) => {
    if (!dictSet(self.data.dict, key, value)) ctx.err('TypeError', '辞書のキーにできない型です（' + ctx.typeName(key) + '）', '');
    return true;
  },
  contains: (ctx, self, item) => dictGet(self.data.dict, item) !== undefined,
  len: (ctx, self) => self.data.dict.__dict.size,
  iter: (ctx, self) => dictPairs(self.data.dict).map(([k]) => k),
  repr: (ctx, self) => 'defaultdict(' + (self.data.factory ? ctx.repr(self.data.factory) : 'None') + ', ' + dictReprOf(ctx, self.data.dict) + ')',
  eq: (ctx, self, other) => {
    const op = pairsOfValue(other);
    if (op === null) return false;
    return dictEqPairs(ctx, dictPairs(self.data.dict), op);
  },
  hash: () => null,
  truthy: (ctx, self) => self.data.dict.__dict.size > 0,
};

/* ================= deque ================= */
function dequeCheckMaxlen(ctx, items, maxlen) {
  if (maxlen !== null && items.length > maxlen) return items.slice(items.length - maxlen);
  return items;
}
function dequePush(ctx, self, v, left) {
  const items = self.data.items;
  if (left) items.unshift(v); else items.push(v);
  if (self.data.maxlen !== null) {
    while (items.length > self.data.maxlen) { if (left) items.pop(); else items.shift(); }
  }
}
const dequeDef = {
  typeName: 'deque',
  construct: (ctx, args, kwargs) => {
    arity(ctx, args, 0, 2, 'deque');
    let maxlen = null;
    const mlv = (kwargs && 'maxlen' in kwargs) ? kwargs.maxlen : (args.length === 2 ? args[1] : undefined);
    if (mlv !== undefined && !isNone(mlv)) {
      const n = intVal(ctx, mlv);
      if (n === null) ctx.err('TypeError', 'maxlen には整数か None を使ってください', '');
      if (n < 0) ctx.err('ValueError', 'maxlen must be non-negative', '');
      maxlen = n;
    }
    let items = [];
    if (args.length >= 1) {
      const arr = toArray(ctx, args[0], 'deque');
      if (arr === null) return ctx.unk('deque の中身');
      items = arr.slice();
    }
    items = dequeCheckMaxlen(ctx, items, maxlen);
    return ctx.native('collections.deque', { items, maxlen });
  },
  methods: {
    append: (ctx, self, args) => { arity(ctx, args, 1, 1, 'append'); dequePush(ctx, self, args[0], false); return NONE; },
    appendleft: (ctx, self, args) => { arity(ctx, args, 1, 1, 'appendleft'); dequePush(ctx, self, args[0], true); return NONE; },
    clear: (ctx, self) => { self.data.items.length = 0; return NONE; },
    copy: (ctx, self) => ctx.native('collections.deque', { items: self.data.items.slice(), maxlen: self.data.maxlen }),
    count: (ctx, self, args) => { arity(ctx, args, 1, 1, 'count'); let n = 0; for (const v of self.data.items) if (ctx.eq(v, args[0]) === true) n++; return I(n); },
    extend: (ctx, self, args) => { arity(ctx, args, 1, 1, 'extend'); const arr = toArray(ctx, args[0], 'extend'); if (arr === null) return ctx.unk('extend の結果'); for (const v of arr) dequePush(ctx, self, v, false); return NONE; },
    extendleft: (ctx, self, args) => { arity(ctx, args, 1, 1, 'extendleft'); const arr = toArray(ctx, args[0], 'extendleft'); if (arr === null) return ctx.unk('extendleft の結果'); for (const v of arr) dequePush(ctx, self, v, true); return NONE; },
    index: (ctx, self, args) => {
      arity(ctx, args, 1, 3, 'index');
      const len = self.data.items.length;
      let start = args.length >= 2 ? indexNormLoose(ctx, args[1], len) : 0;
      let stop = args.length >= 3 ? indexNormLoose(ctx, args[2], len) : len;
      start = Math.max(0, Math.min(len, start)); stop = Math.max(0, Math.min(len, stop));
      for (let i = start; i < stop; i++) if (ctx.eq(self.data.items[i], args[0]) === true) return I(i);
      ctx.err('ValueError', ctx.repr(args[0]) + ' is not in deque', '');
    },
    insert: (ctx, self, args) => {
      arity(ctx, args, 2, 2, 'insert');
      if (self.data.maxlen !== null && self.data.items.length >= self.data.maxlen) ctx.err('IndexError', 'deque already at its maximum size', '');
      let i = intVal(ctx, args[0]);
      if (i === null) ctx.err('TypeError', 'insert() の番号には整数を使ってください', '');
      const len = self.data.items.length;
      if (i < 0) i = Math.max(0, i + len);
      if (i > len) i = len;
      self.data.items.splice(i, 0, args[1]);
      return NONE;
    },
    pop: (ctx, self) => {
      if (!self.data.items.length) ctx.err('IndexError', 'pop from an empty deque', '');
      return self.data.items.pop();
    },
    popleft: (ctx, self) => {
      if (!self.data.items.length) ctx.err('IndexError', 'pop from an empty deque', '');
      return self.data.items.shift();
    },
    remove: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'remove');
      const i = self.data.items.findIndex((v) => ctx.eq(v, args[0]) === true);
      if (i < 0) ctx.err('ValueError', 'deque.remove(x): x not in deque', '');
      self.data.items.splice(i, 1);
      return NONE;
    },
    reverse: (ctx, self) => { self.data.items.reverse(); return NONE; },
    rotate: (ctx, self, args) => {
      arity(ctx, args, 0, 1, 'rotate');
      let n = args.length === 1 ? intVal(ctx, args[0]) : 1;
      if (n === null) ctx.err('TypeError', 'rotate() の引数には整数を使ってください', '');
      const len = self.data.items.length;
      if (!len) return NONE;
      n = ((n % len) + len) % len;
      if (n) { const tail = self.data.items.splice(len - n, n); self.data.items.unshift(...tail); }
      return NONE;
    },
  },
  attrs: {
    maxlen: (ctx, self) => (self.data.maxlen === null ? NONE : I(self.data.maxlen)),
  },
  getitem: (ctx, self, key) => {
    if (key && key.__slice) ctx.err('TypeError', "'deque' object is not subscriptable with a slice", 'deque の添字は整数だけです');
    const i = indexNorm(ctx, key, self.data.items.length, 'deque');
    if (i < 0 || i >= self.data.items.length) ctx.err('IndexError', 'deque index out of range', '');
    return self.data.items[i];
  },
  setitem: (ctx, self, key, value) => {
    const i = indexNorm(ctx, key, self.data.items.length, 'deque');
    if (i < 0 || i >= self.data.items.length) ctx.err('IndexError', 'deque index out of range', '');
    self.data.items[i] = value;
    return true;
  },
  contains: (ctx, self, item) => self.data.items.some((v) => ctx.eq(v, item) === true),
  len: (ctx, self) => self.data.items.length,
  iter: (ctx, self) => self.data.items.slice(),
  repr: (ctx, self) => 'deque([' + self.data.items.map((v) => ctx.repr(v)).join(', ') + ']' + (self.data.maxlen !== null ? ', maxlen=' + self.data.maxlen : '') + ')',
  eq: (ctx, self, other) => {
    if (!other || other.__native !== 'collections.deque') return false;
    const a = self.data.items, b = other.data.items;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (ctx.eq(a[i], b[i]) !== true) return false;
    return true;
  },
  hash: () => null,
  truthy: (ctx, self) => self.data.items.length > 0,
  binop: (ctx, self, op, other, reflected) => {
    if (op === '+' && other && other.__native === 'collections.deque' && !reflected) {
      const items = dequeCheckMaxlen(ctx, self.data.items.concat(other.data.items), self.data.maxlen);
      return ctx.native('collections.deque', { items, maxlen: self.data.maxlen });
    }
    if (op === '*') {
      const [dq, nv] = reflected ? [other, self] : [self, other];
      if (dq && dq.__native === 'collections.deque') {
        const n = intVal(ctx, nv);
        if (n === null) return ctx.NOT_HANDLED;
        const tmp = { items: [], maxlen: dq.data.maxlen };
        for (let r = 0; r < Math.max(0, n); r++) for (const v of dq.data.items) dequePush(ctx, tmp, v, false);
        return ctx.native('collections.deque', { items: tmp.items, maxlen: dq.data.maxlen });
      }
    }
    return ctx.NOT_HANDLED;
  },
};
function indexNormLoose(ctx, v, len) {
  const n = intVal(ctx, v);
  if (n === null) ctx.err('TypeError', '番号には整数を使ってください', '');
  let i = Math.trunc(n);
  if (i < 0) i += len;
  return i;
}

/* ================= ChainMap ================= */
function chainLookup(ctx, self, key) {
  for (const m of self.data.maps) {
    const pairs = pairsOfValue(m);
    if (!pairs) continue;
    const i = findKey(ctx, pairs, key);
    if (i >= 0) return pairs[i][1];
  }
  return undefined;
}
function chainMergedPairs(ctx, self) {
  const out = [];
  for (let mi = self.data.maps.length - 1; mi >= 0; mi--) {
    const pairs = pairsOfValue(self.data.maps[mi]) || [];
    for (const [k, v] of pairs) {
      const i = findKey(ctx, out, k);
      if (i < 0) out.push([k, chainLookup(ctx, self, k)]);
    }
  }
  return out;
}
const ChainMapDef = {
  typeName: 'ChainMap',
  parents: ['collections.abc.MutableMapping'],
  construct: (ctx, args, kwargs) => {
    if (kwargs && Object.keys(kwargs).length) ctx.err('TypeError', 'ChainMap() にキーワード引数はありません', '');
    const maps = args.length ? args.slice() : [DICT()];
    return ctx.native('collections.ChainMap', { maps });
  },
  methods: {
    new_child: (ctx, self, args, kwargs) => {
      arity(ctx, args, 0, 1, 'new_child');
      let m = args.length === 1 ? args[0] : null;
      if (kwargs && Object.keys(kwargs).length) {
        const base = m ? (pairsOfValue(m) || []) : [];
        const merged = dictFromPairs(base);
        for (const k of Object.keys(kwargs)) dictSet(merged, k, kwargs[k]);
        m = merged;
      }
      if (m === null || m === undefined) m = DICT();
      return ctx.native('collections.ChainMap', { maps: [m, ...self.data.maps] });
    },
    get: (ctx, self, args, kwargs) => {
      arity(ctx, args, 1, 2, 'get'); noKwargs(ctx, kwargs, 'get');
      const v = chainLookup(ctx, self, args[0]);
      return v === undefined ? (args.length === 2 ? args[1] : NONE) : v;
    },
    keys: (ctx, self) => LIST(chainMergedPairs(ctx, self).map(([k]) => k)),
    values: (ctx, self) => LIST(chainMergedPairs(ctx, self).map(([, v]) => v)),
    items: (ctx, self) => LIST(chainMergedPairs(ctx, self).map(([k, v]) => TUPLE([k, v]))),
  },
  attrs: {
    maps: (ctx, self) => LIST(self.data.maps.slice()),
    parents: (ctx, self) => ctx.native('collections.ChainMap', { maps: self.data.maps.length > 1 ? self.data.maps.slice(1) : [DICT()] }),
  },
  getitem: (ctx, self, key) => {
    if (key && key.__slice) return ctx.NOT_HANDLED;
    const v = chainLookup(ctx, self, key);
    if (v === undefined) ctx.err('KeyError', ctx.repr(key), '');
    return v;
  },
  setitem: (ctx, self, key, value) => {
    const d = dictOfValue(self.data.maps[0]);
    if (!d) ctx.err('TypeError', 'ChainMap の先頭のマップには代入できません', '');
    if (!dictSet(d, key, value)) ctx.err('TypeError', '辞書のキーにできない型です（' + ctx.typeName(key) + '）', '');
    return true;
  },
  contains: (ctx, self, item) => chainLookup(ctx, self, item) !== undefined,
  len: (ctx, self) => chainMergedPairs(ctx, self).length,
  iter: (ctx, self) => chainMergedPairs(ctx, self).map(([k]) => k),
  repr: (ctx, self) => 'ChainMap(' + self.data.maps.map((m) => ctx.repr(m)).join(', ') + ')',
  truthy: (ctx, self) => chainMergedPairs(ctx, self).length > 0,
};

/* ================= UserDict / UserList / UserString ================= */
const UserDictDef = {
  typeName: 'UserDict',
  parents: ['collections.abc.MutableMapping'],
  construct: (ctx, args, kwargs) => {
    const d = initDict(ctx, args, kwargs || {}, 'UserDict');
    if (d === null) return ctx.unk('UserDict の中身');
    return ctx.native('collections.UserDict', { dict: d });
  },
  methods: dictCommonMethods('collections.UserDict', {
    popitem: (ctx, self) => {
      /* CPython の UserDict.popitem は最初に挿入された組を取り出す（3.12.3 実走で確認） */
      const pairs = dictPairs(self.data.dict);
      if (!pairs.length) ctx.err('KeyError', 'popitem(): dictionary is empty', '');
      const pair = pairs.shift();
      rebuildDict(self.data.dict, pairs);
      return TUPLE([pair[0], pair[1]]);
    },
  }),
  attrs: { data: (ctx, self) => self.data.dict },
  getitem: (ctx, self, key) => {
    if (key && key.__slice) return ctx.NOT_HANDLED;
    const v = dictGet(self.data.dict, key);
    if (v === undefined) ctx.err('KeyError', ctx.repr(key), '');
    return v;
  },
  setitem: (ctx, self, key, value) => {
    if (!dictSet(self.data.dict, key, value)) ctx.err('TypeError', '辞書のキーにできない型です（' + ctx.typeName(key) + '）', '');
    return true;
  },
  contains: (ctx, self, item) => dictGet(self.data.dict, item) !== undefined,
  len: (ctx, self) => self.data.dict.__dict.size,
  iter: (ctx, self) => dictPairs(self.data.dict).map(([k]) => k),
  repr: (ctx, self) => dictReprOf(ctx, self.data.dict),
  eq: (ctx, self, other) => {
    const op = pairsOfValue(other);
    if (op === null) return false;
    return dictEqPairs(ctx, dictPairs(self.data.dict), op);
  },
  hash: () => null,
  truthy: (ctx, self) => self.data.dict.__dict.size > 0,
};

const UserListDef = {
  typeName: 'UserList',
  parents: ['collections.abc.MutableSequence'],
  construct: (ctx, args, kwargs) => {
    arity(ctx, args, 0, 1, 'UserList'); noKwargs(ctx, kwargs, 'UserList');
    let items = [];
    if (args.length === 1) {
      if (args[0] && args[0].__native === 'collections.UserList') items = args[0].data.list.__list.slice();
      else { const arr = toArray(ctx, args[0], 'UserList'); if (arr === null) return ctx.unk('UserList の中身'); items = arr.slice(); }
    }
    return ctx.native('collections.UserList', { list: LIST(items) });
  },
  methods: {
    append: (ctx, self, args) => { arity(ctx, args, 1, 1, 'append'); self.data.list.__list.push(args[0]); return NONE; },
    extend: (ctx, self, args) => { arity(ctx, args, 1, 1, 'extend'); const arr = toArray(ctx, args[0], 'extend'); if (arr === null) return ctx.unk('extend の結果'); self.data.list.__list.push(...arr); return NONE; },
    insert: (ctx, self, args) => {
      arity(ctx, args, 2, 2, 'insert');
      let i = intVal(ctx, args[0]); if (i === null) ctx.err('TypeError', 'insert() の番号には整数を使ってください', '');
      const len = self.data.list.__list.length;
      if (i < 0) i = Math.max(0, i + len); if (i > len) i = len;
      self.data.list.__list.splice(i, 0, args[1]); return NONE;
    },
    pop: (ctx, self, args) => {
      arity(ctx, args, 0, 1, 'pop');
      const arr = self.data.list.__list;
      if (!arr.length) ctx.err('IndexError', 'pop from empty list', '');
      let i = args.length === 1 ? indexNorm(ctx, args[0], arr.length, 'pop') : arr.length - 1;
      if (i < 0 || i >= arr.length) ctx.err('IndexError', 'pop index out of range', '');
      return arr.splice(i, 1)[0];
    },
    remove: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'remove');
      const arr = self.data.list.__list;
      const i = arr.findIndex((v) => ctx.eq(v, args[0]) === true);
      if (i < 0) ctx.err('ValueError', 'list.remove(x): x not in list', '');
      arr.splice(i, 1); return NONE;
    },
    clear: (ctx, self) => { self.data.list.__list.length = 0; return NONE; },
    copy: (ctx, self) => ctx.native('collections.UserList', { list: LIST(self.data.list.__list.slice()) }),
    count: (ctx, self, args) => { arity(ctx, args, 1, 1, 'count'); let n = 0; for (const v of self.data.list.__list) if (ctx.eq(v, args[0]) === true) n++; return I(n); },
    index: (ctx, self, args) => {
      arity(ctx, args, 1, 3, 'index');
      const arr = self.data.list.__list, len = arr.length;
      let start = args.length >= 2 ? Math.max(0, Math.min(len, indexNormLoose(ctx, args[1], len))) : 0;
      let stop = args.length >= 3 ? Math.max(0, Math.min(len, indexNormLoose(ctx, args[2], len))) : len;
      for (let i = start; i < stop; i++) if (ctx.eq(arr[i], args[0]) === true) return I(i);
      ctx.err('ValueError', ctx.repr(args[0]) + ' is not in list', '');
    },
    reverse: (ctx, self) => { self.data.list.__list.reverse(); return NONE; },
    sort: (ctx, self, args, kwargs) => {
      arity(ctx, args, 0, 0, 'sort');
      const keyFn = kwargs && 'key' in kwargs && !isNone(kwargs.key) ? kwargs.key : null;
      const rev = kwargs && 'reverse' in kwargs ? ctx.truthy(kwargs.reverse) === true : false;
      const deco = self.data.list.__list.map((v, i) => ({ v, i, k: keyFn ? ctx.call(keyFn, [v]) : v }));
      deco.sort((a, b) => {
        const lt = ctx.compare('<', a.k, b.k);
        const c = isUnk(lt) ? 0 : (lt === true || (isBool(lt) && lt.v)) ? -1 : (ctx.eq(a.k, b.k) === true ? 0 : 1);
        return (rev ? -c : c) || (a.i - b.i);
      });
      self.data.list.__list.length = 0;
      for (const d of deco) self.data.list.__list.push(d.v);
      return NONE;
    },
  },
  attrs: { data: (ctx, self) => self.data.list },
  getitem: (ctx, self, key) => {
    const arr = self.data.list.__list;
    if (key && key.__slice) {
      const idx = sliceIndices(ctx, key, arr.length);
      return ctx.native('collections.UserList', { list: LIST(idx.map((i) => arr[i])) });
    }
    const i = indexNorm(ctx, key, arr.length, 'UserList');
    if (i < 0 || i >= arr.length) ctx.err('IndexError', 'list index out of range', '');
    return arr[i];
  },
  setitem: (ctx, self, key, value) => {
    const arr = self.data.list.__list;
    if (key && key.__slice) {
      const idx = sliceIndices(ctx, key, arr.length);
      const vals = toArray(ctx, value, 'UserList');
      if (vals === null) return false;
      if (key.step !== null && key.step !== undefined && !isNone(key.step)) {
        if (vals.length !== idx.length) ctx.err('ValueError', '間隔つきスライスへの代入では要素の数を揃えてください', '');
        idx.forEach((pos, q) => { arr[pos] = vals[q]; });
      } else {
        const start = idx.length ? idx[0] : Math.min(arr.length, Math.max(0, (key.lo === null || key.lo === undefined || isNone(key.lo)) ? 0 : 0));
        const delCount = idx.length;
        arr.splice(idx.length ? idx[0] : arr.length, delCount, ...vals);
      }
      return true;
    }
    const i = indexNorm(ctx, key, arr.length, 'UserList');
    if (i < 0 || i >= arr.length) ctx.err('IndexError', 'list assignment index out of range', '');
    arr[i] = value;
    return true;
  },
  contains: (ctx, self, item) => self.data.list.__list.some((v) => ctx.eq(v, item) === true),
  len: (ctx, self) => self.data.list.__list.length,
  iter: (ctx, self) => self.data.list.__list.slice(),
  repr: (ctx, self) => ctx.repr(self.data.list),
  eq: (ctx, self, other) => {
    const oarr = other && other.__native === 'collections.UserList' ? other.data.list.__list : isList(other) ? other.__list : null;
    if (oarr === null) return false;
    const a = self.data.list.__list;
    if (a.length !== oarr.length) return false;
    for (let i = 0; i < a.length; i++) if (ctx.eq(a[i], oarr[i]) !== true) return false;
    return true;
  },
  hash: () => null,
  truthy: (ctx, self) => self.data.list.__list.length > 0,
  binop: (ctx, self, op, other, reflected) => {
    const sarr = self.data.list.__list;
    const oarr = other && other.__native === 'collections.UserList' ? other.data.list.__list : isList(other) ? other.__list : null;
    if (op === '+' && oarr !== null) {
      const items = reflected ? oarr.concat(sarr) : sarr.concat(oarr);
      return ctx.native('collections.UserList', { list: LIST(items) });
    }
    if (op === '*') {
      const nv = reflected ? self : other;
      const n = intVal(ctx, nv);
      if (n === null || (reflected && !(other && other.__native === 'collections.UserList'))) return ctx.NOT_HANDLED;
      const src = reflected ? other.data.list.__list : sarr;
      const out = [];
      for (let r = 0; r < Math.max(0, n); r++) out.push(...src);
      return ctx.native('collections.UserList', { list: LIST(out) });
    }
    return ctx.NOT_HANDLED;
  },
};

function unwrapStr(ctx, v) {
  if (typeof v === 'string') return v;
  if (v && v.__native === 'collections.UserString') return v.data.str;
  return null;
}
function wrapStr(ctx, s) { return ctx.native('collections.UserString', { str: s }); }
const UserStringDef = {
  typeName: 'UserString',
  parents: ['collections.abc.Sequence'],
  construct: (ctx, args, kwargs) => {
    arity(ctx, args, 0, 1, 'UserString'); noKwargs(ctx, kwargs, 'UserString');
    if (!args.length) return wrapStr(ctx, '');
    const s = unwrapStr(ctx, args[0]);
    if (s !== null) return wrapStr(ctx, s);
    const st = ctx.strOf(args[0]);
    if (isUnk(args[0])) return ctx.unk('UserString の中身');
    return wrapStr(ctx, st);
  },
  methods: {
    upper: (ctx, self) => wrapStr(ctx, self.data.str.toUpperCase()),
    lower: (ctx, self) => wrapStr(ctx, self.data.str.toLowerCase()),
    capitalize: (ctx, self) => wrapStr(ctx, self.data.str.length ? self.data.str[0].toUpperCase() + self.data.str.slice(1).toLowerCase() : ''),
    title: (ctx, self) => wrapStr(ctx, self.data.str.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/(\w)'(\w)/g, (m, a, b) => a + "'" + b.toLowerCase())),
    swapcase: (ctx, self) => wrapStr(ctx, [...self.data.str].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('')),
    strip: (ctx, self, args) => wrapStr(ctx, stripImpl(self.data.str, args, ctx, true, true)),
    lstrip: (ctx, self, args) => wrapStr(ctx, stripImpl(self.data.str, args, ctx, true, false)),
    rstrip: (ctx, self, args) => wrapStr(ctx, stripImpl(self.data.str, args, ctx, false, true)),
    replace: (ctx, self, args) => {
      arity(ctx, args, 2, 3, 'replace');
      const oldS = unwrapStr(ctx, args[0]), newS = unwrapStr(ctx, args[1]);
      if (oldS === null || newS === null) ctx.err('TypeError', 'replace() の引数には文字列を使ってください', '');
      let cnt = args.length === 3 ? intVal(ctx, args[2]) : -1;
      if (cnt === null) cnt = -1;
      let out = self.data.str;
      if (oldS === '') { /* 先頭等への挿入は str.replace と同じ規則（簡略） */ out = out.split('').join(newS); if (cnt !== 0) out = newS + out + newS; }
      else if (cnt < 0) out = out.split(oldS).join(newS);
      else { let n = 0; out = out.split(oldS).map((p, i) => (i === 0 ? p : (n++ < cnt ? newS + p : oldS + p))).join(''); }
      return wrapStr(ctx, out);
    },
    join: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'join');
      const arr = toArray(ctx, args[0], 'join');
      if (arr === null) return ctx.unk('join の結果');
      const parts = arr.map((v) => { const s = unwrapStr(ctx, v); if (s === null) ctx.err('TypeError', 'join() の要素には文字列を使ってください', ''); return s; });
      return wrapStr(ctx, parts.join(self.data.str));
    },
    startswith: (ctx, self, args) => { arity(ctx, args, 1, 1, 'startswith'); const p = unwrapStr(ctx, args[0]); if (p === null) ctx.err('TypeError', 'startswith() の引数には文字列を使ってください', ''); return BOOL(self.data.str.startsWith(p)); },
    endswith: (ctx, self, args) => { arity(ctx, args, 1, 1, 'endswith'); const p = unwrapStr(ctx, args[0]); if (p === null) ctx.err('TypeError', 'endswith() の引数には文字列を使ってください', ''); return BOOL(self.data.str.endsWith(p)); },
    find: (ctx, self, args) => { arity(ctx, args, 1, 1, 'find'); const p = unwrapStr(ctx, args[0]); if (p === null) ctx.err('TypeError', 'find() の引数には文字列を使ってください', ''); return I(self.data.str.indexOf(p)); },
    count: (ctx, self, args) => { arity(ctx, args, 1, 1, 'count'); const p = unwrapStr(ctx, args[0]); if (p === null) ctx.err('TypeError', 'count() の引数には文字列を使ってください', ''); if (p === '') return I(self.data.str.length + 1); return I(self.data.str.split(p).length - 1); },
    index: (ctx, self, args) => { arity(ctx, args, 1, 1, 'index'); const p = unwrapStr(ctx, args[0]); if (p === null) ctx.err('TypeError', 'index() の引数には文字列を使ってください', ''); const i = self.data.str.indexOf(p); if (i < 0) ctx.err('ValueError', 'substring not found', ''); return I(i); },
  },
  attrs: { data: (ctx, self) => self.data.str },
  getitem: (ctx, self, key) => {
    const chars = Array.from(self.data.str);
    if (key && key.__slice) {
      const idx = sliceIndices(ctx, key, chars.length);
      return wrapStr(ctx, idx.map((i) => chars[i]).join(''));
    }
    const i = indexNorm(ctx, key, chars.length, 'UserString');
    if (i < 0 || i >= chars.length) ctx.err('IndexError', 'string index out of range', '');
    return wrapStr(ctx, chars[i]);
  },
  contains: (ctx, self, item) => {
    const s = unwrapStr(ctx, item);
    if (s === null) ctx.err('TypeError', "'in <string>' requires string as left operand, not " + ctx.typeName(item), '');
    return self.data.str.includes(s);
  },
  len: (ctx, self) => Array.from(self.data.str).length,
  iter: (ctx, self) => Array.from(self.data.str),
  repr: (ctx, self) => ctx.repr(self.data.str),
  str: (ctx, self) => self.data.str,
  eq: (ctx, self, other) => {
    const s = unwrapStr(ctx, other);
    if (s === null) return false;
    return self.data.str === s;
  },
  hash: (ctx, self) => 's:' + self.data.str,
  truthy: (ctx, self) => self.data.str.length > 0,
  binop: (ctx, self, op, other, reflected) => {
    if (op === '+') {
      const a = reflected ? unwrapStr(ctx, other) : self.data.str;
      const b = reflected ? self.data.str : unwrapStr(ctx, other);
      if (a === null || b === null) return ctx.NOT_HANDLED;
      return wrapStr(ctx, a + b);
    }
    if (op === '*') {
      const nv = reflected ? self : other;
      const n = intVal(ctx, nv);
      if (n === null) return ctx.NOT_HANDLED;
      const src = reflected ? (other && other.__native === 'collections.UserString' ? other.data.str : null) : self.data.str;
      if (src === null) return ctx.NOT_HANDLED;
      return wrapStr(ctx, src.repeat(Math.max(0, n)));
    }
    return ctx.NOT_HANDLED;
  },
};
function stripImpl(s, args, ctx, left, right) {
  let chars = null;
  if (args.length >= 1 && !isNone(args[0])) { const c = unwrapStr(ctx, args[0]); if (c === null) ctx.err('TypeError', 'strip() の引数には文字列を使ってください', ''); chars = new Set(Array.from(c)); }
  const isWs = (ch) => (chars ? chars.has(ch) : /\s/.test(ch));
  let a = Array.from(s);
  if (left) while (a.length && isWs(a[0])) a.shift();
  if (right) while (a.length && isWs(a[a.length - 1])) a.pop();
  return a.join('');
}

/* ================= namedtuple ================= */
const PY_KEYWORDS = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' '));
const IDENT_RE = /^[^\d\W]\w*$/u;
function namedtupleFn(ctx, args, kwargs) {
  arity(ctx, args, 2, 2, 'namedtuple');
  const typename = args[0];
  if (typeof typename !== 'string') ctx.err('TypeError', 'namedtuple() の型名には文字列を使ってください', '');
  if (!IDENT_RE.test(typename) || PY_KEYWORDS.has(typename)) ctx.err('ValueError', "Type names and field names cannot be a keyword: '" + typename + "'", '型名には有効な識別子を使ってください');
  const rename = kwargs && 'rename' in kwargs ? ctx.truthy(kwargs.rename) === true : false;
  let fields;
  if (typeof args[1] === 'string') fields = args[1].split(/[\s,]+/).filter(Boolean);
  else {
    const arr = toArray(ctx, args[1], 'namedtuple');
    if (arr === null) return ctx.unk('namedtuple の型');
    fields = arr.map((f) => { if (typeof f !== 'string') ctx.err('TypeError', 'フィールド名には文字列を使ってください', ''); return f; });
  }
  const seenNames = new Set();
  fields = fields.map((f, i) => {
    const bad = !IDENT_RE.test(f) || PY_KEYWORDS.has(f) || f.startsWith('_') || seenNames.has(f);
    seenNames.add(f);
    if (bad) {
      if (!rename) {
        if (PY_KEYWORDS.has(f)) ctx.err('ValueError', "Type names and field names cannot be a keyword: '" + f + "'", '');
        if (f.startsWith('_')) ctx.err('ValueError', "Field names cannot start with an underscore: '" + f + "'", '');
        if (!IDENT_RE.test(f)) ctx.err('ValueError', "Type names and field names must be valid identifiers: '" + f + "'", '');
        ctx.err('ValueError', "Encountered duplicate field name: '" + f + "'", '');
      }
      return '_' + i;
    }
    return f;
  });
  let defaults = [];
  if (kwargs && 'defaults' in kwargs && !isNone(kwargs.defaults)) {
    const arr = toArray(ctx, kwargs.defaults, 'namedtuple');
    if (arr === null) return ctx.unk('namedtuple の型');
    defaults = arr;
  }
  if (defaults.length > fields.length) ctx.err('TypeError', 'Got more default values than field names', '');
  const n = fields.length;
  const nDef = defaults.length;
  const fieldDefaults = DICT();
  fields.forEach((f, i) => { if (i >= n - nDef) dictSet(fieldDefaults, f, defaults[i - (n - nDef)]); });
  const qualname = 'collections.namedtuple.' + typename;
  const def = {
    typeName: typename,
    construct: (c2, a2, kw2) => {
      const values = new Array(n);
      const filled = new Array(n).fill(false);
      if (a2.length > n) ctx.err('TypeError', typename + '.__new__() takes from ' + (n - nDef + 1) + ' to ' + (n + 1) + ' positional arguments but ' + (a2.length + 1) + ' were given', '');
      a2.forEach((v, i) => { values[i] = v; filled[i] = true; });
      for (const k of Object.keys(kw2 || {})) {
        const i = fields.indexOf(k);
        if (i < 0) ctx.err('TypeError', typename + '.__new__() got an unexpected keyword argument \'' + k + '\'', '');
        if (filled[i]) ctx.err('TypeError', typename + '.__new__() got multiple values for argument \'' + k + '\'', '');
        values[i] = kw2[k]; filled[i] = true;
      }
      for (let i = 0; i < n; i++) {
        if (!filled[i]) {
          const dv = dictGet(fieldDefaults, fields[i]);
          if (dv !== undefined && i >= n - nDef) { values[i] = dv; filled[i] = true; }
        }
      }
      if (filled.some((f) => !f)) ctx.err('TypeError', typename + '.__new__() missing required positional arguments', 'フィールドの数だけ値を渡してください');
      return c2.native(qualname, { values, fields, typeName: typename });
    },
    methods: {
      _asdict: (c2, self) => {
        const d = DICT();
        self.data.fields.forEach((f, i) => dictSet(d, f, self.data.values[i]));
        return d;
      },
      _replace: (c2, self, a2, kw2) => {
        const bad = Object.keys(kw2 || {}).filter((k) => !self.data.fields.includes(k));
        if (bad.length) c2.err('ValueError', 'Got unexpected field names: ' + c2.repr(LIST(bad)), '');
        if (a2.length) c2.err('TypeError', '_replace() は位置引数を受け取りません', '');
        const values = self.data.values.slice();
        for (const k of Object.keys(kw2 || {})) values[self.data.fields.indexOf(k)] = kw2[k];
        return c2.native(qualname, { values, fields: self.data.fields, typeName: typename });
      },
      count: (c2, self, a2) => { let cnt = 0; for (const v of self.data.values) if (c2.eq(v, a2[0]) === true) cnt++; return I(cnt); },
      index: (c2, self, a2) => {
        const i = self.data.values.findIndex((v) => c2.eq(v, a2[0]) === true);
        if (i < 0) c2.err('ValueError', 'tuple.index(x): x not in tuple', '');
        return I(i);
      },
    },
    classMethods: {
      _make: (c2, a2) => {
        arity(c2, a2, 1, 1, '_make');
        const arr = toArray(c2, a2[0], '_make');
        if (arr === null) return c2.unk(typename + ' の値');
        if (arr.length !== n) c2.err('TypeError', 'Expected ' + n + ' arguments, got ' + arr.length, '');
        return c2.native(qualname, { values: arr.slice(), fields, typeName: typename });
      },
    },
    attrs: {},
    classAttrs: {
      _fields: () => TUPLE(fields.slice()),
      _field_defaults: () => fieldDefaults,
    },
    repr: (c2, self) => typename + '(' + self.data.fields.map((f, i) => f + '=' + c2.repr(self.data.values[i])).join(', ') + ')',
    eq: (c2, self, other) => {
      let ov = null;
      if (other && other.__native === qualname) ov = other.data.values;
      else if (isTuple(other)) ov = other.__tuple;
      if (ov === null) return false;
      if (ov.length !== self.data.values.length) return false;
      for (let i = 0; i < ov.length; i++) if (c2.eq(self.data.values[i], ov[i]) !== true) return false;
      return true;
    },
    hash: (c2, self) => tupleHash(self.data.values),
    len: (c2, self) => self.data.values.length,
    iter: (c2, self) => self.data.values.slice(),
    getitem: (c2, self, key) => {
      const vals = self.data.values;
      if (key && key.__slice) {
        const idx = sliceIndices(c2, key, vals.length);
        return TUPLE(idx.map((i) => vals[i]));
      }
      const i = indexNorm(c2, key, vals.length, typename);
      if (i < 0 || i >= vals.length) c2.err('IndexError', 'tuple index out of range', '');
      return vals[i];
    },
    contains: (c2, self, item) => self.data.values.some((v) => c2.eq(v, item) === true),
    truthy: (c2, self) => self.data.values.length > 0,
  };
  fields.forEach((f, i) => { def.attrs[f] = (c2, self) => self.data.values[i]; });
  registerStdlibClass(qualname, def);
  return ctx.ncls(qualname);
}

registerStdlibModule('collections', {
  functions: { namedtuple: namedtupleFn },
  classes: {
    Counter: CounterDef,
    OrderedDict: OrderedDictDef,
    defaultdict: defaultdictDef,
    deque: dequeDef,
    ChainMap: ChainMapDef,
    UserDict: UserDictDef,
    UserList: UserListDef,
    UserString: UserStringDef,
  },
});
