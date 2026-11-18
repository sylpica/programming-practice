/* 高度モード B7 G4：contextvars モジュール（17件）。
 * エンジンに文脈伝播の概念はないため、モジュールレベルの単一の現在文脈
 * （JS Map：ContextVar の限定名 → 値）として再現する。Context は値の写像の
 * スナップショットを持ち、run は現在文脈を差し替えてコールバックを実行する。
 * Token の再利用・別変数のトークンの reset は CPython どおりエラーにする。 */
import { registerStdlibModule, makeNative } from './stdlib-registry.js';
import { NONE, BOOL, LIST, TUPLE, isNone, arity, noKwargs } from './impl-advanced-g4-common.js';

let CURRENT = new Map(); /* ContextVar 限定名 -> 値 */
let varSeq = 0;

function varKey(self) { return self.data.key; }

const ContextVarDef = {
  typeName: 'ContextVar',
  construct: (ctx, args, kwargs) => {
    arity(ctx, args, 1, 1, 'ContextVar');
    if (typeof args[0] !== 'string') ctx.err('TypeError', 'context variable name must be a str', 'ContextVar の名前には文字列を使ってください');
    const hasDefault = kwargs && 'default' in kwargs;
    const key = 'contextvars.ContextVar#' + (varSeq++);
    const self = makeNative('contextvars.ContextVar', { key, name: args[0], hasDefault, def: hasDefault ? kwargs.default : null });
    return self;
  },
  methods: {
    get: (ctx, self, args) => {
      arity(ctx, args, 0, 1, 'get');
      const key = varKey(self);
      if (CURRENT.has(key)) return CURRENT.get(key);
      if (args.length === 1) return args[0];
      if (self.data.hasDefault) return self.data.def;
      ctx.err('LookupError', '<ContextVar name=' + ctx.repr(self.data.name) + '>', '値が設定されていない ContextVar です');
    },
    set: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'set');
      const key = varKey(self);
      const had = CURRENT.has(key);
      const old = had ? CURRENT.get(key) : null;
      CURRENT.set(key, args[0]);
      return makeNative('contextvars.Token', { varKey: key, varRef: self, had, old, used: false });
    },
    reset: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'reset');
      const tok = args[0];
      if (!tok || tok.__native !== 'contextvars.Token') ctx.err('TypeError', 'reset() には Token を渡してください', '');
      if (tok.data.varKey !== varKey(self)) ctx.err('ValueError', 'Token was created by a different ContextVar', '');
      if (tok.data.used) ctx.err('RuntimeError', 'Token has already been used once', '');
      tok.data.used = true;
      if (tok.data.had) CURRENT.set(varKey(self), tok.data.old);
      else CURRENT.delete(varKey(self));
      return NONE;
    },
  },
  attrs: {
    name: (ctx, self) => self.data.name,
  },
  repr: (ctx, self) => '<ContextVar name=' + ctx.repr(self.data.name) + '>',
  truthy: () => true,
};

const TokenDef = {
  typeName: 'Token',
  construct: (ctx) => ctx.err('TypeError', 'Token は ContextVar.set() の戻り値としてだけ得られます', ''),
  attrs: {
    var: (ctx, self) => self.data.varRef,
    old_value: (ctx, self) => (self.data.had ? self.data.old : TokenMissing),
  },
  classAttrs: {
    MISSING: () => TokenMissing,
  },
  repr: (ctx, self) => '<Token used=' + (self.data.used ? 'True' : 'False') + '>',
  truthy: () => true,
};
const TokenMissing = makeNative('contextvars.Token.MISSING', {});
import { registerStdlibClass as regCls } from './stdlib-registry.js';
regCls('contextvars.Token.MISSING', { typeName: 'Token.MISSING', repr: () => '<Token.MISSING>', truthy: () => true });

const ContextDef = {
  typeName: 'Context',
  construct: (ctx, args) => {
    arity(ctx, args, 0, 0, 'Context');
    return ctx.native('contextvars.Context', { map: new Map() });
  },
  methods: {
    run: (ctx, self, args) => {
      if (!args.length) ctx.err('TypeError', 'run() には呼び出し可能オブジェクトを渡してください', '');
      const fn = args[0];
      const rest = args.slice(1);
      const saved = CURRENT;
      CURRENT = new Map(self.data.map);
      try {
        const r = ctx.call(fn, rest);
        self.data.map = new Map(CURRENT);
        return r;
      } finally {
        CURRENT = saved;
      }
    },
    copy: (ctx, self) => ctx.native('contextvars.Context', { map: new Map(self.data.map) }),
    get: (ctx, self, args) => {
      /* CPython の Context.get は変数の既定値へはフォールバックしない（3.12.3 実走で確認） */
      arity(ctx, args, 1, 2, 'get');
      const v = args[0];
      if (!v || v.__native !== 'contextvars.ContextVar') ctx.err('TypeError', 'get() には ContextVar を渡してください', '');
      const key = v.data.key;
      if (self.data.map.has(key)) return self.data.map.get(key);
      return args.length === 2 ? args[1] : NONE;
    },
    keys: (ctx, self) => {
      const out = [];
      /* Context のキーは ContextVar オブジェクト列。内部キーからは varRef を辿れないため
       * 登録済み変数のうちこの写像に含まれるものを返す */
      for (const vr of ALL_VARS) if (self.data.map.has(vr.data.key)) out.push(vr);
      return LIST(out);
    },
    values: (ctx, self) => {
      const out = [];
      for (const vr of ALL_VARS) if (self.data.map.has(vr.data.key)) out.push(self.data.map.get(vr.data.key));
      return LIST(out);
    },
    items: (ctx, self) => {
      const out = [];
      for (const vr of ALL_VARS) if (self.data.map.has(vr.data.key)) out.push(TUPLE([vr, self.data.map.get(vr.data.key)]));
      return LIST(out);
    },
  },
  getitem: (ctx, self, key) => {
    /* CPython の Context[var] は変数の既定値を使わず、未設定なら KeyError（実走で確認） */
    if (!key || key.__native !== 'contextvars.ContextVar') ctx.err('TypeError', 'Context の添字には ContextVar を使ってください', '');
    if (self.data.map.has(key.data.key)) return self.data.map.get(key.data.key);
    ctx.err('KeyError', ctx.repr(key), '');
  },
  len: (ctx, self) => self.data.map.size,
  contains: (ctx, self, item) => !!(item && item.__native === 'contextvars.ContextVar' && self.data.map.has(item.data.key)),
  truthy: () => true,
};
const ALL_VARS = [];
const OrigConstruct = ContextVarDef.construct;
ContextVarDef.construct = (ctx, args, kwargs) => {
  const v = OrigConstruct(ctx, args, kwargs);
  if (v && v.__native === 'contextvars.ContextVar') ALL_VARS.push(v);
  return v;
};

function copyContextFn(ctx, args) {
  arity(ctx, args, 0, 0, 'copy_context');
  return ctx.native('contextvars.Context', { map: new Map(CURRENT) });
}

registerStdlibModule('contextvars', {
  functions: { copy_context: copyContextFn },
  classes: { ContextVar: ContextVarDef, Token: TokenDef, Context: ContextDef },
});
