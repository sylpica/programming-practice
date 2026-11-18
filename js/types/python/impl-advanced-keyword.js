/* 高度モード B7 G7：keyword。
 * kwlist/softkwlist は CPython 3.12.3 実走で取得した値。公式ドキュメント
 * 3.15 の keyword ページは一覧の値を掲載しておらず、3.13〜3.15 で
 * キーワード追加の公式発表も無いため、3.12.3 の一覧を 3.15 でも正とする
 * （報告書に残存として明記）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { LIST, BOOL, onlyKw } from './impl-advanced-g7-common.js';

export const KWLIST = ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'];
export const SOFTKWLIST = ['_', 'case', 'match', 'type'];

registerStdlibModule('keyword', {
  data: {
    kwlist: LIST([...KWLIST]),
    softkwlist: LIST([...SOFTKWLIST]),
  },
  functions: {
    iskeyword: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'keyword.iskeyword');
      if (args.length !== 1) ctx.err('TypeError', 'iskeyword() takes exactly one argument', '');
      if (typeof args[0] !== 'string') { if (ctx.isUnk(args[0])) return ctx.unk('iskeyword の結果'); return BOOL(false); }
      return BOOL(KWLIST.includes(args[0]));
    },
    issoftkeyword: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'keyword.issoftkeyword');
      if (args.length !== 1) ctx.err('TypeError', 'issoftkeyword() takes exactly one argument', '');
      if (typeof args[0] !== 'string') { if (ctx.isUnk(args[0])) return ctx.unk('issoftkeyword の結果'); return BOOL(false); }
      return BOOL(SOFTKWLIST.includes(args[0]));
    },
  },
});
