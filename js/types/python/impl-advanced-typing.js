/* 高度モード B7 G8：typing モジュール（全151件）。
 * 一次情報：公式ドキュメント 3.15（library/typing）と CPython 3.12.3 実走
 * （repr／get_origin／get_args は全形式を実走で照合。NoDefault／
 * NoExtraItems／TypeIs／ReadOnly／TypeForm は 3.13〜3.14 の追加で、
 * ドキュメントで裏付けた）。
 * 方針：特殊形式と generic alias は値として忠実に再現し（repr・
 * get_origin・get_args・等価性）、TypeVar／ParamSpec／NewType／
 * TypedDict／NamedTuple（いずれも関数形式）・ForwardRef は値オブジェ
 * クトとして実装する。注釈の評価（get_type_hints 等）と Protocol の
 * isinstance 意味論はエンジンに接続できないため未検証に倒す。
 * エンジンには PEP 585 の組み込み型添字（list[int] 等）がないため、
 * 引数に現れるエイリアスは typing 形式（typing.Tuple[int, ...] 等）で
 * 表され、repr も typing 形式になる（CPython との既知の差異）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, registerStdlibClass, makeNative as _makeNative } from './stdlib-registry.js';
import { I, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK, unverifiedFn, unverifiedClassDef } from './impl-advanced-g8-common.js';

const { dictSet, dictGet, dictKeyId } = PyAPI;
const NONETYPE = { __type: 'NoneType' };
const isEllipsisVal = (v) => !!v && v.__ellipsis === true;
const isNoneTypeVal = (v) => v === NONETYPE || (!!v && v.__type === 'NoneType');
function normalizeArg(v) {
  if (PyAPI.isNone(v)) return NONETYPE;
  return v;
}
function isUnionNative(v) { return !!v && v.__native === 'typing._GenericAlias' && v.data.kind === 'union'; }
function isAliasNative(v) { return !!v && v.__native === 'typing._GenericAlias'; }
function argRepr(ctx, v) {
  if (PyAPI.isNone(v) || isNoneTypeVal(v)) return 'NoneType';
  if (isEllipsisVal(v)) return '...';
  if (PyAPI.isList(v)) return '[' + v.__list.map((x) => argRepr(ctx, x)).join(', ') + ']';
  /* 型引数の repr は CPython の _type_repr に合わせる（エンジン全般の
   * 型値 repr「組み込み関数 int」等は typing の repr には持ち込まない） */
  if (v && v.__builtin) return v.__builtin;
  if (v && v.__type) return v.__type;
  if (v && v.__ncls) return v.__ncls;
  if (v && v.__class) return v.cname || ctx.repr(v);
  return ctx.repr(v);
}
function argsEqual(ctx, a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x === y) continue;
    if (isNoneTypeVal(x) && isNoneTypeVal(y)) continue;
    if (ctx.eq(x, y) !== true) return false;
  }
  return true;
}
function aliasHash(ctx, origin, args) {
  const ids = args.map((a) => dictKeyId(isNoneTypeVal(a) ? NONETYPE : a));
  if (ids.some((x) => x === null)) return null;
  return 'alias:' + ctx.repr(origin) + ':' + ids.join(',');
}

/* ---------- generic alias（typing._GenericAlias） ---------- */
function unionRepr(ctx, args) {
  const hasNone = args.some((a) => isNoneTypeVal(a));
  if (hasNone && args.length === 2) {
    const other = args.find((a) => !isNoneTypeVal(a));
    return 'typing.Optional[' + argRepr(ctx, other) + ']';
  }
  return 'typing.Union[' + args.map((a) => argRepr(ctx, a)).join(', ') + ']';
}
function makeUnion(ctx, rawArgs) {
  let args = [];
  for (const a of rawArgs) {
    if (isUnionNative(a)) args.push(...a.data.args);
    else if (a && a.__union) args.push(...a.__union.map(normalizeArg));
    else if (typeof a === 'string') args.push(makeForwardRef(ctx, a));
    else args.push(normalizeArg(a));
  }
  const deduped = [];
  for (const a of args) if (!deduped.some((x) => x === a || (isNoneTypeVal(x) && isNoneTypeVal(a)) || ctx.eq(x, a) === true)) deduped.push(a);
  if (!deduped.length) ctx.err('TypeError', 'Union[arg, ...]: at least one argument is required', '');
  if (deduped.length === 1) return deduped[0];
  return ctx.native('typing._GenericAlias', { kind: 'union', origin: null, args: deduped, reprStr: unionRepr(ctx, deduped) });
}
function makeAlias(ctx, kind, origin, args, reprStr) {
  return ctx.native('typing._GenericAlias', { kind, origin, args, reprStr });
}
const genericAliasDef = {
  typeName: '_GenericAlias',
  repr: (ctx, self) => self.data.reprStr,
  str: (ctx, self) => self.data.reprStr,
  eq: (ctx, self, other) => {
    if (!isAliasNative(other)) return null;
    if (self.data.kind !== other.data.kind) return false;
    if (self.data.kind === 'union') return argsEqual(ctx, self.data.args, other.data.args);
    if (ctx.eq(self.data.origin, other.data.origin) !== true && self.data.origin !== other.data.origin) return false;
    return argsEqual(ctx, self.data.args, other.data.args);
  },
  hash: (ctx, self) => aliasHash(ctx, self.data.kind === 'union' ? 'typing.Union' : self.data.origin, self.data.args),
};
registerStdlibClass('typing._GenericAlias', genericAliasDef);

