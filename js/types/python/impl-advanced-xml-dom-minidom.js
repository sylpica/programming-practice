/* 高度モード B7 G10：xml.dom.minidom（parseString と主要ノード操作。
 * CPython 3.12.3 実走照合）。parse はファイル前提のため未対応。
 * 内部では ElementTree 用の簡易 XML パーサで木を作り、minidom の
 * ノード表現へ変換する。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { parseXml } from './impl-advanced-xml-etree-elementtree.js';
const { BOOL, NONE, LIST } = PyAPI;
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escA(s) { return esc(s).replace(/"/g, '&quot;'); }
function nodeToXml(d) {
  if (d.kind === 'comment') return '<!--' + (d.text || '') + '-->';
  if (d.kind === 'pi') return '<?' + (d.text || '') + '?>';
  if (d.kind === 'text') return esc(d.text || '');
  if (d.kind === 'document') return d.children.map((c) => nodeToXml(c.data)).join('');
  let out = '<' + d.tag;
  for (const [k, v] of d.attrib) out += ' ' + k + '="' + escA(v) + '"';
  if (!d.children.length && !d.text) return out + '/>';
  out += '>';
  if (d.text) out += esc(d.text);
  out += d.children.map((c) => nodeToXml(c.data) + (c.data.tail ? esc(c.data.tail) : '')).join('');
  return out + '</' + d.tag + '>';
}
function convert(ctx, etEl, docRef) {
  const ed = etEl.data;
  if (ed.__comment) { const d = { kind: 'comment', text: ed.text, children: [], attrib: new Map() }; const s = ctx.native('xml.dom.minidom.Node', d); d.__selfRef = s; d.doc = docRef; return s; }
  if (ed.__pi) { const d = { kind: 'pi', text: ed.text, children: [], attrib: new Map() }; const s = ctx.native('xml.dom.minidom.Node', d); d.__selfRef = s; d.doc = docRef; return s; }
  const d = { kind: 'element', tag: ed.tag, attrib: new Map(ed.attrib), text: ed.text, tail: ed.tail, children: [] };
  const s = ctx.native('xml.dom.minidom.Node', d); d.__selfRef = s; d.doc = docRef;
  d.children = ed.children.map((c) => convert(ctx, c, docRef));
  return s;
}
const NodeDef = {
  typeName: 'Node',
  attrs: {
    nodeType: (ctx, self) => PyAPI.NUM(self.data.kind === 'document' ? 9 : self.data.kind === 'element' ? 1 : self.data.kind === 'comment' ? 8 : self.data.kind === 'pi' ? 7 : 3, false),
    nodeName: (ctx, self) => self.data.kind === 'element' ? self.data.tag : self.data.kind === 'document' ? '#document' : self.data.kind === 'comment' ? '#comment' : '#text',
    tagName: (ctx, self) => self.data.tag ?? NONE,
    documentElement: (ctx, self) => self.data.kind === 'document' ? (self.data.children.find((c) => c.data.kind === 'element') ?? NONE) : NONE,
    childNodes: (ctx, self) => LIST(self.data.children.slice()),
    firstChild: (ctx, self) => self.data.children.length ? self.data.children[0] : NONE,
    ownerDocument: (ctx, self) => self.data.doc ?? NONE,
  },
  methods: {
    toxml: (ctx, self, args) => (self.data.kind === 'document' ? '<?xml version="1.0" ?>' + nodeToXml(self.data) : nodeToXml(self.data)),
    toprettyxml: (ctx, self, args, kwargs) => {
      const indent = (kwargs && kwargs.indent) || '\t';
      const pretty = (d, lv) => {
        if (d.kind !== 'element') return nodeToXml(d);
        const pad = indent.repeat(lv);
        let attrs = ''; for (const [k, v] of d.attrib) attrs += ' ' + k + '="' + escA(v) + '"';
        if (!d.children.length) return pad + '<' + d.tag + attrs + '>' + (d.text ? esc(d.text) : '') + '</' + d.tag + '>\n';
        let out = pad + '<' + d.tag + attrs + '>\n';
        if (d.text && d.text.trim()) out += indent.repeat(lv + 1) + esc(d.text.trim()) + '\n';
        for (const c of d.children) out += pretty(c.data, lv + 1);
        return out + pad + '</' + d.tag + '>\n';
      };
      return (self.data.kind === 'document' ? '<?xml version="1.0" ?>\n' + self.data.children.map((c) => pretty(c.data, 0)).join('') : pretty(self.data, 0));
    },
    writexml: (ctx, self, args) => { ctx.diag('writexml: 書き込み先はファイルオブジェクト前提のため未検証として扱います'); return ctx.unk('writexml の結果'); },
    unlink: (ctx, self) => { self.data.children = []; return NONE; },
    getAttribute: (ctx, self, args) => { const k = ctx.str(args[0]); return self.data.attrib.has(k) ? self.data.attrib.get(k) : ''; },
    setAttribute: (ctx, self, args) => { self.data.attrib.set(ctx.str(args[0]), ctx.str(args[1]) ?? ''); return NONE; },
    hasAttribute: (ctx, self, args) => BOOL(self.data.attrib.has(ctx.str(args[0]))),
    getElementsByTagName: (ctx, self, args) => { const tag = ctx.str(args[0]); const out = []; const walk = (d) => { for (const c of d.children) { if (c.data.kind === 'element' && (tag === '*' || c.data.tag === tag)) out.push(c); walk(c.data); } }; walk(self.data); return LIST(out); },
  },
  repr: (ctx, self) => '<DOM ' + (self.data.kind === 'document' ? 'Document' : 'Element') + ' node "' + (self.data.tag || self.data.kind) + '">',
};
registerStdlibModule('xml.dom.minidom', {
  functions: {
    parseString: (ctx, args) => {
      let rootEt;
      try { rootEt = parseXml(ctx, ctx.str(args[0]) ?? ''); }
      catch (e) { if (e && e.__parse) ctx.err('xml.parsers.expat.ExpatError', e.__parse.msg, ''); throw e; }
      const docData = { kind: 'document', children: [], attrib: new Map(), text: null };
      const doc = ctx.native('xml.dom.minidom.Node', docData); docData.__selfRef = doc; docData.doc = doc;
      docData.children = [convert(ctx, rootEt, doc)];
      return doc;
    },
  },
  classes: { Node: NodeDef },
});
