/* 高度モード B7 G13：ipaddress（115件）。
 *
 * 一次情報：CPython 3.12.3 の Lib/ipaddress.py（実走照合済み）と公式
 * ドキュメント（3.15）。アドレス値は BigInt で保持し、32/128 ビットの
 * 計算を正確に行う。エンジンの数値（倍精度）に収まらない整数の戻り値
 * （IPv6 の num_addresses 等）は未確定に倒す。int()／format() の組み込みは
 * 基盤側がネイティブ値へ dispatch しないため、変換はメソッド経由
 * （__int__ 相当は無いので、整数化は ip_address 等の構築と内部計算で担保
 * し、__format__ はメソッドとして実装する。基盤要請として報告書に明記）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  BOOL, NONE, LIST, TUPLE, ITER, UNK, F, I, isNum, isBool, isNone, isList, isTuple, isUnk,
  noKw, arity, numToEngine, isBytesVal, bytesArr, makeBytesVal, bytesRepr, genIter, BIGDESC,
} from './impl-advanced-g13-common.js';

const AVE = 'ipaddress.AddressValueError';
const NVE = 'ipaddress.NetmaskValueError';
const Q4A = 'ipaddress.IPv4Address', Q6A = 'ipaddress.IPv6Address';
const Q4N = 'ipaddress.IPv4Network', Q6N = 'ipaddress.IPv6Network';
const Q4I = 'ipaddress.IPv4Interface', Q6I = 'ipaddress.IPv6Interface';
const BITS = { 4: 32, 6: 128 };
const allOnes = (bits) => (1n << BigInt(bits)) - 1n;
const maskInt = (prefixlen, bits) => allOnes(bits) ^ (allOnes(bits) >> BigInt(prefixlen));
const isAddrQ = (q) => q === Q4A || q === Q6A || q === Q4I || q === Q6I;
const isNetQ = (q) => q === Q4N || q === Q6N;

/* ---------- 文字列解析（CPython のエラーメッセージをそのまま再現） ---------- */
function parseOctet(s) {
  if (s === '') return { err: 'Empty octet not permitted' };
  if (!/^[\x00-\x7F]*$/.test(s) || !/^[0-9]+$/.test(s)) return { err: 'Only decimal digits permitted in ' + pyRepr(s) };
  if (s.length > 3) return { err: 'At most 3 characters permitted in ' + pyRepr(s) };
  if (s !== '0' && s[0] === '0') return { err: 'Leading zeros are not permitted in ' + pyRepr(s) };
  const v = parseInt(s, 10);
  if (v > 255) return { err: 'Octet ' + v + ' (> 255) not permitted' };
  return { v };
}
function pyRepr(s) {
  let out = "'";
  for (const ch of s) {
    if (ch === "'") out += "\\'";
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else {
      const code = ch.codePointAt(0);
      if (code < 0x20 || code === 0x7f) out += '\\x' + code.toString(16).padStart(2, '0');
      else out += ch;
    }
  }
  return out + "'";
}
function parseV4Parts(s) {
  if (s === '') return { err: 'Address cannot be empty' };
  const octets = s.split('.');
  if (octets.length !== 4) return { err: 'Expected 4 octets in ' + pyRepr(s) };
  let val = 0n;
  for (const o of octets) {
    const r = parseOctet(o);
    if (r.err) return { err: r.err + ' in ' + pyRepr(s) };
    val = (val << 8n) | BigInt(r.v);
  }
  return { val };
}
function parseV4(ctx, s) {
  const r = parseV4Parts(s);
  if (r.err) ctx.err(AVE, r.err, '');
  return r.val;
}
function parseHextet(s) {
  if (!/^[0-9A-Fa-f]*$/.test(s)) return { err: 'Only hex digits permitted in ' + pyRepr(s) };
  if (s.length > 4) return { err: 'At most 4 characters permitted in ' + pyRepr(s) };
  return { v: parseInt(s === '' ? '0' : s, 16) };
}
function parseV6(ctx, s) {
  if (s === '') ctx.err(AVE, 'Address cannot be empty', '');
  let parts = s.split(':');
  if (parts.length < 3) ctx.err(AVE, 'At least 3 parts expected in ' + pyRepr(s), '');
  if (parts[parts.length - 1].includes('.')) {
    const r = parseV4Parts(parts.pop());
    if (r.err) ctx.err(AVE, r.err + ' in ' + pyRepr(s), '');
    const v4 = r.val;
    parts.push(((v4 >> 16n) & 0xffffn).toString(16), (v4 & 0xffffn).toString(16));
  }
  if (parts.length > 9) ctx.err(AVE, 'At most 8 colons permitted in ' + pyRepr(s), '');
  let skipIndex = null;
  for (let i = 1; i < parts.length - 1; i++) {
    if (parts[i] === '') {
      if (skipIndex !== null) ctx.err(AVE, "At most one '::' permitted in " + pyRepr(s), '');
      skipIndex = i;
    }
  }
  let partsHi, partsLo, skipped;
  if (skipIndex !== null) {
    partsHi = skipIndex; partsLo = parts.length - skipIndex - 1;
    if (parts[0] === '') { partsHi -= 1; if (partsHi) ctx.err(AVE, "Leading ':' only permitted as part of '::' in " + pyRepr(s), ''); }
    if (parts[parts.length - 1] === '') { partsLo -= 1; if (partsLo) ctx.err(AVE, "Trailing ':' only permitted as part of '::' in " + pyRepr(s), ''); }
    skipped = 8 - (partsHi + partsLo);
    if (skipped < 1) ctx.err(AVE, "Expected at most 7 other parts with '::' in " + pyRepr(s), '');
  } else {
    if (parts.length !== 8) ctx.err(AVE, 'Exactly 8 parts expected without \'::\' in ' + pyRepr(s), '');
    if (parts[0] === '') ctx.err(AVE, "Leading ':' only permitted as part of '::' in " + pyRepr(s), '');
    if (parts[parts.length - 1] === '') ctx.err(AVE, "Trailing ':' only permitted as part of '::' in " + pyRepr(s), '');
    partsHi = parts.length; partsLo = 0; skipped = 0;
  }
  let val = 0n;
  const eat = (p) => {
    const r = parseHextet(p);
    if (r.err) ctx.err(AVE, r.err + ' in ' + pyRepr(s), '');
    val = (val << 16n) | BigInt(r.v);
  };
  for (let i = 0; i < partsHi; i++) eat(parts[i]);
  val <<= BigInt(16 * skipped);
  for (let i = parts.length - partsLo; i < parts.length; i++) eat(parts[i]);
  return val;
}
function splitScope(ctx, s) {
  const idx = s.indexOf('%');
  if (idx < 0) return [s, null];
  const scope = s.slice(idx + 1);
  if (scope === '' || scope.includes('%')) ctx.err(AVE, 'Invalid IPv6 address: "' + pyRepr(s) + '"', '');
  return [s.slice(0, idx), scope];
}
/* ---------- 文字列化 ---------- */
function v4Str(val) {
  const b = [];
  for (let i = 3; i >= 0; i--) b.push(String((val >> BigInt(8 * i)) & 0xffn));
  return b.join('.');
}
function hextetsOf(val) {
  const h = [];
  for (let i = 7; i >= 0; i--) h.push(Number((val >> BigInt(16 * i)) & 0xffffn));
  return h;
}
function v6Str(val) {
  const hs = hextetsOf(val).map((h) => h.toString(16));
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  hs.forEach((h, idx) => {
    if (h === '0') { curLen += 1; if (curStart === -1) curStart = idx; if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; } }
    else { curLen = 0; curStart = -1; }
  });
  if (bestLen > 1) {
    const before = hs.slice(0, bestStart), after = hs.slice(bestStart + bestLen);
    return before.join(':') + '::' + after.join(':');
  }
  return hs.join(':');
}
function v6Exploded(val) { return hextetsOf(val).map((h) => h.toString(16).padStart(4, '0')).join(':'); }
function addrStr(d) {
  const base = d.ver === 4 ? v4Str(d.val) : v6Str(d.val);
  return d.scope ? base + '%' + d.scope : base;
}
function netStr(d) { return addrStr({ ver: d.ver, val: d.val, scope: d.scope }) + '/' + d.prefixlen; }
function ifaceStr(d) { return addrStr(d) + '/' + d.prefixlen; }
function packedBytes(val, bits) {
  const out = [];
  const n = bits / 8;
  for (let i = n - 1; i >= 0; i--) out.push(Number((val >> BigInt(8 * i)) & 0xffn));
  return out;
}
/* ---------- 分類表（CPython 3.12.3 の _constants をそのまま転記） ---------- */
function rawV4(s) { return s.split('.').reduce((a, o) => (a << 8n) | BigInt(parseInt(o, 10)), 0n); }
function rawV6(s) {
  let a = s.split('%')[0];
  const lastColon = a.lastIndexOf(':');
  const tail = a.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = rawV4(tail);
    a = a.slice(0, lastColon + 1) + ((v4 >> 16n) & 0xffffn).toString(16) + ':' + (v4 & 0xffffn).toString(16);
  }
  const dbl = a.indexOf('::');
  let hs;
  if (dbl >= 0) {
    const hi = a.slice(0, dbl).split(':').filter((x) => x !== '');
    const lo = a.slice(dbl + 2).split(':').filter((x) => x !== '');
    hs = [...hi, ...Array(8 - hi.length - lo.length).fill('0'), ...lo];
  } else hs = a.split(':');
  return hs.reduce((acc, h) => (acc << 16n) | BigInt(parseInt(h || '0', 16)), 0n);
}
const inNet = (val, net, prefixlen, bits) => (val & maskInt(prefixlen, bits)) === net;
const V4_PRIVATE = ['0.0.0.0/8', '10.0.0.0/8', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.0.170/31', '192.0.2.0/24', '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '240.0.0.0/4', '255.255.255.255/32']
  .map((s) => { const [a, p] = s.split('/'); return [rawV4(a), Number(p)]; });
