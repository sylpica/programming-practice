/* 高度モード B7 G4：types モジュール（41件）。
 * 型オブジェクト群は束ね値・参照中心（実体化は基盤外のものは未検証）。
 * MappingProxyType は辞書のライブビューとして、SimpleNamespace は
 * 属性名集合ごとの動的クラスとして、GenericAlias/CellType/MethodType/
 * NoneType は値として再現する。Ellipsis/NotImplemented の単例は
 * PyAPI から取得できないため、それらを返す構築は未検証。
 * 高度A7班是正：PyAPI が ELLIPSIS／NOTIMPLEMENTED 単例を公開したため、
 * EllipsisType()／NotImplementedType() は実単例を返すようになった。
 * あわせて3クラスに builtinTypes と typevalAlias を宣言し、
 * isinstance／==／is が type() の型値と一致するようになった。 */
import { registerStdlibModule, registerStdlibClass, nativeClassDef } from './stdlib-registry.js';
import {
  NONE, BOOL, LIST, TUPLE, DICT, ELLIPSIS, NOTIMPLEMENTED, isNone, isDict, arity, noKwargs, dictPairs, dictSet, dictGet,
} from './impl-advanced-g4-common.js';
import { pairsOfValue } from './impl-advanced-collections.js';

function typeOnlyDef(typeName, createMsg) {
  return {
    typeName,
    construct: (ctx) => {
      if (createMsg) ctx.err('TypeError', createMsg, '');
      ctx.diag('types.' + typeName + ' の実体はこのエンジンでは生成できません');
      return ctx.unk('types.' + typeName + ' の値');
    },
    truthy: () => true,
  };
}

/* ---------- NoneType ---------- */
const NoneTypeDef = {
  typeName: 'NoneType',
  builtinTypes: ['NoneType'],
  typevalAlias: 'NoneType',
  construct: (ctx, args) => { arity(ctx, args, 0, 0, 'NoneType'); return NONE; },
  truthy: () => true,
};

/* ---------- CellType ---------- */
const CellTypeDef = {
  typeName: 'cell',
  construct: (ctx, args) => {
    arity(ctx, args, 0, 1, 'CellType');
    return ctx.native('types.CellType', { has: args.length === 1, value: args.length === 1 ? args[0] : null });
  },
  attrs: {
    cell_contents: (ctx, self) => {
      if (!self.data.has) ctx.err('ValueError', 'Cell is empty', '');
      return self.data.value;
    },
  },
  repr: (ctx, self) => '<cell at 0x...: ' + (self.data.has ? ctx.typeName(self.data.value) : 'empty') + '>',
  truthy: () => true,
};

/* ---------- MappingProxyType ---------- */
const MappingProxyDef = {
  typeName: 'mappingproxy',
  construct: (ctx, args) => {
    arity(ctx, args, 1, 1, 'MappingProxyType');
    const src = args[0];
    let d = null;
    if (isDict(src)) d = src;
    else if (src && src.__native && src.data && isDict(src.data.dict)) d = src.data.dict;
    else if (src && src.__native === 'types.MappingProxyType') d = src.data.mapping;
    if (!d) ctx.err('TypeError', "mappingproxy() argument must be a mapping, not " + ctx.typeName(src), '');
    return ctx.native('types.MappingProxyType', { mapping: d });
  },
  methods: {
    get: (ctx, self, args) => { arity(ctx, args, 1, 2, 'get'); const v = dictGet(self.data.mapping, args[0]); return v === undefined ? (args.length === 2 ? args[1] : NONE) : v; },
    keys: (ctx, self) => LIST(dictPairs(self.data.mapping).map(([k]) => k)),
    values: (ctx, self) => LIST(dictPairs(self.data.mapping).map(([, v]) => v)),
    items: (ctx, self) => LIST(dictPairs(self.data.mapping).map(([k, v]) => TUPLE([k, v]))),
    copy: (ctx, self) => { const d = DICT(); for (const [k, v] of dictPairs(self.data.mapping)) dictSet(d, k, v); return d; },
  },
  getitem: (ctx, self, key) => {
    if (key && key.__slice) return ctx.NOT_HANDLED;
    const v = dictGet(self.data.mapping, key);
    if (v === undefined) ctx.err('KeyError', ctx.repr(key), '');
    return v;
  },
  setitem: (ctx) => ctx.err('TypeError', "'mappingproxy' object does not support item assignment", 'mappingproxy は読み取り専用です'),
  contains: (ctx, self, item) => dictGet(self.data.mapping, item) !== undefined,
  len: (ctx, self) => self.data.mapping.__dict.size,
  iter: (ctx, self) => dictPairs(self.data.mapping).map(([k]) => k),
  repr: (ctx, self) => 'mappingproxy(' + ctx.repr(self.data.mapping) + ')',
  str: (ctx, self) => ctx.strOf(self.data.mapping),
  eq: (ctx, self, other) => {
    const op = pairsOfValue(other);
    if (op === null) return false;
    const pa = dictPairs(self.data.mapping);
    if (pa.length !== op.length) return false;
    for (const [k, v] of pa) {
      const hit = op.find(([ok]) => ctx.eq(ok, k) === true);
      if (!hit || ctx.eq(hit[1], v) !== true) return false;
    }
    return true;
  },
  hash: () => null,
  truthy: (ctx, self) => self.data.mapping.__dict.size > 0,
  binop: (ctx, self, op, other) => {
    if (op === '|') {
      const op2 = pairsOfValue(other);
      if (op2 === null) return ctx.NOT_HANDLED;
      const d = DICT();
      for (const [k, v] of dictPairs(self.data.mapping)) dictSet(d, k, v);
      for (const [k, v] of op2) dictSet(d, k, v);
      return d;
    }
    return ctx.NOT_HANDLED;
  },
};

