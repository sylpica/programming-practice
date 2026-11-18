/* 高度モード B7 G8：tokenize モジュール（全13件）。
 * 一次情報：公式ドキュメント 3.15（library/tokenize）と CPython
 * 3.12.3 実走（TokenInfo の repr・untokenize の出力を照合）。
 * 方針：TokenInfo は namedtuple として値の意味論を実装する。
 * untokenize は CPython のアルゴリズム（Lib/tokenize.py）を移植。
 * エンジンの字句解析器は公開されていないため、トークン生成系は
 * 未検証、ファイル前提の open は未対応に倒す。 */
import { PyAPI } from './engine.js';
import { I, BOOL, NONE, TUPLE, unsupportedFn, unverifiedFn } from './impl-advanced-g8-common.js';
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
import { TOKEN_VALUES } from './impl-advanced-token.js';

const { NUM, UNK } = PyAPI;

function makeTokenInfo(ctx, type, string, start, end, line) {
  return ctx.native('tokenize.TokenInfo', { type, string, start, end, line });
}
function tokenInfoFields(self) {
  return [self.data.type, self.data.string, self.data.start, self.data.end, self.data.line];
}
const tokenInfoDef = {
  typeName: 'TokenInfo',
  construct: (ctx, args, kwargs) => {
    if (args.length !== 5) ctx.err('TypeError', 'TokenInfo() の引数の数が合いません', '');
    return makeTokenInfo(ctx, args[0], args[1], args[2], args[3], args[4]);
  },
  attrs: {
    type: (ctx, self) => self.data.type,
    string: (ctx, self) => self.data.string,
    start: (ctx, self) => self.data.start,
    end: (ctx, self) => self.data.end,
    line: (ctx, self) => self.data.line,
    exact_type: (ctx, self) => {
      const t = self.data.type;
      if (ctx.isNum(t) && ctx.int(t) === TOKEN_VALUES.OP) {
        const s = self.data.string;
        const m = { '(': 7, ')': 8, '[': 9, ']': 10, ':': 11, ',': 12, ';': 13, '+': 14, '-': 15, '*': 16, '/': 17, '|': 18, '&': 19, '<': 20, '>': 21, '=': 22, '.': 23, '%': 24, '{': 25, '}': 26, '==': 27, '!=': 28, '<=': 29, '>=': 30, '~': 31, '^': 32, '<<': 33, '>>': 34, '**': 35, '+=': 36, '-=': 37, '*=': 38, '/=': 39, '%=': 40, '&=': 41, '|=': 42, '^=': 43, '<<=': 44, '>>=': 45, '**=': 46, '//': 47, '//=': 48, '@': 49, '@=': 50, '->': 51, '...': 52, ':=': 53, '!': 54 };
        return NUM(m[s] !== undefined ? m[s] : TOKEN_VALUES.OP);
      }
      return t;
    },
  },
  repr: (ctx, self) => {
    /* repr フックに渡る ctx では int() が使えないため PyAPI を直接使う */
    const t = self.data.type && self.data.type.__num === true ? self.data.type.v : 0;
    const name = Object.entries(TOKEN_VALUES).find(([, v]) => v === t);
    const typeRepr = String(t) + ' (' + (name ? name[0] : '?') + ')';
    return 'TokenInfo(type=' + typeRepr + ', string=' + PyAPI.reprVal(self.data.string) + ', start=' + PyAPI.reprVal(self.data.start) + ', end=' + PyAPI.reprVal(self.data.end) + ', line=' + PyAPI.reprVal(self.data.line) + ')';
  },
  eq: (ctx, self, other) => {
    if (other && other.__native === 'tokenize.TokenInfo') {
      return tokenInfoFields(self).every((v, i) => ctx.eq(v, tokenInfoFields(other)[i]) === true);
    }
    if (PyAPI.isTuple(other)) {
      return tokenInfoFields(self).every((v, i) => ctx.eq(v, other.__tuple[i]) === true);
    }
    return null;
  },
  hash: (ctx, self) => PyAPI.dictKeyId(TUPLE(tokenInfoFields(self))),
  len: () => 5,
  iter: (ctx, self) => tokenInfoFields(self),
  getitem: (ctx, self, key) => {
    if (ctx.isNum(key)) {
      let idx = ctx.int(key);
      if (idx < 0) idx += 5;
      if (idx < 0 || idx >= 5) ctx.err('IndexError', 'tuple index out of range', '');
      return tokenInfoFields(self)[idx];
    }
    return ctx.NOT_HANDLED;
  },
};
registerStdlibClass('tokenize.TokenInfo', tokenInfoDef);

/* untokenize：CPython Lib/tokenize.py の Untokenizer を忠実に移植
 * （escape_brackets の中括弧処理は FSTRING_MIDDLE の通常経路のみ） */
