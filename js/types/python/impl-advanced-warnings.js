/* 高度モード B7 G9：warnings モジュール。formatwarning は純粋な書式化のため実装する。
 * 警告カテゴリ（UserWarning 等）はエンジンの組み込み例外表に既にあるため二重登録しない。
 * フィルタ／レジストリ意味論はエンジンに無いため warn 系は未検証、catch_warnings は未対応。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);
function unsupportedFn(fname, reason) { return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); }; }
function unverifiedFn(fname, reason) { return (ctx) => { ctx.diag(fname + '：' + reason + 'のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); }; }
registerStdlibModule('warnings', {
  classes: {
    catch_warnings: {
      typeName: 'catch_warnings',
      construct: (ctx) => ctx.err('未対応', 'warnings.catch_warnings は本アプリの高度モードでは未対応です（with の出入りで警告状態を保存・復元する仕組みを再現できない）', ''),
    },
  },
  functions: {
    formatwarning: (ctx, args, kwargs) => {
      const kw = kwargs || {};
      const message = args.length > 0 ? args[0] : kw.message;
      const category = args.length > 1 ? args[1] : kw.category;
      const filename = args.length > 2 ? args[2] : kw.filename;
      const lineno = args.length > 3 ? args[3] : kw.lineno;
      const line = args.length > 4 ? args[4] : ('line' in kw ? kw.line : NONE);
      if (ctx.isUnk(message) || ctx.isUnk(category) || ctx.isUnk(filename) || ctx.isUnk(lineno)) { ctx.diag('warnings.formatwarning：引数が未確定値のため結果を確定しません'); return ctx.unk('warnings.formatwarning の結果'); }
      const msgStr = typeof message === 'string' ? message : ctx.strOf(message);
      let catName = null;
      if (category && category.__builtin) catName = category.__builtin;
      else if (category && category.__ncls) catName = category.__ncls.split('.').pop();
      if (catName === null) ctx.err('TypeError', 'category must be a Warning subclass', '');
      if (typeof filename !== 'string') ctx.err('TypeError', 'filename must be a string', '');
      const lno = ctx.int(lineno);
      if (lno === null) ctx.err('TypeError', 'lineno must be an integer', '');
      let out = filename + ':' + lno + ': ' + catName + ': ' + msgStr + '\n';
      if (typeof line === 'string' && line.trim() !== '') out += '  ' + line.trim() + '\n';
      return out;
    },
    "deprecated": unverifiedFn('warnings.deprecated', '警告フィルタと警告レジストリはインタプリタ全体の状態であり、エンジンの diag 機構は警告フィルタ意味論を持たない'),
    "filterwarnings": unverifiedFn('warnings.filterwarnings', '警告フィルタと警告レジストリはインタプリタ全体の状態であり、エンジンの diag 機構は警告フィルタ意味論を持たない'),
    "resetwarnings": unverifiedFn('warnings.resetwarnings', '警告フィルタと警告レジストリはインタプリタ全体の状態であり、エンジンの diag 機構は警告フィルタ意味論を持たない'),
    "showwarning": unverifiedFn('warnings.showwarning', '警告フィルタと警告レジストリはインタプリタ全体の状態であり、エンジンの diag 機構は警告フィルタ意味論を持たない'),
    "simplefilter": unverifiedFn('warnings.simplefilter', '警告フィルタと警告レジストリはインタプリタ全体の状態であり、エンジンの diag 機構は警告フィルタ意味論を持たない'),
    "warn": unverifiedFn('warnings.warn', '警告フィルタと警告レジストリはインタプリタ全体の状態であり、エンジンの diag 機構は警告フィルタ意味論を持たない'),
    "warn_explicit": unverifiedFn('warnings.warn_explicit', '警告フィルタと警告レジストリはインタプリタ全体の状態であり、エンジンの diag 機構は警告フィルタ意味論を持たない')
  },
});
