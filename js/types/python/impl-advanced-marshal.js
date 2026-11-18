/* 高度モード B7 G11：marshal モジュール（5件）。
 * 一次情報：公式ドキュメント 3.15（library/marshal）と CPython 3.12.3 実走。
 * marshal 形式は CPython 内部形式でバージョン依存（ドキュメントも
 * 互換性を保証しない）と明記されるため、dumps／loads は原則未検証。
 * dump／load はファイル前提で未対応。version（=4）は対応。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { I, unsupportedFn, unverifiedFn } from './impl-advanced-g11-common.js';

registerStdlibModule('marshal', {
  data: { version: I(4) },
  functions: {
    dumps: unverifiedFn('marshal.dumps()', 'marshal 形式が CPython のバージョン依存の内部形式であり、形式の正確な再現と照合ができない'),
    loads: unverifiedFn('marshal.loads()', 'marshal 形式が CPython のバージョン依存の内部形式であり、形式の正確な再現と照合ができない。加えて入力は bytes でエンジンに bytes の値表現が無い'),
    dump: unsupportedFn('marshal.dump()', 'ファイルオブジェクトへの書き込みを対象とし、エンジンに実ファイルシステムが無い'),
    load: unsupportedFn('marshal.load()', 'ファイルオブジェクトからの読み込みを対象とし、エンジンに実ファイルシステムが無い'),
  },
});
