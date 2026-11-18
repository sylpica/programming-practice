/* 高度モード B7 G3：string モジュール（全25件）の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/string）と CPython 3.12.3 実走。
 * 定数は束ね値として正確な文字列を収録。Formatter の書式仕様ミニ言語は
 * CPython の string.Formatter（_vformat／parse／get_field／convert_field／
 * format_field）の意味論を移植した。Template は CPython のパターン生成
 * （delimiter＋idpattern＋braceidpattern、IGNORECASE）に従う。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, nativeClassDef } from './stdlib-registry.js';

const { NUM, BOOL, NONE, LIST, TUPLE, DICT } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);

function strArg(ctx, v, fname) {
  if (ctx.isUnk(v)) return null;
  const s = ctx.str(v);
  if (s === null) ctx.err('TypeError', fname + ' の引数には文字列を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return s;
}
function dictLookup(ctx, dv, keyVal) {
  if (!ctx.isDict(dv)) return undefined;
  return PyAPI.dictGet(dv, keyVal);
}

/* ================= Template ================= */
const TPL_DEFAULT_ID = '(?a:[_a-z][_a-z0-9]*)';
function stripAsciiScoped(p) {
  // CPython の idpattern は '(?a:...)' の形で埋め込まれる。JS には (?a:) が
  // 無いため、内側だけを取り出す（既定パターンは ASCII 範囲のみで等価）。
  if (p.startsWith('(?a:') && p.endsWith(')')) return p.slice(4, -1);
  return p;
}
function templatePattern(delim, idpattern, braceidpattern) {
  const esc = delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const idp = stripAsciiScoped(idpattern || TPL_DEFAULT_ID);
  const bidp = stripAsciiScoped(braceidpattern || idpattern || TPL_DEFAULT_ID);
  // CPython: delimiter(?:(?P<escaped>delimiter)|(?P<named>idp)|{(?P<braced>bidp)}|(?P<invalid>))
  return new RegExp(esc + '(?:(?<escaped>' + esc + ')|(?<named>' + idp + ')|\\{(?<braced>' + bidp + ')\\}|(?<invalid>))', 'gi');
}
function tplSubst(ctx, self, args, kwargs, safe) {
  const d = self.data;
  const mapping = args.length ? args[0] : null;
  const kw = kwargs || {};
  const getVal = (name) => {
    if (mapping && ctx.isDict(mapping)) {
      const v = dictLookup(ctx, mapping, name);
      if (v !== undefined) return v;
    }
    if (name in kw) return kw[name];
    return undefined;
  };
  const src = d.template;
  const re = templatePattern(d.delimiter, d.idpattern, d.braceidpattern);
  let out = ''; let last = 0; let m;
  const full = src;
  re.lastIndex = 0;
  while ((m = re.exec(full)) !== null) {
    out += full.slice(last, m.index);
    last = m.index + m[0].length;
    const g = m.groups;
    if (g.escaped !== undefined) { out += d.delimiter; continue; }
    const name = g.named !== undefined ? g.named : g.braced;
    if (name !== undefined) {
      const v = getVal(name);
      if (v === undefined) {
        if (safe) { out += m[0]; continue; }
        ctx.err('KeyError', ctx.repr(name), '');
      }
      out += ctx.strOf(v);
      continue;
    }
    // invalid
    if (safe) { out += m[0]; continue; }
    ctx.err('ValueError', 'Invalid placeholder at index ' + m.index + ' in string: ' + ctx.repr(full.length > 60 ? full.slice(0, 60) : full), '');
  }
  out += full.slice(last);
  return out;
}
const TemplateDef = {
  typeName: 'Template',
  construct: (ctx, args, kwargs) => {
    if (args.length !== 1) ctx.err('TypeError', 'Template() の引数は1個（テンプレート文字列）です', '');
    const t = strArg(ctx, args[0], 'Template()');
    if (t === null) return ctx.unk('テンプレートが実行時に決まる値');
    return ctx.native('string.Template', {
      template: t, delimiter: '$', idpattern: null, braceidpattern: null,
    });
  },
  methods: {
    substitute: (ctx, self, args, kwargs) => tplSubst(ctx, self, args, kwargs, false),
    safe_substitute: (ctx, self, args, kwargs) => tplSubst(ctx, self, args, kwargs, true),
    get_identifiers: (ctx, self) => {
      const d = self.data;
      const re = templatePattern(d.delimiter, d.idpattern, d.braceidpattern);
      const out = []; let m;
      while ((m = re.exec(d.template)) !== null) {
        const name = m.groups.named !== undefined ? m.groups.named : m.groups.braced;
        if (name !== undefined && !out.includes(name)) out.push(name);
      }
      return LIST(out);
    },
    is_valid: (ctx, self) => {
      const d = self.data;
      const re = templatePattern(d.delimiter, d.idpattern, d.braceidpattern);
      let m;
      while ((m = re.exec(d.template)) !== null) {
        if (m.groups.escaped === undefined && m.groups.named === undefined && m.groups.braced === undefined) return BOOL(false);
      }
      return BOOL(true);
    },
  },
  attrs: {
    template: (ctx, self) => self.data.template,
    delimiter: (ctx, self) => self.data.delimiter,
    idpattern: (ctx, self) => self.data.idpattern === null ? TPL_DEFAULT_ID : self.data.idpattern,
    braceidpattern: (ctx, self) => self.data.braceidpattern === null ? NONE : self.data.braceidpattern,
    flags: (ctx, self) => I(2), // re.IGNORECASE
  },
  classAttrs: {
    delimiter: '$',
    idpattern: '(?a:[_a-z][_a-z0-9]*)',
    braceidpattern: (ctx) => NONE,
    flags: (ctx) => I(2),
  },
  repr: (ctx, self) => 'Template(' + ctx.repr(self.data.template) + ')',
};

