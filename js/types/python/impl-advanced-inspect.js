/* 高度モード B7 G8：inspect モジュール（全127件）。
 * 一次情報：公式ドキュメント 3.15（library/inspect）、CPython 本家
 * Lib/inspect.py・Lib/dis.py（COMPILER_FLAG_NAMES、BufferFlags は main
 * ブランチで採取）、ローカル CPython 3.12.3 実走。
 * Parameter／Signature／BoundArguments は値オブジェクトとして忠実に実装
 * （bind は CPython の _bind の移植）。フレーム・コードオブジェクト・
 * ソースファイルに依存する introspection は到達不能として未検証／未対応に
 * 正直に倒す。CO_HAS_DOCSTRING／CO_METHOD は 3.14 以降の値で、dis の
 * COMPILER_FLAG_NAMES（0x4000000／0x8000000）から確定した。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
import { I, BOOL, NONE, LIST, TUPLE, DICT, UNK, cleandocImpl, formatAnnotation, makeEnum, unsupportedFn, unverifiedFn, unverifiedClassDef } from './impl-advanced-g8-common.js';

const EMPTY = { __g8empty: true };
/* inspect._empty の単例（Parameter.empty／Signature.empty） */
import { makeNative } from './stdlib-registry.js';
const emptySingleton = makeNative('inspect._empty', {});
registerStdlibClass('inspect._empty', {
  typeName: '_empty',
  repr: () => "<class 'inspect._empty'>",
  str: () => "<class 'inspect._empty'>",
});

/* Parameter の kind（_ParameterKind。値は定義順 0〜4、description は
 * CPython の _ParameterKind の定義そのもの） */
const KIND_DEFS = [
  { name: 'POSITIONAL_ONLY', value: 0, description: 'positional-only' },
  { name: 'POSITIONAL_OR_KEYWORD', value: 1, description: 'positional or keyword' },
  { name: 'VAR_POSITIONAL', value: 2, description: 'variadic positional' },
  { name: 'KEYWORD_ONLY', value: 3, description: 'keyword-only' },
  { name: 'VAR_KEYWORD', value: 4, description: 'variadic keyword' },
];
const kindEnum = makeEnum('inspect._ParameterKind', '_ParameterKind', KIND_DEFS, 'kind', '_ParameterKind');
registerStdlibClass('inspect._ParameterKind', kindEnum.def);
const KIND = kindEnum.instances;
const KIND_BY_VALUE = KIND_DEFS.map((d) => KIND[d.name]);

