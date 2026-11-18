/* 高度モード B7 G10：urllib.parse（文字列処理。CPython 3.12.3 実走照合）。
 * bytes 版（quote_from_bytes 等）はエンジンの bytes 表現が UNK のため未検証
 * （リファレンス側で unverified。ここには登録しない）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT } = PyAPI;

function S(ctx, v, fn) { const s = ctx.str(v); if (s === null) ctx.err('TypeError', fn + '() の引数には文字列を使ってください', ''); return s; }
function noKw(ctx, kwargs, fn) { const ks = Object.keys(kwargs || {}); if (ks.length) ctx.err('TypeError', fn + '() にキーワード引数「' + ks[0] + '」はありません', ''); }

/* ---- URL 分解（CPython urllib/parse.py の urlsplit 相当） ---- */
const USES_PARAMS = ['ftp', 'hdl', 'prospero', 'http', 'imap', 'https', 'shttp', 'rtsp', 'rtspu', 'sip', 'sips', 'mms', 'sftp', 'tel'];
function splitUrl(url, scheme, allowFragments) {
  let rest = url, sch = scheme || '', frag = '';
  const ci = rest.indexOf(':');
  if (ci > 0) {
    const cand = rest.slice(0, ci);
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(cand)) { sch = cand.toLowerCase(); rest = rest.slice(ci + 1); }
  }
  let netloc = '';
  if (rest.startsWith('//')) {
    const after = rest.slice(2);
    const m = /^[^/?#]*/.exec(after); netloc = m[0]; rest = after.slice(netloc.length);
    // CPython: netloc 中の無効な括弧は ValueError（簡略：[] の対応のみ確認）
    const ob = (netloc.match(/\[/g) || []).length, cb = (netloc.match(/\]/g) || []).length;
    if (ob !== cb) throw { __g10err: 'Invalid IPv6 URL' };
  }
  if (allowFragments) { const fi = rest.indexOf('#'); if (fi >= 0) { frag = rest.slice(fi + 1); rest = rest.slice(0, fi); } }
  let query = '';
  const qi = rest.indexOf('?'); if (qi >= 0) { query = rest.slice(qi + 1); rest = rest.slice(0, qi); }
  let params = '';
  if (USES_PARAMS.includes(sch)) { const si = rest.lastIndexOf(';'); if (si >= 0) { params = rest.slice(si + 1); rest = rest.slice(0, si); } }
  return { scheme: sch, netloc, path: rest, params, query, fragment: frag };
}
function makeResult(ctx, qual, fields, kinds) {
  return ctx.native(qual, { fields, kinds });
}
function resultClass(qual, fieldNames, typeName) {
  return {
    typeName,
    construct: (ctx, args, kwargs) => {
      // namedtuple らしく位置引数で構築（不足は '' ）
      const fields = fieldNames.map((_, i) => (i < args.length ? ctx.str(args[i]) ?? '' : ''));
      return makeResult(ctx, qual, fields, fieldNames);
    },
    attrs: Object.fromEntries(fieldNames.map((f, i) => [f, (ctx, self) => self.data.fields[i]])),
    methods: {
      geturl: (ctx, self) => getUrl(self.data.fields, self.data.kinds),
      _asdict: (ctx, self) => { const d = DICT(); fieldNames.forEach((f, i) => PyAPI.dictSet(d, f, self.data.fields[i])); return d; },
    },
    getitem: (ctx, self, key) => {
      const n = ctx.num(key); if (n === null) { if (key && key.__slice) { const a = self.data.fields.slice(key.lo ?? undefined, key.hi ?? undefined); return TUPLE(a); } return ctx.NOT_HANDLED; }
      let i = n; if (i < 0) i += self.data.fields.length;
      if (i < 0 || i >= self.data.fields.length) ctx.err('IndexError', 'tuple index out of range', '');
      return self.data.fields[i];
    },
    len: (ctx, self) => self.data.fields.length,
    iter: (ctx, self) => self.data.fields.slice(),
    eq: (ctx, self, other) => {
      const o = other && (other.__tuple || other.__list); if (!o) return false;
      if (o.length !== self.data.fields.length) return false;
      return self.data.fields.every((f, i) => ctx.eq(f, o[i]) === true);
    },
    hash: (ctx, self) => 't:' + self.data.fields.map((f) => ctx.repr(f)).join(','),
    repr: (ctx, self) => typeName + '(' + fieldNames.map((f, i) => f + '=' + ctx.repr(self.data.fields[i])).join(', ') + ')',
  };
}
function getUrl(f, kinds) {
  if (kinds.includes('params')) {
    // ParseResult.geturl = urlunparse
    return unparseTuple(f);
  }
  if (kinds.length === 5) return unsplitTuple(f);
  // DefragResult
  return f[1] ? f[0] + '#' + f[1] : f[0];
}
function unparseTuple([scheme, netloc, url, params, query, fragment]) {
  if (params) url = url + ';' + params;
  if (netloc || (scheme && url.slice(0, 2) !== '//')) { if (url && url[0] !== '/') url = '/' + url; url = '//' + (netloc || '') + url; }
  if (scheme) url = scheme + ':' + url;
  if (query) url = url + '?' + query;
  if (fragment) url = url + '#' + fragment;
  return url;
}
function unsplitTuple([scheme, netloc, url, query, fragment]) {
  if (netloc || (scheme && url.slice(0, 2) !== '//')) { if (url && url[0] !== '/') url = '/' + url; url = '//' + (netloc || '') + url; }
  if (scheme) url = scheme + ':' + url;
  if (query) url = url + '?' + query;
  if (fragment) url = url + '#' + fragment;
  return url;
}
const PARSE_FIELDS = ['scheme', 'netloc', 'path', 'params', 'query', 'fragment'];
const SPLIT_FIELDS = ['scheme', 'netloc', 'path', 'query', 'fragment'];

