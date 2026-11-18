// 高度モード B7 G3: re モジュール
// Python 正規表現を JS RegExp へ翻訳して実装する（F-16: 個別実装）。
// 翻訳できない構文（条件パターン・原子グループ・possessive 量指定子・
// \N{...} 名前参照）は黙って別意味にせず、未対応エラーで停止する。
// 意味論の裏付け: CPython 3.12.3 実走 + 公式ドキュメント 3.15。
import { PyAPI } from './engine.js';
import { registerStdlibModule, registerStdlibException } from './stdlib-registry.js';

/* 例外種別名はクラス登録名 'PatternError' に統一する（type 名の表示と
 * except 照合を CPython 3.15 の PatternError に合わせるため）。 */

const { NUM, BOOL, NONE, LIST, TUPLE, DICT, UNK, dictSet } = PyAPI;

const I = (n) => NUM(Math.trunc(n));
const FLAG_BITS = { A: 256, U: 32, L: 4, I: 2, M: 8, S: 16, X: 64, DEBUG: 128 };
const WORD_CHARS = '\\p{L}\\p{M}\\p{N}\\p{Pc}';

function perr(msg, pos) { return { __perr: true, msg, pos }; }
function unsupportedErr(msg) { return { __unsupported: true, msg }; }
function valueErr(msg) { return { __verr: true, msg }; }

class Translator {
  constructor(src, base) {
    this.src = src;
    this.pos = 0;
    this.base = base; // {i,m,s,x,ascii} compile() 引数由来
    this.groupCount = 0;
    this.groupNames = new Map(); // name -> index
    this.groupOpenPos = new Map(); // index -> pos
    this.refs = []; // {num, pos}
    this.namedRefs = [];
    this.globalFlags = { ...base }; // 先頭の (?...) で更新される
    this.sawToken = false;
  }
  eof() { return this.pos >= this.src.length; }
  peek(k = 0) { return this.src[this.pos + k]; }
  error(msg, pos) { throw perr(msg, pos === undefined ? this.pos : pos); }

  skipVerbose(st) {
    if (!st.x) return;
    for (;;) {
      const c = this.peek();
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') { this.pos += 1; continue; }
      if (c === '#') { while (!this.eof() && this.peek() !== '\n') this.pos += 1; continue; }
      break;
    }
  }

  parse() {
    const st = { ...this.globalFlags };
    const body = this.parseAlternation(st, true);
    if (!this.eof()) {
      if (this.peek() === ')') this.error('unbalanced parenthesis', this.pos);
      this.error('unexpected character', this.pos);
    }
    for (const r of this.refs) {
      const openPos = this.groupOpenPos.get(r.num);
      if (openPos === undefined || openPos > r.pos) this.error('invalid group reference ' + r.num, r.pos);
    }
    return body;
  }

  parseAlternation(st, top = false) {
    const branches = [this.parseBranch(st, top)];
    while (this.peek() === '|') { this.pos += 1; branches.push(this.parseBranch(st, top)); }
    return branches.join('|');
  }

  parseBranch(st, top) {
    let out = '';
    for (;;) {
      this.skipVerbose(st);
      if (this.eof()) break;
      const c = this.peek();
      if (c === '|' || c === ')') break;
      out += this.parsePiece(st, top);
      this.sawToken = true;
    }
    return out;
  }

  parsePiece(st, top) {
    this.skipVerbose(st);
    const c = this.peek();
    if (c === '*' || c === '+' || c === '?') this.error('nothing to repeat', this.pos);
    if (c === '{' && this.tryBraceQuantifier(true) !== null) this.error('nothing to repeat', this.pos);
    const atom = this.parseAtom(st, top);
    let out = atom.src;
    // 量指定子
    for (;;) {
      this.skipVerbose(st);
      const q = this.peek();
      let quant = null;
      if (q === '*' || q === '+' || q === '?') { quant = q; this.pos += 1; }
      else if (q === '{') {
        const bq = this.tryBraceQuantifier(false);
        if (bq !== null) quant = bq;
      }
      if (quant === null) break;
      if (!atom.quantifiable) this.error('nothing to repeat', this.pos);
      out += quant;
      // lazy / possessive
      const n = this.peek();
      if (n === '?') { out += '?'; this.pos += 1; }
      else if (n === '+') throw unsupportedErr('possessive 量指定子（' + quant + '+）は本アプリの re では未対応です');
      // multiple repeat チェック
      const after = this.peek();
      if (after === '*' || after === '+' || after === '?') this.error('multiple repeat', this.pos);
      if (after === '{' && this.tryBraceQuantifier(true) !== null) this.error('multiple repeat', this.pos);
      break;
    }
    return out;
  }

  // {n} {n,} {n,m} を量指定子として解釈できれば JS 文字列を返す。
  // peekOnly=true のときは消費しない。解釈できなければ null。
  tryBraceQuantifier(peekOnly) {
    const save = this.pos;
    const m = /^\{(\d+)(,(\d*))?\}/.exec(this.src.slice(this.pos, this.pos + 24));
    if (!m) return null;
    const lo = parseInt(m[1], 10);
    if (m[2] !== undefined && m[3] !== '' && m[3] !== undefined) {
      const hi = parseInt(m[3], 10);
      // CPython の pos は '{' の次の桁位置（3.12.3 実走で照合。B7 R2 で是正）。
      if (lo > hi) this.error('min repeat greater than max repeat', save + 1);
    }
    if (!peekOnly) this.pos += m[0].length;
    return m[0];
  }

  parseAtom(st, top) {
    const c = this.peek();
    const startPos = this.pos;
    if (c === '(') return this.parseGroup(st, top);
    if (c === '[') return { src: this.parseClass(st), quantifiable: true };
    if (c === '.') { this.pos += 1; return { src: st.s ? '[\\s\\S]' : '[^\\n]', quantifiable: true }; }
    if (c === '^') { this.pos += 1; return { src: '^', quantifiable: false }; }
    if (c === '$') { this.pos += 1; return { src: st.m ? '$' : '(?=\\n?$)', quantifiable: false }; }
    if (c === '\\') return this.parseEscape(st, false);
    if (c === '{') { this.pos += 1; return { src: '\\{', quantifiable: true }; }
    if (c === '}') { this.pos += 1; return { src: '\\}', quantifiable: true }; }
    if (c === ']') { this.pos += 1; return { src: '\\]', quantifiable: true }; }
    this.pos += 1;
    return { src: c, quantifiable: true };
  }