function escapeBrackets(token) {
  const characters = [];
  let consume = false;
  for (const ch of token) {
    if (ch === '}') {
      if (consume) consume = false;
      else characters.push(ch);
    }
    if (ch === '{') {
      let n = 0;
      for (let i = characters.length - 2; i >= 0 && characters[i] === '\\'; i--) n++;
      if (n % 2 === 0) characters.push(ch);
      else consume = true;
    }
    characters.push(ch);
  }
  return characters.join('');
}
function untokenizeImpl(ctx, args, kwargs) {
  const iterable = ctx.iterable(args[0]);
  if (iterable === null) ctx.err('TypeError', 'untokenize() には反復可能オブジェクトを使ってください', '');
  const rawTokens = [];
  for (const item of iterable) {
    if (item && item.__native === 'tokenize.TokenInfo') {
      rawTokens.push({ len: 5, type: ctx.int(item.data.type), string: String(item.data.string), start: item.data.start, end: item.data.end });
    } else {
      const parts = ctx.iterable(item);
      if (!parts || parts.length < 2) ctx.err('TypeError', 'untokenize() の要素はタプルです', '');
      const tok = { len: parts.length, type: ctx.int(parts[0]), string: String(parts[1]) };
      if (parts.length >= 5) { tok.start = parts[2]; tok.end = parts[3]; }
      rawTokens.push(tok);
    }
  }
  const T = TOKEN_VALUES;
  const out = [];
  const posOf = (v) => {
    const items = ctx.iterable(v);
    return items ? [ctx.int(items[0]), ctx.int(items[1])] : [1, 0];
  };
  if (rawTokens.length && rawTokens[0].len === 2) {
    /* compat 形式 */
    const indents = [];
    let startline = rawTokens[0].type === T.NEWLINE || rawTokens[0].type === T.NL;
    let prevstring = false;
    let inFstring = 0;
    let prevType = null;
    for (const tok of rawTokens) {
      let tokval = tok.string;
      const toknum = tok.type;
      if (toknum === T.ENCODING) continue;
      if (toknum === T.NAME || toknum === T.NUMBER) tokval += ' ';
      if (toknum === T.STRING) {
        if (prevstring) tokval = ' ' + tokval;
        prevstring = true;
      } else prevstring = false;
      if (toknum === T.FSTRING_START) inFstring++;
      else if (toknum === T.FSTRING_END) inFstring--;
      if (toknum === T.INDENT) { indents.push(tokval); continue; }
      if (toknum === T.DEDENT) { indents.pop(); continue; }
      if (toknum === T.NEWLINE || toknum === T.NL) startline = true;
      else if (startline && indents.length) { out.push(indents[indents.length - 1]); startline = false; }
      else if (toknum === T.FSTRING_MIDDLE) tokval = escapeBrackets(tokval);
      if ((tokval === '{' || tokval === '}') && out.length && out[out.length - 1] === tokval && inFstring) tokval = ' ' + tokval;
      if ((toknum === T.STRING || toknum === T.FSTRING_START) && (prevType === T.STRING || prevType === T.FSTRING_END)) out.push(' ');
      out.push(tokval);
      prevType = toknum;
    }
    return out.join('');
  }
  /* 5要素形式 */
  let prevRow = 1, prevCol = 0, prevType = null;
  const indents = [];
  let startline = false;
  const addWhitespace = (start) => {
    const [row, col] = start;
    if (row < prevRow || (row === prevRow && col < prevCol)) {
      ctx.err('ValueError', 'start (' + row + ',' + col + ') precedes previous end (' + prevRow + ',' + prevCol + ')', '');
    }
    const rowOffset = row - prevRow;
    if (rowOffset) { out.push('\\\n'.repeat(rowOffset)); prevCol = 0; }
    const colOffset = col - prevCol;
    if (colOffset) out.push(' '.repeat(colOffset));
  };
  for (const tok of rawTokens) {
    if (tok.type === T.ENCODING) continue;
    if (tok.type === T.ENDMARKER) break;
    const start = tok.start !== undefined ? posOf(tok.start) : [prevRow, prevCol];
    const end = tok.end !== undefined ? posOf(tok.end) : start;
    if (tok.type === T.INDENT) { indents.push(tok.string); continue; }
    if (tok.type === T.DEDENT) { indents.pop(); prevRow = end[0]; prevCol = end[1]; continue; }
    if (tok.type === T.NEWLINE || tok.type === T.NL) startline = true;
    else if (startline && indents.length) {
      const indent = indents[indents.length - 1];
      if (start[1] >= indent.length) { out.push(indent); prevCol = indent.length; }
      startline = false;
    } else if ((tok.type === T.STRING || tok.type === T.FSTRING_START) && (prevType === T.STRING || prevType === T.FSTRING_END)) {
      out.push(' ');
    }
    addWhitespace(start);
    out.push(tok.string);
    prevRow = end[0]; prevCol = end[1];
    if (tok.type === T.NEWLINE || tok.type === T.NL) { prevRow += 1; prevCol = 0; }
    prevType = tok.type;
  }
  return out.join('');
}

registerStdlibModule('tokenize', {
  functions: {
    untokenize: untokenizeImpl,
    detect_encoding: unverifiedFn('tokenize.detect_encoding', 'エンコーディング宣言の検出はバイト列の読み取りが前提で、エンジンでは再現できない'),
    generate_tokens: unverifiedFn('tokenize.generate_tokens', 'エンジンの字句解析器は公開されていない'),
    tokenize: unverifiedFn('tokenize.tokenize', 'エンジンの字句解析器は公開されていない'),
    open: unsupportedFn('tokenize.open', 'ファイルを開く処理はファイル前提で、エンジンでは再現できない'),
  },
  classes: {
    TokenInfo: tokenInfoDef,
    TokenError: { exc: 'tokenize.TokenError', excParents: ['Exception'] },
  },
});
