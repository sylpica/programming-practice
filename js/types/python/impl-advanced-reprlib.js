/* 高度モード B7 G4：reprlib モジュール（19件）。
 * Repr クラスの切り詰め規則（maxlevel/maxtuple/maxdict/maxarray/maxlong/
 * maxstring/maxother/maxlist/maxset/maxfrozenset/maxdeque、fillvalue、indent）を
 * CPython の reprlib 実装どおりに再現する。aRepr は共有インスタンス。
 * recursive_repr は呼び出し可能性のあるネイティブとして実装し、再入時に
 * fillvalue を返す。 */
import { registerStdlibModule, registerStdlibClass, makeNative } from './stdlib-registry.js';
import { NONE, I, isNum, isBool, isNone, isList, isTuple, isDict, isSet, isUnk, arity, noKwargs, dictPairs, dictKeyId } from './impl-advanced-g4-common.js';
import { pairsOfValue } from './impl-advanced-collections.js';

const REPR_ATTRS = ['maxlevel', 'maxtuple', 'maxdict', 'maxarray', 'maxlong', 'maxstring', 'maxother', 'maxlist', 'maxset', 'maxfrozenset', 'maxdeque', 'fillvalue', 'indent'];
function defaultSettings() {
  return { maxlevel: 6, maxtuple: 6, maxdict: 4, maxarray: 5, maxlong: 40, maxstring: 30, maxother: 30, maxlist: 6, maxset: 6, maxfrozenset: 6, maxdeque: 6, fillvalue: '...', indent: null };
}
function truncateStr(s, limit, fillvalue) {
  if (s.length <= limit) return s;
  const i = Math.max(0, Math.floor((limit - 3) / 2));
  const j = Math.max(0, limit - 3 - i);
  return s.slice(0, i) + '...' + s.slice(s.length - j);
}
function repr1Impl(ctx, st, v, level, seen) {
  if (isUnk(v)) return '...';
  if (typeof v === 'string') return truncateStr(ctx.repr(v), st.maxstring, st.fillvalue);
  if (isNum(v)) {
    const s = ctx.repr(v);
    if (!v.f && s.replace('-', '').length > st.maxlong) return truncateStr(s, st.maxlong, st.fillvalue);
    return s;
  }
  if (isBool(v) || isNone(v)) return ctx.repr(v);
  if (seen.has(v)) {
    if (isList(v)) return '[...]';
    if (isDict(v) || pairsOfValue(v)) return '{...}';
    if (isTuple(v)) return '(...)';
    return '...';
  }
  if (isList(v)) {
    if (level <= 0) return '[...]';
    seen.add(v);
    try {
      const n = v.__list.length;
      const parts = v.__list.slice(0, st.maxlist).map((x) => repr1Impl(ctx, st, x, level - 1, seen));
      if (n > st.maxlist) parts.push(st.fillvalue);
      return '[' + parts.join(', ') + ']';
    } finally { seen.delete(v); }
  }
  if (isTuple(v)) {
    if (level <= 0) return '(...)';
    seen.add(v);
    try {
      const n = v.__tuple.length;
      const parts = v.__tuple.slice(0, st.maxtuple).map((x) => repr1Impl(ctx, st, x, level - 1, seen));
      if (n > st.maxtuple) parts.push(st.fillvalue);
      return '(' + parts.join(', ') + (n === 1 ? ',' : '') + ')';
    } finally { seen.delete(v); }
  }
  if (isDict(v) || pairsOfValue(v)) {
    if (level <= 0) return '{...}';
    seen.add(v);
    try {
      const pairs = pairsOfValue(v);
      const parts = pairs.slice(0, st.maxdict).map(([k, val]) => repr1Impl(ctx, st, k, level - 1, seen) + ': ' + repr1Impl(ctx, st, val, level - 1, seen));
      if (pairs.length > st.maxdict) parts.push(st.fillvalue);
      return '{' + parts.join(', ') + '}';
    } finally { seen.delete(v); }
  }
  if (isSet(v)) {
    if (level <= 0) return '{...}';
    seen.add(v);
    try {
      const n = v.__set.length;
      if (!n) return 'set()';
      const parts = v.__set.slice(0, st.maxset).map((x) => repr1Impl(ctx, st, x, level - 1, seen));
      if (n > st.maxset) parts.push(st.fillvalue);
      return '{' + parts.join(', ') + '}';
    } finally { seen.delete(v); }
  }
  if (v && v.__native === 'collections.deque') {
    if (level <= 0) return 'deque([...])';
    seen.add(v);
    try {
      const items = v.data.items;
      const parts = items.slice(0, st.maxdeque).map((x) => repr1Impl(ctx, st, x, level - 1, seen));
      let body = parts.join(', ');
      if (items.length > st.maxdeque) body += (body ? ', ' : '') + st.fillvalue.replace('...', '...');
      if (items.length > st.maxdeque) body = parts.join(', ') + ',' + st.fillvalue;
      return 'deque([' + body + '])';
    } finally { seen.delete(v); }
  }
  if (v && v.__native === 'array.array') {
    if (level <= 0) return "array('" + v.data.typecode + "', [...])";
    const items = v.data.items;
    const parts = items.slice(0, st.maxarray).map((x) => repr1Impl(ctx, st, x, level - 1, seen));
    let body = parts.join(', ');
    if (items.length > st.maxarray) body = parts.join(', ') + ',' + st.fillvalue;
    return "array('" + v.data.typecode + "', [" + body + '])';
  }
  const s = ctx.repr(v);
  return truncateStr(s, st.maxother, st.fillvalue);
}

