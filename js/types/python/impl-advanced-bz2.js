/* 高度モード B7 G11：bz2 モジュール（21件）。
 * 一次情報：公式ドキュメント 3.15（library/bz2）と CPython 3.12.3 実走。
 * 圧縮・展開は bytes 入出力で未検証、BZ2File と open は実ファイル
 * 前提で未対応。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { unsupportedFn, unverifiedFn, unsupportedClass, unverifiedClass } from './impl-advanced-g11-common.js';

const BYTES_REASON = 'bytes を入出力とし、エンジンに bytes の値表現が無い';
const FILE_REASON = '実ファイルを対象とし、エンジンに実ファイルシステムが無い';

registerStdlibModule('bz2', {
  functions: {
    compress: unverifiedFn('bz2.compress()', BYTES_REASON),
    decompress: unverifiedFn('bz2.decompress()', BYTES_REASON),
    open: unsupportedFn('bz2.open()', FILE_REASON),
  },
  classes: {
    BZ2Compressor: unverifiedClass('BZ2Compressor', 'bz2.BZ2Compressor', BYTES_REASON),
    BZ2Decompressor: unverifiedClass('BZ2Decompressor', 'bz2.BZ2Decompressor', BYTES_REASON),
    BZ2File: unsupportedClass('BZ2File', 'bz2.BZ2File', FILE_REASON),
  },
});