/* ---------- GenericAlias ---------- */
const GenericAliasDef = {
  typeName: 'GenericAlias',
  construct: (ctx, args) => {
    arity(ctx, args, 2, 2, 'GenericAlias');
    const origin = args[0];
    let params;
    if (args[1] && args[1].__tuple) params = args[1].__tuple.slice();
    else params = [args[1]];
    return ctx.native('types.GenericAlias', { origin, params });
  },
  attrs: {
    __origin__: (ctx, self) => self.data.origin,
    __args__: (ctx, self) => TUPLE(self.data.params.slice()),
  },
  repr: (ctx, self) => {
    const o = gaName(ctx, self.data.origin);
    const ps = self.data.params.map((p) => gaName(ctx, p)).join(', ');
    return o + '[' + ps + ']';
  },
  eq: (ctx, self, other) => {
    if (!other || other.__native !== 'types.GenericAlias') return false;
    if (ctx.eq(self.data.origin, other.data.origin) !== true) return false;
    if (self.data.params.length !== other.data.params.length) return false;
    return self.data.params.every((p, i) => ctx.eq(p, other.data.params[i]) === true);
  },
  truthy: () => true,
};

/* 型引数の表示名（組み込み型・クラス値は素の名前で出す） */
function gaName(ctx, v) {
  if (typeof v === 'string') return v;
  if (v && v.__builtin) return v.__builtin;
  if (v && v.__ncls) { const d = nativeClassDef(v.__ncls); return d && d.typeName ? d.typeName : v.__ncls; }
  if (isNone(v)) return 'None';
  return ctx.repr(v);
}

/* ---------- UnionType ---------- */
const UnionTypeDef = {
  typeName: 'UnionType',
  construct: (ctx) => ctx.err('TypeError', "cannot create 'types.UnionType' instances", '和集合型は int | str のような式で作ります'),
  truthy: () => true,
};

/* ---------- MethodType ---------- */
const MethodTypeDef = {
  typeName: 'method',
  construct: (ctx, args) => {
    arity(ctx, args, 2, 2, 'MethodType');
    return ctx.native('types.MethodType', { fn: args[0], obj: args[1] });
  },
  attrs: {
    __func__: (ctx, self) => self.data.fn,
    __self__: (ctx, self) => self.data.obj,
  },
  call: (ctx, self, args) => ctx.call(self.data.fn, [self.data.obj, ...args]),
  repr: (ctx, self) => '<bound method>',
  truthy: () => true,
};

/* ---------- SimpleNamespace（単一の共有 def） ----------
 * エンジンの eqVal は限定名が異なるネイティブ同士を無条件に不等とするため、
 * 属性ごとに別クラスを作ると == が再現できない。単一 def を共有し、属性の
 * getter は構築時に必要な名前だけ def.attrs へ動的に足す（getter は各
 * インスタンスの data から読む）。 */
const SimpleNamespaceDef = {
  typeName: 'SimpleNamespace',
  construct: (ctx, args, kwargs) => simpleNamespaceConstruct(ctx, args, kwargs),
  attrs: {},
  repr: (c2, self) => 'namespace(' + [...self.data.attrs.entries()].map(([k, v]) => k + '=' + c2.repr(v)).join(', ') + ')',
  eq: (c2, self, other) => {
    if (!other || !other.__native || !other.data || !other.data.sn) return false;
    if (self.data.attrs.size !== other.data.attrs.size) return false;
    for (const [k, v] of self.data.attrs) {
      if (!other.data.attrs.has(k)) return false;
      if (c2.eq(v, other.data.attrs.get(k)) !== true) return false;
    }
    return true;
  },
  truthy: () => true,
};
function ensureSnAttr(name) {
  if (!(name in SimpleNamespaceDef.attrs)) {
    SimpleNamespaceDef.attrs[name] = (c2, self) => {
      if (!self.data.attrs.has(name)) c2.err('AttributeError', "'types.SimpleNamespace' object has no attribute '" + name + "'", '');
      return self.data.attrs.get(name);
    };
  }
}
function simpleNamespaceConstruct(ctx, args, kwargs) {
  let initial = [];
  if (args.length > 1) ctx.err('TypeError', 'SimpleNamespace() の位置引数は最大で1つです', '');
  if (args.length === 1) {
    const pairs = pairsOfValue(args[0]);
    if (pairs) initial = pairs.map(([k, v]) => [typeof k === 'string' ? k : ctx.strOf(k), v]);
    else {
      const arr = ctx.iterable(args[0]);
      if (arr === null || arr === undefined || (arr && arr.__unk)) return ctx.unk('SimpleNamespace の値');
      initial = arr.map((p) => {
        const kv = ctx.iterable(p);
        return [kv[0], kv[1]];
      });
    }
  }
  const attrs = new Map();
  for (const [k, v] of initial) attrs.set(k, v);
  for (const k of Object.keys(kwargs || {})) attrs.set(k, kwargs[k]);
  for (const k of attrs.keys()) ensureSnAttr(k);
  return ctx.native('types.SimpleNamespace', { sn: true, attrs });
}
const SimpleNamespaceBaseDef = SimpleNamespaceDef;

