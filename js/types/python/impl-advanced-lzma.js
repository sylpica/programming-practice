/* 高度モード B7 G11：lzma モジュール（40件）。
 * 一次情報：公式ドキュメント 3.15（library/lzma）と CPython 3.12.3 実走。
 * 整数定数（21件）と LZMAError は対応。FILTER_LZMA1 は
 * 4611686018427387905 で JS の安全整数（2^53-1）を超え、エンジンの
 * 数値では正確に表せないため未検証。圧縮・展開は bytes 入出力で
 * 未検証、is_check_supported はビルド依存で未検証、ファイル系は未対応。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { UNK, I, unsupportedFn, unverifiedFn, unsupportedClass, unverifiedClass, excDef } from './impl-advanced-g11-common.js';

const BYTES_REASON = 'bytes を入出力とし、エンジンに bytes の値表現が無い';
const FILE_REASON = '実ファイルを対象とし、エンジンに実ファイルシステムが無い';

registerStdlibModule('lzma', {
  data: {
    CHECK_NONE: I(0), CHECK_CRC32: I(1), CHECK_CRC64: I(4), CHECK_SHA256: I(10),
    CHECK_ID_MAX: I(15), CHECK_UNKNOWN: I(16),
    FILTER_DELTA: I(3), FILTER_LZMA2: I(33),
    FILTER_LZMA1: UNK('とても大きな整数（4611686018427387905）'),
    FORMAT_AUTO: I(0), FORMAT_XZ: I(1), FORMAT_ALONE: I(2), FORMAT_RAW: I(3),
    MF_HC3: I(3), MF_HC4: I(4), MF_BT2: I(18), MF_BT3: I(19), MF_BT4: I(20),
    MODE_FAST: I(1), MODE_NORMAL: I(2),
    PRESET_DEFAULT: I(6), PRESET_EXTREME: I(2147483648),
  },
  functions: {
    compress: unverifiedFn('lzma.compress()', BYTES_REASON),
    decompress: unverifiedFn('lzma.decompress()', BYTES_REASON),
    is_check_supported: unverifiedFn('lzma.is_check_supported()', '戻り値が CPython のビルド（liblzma の構成）に依存する'),
    open: unsupportedFn('lzma.open()', FILE_REASON),
  },
  classes: {
    LZMACompressor: unverifiedClass('LZMACompressor', 'lzma.LZMACompressor', BYTES_REASON),
    LZMADecompressor: unverifiedClass('LZMADecompressor', 'lzma.LZMADecompressor', BYTES_REASON),
    LZMAFile: unsupportedClass('LZMAFile', 'lzma.LZMAFile', FILE_REASON),
    LZMAError: excDef('LZMAError', 'lzma.LZMAError', ['Exception']),
  },
});