function isParam(v) { return !!v && v.__native === 'inspect.Parameter'; }
function isSig(v) { return !!v && v.__native === 'inspect.Signature'; }
function kindValueOf(ctx, v, fname) {
  if (v && v.__native === 'inspect._ParameterKind') return v.data.value;
  if (ctx.isNum(v) || ctx.isBool(v)) {
    const n = ctx.num(v);
    if (n >= 0 && n <= 4 && Number.isInteger(n)) return n;
  }
  ctx.err('ValueError', String(ctx.repr(v)) + ' is not a valid _ParameterKind', '');
  return 0;
}
const IDENT_RE = /^[\p{L}_][\p{L}\p{N}_]*$/u;
function validateParam(ctx, name, kindVal, hasDefault) {
  if (typeof name !== 'string') ctx.err('TypeError', 'name must be a str, not a ' + ctx.typeName(name), '');
  if (!IDENT_RE.test(name)) ctx.err('ValueError', "'" + name + "' is not a valid parameter name", '');
  if (hasDefault && kindVal === 2) ctx.err('ValueError', 'variadic positional parameters cannot have default values', '');
  if (hasDefault && kindVal === 4) ctx.err('ValueError', 'variadic keyword parameters cannot have default values', '');
}
function paramStr(ctx, d) {
  let out = '';
  if (d.kindVal === 2) out += '*';
  else if (d.kindVal === 4) out += '**';
  out += d.name;
  const hasAnn = d.annotation !== EMPTY;
  const hasDef = d.default !== EMPTY;
  if (hasAnn) out += ': ' + formatAnnotation(ctx, d.annotation);
  if (hasDef) out += (hasAnn ? ' = ' : '=') + ctx.repr(d.default);
  return out;
}
function makeParam(ctx, name, kindVal, def, ann) {
  validateParam(ctx, name, kindVal, def !== EMPTY);
  return ctx.native('inspect.Parameter', { name, kindVal, default: def, annotation: ann });
}
const parameterDef = {
  typeName: 'Parameter',
  construct: (ctx, args, kwargs) => {
    let name = args[0], kindV = args[1];
    let def = args.length > 2 ? args[2] : EMPTY;
    let ann = args.length > 3 ? args[3] : EMPTY;
    if ('name' in kwargs) name = kwargs.name;
    if ('kind' in kwargs) kindV = kwargs.kind;
    if ('default' in kwargs) def = kwargs.default;
    if ('annotation' in kwargs) ann = kwargs.annotation;
    if (args.length > 4) ctx.err('TypeError', 'Parameter() の引数の数が合いません', '');
    if (name === undefined || kindV === undefined) ctx.err('TypeError', 'Parameter() には name と kind が必要です', '');
    return makeParam(ctx, name, kindValueOf(ctx, kindV, 'Parameter'), def, ann);
  },
  attrs: {
    name: (ctx, self) => self.data.name,
    kind: (ctx, self) => KIND_BY_VALUE[self.data.kindVal],
    default: (ctx, self) => self.data.default === EMPTY ? emptySingleton : self.data.default,
    annotation: (ctx, self) => self.data.annotation === EMPTY ? emptySingleton : self.data.annotation,
  },
  classAttrs: {
    empty: emptySingleton,
    POSITIONAL_ONLY: KIND.POSITIONAL_ONLY,
    POSITIONAL_OR_KEYWORD: KIND.POSITIONAL_OR_KEYWORD,
    VAR_POSITIONAL: KIND.VAR_POSITIONAL,
    KEYWORD_ONLY: KIND.KEYWORD_ONLY,
    VAR_KEYWORD: KIND.VAR_KEYWORD,
  },
  methods: {
    replace: (ctx, self, args, kwargs) => {
      if (args.length) ctx.err('TypeError', 'Parameter.replace() はキーワード引数だけを受け付けます', '');
      const d = self.data;
      let { name, kindVal } = d;
      let def = d.default, ann = d.annotation;
      for (const k of Object.keys(kwargs || {})) {
        if (k === 'name') name = kwargs.name;
        else if (k === 'kind') kindVal = kindValueOf(ctx, kwargs.kind, 'Parameter.replace');
        else if (k === 'default') def = kwargs.default === emptySingleton ? EMPTY : kwargs.default;
        else if (k === 'annotation') ann = kwargs.annotation === emptySingleton ? EMPTY : kwargs.annotation;
        else ctx.err('TypeError', "Parameter.replace() got an unexpected keyword argument '" + k + "'", '');
      }
      if (def === emptySingleton) def = EMPTY;
      if (ann === emptySingleton) ann = EMPTY;
      return makeParam(ctx, name, kindVal, def, ann);
    },
  },
  repr: (ctx, self) => '<Parameter "' + paramStr(ctx, self.data) + '">',
  str: (ctx, self) => paramStr(ctx, self.data),
  eq: (ctx, self, other) => {
    if (!isParam(other)) return null;
    const a = self.data, b = other.data;
    return a.name === b.name && a.kindVal === b.kindVal &&
      (a.default === EMPTY ? b.default === EMPTY : b.default !== EMPTY && ctx.eq(a.default, b.default) === true) &&
      (a.annotation === EMPTY ? b.annotation === EMPTY : b.annotation !== EMPTY && ctx.eq(a.annotation, b.annotation) === true);
  },
  hash: (ctx, self) => 'param:' + self.data.name + ':' + self.data.kindVal + ':' +
    (self.data.default === EMPTY ? 'empty' : ctx.repr(self.data.default)) + ':' +
    (self.data.annotation === EMPTY ? 'empty' : ctx.repr(self.data.annotation)),
};

