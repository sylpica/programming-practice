/* 高度モード B7 G5（itertools 21件／functools 19件／operator 103件）の検証。
 * - リファレンス整合：backlog の自群項目と name 集合が一致し、全項目が正規形。
 * - F-04：リファレンス例題（status=supported）を実行し、CPython 3.12.3 実走で
 *   生成した期待出力表（muse-adv-b7-g5-expected.js）と完全一致させる。
 *   matmul 系は設計判断（__matmul__ は未確定）により表から除き、個別に確認。
 * - 振る舞い：典型・境界・異常（CPython のエラー文面）を項目別に確認する。
 *   lambda はエンジン未対応のため、述語は def で書く。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getDefinition } from '../js/types/registry.js';
import { referenceAdvanced, referenceOverrides } from '../js/types/python/group-advanced-g5.js';
import { G5_EXPECTED } from './muse-adv-b7-g5-expected.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

async function expectOut(code, expected) {
  const r = await run(code);
  assert.deepEqual(errs(r), [], code);
  assert.deepEqual(outs(r), expected, code);
}
async function expectErr(code, pattern) {
  const r = await run(code);
  assert.ok(errs(r).length > 0, 'エラーで停止すること: ' + code);
  assert.match(errs(r)[0], pattern, code);
}

/* ---------- リファレンス整合 ---------- */
test('G5 リファレンス：backlog の自群143件と name 集合が一致し、全項目が正規形', (t) => {
  // 棚卸しファイルの相対位置はツリー構成で異なる（B7 作業ツリーでは
  // ../../adv-b7-tools、統合正本ツリーでは ../../work/adv-b7-tools）。
  // 統合第2弾で両対応にした（照合内容そのものは不変）。
  const backlogUrl = [
    new URL('../../adv-b7-tools/backlog.json', import.meta.url),
    new URL('../../work/adv-b7-tools/backlog.json', import.meta.url),
  ].find((u) => existsSync(u));
  // backlog はリポジトリ外（監査ワークスペース）にのみ存在する。素の
  // チェックアウト（CI 等）では候補が全て不在になるため、その場合は
  // 理由明示でスキップする（データがある環境では従来どおり全件実行し、
  // アサーションは不変。修正バッチ21／RG-684）。
  if (!backlogUrl) return t.skip('棚卸しツール（adv-b7-tools/backlog.json）が配置されていない環境のため実物照合をスキップ');
  const backlog = JSON.parse(readFileSync(backlogUrl, 'utf8'));
  const items = Array.isArray(backlog) ? backlog : backlog.items;
  const want = items
    .map((it) => it.name || it.id)
    .filter((n) => n && (n.startsWith('itertools.') || n.startsWith('functools.') || n.startsWith('operator.')))
    .sort();
  assert.equal(want.length, 143);
  const got = referenceAdvanced.map((i) => i.name).sort();
  assert.deepEqual(got, want);
  assert.deepEqual(referenceOverrides, []);
  for (const it of referenceAdvanced) {
    assert.equal(it.category, '標準ライブラリ', it.name);
    assert.ok(it.syntax && it.description && it.example && it.caution, it.name);
    assert.ok(['supported', 'unsupported', 'unverified'].includes(it.status), it.name);
    assert.ok(it.source && it.source.startsWith('https://docs.python.org/ja/3.15/library/'), it.name);
    assert.ok(!('expected' in it) && !('summary' in it) && !('id' in it), it.name);
  }
  const byStatus = {};
  for (const it of referenceAdvanced) byStatus[it.status] = (byStatus[it.status] || 0) + 1;
  assert.deepEqual(byStatus, { supported: 137, unverified: 6 });
});

/* ---------- F-04：例題照合 ---------- */
test('G5 F-04：リファレンス例題が CPython 実走の期待出力と一致する', async () => {
  const targets = referenceAdvanced.filter((i) => i.status === 'supported' && i.name in G5_EXPECTED);
  assert.equal(targets.length, 133);
  for (const it of targets) {
    const r = await run(it.example);
    assert.deepEqual(errs(r), [], it.name);
    assert.deepEqual(outs(r), G5_EXPECTED[it.name], it.name);
  }
});

