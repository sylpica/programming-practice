/* 高度モード B7 G7: struct モジュール。
* 書式解析（@ のネイティブサイズ・アライメント、標準モードでは n/N/P が
* bad char）・pack/unpack/unpack_from/iter_unpack/calcsize を CPython 3.12.3
* 実走と照合して実装。pack は g7.bytes を返す。pack_into は書き込み可能な
* バッファ（bytearray）がエンジンに無いため未検証。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  I, F, BOOL, TUPLE, ITER, UNK, makeBytesVal, bytesArr, unkRet, unverifiedFn, onlyKw,
} from './impl-advanced-g7-common.js';

const errS = (ctx, msg) => ctx.err('struct.error', msg, '');

/* ネイティブ（@）サイズ。標準モードでは l/L が 4 になる */
const NATIVE_SIZE = { x: 1, c: 1, b: 1, B: 1, '?': 1, h: 2, H: 2, e: 2, i: 4, I: 4, f: 4, l: 8, L: 8, q: 8, Q: 8, n: 8, N: 8, d: 8, P: 8 };
const STD_SIZE = { ...NATIVE_SIZE, l: 4, L: 4 };
delete STD_SIZE.n; delete STD_SIZE.N; delete STD_SIZE.P;

export function parseFormat(ctx, fmt) {
  if (typeof fmt !== 'string') { ctx.err('TypeError', 'struct format must be a string', ''); return null; }
  let mode = '@';
  let s = fmt;
  if ('@=<>!'.includes(s[0])) { mode = s[0]; s = s.slice(1); }
  const sizes = mode === '@' ? NATIVE_SIZE : STD_SIZE;
  const items = []; // {code, count, size(単位), offset}
  let i = 0, offset = 0;
  const alignTo = (n) => { if (mode === '@' && n > 1) { const r = offset % n; if (r) offset += n - r; } };
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }
    let count = null;
    if (ch >= '0' && ch <= '9') {
      let j = i;
      while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      count = parseInt(s.slice(i, j), 10);
      i = j;
      if (i >= s.length) errS(ctx, 'repeat count given without format specifier');
    }
    const code = s[i]; i++;
    if (code === 's' || code === 'p') {
      const n = count === null ? 1 : count;
      items.push({ code, count: n, size: n, offset });
      offset += n;
      continue;
    }
    if (!(code in sizes)) errS(ctx, 'bad char in struct format');
    const unit = sizes[code];
    const cnt = count === null ? 1 : count;
    for (let k = 0; k < cnt; k++) {
      alignTo(unit);
      items.push({ code, count: 1, size: unit, offset });
      offset += unit;
    }
  }
  return { mode, items, size: offset, fmt };
}

function intRange(ctx, code, unit) {
  const signed = 'bhiqln'.includes(code);
  const bits = unit * 8;
  if (signed) {
    const min = -(2n ** BigInt(bits - 1)), max = 2n ** BigInt(bits - 1) - 1n;
    return [min, max];
  }
  return [0n, 2n ** BigInt(bits) - 1n];
}
const RANGE_NAME = { b: 'byte', B: 'ubyte', h: 'short', H: 'ushort', i: 'int', I: 'uint', l: 'long', L: 'ulong', q: 'long long', Q: 'unsigned long long', n: 'ssize_t', N: 'size_t', P: 'void *' };

function toBigIntVal(ctx, v, code) {
  if (ctx.isBool(v)) return v.v ? 1n : 0n;
  if (ctx.isNum(v)) {
    if (v.f) { ctx.err('TypeError', 'required argument is not an integer', ''); return null; }
    return BigInt(v.v);
  }
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'required argument is not an integer', '');
  return null;
}