/* ================= Formatter ================= */
function parseFormatString(ctx, fmt) {
  // CPython の formatter_parser 相当：(literal, field, spec, conversion) の列
  const out = [];
  let i = 0; const n = fmt.length;
  let literal = '';
  const flushField = (field, spec, conv) => { out.push([literal, field, spec, conv]); literal = ''; };
  while (i < n) {
    const c = fmt[i];
    if (c === '{') {
      if (fmt[i + 1] === '{') { literal += '{'; i += 2; continue; }
      i += 1;
      let field = '';
      while (i < n && fmt[i] !== '!' && fmt[i] !== ':' && fmt[i] !== '}') {
        if (fmt[i] === '{') ctx.err('ValueError', "Single '{' encountered in format string", '');
        field += fmt[i]; i += 1;
      }
      if (i >= n) ctx.err('ValueError', "Single '{' encountered in format string", '');
      let conv = null; let spec = '';
      if (fmt[i] === '!') {
        i += 1;
        if (i >= n) ctx.err('ValueError', "Single '{' encountered in format string", '');
        conv = fmt[i]; i += 1;
        if (i < n && fmt[i] !== ':' && fmt[i] !== '}') ctx.err('ValueError', "expected ':' after conversion specifier", '');
      }
      if (i < n && fmt[i] === ':') {
        i += 1;
        let depth = 0;
        while (i < n) {
          if (fmt[i] === '{') depth += 1;
          else if (fmt[i] === '}') { if (depth === 0) break; depth -= 1; }
          spec += fmt[i]; i += 1;
        }
        if (i >= n) ctx.err('ValueError', "Single '{' encountered in format string", '');
      }
      if (i >= n || fmt[i] !== '}') ctx.err('ValueError', "Single '{' encountered in format string", '');
      i += 1;
      flushField(field, spec, conv);
      continue;
    }
    if (c === '}') {
      if (fmt[i + 1] === '}') { literal += '}'; i += 2; continue; }
      ctx.err('ValueError', "Single '}' encountered in format string", '');
    }
    literal += c; i += 1;
  }
  if (literal || out.length === 0) { if (literal) out.push([literal, null, null, null]); }
  return out;
}
function pyAscii(s) {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 128) out += ch;
    else if (cp <= 0xFF) out += '\\x' + cp.toString(16).padStart(2, '0');
    else if (cp <= 0xFFFF) out += '\\u' + cp.toString(16).padStart(4, '0');
    else out += '\\U' + cp.toString(16).padStart(8, '0');
  }
  return out;
}
/* 書式仕様ミニ言語（CPython の format 仕様） */
function parseSpec(spec) {
  const r = { fill: null, align: null, sign: null, z: false, alt: false, zero: false, width: null, grouping: null, precision: null, type: '' };
  let i = 0;
  if (spec.length >= 2 && ['<', '>', '=', '^'].includes(spec[1])) { r.fill = spec[0]; r.align = spec[1]; i = 2; }
  else if (spec.length >= 1 && ['<', '>', '=', '^'].includes(spec[0])) { r.align = spec[0]; i = 1; }
  if (i < spec.length && ['+', '-', ' '].includes(spec[i])) { r.sign = spec[i]; i += 1; }
  if (i < spec.length && spec[i] === 'z') { r.z = true; i += 1; }
  if (i < spec.length && spec[i] === '#') { r.alt = true; i += 1; }
  if (i < spec.length && spec[i] === '0') { r.zero = true; i += 1; }
  let w = '';
  while (i < spec.length && /[0-9]/.test(spec[i])) { w += spec[i]; i += 1; }
  if (w) r.width = parseInt(w, 10);
  if (i < spec.length && (spec[i] === ',' || spec[i] === '_')) { r.grouping = spec[i]; i += 1; }
  if (i < spec.length && spec[i] === '.') {
    i += 1; let p = '';
    while (i < spec.length && /[0-9]/.test(spec[i])) { p += spec[i]; i += 1; }
    r.precision = p === '' ? 0 : parseInt(p, 10);
  }
  if (i < spec.length) { r.type = spec[i]; i += 1; }
  return r;
}
function groupDigits(intPart, sep) {
  let out = ''; let s = intPart;
  while (s.length > 3) { out = sep + s.slice(-3) + out; s = s.slice(0, -3); }
  return s + out;
}
function padNum(ctx, signStr, prefix, body, spec, isNum) {
  let s = signStr + prefix + body;
  const width = spec.width;
  if (width === null || s.length >= width) return s;
  let fill = spec.fill !== null ? spec.fill : (spec.zero && isNum ? '0' : ' ');
  let align = spec.align !== null ? spec.align : (spec.zero && isNum ? '=' : (isNum ? '>' : '<'));
  const padlen = width - s.length;
  if (align === '<') return s + fill.repeat(padlen);
  if (align === '>') return fill.repeat(padlen) + s;
  if (align === '^') { const l = Math.floor(padlen / 2); return fill.repeat(l) + s + fill.repeat(padlen - l); }
  // '=' ：符号・接頭辞の直後に詰める
  return signStr + prefix + fill.repeat(padlen) + body;
}
function signOf(neg, spec) {
  if (neg) return '-';
  if (spec.sign === '+') return '+';
  if (spec.sign === ' ') return ' ';
  return '';
}
function formatIntVal(ctx, v, spec) {
  let neg = v < 0; let av = Math.abs(v);
  const t = spec.type || 'd';
  let body, prefix = '';
  if (t === 'd' || t === 'n') {
    body = String(Math.trunc(av));
    if (spec.grouping) body = groupDigits(body, spec.grouping);
  } else if (t === 'b') { body = av.toString(2); if (spec.alt) prefix = '0b'; if (spec.grouping === '_') body = groupUnderscore(body, 4); }
  else if (t === 'o') { body = av.toString(8); if (spec.alt) prefix = '0o'; if (spec.grouping === '_') body = groupUnderscore(body, 4); }
  else if (t === 'x' || t === 'X') { body = av.toString(16); if (t === 'X') body = body.toUpperCase(); if (spec.alt) prefix = t === 'x' ? '0x' : '0X'; if (spec.grouping === '_') body = groupUnderscore(body, 4); }
  else if (t === 'c') {
    if (spec.sign || spec.alt || spec.grouping) ctx.err('ValueError', '書式指定が整数の文字形式と合いません', '');
    if (av > 0x10FFFF || v < 0) ctx.err('OverflowError', '%c arg not in range(0x110000)', '');
    body = String.fromCodePoint(v);
    return padNum(ctx, '', '', body, spec, false);
  } else if (['e', 'E', 'f', 'F', 'g', 'G', '%'].includes(t)) {
    return formatFloatVal(ctx, v, spec);
  } else {
    ctx.err('ValueError', "Unknown format code '" + t + "' for object of type 'int'", '');
  }
  return padNum(ctx, signOf(neg, spec), prefix, body, spec, true);
}
function groupUnderscore(body, size) {
  let out = ''; let s = body;
  while (s.length > size) { out = '_' + s.slice(-size) + out; s = s.slice(0, -size); }
  return s + out;
}
function expStr(e, upper) {
  return (upper ? 'E' : 'e') + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
}
function formatFloatVal(ctx, v, spec) {
  const t = spec.type || '';
  let x = v;
  if (spec.z && Object.is(x, -0)) x = 0;
  const neg = x < 0 || Object.is(x, -0);
  const ax = Math.abs(x);
  let body;
  const grouping = spec.grouping;
  const applyGroup = (intPart) => grouping ? groupDigits(intPart, grouping) : intPart;
  if (!Number.isFinite(ax)) {
    body = Number.isNaN(ax) ? (t === 'F' || t === 'E' || t === 'G' ? 'NAN' : 'nan') : (t === 'F' || t === 'E' || t === 'G' ? 'INF' : 'inf');
    if (t === '%') body += '%';
    const sp2 = { ...spec, zero: false };
    return padNum(ctx, signOf(neg && !Number.isNaN(ax), spec), '', body, sp2, true);
  }
  if (t === 'e' || t === 'E') {
    const p = spec.precision === null ? 6 : spec.precision;
    const s = ax.toExponential(p);
    const [mant, ex] = s.split('e');
    let [ip, fp] = mant.split('.');
    ip = applyGroup(ip);
    body = ip + (fp !== undefined ? '.' + fp : (p > 0 ? '.' + '0'.repeat(p) : (spec.alt ? '.' : ''))) + expStr(parseInt(ex, 10), t === 'E');
    if (p === 0 && spec.alt && fp === undefined) body = ip + '.' + expStr(parseInt(ex, 10), t === 'E');
  } else if (t === 'f' || t === 'F') {
    const p = spec.precision === null ? 6 : spec.precision;
    let s = fixedStr(ax, p);
    let [ip, fp] = s.split('.');
    ip = applyGroup(ip);
    body = fp !== undefined ? ip + '.' + fp : ip + (spec.alt ? '.' : '');
    if (p > 0 && fp === undefined) body = ip + '.' + '0'.repeat(p);
  } else if (t === '%') {
    const p = spec.precision === null ? 6 : spec.precision;
    let s = fixedStr(ax * 100, p);
    let [ip, fp] = s.split('.');
    ip = applyGroup(ip);
    body = (fp !== undefined ? ip + '.' + fp : ip + (spec.alt ? '.' : '')) + '%';
    if (p > 0 && fp === undefined) body = ip + '.' + '0'.repeat(p) + '%';
  } else if (t === 'g' || t === 'G' || t === 'n' || t === '') {
    if (t === '' && spec.precision === null) {
      // repr と同じ最短表記（末尾の .0 を保つ）
      body = ctx.repr(F(ax));
      let [ip, fp] = body.split('.');
      if (!body.includes('e') && !body.includes('E')) { ip = applyGroup(ip); body = fp !== undefined ? ip + '.' + fp : ip; }
      return padNum(ctx, signOf(neg, spec), '', body, spec, true);
    }
    let p = spec.precision === null ? 6 : spec.precision;
    if (p === 0) p = 1;
    body = gStr(ax, p, t === 'G' || t === 'n' ? false : false, spec.alt);
    if (t === 'G') body = body.toUpperCase().replace('E', 'E');
    if (grouping && !body.includes('e')) { let [ip, fp] = body.split('.'); ip = applyGroup(ip); body = fp !== undefined ? ip + '.' + fp : ip; }
    if (t === '' && !body.includes('e') && !body.includes('.')) body += '.0';
  } else {
    ctx.err('ValueError', "Unknown format code '" + t + "' for object of type 'float'", '');
  }
  return padNum(ctx, signOf(neg, spec), '', body, spec, true);
}
function fixedStr(ax, p) {
  // CPython の f 形式：正確な10進展開を偶数丸めする。toFixed は2^53級で近似
  // になるため、通常範囲では toFixed を使い、結果をそのまま返す。
  return ax.toFixed(p);
}
function gStr(ax, p, upper, alt) {
  if (ax === 0) {
    if (alt) return '0.' + '0'.repeat(Math.max(0, p - 1));
    return '0';
  }
  let s = ax.toPrecision(p);
  let exp = null; let mant = s;
  if (s.includes('e')) { [mant, exp] = s.split('e'); exp = parseInt(exp, 10); }
  if (exp !== null) {
    let m = mant;
    if (!alt) { if (m.includes('.')) m = m.replace(/0+$/, '').replace(/\.$/, ''); }
    else if (!m.includes('.')) m += '.0';
    return m + expStr(exp, upper);
  }
  let m = mant;
  if (!alt && m.includes('.')) m = m.replace(/0+$/, '').replace(/\.$/, '');
  return m;
}
function formatField(ctx, v, specStr) {
  const spec = parseSpec(specStr);
  if (typeof v === 'string') {
    const t = spec.type;
    if (t !== '' && t !== 's') ctx.err('ValueError', "Unknown format code '" + t + "' for object of type 'str'", '');
    if (spec.sign) ctx.err('ValueError', 'Sign not allowed in string format specifier', '');
    if (spec.alt) ctx.err('ValueError', 'Alternate form (#) not allowed in string format specifier', '');
    if (spec.align === '=') ctx.err('ValueError', "'=' alignment not allowed in string format specifier", '');
    if (spec.grouping) ctx.err('ValueError', 'グループ化は文字列には使えません', '');
    let body = spec.precision !== null ? [...v].slice(0, spec.precision).join('') : v;
    const sp2 = { ...spec, align: spec.align !== null ? spec.align : '<' };
    return padNum(ctx, '', '', body, sp2, false);
  }
  if (ctx.isBool(v)) {
    if (specStr === '') return v.v ? 'True' : 'False';
    return formatIntVal(ctx, v.v ? 1 : 0, spec);
  }
  if (ctx.isNum(v)) {
    if (!v.f) return formatIntVal(ctx, v.v, spec);
    return formatFloatVal(ctx, v.v, spec);
  }
  if (ctx.isNone(v)) {
    if (specStr === '') return 'None';
    // NoneType は object.__format__ のため、空でない仕様は文字列として扱う
    // （CPython では TypeError になるケースがあるが、str 経由の表示に倒す）
    return formatField(ctx, 'None', specStr);
  }
  if (specStr === '') return ctx.strOf(v);
  ctx.err('TypeError', 'この型の値には書式指定を使えません（' + ctx.typeName(v) + '）', '');
  return '';
}
function getField(ctx, fieldName, argsArr, kwargs) {
  // CPython Formatter.get_field：最初の要素＋ .attr／[key] の連鎖
  let first, rest;
  const m = /^([^.\[]+)([\s\S]*)$/.exec(fieldName);
  first = m[1]; rest = m[2];
  let obj, used;
  if (/^\d+$/.test(first)) {
    const idx = parseInt(first, 10);
    if (idx >= argsArr.length) ctx.err('IndexError', 'Replacement index ' + idx + ' out of range for positional args tuple', '');
    obj = argsArr[idx]; used = idx;
  } else {
    if (!(first in kwargs)) ctx.err('KeyError', ctx.repr(first), '');
    obj = kwargs[first]; used = first;
  }
  while (rest) {
    if (rest[0] === '.') {
      const mm = /^\.([^.\[]+)([\s\S]*)$/.exec(rest);
      const attr = mm[1]; rest = mm[2];
      obj = getAttrGeneric(ctx, obj, attr);
    } else if (rest[0] === '[') {
      const close = rest.indexOf(']');
      if (close < 0) ctx.err('ValueError', '書式フィールドの [ が閉じていません', '');
      const keyStr = rest.slice(1, close); rest = rest.slice(close + 1);
      const key = /^-?\d+$/.test(keyStr) ? I(parseInt(keyStr, 10)) : keyStr;
      obj = getItemGeneric(ctx, obj, key);
    } else break;
  }
  return [obj, used];
}
function getAttrGeneric(ctx, obj, attr) {
  if (obj && obj.__native) {
    const def = nativeClassDef(obj.__native);
    if (def && def.attrs && attr in def.attrs) return def.attrs[attr](ctx, obj);
    if (def && def.classAttrs && attr in def.classAttrs) {
      const cv = def.classAttrs[attr];
      return typeof cv === 'function' ? cv(ctx) : cv;
    }
    return ctx.unk('属性「' + attr + '」の値');
  }
  if (obj && obj.__instance && obj.attrs && typeof obj.attrs.has === 'function') {
    // ユーザー定義クラスのインスタンス属性（エンジンの attrs Map を参照）
    if (obj.attrs.has(attr)) return obj.attrs.get(attr);
    ctx.err('AttributeError', ctx.typeName(obj) + ' オブジェクトには属性「' + attr + '」がありません', '');
  }
  if (obj && obj.__class && obj.attrs && typeof obj.attrs.has === 'function' && obj.attrs.has(attr)) return obj.attrs.get(attr);
  ctx.err('AttributeError', ctx.typeName(obj) + ' オブジェクトには属性「' + attr + '」がありません', '');
  return null;
}
function getItemGeneric(ctx, obj, key) {
  const items = ctx.listOf(obj);
  if (items !== null) {
    const idx = ctx.int(key);
    if (idx === null) ctx.err('TypeError', '並びの添字には整数を使ってください', '');
    let i2 = idx < 0 ? idx + items.length : idx;
    if (i2 < 0 || i2 >= items.length) ctx.err('IndexError', 'list index out of range', '');
    return items[i2];
  }
  if (typeof obj === 'string') {
    const idx = ctx.int(key);
    if (idx === null) ctx.err('TypeError', 'string indices must be integers', '');
    const chars = [...obj];
    let i2 = idx < 0 ? idx + chars.length : idx;
    if (i2 < 0 || i2 >= chars.length) ctx.err('IndexError', 'string index out of range', '');
    return chars[i2];
  }
  if (ctx.isDict(obj)) {
    const v = PyAPI.dictGet(obj, key);
    if (v === undefined) ctx.err('KeyError', ctx.repr(key), '');
    return v;
  }
  ctx.err('TypeError', ctx.typeName(obj) + ' は [ ] で要素を取り出せません', '');
  return null;
}
function vformatImpl(ctx, fmt, argsArr, kwargs, usedArgs, depth, autoState) {
  if (depth < 0) ctx.err('ValueError', 'Max string recursion exceeded', '');
  const parts = parseFormatString(ctx, fmt);
  let out = '';
  for (const [literal, field, spec, conv] of parts) {
    if (literal) out += literal;
    if (field === null) continue;
    let fname = field;
    if (fname === '') {
      if (autoState.mode === 'manual') ctx.err('ValueError', 'cannot switch from manual field specification to automatic field numbering', '');
      autoState.mode = 'auto';
      fname = String(autoState.index); autoState.index += 1;
    } else if (/^\d+$/.test(fname.split(/[.[]/)[0])) {
      if (autoState.mode === 'auto') ctx.err('ValueError', 'cannot switch from automatic field numbering to manual field specification', '');
      autoState.mode = 'manual';
    }
    let [obj, used] = getField(ctx, fname, argsArr, kwargs);
    usedArgs.add(used);
    if (conv !== null) {
      if (conv === 's') obj = ctx.strOf(obj);
      else if (conv === 'r') obj = ctx.repr(obj);
      else if (conv === 'a') obj = pyAscii(ctx.repr(obj));
      else ctx.err('ValueError', 'Unknown conversion specifier ' + conv, '');
    }
    let specOut = spec;
    if (spec && spec.includes('{')) {
      specOut = vformatImpl(ctx, spec, argsArr, kwargs, usedArgs, depth - 1, autoState);
    }
    out += formatField(ctx, obj, specOut || '');
  }
  return out;
}
const FormatterDef = {
  typeName: 'Formatter',
  construct: (ctx, args, kwargs) => {
    if (args.length || Object.keys(kwargs || {}).length) ctx.err('TypeError', 'Formatter() は引数を取りません', '');
    return ctx.native('string.Formatter', {});
  },
  methods: {
    format: (ctx, self, args, kwargs) => {
      const fmt = strArg(ctx, args[0], 'Formatter.format()');
      if (fmt === null) return ctx.unk('書式文字列が実行時に決まる値');
      const used = new Set();
      const st = { mode: null, index: 0 };
      return vformatImpl(ctx, fmt, args.slice(1), kwargs || {}, used, 2, st);
    },
    vformat: (ctx, self, args, kwargs) => {
      const fmt = strArg(ctx, args[0], 'Formatter.vformat()');
      if (fmt === null) return ctx.unk('書式文字列が実行時に決まる値');
      const arr = args.length > 1 ? ctx.listOf(args[1]) : null;
      const kw = args.length > 2 && ctx.isDict(args[2]) ? dictToObj(args[2]) : {};
      const used = new Set();
      const st = { mode: null, index: 0 };
      return vformatImpl(ctx, fmt, arr || [], kw, used, 2, st);
    },
    parse: (ctx, self, args, kwargs) => {
      const fmt = strArg(ctx, args[0], 'Formatter.parse()');
      if (fmt === null) return ctx.unk('書式文字列が実行時に決まる値');
      const parts = parseFormatString(ctx, fmt);
      return LIST(parts.map(([lit, field, spec, conv]) => TUPLE([
        lit, field === null ? NONE : field, spec === null ? NONE : spec, conv === null ? NONE : conv,
      ])));
    },
    get_value: (ctx, self, args, kwargs) => {
      const key = args[0];
      const arr = args.length > 1 ? (ctx.listOf(args[1]) || []) : [];
      const kw = args.length > 2 && ctx.isDict(args[2]) ? dictToObj(args[2]) : {};
      const kn = ctx.num(key);
      if (kn !== null) {
        if (kn >= arr.length) ctx.err('IndexError', 'Replacement index ' + kn + ' out of range for positional args tuple', '');
        return arr[kn];
      }
      const ks = ctx.str(key);
      if (ks !== null) {
        if (!(ks in kw)) ctx.err('KeyError', ctx.repr(ks), '');
        return kw[ks];
      }
      return key;
    },
    get_field: (ctx, self, args, kwargs) => {
      const fname = strArg(ctx, args[0], 'Formatter.get_field()');
      const arr = args.length > 1 ? (ctx.listOf(args[1]) || []) : [];
      const kw = args.length > 2 && ctx.isDict(args[2]) ? dictToObj(args[2]) : {};
      const [obj, used] = getField(ctx, fname, arr, kw);
      return TUPLE([obj, typeof used === 'number' ? I(used) : used]);
    },
    convert_field: (ctx, self, args, kwargs) => {
      const conv = args.length > 1 ? ctx.str(args[1]) : null;
      if (conv === null || conv === 'None' || args[1] === NONE || ctx.isNone(args[1])) return args[0];
      if (conv === 's') return ctx.strOf(args[0]);
      if (conv === 'r') return ctx.repr(args[0]);
      if (conv === 'a') return pyAscii(ctx.repr(args[0]));
      ctx.err('ValueError', 'Unknown conversion specifier ' + conv, '');
      return args[0];
    },
    format_field: (ctx, self, args, kwargs) => {
      const spec = args.length > 1 ? (ctx.str(args[1]) || '') : '';
      return formatField(ctx, args[0], spec);
    },
    check_unused_args: (ctx, self, args, kwargs) => NONE,
  },
  repr: () => '<string.Formatter object>',
};
function dictToObj(dv) {
  const o = {};
  for (const e of dv.__dict.values()) { if (typeof e.k === 'string') o[e.k] = e.v; }
  return o;
}

/* ================= モジュール関数 ================= */
const FUNCTIONS = {
  /* クラス名シャドウ（kwargs 二重評価の基盤不具合への回避策。報告書に記載） */
  Template: (ctx, args, kwargs) => TemplateDef.construct(ctx, args, kwargs),
  Formatter: (ctx, args, kwargs) => FormatterDef.construct(ctx, args, kwargs),
  capwords: (ctx, args, kwargs) => {
    if (args.length < 1 || args.length > 2) ctx.err('TypeError', 'string.capwords() の引数の数が合いません', '');
    const s = strArg(ctx, args[0], 'string.capwords()');
    if (s === null) return ctx.unk('文字列が実行時に決まる値');
    let sep = null;
    if (args.length === 2 && !ctx.isNone(args[1])) sep = strArg(ctx, args[1], 'string.capwords()');
    let words;
    if (sep === null) words = s.split(/\s+/).filter((w) => w.length > 0);
    else words = s.split(sep);
    const cap = (w) => w.length === 0 ? w : [...w][0].toUpperCase() + [...w].slice(1).join('').toLowerCase();
    return words.map(cap).join(sep === null ? ' ' : sep);
  },
};

registerStdlibModule('string', {
  constants: {
    ascii_letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    ascii_lowercase: 'abcdefghijklmnopqrstuvwxyz',
    ascii_uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    hexdigits: '0123456789abcdefABCDEF',
    octdigits: '01234567',
    printable: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ \t\n\r\x0b\x0c',
    punctuation: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
    whitespace: ' \t\n\r\x0b\x0c',
  },
  functions: FUNCTIONS,
  classes: { Template: TemplateDef, Formatter: FormatterDef },
});