test('G5 F-04 対象外：matmul 系は既知の型では TypeError、インスタンスでは __matmul__ を発火', async () => {
  await expectErr('import operator\nprint(operator.matmul([1], [2]))',
    /TypeError：unsupported operand type\(s\) for @: 'list' and 'list'/);
  // 統合第2弾の裁定：B6 が特殊メソッド機構（__matmul__ を含む）を実装
  // したため、operator.matmul はユーザー定義クラスの __matmul__ を
  // 発火する（CPython の意味論どおり。operator.matmul(a, b) は a @ b と
  // 等価）。B7 単体時点の「@ 演算子自体が未対応」という前提は、統合で
  // 解消されたため期待値を是正した。
  const r = await run('import operator\nclass V:\n    def __matmul__(self, other):\n        return 42\nprint(operator.matmul(V(), V()))');
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['42']);
});

test('G5 未検証6件：呼び出すと未確定になり、エラーにはならない', async () => {
  const programs = [
    'import functools\ndef f():\n    pass\nprint(functools.wraps(f))',
    'import functools\ndef f():\n    pass\ndef g():\n    pass\nprint(functools.update_wrapper(g, f))',
    'import functools\nclass C:\n    pass\nprint(functools.total_ordering(C))',
    'import functools\nprint(functools.cached_property(len))',
    'import functools\nprint(functools.partialmethod(len))',
    'import functools\nprint(functools.singledispatchmethod(len))',
  ];
  for (const code of programs) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.match(outs(r)[0], /実行時に決まる/, code);
  }
});

/* ---------- itertools ---------- */
test('G5 itertools：典型ケース', async () => {
  await expectOut('import itertools, operator\nprint(list(itertools.accumulate([1, 2, 3], operator.mul)))', ['[1, 2, 6]']);
  await expectOut('import itertools\nprint(list(itertools.accumulate([1, 2], initial=10)))', ['[10, 11, 13]']);
  await expectOut('import itertools\nprint(list(itertools.chain()))', ['[]']);
  await expectOut('import itertools\nprint(list(itertools.chain.from_iterable([[1, 2], [3]])))', ['[1, 2, 3]']);
  await expectOut('import itertools\nprint(list(itertools.permutations("ABC", 2)))',
    ["[('A', 'B'), ('A', 'C'), ('B', 'A'), ('B', 'C'), ('C', 'A'), ('C', 'B')]"]);
  await expectOut('import itertools\nprint(list(itertools.product("AB", repeat=2)))',
    ["[('A', 'A'), ('A', 'B'), ('B', 'A'), ('B', 'B')]"]);
  await expectOut('import itertools\nprint(list(itertools.starmap(pow, [(2, 3), (3, 2)])))', ['[8, 9]']);
  await expectOut('import itertools\nprint(list(itertools.zip_longest("AB", "1")))', ["[('A', '1'), ('B', None)]"]);
  await expectOut('import itertools\nprint(list(itertools.islice(itertools.count(0, 0.5), 3)))', ['[0, 0.5, 1.0]']);
  await expectOut('import itertools\nprint(list(itertools.batched("ABCDE", 2, strict=False)))',
    ["[('A', 'B'), ('C', 'D'), ('E',)]"]);
});

test('G5 itertools：境界ケース', async () => {
  await expectOut('import itertools\nprint(list(itertools.combinations("AB", 0)), list(itertools.combinations("AB", 5)))',
    ['[()] []']);
  await expectOut('import itertools\nprint(list(itertools.permutations("AB", 0)), list(itertools.repeat(9, 0)), list(itertools.repeat(9, -1)))',
    ['[()] [] []']);
  await expectOut('import itertools\nprint(list(itertools.product("AB", [])))', ['[]']);
  await expectOut('import itertools\nprint(list(itertools.islice(itertools.cycle([]), 3)))', ['[]']);
  await expectOut('import itertools\nprint(list(itertools.pairwise("A")), list(itertools.pairwise("")))', ['[] []']);
  await expectOut('import itertools\nprint(list(itertools.filterfalse(None, [0, 1, "", "a", []])))', ["[0, '', []]"]);
  await expectOut('import itertools\nprint(list(itertools.zip_longest()))', ['[]']);
  await expectOut('import itertools\nprint(itertools.tee([1], 0))', ['()']);
});