/* ---------- ForwardRef ---------- */
function makeForwardRef(ctx, arg) {
  return ctx.native('typing.ForwardRef', { arg });
}
const forwardRefDef = {
  typeName: 'ForwardRef',
  construct: (ctx, args, kwargs) => {
    const arg = args[0];
    if (typeof arg !== 'string') ctx.err('TypeError', 'Forward reference must be a string -- got ' + ctx.repr(arg), '');
    return makeForwardRef(ctx, arg);
  },
  attrs: {
    __forward_arg__: (ctx, self) => self.data.arg,
    __forward_evaluated__: () => BOOL(false),
    __forward_module__: () => NONE,
  },
  repr: (ctx, self) => 'ForwardRef(' + ctx.repr(self.data.arg) + ')',
  eq: (ctx, self, other) => (other && other.__native === 'typing.ForwardRef') ? self.data.arg === other.data.arg : null,
  hash: (ctx, self) => 's:' + self.data.arg,
};
registerStdlibClass('typing.ForwardRef', forwardRefDef);

/* ---------- 特殊形式（typing._SpecialForm） ---------- */
const FORM_DEFS = {
  Any: {}, Never: {}, NoReturn: {}, Self: {}, LiteralString: {}, TypeAlias: {},
  NoDefault: {}, NoExtraItems: {},
  Union: { getitem: 'union' }, Optional: { getitem: 'optional' },
  Annotated: { getitem: 'annotated', bareRepr: "<class 'typing.Annotated'>" },
  ClassVar: { getitem: 'single' }, Final: { getitem: 'single' },
  Literal: { getitem: 'literal' }, Callable: { getitem: 'callable' },
  Concatenate: { getitem: 'multi' }, TypeGuard: { getitem: 'single' },
  TypeIs: { getitem: 'single' }, ReadOnly: { getitem: 'single' },
  Required: { getitem: 'single' }, NotRequired: { getitem: 'single' },
  Unpack: { getitem: 'single' }, TypeForm: { getitem: 'single' },
};
const ALIAS_DEFS = {
  List: 'list', Dict: 'dict', Set: 'set', FrozenSet: 'frozenset', Tuple: 'tuple', Type: 'type',
  Deque: 'collections.deque', DefaultDict: 'collections.defaultdict', Counter: 'collections.Counter',
  OrderedDict: 'collections.OrderedDict', ChainMap: 'collections.ChainMap',
  Iterable: 'collections.abc.Iterable', Iterator: 'collections.abc.Iterator',
  Collection: 'collections.abc.Collection', Mapping: 'collections.abc.Mapping',
  MutableMapping: 'collections.abc.MutableMapping', Sequence: 'collections.abc.Sequence',
  MutableSequence: 'collections.abc.MutableSequence', AbstractSet: 'collections.abc.Set',
  MutableSet: 'collections.abc.MutableSet', Container: 'collections.abc.Container',
  Reversible: 'collections.abc.Reversible', Generator: 'collections.abc.Generator',
  AsyncIterable: 'collections.abc.AsyncIterable', AsyncIterator: 'collections.abc.AsyncIterator',
  AsyncGenerator: 'collections.abc.AsyncGenerator', Awaitable: 'collections.abc.Awaitable',
  Coroutine: 'collections.abc.Coroutine', MappingView: 'collections.abc.MappingView',
  KeysView: 'collections.abc.KeysView', ItemsView: 'collections.abc.ItemsView',
  ValuesView: 'collections.abc.ValuesView', ByteString: 'collections.abc.ByteString',
  ContextManager: 'contextlib.AbstractContextManager',
  AsyncContextManager: 'contextlib.AbstractAsyncContextManager',
  Pattern: 're.Pattern', Match: 're.Match',
};
const NONGENERIC = { Hashable: 'collections.abc.Hashable', Sized: 'collections.abc.Sized' };
const SUPPORTS = ['SupportsAbs', 'SupportsBytes', 'SupportsComplex', 'SupportsFloat', 'SupportsIndex', 'SupportsInt', 'SupportsRound'];

