/* 高度モード B7 G10：xml.sax.xmlreader（AttributesImpl／AttributesNSImpl／
 * InputSource の値保持を実装。XMLReader／IncrementalParser はドライバ依存で未検証）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NONE, LIST } = PyAPI;
function attrsDef(qual, typeName, ns) {
  return {
    typeName,
    construct: (ctx, args) => { const m = new Map(); if (args.length && ctx.isDict(args[0])) for (const e of args[0].__dict.values()) m.set(ctx.str(e.k) ?? ctx.strOf(e.k), e.v); return ctx.native(qual, { m }); },
    methods: {
      getLength: (ctx, self) => PyAPI.NUM(self.data.m.size, false),
      getNames: (ctx, self) => LIST([...self.data.m.keys()]),
      getType: (ctx, self, args) => 'CDATA',
      getValue: (ctx, self, args) => { const k = ctx.str(args[0]); return self.data.m.has(k) ? self.data.m.get(k) : (() => { ctx.err('KeyError', ctx.repr(k), ''); })(); },
      getQNames: (ctx, self) => LIST([...self.data.m.keys()].map((k) => Array.isArray(k) ? k[1] : k)),
      getNameByQName: (ctx, self, args) => args[0],
      getQNameByName: (ctx, self, args) => { const k = args[0]; return Array.isArray(k && k.__tuple ? k.__tuple : null) ? k : args[0]; },
      getValueByQName: (ctx, self, args) => { const k = ctx.str(args[0]); return self.data.m.has(k) ? self.data.m.get(k) : (() => { ctx.err('KeyError', ctx.repr(k), ''); })(); },
    },
    len: (ctx, self) => self.data.m.size,
    contains: (ctx, self, item) => self.data.m.has(ctx.str(item)),
  };
}
const InputSourceDef = {
  typeName: 'InputSource',
  construct: (ctx, args) => ctx.native('xml.sax.xmlreader.InputSource', { systemId: args.length ? ctx.str(args[0]) ?? null : null, publicId: null, encoding: null, byteStream: null, characterStream: null }),
  methods: {
    getSystemId: (ctx, self) => self.data.systemId === null ? NONE : self.data.systemId,
    setSystemId: (ctx, self, args) => { self.data.systemId = ctx.str(args[0]); return NONE; },
    getPublicId: (ctx, self) => self.data.publicId === null ? NONE : self.data.publicId,
    setPublicId: (ctx, self, args) => { self.data.publicId = ctx.str(args[0]); return NONE; },
    getEncoding: (ctx, self) => self.data.encoding === null ? NONE : self.data.encoding,
    setEncoding: (ctx, self, args) => { self.data.encoding = ctx.str(args[0]); return NONE; },
    getByteStream: (ctx, self) => self.data.byteStream === null ? NONE : self.data.byteStream,
    setByteStream: (ctx, self, args) => { self.data.byteStream = args[0]; return NONE; },
    getCharacterStream: (ctx, self) => self.data.characterStream === null ? NONE : self.data.characterStream,
    setCharacterStream: (ctx, self, args) => { self.data.characterStream = args[0]; return NONE; },
  },
};
registerStdlibModule('xml.sax.xmlreader', { classes: { AttributesImpl: attrsDef('xml.sax.xmlreader.AttributesImpl', 'AttributesImpl', false), AttributesNSImpl: attrsDef('xml.sax.xmlreader.AttributesNSImpl', 'AttributesNSImpl', true), InputSource: InputSourceDef } });