test('G5 itertools：イテレータ意味論（単回消費・next・tee独立性・islice の消費）', async () => {
  await expectOut([
    'import itertools',
    'it = itertools.accumulate([1, 2, 3])',
    'print(list(it))',
    'print(list(it))',
  ].join('\n'), ['[1, 3, 6]', '[]']);
  await expectOut([
    'import itertools',
    'it = itertools.islice(itertools.count(5), 2)',
    'print(next(it), next(it))',
  ].join('\n'), ['5 6']);
  await expectOut([
    'import itertools',
    'src = iter([0, 1, 2, 3, 4, 5])',
    'print(list(itertools.islice(src, 3)))',
    'print(list(src))',
  ].join('\n'), ['[0, 1, 2]', '[3, 4, 5]']);
  await expectOut([
    'import itertools',
    'a, b = itertools.tee(iter([1, 2, 3]))',
    'print(next(a))',
    'print(list(b))',
    'print(list(a))',
  ].join('\n'), ['1', '[1, 2, 3]', '[2, 3]']);
  await expectOut([
    'import itertools',
    'total = 0',
    'for x in itertools.chain([1, 2], [3]):',
    '    total += x',
    'print(total)',
  ].join('\n'), ['6']);
});

test('G5 itertools：groupby（キー関数・連続グループ）', async () => {
  await expectOut([
    'import itertools',
    'def even(x):',
    '    return x % 2 == 0',
    'print([(k, list(g)) for k, g in itertools.groupby([1, 3, 2, 4, 5], key=even)])',
  ].join('\n'), ['[(False, [1, 3]), (True, [2, 4]), (False, [5])]']);
});

test('G5 itertools：異常ケース（CPython の文面）', async () => {
  await expectErr('import itertools\nprint(list(itertools.batched("ABC", 0)))', /ValueError：n must be at least one/);
  await expectErr('import itertools\nprint(list(itertools.batched("ABCDE", 2, strict=True)))', /ValueError：batched/);
  await expectErr('import itertools\nprint(list(itertools.combinations("AB", -1)))', /ValueError：r must be non-negative/);
  await expectErr('import itertools\nprint(itertools.accumulate())', /TypeError：accumulate\(\) missing required argument 'iterable' \(pos 1\)/);
  await expectErr('import itertools\nprint(itertools.repeat())', /TypeError：repeat\(\) missing required argument 'object' \(pos 1\)/);
  await expectErr('import itertools\nprint(itertools.product("AB", foo=1))', /TypeError：'foo' is an invalid keyword argument for product\(\)/);
  await expectErr('import itertools\nprint(itertools.islice([1, 2], -1))', /ValueError：Stop argument for islice\(\)/);
  await expectErr('import itertools\nprint(itertools.tee([1], -1))', /ValueError：n must be >= 0/);
  await expectErr('import itertools\nprint(list(itertools.chain(1)))', /TypeError：'int' object is not iterable/);
  await expectErr('import itertools\nprint(len(itertools.count()))', /TypeError/);
});

/* ---------- functools ---------- */
test('G5 functools：reduce', async () => {
  await expectOut('import functools, operator\nprint(functools.reduce(operator.add, [1, 2, 3, 4], 100))', ['110']);
  await expectOut('import functools, operator\nprint(functools.reduce(operator.add, [], 5))', ['5']);
  await expectErr('import functools, operator\nprint(functools.reduce(operator.add, []))',
    /TypeError：reduce\(\) of empty iterable with no initial value/);
  await expectErr('import functools, operator\nprint(functools.reduce(operator.add, 5))',
    /TypeError：reduce\(\) arg 2 must support iteration/);
  await expectErr('import functools\nprint(functools.reduce())', /TypeError：reduce expected at least 2 arguments, got 0/);
});

