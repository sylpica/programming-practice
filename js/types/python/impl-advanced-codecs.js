/* 高度モード B7 G7: codecs モジュール。
* lookup の正規化・CodecInfo・encode/decode は主要コーデック（utf-8/16/32、
* ascii、iso8859-1、cp1252、hex、base64、quopri、uu、rot-13、unicode-escape、
* raw-unicode-escape、punycode）を CPython 3.12.3 実走と照合して実装。
* CJK 表・zlib・idna・utf-7 等は CodecInfo は返すが encode/decode は未検証。
* StreamReader 系・open・EncodedFile はストリーム前提のため未対応。
* エラーハンドラ関数群は例外オブジェクトの属性（object/start/end）を値モデルで
* 表せないため未検証。 */
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
import {
  I, BOOL, NONE, LIST, TUPLE, ITER, UNK, makeBytesVal, bytesArr, unkRet,
  unsupportedFn, unverifiedFn, onlyKw, kwBool, makeDictFrom, strToUtf8,
} from './impl-advanced-g7-common.js';
import {
  B64_ALPHA, b64EncodeArr, hexEncodeArr, hexDecodeStr, qpEncodeArr, qpDecodeArr,
  uuEncodeArr, uuDecodeStr, errB,
} from './impl-advanced-binascii.js';

const strBytes = (s) => [...s].map((c) => c.charCodeAt(0));
const encErr = (ctx, codec, msg) => ctx.err('UnicodeEncodeError', "'" + codec + "' codec can't encode " + msg, '');
const decErr = (ctx, codec, byte, pos, reason) => ctx.err('UnicodeDecodeError',
  "'" + codec + "' codec can't decode byte 0x" + byte.toString(16).padStart(2, '0') + ' in position ' + pos + ': ' + reason, '');