function halfToFloat(h) {
  const sign = (h >> 15) & 1, exp = (h >> 10) & 31, frac = h & 1023;
  if (exp === 0) return (sign ? -1 : 1) * (frac / 1024) * Math.pow(2, -14);
  if (exp === 31) return frac ? NaN : (sign ? -Infinity : Infinity);
  return (sign ? -1 : 1) * (1 + frac / 1024) * Math.pow(2, exp - 15);
}
function floatToHalf(x) {
  if (Number.isNaN(x)) return 0x7e00;
  if (x === Infinity) return 0x7c00;
  if (x === -Infinity) return 0xfc00;
  if (x === 0) return Object.is(x, -0) ? 0x8000 : 0;
  const sign = x < 0 ? 0x8000 : 0;
  const ax = Math.abs(x);
  let e = Math.floor(Math.log2(ax));
  if (e < -14) {
    // 非正規化数
    const f = Math.round(ax / Math.pow(2, -24));
    return sign | f;
  }
  if (e > 15) return sign | 0x7c00; // overflow → inf（CPython は OverflowError の場合もあるが丸めに倒す）
  const m = ax / Math.pow(2, e) - 1;
  let frac = Math.round(m * 1024);
  let ee = e + 15;
  if (frac === 1024) { frac = 0; ee += 1; if (ee >= 31) return sign | 0x7c00; }
  return sign | (ee << 10) | frac;
}

const littleOf = (mode) => mode !== '>' && mode !== '!';

function packOne(ctx, out, item, v, little) {
  const { code, size } = item;
  const off = out.length;
  for (let k = 0; k < item.offset - off; k++) out.push(0); // アライメントパディング
  if (code === 'x') { for (let k = 0; k < size; k++) out.push(0); return; }
  if (code === 'c') {
    const a = bytesArr(v);
    if (a === null) { if (ctx.isUnk(v)) { out.push(0); return 'unk'; } errS(ctx, "char format requires a bytes object of length 1"); }
    if (a.length !== 1) errS(ctx, "char format requires a bytes object of length 1");
    out.push(a[0]); return;
  }
  if (code === 's' || code === 'p') {
    const a = bytesArr(v);
    if (a === null) { if (ctx.isUnk(v)) { for (let k = 0; k < size; k++) out.push(0); return 'unk'; } errS(ctx, "argument for '" + code + "' must be a bytes object"); }
    if (code === 's') {
      for (let k = 0; k < size; k++) out.push(k < a.length ? a[k] : 0);
    } else {
      const n = Math.min(a.length, size - 1, 255);
      out.push(size === 0 ? 0 : n);
      for (let k = 1; k < size; k++) out.push(k - 1 < a.length ? a[k - 1] : 0);
      if (size === 0) out.pop();
    }
    return;
  }
  if (code === '?') { out.push(ctx.truthy(v) ? 1 : 0); return; }
  if (code === 'f' || code === 'd' || code === 'e') {
    const x = ctx.num(v);
    if (x === null) { if (ctx.isUnk(v)) { for (let k = 0; k < size; k++) out.push(0); return 'unk'; } ctx.err('TypeError', 'required argument is not a float', ''); return; }
    const buf = new ArrayBuffer(8);
    const dv = new DataView(buf);
    if (code === 'f') { dv.setFloat32(0, x, little); for (let k = 0; k < 4; k++) out.push(dv.getUint8(k)); }
    else if (code === 'd') { dv.setFloat64(0, x, little); for (let k = 0; k < 8; k++) out.push(dv.getUint8(k)); }
    else { const h = floatToHalf(x); out.push(little ? h & 255 : (h >> 8) & 255, little ? (h >> 8) & 255 : h & 255); }
    return;
  }
  // 整数系
  const bv = toBigIntVal(ctx, v, code);
  if (bv === null) { for (let k = 0; k < size; k++) out.push(0); return 'unk'; }
  const [min, max] = intRange(ctx, code, size);
  if (bv < min || bv > max) {
    errS(ctx, RANGE_NAME[code] + ' format requires ' + min.toString() + ' <= number <= ' + max.toString());
  }
  let uv = bv < 0n ? (1n << BigInt(size * 8)) + bv : bv;
  const bytes = [];
  for (let k = 0; k < size; k++) { bytes.push(Number(uv & 255n)); uv >>= 8n; }
  if (!little) bytes.reverse();
  out.push(...bytes);
}

