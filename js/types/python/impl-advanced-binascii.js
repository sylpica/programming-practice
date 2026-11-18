/* 高度モード B7 G7：binascii。
 * 3.12 の意味論を基礎に、3.15 で追加されたキーワード引数
 * （a2b_base64 の padded/alphabet/ignorechars/canonical、
 * b2a_base64 の padded/alphabet/wrapcol、a2b_hex の ignorechars 等）と
 * 3.15 新設の a2b/b2a_base32・base85・ascii85、*_ALPHABET 定数を収載する。
 * a2b_* は ASCII 文字列も受け付ける（公式ドキュメントの注記どおり）。
 * それ以外は bytes-like のみで、G7 内部 bytes 値で受ける。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { I, UNK, makeBytesVal, bytesArr, unkRet, onlyKw, kwVal, kwBool } from './impl-advanced-g7-common.js';

export const B64_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export const B64_URLSAFE_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const B32_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const B32HEX_ALPHA = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
export const B85_ALPHA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';
export const A85_ALPHA = (() => { let s = ''; for (let c = 33; c <= 117; c++) s += String.fromCharCode(c); return s; })();
export const Z85_ALPHA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';
export const CRYPT_ALPHA = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const UU_ALPHA_STR = (() => { let s = ''; for (let c = 32; c <= 95; c++) s += String.fromCharCode(c); return s; })();

export function errB(ctx, msg) { ctx.err('binascii.Error', msg, ''); }

/* ---- base64 コア ---- */
export function b64EncodeArr(arr, alphabet = B64_ALPHA, padded = true) {
  let out = '';
  for (let i = 0; i < arr.length; i += 3) {
    const n = arr.length - i;
    const b0 = arr[i], b1 = n > 1 ? arr[i + 1] : 0, b2 = n > 2 ? arr[i + 2] : 0;
    out += alphabet[b0 >> 2];
    out += alphabet[((b0 & 3) << 4) | (b1 >> 4)];
    out += n > 1 ? alphabet[((b1 & 15) << 2) | (b2 >> 6)] : (padded ? '=' : '');
    out += n > 2 ? alphabet[b2 & 63] : (padded ? '=' : '');
  }
  return out;
}
export function b64DecodeStr(ctx, s, alphabet, opt = {}) {
  // opt: {strict, padded, canonical, ignore:Set}
  let t = s;
  if (opt.ignore) t = [...t].filter((c) => !opt.ignore.has(c)).join('');
  if (!opt.strict && !opt.canonical) {
    t = [...t].filter((c) => alphabet.includes(c) || c === '=').join('');
  }
  if (opt.strict) {
    for (const c of t) if (!alphabet.includes(c) && c !== '=') errB(ctx, 'Only base64 data is allowed');
    const firstPad = t.indexOf('=');
    if (firstPad >= 0 && /[^=]/.test(t.slice(firstPad))) errB(ctx, 'Discontinuous padding not allowed');
    if (firstPad >= 0 && t.length - firstPad > 2) errB(ctx, 'Excess data after padding');
  }
  if (opt.padded !== false) {
    if (t.length % 4 !== 0) errB(ctx, 'Incorrect padding');
  }
  const out = [];
  let acc = 0, accBits = 0;
  for (const c of t) {
    if (c === '=') break;
    const v = alphabet.indexOf(c);
    if (v < 0) { if (opt.strict) errB(ctx, 'Only base64 data is allowed'); continue; }
    acc = (acc << 6) | v; accBits += 6;
    if (accBits >= 8) { accBits -= 8; out.push((acc >> accBits) & 255); }
  }
  if (opt.canonical) {
    // 最終グループの未使用ビットが 0 でなければ拒否
    if (accBits > 0 && (acc & ((1 << accBits) - 1)) !== 0) errB(ctx, 'Non-canonical base64 encoding');
  }
  return out;
}
/* ---- base32 コア ---- */
export function b32EncodeArr(arr, alphabet = B32_ALPHA, padded = true) {
  let out = '';
  for (let i = 0; i < arr.length; i += 5) {
    const chunk = arr.slice(i, i + 5);
    let bits = 0, val = 0;
    for (const b of chunk) { val = val * 256 + b; bits += 8; }
    let chars = '';
    let totalBits = Math.ceil(bits / 5) * 5;
    let v = val * Math.pow(2, totalBits - bits);
    const nch = totalBits / 5;
    for (let k = nch - 1; k >= 0; k--) { chars += alphabet[Math.floor(v / Math.pow(32, k)) % 32]; }
    out += chars;
    if (padded) out += '='.repeat(8 - nch);
  }
  return out;
}
export function b32DecodeStr(ctx, s, alphabet, opt = {}) {
  let t = s;
  if (opt.ignore) t = [...t].filter((c) => !opt.ignore.has(c)).join('');
  const out = [];
  let acc = 0, accBits = 0;
  let seenPad = false;
  for (const c of t) {
    if (c === '=') { seenPad = true; continue; }
    if (seenPad) errB(ctx, 'Discontinuous padding not allowed');
    const v = alphabet.indexOf(c);
    if (v < 0) errB(ctx, 'Non-base32 digit found');
    acc = acc * 32 + v; accBits += 5;
    if (accBits >= 8) { accBits -= 8; out.push(Math.floor(acc / Math.pow(2, accBits)) % 256); acc = acc % Math.pow(2, accBits); }
  }
  if (opt.padded !== false) {
    const dataLen = t.replace(/=+$/, '').length;
    if (t.length % 8 !== 0 || ![0, 2, 4, 5, 7].includes(dataLen % 8)) errB(ctx, 'Incorrect padding');
  }
  if (opt.canonical && accBits > 0 && acc !== 0) errB(ctx, 'Non-canonical base32 encoding');
  return out;
}
/* ---- base85 / ascii85 コア ---- */
export function b85EncodeArr(arr, alphabet, pad = false) {
  let out = '';
  for (let i = 0; i < arr.length; i += 4) {
    const chunk = arr.slice(i, i + 4);
    let val = 0;
    for (let j = 0; j < 4; j++) val = val * 256 + (chunk[j] || 0);
    const enc = [];
    let v = val;
    for (let j = 0; j < 5; j++) { enc.unshift(alphabet[v % 85]); v = Math.floor(v / 85); }
    out += pad || chunk.length === 4 ? enc.join('') : enc.slice(0, chunk.length + 1).join('');
  }
  return out;
}
export function b85DecodeStr(ctx, s, alphabet, opt = {}) {
  let t = s;
  if (opt.ignore) t = [...t].filter((c) => !opt.ignore.has(c)).join('');
  const out = [];
  for (let i = 0; i < t.length; i += 5) {
    const chunk = t.slice(i, i + 5);
    if (chunk.length === 1) errB(ctx, 'bad base85 character at position ' + i);
    let val = 0;
    for (const c of chunk) { const d = alphabet.indexOf(c); if (d < 0) errB(ctx, 'bad base85 character at position ' + i); val = val * 85 + d; }
    for (let j = chunk.length; j < 5; j++) val = val * 85 + 84;
    if (val > 4294967295) errB(ctx, 'base85 overflow at position ' + i);
    const bytes = [(val >>> 24) & 255, (val >>> 16) & 255, (val >>> 8) & 255, val & 255];
    out.push(...(chunk.length === 5 ? bytes : bytes.slice(0, chunk.length - 1)));
  }
  return out;
}
export function a85EncodeArr(arr, opt = {}) {
  const { foldspaces = false, pad = false, adobe = false } = opt;
  let out = '';
  for (let i = 0; i < arr.length; i += 4) {
    const chunk = arr.slice(i, i + 4);
    if (foldspaces && chunk.length === 4 && chunk.every((b) => b === 0x20)) { out += 'y'; continue; }
    if (chunk.length === 4 && chunk.every((b) => b === 0)) { out += 'z'; continue; }
    let val = 0;
    for (let j = 0; j < 4; j++) val = val * 256 + (chunk[j] || 0);
    const enc = [];
    let v = val;
    for (let j = 0; j < 5; j++) { enc.unshift(A85_ALPHA[v % 85]); v = Math.floor(v / 85); }
    out += pad || chunk.length === 4 ? enc.join('') : enc.slice(0, chunk.length + 1).join('');
  }
  return adobe ? '<~' + out + '~>' : out;
}
export function a85DecodeStr(ctx, s, opt = {}) {
  let t = s;
  if (opt.adobe) {
    if (t.startsWith('<~')) t = t.slice(2);
    if (!t.endsWith('~>')) errB(ctx, 'Ascii85 encoded byte sequences must end with b\'~>\'');
    t = t.slice(0, -2);
  }
  const ignore = opt.ignore || new Set();
  const out = [];
  let group = [];
  const flush = (g, isFinal) => {
    if (g.length === 1) { if (opt.dropTrailingSingle) return; errB(ctx, 'bad ascii85 character'); }
    let val = 0;
    for (const c of g) val = val * 85 + A85_ALPHA.indexOf(c);
    for (let j = g.length; j < 5; j++) val = val * 85 + 84;
    if (val > 4294967295) errB(ctx, 'ascii85 overflow');
    const bytes = [(val >>> 24) & 255, (val >>> 16) & 255, (val >>> 8) & 255, val & 255];
    out.push(...(g.length === 5 ? bytes : bytes.slice(0, g.length - 1)));
  };
  for (const c of t) {
    if (ignore.has(c)) continue;
    if (c === 'z' && group.length === 0) { out.push(0, 0, 0, 0); continue; }
    if (c === 'y' && opt.foldspaces && group.length === 0) { out.push(0x20, 0x20, 0x20, 0x20); continue; }
    if (!A85_ALPHA.includes(c)) errB(ctx, 'bad ascii85 character');
    group.push(c);
    if (group.length === 5) { flush(group, false); group = []; }
  }
  if (group.length) flush(group, true);
  return out;
}
/* ---- hex ---- */
export function hexEncodeArr(arr, sep, bytesPerSep) {
  let hex = arr.map((b) => b.toString(16).padStart(2, '0')).join('');
  if (sep !== null && sep !== undefined && bytesPerSep !== 0) {
    const pairs = []; for (let i = 0; i < hex.length; i += 2) pairs.push(hex.slice(i, i + 2));
    const groups = [];
    if (bytesPerSep > 0) { let cur = []; for (let i = pairs.length - 1; i >= 0; i--) { cur.unshift(pairs[i]); if (cur.length === bytesPerSep) { groups.unshift(cur.join('')); cur = []; } } if (cur.length) groups.unshift(cur.join('')); }
    else { let cur = []; for (let i = 0; i < pairs.length; i++) { cur.push(pairs[i]); if (cur.length === -bytesPerSep) { groups.push(cur.join('')); cur = []; } } if (cur.length) groups.push(cur.join('')); }
    hex = groups.join(sep);
  }
  return hex;
}
export function hexDecodeStr(ctx, s, ignore) {
  let t = s;
  if (ignore) t = [...t].filter((c) => !ignore.has(c)).join('');
  if (t.length % 2 !== 0) errB(ctx, 'Odd-length string');
  const out = [];
  for (let i = 0; i < t.length; i += 2) {
    const h = t.substr(i, 2);
    if (!/^[0-9a-fA-F]{2}$/.test(h)) errB(ctx, 'Non-hexadecimal digit found');
    out.push(parseInt(h, 16));
  }
  return out;
}
/* ---- CRC ---- */
const CRC32_TABLE = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32Arr(arr, value = 0) {
  let crc = (value ^ 0xffffffff) >>> 0;
  for (const b of arr) crc = CRC32_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export function crcHqxArr(arr, value) {
  let crc = value & 0xffff;
  for (const b of arr) {
    crc ^= b << 8;
    for (let k = 0; k < 8; k++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}
/* ---- quoted-printable（binascii.b2a_qp / a2b_qp） ---- */
export function qpEncodeArr(arr, opt = {}) {
  const { quotetabs = false, istext = true, header = false } = opt;
  const out = [];
  let lineLen = 0;
  const enc = (b) => '=' + b.toString(16).toUpperCase().padStart(2, '0');
  const softBreak = () => { out.push(0x3d, 0x0a); lineLen = 0; };
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    const isLast = i === arr.length - 1;
    if (b === 0x0a && istext) { out.push(0x0a); lineLen = 0; continue; }
    if (b === 0x0d && istext) { out.push(0x0d); lineLen += 1; continue; }
    let unit;
    if (b === 0x20 || b === 0x09) {
      const atLineEnd = istext && (arr[i + 1] === 0x0a || (arr[i + 1] === 0x0d && arr[i + 2] === 0x0a));
      if (header && b === 0x20) unit = (quotetabs || isLast) ? enc(b) : '_';
      else if (quotetabs || atLineEnd || isLast) unit = enc(b);
      else unit = String.fromCharCode(b);
    } else if (b >= 33 && b <= 126 && b !== 0x3d && !(header && b === 0x5f)) {
      unit = String.fromCharCode(b);
    } else {
      unit = enc(b);
    }
    if (unit.length === 3) { if (lineLen > 72) softBreak(); }
    else if (lineLen >= 75 && !isLast) softBreak();
    for (const c of unit) out.push(c.charCodeAt(0));
    lineLen += unit.length;
  }
  return out;
}
export function qpDecodeArr(arr, header = false) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    if (header && b === 0x5f) { out.push(0x20); continue; }
    if (b === 0x3d) {
      if (arr[i + 1] === 0x0a) { i++; continue; }
      if (arr[i + 1] === 0x0d && arr[i + 2] === 0x0a) { i += 2; continue; }
      const h = String.fromCharCode(arr[i + 1] || 0, arr[i + 2] || 0);
      if (/^[0-9a-fA-F]{2}$/.test(h)) { out.push(parseInt(h, 16)); i += 2; continue; }
      out.push(b); continue;
    }
    out.push(b);
  }
  return out;
}
/* ---- uu ---- */
export function uuEncodeArr(ctx, arr, backtick = false) {
  if (arr.length > 45) errB(ctx, 'At most 45 bytes at once');
  const zeroCh = backtick ? '`' : ' ';
  let out = String.fromCharCode(arr.length + 32 === 32 && backtick ? 96 : arr.length + 32);
  for (let i = 0; i < arr.length; i += 3) {
    const chunk = [arr[i] || 0, arr[i + 1] || 0, arr[i + 2] || 0];
    const vals = [chunk[0] >> 2, ((chunk[0] & 3) << 4) | (chunk[1] >> 4), ((chunk[1] & 15) << 2) | (chunk[2] >> 6), chunk[2] & 63];
    for (const v of vals) out += v === 0 ? zeroCh : String.fromCharCode(v + 32);
  }
  return out + '\n';
}
export function uuDecodeStr(ctx, s) {
  let t = s.replace(/[\r\n]+$/, '');
  if (!t.length) errB(ctx, 'Empty string');
  let lenCh = t.charCodeAt(0);
  const n = lenCh === 96 ? 0 : lenCh - 32;
  if (n < 0 || n > 45) errB(ctx, 'Invalid header');
  t = t.slice(1);
  const out = [];
  for (let i = 0; i < t.length; i += 4) {
    const vals = [];
    for (let j = 0; j < 4; j++) {
      const c = t.charCodeAt(i + j);
      vals.push(Number.isNaN(c) ? 0 : c === 96 ? 0 : (c - 32) & 63);
    }
    out.push((vals[0] << 2) | (vals[1] >> 4), ((vals[1] & 15) << 4) | (vals[2] >> 2), ((vals[2] & 3) << 6) | vals[3]);
  }
  return out.slice(0, n);
}

