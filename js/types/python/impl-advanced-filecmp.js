/* 高度モード B7 G13：filecmp（22件）。
 * 実ファイルの比較が本体のため cmp／cmpfiles／dircmp は未対応。
 * DEFAULT_IGNORES（データ）と clear_cache（キャッシュを持たない本実装
 * では空操作が正確な意味論になる）だけを実装する。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  NONE, LIST, noKw, arity, unsupportedFn, unsupportedCtor,
} from './impl-advanced-g13-common.js';

const FS_REASON = '実ファイルの読み取りが必要なため';
const DIRCMP_MEMBERS = ['common', 'common_dirs', 'common_files', 'common_funny', 'diff_files', 'funny_files',
  'left', 'left_list', 'left_only', 'report', 'report_full_closure', 'report_partial_closure',
  'right', 'right_list', 'right_only', 'same_files', 'subdirs'];
const dircmpMethods = {};
for (const m of DIRCMP_MEMBERS) dircmpMethods[m] = unsupportedFn('filecmp.dircmp.' + m, FS_REASON);

registerStdlibModule('filecmp', {
  data: {
    DEFAULT_IGNORES: LIST(['RCS', 'CVS', 'tags', '.git', '.hg', '.bzr', '_darcs', '__pycache__']),
  },
  functions: {
    clear_cache: (ctx, args, kwargs) => { noKw(ctx, kwargs, 'clear_cache'); arity(ctx, args, 0, 0, 'clear_cache'); return NONE; },
    cmp: unsupportedFn('filecmp.cmp', FS_REASON),
    cmpfiles: unsupportedFn('filecmp.cmpfiles', FS_REASON),
  },
  classes: {
    dircmp: {
      typeName: 'dircmp',
      construct: unsupportedCtor('filecmp.dircmp', 'ディレクトリの読み取りが必要なため'),
      methods: dircmpMethods,
    },
  },
});
