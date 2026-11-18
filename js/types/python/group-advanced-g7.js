/* 高度モード B7 G7（書式・データ系）集約。
* 自群の impl-advanced-* を全て import し（登録は import の副作用で行われる）、
* 自群のリファレンス項目を連結して export する。 */
import './impl-advanced-g7-common.js';
import './impl-advanced-base64.js';
import './impl-advanced-binascii.js';
import './impl-advanced-codecs.js';
import './impl-advanced-colorsys.js';
import './impl-advanced-configparser.js';
import './impl-advanced-csv.js';
import './impl-advanced-gettext.js';
import './impl-advanced-hashlib.js';
import './impl-advanced-hmac.js';
import './impl-advanced-html.js';
import './impl-advanced-html-entities.js';
import './impl-advanced-html-parser.js';
import './impl-advanced-json.js';
import './impl-advanced-keyword.js';
import './impl-advanced-plistlib.js';
import './impl-advanced-quopri.js';
import './impl-advanced-struct.js';
import './impl-advanced-tomllib.js';
import './impl-advanced-uuid.js';

import { referenceAdvanced as refBase64 } from './reference-advanced-base64.js';
import { referenceAdvanced as refBinascii } from './reference-advanced-binascii.js';
import { referenceAdvanced as refCodecs } from './reference-advanced-codecs.js';
import { referenceAdvanced as refColorsys } from './reference-advanced-colorsys.js';
import { referenceAdvanced as refConfigparser } from './reference-advanced-configparser.js';
import { referenceAdvanced as refCsv } from './reference-advanced-csv.js';
import { referenceAdvanced as refGettext } from './reference-advanced-gettext.js';
import { referenceAdvanced as refHashlib } from './reference-advanced-hashlib.js';
import { referenceAdvanced as refHmac } from './reference-advanced-hmac.js';
import { referenceAdvanced as refHtml } from './reference-advanced-html.js';
import { referenceAdvanced as refHtmlEntities } from './reference-advanced-html-entities.js';
import { referenceAdvanced as refHtmlParser } from './reference-advanced-html-parser.js';
import { referenceAdvanced as refJson } from './reference-advanced-json.js';
import { referenceAdvanced as refKeyword } from './reference-advanced-keyword.js';
import { referenceAdvanced as refPlistlib } from './reference-advanced-plistlib.js';
import { referenceAdvanced as refQuopri } from './reference-advanced-quopri.js';
import { referenceAdvanced as refStruct } from './reference-advanced-struct.js';
import { referenceAdvanced as refTomllib } from './reference-advanced-tomllib.js';
import { referenceAdvanced as refUuid } from './reference-advanced-uuid.js';

export const REF_G7 = [
  ...refBase64, ...refBinascii, ...refCodecs, ...refColorsys, ...refConfigparser,
  ...refCsv, ...refGettext, ...refHashlib, ...refHmac, ...refHtml,
  ...refHtmlEntities, ...refHtmlParser, ...refJson, ...refKeyword, ...refPlistlib,
  ...refQuopri, ...refStruct, ...refTomllib, ...refUuid,
];
export const referenceAdvanced = REF_G7;
