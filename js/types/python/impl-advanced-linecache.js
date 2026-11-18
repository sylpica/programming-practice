/* 高度モード B7 G8：linecache モジュール（全4件）。
 * 一次情報：公式ドキュメント 3.15（library/linecache）。
 * 方針：ソースファイルの行読み取りが前提で、エンジンでは再現
 * できないため全件を未対応に倒す。 */
import { unsupportedFn } from './impl-advanced-g8-common.js';
import { registerStdlibModule } from './stdlib-registry.js';

const REASON = 'ソースファイルの読み取りが前提で、エンジンでは再現できない';

registerStdlibModule('linecache', {
  functions: {
    getline: unsupportedFn('linecache.getline', REASON),
    checkcache: unsupportedFn('linecache.checkcache', REASON),
    clearcache: unsupportedFn('linecache.clearcache', REASON),
    lazycache: unsupportedFn('linecache.lazycache', REASON),
  },
});