const V4_PRIVATE_EXC = ['192.0.0.9/32', '192.0.0.10/32'].map((s) => { const [a, p] = s.split('/'); return [rawV4(a), Number(p)]; });
const V4_PUBLIC = [rawV4('100.64.0.0'), 10];
const V6_PRIVATE = ['::1/128', '::/128', '::ffff:0:0/96', '64:ff9b:1::/48', '100::/64', '2001::/23', '2001:db8::/32', '2002::/16', 'fc00::/7', 'fe80::/10']
  .map((s) => { const [a, p] = s.split('/'); return [rawV6(a), Number(p)]; });
const V6_PRIVATE_EXC = ['2001:1::1/128', '2001:1::2/128', '2001:3::/32', '2001:4:112::/48', '2001:20::/28', '2001:30::/28']
  .map((s) => { const [a, p] = s.split('/'); return [rawV6(a), Number(p)]; });
const V6_RESERVED = ['::/8', '100::/8', '200::/7', '400::/6', '800::/5', '1000::/4', '4000::/3', '6000::/3', '8000::/3', 'a000::/3', 'c000::/3', 'e000::/4', 'f000::/5', 'f800::/6', 'fe00::/9']
  .map((s) => { const [a, p] = s.split('/'); return [rawV6(a), Number(p)]; });
function v4IsPrivate(val) {
  return V4_PRIVATE.some(([n, p]) => inNet(val, n, p, 32)) && !V4_PRIVATE_EXC.some(([n, p]) => inNet(val, n, p, 32));
}
function v4IsGlobal(val) { return !inNet(val, V4_PUBLIC[0], V4_PUBLIC[1], 32) && !v4IsPrivate(val); }
function v6Mapped(val) { return (val >> 32n) === 0xffffn ? (val & 0xffffffffn) : null; }
function v6IsPrivate(val) {
  const m = v6Mapped(val);
  if (m !== null) return v4IsPrivate(m);
  return V6_PRIVATE.some(([n, p]) => inNet(val, n, p, 128)) && !V6_PRIVATE_EXC.some(([n, p]) => inNet(val, n, p, 128));
}
function addrIsPrivate(d) { return d.ver === 4 ? v4IsPrivate(d.val) : v6IsPrivate(d.val); }
function addrIsGlobal(d) { return d.ver === 4 ? v4IsGlobal(d.val) : !v6IsPrivate(d.val); }
function addrIsReserved(d) {
  if (d.ver === 4) return inNet(d.val, rawV4('240.0.0.0'), 4, 32);
  return V6_RESERVED.some(([n, p]) => inNet(d.val, n, p, 128));
}

