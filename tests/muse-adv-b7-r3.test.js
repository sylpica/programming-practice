/* 高度モード B7 R3 追補テスト：
 * 1) ast.AST の位置属性（lineno／col_offset／end_lineno／end_col_offset）
 * 2) io の基底クラス属性2件の unverified 化
 * 3) xml.is_valid_name／xml.is_valid_text（Python 3.15 新規）の新規実装
 * 期待値は CPython 本体ソース（3.15 ブランチ Lib/xml/utils.py）から採取した
 * 関数をローカル Python 3.12.3 で実走させた結果、および CPython 3.12.3 の
 * ast 実走で裏付けた。実行：node --test tests/muse-adv-b7-r3.test.js */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

await import('../js/types/python/impl-advanced-ast.js');
await import('../js/types/python/impl-advanced-io.js');
await import('../js/types/python/impl-advanced-xml.js');
const refAst = (await import('../js/types/python/reference-advanced-ast.js')).referenceAdvanced;
const refIo = (await import('../js/types/python/reference-advanced-io.js')).referenceAdvanced;
const refXml = (await import('../js/types/python/reference-advanced-xml.js')).referenceAdvanced;

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);
async function check(code, want) {
  const r = await run(code);
  assert.deepEqual(errs(r), [], code);
  assert.deepEqual(outs(r), [want], code);
}

/* ---------- 1. ast 位置属性 ---------- */
test('R3 ast: 位置属性4件は supported のまま（収載確認）', () => {
  for (const n of ['ast.AST.lineno', 'ast.AST.col_offset', 'ast.AST.end_lineno', 'ast.AST.end_col_offset']) {
    const it = refAst.find((i) => i.name === n);
    assert.ok(it, n);
    assert.equal(it.status, 'supported', n);
  }
});

test('R3 ast: 位置属性の読み取り（生成時 kwargs・CPython どおり）', async () => {
  // リファレンス例題そのもの
  await check("import ast\nC = ast.Constant\nnode = C(value=1, lineno=3)\nprint(node.lineno)", '3');
  await check("import ast\nC = ast.Constant\nnode = C(value=1, col_offset=3)\nprint(node.col_offset)", '3');
  await check("import ast\nC = ast.Constant\nnode = C(value=1, end_lineno=3)\nprint(node.end_lineno)", '3');
  await check("import ast\nC = ast.Constant\nnode = C(value=1, end_col_offset=3)\nprint(node.end_col_offset)", '3');
  // parse 結果と同形の値（x = 1 の Assign ノード：1, 0, 1, 5）
  await check("import ast\na = ast.Assign(targets=[ast.Name(id='x', ctx=ast.Store())], value=ast.Constant(1), lineno=1, col_offset=0, end_lineno=1, end_col_offset=5)\nprint(a.lineno, a.col_offset, a.end_lineno, a.end_col_offset)", '1 0 1 5');
});

test('R3 ast: 位置属性の代入・削除（是正した配線）', async () => {
  // 代入した値が読み戻せる（是正前は AttributeError になっていた）
  await check("import ast\nc = ast.Constant(1)\nc.lineno = 5\nprint(c.lineno)", '5');
  await check("import ast\nc = ast.Constant(1)\nc.col_offset = 2\nc.end_lineno = 3\nc.end_col_offset = 4\nprint(c.col_offset, c.end_lineno, c.end_col_offset)", '2 3 4');
  // 生成時に与えた値の上書き
  await check("import ast\nc = ast.Constant(value=1, lineno=1)\nc.lineno = 9\nprint(c.lineno)", '9');
  // 削除後は AttributeError（CPython どおり）
  await check("import ast\nc = ast.Constant(1)\nc.lineno = 5\ndel c.lineno\ntry:\n    print(c.lineno)\nexcept AttributeError:\n    print('attr-error')", 'attr-error');
  // フィールド代入・任意属性も CPython どおり保持される
  await check("import ast\nc = ast.Constant(value=1, custom=9)\nprint(c.custom)", '9');
});

test('R3 ast: 未設定の位置属性は AttributeError（捏造値を返さない）', async () => {
  await check("import ast\nc = ast.Constant(1)\ntry:\n    print(c.lineno)\nexcept AttributeError:\n    print('attr-error')", 'attr-error');
  await check("import ast\ntry:\n    print(ast.AST().lineno)\nexcept AttributeError:\n    print('attr-error')", 'attr-error');
});

test('R3 ast: ast.parse は未検証のまま（位置を捏造しない）', async () => {
  const it = refAst.find((i) => i.name === 'ast.parse');
  assert.equal(it.status, 'unverified');
  const r = await run("import ast\nprint(ast.parse('x = 1'))");
  assert.deepEqual(errs(r), []);
  assert.ok(outs(r)[0].includes('未検証'), outs(r)[0]);
});

