/* 高度モード B7 追補 R4：G13 等価性（ipaddress の Interface⇔Address）と
 * G1b ABC 接続（numbers の builtinTypes／Fraction の parents／Decimal の
 * 登録）の是正検証。
 * 期待値はすべて CPython 3.12.3 実走で確定した値（2026-11-17 照合）。
 * 重要：タスク前提だった「IPv4Interface == IPv4Address は True」「Decimal は
 * numbers に未登録」は実走と CPython ソース（IPv4Interface.__eq__ の
 * コメント／_pydecimal.py の Number.register(Decimal)）で否定されたため、
 * 本テストは CPython の実挙動を正として固定する。詳細は
 * docs/audit/b7-r4-report.md。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import '../js/types/python/impl-advanced-ipaddress.js';
import '../js/types/python/impl-advanced-g1.js';
import '../js/types/python/impl-advanced-decimal.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

const CASES = [
  // ---- ipaddress：Interface と Address の等価性（CPython 3.12.3 実走どおり） ----
  // Interface はネットワークを持つため、素の Address とは等しくならない（両方向）。
  ["from ipaddress import IPv4Address, IPv4Interface\nprint(IPv4Interface('192.168.0.1/24') == IPv4Address('192.168.0.1'))", ['False']],
  ["from ipaddress import IPv4Address, IPv4Interface\nprint(IPv4Address('192.168.0.1') == IPv4Interface('192.168.0.1/24'))", ['False']],
  ["from ipaddress import IPv6Address, IPv6Interface\nprint(IPv6Interface('2001:db8::1/64') == IPv6Address('2001:db8::1'))", ['False']],
  ["from ipaddress import IPv6Address, IPv6Interface\nprint(IPv6Address('2001:db8::1') == IPv6Interface('2001:db8::1/64'))", ['False']],
  ["from ipaddress import IPv4Address, IPv4Interface\nprint(IPv4Interface('192.168.0.1/24') != IPv4Address('192.168.0.1'), IPv4Address('192.168.0.1') != IPv4Interface('192.168.0.1/24'))", ['True True']],
  // Interface 同士：ip とネットワーク（prefixlen）が両方一致したときだけ等しい
  ["from ipaddress import IPv4Interface\nprint(IPv4Interface('192.168.0.1/24') == IPv4Interface('192.168.0.1/24'))", ['True']],
  ["from ipaddress import IPv4Interface\nprint(IPv4Interface('192.168.0.1/24') == IPv4Interface('192.168.0.1/25'))", ['False']],
  ["from ipaddress import IPv4Interface\nprint(IPv4Interface('192.168.0.1/24') == IPv4Interface('192.168.0.2/24'))", ['False']],
  ["from ipaddress import IPv6Interface\nprint(IPv6Interface('2001:db8::1/64') == IPv6Interface('2001:db8::1/64'), IPv6Interface('2001:db8::1/64') == IPv6Interface('2001:db8::1/48'))", ['True False']],
  // Address 同士・異種・異バージョン
  ["from ipaddress import IPv4Address\nprint(IPv4Address('192.168.0.1') == IPv4Address('192.168.0.1'), IPv4Address('192.168.0.1') == IPv4Address('192.168.0.2'))", ['True False']],
  ["from ipaddress import IPv4Address, IPv6Address\nprint(IPv4Address('192.168.0.1') == IPv6Address('::1'))", ['False']],
  ["from ipaddress import IPv4Address, IPv4Network\nprint(IPv4Address('192.168.0.1') == 1, IPv4Address('192.168.0.1') == '192.168.0.1', IPv4Address('192.168.0.1') == None, IPv4Address('192.168.0.1') == IPv4Network('192.168.0.0/24'))", ['False False False False']],
  // hash の整合：CPython では hash(Interface) != hash(Address)（実走確認）。
  // エンジンでは集合・辞書のキー挙動として照合する（2要素に分かれ、引きは miss）。
  ["from ipaddress import IPv4Address, IPv4Interface\nprint(len({IPv4Address('192.168.0.1'), IPv4Interface('192.168.0.1/24')}))", ['2']],
  ["from ipaddress import IPv4Address, IPv4Interface\nprint({IPv4Address('192.168.0.1'): 'x'}.get(IPv4Interface('192.168.0.1/24'), 'miss'))", ['miss']],
  ["from ipaddress import IPv4Interface\nprint(len({IPv4Interface('192.168.0.1/24'), IPv4Interface('192.168.0.1/24'), IPv4Interface('192.168.0.1/25')}))", ['2']],
  // isinstance の継承（Interface は Address のサブクラス）は従来どおり成立する
  ["from ipaddress import IPv4Address, IPv4Interface\nprint(isinstance(IPv4Interface('192.168.0.1/24'), IPv4Address), isinstance(IPv4Address('192.168.0.1'), IPv4Interface))", ['True False']],

  // ---- numbers ABC × 組み込み型・Fraction・Decimal（CPython 3.12.3 実走の行列） ----
  // 列順：Number, Complex, Real, Rational, Integral
  ["import numbers\nprint(isinstance(3, numbers.Number), isinstance(3, numbers.Complex), isinstance(3, numbers.Real), isinstance(3, numbers.Rational), isinstance(3, numbers.Integral))", ['True True True True True']],
  ["import numbers\nprint(isinstance(True, numbers.Number), isinstance(True, numbers.Complex), isinstance(True, numbers.Real), isinstance(True, numbers.Rational), isinstance(True, numbers.Integral))", ['True True True True True']],
  ["import numbers\nprint(isinstance(1.5, numbers.Number), isinstance(1.5, numbers.Complex), isinstance(1.5, numbers.Real), isinstance(1.5, numbers.Rational), isinstance(1.5, numbers.Integral))", ['True True True False False']],
  ["from fractions import Fraction\nimport numbers\nprint(isinstance(Fraction(1, 2), numbers.Number), isinstance(Fraction(1, 2), numbers.Complex), isinstance(Fraction(1, 2), numbers.Real), isinstance(Fraction(1, 2), numbers.Rational), isinstance(Fraction(1, 2), numbers.Integral))", ['True True True True False']],
  // Decimal は Number にだけ登録される（_pydecimal.py: Number.register(Decimal)）
  ["from decimal import Decimal\nimport numbers\nprint(isinstance(Decimal('1'), numbers.Number), isinstance(Decimal('1'), numbers.Complex), isinstance(Decimal('1'), numbers.Real), isinstance(Decimal('1'), numbers.Rational), isinstance(Decimal('1'), numbers.Integral))", ['True False False False False']],
  // 文字列・None はどの ABC のインスタンスでもない
  ["import numbers\nprint(isinstance('3', numbers.Number), isinstance(None, numbers.Number))", ['False False']],
  // タプル形 classinfo でも接続が効く
  ["import numbers\nprint(isinstance(3, (str, numbers.Integral)), isinstance(1.5, (str, numbers.Rational)))", ['True False']],
];
for (const [code, expected] of CASES) {
  test('B7 R4 case: ' + code.split('\n').pop(), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), expected, code);
  });
}

test('B7 R4: CPython 実走との機械照合（numbers 行列）', async () => {
  const code = [
    'import numbers',
    'from fractions import Fraction',
    'from decimal import Decimal',
    "vals = [3, True, 1.5, Fraction(1, 2), Decimal('1')]",
    'abcs = [numbers.Number, numbers.Complex, numbers.Real, numbers.Rational, numbers.Integral]',
    'for v in vals:',
    '    print([isinstance(v, a) for a in abcs])',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), [], code);
  const p = await import('node:child_process').then((m) => m.execFileSync('/usr/bin/python3', ['-c',
    "import numbers\nfrom fractions import Fraction\nfrom decimal import Decimal\nvals = [3, True, 1.5, Fraction(1, 2), Decimal('1')]\nabcs = [numbers.Number, numbers.Complex, numbers.Real, numbers.Rational, numbers.Integral]\nfor v in vals:\n    print([isinstance(v, a) for a in abcs])",
  ], { encoding: 'utf8' }));
  assert.deepEqual(outs(r), p.trim().split('\n'));
});
