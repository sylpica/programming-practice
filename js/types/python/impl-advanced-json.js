/* 高度モード B7 G7: json モジュール。
* dumps/loads を CPython 3.12.3 実走の意味論（エラー文面・pos・lineno/colno、
* キー強制変換、NaN/Infinity、ensure_ascii、indent、separators、sort_keys、
* default/parse_* フック）どおりに実装。dump/load はファイル前提のため未対応。
* JSONDecodeError の属性（msg/doc/pos/lineno/colno）は例外属性チャンネル
* （ctx.errAttrs）で配線済み（B7 R2）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  I, F, BOOL, NONE, LIST, TUPLE, ITER, UNK, makeBytesVal, bytesArr, unkRet,
  unsupportedFn, onlyKw, kwBool, kwVal, floatReprOf, makeDictFrom,
} from './impl-advanced-g7-common.js';
import { PyAPI } from './engine.js';

const ESCAPE_MAP = { '"': '\\"', '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f' };
function encodeStr(s, ensureAscii) {
  let out = '"';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (ESCAPE_MAP[ch] && cp < 0x80) { out += ESCAPE_MAP[ch]; continue; }
    if (cp < 0x20) { out += '\\u' + cp.toString(16).padStart(4, '0'); continue; }
    if (ensureAscii && cp > 0x7e) {
      if (cp > 0xffff) {
        const v = cp - 0x10000;
        out += '\\u' + (0xd800 + (v >> 10)).toString(16) + '\\u' + (0xdc00 + (v & 0x3ff)).toString(16);
      } else {
        out += '\\u' + cp.toString(16).padStart(4, '0');
      }
      continue;
    }
    out += ch;
  }
  return out + '"';
}
function floatJson(ctx, x, allowNan) {
  if (Number.isNaN(x)) { if (!allowNan) ctx.err('ValueError', 'Out of range float values are not JSON compliant', ''); return 'NaN'; }
  if (x === Infinity) { if (!allowNan) ctx.err('ValueError', 'Out of range float values are not JSON compliant', ''); return 'Infinity'; }
  if (x === -Infinity) { if (!allowNan) ctx.err('ValueError', 'Out of range float values are not JSON compliant', ''); return '-Infinity'; }
  return floatReprOf(ctx, x);
}
function keyJson(ctx, k, opts) {
  if (typeof k === 'string') return encodeStr(k, opts.ensureAscii);
  if (ctx.isBool(k)) return k.v ? '"true"' : '"false"';
  if (ctx.isNone(k)) return '"null"';
  if (ctx.isNum(k)) {
    if (k.f) return '"' + floatJson(ctx, k.v, opts.allowNan) + '"';
    return '"' + String(k.v) + '"';
  }
  if (opts.skipkeys) return null;
  ctx.err('TypeError', 'keys must be str, int, float, bool or None, not ' + ctx.typeName(k), '');
  return null;
}
function encodeValue(ctx, v, opts, level, seen) {
  if (ctx.isNone(v)) return 'null';
  if (ctx.isBool(v)) return v.v ? 'true' : 'false';
  if (typeof v === 'string') return encodeStr(v, opts.ensureAscii);
  if (ctx.isNum(v)) return v.f ? floatJson(ctx, v.v, opts.allowNan) : String(v.v);
  if (ctx.isList(v) || ctx.isTuple(v)) {
    const items = ctx.isList(v) ? v.__list : v.__tuple;
    if (opts.checkCircular) {
      if (seen.has(v)) ctx.err('ValueError', 'Circular reference detected', '');
      seen.add(v);
    }
    const parts = items.map((it) => encodeValue(ctx, it, opts, level + 1, seen));
    if (opts.checkCircular) seen.delete(v);
    return joinParts(parts, opts, level, '[', ']');
  }
  if (ctx.isDict(v)) {
    if (opts.checkCircular) {
      if (seen.has(v)) ctx.err('ValueError', 'Circular reference detected', '');
      seen.add(v);
    }
    let entries = [...v.__dict.values()].map((e) => [e.k, e.v]);
    if (opts.sortKeys) {
      entries.sort((a, b) => {
        const ka = sortKeyOf(ctx, a[0], opts), kb = sortKeyOf(ctx, b[0], opts);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
    }
    const parts = [];
    for (const [k, val] of entries) {
      const ks = keyJson(ctx, k, opts);
      if (ks === null) continue;
      parts.push(ks + opts.keySep + encodeValue(ctx, val, opts, level + 1, seen));
    }
    if (opts.checkCircular) seen.delete(v);
    return joinParts(parts, opts, level, '{', '}');
  }
  if (ctx.isUnk(v)) return null; // 呼び出し側で UNK 化
  if (opts.defaultFn && !ctx.isNone(opts.defaultFn)) {
    const r = ctx.call(opts.defaultFn, [v]);
    if (ctx.isUnk(r)) return null;
    return encodeValue(ctx, r, opts, level, seen);
  }
  ctx.err('TypeError', 'Object of type ' + ctx.typeName(v) + ' is not JSON serializable', '');
  return null;
}
function sortKeyOf(ctx, k, opts) {
  if (typeof k === 'string') return k;
  if (ctx.isBool(k)) return k.v ? 'true' : 'false';
  if (ctx.isNone(k)) return 'null';
  if (ctx.isNum(k)) return k.f ? floatJson(ctx, k.v, opts.allowNan) : String(k.v);
  return '';
}
function joinParts(parts, opts, level, open, close) {
  if (!parts.length) return open + close;
  if (opts.indent === null || opts.indent === undefined) {
    return open + parts.join(opts.itemSep) + close;
  }
  const pad = opts.indentStr.repeat(level + 1);
  const padEnd = opts.indentStr.repeat(level);
  return open + '\n' + pad + parts.join(opts.itemSep + '\n' + pad) + '\n' + padEnd + close;
}
function dumpsImpl(ctx, obj, o) {
  const opts = {
    ensureAscii: o.ensureAscii !== false,
    allowNan: o.allowNan !== false,
    checkCircular: o.checkCircular !== false,
    skipkeys: !!o.skipkeys,
    sortKeys: !!o.sortKeys,
    defaultFn: o.defaultFn || null,
    indent: o.indent === undefined ? null : o.indent,
    indentStr: '',
    itemSep: ', ',
    keySep: ': ',
  };
  if (opts.indent !== null && !ctx.isNone(opts.indent)) {
    if (typeof opts.indent === 'string') opts.indentStr = opts.indent;
    else {
      const n = ctx.int(opts.indent);
      if (n === null) return unkRet(ctx, 'indent');
      opts.indentStr = ' '.repeat(Math.max(0, n));
    }
    opts.itemSep = ',';
  }
  if (o.separators !== undefined && !ctx.isNone(o.separators)) {
    const items = ctx.isTuple(o.separators) || ctx.isList(o.separators)
      ? (o.separators.__tuple || o.separators.__list) : null;
    if (!items || items.length !== 2 || typeof items[0] !== 'string' || typeof items[1] !== 'string') {
      ctx.err('TypeError', 'separators must be a (item_separator, key_separator) tuple', '');
      return UNK('');
    }
    opts.itemSep = items[0]; opts.keySep = items[1];
  }
  const r = encodeValue(ctx, obj, opts, 0, new Set());
  return r === null ? unkRet(ctx, 'json.dumps の入力') : r;
}

/* ---- デコーダ ---- */
/* JSONDecodeError の属性（msg/doc/pos/lineno/colno）を例外属性チャンネルで
 * 配線する（B7 R2）。pos は CPython どおりコードポイント単位：doc は JS
 * 文字列（UTF-16）なので、呼び出し側の pos（UTF-16 インデックス）を
 * コードポイント数へ換算してから属性と表示文の両方に使う。BMP の範囲では
 * 両者は一致する。lineno／colno は CPython と同じく pos から導出する。 */
