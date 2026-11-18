/* 高度モード B7 G7: configparser モジュール。
* ConfigParser/RawConfigParser の解析・取得・補間を CPython 3.12.3 の意味論
* （キー小文字化、継続行、コメント、DEFAULT、strict の重複検査、Basic/Extended
* 補間）どおりに実装。read/write はファイル前提のため未対応（read はファイル名
* を対象とする CPython の仕様どおり）。SECTCRE は正規表現オブジェクトを値モデル
* で表せないため未検証、UNNAMED_SECTION は特殊センチネルで未検証。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  I, F, BOOL, NONE, LIST, TUPLE, UNK, unkRet, unsupportedFn, makeDictFrom,
} from './impl-advanced-g7-common.js';

export const BOOLEAN_STATES = {
  '1': true, 'yes': true, 'true': true, 'on': true,
  '0': false, 'no': false, 'false': false, 'off': false,
};
export const MAX_INTERPOLATION_DEPTH = 10;

const PARSER_Q = 'configparser.ConfigParser';
const RAW_Q = 'configparser.RawConfigParser';
const PROXY_Q = 'configparser.SectionProxy';
const BASIC_Q = 'configparser.BasicInterpolation';
const EXT_Q = 'configparser.ExtendedInterpolation';

const errE = (ctx, msg) => ctx.err('configparser.Error', msg, '');

function xform(s) { return s.toLowerCase(); }

function makeParserData(opts) {
  return {
    sections: new Map(), // name -> Map(option -> value(engine値: str | NONE | その他)
    defaults: new Map(),
    defaultSection: opts.defaultSection,
    allowNoValue: opts.allowNoValue,
    delimiters: opts.delimiters,
    commentPrefixes: opts.commentPrefixes,
    inlineCommentPrefixes: opts.inlineCommentPrefixes,
    strict: opts.strict,
    emptyLinesInValues: opts.emptyLinesInValues,
    interpolation: opts.interpolation, // 'basic' | 'extended' | null
    raw: opts.raw,
  };
}
function defaultOpts(raw) {
  return {
    defaultSection: 'DEFAULT', allowNoValue: false, delimiters: ['=', ':'],
    commentPrefixes: ['#', ';'], inlineCommentPrefixes: null,
    strict: true, emptyLinesInValues: true,
    interpolation: raw ? null : 'basic', raw: !!raw,
  };
}
function readConstructOpts(ctx, args, kwargs, raw) {
  const opts = defaultOpts(raw);
  const get = (name, idx) => (name in (kwargs || {}) ? kwargs[name] : (args && args.length > idx ? args[idx] : undefined));
  const anyUnk = Object.values(kwargs || {}).some((v) => ctx.isUnk(v)) || (args || []).some((v) => ctx.isUnk(v));
  if (anyUnk) return null;
  const defaultsV = get('defaults', 0);
  const allowNoValue = get('allow_no_value', 2);
  if (allowNoValue !== undefined) opts.allowNoValue = !!ctx.truthy(allowNoValue);
  const strictV = get('strict', 6);
  if (strictV !== undefined) opts.strict = !!ctx.truthy(strictV);
  const elv = get('empty_lines_in_values', 7);
  if (elv !== undefined) opts.emptyLinesInValues = !!ctx.truthy(elv);
  const dsV = get('default_section', 8);
  if (dsV !== undefined && typeof dsV === 'string') opts.defaultSection = dsV;
  const delimV = get('delimiters', 3);
  if (delimV !== undefined) {
    const items = ctx.iterable(delimV);
    if (items === null || items.some((x) => typeof x !== 'string')) return null;
    opts.delimiters = items;
  }
  const cpV = get('comment_prefixes', 4);
  if (cpV !== undefined && !ctx.isNone(cpV)) {
    const items = ctx.iterable(cpV);
    if (items === null) return null;
    opts.commentPrefixes = items;
  }
  const icpV = get('inline_comment_prefixes', 5);
  if (icpV !== undefined && !ctx.isNone(icpV)) {
    const items = ctx.iterable(icpV);
    if (items === null) return null;
    opts.inlineCommentPrefixes = items;
  }
  const interpV = get('interpolation', 9);
  if (interpV !== undefined) {
    if (ctx.isNone(interpV)) opts.interpolation = null;
    else if (interpV.__native === BASIC_Q) opts.interpolation = 'basic';
    else if (interpV.__native === EXT_Q) opts.interpolation = 'extended';
    else return null;
  }
  return { opts, defaultsV };
}
function storeDefaults(ctx, data, defaultsV, fname) {
  if (defaultsV === undefined || ctx.isNone(defaultsV)) return true;
  if (!ctx.isDict(defaultsV)) { ctx.err('TypeError', 'defaults must be a dictionary', ''); return false; }
  for (const e of defaultsV.__dict.values()) {
    if (typeof e.k !== 'string') { ctx.err('TypeError', 'default option names must be strings', ''); return false; }
    const r = setOptionValue(ctx, data, data.defaults, e.k, e.v, fname);
    if (r === false) return false;
  }
  return true;
}
function setOptionValue(ctx, data, map, option, value, fname) {
  const key = xform(String(option).trim());
  if (!data.raw) {
    if (ctx.isNone(value)) {
      if (!data.allowNoValue) { ctx.err('ValueError', 'Option values must be strings or None with allow_no_value enabled', ''); return false; }
    } else if (typeof value !== 'string') {
      ctx.err('TypeError', 'option values must be strings', '');
      return false;
    }
  }
  map.set(key, value);
  return true;
}

/* ---- パーサ ---- */
function parseIni(ctx, data, text, source) {
  const lines = String(text).split('\n');
  let curSection = null; // Map
  let curSectionName = null;
  let curOption = null;
  let curIndent = 0;
  let valueLines = null;
  const flushValue = () => {
    if (curOption !== null && valueLines !== null) {
      let v = valueLines.join('\n');
      // 末尾の空行は落とす（empty_lines_in_values の有無によらず最終値は rstrip 相当）
      v = v.replace(/\n+$/, '');
      curSection.set(curOption, v === '' && valueLines.every((l) => l === '') ? '' : v);
    }
    curOption = null; valueLines = null;
  };
  const seenSections = new Set();
  for (let idx = 0; idx < lines.length; idx++) {
    let rawLine = lines[idx];
    if (rawLine.endsWith('\r')) rawLine = rawLine.slice(0, -1);
    const line = rawLine;
    const stripped = line.trim();
    const indent = line.length - line.replace(/^\s+/, '').length;
    if (stripped === '') {
      if (curOption !== null && data.emptyLinesInValues) { valueLines.push(''); continue; }
      if (curOption !== null) flushValue();
      continue;
    }
    // 継続行（現在のオプションより深いインデント）
    if (curOption !== null && indent > curIndent) {
      valueLines.push(stripped);
      continue;
    }
    if (curOption !== null) flushValue();
    if (data.commentPrefixes.some((p) => stripped.startsWith(p))) continue;
    if (stripped.startsWith('[')) {
      const m = /^\[([^\]]+)\]\s*(.*)$/.exec(stripped);
      if (!m) { ctx.err('configparser.ParsingError', 'Invalid section header: ' + stripped, ''); return false; }
      const name = m[1].trim();
      if (name === data.defaultSection) {
        curSection = data.defaults; curSectionName = name;
      } else {
        if (data.strict && data.sections.has(name)) {
          ctx.err('configparser.DuplicateSectionError', "section '" + name + "' already exists", '');
          return false;
        }
        seenSections.add(name);
        if (!data.sections.has(name)) data.sections.set(name, new Map());
        curSection = data.sections.get(name); curSectionName = name;
      }
      curOption = null; valueLines = null;
      continue;
    }
    if (curSection === null) {
      ctx.err('configparser.MissingSectionHeaderError', 'File contains no section headers.', '');
      return false;
    }
    // オプション行
    let key = null, value = null, hasDelim = false;
    let bestIdx = -1, bestDelim = null;
    for (const d of data.delimiters) {
      const p = line.indexOf(d);
      if (p >= 0 && (bestIdx < 0 || p < bestIdx)) { bestIdx = p; bestDelim = d; }
    }
    if (bestIdx >= 0) {
      key = line.slice(0, bestIdx).trim();
      value = line.slice(bestIdx + bestDelim.length).trim();
      hasDelim = true;
    } else {
      key = stripped;
    }
    if (!hasDelim) {
      if (!data.allowNoValue) {
        ctx.err('configparser.ParsingError', 'Invalid option format (no delimiter): ' + stripped, '');
        return false;
      }
      value = null;
    }
    if (data.inlineCommentPrefixes && hasDelim && value !== null) {
      for (const p of data.inlineCommentPrefixes) {
        const pIdx = value.indexOf(p);
        if (pIdx > 0 && (value[pIdx - 1] === ' ' || value[pIdx - 1] === '\t')) {
          value = value.slice(0, pIdx).trimEnd();
          break;
        }
        if (pIdx === 0) { value = ''; break; }
      }
    }
    const optKey = xform(key);
    if (data.strict && curSection.has(optKey)) {
      ctx.err('configparser.DuplicateOptionError', "option '" + optKey + "' in section '" + curSectionName + "' already exists", '');
      return false;
    }
    if (value === null) {
      curSection.set(optKey, NONE);
      curOption = null; valueLines = null;
    } else {
      curOption = optKey; curIndent = indent; valueLines = [value];
      // 値は flushValue で確定する（継続行の可能性があるため）
      curSection.set(optKey, value); // 仮置き（flush で上書き）
    }
  }
  if (curOption !== null) flushValue();
  return true;
}

