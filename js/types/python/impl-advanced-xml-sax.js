/* 高度モード B7 G10：xml.sax（例外対応付けのみ。パーサはドライバ依存で未検証）。 */
import { registerStdlibModule } from './stdlib-registry.js';
registerStdlibModule('xml.sax', { classes: {
  SAXException: { typeName: 'SAXException', exc: 'xml.sax.SAXException', excParents: ["Exception"] },
  SAXParseException: { typeName: 'SAXParseException', exc: 'xml.sax.SAXParseException', excParents: ["xml.sax.SAXException", "Exception"] },
  SAXNotRecognizedException: { typeName: 'SAXNotRecognizedException', exc: 'xml.sax.SAXNotRecognizedException', excParents: ["xml.sax.SAXException", "Exception"] },
  SAXNotSupportedException: { typeName: 'SAXNotSupportedException', exc: 'xml.sax.SAXNotSupportedException', excParents: ["xml.sax.SAXException", "Exception"] },
  SAXReaderNotAvailable: { typeName: 'SAXReaderNotAvailable', exc: 'xml.sax.SAXReaderNotAvailable', excParents: ["xml.sax.SAXNotSupportedException", "xml.sax.SAXException", "Exception"] },
} });