/* ---------- 構築 ---------- */
function checkIntAddr(ctx, ver, n) {
  if (n < 0n) ctx.err(AVE, n.toString() + ' (< 0) is not permitted as an IPv' + ver + ' address', '');
  if (n > allOnes(BITS[ver])) ctx.err(AVE, n.toString() + ' (>= 2**' + BITS[ver] + ') is not permitted as an IPv' + ver + ' address', '');
}
function addrFromString(ctx, ver, s, orig) {
  if (s.includes('/')) ctx.err(AVE, "Unexpected '/' in " + ctx.repr(orig), '');
  if (ver === 6) { const [a, scope] = splitScope(ctx, s); return { val: parseV6(ctx, a), scope }; }
  return { val: parseV4(ctx, s), scope: null };
}
function addrFromArg(ctx, ver, arg) {
  if (isUnk(arg)) return { unk: true };
  if (arg && arg.__native && (isAddrQ(arg.__native) || isNetQ(arg.__native))) {
    if (isAddrQ(arg.__native) && arg.data.ver === ver && (arg.__native === Q4A || arg.__native === Q6A)) {
      return { val: arg.data.val, scope: arg.data.scope || null };
    }
    return addrFromString(ctx, ver, ctx.strOf(arg), arg);
  }
  if (bytesArr(arg) !== null) {
    // 高度A7班是正: エンジン形 bytes も対象（bytesArr が両形を受ける）
    const arr = bytesArr(arg); const need = BITS[ver] / 8;
    if (arr.length !== need) ctx.err(AVE, bytesRepr(arr) + ' (len ' + arr.length + ' != ' + need + ') is not permitted as an IPv' + ver + ' address', '');
    return { val: arr.reduce((a, b) => (a << 8n) | BigInt(b), 0n), scope: null };
  }
  if (isBool(arg)) { const n = arg.v ? 1n : 0n; checkIntAddr(ctx, ver, n); return { val: n, scope: null }; }
  if (isNum(arg)) {
    if (arg.f || !Number.isSafeInteger(arg.v)) return addrFromString(ctx, ver, ctx.strOf(arg), arg);
    const n = BigInt(arg.v); checkIntAddr(ctx, ver, n); return { val: n, scope: null };
  }
  return addrFromString(ctx, ver, ctx.strOf(arg), arg);
}
function splitAddrPrefix(ctx, ver, arg) {
  if (bytesArr(arg) !== null || isNum(arg) || isBool(arg)) return [arg, null];
  if (isTuple(arg)) {
    const t = arg.__tuple;
    if (t.length === 0) ctx.err('IndexError', 'tuple index out of range', '');
    if (t.length > 2) ctx.err('ValueError', 'too many values to unpack (expected 2)', '');
    if (t.length === 2) return [t[0], t[1]];
    return [t[0], null];
  }
  const s = ctx.strOf(arg);
  const parts = s.split('/');
  if (parts.length > 2) ctx.err(AVE, "Only one '/' permitted in " + ctx.repr(arg), '');
  return parts.length === 2 ? [parts[0], parts[1]] : [parts[0], null];
}
function prefixFromMaskInt(mask, bits) {
  let tz = 0;
  if (mask === 0n) tz = bits;
  else { let m = mask; while ((m & 1n) === 0n && tz < bits) { tz++; m >>= 1n; } }
  const prefixlen = bits - tz;
  const leading = mask >> BigInt(tz);
  return leading === (1n << BigInt(prefixlen)) - 1n ? prefixlen : null;
}
function makeNetmask(ctx, ver, mask) {
  const bits = BITS[ver];
  if (mask === null || mask === undefined) return bits;
  if (isBool(mask)) {
    const n = mask.v ? 1 : 0;
    if (n < 0 || n > bits) ctx.err(NVE, String(n) + ' is not a valid netmask', '');
    return n;
  }
  if (isNum(mask)) {
    if (mask.f) ctx.err('AttributeError', "'float' object has no attribute 'isascii'", '');
    const n = mask.v;
    if (n < 0 || n > bits) ctx.err(NVE, String(n) + ' is not a valid netmask', '');
    return n;
  }
  if (typeof mask === 'string') {
    if (/^[0-9]+$/.test(mask) && /^[\x00-\x7F]*$/.test(mask)) {
      const n = parseInt(mask, 10);
      if (n > bits) ctx.err(NVE, pyRepr(mask) + ' is not a valid netmask', '');
      return n;
    }
    if (ver === 4) {
      const r = parseV4Parts(mask);
      if (!r.err) {
        const p = prefixFromMaskInt(r.val, 32);
        if (p !== null) return p;
        const p2 = prefixFromMaskInt(r.val ^ 0xffffffffn, 32);
        if (p2 !== null) return p2;
      }
    }
    ctx.err(NVE, pyRepr(mask) + ' is not a valid netmask', '');
  }
  if (isUnk(mask)) return null; // 呼び出し側で未確定に倒す目印
  ctx.err('AttributeError', "'" + ctx.typeName(mask) + "' object has no attribute 'isascii'", '');
  return bits;
}
function netFromArg(ctx, ver, arg, strict) {
  const [addrPart, maskPart] = splitAddrPrefix(ctx, ver, arg);
  if (isUnk(addrPart) || isUnk(maskPart)) return { unk: true };
  const a = addrFromArg(ctx, ver, addrPart);
  if (a.unk) return { unk: true };
  const prefixlen = makeNetmask(ctx, ver, maskPart);
  if (prefixlen === null) return { unk: true };
  const bits = BITS[ver];
  let netval = a.val;
  if ((netval & maskInt(prefixlen, bits)) !== netval) {
    if (strict) ctx.err('ValueError', netStr({ ver, val: netval, prefixlen, scope: a.scope }) + ' has host bits set', '');
    netval = netval & maskInt(prefixlen, bits);
  }
  return { val: netval, prefixlen, scope: a.scope, hostval: a.val };
}
function ctorArgs(ctx, args, kwargs, clsName) {
  noKw(ctx, kwargs, clsName);
  if (args.length === 0) ctx.err('TypeError', clsName + ".__init__() missing 1 required positional argument: 'address'", '');
  if (args.length > 1) ctx.err('TypeError', clsName + '.__init__() takes 2 positional arguments but ' + (args.length + 1) + ' were given', '');
}
/* ---------- アドレス共通 ---------- */
function ifaceNetData(d) {
  return { ver: d.ver, val: d.val & maskInt(d.prefixlen, BITS[d.ver]), prefixlen: d.prefixlen, scope: d.scope };
}
function cmpNetVals(a, b) {
  if (a.val !== b.val) return a.val < b.val ? -1 : 1;
  const ma = maskInt(a.prefixlen, BITS[a.ver]), mb = maskInt(b.prefixlen, BITS[b.ver]);
  return ma === mb ? 0 : (ma < mb ? -1 : 1);
}
function addrStrOf(ctx, v) { return ctx.strOf(v); }
function addrCompare(ctx, self, op, other) {
  if (!other || !other.__native || !isAddrQ(other.__native)) return null;
  const sd = self.data, od = other.data;
  if (od.ver !== sd.ver) ctx.err('TypeError', addrStr(sd) + ' and ' + addrStrOf(ctx, other) + ' are not of the same version', '');
  const selfIface = self.__native === Q4I || self.__native === Q6I;
  const otherIface = other.__native === Q4I || other.__native === Q6I;
  if (selfIface && !otherIface) return op === '>' || op === '>=';
  if (!selfIface && otherIface) return op === '<' || op === '<=';
  let c;
  if (selfIface && otherIface) {
    c = cmpNetVals(ifaceNetData(sd), ifaceNetData(od));
    if (c === 0) c = sd.val === od.val ? 0 : (sd.val < od.val ? -1 : 1);
  } else c = sd.val === od.val ? 0 : (sd.val < od.val ? -1 : 1);
  return op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0;
}
function addrBinop(ctx, self, op, other, reflected) {
  if (op !== '+' && op !== '-') return ctx.NOT_HANDLED;
  if (reflected) return ctx.NOT_HANDLED; // __radd__/__rsub__ は無い（実走確認）
  let n = null;
  if (isBool(other)) n = other.v ? 1n : 0n;
  else if (isNum(other) && !other.f && Number.isSafeInteger(other.v)) n = BigInt(other.v);
  if (n === null) return ctx.NOT_HANDLED;
  const nv = op === '+' ? self.data.val + n : self.data.val - n;
  checkIntAddr(ctx, self.data.ver, nv);
  if (self.__native === Q4I || self.__native === Q6I) {
    // _BaseAddress.__add__ は self.__class__ で作り直す（/max のインタフェースになる）
    return ctx.native(self.__native, { ver: self.data.ver, val: nv, prefixlen: BITS[self.data.ver], scope: null });
  }
  return ctx.native(self.__native, { ver: self.data.ver, val: nv, scope: null });
}
function strFormatSpec(ctx, s, fmt) {
  if (fmt === '' || fmt === 's') return s;
  const rest = fmt.slice(0, -1);
  const m = /^(?:(.)?([<>=^]))?(\d+)?(?:\.(\d+))?$/.exec(rest);
  if (!m) ctx.err('ValueError', "Invalid format specifier '" + fmt + "' for object of type 'str'", '');
  if (m[2] === '=') ctx.err('ValueError', "'=' alignment not allowed in string format specifier", '');
  const fill = m[1] || ' ';
  const align = m[2] || '<';
  const width = m[3] ? parseInt(m[3], 10) : 0;
  let out = s;
  if (m[4] !== undefined) out = out.slice(0, parseInt(m[4], 10));
  if (out.length < width) {
    const marg = width - out.length;
    if (align === '<') out = out + fill.repeat(marg);
    else if (align === '>') out = fill.repeat(marg) + out;
    else { const left = Math.floor(marg / 2) + (marg & width & 1); out = fill.repeat(left) + out + fill.repeat(marg - left); }
  }
  return out;
}
function addrFormat(ctx, self, args, kwargs) {
  noKw(ctx, kwargs, '__format__');
  const fmt = args.length ? args[0] : '';
  if (isUnk(fmt)) return UNK('');
  if (typeof fmt !== 'string') ctx.err('TypeError', 'must be str, not ' + ctx.typeName(fmt), '');
  const ver = self.data.ver;
  const clsName = ver === 4 ? 'IPv4Address' : 'IPv6Address';
  if (fmt === '' || fmt.endsWith('s')) return strFormatSpec(ctx, addrStr(self.data), fmt);
  const m = /^(#?)(_?)([xbnX])$/.exec(fmt);
  if (!m) ctx.err('TypeError', 'unsupported format string passed to ' + clsName + '.__format__', '');
  let base = m[3];
  if (base === 'n') base = ver === 4 ? 'b' : 'x';
  const bits = BITS[ver];
  let digits = base === 'b' ? self.data.val.toString(2).padStart(bits, '0') : self.data.val.toString(16).padStart(bits / 4, '0');
  if (base === 'X') digits = digits.toUpperCase();
  if (m[2]) digits = digits.replace(/(.{4})(?=.)/g, '$1_');
  if (m[1]) digits = (base === 'b' ? '0b' : base === 'x' ? '0x' : '0X') + digits;
  return digits;
}
function makeAddrDef(ver, isIface) {
  const Q = ver === 4 ? (isIface ? Q4I : Q4A) : (isIface ? Q6I : Q6A);
  const clsName = (ver === 4 ? 'IPv4' : 'IPv6') + (isIface ? 'Interface' : 'Address');
  const attrs = {
    version: () => I(ver),
    max_prefixlen: () => I(BITS[ver]),
    compressed: (ctx, self) => addrStr(self.data),
    exploded: (ctx, self) => (ver === 4 ? v4Str(self.data.val) : v6Exploded(self.data.val)),
    packed: (ctx, self) => makeBytesVal(packedBytes(self.data.val, BITS[ver])),
    reverse_pointer: (ctx, self) => (ver === 4
      ? v4Str(self.data.val).split('.').reverse().join('.') + '.in-addr.arpa'
      : v6Exploded(self.data.val).replace(/:/g, '').split('').reverse().join('.') + '.ip6.arpa'),
    is_private: (ctx, self) => BOOL(addrIsPrivate(self.data)),
    is_global: (ctx, self) => BOOL(addrIsGlobal(self.data)),
    is_loopback: (ctx, self) => BOOL(ver === 4 ? inNet(self.data.val, rawV4('127.0.0.0'), 8, 32) : self.data.val === 1n),
    is_link_local: (ctx, self) => BOOL(ver === 4 ? inNet(self.data.val, rawV4('169.254.0.0'), 16, 32) : inNet(self.data.val, rawV6('fe80::'), 10, 128)),
    is_multicast: (ctx, self) => BOOL(ver === 4 ? inNet(self.data.val, rawV4('224.0.0.0'), 4, 32) : inNet(self.data.val, rawV6('ff00::'), 8, 128)),
    is_reserved: (ctx, self) => BOOL(addrIsReserved(self.data)),
    is_unspecified: (ctx, self) => BOOL(self.data.val === 0n),
  };
  if (ver === 4) {
    attrs.ipv6_mapped = (ctx, self) => ctx.native(Q6A, { ver: 6, val: self.data.val | (0xffffn << 32n), scope: null });
  } else {
    attrs.is_site_local = (ctx, self) => BOOL(inNet(self.data.val, rawV6('fec0::'), 10, 128));
    attrs.scope_id = (ctx, self) => (self.data.scope ? self.data.scope : NONE);
    attrs.ipv4_mapped = (ctx, self) => {
      const m = v6Mapped(self.data.val);
      return m === null ? NONE : ctx.native(Q4A, { ver: 4, val: m, scope: null });
    };
    attrs.teredo = (ctx, self) => {
      const v = self.data.val;
      if ((v >> 96n) !== 0x20010000n) return NONE;
      const server = (v >> 64n) & 0xffffffffn;
      const client = (~v) & 0xffffffffn;
      return TUPLE([ctx.native(Q4A, { ver: 4, val: server, scope: null }), ctx.native(Q4A, { ver: 4, val: client, scope: null })]);
    };
    attrs.sixtofour = (ctx, self) => {
      const v = self.data.val;
      if ((v >> 112n) !== 0x2002n) return NONE;
      return ctx.native(Q4A, { ver: 4, val: (v >> 80n) & 0xffffffffn, scope: null });
    };
  }
  if (isIface) {
    const baseStr = (d) => (d.ver === 4 ? v4Str(d.val) : v6Str(d.val));
    attrs.ip = (ctx, self) => ctx.native(ver === 4 ? Q4A : Q6A, { ver, val: self.data.val, scope: null });
    attrs.network = (ctx, self) => ctx.native(ver === 4 ? Q4N : Q6N, ifaceNetData(self.data));
    attrs.netmask = (ctx, self) => ctx.native(ver === 4 ? Q4A : Q6A, { ver, val: maskInt(self.data.prefixlen, BITS[ver]), scope: null });
    attrs.hostmask = (ctx, self) => ctx.native(ver === 4 ? Q4A : Q6A, { ver, val: maskInt(self.data.prefixlen, BITS[ver]) ^ allOnes(BITS[ver]), scope: null });
    attrs.with_prefixlen = (ctx, self) => baseStr(self.data) + '/' + self.data.prefixlen;
    attrs.with_netmask = (ctx, self) => baseStr(self.data) + '/' + (ver === 4 ? v4Str(maskInt(self.data.prefixlen, 32)) : v6Str(maskInt(self.data.prefixlen, 128)));
    attrs.with_hostmask = (ctx, self) => baseStr(self.data) + '/' + (ver === 4 ? v4Str(maskInt(self.data.prefixlen, 32) ^ 0xffffffffn) : v6Str(maskInt(self.data.prefixlen, 128) ^ allOnes(128)));
  }
  return {
    typeName: clsName,
    parents: isIface ? [ver === 4 ? Q4A : Q6A] : [],
    construct(ctx, args, kwargs) {
      ctorArgs(ctx, args, kwargs, clsName);
      const arg = args[0];
      if (isIface) {
        const r = netFromArg(ctx, ver, arg, false);
        if (r.unk) return UNK(clsName);
        return ctx.native(Q, { ver, val: r.hostval, prefixlen: r.prefixlen, scope: r.scope });
      }
      const r = addrFromArg(ctx, ver, arg);
      if (r.unk) return UNK(clsName);
      return ctx.native(Q, { ver, val: r.val, scope: r.scope });
    },
    attrs,
    methods: { __format__: (ctx, self, args, kwargs) => addrFormat(ctx, self, args, kwargs) },
    repr: (ctx, self) => clsName + '(' + pyRepr(isIface ? ifaceStr(self.data) : addrStr(self.data)) + ')',
    str: (ctx, self) => (isIface ? ifaceStr(self.data) : addrStr(self.data)),
    eq: (ctx, self, other) => {
      // B7 追補 R4：異種型（Address⇔Interface 間を含む）には false で確定させず
      // null（NotImplemented 相当）を返し、基盤の反射（相手側 eq）に委ねる。
      // ただし最終結果は CPython 3.12.3 と一致させる：IPv4Interface.__eq__／
      // IPv6Interface.__eq__ は「ネットワークを持つ Interface は、それと
      // 結び付いていない Address とは等しくない」（CPython ソースのコメント
      // 明記）ため、Interface == Address は両方向とも False であり、hash も
      // 一致しない（実走確認済み。集合では2要素、辞書引きは miss）。
      // 両側の eq が null の場合、基盤は False に確定させるので、この委ね方で
      // CPython の結果と一致する。同クラス同士の比較は従来どおり値で判定する。
      if (!other || other.__native !== self.__native) return null;
      const a = self.data, b = other.data;
      if (a.val !== b.val) return false;
      if (a.ver === 6 && (a.scope || null) !== (b.scope || null)) return false;
      if (isIface) { const na = ifaceNetData(a), nb = ifaceNetData(b); return na.val === nb.val && na.prefixlen === nb.prefixlen; }
      return true;
    },
    hash: (ctx, self) => {
      const d = self.data;
      if (isIface) return 'ipI' + d.ver + ':' + d.val.toString() + '/' + d.prefixlen + '@' + ifaceNetData(d).val.toString() + '%' + (d.scope || '');
      return 'ipA' + d.ver + ':' + d.val.toString() + '%' + (d.scope || '');
    },
    binop: (ctx, self, op, other, reflected) => addrBinop(ctx, self, op, other, reflected),
    compare: (ctx, self, op, other) => addrCompare(ctx, self, op, other),
  };
}

/* ---------- ネットワーク ---------- */
function netBroadcast(d) { return d.val | (maskInt(d.prefixlen, BITS[d.ver]) ^ allOnes(BITS[d.ver])); }
function netEqData(a, b) {
  return a.ver === b.ver && a.val === b.val && a.prefixlen === b.prefixlen && (a.scope || null) === (b.scope || null);
}
function countOrUnk(ctx, count, what) {
  if (count > BigInt(ITER_CAP_SAFE)) { ctx.diag(what + 'の要素数が上限（100000件）を超えるため、この説明では結果を確定しません'); return true; }
  return false;
}
const ITER_CAP_SAFE = 100000;
function addrListIter(ctx, d, vals, kind) {
  const Q = d.ver === 4 ? Q4A : Q6A;
  return genIter(ctx, vals.map((v) => ctx.native(Q, { ver: d.ver, val: v, scope: null })), kind);
}
function netHosts(ctx, d) {
  const bits = BITS[d.ver], b = netBroadcast(d);
  let count, gen;
  if (d.prefixlen === bits) { count = 1n; gen = () => [d.val]; }
  else if (d.prefixlen === bits - 1) { count = b - d.val + 1n; gen = () => { const o = []; for (let x = d.val; x <= b; x++) o.push(x); return o; }; }
  else if (d.ver === 4) { count = b - d.val - 1n; gen = () => { const o = []; for (let x = d.val + 1n; x < b; x++) o.push(x); return o; }; }
  else { count = b - d.val; gen = () => { const o = []; for (let x = d.val + 1n; x <= b; x++) o.push(x); return o; }; }
  if (countOrUnk(ctx, count, 'hosts()')) return ctx.unk('hosts() の結果');
  return addrListIter(ctx, d, gen(), 'generator');
}
function intKwArg(ctx, args, kwargs, idx, name, def) {
  let v = def;
  if (args.length > idx) v = args[idx];
  if (kwargs && name in kwargs) {
    if (args.length > idx) ctx.err('TypeError', "subnets() got multiple values for argument '" + name + "'", '');
    v = kwargs[name];
  }
  return v;
}
function netSubnets(ctx, self, args, kwargs) {
  const d = self.data, bits = BITS[d.ver];
  const pdiffV = intKwArg(ctx, args, kwargs, 0, 'prefixlen_diff', I(1));
  const newpV = intKwArg(ctx, args, kwargs, 1, 'new_prefix', NONE);
  if (isUnk(pdiffV) || isUnk(newpV)) return UNK('subnets()');
  let prefixlenDiff = ctx.int(pdiffV);
  if (prefixlenDiff === null) ctx.err('TypeError', "'" + ctx.typeName(pdiffV) + "' object cannot be interpreted as an integer", '');
  let newPrefix = isNone(newpV) ? null : ctx.int(newpV);
  if (newPrefix === null && !isNone(newpV)) ctx.err('TypeError', "'" + ctx.typeName(newpV) + "' object cannot be interpreted as an integer", '');
  const Q = d.ver === 4 ? Q4N : Q6N;
  if (d.prefixlen === bits) return ITER([self], 'generator');
  if (newPrefix !== null) {
    if (newPrefix < d.prefixlen) ctx.err('ValueError', 'new prefix must be longer', '');
    if (prefixlenDiff !== 1) ctx.err('ValueError', 'cannot set prefixlen_diff and new_prefix', '');
    prefixlenDiff = newPrefix - d.prefixlen;
  }
  if (prefixlenDiff < 0) ctx.err('ValueError', 'prefix length diff must be > 0', '');
  const newPrefixlen = d.prefixlen + prefixlenDiff;
  if (newPrefixlen > bits) ctx.err('ValueError', 'prefix length diff ' + newPrefixlen + ' is invalid for netblock ' + netStr(d), '');
  const count = 1n << BigInt(prefixlenDiff);
  if (countOrUnk(ctx, count, 'subnets()')) return ctx.unk('subnets() の結果');
  const step = ((maskInt(d.prefixlen, bits) ^ allOnes(bits)) + 1n) >> BigInt(prefixlenDiff);
  const out = [];
  const end = netBroadcast(d);
  for (let a = d.val; a <= end; a += step) out.push(ctx.native(Q, { ver: d.ver, val: a, prefixlen: newPrefixlen, scope: d.scope }));
  return ITER(out, 'generator');
}
function netSupernet(ctx, self, args, kwargs) {
  const d = self.data;
  const pdiffV = intKwArg(ctx, args, kwargs, 0, 'prefixlen_diff', I(1));
  const newpV = intKwArg(ctx, args, kwargs, 1, 'new_prefix', NONE);
  if (isUnk(pdiffV) || isUnk(newpV)) return UNK('supernet()');
  let prefixlenDiff = ctx.int(pdiffV);
  if (prefixlenDiff === null) ctx.err('TypeError', "'" + ctx.typeName(pdiffV) + "' object cannot be interpreted as an integer", '');
  let newPrefix = isNone(newpV) ? null : ctx.int(newpV);
  if (newPrefix === null && !isNone(newpV)) ctx.err('TypeError', "'" + ctx.typeName(newpV) + "' object cannot be interpreted as an integer", '');
  if (d.prefixlen === 0) return self;
  if (newPrefix !== null) {
    if (newPrefix > d.prefixlen) ctx.err('ValueError', 'new prefix must be shorter', '');
    if (prefixlenDiff !== 1) ctx.err('ValueError', 'cannot set prefixlen_diff and new_prefix', '');
    prefixlenDiff = d.prefixlen - newPrefix;
  }
  const newPrefixlen = d.prefixlen - prefixlenDiff;
  if (newPrefixlen < 0) ctx.err('ValueError', 'current prefixlen is ' + d.prefixlen + ', cannot have a prefixlen_diff of ' + prefixlenDiff, '');
  const nv = d.val & (maskInt(d.prefixlen, BITS[d.ver]) << BigInt(prefixlenDiff));
  return ctx.native(d.ver === 4 ? Q4N : Q6N, { ver: d.ver, val: nv, prefixlen: newPrefixlen, scope: d.scope });
}
function isSubnetOf(ctx, a, b) {
  // a, b はネットワークデータ（または値）。_is_subnet_of の移植。
  return b.val <= a.val && netBroadcast(b) >= netBroadcast(a);
}
function netExclude(ctx, self, args, kwargs) {
  const d = self.data;
  noKw(ctx, kwargs, 'address_exclude');
  if (args.length !== 1) ctx.err('TypeError', 'address_exclude() takes exactly one argument (' + args.length + ' given)', '');
  const other = args[0];
  if (isUnk(other)) return UNK('address_exclude()');
  if (!other || !other.__native || !isAddrQ(other.__native) && !isNetQ(other.__native)) {
    ctx.err('AttributeError', "'" + ctx.typeName(other) + "' object has no attribute '_version'", '');
  }
  const od = other.data;
  if (od.ver !== d.ver) ctx.err('TypeError', netStr(d) + ' and ' + ctx.strOf(other) + ' are not of the same version', '');
  if (!isNetQ(other.__native)) ctx.err('TypeError', ctx.strOf(other) + ' is not a network object', '');
  if (!isSubnetOf(ctx, od, d)) ctx.err('ValueError', netStr(od) + ' not contained in ' + netStr(d), '');
  const Q = d.ver === 4 ? Q4N : Q6N;
  if (netEqData(od, d)) return ITER([], 'generator');
  const out = [];
  let s1 = null, s2 = null;
  const split = (nd) => {
    const np = nd.prefixlen + 1;
    const step = ((maskInt(nd.prefixlen, BITS[nd.ver]) ^ allOnes(BITS[nd.ver])) + 1n) >> 1n;
    return [ctx.native(Q, { ver: nd.ver, val: nd.val, prefixlen: np, scope: nd.scope }),
            ctx.native(Q, { ver: nd.ver, val: nd.val + step, prefixlen: np, scope: nd.scope })];
  };
  [s1, s2] = split(d);
  let guard = 0;
  while (!netEqData(s1.data, od) && !netEqData(s2.data, od)) {
    if (++guard > 200) { ctx.diag('address_exclude の分割が収束しませんでした'); return ctx.unk('address_exclude() の結果'); }
    if (isSubnetOf(ctx, od, s1.data)) { out.push(s2); [s1, s2] = split(s1.data); }
    else if (isSubnetOf(ctx, od, s2.data)) { out.push(s1); [s1, s2] = split(s2.data); }
    else ctx.err('AssertionError', 'Error performing exclusion: s1: ' + netStr(s1.data) + ' s2: ' + netStr(s2.data) + ' other: ' + netStr(od), '');
  }
  out.push(netEqData(s1.data, od) ? s2 : s1);
  return ITER(out, 'generator');
}
function makeNetDef(ver) {
  const Q = ver === 4 ? Q4N : Q6N;
  const AQ = ver === 4 ? Q4A : Q6A;
  const clsName = (ver === 4 ? 'IPv4' : 'IPv6') + 'Network';
  const bits = BITS[ver];
  const bothEnds = (d, fn) => fn({ ver, val: d.val, scope: d.scope }) && fn({ ver, val: netBroadcast(d), scope: d.scope });
  const attrs = {
    version: () => I(ver),
    max_prefixlen: () => I(bits),
    network_address: (ctx, self) => ctx.native(AQ, { ver, val: self.data.val, scope: self.data.scope }),
    broadcast_address: (ctx, self) => ctx.native(AQ, { ver, val: netBroadcast(self.data), scope: null }),
    netmask: (ctx, self) => ctx.native(AQ, { ver, val: maskInt(self.data.prefixlen, bits), scope: null }),
    hostmask: (ctx, self) => ctx.native(AQ, { ver, val: maskInt(self.data.prefixlen, bits) ^ allOnes(bits), scope: null }),
    prefixlen: (ctx, self) => I(self.data.prefixlen),
    num_addresses: (ctx, self) => {
      const n = numToEngine(1n << BigInt(bits - self.data.prefixlen));
      if (n === null) { ctx.diag(BIGDESC); return ctx.unk('num_addresses の値'); }
      return n;
    },
    compressed: (ctx, self) => netStr(self.data),
    exploded: (ctx, self) => (ver === 4 ? netStr(self.data) : v6Exploded(self.data.val) + '/' + self.data.prefixlen),
    with_prefixlen: (ctx, self) => netStr(self.data),
    with_netmask: (ctx, self) => addrStr({ ver, val: self.data.val, scope: self.data.scope }) + '/' + (ver === 4 ? v4Str(maskInt(self.data.prefixlen, 32)) : v6Str(maskInt(self.data.prefixlen, 128))),
    with_hostmask: (ctx, self) => addrStr({ ver, val: self.data.val, scope: self.data.scope }) + '/' + (ver === 4 ? v4Str(maskInt(self.data.prefixlen, 32) ^ 0xffffffffn) : v6Str(maskInt(self.data.prefixlen, 128) ^ allOnes(128))),
    is_private: (ctx, self) => {
      const d = self.data, b = netBroadcast(d);
      const table = ver === 4 ? V4_PRIVATE : V6_PRIVATE, exc = ver === 4 ? V4_PRIVATE_EXC : V6_PRIVATE_EXC;
      const inExc = (v) => exc.some(([n, p]) => inNet(v, n, p, bits));
      return BOOL(table.some(([n, p]) => inNet(d.val, n, p, bits) && inNet(b, n, p, bits)) && !inExc(d.val) && !inExc(b));
    },
    is_global: (ctx, self) => {
      if (ver === 6) return BOOL(!attrs.is_private(ctx, self).v);
      const d = self.data, b = netBroadcast(d);
      const inPub = (v) => inNet(v, V4_PUBLIC[0], V4_PUBLIC[1], 32);
      return BOOL(!(inPub(d.val) && inPub(b)) && !attrs.is_private(ctx, self).v);
    },
    is_multicast: (ctx, self) => BOOL(bothEnds(self.data, (a) => (ver === 4 ? inNet(a.val, rawV4('224.0.0.0'), 4, 32) : inNet(a.val, rawV6('ff00::'), 8, 128)))),
    is_reserved: (ctx, self) => BOOL(bothEnds(self.data, addrIsReserved)),
    is_link_local: (ctx, self) => BOOL(bothEnds(self.data, (a) => (ver === 4 ? inNet(a.val, rawV4('169.254.0.0'), 16, 32) : inNet(a.val, rawV6('fe80::'), 10, 128)))),
    is_loopback: (ctx, self) => BOOL(bothEnds(self.data, (a) => (ver === 4 ? inNet(a.val, rawV4('127.0.0.0'), 8, 32) : a.val === 1n))),
    is_unspecified: (ctx, self) => BOOL(bothEnds(self.data, (a) => a.val === 0n)),
  };
  if (ver === 6) attrs.is_site_local = (ctx, self) => BOOL(bothEnds(self.data, (a) => inNet(a.val, rawV6('fec0::'), 10, 128)));
  const methods = {
    hosts: (ctx, self, args, kwargs) => { noKw(ctx, kwargs, 'hosts'); if (args.length) ctx.err('TypeError', 'hosts() takes no arguments (' + args.length + ' given)', ''); return netHosts(ctx, self.data); },
    subnets: (ctx, self, args, kwargs) => netSubnets(ctx, self, args, kwargs),
    supernet: (ctx, self, args, kwargs) => netSupernet(ctx, self, args, kwargs),
    address_exclude: (ctx, self, args, kwargs) => netExclude(ctx, self, args, kwargs),
    compare_networks: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'compare_networks');
      if (args.length !== 1) ctx.err('TypeError', 'compare_networks() takes exactly one argument (' + args.length + ' given)', '');
      const other = args[0];
      if (isUnk(other)) return UNK('compare_networks()');
      if (!other || !other.__native || !isNetQ(other.__native)) {
        if (other && other.__native && isAddrQ(other.__native)) {
          if (other.data.ver !== ver) ctx.err('TypeError', netStr(self.data) + ' and ' + ctx.strOf(other) + ' are not of the same type', '');
          ctx.err('AttributeError', "'" + ctx.typeName(other) + "' object has no attribute 'network_address'", '');
        }
        ctx.err('AttributeError', "'" + ctx.typeName(other) + "' object has no attribute '_version'", '');
      }
      if (other.data.ver !== ver) ctx.err('TypeError', netStr(self.data) + ' and ' + netStr(other.data) + ' are not of the same type', '');
      return I(cmpNetVals(self.data, other.data));
    },
    subnet_of: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'subnet_of');
      if (args.length !== 1) ctx.err('TypeError', 'subnet_of() takes exactly one argument (' + args.length + ' given)', '');
      const other = args[0];
      if (isUnk(other)) return UNK('subnet_of()');
      if (!other || !other.__native || !isNetQ(other.__native)) ctx.err('TypeError', 'Unable to test subnet containment between ' + netStr(self.data) + ' and ' + ctx.strOf(other), '');
      if (other.data.ver !== ver) ctx.err('TypeError', netStr(self.data) + ' and ' + netStr(other.data) + ' are not of the same version', '');
      return BOOL(isSubnetOf(ctx, self.data, other.data));
    },
    supernet_of: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'supernet_of');
      if (args.length !== 1) ctx.err('TypeError', 'supernet_of() takes exactly one argument (' + args.length + ' given)', '');
      const other = args[0];
      if (isUnk(other)) return UNK('supernet_of()');
      if (!other || !other.__native || !isNetQ(other.__native)) ctx.err('TypeError', 'Unable to test subnet containment between ' + ctx.strOf(other) + ' and ' + netStr(self.data), '');
      if (other.data.ver !== ver) ctx.err('TypeError', netStr(other.data) + ' and ' + netStr(self.data) + ' are not of the same version', '');
      return BOOL(isSubnetOf(ctx, other.data, self.data));
    },
    overlaps: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'overlaps');
      if (args.length !== 1) ctx.err('TypeError', 'overlaps() takes exactly one argument (' + args.length + ' given)', '');
      const other = args[0];
      if (isUnk(other)) return UNK('overlaps()');
      if (!other || !other.__native || !isNetQ(other.__native)) ctx.err('TypeError', "argument of type '" + ctx.typeName(other) + "' is not iterable", '');
      const a = self.data, b = other.data;
      if (a.ver !== b.ver) return BOOL(false);
      const inN = (v, nd) => (v & maskInt(nd.prefixlen, BITS[nd.ver])) === nd.val;
      return BOOL(inN(a.val, b) || inN(netBroadcast(a), b) || inN(b.val, a) || inN(netBroadcast(b), a));
    },
  };
  return {
    typeName: clsName,
    construct(ctx, args, kwargs) {
      if (args.length === 0) ctx.err('TypeError', clsName + ".__init__() missing 1 required positional argument: 'address'", '');
      if (args.length > 2) ctx.err('TypeError', clsName + '.__init__() takes 3 positional arguments but ' + (args.length + 1) + ' were given', '');
      let strict = true;
      if (args.length === 2) strict = ctx.truthy(args[1]);
      if (kwargs && 'strict' in kwargs) {
        if (args.length === 2) ctx.err('TypeError', clsName + ".__init__() got multiple values for argument 'strict'", '');
        strict = ctx.truthy(kwargs.strict);
      }
      for (const k of Object.keys(kwargs || {})) if (k !== 'strict') ctx.err('TypeError', clsName + ".__init__() got an unexpected keyword argument '" + k + "'", '');
      const r = netFromArg(ctx, ver, args[0], strict);
      if (r.unk) return UNK(clsName);
      return ctx.native(Q, { ver, val: r.val, prefixlen: r.prefixlen, scope: r.scope });
    },
    attrs, methods,
    repr: (ctx, self) => clsName + '(' + pyRepr(netStr(self.data)) + ')',
    str: (ctx, self) => netStr(self.data),
    eq: (ctx, self, other) => {
      // B7 追補 R4：Address／Interface 側と同様、異種型には null を返して
      // 反射に委ねる（両側 null なら基盤が False に確定。CPython と一致）。
      if (!other || other.__native !== self.__native) return null;
      return netEqData(self.data, other.data);
    },
    hash: (ctx, self) => 'ipN' + ver + ':' + self.data.val.toString() + '/' + self.data.prefixlen + '%' + (self.data.scope || ''),
    compare: (ctx, self, op, other) => {
      if (!other || !other.__native || !isNetQ(other.__native)) return null;
      if (other.data.ver !== ver) ctx.err('TypeError', netStr(self.data) + ' and ' + netStr(other.data) + ' are not of the same version', '');
      const c = cmpNetVals(self.data, other.data);
      return op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0;
    },
    iter: (ctx, self) => {
      const d = self.data, b = netBroadcast(d);
      const count = b - d.val + 1n;
      if (countOrUnk(ctx, count, 'ネットワークの反復')) return null;
      const out = [];
      for (let x = d.val; x <= b; x++) out.push(ctx.native(AQ, { ver, val: x, scope: null }));
      return out;
    },
    getitem: (ctx, self, key) => {
      const d = self.data;
      const n = ctx.int(key);
      if (n === null) ctx.err('TypeError', "'>=' not supported between instances of '" + ctx.typeName(key) + "' and 'int'", '');
      const b = netBroadcast(d);
      let v;
      if (n >= 0) { v = d.val + BigInt(n); if (v > b) ctx.err('IndexError', 'address out of range', ''); }
      else { v = b + BigInt(n) + 1n; if (v < d.val) ctx.err('IndexError', 'address out of range', ''); }
      return ctx.native(AQ, { ver, val: v, scope: null });
    },
    contains: (ctx, self, item) => {
      if (isUnk(item)) return null;
      if (!item || !item.__native) ctx.err('AttributeError', "'" + ctx.typeName(item) + "' object has no attribute '_version'", '');
      if (!isAddrQ(item.__native)) return false;
      if (item.data.ver !== ver) return false;
      return (item.data.val & maskInt(self.data.prefixlen, bits)) === self.data.val;
    },
  };
}

