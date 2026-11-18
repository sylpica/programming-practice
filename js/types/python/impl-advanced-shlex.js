/* 高度モード B7 G3：shlex モジュール（全26件）の意味論実装。
 * 一次情報：CPython 3.12.3 の shlex.py の移植と公式ドキュメント 3.15。
 * 入力は文字列ソースのみを対象とする（エンジンにファイルが無いため）。
 * read_token の状態機械は CPython のまま再現した。push_source は文字列
 * ストリームに限り再現し、sourcehook（ファイルを開く）は未対応として
 * 正直に停止する。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';

const { BOOL, NONE, LIST } = PyAPI;
const FALSE = BOOL(false);
const I = (v) => PyAPI.NUM(v, false);

function newLexerState(source, infile, posix, punctuationChars) {
  const d = {
    source: source === undefined ? '' : source, pos: 0,
    infile: infile === undefined ? null : infile,
    posix: !!posix,
    eof: posix ? null : '',
    commenters: '#',
    wordchars: 'abcdfeghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
    whitespace: ' \t\r\n',
    whitespace_split: false,
    quotes: '\'"',
    escape: '\\',
    escapedquotes: '"',
    state: ' ',
    pushback: [],
    lineno: 1,
    debug: 0,
    token: '',
    filestack: [],
    sourceHookName: null,
    punctuation_chars: '',
    pushbackChars: [],
  };
  if (d.posix) d.wordchars += 'ßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ';
  let pc = '';
  if (punctuationChars === true) pc = '();<>|&';
  else if (typeof punctuationChars === 'string') pc = punctuationChars;
  d.punctuation_chars = pc;
  if (pc) {
    d.wordchars += '~-./*?=';
    d.wordchars = [...d.wordchars].filter((c) => ![...pc].includes(c)).join('');
  }
  return d;
}
function readChar(d) {
  if (d.pos >= d.source.length) return '';
  return d.source[d.pos++];
}
function readLineRest(d) {
  while (d.pos < d.source.length && d.source[d.pos] !== '\n') d.pos++;
  if (d.pos < d.source.length) d.pos++; // 改行自体も消費する（readline）
}
function readToken(ctx, d) {
  let quoted = false;
  let escapedstate = ' ';
  for (;;) {
    let nextchar;
    if (d.punctuation_chars && d.pushbackChars.length) nextchar = d.pushbackChars.pop();
    else nextchar = readChar(d);
    if (nextchar === '\n') d.lineno += 1;
    if (d.state === null) { d.token = ''; break; }
    else if (d.state === ' ') {
      if (!nextchar) { d.state = null; break; }
      else if (d.whitespace.includes(nextchar)) {
        if (d.token || (d.posix && quoted)) break;
        else continue;
      } else if (d.commenters.includes(nextchar)) {
        readLineRest(d); d.lineno += 1;
      } else if (d.posix && d.escape.includes(nextchar)) {
        escapedstate = 'a'; d.state = nextchar;
      } else if (d.wordchars.includes(nextchar)) {
        d.token = nextchar; d.state = 'a';
      } else if (d.punctuation_chars.includes(nextchar)) {
        d.token = nextchar; d.state = 'c';
      } else if (d.quotes.includes(nextchar)) {
        if (!d.posix) d.token = nextchar;
        d.state = nextchar;
      } else if (d.whitespace_split) {
        d.token = nextchar; d.state = 'a';
      } else {
        d.token = nextchar;
        if (d.token || (d.posix && quoted)) break;
        else continue;
      }
    } else if (d.quotes.includes(d.state)) {
      quoted = true;
      if (!nextchar) ctx.err('ValueError', 'No closing quotation', '');
      if (nextchar === d.state) {
        if (!d.posix) { d.token += nextchar; d.state = ' '; break; }
        else d.state = 'a';
      } else if (d.posix && d.escape.includes(nextchar) && d.escapedquotes.includes(d.state)) {
        escapedstate = d.state; d.state = nextchar;
      } else {
        d.token += nextchar;
      }
    } else if (d.escape.includes(d.state)) {
      if (!nextchar) ctx.err('ValueError', 'No escaped character', '');
      if (d.quotes.includes(escapedstate) && nextchar !== d.state && nextchar !== escapedstate) {
        d.token += d.state;
      }
      d.token += nextchar;
      d.state = escapedstate;
    } else if (d.state === 'a' || d.state === 'c') {
      if (!nextchar) { d.state = null; break; }
      else if (d.whitespace.includes(nextchar)) {
        d.state = ' ';
        if (d.token || (d.posix && quoted)) break;
        else continue;
      } else if (d.commenters.includes(nextchar)) {
        readLineRest(d); d.lineno += 1;
        if (d.posix) {
          d.state = ' ';
          if (d.token || (d.posix && quoted)) break;
          else continue;
        }
      } else if (d.state === 'c') {
        if (d.punctuation_chars.includes(nextchar)) d.token += nextchar;
        else {
          if (!d.whitespace.includes(nextchar)) d.pushbackChars.push(nextchar);
          d.state = ' ';
          break;
        }
      } else if (d.posix && d.quotes.includes(nextchar)) {
        d.state = nextchar;
      } else if (d.posix && d.escape.includes(nextchar)) {
        escapedstate = 'a'; d.state = nextchar;
      } else if (d.wordchars.includes(nextchar) || d.quotes.includes(nextchar) ||
                 (d.whitespace_split && !d.punctuation_chars.includes(nextchar))) {
        d.token += nextchar;
      } else {
        if (d.punctuation_chars) d.pushbackChars.push(nextchar);
        else d.pushback.unshift(nextchar);
        d.state = ' ';
        if (d.token || (d.posix && quoted)) break;
        else continue;
      }
    }
  }
  let result = d.token;
  d.token = '';
  if (d.posix && !quoted && result === '') result = null;
  return result;
}
function getToken(ctx, d) {
  if (d.pushback.length) return d.pushback.shift();
  let raw = readToken(ctx, d);
  if (d.sourceHookName !== null) {
    while (raw === d.sourceHookName) {
      ctx.err('未対応', 'shlex の source によるファイル読み込み（sourcehook）は本アプリの高度モードでは未対応です', '');
    }
  }
  while (raw === d.eof) {
    if (!d.filestack.length) return d.eof;
    popSource(d);
    raw = getToken(ctx, d);
  }
  return raw;
}
function popSource(d) {
  const prev = d.filestack.shift();
  d.infile = prev[0]; d.source = prev[1]; d.pos = prev[2]; d.lineno = prev[3];
  d.state = ' ';
}
function drainTokens(ctx, d) {
  const out = [];
  for (;;) {
    const t = getToken(ctx, d);
    if (t === d.eof) break;
    out.push(t);
  }
  return out;
}

const ShlexDef = {
  typeName: 'shlex',
  construct: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    let instream = args.length > 0 ? args[0] : NONE;
    let infile = args.length > 1 ? args[1] : (kw.infile !== undefined ? kw.infile : NONE);
    let posix = args.length > 2 ? args[2] : (kw.posix !== undefined ? kw.posix : FALSE);
    let punct = args.length > 3 ? args[3] : (kw.punctuation_chars !== undefined ? kw.punctuation_chars : FALSE);
    let src = '';
    if (instream !== undefined && !ctx.isNone(instream)) {
      const s = ctx.str(instream);
      if (s === null) ctx.err('未対応', 'shlex の入力は文字列のみ対応しています（ファイル・ストリームは未対応）', '');
      src = s;
    }
    const infileStr = ctx.isNone(infile) ? null : ctx.str(infile);
    const posixB = ctx.truthy(posix);
    if (posixB === null) return ctx.unk('引数が実行時に決まる値');
    let punctV = false;
    if (ctx.isBool(punct)) punctV = punct.v;
    else if (typeof punct === 'string') punctV = punct;
    else if (ctx.truthy(punct)) punctV = true;
    const d = newLexerState(src, infileStr, posixB, punctV);
    return ctx.native('shlex.shlex', d);
  },
  methods: {
    get_token: (ctx, self, args, kwargs) => {
      const t = getToken(ctx, self.data);
      return t === null ? NONE : t;
    },
    read_token: (ctx, self, args, kwargs) => {
      const t = readToken(ctx, self.data);
      return t === null ? NONE : t;
    },
    push_token: (ctx, self, args, kwargs) => {
      if (args.length !== 1) ctx.err('TypeError', 'push_token() の引数は1個です', '');
      const t = ctx.isNone(args[0]) ? null : ctx.str(args[0]);
      if (t === null && !ctx.isNone(args[0])) ctx.err('TypeError', 'push_token() の引数には文字列を使ってください', '');
      self.data.pushback.unshift(t);
      return NONE;
    },
    push_source: (ctx, self, args, kwargs) => {
      const s = args.length ? ctx.str(args[0]) : null;
      if (s === null) ctx.err('未対応', 'shlex.push_source は文字列ストリームのみ対応しています', '');
      const nf = args.length > 1 && !ctx.isNone(args[1]) ? ctx.str(args[1]) : null;
      const d = self.data;
      d.filestack.unshift([d.infile, d.source, d.pos, d.lineno]);
      d.infile = nf; d.source = s; d.pos = 0; d.lineno = 1;
      return NONE;
    },
    pop_source: (ctx, self, args, kwargs) => {
      if (!self.data.filestack.length) ctx.err('IndexError', 'pop from an empty deque', '');
      popSource(self.data);
      return NONE;
    },
    sourcehook: (ctx, self, args, kwargs) => ctx.err('未対応', 'shlex.sourcehook（ファイルを開く処理）は本アプリの高度モードでは未対応です', ''),
    error_leader: (ctx, self, args, kwargs) => {
      const d = self.data;
      const infile = args.length > 0 && !ctx.isNone(args[0]) ? ctx.str(args[0]) : d.infile;
      const lineno = args.length > 1 && !ctx.isNone(args[1]) ? ctx.int(args[1]) : d.lineno;
      return '"' + infile + '", line ' + lineno + ': ';
    },
  },
  attrs: {
    commenters: (ctx, self) => self.data.commenters,
    debug: (ctx, self) => I(self.data.debug),
    eof: (ctx, self) => self.data.eof === null ? NONE : self.data.eof,
    escape: (ctx, self) => self.data.escape,
    escapedquotes: (ctx, self) => self.data.escapedquotes,
    infile: (ctx, self) => self.data.infile === null ? NONE : self.data.infile,
    instream: (ctx, self) => self.data.source,
    lineno: (ctx, self) => I(self.data.lineno),
    punctuation_chars: (ctx, self) => self.data.punctuation_chars,
    quotes: (ctx, self) => self.data.quotes,
    source: (ctx, self) => self.data.sourceHookName === null ? NONE : self.data.sourceHookName,
    token: (ctx, self) => self.data.token,
    whitespace: (ctx, self) => self.data.whitespace,
    whitespace_split: (ctx, self) => BOOL(self.data.whitespace_split),
    wordchars: (ctx, self) => self.data.wordchars,
    posix: (ctx, self) => BOOL(self.data.posix),
  },
  iter: (ctx, self) => drainTokens(ctx, self.data),
  repr: () => '<shlex object>',
};

const FUNCTIONS = {
  /* クラス名シャドウ（kwargs 二重評価の基盤不具合への回避策。報告書に記載） */
  shlex: (ctx, args, kwargs) => ShlexDef.construct(ctx, args, kwargs),
  split: (ctx, args, kwargs) => {
    if (args.length < 1) ctx.err('TypeError', 'shlex.split() の引数が足りません', '');
    if (ctx.isNone(args[0])) ctx.err('ValueError', 's argument must not be None', '');
    const s = ctx.str(args[0]);
    if (s === null) { if (ctx.isUnk(args[0])) return ctx.unk('文字列が実行時に決まる値'); ctx.err('TypeError', 'shlex.split() の引数には文字列を使ってください', ''); }
    let comments = false, posix = true;
    if (args.length > 1) { const t = ctx.truthy(args[1]); if (t === null) return ctx.unk('引数が実行時に決まる値'); comments = t; }
    if (args.length > 2) { const t = ctx.truthy(args[2]); if (t === null) return ctx.unk('引数が実行時に決まる値'); posix = t; }
    if (kwargs && 'comments' in kwargs) comments = !!ctx.truthy(kwargs.comments);
    if (kwargs && 'posix' in kwargs) posix = !!ctx.truthy(kwargs.posix);
    const d = newLexerState(s, null, posix, false);
    d.whitespace_split = true;
    if (!comments) d.commenters = '';
    return LIST(drainTokens(ctx, d));
  },
  quote: (ctx, args, kwargs) => {
    const s = ctx.str(args[0]);
    if (s === null) { if (ctx.isUnk(args[0])) return ctx.unk('文字列が実行時に決まる値'); ctx.err('TypeError', 'shlex.quote() の引数には文字列を使ってください', ''); }
    if (!s) return "''";
    if (!/[^A-Za-z0-9_@%+=:,./-]/.test(s)) return s;
    return "'" + s.replace(/'/g, "'\"'\"'") + "'";
  },
  join: (ctx, args, kwargs) => {
    const items = ctx.iterable(args[0]);
    if (items === null) ctx.err('TypeError', 'shlex.join() の引数にはリストなどの「並び」を使ってください', '');
    const parts = [];
    for (const it of items) {
      const s = ctx.str(it);
      if (s === null) { if (ctx.isUnk(it)) return ctx.unk('要素が実行時に決まる値'); ctx.err('TypeError', 'shlex.join() の要素には文字列を使ってください', ''); }
      parts.push(FUNCTIONS.quote(ctx, [s], {}));
    }
    return parts.join(' ');
  },
};

registerStdlibModule('shlex', { functions: FUNCTIONS, classes: { shlex: ShlexDef } });