const formValues = {};
function originValue(ctx, originName) {
  if (['list', 'dict', 'set', 'frozenset', 'tuple', 'type'].includes(originName)) return { __builtin: originName };
  return ctx.ncls(originName);
}
function makeForm(name, extra) {
  return _makeNative('typing._SpecialForm', { form: name, ...(extra || {}) });
}
const specialFormDef = {
  typeName: '_SpecialForm',
  repr: (ctx, self) => self.data.bareRepr || ('typing.' + self.data.form),
  str: (ctx, self) => self.data.bareRepr || ('typing.' + self.data.form),
  getitem: (ctx, self, key) => {
    const form = self.data.form;
    const mode = self.data.getitemMode;
    if (self.data.aliasOriginName) {
      const args = PyAPI.isTuple(key) ? key.__tuple.slice() : [key];
      const origin = originValue(ctx, self.data.aliasOriginName);
      if (form === 'Tuple' && args.length === 1 && PyAPI.isTuple(args[0]) && !args[0].__tuple.length) {
        return makeAlias(ctx, 'generic', origin, [], 'typing.Tuple[()]');
      }
      const normArgs = args.map(normalizeArg);
      const reprStr = 'typing.' + form + '[' + normArgs.map((a) => argRepr(ctx, a)).join(', ') + ']';
      return makeAlias(ctx, 'generic', origin, form === 'Tuple' && args.length === 1 && PyAPI.isTuple(args[0]) && !args[0].__tuple.length ? [] : normArgs, reprStr);
    }
    if (!mode) return ctx.NOT_HANDLED;
    if (mode === 'union') {
      const args = PyAPI.isTuple(key) ? key.__tuple.slice() : [key];
      return makeUnion(ctx, args);
    }
    if (mode === 'optional') {
      return makeUnion(ctx, [key, NONE]);
    }
    if (mode === 'annotated') {
      const args = PyAPI.isTuple(key) ? key.__tuple.slice() : null;
      if (!args || args.length < 2) ctx.err('TypeError', 'Annotated[...] requires at least two arguments', '');
      let base = args[0];
      let meta = args.slice(1);
      if (isAliasNative(base) && base.data.kind === 'annotated') { meta = [...base.data.args.slice(1), ...meta]; base = base.data.args[0]; }
      const all = [base, ...meta];
      return makeAlias(ctx, 'annotated', formValues.Annotated, all, 'typing.Annotated[' + all.map((a) => argRepr(ctx, a)).join(', ') + ']');
    }
    if (mode === 'literal') {
      const raw = PyAPI.isTuple(key) ? key.__tuple.slice() : [key];
      const flat = [];
      for (const a of raw) {
        if (isAliasNative(a) && a.data.kind === 'literal') flat.push(...a.data.args);
        else flat.push(a);
      }
      const deduped = [];
      for (const a of flat) {
        if (dictKeyId(a) === null && !PyAPI.isNone(a)) ctx.err('TypeError', "unhashable type: '" + ctx.typeName(a) + "'", '');
        if (!deduped.some((x) => ctx.eq(x, a) === true)) deduped.push(a);
      }
      return makeAlias(ctx, 'literal', formValues.Literal, deduped, 'typing.Literal[' + deduped.map((a) => ctx.repr(a)).join(', ') + ']');
    }
    if (mode === 'callable') {
      const args = PyAPI.isTuple(key) ? key.__tuple.slice() : null;
      if (!args || args.length !== 2) ctx.err('TypeError', 'Callable must be used as Callable[[argtypes], result]', '');
      const [params, ret] = args;
      let paramsRepr;
      if (isEllipsisVal(params)) paramsRepr = '...';
      else if (PyAPI.isList(params)) paramsRepr = '[' + params.__list.map((a) => argRepr(ctx, a)).join(', ') + ']';
      else if (isAliasNative(params) && params.data.kind === 'concatenate') paramsRepr = argRepr(ctx, params);
      else ctx.err('TypeError', 'Callable must be used as Callable[[argtypes], result]', '');
      const normArgs = [params, normalizeArg(ret)];
      return makeAlias(ctx, 'callable', ctx.ncls('collections.abc.Callable'), normArgs, 'typing.Callable[' + paramsRepr + ', ' + argRepr(ctx, ret) + ']');
    }
    /* single / multi */
    const args = PyAPI.isTuple(key) ? key.__tuple.slice() : [key];
    const normArgs = args.map(normalizeArg);
    return makeAlias(ctx, 'special', formValues[form], normArgs, 'typing.' + form + '[' + normArgs.map((a) => argRepr(ctx, a)).join(', ') + ']');
  },
};
registerStdlibClass('typing._SpecialForm', specialFormDef);
for (const [name, def] of Object.entries(FORM_DEFS)) {
  formValues[name] = makeForm(name, { getitemMode: def.getitem || null, bareRepr: def.bareRepr || null });
}
for (const [name, originName] of Object.entries(ALIAS_DEFS)) {
  formValues[name] = makeForm(name, { aliasOriginName: originName, aliasObject: name === 'ByteString' });
}
for (const [name, originName] of Object.entries(NONGENERIC)) {
  formValues[name] = makeForm(name, { aliasOriginName: originName, nongeneric: true, aliasObject: true });
}
/* Hashable／Sized は generic ではない（CPython の TypeError を再現） */
specialFormDef.getitem = ((orig) => (ctx, self, key) => {
  if (self.data.nongeneric) ctx.err('TypeError', 'typing.' + self.data.form + ' is not a generic class', '');
  return orig(ctx, self, key);
})(specialFormDef.getitem);
/* Supports* プロトコルクラス：値として存在し、添字で alias を作る */
const supportsValues = {};
for (const name of SUPPORTS) {
  /* Supports* は CPython ではクラス（repr は <class 'typing.X'>） */
  supportsValues[name] = makeForm(name, { getitemMode: 'single', protocolClass: true, bareRepr: "<class 'typing." + name + "'>" });
}
/* IO はクラスだが添字を取る。TextIO／BinaryIO はクラス値そのもの */
formValues.IO = makeForm('IO', { getitemMode: 'io', bareRepr: "<class 'typing.IO'>" });
specialFormDef.getitem = ((prev) => (ctx, self, key) => {
  if (self.data.getitemMode === 'io') {
    const args = PyAPI.isTuple(key) ? key.__tuple.slice() : [key];
    const normArgs = args.map(normalizeArg);
    const alias = makeAlias(ctx, 'special', self, normArgs, 'typing.IO[' + normArgs.map((a) => argRepr(ctx, a)).join(', ') + ']');
    return alias;
  }
  return prev(ctx, self, key);
})(specialFormDef.getitem);