function decodeError(ctx, doc, msg, posUnits) {
  const cps = [...doc.slice(0, posUnits)];
  const pos = cps.length;
  let lineno = 1, lastNl = -1;
  cps.forEach((ch, idx) => { if (ch === '\n') { lineno++; lastNl = idx; } });
  const colno = pos - lastNl;
  const attrs = { msg, doc, pos: I(pos), lineno: I(lineno), colno: I(colno) };
  ctx.errAttrs('json.JSONDecodeError', msg + ': line ' + lineno + ' column ' + colno + ' (char ' + pos + ')', attrs, '');
}
const WS = new Set([' ', '\t', '\n', '\r']);
function parseValue(ctx, doc, pos, opts) {
  while (pos < doc.length && WS.has(doc[pos])) pos++;
  if (pos >= doc.length) decodeError(ctx, doc, 'Expecting value', pos);
  const ch = doc[pos];
  if (ch === '{') return parseObject(ctx, doc, pos, opts);
  if (ch === '[') return parseArray(ctx, doc, pos, opts);
  if (ch === '"') {
    const [s, end] = parseString(ctx, doc, pos, opts);
    return [s, end];
  }
  if (ch === 't') {
    if (doc.startsWith('true', pos)) return [BOOL(true), pos + 4];
    decodeError(ctx, doc, 'Expecting value', pos);
  }
  if (ch === 'f') {
    if (doc.startsWith('false', pos)) return [BOOL(false), pos + 5];
    decodeError(ctx, doc, 'Expecting value', pos);
  }
  if (ch === 'n') {
    if (doc.startsWith('null', pos)) return [NONE, pos + 4];
    decodeError(ctx, doc, 'Expecting value', pos);
  }
  if (ch === 'N') {
    if (doc.startsWith('NaN', pos)) return [constantHook(ctx, 'NaN', opts), pos + 3];
    decodeError(ctx, doc, 'Expecting value', pos);
  }
  if (ch === 'I') {
    if (doc.startsWith('Infinity', pos)) return [constantHook(ctx, 'Infinity', opts), pos + 8];
    decodeError(ctx, doc, 'Expecting value', pos);
  }
  if (ch === '-' && doc.startsWith('-Infinity', pos)) return [constantHook(ctx, '-Infinity', opts), pos + 9];
  if (ch === '-' || (ch >= '0' && ch <= '9')) return parseNumber(ctx, doc, pos, opts);
  decodeError(ctx, doc, 'Expecting value', pos);
  return null;
}
function constantHook(ctx, name, opts) {
  if (opts.parseConstant && !ctx.isNone(opts.parseConstant)) {
    const r = ctx.call(opts.parseConstant, [name]);
    return r;
  }
  return F(name === 'NaN' ? NaN : name === 'Infinity' ? Infinity : -Infinity);
}
function parseNumber(ctx, doc, pos, opts) {
  const m = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(doc.slice(pos));
  if (!m) decodeError(ctx, doc, 'Expecting value', pos);
  const text = m[0];
  const end = pos + text.length;
  const isFloat = /[.eE]/.test(text);
  if (isFloat) {
    if (opts.parseFloat && !ctx.isNone(opts.parseFloat)) return [ctx.call(opts.parseFloat, [text]), end];
    return [F(Number(text)), end];
  }
  if (opts.parseInt && !ctx.isNone(opts.parseInt)) return [ctx.call(opts.parseInt, [text]), end];
  const v = Number(text);
  if (Number.isSafeInteger(v)) return [I(v), end];
  ctx.diag('json.loads：安全整数を超える整数リテラルは未検証のため確定しません');
  return [UNK('大きな整数（未検証）'), end];
}
function parseString(ctx, doc, pos, opts) {
  const start = pos;
  let i = pos + 1;
  let out = '';
  while (i < doc.length) {
    const ch = doc[i];
    if (ch === '"') return [out, i + 1];
    if (ch === '\\') {
      const e = doc[i + 1];
      if (e === 'u') {
        const hex = doc.slice(i + 2, i + 6);
        // CPython の pos は 'u' の位置（バックスラッシュの次）を指す（3.12.3 実走で照合）。
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) decodeError(ctx, doc, 'Invalid \\uXXXX escape', i + 1);
        let cp = parseInt(hex, 16);
        i += 6;
        if (cp >= 0xd800 && cp <= 0xdbff && doc[i] === '\\' && doc[i + 1] === 'u') {
          const hex2 = doc.slice(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hex2)) {
            const lo = parseInt(hex2, 16);
            if (lo >= 0xdc00 && lo <= 0xdfff) { cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00); i += 6; }
          }
        }
        out += String.fromCodePoint(cp);
        continue;
      }
      const simple = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
      if (e in simple) { out += simple[e]; i += 2; continue; }
      decodeError(ctx, doc, 'Invalid \\escape', i);
    }
    if (ch < ' ' && opts.strict !== false) decodeError(ctx, doc, 'Invalid control character at', i);
    out += ch;
    i++;
  }
  decodeError(ctx, doc, 'Unterminated string starting at', start);
  return null;
}
function parseArray(ctx, doc, pos, opts) {
  const items = [];
  let i = pos + 1;
  while (i < doc.length && WS.has(doc[i])) i++;
  if (doc[i] === ']') return [LIST(items), i + 1];
  while (true) {
    const [v, end] = parseValue(ctx, doc, i, opts);
    items.push(v);
    i = end;
    while (i < doc.length && WS.has(doc[i])) i++;
    if (doc[i] === ']') return [LIST(items), i + 1];
    if (doc[i] !== ',') decodeError(ctx, doc, "Expecting ',' delimiter", i);
    i++;
  }
}
function parseObject(ctx, doc, pos, opts) {
  let pairs = [];
  let i = pos + 1;
  while (i < doc.length && WS.has(doc[i])) i++;
  if (doc[i] === '}') return [finishObject(ctx, pairs, opts), i + 1];
  while (true) {
    while (i < doc.length && WS.has(doc[i])) i++;
    if (doc[i] !== '"') decodeError(ctx, doc, 'Expecting property name enclosed in double quotes', i);
    const [key, kend] = parseString(ctx, doc, i, opts);
    i = kend;
    while (i < doc.length && WS.has(doc[i])) i++;
    if (doc[i] !== ':') decodeError(ctx, doc, "Expecting ':' delimiter", i);
    i++;
    const [v, vend] = parseValue(ctx, doc, i, opts);
    pairs.push([key, v]);
    i = vend;
    while (i < doc.length && WS.has(doc[i])) i++;
    if (doc[i] === '}') return [finishObject(ctx, pairs, opts), i + 1];
    if (doc[i] !== ',') decodeError(ctx, doc, "Expecting ',' delimiter", i);
    i++;
  }
}
function finishObject(ctx, pairs, opts) {
  if (opts.objectPairsHook && !ctx.isNone(opts.objectPairsHook)) {
    return ctx.call(opts.objectPairsHook, [LIST(pairs.map(([k, v]) => TUPLE([k, v])))]);
  }
  const d = makeDictFrom(pairs);
  if (opts.objectHook && !ctx.isNone(opts.objectHook)) return ctx.call(opts.objectHook, [d]);
  return d;
}
function loadsImpl(ctx, doc, opts) {
  const [v, end] = parseValue(ctx, doc, 0, opts);
  let i = end;
  while (i < doc.length && WS.has(doc[i])) i++;
  if (i < doc.length) decodeError(ctx, doc, 'Extra data', i);
  return v;
}
function docFromInput(ctx, v, fname) {
  if (typeof v === 'string') return v;
  const a = bytesArr(v);
  if (a !== null) {
    // BOM で utf-8/16/32 を判別する（CPython json.detect_encoding 相当）
    if (a.length >= 4 && a[0] === 0x00 && a[1] === 0x00 && a[2] === 0xfe && a[3] === 0xff) return new TextDecoder('utf-32be').decode(new Uint8Array(a.slice(4)));
    if (a.length >= 4 && a[0] === 0xff && a[1] === 0xfe && a[2] === 0x00 && a[3] === 0x00) return new TextDecoder('utf-32le').decode(new Uint8Array(a.slice(4)));
    if (a.length >= 2 && a[0] === 0xfe && a[1] === 0xff) return new TextDecoder('utf-16be').decode(new Uint8Array(a.slice(2)));
    if (a.length >= 2 && a[0] === 0xff && a[1] === 0xfe) return new TextDecoder('utf-16le').decode(new Uint8Array(a.slice(2)));
    if (a.length >= 3 && a[0] === 0xef && a[1] === 0xbb && a[2] === 0xbf) a = a.slice(3);
    const s = new TextDecoder('utf-8').decode(new Uint8Array(a));
    return s;
  }
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'the JSON object must be str, bytes or bytearray, not ' + ctx.typeName(v), '');
  return null;
}
const DECODER_Q = 'json.JSONDecoder';
const ENCODER_Q = 'json.JSONEncoder';
function decoderOptsFrom(ctx, self) { return self ? self.data.opts : {}; }
function makeDecoderVal(opts) { return { __native: DECODER_Q, mod: 'json', data: { opts } }; }
function makeEncoderVal(opts) { return { __native: ENCODER_Q, mod: 'json', data: { opts } }; }
function readDecoderKwargs(ctx, kwargs, args) {
  const get = (name, idx) => (name in kwargs ? kwargs[name] : (args && args.length > idx ? args[idx] : undefined));
  return {
    objectHook: get('object_hook', 0), parseFloat: get('parse_float', 1),
    parseInt: get('parse_int', 2), parseConstant: get('parse_constant', 3),
    strict: get('strict', 4) === undefined ? true : !!ctx.truthy(get('strict', 4)),
    objectPairsHook: get('object_pairs_hook', 5),
  };
}
function readEncoderKwargs(ctx, kwargs, args) {
  const get = (name, idx) => (name in kwargs ? kwargs[name] : (args && args.length > idx ? args[idx] : undefined));
  return {
    skipkeys: !!ctx.truthy(get('skipkeys', 0) || BOOL(false)),
    ensureAscii: get('ensure_ascii', 1) === undefined ? true : !!ctx.truthy(get('ensure_ascii', 1)),
    checkCircular: get('check_circular', 2) === undefined ? true : !!ctx.truthy(get('check_circular', 2)),
    allowNan: get('allow_nan', 3) === undefined ? true : !!ctx.truthy(get('allow_nan', 3)),
    sortKeys: !!ctx.truthy(get('sort_keys', 4) || BOOL(false)),
    indent: get('indent', 5),
    separators: get('separators', 6),
    defaultFn: get('default', 7),
  };
}