  parseGroup(st, top) {
    const startPos = this.pos;
    this.pos += 1; // '('
    if (this.peek() !== '?') {
      this.groupCount += 1;
      this.groupOpenPos.set(this.groupCount, startPos);
      const inner = this.parseAlternation(st);
      this.expectClose(startPos);
      return { src: '(' + inner + ')', quantifiable: true };
    }
    this.pos += 1; // '?'
    const c = this.peek();
    if (c === 'P') {
      this.pos += 1;
      if (this.peek() === '<') {
        this.pos += 1;
        const nameStart = this.pos;
        while (!this.eof() && this.peek() !== '>') this.pos += 1;
        if (this.eof()) this.error('missing >, unterminated name', nameStart - 2);
        const name = this.src.slice(nameStart, this.pos);
        this.pos += 1; // '>'
        if (!/^[^\W\d]\w*$/.test(name) || name.length === 0) {
          const bad = name.length ? [...name].findIndex((ch) => !/\w/.test(ch) || (name.indexOf(ch) === 0 && /\d/.test(ch))) : 0;
          this.error("bad character in group name '" + name + "'", nameStart + Math.max(0, bad));
        }
        if (this.groupNames.has(name)) {
          // CPython の pos はグループ名の先頭位置（3.12.3 実走で照合。B7 R2 で是正）。
          this.error("redefinition of group name '" + name + "' as group " + (this.groupCount + 1) + '; was group ' + this.groupNames.get(name), nameStart);
        }
        this.groupCount += 1;
        this.groupNames.set(name, this.groupCount);
        this.groupOpenPos.set(this.groupCount, startPos);
        const inner = this.parseAlternation(st);
        this.expectClose(startPos);
        return { src: '(?<' + name + '>' + inner + ')', quantifiable: true };
      }
      if (this.peek() === '=') {
        this.pos += 1;
        const nameStart = this.pos;
        while (!this.eof() && this.peek() !== ')') this.pos += 1;
        if (this.eof()) this.error('missing ), unterminated name', nameStart);
        const name = this.src.slice(nameStart, this.pos);
        this.pos += 1;
        if (!this.groupNames.has(name)) this.error("unknown group name '" + name + "'", nameStart);
        this.namedRefs.push(name);
        return { src: '\\k<' + name + '>', quantifiable: true };
      }
      this.error('unknown extension ?P', startPos + 2);
    }
    if (c === ':') { this.pos += 1; const inner = this.parseAlternation(st); this.expectClose(startPos); return { src: '(?:' + inner + ')', quantifiable: true }; }
    if (c === '=') { this.pos += 1; const inner = this.parseAlternation(st); this.expectClose(startPos); return { src: '(?=' + inner + ')', quantifiable: false }; }
    if (c === '!') { this.pos += 1; const inner = this.parseAlternation(st); this.expectClose(startPos); return { src: '(?!' + inner + ')', quantifiable: false }; }
    if (c === '<') {
      const n = this.peek(1);
      if (n === '=' || n === '!') {
        this.pos += 2;
        const inner = this.parseAlternation(st); this.expectClose(startPos);
        return { src: '(?' + '<' + n + inner + ')', quantifiable: false };
      }
      this.error('unknown extension ?<', startPos + 2);
    }
    if (c === '#') {
      while (!this.eof() && this.peek() !== ')') this.pos += 1;
      if (this.eof()) this.error('missing ), unterminated comment', startPos);
      this.pos += 1;
      return { src: '', quantifiable: false };
    }
    if (c === '(') throw unsupportedErr('条件パターン (?(...)...) は本アプリの re では未対応です');
    if (c === '>') throw unsupportedErr('原子グループ (?>...) は本アプリの re では未対応です');
    if (c && /[aiLmsux-]/.test(c)) {
      // フラグ系
      let j = this.pos;
      let letters = '';
      while (j < this.src.length && /[aiLmsux-]/.test(this.src[j])) { letters += this.src[j]; j += 1; }
      const after = this.src[j];
      if (after === ':') {
        this.pos = j + 1;
        const nst = this.applyFlags(st, letters, startPos);
        const inner = this.parseAlternation(nst);
        this.expectClose(startPos);
        const jsFlags = jsModifierString(st, nst);
        return { src: jsFlags ? '(?' + jsFlags + ':' + inner + ')' : '(?:' + inner + ')', quantifiable: true };
      }
      if (after === ')') {
        if (top && !this.sawToken && this.groupOpenPos.size === 0) {
          this.pos = j + 1;
          const nst = this.applyFlags(this.globalFlags, letters, startPos);
          Object.assign(this.globalFlags, nst);
          // 以降の解析は globalFlags から作り直した st で行う必要があるが、
          // 呼び出し側（parseBranch の st）はコピー済み。先頭フラグは
          // parse() 冒頭でのみ現れるため、ここでは globalFlags の更新と
          // 現在の st への反映を両方行う。
          Object.assign(st, nst);
          return { src: '', quantifiable: false };
        }
        this.error('global flags not at the start of the expression', startPos);
      }
      this.error('bad inline flags', startPos + 2);
    }
    this.error('unknown extension ?' + (c || ''), startPos + 2);
  }

  applyFlags(st, letters, pos) {
    const nst = { ...st };
    let neg = false;
    for (const ch of letters) {
      if (ch === '-') { neg = true; continue; }
      const on = !neg;
      switch (ch) {
        case 'i': nst.i = on; break;
        case 'm': nst.m = on; break;
        case 's': nst.s = on; break;
        case 'x': nst.x = on; break;
        case 'a': if (on) { nst.ascii = true; } else { nst.ascii = false; } break;
        case 'u': if (on) { nst.ascii = false; } break;
        case 'L': throw valueErr('cannot use LOCALE flag with a str pattern');
        default: this.error('bad inline flags', pos);
      }
    }
    return nst;
  }

