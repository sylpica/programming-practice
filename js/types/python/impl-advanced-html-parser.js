/* 高度モード B7 G7: html.parser モジュール。
* HTMLParser はコールバック駆動で、既定ハンドラはすべて no-op（CPython 実走で
* 確認）。エンジンではユーザー定義サブクラスを作れないため、観測可能な振る舞い
* （feed/close/reset の状態遷移、getpos、get_starttag_text）を CPython どおりに
* 実装し、handle_* は既定実装（何もしない）として登録する。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { I, TUPLE, NONE, unkRet, kwBool } from './impl-advanced-g7-common.js';
import { htmlUnescape } from './impl-advanced-html.js';

const PARSER_Q = 'html.parser.HTMLParser';
const RAWTEXT = new Set(['script', 'style']);

function advancePos(st, text) {
  for (const ch of text) {
    if (ch === '\n') { st.lineno++; st.offset = 0; }
    else st.offset++;
  }
}
/* 開始タグの終わり（'>'）を属性値の引用符を尊重して探す。見つからなければ -1 */
function findTagEnd(s, from) {
  let quote = null;
  for (let i = from; i < s.length; i++) {
    const ch = s[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '>') return i;
  }
  return -1;
}
function parseChunk(st, end) {
  const s = st.raw;
  let i = 0;
  const consume = (text) => { advancePos(st, text); i += text.length; };
  while (i < s.length) {
    if (st.cdata) {
      const closeTag = '</' + st.cdata;
      const idx = s.toLowerCase().indexOf(closeTag, i);
      if (idx < 0) {
        if (end) { consume(s.slice(i)); st.cdata = null; }
        break;
      }
      if (idx > i) consume(s.slice(i, idx));
      st.cdata = null;
      continue;
    }
    const lt = s.indexOf('<', i);
    if (lt < 0) { consume(s.slice(i)); break; }
    if (lt > i) { consume(s.slice(i, lt)); continue; }
    // s[i] === '<'
    const rest = s.slice(i);
    if (rest.startsWith('<!--')) {
      const close = s.indexOf('-->', i + 4);
      if (close < 0) { if (end) { consume(rest); } break; }
      consume(s.slice(i, close + 3));
      continue;
    }
    if (rest.startsWith('<![CDATA[')) {
      const close = s.indexOf(']]>', i + 9);
      if (close < 0) { if (end) consume(rest); break; }
      consume(s.slice(i, close + 3));
      continue;
    }
    if (rest.startsWith('<!') || rest.startsWith('<?')) {
      const close = findTagEnd(s, i + 2);
      if (close < 0) { if (end) consume(rest); break; }
      consume(s.slice(i, close + 1));
      continue;
    }
    if (rest.startsWith('</')) {
      const m = /^<\/\s*([a-zA-Z][^\s/>]*)\s*>/.exec(rest);
      if (!m) {
        // 不完全な終了タグ、または '</' の後に名前が続かない場合はテキスト扱い
        if (!end && rest.length < 3) break;
        if (/^<\/[^a-zA-Z]/.test(rest) || /^<\/\s*[^a-zA-Z\s>]/.test(rest)) { consume('<'); continue; }
        if (end) { consume(rest); break; }
        break;
      }
      consume(m[0]);
      continue;
    }
    const m = /^<([a-zA-Z][^\s/>]*)/.exec(rest);
    if (m) {
      const close = findTagEnd(s, i + 1);
      if (close < 0) { if (end) consume(rest); break; }
      const tagText = s.slice(i, close + 1);
      st.starttagText = tagText;
      const tag = m[1].toLowerCase();
      consume(tagText);
      if (RAWTEXT.has(tag) && !tagText.endsWith('/>')) st.cdata = tag;
      continue;
    }
    // '<' の後に名前が続かない場合はテキスト
    consume('<');
  }
  st.raw = s.slice(i);
}
const PARSER_DEF = {
  typeName: 'HTMLParser',
  construct: (ctx, args, kwargs) => {
    const convert = kwBool(ctx, kwargs, 'convert_charrefs', args[0], true);
    return {
      __native: PARSER_Q, mod: 'html.parser',
      data: { raw: '', lineno: 1, offset: 0, starttagText: null, cdata: null, convertCharrefs: convert, closed: false },
    };
  },
  repr: () => '<html.parser.HTMLParser object>',
  methods: {
    feed: (ctx, self, args) => {
      const data = args[0];
      if (typeof data !== 'string') { if (ctx.isUnk(data)) return unkRet(ctx, 'feed の引数'); ctx.err('TypeError', 'feed() argument must be str', ''); return NONE; }
      if (self.data.closed) { ctx.err('AssertionError', 'HTMLParser.feed() called after close()', ''); return NONE; }
      self.data.raw += data;
      parseChunk(self.data, false);
      return NONE;
    },
    close: (ctx, self) => {
      parseChunk(self.data, true);
      self.data.closed = true;
      return NONE;
    },
    reset: (ctx, self) => {
      self.data.raw = ''; self.data.lineno = 1; self.data.offset = 0;
      self.data.starttagText = null; self.data.cdata = null; self.data.closed = false;
      return NONE;
    },
    getpos: (ctx, self) => TUPLE([I(self.data.lineno), I(self.data.offset)]),
    get_starttag_text: (ctx, self) => self.data.starttagText === null ? NONE : self.data.starttagText,
    handle_starttag: (ctx, self, args) => NONE,
    handle_endtag: (ctx, self, args) => NONE,
    handle_startendtag: (ctx, self, args) => NONE,
    handle_data: (ctx, self, args) => NONE,
    handle_entityref: (ctx, self, args) => NONE,
    handle_charref: (ctx, self, args) => NONE,
    handle_comment: (ctx, self, args) => NONE,
    handle_decl: (ctx, self, args) => NONE,
    handle_pi: (ctx, self, args) => NONE,
    unknown_decl: (ctx, self, args) => NONE,
  },
};

registerStdlibModule('html.parser', {
  classes: { HTMLParser: PARSER_DEF },
});
export { htmlUnescape };
