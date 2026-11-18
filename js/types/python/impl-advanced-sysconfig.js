/* 高度モード B7 G9：sysconfig モジュール。パス名の集合（get_path_names）だけは
 * 公式ドキュメントで定まるため実装し、パス・設定値そのものは環境依存で未検証とする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);
function unsupportedFn(fname, reason) { return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); }; }
function unverifiedFn(fname, reason) { return (ctx) => { ctx.diag(fname + '：' + reason + 'のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); }; }
registerStdlibModule('sysconfig', {
  functions: {
    get_path_names: (ctx, args, kwargs) => {
      if (args.length || Object.keys(kwargs || {}).length) ctx.err('TypeError', 'get_path_names() takes no arguments', '');
      return TUPLE(['stdlib', 'platstdlib', 'purelib', 'platlib', 'include', 'scripts', 'data']);
    },
    parse_config_h: unsupportedFn('sysconfig.parse_config_h', 'ファイルオブジェクトを前提とし、エンジンには実ファイルの実体がない'),
    "_get_preferred_schemes": unverifiedFn('sysconfig._get_preferred_schemes', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_config_h_filename": unverifiedFn('sysconfig.get_config_h_filename', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_config_var": unverifiedFn('sysconfig.get_config_var', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_config_vars": unverifiedFn('sysconfig.get_config_vars', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_default_scheme": unverifiedFn('sysconfig.get_default_scheme', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_makefile_filename": unverifiedFn('sysconfig.get_makefile_filename', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_path": unverifiedFn('sysconfig.get_path', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_paths": unverifiedFn('sysconfig.get_paths', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_platform": unverifiedFn('sysconfig.get_platform', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_preferred_scheme": unverifiedFn('sysconfig.get_preferred_scheme', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_python_version": unverifiedFn('sysconfig.get_python_version', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "get_scheme_names": unverifiedFn('sysconfig.get_scheme_names', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない'),
    "is_python_build": unverifiedFn('sysconfig.is_python_build', 'インストールレイアウト・ビルド設定は実行環境依存であり、エンジンには対応する事実が存在しない')
  },
});
