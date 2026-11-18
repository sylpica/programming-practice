/* 高度モード B7 G11：zipimport モジュール（13件）。
 * 一次情報：公式ドキュメント 3.15（library/zipimport）と CPython 3.12.3 実走。
 * インポート機構そのものに依存し、ZIP アーカイブ実体も必要なため
 * zipimporter は原則未対応。ZipImportError（ImportError のサブクラス）
 * だけは例外として対応付けする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { unsupportedClass, excDef } from './impl-advanced-g11-common.js';

registerStdlibModule('zipimport', {
  classes: {
    zipimporter: unsupportedClass('zipimporter', 'zipimport.zipimporter', 'インポート機構と ZIP アーカイブ実体に依存し、エンジンに実ファイルシステムが無い'),
    ZipImportError: excDef('ZipImportError', 'zipimport.ZipImportError', ['ImportError']),
  },
});
