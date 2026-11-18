/* 高度モード B7 G3（テキスト処理系）群集約。
 * 担当8モジュール（re / string / textwrap / difflib / unicodedata /
 * stringprep / fnmatch / shlex）の impl を import 副作用で stdlib
 * レジストリへ登録し、各 reference-advanced-*.js の referenceAdvanced を
 * 連結した REF_G3 を export する。統合時は advanced-engine.js への
 * import 追加と advanced-manifest.js の referenceParts 追加が必要
 * （共有ファイルのためコーディネーター統合待ち。報告書の基盤要請参照）。 */
import './impl-advanced-re.js';
import './impl-advanced-string.js';
import './impl-advanced-textwrap.js';
import './impl-advanced-difflib.js';
import './impl-advanced-unicodedata.js';
import './impl-advanced-stringprep.js';
import './impl-advanced-fnmatch.js';
import './impl-advanced-shlex.js';

import { referenceAdvanced as refRe } from './reference-advanced-re.js';
import { referenceAdvanced as refString } from './reference-advanced-string.js';
import { referenceAdvanced as refTextwrap } from './reference-advanced-textwrap.js';
import { referenceAdvanced as refDifflib } from './reference-advanced-difflib.js';
import { referenceAdvanced as refUnicodedata } from './reference-advanced-unicodedata.js';
import { referenceAdvanced as refStringprep } from './reference-advanced-stringprep.js';
import { referenceAdvanced as refFnmatch } from './reference-advanced-fnmatch.js';
import { referenceAdvanced as refShlex } from './reference-advanced-shlex.js';

export const REF_G3 = [
  ...refRe,
  ...refString,
  ...refTextwrap,
  ...refDifflib,
  ...refUnicodedata,
  ...refStringprep,
  ...refFnmatch,
  ...refShlex,
];
