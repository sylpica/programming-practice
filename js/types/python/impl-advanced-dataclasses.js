/* 高度モード B7 G4：dataclasses モジュール（14件）。
 * @dataclass デコレータはユーザー定義クラスの内部（cenv）へ __init__ 等を
 * 注入する必要があり、現基盤にクラス内部への介入フックがないため未検証。
 * make_dataclass は動的クラス登録で実体化でき、生成したクラスについては
 * fields/is_dataclass/asdict/astuple/replace を含め忠実に再現する。
 * __post_init__ はモジュール属性として存在しない（実在しない項目）ため
 * 登録しない（未対応）。 */
import { registerStdlibModule, registerStdlibClass, registerStdlibException, makeNative } from './stdlib-registry.js';
import {
  NUM, BOOL, NONE, LIST, TUPLE, DICT, isNone, isList, isDict, isUnk, arity, dictGet, dictSet, dictPairs, toArray,
} from './impl-advanced-g4-common.js';
import { pairsOfValue } from './impl-advanced-collections.js';

registerStdlibException('dataclasses.FrozenInstanceError', ['AttributeError']);

const MissingSentinel = makeNative('dataclasses.MISSING', {});
const KwOnlySentinel = makeNative('dataclasses.KW_ONLY', {});

function isFieldNative(v) { return v && v.__native === 'dataclasses.Field'; }
function fieldFn(ctx, args, kwargs) {
  const kw = kwargs || {};
  const hasDefault = 'default' in kw;
  const hasFactory = 'default_factory' in kw;
  if (hasDefault && hasFactory) ctx.err('ValueError', 'cannot specify both default and default_factory', '');
  return makeNative('dataclasses.Field', {
    name: null,
    type: NONE,
    default: hasDefault ? kw.default : MissingSentinel,
    defaultFactory: hasFactory ? kw.default_factory : MissingSentinel,
    init: 'init' in kw ? ctx.truthy(kw.init) === true : true,
    repr: 'repr' in kw ? ctx.truthy(kw.repr) === true : true,
    compare: 'compare' in kw ? ctx.truthy(kw.compare) === true : true,
    kwOnly: 'kw_only' in kw ? ctx.truthy(kw.kw_only) === true : false,
  });
}
const FieldDef = {
  typeName: 'Field',
  construct: (ctx) => ctx.err('TypeError', 'Field は dataclasses.field() で作ります（直接は実体化できません）', ''),
  attrs: {
    name: (ctx, self) => (self.data.name === null ? NONE : self.data.name),
    type: (ctx, self) => self.data.type,
    default: (ctx, self) => self.data.default,
    default_factory: (ctx, self) => self.data.defaultFactory,
  },
  repr: () => 'Field(...)',
  truthy: () => true,
};

