/* 高度モード B7 G11：pickle モジュール（23件）。
 * 一次情報：公式ドキュメント 3.15（library/pickle）と CPython 3.12.3 実走。
 * プロトコル定数はドキュメント 3.15 の値（DEFAULT_PROTOCOL=5 は
 * 3.14 で変更、HIGHEST_PROTOCOL=5）で対応。例外3件は対応付け。
 * dumps／loads はプロトコル形式のバイト列生成・解析で、形式の
 * バイト単位の正確性照合が重く、戻り値・引数が bytes でもあるため
 * 未検証。Pickler／Unpickler と dump／load はファイル（ストリーム）
 * 前提で未対応。PickleBuffer はバッファプロトコル依存で未検証。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { I, unsupportedFn, unverifiedFn, unsupportedClass, unverifiedClass, excDef } from './impl-advanced-g11-common.js';

const STREAM_REASON = '書き込み先・読み込み元のストリーム（ファイルオブジェクト）を必要とし、エンジンに実ファイルシステムが無い';

registerStdlibModule('pickle', {
  data: { DEFAULT_PROTOCOL: I(5), HIGHEST_PROTOCOL: I(5) },
  functions: {
    dumps: unverifiedFn('pickle.dumps()', '戻り値が bytes でエンジンに bytes の値表現が無く、プロトコル形式のバイト単位の正確性も照合できない'),
    loads: unverifiedFn('pickle.loads()', '引数が bytes でエンジンに bytes の値表現が無く、任意オブジェクトの再構成まで含む形式の正確性を照合できない'),
    dump: unsupportedFn('pickle.dump()', STREAM_REASON),
    load: unsupportedFn('pickle.load()', STREAM_REASON),
  },
  classes: {
    Pickler: unsupportedClass('Pickler', 'pickle.Pickler', STREAM_REASON),
    Unpickler: unsupportedClass('Unpickler', 'pickle.Unpickler', STREAM_REASON),
    PickleBuffer: unverifiedClass('PickleBuffer', 'pickle.PickleBuffer', 'バッファプロトコル（bytes／memoryview）に依存し、エンジンに bytes の値表現が無い'),
    PickleError: excDef('PickleError', 'pickle.PickleError', ['Exception']),
    PicklingError: excDef('PicklingError', 'pickle.PicklingError', ['pickle.PickleError']),
    UnpicklingError: excDef('UnpicklingError', 'pickle.UnpicklingError', ['pickle.PickleError']),
  },
});
