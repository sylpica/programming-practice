/* 高度モード B7 G4：array モジュール（23件）。
 * 型コードごとの範囲チェックと float32 の丸め（Math.fround）を CPython どおりに行う。
 * 'u'（3.15 でも残存、削除予定）/'w'（3.13+、UCS4）は文字コードとして扱う。
 * 'e'（float16）・'Zf'/'Zd'（複素数、3.15）はエンジンに表現がなく未確定値に倒す。
 * buffer_info はアドレスを含むため、frombytes/tobytes はエンジンの bytes が
 * 未確定値のため、いずれも未検証。typecodes は 3.15 で str→tuple に変わり
 * 正確な中身をローカルで裏付けできないため未検証（値は未確定値）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  NUM, BOOL, NONE, LIST, TUPLE, I, F, isNum, isBool, isList, isNone, isUnk,
  arity, noKwargs, intVal, toArray, sliceIndices, indexNorm,
} from './impl-advanced-g4-common.js';

const TYPECODES = {
  b: { size: 1, min: -128, max: 127, label: 'signed char', kind: 'int' },
  B: { size: 1, min: 0, max: 255, label: 'unsigned byte integer', kind: 'int' },
  h: { size: 2, min: -32768, max: 32767, label: 'signed short', kind: 'int' },
  H: { size: 2, min: 0, max: 65535, label: 'unsigned short', kind: 'int' },
  i: { size: 4, min: -2147483648, max: 2147483647, label: 'signed int', kind: 'int' },
  I: { size: 4, min: 0, max: 4294967295, label: 'unsigned int', kind: 'int' },
  l: { size: 8, min: null, max: null, label: 'signed long', kind: 'int' },
  L: { size: 8, min: 0, max: null, label: 'unsigned long', kind: 'int' },
  q: { size: 8, min: null, max: null, label: 'signed long long', kind: 'int' },
  Q: { size: 8, min: 0, max: null, label: 'unsigned long long', kind: 'int' },
  f: { size: 4, kind: 'float32' },
  d: { size: 8, kind: 'float' },
  u: { size: 4, kind: 'char' },
  w: { size: 4, kind: 'char' },
};
const BAD_TYPECODE_MSG = 'bad typecode (must be b, B, u, h, H, i, I, l, L, q, Q, f or d)';

function coerceItem(ctx, tc, v) {
  const spec = TYPECODES[tc];
  if (spec.kind === 'char') {
    if (typeof v !== 'string' || Array.from(v).length !== 1) ctx.err('TypeError', "array('" + tc + "') の要素には1文字の文字列を使ってください", '');
    return NUM(Array.from(v)[0].codePointAt(0), false);
  }
  if (spec.kind === 'float32' || spec.kind === 'float') {
    if (isBool(v)) return NUM(v.v ? 1 : 0, true);
    if (!isNum(v)) ctx.err('TypeError', '要素には数値を使ってください（' + ctx.typeName(v) + '）', '');
    const x = spec.kind === 'float32' ? Math.fround(v.v) : v.v;
    return NUM(x, true);
  }
  /* int 系 */
  let n = null;
  if (isBool(v)) n = v.v ? 1 : 0;
  else if (isNum(v) && !v.f) n = v.v;
  else if (isNum(v) && Number.isInteger(v.v)) n = v.v;
  if (n === null) ctx.err('TypeError', "array('" + tc + "') の要素には整数を使ってください", '');
  if (spec.min !== null && n < spec.min) ctx.err('OverflowError', spec.label + ' is less than minimum', '');
  if (spec.max !== null && n > spec.max) ctx.err('OverflowError', spec.label + ' is greater than maximum', '');
  if ((tc === 'l' || tc === 'q') && !Number.isSafeInteger(n)) { /* JS 数の範囲内でのみ厳密 */ }
  if ((tc === 'L' || tc === 'Q') && n < 0) ctx.err('OverflowError', spec.label + ' is less than minimum', '');
  return I(n);
}
function itemOut(ctx, self, stored) {
  if (TYPECODES[self.data.typecode].kind === 'char') return String.fromCodePoint(Math.trunc(stored.v));
  return stored;
}