function doParse(ctx, args, kwargs, splitOnly) {
  const fn = splitOnly ? 'urlsplit' : 'urlparse';
  const url = S(ctx, args[0], fn);
  const scheme = args.length > 1 && args[1] !== undefined ? (ctx.str(args[1]) ?? '') : (kwargs.scheme !== undefined ? (ctx.str(kwargs.scheme) ?? '') : '');
  const allow = kwargs.allow_fragments !== undefined ? ctx.truthy(kwargs.allow_fragments) : true;
  let r;
  try { r = splitUrl(url, scheme, allow !== false); } catch (e) { if (e && e.__g10err) ctx.err('ValueError', e.__g10err, ''); throw e; }
  if (splitOnly) {
    // urlsplit は params を path に残す
    const path = r.params ? r.path + ';' + r.params : r.path;
    return makeResult(ctx, 'urllib.parse.SplitResult', [r.scheme, r.netloc, path, r.query, r.fragment], SPLIT_FIELDS);
  }
  return makeResult(ctx, 'urllib.parse.ParseResult', [r.scheme, r.netloc, r.path, r.params, r.query, r.fragment], PARSE_FIELDS);
}

/* ---- quote / unquote ---- */
const encoder = new TextEncoder(); const decoder = new TextDecoder('utf-8', { fatal: false });
function quoteStr(str, safe, encoding, errors) {
  let out = '';
  const alwaysSafe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~';
  for (const ch of str) {
    if (alwaysSafe.includes(ch) || safe.includes(ch)) { out += ch; continue; }
    let bytes;
    try { bytes = encoder.encode(ch); } catch { bytes = []; }
    for (const b of bytes) out += '%' + b.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}
function unquoteStr(str, encoding) {
  // %XX をバイト列として集め UTF-8 復号（不正シーケンスは U+FFFD。CPython errors='replace' 既定）
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '%' && i + 2 < str.length + 0 && /^[0-9a-fA-F]{2}$/.test(str.slice(i + 1, i + 3))) { bytes.push(parseInt(str.slice(i + 1, i + 3), 16)); i += 2; }
    else { for (const b of encoder.encode(str[i])) bytes.push(b); }
  }
  return decoder.decode(new Uint8Array(bytes));
}
function parseQsl(qs, keepBlank, strict, maxNum, separator, encoding) {
  const pairs = [];
  const parts = qs.split(separator);
  let count = 0;
  for (const part of parts) {
    if (!part && !keepBlank) continue;
    if (!part) continue;
    count++;
    if (maxNum !== null && count > maxNum) throw { __g10err: 'Max number of fields exceeded' };
    const eq = part.indexOf('=');
    let name, value;
    if (eq >= 0) { name = part.slice(0, eq); value = part.slice(eq + 1); }
    else { if (strict) throw { __g10err: 'bad query field: ' + JSON.stringify(part) }; name = part; value = ''; }
    if (value || keepBlank) {
      pairs.push([unquoteStr(name.replace(/\+/g, ' '), encoding), unquoteStr(value.replace(/\+/g, ' '), encoding)]);
    }
  }
  return pairs;
}
function qsArgs(ctx, args, kwargs, fn) {
  const qs = S(ctx, args[0], fn);
  const keepBlank = kwargs.keep_blank_values !== undefined ? !!ctx.truthy(kwargs.keep_blank_values) : false;
  const strict = kwargs.strict_parsing !== undefined ? !!ctx.truthy(kwargs.strict_parsing) : false;
  const maxNum = kwargs.max_num_fields !== undefined && !ctx.isNone(kwargs.max_num_fields) ? ctx.num(kwargs.max_num_fields) : null;
  const sep = kwargs.separator !== undefined ? (ctx.str(kwargs.separator) ?? '&') : '&';
  try { return parseQsl(qs, keepBlank, strict, maxNum, sep, 'utf-8'); }
  catch (e) { if (e && e.__g10err) ctx.err('ValueError', e.__g10err, ''); throw e; }
}

