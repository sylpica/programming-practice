/* 高度モード B7 G8（言語ランタイム系）共通ヘルパ。
 * 未対応／未検証の正直な停止（規約 §4）と、enum 風メンバ値・例外対応付けの
 * 小さな部品を提供する。各モジュールの impl-advanced-*.js から使う。 */
import { PyAPI } from './engine.js';
import { makeNative } from './stdlib-registry.js';

export const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
export const I = (v) => NUM(v, false);
export const F = (v) => NUM(v, true);
export const S = (v) => v; // 文字列値はそのまま

export function noKwargs(ctx, kwargs, fname) {
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', fname + '() にキーワード引数「' + ks[0] + '」はありません', 'キーワード引数なしで呼び出してください');
}
export function arity(ctx, args, min, max, fname) {
  if (args.length < min || args.length > max) ctx.err('TypeError', fname + '() の引数の数が合いません（' + args.length + '個渡されました）', 'リファレンスで使い方を確認してください');
}
/* 未対応の関数：理由を述べて例外として停止する（F-03 の正直な停止）。 */
export function unsupportedFn(fname, reason) {
  return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); };
}
/* 未検証の関数：diag で注記して未確定値を返す（規約 §4）。 */
export function unverifiedFn(fname, reason) {
  return (ctx) => { ctx.diag(fname + '：' + reason + ' のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); };
}
/* 未対応のクラス：生成しようとすると理由を述べて停止する。 */
export function unsupportedClassDef(typeName, qualname, reason) {
  return {
    typeName,
    construct: (ctx) => { ctx.err('未対応', qualname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(qualname); },
    repr: () => '<class \'' + qualname + '\'>',
  };
}
/* 未検証のクラス：生成は未確定値として返す。 */
export function unverifiedClassDef(typeName, qualname, reason) {
  return {
    typeName,
    construct: (ctx) => { ctx.diag(qualname + '：' + reason + ' のため未検証です。結果を確定しません'); return ctx.unk(qualname + ' のインスタンス（未検証）'); },
    repr: () => '<class \'' + qualname + '\'>',
  };
}
/* 未対応のメソッド（クラス定義の methods／classMethods 用）。 */
export function unsupportedMethod(qualname, reason) {
  return (ctx) => { ctx.err('未対応', qualname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(qualname); };
}
export function unverifiedMethod(qualname, reason) {
  return (ctx) => { ctx.diag(qualname + '：' + reason + ' のため未検証です。結果を確定しません'); return ctx.unk(qualname + ' の結果（未検証）'); };
}
/* enum 風メンバ値を作る。kind: 'intflag'|'intenum'|'strenum'|'kind'
 * members: [{name, value, description?}]。単例を返し、classAttrs 用の
 * {名前: 値} とクラス定義を返す。 */
export function makeEnum(qualname, typeName, members, kind, label) {
  const L = label || typeName;
  const instances = {};
  /* メンバ指定は [name, value] 配列と {name, value} オブジェクトの両形式を受ける */
  members = members.map((m) => (Array.isArray(m) ? { name: m[0], value: m[1], description: m[2] || null } : m));
  /* メンバはクラス属性としても引けるようにする（def.classAttrs に同梱） */
  for (const m of members) instances[m.name] = makeNative(qualname, { member: m.name, value: m.value, description: m.description || null });
  const def = {
    typeName,
    classAttrs: instances,
    repr: (ctx, self) => {
      const d = self.data;
      if (kind === 'strenum') return '<' + L + '.' + d.member + ': ' + ctx.repr(d.value) + '>';
      return '<' + L + '.' + d.member + ': ' + d.value + '>';
    },
    str: (ctx, self) => {
      const d = self.data;
      if (kind === 'strenum') return d.value;
      if (kind === 'kind') return d.member;
      /* IntEnum／IntFlag の str は整数値そのもの（CPython 3.12 以降） */
      return String(d.value);
    },
    eq: (ctx, self, other) => {
      if (other && other.__native === qualname) return self.data.member === other.data.member;
      if (kind === 'strenum') return typeof other === 'string' ? self.data.value === other : null;
      return ctx.isNum(other) || ctx.isBool(other) ? ctx.num(other) === self.data.value : null;
    },
    /* IntEnum／IntFlag の算術・ビット演算は CPython では int を返す */
    binop: (ctx, self, op, other) => {
      if (kind === 'strenum' || kind === 'kind') return ctx.NOT_HANDLED;
      let ov = null;
      if (other && other.__native === qualname) ov = other.data.value;
      else if (ctx.isNum(other) || ctx.isBool(other)) ov = ctx.num(other);
      if (ov === null) return ctx.NOT_HANDLED;
      const v = self.data.value;
      switch (op) {
        case '|': return I(v | ov);
        case '&': return I(v & ov);
        case '^': return I(v ^ ov);
        case '+': return I(v + ov);
        case '-': return I(v - ov);
        case '*': return I(v * ov);
        case '<<': return I(v << ov);
        case '>>': return I(v >> ov);
        default: return ctx.NOT_HANDLED;
      }
    },
    hash: (ctx, self) => kind === 'strenum' ? 's:' + self.data.value : 'n:' + self.data.value,
    truthy: (ctx, self) => kind === 'strenum' ? self.data.value.length > 0 : self.data.value !== 0,
    attrs: {
      name: (ctx, self) => self.data.member,
      value: (ctx, self) => kind === 'strenum' ? self.data.value : I(self.data.value),
      description: (ctx, self) => self.data.description !== null ? self.data.description : (() => { ctx.err('AttributeError', typeName + ' メンバには description がありません', ''); return UNK(); })(),
    },
  };
  return { def, instances };
}
/* 文字列の dedent（inspect.cleandoc と同じ規則。CPython の実装を移植）。 */
export function cleandocImpl(doc) {
  const expanded = doc.split('\n').map((ln) => {
    let out = '', col = 0;
    for (const ch of ln) { if (ch === '\t') { const n = 8 - (col % 8); out += ' '.repeat(n); col += n; } else { out += ch; col += 1; } }
    return out;
  }).join('\n');
  const lines = expanded.split('\n');
  let indent = Infinity;
  for (let i = 1; i < lines.length; i++) {
    const stripped = lines[i].replace(/^\s+/, '');
    if (stripped) {
      const cur = lines[i].length - stripped.length;
      if (cur < indent) indent = cur;
    }
  }
  if (lines.length) lines[0] = lines[0].replace(/^\s+/, '');
  if (indent !== Infinity) {
    for (let i = 1; i < lines.length; i++) lines[i] = lines[i].slice(indent);
  }
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  while (lines.length && !lines[0]) lines.shift();
  return lines.join('\n');
}
/* CPython の repr に近い文字列 repr（エンジンの reprVal は文字列でほぼ一致）。 */
export function pyRepr(ctx, v) { return ctx.repr(v); }
/* 型注釈の表示（inspect.formatannotation 相当の最小版）：
 * 型値は名前、文字列はそのまま、それ以外は repr。 */
export function formatAnnotation(ctx, v) {
  if (typeof v === 'string') return v;
  if (v && v.__builtin) return v.__builtin;
  if (v && v.__type) return v.__type;
  if (v && v.__ncls) return v.__ncls.split('.').pop();
  if (v && v.__class) return v.cname;
  if (v && v.__native) return ctx.repr(v);
  if (ctx.isNone(v)) return 'None';
  return ctx.repr(v);
}