function unpackOne(ctx, buf, item, little) {
  const { code, size, offset } = item;
  if (code === 'x') return null;
  if (code === 'c') return makeBytesVal([buf[offset]]);
  if (code === 's') return makeBytesVal(buf.slice(offset, offset + size));
  if (code === 'p') {
    const n = size === 0 ? 0 : Math.min(buf[offset], size - 1);
    return makeBytesVal(buf.slice(offset + 1, offset + 1 + n));
  }
  if (code === '?') return BOOL(buf[offset] !== 0);
  if (code === 'f' || code === 'd' || code === 'e') {
    const dv = new DataView(new Uint8Array(buf.slice(offset, offset + size)).buffer);
    if (code === 'f') return F(dv.getFloat32(0, little));
    if (code === 'd') return F(dv.getFloat64(0, little));
    const h = little ? (buf[offset] | (buf[offset + 1] << 8)) : ((buf[offset] << 8) | buf[offset + 1]);
    return F(halfToFloat(h));
  }
  let uv = 0n;
  const bytes = buf.slice(offset, offset + size);
  const ordered = little ? [...bytes].reverse() : bytes;
  for (const b of ordered) uv = (uv << 8n) | BigInt(b);
  const signed = 'bhiqln'.includes(code);
  if (signed) {
    const bits = BigInt(size * 8);
    if (uv >= 2n ** (bits - 1n)) uv -= 2n ** bits;
  }
  const num = Number(uv);
  if (!Number.isSafeInteger(num)) return null; // 64ビット級で安全整数を超える場合は未確定（呼び出し側で UNK 化）
  return I(num);
}

function doPack(ctx, parsed, args) {
  const need = parsed.items.filter((it) => it.code !== 'x').length;
  if (args.length !== need) errS(ctx, 'pack expected ' + need + ' items for packing (got ' + args.length + ')');
  const out = [];
  let ai = 0, unk = false;
  for (const item of parsed.items) {
    if (item.code === 'x') { packOne(ctx, out, item, null, littleOf(parsed.mode)); continue; }
    const r = packOne(ctx, out, item, args[ai++], littleOf(parsed.mode));
    if (r === 'unk') unk = true;
  }
  while (out.length < parsed.size) out.push(0);
  return unk ? null : out;
}
function doUnpack(ctx, parsed, buf, offset) {
  if (buf.length - offset < parsed.size) errS(ctx, 'unpack requires a buffer of ' + parsed.size + ' bytes');
  const vals = [];
  let unk = false;
  for (const item of parsed.items) {
    if (item.code === 'x') continue;
    const shifted = { ...item, offset: item.offset + offset };
    const v = unpackOne(ctx, buf, shifted, littleOf(parsed.mode));
    if (v === null) unk = true;
    vals.push(v === null ? UNK('大きな整数（未確定）') : v);
  }
  return TUPLE(vals);
}
function bufArg(ctx, v, fname) {
  const a = bytesArr(v);
  if (a !== null) return a;
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'a bytes-like object is required, not ' + ctx.typeName(v), '');
  return null;
}

const STRUCT_Q = 'struct.Struct';
export function makeStructVal(parsed) {
  return { __native: STRUCT_Q, mod: 'struct', data: { parsed } };
}
function structParsed(ctx, self) { return self.data.parsed; }

