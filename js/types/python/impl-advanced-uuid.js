/* 高度モード B7 G7: uuid モジュール。
* 128ビット値を BigInt で保持し、解析・生成・属性・比較を CPython（3.12 実走＋
* 3.15 ドキュメント）どおりに実装。uuid3/uuid5 は決定論的で実走照合済み。
* UUID.int は 128ビットで安全整数を超えるため未検証（UNK を返す）。
* UUID.time は v1/v6 が 60ビットで安全整数を超えるため未検証、v7 は ms で正確。
* uuid4/uuid1/uuid6/uuid7 の乱数源は Math.random（暗号学的に安全ではない旨を
* リファレンス caution に明記）。getnode は環境依存のため未対応。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  I, F, BOOL, NONE, TUPLE, UNK, makeBytesVal, bytesArr, unkRet, unsupportedFn, onlyKw, kwBool,
} from './impl-advanced-g7-common.js';
import { md5Bytes, sha1Bytes } from './impl-advanced-hashlib.js';

const UUID_Q = 'uuid.UUID';
const SAFE_Q = 'uuid.SafeUUID';
const MASK128 = (1n << 128n) - 1n;

function randBigInt(bits) {
  let v = 0n;
  let left = bits;
  while (left > 0) {
    const take = Math.min(left, 30);
    v = (v << BigInt(take)) | BigInt(Math.floor(Math.random() * (1 << take)));
    left -= take;
  }
  return v;
}
function makeUUID(intVal, isSafe = null) {
  return { __native: UUID_Q, mod: 'uuid', data: { int: intVal & MASK128, isSafe } };
}
function makeSafe(val) { return { __native: SAFE_Q, mod: 'uuid', data: { val } }; }
export const SAFE_UNKNOWN = makeSafe(null);
export const SAFE_SAFE = makeSafe(0);
export const SAFE_UNSAFE = makeSafe(-1);

function uuidHex(intVal) { return intVal.toString(16).padStart(32, '0'); }
function uuidStr(intVal) {
  const h = uuidHex(intVal);
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}
function fieldsOf(intVal) {
  return {
    time_low: Number((intVal >> 96n) & 0xffffffffn),
    time_mid: Number((intVal >> 80n) & 0xffffn),
    time_hi_version: Number((intVal >> 64n) & 0xffffn),
    clock_seq_hi_variant: Number((intVal >> 56n) & 0xffn),
    clock_seq_low: Number((intVal >> 48n) & 0xffn),
    node: Number(intVal & 0xffffffffffffn),
  };
}
function variantOf(intVal) {
  const c = Number((intVal >> 62n) & 0x3n);
  const top = Number((intVal >> 63n) & 1n);
  if (!top) return 'reserved for NCS compatibility';
  if (c === 2) return 'specified in RFC 4122';
  if (c === 3) return 'reserved for Microsoft compatibility';
  return 'reserved for future definition';
}
function versionOf(intVal) {
  if (variantOf(intVal) !== 'specified in RFC 4122') return null;
  return Number((intVal >> 76n) & 0xfn);
}
function applyVersion(intVal, version) {
  let v = intVal & ~(0xfn << 76n);
  v = v | (BigInt(version) << 76n);
  v = (v & ~(0x3n << 62n)) | (0x2n << 62n); // RFC 4122 variant
  return v & MASK128;
}

function parseUUID(ctx, args, kwargs) {
  onlyKw(ctx, kwargs, ['hex', 'bytes', 'bytes_le', 'fields', 'int', 'version', 'is_safe'], 'uuid.UUID');
  const get = (name, idx) => (name in kwargs ? kwargs[name] : (args.length > idx ? args[idx] : undefined));
  const hexV = get('hex', 0), bytesV = get('bytes', 1), bytesLeV = get('bytes_le', 2),
    fieldsV = get('fields', 3), intV = get('int', 4);
  const versionV = 'version' in kwargs ? kwargs.version : undefined;
  const isSafeV = 'is_safe' in kwargs ? kwargs.is_safe : undefined;
  let isSafe = null;
  if (isSafeV !== undefined && !ctx.isNone(isSafeV)) {
    if (isSafeV && isSafeV.__native === SAFE_Q) isSafe = isSafeV.data.val;
    else if (ctx.isUnk(isSafeV)) isSafe = null;
    else { ctx.err('TypeError', 'is_safe must be a SafeUUID instance', ''); return null; }
  }
  const given = [hexV, bytesV, bytesLeV, fieldsV, intV].filter((v) => v !== undefined && !ctx.isNone(v));
  let intVal = null;
  if (given.length > 1) { ctx.err('TypeError', 'only one of the hex, bytes, bytes_le, fields, or int arguments can be given', ''); return null; }
  if (given.length === 0) {
    intVal = applyVersion(randBigInt(128), 4); // 引数なしはランダムな UUID（uuid4 相当）
  } else if (hexV !== undefined && !ctx.isNone(hexV)) {
    if (typeof hexV !== 'string') { if (ctx.isUnk(hexV)) return 'unk'; ctx.err('TypeError', 'hex must be a string', ''); return null; }
    let h = hexV;
    if (h.startsWith('urn:uuid:')) h = h.slice(9);
    if (h.startsWith('{') && h.endsWith('}')) h = h.slice(1, -1);
    h = h.replace(/-/g, '');
    if (!/^[0-9a-fA-F]{32}$/.test(h)) { ctx.err('ValueError', 'badly formed hexadecimal UUID string', ''); return null; }
    intVal = BigInt('0x' + h);
  } else if (bytesV !== undefined && !ctx.isNone(bytesV)) {
    const a = bytesArr(bytesV);
    if (a === null) { if (ctx.isUnk(bytesV)) return 'unk'; ctx.err('TypeError', 'bytes must be a bytes object', ''); return null; }
    if (a.length !== 16) { ctx.err('ValueError', 'bytes is not a 16-char string', ''); return null; }
    intVal = 0n;
    for (const b of a) intVal = (intVal << 8n) | BigInt(b);
  } else if (bytesLeV !== undefined && !ctx.isNone(bytesLeV)) {
    const a = bytesArr(bytesLeV);
    if (a === null) { if (ctx.isUnk(bytesLeV)) return 'unk'; ctx.err('TypeError', 'bytes_le must be a bytes object', ''); return null; }
    if (a.length !== 16) { ctx.err('ValueError', 'bytes_le is not a 16-char string', ''); return null; }
    const le = [...a.slice(0, 4)].reverse().concat([...a.slice(4, 6)].reverse(), [...a.slice(6, 8)].reverse(), a.slice(8));
    intVal = 0n;
    for (const b of le) intVal = (intVal << 8n) | BigInt(b);
  } else if (fieldsV !== undefined && !ctx.isNone(fieldsV)) {
    if (ctx.isUnk(fieldsV)) return 'unk';
    const items = ctx.isTuple(fieldsV) || ctx.isList(fieldsV) ? (fieldsV.__tuple || fieldsV.__list) : null;
    if (!items || items.length !== 6) { ctx.err('TypeError', 'fields must be a 6-tuple', ''); return null; }
    const nums = items.map((v) => ctx.int(v));
    if (nums.some((n) => n === null)) return 'unk';
    const [tl, tm, thv, cshv, csl, node] = nums;
    intVal = (BigInt(tl) << 96n) | (BigInt(tm) << 80n) | (BigInt(thv) << 64n) |
      (BigInt(cshv) << 56n) | (BigInt(csl) << 48n) | BigInt(node);
    if (intVal < 0n || intVal > MASK128) { ctx.err('ValueError', 'field values out of range', ''); return null; }
  } else if (intV !== undefined && !ctx.isNone(intV)) {
    if (ctx.isNum(intV) && !intV.f) {
      if (!Number.isSafeInteger(intV.v) || intV.v < 0) { ctx.err('ValueError', 'int is out of range (need a 128-bit value)', ''); return null; }
      intVal = BigInt(intV.v);
    } else if (ctx.isUnk(intV)) return 'unk';
    else { ctx.err('TypeError', 'int must be an integer', ''); return null; }
  }
  if (versionV !== undefined && !ctx.isNone(versionV)) {
    const ver = ctx.int(versionV);
    if (ver === null) return 'unk';
    if (ver < 1 || ver > 8) { ctx.err('ValueError', 'illegal version number', ''); return null; }
    intVal = applyVersion(intVal, ver);
  }
  return makeUUID(intVal, isSafe);
}

const SAFE_CLASS_DEF = {
  typeName: 'SafeUUID',
  repr: (ctx, self) => 'SafeUUID.' + (self.data.val === 0 ? 'safe' : self.data.val === -1 ? 'unsafe' : 'unknown'),
  eq: (ctx, self, other) => (other && other.__native === SAFE_Q) ? self.data.val === other.data.val : false,
  hash: (ctx, self) => 'safeuuid:' + String(self.data.val),
  classAttrs: {
    safe: () => SAFE_SAFE,
    unsafe: () => SAFE_UNSAFE,
    unknown: () => SAFE_UNKNOWN,
  },
};

const UUID_CLASS_DEF = {
  typeName: 'UUID',
  construct: (ctx, args, kwargs) => {
    const r = parseUUID(ctx, args, kwargs);
    if (r === 'unk') return unkRet(ctx, 'uuid.UUID の引数');
    return r;
  },
  repr: (ctx, self) => "UUID('" + uuidStr(self.data.int) + "')",
  str: (ctx, self) => uuidStr(self.data.int),
  eq: (ctx, self, other) => (other && other.__native === UUID_Q) ? self.data.int === other.data.int : false,
  hash: (ctx, self) => 'uuid:' + uuidHex(self.data.int),
  compare: (ctx, self, op, other) => {
    if (!other || other.__native !== UUID_Q) return null;
    const c = self.data.int < other.data.int ? -1 : self.data.int > other.data.int ? 1 : 0;
    return op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0;
  },
  attrs: {
    int: (ctx, self) => {
      if (self.data.int <= BigInt(Number.MAX_SAFE_INTEGER)) return I(Number(self.data.int));
      ctx.diag('uuid.UUID.int：128ビット整数はこのエンジンの安全整数を超えるため未検証です');
      return UNK('UUID.int（未検証）');
    },
    hex: (ctx, self) => uuidHex(self.data.int),
    urn: (ctx, self) => 'urn:uuid:' + uuidStr(self.data.int),
    bytes: (ctx, self) => {
      const out = [];
      for (let k = 15; k >= 0; k--) out.push(Number((self.data.int >> BigInt(k * 8)) & 0xffn));
      return makeBytesVal(out);
    },
    bytes_le: (ctx, self) => {
      const b = [];
      for (let k = 15; k >= 0; k--) b.push(Number((self.data.int >> BigInt(k * 8)) & 0xffn));
      return makeBytesVal([...b.slice(0, 4)].reverse().concat([...b.slice(4, 6)].reverse(), [...b.slice(6, 8)].reverse(), b.slice(8)));
    },
    fields: (ctx, self) => {
      const f = fieldsOf(self.data.int);
      return TUPLE([I(f.time_low), I(f.time_mid), I(f.time_hi_version), I(f.clock_seq_hi_variant), I(f.clock_seq_low), I(f.node)]);
    },
    time_low: (ctx, self) => I(fieldsOf(self.data.int).time_low),
    time_mid: (ctx, self) => I(fieldsOf(self.data.int).time_mid),
    time_hi_version: (ctx, self) => I(fieldsOf(self.data.int).time_hi_version),
    clock_seq_hi_variant: (ctx, self) => I(fieldsOf(self.data.int).clock_seq_hi_variant),
    clock_seq_low: (ctx, self) => I(fieldsOf(self.data.int).clock_seq_low),
    node: (ctx, self) => I(fieldsOf(self.data.int).node),
    clock_seq: (ctx, self) => {
      const f = fieldsOf(self.data.int);
      return I(((f.clock_seq_hi_variant & 0x3f) << 8) | f.clock_seq_low);
    },
    variant: (ctx, self) => variantOf(self.data.int),
    version: (ctx, self) => {
      const v = versionOf(self.data.int);
      return v === null ? NONE : I(v);
    },
    time: (ctx, self) => {
      const ver = versionOf(self.data.int);
      if (ver === 7) {
        return I(Number(self.data.int >> 80n)); // 48ビット ms は安全整数内
      }
      if (ver === 1 || ver === 6) {
        ctx.diag('uuid.UUID.time：v1/v6 の時刻は60ビットで安全整数を超えるため未検証です');
        return UNK('UUID.time（未検証）');
      }
      ctx.err('AttributeError', 'UUID object has no attribute time for this version', '');
      return UNK('');
    },
    is_safe: (ctx, self) => self.data.isSafe === null || self.data.isSafe === undefined
      ? SAFE_UNKNOWN : makeSafe(self.data.isSafe),
  },
};

const NAMESPACE_DNS = makeUUID(BigInt('0x6ba7b8109dad11d180b400c04fd430c8'));
const NAMESPACE_URL = makeUUID(BigInt('0x6ba7b8119dad11d180b400c04fd430c8'));
const NAMESPACE_OID = makeUUID(BigInt('0x6ba7b8129dad11d180b400c04fd430c8'));
const NAMESPACE_X500 = makeUUID(BigInt('0x6ba7b8149dad11d180b400c04fd430c8'));

function nsBytes(ctx, ns) {
  if (!ns || ns.__native !== UUID_Q) { if (ctx.isUnk(ns)) return null; ctx.err('TypeError', 'namespace must be a UUID', ''); return null; }
  const out = [];
  for (let k = 0; k < 16; k++) out.push(Number((ns.data.int >> BigInt((15 - k) * 8)) & 0xffn));
  return out;
}
function nameBytes(ctx, name) {
  if (typeof name !== 'string') { if (ctx.isUnk(name)) return null; ctx.err('TypeError', 'name must be a string', ''); return null; }
  return Array.from(new TextEncoder().encode(name));
}
const GREGORIAN_OFFSET = 0x01b21dd213814000n;
function timeStampNow() {
  return BigInt(Date.now()) * 10000n + GREGORIAN_OFFSET; // ms 精度（ns の下位は 0）
}
function uuid1Like(ctx, args, kwargs, version) {
  const nodeV = 'node' in kwargs ? kwargs.node : args[0];
  const csV = 'clock_seq' in kwargs ? kwargs.clock_seq : args[1];
  let node;
  if (nodeV === undefined || ctx.isNone(nodeV)) {
    node = Number(randBigInt(48)) | 0x010000000000; // マルチキャストビットを立てる（ランダムノードの慣例）
  } else {
    node = ctx.int(nodeV);
    if (node === null) return unkRet(ctx, 'node');
  }
  let clockSeq;
  if (csV === undefined || ctx.isNone(csV)) clockSeq = Number(randBigInt(14));
  else { clockSeq = ctx.int(csV); if (clockSeq === null) return unkRet(ctx, 'clock_seq'); }
  const ts = timeStampNow();
  let intVal;
  if (version === 1) {
    intVal = ((ts & 0xffffffffn) << 96n) | (((ts >> 32n) & 0xffffn) << 80n) |
      (((ts >> 48n) & 0x0fffn) << 64n) | (1n << 76n) |
      (0x2n << 62n) | ((BigInt(clockSeq & 0x3fff)) << 48n) | (BigInt(node) & 0xffffffffffffn);
  } else {
    const timeHigh = ts >> 12n, timeLow = ts & 0xfffn;
    intVal = (timeHigh << 80n) | (6n << 76n) | (timeLow << 64n) |
      (0x2n << 62n) | ((BigInt(clockSeq & 0x3fff)) << 48n) | (BigInt(node) & 0xffffffffffffn);
  }
  return makeUUID(intVal & MASK128);
}

registerStdlibModule('uuid', {
  data: {
    NAMESPACE_DNS, NAMESPACE_URL, NAMESPACE_OID, NAMESPACE_X500,
    NIL: makeUUID(0n),
    MAX: makeUUID(MASK128),
    RESERVED_NCS: 'reserved for NCS compatibility',
    RFC_4122: 'specified in RFC 4122',
    RESERVED_MICROSOFT: 'reserved for Microsoft compatibility',
    RESERVED_FUTURE: 'reserved for future definition',
  },
  functions: {
    uuid1: (ctx, args, kwargs) => uuid1Like(ctx, args, kwargs, 1),
    uuid6: (ctx, args, kwargs) => uuid1Like(ctx, args, kwargs, 6),
    uuid3: (ctx, args, kwargs) => {
      const nb = nsBytes(ctx, args[0]); if (nb === null) return unkRet(ctx, 'uuid3 の名前空間');
      const nm = nameBytes(ctx, args[1]); if (nm === null) return unkRet(ctx, 'uuid3 の名前');
      const d = md5Bytes([...nb, ...nm]);
      let intVal = 0n;
      for (const b of d) intVal = (intVal << 8n) | BigInt(b);
      return makeUUID(applyVersion(intVal, 3));
    },
    uuid5: (ctx, args, kwargs) => {
      const nb = nsBytes(ctx, args[0]); if (nb === null) return unkRet(ctx, 'uuid5 の名前空間');
      const nm = nameBytes(ctx, args[1]); if (nm === null) return unkRet(ctx, 'uuid5 の名前');
      const d = sha1Bytes([...nb, ...nm]).slice(0, 16);
      let intVal = 0n;
      for (const b of d) intVal = (intVal << 8n) | BigInt(b);
      return makeUUID(applyVersion(intVal, 5));
    },
    uuid4: (ctx) => makeUUID(applyVersion(randBigInt(128), 4)),
    uuid7: (ctx) => {
      const ms = BigInt(Date.now());
      const intVal = (ms << 80n) | (7n << 76n) | (randBigInt(12) << 64n) |
        (0x2n << 62n) | randBigInt(62);
      return makeUUID(intVal);
    },
    uuid8: (ctx, args, kwargs) => {
      const a = 'a' in kwargs ? kwargs.a : args[0];
      const b = 'b' in kwargs ? kwargs.b : args[1];
      const c = 'c' in kwargs ? kwargs.c : args[2];
      const ai = a !== undefined && !ctx.isNone(a) ? ctx.int(a) : null;
      const bi = b !== undefined && !ctx.isNone(b) ? ctx.int(b) : null;
      const ci = c !== undefined && !ctx.isNone(c) ? ctx.int(c) : null;
      if (ai === null || bi === null || ci === null) {
        if (ai === null && bi === null && ci === null && args.length === 0) {
          // 引数なしはランダム（3.14+ の意味論）
          return makeUUID((randBigInt(48) << 80n) | (8n << 76n) | (randBigInt(12) << 64n) | (0x2n << 62n) | randBigInt(62));
        }
        return unkRet(ctx, 'uuid8 の引数');
      }
      const intVal = ((BigInt(ai) & ((1n << 48n) - 1n)) << 80n) | (8n << 76n) |
        ((BigInt(bi) & 0xfffn) << 64n) | (0x2n << 62n) | (BigInt(ci) & ((1n << 62n) - 1n));
      return makeUUID(intVal);
    },
    getnode: unsupportedFn('uuid.getnode', 'MAC アドレス等の環境依存情報を読むため'),
  },
  classes: {
    UUID: UUID_CLASS_DEF,
    SafeUUID: SAFE_CLASS_DEF,
  },
});
export { makeUUID, uuidStr };
