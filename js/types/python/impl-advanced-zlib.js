/* 高度モード B7 G11：zlib モジュール（41件）。
 * 一次情報：公式ドキュメント 3.15（library/zlib）と CPython 3.12.3 実走。
 *
 * 裁定の要点：チェックサム（crc32／adler32）と圧縮・展開は bytes を
 * 入出力とし、エンジンに bytes の値表現が無いため未検証（アルゴリズム
 * 自体は純粋関数だが、引数の bytes リテラルが UNK として届き実値で
 * 照合できない）。ただし str 等を渡したときの TypeError は CPython
 * どおりに再現する。整数定数（20件）と zlib.error は対応。
 * ZLIB_VERSION 等の版文字列はリンクされる zlib の版に依存し未検証。
 * crc32_combine／adler32_combine は 3.14 で追加された関数で、
 * ローカル 3.12.3 には存在しない（実走で確認）ことも未検証の理由。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { UNK, I, unverifiedFn, excDef } from './impl-advanced-g11-common.js';

function bytesFunc(label, reason) {
  return (ctx, args, kwargs) => {
    const v = args[0];
    if (typeof v === 'string') ctx.err('TypeError', "a bytes-like object is required, not 'str'", '');
    if (v && !ctx.isUnk(v) && (ctx.isNum(v) || ctx.isBool(v) || ctx.isList(v) || ctx.isDict(v) || ctx.isNone(v))) {
      ctx.err('TypeError', "a bytes-like object is required, not '" + ctx.typeName(v) + "'", '');
    }
    ctx.diag('未検証：' + label + ' は' + reason + 'ため、この説明では値を確定できません');
    return ctx.unk(label + '（未検証）');
  };
}
const BYTES_REASON = 'bytes を入出力とし、エンジンに bytes の値表現が無い';

registerStdlibModule('zlib', {
  data: {
    DEFLATED: I(8), DEF_BUF_SIZE: I(16384), DEF_MEM_LEVEL: I(8), MAX_WBITS: I(15),
    Z_NO_COMPRESSION: I(0), Z_BEST_SPEED: I(1), Z_BEST_COMPRESSION: I(9),
    Z_DEFAULT_COMPRESSION: I(-1), Z_FILTERED: I(1), Z_HUFFMAN_ONLY: I(2), Z_RLE: I(3),
    Z_FIXED: I(4), Z_DEFAULT_STRATEGY: I(0), Z_NO_FLUSH: I(0), Z_PARTIAL_FLUSH: I(1),
    Z_SYNC_FLUSH: I(2), Z_FULL_FLUSH: I(3), Z_BLOCK: I(5), Z_TREES: I(6), Z_FINISH: I(4),
    ZLIB_VERSION: UNK('zlib のバージョン文字列'),
    ZLIB_RUNTIME_VERSION: UNK('zlib のバージョン文字列'),
    ZLIBNG_VERSION: UNK('zlib-ng のバージョン文字列'),
  },
  functions: {
    crc32: bytesFunc('zlib.crc32()', BYTES_REASON),
    adler32: bytesFunc('zlib.adler32()', BYTES_REASON),
    crc32_combine: bytesFunc('zlib.crc32_combine()', BYTES_REASON + '。また 3.14 で追加された関数でローカルの CPython 3.12 では実走照合できない'),
    adler32_combine: bytesFunc('zlib.adler32_combine()', BYTES_REASON + '。また 3.14 で追加された関数でローカルの CPython 3.12 では実走照合できない'),
    compress: bytesFunc('zlib.compress()', BYTES_REASON),
    decompress: bytesFunc('zlib.decompress()', BYTES_REASON),
    compressobj: unverifiedFn('zlib.compressobj()', BYTES_REASON),
    decompressobj: unverifiedFn('zlib.decompressobj()', BYTES_REASON),
  },
  classes: {
    error: excDef('error', 'zlib.error', ['Exception']),
  },
});