const DECODER_DEF = {
  typeName: 'JSONDecoder',
  construct: (ctx, args, kwargs) => makeDecoderVal(readDecoderKwargs(ctx, kwargs, args)),
  repr: (ctx, self) => '<json.decoder.JSONDecoder object>',
  methods: {
    decode: (ctx, self, args) => {
      const doc = docFromInput(ctx, args[0], 'JSONDecoder.decode');
      if (doc === null) return unkRet(ctx, 'JSONDecoder.decode の入力');
      return loadsImpl(ctx, doc, decoderOptsFrom(ctx, self));
    },
    raw_decode: (ctx, self, args) => {
      const doc = docFromInput(ctx, args[0], 'JSONDecoder.raw_decode');
      if (doc === null) return unkRet(ctx, 'JSONDecoder.raw_decode の入力');
      let idx = 0;
      if (args.length > 1) { idx = ctx.int(args[1]); if (idx === null) return unkRet(ctx, 'idx'); }
      const [v, end] = parseValue(ctx, doc, idx, decoderOptsFrom(ctx, self));
      return TUPLE([v, I(end)]);
    },
  },
};
const ENCODER_DEF = {
  typeName: 'JSONEncoder',
  construct: (ctx, args, kwargs) => makeEncoderVal(readEncoderKwargs(ctx, kwargs, args)),
  repr: (ctx, self) => '<json.encoder.JSONEncoder object>',
  methods: {
    encode: (ctx, self, args) => dumpsImpl(ctx, args[0], self.data.opts),
    iterencode: (ctx, self, args) => {
      const r = dumpsImpl(ctx, args[0], self.data.opts);
      if (typeof r !== 'string') return r;
      return ITER([r], 'list_iterator');
    },
    default: (ctx, self, args) => {
      ctx.err('TypeError', 'Object of type ' + ctx.typeName(args[0]) + ' is not JSON serializable', '');
      return UNK('');
    },
  },
};

registerStdlibModule('json', {
  functions: {
    dumps: (ctx, args, kwargs) => {
      const o = readEncoderKwargs(ctx, kwargs, []);
      o.defaultFn = 'default' in kwargs ? kwargs.default : undefined;
      o.indent = 'indent' in kwargs ? kwargs.indent : undefined;
      o.separators = 'separators' in kwargs ? kwargs.separators : undefined;
      return dumpsImpl(ctx, args[0], o);
    },
    loads: (ctx, args, kwargs) => {
      const doc = docFromInput(ctx, args[0], 'json.loads');
      if (doc === null) return unkRet(ctx, 'json.loads の入力');
      const o = readDecoderKwargs(ctx, kwargs, []);
      return loadsImpl(ctx, doc, o);
    },
    dump: unsupportedFn('json.dump', 'ファイルオブジェクトへの書き込みを前提とするため'),
    load: unsupportedFn('json.load', 'ファイルオブジェクトからの読み込みを前提とするため'),
  },
  classes: {
    JSONDecoder: DECODER_DEF,
    JSONEncoder: ENCODER_DEF,
    JSONDecodeError: { typeName: 'JSONDecodeError', exc: 'json.JSONDecodeError', excParents: ['ValueError'] },
  },
});
export {};