/* ---- urljoin（RFC 3986。CPython の実装規則に合わせる） ---- */
function removeDotSegments(path) {
  // CPython は urljoin 内で独自の簡易処理を行う（空セグメント除去＋ . / .. 解決）
  const segs = path.split('/');
  const out = [];
  for (const s of segs) {
    if (s === '..') { out.pop(); }
    else if (s !== '.' && s !== '') { out.push(s); }
  }
  let res = '/' + out.join('/');
  // 末尾が / ・ /. ・ /.. の場合は末尾スラッシュを保つ
  if (path.endsWith('/') || path.endsWith('/.') || path.endsWith('/..')) { if (!res.endsWith('/')) res += '/'; }
  if (!path.startsWith('/')) res = res.slice(1);
  return res;
}
function urljoin(base, url, allowFragments = true) {
  if (!base) return url;
  if (!url) return base;
  const b = splitUrl(base, '', true);
  // url 側に scheme があればそのまま（CPython: bscheme と違う/同じの規則）
  const ci = url.indexOf(':');
  let uscheme = '';
  if (ci > 0 && /^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(url.slice(0, ci))) uscheme = url.slice(0, ci).toLowerCase();
  if (uscheme) {
    if (uscheme !== b.scheme) return url;
    // 同じ scheme の場合は url を分解して続行
  }
  const u = splitUrl(url, b.scheme, allowFragments);
  if (u.netloc) return unsplitTuple([b.scheme, u.netloc, removeDotSegments(u.path), u.query, u.fragment]);
  if (!u.path) {
    // 空パス：base のパスを引き継ぎ、query が無ければ base の query も引き継ぐ
    return unsplitTuple([b.scheme, b.netloc, b.path + (b.params ? ';' + b.params : ''), u.query !== '' ? u.query : b.query, u.fragment]);
  }
  let merged;
  if (u.path.startsWith('/')) merged = removeDotSegments(u.path);
  else {
    const bpath = b.path;
    const dir = bpath.includes('/') ? bpath.slice(0, bpath.lastIndexOf('/') + 1) : '';
    merged = removeDotSegments(dir + u.path);
    if (b.netloc && !merged.startsWith('/')) merged = '/' + merged;
  }
  return unsplitTuple([b.scheme, b.netloc, merged, u.query, u.fragment]);
}

