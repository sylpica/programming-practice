/* 高度モード B7 G4：contextlib モジュール（24件）。
 * エンジンの with 文は __enter__/__exit__ を呼ばない（本体は実行され as 変数は
 * 未確定値になる）ため、with の出入り自体が観測可能な挙動の中核である項目は
 * 未検証に倒す。非同期系と chdir（ファイルシステム依存）は未対応。
 * ExitStack は自前のネイティブ同士では enter_context/push の蓄積と close の
 * LIFO 実行を再現する（push したコールバックは close で実際に呼ばれる）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { NONE, BOOL, arity } from './impl-advanced-g4-common.js';

const WITH_REASON = 'このエンジンの with 文は __enter__/__exit__ を呼ばないため、with 依存の挙動は再現できません';
function withUnk(label) {
  return (ctx) => { ctx.diag('contextlib.' + label + '：' + WITH_REASON); return ctx.unk('contextlib.' + label + ' の値'); };
}
function unkClassWith(typeName, label) {
  return {
    typeName,
    construct: (ctx) => { ctx.diag('contextlib.' + (label || typeName) + '：' + WITH_REASON); return ctx.unk('contextlib.' + typeName + ' の値'); },
    methods: {
      __enter__: (ctx) => { ctx.diag(WITH_REASON); return ctx.unk('__enter__ の結果'); },
      __exit__: (ctx) => { ctx.diag(WITH_REASON); return BOOL(false); },
      aclose: (ctx) => { ctx.diag('非同期コンテキストマネージャはこのエンジンでは未対応です'); return ctx.unk('aclose() の結果'); },
    },
    truthy: () => true,
  };
}
function unsupportedClass(typeName) {
  return {
    typeName,
    construct: (ctx) => ctx.err('TypeError', 'contextlib.' + typeName + ' はこのエンジンでは未対応です（非同期処理は扱えません）', ''),
    truthy: () => true,
  };
}

/* ---- ExitStack ---- */
const ExitStackDef = {
  typeName: 'ExitStack',
  construct: (ctx, args) => {
    arity(ctx, args, 0, 0, 'ExitStack');
    return ctx.native('contextlib.ExitStack', { stack: [] });
  },
  methods: {
    callback: (ctx, self, args) => {
      if (!args.length) ctx.err('TypeError', 'callback() には呼び出し可能オブジェクトを渡してください', '');
      const [fn, ...rest] = args;
      self.data.stack.push(() => ctx.call(fn, rest));
      return fn;
    },
    close: (ctx, self) => {
      const stack = self.data.stack.splice(0).reverse();
      for (const cb of stack) cb();
      return NONE;
    },
    pop_all: (ctx, self) => {
      const next = ctx.native('contextlib.ExitStack', { stack: self.data.stack });
      self.data.stack = [];
      return next;
    },
    push: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'push');
      const exitFn = args[0];
      self.data.stack.push(() => { ctx.call(exitFn, [NONE, NONE, NONE]); });
      return exitFn;
    },
    enter_context: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'enter_context');
      ctx.diag('ExitStack.enter_context：' + WITH_REASON);
      return ctx.unk('enter_context() の結果');
    },
    enter_async_context: (ctx) => ctx.err('TypeError', 'enter_async_context はこのエンジンでは未対応です（非同期処理は扱えません）', ''),
    push_async_callback: (ctx) => ctx.err('TypeError', 'push_async_callback はこのエンジンでは未対応です（非同期処理は扱えません）', ''),
    push_async_exit: (ctx) => ctx.err('TypeError', 'push_async_exit はこのエンジンでは未対応です（非同期処理は扱えません）', ''),
    aclose: (ctx) => ctx.err('TypeError', 'aclose はこのエンジンでは未対応です（非同期処理は扱えません）', ''),
  },
  truthy: () => true,
};

const AbstractContextManagerDef = {
  typeName: 'AbstractContextManager',
  construct: (ctx) => ctx.err('TypeError',
    "Can't instantiate abstract class AbstractContextManager without an implementation for abstract methods '__aenter__', '__aexit__', '__enter__', '__exit__'",
    'AbstractContextManager は継承して使うための基底クラスです'),
  truthy: () => true,
};
const AbstractAsyncContextManagerDef = {
  typeName: 'AbstractAsyncContextManager',
  construct: (ctx) => ctx.err('TypeError', 'contextlib.AbstractAsyncContextManager はこのエンジンでは未対応です（非同期処理は扱えません）', ''),
  truthy: () => true,
};

registerStdlibModule('contextlib', {
  functions: {
    asynccontextmanager: (ctx) => { ctx.diag('contextlib.asynccontextmanager はこのエンジンでは未対応です（非同期処理は扱えません）'); return ctx.unk('asynccontextmanager の値'); },
    aclosing: (ctx) => { ctx.diag('contextlib.aclosing はこのエンジンでは未対応です（非同期処理は扱えません）'); return ctx.unk('aclosing の値'); },
    chdir: (ctx) => ctx.err('TypeError', 'contextlib.chdir はこのエンジンでは未対応です（ファイルシステムを扱えません）', ''),
    closing: withUnk('closing'),
    contextmanager: withUnk('contextmanager'),
    nullcontext: withUnk('nullcontext'),
    redirect_stderr: withUnk('redirect_stderr'),
    redirect_stdout: withUnk('redirect_stdout'),
    suppress: withUnk('suppress'),
  },
  classes: {
    AbstractContextManager: AbstractContextManagerDef,
    AbstractAsyncContextManager: AbstractAsyncContextManagerDef,
    AsyncContextDecorator: unsupportedClass('AsyncContextDecorator'),
    AsyncExitStack: unsupportedClass('AsyncExitStack'),
    ContextDecorator: unkClassWith('ContextDecorator'),
    ExitStack: ExitStackDef,
    closing: unkClassWith('closing'),
    nullcontext: unkClassWith('nullcontext'),
    redirect_stderr: unkClassWith('redirect_stderr', 'redirect_stderr'),
    redirect_stdout: unkClassWith('redirect_stdout', 'redirect_stdout'),
    suppress: unkClassWith('suppress'),
  },
});