/* ---------- Signature／BoundArguments ---------- */
function sigStr(ctx, d) {
  const parts = [];
  let posOnlySeen = false, varPosSeen = false, kwOnlyMarkerDone = false;
  const rendered = [];
  d.params.forEach((p, idx) => {
    const pd = p.data;
    if (pd.kindVal === 0) posOnlySeen = true;
    if (pd.kindVal === 2) varPosSeen = true;
    if (pd.kindVal === 3 && !varPosSeen && !kwOnlyMarkerDone) { rendered.push('*'); kwOnlyMarkerDone = true; }
    rendered.push(paramStr(ctx, pd));
    if (pd.kindVal === 0) {
      const next = d.params[idx + 1];
      if (!next || next.data.kindVal !== 0) rendered.push('/');
    }
  });
  let out = '(' + rendered.join(', ') + ')';
  if (d.retAnn !== EMPTY) out += ' -> ' + formatAnnotation(ctx, d.retAnn);
  return out;
}
function validateParams(ctx, params) {
  const seen = new Set();
  let lastKind = -1, posDefaultSeen = false, varPosSeen = false, varKwSeen = false;
  for (const p of params) {
    const d = p.data;
    if (seen.has(d.name)) ctx.err('ValueError', "duplicate parameter name: '" + d.name + "'", '');
    seen.add(d.name);
    if (d.kindVal === 2) { if (varPosSeen) ctx.err('ValueError', 'variadic positional parameter is not unique', ''); varPosSeen = true; }
    if (d.kindVal === 4) { if (varKwSeen) ctx.err('ValueError', 'variadic keyword parameter is not unique', ''); varKwSeen = true; }
    if (d.kindVal < lastKind) ctx.err('ValueError', 'wrong parameter order', '');
    if (d.kindVal !== 3 || lastKind !== 2) lastKind = Math.max(lastKind, d.kindVal);
    if (d.kindVal === 0 || d.kindVal === 1) {
      if (d.default !== EMPTY) posDefaultSeen = true;
      else if (posDefaultSeen) ctx.err('ValueError', 'non-default argument follows default argument', '');
    }
  }
}
function bindImpl(ctx, sigNative, argsArr, kwargsObj, partial, fname) {
  const params = sigNative.data.params;
  const boundMap = new Map(); // name -> value（挿入順＝CPython の dict 順）
  const kwargsLeft = new Map(Object.entries(kwargsObj || {}));
  let paramIdx = 0;
  let argIdx = 0;
  let parametersEx = [];
  /* 第1相：位置引数 */
  for (;;) {
    if (argIdx >= argsArr.length) {
      if (paramIdx >= params.length) break;
      const param = params[paramIdx];
      const d = param.data;
      if (d.kindVal === 2) { paramIdx++; break; }
      if (kwargsLeft.has(d.name)) {
        if (d.kindVal === 0) ctx.err('TypeError', "'" + d.name + "' parameter is positional only, but was passed as a keyword", '');
        parametersEx = [param]; paramIdx++; break;
      }
      if (d.kindVal === 4 || d.default !== EMPTY) { parametersEx = [param]; paramIdx++; break; }
      if (partial) { parametersEx = [param]; paramIdx++; break; }
      ctx.err('TypeError', 'missing a required' + (d.kindVal === 3 ? ' keyword-only' : '') + " argument: '" + d.name + "'", '');
    }
    const argVal = argsArr[argIdx];
    if (paramIdx >= params.length) ctx.err('TypeError', 'too many positional arguments', '');
    const param = params[paramIdx];
    const d = param.data;
    if (d.kindVal === 4 || d.kindVal === 3) ctx.err('TypeError', 'too many positional arguments', '');
    if (d.kindVal === 2) {
      boundMap.set(d.name, TUPLE(argsArr.slice(argIdx)));
      argIdx = argsArr.length; paramIdx++;
      break;
    }
    if (kwargsLeft.has(d.name) && d.kindVal !== 0) ctx.err('TypeError', "multiple values for argument '" + d.name + "'", '');
    boundMap.set(d.name, argVal);
    argIdx++; paramIdx++;
  }
  /* 第2相：キーワード引数 */
  let kwargsParam = null;
  const phase2 = [...parametersEx, ...params.slice(paramIdx)];
  for (const param of phase2) {
    const d = param.data;
    if (d.kindVal === 4) { kwargsParam = param; continue; }
    if (d.kindVal === 2) continue;
    if (kwargsLeft.has(d.name)) {
      if (d.kindVal === 0) ctx.err('TypeError', "'" + d.name + "' parameter is positional only, but was passed as a keyword", '');
      boundMap.set(d.name, kwargsLeft.get(d.name));
      kwargsLeft.delete(d.name);
    } else if (!partial && d.default === EMPTY) {
      ctx.err('TypeError', "missing a required argument: '" + d.name + "'", '');
    }
  }
  if (kwargsLeft.size) {
    if (kwargsParam) {
      const rest = DICT();
      for (const [k, v] of kwargsLeft) PyAPI.dictSet(rest, k, v);
      boundMap.set(kwargsParam.data.name, rest);
    } else {
      ctx.err('TypeError', "got an unexpected keyword argument '" + [...kwargsLeft.keys()][0] + "'", '');
    }
  }
  const dictVal = DICT();
  for (const [k, v] of boundMap) PyAPI.dictSet(dictVal, k, v);
  return ctx.native('inspect.BoundArguments', { sig: sigNative, arguments: dictVal });
}
const signatureDef = {
  typeName: 'Signature',
  construct: (ctx, args, kwargs) => {
    let paramsInput = args.length ? args[0] : null;
    let retAnn = args.length > 1 ? args[1] : EMPTY;
    if ('parameters' in kwargs) paramsInput = kwargs.parameters;
    if ('return_annotation' in kwargs) retAnn = kwargs.return_annotation;
    if (retAnn === emptySingleton) retAnn = EMPTY;
    let params = [];
    if (paramsInput !== null && paramsInput !== undefined) {
      const items = ctx.iterable(paramsInput);
      if (items === null) ctx.err('TypeError', 'Signature() の parameters には Parameter の並びを使ってください', '');
      params = items.slice();
      for (const p of params) if (!isParam(p)) ctx.err('TypeError', 'Signature() の parameters には Parameter を使ってください', '');
    }
    validateParams(ctx, params);
    return ctx.native('inspect.Signature', { params, retAnn });
  },
  attrs: {
    parameters: (ctx, self) => {
      const d = DICT();
      for (const p of self.data.params) PyAPI.dictSet(d, p.data.name, p);
      return d;
    },
    return_annotation: (ctx, self) => self.data.retAnn === EMPTY ? emptySingleton : self.data.retAnn,
  },
  classAttrs: { empty: emptySingleton },
  classMethods: {
    from_callable: unverifiedFn('inspect.Signature.from_callable', '呼び出し可能オブジェクトのパラメタ情報はエンジンが保持していない'),
  },
  methods: {
    replace: (ctx, self, args, kwargs) => {
      if (args.length) ctx.err('TypeError', 'Signature.replace() はキーワード引数だけを受け付けます', '');
      let params = self.data.params, retAnn = self.data.retAnn;
      for (const k of Object.keys(kwargs || {})) {
        if (k === 'parameters') {
          const items = ctx.iterable(kwargs.parameters);
          if (items === null) ctx.err('TypeError', 'Signature.replace() の parameters には Parameter の並びを使ってください', '');
          params = items.slice();
          for (const p of params) if (!isParam(p)) ctx.err('TypeError', 'Signature.replace() の parameters には Parameter を使ってください', '');
        } else if (k === 'return_annotation') retAnn = kwargs.return_annotation === emptySingleton ? EMPTY : kwargs.return_annotation;
        else ctx.err('TypeError', "Signature.replace() got an unexpected keyword argument '" + k + "'", '');
      }
      validateParams(ctx, params);
      return ctx.native('inspect.Signature', { params, retAnn });
    },
    bind: (ctx, self, args, kwargs) => bindImpl(ctx, self, args, kwargs, false, 'Signature.bind'),
    bind_partial: (ctx, self, args, kwargs) => bindImpl(ctx, self, args, kwargs, true, 'Signature.bind_partial'),
    format: unverifiedFn('inspect.Signature.format', '3.14 で追加された書式化メソッドで、書式仕様を一次情報で確定できない'),
  },
  repr: (ctx, self) => '<Signature ' + sigStr(ctx, self.data) + '>',
  str: (ctx, self) => sigStr(ctx, self.data),
  eq: (ctx, self, other) => {
    if (!isSig(other)) return null;
    const a = self.data, b = other.data;
    if (a.params.length !== b.params.length) return false;
    for (let i = 0; i < a.params.length; i++) if (parameterDef.eq(ctx, a.params[i], b.params[i]) !== true) return false;
    if (a.retAnn === EMPTY || b.retAnn === EMPTY) return a.retAnn === b.retAnn;
    return ctx.eq(a.retAnn, b.retAnn) === true;
  },
  hash: () => null,
};
const boundArgumentsDef = {
  typeName: 'BoundArguments',
  construct: (ctx, args, kwargs) => {
    let sig = args[0], argumentsVal = args[1];
    if ('signature' in kwargs) sig = kwargs.signature;
    if ('arguments' in kwargs) argumentsVal = kwargs.arguments;
    if (!isSig(sig)) ctx.err('TypeError', 'BoundArguments() の第1引数には Signature を使ってください', '');
    if (!argumentsVal || !PyAPI.isDict(argumentsVal)) ctx.err('TypeError', 'BoundArguments() の第2引数には辞書を使ってください', '');
    return ctx.native('inspect.BoundArguments', { sig, arguments: argumentsVal });
  },
  attrs: {
    signature: (ctx, self) => self.data.sig,
    arguments: (ctx, self) => self.data.arguments,
    args: (ctx, self) => {
      const out = [];
      const argMap = self.data.arguments;
      for (const p of self.data.sig.data.params) {
        const d = p.data;
        if (d.kindVal === 4 || d.kindVal === 3) break;
        const v = PyAPI.dictGet(argMap, d.name);
        if (v === undefined) break;
        if (d.kindVal === 2) { const items = ctx.iterable(v); if (items) out.push(...items); }
        else out.push(v);
      }
      return TUPLE(out);
    },
    kwargs: (ctx, self) => {
      const out = DICT();
      const argMap = self.data.arguments;
      let started = false;
      for (const p of self.data.sig.data.params) {
        const d = p.data;
        if (!started) {
          if (d.kindVal === 4 || d.kindVal === 3) started = true;
          else if (PyAPI.dictGet(argMap, d.name) === undefined) { started = true; continue; }
        }
        if (!started) continue;
        const v = PyAPI.dictGet(argMap, d.name);
        if (v === undefined) continue;
        if (d.kindVal === 4) { for (const e of v.__dict.values()) PyAPI.dictSet(out, e.k, e.v); }
        else PyAPI.dictSet(out, d.name, v);
      }
      return out;
    },
  },
  methods: {
    apply_defaults: (ctx, self) => {
      const argMap = self.data.arguments;
      const rebuilt = DICT();
      for (const p of self.data.sig.data.params) {
        const d = p.data;
        const v = PyAPI.dictGet(argMap, d.name);
        if (v !== undefined) { PyAPI.dictSet(rebuilt, d.name, v); continue; }
        if (d.default !== EMPTY) PyAPI.dictSet(rebuilt, d.name, d.default);
        else if (d.kindVal === 2) PyAPI.dictSet(rebuilt, d.name, TUPLE([]));
        else if (d.kindVal === 4) PyAPI.dictSet(rebuilt, d.name, DICT());
      }
      self.data.arguments = rebuilt;
      return NONE;
    },
  },
  repr: (ctx, self) => {
    const parts = [];
    for (const e of self.data.arguments.__dict.values()) parts.push(ctx.repr(e.k) === ctx.repr(e.k) ? String(e.k) + '=' + ctx.repr(e.v) : '');
    return '<BoundArguments (' + parts.join(', ') + ')>';
  },
  eq: (ctx, self, other) => {
    if (!other || other.__native !== 'inspect.BoundArguments') return null;
    return signatureDef.eq(ctx, self.data.sig, other.data.sig) === true && ctx.eq(self.data.arguments, other.data.arguments) === true;
  },
  hash: () => null,
};

