/* 高度モード B7 G4：copy モジュール（4件）。
 * copy は浅いコピー（コンテナは複製、要素は共有。タプルは同一オブジェクト）。
 * deepcopy はメモ化つき再帰コピーで、循環参照の同一性を保つ。
 * replace は 3.13+ の追加で、ローカル 3.12 では裏付けできないため未検証に倒し、
 * _replace を持つ自群ネイティブ（namedtuple 等）には最善努力で委譲する。 */
import { registerStdlibModule, registerStdlibException } from './stdlib-registry.js';
import { NONE, LIST, TUPLE, DICT, SET, isList, isTuple, isDict, isSet, isNone, isUnk, arity, dictPairs, dictKeyId } from './impl-advanced-g4-common.js';

registerStdlibException('copy.Error', ['Exception']);

function cloneDictShallow(d) {
  const nd = DICT();
  for (const [id, e] of d.__dict) nd.__dict.set(id, { k: e.k, v: e.v });
  return nd;
}
function shallowCopy(ctx, v) {
  if (isList(v)) return LIST(v.__list.slice());
  if (isDict(v)) return cloneDictShallow(v);
  if (isSet(v)) return SET(v.__set.slice());
  if (isTuple(v)) return v;
  if (v && v.__class) {
    const attrs = new Map();
    for (const [k, val] of v.attrs) attrs.set(k, val);
    return { __class: v.__class, cname: v.cname, cenv: v.cenv, attrs };
  }
  if (v && v.__native) {
    const data = {};
    for (const k of Object.keys(v.data || {})) {
      const val = v.data[k];
      data[k] = Array.isArray(val) ? val.slice()
        : (val && val.__dict instanceof Map) ? cloneDictShallow(val)
        : (val instanceof Map) ? new Map(val)
        : val;
    }
    return ctx.native(v.__native, data);
  }
  return v;
}
function deepCopy(ctx, v, memo) {
  if (isUnk(v) || v === null || typeof v !== 'object') return v;
  const hit = memo.get(v);
  if (hit !== undefined) return hit;
  if (isList(v)) {
    const out = LIST([]);
    memo.set(v, out);
    for (const el of v.__list) out.__list.push(deepCopy(ctx, el, memo));
    return out;
  }
  if (isDict(v)) {
    const out = DICT();
    memo.set(v, out);
    for (const e of v.__dict.values()) {
      const nk = deepCopy(ctx, e.k, memo);
      const nv = deepCopy(ctx, e.v, memo);
      const id = dictKeyId(nk);
      if (id !== null && id !== undefined) out.__dict.set(id, { k: nk, v: nv });
    }
    return out;
  }
  if (isSet(v)) {
    const out = SET([]);
    memo.set(v, out);
    for (const el of v.__set) out.__set.push(deepCopy(ctx, el, memo));
    return out;
  }
  if (isTuple(v)) {
    const items = v.__tuple.map((el) => deepCopy(ctx, el, memo));
    const same = items.every((el, i) => el === v.__tuple[i]);
    const out = same ? v : TUPLE(items);
    memo.set(v, out);
    return out;
  }
  if (v.__class) {
    const out = { __class: v.__class, cname: v.cname, cenv: v.cenv, attrs: new Map() };
    memo.set(v, out);
    for (const [k, val] of v.attrs) out.attrs.set(k, deepCopy(ctx, val, memo));
    return out;
  }
  if (v.__native) {
    const data = {};
    const out = ctx.native(v.__native, data);
    memo.set(v, out);
    for (const k of Object.keys(v.data || {})) {
      const val = v.data[k];
      if (val instanceof Map) {
        const nm = new Map();
        for (const [mk, mv] of val) nm.set(mk, deepCopy(ctx, mv, memo));
        data[k] = nm;
      } else {
        data[k] = deepCopy(ctx, val, memo);
      }
    }
    return out;
  }
  return v;
}
registerStdlibModule('copy', {
  classes: {
    Error: { typeName: 'Error', exc: 'copy.Error', excParents: ['Exception'] },
  },
  functions: {
    copy: (ctx, args) => { arity(ctx, args, 1, 1, 'copy'); return shallowCopy(ctx, args[0]); },
    deepcopy: (ctx, args) => { arity(ctx, args, 1, 2, 'deepcopy'); return deepCopy(ctx, args[0], new Map()); },
    replace: (ctx, args, kwargs) => {
      arity(ctx, args, 1, 1, 'replace');
      const obj = args[0];
      if (obj && obj.__native) {
        const q = obj.__native;
        const def = ctx.ncls(q);
        if (def && def.methods && def.methods._replace) {
          return def.methods._replace(ctx, obj, [], kwargs || {});
        }
        if (obj.data && obj.data.sn) {
          const merged = {};
          for (const [k, v] of obj.data.attrs) merged[k] = v;
          for (const k of Object.keys(kwargs || {})) merged[k] = kwargs[k];
          const baseDef = ctx.ncls('types.SimpleNamespace');
          if (baseDef && baseDef.construct) return baseDef.construct(ctx, [], merged);
        }
      }
      ctx.diag('copy.replace()（3.13+）はローカル環境で意味論を裏付けできないため、値は未確定になります');
      return ctx.unk('copy.replace() の結果');
    },
  },
});