test('G5 functools：partial（引数合成・属性・repr）', async () => {
  // キーワード付き構築は from-import 経由で行う（モジュール属性経由の構築では
  // エンジン基盤の kwargs 二重評価で値が壊れる。基盤要請として報告書に記載）。
  // ユーザー関数への kwargs 受け渡しは、位置引数の直後から連続する末尾領域を
  // 埋める場合に限り位置引数化して届ける（デフォルト付き引数を飛ばす形は
  // ctx に kwargs 付き call がないため未確定。基盤要請として報告書に記載）
  await expectOut([
    'from functools import partial',
    'def f(a, b=0, c=0):',
    '    return (a, b, c)',
    'p = partial(f, 1, 2, c=2)',
    'print(p(), p(c=5))',
    'q = partial(f, 1, c=2)',
    'print(q(9), q(9, c=3))',
  ].join('\n'), ['(1, 2, 2) (1, 2, 5)', '(1, 9, 2) (1, 9, 3)']);
  await expectOut([
    'from functools import partial',
    'p = partial(pow, 2)',
    'print(p.args, p.keywords, p(10))',
  ].join('\n'), ['(2,) {} 1024']);
  await expectOut([
    'import functools',
    'def f(a, b):',
    '    return a + b',
    'print(repr(functools.partial(f, 1)).startswith("functools.partial("))',
  ].join('\n'), ['True']);
  await expectErr('import functools\nprint(functools.partial())', /TypeError：type 'partial' takes at least one argument/);
  await expectErr('import functools\nprint(functools.partial(5))', /TypeError：the first argument must be callable/);
});

test('G5 functools：partial と Placeholder（3.14、ドキュメント照合）', async () => {
  await expectOut([
    'from functools import partial, Placeholder',
    'p = partial(pow, Placeholder, 2)',
    'print(p(3), p(4))',
  ].join('\n'), ['9 16']);
  await expectOut([
    'from functools import partial, Placeholder',
    'def sub3(a, b, c):',
    '    return a - b - c',
    'p1 = partial(sub3, Placeholder, 10)',
    'p2 = partial(p1, 100)',
    'print(p2(1))',
  ].join('\n'), ['89']);
  await expectErr('from functools import partial, Placeholder\np = partial(pow, Placeholder, 2)\nprint(p())',
    /TypeError：partial\(\) call does not provide enough positional arguments/);
  await expectErr('from functools import partial, Placeholder\nprint(partial(dict, a=Placeholder))',
    /TypeError：Placeholder cannot be passed to partial\(\) as a keyword argument/);
});

test('G5 functools：lru_cache の基本動作と cache_info／cache_clear', async () => {
  await expectOut([
    'import functools',
    'calls = []',
    '@functools.lru_cache(maxsize=None)',
    'def f(x):',
    '    calls.append(x)',
    '    return x * 10',
    'print(f(1), f(1), f(2), calls)',
    'print(f.cache_info())',
    'f.cache_clear()',
    'print(f.cache_info(), f(1), calls)',
  ].join('\n'), [
    '10 10 20 [1, 2]',
    'CacheInfo(hits=1, misses=2, maxsize=None, currsize=2)',
    'CacheInfo(hits=0, misses=0, maxsize=None, currsize=0) 10 [1, 2, 1]',
  ]);
  await expectOut([
    'import functools',
    '@functools.cache',
    'def f(x):',
    '    return x + 1',
    'print(f(1), f(1), f.cache_info(), f.cache_parameters())',
  ].join('\n'), ["2 2 CacheInfo(hits=1, misses=1, maxsize=None, currsize=1) {'maxsize': None, 'typed': False}"]);
  await expectOut([
    'import functools',
    'calls = []',
    '@functools.lru_cache',
    'def f(x):',
    '    calls.append(x)',
    '    return x',
    'print(f(2), f(2), calls)',
  ].join('\n'), ['2 2 [2]']);
});