  expectClose(startPos) {
    if (this.peek() !== ')') this.error('missing ), unterminated subpattern', startPos);
    this.pos += 1;
  }

  classEscapeSource(st, letter, inClass) {
    const neg = letter === 'D' || letter === 'S' || letter === 'W';
    const kind = letter.toLowerCase();
    if (inClass && neg) throw unsupportedErr('文字クラス内の \\' + letter + ' は本アプリの re では未対応です');
    if (st.ascii) {
      if (kind === 'd') return '\\d';
      if (kind === 's') return inClass ? '\\t\\n\\f\\r\\v ' : '[\\t\\n\\f\\r\\v ]';
      if (kind === 'w') return '\\w';
      return '\\d';
    }
    if (kind === 'd') return '\\p{Nd}';
    if (kind === 's') return inClass ? '\\p{White_Space}\\x1c-\\x1f' : '[\\p{White_Space}\\x1c-\\x1f]';
    if (kind === 'w') return inClass ? WORD_CHARS : '[' + WORD_CHARS + ']';
    return '';
  }

  negatedClassEscape(st, letter) {
    const kind = letter.toLowerCase();
    if (st.ascii) {
      if (kind === 'd') return '[^\\d]';
      if (kind === 's') return '[^\\t\\n\\f\\r\\v ]';
      return '[^\\w]';
    }
    if (kind === 'd') return '[^\\p{Nd}]';
    if (kind === 's') return '[^\\p{White_Space}\\x1c-\\x1f]';
    return '[^' + WORD_CHARS + ']';
  }

  parseEscape(st, inClass) {
    const startPos = this.pos;
    this.pos += 1; // '\'
    if (this.eof()) this.error('bad escape (end of pattern)', startPos);
    const c = this.peek();
    this.pos += 1;
    const quantifiable = !inClass;
    if (!inClass) {
      if (c === 'A') return { src: '(?<![\\s\\S])', quantifiable: false };
      if (c === 'Z') return { src: '(?![\\s\\S])', quantifiable: false };
      if (c === 'b') {
        if (st.ascii) return { src: '\\b', quantifiable: false };
        return { src: '(?:(?<=[' + WORD_CHARS + '])(?![' + WORD_CHARS + '])|(?<![' + WORD_CHARS + '])(?=[' + WORD_CHARS + ']))', quantifiable: false };
      }
      if (c === 'B') {
        if (st.ascii) return { src: '\\B', quantifiable: false };
        return { src: '(?:(?<=[' + WORD_CHARS + '])(?=[' + WORD_CHARS + '])|(?<![' + WORD_CHARS + '])(?![' + WORD_CHARS + ']))', quantifiable: false };
      }
    } else {
      if (c === 'b') return '\\x08';
      if (c === 'A' || c === 'Z' || c === 'B') this.error('bad escape \\' + c, startPos);
    }
    if (c === 'd' || c === 's' || c === 'w') return inClass ? this.classEscapeSource(st, c, true) : { src: this.classEscapeSource(st, c, false), quantifiable };
    if (c === 'D' || c === 'S' || c === 'W') {
      if (inClass) throw unsupportedErr('文字クラス内の \\' + c + ' は本アプリの re では未対応です');
      return { src: this.negatedClassEscape(st, c), quantifiable };
    }
    if (c === 'x') {
      const hex = this.src.slice(this.pos, this.pos + 2);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) this.error('incomplete escape \\x', startPos);
      this.pos += 2;
      return inClass ? '\\x' + hex : { src: '\\x' + hex, quantifiable };
    }
    if (c === 'u') {
      const hex = this.src.slice(this.pos, this.pos + 4);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.error('incomplete escape \\u', startPos);
      this.pos += 4;
      return inClass ? '\\u' + hex : { src: '\\u' + hex, quantifiable };
    }
    if (c === 'U') {
      const hex = this.src.slice(this.pos, this.pos + 8);
      if (!/^[0-9a-fA-F]{8}$/.test(hex)) this.error('incomplete escape \\U', startPos);
      this.pos += 8;
      const cp = parseInt(hex, 16);
      if (cp > 0x10FFFF) this.error('bad escape \\U' + hex, startPos);
      const esc = '\\u{' + cp.toString(16) + '}';
      return inClass ? esc : { src: esc, quantifiable };
    }
    if (c === 'N') {
      if (this.peek() === '{') throw unsupportedErr('\\N{...}（Unicode 名参照）は Unicode 名データベースが無いため未対応です');
      this.error('bad escape \\N', startPos);
    }
    if (c >= '0' && c <= '9') {
      // 8進数 or グループ参照
      let digits = c;
      while (digits.length < 3 && !this.eof() && this.peek() >= '0' && this.peek() <= '9') { digits += this.peek(); this.pos += 1; }
      if (c === '0' || digits.length === 3) {
        const val = parseInt(digits, 8);
        if (val > 0o377) this.error('octal escape value \\' + digits + ' outside of range 0-0o377', startPos);
        const esc = '\\x' + val.toString(16).padStart(2, '0');
        return inClass ? esc : { src: esc, quantifiable };
      }
      const num = parseInt(digits, 10);
      if (!inClass) {
        this.refs.push({ num, pos: startPos });
        return { src: '\\' + num, quantifiable };
      }
      const esc = '\\x' + parseInt(digits, 8).toString(16).padStart(2, '0');
      return esc;
    }
    const simple = { a: '\\x07', f: '\\f', n: '\\n', r: '\\r', t: '\\t', v: '\\x0b' };
    if (simple[c]) return inClass ? simple[c] : { src: simple[c], quantifiable };
    if (/[a-zA-Z]/.test(c)) this.error('bad escape \\' + c, startPos);
    // 記号のエスケープ
    if ('^$\\.*+?()[]{}|/'.includes(c)) return inClass ? '\\' + c : { src: '\\' + c, quantifiable };
    return inClass ? c : { src: c, quantifiable };
  }

  parseClass(st) {
    const startPos = this.pos;
    this.pos += 1; // '['
    let negated = false;
    if (this.peek() === '^') { negated = true; this.pos += 1; }
    const items = [];
    let first = true;
    const readAtom = () => {
      const c = this.peek();
      if (c === '\\') {
        const r = this.parseEscape(st, true);
        let single = null;
        const xm = /^\\x([0-9a-fA-F]{2})$/.exec(r);
        const simpleMap = { '\\n': '\n', '\\t': '\t', '\\r': '\r', '\\f': '\f', '\\v': '\x0b' };
        if (xm) single = String.fromCharCode(parseInt(xm[1], 16));
        else if (simpleMap[r] !== undefined) single = simpleMap[r];
        else if (r.length === 1) single = r;
        else if (r.length === 2 && r[0] === '\\' && !/[a-zA-Z0-9]/.test(r[1])) single = r[1];
        else if (/^\\u[0-9a-fA-F]{4}$/.test(r)) single = String.fromCharCode(parseInt(r.slice(2), 16));
        return { src: r, single };
      }
      this.pos += 1;
      if (c === '[' || c === ']' || c === '\\') return { src: '\\' + c, single: c };
      if (c === '^' && items.length === 0 && !first) return { src: '\\^', single: c };
      return { src: c, single: c };
    };
    for (;;) {
      if (this.eof()) this.error('unterminated character set', startPos);
      const c = this.peek();
      if (c === ']' && !first) { this.pos += 1; break; }
      if (c === ']' && first) { /* 最初の ] はリテラル */ }
      first = false;
      const atomPos = this.pos;
      const a1 = readAtom();
      if (this.peek() === '-' && this.peek(1) !== ']' && this.peek(1) !== undefined) {
        if (a1.single === null) this.error('bad character range', atomPos);
        this.pos += 1; // '-'
        const a2 = readAtom();
        if (a2.single === null) this.error('bad character range', atomPos);
        if (a1.single > a2.single) this.error('bad character range ' + a1.single + '-' + a2.single, atomPos);
        items.push(escapeClassChar(a1.single) + '-' + escapeClassChar(a2.single));
        continue;
      }
      items.push(a1.src);
    }
    return '[' + (negated ? '^' : '') + items.join('') + ']';
  }
}
function escapeClassChar(ch) {
  if ('[]\\^-'.includes(ch)) return '\\' + ch;
  const code = ch.codePointAt(0);
  if (code < 0x20 || code === 0x7f) return '\\x' + code.toString(16).padStart(2, '0');
  return ch;
}
function jsModifierString(oldSt, newSt) {
  const on = [], off = [];
  for (const k of ['i', 'm', 's']) {
    if (newSt[k] && !oldSt[k]) on.push(k);
    if (!newSt[k] && oldSt[k]) off.push(k);
  }
  if (!on.length && !off.length) return '';
  return on.join('') + (off.length ? '-' + off.join('') : '');
}

