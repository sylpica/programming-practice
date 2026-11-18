/* 高度モード B7 G8：token モジュール（全75件）。
 * 一次情報：CPython 本家 Lib/token.py（3.15 系 main ブランチ）と
 * 公式ドキュメント 3.15（library/token）、ローカル CPython 3.12.3 実走。
 * 版差異：3.12 では ASYNC=57／AWAIT=56 が残り TYPE_IGNORE 以降が繰り下がって
 * いたが、3.13 以降は ASYNC／AWAIT が token.py から外れ、3.14 で
 * TSTRING_START=62／TSTRING_MIDDLE=63／TSTRING_END=64 が追加された。
 * 本実装はドキュメント正本である 3.15 の値を採用する（報告書に明記）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { I, DICT } from './impl-advanced-g8-common.js';

const { dictSet } = PyAPI;

/* 3.15 のトークン番号（Lib/token.py の生成値そのまま） */
export const TOKEN_VALUES = {
  ENDMARKER: 0, NAME: 1, NUMBER: 2, STRING: 3, NEWLINE: 4, INDENT: 5, DEDENT: 6,
  LPAR: 7, RPAR: 8, LSQB: 9, RSQB: 10, COLON: 11, COMMA: 12, SEMI: 13, PLUS: 14,
  MINUS: 15, STAR: 16, SLASH: 17, VBAR: 18, AMPER: 19, LESS: 20, GREATER: 21,
  EQUAL: 22, DOT: 23, PERCENT: 24, LBRACE: 25, RBRACE: 26, EQEQUAL: 27,
  NOTEQUAL: 28, LESSEQUAL: 29, GREATEREQUAL: 30, TILDE: 31, CIRCUMFLEX: 32,
  LEFTSHIFT: 33, RIGHTSHIFT: 34, DOUBLESTAR: 35, PLUSEQUAL: 36, MINEQUAL: 37,
  STAREQUAL: 38, SLASHEQUAL: 39, PERCENTEQUAL: 40, AMPEREQUAL: 41, VBAREQUAL: 42,
  CIRCUMFLEXEQUAL: 43, LEFTSHIFTEQUAL: 44, RIGHTSHIFTEQUAL: 45,
  DOUBLESTAREQUAL: 46, DOUBLESLASH: 47, DOUBLESLASHEQUAL: 48, AT: 49, ATEQUAL: 50,
  RARROW: 51, ELLIPSIS: 52, COLONEQUAL: 53, EXCLAMATION: 54, OP: 55,
  TYPE_IGNORE: 56, TYPE_COMMENT: 57, SOFT_KEYWORD: 58, FSTRING_START: 59,
  FSTRING_MIDDLE: 60, FSTRING_END: 61, TSTRING_START: 62, TSTRING_MIDDLE: 63,
  TSTRING_END: 64, COMMENT: 65, NL: 66, ERRORTOKEN: 67, ENCODING: 68,
};
const N_TOKENS = 69;
const NT_OFFSET = 256;

const EXACT_PAIRS = [
  ['!', 54], ['!=', 28], ['%', 24], ['%=', 40], ['&', 19], ['&=', 41], ['(', 7],
  [')', 8], ['*', 16], ['**', 35], ['**=', 46], ['*=', 38], ['+', 14], ['+=', 36],
  [',', 12], ['-', 15], ['-=', 37], ['->', 51], ['.', 23], ['...', 52], ['/', 17],
  ['//', 47], ['//=', 48], ['/=', 39], [':', 11], [':=', 53], [';', 13], ['<', 20],
  ['<<', 33], ['<<=', 44], ['<=', 29], ['=', 22], ['==', 27], ['>', 21], ['>=', 30],
  ['>>', 34], ['>>=', 45], ['@', 49], ['@=', 50], ['[', 9], [']', 10], ['^', 32],
  ['^=', 43], ['{', 25], ['|', 18], ['|=', 42], ['}', 26], ['~', 31],
];

function buildDict(entries) {
  const d = DICT();
  for (const [k, v] of entries) dictSet(d, k, v);
  return d;
}

const constants = {};
for (const [name, value] of Object.entries(TOKEN_VALUES)) constants[name] = I(value);
constants.N_TOKENS = I(N_TOKENS);
constants.EXACT_TOKEN_TYPES = buildDict(EXACT_PAIRS.map(([s, n]) => [s, I(n)]));
/* tok_name は token.py の生成規則どおり：整数のモジュール定数すべて
 * （N_TOKENS 自身と NT_OFFSET を含む）を値→名前で引く辞書。 */
const tokNameEntries = Object.entries(TOKEN_VALUES).map(([name, value]) => [I(value), name]);
tokNameEntries.push([I(N_TOKENS), 'N_TOKENS'], [I(NT_OFFSET), 'NT_OFFSET']);
constants.tok_name = buildDict(tokNameEntries);

function intArg(ctx, v, fname) {
  const n = ctx.num(v);
  if (n === null) ctx.err('TypeError', 'token.' + fname + '() の引数には整数を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return n;
}

registerStdlibModule('token', {
  constants,
  functions: {
    ISEOF: (ctx, args, kwargs) => {
      if (Object.keys(kwargs || {}).length) ctx.err('TypeError', 'token.ISEOF() にキーワード引数はありません', '');
      if (args.length !== 1) ctx.err('TypeError', 'token.ISEOF() の引数の数が合いません', '');
      return PyAPI.BOOL(intArg(ctx, args[0], 'ISEOF') === TOKEN_VALUES.ENDMARKER);
    },
    ISTERMINAL: (ctx, args, kwargs) => {
      if (Object.keys(kwargs || {}).length) ctx.err('TypeError', 'token.ISTERMINAL() にキーワード引数はありません', '');
      if (args.length !== 1) ctx.err('TypeError', 'token.ISTERMINAL() の引数の数が合いません', '');
      return PyAPI.BOOL(intArg(ctx, args[0], 'ISTERMINAL') < NT_OFFSET);
    },
    ISNONTERMINAL: (ctx, args, kwargs) => {
      if (Object.keys(kwargs || {}).length) ctx.err('TypeError', 'token.ISNONTERMINAL() にキーワード引数はありません', '');
      if (args.length !== 1) ctx.err('TypeError', 'token.ISNONTERMINAL() の引数の数が合いません', '');
      return PyAPI.BOOL(intArg(ctx, args[0], 'ISNONTERMINAL') >= NT_OFFSET);
    },
  },
});
