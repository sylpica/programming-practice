/* 高度モード B7 G9：sys モジュールの意味論実装。
 * 裁定（b7-g9-report.md）：エンジン自身について真である項目だけを実値化する。
 * float_info の属性は IEEE 754 binary64 の事実、maxunicode は Unicode 仕様の事実、
 * getrecursionlimit はエンジンの呼び出し深さ上限（40）、exit は SystemExit 送出。
 * それ以外の環境・ビルド・起動状態の事実は実値化せず UNK（未検証）／未対応で止める。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, makeNative } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);
function unsupportedFn(fname, reason) { return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); }; }
function unverifiedFn(fname, reason) { return (ctx) => { ctx.diag(fname + '：' + reason + 'のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); }; }

/* ---- sys.float_info（structseq 相当のネイティブ値） ---- */
const FLOAT_INFO_FIELDS = ['max', 'max_exp', 'max_10_exp', 'min', 'min_exp', 'min_10_exp', 'dig', 'mant_dig', 'epsilon', 'radix', 'rounds'];
const FLOAT_INFO_VALS = [F(1.7976931348623157e308), I(1024), I(308), F(2.2250738585072014e-308), I(-1021), I(-307), I(15), I(53), F(2.220446049250313e-16), I(2), I(1)];
const FLOAT_INFO_ATTRS = {};
FLOAT_INFO_FIELDS.forEach((nm, idx) => { FLOAT_INFO_ATTRS[nm] = (ctx, self) => self.data.vals[idx]; });
const FLOAT_INFO_CLASS = {
  typeName: 'float_info',
  construct: (ctx) => ctx.err('TypeError', "'sys.float_info' object is not callable", ''),
  attrs: FLOAT_INFO_ATTRS,
  repr: (ctx, self) => 'sys.float_info(' + FLOAT_INFO_FIELDS.map((nm, i) => nm + '=' + ctx.repr(self.data.vals[i])).join(', ') + ')',
  len: () => 11,
  iter: (ctx, self) => self.data.vals,
  getitem: (ctx, self, key) => {
    if (key && key.__slice) return ctx.NOT_HANDLED;
    const n = ctx.int(key);
    if (n === null) { ctx.err('TypeError', 'tuple indices must be integers or slices', ''); return UNK(''); }
    let i = n; if (i < 0) i += 11;
    if (i < 0 || i >= 11) { ctx.err('IndexError', 'tuple index out of range', ''); return UNK(''); }
    return self.data.vals[i];
  },
  eq: (ctx, self, other) => {
    const ov = other && other.__native === 'sys.float_info' ? other.data.vals : ctx.listOf(other);
    if (!ov || ov.length !== 11) return false;
    for (let i = 0; i < 11; i++) { const e = ctx.eq(self.data.vals[i], ov[i]); if (e !== true) return e; }
    return true;
  },
  hash: (ctx, self) => 'sys.float_info:' + self.data.vals.map((v) => ctx.repr(v)).join(','),
};
const FLOAT_INFO_VALUE = makeNative('sys.float_info', { vals: FLOAT_INFO_VALS });

