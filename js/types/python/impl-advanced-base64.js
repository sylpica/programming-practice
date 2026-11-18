/* 高度モード B7 G7: base64 モジュール。
* 意味論は CPython 3.12.3 実走で照合（z85 系のみ 3.15 で追加された関数のため
* Z85 仕様のテストベクタで照合）。エンコード系は bytes を返し、デコード系は
* str（ASCII のみ）/bytes の両方を受ける。生成→消費の連鎖は g7.bytes で実値検証できる。
* encode/decode はストリーム（ファイルオブジェクト）前提のため未対応。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  I, UNK, makeBytesVal, bytesArr, unkRet, onlyKw, kwVal, kwBool, unsupportedFn,
} from './impl-advanced-g7-common.js';
import {
  B64_ALPHA, B64_URLSAFE_ALPHA, B32_ALPHA, B32HEX_ALPHA, B85_ALPHA, Z85_ALPHA,
  b64EncodeArr, b32EncodeArr, b32DecodeStr, b85EncodeArr, b85DecodeStr,
  a85EncodeArr, a85DecodeStr, hexEncodeArr, hexDecodeStr, errB,
} from './impl-advanced-binascii.js';

const strBytes = (s) => [...s].map((c) => c.charCodeAt(0));

function dataBytes(ctx, v, fname) {
  const a = bytesArr(v);
  if (a !== null) return a;
  if (typeof v === 'string') return strBytes(v);
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'argument should be a bytes-like object, not ' + ctx.typeName(v), '');
  return null;
}
function dataAscii(ctx, v, fname) {
  if (typeof v === 'string') {
    if (/[^\x00-\x7f]/.test(v)) ctx.err('ValueError', 'string argument should contain only ASCII characters', '');
    return v;
  }
  const a = bytesArr(v);
  if (a !== null) return a.map((b) => String.fromCharCode(b)).join('');
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'argument should be a bytes-like object or ASCII string, not ' + ctx.typeName(v), '');
  return null;
}
function altcharsArg(ctx, v, len, fname) {
  if (v === undefined || v === null || ctx.isNone(v)) return null;
  const a = dataBytes(ctx, v, fname);
  if (a === null) return null;
  if (a.length !== len) ctx.err('TypeError', 'altchars should be a byte string of length ' + len, '');
  return a.map((b) => String.fromCharCode(b)).join('');
}

/* base64 モジュール経由の b64 デコード（CPython Lib/base64.py + binascii の意味論） */
function b64DecodeModule(ctx, s, alphabet, validate) {
  let t = s;
  if (validate) {
    for (const c of t) if (!alphabet.includes(c) && c !== '=') errB(ctx, 'Only base64 data is allowed');
    const fp = t.indexOf('=');
    if (fp >= 0 && /[^=]/.test(t.slice(fp))) errB(ctx, 'Discontinuous padding not allowed');
  } else {
    t = [...t].filter((c) => alphabet.includes(c) || c === '=').join('');
  }
  const fp = t.indexOf('=');
  const data = fp >= 0 ? t.slice(0, fp) : t;
  const tail = fp >= 0 ? t.slice(fp) : '';
  if (data.length % 4 === 1) {
    errB(ctx, 'Invalid base64-encoded string: number of data characters (' + data.length + ') cannot be 1 more than a multiple of 4');
  }
  const need = (4 - (data.length % 4)) % 4;
  let pads = 0;
  while (pads < tail.length && tail[pads] === '=') pads++;
  if (pads < need) errB(ctx, 'Incorrect padding');
  const out = [];
  let acc = 0, accBits = 0;
  for (const c of data) {
    acc = (acc << 6) | alphabet.indexOf(c); accBits += 6;
    if (accBits >= 8) { accBits -= 8; out.push((acc >> accBits) & 255); }
  }
  return out;
}