const STRUCT_CLASS_DEF = {
  typeName: 'Struct',
  construct: (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, ['format'], 'struct.Struct');
    const fmtV = args.length >= 1 ? args[0] : kwargs.format;
    if (fmtV === undefined) { ctx.err('TypeError', 'Struct() missing required argument: format', ''); return null; }
    if (ctx.isUnk(fmtV)) return unkRet(ctx, 'struct.Struct の書式');
    const parsed = parseFormat(ctx, fmtV);
    if (!parsed) return null;
    return makeStructVal(parsed);
  },
  repr: (ctx, self) => "Struct('" + self.data.parsed.fmt + "')",
  attrs: {
    format: (ctx, self) => self.data.parsed.fmt,
    size: (ctx, self) => I(self.data.parsed.size),
  },
  methods: {
    pack: (ctx, self, args) => {
      const r = doPack(ctx, structParsed(ctx, self), args);
      return r === null ? unkRet(ctx, 'struct.pack の入力') : makeBytesVal(r);
    },
    unpack: (ctx, self, args) => {
      const buf = bufArg(ctx, args[0], 'struct.unpack');
      if (buf === null) return unkRet(ctx, 'struct.unpack の入力');
      return doUnpack(ctx, structParsed(ctx, self), buf, 0);
    },
    unpack_from: (ctx, self, args, kwargs) => {
      const buf = bufArg(ctx, args[0], 'struct.unpack_from');
      if (buf === null) return unkRet(ctx, 'struct.unpack_from の入力');
      let offset = 0;
      const ov = 'offset' in kwargs ? kwargs.offset : args[1];
      if (ov !== undefined) { offset = ctx.int(ov); if (offset === null) return unkRet(ctx, 'offset'); }
      if (offset < 0) offset = buf.length + offset;
      return doUnpack(ctx, structParsed(ctx, self), buf, offset);
    },
    iter_unpack: (ctx, self, args) => {
      const buf = bufArg(ctx, args[0], 'struct.iter_unpack');
      if (buf === null) return unkRet(ctx, 'struct.iter_unpack の入力');
      const parsed = structParsed(ctx, self);
      if (parsed.size === 0 || buf.length % parsed.size !== 0) {
        errS(ctx, 'iterative unpacking requires a buffer of a multiple of ' + parsed.size + ' bytes');
      }
      const tuples = [];
      for (let off = 0; off < buf.length; off += parsed.size) tuples.push(doUnpack(ctx, parsed, buf, off));
      return ITER(tuples, 'tuple_iterator');
    },
    pack_into: unverifiedFn('struct.Struct.pack_into', '書き込み可能なバッファ（bytearray）がエンジンに無い'),
  },
};

function modulePack(ctx, args, kwargs) {
  onlyKw(ctx, kwargs, [], 'struct.pack');
  const parsed = parseFormat(ctx, args[0]);
  const r = doPack(ctx, parsed, args.slice(1));
  return r === null ? unkRet(ctx, 'struct.pack の入力') : makeBytesVal(r);
}
function moduleUnpack(ctx, args, kwargs, from) {
  onlyKw(ctx, kwargs, [], 'struct.unpack');
  const parsed = parseFormat(ctx, args[0]);
  const buf = bufArg(ctx, args[1], 'struct.unpack');
  if (buf === null) return unkRet(ctx, 'struct.unpack の入力');
  let offset = 0;
  if (from) {
    const ov = 'offset' in kwargs ? kwargs.offset : args[2];
    if (ov !== undefined) { offset = ctx.int(ov); if (offset === null) return unkRet(ctx, 'offset'); }
    if (offset < 0) offset = buf.length + offset;
  }
  return doUnpack(ctx, parsed, buf, offset);
}

registerStdlibModule('struct', {
  functions: {
    pack: modulePack,
    unpack: (ctx, args, kwargs) => moduleUnpack(ctx, args, kwargs, false),
    unpack_from: (ctx, args, kwargs) => moduleUnpack(ctx, args, kwargs, true),
    calcsize: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'struct.calcsize');
      const parsed = parseFormat(ctx, args[0]);
      return I(parsed.size);
    },
    iter_unpack: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'struct.iter_unpack');
      const parsed = parseFormat(ctx, args[0]);
      const buf = bufArg(ctx, args[1], 'struct.iter_unpack');
      if (buf === null) return unkRet(ctx, 'struct.iter_unpack の入力');
      if (parsed.size === 0 || buf.length % parsed.size !== 0) {
        errS(ctx, 'iterative unpacking requires a buffer of a multiple of ' + parsed.size + ' bytes');
      }
      const tuples = [];
      for (let off = 0; off < buf.length; off += parsed.size) tuples.push(doUnpack(ctx, parsed, buf, off));
      return ITER(tuples, 'tuple_iterator');
    },
    pack_into: unverifiedFn('struct.pack_into', '書き込み可能なバッファ（bytearray）がエンジンに無い'),
  },
  classes: {
    Struct: STRUCT_CLASS_DEF,
    error: { typeName: 'error', exc: 'struct.error', excParents: ['Exception'] },
  },
});
export {};