/* ---- 入力ヘルパ ---- */
function dataBytes(ctx, v, fname) {
  const a = bytesArr(v);
  if (a !== null) return a;
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'argument should be a bytes-like object, not ' + ctx.typeName(v), '');
  return null;
}
function dataAscii(ctx, v, fname) {
  if (typeof v === 'string') { if (/[^\x00-\x7f]/.test(v)) ctx.err('ValueError', 'string argument should contain only ASCII characters', ''); return v; }
  const a = bytesArr(v);
  if (a !== null) return a.map((b) => String.fromCharCode(b)).join('');
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'argument should be a bytes-like object or ASCII string, not ' + ctx.typeName(v), '');
  return null;
}
function alphaArg(ctx, v, len, fname) {
  if (v === undefined || v === null) return null;
  const s = dataAscii(ctx, v, fname);
  if (s === null) return null;
  if (s.length !== len) ctx.err('TypeError', 'alphabet must be ' + len + ' characters', '');
  return s;
}
function ignoreArg(ctx, v) {
  if (v === undefined || v === null) return null;
  const s = dataAscii(ctx, v, 'ignorechars');
  return s === null ? null : new Set([...s]);
}
function wrapText(s, wrapcol, newline) {
  if (!wrapcol) return s + (newline ? '\n' : '');
  const lines = [];
  for (let i = 0; i < s.length; i += wrapcol) lines.push(s.slice(i, i + wrapcol));
  return lines.join('\n') + (newline ? '\n' : '');
}
const strBytes = (s) => [...s].map((c) => c.charCodeAt(0));

