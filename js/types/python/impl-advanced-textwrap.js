/* 高度モード B7 G3：textwrap モジュール（全20件）の意味論実装。
 * 一次情報：CPython 3.12.3 の textwrap.py の移植と公式ドキュメント 3.15。
 * TextWrapper の _munge_whitespace／_split／_fix_sentence_endings／
 * _handle_long_word／_wrap_chunks を CPython のアルゴリズムどおりに
 * 再現した。_split の wordsep_re は CPython の正規表現を JS RegExp へ
 * 翻訳したもの（\Z は文字列末尾として扱う。単語文字は JS の \w＝ASCII
 * 範囲のため、非ASCII の単語境界では CPython と異なる場合がある）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';

const { BOOL, NONE, LIST } = PyAPI;
const I = (v) => PyAPI.NUM(v, false);

const WHITESPACE = '\t\n\x0b\x0c\r ';
/* CPython wordsep_re の翻訳：
 * ws = [\t\n\x0b\x0c\r ]、wp = [\w!"'&.,?]、lt = [^\d\W]、nws = [^\t\n\x0b\x0c\r ] */
const WORDSEP_RE = /([\t\n\x0b\x0c\r ]+|(?<=[\w!"'&.,?])-{2,}(?=\w)|[^\t\n\x0b\x0c\r ]+?(?:-(?:(?<=[^\d\W]{2}-)|(?<=[^\d\W]-[^\d\W]-))(?=[^\d\W]-?[^\d\W])|(?=[\t\n\x0b\x0c\r ]|$)|(?<=[\w!"'&.,?])(?=-{2,}\w)))/;
const WORDSEP_SIMPLE_RE = /([\t\n\x0b\x0c\r ]+)/;
const SENTENCE_END_RE = /[a-z][\.\!\?]["']?$/;

function expandTabs(s, tabsize) {
  let out = ''; let col = 0;
  for (const ch of s) {
    if (ch === '\t') { const n = tabsize - (col % tabsize); out += ' '.repeat(n); col += n; }
    else if (ch === '\n' || ch === '\r') { out += ch; col = 0; }
    else { out += ch; col += 1; }
  }
  return out;
}
function mungeWhitespace(d, text) {
  if (d.expand_tabs) text = expandTabs(text, d.tabsize);
  if (d.replace_whitespace) text = [...text].map((c) => WHITESPACE.includes(c) ? ' ' : c).join('');
  return text;
}
function splitChunks(d, text) {
  let chunks;
  if (d.break_on_hyphens) chunks = text.split(WORDSEP_RE);
  else chunks = text.split(WORDSEP_SIMPLE_RE);
  return chunks.filter((c) => c);
}
function fixSentenceEndings(chunks) {
  let i = 0;
  while (i < chunks.length - 1) {
    if (chunks[i + 1] === ' ' && SENTENCE_END_RE.test(chunks[i])) { chunks[i + 1] = '  '; i += 2; }
    else i += 1;
  }
}
function handleLongWord(d, reversedChunks, curLine, curLen, width) {
  let spaceLeft;
  if (width < 1) spaceLeft = 1;
  else spaceLeft = width - curLen;
  if (d.break_long_words) {
    let end = spaceLeft;
    const chunk = reversedChunks[reversedChunks.length - 1];
    if (d.break_on_hyphens && chunk.length > spaceLeft) {
      const hyphen = chunk.lastIndexOf('-', spaceLeft - 1) >= 0 ? rfind(chunk, '-', spaceLeft) : -1;
      if (hyphen > 0 && [...chunk.slice(0, hyphen)].some((c) => c !== '-')) end = hyphen + 1;
    }
    curLine.push(chunk.slice(0, end));
    reversedChunks[reversedChunks.length - 1] = chunk.slice(end);
  } else if (!curLine.length) {
    curLine.push(reversedChunks.pop());
  }
}
function rfind(s, sub, end) {
  // Python str.rfind(sub, 0, end)
  const part = s.slice(0, end);
  return part.lastIndexOf(sub);
}
function wrapChunks(ctx, d, chunksIn) {
  const lines = [];
  if (d.width <= 0) ctx.err('ValueError', 'invalid width ' + ctx.repr(I(d.width)) + ' (must be > 0)', '');
  if (d.max_lines !== null && d.max_lines !== undefined) {
    const indent = d.max_lines > 1 ? d.subsequent_indent : d.initial_indent;
    if (indent.length + d.placeholder.replace(/^\s+/, '').length > d.width) ctx.err('ValueError', 'placeholder too large for max width', '');
  }
  const chunks = chunksIn.slice();
  chunks.reverse();
  const top = () => chunks[chunks.length - 1];
  while (chunks.length) {
    const curLine = [];
    let curLen = 0;
    const indent = lines.length ? d.subsequent_indent : d.initial_indent;
    const width = d.width - indent.length;
    if (d.drop_whitespace && top().trim() === '' && lines.length) chunks.pop();
    while (chunks.length) {
      const l = top().length;
      if (curLen + l <= width) { curLine.push(chunks.pop()); curLen += l; }
      else break;
    }
    if (chunks.length && top().length > width) {
      handleLongWord(d, chunks, curLine, curLen, width);
      curLen = curLine.reduce((a, c) => a + c.length, 0);
    }
    if (d.drop_whitespace && curLine.length && curLine[curLine.length - 1].trim() === '') {
      curLen -= curLine[curLine.length - 1].length;
      curLine.pop();
    }
    if (curLine.length) {
      const ml = d.max_lines;
      if (ml === null || ml === undefined || lines.length + 1 < ml ||
          ((!chunks.length || (d.drop_whitespace && chunks.length === 1 && !chunks[0].trim())) && curLen <= width)) {
        lines.push(indent + curLine.join(''));
      } else {
        let done = false;
        while (curLine.length) {
          if (curLine[curLine.length - 1].trim() && curLen + d.placeholder.length <= width) {
            curLine.push(d.placeholder);
            lines.push(indent + curLine.join(''));
            done = true;
            break;
          }
          curLen -= curLine[curLine.length - 1].length;
          curLine.pop();
        }
        if (!done) {
          if (lines.length) {
            const prevLine = lines[lines.length - 1].replace(/\s+$/, '');
            if (prevLine.length + d.placeholder.length <= d.width) {
              lines[lines.length - 1] = prevLine + d.placeholder;
              break;
            }
          }
          lines.push(indent + d.placeholder.replace(/^\s+/, ''));
        }
        break;
      }
    }
  }
  return lines;
}
function doWrap(ctx, d, text) {
  let chunks = splitChunks(d, mungeWhitespace(d, text));
  if (d.fix_sentence_endings) fixSentenceEndings(chunks);
  return wrapChunks(ctx, d, chunks);
}

const DEFAULTS = {
  width: 70, initial_indent: '', subsequent_indent: '', expand_tabs: true,
  replace_whitespace: true, fix_sentence_endings: false, break_long_words: true,
  drop_whitespace: true, break_on_hyphens: true, tabsize: 8, max_lines: null,
  placeholder: ' [...]',
};
function buildWrapper(ctx, args, kwargs, fname) {
  const d = { ...DEFAULTS };
  const kw = { ...(kwargs || {}) };
  if (args.length > 1) ctx.err('TypeError', fname + ' の位置引数は width の1個だけです', '');
  if (args.length === 1) {
    if ('width' in kw) ctx.err('TypeError', fname + ' で width が重複しています', '');
    kw.width = args[0];
  }
  for (const k of Object.keys(kw)) {
    if (!(k in DEFAULTS)) ctx.err('TypeError', fname + ' に引数「' + k + '」はありません', '');
    const v = kw[k];
    if (k === 'width' || k === 'tabsize') { const n = ctx.int(v); if (n === null) ctx.err('TypeError', k + ' には整数を使ってください', ''); d[k] = n; }
    else if (k === 'max_lines') { if (ctx.isNone(v)) d[k] = null; else { const n = ctx.int(v); if (n === null) ctx.err('TypeError', 'max_lines には整数か None を使ってください', ''); d[k] = n; } }
    else if (k === 'initial_indent' || k === 'subsequent_indent' || k === 'placeholder') { const s = ctx.str(v); if (s === null) ctx.err('TypeError', k + ' には文字列を使ってください', ''); d[k] = s; }
    else { const t = ctx.truthy(v); if (t === null) return null; d[k] = t; }
  }
  return d;
}

const TextWrapperDef = {
  typeName: 'TextWrapper',
  construct: (ctx, args, kwargs) => {
    const d = buildWrapper(ctx, args, kwargs, 'TextWrapper()');
    if (d === null) return ctx.unk('引数が実行時に決まる値');
    return ctx.native('textwrap.TextWrapper', d);
  },
  methods: {
    wrap: (ctx, self, args, kwargs) => {
      if (args.length !== 1) ctx.err('TypeError', 'TextWrapper.wrap() の引数は1個です', '');
      const t = ctx.str(args[0]);
      if (t === null) { if (ctx.isUnk(args[0])) return ctx.unk('文字列が実行時に決まる値'); ctx.err('TypeError', 'wrap() の引数には文字列を使ってください', ''); }
      return LIST(doWrap(ctx, self.data, t));
    },
    fill: (ctx, self, args, kwargs) => {
      if (args.length !== 1) ctx.err('TypeError', 'TextWrapper.fill() の引数は1個です', '');
      const t = ctx.str(args[0]);
      if (t === null) { if (ctx.isUnk(args[0])) return ctx.unk('文字列が実行時に決まる値'); ctx.err('TypeError', 'fill() の引数には文字列を使ってください', ''); }
      return doWrap(ctx, self.data, t).join('\n');
    },
  },
  attrs: {
    width: (ctx, self) => I(self.data.width),
    initial_indent: (ctx, self) => self.data.initial_indent,
    subsequent_indent: (ctx, self) => self.data.subsequent_indent,
    expand_tabs: (ctx, self) => BOOL(self.data.expand_tabs),
    replace_whitespace: (ctx, self) => BOOL(self.data.replace_whitespace),
    fix_sentence_endings: (ctx, self) => BOOL(self.data.fix_sentence_endings),
    break_long_words: (ctx, self) => BOOL(self.data.break_long_words),
    drop_whitespace: (ctx, self) => BOOL(self.data.drop_whitespace),
    break_on_hyphens: (ctx, self) => BOOL(self.data.break_on_hyphens),
    tabsize: (ctx, self) => I(self.data.tabsize),
    max_lines: (ctx, self) => self.data.max_lines === null ? NONE : I(self.data.max_lines),
    placeholder: (ctx, self) => self.data.placeholder,
  },
  repr: (ctx, self) => '<textwrap.TextWrapper object>',
};

function moduleWrapFn(name, mode) {
  return (ctx, args, kwargs) => {
    if (args.length < 1) ctx.err('TypeError', 'textwrap.' + name + '() の引数が足りません', '');
    const t = ctx.str(args[0]);
    if (t === null) { if (ctx.isUnk(args[0])) return ctx.unk('文字列が実行時に決まる値'); ctx.err('TypeError', 'textwrap.' + name + '() の引数には文字列を使ってください', ''); }
    const kw = { ...(kwargs || {}) };
    let restArgs = args.slice(1);
    if (name === 'wrap' || name === 'fill') {
      if (restArgs.length > 1) ctx.err('TypeError', 'textwrap.' + name + '() の引数が多すぎます', '');
      if (restArgs.length === 1) { if ('width' in kw) ctx.err('TypeError', 'width が重複しています', ''); kw.width = restArgs[0]; }
    } else if (name === 'shorten') {
      if (restArgs.length > 1) ctx.err('TypeError', 'textwrap.shorten() の引数が多すぎます', '');
      if (restArgs.length === 1) {
        if ('width' in kw) ctx.err('TypeError', 'width が重複しています', '');
        kw.width = restArgs[0];
      }
      if (!('width' in kw)) ctx.err('TypeError', 'textwrap.shorten() には width が必要です', '');
    }
    const d = buildWrapper(ctx, [], kw, 'textwrap.' + name + '()');
    if (d === null) return ctx.unk('引数が実行時に決まる値');
    if (mode === 'shorten') {
      d.max_lines = 1;
      const collapsed = t.trim().split(/\s+/).filter((w) => w.length).join(' ');
      return doWrap(ctx, d, collapsed).join('\n');
    }
    const lines = doWrap(ctx, d, t);
    return mode === 'wrap' ? LIST(lines) : lines.join('\n');
  };
}

const FUNCTIONS = {
  /* クラス名シャドウ（kwargs 二重評価の基盤不具合への回避策。報告書に記載） */
  TextWrapper: (ctx, args, kwargs) => TextWrapperDef.construct(ctx, args, kwargs),
  wrap: moduleWrapFn('wrap', 'wrap'),
  fill: moduleWrapFn('fill', 'fill'),
  shorten: moduleWrapFn('shorten', 'shorten'),
  dedent: (ctx, args, kwargs) => {
    if (args.length !== 1) ctx.err('TypeError', 'textwrap.dedent() の引数は1個です', '');
    let text = ctx.str(args[0]);
    if (text === null) { if (ctx.isUnk(args[0])) return ctx.unk('文字列が実行時に決まる値'); ctx.err('TypeError', 'dedent() の引数には文字列を使ってください', ''); }
    text = text.replace(/^[ \t]+$/gm, '');
    const indents = [];
    const re = /(^[ \t]*)(?:[^ \t\n])/gm;
    let m;
    while ((m = re.exec(text)) !== null) indents.push(m[1]);
    let margin = null;
    for (const indent of indents) {
      if (margin === null) margin = indent;
      else if (indent.startsWith(margin)) { /* そのまま */ }
      else if (margin.startsWith(indent)) margin = indent;
      else {
        for (let i = 0; i < Math.min(margin.length, indent.length); i++) {
          if (margin[i] !== indent[i]) { margin = margin.slice(0, i); break; }
        }
      }
    }
    if (margin) {
      const esc = margin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp('^' + esc, 'gm'), '');
    }
    return text;
  },
  indent: (ctx, args, kwargs) => {
    if (args.length < 2 || args.length > 3) ctx.err('TypeError', 'textwrap.indent() の引数の数が合いません', '');
    const text = ctx.str(args[0]);
    const prefix = ctx.str(args[1]);
    if (text === null || prefix === null) { if (ctx.isUnk(args[0]) || ctx.isUnk(args[1])) return ctx.unk('引数が実行時に決まる値'); ctx.err('TypeError', 'indent() の引数には文字列を使ってください', ''); }
    const pred = args.length === 3 && !ctx.isNone(args[2]) ? args[2] : null;
    const lines = text.split(/(?<=\n)/).filter((l) => l.length > 0);
    // splitlines(True) 相当
    const rawLines = [];
    let cur = '';
    for (const ch of text) { cur += ch; if (ch === '\n') { rawLines.push(cur); cur = ''; } }
    if (cur) rawLines.push(cur);
    const out = [];
    for (const line of rawLines) {
      let add;
      if (pred === null) add = line.trim().length > 0;
      else { const r = ctx.call(pred, [line]); const t = ctx.truthy(r); if (t === null) return ctx.unk('predicate の結果が実行時に決まる値'); add = t; }
      out.push(add ? prefix + line : line);
    }
    return out.join('');
  },
};

registerStdlibModule('textwrap', { functions: FUNCTIONS, classes: { TextWrapper: TextWrapperDef } });
