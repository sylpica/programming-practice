/* 高度モード B7 G1（数理・統計系）：cmath／fractions／numbers／statistics／
 * random 全120件の F-01 ケース（典型・境界・異常）と F-04 例題照合。
 * 期待値は CPython 3.12.3 実走で確認した値。kde／kde_random（3.13追加）と
 * Fraction.from_number（3.14追加）は CPython 公式リポジトリのソースと
 * 公式ドキュメント 3.15 の例で照合した（報告書参照）。
 * 前任草案の検証で見つけた MT19937 の 32bit 乗算の精度落ち（Math.imul 化で
 * 修正）により、seed 付き乱数列は CPython と一致する。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import '../js/types/python/impl-advanced-g1.js';
import '../js/types/python/impl-advanced-g1-random.js';
import '../js/types/python/impl-advanced-statistics.js';
import { referenceAdvanced as CMATH } from '../js/types/python/reference-advanced-cmath.js';
import { referenceAdvanced as FRACTIONS } from '../js/types/python/reference-advanced-fractions.js';
import { referenceAdvanced as NUMBERS } from '../js/types/python/reference-advanced-numbers.js';
import { referenceAdvanced as RANDOM } from '../js/types/python/reference-advanced-random.js';
import { referenceAdvanced as STATISTICS } from '../js/types/python/reference-advanced-statistics.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);
const ALL = [...CMATH, ...FRACTIONS, ...NUMBERS, ...RANDOM, ...STATISTICS];

test('B7 G1: リファレンス全120件・名前一意・status 3値・正規形フィールドのみ', () => {
  assert.equal(ALL.length, 120);
  assert.equal(new Set(ALL.map((i) => i.name)).size, 120);
  const allowed = new Set(['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'returns', 'source']);
  for (const it of ALL) {
    assert.ok(['supported', 'unsupported', 'unverified'].includes(it.status), it.name);
    for (const k of Object.keys(it)) assert.ok(allowed.has(k), it.name + ':' + k);
    assert.ok(it.source.startsWith('https://docs.python.org/ja/3.15/library/'), it.name);
    if (it.status !== 'supported') assert.ok(it.caution.length > 0, it.name);
  }
  const byStatus = { supported: 0, unsupported: 0, unverified: 0 };
  for (const it of ALL) byStatus[it.status]++;
  assert.deepEqual(byStatus, { supported: 86, unsupported: 25, unverified: 9 });
});

test('B7 G1: 対応項目の例題が期待出力と一致（F-04）', async () => {
  for (const it of ALL) {
    if (it.status !== 'supported') continue;
    const r = await run(it.example);
    assert.deepEqual(errs(r), [], it.name);
    assert.deepEqual(outs(r), EXPECTED[it.name], it.name);
  }
});

const CASES = [
  // fractions：演算・比較・境界・異常
  ["from fractions import Fraction\nprint(Fraction(1, 3) + Fraction(1, 6))", ['1/2']],
  ["from fractions import Fraction\nprint(Fraction('1.25'), Fraction(0.5) == Fraction(1, 2))", ['5/4 True']],
  ["from fractions import Fraction\nprint(Fraction(2, 3) ** -1, Fraction(7, 2) % 1, Fraction(-7, 2) // 1)", ['3/2 1/2 -4']],
  ["from fractions import Fraction\nprint(Fraction(1, 2) < Fraction(2, 3), Fraction(1, 2) == 0.5, Fraction(3, 2) * 2)", ['True True 3']],
  ["from fractions import Fraction\nd = {Fraction(1, 2): 'x'}\nprint(d[Fraction(2, 4)])", ['x']],
  ["from fractions import Fraction\nprint(Fraction(1, 3).__format__('.2e'), Fraction(1, 2).__format__('+.2f'))", ['3.33e-01 +0.50']],
  // numbers：継承鎖
  ["from fractions import Fraction\nimport numbers\nprint(isinstance(Fraction(1, 2), numbers.Rational), isinstance(Fraction(1, 2), numbers.Real), isinstance(Fraction(1, 2), numbers.Number))", ['True True True']],
  // cmath：定数は実値、関数は未対応として正直に止まる（値は確定しない）
  ["import cmath\nprint(cmath.pi, cmath.inf)", ['3.141592653589793 inf']],
  // random：CPython と一致する列（seed 固定）
  ["import random\nrandom.seed(42)\nprint([random.random() for _ in range(3)])", ['[0.6394267984578837, 0.025010755222666936, 0.27502931836911926]']],
  ["import random\nrandom.seed('hello')\nprint(random.random())", ['0.3537754404730722']],
  ["import random\nrandom.seed(3.5)\nprint(random.random())", ['0.3039190124834461']],
  ["import random\nrandom.seed(2 ** 40)\nprint(random.random())", ['0.1036394562812375']],
  ["import random\nrandom.seed(-17)\nprint(random.random())", ['0.5219839097124932']],
  ["import random\nrandom.seed(2024)\nprint(random.gauss(0, 1), random.gauss(0, 1))", ['-1.5858438430959185 0.3015791682292153']],
  // statistics：正確な有理数演算が必要なケース
  ["import statistics\nprint(statistics.mean([1e50, 1, -1e50]))", ['0.3333333333333333']],
  ["import statistics\nprint(statistics.mean([0.1, 0.2]))", ['0.15000000000000002']],
  ["from fractions import Fraction as F\nimport statistics\nprint(statistics.variance([F(1, 6), F(1, 2), F(5, 3)]))", ['67/108']],
  ["import statistics\nprint(statistics.correlation([1, 2, 2, 3], [1, 4, 2, 3], method='ranked'))", ['0.6324555320336759']],
  ["import statistics\nprint(statistics.quantiles([1, 2, 3, 4, 5], method='inclusive'))", ['[2.0, 3.0, 4.0]']],
  ["import statistics\nnd = statistics.NormalDist(1, 1) + statistics.NormalDist(2, 3)\nprint(nd)", ['NormalDist(mu=3.0, sigma=3.1622776601683795)']],
  ["import statistics\nprint(statistics.NormalDist(0, 1).samples(3, seed=42))", ['[-0.14409032957792836, -0.1729036003315193, -0.11131586156766246]']],
  ["import statistics\nf = statistics.kde([-2.1, -1.3, -0.4, 1.9, 5.1, 6.2], h=1.5)\nprint([round(f(x), 3) for x in range(-6, 11)])", ['[0.002, 0.009, 0.031, 0.07, 0.111, 0.125, 0.11, 0.086, 0.068, 0.059, 0.066, 0.082, 0.082, 0.058, 0.028, 0.009, 0.002]']],
  ["import statistics\nrand = statistics.kde_random([-2.1, -1.3, -0.4, 1.9, 5.1, 6.2], h=1.5, seed=8675309)\nprint([round(rand(), 1) for i in range(10)])", ['[0.7, 6.2, 1.2, 6.9, 7.0, 1.8, 2.5, -0.5, -1.8, 5.6]']],
];
for (const [code, expected] of CASES) {
  if (expected === null) continue;
  test('B7 G1 case: ' + code.split('\n').pop(), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), expected, code);
  });
}

test('B7 G1: gauss の列は CPython と一致（内部保持つき）', async () => {
  const r = await run('import random\nrandom.seed(2024)\nprint(random.gauss(0, 1))\nprint(random.gauss(0, 1))');
  const p = await import('node:child_process').then((m) => m.execFileSync('/usr/bin/python3', ['-c', 'import random\nrandom.seed(2024)\nprint(random.gauss(0, 1))\nprint(random.gauss(0, 1))'], { encoding: 'utf8' }));
  assert.deepEqual(outs(r), p.trim().split('\n'));
});

test('B7 G1: cmath の複素数関数は未対応として値が確定しない', async () => {
  const r = await run('import cmath\nprint(cmath.sqrt(-1))');
  assert.ok(outs(r).join(' ').includes('実行時に決まる') || errs(r).length > 0);
});

const ERROR_CASES = [
  ["from fractions import Fraction\nprint(Fraction(1, 0))", /ZeroDivisionError/],
  ["from fractions import Fraction\nprint(Fraction('abc'))", /ValueError/],
  ["import numbers\nprint(numbers.Real())", /TypeError/],
  ["import statistics\nprint(statistics.mean([]))", /statistics\.StatisticsError/],
  ["import statistics\nprint(statistics.variance([1]))", /statistics\.StatisticsError/],
  ["import statistics\nprint(statistics.correlation([1, 1, 1], [1, 2, 3]))", /statistics\.StatisticsError/],
  ["import statistics\nprint(statistics.NormalDist(0, -1))", /statistics\.StatisticsError/],
  ["import statistics\nprint(statistics.kde([], h=1.0))", /statistics\.StatisticsError/],
  ["import random\nrandom.seed(1)\nprint(random.choice([]))", /IndexError/],
  ["import random\nrandom.seed(1)\nprint(random.sample([1, 2, 3], 5))", /ValueError/],
  ["import random\nrandom.seed(1)\nprint(random.getrandbits(-1))", /ValueError/],
  ["import random\nprint(random.SystemRandom().getstate())", /NotImplementedError/],
];
for (const [code, pattern] of ERROR_CASES) {
  test('B7 G1 error: ' + code.split('\n').pop(), async () => {
    const r = await run(code);
    assert.ok(errs(r).length > 0, 'エラーで停止すること: ' + code);
    assert.match(errs(r)[0], pattern);
  });
}

test('B7 G1: StatisticsError は ValueError として捕捉できる（例外対応付け）', async () => {
  const r = await run("import statistics\ntry:\n    statistics.mean([])\nexcept ValueError:\n    print('caught-as-valueerror')");
  assert.deepEqual(outs(r), ['caught-as-valueerror']);
});

const EXPECTED = {
 "cmath.pi": [
  "3.141592653589793"
 ],
 "cmath.e": [
  "2.718281828459045"
 ],
 "cmath.tau": [
  "6.283185307179586"
 ],
 "cmath.inf": [
  "inf"
 ],
 "cmath.nan": [
  "nan"
 ],
 "fractions.Fraction": [
  "1"
 ],
 "fractions.Fraction.__ceil__": [
  "4"
 ],
 "fractions.Fraction.__floor__": [
  "3"
 ],
 "fractions.Fraction.__format__": [
  "0.33"
 ],
 "fractions.Fraction.__round__": [
  "2"
 ],
 "fractions.Fraction.as_integer_ratio": [
  "(3, 4)"
 ],
 "fractions.Fraction.denominator": [
  "4"
 ],
 "fractions.Fraction.from_float": [
  "1/2"
 ],
 "fractions.Fraction.from_number": [
  "1/2"
 ],
 "fractions.Fraction.is_integer": [
  "True"
 ],
 "fractions.Fraction.limit_denominator": [
  "22/7"
 ],
 "fractions.Fraction.numerator": [
  "3"
 ],
 "numbers.Number": [
  "True"
 ],
 "numbers.Complex": [
  "True"
 ],
 "numbers.Integral": [
  "abstract"
 ],
 "numbers.Rational": [
  "True"
 ],
 "numbers.Real": [
  "True"
 ],
 "random.Random": [
  "0.6394267984578837"
 ],
 "random.Random.getrandbits": [
  "41905"
 ],
 "random.Random.getstate": [
  "True"
 ],
 "random.Random.random": [
  "0.6394267984578837"
 ],
 "random.Random.seed": [
  "0.6394267984578837"
 ],
 "random.Random.setstate": [
  "True"
 ],
 "random.betavariate": [
  "0.2537517339"
 ],
 "random.binomialvariate": [
  "6"
 ],
 "random.choice": [
  "20"
 ],
 "random.choices": [
  "[1, 1, 2, 1]"
 ],
 "random.expovariate": [
  "0.6501662461762624"
 ],
 "random.gammavariate": [
  "8.016658113284183"
 ],
 "random.gauss": [
  "-1.5858438430959185"
 ],
 "random.getrandbits": [
  "26475"
 ],
 "random.getstate": [
  "True"
 ],
 "random.lognormvariate": [
  "2.2626576476213778"
 ],
 "random.normalvariate": [
  "0.816540072671196"
 ],
 "random.paretovariate": [
  "1.6284435553736896"
 ],
 "random.randint": [
  "50"
 ],
 "random.random": [
  "0.6394267984578837"
 ],
 "random.randrange": [
  "0"
 ],
 "random.sample": [
  "[3, 2, 4]"
 ],
 "random.seed": [
  "0.6394267984578837"
 ],
 "random.setstate": [
  "True"
 ],
 "random.shuffle": [
  "[5, 1, 4, 2, 3]"
 ],
 "random.triangular": [
  "5.657775310337464"
 ],
 "random.uniform": [
  "2.2953310593326495"
 ],
 "random.vonmisesvariate": [
  "1.2506652818"
 ],
 "random.weibullvariate": [
  "1.9668615076077267"
 ],
 "statistics.NormalDist": [
  "NormalDist(mu=2.4, sigma=1.6)"
 ],
 "statistics.NormalDist.cdf": [
  "0.646169766673"
 ],
 "statistics.NormalDist.from_samples": [
  "5.0 2.138089935299395"
 ],
 "statistics.NormalDist.inv_cdf": [
  "13.919927969080106"
 ],
 "statistics.NormalDist.mean": [
  "2.4"
 ],
 "statistics.NormalDist.median": [
  "2.4"
 ],
 "statistics.NormalDist.mode": [
  "2.4"
 ],
 "statistics.NormalDist.overlap": [
  "0.803505065733"
 ],
 "statistics.NormalDist.pdf": [
  "0.3989422804014327"
 ],
 "statistics.NormalDist.quantiles": [
  "[3.651020499607837, 5.0, 6.348979500392163]"
 ],
 "statistics.NormalDist.samples": [
  "[-0.14409032957792836, -0.1729036003315193, -0.11131586156766246]"
 ],
 "statistics.NormalDist.stdev": [
  "1.6"
 ],
 "statistics.NormalDist.variance": [
  "2.5600000000000005"
 ],
 "statistics.NormalDist.zscore": [
  "2.0"
 ],
 "statistics.StatisticsError": [
  "caught"
 ],
 "statistics.correlation": [
  "1.0"
 ],
 "statistics.covariance": [
  "0.75"
 ],
 "statistics.fmean": [
  "4.25"
 ],
 "statistics.geometric_mean": [
  "36.000000000000014"
 ],
 "statistics.harmonic_mean": [
  "48.0"
 ],
 "statistics.kde": [
  "0.11"
 ],
 "statistics.kde_random": [
  "0.7"
 ],
 "statistics.linear_regression": [
  "LinearRegression(slope=2.0, intercept=0.0)"
 ],
 "statistics.mean": [
  "2.8"
 ],
 "statistics.median": [
  "4.0"
 ],
 "statistics.median_grouped": [
  "2.8333333333333335"
 ],
 "statistics.median_high": [
  "5"
 ],
 "statistics.median_low": [
  "3"
 ],
 "statistics.mode": [
  "red"
 ],
 "statistics.multimode": [
  "['b', 'd', 'f']"
 ],
 "statistics.pstdev": [
  "0.986893273527251"
 ],
 "statistics.pvariance": [
  "1.25"
 ],
 "statistics.quantiles": [
  "[1.5, 3.0, 4.5]"
 ],
 "statistics.stdev": [
  "1.0810874155219827"
 ],
 "statistics.variance": [
  "1.3720238095238095"
 ]
};