function classOnlyDef(typeName, createMsg) { return typeOnlyDef(typeName, createMsg); }

registerStdlibModule('types', {
  functions: {
    coroutine: (ctx, args) => { arity(ctx, args, 1, 1, 'coroutine'); ctx.diag('types.coroutine はジェネレータをコルーチン化する変換で、このエンジンでは再現できません'); return ctx.unk('coroutine() の結果'); },
    get_original_bases: (ctx) => { ctx.diag('types.get_original_bases はクラス作成機構に依存するため再現できません'); return ctx.unk('get_original_bases() の結果'); },
    new_class: (ctx) => { ctx.diag('types.new_class はクラスを生成する仕組みがこのエンジンにはないため再現できません'); return ctx.unk('new_class() の結果'); },
    prepare_class: (ctx) => { ctx.diag('types.prepare_class はクラスを生成する仕組みがこのエンジンにはないため再現できません'); return ctx.unk('prepare_class() の結果'); },
    resolve_bases: (ctx) => { ctx.diag('types.resolve_bases はクラス作成機構に依存するため再現できません'); return ctx.unk('resolve_bases() の結果'); },
  },
  classes: {
    NoneType: NoneTypeDef,
    CellType: CellTypeDef,
    MappingProxyType: MappingProxyDef,
    GenericAlias: GenericAliasDef,
    UnionType: UnionTypeDef,
    MethodType: MethodTypeDef,
    SimpleNamespace: SimpleNamespaceBaseDef,
    FunctionType: classOnlyDef('FunctionType'),
    LambdaType: classOnlyDef('FunctionType'),
    BuiltinFunctionType: classOnlyDef('BuiltinFunctionType'),
    BuiltinMethodType: classOnlyDef('BuiltinMethodType'),
    GeneratorType: classOnlyDef('GeneratorType', "cannot create 'generator' instances"),
    CoroutineType: classOnlyDef('CoroutineType', "cannot create 'coroutine' instances"),
    AsyncGeneratorType: classOnlyDef('AsyncGeneratorType', "cannot create 'async_generator' instances"),
    CodeType: classOnlyDef('CodeType'),
    FrameType: classOnlyDef('FrameType'),
    TracebackType: classOnlyDef('TracebackType'),
    ModuleType: classOnlyDef('ModuleType'),
    GetSetDescriptorType: classOnlyDef('getset_descriptor'),
    MemberDescriptorType: classOnlyDef('member_descriptor'),
    MethodDescriptorType: classOnlyDef('method_descriptor'),
    WrapperDescriptorType: classOnlyDef('wrapper_descriptor'),
    ClassMethodDescriptorType: classOnlyDef('classmethod_descriptor'),
    MethodWrapperType: classOnlyDef('method-wrapper'),
    CapsuleType: classOnlyDef('PyCapsule'),
    FrameLocalsProxyType: classOnlyDef('FrameLocalsProxy'),
    LazyImportType: {
      typeName: 'LazyImportType',
      construct: (ctx) => { ctx.diag('types.LazyImportType（3.15）は遅延インポート機構に依存するため再現できません'); return ctx.unk('LazyImportType の値'); },
      methods: {
        resolve: (ctx) => { ctx.diag('LazyImportType.resolve() は遅延インポート機構に依存するため再現できません'); return ctx.unk('resolve() の結果'); },
      },
      truthy: () => true,
    },
    DynamicClassAttribute: classOnlyDef('DynamicClassAttribute'),
    EllipsisType: {
      typeName: 'ellipsis',
      builtinTypes: ['ellipsis'],
      typevalAlias: 'ellipsis',
      construct: (ctx, args) => { arity(ctx, args, 0, 0, 'EllipsisType'); return ELLIPSIS; },
      truthy: () => true,
    },
    NotImplementedType: {
      typeName: 'NotImplementedType',
      builtinTypes: ['NotImplementedType'],
      typevalAlias: 'NotImplementedType',
      construct: (ctx, args) => { arity(ctx, args, 0, 0, 'NotImplementedType'); return NOTIMPLEMENTED; },
      truthy: () => true,
    },
  },
});