function encFn(alphabet, fname) {
  return (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, [], fname);
    const a = dataBytes(ctx, args[0], fname); if (a === null) return unkRet(ctx, fname + ' の入力');
    let alpha = alphabet;
    const alt = altcharsArg(ctx, kwVal(kwargs, 'altchars', args[1]), 2, fname);
    if (alt) alpha = alphabet.slice(0, 62) + alt;
    return makeBytesVal(strBytes(b64EncodeArr(a, alpha, true)));
  };
}
function decFn(alphabet, fname) {
  return (ctx, args, kwargs) => {
    const s = dataAscii(ctx, args[0], fname); if (s === null) return unkRet(ctx, fname + ' の入力');
    let alpha = alphabet;
    const alt = altcharsArg(ctx, kwVal(kwargs, 'altchars', args[1]), 2, fname);
    if (alt) alpha = alphabet.slice(0, 62) + alt;
    const validate = kwBool(ctx, kwargs, 'validate', args[2]);
    return makeBytesVal(b64DecodeModule(ctx, s, alpha, validate));
  };
}
function b32EncFn(alphabet, fname) {
  return (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, [], fname);
    const a = dataBytes(ctx, args[0], fname); if (a === null) return unkRet(ctx, fname + ' の入力');
    return makeBytesVal(strBytes(b32EncodeArr(a, alphabet, true)));
  };
}
function b32DecFn(alphabet, fname) {
  return (ctx, args, kwargs) => {
    let s = dataAscii(ctx, args[0], fname); if (s === null) return unkRet(ctx, fname + ' の入力');
    const casefold = kwBool(ctx, kwargs, 'casefold', args[1]);
    const map01 = kwVal(kwargs, 'map01', args[2]);
    if (map01 !== undefined && map01 !== null && !ctx.isNone(map01)) {
      const m = dataBytes(ctx, map01, fname); if (m === null) return unkRet(ctx, fname + ' の map01');
      const mc = String.fromCharCode(m[0]);
      s = s.replace(/0/g, mc).replace(/1/g, 'L');
    }
    if (casefold) s = s.toUpperCase();
    return makeBytesVal(b32DecodeStr(ctx, s, alphabet, {}));
  };
}