/* ---------- PatternError の属性（B7 R2：例外属性チャンネルで配線） ---------- */
/* CPython の PatternError は msg／pattern／pos を持ち、lineno／colno は
 * pos から導出される（pos が None のときは lineno／colno も None）。
 * pos はコードポイント単位の位置（Translator の pos は JS 文字列の
 * UTF-16 インデックスなので、ここでコードポイント数へ換算する）。 */
function patternErrorAttrs(patternStr, msg, posUnits) {
  if (posUnits === null || posUnits === undefined) {
    return { msg, pattern: patternStr, pos: NONE, lineno: NONE, colno: NONE };
  }
  const upto = [...patternStr.slice(0, posUnits)];
  const pos = upto.length;
  let lineno = 1, lastNl = -1;
  upto.forEach((ch, idx) => { if (ch === '\n') { lineno++; lastNl = idx; } });
  return { msg, pattern: patternStr, pos: I(pos), lineno: I(lineno), colno: I(pos - lastNl) };
}
function raisePatternError(ctx, patternStr, msg, posUnits) {
  const attrs = patternErrorAttrs(patternStr, msg, posUnits);
  const pos = attrs.pos === NONE ? null : attrs.pos.v;
  const text = pos === null ? msg : msg + ' at position ' + pos;
  ctx.errAttrs('PatternError', text, attrs, '');
}

/* ---------- コンパイル ---------- */
function compilePattern(ctx, patternStr, flagsInt) {
  if (flagsInt & FLAG_BITS.L) ctx.err('ValueError', 'cannot use LOCALE flag with a str pattern', 'LOCALE は bytes パターン専用です');
  if ((flagsInt & FLAG_BITS.A) && (flagsInt & FLAG_BITS.U)) ctx.err('ValueError', 'ASCII and UNICODE flags are incompatible', '');
  const base = {
    i: !!(flagsInt & FLAG_BITS.I), m: !!(flagsInt & FLAG_BITS.M), s: !!(flagsInt & FLAG_BITS.S),
    x: !!(flagsInt & FLAG_BITS.X), ascii: !!(flagsInt & FLAG_BITS.A),
  };
  const tr = new Translator(patternStr, base);
  let jsSource;
  try {
    jsSource = tr.parse();
  } catch (e) {
    if (e && e.__perr) {
      raisePatternError(ctx, patternStr, e.msg, e.pos);
    }
    if (e && e.__unsupported) ctx.err('未対応', e.msg, '');
    if (e && e.__verr) ctx.err('ValueError', e.msg, '');
    throw e;
  }
  const gf = tr.globalFlags;
  let flags = flagsInt | (gf.ascii ? 0 : FLAG_BITS.U);
  if (gf.ascii) flags &= ~FLAG_BITS.U;
  if (gf.i) flags |= FLAG_BITS.I; if (gf.m) flags |= FLAG_BITS.M; if (gf.s) flags |= FLAG_BITS.S; if (gf.x) flags |= FLAG_BITS.X;
  let jsFlags = 'ud';
  if (gf.i) jsFlags += 'i';
  if (gf.m) jsFlags += 'm';
  if (gf.s) jsFlags += 's';
  const data = {
    src: patternStr, flags, jsSource, jsFlags,
    groups: tr.groupCount, groupindex: Object.fromEntries(tr.groupNames),
  };
  try {
    new RegExp(jsSource, jsFlags);
  } catch (e) {
    // 翻訳結果の不正は CPython に対応するエラー位置が無いため pos は None。
    raisePatternError(ctx, patternStr, '正規表現の翻訳結果が不正です: ' + e.message, null);
  }
  return data;
}
function makePatternNative(ctx, data) {
  return ctx.native('re.Pattern', data);
}
function patternDataOf(ctx, v, fname) {
  if (typeof v === 'string') return compilePattern(ctx, v, 0);
  if (v && v.__native === 're.Pattern') return v.data;
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', fname + ' の第1引数には文字列か Pattern を使ってください', '');
  return null;
}