/* ---- UTF-8 手書き（エラーハンドラ対応） ---- */
function utf8EncodeC(ctx, s, errors, codec = 'utf-8') {
  const out = [];
  let pos = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) {
      if (errors === 'strict') { encErr(ctx, codec, "character '\\u" + cp.toString(16) + "' in position " + pos + ': surrogates not allowed'); return null; }
      if (errors === 'ignore') { pos++; continue; }
      if (errors === 'replace') { out.push(0x3f); pos++; continue; }
      if (errors === 'backslashreplace') { const e = '\\u' + cp.toString(16).padStart(4, '0'); for (const c of e) out.push(c.charCodeAt(0)); pos++; continue; }
      if (errors === 'xmlcharrefreplace') { const e = '&#' + cp + ';'; for (const c of e) out.push(c.charCodeAt(0)); pos++; continue; }
      if (errors === 'surrogatepass') { out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)); pos++; continue; }
      return 'unverified';
    }
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    pos++;
  }
  return out;
}
/* 戻り値 {str, rest} — rest は未完の末尾バイト列（incremental 用）。final でなければ末尾の不完全列はエラーにしない */
function utf8DecodeC(ctx, arr, errors, final = true, codec = 'utf-8') {
  let out = '';
  let i = 0;
  const fail = (pos, reason, byteCount) => {
    if (errors === 'strict') { decErr(ctx, codec, arr[pos], pos, reason); return -1; }
    if (errors === 'ignore') return pos + byteCount;
    if (errors === 'replace') { out += '�'; return pos + byteCount; }
    if (errors === 'backslashreplace') { for (let k = 0; k < byteCount; k++) out += '\\x' + arr[pos + k].toString(16).padStart(2, '0'); return pos + byteCount; }
    return -2; // unverified handler
  };
  while (i < arr.length) {
    const b = arr[i];
    if (b < 0x80) { out += String.fromCharCode(b); i++; continue; }
    let need = 0, minCp = 0;
    if (b >= 0xc2 && b <= 0xdf) { need = 1; minCp = 0x80; }
    else if (b >= 0xe0 && b <= 0xef) { need = 2; minCp = 0x800; }
    else if (b >= 0xf0 && b <= 0xf4) { need = 3; minCp = 0x10000; }
    else {
      const r = fail(i, 'invalid start byte', 1);
      if (r === -1) return null; if (r === -2) return 'unverified';
      i = r; continue;
    }
    if (i + need >= arr.length) {
      // 末尾不足
      let okPrefix = true;
      for (let k = 1; k <= Math.min(need, arr.length - 1 - i); k++) if ((arr[i + k] & 0xc0) !== 0x80) okPrefix = false;
      if (!final && okPrefix) return { str: out, rest: arr.slice(i) };
      const r = fail(i, 'unexpected end of data', arr.length - i);
      if (r === -1) return null; if (r === -2) return 'unverified';
      i = r; continue;
    }
    let cp = b & (need === 1 ? 0x1f : need === 2 ? 0x0f : 0x07);
    let badCont = -1;
    for (let k = 1; k <= need; k++) {
      const cb = arr[i + k];
      if ((cb & 0xc0) !== 0x80) { badCont = k; break; }
      cp = (cp << 6) | (cb & 63);
    }
    if (badCont >= 0) {
      const r = fail(i, 'invalid continuation byte', badCont);
      if (r === -1) return null; if (r === -2) return 'unverified';
      i = r; continue;
    }
    if (cp < minCp || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) {
      const r = fail(i, 'invalid continuation byte', need + 1);
      if (r === -1) return null; if (r === -2) return 'unverified';
      i = r; continue;
    }
    out += String.fromCodePoint(cp);
    i += need + 1;
  }
  return { str: out, rest: [] };
}
/* ---- UTF-16/32 ---- */
function utf16EncodeC(ctx, s, errors, endian, codec) {
  const out = [];
  const push = (u) => { if (endian === 'le') out.push(u & 255, (u >> 8) & 255); else out.push((u >> 8) & 255, u & 255); };
  let pos = 0;
  for (const ch of s) {
    let cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) {
      if (errors === 'strict') { encErr(ctx, codec, "character '\\u" + cp.toString(16) + "' in position " + pos + ': surrogates not allowed'); return null; }
      if (errors === 'ignore') { pos++; continue; }
      if (errors === 'replace') { push(0xfffd); pos++; continue; }
      return 'unverified';
    }
    if (cp < 0x10000) push(cp);
    else { cp -= 0x10000; push(0xd800 + (cp >> 10)); push(0xdc00 + (cp & 0x3ff)); }
    pos++;
  }
  return out;
}
function utf16DecodeC(ctx, arr, errors, endian, codec, final = true) {
  let out = '';
  const unit = (k) => endian === 'le' ? (arr[k] | (arr[k + 1] << 8)) : ((arr[k] << 8) | arr[k + 1]);
  let i = 0;
  let rest = [];
  while (i < arr.length) {
    if (i + 1 >= arr.length) {
      if (!final) { rest = arr.slice(i); break; }
      if (errors === 'strict') { decErr(ctx, codec, arr[i], i, 'truncated data'); return null; }
      if (errors === 'replace') out += '�';
      break;
    }
    const u = unit(i);
    if (u >= 0xd800 && u <= 0xdbff) {
      if (i + 3 >= arr.length) {
        if (!final) { rest = arr.slice(i); break; }
        if (errors === 'strict') { decErr(ctx, codec, arr[i], i, 'unexpected end of data'); return null; }
        if (errors === 'replace') { out += '�'; i += 2; continue; }
        i += 2; continue;
      }
      const u2 = unit(i + 2);
      if (u2 >= 0xdc00 && u2 <= 0xdfff) { out += String.fromCodePoint(0x10000 + ((u - 0xd800) << 10) + (u2 - 0xdc00)); i += 4; continue; }
      if (errors === 'strict') { decErr(ctx, codec, arr[i], i, 'illegal UTF-16 surrogate'); return null; }
      if (errors === 'replace') out += '�';
      i += 2; continue;
    }
    if (u >= 0xdc00 && u <= 0xdfff) {
      if (errors === 'strict') { decErr(ctx, codec, arr[i], i, 'illegal UTF-16 surrogate'); return null; }
      if (errors === 'replace') out += '�';
      i += 2; continue;
    }
    out += String.fromCharCode(u);
    i += 2;
  }
  return { str: out, rest };
}
function utf32EncodeC(ctx, s, errors, endian, codec) {
  const out = [];
  let pos = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) {
      if (errors === 'strict') { encErr(ctx, codec, "character '\\u" + cp.toString(16) + "' in position " + pos + ': surrogates not allowed'); return null; }
      if (errors === 'ignore') { pos++; continue; }
      if (errors === 'replace') { push32(out, 0xfffd, endian); pos++; continue; }
      return 'unverified';
    }
    push32(out, cp, endian);
    pos++;
  }
  return out;
}
function push32(out, cp, endian) {
  if (endian === 'le') out.push(cp & 255, (cp >> 8) & 255, (cp >> 16) & 255, (cp >> 24) & 255);
  else out.push((cp >> 24) & 255, (cp >> 16) & 255, (cp >> 8) & 255, cp & 255);
}
function utf32DecodeC(ctx, arr, errors, endian, codec, final = true) {
  let out = '';
  let i = 0;
  let rest = [];
  while (i < arr.length) {
    if (i + 3 >= arr.length) {
      if (!final && i < arr.length) { rest = arr.slice(i); break; }
      if (i < arr.length) {
        if (errors === 'strict') { decErr(ctx, codec, arr[i], i, 'truncated data'); return null; }
        if (errors === 'replace') out += '�';
      }
      break;
    }
    const cp = endian === 'le'
      ? (arr[i] | (arr[i + 1] << 8) | (arr[i + 2] << 16) | (arr[i + 3] << 24)) >>> 0
      : ((arr[i] << 24) | (arr[i + 1] << 16) | (arr[i + 2] << 8) | arr[i + 3]) >>> 0;
    if (cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) {
      if (errors === 'strict') { decErr(ctx, codec, arr[i], i, 'illegal Unicode character'); return null; }
      if (errors === 'replace') out += '�';
      i += 4; continue;
    }
    out += String.fromCodePoint(cp);
    i += 4;
  }
  return { str: out, rest };
}
/* ---- 8ビット系 ---- */
function asciiLatinEncodeC(ctx, s, errors, codec, limit, table) {
  const out = [];
  let pos = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    let byte = null;
    if (table) { byte = table.encode.get(cp); if (byte === undefined) byte = null; }
    else if (cp <= limit) byte = cp;
    if (byte !== null) { out.push(byte); pos++; continue; }
    if (errors === 'strict') { encErr(ctx, codec, "character '\\u" + cp.toString(16).padStart(4, '0') + "' in position " + pos + ': ordinal not in range(' + (limit + 1) + ')'); return null; }
    if (errors === 'ignore') { pos++; continue; }
    if (errors === 'replace') { out.push(0x3f); pos++; continue; }
    if (errors === 'backslashreplace') { const e = cp <= 0xff ? '\\x' + cp.toString(16).padStart(2, '0') : cp <= 0xffff ? '\\u' + cp.toString(16).padStart(4, '0') : '\\U' + cp.toString(16).padStart(8, '0'); for (const c of e) out.push(c.charCodeAt(0)); pos++; continue; }
    if (errors === 'xmlcharrefreplace') { const e = '&#' + cp + ';'; for (const c of e) out.push(c.charCodeAt(0)); pos++; continue; }
    return 'unverified';
  }
  return out;
}
function asciiLatinDecodeC(ctx, arr, errors, codec, limit, table) {
  let out = '';
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    if (table) {
      const cp = table.decode[b];
      if (cp !== null && cp !== undefined) { out += String.fromCodePoint(cp); continue; }
    } else if (b <= limit) { out += String.fromCharCode(b); continue; }
    if (errors === 'strict') { decErr(ctx, codec, b, i, 'ordinal not in range(' + (limit + 1) + ')'); return null; }
    if (errors === 'ignore') continue;
    if (errors === 'replace') { out += '�'; continue; }
    if (errors === 'backslashreplace') { out += '\\x' + b.toString(16).padStart(2, '0'); continue; }
    return 'unverified';
  }
  return { str: out, rest: [] };
}
const CP1252_HIGH = [0x20ac, null, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, null, 0x017d, null, null, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, null, 0x017e, 0x0178];
const CP1252 = (() => {
  const decode = [];
  for (let b = 0; b < 256; b++) decode.push(b < 0x80 || b >= 0xa0 ? b : CP1252_HIGH[b - 0x80]);
  const encode = new Map();
  decode.forEach((cp, b) => { if (cp !== null && !encode.has(cp)) encode.set(cp, b); });
  return { decode, encode };
})();
/* ---- punycode (RFC 3492) ---- */
const PC = { base: 36, tmin: 1, tmax: 26, skew: 38, damp: 700, initialBias: 72, initialN: 128 };
function pcAdapt(delta, numPoints, firstTime) {
  delta = firstTime ? Math.floor(delta / PC.damp) : Math.floor(delta / 2);
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((PC.base - PC.tmin) * PC.tmax) / 2) { delta = Math.floor(delta / (PC.base - PC.tmin)); k += PC.base; }
  return k + Math.floor(((PC.base - PC.tmin + 1) * delta) / (delta + PC.skew));
}
function pcDigit(d) { return d < 26 ? String.fromCharCode(97 + d) : String.fromCharCode(48 + d - 26); }
function pcDigitVal(c) {
  const code = c.charCodeAt(0);
  if (code >= 97 && code <= 122) return code - 97;
  if (code >= 65 && code <= 90) return code - 65;
  if (code >= 48 && code <= 57) return code - 48 + 26;
  return -1;
}
function punycodeEncode(ctx, s) {
  const input = [...s].map((c) => c.codePointAt(0));
  let out = '';
  const basics = input.filter((cp) => cp < 0x80);
  out += basics.map((cp) => String.fromCharCode(cp)).join('');
  let b = basics.length, h = b;
  if (b > 0) out += '-';
  let n = PC.initialN, delta = 0, bias = PC.initialBias;
  while (h < input.length) {
    let m = Infinity;
    for (const cp of input) if (cp >= n && cp < m) m = cp;
    delta += (m - n) * (h + 1);
    n = m;
    for (const cp of input) {
      if (cp < n) delta++;
      else if (cp === n) {
        let q = delta;
        for (let k = PC.base; ; k += PC.base) {
          const t = k <= bias ? PC.tmin : k >= bias + PC.tmax ? PC.tmax : k - bias;
          if (q < t) break;
          out += pcDigit(t + ((q - t) % (PC.base - t)));
          q = Math.floor((q - t) / (PC.base - t));
        }
        out += pcDigit(q);
        bias = pcAdapt(delta, h + 1, h === b);
        delta = 0;
        h++;
      }
    }
    delta++;
    n++;
  }
  return strBytes(out);
}
function punycodeDecode(ctx, s) {
  const str = typeof s === 'string' ? s : s.map((b) => String.fromCharCode(b)).join('');
  let n = PC.initialN, i = 0, bias = PC.initialBias;
  const output = [];
  let idx = str.lastIndexOf('-');
  let pos;
  if (idx >= 0) { for (let k = 0; k < idx; k++) output.push(str.charCodeAt(k)); pos = idx + 1; }
  else pos = 0;
  while (pos < str.length) {
    const oldi = i;
    let w = 1;
    for (let k = PC.base; ; k += PC.base) {
      if (pos >= str.length) { ctx.err('UnicodeDecodeError', "'punycode' codec can't decode: incomplete punycode string", ''); return null; }
      const digit = pcDigitVal(str[pos++]);
      if (digit < 0) { ctx.err('UnicodeDecodeError', "'punycode' codec can't decode: invalid digit", ''); return null; }
      i += digit * w;
      const t = k <= bias ? PC.tmin : k >= bias + PC.tmax ? PC.tmax : k - bias;
      if (digit < t) break;
      w *= (PC.base - t);
    }
    const len = output.length + 1;
    bias = pcAdapt(i - oldi, len, oldi === 0);
    n += Math.floor(i / len);
    i = i % len;
    output.splice(i, 0, n);
    i++;
  }
  return output.map((cp) => String.fromCodePoint(cp)).join('');
}
/* ---- escape_encode / escape_decode ---- */
export function escapeEncodeArr(arr) {
  let out = '';
  for (const b of arr) {
    if (b === 0x5c) out += '\\\\';
    else if (b === 0x27) out += "\\'";
    else if (b === 0x09) out += '\\t';
    else if (b === 0x0a) out += '\\n';
    else if (b === 0x0d) out += '\\r';
    else if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b);
    else out += '\\x' + b.toString(16).padStart(2, '0');
  }
  return strBytes(out);
}
export function escapeDecodeArr(arr) {
  const s = arr.map((b) => String.fromCharCode(b)).join('');
  const out = [];
  let i = 0;
  const simple = { n: 10, t: 9, r: 13, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11 };
  while (i < s.length) {
    const ch = s[i];
    if (ch !== '\\') { out.push(ch.charCodeAt(0)); i++; continue; }
    const e = s[i + 1];
    if (e === undefined) { out.push(92); i++; continue; }
    if (e === 'x') {
      const hex = s.slice(i + 2, i + 4);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) { out.push(parseInt(hex, 16)); i += 4; continue; }
      out.push(92, 120); i += 2; continue;
    }
    if (e >= '0' && e <= '7') {
      let j = i + 1, val = 0, cnt = 0;
      while (cnt < 3 && s[j] >= '0' && s[j] <= '7') { val = val * 8 + (s[j].charCodeAt(0) - 48); j++; cnt++; }
      out.push(val & 255); i = j; continue;
    }
    if (e in simple) { out.push(simple[e]); i += 2; continue; }
    out.push(92, e.charCodeAt(0)); i += 2; continue;
  }
  return out;
}
/* ---- unicode_escape ---- */
function unicodeEscapeEncode(ctx, s) {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === "'") out += "\\'";
    else if (cp >= 0x20 && cp < 0x7f) out += ch;
    else if (cp < 0x100) out += '\\x' + cp.toString(16).padStart(2, '0');
    else if (cp <= 0xffff) out += '\\u' + cp.toString(16).padStart(4, '0');
    else out += '\\U' + cp.toString(16).padStart(8, '0');
  }
  return strBytes(out);
}
function escapeStrDecode(ctx, s, unicode) {
  let out = '';
  let i = 0;
  const simple = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', f: '\f', v: '\v' };
  while (i < s.length) {
    const ch = s[i];
    if (ch !== '\\') { out += ch; i++; continue; }
    const e = s[i + 1];
    if (e === undefined) { out += '\\'; i++; continue; }
    if (unicode && e === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16)); i += 6; continue; }
    if (unicode && e === 'U' && /^[0-9a-fA-F]{8}$/.test(s.slice(i + 2, i + 10))) { out += String.fromCodePoint(parseInt(s.slice(i + 2, i + 10), 16)); i += 10; continue; }
    if (unicode && e === 'N') { return 'unverified'; }
    if (e === 'x' && /^[0-9a-fA-F]{2}$/.test(s.slice(i + 2, i + 4))) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 4), 16)); i += 4; continue; }
    if (e >= '0' && e <= '7') {
      let j = i + 1, val = 0, cnt = 0;
      while (cnt < 3 && s[j] >= '0' && s[j] <= '7') { val = val * 8 + (s[j].charCodeAt(0) - 48); j++; cnt++; }
      out += String.fromCharCode(val & 255); i = j; continue;
    }
    if (e in simple) { out += simple[e]; i += 2; continue; }
    out += '\\' + e; i += 2; continue;
  }
  return out;
}
function rot13Str(s) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(base + ((c.charCodeAt(0) - base + 13) % 26));
  });
}

