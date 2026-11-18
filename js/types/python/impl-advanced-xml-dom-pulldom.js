/* 高度モード B7 G10：xml.dom.pulldom（イベント定数のみ。ストリームは未検証）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM } = PyAPI;
registerStdlibModule('xml.dom.pulldom', { constants: {
  START_ELEMENT: "START_ELEMENT",
  END_ELEMENT: "END_ELEMENT",
  START_DOCUMENT: "START_DOCUMENT",
  END_DOCUMENT: "END_DOCUMENT",
  COMMENT: "COMMENT",
  CHARACTERS: "CHARACTERS",
  PROCESSING_INSTRUCTION: "PROCESSING_INSTRUCTION",
  IGNORABLE_WHITESPACE: "IGNORABLE_WHITESPACE",
  default_bufsize: NUM(16364, false),
} });
