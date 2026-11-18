/* 高度モード B7 G7: quopri モジュール。
* encodestring/decodestring は binascii の QP コアと同一意味論（CPython 実走で照合済み）。
* encode/decode はストリーム（ファイルオブジェクト）前提のため未対応。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { makeBytesVal, bytesArr, unkRet, unsupportedFn } from './impl-advanced-g7-common.js';
import { qpEncodeArr, qpDecodeArr } from './impl-advanced-binascii.js';

const strBytes = (s) => [...s].map((c) => c.charCodeAt(0));

function dataBytes(ctx, v, fname) {
  const a = bytesArr(v);
  if (a !== null) return a;
  if (typeof v === 'string') return strBytes(v);
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'argument should be a bytes-like object, not ' + ctx.typeName(v), '');
  return null;
}

registerStdlibModule('quopri', {
  functions: {
    encodestring: (ctx, args, kwargs) => {
      const a = dataBytes(ctx, args[0], 'quopri.encodestring'); if (a === null) return unkRet(ctx, 'quopri.encodestring の入力');
      const kw = (name, idx, def) => (name in kwargs ? !!ctx.truthy(kwargs[name]) : (args.length > idx ? !!ctx.truthy(args[idx]) : def));
      return makeBytesVal(qpEncodeArr(a, {
        quotetabs: kw('quotetabs', 1, false),
        istext: kw('istext', 2, true),
        header: kw('header', 3, false),
      }));
    },
    decodestring: (ctx, args, kwargs) => {
      const a = dataBytes(ctx, args[0], 'quopri.decodestring'); if (a === null) return unkRet(ctx, 'quopri.decodestring の入力');
      const header = 'header' in kwargs ? !!ctx.truthy(kwargs.header) : (args.length > 1 ? !!ctx.truthy(args[1]) : false);
      return makeBytesVal(qpDecodeArr(a, header));
    },
    encode: unsupportedFn('quopri.encode', '入力・出力ストリーム（ファイルオブジェクト）を前提とするため'),
    decode: unsupportedFn('quopri.decode', '入力・出力ストリーム（ファイルオブジェクト）を前提とするため'),
  },
});
export {};