/* ---------- TypeVar／ParamSpec／TypeVarTuple ---------- */
function typeVarLikeDef(qualname, typeName, opt) {
  return {
    typeName,
    construct: (ctx, args, kwargs) => {
      const name = args[0];
      if (typeof name !== 'string') ctx.err('TypeError', typeName + ' name must be a string', '');
      const constraints = opt.constraints ? args.slice(1) : [];
      if (opt.constraints && constraints.length === 1) ctx.err('TypeError', 'TypeVar with a single constraint is not allowed', '');
      let bound = null;
      if ('bound' in kwargs) bound = kwargs.bound;
      if (opt.constraints && bound !== null && constraints.length) ctx.err('TypeError', 'TypeVar with both constraints and bound is not allowed', '');
      const data = {
        name, constraints, bound,
        covariant: ('covariant' in kwargs) && ctx.truthy(kwargs.covariant) === true,
        contravariant: ('contravariant' in kwargs) && ctx.truthy(kwargs.contravariant) === true,
        inferVariance: ('infer_variance' in kwargs) && ctx.truthy(kwargs.infer_variance) === true,
        default: ('default' in kwargs) ? kwargs.default : undefined,
      };
      return ctx.native(qualname, data);
    },
    attrs: {
      __name__: (ctx, self) => self.data.name,
      __bound__: (ctx, self) => self.data.bound === null || self.data.bound === undefined ? NONE : self.data.bound,
      __constraints__: (ctx, self) => TUPLE(self.data.constraints || []),
      __covariant__: (ctx, self) => BOOL(self.data.covariant),
      __contravariant__: (ctx, self) => BOOL(self.data.contravariant),
      __infer_variance__: (ctx, self) => BOOL(self.data.inferVariance),
      __default__: (ctx, self) => self.data.default === undefined ? formValues.NoDefault : self.data.default,
    },
    methods: {
      has_default: (ctx, self) => BOOL(self.data.default !== undefined),
      evaluate_default: unverifiedFn(qualname + '.evaluate_default', 'デフォルト値の評価には評価コンテキストが必要で、エンジンでは再現できない'),
      evaluate_bound: unverifiedFn(qualname + '.evaluate_bound', '境界の評価には評価コンテキストが必要で、エンジンでは再現できない'),
      evaluate_constraints: unverifiedFn(qualname + '.evaluate_constraints', '制約の評価には評価コンテキストが必要で、エンジンでは再現できない'),
    },
    repr: (ctx, self) => opt.reprPrefix + self.data.name,
  };
}
const typeVarDef = typeVarLikeDef('typing.TypeVar', 'TypeVar', { constraints: true, reprPrefix: '~' });
const typeVarTupleDef = typeVarLikeDef('typing.TypeVarTuple', 'TypeVarTuple', { constraints: false, reprPrefix: '' });
const paramSpecDef = {
  typeName: 'ParamSpec',
  construct: (ctx, args, kwargs) => {
    const name = args[0];
    if (typeof name !== 'string') ctx.err('TypeError', 'ParamSpec name must be a string', '');
    const data = {
      name,
      bound: ('bound' in kwargs) ? kwargs.bound : null,
      covariant: ('covariant' in kwargs) && ctx.truthy(kwargs.covariant) === true,
      contravariant: ('contravariant' in kwargs) && ctx.truthy(kwargs.contravariant) === true,
      inferVariance: ('infer_variance' in kwargs) && ctx.truthy(kwargs.infer_variance) === true,
      default: ('default' in kwargs) ? kwargs.default : undefined,
    };
    const self = ctx.native('typing.ParamSpec', data);
    data.argsVal = ctx.native('typing.ParamSpecArgs', { owner: self, name });
    data.kwargsVal = ctx.native('typing.ParamSpecKwargs', { owner: self, name });
    return self;
  },
  attrs: {
    __name__: (ctx, self) => self.data.name,
    __bound__: (ctx, self) => self.data.bound === null ? NONE : self.data.bound,
    __covariant__: (ctx, self) => BOOL(self.data.covariant),
    __contravariant__: (ctx, self) => BOOL(self.data.contravariant),
    __infer_variance__: (ctx, self) => BOOL(self.data.inferVariance),
    __default__: (ctx, self) => self.data.default === undefined ? formValues.NoDefault : self.data.default,
    args: (ctx, self) => self.data.argsVal,
    kwargs: (ctx, self) => self.data.kwargsVal,
  },
  methods: {
    has_default: (ctx, self) => BOOL(self.data.default !== undefined),
    evaluate_default: unverifiedFn('typing.ParamSpec.evaluate_default', 'デフォルト値の評価には評価コンテキストが必要で、エンジンでは再現できない'),
  },
  repr: (ctx, self) => '~' + self.data.name,
};
const paramSpecArgsDef = {
  typeName: 'ParamSpecArgs',
  construct: (ctx, args) => {
    const owner = args[0];
    if (!owner || owner.__native !== 'typing.ParamSpec') ctx.err('TypeError', 'ParamSpecArgs() には ParamSpec を使ってください', '');
    return owner.data.argsVal;
  },
  attrs: { __origin__: (ctx, self) => self.data.owner },
  repr: (ctx, self) => self.data.name + '.args',
};
const paramSpecKwargsDef = {
  typeName: 'ParamSpecKwargs',
  construct: (ctx, args) => {
    const owner = args[0];
    if (!owner || owner.__native !== 'typing.ParamSpec') ctx.err('TypeError', 'ParamSpecKwargs() には ParamSpec を使ってください', '');
    return owner.data.kwargsVal;
  },
  attrs: { __origin__: (ctx, self) => self.data.owner },
  repr: (ctx, self) => self.data.name + '.kwargs',
};

