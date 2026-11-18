/* 高度モード B7 G10：xml.etree.ElementTree（CPython 3.12.3 実走照合）。
 * Element／ElementTree（メモリ内）／fromstring／tostring(encoding='unicode')／
 * XPath 部分文法（タグ・*・.//・[@attr]・[@attr='v']・[n]・[tag]）を実装。
 * tostring の既定（bytes 戻り値）は bytes 表現が UNK のため未検証経路。
 * parse／iterparse／write はファイル前提のため未対応（未登録メソッド）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { BOOL, NONE, LIST, TUPLE, DICT } = PyAPI;
const I = (v) => PyAPI.NUM(v, false);

export function elemData(tag, attrib) {
  return { tag, attrib: attrib || new Map(), text: null, tail: null, children: [] };
}
function attribMap(ctx, v) {
  const m = new Map();
  if (v && v.__dict) for (const e of v.__dict.values()) m.set(ctx.str(e.k) ?? ctx.strOf(e.k), ctx.str(e.v) ?? ctx.strOf(e.v));
  return m;
}
function escText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return escText(s).replace(/"/g, '&quot;'); }
export function elemToString(d, nsMap) {
  if (typeof d.tag === 'string' && d.tag.startsWith('<!--')) return '<!--' + (d.text || '') + '-->';
  if (typeof d.tag === 'string' && d.tag.startsWith('<?')) return '<?' + d.text + '?>';
  let tag = d.tag;
  let out = '<' + tag;
  for (const [k, v] of d.attrib) out += ' ' + k + '="' + escAttr(v) + '"';
  const hasContent = (d.text !== null && d.text !== '') || d.children.length;
  if (!hasContent) out += ' />';
  else {
    out += '>';
    if (d.text) out += escText(d.text);
    for (const c of d.children) { out += elemToString(c.data, nsMap); if (c.data.tail) out += escText(c.data.tail); }
    out += '</' + tag + '>';
  }
  return out;
}
/* ---- 簡易 XML パーサ（要素・属性・テキスト・コメント・PI・CDATA・実体参照） ---- */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, body) => {
    if (body.startsWith('#x') || body.startsWith('#X')) return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(parseInt(body.slice(1), 10));
    return body in ENTITIES ? ENTITIES[body] : m;
  });
}
export function parseXml(ctx, text, qual = 'xml.etree.ElementTree.Element') {
  let i = 0; const n = text.length;
  const stack = []; let root = null;
  const fail = (msg, pos) => { const before = text.slice(0, pos); const line = before.split('\n').length; const col = pos - (before.lastIndexOf('\n') + 1); const e = new Error(msg); e.__parse = { msg: msg + ': line ' + line + ', column ' + col, pos: [line, col] }; throw e; };
  const mk = (tag, attrib) => { const d = elemData(tag, attrib); const self = ctx.native(qual, d); d.__selfRef = self; return self; };
  const addText = (raw, isCdata) => {
    if (!stack.length) return;
    const top = stack[stack.length - 1];
    const val = isCdata ? raw : decodeEntities(raw);
    if (top.data.children.length) { const last = top.data.children[top.data.children.length - 1]; last.data.tail = (last.data.tail || '') + val; }
    else top.data.text = (top.data.text || '') + val;
  };
  while (i < n) {
    if (text[i] === '<') {
      if (text.startsWith('<!--', i)) { const end = text.indexOf('-->', i); if (end < 0) fail('unclosed token', i); const c = mkComment(ctx, text.slice(i + 4, end)); if (stack.length) stack[stack.length - 1].data.children.push(c); else if (!root) root = c; i = end + 3; continue; }
      if (text.startsWith('<![CDATA[', i)) { const end = text.indexOf(']]>', i); if (end < 0) fail('unclosed token', i); addText(text.slice(i + 9, end), true); i = end + 3; continue; }
      if (text.startsWith('<?', i)) { const end = text.indexOf('?>', i); if (end < 0) fail('unclosed token', i); const body = text.slice(i + 2, end); const sp = body.search(/\s/); const pi = mkPI(ctx, sp < 0 ? body : body.slice(0, sp), sp < 0 ? '' : body.slice(sp + 1)); if (stack.length) stack[stack.length - 1].data.children.push(pi); else if (!root && !body.startsWith('xml')) root = pi; i = end + 2; continue; }
      if (text.startsWith('<!', i)) { const end = text.indexOf('>', i); if (end < 0) fail('unclosed token', i); i = end + 1; continue; }
      if (text.startsWith('</', i)) {
        const end = text.indexOf('>', i); if (end < 0) fail('unclosed token', i);
        const tag = text.slice(i + 2, end).trim();
        const top = stack.pop();
        if (!top || top.data.tag !== tag) fail('mismatched tag', i);
        i = end + 1; continue;
      }
      // 開始タグ
      const m = /^<([^\s/>]+)/.exec(text.slice(i)); if (!m) fail('syntax error', i);
      const tag = m[1]; let j = i + m[0].length;
      const attrib = new Map(); let selfClose = false;
      for (;;) {
        while (j < n && /\s/.test(text[j])) j++;
        if (text.startsWith('/>', j)) { selfClose = true; j += 2; break; }
        if (text[j] === '>') { j++; break; }
        const am = /^([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/.exec(text.slice(j));
        if (!am) fail('syntax error', j);
        if (attrib.has(am[1])) fail('duplicate attribute', j);
        attrib.set(am[1], decodeEntities(am[3] !== undefined ? am[3] : am[4] || ''));
        j += am[0].length;
      }
      const el = mk(tag, attrib);
      if (stack.length) stack[stack.length - 1].data.children.push(el); else if (!root) root = el;
      if (!selfClose) stack.push(el);
      i = j; continue;
    }
    const next = text.indexOf('<', i); const end = next < 0 ? n : next;
    addText(text.slice(i, end), false); i = end;
  }
  if (stack.length) fail('no element found', n);
  if (!root) fail('no element found', 0);
  return root;
}
function mkComment(ctx, text) { const d = elemData('<!--comment-->'); d.text = text; const self = ctx.native('xml.etree.ElementTree.Element', d); d.__selfRef = self; d.__comment = true; return self; }
function mkPI(ctx, target, data) { const d = elemData('<?pi?>'); d.text = target + (data ? ' ' + data : ''); d.__pi = target; const self = ctx.native('xml.etree.ElementTree.Element', d); d.__selfRef = self; return self; }
/* ---- XPath 部分文法 ---- */
function matchStep(ctx, el, step) {
  // step: tag / * / tag[pred] / *[pred]
  const bm = /^([^\[]+)((?:\[[^\]]*\])*)$/.exec(step); if (!bm) return false;
  const tag = bm[1];
  if (tag !== '*' && el.data.tag !== tag) return false;
  const preds = bm[2].match(/\[[^\]]*\]/g) || [];
  for (const p of preds) {
    const inner = p.slice(1, -1);
    if (/^\d+$/.test(inner)) return false; // 位置述語は findAll 側で処理
    if (inner.startsWith('@')) {
      const eq = inner.indexOf('=');
      if (eq < 0) { if (!el.data.attrib.has(inner.slice(1))) return false; }
      else { const k = inner.slice(1, eq); let v = inner.slice(eq + 1).trim(); if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1); if (el.data.attrib.get(k) !== v) return false; }
    } else if (inner.startsWith('.')) { /* [.='text'] は簡略対応 */ const eq = inner.indexOf('='); if (eq >= 0) { let v = inner.slice(eq + 1).trim(); if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1); if ((el.data.text || '') !== v) return false; } }
    else { if (!el.data.children.some((c) => c.data.tag === inner)) return false; }
  }
  return true;
}
function positionPred(step) { const m = /\[(\d+)\]/.exec(step); return m ? parseInt(m[1], 10) : null; }
function findAllIn(ctx, rootEl, path) {
  if (path === '.') return [rootEl];
  let p = String(path);
  let descendants = false;
  if (p.startsWith('.//')) { descendants = true; p = p.slice(3); }
  else if (p.startsWith('./')) p = p.slice(2);
  else if (p.startsWith('//')) { descendants = true; p = p.slice(2); }
  const steps = p.split('/').filter((s) => s !== '');
  let current = [rootEl];
  steps.forEach((step, idx) => {
    const isDesc = descendants && idx === 0;
    const pos = positionPred(step);
    const cleanStep = step.replace(/\[\d+\]/, '');
    const next = [];
    for (const el of current) {
      let cands = [];
      if (isDesc) { const all = []; const walk = (e) => { for (const c of e.data.children) { all.push(c); walk(c); } }; walk(el); cands = all; }
      else cands = el.data.children.slice();
      let matched = cands.filter((c) => matchStep(ctx, c, cleanStep));
      if (pos !== null) matched = matched[pos - 1] ? [matched[pos - 1]] : [];
      next.push(...matched);
    }
    current = next;
  });
  return current;
}
const ElementDef = {
  typeName: 'Element',
  construct: (ctx, args, kwargs) => {
    const tag = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].__native ? args[0].data.tag : ctx.strOf(args[0]));
    const attrib = attribMap(ctx, args.length > 1 ? args[1] : (kwargs && kwargs.attrib));
    if (kwargs) for (const [k, v] of Object.entries(kwargs)) if (k !== 'attrib') attrib.set(k, ctx.str(v) ?? ctx.strOf(v));
    const d = elemData(tag, attrib); const self = ctx.native('xml.etree.ElementTree.Element', d); d.__selfRef = self; return self;
  },
  attrs: {
    tag: (ctx, self) => self.data.__comment ? ctx.ncls('xml.etree.ElementTree.Comment') && self.data.tag : self.data.tag,
    attrib: (ctx, self) => { const d = DICT(); for (const [k, v] of self.data.attrib) PyAPI.dictSet(d, k, v); return d; },
    text: (ctx, self) => self.data.text === null ? NONE : self.data.text,
    tail: (ctx, self) => self.data.tail === null ? NONE : self.data.tail,
  },
  // R6：属性代入の配線。attrs ゲッターが属性バッグより優先されるため、代入は
  // データ本体へ書き戻す（CPython 3.12.3 実走照合：text／tail／tag／attrib の
  // 代入は読み戻しと tostring に反映される。それ以外の属性名への代入は
  // CPython でも AttributeError になる）。非文字列の text／tail は CPython
  // ではシリアライズ時に初めてエラーになるが、本エンジンでは str 化して保持する。
  setattr: (ctx, self, name, v) => {
    const asText = (x) => ctx.isNone(x) ? null : (typeof x === 'string' ? x : (ctx.str(x) ?? ctx.strOf(x)));
    if (name === 'text') { self.data.text = asText(v); return; }
    if (name === 'tail') { self.data.tail = asText(v); return; }
    if (name === 'tag') { self.data.tag = typeof v === 'string' ? v : (ctx.str(v) ?? ctx.strOf(v)); return; }
    if (name === 'attrib') { self.data.attrib = attribMap(ctx, v); return; }
    ctx.err('AttributeError', "'xml.etree.ElementTree.Element' object has no attribute '" + name + "'", '');
  },
  methods: {
    append: (ctx, self, args) => { self.data.children.push(args[0]); return NONE; },
    extend: (ctx, self, args) => { const items = ctx.iterable(args[0]); if (items) self.data.children.push(...items); return NONE; },
    insert: (ctx, self, args) => { self.data.children.splice(ctx.num(args[0]), 0, args[1]); return NONE; },
    remove: (ctx, self, args) => { const i = self.data.children.indexOf(args[0]); if (i < 0) ctx.err('ValueError', 'list.remove(x): x not in list', ''); self.data.children.splice(i, 1); return NONE; },
    clear: (ctx, self) => { self.data.children = []; self.data.attrib = new Map(); self.data.text = null; self.data.tail = null; return NONE; },
    get: (ctx, self, args) => { const k = ctx.str(args[0]); return self.data.attrib.has(k) ? self.data.attrib.get(k) : (args.length > 1 ? args[1] : NONE); },
    set: (ctx, self, args) => { self.data.attrib.set(ctx.str(args[0]), ctx.str(args[1]) ?? ctx.strOf(args[1])); return NONE; },
    keys: (ctx, self) => LIST([...self.data.attrib.keys()]),
    items: (ctx, self) => LIST([...self.data.attrib.entries()].map(([k, v]) => TUPLE([k, v]))),
    find: (ctx, self, args) => { const r = findAllIn(ctx, self, ctx.str(args[0]) ?? ''); return r.length ? r[0] : NONE; },
    findall: (ctx, self, args) => LIST(findAllIn(ctx, self, ctx.str(args[0]) ?? '')),
    findtext: (ctx, self, args) => { const r = findAllIn(ctx, self, ctx.str(args[0]) ?? ''); if (!r.length) return args.length > 1 ? args[1] : NONE; return r[0].data.text === null ? '' : r[0].data.text; },
    iter: (ctx, self, args) => { const tag = args.length ? ctx.str(args[0]) : null; const out = []; const walk = (e) => { if (!tag || tag === '*' || e.data.tag === tag) out.push(e); for (const c of e.data.children) walk(c); }; walk(self); return PyAPI.ITER(out, 'iterator'); },
    iterfind: (ctx, self, args) => PyAPI.ITER(findAllIn(ctx, self, ctx.str(args[0]) ?? ''), 'iterator'),
    itertext: (ctx, self) => { const out = []; const walk = (e) => { if (e.data.text) out.push(e.data.text); for (const c of e.data.children) { walk(c); if (c.data.tail) out.push(c.data.tail); } }; walk(self); return PyAPI.ITER(out, 'iterator'); },
    makeelement: (ctx, self, args) => { const d = elemData(ctx.str(args[0]), attribMap(ctx, args[1])); const s2 = ctx.native('xml.etree.ElementTree.Element', d); d.__selfRef = s2; return s2; },
  },
  getitem: (ctx, self, key) => {
    if (key && key.__slice) { const a = self.data.children.slice(key.lo ?? undefined, key.hi ?? undefined); return LIST(a); }
    const n = ctx.num(key); if (n === null) return ctx.NOT_HANDLED;
    let i = n; if (i < 0) i += self.data.children.length;
    if (i < 0 || i >= self.data.children.length) ctx.err('IndexError', 'list index out of range', '');
    return self.data.children[i];
  },
  len: (ctx, self) => self.data.children.length,
  iter: (ctx, self) => self.data.children.slice(),
  repr: (ctx, self) => '<Element ' + ctx.repr(typeof self.data.tag === 'string' ? self.data.tag : '...') + ' at 0x...>',
  eq: (ctx, self, other) => self === other,
  hash: (ctx, self) => null,
};
const QNameDef = {
  typeName: 'QName',
  construct: (ctx, args) => {
    let text;
    if (args.length === 1) text = ctx.str(args[0]) ?? '';
    else text = '{' + (ctx.str(args[0]) ?? '') + '}' + (ctx.str(args[1]) ?? '');
    return ctx.native('xml.etree.ElementTree.QName', { text });
  },
  attrs: { text: (ctx, self) => self.data.text },
  // R6：QName.text への代入は CPython でも有効（実走照合）。それ以外は属性バッグへ。
  setattr: (ctx, self, name, v) => {
    if (name === 'text') { self.data.text = typeof v === 'string' ? v : (ctx.str(v) ?? ctx.strOf(v)); return; }
    if (!self.__attrsBag) self.__attrsBag = new Map();
    self.__attrsBag.set(name, v);
  },
  str: (ctx, self) => self.data.text,
  repr: (ctx, self) => 'QName(' + ctx.repr(self.data.text) + ')',
  eq: (ctx, self, other) => (other && other.__native === 'xml.etree.ElementTree.QName') ? self.data.text === other.data.text : (typeof other === 'string' ? self.data.text === other : false),
  hash: (ctx, self) => 'q:' + self.data.text,
};
function treeDef() {
  return {
    typeName: 'ElementTree',
    construct: (ctx, args) => ctx.native('xml.etree.ElementTree.ElementTree', { root: args.length && args[0] && args[0].__native ? args[0] : null }),
    methods: {
      getroot: (ctx, self) => self.data.root ?? NONE,
      _setroot: (ctx, self, args) => { self.data.root = args[0]; return NONE; },
      find: (ctx, self, args) => { const r = findAllIn(ctx, self.data.root, ctx.str(args[0]) ?? ''); return r.length ? r[0] : NONE; },
      findall: (ctx, self, args) => LIST(findAllIn(ctx, self.data.root, ctx.str(args[0]) ?? '')),
      findtext: (ctx, self, args) => { const r = findAllIn(ctx, self.data.root, ctx.str(args[0]) ?? ''); if (!r.length) return args.length > 1 ? args[1] : NONE; return r[0].data.text ?? ''; },
      iter: (ctx, self, args) => { const tag = args.length ? ctx.str(args[0]) : null; const out = []; const walk = (e) => { if (!tag || tag === '*' || e.data.tag === tag) out.push(e); for (const c of e.data.children) walk(c); }; if (self.data.root) walk(self.data.root); return PyAPI.ITER(out, 'iterator'); },
      iterfind: (ctx, self, args) => PyAPI.ITER(findAllIn(ctx, self.data.root, ctx.str(args[0]) ?? ''), 'iterator'),
    },
  };
}
const TreeBuilderDef = {
  typeName: 'TreeBuilder',
  construct: (ctx, args, kwargs) => ctx.native('xml.etree.ElementTree.TreeBuilder', { stack: [], root: null, lastTextTarget: null }),
  methods: {
    start: (ctx, self, args) => { const d = elemData(ctx.str(args[0]), attribMap(ctx, args[1])); const el = ctx.native('xml.etree.ElementTree.Element', d); d.__selfRef = el; if (self.data.stack.length) self.data.stack[self.data.stack.length - 1].data.children.push(el); self.data.stack.push(el); if (!self.data.root) self.data.root = el; return el; },
    end: (ctx, self, args) => { const el = self.data.stack.pop(); return el ?? NONE; },
    data: (ctx, self, args) => { const s = ctx.str(args[0]) ?? ''; const top = self.data.stack[self.data.stack.length - 1]; if (top) { if (top.data.children.length) { const last = top.data.children[top.data.children.length - 1]; last.data.tail = (last.data.tail || '') + s; } else top.data.text = (top.data.text || '') + s; } return NONE; },
    comment: (ctx, self, args) => { const c = mkComment(ctx, ctx.str(args[0]) ?? ''); const top = self.data.stack[self.data.stack.length - 1]; if (top) top.data.children.push(c); return c; },
    pi: (ctx, self, args) => { const p = mkPI(ctx, ctx.str(args[0]) ?? '', ctx.str(args[1]) ?? ''); const top = self.data.stack[self.data.stack.length - 1]; if (top) top.data.children.push(p); return p; },
    doctype: (ctx, self, args) => NONE,
    start_ns: (ctx, self, args) => NONE,
    end_ns: (ctx, self, args) => NONE,
    close: (ctx, self) => self.data.root ?? NONE,
  },
};
function parseOrErr(ctx, text) {
  try { return parseXml(ctx, text); }
  catch (e) { if (e && e.__parse) ctx.err('xml.etree.ElementTree.ParseError', e.__parse.msg, ''); throw e; }
}
const XMLParserDef = {
  typeName: 'XMLParser',
  construct: (ctx, args, kwargs) => ctx.native('xml.etree.ElementTree.XMLParser', { buf: '', target: (kwargs && kwargs.target) || null }),
  methods: {
    feed: (ctx, self, args) => { self.data.buf += ctx.str(args[0]) ?? ''; return NONE; },
    close: (ctx, self) => parseOrErr(ctx, self.data.buf),
    flush: (ctx, self) => NONE,
  },
};
const XMLPullParserDef = {
  typeName: 'XMLPullParser',
  construct: (ctx, args) => ctx.native('xml.etree.ElementTree.XMLPullParser', { buf: '', events: args.length && ctx.isList(args[0]) ? args[0].__list.map((x) => ctx.str(x)) : ['end'] }),
  methods: {
    feed: (ctx, self, args) => { self.data.buf += ctx.str(args[0]) ?? ''; return NONE; },
    close: (ctx, self) => NONE,
    flush: (ctx, self) => NONE,
    read_events: (ctx, self) => {
      const root = parseOrErr(ctx, self.data.buf);
      const out = [];
      const walk = (e) => { if (self.data.events.includes('start')) out.push(TUPLE(['start', e])); for (const c of e.data.children) walk(c); if (self.data.events.includes('end')) out.push(TUPLE(['end', e])); };
      walk(root);
      return PyAPI.ITER(out, 'iterator');
    },
  },
};
registerStdlibModule('xml.etree.ElementTree', {
  functions: {
    fromstring: (ctx, args) => parseOrErr(ctx, ctx.str(args[0]) ?? ''),
    XML: (ctx, args) => parseOrErr(ctx, ctx.str(args[0]) ?? ''),
    fromstringlist: (ctx, args) => { const items = ctx.iterable(args[0]); return parseOrErr(ctx, (items || []).map((v) => ctx.str(v) ?? '').join('')); },
    XMLID: (ctx, args) => { const root = parseOrErr(ctx, ctx.str(args[0]) ?? ''); const d = DICT(); const walk = (e) => { const id = e.data.attrib.get('id'); if (id) PyAPI.dictSet(d, id, e); for (const c of e.data.children) walk(c); }; walk(root); return TUPLE([root, d]); },
    SubElement: (ctx, args, kwargs) => { const parent = args[0]; const d = elemData(ctx.str(args[1]), attribMap(ctx, args[2])); if (kwargs) for (const [k, v] of Object.entries(kwargs)) d.attrib.set(k, ctx.str(v) ?? ctx.strOf(v)); const el = ctx.native('xml.etree.ElementTree.Element', d); d.__selfRef = el; parent.data.children.push(el); return el; },
    Comment: (ctx, args) => mkComment(ctx, ctx.str(args[0]) ?? ''),
    ProcessingInstruction: (ctx, args) => mkPI(ctx, ctx.str(args[0]) ?? '', args.length > 1 ? ctx.str(args[1]) ?? '' : ''),
    tostring: (ctx, args, kwargs) => {
      const el = args[0]; const enc = (kwargs && kwargs.encoding) || (args.length > 1 ? ctx.str(args[1]) : null);
      if (enc === 'unicode') return elemToString(el.data);
      ctx.diag('tostring: 既定の戻り値は bytes で、このエンジンでは表せないため未検証として扱います（encoding="unicode" で文字列になります）');
      return ctx.unk('tostring の結果（bytes）');
    },
    tostringlist: (ctx, args, kwargs) => {
      const el = args[0]; const enc = (kwargs && kwargs.encoding) || null;
      if (enc === 'unicode') return LIST([elemToString(el.data)]);
      ctx.diag('tostringlist: 既定の戻り値は bytes のリストで表せないため未検証として扱います');
      return ctx.unk('tostringlist の結果（bytes のリスト）');
    },
    iselement: (ctx, args) => BOOL(!!(args[0] && args[0].__native === 'xml.etree.ElementTree.Element')),
    indent: (ctx, args, kwargs) => {
      const space = (kwargs && kwargs.space) || (args.length > 1 ? ctx.str(args[1]) : null) || '  ';
      const level = (kwargs && kwargs.level !== undefined) ? ctx.num(kwargs.level) : 0;
      const doIndent = (e, lv) => {
        const kids = e.data.children;
        if (!kids.length) return;
        if (e.data.text === null || !e.data.text.trim()) e.data.text = '\n' + space.repeat(lv + 1);
        for (const c of kids) { doIndent(c, lv + 1); if (c.data.tail === null || !c.data.tail.trim()) c.data.tail = '\n' + space.repeat(lv + 1); }
        const last = kids[kids.length - 1]; if (last.data.tail === null || !last.data.tail.trim() || true) last.data.tail = '\n' + space.repeat(lv);
      };
      doIndent(args[0].data, level); return NONE;
    },
    register_namespace: (ctx, args) => NONE,
  },
  classes: {
    Element: ElementDef,
    ElementTree: treeDef(),
    QName: QNameDef,
    TreeBuilder: TreeBuilderDef,
    XMLParser: XMLParserDef,
    XMLPullParser: XMLPullParserDef,
    ParseError: { typeName: 'ParseError', exc: 'xml.etree.ElementTree.ParseError', excParents: ['SyntaxError'] },
  },
});
