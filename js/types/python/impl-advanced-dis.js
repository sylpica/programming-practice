/* 高度モード B7 G8：dis モジュール（全53件）。
 * 一次情報：公式ドキュメント 3.15（library/dis）。
 * 方針：バイトコードは CPython 固有でエンジンに存在しないため、
 * 逆アセンブル系は未対応。opcode 番号表（opmap 等）は版ごとに変わり、
 * 3.15 の表をローカル 3.12.3 では実走照合できないため未検証（UNK 値
 * として登録し、アクセスで診断を出す）。cmp_op は版非依存のため
 * 束ね値として実装する。 */
import { TUPLE, UNK, unsupportedFn, unsupportedClassDef } from './impl-advanced-g8-common.js';
import { registerStdlibModule } from './stdlib-registry.js';

const REASON_BYTECODE = 'CPython バイトコードはエンジンに存在しない';
const REASON_TABLE = 'opcode 番号表は Python の版ごとに変わり、3.15 の表を手元の 3.12.3 では実走照合できない';

function unverifiedTable(ctx) { return ctx.unk(REASON_TABLE); }

registerStdlibModule('dis', {
  data: {
    cmp_op: TUPLE(['<', '<=', '==', '!=', '>', '>=']),
    opmap: UNK(), opname: UNK(), hasarg: UNK(), hascompare: UNK(), hasconst: UNK(),
    hasexc: UNK(), hasfree: UNK(), hasjabs: UNK(), hasjrel: UNK(), hasjump: UNK(),
    haslocal: UNK(), hasname: UNK(),
  },
  functions: {
    code_info: unsupportedFn('dis.code_info', REASON_BYTECODE),
    dis: unsupportedFn('dis.dis', REASON_BYTECODE),
    disco: unsupportedFn('dis.disco', REASON_BYTECODE),
    disassemble: unsupportedFn('dis.disassemble', REASON_BYTECODE),
    distb: unsupportedFn('dis.distb', REASON_BYTECODE),
    findlabels: unsupportedFn('dis.findlabels', REASON_BYTECODE),
    findlinestarts: unsupportedFn('dis.findlinestarts', REASON_BYTECODE),
    get_instructions: unsupportedFn('dis.get_instructions', REASON_BYTECODE),
    show_code: unsupportedFn('dis.show_code', REASON_BYTECODE),
    stack_effect: unsupportedFn('dis.stack_effect', REASON_BYTECODE),
  },
  classes: {
    Bytecode: unsupportedClassDef('Bytecode', 'dis.Bytecode', REASON_BYTECODE),
    Instruction: unsupportedClassDef('Instruction', 'dis.Instruction', REASON_BYTECODE),
    Positions: unsupportedClassDef('Positions', 'dis.Positions', REASON_BYTECODE),
  },
});