/* ---------- NewType／TypedDict／NamedTuple／TypeAliasType ---------- */
const newTypeFn = (ctx, args, kwargs) => {
  if (args.length !== 2) ctx.err('TypeError', 'NewType() の引数の数が合いません', '');
  const [name, tp] = args;
  if (typeof name !== 'string') ctx.err('TypeError', 'NewType() の名前には文字列を使ってください', '');
  return ctx.native('typing.NewType', { name, supertype: tp, g8Class: true });
};
const newTypeProductDef = {
  typeName: 'NewType',
  call: (ctx, self, args) => {
    if (args.length !== 1) ctx.err('TypeError', self.data.name + '() の引数の数が合いません', '');
    return args[0];
  },
  attrs: {
    __supertype__: (ctx, self) => self.data.supertype,
    __name__: (ctx, self) => self.data.name,
    __module__: () => '__main__',
  },
  repr: (ctx, self) => '__main__.' + self.data.name,
};
registerStdlibClass('typing.NewType', newTypeProductDef);

function unwrapMarker(v) {
  if (isAliasNative(v) && v.data.kind === 'special') {
    const origin = v.data.origin;
    if (origin === formValues.Required) return { mark: 'required', inner: v.data.args[0] };
    if (origin === formValues.NotRequired) return { mark: 'notrequired', inner: v.data.args[0] };
    if (origin === formValues.ReadOnly) return { mark: 'readonly', inner: v.data.args[0] };
  }
  return { mark: null, inner: v };
}
const typedDictFn = (ctx, args, kwargs) => {
  const name = args[0];
  if (typeof name !== 'string') ctx.err('TypeError', 'TypedDict() の名前には文字列を使ってください', '');
  let fields = args.length > 1 ? args[1] : null;
  const total = !('total' in kwargs) || ctx.truthy(kwargs.total) !== false;
  const closed = ('closed' in kwargs) && ctx.truthy(kwargs.closed) === true;
  const extraItems = ('extra_items' in kwargs) ? kwargs.extra_items : undefined;
  const fieldMap = new Map();
  if (fields !== null && fields !== undefined) {
    if (PyAPI.isDict(fields)) for (const e of fields.__dict.values()) fieldMap.set(String(e.k), e.v);
    else {
      const items = ctx.iterable(fields);
      if (items === null) ctx.err('TypeError', 'TypedDict() の fields には辞書かペアの並びを使ってください', '');
      for (const pair of items) {
        const p = ctx.iterable(pair);
        if (!p || p.length !== 2) ctx.err('TypeError', 'TypedDict() の fields の要素は (名前, 型) のペアです', '');
        fieldMap.set(String(ctx.strOf(p[0]) === '' ? p[0] : p[0]), p[1]);
      }
    }
  }
  const qualname = 'typing.' + name;
  const required = [], optional = [], readonly = [], mutable = [];
  for (const [fname, ftype] of fieldMap) {
    const { mark } = unwrapMarker(ftype);
    const isReq = mark === 'required' || (total && mark !== 'notrequired');
    (isReq ? required : optional).push(fname);
    (mark === 'readonly' ? readonly : mutable).push(fname);
  }
  const setOf = (names) => SET(names.slice());
  registerStdlibClass(qualname, {
    typeName: name,
    construct: (c2, a2, kw2) => {
      const d = DICT();
      if (a2.length === 1 && PyAPI.isDict(a2[0])) for (const e of a2[0].__dict.values()) dictSet(d, e.k, e.v);
      else if (a2.length) c2.err('TypeError', name + '() の引数の数が合いません', '');
      for (const [k, v] of Object.entries(kw2 || {})) dictSet(d, k, v);
      return d;
    },
    classAttrs: {
      __total__: BOOL(total),
      __required_keys__: setOf(required),
      __optional_keys__: setOf(optional),
      __readonly_keys__: setOf(readonly),
      __mutable_keys__: setOf(mutable),
      __closed__: BOOL(closed),
      __extra_items__: extraItems === undefined ? formValues.NoExtraItems : extraItems,
      __annotations__: (() => { const d = DICT(); for (const [k, v] of fieldMap) dictSet(d, k, v); return d; })(),
    },
  });
  const clsVal = ctx.ncls(qualname);
  clsVal.__g8typedDict = true;
  return clsVal;
};
const namedTupleFn = (ctx, args, kwargs) => {
  const name = args[0];
  if (typeof name !== 'string') ctx.err('TypeError', 'NamedTuple() の名前には文字列を使ってください', '');
  let fieldsInput = args.length > 1 ? args[1] : null;
  const kwNames = Object.keys(kwargs || {});
  if (fieldsInput !== null && kwNames.length) ctx.err('TypeError', 'Either list of fields or keywords can be provided to NamedTuple, not both', '');
  let fieldNames = [];
  if (fieldsInput === null) fieldNames = kwNames.slice();
  else {
    const items = ctx.iterable(fieldsInput);
    if (items === null) ctx.err('TypeError', 'NamedTuple() の fields には名前かペアの並びを使ってください', '');
    for (const it of items) {
      if (typeof it === 'string') fieldNames.push(it);
      else {
        const p = ctx.iterable(it);
        if (!p || p.length < 2) ctx.err('TypeError', 'NamedTuple() の fields の要素は名前か (名前, 型) のペアです', '');
        fieldNames.push(String(p[0]));
      }
    }
  }
  for (const fn of fieldNames) {
    if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(fn) || fn.startsWith('_')) ctx.err('ValueError', "Field names must be valid identifiers and must not start with underscore: '" + fn + "'", '');
  }
  if (new Set(fieldNames).size !== fieldNames.length) ctx.err('ValueError', 'Field names cannot repeat', '');
  const qualname = 'typing.' + name;
  const attrs = {};
  fieldNames.forEach((fn, idx) => { attrs[fn] = (c2, self) => self.data.values[idx]; });
  registerStdlibClass(qualname, {
    typeName: name,
    construct: (c2, a2, kw2) => {
      const values = new Array(fieldNames.length).fill(undefined);
      a2.forEach((v, i) => { if (i < values.length) values[i] = v; });
      if (a2.length > fieldNames.length) c2.err('TypeError', name + '() の引数の数が合いません', '');
      for (const [k, v] of Object.entries(kw2 || {})) {
        const idx = fieldNames.indexOf(k);
        if (idx < 0) c2.err('TypeError', name + "() got an unexpected keyword argument '" + k + "'", '');
        if (values[idx] !== undefined) c2.err('TypeError', name + "() got multiple values for argument '" + k + "'", '');
        values[idx] = v;
      }
      if (values.some((v) => v === undefined)) c2.err('TypeError', name + '() の引数が不足しています', '');
      return c2.native(qualname, { fields: fieldNames, values });
    },
    attrs,
    classAttrs: {
      _fields: TUPLE(fieldNames.slice()),
      _field_defaults: DICT(),
    },
    classMethods: {
      _make: (c2, a2) => {
        const items = c2.iterable(a2[0]);
        if (items === null || items.length !== fieldNames.length) c2.err('TypeError', name + '._make() の要素数が合いません', '');
        return c2.native(qualname, { fields: fieldNames, values: items.slice() });
      },
    },
    methods: {
      _asdict: (c2, self) => { const d = DICT(); self.data.fields.forEach((fn, i) => dictSet(d, fn, self.data.values[i])); return d; },
      _replace: (c2, self, a2, kw2) => {
        const values = self.data.values.slice();
        for (const [k, v] of Object.entries(kw2 || {})) {
          const idx = fieldNames.indexOf(k);
          if (idx < 0) c2.err('ValueError', "Got unexpected field names: ['" + k + "']", '');
          values[idx] = v;
        }
        return c2.native(qualname, { fields: fieldNames, values });
      },
    },
    repr: (c2, self) => name + '(' + self.data.fields.map((fn, i) => fn + '=' + c2.repr(self.data.values[i])).join(', ') + ')',
    eq: (c2, self, other) => {
      if (PyAPI.isTuple(other)) return argsEqual(c2, self.data.values, other.__tuple);
      if (other && other.__native === qualname) return argsEqual(c2, self.data.values, other.data.values);
      return null;
    },
    hash: (c2, self) => dictKeyId(TUPLE(self.data.values)),
    len: (c2, self) => self.data.values.length,
    iter: (c2, self) => self.data.values.slice(),
    getitem: (c2, self, key) => {
      if (c2.isNum(key)) {
        let idx = c2.int(key);
        if (idx < 0) idx += self.data.values.length;
        if (idx < 0 || idx >= self.data.values.length) c2.err('IndexError', 'tuple index out of range', '');
        return self.data.values[idx];
      }
      return c2.NOT_HANDLED;
    },
  });
  const clsVal = ctx.ncls(qualname);
  return clsVal;
};
const typeAliasTypeDef = {
  typeName: 'TypeAliasType',
  construct: (ctx, args, kwargs) => {
    const name = args[0];
    const value = args[1];
    if (typeof name !== 'string') ctx.err('TypeError', 'TypeAliasType() の名前には文字列を使ってください', '');
    let typeParams = [];
    if ('type_params' in kwargs) { const items = ctx.iterable(kwargs.type_params); typeParams = items ? items.slice() : []; }
    return ctx.native('typing.TypeAliasType', { name, value, typeParams, g8Class: true });
  },
  attrs: {
    __name__: (ctx, self) => self.data.name,
    __module__: () => '__main__',
    __qualname__: (ctx, self) => self.data.name,
    __type_params__: (ctx, self) => TUPLE(self.data.typeParams),
    __value__: (ctx, self) => self.data.value,
  },
  methods: {
    evaluate_value: unverifiedFn('typing.TypeAliasType.evaluate_value', 'エイリアス値の評価には評価コンテキストが必要で、エンジンでは再現できない'),
  },
  getitem: (ctx, self, key) => {
    if (!self.data.typeParams.length) ctx.err('TypeError', 'Only generic type aliases are subscriptable', '');
    const args = PyAPI.isTuple(key) ? key.__tuple.slice() : [key];
    const normArgs = args.map(normalizeArg);
    return makeAlias(ctx, 'aliastype', self, normArgs, self.data.name + '[' + normArgs.map((a) => argRepr(ctx, a)).join(', ') + ']');
  },
  repr: (ctx, self) => self.data.name,
};