/* ---- コーデック定義 ---- */
/* encode(ctx, value, errors) -> bytes配列 | 'unverified' | null(エラー送出済み)
* decode(ctx, arr, errors, final) -> {str, rest} | 'unverified' | null */
const BOM_UTF8 = [0xef, 0xbb, 0xbf];
const CODEC_DEFS = {
  'utf-8': {
    encode: (ctx, s, e) => utf8EncodeC(ctx, s, e),
    decode: (ctx, a, e, f) => utf8DecodeC(ctx, a, e, f),
  },
  'utf-8-sig': {
    encode: (ctx, s, e) => { const r = utf8EncodeC(ctx, s, e, 'utf-8-sig'); return r === null || r === 'unverified' ? r : [...BOM_UTF8, ...r]; },
    decode: (ctx, a, e, f) => {
      const t = a.length >= 3 && a[0] === 0xef && a[1] === 0xbb && a[2] === 0xbf ? a.slice(3) : a;
      return utf8DecodeC(ctx, t, e, f, 'utf-8-sig');
    },
  },
  'utf-16-le': { encode: (ctx, s, e) => utf16EncodeC(ctx, s, e, 'le', 'utf-16-le'), decode: (ctx, a, e, f) => utf16DecodeC(ctx, a, e, 'le', 'utf-16-le', f) },
  'utf-16-be': { encode: (ctx, s, e) => utf16EncodeC(ctx, s, e, 'be', 'utf-16-be'), decode: (ctx, a, e, f) => utf16DecodeC(ctx, a, e, 'be', 'utf-16-be', f) },
  'utf-16': {
    encode: (ctx, s, e) => { const r = utf16EncodeC(ctx, s, e, 'le', 'utf-16'); return r === null || r === 'unverified' ? r : [0xff, 0xfe, ...r]; },
    decode: (ctx, a, e, f) => {
      if (a.length >= 2 && a[0] === 0xff && a[1] === 0xfe) return utf16DecodeC(ctx, a.slice(2), e, 'le', 'utf-16', f);
      if (a.length >= 2 && a[0] === 0xfe && a[1] === 0xff) return utf16DecodeC(ctx, a.slice(2), e, 'be', 'utf-16', f);
      return utf16DecodeC(ctx, a, e, 'le', 'utf-16', f);
    },
  },
  'utf-32-le': { encode: (ctx, s, e) => utf32EncodeC(ctx, s, e, 'le', 'utf-32-le'), decode: (ctx, a, e, f) => utf32DecodeC(ctx, a, e, 'le', 'utf-32-le', f) },
  'utf-32-be': { encode: (ctx, s, e) => utf32EncodeC(ctx, s, e, 'be', 'utf-32-be'), decode: (ctx, a, e, f) => utf32DecodeC(ctx, a, e, 'be', 'utf-32-be', f) },
  'utf-32': {
    encode: (ctx, s, e) => { const r = utf32EncodeC(ctx, s, e, 'le', 'utf-32'); return r === null || r === 'unverified' ? r : [0xff, 0xfe, 0, 0, ...r]; },
    decode: (ctx, a, e, f) => {
      if (a.length >= 4 && a[0] === 0xff && a[1] === 0xfe && a[2] === 0 && a[3] === 0) return utf32DecodeC(ctx, a.slice(4), e, 'le', 'utf-32', f);
      if (a.length >= 4 && a[0] === 0 && a[1] === 0 && a[2] === 0xfe && a[3] === 0xff) return utf32DecodeC(ctx, a.slice(4), e, 'be', 'utf-32', f);
      if (a.length >= 2 && a[0] === 0xff && a[1] === 0xfe) return utf32DecodeC(ctx, a.slice(2), e, 'le', 'utf-32', f);
      return utf32DecodeC(ctx, a, e, 'le', 'utf-32', f);
    },
  },
  'ascii': {
    encode: (ctx, s, e) => asciiLatinEncodeC(ctx, s, e, 'ascii', 0x7f, null),
    decode: (ctx, a, e) => asciiLatinDecodeC(ctx, a, e, 'ascii', 0x7f, null),
  },
  'iso8859-1': {
    encode: (ctx, s, e) => asciiLatinEncodeC(ctx, s, e, 'iso8859-1', 0xff, null),
    decode: (ctx, a, e) => asciiLatinDecodeC(ctx, a, e, 'iso8859-1', 0xff, null),
  },
  'cp1252': {
    encode: (ctx, s, e) => asciiLatinEncodeC(ctx, s, e, 'cp1252', 0xff, CP1252),
    decode: (ctx, a, e) => asciiLatinDecodeC(ctx, a, e, 'cp1252', 0xff, CP1252),
  },
  'hex': {
    encode: (ctx, v) => { const a = bytesArr(v); return a === null ? 'bytes-required' : strBytes(hexEncodeArr(a, null, 1)); },
    decode: (ctx, a, e) => { try { return { str: hexDecodeStr(ctx, a.map((b) => String.fromCharCode(b)).join(''), null), rest: null, rawBytes: true }; } catch (err) { throw err; } },
    bytesCodec: true,
  },
  'base64': {
    encode: (ctx, v) => {
      const a = bytesArr(v); if (a === null) return 'bytes-required';
      let out = '';
      for (let i = 0; i < a.length; i += 57) out += b64EncodeArr(a.slice(i, i + 57), B64_ALPHA, true) + '\n';
      return strBytes(out);
    },
    decode: (ctx, a) => {
      const s = a.map((b) => String.fromCharCode(b)).join('').replace(/[^A-Za-z0-9+/=]/g, '');
      const data = s.split('=')[0];
      const out = [];
      let acc = 0, bits = 0;
      for (const c of data) { acc = (acc << 6) | B64_ALPHA.indexOf(c); bits += 6; if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); } }
      return { str: out, rest: null, rawBytes: true };
    },
    bytesCodec: true,
  },
  'quopri': {
    encode: (ctx, v) => { const a = bytesArr(v); return a === null ? 'bytes-required' : qpEncodeArr(a, {}); },
    decode: (ctx, a) => ({ str: qpDecodeArr(a, false), rest: null, rawBytes: true }),
    bytesCodec: true,
  },
  'uu': {
    encode: (ctx, v) => {
      const a = bytesArr(v); if (a === null) return 'bytes-required';
      let out = 'begin 666 <data>\n';
      for (let i = 0; i < a.length; i += 45) out += uuEncodeArr(ctx, a.slice(i, i + 45), false);
      out += ' \nend\n';
      return strBytes(out);
    },
    decode: (ctx, a) => {
      const s = a.map((b) => String.fromCharCode(b)).join('');
      const lines = s.split('\n');
      const out = [];
      let inData = false;
      for (const line of lines) {
        if (!inData) { if (line.startsWith('begin ')) inData = true; continue; }
        if (line === 'end' || line === ' \n' || line === ' ') break;
        if (line === '`' || line === '') { /* 終端行 */ if (line === '`') break; continue; }
        out.push(...uuDecodeStr(ctx, line + '\n'));
      }
      return { str: out, rest: null, rawBytes: true };
    },
    bytesCodec: true,
  },
  'rot-13': {
    encode: (ctx, s) => rot13Str(s),
    decode: (ctx, a, e, f, rawStr) => ({ str: rot13Str(rawStr), rest: [] }),
    strCodec: true,
  },
  'unicode-escape': {
    encode: (ctx, s) => unicodeEscapeEncode(ctx, s),
    decode: (ctx, a, e) => {
      const s = a.map((b) => String.fromCharCode(b)).join('');
      const r = escapeStrDecode(ctx, s, true);
      return r === 'unverified' ? 'unverified' : { str: r, rest: [] };
    },
  },
  'raw-unicode-escape': {
    encode: (ctx, s) => {
      const out = [];
      for (const ch of s) {
        const cp = ch.codePointAt(0);
        if (cp < 0x100) out.push(cp);
        else if (cp <= 0xffff) { const e = '\\u' + cp.toString(16).padStart(4, '0'); for (const c of e) out.push(c.charCodeAt(0)); }
        else { const e = '\\U' + cp.toString(16).padStart(8, '0'); for (const c of e) out.push(c.charCodeAt(0)); }
      }
      return out;
    },
    decode: (ctx, a, e) => {
      const s = a.map((b) => String.fromCharCode(b)).join('');
      const r = escapeStrDecode(ctx, s, true);
      return r === 'unverified' ? 'unverified' : { str: r, rest: [] };
    },
  },
  'punycode': {
    encode: (ctx, s, e) => punycodeEncode(ctx, s),
    decode: (ctx, a, e) => { const r = punycodeDecode(ctx, a); return r === null ? null : { str: r, rest: [] }; },
  },
};
const ALIASES = {
  utf_8: 'utf-8', utf8: 'utf-8', u8: 'utf-8', utf: 'utf-8', cp_utf8: 'utf-8',
  utf_8_sig: 'utf-8-sig', utf8_sig: 'utf-8-sig',
  utf_16: 'utf-16', utf16: 'utf-16', utf_16_le: 'utf-16-le', utf_16_be: 'utf-16-be',
  utf_32: 'utf-32', utf32: 'utf-32', utf_32_le: 'utf-32-le', utf_32_be: 'utf-32-be',
  ascii: 'ascii', us_ascii: 'ascii', ansi_x3_4_1968: 'ascii', iso646_us: 'ascii',
  latin_1: 'iso8859-1', latin1: 'iso8859-1', iso_8859_1: 'iso8859-1', iso8859: 'iso8859-1', l1: 'iso8859-1', latin: 'iso8859-1', iso_8859: 'iso8859-1', cp819: 'iso8859-1',
  windows_1252: 'cp1252', cp1252: 'cp1252',
  hex_codec: 'hex', hex: 'hex',
  base64_codec: 'base64', base_64: 'base64',
  quopri_codec: 'quopri', quopri: 'quopri', quoted_printable: 'quopri', quotedprintable: 'quopri',
  uu_codec: 'uu', uu: 'uu', uucode: 'uu',
  rot_13: 'rot-13', rot13: 'rot-13',
  unicode_escape: 'unicode-escape', unicodeescape: 'unicode-escape',
  raw_unicode_escape: 'raw-unicode-escape',
  punycode: 'punycode', idna: 'idna',
};
const UNVERIFIED_CODECS = new Set(['shift_jis', 'cp932', 'euc_jp', 'euc_kr', 'iso2022_jp', 'iso2022_kr', 'gb2312', 'gbk', 'big5', 'cp949', 'utf-7', 'idna', 'zlib', 'bz2', 'iso8859-2', 'iso8859-15', 'cp437', 'cp850', 'mac_roman', 'koi8_r', 'cp1251', 'utf-7']);
const UNVERIFIED_ALIASES = {
  shift_jis: 'shift_jis', sjis: 'shift_jis', s_jis: 'shift_jis', cp932: 'cp932', ms932: 'cp932', euc_jp: 'euc_jp', euc_kr: 'euc_kr',
  iso2022_jp: 'iso2022_jp', iso2022_kr: 'iso2022_kr', gb2312: 'gb2312', gbk: 'gbk', big5: 'big5', cp949: 'cp949',
  utf_7: 'utf-7', zlib_codec: 'zlib', bz2_codec: 'bz2', iso8859_2: 'iso8859-2', latin_2: 'iso8859-2', cp1251: 'cp1251', windows_1251: 'cp1251', koi8_r: 'koi8_r',
};
function normalizeName(name) {
  return String(name).toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
}
export function lookupCodec(ctx, name) {
  if (typeof name !== 'string') { ctx.err('TypeError', 'encoding name must be a string', ''); return null; }
  const norm = normalizeName(name);
  if (ALIASES[norm]) return { name: ALIASES[norm], def: CODEC_DEFS[ALIASES[norm]] };
  if (CODEC_DEFS[norm]) return { name: norm, def: CODEC_DEFS[norm] };
  if (UNVERIFIED_ALIASES[norm]) return { name: UNVERIFIED_ALIASES[norm], def: null };
  if (UNVERIFIED_CODECS.has(name.toLowerCase())) return { name: name.toLowerCase(), def: null };
  // 登録済み検索関数（codecs.register）に問い合わせる
  for (const fn of searchFunctions) {
    const r = ctx.call(fn, [name]);
    if (r && r.__native === INFO_Q) return { name: r.data.name, def: r.data.def, info: r };
    if (!ctx.isNone(r) && !ctx.isUnk(r)) { /* CodecInfo でない返値は無視 */ }
  }
  ctx.err('LookupError', 'unknown encoding: ' + name, '');
  return null;
}
const searchFunctions = [];
const errorHandlers = new Map();
const BUILTIN_ERROR_HANDLERS = ['strict', 'ignore', 'replace', 'surrogateescape', 'xmlcharrefreplace', 'backslashreplace', 'namereplace', 'surrogatepass'];