/* ---------- マッチ実行 ---------- */
function execOnce(ctx, data, str, pos, endpos, mode) {
  const sliced = str.slice(0, endpos);
  let re, m;
  if (mode === 'search') {
    re = new RegExp(data.jsSource, data.jsFlags + 'g');
    re.lastIndex = pos;
    m = re.exec(sliced);
  } else {
    const source = mode === 'fullmatch' ? '(?:' + data.jsSource + ')(?![\\s\\S])' : data.jsSource;
    re = new RegExp(source, data.jsFlags + 'y');
    re.lastIndex = pos;
    m = re.exec(sliced);
    if (m && m.index !== pos) m = null;
  }
  if (!m) return null;
  return m;
}
function makeMatch(ctx, data, strVal, jsMatch, pos, endpos) {
  return ctx.native('re.Match', {
    pat: data, str: strVal, m: jsMatch, pos, endpos,
  });
}
function matchFromExec(ctx, data, strVal, jsMatch, pos, endpos) {
  return makeMatch(ctx, data, strVal, jsMatch, pos, endpos);
}
// finditer の走査（CPython 3.7+ の空マッチ規則）
function scanMatches(ctx, data, str, pos, endpos) {
  const out = [];
  let cur = pos;
  let bannedEmptyAt = -1;
  const len = endpos;
  while (cur <= len) {
    const m = execOnce(ctx, data, str, cur, endpos, 'search');
    if (!m) break;
    const start = m.index, end = m.index + m[0].length;
    if (start === end && start === bannedEmptyAt) {
      // 直前の空マッチと同じ位置の空マッチは採用しない
      cur = start + 1;
      bannedEmptyAt = -1;
      continue;
    }
    out.push(makeMatch(ctx, data, str, m, pos, endpos));
    if (start === end) { bannedEmptyAt = end; cur = end; }
    else { bannedEmptyAt = -1; cur = end; }
  }
  return out;
}
function groupValue(jsMatch, i) {
  const v = jsMatch[i];
  return v === undefined ? NONE : v;
}
function spanOf(jsMatch, i) {
  const idx = jsMatch.indices;
  if (!idx || !idx[i]) return [-1, -1];
  return idx[i];
}
function resolveGroupIndex(ctx, data, g) {
  if (typeof g === 'string') {
    if (Object.prototype.hasOwnProperty.call(data.groupindex, g)) return data.groupindex[g];
    ctx.err('IndexError', 'unknown group name \'' + g + '\'', '');
  }
  const n = ctx.int(g);
  if (n === null) { if (ctx.isUnk(g)) return null; ctx.err('TypeError', 'グループには番号か名前を使ってください', ''); }
  if (n < 0 || n > data.groups) ctx.err('IndexError', 'no such group', '');
  return n;
}

/* ---------- 置換テンプレート ---------- */
function processRepl(ctx, data, repl, jsMatch) {
  let out = '';
  let i = 0;
  const s = repl;
  while (i < s.length) {
    const c = s[i];
    if (c !== '\\') { out += c; i += 1; continue; }
    i += 1;
    if (i >= s.length) raisePatternError(ctx, s, 'bad escape (end of pattern)', i - 1);
    const ch = s[i];
    if (ch === 'g') {
      if (s[i + 1] !== '<') raisePatternError(ctx, s, 'missing <', i + 1);
      const close = s.indexOf('>', i + 2);
      if (close < 0) raisePatternError(ctx, s, 'missing >, unterminated name', i + 2);
      const name = s.slice(i + 2, close);
      let idx;
      if (/^\d+$/.test(name)) {
        idx = parseInt(name, 10);
        if (idx > data.groups) ctx.err('IndexError', 'invalid group reference ' + idx + ' at position ' + (i - 1), '');
      } else {
        if (!Object.prototype.hasOwnProperty.call(data.groupindex, name)) ctx.err('IndexError', 'unknown group name \'' + name + '\'', '');
        idx = data.groupindex[name];
      }
      const v = jsMatch[idx];
      out += v === undefined ? '' : v;
      i = close + 1;
      continue;
    }
    if (ch >= '1' && ch <= '9') {
      let numStr = ch;
      if (i + 1 < s.length && s[i + 1] >= '0' && s[i + 1] <= '9' && parseInt(ch + s[i + 1], 10) <= data.groups) { numStr = ch + s[i + 1]; i += 1; }
      const idx = parseInt(numStr, 10);
      if (idx > data.groups) ctx.err('IndexError', 'invalid group reference ' + idx + ' at position ' + (i - 1), '');
      const v = jsMatch[idx];
      out += v === undefined ? '' : v;
      i += 1;
      continue;
    }
    const simple = { n: '\n', t: '\t', r: '\r', f: '\f', v: '\v', a: '\x07', '\\': '\\' };
    if (simple[ch] !== undefined) { out += simple[ch]; i += 1; continue; }
    if (/[a-zA-Z]/.test(ch)) raisePatternError(ctx, s, 'bad escape \\' + ch, i - 1);
    out += ch;
    i += 1;
  }
  return out;
}