test('G5 functools：lru_cache のキー化規則（CPython 3.12.3 実走の観測規則）', async () => {
  // 位置引数1個・タプルでない場合は型まで区別する
  await expectOut([
    'import functools',
    'calls = []',
    '@functools.lru_cache(maxsize=None)',
    'def f(x):',
    '    calls.append(x)',
    '    return x',
    'f(1)',
    'f(1.0)',
    'f(True)',
    'print(calls, f.cache_info())',
  ].join('\n'), ['[1, 1.0, True] CacheInfo(hits=0, misses=3, maxsize=None, currsize=3)']);
  // 複数引数では通常の等価性（1 と 1.0 は同一視）、typed=True では区別する
  await expectOut([
    'import functools',
    'calls = []',
    '@functools.lru_cache(maxsize=None)',
    'def g(a, b):',
    '    calls.append(a)',
    '    return a + b',
    'g(1, 2)',
    'g(1.0, 2)',
    'print(calls)',
    'calls2 = []',
    '@functools.lru_cache(maxsize=None, typed=True)',
    'def h(a, b):',
    '    calls2.append(a)',
    '    return a + b',
    'h(1, 2)',
    'h(1.0, 2)',
    'print(calls2)',
  ].join('\n'), ['[1]', '[1, 1.0]']);
  // キーワード引数は呼び出し順がキーに含まれる（stdlib 関数をラップして確認。
  // 引数はハッシュ可能でなければならないためタプルを渡す）
  await expectOut([
    'import functools, itertools, operator',
    'w = functools.lru_cache(maxsize=None)(itertools.accumulate)',
    'print(list(w((1, 2), func=operator.add, initial=0)))',
    'print(list(w((1, 2), initial=0, func=operator.add)))',
    'print(w.cache_info())',
  ].join('\n'), ['[0, 1, 3]', '[0, 1, 3]', 'CacheInfo(hits=0, misses=2, maxsize=None, currsize=2)']);
  await expectErr([
    'import functools',
    '@functools.lru_cache(maxsize=None)',
    'def f(x):',
    '    return x',
    'print(f([1]))',
  ].join('\n'), /TypeError：unhashable type: 'list'/);
});

test('G5 functools：lru_cache の追い出しと maxsize=0', async () => {
  await expectOut([
    'import functools',
    'calls = []',
    '@functools.lru_cache(maxsize=2)',
    'def f(x):',
    '    calls.append(x)',
    '    return x',
    'f(1)',
    'f(2)',
    'f(1)',
    'f(3)',
    'f(2)',
    'print(calls, f.cache_info())',
  ].join('\n'), ['[1, 2, 3, 2] CacheInfo(hits=1, misses=4, maxsize=2, currsize=2)']);
  await expectOut([
    'import functools',
    'calls = []',
    '@functools.lru_cache(maxsize=0)',
    'def f(x):',
    '    calls.append(x)',
    '    return x',
    'f(1)',
    'f(1)',
    'print(calls, f.cache_info())',
  ].join('\n'), ['[1, 1] CacheInfo(hits=0, misses=2, maxsize=0, currsize=0)']);
  await expectErr('import functools\nprint(functools.lru_cache("a"))',
    /TypeError：Expected first argument to be an integer, a callable, or None/);
  await expectErr('import functools\nprint(functools.lru_cache(foo=1))',
    /TypeError：lru_cache\(\) got an unexpected keyword argument 'foo'/);
});

test('G5 functools：cmp_to_key', async () => {
  await expectOut([
    'import functools',
    'def cmp(a, b):',
    '    return a - b',
    'K = functools.cmp_to_key(cmp)',
    'print(K(2) > K(1), K(1) < K(2), K(5).obj)',
    'print(sorted([3, 1, 2], key=K))',
  ].join('\n'), ['True True 5', '[1, 2, 3]']);
  await expectErr('import functools\nprint(functools.cmp_to_key())',
    /TypeError：cmp_to_key\(\) missing required argument 'mycmp' \(pos 1\)/);
});

