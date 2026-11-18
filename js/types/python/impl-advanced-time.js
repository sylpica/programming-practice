/* 高度モード B7 G6：time モジュール（55件）の意味論実装。
 * 一次情報：公式ドキュメント 3.15 library/time と CPython 3.12.3 実走。
 * 時刻源・OS・ローカル TZ に依存する値は捏造せず未検証（unk＋diag）に倒し、
 * 副作用のある呼び出し（sleep／clock_settime／tzset）は未対応として停止する。
 * gmtime（UTC）・strftime／strptime・asctime・struct_time は決定論的に実装する。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, NOT_HANDLED } from './stdlib-registry.js';
import {
  I, F, BOOL, NONE, TUPLE, fromOrdinal, toOrdinal, weekdayOf, ydayOf, daysInMonth,
  intArg, numArg, strArg, noKwargs, strftimeCore, strptimeCore, strptimeDate,
  DAY_ABBR, MONTH_ABBR, isoCalendar, sliceIdxList,
} from './datetime-core-advanced.js';

const { UNK } = PyAPI;
const STQ = 'time.struct_time';
const unverified = (ctx, what, why) => { ctx.diag('未検証：' + what + ' は ' + why + ' ため、この説明では値を確定できません'); return ctx.unk(what + '（未検証）'); };
const unsupportedFn = (what, why) => (ctx) => ctx.err('未対応', what + ' は ' + why + ' ため、本アプリの高度モードでは未対応です', '');
const unverifiedFn = (what, why) => (ctx) => unverified(ctx, what, why);

function fieldsOf(ctx, v, what) {
  if (v && v.__native === STQ) return { f: v.data.f, zone: v.data.zone, gmtoff: v.data.gmtoff };
  const items = ctx.listOf(v);
  if (items) {
    // CPython は struct_time 以外のタプルは9要素ちょうどだけを受け付ける
    // （11要素タプルは TypeError: illegal time tuple argument。実走確認済み）。
    if (items.length !== 9) ctx.err('TypeError', 'illegal time tuple argument（' + what + ' は9要素ちょうどが必要です）', '');
    const f = [];
    for (let i = 0; i < 9; i++) f.push(intArg(ctx, items[i], what + ' の要素'));
    return { f, zone: null, gmtoff: null };
  }
  ctx.err('TypeError', what + ' には struct_time かタプルを使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return null;
}
function checkFields(ctx, f) {
  if (f[1] < 1 || f[1] > 12) ctx.err('ValueError', 'month out of range', '');
  if (f[2] < 1 || f[2] > 31) ctx.err('ValueError', 'day out of range', '');
  if (f[3] < 0 || f[3] > 23) ctx.err('ValueError', 'hour out of range', '');
  if (f[4] < 0 || f[4] > 59) ctx.err('ValueError', 'minute out of range', '');
  if (f[5] < 0 || f[5] > 61) ctx.err('ValueError', 'second out of range', '');
  if (f[6] < 0 || f[6] > 6) ctx.err('ValueError', 'weekday out of range', '');
  if (f[7] < 1 || f[7] > 366) ctx.err('ValueError', 'day of year out of range', '');
}
const makeSt = (ctx, f, zone, gmtoff) => ctx.native(STQ, { f, zone: zone === undefined ? null : zone, gmtoff: gmtoff === undefined ? null : gmtoff });

const structTimeDef = {
  typeName: 'struct_time',
  construct: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'struct_time');
    if (args.length !== 1) ctx.err('TypeError', 'struct_time() にはシーケンスが1つ必要です', '');
    const items = ctx.listOf(args[0]);
    if (!items) ctx.err('TypeError', 'struct_time() にはシーケンスを使ってください', '');
    if (items.length < 9) ctx.err('TypeError', 'time.struct_time() takes an at least 9-sequence (' + items.length + '-sequence given)', '');
    if (items.length > 11) ctx.err('TypeError', 'time.struct_time() takes an at most 11-sequence (' + items.length + '-sequence given)', '');
    const f = [];
    for (let i = 0; i < 9; i++) f.push(intArg(ctx, items[i], 'struct_time の要素'));
    const zone = items.length > 9 ? ctx.str(items[9]) : null;
    const gmtoff = items.length > 10 ? ctx.int(items[10]) : null;
    return makeSt(ctx, f, zone, gmtoff);
  },
  attrs: {
    tm_year: (ctx, self) => I(self.data.f[0]),
    tm_mon: (ctx, self) => I(self.data.f[1]),
    tm_mday: (ctx, self) => I(self.data.f[2]),
    tm_hour: (ctx, self) => I(self.data.f[3]),
    tm_min: (ctx, self) => I(self.data.f[4]),
    tm_sec: (ctx, self) => I(self.data.f[5]),
    tm_wday: (ctx, self) => I(self.data.f[6]),
    tm_yday: (ctx, self) => I(self.data.f[7]),
    tm_isdst: (ctx, self) => I(self.data.f[8]),
    tm_zone: (ctx, self) => self.data.zone === null ? NONE : self.data.zone,
    tm_gmtoff: (ctx, self) => self.data.gmtoff === null ? NONE : I(self.data.gmtoff),
  },
  classAttrs: {
    n_fields: I(11),
    n_sequence_fields: I(9),
    n_unnamed_fields: I(0),
  },
  repr: (ctx, self) => {
    const f = self.data.f;
    const names = ['tm_year', 'tm_mon', 'tm_mday', 'tm_hour', 'tm_min', 'tm_sec', 'tm_wday', 'tm_yday', 'tm_isdst'];
    return 'time.struct_time(' + names.map((n, i) => n + '=' + f[i]).join(', ') + ')';
  },
  eq: (ctx, self, other) => {
    const t = ctx.listOf(other);
    if (t && t.length === 9) return self.data.f.every((v, i) => ctx.num(t[i]) === v);
    if (other && other.__native === STQ) return self.data.f.every((v, i) => other.data.f[i] === v);
    return false;
  },
  hash: (ctx, self) => 'st:' + self.data.f.join(','),
  len: () => 9,
  iter: (ctx, self) => self.data.f.map((v) => I(v)),
  getitem: (ctx, self, key) => {
    if (key && key.__slice) {
      return TUPLE(sliceIdxList(ctx, 9, key).map((j) => I(self.data.f[j])));
    }
    const ix = ctx.int(key);
    if (ix === null) return ctx.NOT_HANDLED;
    const j = ix < 0 ? ix + 9 : ix;
    if (j < 0 || j > 8) ctx.err('IndexError', 'tuple index out of range', '');
    return I(self.data.f[j]);
  },
};

function gmtimeImpl(ctx, args, kwargs) {
  noKwargs(ctx, kwargs, 'gmtime');
  if (!args.length || ctx.isNone(args[0])) return unverified(ctx, 'time.gmtime()', '引数省略時は現在の時刻に依存する');
  const sec = numArg(ctx, args[0], 'gmtime() の引数');
  if (!Number.isFinite(sec)) ctx.err('OverflowError', 'timestamp out of range for platform time_t', '');
  const days = Math.floor(sec / 86400);
  const rem = Math.floor(sec - days * 86400);
  const ord = 719163 + days;
  if (ord < 1 || ord > 3652059) ctx.err('OverflowError', 'timestamp out of range for platform time_t', '');
  const r = fromOrdinal(ord);
  const f = [r.y, r.m, r.d, Math.floor(rem / 3600), Math.floor((rem % 3600) / 60), rem % 60, (ord - 1) % 7, ydayOf(r.y, r.m, r.d), 0];
  return makeSt(ctx, f, 'GMT', 0);
}

const FUNCTIONS = {
  gmtime: gmtimeImpl,
  localtime: (ctx, args) => unverified(ctx, 'time.localtime()', 'ローカルタイムゾーンに依存する'),
  asctime: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'asctime');
    if (!args.length || ctx.isNone(args[0])) return unverified(ctx, 'time.asctime()', '引数省略時は現在の時刻に依存する');
    const { f } = fieldsOf(ctx, args[0], 'asctime() の引数');
    checkFields(ctx, f);
    const p2 = (n) => String(n).padStart(2, '0');
    return DAY_ABBR[f[6]] + ' ' + MONTH_ABBR[f[1]] + ' ' + String(f[2]).padStart(2, ' ') + ' ' + p2(f[3]) + ':' + p2(f[4]) + ':' + p2(f[5]) + ' ' + f[0];
  },
  ctime: (ctx) => unverified(ctx, 'time.ctime()', 'ローカルタイムゾーンと現在の時刻に依存する'),
  strftime: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'strftime');
    const fmt = strArg(ctx, args[0], 'strftime() の書式');
    if (args.length < 2 || ctx.isNone(args[1])) return unverified(ctx, 'time.strftime()', 'タプル省略時は現在のローカル時刻に依存する');
    const { f, zone, gmtoff } = fieldsOf(ctx, args[1], 'strftime() のタプル');
    checkFields(ctx, f);
    let iso = null;
    try { iso = isoCalendar(f[0], f[1], f[2]); } catch (e) { iso = null; }
    return strftimeCore({ y: f[0], m: f[1], d: f[2], H: f[3], M: f[4], S: f[5], us: 0, wdayMon: f[6], yday: f[7], tzOffsetSec: gmtoff, tzName: zone || '', iso }, fmt);
  },
  strptime: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'strptime');
    const data = strArg(ctx, args[0], 'strptime() の文字列');
    const fmt = args.length > 1 ? strArg(ctx, args[1], 'strptime() の書式') : '%a %b %d %H:%M:%S %Y';
    const res = strptimeCore(data, fmt);
    if (!res) ctx.err('ValueError', "time data '" + data + "' does not match format '" + fmt + "'", '');
    if (res.leftover) ctx.err('ValueError', 'unconverted data remains: ' + res.leftover, '');
    const dd = strptimeDate(res);
    if (dd.y < 1 || dd.mo < 1 || dd.mo > 12 || dd.d < 1 || dd.d > daysInMonth(dd.y, dd.mo)) ctx.err('ValueError', "time data '" + data + "' does not match format '" + fmt + "'", '');
    const f = [dd.y, dd.mo, dd.d, res.H || 0, res.M || 0, res.S || 0, weekdayOf(dd.y, dd.mo, dd.d), ydayOf(dd.y, dd.mo, dd.d), -1];
    return makeSt(ctx, f, null, res.tzOffsetSec);
  },
  mktime: (ctx) => unverified(ctx, 'time.mktime()', 'ローカルタイムゾーンに依存する'),
  time: unverifiedFn('time.time()', '現在の時刻は実行時の時刻源に依存する'),
  time_ns: unverifiedFn('time.time_ns()', '現在の時刻は実行時の時刻源に依存する'),
  monotonic: unverifiedFn('time.monotonic()', '単調クロックの値は実行環境に依存する'),
  monotonic_ns: unverifiedFn('time.monotonic_ns()', '単調クロックの値は実行環境に依存する'),
  perf_counter: unverifiedFn('time.perf_counter()', '性能カウンタの値は実行環境に依存する'),
  perf_counter_ns: unverifiedFn('time.perf_counter_ns()', '性能カウンタの値は実行環境に依存する'),
  process_time: unverifiedFn('time.process_time()', 'プロセス CPU 時間は実行環境に依存する'),
  process_time_ns: unverifiedFn('time.process_time_ns()', 'プロセス CPU 時間は実行環境に依存する'),
  thread_time: unverifiedFn('time.thread_time()', 'スレッド CPU 時間は実行環境に依存する'),
  thread_time_ns: unverifiedFn('time.thread_time_ns()', 'スレッド CPU 時間は実行環境に依存する'),
  clock_gettime: unverifiedFn('time.clock_gettime()', 'OS のクロック値は実行環境に依存する'),
  clock_gettime_ns: unverifiedFn('time.clock_gettime_ns()', 'OS のクロック値は実行環境に依存する'),
  clock_getres: unverifiedFn('time.clock_getres()', 'OS のクロック分解能は実行環境に依存する'),
  get_clock_info: unverifiedFn('time.get_clock_info()', 'クロックの実装情報は実行環境に依存する'),
  pthread_getcpuclockid: unverifiedFn('time.pthread_getcpuclockid()', 'OS のスレッドクロック ID は実行環境に依存する'),
  sleep: unsupportedFn('time.sleep()', '実時間の待機という副作用がある'),
  clock_settime: unsupportedFn('time.clock_settime()', 'システム時計を変更する副作用がある'),
  clock_settime_ns: unsupportedFn('time.clock_settime_ns()', 'システム時計を変更する副作用がある'),
  tzset: unsupportedFn('time.tzset()', 'プロセスのタイムゾーン設定を変更する副作用がある'),
};

registerStdlibModule('time', {
  constants: {
    CLOCK_BOOTTIME: UNK('プラットフォーム依存のクロック ID（time.CLOCK_BOOTTIME）'),
    CLOCK_HIGHRES: UNK('プラットフォーム依存のクロック ID（time.CLOCK_HIGHRES）'),
    CLOCK_MONOTONIC: UNK('プラットフォーム依存のクロック ID（time.CLOCK_MONOTONIC）'),
    CLOCK_MONOTONIC_RAW: UNK('プラットフォーム依存のクロック ID（time.CLOCK_MONOTONIC_RAW）'),
    CLOCK_MONOTONIC_RAW_APPROX: UNK('プラットフォーム依存のクロック ID（time.CLOCK_MONOTONIC_RAW_APPROX）'),
    CLOCK_PROCESS_CPUTIME_ID: UNK('プラットフォーム依存のクロック ID（time.CLOCK_PROCESS_CPUTIME_ID）'),
    CLOCK_PROF: UNK('プラットフォーム依存のクロック ID（time.CLOCK_PROF）'),
    CLOCK_REALTIME: UNK('プラットフォーム依存のクロック ID（time.CLOCK_REALTIME）'),
    CLOCK_TAI: UNK('プラットフォーム依存のクロック ID（time.CLOCK_TAI）'),
    CLOCK_THREAD_CPUTIME_ID: UNK('プラットフォーム依存のクロック ID（time.CLOCK_THREAD_CPUTIME_ID）'),
    CLOCK_UPTIME: UNK('プラットフォーム依存のクロック ID（time.CLOCK_UPTIME）'),
    CLOCK_UPTIME_RAW: UNK('プラットフォーム依存のクロック ID（time.CLOCK_UPTIME_RAW）'),
    CLOCK_UPTIME_RAW_APPROX: UNK('プラットフォーム依存のクロック ID（time.CLOCK_UPTIME_RAW_APPROX）'),
    timezone: UNK('ローカルタイムゾーンの UTC オフセット（time.timezone、実行環境依存）'),
    altzone: UNK('夏時間の UTC オフセット（time.altzone、実行環境依存）'),
    daylight: UNK('夏時間の有無（time.daylight、実行環境依存）'),
    tzname: UNK('ローカルタイムゾーン名（time.tzname、実行環境依存）'),
  },
  functions: FUNCTIONS,
  classes: { struct_time: structTimeDef },
});
export { structTimeDef };
