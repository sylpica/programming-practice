/* 高度モード B7 G10：email.message（Message／EmailMessage の中核。
 * CPython 3.12.3 実走照合）。ヘッダ辞書的挙動・ペイロード・Content-Type
 * パラメータ・単純な multipart を実装。as_bytes 系は bytes 表現が UNK の
 * ため未検証、複雑な content-manager 経路（添付の自動 MIME 化等）は
 * 到達範囲を報告書に明記。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
const { BOOL, NONE, LIST, TUPLE } = PyAPI;

export function newMsgData() {
  return { headers: [], payload: null, preamble: null, epilogue: null, boundary: null, defaultType: 'text/plain', unixfrom: null, charset: null };
}
export function headerGet(data, name) {
  const n = name.toLowerCase();
  const hits = data.headers.filter(([k]) => k.toLowerCase() === n);
  return hits.length ? hits[hits.length - 1][1] : null;
}
export function headerGetAll(data, name) {
  const n = name.toLowerCase();
  return data.headers.filter(([k]) => k.toLowerCase() === n).map(([, v]) => v);
}
export function headerSet(data, name, value) { data.headers.push([name, value]); }
export function parseParams(value) {
  // "text/plain; charset=utf-8; name="a;b"" -> [maintype..., [[k,v],...]] 簡略版
  const parts = [];
  let cur = '', inQ = false;
  for (const ch of String(value)) { if (ch === '"') inQ = !inQ; if (ch === ';' && !inQ) { parts.push(cur); cur = ''; } else cur += ch; }
  parts.push(cur);
  const main = parts[0].trim().toLowerCase();
  const params = [];
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('='); if (eq < 0) { params.push([p.trim().toLowerCase(), '']); continue; }
    let v = p.slice(eq + 1).trim();
    if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\(.)/g, '$1');
    params.push([p.slice(0, eq).trim().toLowerCase(), v]);
  }
  return [main, params];
}
export function contentTypeOf(data) {
  const ct = headerGet(data, 'Content-Type');
  if (!ct) return data.defaultType;
  return parseParams(ct)[0] || data.defaultType;
}
export function paramOf(data, name, header = 'Content-Type', unquoteIt = true) {
  const raw = headerGet(data, header); if (!raw) return null;
  const [, params] = parseParams(raw);
  const hit = params.find(([k]) => k === name.toLowerCase());
  return hit ? hit[1] : null;
}
export function setParam(data, name, value, header = 'Content-Type', replace = false) {
  const raw = headerGet(data, header);
  const main = raw ? parseParams(raw)[0] : (header === 'Content-Type' ? contentTypeOf(data) : 'attachment');
  let [, params] = raw ? parseParams(raw) : [main, []];
  const key = String(name).toLowerCase();
  const nv = /[\s;="]/.test(String(value)) || /[^\x00-\x7f]/.test(String(value)) ? '"' + String(value).replace(/"/g, '\\"') + '"' : String(value);
  let found = false;
  params = params.map(([k, v]) => { if (k === key) { found = true; return [k, String(value)]; } return [k, v]; });
  if (!found) params.push([key, String(value)]);
  const rebuilt = main + params.map(([k, v]) => '; ' + k + '=' + (/[\s;="]/.test(v) || /[^\x00-\x7f]/.test(v) ? '"' + v.replace(/"/g, '\\"') + '"' : v)).join('');
  // 置き換え（既存ヘッダを消して再追加）
  data.headers = data.headers.filter(([k]) => k.toLowerCase() !== header.toLowerCase());
  data.headers.push([header, rebuilt]);
  return nv;
}
export function msgToString(ctx, data) {
  let out = data.headers.map(([k, v]) => k + ': ' + v).join('\n');
  if (out) out += '\n';
  out += '\n';
  if (Array.isArray(data.payload)) {
    const b = data.boundary || '===============G10==';
    for (const part of data.payload) { out += '--' + b + '\n' + msgToString(ctx, part.data) + '\n'; }
    out += '--' + b + '--\n';
  } else if (typeof data.payload === 'string') out += data.payload;
  return out;
}
export function walkMsgs(data, out = []) {
  out.push(data);
  if (Array.isArray(data.payload)) for (const p of data.payload) walkMsgs(p.data, out);
  return out;
}
function isMultipartData(data) { return Array.isArray(data.payload); }

function commonMethods(qual) {
  return {
    __getitem__: undefined,
    get: (ctx, self, args) => { const v = headerGet(self.data, ctx.str(args[0]) ?? ''); return v === null ? (args.length > 1 ? args[1] : NONE) : v; },
    get_all: (ctx, self, args) => { const all = headerGetAll(self.data, ctx.str(args[0]) ?? ''); return all.length ? LIST(all) : (args.length > 1 ? args[1] : NONE); },
    keys: (ctx, self) => LIST(self.data.headers.map(([k]) => k)),
    values: (ctx, self) => LIST(self.data.headers.map(([, v]) => v)),
    items: (ctx, self) => LIST(self.data.headers.map(([k, v]) => TUPLE([k, v]))),
    add_header: (ctx, self, args, kwargs) => {
      let v = ctx.str(args[1]) ?? ctx.strOf(args[1]);
      const params = Object.entries(kwargs || {});
      if (params.length) v += params.map(([k, val]) => { const s = ctx.str(val) ?? ctx.strOf(val); return '; ' + k.replace(/_/g, '-') + '=' + (/[\s;="]/.test(s) ? '"' + s + '"' : s); }).join('');
      headerSet(self.data, ctx.str(args[0]) ?? '', v); return NONE;
    },
    replace_header: (ctx, self, args) => {
      const name = ctx.str(args[0]) ?? ''; const n = name.toLowerCase();
      const idx = self.data.headers.findIndex(([k]) => k.toLowerCase() === n);
      if (idx < 0) ctx.err('KeyError', ctx.repr(name), '');
      self.data.headers[idx][1] = ctx.str(args[1]) ?? ctx.strOf(args[1]); return NONE;
    },
    get_payload: (ctx, self, args) => {
      if (Array.isArray(self.data.payload)) return LIST(self.data.payload.slice());
      if (self.data.payload === null) return NONE;
      return self.data.payload;
    },
    set_payload: (ctx, self, args) => {
      const v = args[0];
      if (typeof v === 'string') self.data.payload = v;
      else if (ctx.isList(v) || ctx.isTuple(v)) self.data.payload = (v.__list || v.__tuple).slice();
      else if (v && v.__native) self.data.payload = [v];
      else if (ctx.isNone(v)) self.data.payload = null;
      else self.data.payload = ctx.strOf(v);
      return NONE;
    },
    attach: (ctx, self, args) => {
      const part = args[0];
      if (!Array.isArray(self.data.payload)) {
        // multipart/mixed へ変換（既存ペイロードが文字列の場合は破棄されるのが CPython の注意点）
        self.data.payload = [];
        self.data.boundary = '===============G10BOUNDARY==';
        self.data.headers = self.data.headers.filter(([k]) => k.toLowerCase() !== 'content-type');
        self.data.headers.push(['Content-Type', 'multipart/mixed; boundary="===============G10BOUNDARY=="']);
      }
      self.data.payload.push(part); return NONE;
    },
    walk: (ctx, self) => { const all = walkMsgs(self.data); return PyAPI.ITER(all.map((d) => d.__selfRef), 'iterator'); },
    is_multipart: (ctx, self) => BOOL(isMultipartData(self.data)),
    get_content_type: (ctx, self) => contentTypeOf(self.data),
    get_content_maintype: (ctx, self) => contentTypeOf(self.data).split('/')[0],
    get_content_subtype: (ctx, self) => (contentTypeOf(self.data).split('/')[1] || ''),
    get_default_type: (ctx, self) => self.data.defaultType,
    set_default_type: (ctx, self, args) => { self.data.defaultType = ctx.str(args[0]) ?? 'text/plain'; return NONE; },
    set_type: (ctx, self, args) => { const t = ctx.str(args[0]); const raw = headerGet(self.data, 'Content-Type'); const [, params] = raw ? parseParams(raw) : [t, []]; self.data.headers = self.data.headers.filter(([k]) => k.toLowerCase() !== 'content-type'); self.data.headers.push(['Content-Type', t + params.map(([k, v]) => '; ' + k + '=' + v).join('')]); return NONE; },
    get_params: (ctx, self, args, kwargs) => {
      const header = (kwargs && kwargs.header) || (args[1] !== undefined ? ctx.str(args[1]) : null) || 'Content-Type';
      const raw = headerGet(self.data, header); if (!raw) return NONE;
      const [main, params] = parseParams(raw);
      return LIST([TUPLE([header.toLowerCase() === 'content-disposition' ? 'content-disposition' : main, '']), ...params.map(([k, v]) => TUPLE([k, v]))].map((x, i) => i === 0 ? TUPLE([main, '']) : x).slice(0, 1).concat(params.map(([k, v]) => TUPLE([k, v]))));
    },
    get_param: (ctx, self, args, kwargs) => {
      const header = (kwargs && kwargs.header) || 'Content-Type';
      const v = paramOf(self.data, ctx.str(args[0]) ?? '', header);
      return v === null ? ((kwargs && kwargs.failobj !== undefined) ? kwargs.failobj : (args[1] !== undefined ? args[1] : NONE)) : v;
    },
    set_param: (ctx, self, args, kwargs) => { setParam(self.data, ctx.str(args[0]) ?? '', ctx.str(args[1]) ?? '', (kwargs && kwargs.header) || 'Content-Type'); return NONE; },
    del_param: (ctx, self, args, kwargs) => {
      const header = (kwargs && kwargs.header) || 'Content-Type'; const raw = headerGet(self.data, header); if (!raw) return NONE;
      const [main, params] = parseParams(raw); const key = (ctx.str(args[0]) ?? '').toLowerCase();
      const kept = params.filter(([k]) => k !== key);
      self.data.headers = self.data.headers.filter(([k]) => k.toLowerCase() !== header.toLowerCase());
      self.data.headers.push([header, main + kept.map(([k, v]) => '; ' + k + '=' + v).join('')]); return NONE;
    },
    get_filename: (ctx, self, args) => { const v = paramOf(self.data, 'filename', 'Content-Disposition') ?? paramOf(self.data, 'name', 'Content-Type'); return v === null ? (args.length ? args[0] : NONE) : v; },
    get_boundary: (ctx, self) => { const v = paramOf(self.data, 'boundary'); return v === null ? NONE : v; },
    set_boundary: (ctx, self, args) => { const b = ctx.str(args[0]); self.data.boundary = b; setParam(self.data, 'boundary', b); return NONE; },
    get_charset: (ctx, self) => { const v = paramOf(self.data, 'charset'); return v === null ? NONE : v; },
    get_charsets: (ctx, self) => LIST(walkMsgs(self.data).map((d) => { const v = paramOf(d, 'charset'); return v === null ? NONE : v; })),
    get_content_charset: (ctx, self, args) => { const v = paramOf(self.data, 'charset'); return v === null ? (args.length ? args[0] : NONE) : String(v).toLowerCase(); },
    get_content_disposition: (ctx, self) => { const raw = headerGet(self.data, 'Content-Disposition'); if (!raw) return NONE; return parseParams(raw)[0]; },
    get_charset: (ctx, self) => { const v = paramOf(self.data, 'charset'); return v === null ? NONE : v; },
    set_charset: (ctx, self, args) => { if (args.length && !ctx.isNone(args[0])) setParam(self.data, 'charset', ctx.str(args[0]) ?? ''); return NONE; },
    get_unixfrom: (ctx, self) => self.data.unixfrom === null ? NONE : self.data.unixfrom,
    set_unixfrom: (ctx, self, args) => { self.data.unixfrom = ctx.str(args[0]); return NONE; },
    as_string: (ctx, self, args, kwargs) => msgToString(ctx, self.data),
    __str__: (ctx, self) => msgToString(ctx, self.data),
  };
}
function makeDef(qual, typeName, extraMethods, parents) {
  const methods = { ...commonMethods(qual), ...(extraMethods || {}) };
  delete methods.__getitem__;
  return {
    typeName, parents: parents || [],
    construct: (ctx, args, kwargs) => {
      const data = newMsgData();
      const self = ctx.native(qual, data); data.__selfRef = self;
      if (kwargs && kwargs.policy) data.__policy = kwargs.policy;
      return self;
    },
    attrs: {
      defects: (ctx, self) => self.data.defects !== undefined ? self.data.defects : LIST([]),
      preamble: (ctx, self) => self.data.preamble === null ? NONE : self.data.preamble,
      epilogue: (ctx, self) => self.data.epilogue === null ? NONE : self.data.epilogue,
    },
    // R6：属性代入の配線。attrs ゲッターが属性バッグより優先されるため、
    // preamble／epilogue／defects はデータ本体へ書き戻す（CPython 3.12.3 実走
    // 照合：EmailMessage の preamble／epilogue 代入は読み戻しに反映される）。
    // それ以外の名前は属性バッグへ保持する（従来の基盤挙動を維持）。
    setattr: (ctx, self, name, v) => {
      if (name === 'preamble') { self.data.preamble = ctx.isNone(v) ? null : (ctx.str(v) ?? ctx.strOf(v)); return; }
      if (name === 'epilogue') { self.data.epilogue = ctx.isNone(v) ? null : (ctx.str(v) ?? ctx.strOf(v)); return; }
      if (name === 'defects') { self.data.defects = v; return; }
      if (!self.__attrsBag) self.__attrsBag = new Map();
      self.__attrsBag.set(name, v);
    },
    methods,
    getitem: (ctx, self, key) => { const v = headerGet(self.data, ctx.str(key) ?? ''); return v === null ? NONE : v; },
    setitem: (ctx, self, key, value) => { headerSet(self.data, ctx.str(key) ?? '', ctx.str(value) ?? ctx.strOf(value)); return true; },
    // del はエンジンに delitem フックが無いため __delitem__ 相当はメソッド経由では扱えない（基盤要請）
    contains: (ctx, self, item) => headerGet(self.data, ctx.str(item) ?? '') !== null,
    len: (ctx, self) => self.data.headers.length,
    iter: (ctx, self) => self.data.headers.map(([k]) => k),
    repr: (ctx, self) => '<' + qual + ' object>',
    str: (ctx, self) => msgToString(ctx, self.data),
  };
}
const emailExtra = {
  set_content: (ctx, self, args, kwargs) => {
    const content = args[0];
    if (typeof content !== 'string') { ctx.diag('EmailMessage.set_content: 文字列以外のコンテンツは未検証として扱います'); return ctx.unk('set_content の結果'); }
    let maintype = 'text', subtype = 'plain';
    const ct = (kwargs && kwargs.subtype) ? 'text/' + (ctx.str(kwargs.subtype) ?? 'plain') : null;
    if (ct) { [maintype, subtype] = ct.split('/'); }
    self.data.payload = content.endsWith('\n') ? content : content + '\n';
    self.data.headers = self.data.headers.filter(([k]) => !['content-type', 'content-transfer-encoding', 'mime-version'].includes(k.toLowerCase()));
    self.data.headers.push(['Content-Type', 'text/' + subtype + '; charset="utf-8"'], ['Content-Transfer-Encoding', '7bit'], ['MIME-Version', '1.0']);
    return NONE;
  },
  get_content: (ctx, self) => (typeof self.data.payload === 'string' ? self.data.payload : (Array.isArray(self.data.payload) ? NONE : self.data.payload ?? NONE)),
  get_body: (ctx, self, args) => {
    const prefs = args.length && ctx.isList(args[0]) ? args[0].__list.map((x) => ctx.str(x)) : ['related', 'html', 'plain'];
    if (!Array.isArray(self.data.payload)) { const mt = contentTypeOf(self.data); if (mt === 'text/plain' && prefs.includes('plain')) return self; if (mt === 'text/html' && prefs.includes('html')) return self; return NONE; }
    for (const p of self.data.payload) { const r = p.data; const mt = contentTypeOf(r); if (mt === 'text/plain' && prefs.includes('plain')) return p; }
    return NONE;
  },
  iter_parts: (ctx, self) => PyAPI.ITER(Array.isArray(self.data.payload) ? self.data.payload.slice() : [], 'iterator'),
  iter_attachments: (ctx, self) => PyAPI.ITER(Array.isArray(self.data.payload) ? self.data.payload.filter((p) => { const cd = headerGet(p.data, 'Content-Disposition'); return cd && parseParams(cd)[0] === 'attachment'; }) : [], 'iterator'),
  is_attachment: (ctx, self) => { const cd = headerGet(self.data, 'Content-Disposition'); return BOOL(!!cd && parseParams(cd)[0] === 'attachment'); },
  clear: (ctx, self) => { self.data.headers = []; self.data.payload = null; return NONE; },
  clear_content: (ctx, self) => { self.data.payload = null; self.data.headers = self.data.headers.filter(([k]) => !['content-type', 'content-transfer-encoding', 'mime-version'].includes(k.toLowerCase())); return NONE; },
  make_mixed: (ctx, self) => { if (!Array.isArray(self.data.payload) && self.data.payload !== null) { const old = ctx.native('email.message.Message', newMsgData()); old.data = self.data.payload ? (() => { const d = newMsgData(); d.payload = self.data.payload; d.__selfRef = old; return d; })() : old.data; } return NONE; },
};
export const messageDef = makeDef('email.message.Message', 'Message', {}, []);
export const emailMessageDef = makeDef('email.message.EmailMessage', 'EmailMessage', emailExtra, ['email.message.Message']);
export const mimePartDef = makeDef('email.message.MIMEPart', 'MIMEPart', emailExtra, ['email.message.EmailMessage']);
registerStdlibModule('email.message', { classes: { Message: messageDef, EmailMessage: emailMessageDef, MIMEPart: mimePartDef } });
export function createMsg(ctx, qual = 'email.message.Message') {
  const data = newMsgData(); const self = ctx.native(qual, data); data.__selfRef = self; return self;
}
export function parseMessageText(ctx, text, qual = 'email.message.Message') {
  const self = createMsg(ctx, qual); const data = self.data;
  const norm = String(text).replace(/\r\n/g, '\n');
  const sep = norm.indexOf('\n\n');
  const headPart = sep >= 0 ? norm.slice(0, sep) : norm;
  let body = sep >= 0 ? norm.slice(sep + 2) : '';
  let cur = null;
  for (const line of headPart.split('\n')) {
    if (/^[ \t]/.test(line) && cur) { cur[1] += '\n' + line; continue; }
    const ci = line.indexOf(':'); if (ci < 0) continue;
    cur = [line.slice(0, ci).trim(), line.slice(ci + 1).trim()]; data.headers.push(cur);
  }
  const ct = contentTypeOf(data);
  if (ct.startsWith('multipart/')) {
    const b = paramOf(data, 'boundary');
    if (b) {
      data.boundary = b;
      const marker = '--' + b;
      const segments = body.split(marker);
      data.payload = [];
      // segments[0] = preamble, last may contain '--' epilogue
      for (let i = 1; i < segments.length; i++) {
        let seg = segments[i];
        if (seg.startsWith('--')) { data.epilogue = seg.slice(2); break; }
        if (seg.startsWith('\n')) seg = seg.slice(1);
        if (seg.endsWith('\n')) seg = seg.slice(0, -1);
        data.payload.push(parseMessageText(ctx, seg, qual));
      }
      if (segments[0]) data.preamble = segments[0];
      return self;
    }
  }
  data.payload = body;
  return self;
}