test('G5 functools：singledispatch', async () => {
  await expectOut([
    'import functools',
    '@functools.singledispatch',
    'def f(x):',
    "    return 'default'",
    '@f.register(int)',
    'def _(x):',
    "    return 'int'",
    '@f.register(str)',
    'def _(x):',
    "    return 'str'",
    'print(f(1), f("a"), f(1.5), f(True))',
    'print(len(f.registry))',
  ].join('\n'), ['int str default int', '3']);
  await expectOut([
    'import functools',
    '@functools.singledispatch',
    'def f(x):',
    "    return 'default'",
    'def g(x):',
    "    return 'float'",
    'print(f.register(float, g) is g, f(1.5))',
    'print(f.dispatch(float) is g)',
  ].join('\n'), ['True float', 'True']);
  // ユーザー定義クラスへのディスパッチ（エンジンがクラス継承自体を未対応とする
  // ため、継承チェーン経由のディスパッチは基盤要請として報告書に記載）
  await expectOut([
    'import functools',
    'class A:',
    '    pass',
    '@functools.singledispatch',
    'def f(x):',
    "    return 'default'",
    '@f.register(A)',
    'def _(x):',
    "    return 'A'",
    'print(f(A()), f(1))',
  ].join('\n'), ['A default']);
  await expectErr([
    'import functools',
    '@functools.singledispatch',
    'def f(x):',
    "    return 'default'",
    'def g(x):',
    "    return 'x'",
    'print(f.register(5, g))',
  ].join('\n'), /TypeError：Invalid first argument to `register\(\)`\. 5 is not a class or union type\./);
  await expectErr([
    'import functools',
    '@functools.singledispatch',
    'def f(x):',
    "    return 'default'",
    'print(f())',
  ].join('\n'), /TypeError：f requires at least 1 positional argument/);
});