/* BufferFlags（IntFlag。値は Lib/inspect.py の定義から算出） */
const BUFFERFLAG_DEFS = [
  ['SIMPLE', 0], ['WRITABLE', 1], ['FORMAT', 4], ['ND', 8], ['STRIDES', 24],
  ['C_CONTIGUOUS', 56], ['F_CONTIGUOUS', 88], ['ANY_CONTIGUOUS', 152],
  ['INDIRECT', 280], ['CONTIG', 9], ['CONTIG_RO', 8], ['STRIDED', 25],
  ['STRIDED_RO', 24], ['RECORDS', 29], ['RECORDS_RO', 28], ['FULL', 285],
  ['FULL_RO', 284], ['READ', 256], ['WRITE', 512],
];
const bufferEnum = makeEnum('inspect.BufferFlags', 'BufferFlags', BUFFERFLAG_DEFS.map(([name, value]) => ({ name, value })), 'intflag');
const bufferFlagsDef = {
  ...bufferEnum.def,
  classAttrs: bufferEnum.instances,
  construct: (ctx, args) => {
    const n = args.length ? ctx.num(args[0]) : 0;
    for (const [name, value] of BUFFERFLAG_DEFS) if (value === n) return bufferEnum.instances[name];
    return I(n === null ? 0 : n);
  },
};

