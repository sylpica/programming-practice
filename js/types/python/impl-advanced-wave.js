/* 高度モード B7 G11：wave モジュール（39件）。
 * 一次情報：公式ドキュメント 3.15（library/wave）と CPython 3.12.3 実走。
 * 波形フォーマット定数（WAVE_FORMAT_PCM=1、WAVE_FORMAT_IEEE_FLOAT=3、
 * WAVE_FORMAT_EXTENSIBLE=65534。IEEE_FLOAT は 3.13 で追加）と
 * wave.Error は対応。Wave_read／Wave_write は open 経由でのみ得られ、
 * フレームデータが bytes であり実ファイル前提のため未対応。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { I, unsupportedFn, unsupportedClass, excDef } from './impl-advanced-g11-common.js';

const FILE_REASON = '実ファイルまたはファイルオブジェクトを対象とし、エンジンに実ファイルシステムが無い';

registerStdlibModule('wave', {
  data: {
    WAVE_FORMAT_PCM: I(1), WAVE_FORMAT_IEEE_FLOAT: I(3), WAVE_FORMAT_EXTENSIBLE: I(65534),
  },
  functions: {
    open: unsupportedFn('wave.open()', FILE_REASON),
  },
  classes: {
    Wave_read: unsupportedClass('Wave_read', 'wave.Wave_read', FILE_REASON),
    Wave_write: unsupportedClass('Wave_write', 'wave.Wave_write', FILE_REASON),
    Error: excDef('Error', 'wave.Error', ['Exception']),
  },
});
