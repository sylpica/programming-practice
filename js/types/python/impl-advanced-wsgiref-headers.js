/* 高度モード B7 G13：wsgiref.headers（3件）。
 * 一次情報：CPython 3.12.3 の Lib/wsgiref/headers.py（実走照合）。
 * Headers は (名前, 値) のリストに対する純粋処理として完全実装する。
 * バックログ項目は Headers／add_header／get_all の3件だが、クラスの
 * 表面は一体として実装する（__init__ の検証、get、setdefault 等）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  BOOL, NONE, LIST, TUPLE, UNK, isNone, isList, isUnk, noKw,
} from './impl-advanced-g13-common.js';

const NAME_BAD = /[\x00-\x1F\x7F]/;
const VALUE_BAD = /[\x00-\x08\x0A-\x1F\x7F]/;
function checkPair(ctx, k, v) {
  if (typeof k !== 'string') ctx.err('AssertionError', 'Header names/values must be of type str (got ' + ctx.repr(k) + ')', '');
  if (typeof v !== 'string') ctx.err('AssertionError', 'Header names/values must be of type str (got ' + ctx.repr(v) + ')', '');
  if (NAME_BAD.test(k) || VALUE_BAD.test(v)) ctx.err('ValueError', 'Control characters not allowed in headers', '');
}
function pairsOf(ctx, v) {
  // list/tuple of 2-element list/tuple
  const items = ctx.listOf(v);
  if (!items) return null;
  const out = [];
  for (const it of items) {
    const kv = ctx.listOf(it);
    if (!kv || kv.length !== 2) return null;
    out.push([kv[0], kv[1]]);
  }
  return out;
}
// CPython の _formatparam(param, value, quote=1)：add_header 経由では空でない値を常に引用する。
function formatParam(k, v) {
  if (v === null || v === undefined) return k;
  if (typeof v !== 'string') v = String(v);
  if (v.length > 0) return k + '="' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  return k;
}
function findAll(d, name) {
  const ln = name.toLowerCase();
  return d.pairs.filter(([k]) => k.toLowerCase() === ln);
}
function headersDef() {
  return {
    typeName: 'Headers',
    construct(ctx, args, kwargs) {
      noKw(ctx, kwargs, 'Headers');
      let pairs = [];
      if (args.length > 1) ctx.err('TypeError', 'Headers() takes at most 1 argument (' + args.length + ' given)', '');
      if (args.length === 1) {
        const a = args[0];
        if (isUnk(a)) return UNK('Headers');
        if (!isList(a) && !ctx.isTuple(a)) ctx.err('TypeError', 'Headers must be a list of name/value tuples', '');
        const ps = pairsOf(ctx, a);
        if (ps === null) ctx.err('TypeError', 'Headers must be a list of name/value tuples', '');
        for (const [k, v] of ps) checkPair(ctx, k, v);
        pairs = ps;
      }
      return ctx.native('wsgiref.headers.Headers', { pairs });
    },
    methods: {
      get_all: (ctx, self, args, kwargs) => {
        noKw(ctx, kwargs, 'get_all');
        if (args.length !== 1) ctx.err('TypeError', 'get_all() takes exactly one argument (' + args.length + ' given)', '');
        const name = args[0];
        if (isUnk(name)) return UNK('get_all');
        if (typeof name !== 'string') ctx.err('AttributeError', "'" + ctx.typeName(name) + "' object has no attribute 'lower'", '');
        return LIST(findAll(self.data, name).map(([, v]) => v));
      },
      get: (ctx, self, args, kwargs) => {
        noKw(ctx, kwargs, 'get');
        if (args.length < 1 || args.length > 2) ctx.err('TypeError', 'get() takes 1 to 2 arguments (' + args.length + ' given)', '');
        const name = args[0];
        if (isUnk(name)) return UNK('get');
        if (typeof name !== 'string') ctx.err('AttributeError', "'" + ctx.typeName(name) + "' object has no attribute 'lower'", '');
        const found = findAll(self.data, name);
        if (found.length) return found[0][1];
        return args.length === 2 ? args[1] : NONE;
      },
      keys: (ctx, self, args, kwargs) => { noKw(ctx, kwargs, 'keys'); return LIST(self.data.pairs.map(([k]) => k)); },
      values: (ctx, self, args, kwargs) => { noKw(ctx, kwargs, 'values'); return LIST(self.data.pairs.map(([, v]) => v)); },
      items: (ctx, self, args, kwargs) => { noKw(ctx, kwargs, 'items'); return LIST(self.data.pairs.map(([k, v]) => TUPLE([k, v]))); },
      setdefault: (ctx, self, args, kwargs) => {
        noKw(ctx, kwargs, 'setdefault');
        if (args.length < 1 || args.length > 2) ctx.err('TypeError', 'setdefault() takes 1 to 2 arguments (' + args.length + ' given)', '');
        const [name, value] = args;
        if (isUnk(name) || isUnk(value)) return UNK('setdefault');
        const found = typeof name === 'string' ? findAll(self.data, name) : [];
        if (found.length) return found[0][1];
        const v = args.length === 2 ? value : NONE;
        if (typeof name === 'string' && typeof v === 'string') checkPair(ctx, name, v);
        self.data.pairs.push([name, v]);
        return v;
      },
      add_header: (ctx, self, args, kwargs) => {
        if (args.length !== 2) ctx.err('TypeError', 'add_header() takes exactly two arguments (' + args.length + ' given)', '');
        const [name, value] = args;
        if (isUnk(name) || isUnk(value)) return UNK('add_header');
        const parts = [];
        if (!isNone(value)) parts.push(ctx.strOf(value));
        for (const [pk, pv] of Object.entries(kwargs || {})) {
          const key = pk.replace(/_/g, '-');
          if (isNone(pv)) parts.push(formatParam(key, null));
          else if (typeof pv === 'string' && pv === '') parts.push(key);
          else parts.push(formatParam(key, ctx.strOf(pv)));
        }
        const v = parts.join('; ');
        if (typeof name === 'string' && typeof v === 'string') checkPair(ctx, name, v);
        self.data.pairs.push([name, v]);
        return NONE;
      },
      __contains__: (ctx, self, args, kwargs) => {
        const name = args[0];
        if (isUnk(name)) return UNK('__contains__');
        if (typeof name !== 'string') ctx.err('AttributeError', "'" + ctx.typeName(name) + "' object has no attribute 'lower'", '');
        return BOOL(findAll(self.data, name).length > 0);
      },
    },
    repr: (ctx, self) => 'Headers(' + ctx.repr(LIST(self.data.pairs.map(([k, v]) => TUPLE([k, v])))) + ')',
    str: (ctx, self) => self.data.pairs.map(([k, v]) => k + ': ' + v + '\r\n').join('') + '\r\n',
    len: (ctx, self) => self.data.pairs.length,
    getitem: (ctx, self, key) => {
      if (isUnk(key)) return UNK('__getitem__');
      if (typeof key !== 'string') ctx.err('AttributeError', "'" + ctx.typeName(key) + "' object has no attribute 'lower'", '');
      const found = findAll(self.data, key);
      return found.length ? found[0][1] : NONE;
    },
    setitem: (ctx, self, key, value) => {
      if (typeof key === 'string' && typeof value === 'string') checkPair(ctx, key, value);
      const ln = typeof key === 'string' ? key.toLowerCase() : null;
      self.data.pairs = self.data.pairs.filter(([k]) => typeof k !== 'string' || k.toLowerCase() !== ln);
      self.data.pairs.push([key, value]);
      return true;
    },
    contains: (ctx, self, item) => {
      if (isUnk(item)) return null;
      if (typeof item !== 'string') ctx.err('AttributeError', "'" + ctx.typeName(item) + "' object has no attribute 'lower'", '');
      return findAll(self.data, item).length > 0;
    },
  };
}

registerStdlibModule('wsgiref.headers', {
  classes: { Headers: headersDef() },
});
