/* 高度モード B7 G12（CLI・テスト・デバッグ・ログ・インポート系）のテスト。
 * 期待値は CPython 3.12.3 実走で裏付けた値（報告書に範囲を記録）。
 * supported 項目のリファレンス例は全件エンジンで実行し、エラーが無いことを
 * 機械照合する（F-04 の G12 版）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import '../js/types/python/impl-advanced-getopt.js';
import '../js/types/python/impl-advanced-queue.js';
import '../js/types/python/impl-advanced-sched.js';
import '../js/types/python/impl-advanced-argparse.js';
import '../js/types/python/impl-advanced-optparse.js';
import '../js/types/python/impl-advanced-cmd.js';
import '../js/types/python/impl-advanced-doctest.js';
import '../js/types/python/impl-advanced-logging.js';
import '../js/types/python/impl-advanced-unittest.js';
import '../js/types/python/impl-advanced-unittest-mock.js';
import '../js/types/python/impl-advanced-debugtools.js';

import { referenceAdvanced as refArgparse } from '../js/types/python/reference-advanced-argparse.js';
import { referenceAdvanced as refOptparse } from '../js/types/python/reference-advanced-optparse.js';
import { referenceAdvanced as refGetopt } from '../js/types/python/reference-advanced-getopt.js';
import { referenceAdvanced as refCmd } from '../js/types/python/reference-advanced-cmd.js';
import { referenceAdvanced as refDoctest } from '../js/types/python/reference-advanced-doctest.js';
import { referenceAdvanced as refUnittest } from '../js/types/python/reference-advanced-unittest.js';
import { referenceAdvanced as refMock } from '../js/types/python/reference-advanced-unittest-mock.js';
import { referenceAdvanced as refBdb } from '../js/types/python/reference-advanced-bdb.js';
import { referenceAdvanced as refPdb } from '../js/types/python/reference-advanced-pdb.js';
import { referenceAdvanced as refProfile } from '../js/types/python/reference-advanced-profile.js';
import { referenceAdvanced as refPstats } from '../js/types/python/reference-advanced-pstats.js';
import { referenceAdvanced as refTracemalloc } from '../js/types/python/reference-advanced-tracemalloc.js';
import { referenceAdvanced as refTimeit } from '../js/types/python/reference-advanced-timeit.js';
import { referenceAdvanced as refTrace } from '../js/types/python/reference-advanced-trace.js';
import { referenceAdvanced as refSched } from '../js/types/python/reference-advanced-sched.js';
import { referenceAdvanced as refQueue } from '../js/types/python/reference-advanced-queue.js';
import { referenceAdvanced as refLogging } from '../js/types/python/reference-advanced-logging.js';
import { referenceAdvanced as refLoggingHandlers } from '../js/types/python/reference-advanced-logging-handlers.js';
import { referenceAdvanced as refLoggingConfig } from '../js/types/python/reference-advanced-logging-config.js';
import { referenceAdvanced as refImportlib } from '../js/types/python/reference-advanced-importlib.js';
import { referenceAdvanced as refImportlibAbc } from '../js/types/python/reference-advanced-importlib-abc.js';
import { referenceAdvanced as refImportlibMachinery } from '../js/types/python/reference-advanced-importlib-machinery.js';
import { referenceAdvanced as refImportlibMetadata } from '../js/types/python/reference-advanced-importlib-metadata.js';
import { referenceAdvanced as refImportlibResources } from '../js/types/python/reference-advanced-importlib-resources.js';
import { referenceAdvanced as refImportlibResourcesAbc } from '../js/types/python/reference-advanced-importlib-resources-abc.js';
import { referenceAdvanced as refImportlibUtil } from '../js/types/python/reference-advanced-importlib-util.js';

const ALL_REFS = [
  refArgparse, refOptparse, refGetopt, refCmd, refDoctest, refUnittest, refMock, refBdb, refPdb,
  refProfile, refPstats, refTracemalloc, refTimeit, refTrace, refSched, refQueue, refLogging,
  refLoggingHandlers, refLoggingConfig, refImportlib, refImportlibAbc, refImportlibMachinery,
  refImportlibMetadata, refImportlibResources, refImportlibResourcesAbc, refImportlibUtil,
].flat();

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

test('G12 リファレンス: 全907件・正規形・name一意・status 3値', () => {
  assert.equal(ALL_REFS.length, 907);
  const names = new Set(ALL_REFS.map((i) => i.name));
  assert.equal(names.size, 907);
  const allowed = new Set(['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'returns', 'source']);
  for (const item of ALL_REFS) {
    for (const k of Object.keys(item)) assert.ok(allowed.has(k), item.name + ' の余分なフィールド ' + k);
    assert.ok(['supported', 'unsupported', 'unverified'].includes(item.status), item.name);
    assert.equal(typeof item.name, 'string');
    assert.equal(typeof item.example, 'string');
    assert.ok(item.source.startsWith('https://docs.python.org/ja/3.15/'), item.name);
    if (item.status === 'unsupported') assert.ok(item.caution.includes('未対応です'), item.name);
    if (item.status === 'unverified') assert.ok(item.caution.includes('未検証'), item.name);
  }
});

test('G12 リファレンス: supported の例は全件エンジンで実行できる（F-04）', async () => {
  const failures = [];
  for (const item of ALL_REFS.filter((i) => i.status === 'supported')) {
    const r = await run(item.example);
    if (errs(r).length) failures.push(item.name + ' -> ' + errs(r)[0]);
  }
  assert.deepEqual(failures, []);
});

// ---------- getopt ----------
const GETOPT_CASES = [
  ["print(getopt.getopt(['-a', '-b', '2', 'x'], 'ab:c'))", "([('-a', ''), ('-b', '2')], ['x'])"],
  ["print(getopt.getopt(['x', '-a', 'y'], 'a'))", "([], ['x', '-a', 'y'])"],
  ["print(getopt.gnu_getopt(['x', '-a', 'y'], 'a'))", "([('-a', '')], ['x', 'y'])"],
  ["print(getopt.getopt(['-ab2'], 'ab:'))", "([('-a', ''), ('-b', '2')], [])"],
  ["print(getopt.getopt(['--foo=1'], '', ['foo=']))", "([('--foo', '1')], [])"],
  ["print(getopt.getopt(['-a', '--', '-b'], 'ab'))", "([('-a', '')], ['-b'])"],
];
for (const [expr, expected] of GETOPT_CASES) {
  test('G12 getopt: ' + expr, async () => {
    const r = await run('import getopt\n' + expr);
    assert.deepEqual(errs(r), []);
    assert.deepEqual(outs(r), [expected]);
  });
}
test('G12 getopt: GetoptError の送出と捕捉、msg の一致', async () => {
  const r = await run("import getopt\ntry:\n    getopt.getopt(['-z'], 'a')\nexcept getopt.GetoptError as e:\n    print('caught', e)");
  assert.deepEqual(outs(r), ['caught option -z not recognized']);
  const r2 = await run("import getopt\ngetopt.getopt(['--f'], '', ['foo', 'force'])");
  assert.match(errs(r2)[0], /GetoptError：option --f not a unique prefix/);
});

// ---------- queue ----------
test('G12 queue: FIFO・Full/Empty・task_done/join 計数', async () => {
  const code = [
    'import queue',
    'q = queue.Queue(2)',
    'q.put(1)',
    'q.put(2)',
    'print(q.qsize(), q.full())',
    'try:',
    '    q.put_nowait(3)',
    'except queue.Full:',
    "    print('full')",
    'print(q.get(), q.get(), q.empty())',
    'q.task_done()',
    'q.task_done()',
    'print(q.unfinished_tasks)',
    'try:',
    '    q.get_nowait()',
    'except queue.Empty:',
    "    print('empty')",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['2 True', 'full', '1 2 True', '0', 'empty']);
});
test('G12 queue: LifoQueue / PriorityQueue / SimpleQueue', async () => {
  const r = await run("import queue\nl = queue.LifoQueue()\nl.put(1)\nl.put(2)\nprint(l.get())\np = queue.PriorityQueue()\np.put((2, 'b'))\np.put((1, 'a'))\nprint(p.get())\ns = queue.SimpleQueue()\ns.put('x')\nprint(s.get(), s.empty())");
  assert.deepEqual(outs(r), ['2', "(1, 'a')", 'x True']);
});
test('G12 queue: task_done の過剰呼び出しは ValueError、timeout 負値は ValueError', async () => {
  const r = await run("import queue\nq = queue.Queue()\nq.task_done()");
  assert.match(errs(r)[0], /ValueError：task_done\(\) called too many times/);
  const r2 = await run("import queue\nq = queue.Queue()\nq.get(timeout=-1)");
  assert.match(errs(r2)[0], /ValueError/);
});

// ---------- sched ----------
test('G12 sched: フェイククロックで enter/run/cancel/queue', async () => {
  const code = [
    'now = [100.0]',
    'log = []',
    'def tick():',
    '    return now[0]',
    'def nap(d):',
    '    now[0] = now[0] + d',
    'import sched',
    's = sched.scheduler(tick, nap)',
    'def job():',
    "    log.append('ran')",
    'e = s.enter(5, 1, job)',
    'print(s.empty())',
    'print(s.run(blocking=False))',
    's.run()',
    'print(log, now[0])',
    'e2 = s.enterabs(200, 1, job)',
    's.cancel(e2)',
    'print(s.empty())',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['False', '5.0', "['ran'] 105.0", 'True']);
});

// ---------- argparse ----------
test('G12 argparse: 基本解析（type/default/store_true/append/位置引数）', async () => {
  const code = [
    'import argparse',
    "p = argparse.ArgumentParser(prog='prog')",
    "p.add_argument('--foo', type=int, default=3)",
    "p.add_argument('bar')",
    "p.add_argument('--flag', action='store_true')",
    "p.add_argument('--item', action='append')",
    "ns = p.parse_args(['--foo', '5', 'hello', '--flag', '--item', 'a', '--item', 'b'])",
    'print(ns.foo, ns.bar, ns.flag, ns.item)',
    'print(ns)',
    "print(p.parse_args(['x']).foo)",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['5 hello True [\'a\', \'b\']', "Namespace(foo=5, bar='hello', flag=True, item=['a', 'b'])", '3']);
});
test('G12 argparse: choices/count/相互排他/サブコマンド/省略形', async () => {
  const code = [
    'import argparse',
    "p = argparse.ArgumentParser(prog='prog')",
    "p.add_argument('--mode', choices=['a', 'b'], default='a')",
    "p.add_argument('-v', action='count', default=0)",
    "g = p.add_mutually_exclusive_group()",
    "g.add_argument('--x', action='store_true')",
    "g.add_argument('--y', action='store_true')",
    "sub = p.add_subparsers(dest='cmd')",
    "a = sub.add_parser('add')",
    "a.add_argument('name')",
    "ns = p.parse_args(['--mo', 'b', '-vv', '--x', 'add', 'n1'])",
    'print(ns.mode, ns.v, ns.x, ns.cmd, ns.name)',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['b 2 True add n1']);
});
test('G12 argparse: Namespace の等価性と get_default、format_usage', async () => {
  const r = await run("from argparse import Namespace\nprint(Namespace(a=1) == Namespace(a=1))\nprint(Namespace(a=1) == Namespace(a=2))\nimport argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=7)\nprint(p.get_default('foo'))\nprint(p.format_usage())");
  assert.deepEqual(outs(r), ['True', 'False', '7', 'usage: prog [-h] [--foo FOO]', '']);
});
test('G12 argparse: 解析失敗は SystemExit（error 書式つき）、型変換失敗・choices 違反・相互排他違反', async () => {
  const base = "import argparse\np = argparse.ArgumentParser(prog='prog')\n";
  const r = await run(base + "p.add_argument('--foo', type=int)\np.parse_args(['--foo', 'x'])");
  assert.match(errs(r)[0], /SystemExit：prog: error: argument --foo: invalid int value: 'x' \(exit code 2\)/);
  const r2 = await run(base + "p.add_argument('--m', choices=['a'])\np.parse_args(['--m', 'z'])");
  assert.match(errs(r2)[0], /SystemExit：prog: error: argument --m: invalid choice/);
  const r3 = await run(base + "g = p.add_mutually_exclusive_group()\ng.add_argument('--x', action='store_true')\ng.add_argument('--y', action='store_true')\np.parse_args(['--x', '--y'])");
  assert.match(errs(r3)[0], /SystemExit：prog: error: argument --y: not allowed with argument --x/);
  const r4 = await run(base + "p.add_argument('bar')\np.parse_args([])");
  assert.match(errs(r4)[0], /SystemExit：prog: error: the following arguments are required: bar/);
});

// ---------- optparse ----------
test('G12 optparse: 基本解析と Values、型変換、束ね', async () => {
  const code = [
    'import optparse',
    'p = optparse.OptionParser()',
    "p.add_option('--foo', type='int', default=3)",
    "p.add_option('-v', action='store_true', dest='verbose')",
    "p.add_option('--name', default='x')",
    "values, args = p.parse_args(['--foo', '5', '-v', 'rest'])",
    'print(values.foo, values.verbose, values.name, args)',
    "values2, args2 = p.parse_args([])",
    'print(values2.foo, values2.verbose)',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['5 True x [\'rest\']', '3 False']);
});
test('G12 optparse: Option の属性とクラス定数、エラー例外', async () => {
  const r = await run("from optparse import Option\nimport optparse\no = Option('--foo', type='int', default=3)\nprint(o.dest, o.type, o.default)\nprint('store' in optparse.Option.ACTIONS)");
  assert.deepEqual(outs(r), ['foo int 3', 'True']);
  const r2 = await run("import optparse\np = optparse.OptionParser()\ntry:\n    p.parse_args(['--nope'])\nexcept optparse.BadOptionError as e:\n    print('bad', e)");
  assert.deepEqual(outs(r2), ['bad --nope']);
});

// ---------- cmd ----------
test('G12 cmd: parseline の規則', async () => {
  const r = await run("import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))\nprint(c.parseline(''))\nprint(c.parseline('?foo'))\nprint(c.parseline('!ls'))\nprint(c.prompt, c.ruler)");
  assert.deepEqual(outs(r), ["('help', 'foo', 'help foo')", "(None, None, '')", "('help', 'foo', 'help foo')", "(None, None, '!ls')", '(Cmd)  =']);
});

// ---------- doctest ----------
test('G12 doctest: DocTestParser の抽出（source/want/lineno/exc）', async () => {
  const code = [
    'import doctest',
    'p = doctest.DocTestParser()',
    "ex = p.get_examples('>>> 1 + 1\\n2\\n>>> print(\"hi\")\\nhi\\n')",
    'print(len(ex))',
    "print(ex[0].source == '1 + 1\\n', ex[0].want == '2\\n', ex[0].lineno)", 
    "ex2 = p.get_examples('>>> raise ValueError(\"bad\")\\nTraceback (most recent call last):\\nValueError: bad\\n')",
    'print(ex2[0].exc_msg)',
    'print(doctest.ELLIPSIS, doctest.NORMALIZE_WHITESPACE)',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['2', 'True True 0', 'ValueError: bad', '16 8']);
});
test('G12 doctest: OutputChecker（完全一致・ELLIPSIS・BLANKLINE）と script_from_examples', async () => {
  const r = await run("import doctest\nc = doctest.OutputChecker()\nprint(c.check_output('a\\n', 'a\\n', 0))\nprint(c.check_output('a ... z\\n', 'a middle z\\n', doctest.ELLIPSIS))\nprint(c.check_output('a\\n<BLANKLINE>\\nb\\n', 'a\\n\\nb\\n', 0))\nprint(doctest.script_from_examples('>>> 1 + 1\\n2\\n') == '# line 1\\n1 + 1\\n')");
  assert.deepEqual(outs(r), ['True', 'True', 'True', 'True']);
});

// ---------- logging ----------
test('G12 logging: Formatter の % 形式と { 形式、LogRecord.getMessage', async () => {
  const code = [
    'import logging',
    "f = logging.Formatter('%(levelname)s:%(name)s:%(message)s')",
    "r = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello %s', ('world',), None)",
    'print(f.format(r))',
    "from logging import Formatter as F2cls",
    "f2 = F2cls('{levelname}:{message}', style='{')",
    'print(f2.format(r))',
    'print(r.getMessage(), r.levelname, r.lineno)',
    "print(logging.getLevelName(20), logging.getLevelName('INFO'))",
    "print(logging.getLevelNamesMapping()['WARN'])",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['INFO:n:hello world', 'INFO:hello world', 'hello world INFO 1', 'INFO 20', '30']);
});
test('G12 logging: Logger 階層・伝播・実効レベル・getChild・Filter', async () => {
  const code = [
    'import logging',
    "a = logging.getLogger('a')",
    "b = logging.getLogger('a.b')",
    "print(logging.getLogger('a').name, b.parent.name)",
    'a.setLevel(logging.DEBUG)',
    'print(b.getEffectiveLevel())',
    "c = a.getChild('c')",
    'print(c.name)',
    'print(b.isEnabledFor(logging.INFO), b.isEnabledFor(logging.DEBUG))',
    "f = logging.Filter('a')",
    "r = logging.LogRecord('a.b', logging.INFO, 'x.py', 1, 'm', (), None)",
    "r2 = logging.LogRecord('x', logging.INFO, 'x.py', 1, 'm', (), None)",
    'print(f.filter(r), f.filter(r2))',
    'h = logging.StreamHandler()',
    "h.setFormatter(logging.Formatter('%(message)s'))",
    'b.addHandler(h)',
    'print(b.hasHandlers())',
    "b.info('hello %s', 'log')",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['a a', '10', 'a.c', 'True True', 'True False', 'True']);
});
test('G12 logging: basicConfig と LoggerAdapter、addLevelName', async () => {
  const r = await run("import logging\nlogging.addLevelName(25, 'NOTICE')\nprint(logging.getLevelName(25))\nlg = logging.getLogger('x')\nad = logging.LoggerAdapter(lg, {})\nprint(ad.logger.name)\nprint(logging.CRITICAL, logging.NOTSET)");
  assert.deepEqual(outs(r), ['NOTICE', 'x', '50 0']);
});

// ---------- unittest ----------
test('G12 unittest: TestCase アサーション群（成功系）', async () => {
  const code = [
    'import unittest',
    'tc = unittest.TestCase()',
    'tc.assertEqual(1, 1)',
    "tc.assertEqual('a', 'a')",
    'tc.assertNotEqual(1, 2)',
    'tc.assertTrue(1 == 1)',
    'tc.assertFalse(1 == 2)',
    'tc.assertIn(2, [1, 2])',
    'tc.assertNotIn(3, [1, 2])',
    'tc.assertIsNone(None)',
    'tc.assertIsNotNone(1)',
    'tc.assertGreater(3, 2)',
    'tc.assertLessEqual(2, 2)',
    'tc.assertAlmostEqual(1.0, 1.00000001)',
    'tc.assertListEqual([1, 2], [1, 2])',
    'tc.assertDictEqual({\'a\': 1}, {\'a\': 1})',
    'tc.assertCountEqual([1, 2, 2], [2, 1, 2])',
    "tc.assertRegex('abc123', r'\\d+')",
    "tc.assertStartsWith('hello', 'he')",
    "tc.assertEndsWith('hello', 'lo')",
    'tc.assertIsInstance(1, int)',
    "print('all-ok')",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['all-ok']);
});
test('G12 unittest: アサーション失敗メッセージは CPython 書式', async () => {
  const cases = [
    ['tc.assertEqual(1, 2)', '1 != 2'],
    ['tc.assertTrue(False)', 'False is not true'],
    ['tc.assertIn(3, [1, 2])', '3 not found in [1, 2]'],
    ['tc.assertIsNone(1)', '1 is not None'],
    ['tc.assertGreater(1, 2)', '1 not greater than 2'],
    ["tc.assertRegex('abc', 'z+')", 'Regex didn\'t match: \'z+\' not found in \'abc\''],
  ];
  for (const [call, msg] of cases) {
    const r = await run('import unittest\ntc = unittest.TestCase()\n' + call);
    assert.match(errs(r)[0], new RegExp('AssertionError：' + msg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), call);
  }
  const withMsg = await run("import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 2, 'custom')");
  assert.match(errs(withMsg)[0], /AssertionError：1 != 2 : custom/);
});
test('G12 unittest: TestResult の計数と TestSuite', async () => {
  const code = [
    'import unittest',
    'r = unittest.TestResult()',
    'tc = unittest.TestCase()',
    'r.startTest(tc)',
    'r.addSuccess(tc)',
    'r.addFailure(tc, \'x != y\')',
    'r.addSkip(tc, \'reason\')',
    'print(r.testsRun, r.wasSuccessful(), len(r.failures), len(r.skipped))',
    's = unittest.TestSuite()',
    's.addTest(tc)',
    's.addTests([unittest.TestCase(), unittest.TestCase()])',
    'print(s.countTestCases())',
    'print(unittest.defaultTestLoader.testMethodPrefix)',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['1 False 1 1', '3', 'test']);
});
test('G12 unittest: SkipTest の対応付けと skip デコレータ', async () => {
  const r = await run("import unittest\ntc = unittest.TestCase()\ntry:\n    tc.skipTest('not today')\nexcept unittest.SkipTest as e:\n    print('skipped', e)");
  assert.deepEqual(outs(r), ['skipped not today']);
});

// ---------- unittest.mock ----------
test('G12 mock: 呼び出し記録と assert_called_* 群', async () => {
  const code = [
    'from unittest.mock import MagicMock, Mock, call',
    'm = MagicMock()',
    'm(1, x=2)',
    'm(3)',
    'print(m.called, m.call_count)',
    'print(m.call_args)',
    'm.assert_called_with(3)',
    'm.assert_any_call(1, x=2)',
    'print(m.call_args_list == [call(1, x=2), call(3)])',
    'm.reset_mock()',
    'print(m.called, m.call_count)',
    'm.assert_not_called()',
    "print('ok')",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['True 2', 'call(3)', 'True', 'False 0', 'ok']);
});
test('G12 mock: return_value / side_effect / configure_mock / ANY', async () => {
  const code = [
    'from unittest.mock import MagicMock, ANY',
    'm = MagicMock()',
    'rv = m.return_value',
    'rv(5)',
    'print(rv.call_count, rv.call_args)',
    "m2 = MagicMock(side_effect=[10, 20])",
    'print(m2(), m2())',
    'm3 = MagicMock()',
    'm3.configure_mock(return_value=42)',
    'print(m3())',
    'print(ANY == 123)',
    'from unittest.mock import call',
    'print(call(1, 2))',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['1 call(5)', '10 20', '42', 'True', 'call(1, 2)']);
});
test('G12 mock: assert 失敗は AssertionError', async () => {
  const r = await run("from unittest.mock import MagicMock\nm = MagicMock()\nm.assert_called()");
  assert.match(errs(r)[0], /AssertionError：Expected mock to have been called\./);
  const r2 = await run("from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nm.assert_called_once_with(2)");
  assert.match(errs(r2)[0], /AssertionError：expected call not found/);
});

// ---------- bdb / pstats / tracemalloc / timeit ----------
test('G12 bdb: Breakpoint のデータ管理と BdbQuit', async () => {
  const code = [
    'import bdb',
    "bp = bdb.Breakpoint('x.py', 10)",
    'print(bp.bpformat())',
    'bp.disable()',
    'print(bp.enabled)',
    'd = bdb.Bdb()',
    "d.set_break('y.py', 5)",
    "print(d.get_break('y.py', 5), d.get_file_breaks('y.py'))",
    "print(d.clear_break('y.py', 5))",
    "print(d.get_break('y.py', 5))",
    'from bdb import BdbQuit',
    'try:',
    '    raise BdbQuit()',
    'except BdbQuit:',
    "    print('quit')",
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  // ブレークポイント番号はプロセス全体の通し番号（CPython でも同様）のため書式のみ照合する
  assert.match(outs(r)[0], /^\d+   breakpoint   keep yes   at x\.py:10$/);
  assert.deepEqual(outs(r).slice(1), ['False', 'True [5]', 'None', 'False', 'quit']);
});
test('G12 pstats/tracemalloc: SortKey と Filter/Frame 値の形', async () => {
  const r = await run("import pstats\nprint(pstats.SortKey.CALLS.value, pstats.SortKey.TIME.value)\nimport tracemalloc\nf = tracemalloc.Filter(True, 'x.py', 3)\nprint(f.inclusive, f.filename_pattern, f.lineno)\ndf = tracemalloc.DomainFilter(False, 2)\nprint(df.inclusive, df.domain)");
  assert.deepEqual(outs(r), ['calls time', 'True x.py 3', 'False 2']);
});
test('G12 timeit/trace/profile: 未検証・未対応は正直に停止する', async () => {
  const r = await run("import timeit\nprint(timeit.timeit('pass', number=1))");
  assert.match(outs(r)[0], /実行時に決まる/);
  const r2 = await run("import profile\nprofile.run('pass')");
  assert.match(errs(r2)[0], /未対応/);
  const r3 = await run("import tracemalloc\ntracemalloc.start()");
  assert.match(errs(r3)[0], /未対応/);
});

// ---------- importlib ----------
test('G12 importlib: import_module はレジストリ済みに接続、util の純粋関数', async () => {
  const code = [
    'import importlib',
    "m = importlib.import_module('getopt')",
    "print(m.getopt(['-a'], 'a'))",
    'print(importlib.invalidate_caches())',
    'from importlib.util import cache_from_source, source_from_cache, resolve_name',
    "print(cache_from_source('/a/b.py'))",
    "print(source_from_cache('/a/__pycache__/b.cpython-312.pyc'))",
    "print(resolve_name('.foo', 'pkg.sub'))",
    "print(resolve_name('..foo', 'pkg.sub'))",
    'from importlib.machinery import ModuleSpec, SOURCE_SUFFIXES',
    "s = ModuleSpec('a.b', None, origin='/x/b.py')",
    'print(s.name, s.parent, s.has_location, SOURCE_SUFFIXES)',
  ].join('\n');
  const r = await run(code);
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ["([('-a', '')], [])", 'None', '/a/__pycache__/b.cpython-312.pyc', '/a/b.py', 'pkg.sub.foo', 'pkg.foo', "a.b a True ['.py']"]);
});
test('G12 importlib.metadata: PackageNotFoundError の対応付け', async () => {
  const r = await run("from importlib.metadata import PackageNotFoundError\ntry:\n    raise PackageNotFoundError('nope')\nexcept ImportError as e:\n    print('caught', e)");
  assert.deepEqual(outs(r), ['caught nope']);
});
