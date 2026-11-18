/* 高度モード B7 G10：xml.parsers.expat.model（値は CPython 実走抽出）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM } = PyAPI;
registerStdlibModule('xml.parsers.expat.model', { constants: {
  "XML_CQUANT_NONE": NUM(0, false),
  "XML_CQUANT_OPT": NUM(1, false),
  "XML_CQUANT_PLUS": NUM(3, false),
  "XML_CQUANT_REP": NUM(2, false),
  "XML_CTYPE_ANY": NUM(2, false),
  "XML_CTYPE_CHOICE": NUM(5, false),
  "XML_CTYPE_EMPTY": NUM(1, false),
  "XML_CTYPE_MIXED": NUM(3, false),
  "XML_CTYPE_NAME": NUM(4, false),
  "XML_CTYPE_SEQ": NUM(6, false),
} });