/* ---- CodecInfo / 呼び出し可能オブジェクト ---- */
const INFO_Q = 'codecs.CodecInfo';
const CALLABLE_Q = 'codecs.callable';
registerStdlibClass(CALLABLE_Q, {
  typeName: 'builtin_function_or_method',
  call: (ctx, self, args, kwargs) => self.data.fn(ctx, args, kwargs),
  repr: (ctx, self) => '<built-in function ' + self.data.label + '>',
});
function makeCallable(label, fn) {
  return { __native: CALLABLE_Q, mod: 'codecs', data: { label, fn } };
}
function makeInfo(name, def) {
  return { __native: INFO_Q, mod: 'codecs', data: { name, def } };
}
function codecEncode(ctx, info, value, errors) {
  const { name, def } = info.data;
  if (!def) { ctx.diag('codecs: ' + name + ' のエンコードは未検証のため結果を確定しません'); return null; }
  if (def.bytesCodec) {
    const a = bytesArr(value);
    if (a === null) { if (ctx.isUnk(value)) return null; ctx.err('TypeError', 'a bytes-like object is required, not ' + ctx.typeName(value), ''); return null; }
    const r = def.encode(ctx, value, errors);
    if (r === 'bytes-required') { ctx.err('TypeError', 'a bytes-like object is required', ''); return null; }
    return r;
  }
  if (typeof value !== 'string') {
    if (ctx.isUnk(value)) return null;
    ctx.err('TypeError', 'encoding without a string argument', '');
    return null;
  }
  const r = def.encode(ctx, value, errors);
  return r;
}
function codecDecode(ctx, info, value, errors, final = true) {
  const { name, def } = info.data;
  if (!def) { ctx.diag('codecs: ' + name + ' のデコードは未検証のため結果を確定しません'); return null; }
  if (def.strCodec) {
    if (typeof value !== 'string') { if (ctx.isUnk(value)) return null; ctx.err('TypeError', 'decoding without a string argument', ''); return null; }
    return def.decode(ctx, null, errors, final, value);
  }
  const a = bytesArr(value);
  if (a === null) {
    if (ctx.isUnk(value)) return null;
    ctx.err('TypeError', 'a bytes-like object is required, not ' + ctx.typeName(value), '');
    return null;
  }
  const r = def.decode(ctx, a, errors, final);
  return r;
}
const INFO_DEF = {
  typeName: 'CodecInfo',
  repr: (ctx, self) => "<codecs.CodecInfo '" + self.data.name + "'>",
  attrs: {
    name: (ctx, self) => self.data.name,
    encode: (ctx, self) => makeCallable('encode', (c2, args) => {
      const errors = typeof args[1] === 'string' ? args[1] : 'strict';
      const r = codecEncode(c2, self, args[0], errors);
      if (r === null || r === 'unverified') return unkRet(c2, 'codecs のエンコード');
      if (typeof r === 'string') return TUPLE([r, I([...args[0]].length)]);
      return TUPLE([makeBytesVal(r), I(typeof args[0] === 'string' ? [...args[0]].length : r.length)]);
    }),
    decode: (ctx, self) => makeCallable('decode', (c2, args) => {
      const errors = typeof args[1] === 'string' ? args[1] : 'strict';
      const r = codecDecode(c2, self, args[0], errors);
      if (r === null || r === 'unverified') return unkRet(c2, 'codecs のデコード');
      if (r.rawBytes) return TUPLE([makeBytesVal(r.str), I(bytesArr(args[0]).length)]);
      return TUPLE([r.str, I(bytesArr(args[0]) ? bytesArr(args[0]).length : [...args[0]].length)]);
    }),
    incrementalencoder: (ctx, self) => makeCallable('incrementalencoder', (c2, args) => {
      const errors = typeof args[0] === 'string' ? args[0] : 'strict';
      return { __native: INC_ENC_Q, mod: 'codecs', data: { info: self, errors, buffer: [] } };
    }),
    incrementaldecoder: (ctx, self) => makeCallable('incrementaldecoder', (c2, args) => {
      const errors = typeof args[0] === 'string' ? args[0] : 'strict';
      return { __native: INC_DEC_Q, mod: 'codecs', data: { info: self, errors, buffer: [] } };
    }),
    streamreader: (ctx, self) => makeCallable('streamreader', (c2) => { c2.err('未対応', 'codecs の StreamReader はストリームを前提とするため未対応です', ''); return UNK(''); }),
    streamwriter: (ctx, self) => makeCallable('streamwriter', (c2) => { c2.err('未対応', 'codecs の StreamWriter はストリームを前提とするため未対応です', ''); return UNK(''); }),
  },
};
const INC_ENC_Q = 'codecs.IncrementalEncoder';
const INC_DEC_Q = 'codecs.IncrementalDecoder';
const INC_ENC_DEF = {
  typeName: 'IncrementalEncoder',
  construct: (ctx, args, kwargs) => {
    const errors = typeof args[0] === 'string' ? args[0] : (typeof kwargs.errors === 'string' ? kwargs.errors : 'strict');
    return { __native: INC_ENC_Q, mod: 'codecs', data: { info: null, errors, buffer: [] } };
  },
  repr: () => '<codecs.IncrementalEncoder object>',
  methods: {
    encode: (ctx, self, args, kwargs) => {
      if (!self.data.info) { ctx.err('NotImplementedError', 'encode is not implemented by the base IncrementalEncoder', ''); return UNK(''); }
      const errors = self.data.errors;
      const r = codecEncode(ctx, self.data.info, args[0], errors);
      if (r === null || r === 'unverified') return unkRet(ctx, 'incremental encode');
      if (typeof r === 'string') return r;
      return makeBytesVal(r);
    },
    getstate: (ctx, self) => I(0),
    setstate: (ctx, self) => NONE,
    reset: (ctx, self) => { self.data.buffer = []; return NONE; },
  },
};
const INC_DEC_DEF = {
  typeName: 'IncrementalDecoder',
  construct: (ctx, args, kwargs) => {
    const errors = typeof args[0] === 'string' ? args[0] : (typeof kwargs.errors === 'string' ? kwargs.errors : 'strict');
    return { __native: INC_DEC_Q, mod: 'codecs', data: { info: null, errors, buffer: [] } };
  },
  repr: () => '<codecs.IncrementalDecoder object>',
  methods: {
    decode: (ctx, self, args, kwargs) => {
      if (!self.data.info) { ctx.err('NotImplementedError', 'decode is not implemented by the base IncrementalDecoder', ''); return UNK(''); }
      const a = bytesArr(args[0]);
      if (a === null) return unkRet(ctx, 'incremental decode の入力');
      const final = kwBool(ctx, kwargs, 'final', args[1], false);
      const joined = [...self.data.buffer, ...a];
      const r = codecDecode(ctx, self.data.info, makeBytesVal(joined), self.data.errors, final);
      if (r === null || r === 'unverified') return unkRet(ctx, 'incremental decode');
      if (r.rawBytes) { self.data.buffer = []; return makeBytesVal(r.str); }
      self.data.buffer = r.rest || [];
      return r.str;
    },
    getstate: (ctx, self) => TUPLE([makeBytesVal(self.data.buffer || []), I(0)]),
    setstate: (ctx, self, args) => {
      const st = args[0];
      if (ctx.isTuple(st) && st.__tuple.length >= 1) {
        const b = bytesArr(st.__tuple[0]);
        if (b !== null) self.data.buffer = b;
      }
      return NONE;
    },
    reset: (ctx, self) => { self.data.buffer = []; return NONE; },
  },
};
const CODEC_BASE_DEF = {
  typeName: 'Codec',
  construct: (ctx, args, kwargs) => ({ __native: 'codecs.Codec', mod: 'codecs', data: {} }),
  methods: {
    encode: (ctx, self, args) => { ctx.err('NotImplementedError', 'encode is not implemented by the base Codec', ''); return UNK(''); },
    decode: (ctx, self, args) => { ctx.err('NotImplementedError', 'decode is not implemented by the base Codec', ''); return UNK(''); },
  },
};
function streamClassDef(name) {
  return {
    typeName: name,
    construct: (ctx) => { ctx.err('未対応', 'codecs.' + name + ' はストリーム（ファイルオブジェクト）を前提とするため未対応です', ''); return UNK(''); },
  };
}
function errorsArg(args, kwargs, idx = 1) {
  if (kwargs && typeof kwargs.errors === 'string') return kwargs.errors;
  return args && typeof args[idx] === 'string' ? args[idx] : 'strict';
}
function makeErrorCallable(name) {
  return makeCallable(name, (ctx, args) => {
    ctx.diag('codecs.' + name + '：例外オブジェクトの属性（object/start/end）を値モデルで表せないため未検証です');
    return ctx.unk(name + ' の結果（未検証）');
  });
}

