/* 高度モード B7 G10：xml.sax.handler（定数は CPython 実走抽出。
 * ハンドラ基底クラスは no-op メソッド群を実装）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NONE, LIST } = PyAPI;
const noop = () => NONE;
function handlerClass(qual, typeName, methodNames) { const methods = {}; for (const m of methodNames) methods[m] = noop; return { typeName, construct: (ctx) => ctx.native(qual, {}), methods }; }
registerStdlibModule('xml.sax.handler', { constants: {
  "feature_external_ges": "http://xml.org/sax/features/external-general-entities",
  "feature_external_pes": "http://xml.org/sax/features/external-parameter-entities",
  "feature_namespace_prefixes": "http://xml.org/sax/features/namespace-prefixes",
  "feature_namespaces": "http://xml.org/sax/features/namespaces",
  "feature_string_interning": "http://xml.org/sax/features/string-interning",
  "feature_validation": "http://xml.org/sax/features/validation",
  "property_declaration_handler": "http://xml.org/sax/properties/declaration-handler",
  "property_dom_node": "http://xml.org/sax/properties/dom-node",
  "property_encoding": "http://www.python.org/sax/properties/encoding",
  "property_interning_dict": "http://www.python.org/sax/properties/interning-dict",
  "property_lexical_handler": "http://xml.org/sax/properties/lexical-handler",
  "property_xml_string": "http://xml.org/sax/properties/xml-string",
  all_features: LIST(["http://xml.org/sax/features/namespaces", "http://xml.org/sax/features/namespace-prefixes", "http://xml.org/sax/features/string-interning", "http://xml.org/sax/features/validation", "http://xml.org/sax/features/external-general-entities", "http://xml.org/sax/features/external-parameter-entities"]), all_properties: LIST(["http://xml.org/sax/properties/lexical-handler", "http://xml.org/sax/properties/dom-node", "http://xml.org/sax/properties/declaration-handler", "http://xml.org/sax/properties/xml-string", "http://www.python.org/sax/properties/encoding", "http://www.python.org/sax/properties/interning-dict"]),
}, classes: {
  ContentHandler: { ...handlerClass('xml.sax.handler.ContentHandler','ContentHandler',['characters','endDocument','endElement','endElementNS','endPrefixMapping','ignorableWhitespace','processingInstruction','setDocumentLocator','skippedEntity','startDocument','startElement','startElementNS','startPrefixMapping']), methods: { characters: noop, endDocument: noop, endElement: noop, endElementNS: noop, endPrefixMapping: noop, ignorableWhitespace: noop, processingInstruction: noop, setDocumentLocator: (ctx,self,args)=>{ self.data.locator=args[0]; return NONE; }, skippedEntity: noop, startDocument: noop, startElement: noop, startElementNS: noop, startPrefixMapping: noop } },
  DTDHandler: handlerClass('xml.sax.handler.DTDHandler','DTDHandler',['notationDecl','unparsedEntityDecl']),
  EntityResolver: handlerClass('xml.sax.handler.EntityResolver','EntityResolver',['resolveEntity']),
  ErrorHandler: handlerClass('xml.sax.handler.ErrorHandler','ErrorHandler',['error','fatalError','warning']),
} });
