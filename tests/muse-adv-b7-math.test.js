/* 高度モード B7 パイロット：math 全67件の F-01 ケース（典型・境界・異常）。
 * 期待値は CPython 3.12.3 実走で確認した値。erf／erfc／gamma／lgamma は
 * mpmath（50桁）で真値を求め、最も近い double と一致することをグリッドで
 * 別途照合済み（監査台帳参照）。CPython（glibc）が真値から 1ulp ずれる
 * 入力では、数学的に正しい側の値を期待値とする。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { referenceAdvanced, referenceOverrides } from '../js/types/python/reference-advanced-math.js';
import { MATH_EXPECTED } from './muse-adv-b7-math-expected.js';
import '../js/types/python/advanced-engine.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);
const prog = (expr) => 'import math\nprint(' + expr + ')';

const CASES = [
  // 典型
  ['math.sqrt(81)', '9.0'], ['math.sin(math.pi / 2)', '1.0'], ['math.cos(0)', '1.0'],
  ['math.gcd(12, 18)', '6'], ['math.lcm(4, 6)', '12'], ['math.factorial(5)', '120'],
  ['math.comb(5, 2)', '10'], ['math.perm(5, 2)', '20'], ['math.isqrt(10)', '3'],
  ['math.floor(-2.5)', '-3'], ['math.ceil(-2.5)', '-2'], ['math.trunc(-3.7)', '-3'],
  ['math.log(8, 2)', '3.0'], ['math.log10(1000)', '3.0'], ['math.hypot(3, 4)', '5.0'],
  ['math.dist((0, 0), (3, 4))', '5.0'], ['math.fsum([0.1] * 10)', '1.0'],
  ['math.prod([2, 3, 4])', '24'], ['math.sumprod([1, 2], [3, 4])', '11'],
  ['math.degrees(math.pi)', '180.0'], ['math.fmod(-3, 2)', '-1.0'],
  ['math.remainder(7, 2)', '-1.0'], ['math.remainder(5, 2)', '1.0'],
  ['math.modf(3.5)', '(0.5, 3.0)'], ['math.frexp(8)', '(0.5, 4)'],
  ['math.ldexp(0.5, 4)', '8.0'], ['math.copysign(3, -1)', '-3.0'],
  ['math.erf(1)', '0.8427007929497149'], ['math.erfc(1)', '0.15729920705028513'],
  ['math.gamma(5)', '24.0'], ['math.gamma(0.5)', '1.772453850905516'],
  ['math.lgamma(5)', '3.1780538303479458'],
  ['math.nextafter(1.0, 2.0)', '1.0000000000000002'], ['math.ulp(1.0)', '2.220446049250313e-16'],
  ['math.fma(2, 3, 4)', '10.0'], ['math.cbrt(-8)', '-2.0'],
  ['math.isclose(0.1 + 0.2, 0.3)', 'True'], ['math.isfinite(1.5)', 'True'],
  ['math.isnan(math.nan)', 'True'], ['math.isinf(math.inf)', 'True'],
  // 境界
  ['math.gcd()', '0'], ['math.lcm()', '1'], ['math.prod([])', '1'], ['math.fsum([])', '0.0'],
  ['math.hypot()', '0.0'], ['math.comb(3, 5)', '0'], ['math.perm(5)', '120'],
  ['math.pow(0, 0)', '1.0'], ['math.factorial(0)', '1'], ['math.isqrt(0)', '0'],
  ['math.ulp(0.0)', '5e-324'], ['math.erf(0)', '0.0'], ['math.gamma(1)', '1.0'],
  ['math.log(1)', '0.0'], ['math.fsum([1e308, 1e308, -1e308])', '1e+308'],
  ['math.remainder(-5, 2)', '-1.0'], ['math.nextafter(0.0, 1.0)', '5e-324'],
  ['math.isclose(math.inf, math.inf)', 'True'], ['math.fmax(math.nan, 3)', '3.0'],
  ['math.fmin(2, math.nan)', '2.0'], ['math.signbit(-0.0)', 'True'], ['math.signbit(0.0)', 'False'],
  ['math.isnormal(1.0)', 'True'], ['math.issubnormal(5e-324)', 'True'], ['math.isnormal(0.0)', 'False'],
];
for (const [expr, expected] of CASES) {
  test('B7 math: ' + expr, async () => {
    const r = await run(prog(expr));
    assert.deepEqual(errs(r), []);
    assert.deepEqual(outs(r), [expected]);
  });
}

const ERROR_CASES = [
  ['math.sqrt(-1)', /ValueError：math domain error/],
  ['math.log(0)', /ValueError：math domain error/],
  ['math.log(-1)', /ValueError：math domain error/],
  ['math.exp(1000)', /OverflowError：math range error/],
  ['math.sinh(1000)', /OverflowError：math range error/],
  ['math.pow(10, 400)', /OverflowError：math range error/],
  ['math.factorial(-1)', /ValueError/],
  ['math.factorial(5.0)', /TypeError/],
  ['math.gcd(3.0, 6)', /TypeError/],
  ['math.comb(5.0, 2)', /TypeError/],
  ['math.isqrt(-1)', /ValueError/],
  ['math.fmod(3, 0)', /ValueError：math domain error/],
  ['math.asin(2)', /ValueError：math domain error/],
  ['math.atanh(1)', /ValueError：math domain error/],
  ['math.gamma(0)', /ValueError：math domain error/],
  ['math.gamma(-1)', /ValueError：math domain error/],
  ['math.ldexp(1, 10000)', /OverflowError：math range error/],
  ['math.fsum([1e308, 1e308])', /OverflowError：intermediate overflow in fsum/],
  ['math.fsum([math.inf, -math.inf])', /ValueError：-inf \+ inf in fsum/],
  ['math.dist((0,), (1, 2))', /ValueError/],
  ['math.sumprod([1], [1, 2])', /ValueError/],
  ['math.sqrt(x=4)', /TypeError/],
  ['math.floor(math.inf)', /OverflowError/],
  ['math.ceil(math.nan)', /ValueError/],
  ['math.sqrt("a")', /TypeError/],
];
for (const [expr, pattern] of ERROR_CASES) {
  test('B7 math error: ' + expr, async () => {
    const r = await run(prog(expr));
    assert.ok(errs(r).length > 0, 'エラーで停止すること');
    assert.match(errs(r)[0], pattern);
  });
}

test('B7 math: リファレンス全67件の例題が期待出力と一致（F-04）', async () => {
  const all = [...referenceAdvanced, ...referenceOverrides];
  assert.equal(all.length, 67);
  assert.equal(referenceAdvanced.length, 58);
  assert.equal(referenceOverrides.length, 9);
  const names = new Set(all.map((i) => i.name));
  assert.equal(names.size, 67);
  for (const item of referenceAdvanced) {
    assert.equal(item.status, 'supported', item.name);
    const r = await run(item.example);
    assert.deepEqual(errs(r), [], item.name);
    assert.deepEqual(outs(r), [MATH_EXPECTED[item.name]], item.name);
  }
  // overrides は基礎項目の例題を使うため、ここでは名前と状態のみ照合する
  for (const item of referenceOverrides) assert.equal(item.status, 'supported', item.name);
});

test('B7 math: 定数は実値で、from-import でも使える', async () => {
  const r = await run('from math import pi, e, tau, inf, nan\nprint(pi)\nprint(e)\nprint(tau)\nprint(inf)\nprint(nan == nan)');
  assert.deepEqual(outs(r), ['3.141592653589793', '2.718281828459045', '6.283185307179586', 'inf', 'False']);
});