registerStdlibModule('codecs', {
  data: {
    BOM: makeBytesVal([0xff, 0xfe]),
    BOM_LE: makeBytesVal([0xff, 0xfe]),
    BOM_BE: makeBytesVal([0xfe, 0xff]),
    BOM_UTF8: makeBytesVal(BOM_UTF8),
    BOM_UTF16: makeBytesVal([0xff, 0xfe]),
    BOM_UTF16_LE: makeBytesVal([0xff, 0xfe]),
    BOM_UTF16_BE: makeBytesVal([0xfe, 0xff]),
    BOM_UTF32: makeBytesVal([0xff, 0xfe, 0, 0]),
    BOM_UTF32_LE: makeBytesVal([0xff, 0xfe, 0, 0]),
    BOM_UTF32_BE: makeBytesVal([0, 0, 0xfe, 0xff]),
  },
  functions: {
    lookup: (ctx, args, kwargs) => {
      const r = lookupCodec(ctx, args[0]);
      if (r === null) return UNK('');
      if (r.info) return r.info;
      return makeInfo(r.name, r.def || null);
    },
    encode: (ctx, args, kwargs) => {
      const encName = typeof args[1] === 'string' ? args[1] : (typeof kwargs.encoding === 'string' ? kwargs.encoding : 'utf-8');
      const errors = errorsArg(args, kwargs, 2);
      const lk = lookupCodec(ctx, encName);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      const r = codecEncode(ctx, info, args[0], errors);
      if (r === null || r === 'unverified') return unkRet(ctx, 'codecs.encode');
      // 高度A7班是正: モジュールレベルの codecs.encode は裸の値を返す
      // （CPython 3.12.3 実走＋docstring で確定）。tuple を返すのは
      // CodecInfo.encode／decode メソッドだけであり、従来は両者を
      // 混同して tuple を返していた。
      if (typeof r === 'string') return r;
      return makeBytesVal(r);
    },
    decode: (ctx, args, kwargs) => {
      const encName = typeof args[1] === 'string' ? args[1] : (typeof kwargs.encoding === 'string' ? kwargs.encoding : 'utf-8');
      const errors = errorsArg(args, kwargs, 2);
      const lk = lookupCodec(ctx, encName);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      const r = codecDecode(ctx, info, args[0], errors);
      if (r === null || r === 'unverified') return unkRet(ctx, 'codecs.decode');
      // 高度A7班是正: codecs.encode と同じく裸の値を返す。
      if (r.rawBytes) return makeBytesVal(r.str);
      return r.str;
    },
    getencoder: (ctx, args) => {
      const lk = lookupCodec(ctx, args[0]);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      return INFO_DEF.attrs.encode(ctx, info);
    },
    getdecoder: (ctx, args) => {
      const lk = lookupCodec(ctx, args[0]);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      return INFO_DEF.attrs.decode(ctx, info);
    },
    getincrementalencoder: (ctx, args) => {
      const lk = lookupCodec(ctx, args[0]);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      return INFO_DEF.attrs.incrementalencoder(ctx, info);
    },
    getincrementaldecoder: (ctx, args) => {
      const lk = lookupCodec(ctx, args[0]);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      return INFO_DEF.attrs.incrementaldecoder(ctx, info);
    },
    getreader: (ctx, args) => {
      const lk = lookupCodec(ctx, args[0]);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      return INFO_DEF.attrs.streamreader(ctx, info);
    },
    getwriter: (ctx, args) => {
      const lk = lookupCodec(ctx, args[0]);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      return INFO_DEF.attrs.streamwriter(ctx, info);
    },
    iterencode: (ctx, args, kwargs) => {
      const encName = typeof args[1] === 'string' ? args[1] : 'utf-8';
      const errors = errorsArg(args, kwargs, 2);
      const lk = lookupCodec(ctx, encName);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      const items = ctx.iterable(args[0]);
      if (items === null) return unkRet(ctx, 'iterencode の入力');
      const out = [];
      for (const it of items) {
        const r = codecEncode(ctx, info, it, errors);
        if (r === null || r === 'unverified') return unkRet(ctx, 'iterencode');
        out.push(typeof r === 'string' ? r : makeBytesVal(r));
      }
      return ITER(out, 'list_iterator');
    },
    iterdecode: (ctx, args, kwargs) => {
      const encName = typeof args[1] === 'string' ? args[1] : 'utf-8';
      const errors = errorsArg(args, kwargs, 2);
      const lk = lookupCodec(ctx, encName);
      if (lk === null) return UNK('');
      const info = lk.info || makeInfo(lk.name, lk.def || null);
      const items = ctx.iterable(args[0]);
      if (items === null) return unkRet(ctx, 'iterdecode の入力');
      const decVal = { __native: INC_DEC_Q, mod: 'codecs', data: { info, errors, buffer: [] } };
      const out = [];
      for (const it of items) {
        const r = INC_DEC_DEF.methods.decode(ctx, decVal, [it, BOOL(false)], {});
        if (ctx.isUnk(r)) return unkRet(ctx, 'iterdecode');
        out.push(r);
      }
      const tail = INC_DEC_DEF.methods.decode(ctx, decVal, [makeBytesVal([]), BOOL(true)], {});
      if (!ctx.isUnk(tail) && tail !== '') out.push(tail);
      return ITER(out, 'list_iterator');
    },
    lookup_error: (ctx, args) => {
      const name = args[0];
      if (typeof name === 'string' && (BUILTIN_ERROR_HANDLERS.includes(name) || errorHandlers.has(name))) {
        return makeErrorCallable(name);
      }
      ctx.err('LookupError', 'unknown error handler name: ' + String(name), '');
      return UNK('');
    },
    register_error: (ctx, args) => {
      if (typeof args[0] === 'string') errorHandlers.set(args[0], args[1]);
      return NONE;
    },
    register: (ctx, args) => {
      if (args[0] && (ctx.isFunc(args[0]) || args[0].__native === CALLABLE_Q)) searchFunctions.push(args[0]);
      return NONE;
    },
    unregister: (ctx, args) => {
      const i = searchFunctions.indexOf(args[0]);
      if (i < 0) { ctx.err('ValueError', 'search function is not registered', ''); return UNK(''); }
      searchFunctions.splice(i, 1);
      return NONE;
    },
    charmap_build: (ctx, args) => {
      const s = args[0];
      if (typeof s !== 'string') { if (ctx.isUnk(s)) return unkRet(ctx, 'charmap_build の引数'); ctx.err('TypeError', 'charmap_build() argument must be a string', ''); return UNK(''); }
      const entries = [];
      [...s].forEach((ch, idx) => entries.push([I(ch.codePointAt(0)), I(idx)]));
      // 重複キーは後の値で上書き（dict 構築と同じ）
      return makeDictFrom(entries);
    },
    escape_encode: (ctx, args) => {
      const a = bytesArr(args[0]);
      if (a === null) return unkRet(ctx, 'escape_encode の入力');
      return TUPLE([makeBytesVal(escapeEncodeArr(a)), I(a.length)]);
    },
    escape_decode: (ctx, args) => {
      let a = bytesArr(args[0]);
      if (a === null && typeof args[0] === 'string') a = strBytes(args[0]);
      if (a === null) return unkRet(ctx, 'escape_decode の入力');
      return TUPLE([makeBytesVal(escapeDecodeArr(a)), I(a.length)]);
    },
    readbuffer_encode: unverifiedFn('codecs.readbuffer_encode', '内部表現への変換で意味論を確定できない'),
    strict_errors: makeErrorCallable('strict_errors'),
    ignore_errors: makeErrorCallable('ignore_errors'),
    replace_errors: makeErrorCallable('replace_errors'),
    backslashreplace_errors: makeErrorCallable('backslashreplace_errors'),
    xmlcharrefreplace_errors: makeErrorCallable('xmlcharrefreplace_errors'),
    namereplace_errors: makeErrorCallable('namereplace_errors'),
    open: unsupportedFn('codecs.open', 'ファイルを前提とするため'),
    EncodedFile: unsupportedFn('codecs.EncodedFile', 'ストリームを前提とするため'),
  },
  classes: {
    CodecInfo: INFO_DEF,
    Codec: CODEC_BASE_DEF,
    IncrementalEncoder: INC_ENC_DEF,
    IncrementalDecoder: INC_DEC_DEF,
    StreamReader: streamClassDef('StreamReader'),
    StreamWriter: streamClassDef('StreamWriter'),
    StreamReaderWriter: streamClassDef('StreamReaderWriter'),
    StreamRecoder: streamClassDef('StreamRecoder'),
  },
});
export {};