/* ---------- 関数 ---------- */
function returnArg(fname) {
  return (ctx, args, kwargs) => {
    if (args.length !== 1) ctx.err('TypeError', fname + '() の引数の数が合いません', '');
    return args[0];
  };
}
const identityDecoratorDef = {
  typeName: '_IdentityDecorator',
  call: (ctx, self, args) => args[0],
  repr: () => '<typing decorator>',
};
registerStdlibClass('typing._IdentityDecorator', identityDecoratorDef);
const FUNCTIONS = {
  cast: (ctx, args) => { if (args.length !== 2) ctx.err('TypeError', 'cast() の引数の数が合いません', ''); return args[1]; },
  assert_type: (ctx, args) => { if (args.length !== 2) ctx.err('TypeError', 'assert_type() の引数の数が合いません', ''); return args[0]; },
  assert_never: (ctx, args) => { ctx.err('AssertionError', 'Expected code to be unreachable, but got: ' + (args.length ? ctx.strOf(args[0]) : ''), ''); return UNK(); },
  reveal_type: (ctx, args) => { if (args.length) ctx.diag("reveal_type: Runtime type is '" + ctx.typeName(args[0]) + "'"); return args.length ? args[0] : NONE; },
  final: returnArg('typing.final'),
  override: returnArg('typing.override'),
  type_check_only: returnArg('typing.type_check_only'),
  no_type_check: returnArg('typing.no_type_check'),
  disjoint_base: returnArg('typing.disjoint_base'),
  NewType: newTypeFn,
  TypedDict: typedDictFn,
  NamedTuple: namedTupleFn,
  dataclass_transform: (ctx, args, kwargs) => ctx.native('typing._IdentityDecorator', {}),
  get_args: (ctx, args) => {
    if (args.length !== 1) ctx.err('TypeError', 'get_args() の引数の数が合いません', '');
    const v = args[0];
    if (ctx.isUnk(v)) return ctx.unk('get_args の結果');
    if (isAliasNative(v)) {
      if (v.data.kind === 'generic' && v.data.args.length === 0 && v.data.reprStr === 'typing.Tuple[()]') return TUPLE([]);
      return TUPLE(v.data.args.slice());
    }
    if (v && v.__union) return TUPLE(v.__union.map((a) => (PyAPI.isNone(a) ? NONETYPE : a)));
    return TUPLE([]);
  },
  get_origin: (ctx, args) => {
    if (args.length !== 1) ctx.err('TypeError', 'get_origin() の引数の数が合いません', '');
    const v = args[0];
    if (ctx.isUnk(v)) return ctx.unk('get_origin の結果');
    if (isAliasNative(v)) {
      if (v.data.kind === 'union') return formValues.Union;
      if (v.data.kind === 'aliastype') return v.data.origin;
      return v.data.origin;
    }
    if (v && v.__union) return ctx.ncls('types.UnionType');
    if (v && v.__native === 'typing._SpecialForm' && v.data.aliasObject) return originValue(ctx, v.data.aliasOriginName);
    return NONE;
  },
  is_typeddict: (ctx, args) => {
    if (args.length !== 1) ctx.err('TypeError', 'is_typeddict() の引数の数が合いません', '');
    const v = args[0];
    return BOOL(!!v && v.__g8typedDict === true);
  },
  get_type_hints: unverifiedFn('typing.get_type_hints', '注釈の評価には対象の名前空間が必要で、エンジンは保持していない'),
  evaluate_forward_ref: unverifiedFn('typing.evaluate_forward_ref', '前方参照の評価には評価コンテキストが必要で、エンジンでは再現できない'),
  get_protocol_members: unverifiedFn('typing.get_protocol_members', 'プロトコルのメンバ情報はエンジンが保持していない'),
  is_protocol: unverifiedFn('typing.is_protocol', 'プロトコルかどうかの判定にはクラスの内部情報が必要で、エンジンが保持していない'),
  runtime_checkable: unverifiedFn('typing.runtime_checkable', 'プロトコルクラスへの runtime_checkable の適用はエンジンのクラス機構で再現できない'),
  overload: unverifiedFn('typing.overload', 'オーバーロードの登録簿はエンジンに無く、呼び出し意味論を再現できない'),
  get_overloads: unverifiedFn('typing.get_overloads', 'オーバーロードの登録簿はエンジンに無い'),
  clear_overloads: unverifiedFn('typing.clear_overloads', 'オーバーロードの登録簿はエンジンに無い'),
};