/* ---- 補間 ---- */
function lookupRaw(ctx, data, section, option, vars) {
  if (vars) {
    for (const e of vars.__dict.values()) if (typeof e.k === 'string' && xform(e.k) === option) return e.v;
  }
  const sec = section === data.defaultSection ? data.defaults : data.sections.get(section);
  if (sec && sec.has(option)) return sec.get(option);
  if (data.defaults.has(option)) return data.defaults.get(option);
  return undefined;
}
function interpolateBasic(ctx, data, section, option, value, vars, depth) {
  if (depth > MAX_INTERPOLATION_DEPTH) {
    ctx.err('configparser.InterpolationDepthError', 'Interpolation depth exceeded', '');
    return null;
  }
  let out = '';
  let i = 0;
  while (i < value.length) {
    const ch = value[i];
    if (ch !== '%') { out += ch; i++; continue; }
    if (value[i + 1] === '%') { out += '%'; i += 2; continue; }
    if (value[i + 1] === '(') {
      const close = value.indexOf(')', i + 2);
      if (close < 0 || value[close + 1] !== 's') {
        ctx.err('configparser.InterpolationSyntaxError', "bad interpolation variable reference '" + value.slice(i) + "'", '');
        return null;
      }
      const name = xform(value.slice(i + 2, close));
      const ref = lookupRaw(ctx, data, section, name, vars);
      if (ref === undefined) {
        ctx.err('configparser.InterpolationMissingOptionError', "Bad value substitution: option '" + option + "' in section '" + section + "' contains an interpolation key '" + name + "' which is not a valid option name. Raw value: '" + value + "'", '');
        return null;
      }
      if (typeof ref !== 'string') { out += ctx.strOf(ref); i = close + 2; continue; }
      const sub = interpolateBasic(ctx, data, section, name, ref, vars, depth + 1);
      if (sub === null) return null;
      out += sub;
      i = close + 2;
      continue;
    }
    ctx.err('configparser.InterpolationSyntaxError', "bad interpolation variable reference '" + value.slice(i) + "'", '');
    return null;
  }
  return out;
}
function interpolateExtended(ctx, data, section, option, value, vars, depth) {
  if (depth > MAX_INTERPOLATION_DEPTH) {
    ctx.err('configparser.InterpolationDepthError', 'Interpolation depth exceeded', '');
    return null;
  }
  let out = '';
  let i = 0;
  while (i < value.length) {
    const ch = value[i];
    if (ch !== '$') { out += ch; i++; continue; }
    if (value[i + 1] === '$') { out += '$'; i += 2; continue; }
    if (value[i + 1] === '{') {
      const close = value.indexOf('}', i + 2);
      if (close < 0) {
        ctx.err('configparser.InterpolationSyntaxError', "bad interpolation variable reference '" + value.slice(i) + "'", '');
        return null;
      }
      const inner = value.slice(i + 2, close);
      let refSection = section, refName = inner;
      const colon = inner.indexOf(':');
      if (colon >= 0) { refSection = inner.slice(0, colon); refName = inner.slice(colon + 1); }
      const ref = lookupRaw(ctx, data, refSection, xform(refName), vars);
      if (ref === undefined) {
        ctx.err('configparser.InterpolationMissingOptionError', "Bad interpolation variable reference '${" + inner + "}'", '');
        return null;
      }
      if (typeof ref !== 'string') { out += ctx.strOf(ref); i = close + 1; continue; }
      const sub = interpolateExtended(ctx, data, refSection, xform(refName), ref, vars, depth + 1);
      if (sub === null) return null;
      out += sub;
      i = close + 1;
      continue;
    }
    ctx.err('configparser.InterpolationSyntaxError', "bad interpolation variable reference '" + value.slice(i) + "'", '');
    return null;
  }
  return out;
}
function getImpl(ctx, data, args, kwargs, wantSection) {
  const section = args[0];
  const option = args[1];
  if (typeof section !== 'string' || typeof option !== 'string') {
    if (ctx.isUnk(section) || ctx.isUnk(option)) return unkRet(ctx, 'get の引数');
    ctx.err('TypeError', 'section and option must be strings', '');
    return UNK('');
  }
  const optKey = xform(option);
  const hasFallback = 'fallback' in kwargs;
  const fallback = hasFallback ? kwargs.fallback : undefined;
  const raw = kwRaw(ctx, kwargs);
  const vars = 'vars' in kwargs && ctx.isDict(kwargs.vars) ? kwargs.vars : null;
  const secExists = section === data.defaultSection || data.sections.has(section);
  if (!secExists) {
    if (hasFallback) return fallback;
    ctx.err('configparser.NoSectionError', "No section: '" + section + "'", '');
    return UNK('');
  }
  const v = lookupRaw(ctx, data, section, optKey, vars);
  if (v === undefined) {
    if (hasFallback) return fallback;
    ctx.err('configparser.NoOptionError', "No option '" + option + "' in section: '" + section + "'", '');
    return UNK('');
  }
  if (raw || data.interpolation === null || typeof v !== 'string') return v;
  const r = data.interpolation === 'basic'
    ? interpolateBasic(ctx, data, section, optKey, v, vars, 0)
    : interpolateExtended(ctx, data, section, optKey, v, vars, 0);
  return r === null ? UNK('補間結果') : r;
}
function kwRaw(ctx, kwargs) {
  if (!('raw' in (kwargs || {}))) return false;
  const t = ctx.truthy(kwargs.raw);
  return t === null ? false : !!t;
}
function mergedOptions(data, section) {
  const out = [];
  const seen = new Set();
  for (const k of data.defaults.keys()) { out.push(k); seen.add(k); }
  const sec = data.sections.get(section);
  if (sec) for (const k of sec.keys()) if (!seen.has(k)) out.push(k);
  return out;
}
function sectionMap(ctx, data, section, fname) {
  if (section === data.defaultSection) return data.defaults;
  const sec = data.sections.get(section);
  if (!sec) { ctx.err('configparser.NoSectionError', "No section: '" + section + "'", ''); return null; }
  return sec;
}