const ReprDef = {
  typeName: 'Repr',
  construct: (ctx) => ctx.native('reprlib.Repr', { st: defaultSettings() }),
  methods: {
    repr: (ctx, self, args) => { arity(ctx, args, 1, 1, 'repr'); return repr1Impl(ctx, self.data.st, args[0], self.data.st.maxlevel, new Set()); },
    repr1: (ctx, self, args) => {
      arity(ctx, args, 2, 2, 'repr1');
      const lv = ctx.int(args[1]);
      return repr1Impl(ctx, self.data.st, args[0], lv === null || lv === undefined ? 0 : Math.trunc(lv), new Set());
    },
  },
  attrs: {},
  truthy: () => true,
};
for (const a of REPR_ATTRS) {
  ReprDef.attrs[a] = (ctx, self) => {
    const v = self.data.st[a];
    if (a === 'fillvalue') return v;
    if (a === 'indent') return v === null ? NONE : I(v);
    return I(v);
  };
}
const aReprNative = makeNative('reprlib.Repr', { st: defaultSettings() });

/* recursive_repr(fillvalue='...') デコレータ：呼べるネイティブとして登録。
 * CPython の実装は「第1引数の同一性」で再入を判定する（__repr__ の self 用）。
 * ここでは第1引数の辞書キーID（同一性を含む）で判定する。 */
registerStdlibClass('reprlib.recursive_repr.wrapper', {
  typeName: 'recursive_repr',
  call: (ctx, self, args, kwargs) => {
    const first = args.length ? args[0] : self.data.fn;
    let key = null;
    try { key = dictKeyId(first); } catch (e) { key = null; }
    if (key === null || key === undefined) key = first;
    if (self.data.active.has(key)) return self.data.fillvalue;
    self.data.active.add(key);
    try { return ctx.call(self.data.fn, args); }
    finally { self.data.active.delete(key); }
  },
  truthy: () => true,
});
const RecursiveReprFactoryDef = {
  typeName: 'recursive_repr',
  construct: (ctx, args, kwargs) => {
    let fill = '...';
    if (args.length >= 1 && typeof args[0] === 'string') fill = args[0];
    if (kwargs && typeof kwargs.fillvalue === 'string') fill = kwargs.fillvalue;
    return ctx.native('reprlib.recursive_repr.decorator', { fill });
  },
  call: (ctx, self, args) => {
    arity(ctx, args, 1, 1, 'recursive_repr');
    return ctx.native('reprlib.recursive_repr.wrapper', { fn: args[0], fillvalue: self.data.fill, active: new Set() });
  },
  truthy: () => true,
};
registerStdlibClass('reprlib.recursive_repr.decorator', RecursiveReprFactoryDef);

registerStdlibModule('reprlib', {
  data: { aRepr: aReprNative },
  functions: {
    repr: (ctx, args) => { arity(ctx, args, 1, 1, 'repr'); return repr1Impl(ctx, defaultSettings(), args[0], 6, new Set()); },
  },
  classes: { Repr: ReprDef, recursive_repr: RecursiveReprFactoryDef },
});
