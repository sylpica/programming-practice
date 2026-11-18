/* 高度モード B7 G8：symtable モジュール（全50件）。
 * 一次情報：公式ドキュメント 3.15（library/symtable）と CPython 本体
 * Lib/symtable.py（SymbolTableType は StrEnum で 3.13 以降の定義を
 * 本体ソースで確認）。
 * 方針：シンボルテーブルは CPython コンパイラ内部の産物でエンジンに
 * 存在しないため、解析系は未対応。SymbolTableType の値だけは束ね値
 * として正確に実装する。 */
import { unsupportedFn, unsupportedClassDef, makeEnum } from './impl-advanced-g8-common.js';
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';

const REASON = 'シンボルテーブルは CPython コンパイラ内部の産物で、エンジンは公開していない';

const typeEnum = makeEnum('symtable.SymbolTableType', 'SymbolTableType', [
  ['MODULE', 'module'], ['FUNCTION', 'function'], ['CLASS', 'class'],
  ['ANNOTATION', 'annotation'], ['TYPE_ALIAS', 'type alias'],
  ['TYPE_PARAMETERS', 'type parameters'], ['TYPE_VARIABLE', 'type variable'],
], 'strenum', 'SymbolTableType');
registerStdlibClass('symtable.SymbolTableType', typeEnum.def);

registerStdlibModule('symtable', {
  data: { ...typeEnum.instances },
  functions: {
    symtable: unsupportedFn('symtable.symtable', REASON),
  },
  classes: {
    SymbolTableType: typeEnum.def,
    SymbolTable: unsupportedClassDef('SymbolTable', 'symtable.SymbolTable', REASON),
    Function: unsupportedClassDef('Function', 'symtable.Function', REASON),
    Class: unsupportedClassDef('Class', 'symtable.Class', REASON),
    Symbol: unsupportedClassDef('Symbol', 'symtable.Symbol', REASON),
  },
});