/* 述語：エンジン値の範囲で忠実に判定できるものだけ実装する */
function pred(fn) { return (ctx, args) => { if (args.length !== 1) ctx.err('TypeError', '引数は1つです', ''); const v = args[0]; if (ctx.isUnk(v)) return ctx.unk('述語の結果'); return BOOL(fn(ctx, v)); }; }
const isFunctionVal = (ctx, v) => ctx.isFunc(v);
const isClassVal = (ctx, v) => !!v && (!!v.__ncls || !!v.__class || !!v.__type || (!!v.__builtin && ['int', 'float', 'str', 'bool', 'list', 'tuple', 'dict', 'set', 'range', 'type', 'object', 'frozenset', 'bytes', 'complex'].includes(v.__builtin)) || (v.__native && v.data && v.data.g8Class === true));
const isBuiltinVal = (ctx, v) => !!v && (!!v.__builtin || (PyAPI.isMethodRef ? false : false) || (v && v.__method && v.obj && v.obj.__unk && v.obj.mod));
const FUNCTIONS = {
  cleandoc: (ctx, args, kwargs) => {
    if (Object.keys(kwargs || {}).length) ctx.err('TypeError', 'inspect.cleandoc() にキーワード引数はありません', '');
    if (args.length !== 1) ctx.err('TypeError', 'inspect.cleandoc() の引数の数が合いません', '');
    const v = args[0];
    if (typeof v !== 'string') ctx.err('AttributeError', "'" + ctx.typeName(v) + "' object has no attribute 'expandtabs'", '');
    return cleandocImpl(v);
  },
  isfunction: pred(isFunctionVal),
  isclass: pred(isClassVal),
  /* モジュール値はエンジンでは UNK 形状（mod 名を持つ）で表されるため、
   * pred の UNK 短絡を通さずに専用に判定する */
  ismodule: (ctx, args) => {
    if (args.length !== 1) ctx.err('TypeError', '引数は1つです', '');
    const v = args[0];
    if (v && v.__unk === true && typeof v.mod === 'string' && typeof v.desc === 'string' && v.desc.startsWith('モジュール「')) return BOOL(true);
    if (ctx.isUnk(v)) return ctx.unk('述語の結果');
    return BOOL(false);
  },
  isbuiltin: pred(isBuiltinVal),
  isroutine: pred((ctx, v) => isBuiltinVal(ctx, v) || isFunctionVal(ctx, v) || (!!v && !!v.__method)),
  iscode: pred(() => false),
  isframe: pred(() => false),
  istraceback: pred(() => false),
  /* ファイル・フレーム・注釈評価に依存する introspection は未検証 */
  get_annotations: unverifiedFn('inspect.get_annotations', '注釈の評価には対象オブジェクトの注釈情報が必要で、エンジンは保持していない'),
  getargvalues: unverifiedFn('inspect.getargvalues', 'フレームオブジェクトがエンジンに存在しない'),
  getasyncgenlocals: unverifiedFn('inspect.getasyncgenlocals', '非同期ジェネレータの内部状態がエンジンに存在しない'),
  getasyncgenstate: unverifiedFn('inspect.getasyncgenstate', '非同期ジェネレータの内部状態がエンジンに存在しない'),
  getattr_static: unverifiedFn('inspect.getattr_static', 'ディスクリプタを経ない属性解決はエンジンの属性モデルと一致しない'),
  getcallargs: unverifiedFn('inspect.getcallargs', '呼び出し可能オブジェクトの引数情報はエンジンが保持していない'),
  getclasstree: unverifiedFn('inspect.getclasstree', 'クラス階層の完全な情報はエンジンが保持していない'),
  getclosurevars: unverifiedFn('inspect.getclosurevars', 'クロージャのセル情報はエンジンが保持していない'),
  getcoroutinelocals: unverifiedFn('inspect.getcoroutinelocals', 'コルーチンの内部状態がエンジンに存在しない'),
  getcoroutinestate: unverifiedFn('inspect.getcoroutinestate', 'コルーチンの内部状態がエンジンに存在しない'),
  getdoc: unverifiedFn('inspect.getdoc', 'docstring はエンジンの値に保持されていない'),
  getframeinfo: unverifiedFn('inspect.getframeinfo', 'フレームオブジェクトがエンジンに存在しない'),
  getfullargspec: unverifiedFn('inspect.getfullargspec', '呼び出し可能オブジェクトの引数情報はエンジンが保持していない'),
  getgeneratorlocals: unverifiedFn('inspect.getgeneratorlocals', 'ジェネレータの内部状態がエンジンに存在しない'),
  getgeneratorstate: unverifiedFn('inspect.getgeneratorstate', 'ジェネレータの内部状態がエンジンに存在しない'),
  getinnerframes: unverifiedFn('inspect.getinnerframes', 'トレースバックとフレームがエンジンに存在しない'),
  getmembers: unverifiedFn('inspect.getmembers', 'オブジェクトの全属性の列挙はエンジンの属性モデルと一致しない'),
  getmembers_static: unverifiedFn('inspect.getmembers_static', 'オブジェクトの全属性の列挙はエンジンの属性モデルと一致しない'),
  getmro: unverifiedFn('inspect.getmro', 'メソッド解決順序の完全な情報はエンジンが保持していない'),
  getouterframes: unverifiedFn('inspect.getouterframes', 'フレームオブジェクトがエンジンに存在しない'),
  currentframe: unverifiedFn('inspect.currentframe', 'フレームオブジェクトがエンジンに存在しない'),
  formatargvalues: unverifiedFn('inspect.formatargvalues', 'フレームの引数情報がエンジンに存在しない'),
  stack: unverifiedFn('inspect.stack', '呼び出しスタックのフレームがエンジンに存在しない'),
  trace: unverifiedFn('inspect.trace', 'トレースバックとフレームがエンジンに存在しない'),
  signature: unverifiedFn('inspect.signature', '呼び出し可能オブジェクトの引数情報はエンジンが保持していない'),
  unwrap: unverifiedFn('inspect.unwrap', '__wrapped__ チェーンの解決はエンジンの属性モデルと一致しない'),
  isabstract: unverifiedFn('inspect.isabstract', '__abstractmethods__ の情報はエンジンが保持していない'),
  isasyncgen: unverifiedFn('inspect.isasyncgen', '非同期ジェネレータの型はエンジンに存在しない'),
  isasyncgenfunction: unverifiedFn('inspect.isasyncgenfunction', 'コードオブジェクトのフラグはエンジンが保持していない'),
  isawaitable: unverifiedFn('inspect.isawaitable', 'awaitable の判定には型の __await__ 情報が必要で、エンジンが保持していない'),
  iscoroutine: unverifiedFn('inspect.iscoroutine', 'コルーチンオブジェクトはエンジンに存在しない'),
  iscoroutinefunction: unverifiedFn('inspect.iscoroutinefunction', 'コードオブジェクトのフラグはエンジンが保持していない'),
  isdatadescriptor: unverifiedFn('inspect.isdatadescriptor', 'ディスクリプタの判定はエンジンの属性モデルと一致しない'),
  isgenerator: unverifiedFn('inspect.isgenerator', 'ジェネレータオブジェクトの型判定はエンジンの反復子表現と一致しない'),
  isgeneratorfunction: unverifiedFn('inspect.isgeneratorfunction', 'コードオブジェクトのフラグはエンジンが保持していない'),
  isgetsetdescriptor: unverifiedFn('inspect.isgetsetdescriptor', 'getset ディスクリプタはエンジンに存在しない'),
  ismemberdescriptor: unverifiedFn('inspect.ismemberdescriptor', 'メンバディスクリプタはエンジンに存在しない'),
  ismethod: unverifiedFn('inspect.ismethod', 'メソッドオブジェクトの型はエンジンのメソッド表現と一致しない'),
  ismethoddescriptor: unverifiedFn('inspect.ismethoddescriptor', 'ディスクリプタの判定はエンジンの属性モデルと一致しない'),
  ismethodwrapper: unverifiedFn('inspect.ismethodwrapper', 'メソッドラッパーはエンジンに存在しない'),
  ispackage: unverifiedFn('inspect.ispackage', 'パッケージかどうかはモジュールの __path__ に依存し、エンジンは保持していない'),
  markcoroutinefunction: unverifiedFn('inspect.markcoroutinefunction', '関数へのマーカー属性の設定はエンジンの関数値で再現できない'),
  /* ソースファイル前提のものは未対応 */
  getcomments: unsupportedFn('inspect.getcomments', 'ソースファイルの読み取りが前提のため'),
  getfile: unsupportedFn('inspect.getfile', 'ソースファイルの特定が前提のため'),
  getmodule: unsupportedFn('inspect.getmodule', 'モジュールとファイルの対応付けが前提のため'),
  getmodulename: unsupportedFn('inspect.getmodulename', 'ファイルパスの解析が前提のため'),
  getsource: unsupportedFn('inspect.getsource', 'ソースファイルの読み取りが前提のため'),
  getsourcefile: unsupportedFn('inspect.getsourcefile', 'ソースファイルの特定が前提のため'),
  getsourcelines: unsupportedFn('inspect.getsourcelines', 'ソースファイルの読み取りが前提のため'),
};

const frameReason = 'フレームオブジェクトがエンジンに存在しないため到達できない';
registerStdlibModule('inspect', {
  constants: {
    CO_OPTIMIZED: I(1), CO_NEWLOCALS: I(2), CO_VARARGS: I(4), CO_VARKEYWORDS: I(8),
    CO_NESTED: I(16), CO_GENERATOR: I(32), CO_COROUTINE: I(128),
    CO_ITERABLE_COROUTINE: I(256), CO_ASYNC_GENERATOR: I(512),
    CO_HAS_DOCSTRING: I(67108864), CO_METHOD: I(134217728),
  },
  functions: FUNCTIONS,
  classes: {
    Parameter: parameterDef,
    Signature: signatureDef,
    BoundArguments: boundArgumentsDef,
    BufferFlags: bufferFlagsDef,
    FrameInfo: unverifiedClassDef('FrameInfo', 'inspect.FrameInfo', frameReason),
    Traceback: unverifiedClassDef('Traceback', 'inspect.Traceback', frameReason),
  },
});
