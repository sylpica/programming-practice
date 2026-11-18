/* 高度モード B7 G12：unittest.mock（57件）。
 * 裁定：
 * - Mock/MagicMock 自体の呼び出し記録（called/call_count/call_args/
 *   call_args_list/method_calls/mock_calls、assert_called_* 群、
 *   return_value/side_effect の基本形、reset_mock、configure_mock）は実装。
 * - 動的属性生成（m.foo のような未知属性へのアクセスで子モックが自動生成
 *   される仕組み）は当初、基盤に動的属性フックが無く未検証とした。
 *   R6 追補：基盤に attrFallback フックが追加されたため配線した。子モックは
 *   同じ属性に対して同じ子を返し（キャッシュ）、呼び出しは親の
 *   method_calls／mock_calls にドットパス付きで伝播する。属性代入は
 *   setattr フックで return_value／side_effect をデータ本体へ、それ以外を
 *   属性バッグへ書き戻す（attrs ゲッター優先のため）。attach_mock と
 *   configure_mock のドット記法（'foo.return_value' 等）も実装した。
 *   return_value 経由の呼び出しの親 mock_calls への伝播（call()() 形式）は
 *   未実装（既知の残差）。
 * - patch は対象の差し替え（モジュール属性・オブジェクト属性の書き換え）を
 *   エンジンが行えないため未検証。create_autospec は内省依存で未検証。
 *   mock_open はファイル前提で未対応寄りだが、読み取り専用の形も確定
 *   できないため未検証に倒す。
 * 一次情報：公式ドキュメント 3.15 library/unittest.mock、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, STDLIB_CLASSES } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT } = PyAPI;

function callNative(ctx, argsArr, kwargsObj, path) {
  return ctx.native('unittest.mock._Call', { args: TUPLE(argsArr || []), kwargs: kwargsObj || DICT(), parent: null, name: '', path: path || '' });
}
function callRepr(ctx, c) {
  if (c.data.__builder) return 'call.' + c.data.path;
  const a = ctx.listOf(c.data.args) || [];
  const parts = a.map((x) => ctx.repr(x));
  if (c.data.kwargs && ctx.isDict(c.data.kwargs)) for (const [, v] of c.data.kwargs.__dict) parts.push(ctx.strOf(v.k) + '=' + ctx.repr(v.v));
  return 'call' + (c.data.path ? '.' + c.data.path : '') + '(' + parts.join(', ') + ')';
}
function callsEqual(ctx, a, b) {
  if (!a || !b || !a.__native || !b.__native) return false;
  if ((a.data.path || '') !== (b.data.path || '')) return false;
  if (!!a.data.__builder !== !!b.data.__builder) return false;
  if (a.data.__builder) return true;
  const aa = ctx.listOf(a.data.args) || [], ba = ctx.listOf(b.data.args) || [];
  if (aa.length !== ba.length) return false;
  for (let i = 0; i < aa.length; i++) { const e = ctx.eq(aa[i], ba[i]); if (!(e === true || (e && e.v === true))) return false; }
  const ak = a.data.kwargs && ctx.isDict(a.data.kwargs) ? [...a.data.kwargs.__dict.values()] : [];
  const bk = b.data.kwargs && ctx.isDict(b.data.kwargs) ? [...b.data.kwargs.__dict.values()] : [];
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) { if (ak[i].k !== bk[i].k) return false; const e = ctx.eq(ak[i].v, bk[i].v); if (!(e === true || (e && e.v === true))) return false; }
  return true;
}
// R6：基盤のメソッド呼び出し経路（stdlibNativeCall）は attrFallback を
// 経由せず def.attrs を引くため、未知属性の解決は attrs 側にも用意する。
// has で「未知の名前は attrs にある」と答え、get が返すゲッターが実値を
// 決める（読み取り経路では attrs が最初に見られるが、ゲッター自身が
// 属性バッグ→子モックの順で解決するため優先順位は CPython と一致する）。
// メソッド名・実在の属性名・ダンダーは対象外（従来経路に委ねる）。
function dynAttrs(baseAttrs, methodNames, resolve) {
  return new Proxy(baseAttrs, {
    has(t, p) {
      if (typeof p !== 'string' || p in t || p in methodNames) return p in t;
      if (p.startsWith('__') || p === 'then') return false;
      return true;
    },
    get(t, p) {
      if (typeof p !== 'string' || p in t || p in methodNames || p.startsWith('__')) return t[p];
      return (ctx, self) => resolve(ctx, self, p);
    },
  });
}
function callBuilder(ctx, self, name) {
  const path = self.data.path ? self.data.path + '.' + name : name;
  return ctx.native('unittest.mock._Call', { args: null, kwargs: null, parent: null, name: '', path, __builder: true });
}
const CallDef = {
  typeName: '_Call',
  construct(ctx, args, kwargs) { return callNative(ctx, args, kwargsToDict(ctx, kwargs)); },
  call(ctx, self, args, kwargs) {
    // call.foo.bar(1) の連鎖：パス構築用オブジェクトを呼ぶと、そのパスを
    // 持つ確定した _Call になる（R6）。
    if (self.data.__builder) return callNative(ctx, args, kwargsToDict(ctx, kwargs), self.data.path);
    return callNative(ctx, args, kwargsToDict(ctx, kwargs));
  },
  // R6：call.foo のような属性連鎖。確定済み _Call からの連鎖
  // （call(1).foo(2) 形式）は中間の引数を repr に保持できないため、
  // パスのみを引き継ぐ簡略形とする。
  attrFallback(ctx, self, name) { return callBuilder(ctx, self, name); },
  attrs: dynAttrs({}, { call_list: true }, (ctx, self, name) => callBuilder(ctx, self, name)),
  methods: {
    call_list(ctx, self) { return LIST([self]); },
  },
  eq(ctx, self, other) { return callsEqual(ctx, self, other); },
  hash: () => null,
  repr(ctx, self) { return callRepr(ctx, self); },
};
function kwargsToDict(ctx, kwargs) {
  const d = DICT();
  for (const k of Object.keys(kwargs || {})) PyAPI.dictSet(d, k, kwargs[k]);
  return d;
}
// call オブジェクト（モジュールレベルの呼び出し可能オブジェクト）
const callFactory = { __native: 'unittest.mock._Call', mod: 'unittest.mock', data: { args: TUPLE([]), kwargs: DICT(), parent: null, name: '', __factory: true } };

function freshMockData(ctx, qual, name, parent) {
  return { calls: [], methodCalls: [], mockCalls: [], returnValue: null, sideEffect: undefined, qual, children: new Map(), name: name || '', parent: parent || null };
}
// R6：子モックの自動生成（attrFallback から呼ばれる）。同じ属性は同じ子を返す。
function getChildMock(ctx, self, name) {
  if (!self.data.children) self.data.children = new Map();
  if (self.data.children.has(name)) return self.data.children.get(name);
  const path = self.data.name ? self.data.name + '.' + name : name;
  const child = ctx.native(self.data.qual, freshMockData(ctx, self.data.qual, path, self));
  self.data.children.set(name, child);
  return child;
}
// R6：属性代入の書き戻し。return_value／side_effect はデータ本体へ、
// それ以外は属性バッグへ（読み取り側で attrs の次にバッグが見られるため、
// 子モックの自動生成より代入値が優先される。CPython と同じ優先順位）。
function setMockAttr(ctx, self, name, v) {
  if (name === 'return_value') { self.data.returnValue = v; return; }
  if (name === 'side_effect') { self.data.sideEffect = v; self.data._seIndex = 0; return; }
  if (!self.__attrsBag) self.__attrsBag = new Map();
  self.__attrsBag.set(name, v);
}
function getReturnValue(ctx, self) {
  if (!self.data.returnValue) self.data.returnValue = ctx.native(self.data.qual, freshMockData(ctx, self.data.qual));
  return self.data.returnValue;
}
function recordAndRespond(ctx, self, args, kwargs) {
  const kwd = kwargsToDict(ctx, kwargs);
  const c = callNative(ctx, args, kwd, '');
  self.data.calls.push(c);
  // R6：祖先の mock_calls／method_calls へドットパス付きで伝播する
  // （CPython 3.12.3 実走照合：m.a.b(3) で m.method_calls は [call.a.b(3)]、
  // m.a.method_calls は [call.b(3)]、自身の直接呼び出しは method_calls に
  // 入らず mock_calls に call(...) として入る）。
  const full = self.data.name || '';
  let node = self;
  while (node) {
    const anc = node.data.name || '';
    const rel = full === anc ? '' : (anc ? full.slice(anc.length + 1) : full);
    const entry = callNative(ctx, args, kwd, rel);
    if (!node.data.mockCalls) node.data.mockCalls = [];
    node.data.mockCalls.push(entry);
    if (rel !== '') { if (!node.data.methodCalls) node.data.methodCalls = []; node.data.methodCalls.push(entry); }
    node = node.data.parent;
  }
  const se = self.data.sideEffect;
  if (se !== undefined && se !== null && !ctx.isNone(se)) {
    if (se && se.__ncls) ctx.err(se.__ncls, '', '');
    if (se && se.__exc) ctx.err(se.kind, ctx.strOf(se), '');
    if (Array.isArray(ctx.listOf(se))) { /* iterable side_effect は下で処理 */ }
    const items = ctx.listOf(se);
    if (items) {
      if (!self.data._seIndex) self.data._seIndex = 0;
      if (self.data._seIndex >= items.length) ctx.err('StopIteration', '', '');
      const v = items[self.data._seIndex++];
      if (v && v.__exc) ctx.err(v.kind, ctx.strOf(v), '');
      return v;
    }
    if (ctx.isFunc(se) || (se && se.__native) || (se && se.__method) || (se && se.__builtin)) {
      const r = ctx.call(se, args);
      const def = STDLIB_CLASSES.get('unittest.mock._DefaultSentinel');
      if (r && r.__native === 'unittest.mock._DefaultSentinel') return getReturnValue(ctx, self);
      return r;
    }
  }
  return getReturnValue(ctx, self);
}
function assertFail(ctx, msg) { ctx.err('AssertionError', msg, ''); }
const MockMethods = {
  assert_called(ctx, self) { if (!self.data.calls.length) assertFail(ctx, 'Expected mock to have been called.'); return NONE; },
  assert_called_once(ctx, self) {
    if (self.data.calls.length !== 1) assertFail(ctx, 'Expected mock to have been called once. Called ' + self.data.calls.length + ' times.');
    return NONE;
  },
  assert_not_called(ctx, self) { if (self.data.calls.length) assertFail(ctx, 'Expected mock to not have been called. Called ' + self.data.calls.length + ' times.\nCalls: ' + self.data.calls.map((c) => callRepr(ctx, c)).join(', ') + '.'); return NONE; },
  assert_called_with(ctx, self, args, kwargs) {
    const expected = callNative(ctx, args, kwargsToDict(ctx, kwargs));
    const actual = self.data.calls[self.data.calls.length - 1];
    if (!actual) assertFail(ctx, 'Expected mock to have been called.');
    if (!callsEqual(ctx, expected, actual)) assertFail(ctx, 'expected call not found.\nExpected: ' + callRepr(ctx, expected) + '\nActual: ' + callRepr(ctx, actual));
    return NONE;
  },
  assert_called_once_with(ctx, self, args, kwargs) {
    MockMethods.assert_called_once(ctx, self);
    return MockMethods.assert_called_with(ctx, self, args, kwargs);
  },
  assert_any_call(ctx, self, args, kwargs) {
    const expected = callNative(ctx, args, kwargsToDict(ctx, kwargs));
    if (!self.data.calls.some((c) => callsEqual(ctx, expected, c))) assertFail(ctx, 'Mock was not called with the expected arguments');
    return NONE;
  },
  assert_has_calls(ctx, self, args, kwargs) {
    // R6：CPython と同様 mock_calls（子への呼び出しを含む相対パス付き）を
    // 対象に照合する。自身だけの呼び出しでは従来どおり calls と一致する。
    const actual = self.data.mockCalls || self.data.calls;
    const expectedList = ctx.listOf(args[0]) || [];
    const anyOrder = kwargs.any_order !== undefined ? ctx.truthy(kwargs.any_order) === true : false;
    if (anyOrder) {
      for (const e of expectedList) if (!actual.some((c) => callsEqual(ctx, e, c))) assertFail(ctx, 'Mock was not called with the expected arguments');
    } else {
      if (expectedList.length !== actual.length) assertFail(ctx, 'Expected mock to have been called with the expected calls');
      for (let i = 0; i < expectedList.length; i++) if (!callsEqual(ctx, expectedList[i], actual[i])) assertFail(ctx, 'Expected mock to have been called with the expected calls');
    }
    return NONE;
  },
  reset_mock(ctx, self, args, kwargs) {
    // R6：子モックと return_value も再帰的にリセットする（CPython 実走照合）。
    const resetNode = (n) => {
      if (!n || !n.data) return;
      n.data.calls = []; n.data.methodCalls = []; n.data.mockCalls = []; n.data._seIndex = 0;
      if (n.data.children) for (const ch of n.data.children.values()) resetNode(ch);
      if (n.data.returnValue) resetNode(n.data.returnValue);
    };
    resetNode(self);
    return NONE;
  },
  configure_mock(ctx, self, args, kwargs) {
    // R6：ドット記法キー（'foo.return_value' 等）は子モックを辿って設定する
    // （CPython 実走照合）。通常キーは属性として設定する。
    const applyKey = (key, val) => {
      const parts = String(key).split('.');
      let node = self;
      for (let i = 0; i < parts.length - 1; i++) node = getChildMock(ctx, node, parts[i]);
      setMockAttr(ctx, node, parts[parts.length - 1], val);
    };
    for (const k of Object.keys(kwargs || {})) applyKey(k, kwargs[k]);
    if (args.length && ctx.isDict(args[0])) for (const e of args[0].__dict.values()) applyKey(ctx.str(e.k) ?? ctx.strOf(e.k), e.v);
    return NONE;
  },
  attach_mock(ctx, self, args) {
    // R6：既存モックを子として取り付け、その呼び出しが親の method_calls／
    // mock_calls に現れるようにする（CPython 実走照合）。
    const other = args[0]; const name = ctx.str(args[1]) ?? '';
    if (!other || !other.__native || !other.data || !('calls' in other.data)) { ctx.diag('attach_mock: モックでない対象は未検証です'); return NONE; }
    other.data.parent = self;
    other.data.name = self.data.name ? self.data.name + '.' + name : name;
    if (!self.data.children) self.data.children = new Map();
    self.data.children.set(name, other);
    return NONE;
  },
  mock_add_spec(ctx, self, args) { ctx.diag('mock_add_spec は内省が必要で未検証です'); return NONE; },
};
const MockAttrs = {
  called: (ctx, self) => BOOL(self.data.calls.length > 0),
  call_count: (ctx, self) => NUM(self.data.calls.length, false),
  call_args: (ctx, self) => self.data.calls.length ? self.data.calls[self.data.calls.length - 1] : NONE,
  call_args_list: (ctx, self) => LIST(self.data.calls),
  method_calls: (ctx, self) => LIST((self.data.methodCalls || []).slice()),
  mock_calls: (ctx, self) => LIST((self.data.mockCalls || self.data.calls).slice()),
  return_value: (ctx, self) => getReturnValue(ctx, self),
  side_effect: (ctx, self) => self.data.sideEffect !== undefined ? self.data.sideEffect : NONE,
};
function mockDef(qual, callable) {
  const def = {
    typeName: qual.split('.').pop(),
    construct(ctx, args, kwargs) {
      const data = freshMockData(ctx, qual);
      if (kwargs && kwargs.return_value !== undefined) data.returnValue = kwargs.return_value;
      if (kwargs && kwargs.side_effect !== undefined) data.sideEffect = kwargs.side_effect;
      return ctx.native(qual, data);
    },
    methods: { ...MockMethods },
    // R6：未知属性は子モックを自動生成する。解決経路が2つあるため両方に
    // 配線する：(1) 属性読み取り経路は基盤の attrFallback、(2) メソッド
    // 呼び出し構文（m.foo(...)）の経路は def.attrs を引くため dynAttrs。
    // どちらも「属性バッグ（代入値）→子モック生成」の順で解決する。
    attrs: dynAttrs({ ...MockAttrs }, MockMethods, (ctx, self, name) =>
      (self.__attrsBag && self.__attrsBag.has(name)) ? self.__attrsBag.get(name) : getChildMock(ctx, self, name)),
    attrFallback(ctx, self, name) {
      if (name.startsWith('__')) return undefined;
      return getChildMock(ctx, self, name);
    },
    // R6：属性代入の書き戻し（return_value 等の attrs ゲッター優先対策）。
    setattr(ctx, self, name, v) { setMockAttr(ctx, self, name, v); },
    repr(ctx, self) { return '<' + qual + ' id=\'' + '0' + '\'>'; },
  };
  if (callable) def.call = (ctx, self, args, kwargs) => recordAndRespond(ctx, self, args, kwargs);
  return def;
}
const MagicDef = mockDef('unittest.mock.MagicMock', true);
MagicDef.len = (ctx, self) => 0;
MagicDef.iter = (ctx, self) => [];
const AnyDef = {
  typeName: '_ANY',
  eq(ctx, self, other) { return true; },
  hash: (ctx, self) => 'any',
  repr: () => 'ANY',
};
const SentinelDef = {
  typeName: '_Sentinel',
  // R6：sentinel.foo のような属性アクセスで一意な子センチネルを生成する
  // （同じ属性は同じオブジェクトを返す。CPython 実走照合）。
  attrFallback(ctx, self, name) {
    if (!self.data.children) self.data.children = new Map();
    if (!self.data.children.has(name)) {
      const childName = (self.data.name || 'sentinel') + '.' + name;
      self.data.children.set(name, ctx.native('unittest.mock._Sentinel', { name: childName, children: new Map() }));
    }
    return self.data.children.get(name);
  },
  repr: (ctx, self) => self.data.name || 'sentinel',
};
const DefaultDef = { typeName: '_DefaultSentinel', repr: () => 'DEFAULT' };
function unverifiedMock(name) {
  return (ctx) => { ctx.diag('unittest.mock.' + name + ' はエンジンでは意味論を確定できません（未検証）'); return ctx.unk(name + ' の結果'); };
}
const PatchDef = {
  typeName: '_patch',
  construct(ctx, args, kwargs) { return ctx.native('unittest.mock._patch', { target: args[0] }); },
  methods: {
    start(ctx, self) { ctx.diag('patch.start は差し替え先の書き換えを伴うため未検証です'); return ctx.native('unittest.mock.MagicMock', freshMockData(ctx, 'unittest.mock.MagicMock')); },
    stop(ctx, self) { return NONE; },
  },
  call(ctx, self, args) { ctx.diag('patch のデコレータ形式は未検証です'); return args.length ? args[0] : NONE; },
};
registerStdlibModule('unittest.mock', {
  constants: {
    ANY: { __native: 'unittest.mock._ANY', mod: 'unittest.mock', data: {} },
    DEFAULT: { __native: 'unittest.mock._DefaultSentinel', mod: 'unittest.mock', data: {} },
    FILTER_DIR: BOOL(true),
  },
  data: { call: callFactory, sentinel: { __native: 'unittest.mock._Sentinel', mod: 'unittest.mock', data: {} } },
  functions: {
    patch(ctx, args, kwargs) { return ctx.native('unittest.mock._patch', { target: args[0] }); },
    create_autospec: unverifiedMock('create_autospec'),
    mock_open: unverifiedMock('mock_open'),
    seal: unverifiedMock('seal'),
  },
  classes: {
    Mock: mockDef('unittest.mock.Mock', true),
    MagicMock: MagicDef,
    NonCallableMock: mockDef('unittest.mock.NonCallableMock', false),
    NonCallableMagicMock: mockDef('unittest.mock.NonCallableMagicMock', false),
    PropertyMock: { typeName: 'PropertyMock', parents: ['unittest.mock.Mock'] },
    AsyncMock: { typeName: 'AsyncMock' },
    ThreadingMock: { typeName: 'ThreadingMock' },
    _Call: CallDef, _ANY: AnyDef, _Sentinel: SentinelDef, _DefaultSentinel: DefaultDef, _patch: PatchDef,
  },
});