registerStdlibModule('base64', {
  functions: {
    b64encode: encFn(B64_ALPHA, 'base64.b64encode'),
    standard_b64encode: encFn(B64_ALPHA, 'base64.standard_b64encode'),
    urlsafe_b64encode: encFn(B64_URLSAFE_ALPHA, 'base64.urlsafe_b64encode'),
    b64decode: decFn(B64_ALPHA, 'base64.b64decode'),
    standard_b64decode: decFn(B64_ALPHA, 'base64.standard_b64decode'),
    urlsafe_b64decode: decFn(B64_URLSAFE_ALPHA, 'base64.urlsafe_b64decode'),
    b32encode: b32EncFn(B32_ALPHA, 'base64.b32encode'),
    b32hexencode: b32EncFn(B32HEX_ALPHA, 'base64.b32hexencode'),
    b32decode: b32DecFn(B32_ALPHA, 'base64.b32decode'),
    b32hexdecode: b32DecFn(B32HEX_ALPHA, 'base64.b32hexdecode'),
    b16encode: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'base64.b16encode');
      const a = dataBytes(ctx, args[0], 'base64.b16encode'); if (a === null) return unkRet(ctx, 'b16encode の入力');
      return makeBytesVal(strBytes(hexEncodeArr(a, null, 1).toUpperCase()));
    },
    b16decode: (ctx, args, kwargs) => {
      let s = dataAscii(ctx, args[0], 'base64.b16decode'); if (s === null) return unkRet(ctx, 'b16decode の入力');
      const casefold = kwBool(ctx, kwargs, 'casefold', args[1]);
      if (casefold) s = s.toUpperCase();
      if (/[^0-9A-F]/.test(s)) errB(ctx, 'Non-base16 digit found');
      if (s.length % 2 !== 0) errB(ctx, 'Odd-length string');
      return makeBytesVal(hexDecodeStr(ctx, s, null));
    },
    b85encode: (ctx, args, kwargs) => {
      const a = dataBytes(ctx, args[0], 'base64.b85encode'); if (a === null) return unkRet(ctx, 'b85encode の入力');
      const pad = kwBool(ctx, kwargs, 'pad', args[1]);
      return makeBytesVal(strBytes(b85EncodeArr(a, B85_ALPHA, pad)));
    },
    b85decode: (ctx, args, kwargs) => {
      let s = dataAscii(ctx, args[0], 'base64.b85decode'); if (s === null) return unkRet(ctx, 'b85decode の入力');
      if (s.length % 5 === 1) s = s.slice(0, -1); // CPython: 末尾1文字の端数は黙って捨てる
      return makeBytesVal(b85DecodeStr(ctx, s, B85_ALPHA, {}));
    },
    a85encode: (ctx, args, kwargs) => {
      const a = dataBytes(ctx, args[0], 'base64.a85encode'); if (a === null) return unkRet(ctx, 'a85encode の入力');
      const enc = a85EncodeArr(a, {
        foldspaces: kwBool(ctx, kwargs, 'foldspaces', args[1]),
        pad: kwBool(ctx, kwargs, 'pad', args[3]),
        adobe: kwBool(ctx, kwargs, 'adobe', args[4]),
      });
      const wrapcol = kwVal(kwargs, 'wrapcol', args[2]);
      let out = enc;
      const wc = wrapcol === undefined || wrapcol === null || ctx.isNone(wrapcol) ? 0 : ctx.int(wrapcol);
      if (wc === null) return unkRet(ctx, 'wrapcol');
      if (wc > 0) {
        // adobe の <~ ~> は折り返し対象外（CPython 実走どおり、本体のみ折る）
        let body = out, pre = '', post = '';
        if (out.startsWith('<~')) { pre = '<~'; post = '~>'; body = out.slice(2, -2); }
        const lines = [];
        for (let i = 0; i < body.length; i += wc) lines.push(body.slice(i, i + wc));
        out = pre + lines.join('\n') + post;
      }
      return makeBytesVal(strBytes(out));
    },
    a85decode: (ctx, args, kwargs) => {
      let s = dataAscii(ctx, args[0], 'base64.a85decode'); if (s === null) return unkRet(ctx, 'a85decode の入力');
      const ig = kwVal(kwargs, 'ignore_chars', args[3]);
      let ignore = new Set([' ', '\t', '\n', '\r', '\v']);
      if (ig !== undefined && ig !== null && !ctx.isNone(ig)) {
        const ia = dataBytes(ctx, ig, 'base64.a85decode'); if (ia === null) return unkRet(ctx, 'ignore_chars');
        ignore = new Set(ia.map((b) => String.fromCharCode(b)));
      }
      const adobe = kwBool(ctx, kwargs, 'adobe', args[2]);
      // 末尾1文字の端数グループは黙って捨てる（CPython 実走で確認）
      return makeBytesVal(a85DecodeStr(ctx, s, {
        foldspaces: kwBool(ctx, kwargs, 'foldspaces', args[1]),
        adobe, ignore, dropTrailingSingle: true,
      }));
    },
        z85encode: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'base64.z85encode');
      const a = dataBytes(ctx, args[0], 'base64.z85encode'); if (a === null) return unkRet(ctx, 'z85encode の入力');
      if (a.length % 4 !== 0) ctx.err('ValueError', 'Z85 requires the length of the data to be divisible by 4', '');
      return makeBytesVal(strBytes(b85EncodeArr(a, Z85_ALPHA, true)));
    },
    z85decode: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'base64.z85decode');
      const s = dataAscii(ctx, args[0], 'base64.z85decode'); if (s === null) return unkRet(ctx, 'z85decode の入力');
      if (s.length % 5 !== 0) ctx.err('ValueError', 'Z85 requires the length of the encoded data to be divisible by 5', '');
      return makeBytesVal(b85DecodeStr(ctx, s, Z85_ALPHA, {}));
    },
    encodebytes: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'base64.encodebytes');
      const a = dataBytes(ctx, args[0], 'base64.encodebytes'); if (a === null) return unkRet(ctx, 'encodebytes の入力');
      let out = '';
      for (let i = 0; i < a.length; i += 57) out += b64EncodeArr(a.slice(i, i + 57), B64_ALPHA, true) + '\n';
      return makeBytesVal(strBytes(out));
    },
    decodebytes: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'base64.decodebytes');
      const s = dataAscii(ctx, args[0], 'base64.decodebytes'); if (s === null) return unkRet(ctx, 'decodebytes の入力');
      return makeBytesVal(b64DecodeModule(ctx, s, B64_ALPHA, false));
    },
    encode: unsupportedFn('base64.encode', '入力・出力ストリーム（ファイルオブジェクト）を前提とするため'),
    decode: unsupportedFn('base64.decode', '入力・出力ストリーム（ファイルオブジェクト）を前提とするため'),
  },
});
export {};