registerStdlibModule('binascii', {
  data: {
    BASE64_ALPHABET: makeBytesVal(strBytes(B64_ALPHA)),
    URLSAFE_BASE64_ALPHABET: makeBytesVal(strBytes(B64_URLSAFE_ALPHA)),
    BASE32_ALPHABET: makeBytesVal(strBytes(B32_ALPHA)),
    BASE32HEX_ALPHABET: makeBytesVal(strBytes(B32HEX_ALPHA)),
    BASE85_ALPHABET: makeBytesVal(strBytes(B85_ALPHA)),
    ASCII85_ALPHABET: makeBytesVal(strBytes(A85_ALPHA)),
    Z85_ALPHABET: makeBytesVal(strBytes(Z85_ALPHA)),
    CRYPT_ALPHABET: makeBytesVal(strBytes(CRYPT_ALPHA)),
    UU_ALPHABET: UNK('binascii.UU_ALPHABET（未検証）'),
    BINHEX_ALPHABET: UNK('binascii.BINHEX_ALPHABET（未検証）'),
  },
  functions: {
    b2a_base64: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['padded', 'alphabet', 'wrapcol', 'newline'], 'binascii.b2a_base64');
      if (args.length !== 1) ctx.err('TypeError', 'b2a_base64() takes exactly one argument', '');
      const a = dataBytes(ctx, args[0], 'b2a_base64'); if (a === null) return unkRet(ctx, 'binascii.b2a_base64 の入力');
      const alpha = alphaArg(ctx, kwVal(kwargs, 'alphabet', undefined), 64, 'b2a_base64') || B64_ALPHA;
      const padded = !('padded' in kwargs) || !!ctx.truthy(kwargs.padded);
      const wrapcol = 'wrapcol' in kwargs ? ctx.int(kwargs.wrapcol) : 0;
      const newline = !('newline' in kwargs) || !!ctx.truthy(kwargs.newline);
      const enc = b64EncodeArr(a, alpha, padded);
      return makeBytesVal(strBytes(wrapText(enc, wrapcol || 0, newline)));
    },
    a2b_base64: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['padded', 'alphabet', 'strict_mode', 'canonical', 'ignorechars'], 'binascii.a2b_base64');
      if (args.length !== 1) ctx.err('TypeError', 'a2b_base64() takes exactly one argument', '');
      const s = dataAscii(ctx, args[0], 'a2b_base64'); if (s === null) return unkRet(ctx, 'binascii.a2b_base64 の入力');
      const alpha = alphaArg(ctx, kwVal(kwargs, 'alphabet', undefined), 64, 'a2b_base64') || B64_ALPHA;
      const ignore = ignoreArg(ctx, kwVal(kwargs, 'ignorechars', undefined));
      const strict = 'strict_mode' in kwargs ? !!ctx.truthy(kwargs.strict_mode) : ('ignorechars' in kwargs);
      return makeBytesVal(b64DecodeStr(ctx, s, alpha, { strict, padded: !('padded' in kwargs) || !!ctx.truthy(kwargs.padded), canonical: kwBool(ctx, kwargs, 'canonical'), ignore }));
    },
    b2a_base32: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['padded', 'alphabet', 'wrapcol'], 'binascii.b2a_base32');
      const a = dataBytes(ctx, args[0], 'b2a_base32'); if (a === null) return unkRet(ctx, 'binascii.b2a_base32 の入力');
      const alpha = alphaArg(ctx, kwVal(kwargs, 'alphabet', undefined), 32, 'b2a_base32') || B32_ALPHA;
      const enc = b32EncodeArr(a, alpha, !('padded' in kwargs) || !!ctx.truthy(kwargs.padded));
      const wrapcol = 'wrapcol' in kwargs ? ctx.int(kwargs.wrapcol) : 0;
      return makeBytesVal(strBytes(wrapText(enc, wrapcol || 0, false)));
    },
    a2b_base32: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['padded', 'alphabet', 'ignorechars', 'canonical'], 'binascii.a2b_base32');
      const s = dataAscii(ctx, args[0], 'a2b_base32'); if (s === null) return unkRet(ctx, 'binascii.a2b_base32 の入力');
      const alpha = alphaArg(ctx, kwVal(kwargs, 'alphabet', undefined), 32, 'a2b_base32') || B32_ALPHA;
      return makeBytesVal(b32DecodeStr(ctx, s, alpha, { padded: !('padded' in kwargs) || !!ctx.truthy(kwargs.padded), ignore: ignoreArg(ctx, kwVal(kwargs, 'ignorechars', undefined)), canonical: kwBool(ctx, kwargs, 'canonical') }));
    },
    b2a_base85: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['alphabet', 'wrapcol', 'pad'], 'binascii.b2a_base85');
      const a = dataBytes(ctx, args[0], 'b2a_base85'); if (a === null) return unkRet(ctx, 'binascii.b2a_base85 の入力');
      const alpha = alphaArg(ctx, kwVal(kwargs, 'alphabet', undefined), 85, 'b2a_base85') || B85_ALPHA;
      const enc = b85EncodeArr(a, alpha, kwBool(ctx, kwargs, 'pad'));
      const wrapcol = 'wrapcol' in kwargs ? ctx.int(kwargs.wrapcol) : 0;
      return makeBytesVal(strBytes(wrapText(enc, wrapcol || 0, false)));
    },
    a2b_base85: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['alphabet', 'ignorechars', 'canonical'], 'binascii.a2b_base85');
      const s = dataAscii(ctx, args[0], 'a2b_base85'); if (s === null) return unkRet(ctx, 'binascii.a2b_base85 の入力');
      const alpha = alphaArg(ctx, kwVal(kwargs, 'alphabet', undefined), 85, 'a2b_base85') || B85_ALPHA;
      return makeBytesVal(b85DecodeStr(ctx, s, alpha, { ignore: ignoreArg(ctx, kwVal(kwargs, 'ignorechars', undefined)) }));
    },
    b2a_ascii85: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['foldspaces', 'wrapcol', 'pad', 'adobe'], 'binascii.b2a_ascii85');
      const a = dataBytes(ctx, args[0], 'b2a_ascii85'); if (a === null) return unkRet(ctx, 'binascii.b2a_ascii85 の入力');
      const enc = a85EncodeArr(a, { foldspaces: kwBool(ctx, kwargs, 'foldspaces'), pad: kwBool(ctx, kwargs, 'pad'), adobe: kwBool(ctx, kwargs, 'adobe') });
      const wrapcol = 'wrapcol' in kwargs ? ctx.int(kwargs.wrapcol) : 0;
      return makeBytesVal(strBytes(wrapText(enc, wrapcol || 0, false)));
    },
    a2b_ascii85: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['foldspaces', 'adobe', 'ignorechars', 'canonical'], 'binascii.a2b_ascii85');
      const s = dataAscii(ctx, args[0], 'a2b_ascii85'); if (s === null) return unkRet(ctx, 'binascii.a2b_ascii85 の入力');
      const ig = ignoreArg(ctx, kwVal(kwargs, 'ignorechars', undefined));
      return makeBytesVal(a85DecodeStr(ctx, s, { foldspaces: kwBool(ctx, kwargs, 'foldspaces'), adobe: kwBool(ctx, kwargs, 'adobe'), ignore: ig || new Set() }));
    },
    b2a_hex: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'binascii.b2a_hex');
      const a = dataBytes(ctx, args[0], 'b2a_hex'); if (a === null) return unkRet(ctx, 'binascii.b2a_hex の入力');
      let sep = null, per = 1;
      if (args.length >= 2 && !ctx.isNone(args[1])) { const sv = args[1]; sep = typeof sv === 'string' ? sv : (bytesArr(sv) && bytesArr(sv).length === 1 ? String.fromCharCode(bytesArr(sv)[0]) : null); if (sep === null || [...sep].length !== 1) ctx.err('TypeError', 'sep must be length 1', ''); }
      if (args.length >= 3) { per = ctx.int(args[2]); if (per === null) return unkRet(ctx, 'bytes_per_sep'); }
      return makeBytesVal(strBytes(hexEncodeArr(a, sep, per)));
    },
    hexlify: null, // 後で b2a_hex と同じ関数を割り当てる（下記）
    a2b_hex: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['ignorechars'], 'binascii.a2b_hex');
      const s = dataAscii(ctx, args[0], 'a2b_hex'); if (s === null) return unkRet(ctx, 'binascii.a2b_hex の入力');
      return makeBytesVal(hexDecodeStr(ctx, s, ignoreArg(ctx, kwVal(kwargs, 'ignorechars', undefined))));
    },
    unhexlify: null,
    crc32: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'binascii.crc32');
      const a = dataBytes(ctx, args[0], 'crc32'); if (a === null) return unkRet(ctx, 'binascii.crc32 の入力');
      const v = args.length >= 2 ? ctx.int(args[1]) : 0;
      if (v === null) return unkRet(ctx, 'crc32 の初期値');
      return I(crc32Arr(a, v));
    },
    crc_hqx: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'binascii.crc_hqx');
      const a = dataBytes(ctx, args[0], 'crc_hqx'); if (a === null) return unkRet(ctx, 'binascii.crc_hqx の入力');
      const v = ctx.int(args[1]);
      if (v === null) return unkRet(ctx, 'crc_hqx の初期値');
      return I(crcHqxArr(a, v));
    },
    b2a_qp: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'binascii.b2a_qp');
      const a = dataBytes(ctx, args[0], 'b2a_qp'); if (a === null) return unkRet(ctx, 'binascii.b2a_qp の入力');
      const truthy = (idx) => args.length > idx ? !!ctx.truthy(args[idx]) : undefined;
      return makeBytesVal(qpEncodeArr(a, { quotetabs: truthy(1) || false, istext: truthy(2) === undefined ? true : truthy(2), header: truthy(3) || false }));
    },
    a2b_qp: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'binascii.a2b_qp');
      let a = bytesArr(args[0]);
      if (a === null && typeof args[0] === 'string') a = strBytes(args[0]);
      if (a === null) { if (ctx.isUnk(args[0])) return unkRet(ctx, 'binascii.a2b_qp の入力'); ctx.err('TypeError', 'argument should be a bytes-like object', ''); }
      const header = args.length > 1 ? !!ctx.truthy(args[1]) : false;
      return makeBytesVal(qpDecodeArr(a, header));
    },
    b2a_uu: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, ['backtick'], 'binascii.b2a_uu');
      const a = dataBytes(ctx, args[0], 'b2a_uu'); if (a === null) return unkRet(ctx, 'binascii.b2a_uu の入力');
      const bt = 'backtick' in kwargs ? !!ctx.truthy(kwargs.backtick) : (args.length > 1 ? !!ctx.truthy(args[1]) : false);
      return makeBytesVal(strBytes(uuEncodeArr(ctx, a, bt)));
    },
    a2b_uu: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'binascii.a2b_uu');
      const s = dataAscii(ctx, args[0], 'a2b_uu'); if (s === null) return unkRet(ctx, 'binascii.a2b_uu の入力');
      return makeBytesVal(uuDecodeStr(ctx, s));
    },
  },
  classes: {
    Error: { typeName: 'Error', exc: 'binascii.Error', excParents: ['ValueError'] },
    Incomplete: { typeName: 'Incomplete', exc: 'binascii.Incomplete', excParents: ['Exception'] },
  },
});
import { STDLIB_MODULES } from './stdlib-registry.js';
{
  const def = STDLIB_MODULES.get('binascii');
  def.functions.hexlify = def.functions.b2a_hex;
  def.functions.unhexlify = def.functions.a2b_hex;
}
