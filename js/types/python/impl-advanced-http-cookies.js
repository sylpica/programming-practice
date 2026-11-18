/* 高度モード B7 G10：http.cookies（CPython 3.12.3 実走照合）。
 * Morsel は dict 的な予約キー保持＋ key/value/coded_value を持つ。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { BOOL, NONE, DICT } = PyAPI;
const RESERVED = { expires: 'expires', path: 'Path', comment: 'Comment', domain: 'Domain', 'max-age': 'Max-Age', secure: 'Secure', httponly: 'HttpOnly', version: 'Version', samesite: 'SameSite', partitioned: 'Partitioned' };
const LEGAL = new Set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&'*+-.^_`|~:/");
function quoteVal(v) {
  // CPython _quote：合法文字（_LegalChars＋/）だけなら無引用、それ以外は "..." で囲む
  if (v === null || v === undefined || v === '') return '';
  const s = String(v);
  if ([...s].every((ch) => LEGAL.has(ch))) return s;
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}
function unquoteVal(s) {
  if (typeof s !== 'string') return s;
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1).replace(/\\(.)/g, '$1');
  return s;
}
function morselData() { return { key: null, value: null, coded: null, dict: {} }; }
function morselOutput(ctx, self, attrs, header) {
  const d = self.data;
  let out = header + ' ' + d.key + '=' + d.coded;
  const items = attrs === null || attrs === undefined ? Object.keys(d.dict) : attrs.__list ? attrs.__list.map((x) => ctx.str(x)) : Object.keys(d.dict);
  for (const k of items) {
    if (!(k in d.dict)) continue;
    if (k === 'expires' && typeof d.dict[k] === 'string') { out += '; expires=' + d.dict[k]; continue; }
    const label = RESERVED[k.toLowerCase()] || k;
    const v = d.dict[k];
    if (v === '' || v === null) out += '; ' + label;
    else out += '; ' + label + '=' + quoteVal(v);
  }
  return out;
}
const MorselDef = {
  typeName: 'Morsel',
  construct: (ctx, args) => ctx.native('http.cookies.Morsel', morselData()),
  attrs: {
    key: (ctx, self) => self.data.key === null ? NONE : self.data.key,
    value: (ctx, self) => self.data.value === null ? NONE : self.data.value,
    coded_value: (ctx, self) => self.data.coded === null ? NONE : self.data.coded,
  },
  methods: {
    set: (ctx, self, args) => { self.data.key = ctx.str(args[0]); self.data.value = ctx.str(args[1]); self.data.coded = ctx.str(args[2]); return NONE; },
    setdefault: (ctx, self, args) => { const k = String(ctx.str(args[0])).toLowerCase(); if (k in self.data.dict) return self.data.dict[k]; const v = args.length > 1 ? ctx.str(args[1]) ?? '' : ''; self.data.dict[k] = v; return v; },
    update: (ctx, self, args) => { const d = args[0]; if (ctx.isDict(d)) for (const e of d.__dict.values()) { const k = String(ctx.str(e.k) ?? ctx.strOf(e.k)).toLowerCase(); if (k in RESERVED) self.data.dict[k] = ctx.str(e.v) ?? ctx.strOf(e.v); } return NONE; },
    copy: (ctx, self) => { const n = ctx.native('http.cookies.Morsel', morselData()); n.data.key = self.data.key; n.data.value = self.data.value; n.data.coded = self.data.coded; n.data.dict = { ...self.data.dict }; return n; },
    isReservedKey: (ctx, self, args) => BOOL(String(ctx.str(args[0])).toLowerCase() in RESERVED),
    OutputString: (ctx, self, args) => morselOutput(ctx, self, args[0], 'Set-Cookie:').slice('Set-Cookie: '.length),
    output: (ctx, self, args, kwargs) => { const header = (kwargs && kwargs.header) || (args[1] !== undefined ? ctx.str(args[1]) : null) || 'Set-Cookie:'; return morselOutput(ctx, self, args[0], header); },
    js_output: (ctx, self, args) => '\n<script type="text/javascript">\n<!-- begin hiding\n' + morselOutput(ctx, self, args[0], 'Set-Cookie:') + ';\n// end hiding -->\n</script>\n',
    __str__: (ctx, self) => morselOutput(ctx, self, null, 'Set-Cookie:').slice('Set-Cookie: '.length),
  },
  getitem: (ctx, self, key) => { const k = String(ctx.str(key)).toLowerCase(); return k in self.data.dict ? self.data.dict[k] : ''; },
  setitem: (ctx, self, key, value) => { const k = String(ctx.str(key)).toLowerCase(); if (k in RESERVED) { self.data.dict[k] = ctx.str(value) ?? ctx.strOf(value); return true; } ctx.err('CookieError', 'Attempt to set a reserved key ' + JSON.stringify(k), ''); return false; },
  contains: (ctx, self, item) => String(ctx.str(item)).toLowerCase() in self.data.dict,
  repr: (ctx, self) => '<Morsel: ' + morselOutput(ctx, self, null, 'Set-Cookie:').slice('Set-Cookie: '.length) + '>',
  str: (ctx, self) => morselOutput(ctx, self, null, 'Set-Cookie:').slice('Set-Cookie: '.length),
  eq: (ctx, self, other) => (other && other.__native === 'http.cookies.Morsel') ? (self.data.key === other.data.key && self.data.coded === other.data.coded && JSON.stringify(self.data.dict) === JSON.stringify(other.data.dict)) : false,
  hash: () => null,
};
function parseCookieString(str, jar) {
  // CPython SimpleCookie.__parse_string の簡略版： key=value; の連なり
  let i = 0; const n = str.length;
  while (i < n) {
    // skip separators
    while (i < n && (str[i] === ';' || str[i] === ',' || /\s/.test(str[i]))) i++;
    if (i >= n) break;
    const km = /^[^\s=;]+/.exec(str.slice(i)); if (!km) break;
    const key = km[0]; i += key.length;
    while (i < n && /\s/.test(str[i])) i++;
    let value = '', coded = '';
    if (str[i] === '=') {
      i++;
      while (i < n && /\s/.test(str[i])) i++;
      if (str[i] === '"') { let j = i + 1; let raw = '"'; while (j < n) { if (str[j] === '\\' && j + 1 < n) { raw += str[j] + str[j + 1]; j += 2; continue; } raw += str[j]; if (str[j] === '"') { j++; break; } j++; } coded = raw; value = unquoteVal(raw); i = j; }
      else { const vm = /^[^\s;]*/.exec(str.slice(i)); coded = vm[0]; value = unquoteVal(coded); i += coded.length; }
    }
    const m = jar.ctxNative(key, value, coded);
    // 続く属性（; path=/ 等）を Morsel へ
    let save = i;
    for (;;) {
      let j = i; while (j < n && /\s/.test(str[j])) j++;
      if (str[j] !== ';') { i = save; break; }
      j++; while (j < n && /\s/.test(str[j])) j++;
      const am = /^[^\s=;]+/.exec(str.slice(j)); if (!am) { i = save; break; }
      const ak = am[0].toLowerCase();
      if (!(ak in RESERVED)) { i = save; break; }
      j += am[0].length; while (j < n && /\s/.test(str[j])) j++;
      let av = '';
      if (str[j] === '=') { j++; while (j < n && /\s/.test(str[j])) j++; if (str[j] === '"') { let k2 = j + 1; let raw = '"'; while (k2 < n) { raw += str[k2]; if (str[k2] === '"' && str[k2 - 1] !== '\\') { k2++; break; } k2++; } av = unquoteVal(raw); j = k2; } else { const vm = /^[^\s;]*/.exec(str.slice(j)); av = vm[0]; j += av.length; } }
      m.data.dict[ak] = av; i = j; save = i;
    }
    jar.add(m);
  }
}
function cookieClass(qual, typeName) {
  return {
    typeName,
    construct: (ctx, args) => {
      const self = ctx.native(qual, { morsels: new Map(), order: [] });
      if (args.length && typeof args[0] === 'string') loadInto(ctx, self, args[0]);
      else if (args.length && ctx.isDict(args[0])) { for (const e of args[0].__dict.values()) setMorsel(ctx, self, ctx.str(e.k) ?? ctx.strOf(e.k), e.v); }
      return self;
    },
    methods: {
      load: (ctx, self, args) => { if (typeof args[0] === 'string') loadInto(ctx, self, args[0]); else if (ctx.isDict(args[0])) for (const e of args[0].__dict.values()) setMorsel(ctx, self, ctx.str(e.k) ?? ctx.strOf(e.k), e.v); return NONE; },
      output: (ctx, self, args, kwargs) => { const header = (kwargs && kwargs.header) || 'Set-Cookie:'; const sep = (kwargs && kwargs.sep) || '\r\n'; const attrs = args[0]; return self.data.order.map((k) => morselOutput(ctx, self.data.morsels.get(k), attrs, header)).join(sep); },
      js_output: (ctx, self, args) => self.data.order.map((k) => '\n<script type="text/javascript">\n<!-- begin hiding\n' + morselOutput(ctx, self.data.morsels.get(k), args[0], 'Set-Cookie:') + ';\n// end hiding -->\n</script>\n').join(''),
      value_decode: (ctx, self, args) => { const v = ctx.str(args[0]); return PyAPI.TUPLE([unquoteVal(v), v]); },
      value_encode: (ctx, self, args) => { const v = ctx.str(args[0]); return PyAPI.TUPLE([v, quoteVal(v)]); },
    },
    getitem: (ctx, self, key) => { const k = ctx.str(key); const m = self.data.morsels.get(k); if (!m) ctx.err('KeyError', ctx.repr(key), ''); return m; },
    setitem: (ctx, self, key, value) => { setMorsel(ctx, self, ctx.str(key), value); return true; },
    contains: (ctx, self, item) => self.data.morsels.has(ctx.str(item)),
    len: (ctx, self) => self.data.order.length,
    iter: (ctx, self) => self.data.order.slice(),
    repr: (ctx, self) => '<' + typeName + ': ' + self.data.order.map((k) => { const m = self.data.morsels.get(k); return m.data.key + '=' + m.data.coded; }).join(' ') + '>',
  };
}
function setMorsel(ctx, self, key, value) {
  const m = ctx.native('http.cookies.Morsel', morselData());
  const v = ctx.str(value) ?? ctx.strOf(value);
  m.data.key = key; m.data.value = v; m.data.coded = quoteVal(v);
  if (!self.data.morsels.has(key)) self.data.order.push(key);
  self.data.morsels.set(key, m);
}
function loadInto(ctx, self, str) {
  const jar = { ctxNative: (k, v, c) => { const m = ctx.native('http.cookies.Morsel', morselData()); m.data.key = k; m.data.value = v; m.data.coded = c; return m; }, add: (m) => { if (!self.data.morsels.has(m.data.key)) self.data.order.push(m.data.key); self.data.morsels.set(m.data.key, m); } };
  parseCookieString(str, jar);
}
registerStdlibModule('http.cookies', {
  classes: {
    CookieError: { typeName: 'CookieError', exc: 'http.cookies.CookieError', excParents: ['Exception'] },
    Morsel: MorselDef,
    BaseCookie: cookieClass('http.cookies.BaseCookie', 'BaseCookie'),
    SimpleCookie: cookieClass('http.cookies.SimpleCookie', 'SimpleCookie'),
  },
});
