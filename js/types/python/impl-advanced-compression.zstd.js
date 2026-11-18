/* 高度モード B7 G11：compression.zstd モジュール（68件）。
 * 一次情報：公式ドキュメント 3.15（library/compression.zstd）。
 * 3.14 で追加されたモジュールのためローカルの CPython 3.12.3 では
 * 実走照合できない。COMPRESSION_LEVEL_DEFAULT=3 はドキュメントに
 * 値が明記されているため対応（math パイロットの 3.15 項目と同じ扱い）。
 * ZstdError は対応付け（Exception のサブクラス）。
 * Strategy の値はドキュメント自身が「zstd のバージョン間で一定では
 * ない」と明記するため未検証。パラメータ系 IntEnum の値と bounds() は
 * リンクされる zstd ライブラリに依存し未検証。圧縮・展開は bytes
 * 入出力で未検証、ZstdFile と open は実ファイル前提で未対応。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { UNK, I, unsupportedFn, unverifiedFn, unsupportedClass, unverifiedClass, excDef } from './impl-advanced-g11-common.js';

const BYTES_REASON = 'bytes を入出力とし、エンジンに bytes の値表現が無い。また 3.14 で追加されたモジュールでローカルの CPython 3.12 では実走照合できない';
const FILE_REASON = '実ファイルを対象とし、エンジンに実ファイルシステムが無い';
const PARAM_REASON = 'IntEnum の数値と bounds() の範囲がリンクされる zstd ライブラリの版に依存し、ドキュメントにも数値が明記されていない';

registerStdlibModule('compression.zstd', {
  data: {
    COMPRESSION_LEVEL_DEFAULT: I(3),
    zstd_version_info: UNK('zstd ライブラリのバージョン'),
  },
  functions: {
    compress: unverifiedFn('compression.zstd.compress()', BYTES_REASON),
    decompress: unverifiedFn('compression.zstd.decompress()', BYTES_REASON),
    get_frame_info: unverifiedFn('compression.zstd.get_frame_info()', BYTES_REASON),
    train_dict: unverifiedFn('compression.zstd.train_dict()', BYTES_REASON),
    finalize_dict: unverifiedFn('compression.zstd.finalize_dict()', BYTES_REASON),
    open: unsupportedFn('compression.zstd.open()', FILE_REASON),
  },
  classes: {
    ZstdCompressor: unverifiedClass('ZstdCompressor', 'compression.zstd.ZstdCompressor', BYTES_REASON),
    ZstdDecompressor: unverifiedClass('ZstdDecompressor', 'compression.zstd.ZstdDecompressor', BYTES_REASON),
    ZstdDict: unverifiedClass('ZstdDict', 'compression.zstd.ZstdDict', BYTES_REASON),
    FrameInfo: unverifiedClass('FrameInfo', 'compression.zstd.FrameInfo', 'get_frame_info() が bytes のフレーム解析で返すオブジェクトであり、エンジンに bytes の値表現が無い'),
    CompressionParameter: unverifiedClass('CompressionParameter', 'compression.zstd.CompressionParameter', PARAM_REASON),
    DecompressionParameter: unverifiedClass('DecompressionParameter', 'compression.zstd.DecompressionParameter', PARAM_REASON),
    Strategy: unverifiedClass('Strategy', 'compression.zstd.Strategy', '属性の値が zstd のバージョン間で一定ではないとドキュメントに明記されており、順序だけが依存できる情報である'),
    ZstdFile: unsupportedClass('ZstdFile', 'compression.zstd.ZstdFile', FILE_REASON),
    ZstdError: excDef('ZstdError', 'compression.zstd.ZstdError', ['Exception']),
  },
});
