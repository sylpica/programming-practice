/* 高度モード B7 G8：code モジュール（全13件）。
 * 一次情報：公式ドキュメント 3.15（library/code）。
 * 方針：対話インタプリタはエンジンへの再入（ネストした実行）が
 * 前提だが、実装関数からエンジンの実行系を再入呼び出しする口が
 * 基盤に無いため、全件を未検証に倒す（基盤要請に記載）。 */
import { unverifiedFn, unverifiedClassDef } from './impl-advanced-g8-common.js';
import { registerStdlibModule } from './stdlib-registry.js';

const REASON = '対話インタプリタの実行にはエンジンへの再入が必要だが、実装関数から実行系を再入呼び出しする口が基盤に無い';

registerStdlibModule('code', {
  functions: {
    interact: unverifiedFn('code.interact', REASON),
    compile_command: unverifiedFn('code.compile_command', '戻り値がコードオブジェクトだが、エンジンにコードオブジェクトが存在しない'),
  },
  classes: {
    InteractiveInterpreter: unverifiedClassDef('InteractiveInterpreter', 'code.InteractiveInterpreter', REASON),
    InteractiveConsole: unverifiedClassDef('InteractiveConsole', 'code.InteractiveConsole', REASON),
  },
});