const ArrayDef = {
  typeName: 'array',
  parents: ['collections.abc.MutableSequence'],
  construct: (ctx, args, kwargs) => {
    arity(ctx, args, 1, 2, 'array'); noKwargs(ctx, kwargs, 'array');
    const tc = args[0];
    if (typeof tc !== 'string') ctx.err('TypeError', 'array() の第1引数には型コードの文字列を使ってください', '');
    if (tc === 'e' || tc === 'Zf' || tc === 'Zd') {
      ctx.diag('array の型コード ' + tc + '（float16・複素数）はこのエンジンでは表現できないため、値は未確定になります');
      return ctx.unk('array(' + tc + ') の値');
    }
    if (!TYPECODES[tc]) ctx.err('ValueError', BAD_TYPECODE_MSG, '');
    const self = { __native: 'array.array', mod: 'array', data: { typecode: tc, items: [] } };
    if (args.length === 2) arrayExtend(ctx, self, args[1]);
    return self;
  },
  methods: {
    append: (ctx, self, args) => { arity(ctx, args, 1, 1, 'append'); self.data.items.push(coerceItem(ctx, self.data.typecode, args[0])); return NONE; },
    buffer_info: (ctx, self) => { ctx.diag('array.buffer_info() はメモリアドレスを含むため、このエンジンでは再現できません'); return ctx.unk('buffer_info() の結果'); },
    byteswap: (ctx, self) => {
      if (TYPECODES[self.data.typecode].size === 1) return NONE;
      ctx.diag('array.byteswap() はバイト列の並び替えであり、このエンジンの数値表現では観測可能な変化がないため何もしません');
      return NONE;
    },
    clear: (ctx, self) => { self.data.items.length = 0; return NONE; },
    count: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'count');
      const target = coerceItem(ctx, self.data.typecode, args[0]);
      let n = 0;
      for (const v of self.data.items) if (ctx.eq(v, target) === true) n++;
      return I(n);
    },
    extend: (ctx, self, args) => { arity(ctx, args, 1, 1, 'extend'); arrayExtend(ctx, self, args[0]); return NONE; },
    frombytes: (ctx, self) => { ctx.diag('bytes 値はこのエンジンでは未確定値のため、array.frombytes() は再現できません'); return ctx.unk('frombytes() の結果'); },
    fromfile: (ctx) => ctx.err('TypeError', 'このエンジンにはファイルオブジェクトがないため fromfile() は使えません', ''),
    fromlist: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'fromlist');
      if (!isList(args[0])) ctx.err('TypeError', 'arg must be list', 'fromlist() にはリストを渡してください');
      for (const v of args[0].__list) self.data.items.push(coerceItem(ctx, self.data.typecode, v));
      return NONE;
    },
    fromstring: (ctx, self) => { ctx.diag('bytes 値はこのエンジンでは未確定値のため、array.fromstring() は再現できません'); return ctx.unk('fromstring() の結果'); },
    fromunicode: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'fromunicode');
      const tc = self.data.typecode;
      if (tc !== 'u' && tc !== 'w') ctx.err('ValueError', "fromunicode() は 'u' または 'w' 型の array でのみ使えます", '');
      if (typeof args[0] !== 'string') ctx.err('TypeError', 'fromunicode() には文字列を使ってください', '');
      for (const ch of args[0]) self.data.items.push(NUM(ch.codePointAt(0), false));
      return NONE;
    },
    index: (ctx, self, args) => {
      arity(ctx, args, 1, 3, 'index');
      const target = coerceItem(ctx, self.data.typecode, args[0]);
      const len = self.data.items.length;
      let start = 0, stop = len;
      if (args.length >= 2) { const n = intVal(ctx, args[1]); start = n === null ? 0 : Math.max(0, n < 0 ? n + len : n); }
      if (args.length >= 3) { const n = intVal(ctx, args[2]); stop = n === null ? len : Math.max(0, Math.min(len, n < 0 ? n + len : n)); }
      for (let i = start; i < stop; i++) if (ctx.eq(self.data.items[i], target) === true) return I(i);
      ctx.err('ValueError', 'array.index(x): x not in array', '');
    },
    insert: (ctx, self, args) => {
      arity(ctx, args, 2, 2, 'insert');
      let i = intVal(ctx, args[0]);
      if (i === null) ctx.err('TypeError', 'insert() の番号には整数を使ってください', '');
      const len = self.data.items.length;
      if (i < 0) i = Math.max(0, i + len);
      if (i > len) i = len;
      self.data.items.splice(i, 0, coerceItem(ctx, self.data.typecode, args[1]));
      return NONE;
    },
    pop: (ctx, self, args) => {
      arity(ctx, args, 0, 1, 'pop');
      const items = self.data.items;
      if (!items.length) ctx.err('IndexError', 'pop from empty array', '');
      let i = args.length === 1 ? indexNorm(ctx, args[0], items.length, 'pop') : items.length - 1;
      if (i < 0 || i >= items.length) ctx.err('IndexError', 'pop index out of range', '');
      return itemOut(ctx, self, items.splice(i, 1)[0]);
    },
    remove: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'remove');
      const target = coerceItem(ctx, self.data.typecode, args[0]);
      const i = self.data.items.findIndex((v) => ctx.eq(v, target) === true);
      if (i < 0) ctx.err('ValueError', 'array.remove(x): x not in array', '');
      self.data.items.splice(i, 1);
      return NONE;
    },
    reverse: (ctx, self) => { self.data.items.reverse(); return NONE; },
    tobytes: (ctx, self) => { ctx.diag('bytes 値はこのエンジンでは未確定値のため、array.tobytes() は再現できません'); return ctx.unk('tobytes() の結果'); },
    tofile: (ctx) => ctx.err('TypeError', 'このエンジンにはファイルオブジェクトがないため tofile() は使えません', ''),
    tolist: (ctx, self) => LIST(self.data.items.map((v) => itemOut(ctx, self, v))),
    tostring: (ctx, self) => { ctx.diag('bytes 値はこのエンジンでは未確定値のため、array.tostring() は再現できません'); return ctx.unk('tostring() の結果'); },
    tounicode: (ctx, self) => {
      const tc = self.data.typecode;
      if (tc !== 'u' && tc !== 'w') ctx.err('ValueError', "tounicode() は 'u' または 'w' 型の array でのみ使えます", '');
      return self.data.items.map((v) => String.fromCodePoint(Math.trunc(v.v))).join('');
    },
  },
  attrs: {
    typecode: (ctx, self) => self.data.typecode,
    itemsize: (ctx, self) => I(TYPECODES[self.data.typecode].size),
  },
  getitem: (ctx, self, key) => {
    const items = self.data.items;
    if (key && key.__slice) {
      const idx = sliceIndices(ctx, key, items.length);
      return ctx.native('array.array', { typecode: self.data.typecode, items: idx.map((i) => items[i]) });
    }
    const i = indexNorm(ctx, key, items.length, 'array');
    if (i < 0 || i >= items.length) ctx.err('IndexError', 'array index out of range', '');
    return itemOut(ctx, self, items[i]);
  },
  setitem: (ctx, self, key, value) => {
    const items = self.data.items;
    if (key && key.__slice) {
      const idx = sliceIndices(ctx, key, items.length);
      const vals = toArray(ctx, value, 'array');
      if (vals === null) return false;
      const coerced = vals.map((v) => coerceItem(ctx, self.data.typecode, v));
      if (key.step !== null && key.step !== undefined && !isNone(key.step)) {
        if (coerced.length !== idx.length) ctx.err('ValueError', '間隔つきスライスへの代入では要素の数を揃えてください', '');
        idx.forEach((pos, q) => { items[pos] = coerced[q]; });
      } else if (idx.length) {
        items.splice(idx[0], idx.length, ...coerced);
      } else {
        /* 空範囲への挿入：開始位置は lo をクランプした位置 */
        let pos = 0;
        if (key.lo !== null && key.lo !== undefined && !isNone(key.lo)) {
          const lv = intVal(ctx, key.lo);
          pos = lv === null ? 0 : Math.max(0, Math.min(items.length, lv < 0 ? lv + items.length : lv));
        }
        items.splice(pos, 0, ...coerced);
      }
      return true;
    }
    const i = indexNorm(ctx, key, items.length, 'array');
    if (i < 0 || i >= items.length) ctx.err('IndexError', 'array assignment index out of range', '');
    items[i] = coerceItem(ctx, self.data.typecode, value);
    return true;
  },
  contains: (ctx, self, item) => {
    let target;
    try { target = coerceItem(ctx, self.data.typecode, item); } catch (e) { return false; }
    return self.data.items.some((v) => ctx.eq(v, target) === true);
  },
  len: (ctx, self) => self.data.items.length,
  iter: (ctx, self) => self.data.items.map((v) => itemOut(ctx, self, v)),
  repr: (ctx, self) => {
    const tc = self.data.typecode;
    if (!self.data.items.length) return "array('" + tc + "')";
    return "array('" + tc + "', [" + self.data.items.map((v) => ctx.repr(itemOut(ctx, self, v))).join(', ') + '])';
  },
  eq: (ctx, self, other) => {
    if (!other || other.__native !== 'array.array') return false;
    if (other.data.typecode !== self.data.typecode) return false;
    const a = self.data.items, b = other.data.items;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (ctx.eq(a[i], b[i]) !== true) return false;
    return true;
  },
  hash: () => null,
  truthy: (ctx, self) => self.data.items.length > 0,
  binop: (ctx, self, op, other, reflected) => {
    if (op === '+') {
      const a = reflected ? other : self, b = reflected ? self : other;
      if (!b || b.__native !== 'array.array' || a.data.typecode !== b.data.typecode) return ctx.NOT_HANDLED;
      return ctx.native('array.array', { typecode: a.data.typecode, items: a.data.items.concat(b.data.items) });
    }
    if (op === '*') {
      const nv = reflected ? self : other;
      const n = intVal(ctx, nv);
      if (n === null) return ctx.NOT_HANDLED;
      const src = reflected ? other : self;
      if (!src || src.__native !== 'array.array') return ctx.NOT_HANDLED;
      const out = [];
      for (let r = 0; r < Math.max(0, n); r++) out.push(...src.data.items);
      return ctx.native('array.array', { typecode: src.data.typecode, items: out });
    }
    return ctx.NOT_HANDLED;
  },
};
function arrayExtend(ctx, self, src) {
  if (src && src.__native === 'array.array') {
    if (src.data.typecode !== self.data.typecode) ctx.err('TypeError', 'can only extend with array of same kind', '型コードの異なる array は連結できません');
    for (const v of src.data.items) self.data.items.push(v);
    return;
  }
  if (typeof src === 'string') {
    if (self.data.typecode !== 'u' && self.data.typecode !== 'w') ctx.err('TypeError', '文字列から extend できるのは \'u\'/\'w\' 型だけです', '');
    for (const ch of src) self.data.items.push(NUM(ch.codePointAt(0), false));
    return;
  }
  const arr = toArray(ctx, src, 'array');
  if (arr === null) return;
  for (const v of arr) self.data.items.push(coerceItem(ctx, self.data.typecode, v));
}

registerStdlibModule('array', {
  data: {
    /* 3.15 で str から tuple へ変更され、正確な中身を裏付けできないため未検証 */
    typecodes: { __unk: 'array.typecodes（3.15 でタプル化され正確な中身を確認できない）' },
  },
  classes: { array: ArrayDef },
});