/* ---------- モジュール関数 ---------- */
function catchAddrErr(fn) {
  try { return { v: fn() }; }
  catch (e) { if (e && (e.kind === AVE || e.kind === NVE)) return { fail: true }; throw e; }
}
function ipAddressFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'ip_address'); arity(ctx, args, 1, 1, 'ip_address');
  const arg = args[0];
  if (isUnk(arg)) return arg;
  for (const ver of [4, 6]) {
    const r = catchAddrErr(() => addrFromArg(ctx, ver, arg));
    if (!r.fail) {
      if (r.v.unk) return UNK('ip_address の結果');
      return ctx.native(ver === 4 ? Q4A : Q6A, { ver, val: r.v.val, scope: r.v.scope });
    }
  }
  ctx.err('ValueError', ctx.repr(arg) + ' does not appear to be an IPv4 or IPv6 address', '');
}
function strictArg(ctx, args, kwargs, fname) {
  let strict = true;
  if (args.length > 1) strict = ctx.truthy(args[1]);
  if (kwargs && 'strict' in kwargs) {
    if (args.length > 1) ctx.err('TypeError', fname + "() got multiple values for argument 'strict'", '');
    strict = ctx.truthy(kwargs.strict);
  }
  for (const k of Object.keys(kwargs || {})) if (k !== 'strict') ctx.err('TypeError', fname + "() got an unexpected keyword argument '" + k + "'", '');
  return strict;
}
function ipNetworkFn(ctx, args, kwargs) {
  if (args.length < 1 || args.length > 2) ctx.err('TypeError', 'ip_network() takes 1 to 2 positional arguments but ' + args.length + ' were given', '');
  const strict = strictArg(ctx, args, kwargs, 'ip_network');
  const arg = args[0];
  if (isUnk(arg)) return arg;
  for (const ver of [4, 6]) {
    const r = catchAddrErr(() => netFromArg(ctx, ver, arg, strict));
    if (!r.fail) {
      if (r.v.unk) return UNK('ip_network の結果');
      return ctx.native(ver === 4 ? Q4N : Q6N, { ver, val: r.v.val, prefixlen: r.v.prefixlen, scope: r.v.scope });
    }
  }
  ctx.err('ValueError', ctx.repr(arg) + ' does not appear to be an IPv4 or IPv6 network', '');
}
function ipInterfaceFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'ip_interface'); arity(ctx, args, 1, 1, 'ip_interface');
  const arg = args[0];
  if (isUnk(arg)) return arg;
  for (const ver of [4, 6]) {
    const r = catchAddrErr(() => netFromArg(ctx, ver, arg, false));
    if (!r.fail) {
      if (r.v.unk) return UNK('ip_interface の結果');
      return ctx.native(ver === 4 ? Q4I : Q6I, { ver, val: r.v.hostval, prefixlen: r.v.prefixlen, scope: r.v.scope });
    }
  }
  ctx.err('ValueError', ctx.repr(arg) + ' does not appear to be an IPv4 or IPv6 interface', '');
}
function countRHZ(n, bits) {
  if (n === 0n) return bits;
  let c = 0, m = n;
  while ((m & 1n) === 0n) { c++; m >>= 1n; }
  return Math.min(bits, c);
}
function summarizeRange(ctx, fi, li, ver) {
  const bits = BITS[ver];
  const out = [];
  while (fi <= li) {
    const nbits = Math.min(countRHZ(fi, bits), (li - fi + 1n).toString(2).length - 1);
    out.push(ctx.native(ver === 4 ? Q4N : Q6N, { ver, val: fi, prefixlen: bits - nbits, scope: null }));
    fi += 1n << BigInt(nbits);
    if (fi - 1n === allOnes(bits)) break;
  }
  return out;
}
function summarizeFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'summarize_address_range'); arity(ctx, args, 2, 2, 'summarize_address_range');
  const [first, last] = args;
  if (isUnk(first) || isUnk(last)) return UNK('summarize_address_range の結果');
  const isA = (v) => v && v.__native && isAddrQ(v.__native);
  if (!isA(first) || !isA(last)) ctx.err('TypeError', 'first and last must be IP addresses, not networks', '');
  if (first.data.ver !== last.data.ver) ctx.err('TypeError', ctx.strOf(first) + ' and ' + ctx.strOf(last) + ' are not of the same version', '');
  if (first.data.val > last.data.val) ctx.err('ValueError', 'last IP address must be greater than first', '');
  return ITER(summarizeRange(ctx, first.data.val, last.data.val, first.data.ver), 'generator');
}
function supernetData(d) {
  if (d.prefixlen === 0) return { ver: d.ver, val: d.val, prefixlen: 0, scope: d.scope };
  const np = d.prefixlen - 1;
  return { ver: d.ver, val: d.val & maskInt(np, BITS[d.ver]), prefixlen: np, scope: d.scope };
}
function collapseFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'collapse_addresses'); arity(ctx, args, 1, 1, 'collapse_addresses');
  const items = ctx.iterable(args[0]);
  if (!items) {
    if (isUnk(args[0])) return UNK('collapse_addresses の結果');
    ctx.err('TypeError', "'" + ctx.typeName(args[0]) + "' object is not iterable", '');
  }
  if (items.some((v) => isUnk(v))) return UNK('collapse_addresses の結果');
  const ips = [], nets = [];
  const verCheck = (ip, ref) => {
    if (ref && ref.data.ver !== ip.data.ver) ctx.err('TypeError', ctx.strOf(ip) + ' and ' + ctx.strOf(ref) + ' are not of the same version', '');
  };
  for (const ip of items) {
    if (ip && ip.__native && isAddrQ(ip.__native)) {
      verCheck(ip, ips[ips.length - 1]); ips.push(ip);
    } else if (ip && ip.__native && isNetQ(ip.__native)) {
      if (ip.data.prefixlen === BITS[ip.data.ver]) {
        verCheck(ip, ips[ips.length - 1]);
        if (ip.__native === Q4I || ip.__native === Q6I) ips.push(ctx.native(ip.data.ver === 4 ? Q4A : Q6A, { ver: ip.data.ver, val: ip.data.val, scope: null }));
        else ips.push(ctx.native(ip.data.ver === 4 ? Q4A : Q6A, { ver: ip.data.ver, val: ip.data.val, scope: ip.data.scope }));
      } else { verCheck(ip, nets[nets.length - 1]); nets.push(ip); }
    } else {
      ctx.err('AttributeError', "'" + ctx.typeName(ip) + "' object has no attribute '_prefixlen'", '');
    }
  }
  const dedup = [];
  for (const ip of ips) {
    if (!dedup.some((x) => x.__native === ip.__native && x.data.val === ip.data.val && (x.data.scope || null) === (ip.data.scope || null))) dedup.push(ip);
  }
  dedup.sort((a, b) => (a.data.val === b.data.val ? 0 : (a.data.val < b.data.val ? -1 : 1)));
  const addrs = [];
  if (dedup.length) {
    let first = dedup[0], last = dedup[0];
    const ranges = [];
    for (let i = 1; i < dedup.length; i++) {
      const ip = dedup[i];
      if (ip.data.val !== last.data.val + 1n) { ranges.push([first, last]); first = ip; }
      last = ip;
    }
    ranges.push([first, last]);
    for (const [f, l] of ranges) addrs.push(...summarizeRange(ctx, f.data.val, l.data.val, f.data.ver));
  }
  const toMerge = [...addrs, ...nets];
  const subnets = new Map();
  while (toMerge.length) {
    const net = toMerge.pop();
    const sup = supernetData(net.data);
    const key = 'N' + sup.ver + ':' + sup.val.toString() + '/' + sup.prefixlen + '%' + (sup.scope || '');
    const existing = subnets.get(key);
    if (!existing) subnets.set(key, net);
    else if (!netEqData(existing.data, net.data)) {
      subnets.delete(key);
      toMerge.push(ctx.native(net.data.ver === 4 ? Q4N : Q6N, sup));
    }
  }
  const vals = [...subnets.values()].sort((a, b) => cmpNetVals(a.data, b.data));
  const out = [];
  let last = null;
  for (const net of vals) {
    if (last && netBroadcast(last.data) >= netBroadcast(net.data)) continue;
    out.push(net); last = net;
  }
  return ITER(out, 'generator');
}
function mixedKeyFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'get_mixed_type_key'); arity(ctx, args, 1, 1, 'get_mixed_type_key');
  const obj = args[0];
  if (obj && obj.__native && isNetQ(obj.__native)) {
    const d = obj.data, AQ = d.ver === 4 ? Q4A : Q6A;
    return TUPLE([I(d.ver),
      ctx.native(AQ, { ver: d.ver, val: d.val, scope: d.scope }),
      ctx.native(AQ, { ver: d.ver, val: maskInt(d.prefixlen, BITS[d.ver]), scope: null })]);
  }
  if (obj && obj.__native && isAddrQ(obj.__native)) return TUPLE([I(obj.data.ver), obj]);
  ctx.diag('get_mixed_type_key は IP オブジェクト以外には NotImplemented を返しますが、本アプリでは NotImplemented の値を表現できないため未確定として扱います');
  return ctx.unk('NotImplemented');
}
function intToPackedFn(ver) {
  return (ctx, args, kwargs) => {
    noKw(ctx, kwargs, 'v' + ver + '_int_to_packed'); arity(ctx, args, 1, 1, 'v' + ver + '_int_to_packed');
    const a = args[0];
    if (isUnk(a)) return UNK('');
    let n = null;
    if (isBool(a)) n = a.v ? 1n : 0n;
    else if (isNum(a) && !a.f && Number.isSafeInteger(a.v)) n = BigInt(a.v);
    if (n === null) ctx.err('AttributeError', "'" + ctx.typeName(a) + "' object has no attribute 'to_bytes'", '');
    if (n < 0n || n > allOnes(BITS[ver])) ctx.err('ValueError', 'Address negative or too large for IPv' + ver, '');
    return makeBytesVal(packedBytes(n, BITS[ver]));
  };
}

registerStdlibModule('ipaddress', {
  classes: {
    IPv4Address: makeAddrDef(4, false),
    IPv6Address: makeAddrDef(6, false),
    IPv4Network: makeNetDef(4),
    IPv6Network: makeNetDef(6),
    IPv4Interface: makeAddrDef(4, true),
    IPv6Interface: makeAddrDef(6, true),
    AddressValueError: { typeName: 'AddressValueError', exc: AVE, excParents: ['ValueError'] },
    NetmaskValueError: { typeName: 'NetmaskValueError', exc: NVE, excParents: ['ValueError'] },
  },
  functions: {
    ip_address: ipAddressFn,
    ip_network: ipNetworkFn,
    ip_interface: ipInterfaceFn,
    summarize_address_range: summarizeFn,
    collapse_addresses: collapseFn,
    get_mixed_type_key: mixedKeyFn,
    v4_int_to_packed: intToPackedFn(4),
    v6_int_to_packed: intToPackedFn(6),
  },
});
