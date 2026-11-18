/* 高度モード B7 G13：glob（4件）。
 * glob/iglob はファイルシステム走査が本体のため未対応。escape と
 * translate（3.13+）は純粋な文字列変換として実装する。
 * translate の一次情報は CPython 3.13 の Lib/glob.py（実走は 3.15
 * ドキュメントの例で照合）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  BOOL, UNK, isUnk, noKw, arity, strArg, globTranslate, unsupportedFn,
} from './impl-advanced-g13-common.js';

function escapeFn(ctx, args, kwargs) {
  // glob.escape(pathname, *, recursive=None) — recursive は駆動部に影響しない
  let pathname = args.length ? args[0] : undefined;
  for (const k of Object.keys(kwargs || {})) {
    if (k === 'pathname' && args.length === 0) pathname = kwargs[k];
    else if (k !== 'recursive') ctx.err('TypeError', "escape() got an unexpected keyword argument '" + k + "'", '');
  }
  if (pathname === undefined) ctx.err('TypeError', "escape() missing 1 required positional argument: 'pathname'", '');
  if (isUnk(pathname)) return UNK('escape');
  const s = strArg(ctx, pathname, 'escape() argument 1');
  if (s === null) return UNK('escape');
  // os.path.splitdrive は POSIX では常に ('', path) → 全体をエスケープする
  return s.replace(/[*?[]/g, (c) => '[' + c + ']');
}
function translateFn(ctx, args, kwargs) {
  if (args.length > 1) ctx.err('TypeError', 'translate() takes 1 positional argument but ' + args.length + ' were given', '');
  let pat = args.length ? args[0] : undefined;
  let recursive = false, includeHidden = false, seps = null;
  for (const k of Object.keys(kwargs || {})) {
    if (k === 'pat' && args.length === 0) pat = kwargs[k];
    else if (k === 'recursive') recursive = ctx.truthy(kwargs[k]);
    else if (k === 'include_hidden') includeHidden = ctx.truthy(kwargs[k]);
    else if (k === 'seps') seps = kwargs[k];
    else ctx.err('TypeError', "translate() got an unexpected keyword argument '" + k + "'", '');
  }
  if (pat === undefined) ctx.err('TypeError', "translate() missing 1 required positional argument: 'pat'", '');
  if (isUnk(pat)) return UNK('translate');
  const s = strArg(ctx, pat, 'translate() argument 1');
  if (s === null) return UNK('translate');
  let sepsStr = '/';
  if (seps !== null && seps !== undefined && !ctx.isNone(seps)) {
    if (isUnk(seps)) return UNK('translate');
    if (typeof seps === 'string') sepsStr = seps;
    else if (Array.isArray(ctx.listOf(seps))) sepsStr = ctx.listOf(seps).map((x) => ctx.str(x)).join('');
    else ctx.err('TypeError', 'seps must be a string or a sequence of strings', '');
  }
  return globTranslate(s, recursive, includeHidden, sepsStr === '' ? '/' : sepsStr);
}

registerStdlibModule('glob', {
  functions: {
    escape: escapeFn,
    translate: translateFn,
    glob: unsupportedFn('glob.glob', 'ファイルシステムの走査が必要なため'),
    iglob: unsupportedFn('glob.iglob', 'ファイルシステムの走査が必要なため'),
  },
});