function parserMethods(isRaw) {
  return {
    read_string: (ctx, self, args, kwargs) => {
      const text = args[0];
      if (typeof text !== 'string') { if (ctx.isUnk(text)) return unkRet(ctx, 'read_string の入力'); ctx.err('TypeError', 'read_string() argument must be a string', ''); return UNK(''); }
      parseIni(ctx, self.data, text, '<string>');
      return NONE;
    },
    read_file: (ctx, self, args, kwargs) => {
      const items = ctx.iterable(args[0]);
      if (items === null) return unkRet(ctx, 'read_file の入力');
      const lines = [];
      for (const it of items) { if (typeof it !== 'string') return unkRet(ctx, 'read_file の行'); lines.push(it); }
      parseIni(ctx, self.data, lines.join(''), '<file>');
      return NONE;
    },
    read_dict: (ctx, self, args, kwargs) => {
      const d = args[0];
      if (!ctx.isDict(d)) { if (ctx.isUnk(d)) return unkRet(ctx, 'read_dict の入力'); ctx.err('TypeError', 'read_dict() argument must be a dictionary', ''); return UNK(''); }
      for (const e of d.__dict.values()) {
        if (typeof e.k !== 'string') { ctx.err('TypeError', 'section names must be strings', ''); return UNK(''); }
        if (!ctx.isDict(e.v)) { ctx.err('TypeError', 'values for sections must be dictionaries', ''); return UNK(''); }
        let map;
        if (e.k === self.data.defaultSection) map = self.data.defaults;
        else {
          if (!self.data.sections.has(e.k)) self.data.sections.set(e.k, new Map());
          map = self.data.sections.get(e.k);
        }
        for (const oe of e.v.__dict.values()) {
          if (typeof oe.k !== 'string') { ctx.err('TypeError', 'option names must be strings', ''); return UNK(''); }
          if (self.data.strict && map.has(xform(oe.k))) {
            ctx.err('configparser.DuplicateOptionError', "option '" + xform(oe.k) + "' already exists", '');
            return UNK('');
          }
          if (setOptionValue(ctx, self.data, map, oe.k, oe.v, 'read_dict') === false) return UNK('');
        }
      }
      return NONE;
    },
    read: unsupportedFn('configparser.ConfigParser.read', 'ファイル名からの読み込みを前提とするため'),
    write: unsupportedFn('configparser.ConfigParser.write', 'ファイルオブジェクトへの書き込みを前提とするため'),
    sections: (ctx, self) => LIST([...self.data.sections.keys()]),
    has_section: (ctx, self, args) => {
      if (typeof args[0] !== 'string') return BOOL(false);
      return BOOL(args[0] !== self.data.defaultSection && self.data.sections.has(args[0]));
    },
    has_option: (ctx, self, args) => {
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') return BOOL(false);
      return BOOL(lookupRaw(ctx, self.data, args[0], xform(args[1]), null) !== undefined &&
        (args[0] === self.data.defaultSection || self.data.sections.has(args[0])));
    },
    add_section: (ctx, self, args) => {
      const name = args[0];
      if (typeof name !== 'string') { if (ctx.isUnk(name)) return unkRet(ctx, 'add_section の引数'); ctx.err('TypeError', 'section name must be a string', ''); return UNK(''); }
      if (name === self.data.defaultSection) { ctx.err('ValueError', 'Invalid section name: ' + name, ''); return UNK(''); }
      if (self.data.sections.has(name)) { ctx.err('configparser.DuplicateSectionError', "section '" + name + "' already exists", ''); return UNK(''); }
      self.data.sections.set(name, new Map());
      return NONE;
    },
    remove_section: (ctx, self, args) => {
      if (typeof args[0] !== 'string') return BOOL(false);
      return BOOL(self.data.sections.delete(args[0]));
    },
    remove_option: (ctx, self, args) => {
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') return BOOL(false);
      const map = args[0] === self.data.defaultSection ? self.data.defaults : self.data.sections.get(args[0]);
      if (!map) return BOOL(false);
      return BOOL(map.delete(xform(args[1])));
    },
    options: (ctx, self, args) => {
      const map = sectionMap(ctx, self.data, args[0], 'options');
      if (map === null) return UNK('');
      if (args[0] === self.data.defaultSection) return LIST([...self.data.defaults.keys()]);
      return LIST(mergedOptions(self.data, args[0]));
    },
    get: (ctx, self, args, kwargs) => getImpl(ctx, self.data, args, kwargs),
    getint: (ctx, self, args, kwargs) => {
      const v = getImpl(ctx, self.data, args, kwargs);
      if (typeof v !== 'string') return v;
      const t = v.trim();
      if (!/^[+-]?\d+$/.test(t.replace(/_/g, ''))) { ctx.err('ValueError', "invalid literal for int() with base 10: '" + v + "'", ''); return UNK(''); }
      return I(parseInt(t.replace(/_/g, ''), 10));
    },
    getfloat: (ctx, self, args, kwargs) => {
      const v = getImpl(ctx, self.data, args, kwargs);
      if (typeof v !== 'string') return v;
      const num = pyFloatParse(v);
      if (num === null) { ctx.err('ValueError', "could not convert string to float: '" + v + "'", ''); return UNK(''); }
      return F(num);
    },
    getboolean: (ctx, self, args, kwargs) => {
      const v = getImpl(ctx, self.data, args, kwargs);
      if (typeof v !== 'string') return v;
      const key = v.toLowerCase();
      if (!(key in BOOLEAN_STATES)) { ctx.err('ValueError', 'Not a boolean: ' + v, ''); return UNK(''); }
      return BOOL(BOOLEAN_STATES[key]);
    },
    set: (ctx, self, args, kwargs) => {
      const section = args[0], option = args[1];
      const value = args.length > 2 ? args[2] : ('value' in kwargs ? kwargs.value : NONE);
      if (typeof section !== 'string' || typeof option !== 'string') return unkRet(ctx, 'set の引数');
      const map = sectionMap(ctx, self.data, section, 'set');
      if (map === null) return UNK('');
      setOptionValue(ctx, self.data, map, option, value, 'set');
      return NONE;
    },
    items: (ctx, self, args, kwargs) => {
      if (args.length === 0 || ctx.isNone(args[0])) {
        const out = [TUPLE([self.data.defaultSection, makeProxy(self, self.data.defaultSection)])];
        for (const name of self.data.sections.keys()) out.push(TUPLE([name, makeProxy(self, name)]));
        return LIST(out);
      }
      const section = args[0];
      const map = sectionMap(ctx, self.data, section, 'items');
      if (map === null) return UNK('');
      const names = section === self.data.defaultSection ? [...self.data.defaults.keys()] : mergedOptions(self.data, section);
      const raw = kwRaw(ctx, kwargs);
      const vars = 'vars' in kwargs && ctx.isDict(kwargs.vars) ? kwargs.vars : null;
      return LIST(names.map((opt) => {
        const v = lookupRaw(ctx, self.data, section, opt, vars);
        let val = v;
        if (!raw && self.data.interpolation !== null && typeof v === 'string') {
          const r = self.data.interpolation === 'basic'
            ? interpolateBasic(ctx, self.data, section, opt, v, vars, 0)
            : interpolateExtended(ctx, self.data, section, opt, v, vars, 0);
          if (r !== null) val = r;
        }
        return TUPLE([opt, val === undefined ? NONE : val]);
      }));
    },
    defaults: (ctx, self) => makeDictFrom([...self.data.defaults.entries()]),
    optionxform: (ctx, self, args) => (typeof args[0] === 'string' ? xform(args[0]) : unkRet(ctx, 'optionxform の引数')),
  };
}
function pyFloatParse(s) {
  const t = s.trim().replace(/_/g, '');
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return Number(t);
  if (/^[+-]?(inf(inity)?|nan)$/i.test(t)) return /nan/i.test(t) ? NaN : (t.startsWith('-') ? -Infinity : Infinity);
  return null;
}
function makeProxy(parserVal, name) {
  return { __native: PROXY_Q, mod: 'configparser', data: { parser: parserVal, name } };
}
const PROXY_DEF = {
  typeName: 'SectionProxy',
  getitem: (ctx, self, key) => {
    if (typeof key !== 'string') return null;
    return getImpl(ctx, self.data.parser.data, [self.data.name, key], {});
  },
  attrs: {
    name: (ctx, self) => self.data.name,
    parser: (ctx, self) => self.data.parser,
  },
  methods: {
    get: (ctx, self, args, kwargs) => getImpl(ctx, self.data.parser.data, [self.data.name, args[0]], kwargs),
  },
};
function parserDef(qualname, isRaw) {
  return {
    typeName: qualname.split('.')[1],
    construct: (ctx, args, kwargs) => {
      const r = readConstructOpts(ctx, args, kwargs, isRaw);
      if (r === null) return unkRet(ctx, 'configparser のコンストラクタ引数');
      const data = makeParserData(r.opts);
      const val = { __native: qualname, mod: 'configparser', data };
      if (storeDefaults(ctx, data, r.defaultsV, 'ConfigParser') === false) return UNK('');
      val.data = data;
      return val;
    },
    repr: (ctx, self) => '<configparser.' + (isRaw ? 'RawConfigParser' : 'ConfigParser') + ' object>',
    getitem: (ctx, self, key) => {
      if (typeof key !== 'string') return UNK('');
      if (key === self.data.defaultSection || self.data.sections.has(key)) return makeProxy(self, key);
      ctx.err('KeyError', "'" + key + "'", '');
      return UNK('');
    },
    setitem: (ctx, self, key, value) => {
      if (typeof key !== 'string' || !ctx.isDict(value)) return false;
      let map;
      if (key === self.data.defaultSection) map = self.data.defaults;
      else { self.data.sections.set(key, new Map()); map = self.data.sections.get(key); }
      map.clear();
      for (const e of value.__dict.values()) {
        if (typeof e.k !== 'string') return false;
        setOptionValue(ctx, self.data, map, e.k, e.v, 'setitem');
      }
      return true;
    },
    methods: parserMethods(isRaw),
    classAttrs: {
      BOOLEAN_STATES: () => makeDictFrom(Object.entries(BOOLEAN_STATES).map(([k, v]) => [k, BOOL(v)])),
      SECTCRE: UNK('configparser.SECTCRE（正規表現オブジェクトは未検証）'),
    },
  };
}
const EXC = (name, parents) => ({ typeName: name, exc: 'configparser.' + name, excParents: parents });

