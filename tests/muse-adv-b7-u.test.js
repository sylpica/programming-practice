/* 高度モード B7 Uチーム：未対応モジュール リファレンス収載の機械照合。
 * 担当範囲 = uncovered-modules.json の全モジュールから G13 担当
 * （ipaddress / pathlib / pathlib.types / filecmp / glob / copyreg / secrets /
 *   math.integer / string.templatelib / wsgiref.headers / wsgiref.util）を
 * 除いた 104 モジュール / 4,916 件。期待件数は生成時点の機械照合で固定した。
 * backlog.json が参照できる配置（work/adv-b7-tools/）では名前集合・source・
 * role 由来の文面まで全件照合する。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { referenceAdvanced as uTkinter } from '../js/types/python/reference-advanced-u-tkinter.js';
import { referenceAdvanced as uTkinterSub } from '../js/types/python/reference-advanced-u-tkinter-sub.js';
import { referenceAdvanced as uOs } from '../js/types/python/reference-advanced-u-os.js';
import { referenceAdvanced as uAsyncio } from '../js/types/python/reference-advanced-u-asyncio.js';
import { referenceAdvanced as uNet } from '../js/types/python/reference-advanced-u-net.js';
import { referenceAdvanced as uNetServices } from '../js/types/python/reference-advanced-u-net-services.js';
import { referenceAdvanced as uProc } from '../js/types/python/reference-advanced-u-proc.js';
import { referenceAdvanced as uTerm } from '../js/types/python/reference-advanced-u-term.js';
import { referenceAdvanced as uWin } from '../js/types/python/reference-advanced-u-win.js';
import { referenceAdvanced as uDataFiles } from '../js/types/python/reference-advanced-u-data-files.js';
import { referenceAdvanced as uRuntime } from '../js/types/python/reference-advanced-u-runtime.js';

const FILES = [
  ['reference-advanced-u-tkinter.js', uTkinter, 710],
  ['reference-advanced-u-tkinter-sub.js', uTkinterSub, 329],
  ['reference-advanced-u-os.js', uOs, 596],
  ['reference-advanced-u-asyncio.js', uAsyncio, 512],
  ['reference-advanced-u-net.js', uNet, 389],
  ['reference-advanced-u-net-services.js', uNetServices, 456],
  ['reference-advanced-u-proc.js', uProc, 361],
  ['reference-advanced-u-term.js', uTerm, 478],
  ['reference-advanced-u-win.js', uWin, 397],
  ['reference-advanced-u-data-files.js', uDataFiles, 389],
  // 統合時の是正：importlib.resources.abc の17件は G12 の専用ファイル
  // （reference-advanced-importlib-resources-abc.js）が正本のため、U 側の
  // 二重収載を除去した（299→282、総数 4916→4899）。当該17件はカタログ全体では
  // G12 ファイル側で収載されており、backlog 10,572件の被覆は変わらない。
  ['reference-advanced-u-runtime.js', uRuntime, 282],
];
const EXPECTED_TOTAL = 4899;
const ALL = FILES.flatMap(([, items]) => items);

// Uチームの項目が持つフィールドはこの7つのみ（example は捏造防止のため省略、
// returns は付けない）。これ以外のキーがあれば正規形違反。
const EXPECTED_KEYS = ['category', 'caution', 'description', 'name', 'source', 'status', 'syntax'];
const ROLE_JP = {
  function: '関数', method: 'メソッド', class: 'クラス',
  data: 'データ', attribute: '属性', exception: '例外クラス',
};
const EXCLUDED_G13 = new Set([
  'ipaddress', 'pathlib', 'pathlib.types', 'filecmp', 'glob', 'copyreg',
  'secrets', 'math.integer', 'string.templatelib',
  'wsgiref.headers', 'wsgiref.util',
]);

test('B7-U: ファイル別件数と総数が担当範囲の期待件数と一致', () => {
  for (const [file, items, expected] of FILES) {
    assert.equal(items.length, expected, file);
  }
  assert.equal(ALL.length, EXPECTED_TOTAL);
});

test('B7-U: name の重複がない', () => {
  const names = ALL.map((i) => i.name);
  assert.equal(new Set(names).size, names.length);
});

test('B7-U: 全項目が正規形（必須フィールド・許可フィールドのみ・全件 unsupported）', () => {
  for (const item of ALL) {
    assert.deepEqual(Object.keys(item).sort(), EXPECTED_KEYS, item.name);
    for (const key of EXPECTED_KEYS) {
      assert.equal(typeof item[key], 'string', `${item.name}.${key}`);
      assert.notEqual(item[key], '', `${item.name}.${key} が空`);
    }
    assert.equal(item.category, '標準ライブラリ', item.name);
    assert.equal(item.status, 'unsupported', item.name);
    assert.ok(item.source.startsWith('https://docs.python.org/'), item.name);
    assert.ok(
      item.caution.startsWith('本アプリの高度モードでは未対応です。'),
      item.name);
    // syntax はシグネチャを捏造しない形：限定名そのものか 限定名(...)
    assert.ok(
      item.syntax === item.name || item.syntax === `${item.name}(...)`,
      `${item.name}: syntax=${item.syntax}`);
  }
});

test('B7-U: 例外・__future__・test.support の特記が付いている', () => {
  let exceptions = 0;
  for (const item of ALL) {
    if (item.description.includes('の例外クラスです。')) {
      exceptions += 1;
      assert.ok(item.caution.includes('例外クラスです。'), item.name);
      assert.equal(item.status, 'unsupported', item.name);
    }
    if (item.name.startsWith('__future__.')) {
      assert.ok(
        item.caution.includes('言語機能の有効化フラグであり、関数ではありません。'),
        item.name);
    }
    if (item.name.startsWith('test.support')) {
      assert.ok(
        item.description.includes('CPython 自身のテスト支援用モジュールです。'),
        item.name);
    }
  }
  assert.equal(exceptions, 118);
});

test('B7-U: backlog／uncovered との全件照合（名前集合・source・role 由来文面）', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // 棚卸しツールの相対位置はツリー構成で異なる（B7 作業ツリーでは
  // ../../adv-b7-tools、統合正本ツリーでは ../../work/adv-b7-tools）。
  // 統合第2弾で両対応にした（照合内容そのものは不変）。
  const toolsDir = [
    path.resolve(here, '..', '..', 'adv-b7-tools'),
    path.resolve(here, '..', '..', 'work', 'adv-b7-tools'),
  ].find((d) => fs.existsSync(path.join(d, 'backlog.json')));
  const backlogPath = path.join(toolsDir, 'backlog.json');
  const uncoveredPath = path.join(toolsDir, 'uncovered-modules.json');
  assert.ok(fs.existsSync(backlogPath), `backlog が必要: ${backlogPath}`);
  assert.ok(fs.existsSync(uncoveredPath), `uncovered が必要: ${uncoveredPath}`);
  const backlog = JSON.parse(fs.readFileSync(backlogPath, 'utf-8'));
  const uncovered = JSON.parse(fs.readFileSync(uncoveredPath, 'utf-8'));
  const rows = new Map(backlog.items.map((r) => [r.name, r]));

  // 統合時の是正：importlib.resources.abc は uncovered 一覧に含まれていたが
  // 実際は G12 の担当で専用ファイルに収載済みのため、U の担当範囲から除く。
  const EXCLUDED_G12 = new Set(['importlib.resources.abc']);
  const expectedNames = [];
  for (const [mod, names] of Object.entries(uncovered)) {
    if (!EXCLUDED_G13.has(mod) && !EXCLUDED_G12.has(mod)) expectedNames.push(...names);
  }
  assert.equal(expectedNames.length, EXPECTED_TOTAL);
  assert.deepEqual(
    new Set(ALL.map((i) => i.name)), new Set(expectedNames),
    '生成項目の名前集合が担当範囲と一致すること（漏れ・過剰なし）');

  for (const item of ALL) {
    const row = rows.get(item.name);
    assert.ok(row, item.name);
    assert.equal(item.source, row.doc, item.name);
    const expectedDesc =
      `${item.name} は ${row.module} の${ROLE_JP[row.role]}です。` +
      (row.module.startsWith('test.support')
        ? 'CPython 自身のテスト支援用モジュールです。' : '');
    assert.equal(item.description, expectedDesc, item.name);
    const callable = row.role === 'function' || row.role === 'method';
    assert.equal(
      item.syntax, callable ? `${item.name}(...)` : item.name, item.name);
    if (row.role === 'exception') {
      assert.ok(item.caution.includes('例外クラスです。'), item.name);
    }
  }
});
