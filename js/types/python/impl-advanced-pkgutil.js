/* 高度モード B7 G11：pkgutil モジュール（8件）。
 * 一次情報：公式ドキュメント 3.15（library/pkgutil）と CPython 3.12.3 実走。
 * 関数群はすべてモジュール探索（sys.path とファインダ）に依存し
 * 環境依存のため未対応。ModuleInfo は (module_finder, name, ispkg) の
 * namedtuple だが、module_finder がインポータオブジェクトであり、
 * タプルとしての振る舞いまで含めた再現・照合ができないため未検証。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { unsupportedFn, unverifiedClass } from './impl-advanced-g11-common.js';

const ENV_REASON = 'モジュール探索（sys.path とインポータ）に依存し、実行環境によって結果が変わる';

registerStdlibModule('pkgutil', {
  functions: {
    extend_path: unsupportedFn('pkgutil.extend_path()', ENV_REASON),
    get_data: unsupportedFn('pkgutil.get_data()', 'パッケージのリソース（実ファイル）を読み込む操作であり、エンジンに実ファイルシステムが無い'),
    get_importer: unsupportedFn('pkgutil.get_importer()', ENV_REASON),
    iter_importers: unsupportedFn('pkgutil.iter_importers()', ENV_REASON),
    iter_modules: unsupportedFn('pkgutil.iter_modules()', ENV_REASON),
    resolve_name: unsupportedFn('pkgutil.resolve_name()', '名前解決のために実際のインポートを行い、実行環境に依存する'),
    walk_packages: unsupportedFn('pkgutil.walk_packages()', ENV_REASON),
  },
  classes: {
    ModuleInfo: unverifiedClass('ModuleInfo', 'pkgutil.ModuleInfo', 'namedtuple のタプルとしての振る舞いとインポータオブジェクトの保持を含み、その範囲の再現・照合ができない'),
  },
});