registerStdlibModule('configparser', {
  data: {
    MAX_INTERPOLATION_DEPTH: I(MAX_INTERPOLATION_DEPTH),
    UNNAMED_SECTION: UNK('configparser.UNNAMED_SECTION（特殊センチネルは未検証）'),
    DEFAULTSECT: 'DEFAULT',
  },
  classes: {
    ConfigParser: parserDef(PARSER_Q, false),
    RawConfigParser: parserDef(RAW_Q, true),
    SectionProxy: PROXY_DEF,
    BasicInterpolation: { typeName: 'BasicInterpolation', construct: (ctx) => ({ __native: BASIC_Q, mod: 'configparser', data: {} }), repr: () => '<configparser.BasicInterpolation object>' },
    ExtendedInterpolation: { typeName: 'ExtendedInterpolation', construct: (ctx) => ({ __native: EXT_Q, mod: 'configparser', data: {} }), repr: () => '<configparser.ExtendedInterpolation object>' },
    Error: EXC('Error', ['Exception']),
    NoSectionError: EXC('NoSectionError', ['configparser.Error']),
    NoOptionError: EXC('NoOptionError', ['configparser.Error']),
    DuplicateSectionError: EXC('DuplicateSectionError', ['configparser.Error']),
    DuplicateOptionError: EXC('DuplicateOptionError', ['configparser.Error']),
    ParsingError: EXC('ParsingError', ['configparser.Error']),
    MissingSectionHeaderError: EXC('MissingSectionHeaderError', ['configparser.ParsingError']),
    MultilineContinuationError: EXC('MultilineContinuationError', ['configparser.ParsingError']),
    InterpolationError: EXC('InterpolationError', ['configparser.Error']),
    InterpolationMissingOptionError: EXC('InterpolationMissingOptionError', ['configparser.InterpolationError']),
    InterpolationSyntaxError: EXC('InterpolationSyntaxError', ['configparser.InterpolationError']),
    InterpolationDepthError: EXC('InterpolationDepthError', ['configparser.InterpolationError']),
    InvalidWriteError: EXC('InvalidWriteError', ['configparser.Error']),
    UnnamedSectionDisabledError: EXC('UnnamedSectionDisabledError', ['configparser.Error']),
  },
});
export {};
