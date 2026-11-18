/* 高度モード B7 追補 R1（G4 是正）テスト。
 * (a) G4 リファレンス15ファイル全項目の caution 正規化：
 *     caution は常に文字列、unverified ⇒ caution に「未検証」を含む、
 *     unsupported ⇒ caution に「未対応」を含む。
 * (b) enum.Flag の単項 ~ の CPython 照合：期待値はローカル CPython 3.12.3 の
 *     実走で採取（Flag.__invert__ の原文とも照合。STRICT は定義済みビット内の
 *     補集合、IntFlag（KEEP）は cls(~v) の正規化）。
 * 既存の群テスト・基盤テストの回帰確認は本ファイルではなく実行手順側で行う。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import '../js/types/python/group-advanced-g4.js'; /* G4 impl の登録（import 副作用） */
import * as refAbc from '../js/types/python/reference-advanced-abc.js';
import * as refArray from '../js/types/python/reference-advanced-array.js';
import * as refBisect from '../js/types/python/reference-advanced-bisect.js';
import * as refCollections from '../js/types/python/reference-advanced-collections.js';
import * as refCollectionsAbc from '../js/types/python/reference-advanced-collections-abc.js';
import * as refContextlib from '../js/types/python/reference-advanced-contextlib.js';
import * as refCopy from '../js/types/python/reference-advanced-copy.js';
import * as refDataclasses from '../js/types/python/reference-advanced-dataclasses.js';
import * as refEnum from '../js/types/python/reference-advanced-enum.js';
import * as refGraphlib from '../js/types/python/reference-advanced-graphlib.js';
import * as refHeapq from '../js/types/python/reference-advanced-heapq.js';
import * as refPprint from '../js/types/python/reference-advanced-pprint.js';
import * as refReprlib from '../js/types/python/reference-advanced-reprlib.js';
import * as refTypes from '../js/types/python/reference-advanced-types.js';
import * as refWeakref from '../js/types/python/reference-advanced-weakref.js';

const py = getDefinition('python');
async function run(code) {
  const r = await py.simulate(code, structuredClone(py.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);
  return { out: (r.paths[0]?.outputs || []).map((o) => o.text).join('\n'), errs };
}
async function eq(code, expected) {
  const { out, errs } = await run(code);
  assert.deepEqual(errs, [], 'errors for: ' + code);
  assert.equal(out, expected, 'for: ' + code);
}
async function raises(code, excName) {
  const probe = 'try:\n' + code.split('\n').map((l) => '    ' + l).join('\n') + '\nexcept ' + excName + ':\n    print(\'raised:' + excName + '\')\nexcept Exception:\n    print(\'raised:other\')';
  const { out, errs } = await run(probe);
  assert.deepEqual(errs, [], 'errors for probe: ' + code);
  assert.equal(out, 'raised:' + excName, 'for: ' + code);
}

const G4_REFS = [
  ['abc', refAbc], ['array', refArray], ['bisect', refBisect],
  ['collections', refCollections], ['collections-abc', refCollectionsAbc],
  ['contextlib', refContextlib], ['copy', refCopy], ['dataclasses', refDataclasses],
  ['enum', refEnum], ['graphlib', refGraphlib], ['heapq', refHeapq],
  ['pprint', refPprint], ['reprlib', refReprlib], ['types', refTypes],
  ['weakref', refWeakref],
];

test('R1(a): G4 全リファレンス項目の caution が文字列で、状態語と一致する', () => {
  let total = 0;
  for (const [modName, mod] of G4_REFS) {
    assert.ok(Array.isArray(mod.referenceAdvanced), modName + ': referenceAdvanced');
    for (const it of mod.referenceAdvanced) {
      total++;
      assert.equal(typeof it.caution, 'string', modName + ' ' + it.name + ': caution は文字列');
      if (it.status === 'unverified') {
        assert.ok(it.caution.includes('未検証'), modName + ' ' + it.name + ': unverified は caution に「未検証」を含む');
      }
      if (it.status === 'unsupported') {
        assert.ok(it.caution.includes('未対応'), modName + ' ' + it.name + ': unsupported は caution に「未対応」を含む');
      }
    }
  }
  assert.equal(total, 329, 'G4 対象15ファイルの項目総数（contextvars を除く）');
});

const FLAG_SETUP = "from enum import Flag, auto\nPerm = Flag('Perm', [('R', auto()), ('W', auto()), ('X', auto())])";
const INTFLAG_SETUP = "from enum import IntFlag\nIPerm = IntFlag('IPerm', [('R', 4), ('W', 2), ('X', 1)])";

test('R1(b): ~Flag は CPython と一致する（STRICT＝定義済みビット内の補集合）', async () => {
  await eq(FLAG_SETUP + '\nprint(~Perm.R)', 'Perm.W|X');
  await eq(FLAG_SETUP + '\nprint(repr(~Perm.R))', '<Perm.W|X: 6>');
  await eq(FLAG_SETUP + '\nprint(~Perm.W)', 'Perm.R|X');
  await eq(FLAG_SETUP + '\nprint(~(Perm.R | Perm.W))', 'Perm.X');
  await eq(FLAG_SETUP + '\nprint(~Perm(0))', 'Perm.R|W|X');
  await eq(FLAG_SETUP + '\nprint(repr(~(Perm.R | Perm.W | Perm.X)))', '<Perm: 0>');
  await eq(FLAG_SETUP + '\nprint((~Perm.R).value)', '6');
  /* __invert__ メソッド経由と単項演算子の結果が一致する */
  await eq(FLAG_SETUP + '\nprint(Perm.R.__invert__(), ~Perm.R)', 'Perm.W|X Perm.W|X');
});

test('R1(b): ~IntFlag は CPython と一致する（KEEP＝cls(~v) の正規化）', async () => {
  await eq(INTFLAG_SETUP + '\nprint(~IPerm.R)', '3');
  await eq(INTFLAG_SETUP + '\nprint(repr(~IPerm.R))', '<IPerm.W|X: 3>');
  /* 名前なしビットを含む疑似メンバー：CPython 3.12.3 実走で ~F(9) = B|4（値6） */
  await eq("from enum import IntFlag\nF = IntFlag('F', [('A', 1), ('B', 2)])\nprint((~F(9)).value)", '6');
  await eq("from enum import IntFlag\nF = IntFlag('F', [('A', 1), ('B', 2)])\nprint(repr(~F(9)))", '<F.B|4: 6>');
  /* IntFlag の単項 - は整数としての符号反転（従来の binop 委譲を壊さない） */
  await eq(INTFLAG_SETUP + '\nprint(-IPerm.R)', '-4');
});

test('R1(b): Flag の単項 - / + / abs と、通常 Enum の ~ は CPython どおり TypeError', async () => {
  await raises(FLAG_SETUP + '\nprint(-Perm.R)', 'TypeError');
  await raises(FLAG_SETUP + '\nprint(+Perm.R)', 'TypeError');
  await raises(FLAG_SETUP + '\nprint(abs(Perm.R))', 'TypeError');
  await raises("from enum import Enum\nColor = Enum('Color', ['RED', 'GREEN'])\nprint(~Color.RED)", 'TypeError');
});