/* AnyStr は制約付き TypeVar の単例（str／bytes） */
const anyStrValue = _makeNative('typing.TypeVar', {
  name: 'AnyStr', constraints: [{ __builtin: 'str' }, { __builtin: 'bytes' }], bound: null,
  covariant: false, contravariant: false, inferVariance: false, default: undefined,
});
const textIOValue = _makeNative('typing._IOClass', {});
registerStdlibClass('typing._IOClass', {
  typeName: 'IO',
  repr: (ctx, self) => "<class 'typing." + self.data.clsName + "'>",
});
textIOValue.data = { clsName: 'TextIO' };
const binaryIOValue = _makeNative('typing._IOClass', { clsName: 'BinaryIO' });

registerStdlibModule('typing', {
  data: {
    ...formValues,
    ...supportsValues,
    TYPE_CHECKING: BOOL(false),
    Text: { __builtin: 'str' },
    AnyStr: anyStrValue,
    TextIO: textIOValue,
    BinaryIO: binaryIOValue,
  },
  functions: FUNCTIONS,
  classes: {
    ForwardRef: forwardRefDef,
    TypeVar: typeVarDef,
    TypeVarTuple: typeVarTupleDef,
    ParamSpec: paramSpecDef,
    ParamSpecArgs: paramSpecArgsDef,
    ParamSpecKwargs: paramSpecKwargsDef,
    TypeAliasType: typeAliasTypeDef,
    Generic: unverifiedClassDef('Generic', 'typing.Generic', 'ジェネリッククラスの基底としての利用はエンジンのクラス機構で再現できない'),
    Protocol: unverifiedClassDef('Protocol', 'typing.Protocol', 'プロトコルの基底としての利用と isinstance 意味論はエンジンで再現できない'),
  },
});
