/* 高度モード B7 G8：modulefinder モジュール（全6件）。
 * 一次情報：公式ドキュメント 3.15（library/modulefinder）。
 * 方針：ファイルシステム上のモジュール探索が前提で、エンジンでは
 * 再現できないため全件を未対応に倒す。 */
import { unsupportedFn, unsupportedClassDef } from './impl-advanced-g8-common.js';
import { registerStdlibModule } from './stdlib-registry.js';

const REASON = 'ファイルシステム上のモジュール探索が前提で、エンジンでは再現できない';

registerStdlibModule('modulefinder', {
  functions: {
    AddPackagePath: unsupportedFn('modulefinder.AddPackagePath', REASON),
    ReplacePackage: unsupportedFn('modulefinder.ReplacePackage', REASON),
  },
  classes: {
    ModuleFinder: unsupportedClassDef('ModuleFinder', 'modulefinder.ModuleFinder', REASON),
  },
});
