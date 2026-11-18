/* 高度モード B7 G9：platform モジュール。実行環境の識別情報はエンジンに実在しないため全関数を未検証とする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);
function unsupportedFn(fname, reason) { return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); }; }
function unverifiedFn(fname, reason) { return (ctx) => { ctx.diag(fname + '：' + reason + 'のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); }; }
registerStdlibModule('platform', {
  functions: {
    "android_ver": unverifiedFn('platform.android_ver', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "architecture": unverifiedFn('platform.architecture', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "freedesktop_os_release": unverifiedFn('platform.freedesktop_os_release', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "invalidate_caches": unverifiedFn('platform.invalidate_caches', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "ios_ver": unverifiedFn('platform.ios_ver', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "libc_ver": unverifiedFn('platform.libc_ver', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "mac_ver": unverifiedFn('platform.mac_ver', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "machine": unverifiedFn('platform.machine', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "node": unverifiedFn('platform.node', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "platform": unverifiedFn('platform.platform', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "processor": unverifiedFn('platform.processor', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "python_branch": unverifiedFn('platform.python_branch', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "python_build": unverifiedFn('platform.python_build', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "python_compiler": unverifiedFn('platform.python_compiler', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "python_implementation": unverifiedFn('platform.python_implementation', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "python_revision": unverifiedFn('platform.python_revision', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "python_version": unverifiedFn('platform.python_version', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "python_version_tuple": unverifiedFn('platform.python_version_tuple', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "release": unverifiedFn('platform.release', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "system": unverifiedFn('platform.system', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "system_alias": unverifiedFn('platform.system_alias', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "uname": unverifiedFn('platform.uname', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "version": unverifiedFn('platform.version', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "win32_edition": unverifiedFn('platform.win32_edition', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "win32_is_iot": unverifiedFn('platform.win32_is_iot', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない'),
    "win32_ver": unverifiedFn('platform.win32_ver', '実行環境（OS・CPU・インタプリタビルド）の識別情報であり、エンジンには対応する事実が存在しない')
  },
});
