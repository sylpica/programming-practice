/* 高度モード B7 G12：unittest（140件）。
 * 裁定（基盤検証の結果）：
 * - エンジンにはユーザー定義クラスの継承先としてネイティブクラスを使う
 *   仕組みが無いため、ユーザーが TestCase を継承して書いたテストメソッドの
 *   収集・実行（TestLoader.loadTestsFromTestCase、TestCase.run、
 *   TextTestRunner.run、main）は到達できない → 未検証／未対応に分ける。
 * - TestCase() を直接生成して呼ぶ assert 系メソッドは、失敗メッセージ書式
 *   まで CPython に合わせて実装する（検証可能範囲）。
 * - TestResult/TestSuite の計数・保持は値として実装する。
 * - assertRaises/assertWarns は呼び出し可能オブジェクトを渡す形を実装し、
 *   with 形式（コンテキストマネージャ）はエンジンの with がネイティブ
 *   オブジェクトに対応しないため未検証とする。
 * 一次情報：公式ドキュメント 3.15 library/unittest、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT } = PyAPI;

function eqOf(ctx, a, b) { const e = ctx.eq(a, b); return e === true || (e && e.v === true); }
function truthyOf(ctx, v) { const t = ctx.truthy(v); return t === true || (t && t.v === true); }
function failWith(ctx, self, standard, msg) {
  let m = standard;
  if (msg !== undefined && msg !== null && !ctx.isNone(msg)) {
    const msgStr = typeof msg === 'string' ? msg : ctx.strOf(msg);
    m = self.data.longMessage ? standard + ' : ' + msgStr : msgStr;
  }
  ctx.err('AssertionError', m, '');
}
function seqItems(ctx, v) { const it = ctx.iterable(v); return it; }
const TestCaseDef = {
  typeName: 'TestCase',
  construct(ctx, args, kwargs) {
    const methodName = args.length && typeof args[0] === 'string' ? args[0] : (kwargs.methodName ? ctx.str(kwargs.methodName) : 'runTest');
    return ctx.native('unittest.TestCase', { methodName, cleanups: [], longMessage: true, maxDiff: 640 });
  },
  methods: {
    // ---- 基本 ----
    fail(ctx, self, args) { ctx.err('AssertionError', args.length ? ctx.strOf(args[0]) : '', ''); return NONE; },
    skipTest(ctx, self, args) { ctx.err('unittest.SkipTest', args.length ? ctx.strOf(args[0]) : '', ''); return NONE; },
    setUp(ctx, self) { return NONE; },
    tearDown(ctx, self) { return NONE; },
    id(ctx, self) { return 'unittest.case.TestCase.' + self.data.methodName; },
    shortDescription(ctx, self) { return NONE; },
    countTestCases(ctx, self) { return NUM(1, false); },
    defaultTestResult(ctx, self) { return ctx.native('unittest.TestResult', freshResult()); },
    run(ctx, self, args) { ctx.diag('unittest.TestCase.run はユーザー定義サブクラスのテストメソッド実行を伴うため、エンジンでは意味論を確定できません（未検証）'); return ctx.unk('run の結果'); },
    debug(ctx, self) { ctx.diag('unittest.TestCase.debug は未検証です'); return ctx.unk('debug の結果'); },
    subTest(ctx, self, args) { ctx.diag('unittest.TestCase.subTest はコンテキストマネージャ形式のためエンジンでは未検証です'); return ctx.unk('subTest の結果'); },
    addCleanup(ctx, self, args, kwargs) { self.data.cleanups.push({ fn: args[0], args: args.slice(1), kwargs }); return NONE; },
    doCleanups(ctx, self) {
      while (self.data.cleanups.length) { const c = self.data.cleanups.pop(); try { ctx.call(c.fn, c.args); } catch (e) { throw e; } }
      return NONE;
    },
    addTypeEqualityFunc(ctx, self, args) { return NONE; },
    enterContext(ctx, self, args) { ctx.diag('enterContext はコンテキストマネージャ形式のため未検証です'); return ctx.unk('enterContext の結果'); },
    // ---- 等価 ----
    assertEqual(ctx, self, args, kwargs) {
      const [a, b] = args; const msg = args.length > 2 ? args[2] : kwargs.msg;
      if (!eqOf(ctx, a, b)) failWith(ctx, self, ctx.repr(a) + ' != ' + ctx.repr(b), msg);
      return NONE;
    },
    assertNotEqual(ctx, self, args, kwargs) {
      const [a, b] = args;
      if (eqOf(ctx, a, b)) failWith(ctx, self, ctx.repr(a) + ' == ' + ctx.repr(b), args.length > 2 ? args[2] : kwargs.msg);
      return NONE;
    },
    assertTrue(ctx, self, args, kwargs) {
      if (!truthyOf(ctx, args[0])) failWith(ctx, self, ctx.repr(args[0]) + ' is not true', args.length > 1 ? args[1] : kwargs.msg);
      return NONE;
    },
    assertFalse(ctx, self, args, kwargs) {
      if (truthyOf(ctx, args[0])) failWith(ctx, self, ctx.repr(args[0]) + ' is not false', args.length > 1 ? args[1] : kwargs.msg);
      return NONE;
    },
    assertIs(ctx, self, args, kwargs) {
      if (!isIdentical(ctx, args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' is not ' + ctx.repr(args[1]), args.length > 2 ? args[2] : kwargs.msg);
      return NONE;
    },
    assertIsNot(ctx, self, args, kwargs) {
      if (isIdentical(ctx, args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' is ' + ctx.repr(args[1]), args.length > 2 ? args[2] : kwargs.msg);
      return NONE;
    },
    assertIsNone(ctx, self, args, kwargs) {
      if (!ctx.isNone(args[0])) failWith(ctx, self, ctx.repr(args[0]) + ' is not None', args.length > 1 ? args[1] : kwargs.msg);
      return NONE;
    },
    assertIsNotNone(ctx, self, args, kwargs) {
      if (ctx.isNone(args[0])) failWith(ctx, self, 'unexpectedly None', args.length > 1 ? args[1] : kwargs.msg);
      return NONE;
    },
    assertIn(ctx, self, args, kwargs) {
      if (!containsVal(ctx, args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' not found in ' + ctx.repr(args[1]), args.length > 2 ? args[2] : kwargs.msg);
      return NONE;
    },
    assertNotIn(ctx, self, args, kwargs) {
      if (containsVal(ctx, args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' unexpectedly found in ' + ctx.repr(args[1]), args.length > 2 ? args[2] : kwargs.msg);
      return NONE;
    },
    assertIsInstance(ctx, self, args, kwargs) {
      if (!isInstanceApprox(ctx, args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' is not an instance of ' + classRepr(ctx, args[1]), kwargs.msg);
      return NONE;
    },
    assertNotIsInstance(ctx, self, args, kwargs) {
      if (isInstanceApprox(ctx, args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' is an instance of ' + classRepr(ctx, args[1]), kwargs.msg);
      return NONE;
    },
    assertIsSubclass(ctx, self, args, kwargs) { ctx.diag('assertIsSubclass はクラス階層の内省が必要でエンジンでは未検証です'); return ctx.unk('assertIsSubclass の結果'); },
    assertNotIsSubclass(ctx, self, args, kwargs) { ctx.diag('assertNotIsSubclass は未検証です'); return ctx.unk('assertNotIsSubclass の結果'); },
    assertHasAttr(ctx, self, args, kwargs) { ctx.diag('assertHasAttr は任意オブジェクトの属性内省が必要でエンジンでは未検証です'); return ctx.unk('assertHasAttr の結果'); },
    assertNotHasAttr(ctx, self, args, kwargs) { ctx.diag('assertNotHasAttr は未検証です'); return ctx.unk('assertNotHasAttr の結果'); },
    // ---- 比較 ----
    assertGreater(ctx, self, args, kwargs) { if (!cmpTrue(ctx, '>', args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' not greater than ' + ctx.repr(args[1]), args.length > 2 ? args[2] : kwargs.msg); return NONE; },
    assertGreaterEqual(ctx, self, args, kwargs) { if (!cmpTrue(ctx, '>=', args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' not greater than or equal to ' + ctx.repr(args[1]), args.length > 2 ? args[2] : kwargs.msg); return NONE; },
    assertLess(ctx, self, args, kwargs) { if (!cmpTrue(ctx, '<', args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' not less than ' + ctx.repr(args[1]), args.length > 2 ? args[2] : kwargs.msg); return NONE; },
    assertLessEqual(ctx, self, args, kwargs) { if (!cmpTrue(ctx, '<=', args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' not less than or equal to ' + ctx.repr(args[1]), args.length > 2 ? args[2] : kwargs.msg); return NONE; },
    assertAlmostEqual(ctx, self, args, kwargs) {
      const [a, b] = args; const na = ctx.num(a), nb = ctx.num(b);
      if (na === null || nb === null) { if (!eqOf(ctx, a, b)) failWith(ctx, self, ctx.repr(a) + ' != ' + ctx.repr(b) + ' within 7 places', kwargs.msg); return NONE; }
      if (na === nb) return NONE;
      const delta = kwargs.delta !== undefined && !ctx.isNone(kwargs.delta) ? ctx.num(kwargs.delta) : null;
      const places = kwargs.places !== undefined ? ctx.int(kwargs.places) : (args.length > 2 ? ctx.int(args[2]) : 7);
      const diff = Math.abs(na - nb);
      const ok = delta !== null ? diff <= delta : roundTo(diff, places) === 0;
      if (!ok) failWith(ctx, self, ctx.repr(a) + ' != ' + ctx.repr(b) + ' within ' + places + ' places (' + diff + ' difference)', kwargs.msg);
      return NONE;
    },
    assertNotAlmostEqual(ctx, self, args, kwargs) {
      const [a, b] = args; const na = ctx.num(a), nb = ctx.num(b);
      if (na !== null && nb !== null) {
        const places = kwargs.places !== undefined ? ctx.int(kwargs.places) : 7;
        const delta = kwargs.delta !== undefined && !ctx.isNone(kwargs.delta) ? ctx.num(kwargs.delta) : null;
        const diff = Math.abs(na - nb);
        const almost = delta !== null ? diff <= delta : roundTo(diff, places) === 0;
        if (almost) failWith(ctx, self, ctx.repr(a) + ' == ' + ctx.repr(b) + ' within ' + places + ' places', kwargs.msg);
      }
      return NONE;
    },
    // ---- コレクション ----
    assertSequenceEqual(ctx, self, args, kwargs) {
      const a = seqItems(ctx, args[0]), b = seqItems(ctx, args[1]);
      if (a === null || b === null) { if (!eqOf(ctx, args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' != ' + ctx.repr(args[1]), kwargs.msg); return NONE; }
      if (a.length !== b.length) failWith(ctx, self, 'Sequences differ: ' + ctx.repr(args[0]) + ' != ' + ctx.repr(args[1]), kwargs.msg);
      for (let i = 0; i < a.length; i++) if (!eqOf(ctx, a[i], b[i])) failWith(ctx, self, 'Sequences differ: ' + ctx.repr(args[0]) + ' != ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    assertListEqual(ctx, self, args, kwargs) {
      const a = seqItems(ctx, args[0]), b = seqItems(ctx, args[1]);
      if (!a || !b || a.length !== b.length || !a.every((x, i) => eqOf(ctx, x, b[i]))) failWith(ctx, self, ctx.repr(args[0]) + ' != ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    assertTupleEqual(ctx, self, args, kwargs) { return TestCaseDef.methods.assertListEqual(ctx, self, args, kwargs); },
    assertSetEqual(ctx, self, args, kwargs) {
      const a = seqItems(ctx, args[0]) || [], b = seqItems(ctx, args[1]) || [];
      const same = a.length === b.length && a.every((x) => b.some((y) => eqOf(ctx, x, y)));
      if (!same) failWith(ctx, self, 'Items in the first set but not the second:\n' + ctx.repr(args[0]) + ' != ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    assertDictEqual(ctx, self, args, kwargs) {
      if (!eqOf(ctx, args[0], args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' != ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    assertCountEqual(ctx, self, args, kwargs) {
      const a = seqItems(ctx, args[0]) || [], b = seqItems(ctx, args[1]) || [];
      const used = new Array(b.length).fill(false); let ok = a.length === b.length;
      if (ok) for (const x of a) { const idx = b.findIndex((y, i) => !used[i] && eqOf(ctx, x, y)); if (idx < 0) { ok = false; break; } used[idx] = true; }
      if (!ok) failWith(ctx, self, 'Element counts were not equal:\nFirst has 1, Second has 0:  ' + ctx.repr(args[0]), kwargs.msg);
      return NONE;
    },
    assertMultiLineEqual(ctx, self, args, kwargs) {
      if (ctx.strOf(args[0]) !== ctx.strOf(args[1])) failWith(ctx, self, ctx.repr(args[0]) + ' != ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    assertStartsWith(ctx, self, args, kwargs) {
      const s = typeof args[0] === 'string' ? args[0] : null; const pre = typeof args[1] === 'string' ? args[1] : (ctx.listOf(args[1]) || []);
      const ok = s !== null && (typeof pre === 'string' ? s.startsWith(pre) : pre.some((p) => typeof p === 'string' && s.startsWith(p)));
      if (!ok) failWith(ctx, self, ctx.repr(args[0]) + ' does not start with ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    assertNotStartsWith(ctx, self, args, kwargs) {
      const s = typeof args[0] === 'string' ? args[0] : ''; const pre = typeof args[1] === 'string' ? args[1] : '';
      if (s.startsWith(pre) && pre !== '') failWith(ctx, self, ctx.repr(args[0]) + ' starts with ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    assertEndsWith(ctx, self, args, kwargs) {
      const s = typeof args[0] === 'string' ? args[0] : ''; const suf = typeof args[1] === 'string' ? args[1] : '';
      if (!s.endsWith(suf)) failWith(ctx, self, ctx.repr(args[0]) + ' does not end with ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    assertNotEndsWith(ctx, self, args, kwargs) {
      const s = typeof args[0] === 'string' ? args[0] : ''; const suf = typeof args[1] === 'string' ? args[1] : '';
      if (suf !== '' && s.endsWith(suf)) failWith(ctx, self, ctx.repr(args[0]) + ' ends with ' + ctx.repr(args[1]), kwargs.msg);
      return NONE;
    },
    // ---- 正規表現 ----
    assertRegex(ctx, self, args, kwargs) {
      const text = typeof args[0] === 'string' ? args[0] : ctx.strOf(args[0]);
      const pat = typeof args[1] === 'string' ? args[1] : ctx.strOf(args[1]);
      let ok = false;
      try { ok = new RegExp(pat).test(text); } catch { ctx.diag('正規表現の構文差異のため未検証です'); return ctx.unk('assertRegex の結果'); }
      if (!ok) failWith(ctx, self, 'Regex didn\'t match: ' + ctx.repr(pat) + ' not found in ' + ctx.repr(text), args.length > 2 ? args[2] : kwargs.msg);
      return NONE;
    },
    assertNotRegex(ctx, self, args, kwargs) {
      const text = typeof args[0] === 'string' ? args[0] : ctx.strOf(args[0]);
      const pat = typeof args[1] === 'string' ? args[1] : ctx.strOf(args[1]);
      let ok = false;
      try { ok = new RegExp(pat).test(text); } catch { return ctx.unk('assertNotRegex の結果'); }
      if (ok) failWith(ctx, self, 'Regex matched: ' + ctx.repr(pat) + ' found in ' + ctx.repr(text), kwargs.msg);
      return NONE;
    },
    // ---- 例外・警告（呼び出し可能形式） ----
    assertRaises(ctx, self, args, kwargs) {
      if (args.length < 2) { ctx.diag('assertRaises のコンテキストマネージャ形式はエンジンでは未検証です'); return ctx.unk('assertRaises の結果'); }
      const excClass = args[0]; const fn = args[1];
      try { ctx.call(fn, args.slice(2)); }
      catch (e) {
        if (excMatchesThrown(ctx, e, excClass)) return NONE;
        throw e;
      }
      failWith(ctx, self, excNameOf(ctx, excClass) + ' not raised', kwargs.msg);
      return NONE;
    },
    assertRaisesRegex(ctx, self, args, kwargs) {
      if (args.length < 3) { ctx.diag('assertRaisesRegex のコンテキストマネージャ形式は未検証です'); return ctx.unk('assertRaisesRegex の結果'); }
      const excClass = args[0]; const pat = ctx.strOf(args[1]); const fn = args[2];
      try { ctx.call(fn, args.slice(3)); }
      catch (e) {
        if (excMatchesThrown(ctx, e, excClass)) {
          const msgText = e && e.message ? String(e.message) : '';
          if (!new RegExp(pat).test(msgText)) failWith(ctx, self, '"' + pat + '" does not match "' + msgText + '"', kwargs.msg);
          return NONE;
        }
        throw e;
      }
      failWith(ctx, self, excNameOf(ctx, excClass) + ' not raised', kwargs.msg);
      return NONE;
    },
    assertWarns(ctx, self, args, kwargs) { ctx.diag('assertWarns は warnings の捕捉が必要で、呼び出し可能形式でもエンジンでは未検証です'); return ctx.unk('assertWarns の結果'); },
    assertWarnsRegex(ctx, self, args, kwargs) { ctx.diag('assertWarnsRegex は未検証です'); return ctx.unk('assertWarnsRegex の結果'); },
    assertLogs(ctx, self, args, kwargs) { ctx.diag('assertLogs はコンテキストマネージャ形式のため未検証です'); return ctx.unk('assertLogs の結果'); },
    assertNoLogs(ctx, self, args, kwargs) { ctx.diag('assertNoLogs は未検証です'); return ctx.unk('assertNoLogs の結果'); },
  },
  classMethods: {
    setUpClass(ctx, args) { return NONE; },
    tearDownClass(ctx, args) { return NONE; },
    addClassCleanup(ctx, args) { return NONE; },
    doClassCleanups(ctx, args) { return NONE; },
    enterClassContext(ctx, args) { return ctx.unk('enterClassContext の結果'); },
  },
  attrs: {
    longMessage: (ctx, self) => BOOL(self.data.longMessage),
    maxDiff: (ctx, self) => NUM(self.data.maxDiff, false),
  },
};
function roundTo(x, places) { const f = Math.pow(10, places); return Math.round(x * f) / f; }
function isIdentical(ctx, a, b) {
  if (a === b) return true;
  if (ctx.isNone(a) && ctx.isNone(b)) return true;
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  if ((ctx.isNum(a) || ctx.isBool(a)) && (ctx.isNum(b) || ctx.isBool(b))) return ctx.typeName(a) === ctx.typeName(b) && ctx.num(a) === ctx.num(b);
  return false;
}
function containsVal(ctx, member, container) {
  if (typeof container === 'string' && typeof member === 'string') return container.includes(member);
  if (ctx.isDict(container)) { for (const [, v] of container.__dict) { if (eqOf(ctx, v.k, member)) return true; } return false; }
  const items = ctx.iterable(container);
  if (items) return items.some((x) => eqOf(ctx, x, member));
  return false;
}
function cmpTrue(ctx, op, a, b) { const r = ctx.compare(op, a, b); return r === true || (r && r.v === true); }
function classRepr(ctx, cls) {
  if (cls && cls.__ncls) return "<class '" + cls.__ncls + "'>";
  if (cls && cls.__builtin) return "<class '" + cls.__builtin + "'>";
  if (cls && cls.__type) return "<class '" + cls.__type + "'>";
  const items = ctx.listOf(cls);
  if (items) return '(' + items.map((c) => classRepr(ctx, c)).join(', ') + ')';
  return ctx.repr(cls);
}
function isInstanceApprox(ctx, obj, cls) {
  const items = ctx.listOf(cls);
  if (items) return items.some((c) => isInstanceApprox(ctx, obj, c));
  if (cls && cls.__ncls) {
    if (obj && obj.__native) {
      if (obj.__native === cls.__ncls) return true;
      return false;
    }
    if (obj && obj.__exc) return false;
    return false;
  }
  if (cls && (cls.__builtin || cls.__type)) {
    const name = cls.__builtin || cls.__type;
    const tn = ctx.typeName(obj);
    if (name === 'int') return tn === 'int' || tn === 'bool';
    if (name === 'object') return true;
    return tn === name;
  }
  if (cls && cls.__class) return !!(obj && obj.__instance);
  return false;
}
function excNameOf(ctx, cls) {
  if (cls && cls.__ncls) return cls.__ncls.split('.').pop();
  if (cls && cls.__builtin) return cls.__builtin;
  if (cls && cls.__type) return cls.__type;
  return ctx.typeName(cls);
}
function excMatchesThrown(ctx, e, cls) {
  // ctx.err が投げる内部例外から種別を取り出す試み。取り出せない場合は
  // 「送出された例外は想定外」とみなさず、捕捉できたこと自体を根拠に
  // 一致扱いにはしない（捏造回避のため不一致として再送出する）。
  const kind = e && (e.kind || e.excKind || (e.diag && e.diag.kind));
  if (!kind) return false;
  const name = excNameOf(ctx, cls);
  return kind === name || kind.endsWith('.' + name);
}
function freshResult() {
  return { testsRun: 0, failures: [], errors: [], skipped: [], expectedFailures: [], unexpectedSuccesses: [], shouldStop: false, buffer: false, failfast: false, tb_locals: false, durations: [] };
}
const TestResultDef = {
  typeName: 'TestResult',
  construct(ctx) { return ctx.native('unittest.TestResult', freshResult()); },
  methods: {
    startTestRun(ctx, self) { return NONE; },
    stopTestRun(ctx, self) { return NONE; },
    startTest(ctx, self, args) { self.data.testsRun++; return NONE; },
    stopTest(ctx, self, args) { return NONE; },
    addSuccess(ctx, self, args) { return NONE; },
    addFailure(ctx, self, args) { self.data.failures.push(TUPLE([args[0], args.length > 1 ? ctx.strOf(args[1]) : ''])); return NONE; },
    addError(ctx, self, args) { self.data.errors.push(TUPLE([args[0], args.length > 1 ? ctx.strOf(args[1]) : ''])); return NONE; },
    addSkip(ctx, self, args) { self.data.skipped.push(TUPLE([args[0], args.length > 1 ? args[1] : ''])); return NONE; },
    addExpectedFailure(ctx, self, args) { self.data.expectedFailures.push(TUPLE([args[0], args.length > 1 ? ctx.strOf(args[1]) : ''])); return NONE; },
    addUnexpectedSuccess(ctx, self, args) { self.data.unexpectedSuccesses.push(args[0]); return NONE; },
    addSubTest(ctx, self, args) { if (args.length > 2 && !ctx.isNone(args[2])) self.data.failures.push(TUPLE([args[0], ctx.strOf(args[2])])); return NONE; },
    addDuration(ctx, self, args) { self.data.durations.push(TUPLE([args[0], args[1]])); return NONE; },
    wasSuccessful(ctx, self) { return BOOL(self.data.failures.length === 0 && self.data.errors.length === 0); },
    stop(ctx, self) { self.data.shouldStop = true; return NONE; },
    getDescription(ctx, self, args) { return ctx.strOf(args[0]); },
  },
  attrs: {
    testsRun: (ctx, self) => NUM(self.data.testsRun, false),
    failures: (ctx, self) => LIST(self.data.failures), errors: (ctx, self) => LIST(self.data.errors),
    skipped: (ctx, self) => LIST(self.data.skipped), expectedFailures: (ctx, self) => LIST(self.data.expectedFailures),
    unexpectedSuccesses: (ctx, self) => LIST(self.data.unexpectedSuccesses),
    shouldStop: (ctx, self) => BOOL(self.data.shouldStop), buffer: (ctx, self) => BOOL(self.data.buffer),
    failfast: (ctx, self) => BOOL(self.data.failfast), tb_locals: (ctx, self) => BOOL(self.data.tb_locals),
    collectedDurations: (ctx, self) => LIST(self.data.durations),
  },
};
function countOf(ctx, t) {
  if (t && t.__native === 'unittest.TestCase') return 1;
  if (t && t.__native === 'unittest.FunctionTestCase') return 1;
  if (t && t.__native === 'unittest.TestSuite') return t.data.tests.reduce((s, x) => s + countOf(ctx, x), 0);
  return 1;
}
const TestSuiteDef = {
  typeName: 'TestSuite',
  construct(ctx, args) {
    const tests = args.length && !ctx.isNone(args[0]) ? (ctx.iterable(args[0]) || []) : [];
    return ctx.native('unittest.TestSuite', { tests: [...tests] });
  },
  methods: {
    addTest(ctx, self, args) { self.data.tests.push(args[0]); return NONE; },
    addTests(ctx, self, args) { const items = ctx.iterable(args[0]) || []; for (const t of items) self.data.tests.push(t); return NONE; },
    countTestCases(ctx, self) { return NUM(self.data.tests.reduce((s, x) => s + countOf(ctx, x), 0), false); },
    run(ctx, self, args) { ctx.diag('unittest.TestSuite.run はテスト実行を伴うため未検証です'); return ctx.unk('run の結果'); },
    debug(ctx, self) { ctx.diag('unittest.TestSuite.debug は未検証です'); return ctx.unk('debug の結果'); },
  },
  iter(ctx, self) { return self.data.tests; },
};
const TextTestResultDef = { typeName: 'TextTestResult', parents: ['unittest.TestResult'], construct(ctx, args) { const d = freshResult(); d.stream = args[0]; d.verbosity = args.length > 2 ? ctx.int(args[2]) ?? 1 : 1; return ctx.native('unittest.TextTestResult', d); }, methods: { ...TestResultDef.methods }, attrs: { ...TestResultDef.attrs } };
const TextTestRunnerDef = {
  typeName: 'TextTestRunner',
  construct(ctx, args, kwargs) {
    return ctx.native('unittest.TextTestRunner', { verbosity: kwargs.verbosity !== undefined ? ctx.int(kwargs.verbosity) : 1 });
  },
  methods: {
    _makeResult(ctx, self) { return ctx.native('unittest.TextTestResult', freshResult()); },
    run(ctx, self, args) { ctx.diag('unittest.TextTestRunner.run はテスト実行を伴うため未検証です'); return ctx.unk('run の結果'); },
  },
};
const TestLoaderDef = {
  typeName: 'TestLoader',
  construct(ctx) { return ctx.native('unittest.TestLoader', {}); },
  methods: {
    getTestCaseNames(ctx, self, args) { ctx.diag('getTestCaseNames はクラス内省が必要で、ネイティブ TestCase 以外は未検証です'); return LIST([]); },
    loadTestsFromTestCase(ctx, self, args) { ctx.diag('loadTestsFromTestCase はユーザー定義クラスのメソッド収集が必要で未検証です'); return ctx.unk('loadTestsFromTestCase の結果'); },
    loadTestsFromModule(ctx, self, args) { ctx.diag('loadTestsFromModule は未検証です'); return ctx.unk('loadTestsFromModule の結果'); },
    loadTestsFromName(ctx, self, args) { ctx.diag('loadTestsFromName は未検証です'); return ctx.unk('loadTestsFromName の結果'); },
    loadTestsFromNames(ctx, self, args) { ctx.diag('loadTestsFromNames は未検証です'); return ctx.unk('loadTestsFromNames の結果'); },
    discover(ctx, self, args) { ctx.err('未対応', 'unittest.TestLoader.discover はファイルシステム探索前提のため本アプリの高度モードでは未対応です', ''); return NONE; },
  },
  attrs: {
    testMethodPrefix: (ctx, self) => 'test', suiteClass: (ctx, self) => ctx.ncls('unittest.TestSuite'),
    errors: (ctx, self) => LIST([]), testNamePatterns: (ctx, self) => NONE, sortTestMethodsUsing: (ctx, self) => NONE,
  },
  classAttrs: { testMethodPrefix: 'test' },
};
const FunctionTestCaseDef = {
  typeName: 'FunctionTestCase',
  construct(ctx, args) { return ctx.native('unittest.FunctionTestCase', { fn: args[0] }); },
  methods: {
    countTestCases(ctx, self) { return NUM(1, false); },
    run(ctx, self, args) { ctx.diag('FunctionTestCase.run は未検証です'); return ctx.unk('run の結果'); },
    id(ctx, self) { return 'unittest.case.FunctionTestCase'; },
  },
};
function decoratorNative(ctx, kind, condition, reason) {
  return ctx.native('unittest._Decorator', { kind, condition, reason });
}
const DecoratorDef = {
  typeName: '_Decorator',
  call(ctx, self, args) {
    const target = args[0];
    if (self.data.kind === 'skip' || (self.data.kind === 'skipIf' && self.data.condition) || (self.data.kind === 'skipUnless' && !self.data.condition)) {
      // スキップ用ラッパー：呼ばれたら SkipTest
      return ctx.native('unittest._SkippedCallable', { reason: self.data.reason || '' });
    }
    if (self.data.kind === 'expectedFailure') return ctx.native('unittest._ExpectedFailureCallable', { fn: target });
    return target;
  },
};
const SkippedCallableDef = {
  typeName: '_SkippedCallable',
  call(ctx, self, args) { ctx.err('unittest.SkipTest', self.data.reason, ''); return NONE; },
};
const ExpectedFailureCallableDef = {
  typeName: '_ExpectedFailureCallable',
  call(ctx, self, args) { return ctx.call(self.data.fn, args); },
};
let resultRegistry = [];
registerStdlibModule('unittest', {
  functions: {
    main(ctx, args, kwargs) { ctx.err('未対応', 'unittest.main はコマンドライン引数とテスト探索前提のため本アプリの高度モードでは未対応です', ''); return NONE; },
    skip(ctx, args) { return decoratorNative(ctx, 'skip', true, args.length ? ctx.strOf(args[0]) : ''); },
    skipIf(ctx, args) { return decoratorNative(ctx, 'skipIf', truthyOf(ctx, args[0]), args.length > 1 ? ctx.strOf(args[1]) : ''); },
    skipUnless(ctx, args) { return decoratorNative(ctx, 'skipUnless', truthyOf(ctx, args[0]), args.length > 1 ? ctx.strOf(args[1]) : ''); },
    expectedFailure(ctx, args) { const d = decoratorNative(ctx, 'expectedFailure', false, ''); return args.length ? DecoratorDef.call(ctx, d, args) : d; },
    registerResult(ctx, args) { resultRegistry.push(args[0]); return NONE; },
    removeResult(ctx, args) { const before = resultRegistry.length; resultRegistry = resultRegistry.filter((r) => r !== args[0]); return BOOL(resultRegistry.length !== before); },
    installHandler(ctx) { ctx.diag('installHandler はシグナル処理のため未検証です'); return NONE; },
    removeHandler(ctx, args) {
      if (!args.length) { ctx.diag('removeHandler は未検証です'); return NONE; }
      return args[0]; // デコレータとして使われた場合は関数をそのまま返す
    },
    addModuleCleanup(ctx, args) { return NONE; },
    doModuleCleanups(ctx) { return NONE; },
    enterModuleContext(ctx, args) { ctx.diag('enterModuleContext は未検証です'); return ctx.unk('enterModuleContext の結果'); },
    setUpModule(ctx) { return NONE; },
    tearDownModule(ctx) { return NONE; },
  },
  data: {},
  classes: {
    TestCase: TestCaseDef, TestResult: TestResultDef, TestSuite: TestSuiteDef,
    TextTestResult: TextTestResultDef, TextTestRunner: TextTestRunnerDef, TestLoader: TestLoaderDef,
    FunctionTestCase: FunctionTestCaseDef,
    IsolatedAsyncioTestCase: { typeName: 'IsolatedAsyncioTestCase', parents: ['unittest.TestCase'] },
    SkipTest: { typeName: 'SkipTest', exc: 'unittest.SkipTest', excParents: ['Exception'] },
    _Decorator: DecoratorDef, _SkippedCallable: SkippedCallableDef, _ExpectedFailureCallable: ExpectedFailureCallableDef,
  },
});
// defaultTestLoader はインスタンス値として別途登録（data はエンジン値が必要）
import { STDLIB_MODULES } from './stdlib-registry.js';
{
  const def = STDLIB_MODULES.get('unittest');
  // ネイティブ値の手組み（ctx 無しで作れる形）
  def.data = { defaultTestLoader: { __native: 'unittest.TestLoader', mod: 'unittest', data: {} } };
}