/* ---------- 2. io 基底クラス属性 ---------- */
test('R3 io: BufferedIOBase.raw／TextIOBase.buffer は unverified', () => {
  assert.equal(refIo.length, 76);
  for (const n of ['io.BufferedIOBase.raw', 'io.TextIOBase.buffer']) {
    const it = refIo.find((i) => i.name === n);
    assert.ok(it, n);
    assert.equal(it.status, 'unverified', n);
    assert.ok(it.caution.includes('未検証'), n + ' の caution に未検証');
    assert.ok(it.caution.includes('ファイルオブジェクト系'), n + ' の caution に理由');
  }
});

/* ---------- 3. xml.is_valid_name／is_valid_text ---------- */
test('R3 xml: リファレンス構造（2件・正規形）', () => {
  assert.equal(refXml.length, 2);
  const allowed = new Set(['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'returns', 'source']);
  for (const it of refXml) {
    for (const k of Object.keys(it)) assert.ok(allowed.has(k), it.name + ' の追加フィールド ' + k);
    assert.equal(it.category, '標準ライブラリ', it.name);
    assert.equal(it.status, 'supported', it.name);
    assert.ok(it.source.startsWith('https://docs.python.org/ja/3.15/library/xml.html#'), it.name);
  }
  assert.deepEqual(refXml.map((i) => i.name), ['xml.is_valid_name', 'xml.is_valid_text']);
});

test('R3 xml: リファレンス例題の実行照合', async () => {
  for (const it of refXml) {
    const r = await run(it.example);
    assert.deepEqual(errs(r), [], it.name);
    assert.deepEqual(outs(r), ['True False'], it.name);
  }
});

/* CPython 3.15 の Lib/xml/utils.py をローカル実走して採取したケース表 */
const NAME_CASES = [
  ['a', true], ['Z', true], ['_x', true], [':x', true], ['xml', true],
  ['a-b', true], ['a.b', true], ['a·b', true], ['·a', false], ['-a', false],
  ['.a', false], ['1a', false], ['a1', true], ['', false], ['a b', false],
  ['a<b', false], ['a/b', false], ['a!b', false], ['a?b', false], ['a=b', false],
  ['é', true], ['À', true], ['×', false], ['÷', false], ['a×b', false],
  ['‿a', false], ['a‿', true], ['ʼa', true], ['aʼ', true],
  ['\u200cx', true], ['\u0370x', true], ['\u052fx', true], ['、x', true],
  ['\uf900x', true], ['a\u0301', true], ['·', false], ['_', true],
  ['名前', true], ['a:b:c', true],
];
test('R3 xml: is_valid_name ケース表（CPython 実走照合）', async () => {
  for (const [s, want] of NAME_CASES) {
    await check('import xml\nprint(xml.is_valid_name(' + JSON.stringify(s) + '))', want ? 'True' : 'False');
  }
  // アストラル面（NameStartChar の U+10000–U+EFFFF）とタグ文字 U+E0001
  await check("import xml\nprint(xml.is_valid_name(chr(0x10000) + 'x'))", 'True');
  await check("import xml\nprint(xml.is_valid_name(chr(0xE0001) + 'x'))", 'True');
  await check("import xml\nprint(xml.is_valid_name(chr(0xF0000) + 'x'))", 'False');
});

const TEXT_CASES = [
  ['hello', true], ['', true], ['\t\r\n', true], ['a\x00b', false],
  ['\x08', false], ['\x0b', false], ['\x0c', false], ['\x1f', false],
  ['\x7f', true], ['é', true], ['\ufffd', true], ['a\x85b', true],
];
test('R3 xml: is_valid_text ケース表（CPython 実走照合）', async () => {
  for (const [s, want] of TEXT_CASES) {
    await check('import xml\nprint(xml.is_valid_text(' + JSON.stringify(s) + '))', want ? 'True' : 'False');
  }
  // サロゲート・U+FFFE／U+FFFF は不正、絵文字は有効
  await check("import xml\nprint(xml.is_valid_text('a' + chr(0xD800) + 'b'))", 'False');
  await check("import xml\nprint(xml.is_valid_text(chr(0xDFFF)))", 'False');
  await check("import xml\nprint(xml.is_valid_text(chr(0xFFFE)), xml.is_valid_text(chr(0xFFFF)))", 'False False');
  await check("import xml\nprint(xml.is_valid_text(chr(0x1F600)))", 'True');
});

test('R3 xml: 異常系（型違い・引数の数）', async () => {
  await check("import xml\ntry:\n    xml.is_valid_name(123)\nexcept TypeError:\n    print('type-error')", 'type-error');
  await check("import xml\ntry:\n    xml.is_valid_text(None)\nexcept TypeError:\n    print('type-error')", 'type-error');
  await check("import xml\ntry:\n    xml.is_valid_name()\nexcept TypeError:\n    print('type-error')", 'type-error');
  await check("import xml\ntry:\n    xml.is_valid_text('a', 'b')\nexcept TypeError:\n    print('type-error')", 'type-error');
  // from import でも使える
  await check("from xml import is_valid_name, is_valid_text\nprint(is_valid_name('a'), is_valid_text('a'))", 'True True');
});