let dcSeq = 0;
function makeDataclassFn(ctx, args, kwargs) {
  arity(ctx, args, 2, 2, 'make_dataclass');
  const clsName = args[0];
  if (typeof clsName !== 'string') ctx.err('TypeError', 'make_dataclass() のクラス名には文字列を使ってください', '');
  const fieldsArg = toArray(ctx, args[1], 'make_dataclass');
  if (fieldsArg === null) return ctx.unk('make_dataclass の型');
  const kw = kwargs || {};
  const frozen = 'frozen' in kw ? ctx.truthy(kw.frozen) === true : false;
  const eqOn = 'eq' in kw ? ctx.truthy(kw.eq) === true : true;
  /* フィールド仕様の正規化：name / (name, type) / (name, type, Field) */
  const specs = [];
  let kwOnlyMode = false;
  for (const el of fieldsArg) {
    if (el === KwOnlySentinel) { kwOnlyMode = true; continue; }
    let name = null, type = NONE, fieldObj = null;
    if (typeof el === 'string') name = el;
    else {
      const parts = toArray(ctx, el, 'make_dataclass');
      if (!parts || !parts.length || typeof parts[0] !== 'string') ctx.err('TypeError', 'フィールド指定は名前の文字列かタプルで渡してください', '');
      name = parts[0];
      if (parts.length >= 2) type = parts[1];
      if (parts.length >= 3) fieldObj = parts[2];
    }
    const spec = { name, type, init: true, repr: true, compare: true, kwOnly: kwOnlyMode, hasDefault: false, default: null, factory: null };
    if (fieldObj && isFieldNative(fieldObj)) {
      spec.init = fieldObj.data.init; spec.repr = fieldObj.data.repr; spec.compare = fieldObj.data.compare;
      if (fieldObj.data.kwOnly) spec.kwOnly = true;
      if (fieldObj.data.default !== MissingSentinel) { spec.hasDefault = true; spec.default = fieldObj.data.default; }
      if (fieldObj.data.defaultFactory !== MissingSentinel) spec.factory = fieldObj.data.defaultFactory;
    }
    specs.push(spec);
  }
  /* 既定値のあるフィールドの後ろに既定値なしは置けない */
  let seenDefault = false;
  for (const s of specs) {
    if (!s.kwOnly) {
      if (s.hasDefault || s.factory) seenDefault = true;
      else if (seenDefault && s.init) ctx.err('TypeError', "non-default argument '" + s.name + "' follows default argument", '');
    }
  }
  const qualname = 'dataclasses.generated.' + clsName + '#' + (dcSeq++);
  const fieldObjs = specs.map((s) => {
    const f = makeNative('dataclasses.Field', {
      name: s.name, type: s.type,
      default: s.hasDefault ? s.default : MissingSentinel,
      defaultFactory: s.factory || MissingSentinel,
      init: s.init, repr: s.repr, compare: s.compare, kwOnly: s.kwOnly,
    });
    return f;
  });
  const def = {
    typeName: clsName,
    dataclassInfo: { fields: fieldObjs, specs, frozen, eqOn },
    construct: (c2, a2, kw2) => {
      const attrs = new Map();
      const positional = specs.filter((s) => s.init && !s.kwOnly);
      if (a2.length > positional.length) c2.err('TypeError', clsName + '.__init__() takes ' + (positional.length + 1) + ' positional arguments but ' + (a2.length + 1) + ' were given', '');
      const filled = new Set();
      a2.forEach((v, i) => { attrs.set(positional[i].name, v); filled.add(positional[i].name); });
      for (const k of Object.keys(kw2 || {})) {
        const spec = specs.find((s) => s.name === k && s.init);
        if (!spec) c2.err('TypeError', clsName + '.__init__() got an unexpected keyword argument \'' + k + '\'', '');
        if (filled.has(k)) c2.err('TypeError', clsName + '.__init__() got multiple values for argument \'' + k + '\'', '');
        attrs.set(k, kw2[k]); filled.add(k);
      }
      for (const s of specs) {
        if (!s.init) {
          if (s.hasDefault) attrs.set(s.name, s.default);
          else if (s.factory) attrs.set(s.name, c2.call(s.factory, []));
          continue;
        }
        if (filled.has(s.name)) continue;
        if (s.hasDefault) attrs.set(s.name, s.default);
        else if (s.factory) attrs.set(s.name, c2.call(s.factory, []));
        else c2.err('TypeError', clsName + '.__init__() missing a required argument: \'' + s.name + '\'', '');
      }
      return c2.native(qualname, { attrs });
    },
    attrs: {},
    repr: (c2, self) => clsName + '(' + specs.filter((s) => s.repr).map((s) => s.name + '=' + c2.repr(self.data.attrs.get(s.name))).join(', ') + ')',
    eq: (c2, self, other) => {
      if (!eqOn) return null;
      if (!other || other.__native !== qualname) return false;
      for (const s of specs) {
        if (!s.compare) continue;
        if (c2.eq(self.data.attrs.get(s.name), other.data.attrs.get(s.name)) !== true) return false;
      }
      return true;
    },
    hash: (c2, self) => {
      if (!frozen || !eqOn) return null;
      return 'o:dc:' + qualname + ':' + specs.map((s) => c2.repr(self.data.attrs.get(s.name))).join(',');
    },
    truthy: () => true,
  };
  specs.forEach((s) => { def.attrs[s.name] = (c2, self) => self.data.attrs.get(s.name); });
  registerStdlibClass(qualname, def);
  return ctx.ncls(qualname);
}

import { nativeClassDef } from './stdlib-registry.js';
function dcInfoOf(v) {
  if (!v || !v.__native) return null;
  const def = nativeClassDef(v.__native);
  return def && def.dataclassInfo ? def.dataclassInfo : null;
}

