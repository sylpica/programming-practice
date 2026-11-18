/* 高度モード B7 G11：gzip モジュール（9件）。
 * 一次情報：公式ドキュメント 3.15（library/gzip）と CPython 3.12.3 実走。
 * BadGzipFile（OSError のサブクラス）は対応付け。compress／decompress
 * は bytes 入出力で未検証、GzipFile と open は実ファイル前提で未対応。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { unsupportedFn, unverifiedFn, unsupportedClass, excDef } from './impl-advanced-g11-common.js';

const BYTES_REASON = 'bytes を入出力とし、エンジンに bytes の値表現が無い';
const FILE_REASON = '実ファイルを対象とし、エンジンに実ファイルシステムが無い';

registerStdlibModule('gzip', {
  functions: {
    compress: unverifiedFn('gzip.compress()', BYTES_REASON),
    decompress: unverifiedFn('gzip.decompress()', BYTES_REASON),
    open: unsupportedFn('gzip.open()', FILE_REASON),
  },
  classes: {
    GzipFile: unsupportedClass('GzipFile', 'gzip.GzipFile', FILE_REASON),
    BadGzipFile: excDef('BadGzipFile', 'gzip.BadGzipFile', ['OSError']),
  },
});