/* ---------- operator ---------- */
test('G5 operator：比較・論理・単項（F-04 でカバーされない False 側と異常）', async () => {
  await expectOut('import operator\nprint(operator.ge(2, 3), operator.gt(2, 3), operator.le(3, 2), operator.contains([1, 2], 5))',
    ['False False False False']);
  await expectOut('import operator\nprint(operator.truth(0), operator.not_(""), operator.index(True), operator.pos(True))',
    ['False True 1 1']);
  await expectErr('import operator\nprint(operator.neg("a"))', /TypeError：bad operand type for unary -: 'str'/);
  await expectErr('import operator\nprint(operator.abs("a"))', /TypeError：bad operand type for abs\(\): 'str'/);
  await expectErr('import operator\nprint(operator.inv(1.5))', /TypeError：bad operand type for unary ~: 'float'/);
  await expectErr('import operator\nprint(operator.index(1.5))', /TypeError：'float' object cannot be interpreted as an integer/);
  await expectErr('import operator\nprint(operator.add(1))', /TypeError：add expected 2 arguments, got 1/);
  await expectErr('import operator\nprint(operator.neg())', /TypeError：_operator\.neg\(\) takes exactly one argument \(0 given\)/);
  await expectErr('import operator\nprint(operator.add(1, 2, x=3))', /TypeError：_operator\.add\(\) takes no keyword arguments/);
  await expectErr('import operator\nprint(operator.concat(1, 2))', /TypeError：'int' object can't be concatenated/);
  await expectErr('import operator\nprint(operator.contains(5, 1))', /TypeError：argument of type 'int' is not iterable/);
});

test('G5 operator：getitem／setitem／delitem', async () => {
  // slice() 組み込み関数はエンジン未対応のため、スライスキーは式の添字経由で
  // しか作れない（基盤事項）。ここでは通常キーのみ確認する
  await expectOut('import operator\nprint(operator.getitem("abcdef", 2), operator.getitem([1, 2, 3], -1))',
    ['c 3']);
  await expectOut([
    'import operator',
    'xs = [1, 2, 3, 4]',
    'operator.setitem(xs, 1, 9)',
    'd = {}',
    "operator.setitem(d, 'k', 1)",
    'print(xs, d)',
    'operator.delitem(xs, 0)',
    'operator.delitem(d, "k")',
    'print(xs, d)',
  ].join('\n'), ['[1, 9, 3, 4] {\'k\': 1}', '[9, 3, 4] {}']);
  await expectErr('import operator\nprint(operator.getitem({"a": 1}, "b"))', /KeyError：'b'/);
  await expectErr('import operator\noperator.setitem((1, 2), 0, 9)', /TypeError：'tuple' object does not support item assignment/);
  await expectErr('import operator\noperator.delitem("ab", 0)', /TypeError：'str' object doesn't support item deletion/);
  await expectErr('import operator\nd = {}\noperator.delitem(d, "x")', /KeyError：'x'/);
});

test('G5 operator：in-place 系のエイリアス意味論', async () => {
  await expectOut([
    'import operator',
    'xs = [1]',
    'ys = xs',
    'operator.iadd(xs, [2])',
    'operator.imul(xs, 2)',
    'print(ys)',
    's = {1, 2, 3}',
    'operator.isub(s, {2})',
    'operator.iand(s, {1, 9})',
    'print(sorted(s))',
    "d = {'a': 1}",
    "operator.ior(d, {'b': 2})",
    'print(d)',
  ].join('\n'), ['[1, 2, 1, 2]', '[1]', "{'a': 1, 'b': 2}"]);
  await expectOut('import operator\nprint(operator.iconcat((1,), (2,)), operator.isub(5, 2), operator.ipow(2, 3))',
    ['(1, 2) 3 8']);
});

test('G5 operator：attrgetter／itemgetter／methodcaller', async () => {
  await expectOut([
    'import operator',
    'class P:',
    '    def __init__(self):',
    '        self.a = 5',
    '        self.b = 7',
    'print(operator.attrgetter("a")(P()), operator.attrgetter("a", "b")(P()))',
    'print(operator.itemgetter(0, 2)("abc"), operator.itemgetter("k")({"k": 5}))',
    'print(operator.methodcaller("replace", "a", "b")("aaa"))',
  ].join('\n'), ['5 (5, 7)', "('a', 'c') 5", 'bbb']);
  await expectOut([
    'import operator',
    'class Inner:',
    '    def __init__(self):',
    '        self.v = 42',
    'class Outer:',
    '    def __init__(self):',
    '        self.inner = Inner()',
    'print(operator.attrgetter("inner.v")(Outer()))',
  ].join('\n'), ['42']);
  await expectErr('import operator\nprint(operator.attrgetter(1))', /TypeError：attribute name must be a string/);
  await expectErr('import operator\nprint(operator.attrgetter())', /TypeError：attrgetter expected 1 argument, got 0/);
  await expectErr('import operator\nprint(operator.methodcaller())',
    /TypeError：methodcaller needs at least one argument, the method name/);
  await expectErr('import operator\nprint(operator.methodcaller(1))', /TypeError：method name must be a string/);
  await expectErr([
    'import operator',
    'class P:',
    '    pass',
    'print(operator.attrgetter("zzz")(P()))',
  ].join('\n'), /AttributeError：'P' object has no attribute 'zzz'/);
});

test('G5 operator：length_hint／call／countOf／indexOf', async () => {
  await expectOut('import operator\nprint(operator.length_hint(iter([1, 2, 3])), operator.length_hint(5), operator.length_hint(5, 7), operator.length_hint("abcd"))',
    ['3 0 7 4']);
  await expectErr('import operator\nprint(operator.length_hint())', /TypeError：length_hint expected at least 1 argument, got 0/);
  await expectErr('import operator\nprint(operator.length_hint([], 0, 0))', /TypeError：length_hint expected at most 2 arguments, got 3/);
  await expectErr('import operator\nprint(operator.call(5))', /TypeError：'int' object is not callable/);
  await expectErr('import operator\nprint(operator.call())', /TypeError：call expected at least 1 argument, got 0/);
  await expectOut('import operator\nprint(operator.countOf("abcabc", "a"), operator.indexOf([5, 6], 6))', ['2 1']);
  await expectErr('import operator\nprint(operator.indexOf([1], 9))', /ValueError：sequence\.index\(x\): x not in sequence/);
});
