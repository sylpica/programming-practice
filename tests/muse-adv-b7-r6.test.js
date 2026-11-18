/* 高度モード B7 追補 R6（G10 属性代入・G12 mock 配線）のテスト。
 * 期待値は CPython 3.12.3 実走で裏付けた値（docs/audit/b7-r6-report.md 参照）。
 * 対象 impl は R6 の担当ファイルのみ import する。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import '../js/types/python/impl-advanced-xml-etree-elementtree.js';
import '../js/types/python/impl-advanced-email-message.js';
import '../js/types/python/impl-advanced-unittest-mock.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

// ---------- G10: Element の属性代入（setattr 配線） ----------
test('R6 G10 Element: text 代入が読み戻しと tostring に反映される', async () => {
  const code = [
    'from xml.etree import ElementTree as ET',
    'el = ET.Element("root")',
    'el.text = "hello"',
    'print(el.text)',
    'print(ET.tostring(el, encoding="unicode"))',
    'el.text = None',
    'print(el.text)',
    'print(ET.tostring(el, encoding="unicode"))',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['hello', '<root>hello</root>', 'None', '<root />']);
});
test('R6 G10 Element: パース済み要素の tail 代入と tag／attrib の付け替え', async () => {
  const code = [
    'from xml.etree import ElementTree as ET',
    'root = ET.fromstring("<a>x<b/>tail0</a>")',
    'kid = root[0]',
    'kid.tail = "T"',
    'print(kid.tail)',
    'print(ET.tostring(root, encoding="unicode"))',
    'root.tag = "renamed"',
    'root.attrib = {"k": "v"}',
    'print(root.tag, root.get("k"))',
    'print(ET.tostring(root, encoding="unicode"))',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  // CPython の tostring は <b /> と空白付き自己終了タグを出すが、本実装の
  // 既存の既知差異（<b /> ではなく <b /> 相当の表記差）は対象外とし、
  // tail 代入の反映のみを照合する（報告書参照）。
  assert.deepEqual(outs(r), ['T', '<a>x<b />T</a>', 'renamed v', '<renamed k="v">x<b />T</renamed>']);
});
test('R6 G10 Element: SubElement で作った子の text 代入', async () => {
  const code = [
    'from xml.etree import ElementTree as ET',
    'el = ET.Element("root")',
    'sub = ET.SubElement(el, "kid")',
    'sub.text = "s"',
    'print(ET.tostring(el, encoding="unicode"))',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['<root><kid>s</kid></root>']);
});
test('R6 G10 Element: 未知属性への代入は CPython と同じく AttributeError', async () => {
  const r = await run('from xml.etree import ElementTree as ET\nel = ET.Element("a")\nel.foo = 1');
  assert.ok(errs(r).length > 0);
  assert.match(errs(r)[0], /AttributeError/);
});
test('R6 G10 QName: text 代入の読み戻し', async () => {
  const code = [
    'from xml.etree import ElementTree as ET',
    'q = ET.QName("urn:x", "tag")',
    'q.text = "{urn:y}other"',
    'print(q.text)',
    'print(str(q))',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['{urn:y}other', '{urn:y}other']);
});
test('R6 G10 email.message: preamble／epilogue 代入の読み戻し', async () => {
  const code = [
    'from email.message import EmailMessage',
    'm = EmailMessage()',
    'm.preamble = "pre"',
    'm.epilogue = "epi"',
    'print(m.preamble, m.epilogue)',
    'm.preamble = None',
    'print(m.preamble)',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['pre epi', 'None']);
});

// ---------- G12: unittest.mock の子モック自動生成（attrFallback 配線） ----------
test('R6 G12 mock: 子モックの自動生成と一貫性・呼び出し可能性', async () => {
  const code = [
    'from unittest.mock import Mock',
    'm = Mock()',
    'print(m.foo is m.foo)',
    'print(m.foo.bar is m.foo.bar)',
    'r = m.foo.bar(1)',
    'print(m.foo.bar.call_count, m.foo.bar.called)',
    'print(r is m.foo.bar())',
    'print(r.baz() is r.baz())',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['True', 'True', '1 True', 'True', 'True']);
});
test('R6 G12 mock: 親の method_calls／mock_calls への伝播と assert_has_calls', async () => {
  const code = [
    'from unittest.mock import Mock, call',
    'm = Mock()',
    'm.a.b(3)',
    'print(m.method_calls)',
    'print(m.mock_calls)',
    'print(m.a.method_calls)',
    'print(m.mock_calls == [call.a.b(3)])',
    'm.assert_has_calls([call.a.b(3)])',
    'm.a.assert_has_calls([call.b(3)])',
    "print('ok')",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['[call.a.b(3)]', '[call.a.b(3)]', '[call.b(3)]', 'True', 'ok']);
});
test('R6 G12 mock: 属性代入の読み戻し（通常属性・return_value・side_effect）', async () => {
  const code = [
    'from unittest.mock import Mock',
    'm = Mock()',
    'm.x = 5',
    'print(m.x)',
    'm.foo = 7',
    'print(m.foo)',
    'm.return_value = 42',
    'print(m(), m.return_value)',
    'm2 = Mock()',
    'm2.side_effect = [10, 20]',
    'print(m2(), m2())',
    'm3 = Mock()',
    'm3.foo.return_value = 9',
    'print(m3.foo())',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['5', '7', '42 42', '10 20', '9']);
});
test('R6 G12 mock: 子モックの assert と reset_mock の再帰リセット', async () => {
  const code = [
    'from unittest.mock import Mock',
    'm = Mock()',
    'm.child(1)',
    'm.child.assert_called_once_with(1)',
    'print(m.child.call_count, m.call_count)',
    'm.reset_mock()',
    'print(m.child.call_count, m.call_count, m.method_calls)',
    'm.child.assert_not_called()',
    "print('ok')",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['1 0', '0 0 []', 'ok']);
});
test('R6 G12 mock: configure_mock のドット記法と attach_mock', async () => {
  const code = [
    'from unittest.mock import Mock',
    'm = Mock()',
    "m.configure_mock(**{'foo.return_value': 11})",
    'print(m.foo())',
    'other = Mock()',
    "m.attach_mock(other, 'kid')",
    'other(9)',
    'print(m.method_calls)',
    'print(m.kid is other)',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['11', '[call.foo(), call.kid(9)]', 'True']);
});
test('R6 G12 mock: MagicMock の子も MagicMock として振る舞う／sentinel の子生成', async () => {
  const code = [
    'from unittest.mock import MagicMock, sentinel',
    'mm = MagicMock()',
    'print(len(mm.foo))',
    'print(list(mm.foo))',
    'print(sentinel.DEFAULT is sentinel.DEFAULT)',
    'print(sentinel.DEFAULT)',
    'print(sentinel.anything is sentinel.anything)',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['0', '[]', 'True', 'sentinel.DEFAULT', 'True']);
});