registerStdlibModule('sys', {
  classes: { float_info: FLOAT_INFO_CLASS },
  data: {
    float_info: FLOAT_INFO_VALUE,
    maxunicode: I(1114111),
    "__breakpointhook__": UNK('sys.__breakpointhook__ の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "__displayhook__": UNK('sys.__displayhook__ の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "__excepthook__": UNK('sys.__excepthook__ の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "__interactivehook__": UNK('sys.__interactivehook__ の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "__stderr__": UNK('sys.__stderr__ の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "__stdin__": UNK('sys.__stdin__ の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "__stdout__": UNK('sys.__stdout__ の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "__unraisablehook__": UNK('sys.__unraisablehook__ の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "_emscripten_info": UNK('sys._emscripten_info の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "_jit": UNK('sys._jit の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "_path0": UNK('sys._path0 の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "_xoptions": UNK('sys._xoptions の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "abi_info": UNK('sys.abi_info の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "abiflags": UNK('sys.abiflags の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "api_version": UNK('sys.api_version の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "argv": UNK('sys.argv の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "base_exec_prefix": UNK('sys.base_exec_prefix の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "base_prefix": UNK('sys.base_prefix の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "builtin_module_names": UNK('sys.builtin_module_names の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "byteorder": UNK('sys.byteorder の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "copyright": UNK('sys.copyright の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "dllhandle": UNK('sys.dllhandle の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "dont_write_bytecode": UNK('sys.dont_write_bytecode の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "exec_prefix": UNK('sys.exec_prefix の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "executable": UNK('sys.executable の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "flags": UNK('sys.flags の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "float_repr_style": UNK('sys.float_repr_style の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "hash_info": UNK('sys.hash_info の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "hexversion": UNK('sys.hexversion の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "implementation": UNK('sys.implementation の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "int_info": UNK('sys.int_info の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "last_exc": UNK('sys.last_exc の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "last_traceback": UNK('sys.last_traceback の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "last_type": UNK('sys.last_type の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "last_value": UNK('sys.last_value の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "lazy_modules": UNK('sys.lazy_modules の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "maxsize": UNK('sys.maxsize の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "meta_path": UNK('sys.meta_path の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "modules": UNK('sys.modules の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "orig_argv": UNK('sys.orig_argv の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "path": UNK('sys.path の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "path_hooks": UNK('sys.path_hooks の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "path_importer_cache": UNK('sys.path_importer_cache の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "platform": UNK('sys.platform の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "platlibdir": UNK('sys.platlibdir の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "prefix": UNK('sys.prefix の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "ps1": UNK('sys.ps1 の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "ps2": UNK('sys.ps2 の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "pycache_prefix": UNK('sys.pycache_prefix の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "stderr": UNK('sys.stderr の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "stdin": UNK('sys.stdin の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "stdlib_module_names": UNK('sys.stdlib_module_names の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "stdout": UNK('sys.stdout の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "thread_info": UNK('sys.thread_info の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "tracebacklimit": UNK('sys.tracebacklimit の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "version": UNK('sys.version の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "version_info": UNK('sys.version_info の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "warnoptions": UNK('sys.warnoptions の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
    "winver": UNK('sys.winver の値（CPython の実行環境事実であり、エンジン自身の事実ではないため未検証）'),
  },
  functions: {
    exit: (ctx, args, kwargs) => {
      if (Object.keys(kwargs || {}).length) ctx.err('TypeError', 'sys.exit() takes no keyword arguments', '');
      if (args.length > 1) ctx.err('TypeError', 'exit() takes at most 1 argument', '');
      const a = args.length ? args[0] : NONE;
      ctx.err('SystemExit', ctx.isNone(a) ? '' : ctx.strOf(a), '');
      return NONE;
    },
    getrecursionlimit: (ctx, args, kwargs) => {
      if (Object.keys(kwargs || {}).length || args.length) ctx.err('TypeError', 'sys.getrecursionlimit() takes no arguments', '');
      return I(40);
    },
    "_current_exceptions": unsupportedFn('sys._current_exceptions', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "_current_frames": unsupportedFn('sys._current_frames', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "_debugmallocstats": unsupportedFn('sys._debugmallocstats', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "_enablelegacywindowsfsencoding": unsupportedFn('sys._enablelegacywindowsfsencoding', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "_getframe": unsupportedFn('sys._getframe', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "_getframemodulename": unsupportedFn('sys._getframemodulename', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "_is_immortal": unsupportedFn('sys._is_immortal', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "_is_interned": unsupportedFn('sys._is_interned', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "activate_stack_trampoline": unsupportedFn('sys.activate_stack_trampoline', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "addaudithook": unsupportedFn('sys.addaudithook', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "audit": unsupportedFn('sys.audit', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "breakpointhook": unsupportedFn('sys.breakpointhook', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "call_tracing": unsupportedFn('sys.call_tracing', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "deactivate_stack_trampoline": unsupportedFn('sys.deactivate_stack_trampoline', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "displayhook": unsupportedFn('sys.displayhook', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "excepthook": unsupportedFn('sys.excepthook', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "get_asyncgen_hooks": unsupportedFn('sys.get_asyncgen_hooks', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "getandroidapilevel": unsupportedFn('sys.getandroidapilevel', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "getobjects": unsupportedFn('sys.getobjects', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "getrefcount": unsupportedFn('sys.getrefcount', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "getsizeof": unsupportedFn('sys.getsizeof', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "getwindowsversion": unsupportedFn('sys.getwindowsversion', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "is_stack_trampoline_active": unsupportedFn('sys.is_stack_trampoline_active', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "remote_exec": unsupportedFn('sys.remote_exec', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "set_asyncgen_hooks": unsupportedFn('sys.set_asyncgen_hooks', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "setprofile": unsupportedFn('sys.setprofile', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "settrace": unsupportedFn('sys.settrace', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "unraisablehook": unsupportedFn('sys.unraisablehook', 'エンジンに対応する実体（フック・フレーム・トレーサ・標準ストリーム等）が存在しない'),
    "_clear_internal_caches": unverifiedFn('sys._clear_internal_caches', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "_clear_type_cache": unverifiedFn('sys._clear_type_cache', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "_is_gil_enabled": unverifiedFn('sys._is_gil_enabled', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "exc_info": unverifiedFn('sys.exc_info', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "exception": unverifiedFn('sys.exception', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "get_coroutine_origin_tracking_depth": unverifiedFn('sys.get_coroutine_origin_tracking_depth', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "get_int_max_str_digits": unverifiedFn('sys.get_int_max_str_digits', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "get_lazy_imports": unverifiedFn('sys.get_lazy_imports', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "get_lazy_imports_filter": unverifiedFn('sys.get_lazy_imports_filter', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "getallocatedblocks": unverifiedFn('sys.getallocatedblocks', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "getdefaultencoding": unverifiedFn('sys.getdefaultencoding', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "getdlopenflags": unverifiedFn('sys.getdlopenflags', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "getfilesystemencodeerrors": unverifiedFn('sys.getfilesystemencodeerrors', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "getfilesystemencoding": unverifiedFn('sys.getfilesystemencoding', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "getprofile": unverifiedFn('sys.getprofile', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "getswitchinterval": unverifiedFn('sys.getswitchinterval', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "gettrace": unverifiedFn('sys.gettrace', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "getunicodeinternedsize": unverifiedFn('sys.getunicodeinternedsize', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "intern": unverifiedFn('sys.intern', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "is_finalizing": unverifiedFn('sys.is_finalizing', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "set_coroutine_origin_tracking_depth": unverifiedFn('sys.set_coroutine_origin_tracking_depth', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "set_int_max_str_digits": unverifiedFn('sys.set_int_max_str_digits', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "set_lazy_imports": unverifiedFn('sys.set_lazy_imports', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "set_lazy_imports_filter": unverifiedFn('sys.set_lazy_imports_filter', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "setdlopenflags": unverifiedFn('sys.setdlopenflags', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "setrecursionlimit": unverifiedFn('sys.setrecursionlimit', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない'),
    "setswitchinterval": unverifiedFn('sys.setswitchinterval', 'CPython の実行環境・ビルド・起動状態に依存し、エンジン自身の事実として確定できない')
  },
});