/* ---------- Pattern / Match クラス ---------- */
function posEndpos(ctx, args, kwargs, data) {
  const kw = kwargs || {};
  const posV = args.length > 1 ? args[1] : kw.pos;
  const endV = args.length > 2 ? args[2] : kw.endpos;
  const pos = posV === undefined ? 0 : ctx.int(posV);
  const endpos = endV === undefined ? null : ctx.int(endV);
  if (pos === null || (endV !== undefined && endpos === null)) ctx.err('TypeError', 'pos/endpos には整数を使ってください', '');
  return [pos, endpos];
}
function strArg(ctx, v, fname) {
  const s = ctx.str(v);
  if (s === null) {
    if (ctx.isUnk(v)) return null;
    ctx.err('TypeError', fname + ' には文字列を使ってください', '');
  }
  return s;
}
const PatternDef = {
  typeName: 'Pattern',
  methods: {
    match: (ctx, self, args, kwargs) => {
      const s = strArg(ctx, args[0], 'Pattern.match()');
      if (s === null) return ctx.unk('文字列が実行時に決まる値');
      const [pos, endpos] = posEndpos(ctx, args, kwargs);
      const m = execOnce(ctx, self.data, s, pos, endpos === null ? [...s].length : endpos, 'match');
      return m ? matchFromExec(ctx, self.data, args[0], m, pos, endpos === null ? [...s].length : endpos) : NONE;
    },
    prefixmatch: (ctx, self, args, kwargs) => {
      const s = strArg(ctx, args[0], 'Pattern.prefixmatch()');
      if (s === null) return ctx.unk('文字列が実行時に決まる値');
      const [pos, endpos] = posEndpos(ctx, args, kwargs);
      const m = execOnce(ctx, self.data, s, pos, endpos === null ? [...s].length : endpos, 'match');
      return m ? matchFromExec(ctx, self.data, args[0], m, pos, endpos === null ? [...s].length : endpos) : NONE;
    },
    search: (ctx, self, args, kwargs) => {
      const s = strArg(ctx, args[0], 'Pattern.search()');
      if (s === null) return ctx.unk('文字列が実行時に決まる値');
      const [pos, endpos] = posEndpos(ctx, args, kwargs);
      const m = execOnce(ctx, self.data, s, pos, endpos === null ? [...s].length : endpos, 'search');
      return m ? matchFromExec(ctx, self.data, args[0], m, pos, endpos === null ? [...s].length : endpos) : NONE;
    },
    fullmatch: (ctx, self, args, kwargs) => {
      const s = strArg(ctx, args[0], 'Pattern.fullmatch()');
      if (s === null) return ctx.unk('文字列が実行時に決まる値');
      const [pos, endpos] = posEndpos(ctx, args, kwargs);
      const m = execOnce(ctx, self.data, s, pos, endpos === null ? [...s].length : endpos, 'fullmatch');
      return m ? matchFromExec(ctx, self.data, args[0], m, pos, endpos === null ? [...s].length : endpos) : NONE;
    },
    finditer: (ctx, self, args, kwargs) => {
      const s = strArg(ctx, args[0], 'Pattern.finditer()');
      if (s === null) return ctx.unk('文字列が実行時に決まる値');
      const [pos, endpos] = posEndpos(ctx, args, kwargs);
      return LIST(scanMatches(ctx, self.data, s, pos, endpos === null ? [...s].length : endpos));
    },
    findall: (ctx, self, args, kwargs) => {
      const s = strArg(ctx, args[0], 'Pattern.findall()');
      if (s === null) return ctx.unk('文字列が実行時に決まる値');
      const [pos, endpos] = posEndpos(ctx, args, kwargs);
      const matches = scanMatches(ctx, self.data, s, pos, endpos === null ? [...s].length : endpos);
      return LIST(matches.map((mv) => findallItem(ctx, self.data, mv.data.m)));
    },
    split: (ctx, self, args, kwargs) => {
      const s = strArg(ctx, args[0], 'Pattern.split()');
      if (s === null) return ctx.unk('文字列が実行時に決まる値');
      const kw = kwargs || {};
      const maxV = args.length > 1 ? args[1] : kw.maxsplit;
      const maxsplit = maxV === undefined ? 0 : ctx.int(maxV);
      if (maxsplit === null) ctx.err('TypeError', 'maxsplit には整数を使ってください', '');
      return LIST(splitImpl(ctx, self.data, s, maxsplit));
    },
    sub: (ctx, self, args, kwargs) => subImpl(ctx, self.data, args, kwargs, false),
    subn: (ctx, self, args, kwargs) => subImpl(ctx, self.data, args, kwargs, true),
  },
  attrs: {
    pattern: (ctx, self) => self.data.src,
    flags: (ctx, self) => I(self.data.flags),
    groups: (ctx, self) => I(self.data.groups),
    groupindex: (ctx, self) => dictFromGroupindex(ctx, self.data),
  },
  construct: (ctx, args, kwargs) => {
    const s = strArg(ctx, args[0], 'Pattern()');
    if (s === null) return ctx.unk('パターンが実行時に決まる値');
    const flags = flagsArg(ctx, args, 1, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    return makePatternNative(ctx, compilePattern(ctx, s, flags));
  },
  repr: (ctx, self) => "re.compile('" + self.data.src.replace(/'/g, "\\'") + "')",
};
function dictFromGroupindex(ctx, data) {
  const d = DICT();
  for (const [k, v] of Object.entries(data.groupindex)) dictSet(d, k, I(v));
  return d;
}
function findallItem(ctx, data, jsMatch) {
  if (data.groups === 0) return jsMatch[0];
  if (data.groups === 1) { const v = jsMatch[1]; return v === undefined ? '' : v; }
  const items = [];
  for (let gi = 1; gi <= data.groups; gi++) { const v = jsMatch[gi]; items.push(v === undefined ? '' : v); }
  return TUPLE(items);
}
function splitImpl(ctx, data, s, maxsplit) {
  const matches = scanMatches(ctx, data, s, 0, [...s].length);
  const out = [];
  let last = 0;
  let n = 0;
  for (const mv of matches) {
    if (maxsplit > 0 && n >= maxsplit) break;
    const [st, en] = spanOf(mv.data.m, 0);
    out.push(s.slice(last, st));
    for (let gi = 1; gi <= data.groups; gi++) out.push(groupValue(mv.data.m, gi));
    last = en;
    n += 1;
  }
  out.push(s.slice(last));
  return out;
}
function subImpl(ctx, self, args, kwargs, wantN) {
  const data = self && self.data ? self.data : null;
  void data;
  return null; // プレースホルダ（下の makeSub で置換）
}

/* ---------- sub / subn 共通 ---------- */
function subCommon(ctx, data, args, kwargs, wantN) {
  const kw = kwargs || {};
  const repl = args[0];
  const s = strArg(ctx, args[1], 'sub()');
  if (s === null) return ctx.unk('文字列が実行時に決まる値');
  const countV = args.length > 2 && args[2] !== undefined ? args[2] : kw.count;
  const count = countV === undefined ? 0 : ctx.int(countV);
  if (count === null) ctx.err('TypeError', 'count には整数を使ってください', '');
  const matches = scanMatches(ctx, data, s, 0, [...s].length);
  let out = '';
  let last = 0;
  let nsub = 0;
  for (const mv of matches) {
    if (count > 0 && nsub >= count) break;
    const [st, en] = spanOf(mv.data.m, 0);
    out += s.slice(last, st);
    let rep;
    if (typeof repl === 'string') {
      rep = processRepl(ctx, data, repl, mv.data.m);
    } else {
      const r = ctx.call(repl, [mv]);
      if (ctx.isUnk(r)) return ctx.unk('置換結果が実行時に決まる値');
      const rs = ctx.str(r);
      if (rs === null) ctx.err('TypeError', 'expected string or bytes-like object', '置換関数は文字列を返してください');
      rep = rs;
    }
    out += rep;
    last = en;
    nsub += 1;
  }
  out += s.slice(last);
  return wantN ? TUPLE([out, I(nsub)]) : out;
}
PatternDef.methods.sub = (ctx, self, args, kwargs) => subCommon(ctx, self.data, args, kwargs, false);
PatternDef.methods.subn = (ctx, self, args, kwargs) => subCommon(ctx, self.data, args, kwargs, true);

/* ---------- Match クラス ---------- */
function lastIndexOf(data, jsMatch) {
  let li = null;
  for (let gi = 1; gi <= data.groups; gi++) if (jsMatch[gi] !== undefined) li = gi;
  return li;
}
const MatchDef = {
  typeName: 'Match',
  methods: {
    group: (ctx, self, args) => {
      const data = self.data.pat;
      if (!args.length) return groupValue(self.data.m, 0);
      const vals = args.map((g) => {
        const idx = resolveGroupIndex(ctx, data, g);
        if (idx === null) return UNK;
        return groupValue(self.data.m, idx);
      });
      return vals.length === 1 ? vals[0] : TUPLE(vals);
    },
    groups: (ctx, self, args) => {
      const data = self.data.pat;
      const dflt = args.length ? args[0] : NONE;
      const out = [];
      for (let gi = 1; gi <= data.groups; gi++) out.push(self.data.m[gi] === undefined ? dflt : self.data.m[gi]);
      return TUPLE(out);
    },
    groupdict: (ctx, self, args) => {
      const data = self.data.pat;
      const dflt = args.length ? args[0] : NONE;
      const d = DICT();
      for (const [name, gi] of Object.entries(data.groupindex)) {
        dictSet(d, name, self.data.m[gi] === undefined ? dflt : self.data.m[gi]);
      }
      return d;
    },
    start: (ctx, self, args) => {
      const idx = args.length ? resolveGroupIndex(ctx, self.data.pat, args[0]) : 0;
      if (idx === null) return ctx.unk('グループが実行時に決まる値');
      return I(spanOf(self.data.m, idx)[0]);
    },
    end: (ctx, self, args) => {
      const idx = args.length ? resolveGroupIndex(ctx, self.data.pat, args[0]) : 0;
      if (idx === null) return ctx.unk('グループが実行時に決まる値');
      return I(spanOf(self.data.m, idx)[1]);
    },
    span: (ctx, self, args) => {
      const idx = args.length ? resolveGroupIndex(ctx, self.data.pat, args[0]) : 0;
      if (idx === null) return ctx.unk('グループが実行時に決まる値');
      const [a, b] = spanOf(self.data.m, idx);
      return TUPLE([I(a), I(b)]);
    },
    expand: (ctx, self, args) => {
      const t = strArg(ctx, args[0], 'Match.expand()');
      if (t === null) return ctx.unk('テンプレートが実行時に決まる値');
      return processRepl(ctx, self.data.pat, t, self.data.m);
    },
    __getitem__: (ctx, self, args) => {
      const idx = resolveGroupIndex(ctx, self.data.pat, args[0]);
      if (idx === null) return ctx.unk('グループが実行時に決まる値');
      return groupValue(self.data.m, idx);
    },
  },
  attrs: {
    pos: (ctx, self) => I(self.data.pos),
    endpos: (ctx, self) => I(self.data.endpos),
    string: (ctx, self) => self.data.str,
    re: (ctx, self) => makePatternNative(ctx, self.data.pat),
    lastindex: (ctx, self) => {
      const li = lastIndexOf(self.data.pat, self.data.m);
      return li === null ? NONE : I(li);
    },
    lastgroup: (ctx, self) => {
      const data = self.data.pat;
      const li = lastIndexOf(data, self.data.m);
      if (li === null) return NONE;
      for (const [name, gi] of Object.entries(data.groupindex)) if (gi === li) return name;
      return NONE;
    },
  },
  getitem: (ctx, self, key) => {
    if (key && key.__slice) return ctx.NOT_HANDLED;
    const idx = resolveGroupIndex(ctx, self.data.pat, key);
    if (idx === null) return ctx.unk('グループが実行時に決まる値');
    return groupValue(self.data.m, idx);
  },
  repr: (ctx, self) => {
    const [a, b] = spanOf(self.data.m, 0);
    return '<re.Match object; span=(' + a + ', ' + b + '), match=' + ctx.repr(self.data.m[0]) + '>';
  },
};

/* ---------- モジュール関数 ---------- */
function flagsArg(ctx, args, idx, kwargs) {
  const kw = kwargs || {};
  const v = args.length > idx ? args[idx] : kw.flags;
  if (v === undefined) return 0;
  const n = ctx.int(v);
  if (n === null) { if (ctx.isUnk(v)) return null; ctx.err('TypeError', 'flags には整数を使ってください', ''); }
  return n;
}
function dataWithFlags(ctx, patV, flags, fname) {
  if (patV && patV.__native === 're.Pattern') {
    if (flags) ctx.err('ValueError', 'cannot process flags argument with a compiled pattern', '');
    return patV.data;
  }
  if (typeof patV === 'string') return compilePattern(ctx, patV, flags);
  if (ctx.isUnk(patV)) return null;
  ctx.err('TypeError', fname + ' の第1引数には文字列か Pattern を使ってください', '');
  return null;
}
const FUNCTIONS = {
  compile: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 1, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const patV = args[0];
    if (patV && patV.__native === 're.Pattern') {
      if (flags) ctx.err('ValueError', 'cannot process flags argument with a compiled pattern', '');
      return patV;
    }
    const s = strArg(ctx, patV, 're.compile()');
    if (s === null) return ctx.unk('パターンが実行時に決まる値');
    return makePatternNative(ctx, compilePattern(ctx, s, flags));
  },
  match: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 2, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.match()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    const s = strArg(ctx, args[1], 're.match()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    const m = execOnce(ctx, data, s, 0, [...s].length, 'match');
    return m ? matchFromExec(ctx, data, args[1], m, 0, [...s].length) : NONE;
  },
  prefixmatch: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 2, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.prefixmatch()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    const s = strArg(ctx, args[1], 're.prefixmatch()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    const m = execOnce(ctx, data, s, 0, [...s].length, 'match');
    return m ? matchFromExec(ctx, data, args[1], m, 0, [...s].length) : NONE;
  },
  search: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 2, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.search()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    const s = strArg(ctx, args[1], 're.search()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    const m = execOnce(ctx, data, s, 0, [...s].length, 'search');
    return m ? matchFromExec(ctx, data, args[1], m, 0, [...s].length) : NONE;
  },
  fullmatch: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 2, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.fullmatch()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    const s = strArg(ctx, args[1], 're.fullmatch()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    const m = execOnce(ctx, data, s, 0, [...s].length, 'fullmatch');
    return m ? matchFromExec(ctx, data, args[1], m, 0, [...s].length) : NONE;
  },
  finditer: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 2, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.finditer()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    const s = strArg(ctx, args[1], 're.finditer()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    return LIST(scanMatches(ctx, data, s, 0, [...s].length));
  },
  findall: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 2, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.findall()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    const s = strArg(ctx, args[1], 're.findall()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    const matches = scanMatches(ctx, data, s, 0, [...s].length);
    return LIST(matches.map((mv) => findallItem(ctx, data, mv.data.m)));
  },
  split: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    const flags = flagsArg(ctx, args, 3, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.split()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    const s = strArg(ctx, args[1], 're.split()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    const maxV = args.length > 2 ? args[2] : kw.maxsplit;
    const maxsplit = maxV === undefined ? 0 : ctx.int(maxV);
    if (maxsplit === null) ctx.err('TypeError', 'maxsplit には整数を使ってください', '');
    return LIST(splitImpl(ctx, data, s, maxsplit));
  },
  sub: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 4, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.sub()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    return subCommon(ctx, data, [args[1], args[2], args[3]], kwargs, false);
  },
  subn: (ctx, args, kwargs) => {
    const flags = flagsArg(ctx, args, 4, kwargs);
    if (flags === null) return ctx.unk('フラグが実行時に決まる値');
    const data = dataWithFlags(ctx, args[0], flags, 're.subn()');
    if (data === null) return ctx.unk('パターンが実行時に決まる値');
    return subCommon(ctx, data, [args[1], args[2], args[3]], kwargs, true);
  },
  escape: (ctx, args) => {
    const s = strArg(ctx, args[0], 're.escape()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    const specials = new Set([...'()[]{}?*+-|^$\\.&~# \t\n\r\v\f']);
    return [...s].map((ch) => (specials.has(ch) ? '\\' + ch : ch)).join('');
  },
  purge: () => NONE,
};

/* RegexFlag は IntFlag。本アプリではフラグを整数として扱うため、
 * RegexFlag(n) は整数 n そのものを返す最小実装とする（メンバー属性
 * re.RegexFlag.IGNORECASE 等の列挙体としての振る舞いは未検証）。 */
const RegexFlagDef = {
  typeName: 'RegexFlag',
  construct: (ctx, args) => {
    const n = args.length ? ctx.int(args[0]) : 0;
    if (n === null) { if (ctx.isUnk(args[0])) return ctx.unk('フラグが実行時に決まる値'); ctx.err('TypeError', 'RegexFlag() の引数には整数を使ってください', ''); }
    return I(n);
  },
  classAttrs: {
    NOFLAG: I(0), ASCII: I(256), A: I(256), UNICODE: I(32), U: I(32),
    LOCALE: I(4), L: I(4), IGNORECASE: I(2), I: I(2), MULTILINE: I(8), M: I(8),
    DOTALL: I(16), S: I(16), VERBOSE: I(64), X: I(64), DEBUG: I(128),
  },
  repr: (ctx, self) => String(self && self.v !== undefined ? self.v : 0),
};

registerStdlibModule('re', {
  data: {
    ASCII: I(256), A: I(256), UNICODE: I(32), U: I(32), LOCALE: I(4), L: I(4),
    IGNORECASE: I(2), I: I(2), MULTILINE: I(8), M: I(8), DOTALL: I(16), S: I(16),
    VERBOSE: I(64), X: I(64), DEBUG: I(128), NOFLAG: I(0),
  },
  functions: FUNCTIONS,
  classes: {
    Pattern: PatternDef,
    Match: MatchDef,
    RegexFlag: RegexFlagDef,
    PatternError: { exc: 'PatternError', excParents: ['ValueError'] },
    error: { exc: 'PatternError', excParents: ['ValueError'] },
  },
});
