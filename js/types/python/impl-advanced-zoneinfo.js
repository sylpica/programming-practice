/* 高度モード B7 G6：zoneinfo モジュール（10件）。
 * 一次情報：公式ドキュメント 3.15 library/zoneinfo と CPython 3.12.3 実走。
 * エンジンには tz データベースが無いため、ZoneInfo の生成・TZPATH 探索は
 * 未検証に倒す（datetime.timezone で代用するような嘘はつかない）。
 * 例外クラスだけは対応付けを実装する。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { NONE } from './datetime-core-advanced.js';

const { UNK } = PyAPI;
const unverified = (ctx, what, why) => { ctx.diag('未検証：' + what + ' は ' + why + ' ため、この説明では値を確定できません'); return ctx.unk(what + '（未検証）'); };

const zoneInfoDef = {
  typeName: 'ZoneInfo',
  parents: ['datetime.tzinfo'],
  construct: (ctx, args) => unverified(ctx, 'zoneinfo.ZoneInfo', 'tz データベース未収載の'),
  classMethods: {
    from_file: (ctx) => unverified(ctx, 'zoneinfo.ZoneInfo.from_file()', 'TZif ファイルの読み込みと tz データ確定ができない'),
    clear_cache: (ctx) => unverified(ctx, 'zoneinfo.ZoneInfo.clear_cache()', 'キャッシュ対象の tz データが無い'),
    no_cache: (ctx) => unverified(ctx, 'zoneinfo.ZoneInfo.no_cache()', 'キャッシュ対象の tz データが無い'),
  },
  attrs: {
    key: (ctx) => unverified(ctx, 'zoneinfo.ZoneInfo.key', 'tz データベース未収載の'),
  },
  repr: (ctx, self) => 'zoneinfo.ZoneInfo(key=' + ctx.repr(self.data && self.data.key) + ')',
};

registerStdlibModule('zoneinfo', {
  constants: {
    TZPATH: UNK('TZPATH（実行環境の tz データ探索パス）'),
  },
  functions: {
    available_timezones: (ctx) => unverified(ctx, 'zoneinfo.available_timezones()', 'tz データベース未収載の'),
    reset_tzpath: (ctx) => ctx.err('未対応', 'zoneinfo.reset_tzpath() は TZPATH 設定を変更する操作のため、本アプリの高度モードでは未対応です', ''),
  },
  classes: {
    ZoneInfo: zoneInfoDef,
    ZoneInfoNotFoundError: { typeName: 'ZoneInfoNotFoundError', exc: 'zoneinfo.ZoneInfoNotFoundError', excParents: ['KeyError'] },
    InvalidTZPathWarning: { typeName: 'InvalidTZPathWarning', exc: 'zoneinfo.InvalidTZPathWarning', excParents: ['RuntimeWarning'] },
  },
});
void NONE;
