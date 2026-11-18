/* 高度モード B7 G8：codeop モジュール（全3件）。
 * 一次情報：公式ドキュメント 3.15（library/codeop）。
 * 方針：不完全入力の判定自体は文字列解析で近づけるが、戻り値が
 * コードオブジェクトであり、エンジンにコードオブジェクトが存在
 * しないため、成功結果を捏造せず全件を未検証に倒す。 */
import { unverifiedFn, unverifiedClassDef } from './impl-advanced-g8-common.js';
import { registerStdlibModule } from './stdlib-registry.js';

const REASON = '戻り値がコードオブジェクトだが、エンジンにコードオブジェクトが存在せず、不完全入力との区別も含めて結果を確定できない';

registerStdlibModule('codeop', {
  functions: {
    compile_command: unverifiedFn('codeop.compile_command', REASON),
  },
  classes: {
    Compile: unverifiedClassDef('Compile', 'codeop.Compile', REASON),
    CommandCompiler: unverifiedClassDef('CommandCompiler', 'codeop.CommandCompiler', REASON),
  },
});
