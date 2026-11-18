/* 高度モード B7 G4：abc モジュール（10件）。
 * abstractmethod 等は関数をそのまま返すパススルーデコレータとして再現する
 * （抽象性の強制は基盤にない）。ABC は登録用クラス。ABCMeta.register は
 * ネイティブクラスの継承チェーンへ限定名を足し、isinstance に反映させる
 * （組み込み値・ユーザー定義クラスへの register は基盤外）。
 * get_cache_token は register のたびに変わる整数カウンタとして再現する。 */
import { registerStdlibModule, registerStdlibClass, nativeClassDef } from './stdlib-registry.js';
import { I, NONE, arity } from './impl-advanced-g4-common.js';

let cacheToken = 0;
function bumpToken() { cacheToken += 1; }

/* classMethods は (ctx, args, kwargs) しか受け取れないため、登録先の ABC は
 * クロージャに焼き込んで渡す */
function registerImpl(ctx, abcName, args) {
  arity(ctx, args, 1, 1, 'register');
  const target = args[0];
  if (target && target.__ncls) {
    const def = nativeClassDef(target.__ncls);
    if (def) {
      if (!def.parents) def.parents = [];
      if (abcName && !def.parents.includes(abcName)) def.parents.push(abcName);
      bumpToken();
      return target;
    }
  }
  ctx.diag('ABCMeta.register() はネイティブクラスに対してだけ再現できます（組み込み値・ユーザー定義クラスは基盤外です）');
  return target;
}
function registerFor(abcName) {
  return (ctx, args) => registerImpl(ctx, abcName, args);
}

function passthrough(name) {
  return (ctx, args) => { arity(ctx, args, 1, 1, name); return args[0]; };
}

const ABCDef = {
  typeName: 'ABC',
  construct: (ctx, args) => {
    if (!args.length) return ctx.native('abc.ABC', {});
    ctx.diag('abc.ABC の実体化は再現できません');
    return ctx.unk('ABC の値');
  },
  classMethods: {
    register: registerFor('abc.ABC'),
  },
  truthy: () => true,
};
const ABCMetaDef = {
  typeName: 'ABCMeta',
  construct: (ctx) => { ctx.diag('ABCMeta はメタクラスであり、クラスを生成する仕組みがこのエンジンにはないため再現できません'); return ctx.unk('ABCMeta の値'); },
  methods: {
    register: registerFor('abc.ABCMeta'),
    __subclasshook__: (ctx) => { ctx.diag('__subclasshook__ の戻り値 NotImplemented はこのエンジンでは表現できません'); return ctx.unk('__subclasshook__ の結果'); },
  },
  classMethods: {
    register: registerFor('abc.ABCMeta'),
  },
  truthy: () => true,
};

/* collections.abc のクラスにも register クラスメソッドを付け足す */
export function attachRegister(qualname) {
  const def = nativeClassDef(qualname);
  if (def && !def.classMethods) def.classMethods = {};
  if (def && def.classMethods && !def.classMethods.register) {
    def.classMethods.register = registerFor(qualname);
  }
}
const ABC_QUALNAMES = ['AsyncGenerator', 'AsyncIterable', 'AsyncIterator', 'Awaitable', 'Buffer', 'ByteString', 'Callable', 'Collection', 'Container', 'Coroutine', 'Generator', 'Hashable', 'ItemsView', 'Iterable', 'Iterator', 'KeysView', 'Mapping', 'MappingView', 'MutableMapping', 'MutableSequence', 'MutableSet', 'Reversible', 'Sequence', 'Set', 'Sized', 'ValuesView'];
export function attachRegisterToAbc() {
  for (const n of ABC_QUALNAMES) attachRegister('collections.abc.' + n);
}

registerStdlibModule('abc', {
  functions: {
    abstractmethod: passthrough('abstractmethod'),
    abstractclassmethod: passthrough('abstractclassmethod'),
    abstractstaticmethod: passthrough('abstractstaticmethod'),
    abstractproperty: passthrough('abstractproperty'),
    get_cache_token: (ctx) => I(cacheToken),
    update_abstractmethods: (ctx, args) => {
      arity(ctx, args, 1, 1, 'update_abstractmethods');
      ctx.diag('update_abstractmethods() はクラスの内部状態を書き換えるため、このエンジンでは何もしません');
      return NONE;
    },
  },
  classes: { ABC: ABCDef, ABCMeta: ABCMetaDef },
});