function isDataclassFn(ctx, args) {
  arity(ctx, args, 1, 1, 'is_dataclass');
  const v = args[0];
  if (v && v.__ncls) { const d = nativeClassDef(v.__ncls); return BOOL(!!(d && d.dataclassInfo)); }
  return BOOL(!!dcInfoOf(v));
}
function fieldsFn(ctx, args) {
  arity(ctx, args, 1, 1, 'fields');
  const v = args[0];
  let info = dcInfoOf(v);
  if (!info && v && v.__ncls) { const d = nativeClassDef(v.__ncls); if (d && d.dataclassInfo) info = d.dataclassInfo; }
  if (!info) ctx.err('TypeError', 'must be called with a dataclass type or instance', 'fields() は make_dataclass で作った型にだけ使えます');
  return TUPLE(info.fields.slice());
}
function convertValue(ctx, v, tupleMode) {
  const info = dcInfoOf(v);
  if (info) {
    const parts = info.specs.map((s) => convertValue(ctx, v.data.attrs.get(s.name), tupleMode));
    if (tupleMode) return TUPLE(parts);
    const d = DICT();
    info.specs.forEach((s, i) => dictSet(d, s.name, parts[i]));
    return d;
  }
  if (isDict(v)) {
    const d = DICT();
    for (const [k, val] of dictPairs(v)) dictSet(d, k, convertValue(ctx, val, tupleMode));
    return d;
  }
  if (isList(v)) { const items = v.__list.map((x) => convertValue(ctx, x, tupleMode)); return tupleMode ? LIST(items) : LIST(items); }
  if (v && v.__tuple) return TUPLE(v.__tuple.map((x) => convertValue(ctx, x, tupleMode)));
  return v;
}
function asdictFn(ctx, args) { arity(ctx, args, 1, 1, 'asdict'); if (!dcInfoOf(args[0])) ctx.err('TypeError', 'asdict() should be called on dataclass instances', ''); return convertValue(ctx, args[0], false); }
function astupleFn(ctx, args) { arity(ctx, args, 1, 1, 'astuple'); if (!dcInfoOf(args[0])) ctx.err('TypeError', 'astuple() should be called on dataclass instances', ''); return convertValue(ctx, args[0], true); }
function replaceFn(ctx, args, kwargs) {
  arity(ctx, args, 1, 1, 'replace');
  const obj = args[0];
  const info = dcInfoOf(obj);
  if (!info) ctx.err('TypeError', 'replace() should be called on dataclass instances', 'replace() は make_dataclass で作ったインスタンスにだけ使えます');
  const changes = kwargs || {};
  for (const k of Object.keys(changes)) {
    if (!info.specs.some((s) => s.name === k)) ctx.err('ValueError', "field '" + k + "' is declared with init=False", '');
  }
  const initArgs = {};
  for (const s of info.specs) {
    if (!s.init) continue;
    initArgs[s.name] = kIn(changes, s.name) ? changes[s.name] : obj.data.attrs.get(s.name);
  }
  const def = nativeClassDef(obj.__native);
  return def.construct(ctx, [], initArgs);
}
function kIn(obj, k) { return Object.prototype.hasOwnProperty.call(obj, k); }

registerStdlibModule('dataclasses', {
  data: { MISSING: MissingSentinel, KW_ONLY: KwOnlySentinel },
  functions: {
    dataclass: (ctx, args) => {
      ctx.diag('@dataclass デコレータはユーザー定義クラスの内部へ __init__ 等を注入するフックが基盤にないため再現できません');
      return args.length ? args[0] : ctx.unk('@dataclass の結果');
    },
    field: fieldFn,
    fields: fieldsFn,
    is_dataclass: isDataclassFn,
    asdict: asdictFn,
    astuple: astupleFn,
    replace: replaceFn,
    make_dataclass: makeDataclassFn,
  },
  classes: {
    Field: FieldDef,
    FrozenInstanceError: { typeName: 'FrozenInstanceError', exc: 'dataclasses.FrozenInstanceError', excParents: ['AttributeError'] },
    InitVar: {
      typeName: 'InitVar',
      construct: (ctx) => { ctx.diag('dataclasses.InitVar は型注釈専用のマーカーで、このエンジンでは注釈が評価されないため再現できません'); return ctx.unk('InitVar の値'); },
      truthy: () => true,
    },
  },
});
