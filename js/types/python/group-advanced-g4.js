/* 高度モード B7 G4 群集約：コレクション・データ構造系16モジュール。
 * impl-advanced-* を import すると stdlib レジストリへ登録される（副作用）。
 * reference-advanced-* の referenceAdvanced を連結して REF_G4 として export する。
 * advanced-manifest.js への組み込みはコーディネーター側の作業
 * （B7 の他群と python 型を共有するため、群側では作らない）。 */
import './impl-advanced-collections.js';
import './impl-advanced-collections-abc.js';
import './impl-advanced-heapq.js';
import './impl-advanced-bisect.js';
import './impl-advanced-array.js';
import './impl-advanced-copy.js';
import './impl-advanced-pprint.js';
import './impl-advanced-reprlib.js';
import './impl-advanced-enum.js';
import './impl-advanced-graphlib.js';
import './impl-advanced-weakref.js';
import './impl-advanced-contextlib.js';
import './impl-advanced-contextvars.js';
import './impl-advanced-dataclasses.js';
import './impl-advanced-abc.js';
import './impl-advanced-types.js';

import { attachRegisterToAbc } from './impl-advanced-abc.js';
attachRegisterToAbc();

import { referenceAdvanced as refCollections } from './reference-advanced-collections.js';
import { referenceAdvanced as refCollectionsAbc } from './reference-advanced-collections-abc.js';
import { referenceAdvanced as refHeapq } from './reference-advanced-heapq.js';
import { referenceAdvanced as refBisect } from './reference-advanced-bisect.js';
import { referenceAdvanced as refArray } from './reference-advanced-array.js';
import { referenceAdvanced as refCopy } from './reference-advanced-copy.js';
import { referenceAdvanced as refPprint } from './reference-advanced-pprint.js';
import { referenceAdvanced as refReprlib } from './reference-advanced-reprlib.js';
import { referenceAdvanced as refEnum } from './reference-advanced-enum.js';
import { referenceAdvanced as refGraphlib } from './reference-advanced-graphlib.js';
import { referenceAdvanced as refWeakref } from './reference-advanced-weakref.js';
import { referenceAdvanced as refContextlib } from './reference-advanced-contextlib.js';
import { referenceAdvanced as refContextvars } from './reference-advanced-contextvars.js';
import { referenceAdvanced as refDataclasses } from './reference-advanced-dataclasses.js';
import { referenceAdvanced as refAbc } from './reference-advanced-abc.js';
import { referenceAdvanced as refTypes } from './reference-advanced-types.js';

export const REF_G4 = [
  ...refCollections, ...refCollectionsAbc, ...refHeapq, ...refBisect,
  ...refArray, ...refCopy, ...refPprint, ...refReprlib, ...refEnum,
  ...refGraphlib, ...refWeakref, ...refContextlib, ...refContextvars,
  ...refDataclasses, ...refAbc, ...refTypes,
];