registerStdlibModule('urllib.parse', {
  functions: {
    urlparse: (ctx, args, kwargs) => doParse(ctx, args, kwargs || {}, false),
    urlsplit: (ctx, args, kwargs) => doParse(ctx, args, kwargs || {}, true),
    urlunparse: (ctx, args) => { const t = ctx.listOf(args[0]) || ctx.iterable(args[0]); if (!t) ctx.err('TypeError', 'urlunparse() の引数には並びを使ってください', ''); const f = [0, 1, 2, 3, 4, 5].map((i) => ctx.str(t[i]) ?? ''); return unparseTuple(f); },
    urlunsplit: (ctx, args) => { const t = ctx.listOf(args[0]) || ctx.iterable(args[0]); if (!t) ctx.err('TypeError', 'urlunsplit() の引数には並びを使ってください', ''); const f = [0, 1, 2, 3, 4].map((i) => ctx.str(t[i]) ?? ''); return unsplitTuple(f); },
    urljoin: (ctx, args, kwargs) => { const allow = (kwargs || {}).allow_fragments !== undefined ? ctx.truthy(kwargs.allow_fragments) !== false : true; return urljoin(S(ctx, args[0], 'urljoin'), S(ctx, args[1], 'urljoin'), allow); },
    urldefrag: (ctx, args) => { const url = S(ctx, args[0], 'urldefrag'); const i = url.indexOf('#'); const fields = i >= 0 ? [url.slice(0, i), url.slice(i + 1)] : [url, '']; return makeResult(ctx, 'urllib.parse.DefragResult', fields, ['url', 'fragment']); },
    quote: (ctx, args, kwargs) => { const s = S(ctx, args[0], 'quote'); const safe = args.length > 1 ? (ctx.str(args[1]) ?? '/') : ((kwargs || {}).safe !== undefined ? ctx.str(kwargs.safe) ?? '/' : '/'); return quoteStr(s, safe, 'utf-8', 'strict'); },
    quote_plus: (ctx, args, kwargs) => { const s = S(ctx, args[0], 'quote_plus'); const safe = args.length > 1 ? (ctx.str(args[1]) ?? '') : ''; return quoteStr(s, safe, 'utf-8', 'strict').replace(/%20/g, '+'); },
    unquote: (ctx, args) => unquoteStr(S(ctx, args[0], 'unquote'), 'utf-8'),
    unquote_plus: (ctx, args) => unquoteStr(S(ctx, args[0], 'unquote_plus').replace(/\+/g, ' '), 'utf-8'),
    parse_qsl: (ctx, args, kwargs) => LIST(qsArgs(ctx, args, kwargs || {}, 'parse_qsl').map(([a, b]) => TUPLE([a, b]))),
    parse_qs: (ctx, args, kwargs) => { const pairs = qsArgs(ctx, args, kwargs || {}, 'parse_qs'); const d = DICT(); for (const [k, v] of pairs) { const cur = PyAPI.dictGet(d, k); if (cur) cur.__list.push(v); else PyAPI.dictSet(d, k, LIST([v])); } return d; },
    urlencode: (ctx, args, kwargs) => {
      const q = args[0]; const doseq = (kwargs || {}).doseq !== undefined ? !!ctx.truthy(kwargs.doseq) : false;
      const pairs = [];
      const push = (k, v) => { pairs.push(quoteStr(String(k), '', 'utf-8').replace(/%20/g, '+') + '=' + quoteStr(ctx.str(v) ?? (ctx.num(v) !== null ? String(ctx.num(v)) : ctx.strOf(v)), '', 'utf-8').replace(/%20/g, '+')); };
      if (ctx.isDict(q)) { for (const e of q.__dict.values()) { const k = ctx.str(e.k) ?? ctx.strOf(e.k); const v = e.v; const items = doseq ? ctx.listOf(v) : null; if (items) items.forEach((it) => push(k, it)); else push(k, v); } }
      else { const items = ctx.iterable(q); if (!items) ctx.err('TypeError', 'urlencode() の引数には辞書かペアの並びを使ってください', ''); for (const it of items) { const p = ctx.listOf(it) || ctx.iterable(it); if (!p || p.length !== 2) ctx.err('TypeError', 'urlencode() の各要素はペアにしてください', ''); const k = ctx.str(p[0]) ?? ctx.strOf(p[0]); const items2 = doseq ? ctx.listOf(p[1]) : null; if (items2) items2.forEach((x) => push(k, x)); else push(k, p[1]); } }
      return pairs.join('&');
    },
    unwrap: (ctx, args) => { let url = S(ctx, args[0], 'unwrap'); url = url.trim(); if (url.startsWith('<URL:')) url = url.slice(5); if (url.startsWith('<')) url = url.slice(1); if (url.endsWith('>')) url = url.slice(0, -1); return url.trim(); },
  },
  classes: {
    ParseResult: resultClass('urllib.parse.ParseResult', PARSE_FIELDS, 'ParseResult'),
    SplitResult: resultClass('urllib.parse.SplitResult', SPLIT_FIELDS, 'SplitResult'),
    DefragResult: resultClass('urllib.parse.DefragResult', ['url', 'fragment'], 'DefragResult'),
  },
});
export const __g10Urljoin = urljoin;
