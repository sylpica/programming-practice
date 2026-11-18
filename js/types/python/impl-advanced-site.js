/* 高度モード B7 G9：site モジュール。パス情報は環境依存で未検証。
 * StartupState と addsitedir は実インタプリタの状態変更であり未対応とする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);
function unsupportedFn(fname, reason) { return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); }; }
function unverifiedFn(fname, reason) { return (ctx) => { ctx.diag(fname + '：' + reason + 'のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); }; }
registerStdlibModule('site', {
  classes: {
    StartupState: {
      typeName: 'StartupState',
      construct: (ctx) => ctx.err('未対応', 'site.StartupState は本アプリの高度モードでは未対応です（実インタプリタの起動状態の実体がない）', ''),
      methods: {
        addsitedir: (ctx) => ctx.err('未対応', 'site.StartupState.addsitedir は本アプリの高度モードでは未対応です（sys.path の実体がない）', ''),
        addsitepackages: (ctx) => ctx.err('未対応', 'site.StartupState.addsitepackages は本アプリの高度モードでは未対応です（sys.path の実体がない）', ''),
        addusersitepackages: (ctx) => ctx.err('未対応', 'site.StartupState.addusersitepackages は本アプリの高度モードでは未対応です（sys.path の実体がない）', ''),
        process: (ctx) => ctx.err('未対応', 'site.StartupState.process は本アプリの高度モードでは未対応です（起動処理の実体がない）', ''),
      },
    },
  },
  data: {
    "ENABLE_USER_SITE": UNK('site.ENABLE_USER_SITE の値（実行環境依存のため未検証）'),
    "PREFIXES": UNK('site.PREFIXES の値（実行環境依存のため未検証）'),
    "USER_BASE": UNK('site.USER_BASE の値（実行環境依存のため未検証）'),
    "USER_SITE": UNK('site.USER_SITE の値（実行環境依存のため未検証）'),
  },
  functions: {
    addsitedir: unsupportedFn('site.addsitedir', '実インタプリタの sys.path を書き換える処理であり、エンジンには対応する実体がない'),
    "getsitepackages": unverifiedFn('site.getsitepackages', 'サイト固有パスの情報は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "getuserbase": unverifiedFn('site.getuserbase', 'サイト固有パスの情報は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "getusersitepackages": unverifiedFn('site.getusersitepackages', 'サイト固有パスの情報は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "main": unverifiedFn('site.main', 'サイト固有パスの情報は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "makepath": unverifiedFn('site.makepath', 'サイト固有パスの情報は実行環境依存であり、エンジンには対応する事実が存在しない')
  },
});
