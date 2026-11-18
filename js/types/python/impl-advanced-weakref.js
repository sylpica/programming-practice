/* 高度モード B7 G4：weakref モジュール（21件）。
 * このエンジンには GC がなく、参照対象の死（＝弱参照の失効）が観測できない。
 * そのため値の同一性に依存する項目はすべて未検証に倒し、診断を表示して
 * 未確定値を返す。ProxyTypes だけはクラス値のタプルとして束ね値で再現する。 */
import { registerStdlibModule, makeNativeClass } from './stdlib-registry.js';
import { TUPLE } from './impl-advanced-g4-common.js';

const REASON = 'このエンジンには GC がなく、弱参照の対象が破棄されたことを観測できないため再現できません';
function unkFn(label) {
  return (ctx, args) => { ctx.diag('weakref.' + label + '：' + REASON); return ctx.unk('weakref.' + label + ' の結果'); };
}
function unkClass(typeName) {
  return {
    typeName,
    construct: (ctx) => { ctx.diag('weakref.' + typeName + '：' + REASON); return ctx.unk('weakref.' + typeName + ' の値'); },
    call: (ctx) => { ctx.diag('weakref.' + typeName + ' の呼び出し：' + REASON); return ctx.unk('weakref.' + typeName + ' の呼び出し結果'); },
    methods: {
      alive: (ctx) => { ctx.diag('weakref.finalize.alive：' + REASON); return ctx.unk('alive の結果'); },
      detach: (ctx) => { ctx.diag('weakref.finalize.detach：' + REASON); return ctx.unk('detach() の結果'); },
      peek: (ctx) => { ctx.diag('weakref.finalize.peek：' + REASON); return ctx.unk('peek() の結果'); },
      atexit: (ctx) => { ctx.diag('weakref.finalize.atexit：' + REASON); return ctx.unk('atexit の結果'); },
      __callback__: (ctx) => { ctx.diag('weakref.ref.__callback__：' + REASON); return ctx.unk('__callback__ の結果'); },
    },
    attrs: {
      alive: (ctx) => { ctx.diag('weakref.finalize.alive：' + REASON); return ctx.unk('alive の値'); },
      atexit: (ctx) => { ctx.diag('weakref.finalize.atexit：' + REASON); return ctx.unk('atexit の値'); },
      __callback__: (ctx) => { ctx.diag('weakref.ref.__callback__：' + REASON); return ctx.unk('__callback__ の値'); },
    },
    truthy: () => true,
  };
}

const refDef = unkClass('ref');
const finalizeDef = unkClass('finalize');
const WeakKeyDictionaryDef = unkClass('WeakKeyDictionary');
const WeakValueDictionaryDef = unkClass('WeakValueDictionary');
WeakKeyDictionaryDef.methods.keyrefs = (ctx) => { ctx.diag('weakref.WeakKeyDictionary.keyrefs：' + REASON); return ctx.unk('keyrefs() の結果'); };
WeakValueDictionaryDef.methods.valuerefs = (ctx) => { ctx.diag('weakref.WeakValueDictionary.valuerefs：' + REASON); return ctx.unk('valuerefs() の結果'); };

registerStdlibModule('weakref', {
  data: {
    /* ProxyTypes は2つのクラス値のタプル（束ね値） */
    ProxyTypes: TUPLE([makeNativeClass('weakref.ProxyType'), makeNativeClass('weakref.CallableProxyType')]),
  },
  functions: {
    getweakrefcount: unkFn('getweakrefcount'),
    getweakrefs: unkFn('getweakrefs'),
    proxy: unkFn('proxy'),
  },
  classes: {
    ref: refDef,
    ReferenceType: refDef,
    ProxyType: unkClass('ProxyType'),
    CallableProxyType: unkClass('CallableProxyType'),
    WeakKeyDictionary: WeakKeyDictionaryDef,
    WeakMethod: unkClass('WeakMethod'),
    WeakSet: unkClass('WeakSet'),
    WeakValueDictionary: WeakValueDictionaryDef,
    finalize: finalizeDef,
  },
});
