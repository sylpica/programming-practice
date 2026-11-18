/* 高度モード B7 G5（関数型・イテレータ系）の集約。
 * 契約（advanced-interface.md）に従い、高度ファイルは js/types/python/ 直下に
 * 置き、ファイル名に -advanced を含める。impl は import 副作用で stdlib
 * レジストリへ登録される。referenceAdvanced は3モジュール分（全143件）の
 * 連結で、referenceOverrides は持たない（自群の項目はすべて新規項目。
 * backlog の current 欄の operator.abs／operator.pow の「実装済み」は
 * 接尾辞一致の誤検出であり、基礎リファレンスに実在しない）。 */
import './impl-advanced-itertools.js';
import './impl-advanced-functools.js';
import './impl-advanced-operator.js';
import { referenceAdvanced as refItertools } from './reference-advanced-itertools.js';
import { referenceAdvanced as refFunctools } from './reference-advanced-functools.js';
import { referenceAdvanced as refOperator } from './reference-advanced-operator.js';

export const referenceAdvanced = [...refItertools, ...refFunctools, ...refOperator];
export const referenceOverrides = [];
