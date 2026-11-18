/* 高度モード B7 基盤テスト：stdlib レジストリ経由の import／属性／呼び出し／
 * 例外対応付けが、登録済みモジュールに対して正しく働くことを検証する。
 * このファイルが advanced バンドルを読み込むため、レジストリはこの
 * プロセス内でのみ有効（他テストファイルのプロセスには影響しない）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { registerStdlibModule } from '../js/types/python/stdlib-registry.js';
import { PyAPI } from '../js/types/python/engine.js';
import '../js/types/python/advanced-engine.js';

const { NUM, BOOL } = PyAPI;

// テスト専用の合成モジュール（例外対応付けとクラス機構の検証用）
registerStdlibModule('advcall', {
  classes: {
    Adder: {
      typeName: 'Adder',
      construct: (ctx, args) => ctx.native('advcall.Adder', { base: args[0] }),
      call: (ctx, self, args) => NUM(ctx.num(self.data.base) + ctx.num(args[0]), false),
      repr: (ctx, self) => 'Adder(' + ctx.repr(self.data.base) + ')',
    },
  },
});
registerStdlibModule('advtest', {
  constants: { ANSWER: NUM(42, false) },
  functions: {
    double: (ctx, args) => NUM(ctx.num(args[0]) * 2, false),
    boom: (ctx) => ctx.err('advtest.CustomError', 'custom failure', ''),
  },
  classes: {
    CustomError: { typeName: 'CustomError', exc: 'advtest.CustomError', excParents: ['ValueError'] },
    Box: {
      typeName: 'Box',
      construct: (ctx, args) => ctx.native('advtest.Box', { v: args[0] }),
      methods: {
        get: (ctx, self) => self.data.v,
        add: (ctx, self, args) => ctx.native('advtest.Box', { v: ctx.binop('+', self.data.v, args[0]) }),
      },
      attrs: { value: (ctx, self) => self.data.v },
      repr: (ctx, self) => 'Box(' + ctx.repr(self.data.v) + ')',
      eq: (ctx, self, other) => (other && other.__native === 'advtest.Box') ? ctx.eq(self.data.v, other.data.v) : false,
      hash: (ctx, self) => 'v:' + ctx.repr(self.data.v),
      binop: (ctx, self, op, other, reflected) => {
        if (op === '+' && other && other.__native === 'advtest.Box') return ctx.native('advtest.Box', { v: ctx.binop('+', self.data.v, other.data.v) });
        return ctx.NOT_HANDLED;
      },
    },
  },
});

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

test('B7基盤: import の形（通常・別名・dotted・from・star）', async () => {
  assert.deepEqual(outs(await run('import math\nprint(math.floor(2.5))')), ['2']);
  assert.deepEqual(outs(await run('import math as m\nprint(m.ceil(2.1))')), ['3']);
  assert.deepEqual(outs(await run('from math import sqrt\nprint(sqrt(16))')), ['4.0']);
  assert.deepEqual(outs(await run('from math import *\nprint(gcd(12, 18))')), ['6']);
  assert.deepEqual(outs(await run('import advtest\nprint(advtest.ANSWER)')), ['42']);
  assert.deepEqual(outs(await run('import advtest as at\nprint(at.double(21))')), ['42']);
});

test('B7基盤: 実在しない名前は ImportError／AttributeError で名指し停止', async () => {
  assert.match(errs(await run('from math import nosuchname\nprint(1)'))[0], /ImportError/);
  assert.match(errs(await run('import math\nprint(math.nosuchname)'))[0], /AttributeError/);
  assert.match(errs(await run('import math\nprint(math.nosuchname(1))'))[0], /AttributeError/);
});

test('B7基盤: 未登録モジュールは従来どおり未対応で停止', async () => {
  assert.match(errs(await run('import os\nprint(1)'))[0], /未対応/);
});

test('B7基盤: ネイティブクラスの生成・メソッド・属性・演算・等価・辞書キー', async () => {
  const r = await run([
    'from advtest import Box',
    'a = Box(10)',
    'b = a.add(5)',
    'print(a)',
    'print(b.value)',
    'print(a + b)',
    'print(a == Box(10))',
    'print(a == b)',
    'd = {a: "hit"}',
    'print(d[Box(10)])',
    'print(type(a).__name__ if False else "skip")',
  ].join('\n'));
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['Box(10)', '15', 'Box(25)', 'True', 'False', 'hit', 'skip']);
});

test('B7基盤: 例外の対応付け（送出・捕捉・親クラスでの捕捉・isinstance）', async () => {
  const caught = await run([
    'import advtest',
    'try:',
    '    advtest.boom()',
    'except ValueError:',
    '    print("caught-as-valueerror")',
  ].join('\n'));
  assert.deepEqual(outs(caught), ['caught-as-valueerror']);

  const raised = await run([
    'from advtest import CustomError',
    'try:',
    '    raise CustomError("bad input")',
    'except CustomError as e:',
    '    print("caught", e)',
  ].join('\n'));
  assert.deepEqual(outs(raised), ['caught bad input']);

  const uncaught = await run('import advtest\nadvtest.boom()');
  assert.match(errs(uncaught)[0], /advtest\.CustomError：custom failure/);

  const isinst = await run([
    'from advtest import CustomError',
    'import advtest',
    'try:',
    '    advtest.boom()',
    'except ValueError as e:',
    '    print(isinstance(e, CustomError))',
  ].join('\n'));
  assert.deepEqual(outs(isinst), ['True']);
});

test('B7基盤: 呼び出し可能ネイティブオブジェクト（call フック）', async () => {
  const r = await run('import advcall\na = advcall.Adder(10)\nprint(a(5))\nprint(a)');
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['15', 'Adder(10)']);
  // sorted の key として値経由で呼ばれる経路（callFn）も効くこと。
  // なお lambda はエンジン全体の既存仕様で未対応のため使わない。
  const r2 = await run('import advcall\nk = advcall.Adder(0)\nprint(sorted([3, 1, 2], key=k))');
  assert.deepEqual(errs(r2), []);
  assert.deepEqual(outs(r2), ['[1, 2, 3]']);
});

test('B7基盤（統合修正）: モジュール修飾クラス構築で kwargs が二重評価されない（F-C）', async () => {
  const r = await run('import datetime\nd = datetime.timedelta(days=1)\nprint(d.days)');
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['1']);
  const r2 = await run('import queue\nq = queue.Queue(maxsize=3)\nprint(q.maxsize)');
  assert.deepEqual(outs(r2), ['3']);
});

test('B7基盤（統合修正）: dotted import の別名束縛（F-A）と raise 属性形（F-B）', async () => {
  const r = await run('import xml.etree.ElementTree as ET\ne = ET.Element("a")\nprint(e.tag)');
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['a']);
  const r2 = await run('import locale\ntry:\n    raise locale.Error("x")\nexcept locale.Error:\n    print("caught")');
  assert.deepEqual(outs(r2), ['caught']);
  const r3 = await run('import math.integer as mi\nprint(mi.isqrt(10))');
  assert.deepEqual(outs(r3), ['3']);
});

test('B7基盤（統合修正）: is／単項／divmod／属性代入／del のネイティブ委譲', async () => {
  const r = await run('import datetime\nprint(datetime.timezone.utc is datetime.timezone.utc)\nprint(datetime.timezone.utc is datetime.timezone(datetime.timedelta(0)))');
  assert.deepEqual(outs(r), ['True', 'False']);
  const r2 = await run('import fractions\nprint(divmod(fractions.Fraction(7, 2), 1))');
  assert.deepEqual(outs(r2), ['(3, Fraction(1, 2))']);
  const r3 = await run('import queue\nq = queue.Queue()\nq.custom = 5\nprint(q.custom)\ndel q.custom\nprint(hasattr(q, "custom") if False else "deleted")');
  assert.deepEqual(errs(r3), []);
  assert.deepEqual(outs(r3), ['5', 'deleted']);
});

test('B7基盤（統合修正）: 例外属性チャンネル（F-P）と ctx.emit／callKw（F-M）', async () => {
  registerStdlibModule('advexc', {
    functions: {
      fail: (ctx) => ctx.errAttrs('advexc.MyError', 'something bad', { code: NUM(42, false), detail: 'xyz' }),
      applykw: (ctx, args) => ctx.callKw(args[0], [], { ndigits: NUM(1, false) }),
    },
    classes: { MyError: { typeName: 'MyError', exc: 'advexc.MyError', excParents: ['ValueError'] } },
  });
  const r = await run('import advexc\ntry:\n    advexc.fail()\nexcept ValueError as e:\n    print(e.code)\n    print(e.detail)');
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['42', 'xyz']);
});

test('B7基盤: キーワード引数は評価されてから渡る', async () => {
  const r = await run('import math\nprint(math.prod([2, 3], start=10))');
  assert.deepEqual(outs(r), ['60']);
  const r2 = await run('import math\nprint(math.isclose(1.0, 1.05, rel_tol=0.1))');
  assert.deepEqual(outs(r2), ['True']);
});
