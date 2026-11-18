/* 高度モード B7 G9：gc モジュール。エンジンに CPython の GC の実体はないため、
 * 操作系は未対応、状態照会系と定数は未検証（値を捏造しない）とする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);
function unsupportedFn(fname, reason) { return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); }; }
function unverifiedFn(fname, reason) { return (ctx) => { ctx.diag(fname + '：' + reason + 'のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); }; }
registerStdlibModule('gc', {
  data: {
    "DEBUG_COLLECTABLE": UNK('gc.DEBUG_COLLECTABLE の値（エンジンに GC の実体がないため未検証）'),
    "DEBUG_LEAK": UNK('gc.DEBUG_LEAK の値（エンジンに GC の実体がないため未検証）'),
    "DEBUG_SAVEALL": UNK('gc.DEBUG_SAVEALL の値（エンジンに GC の実体がないため未検証）'),
    "DEBUG_STATS": UNK('gc.DEBUG_STATS の値（エンジンに GC の実体がないため未検証）'),
    "DEBUG_UNCOLLECTABLE": UNK('gc.DEBUG_UNCOLLECTABLE の値（エンジンに GC の実体がないため未検証）'),
    "callbacks": UNK('gc.callbacks の値（エンジンに GC の実体がないため未検証）'),
    "garbage": UNK('gc.garbage の値（エンジンに GC の実体がないため未検証）'),
  },
  functions: {
    "collect": unsupportedFn('gc.collect', 'エンジンには CPython のガベージコレクタの実体がない'),
    "disable": unsupportedFn('gc.disable', 'エンジンには CPython のガベージコレクタの実体がない'),
    "enable": unsupportedFn('gc.enable', 'エンジンには CPython のガベージコレクタの実体がない'),
    "freeze": unsupportedFn('gc.freeze', 'エンジンには CPython のガベージコレクタの実体がない'),
    "set_debug": unsupportedFn('gc.set_debug', 'エンジンには CPython のガベージコレクタの実体がない'),
    "set_threshold": unsupportedFn('gc.set_threshold', 'エンジンには CPython のガベージコレクタの実体がない'),
    "unfreeze": unsupportedFn('gc.unfreeze', 'エンジンには CPython のガベージコレクタの実体がない'),
    "get_count": unverifiedFn('gc.get_count', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "get_debug": unverifiedFn('gc.get_debug', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "get_freeze_count": unverifiedFn('gc.get_freeze_count', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "get_objects": unverifiedFn('gc.get_objects', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "get_referents": unverifiedFn('gc.get_referents', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "get_referrers": unverifiedFn('gc.get_referrers', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "get_stats": unverifiedFn('gc.get_stats', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "get_threshold": unverifiedFn('gc.get_threshold', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "is_finalized": unverifiedFn('gc.is_finalized', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "is_tracked": unverifiedFn('gc.is_tracked', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない'),
    "isenabled": unverifiedFn('gc.isenabled', 'エンジンには CPython のガベージコレクタの実体がなく、状態値を確定できない')
  },
});
