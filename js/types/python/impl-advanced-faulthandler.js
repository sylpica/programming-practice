/* 高度モード B7 G9：faulthandler モジュール。障害ダンプの仕組みはエンジンに存在しないため全関数を未対応とする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);
function unsupportedFn(fname, reason) { return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); }; }
function unverifiedFn(fname, reason) { return (ctx) => { ctx.diag(fname + '：' + reason + 'のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); }; }
registerStdlibModule('faulthandler', {
  functions: {
    "cancel_dump_traceback_later": unsupportedFn('faulthandler.cancel_dump_traceback_later', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない'),
    "disable": unsupportedFn('faulthandler.disable', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない'),
    "dump_c_stack": unsupportedFn('faulthandler.dump_c_stack', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない'),
    "dump_traceback": unsupportedFn('faulthandler.dump_traceback', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない'),
    "dump_traceback_later": unsupportedFn('faulthandler.dump_traceback_later', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない'),
    "enable": unsupportedFn('faulthandler.enable', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない'),
    "is_enabled": unsupportedFn('faulthandler.is_enabled', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない'),
    "register": unsupportedFn('faulthandler.register', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない'),
    "unregister": unsupportedFn('faulthandler.unregister', '障害ダンプ・トレースバック出力の仕組みはエンジンに存在しない')
  },
});
