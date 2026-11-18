/* 高度モード B7 G6：datetime モジュール（109件）の意味論実装。
 * 一次情報：公式ドキュメント 3.15 library/datetime と CPython 3.12.3 実走。
 * 暦は proleptic Gregorian、序数ベース整数演算（JS Date は使わない）。
 * 時刻源・ローカル TZ に依存する項目（today／now／naive な timestamp 等）は
 * 未検証として正直に停止する（ctx.unk＋diag）。%a 等の名前は C ロケール。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, makeNative, NOT_HANDLED } from './stdlib-registry.js';
import {
  I, F, BOOL, NONE, TUPLE, LIST, isLeap, daysInMonth, toOrdinal, fromOrdinal, MAXORDINAL,
  weekdayOf, ydayOf, isoCalendar, weeksInIsoYear, ordinalFromIso, tdNormalize, tdTotalUs,
  tdCheckRange, tdStr, tdRepr, intArg, numArg, strArg, noKwargs, roundHalfEven,
  strftimeCore, strptimeCore, strptimeDate, DAY_ABBR, MONTH_ABBR, US_PER_DAY, sliceIdxList,
} from './datetime-core-advanced.js';

const isN = (v, q) => !!v && v.__native === q;
const TDQ = 'datetime.timedelta', DQ = 'datetime.date', DTQ = 'datetime.datetime', TQ = 'datetime.time', TZQ = 'datetime.timezone';

/* ---------- 共通ヘルパ ---------- */
function bind(ctx, args, kwargs, names, fname) {
  const out = new Array(names.length).fill(undefined);
  args.forEach((a, i) => {
    if (i >= names.length) ctx.err('TypeError', fname + '() の引数が多すぎます（' + args.length + '個）', '');
    out[i] = a;
  });
  for (const k of Object.keys(kwargs || {})) {
    const ix = names.indexOf(k);
    if (ix < 0) ctx.err('TypeError', fname + '() にキーワード引数「' + k + '」はありません', '');
    if (out[ix] !== undefined) ctx.err('TypeError', fname + '() で引数「' + k + '」が重複しています', '');
    out[ix] = kwargs[k];
  }
  return out;
}
const makeTd = (ctx, data) => ctx.native(TDQ, data);
const tdFromUs = (ctx, total) => makeTd(ctx, tdCheckRange(ctx, tdNormalize(total)));
function tdData(ctx, v, what) {
  if (isN(v, TDQ)) return v.data;
  ctx.err('TypeError', what + ' には datetime.timedelta を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return null;
}
function checkDate(ctx, y, m, d) {
  if (y < 1 || y > 9999) ctx.err('ValueError', 'year ' + y + ' is out of range', '');
  if (m < 1 || m > 12) ctx.err('ValueError', 'month must be in 1..12', '');
  if (d < 1 || d > daysInMonth(y, m)) ctx.err('ValueError', 'day is out of range for month', '');
}
function checkTime(ctx, h, mi, s, us) {
  if (h < 0 || h > 23) ctx.err('ValueError', 'hour must be in 0..23', '');
  if (mi < 0 || mi > 59) ctx.err('ValueError', 'minute must be in 0..59', '');
  if (s < 0 || s > 59) ctx.err('ValueError', 'second must be in 0..59', '');
  if (us < 0 || us > 999999) ctx.err('ValueError', 'microsecond must be in 0..999999', '');
}
function checkFold(ctx, fold) {
  if (fold !== 0 && fold !== 1) ctx.err('ValueError', 'fold must be either 0 or 1', '');
}
function tzArgOk(ctx, v) {
  if (v === null || ctx.isNone(v)) return null;
  if (v && v.__native && (v.__native === 'datetime.tzinfo' || v.__native === TZQ || v.__native === 'zoneinfo.ZoneInfo')) return v;
  ctx.err('TypeError', 'tzinfo argument must be None or of a tzinfo subclass, not type ' + ctx.typeName(v), '');
  return null;
}
/* tz の utcoffset（マイクロ秒 BigInt）。naive（tz なし）は null、
 * 基礎 tzinfo は CPython どおり NotImplementedError、ZoneInfo は未検証 unk を返す。 */
function tzOffsetUs(ctx, tz, selfDesc) {
  if (tz === null || tz === undefined) return null;
  if (isN(tz, TZQ)) return tdTotalUs(tz.data.off);
  if (isN(tz, 'datetime.tzinfo')) ctx.err('NotImplementedError', 'a tzinfo subclass must implement utcoffset()', '');
  ctx.diag('未検証：ZoneInfo の UTC オフセットは tz データベース未収載のため確定できません');
  return 'unk';
}
function tzNameOf(ctx, tz, dtData) {
  if (tz === null || tz === undefined) return null;
  if (isN(tz, TZQ)) {
    if (tz.data.name) return tz.data.name;
    const t = tz.data.off;
    if (tdTotalUs(t) === 0n) return 'UTC';
    const totalSec = t.d * 86400 + t.s;
    const sign = totalSec < 0 || (totalSec === 0 && t.us < 0) ? '-' : '+';
    const a = Math.abs(totalSec);
    const hh = String(Math.floor(a / 3600)).padStart(2, '0'), mm = String(Math.floor((a % 3600) / 60)).padStart(2, '0'), ss = a % 60;
    let s = 'UTC' + sign + hh + ':' + mm;
    if (ss) s += ':' + String(ss).padStart(2, '0');
    if (t.us) s += '.' + String(Math.abs(t.us)).padStart(6, '0');
    return s;
  }
  if (isN(tz, 'datetime.tzinfo')) ctx.err('NotImplementedError', 'a tzinfo subclass must implement tzname()', '');
  return null; // ZoneInfo：名前はキー文字列だがオフセット確定に連動するため None 扱いにしない→呼び出し側で処理
}
function structTimeVal(ctx, f9, zone, gmtoff) {
  return ctx.native('time.struct_time', { f: f9, zone: zone === undefined ? null : zone, gmtoff: gmtoff === undefined ? null : gmtoff });
}
function timetupleOf(ctx, y, mo, d, h, mi, s, isdst) {
  return structTimeVal(ctx, [y, mo, d, h, mi, s, weekdayOf(y, mo, d), ydayOf(y, mo, d), isdst]);
}
const p2 = (n) => String(n).padStart(2, '0');
const p4 = (n) => String(n).padStart(4, '0');
function isoDateStr(y, m, d) { return p4(y) + '-' + p2(m) + '-' + p2(d); }
function timeStr(h, mi, s, us, timespec) {
  const ts = timespec || 'auto';
  if (ts === 'hours') return p2(h);
  if (ts === 'minutes') return p2(h) + ':' + p2(mi);
  let base = p2(h) + ':' + p2(mi) + ':' + p2(s);
  if (ts === 'seconds') return base;
  if (ts === 'milliseconds') return base + '.' + String(Math.floor(us / 1000)).padStart(3, '0');
  if (ts === 'microseconds') return base + '.' + String(us).padStart(6, '0');
  if (ts === 'auto') return us ? base + '.' + String(us).padStart(6, '0') : base;
  return null;
}
function tzIsoSuffix(ctx, tz) {
  if (tz === null || tz === undefined) return '';
  const off = tzOffsetUs(ctx, tz);
  if (off === 'unk') return '';
  if (off === null) return '';
  const totalUs = off;
  const sign = totalUs < 0n ? '-' : '+';
  const a = totalUs < 0n ? -totalUs : totalUs;
  const hh = Number(a / 3600000000n), mm = Number((a % 3600000000n) / 60000000n), ss = Number((a % 60000000n) / 1000000n), us = Number(a % 1000000n);
  let s = sign + p2(hh) + ':' + p2(mm);
  if (ss || us) s += ':' + p2(ss);
  if (us) s += '.' + String(us).padStart(6, '0');
  return s;
}
function strftimeFields(ctx, y, mo, d, h, mi, s, us, tz) {
  let offSec = null, tzName = '';
  if (tz) {
    const off = tzOffsetUs(ctx, tz);
    if (off !== null && off !== 'unk') offSec = Number(off / 1000000n);
    const nm = tzNameOf(ctx, tz);
    if (nm) tzName = nm;
  }
  return { y, m: mo, d, H: h, M: mi, S: s, us, wdayMon: weekdayOf(y, mo, d), yday: ydayOf(y, mo, d), tzOffsetSec: offSec, tzName, iso: isoCalendar(y, mo, d) };
}
function ctimeStr(y, mo, d, h, mi, s) {
  return DAY_ABBR[weekdayOf(y, mo, d)] + ' ' + MONTH_ABBR[mo] + ' ' + String(d).padStart(2, ' ') + ' ' + p2(h) + ':' + p2(mi) + ':' + p2(s) + ' ' + y;
}
const unverified = (ctx, what, why) => { ctx.diag('未検証：' + what + ' は ' + why + ' ため、この説明では値を確定できません'); return ctx.unk(what + '（未検証）'); };

/* ---------- timedelta ---------- */
function timedeltaConstruct(ctx, args, kwargs) {
  const names = ['days', 'seconds', 'microseconds', 'milliseconds', 'minutes', 'hours', 'weeks'];
  const vals = bind(ctx, args, kwargs, names, 'timedelta');
  const get = (i) => vals[i] === undefined ? 0 : numArg(ctx, vals[i], 'timedelta() の引数');
  // 全引数をマイクロ秒へ換算した合計（float 経路用）
  const usFloat = (get(6) * 7 + get(0)) * 86400000000 + get(5) * 3600000000 + get(4) * 60000000 + get(1) * 1000000 + get(3) * 1000 + get(2);
  const allInt = vals.every((v) => v === undefined || (ctx.isNum(v) && !v.f) || ctx.isBool(v));
  let total;
  if (allInt) {
    total = (BigInt(get(6)) * 7n + BigInt(get(0))) * US_PER_DAY + BigInt(get(5)) * 3600000000n + BigInt(get(4)) * 60000000n + BigInt(get(1)) * 1000000n + BigInt(get(3)) * 1000n + BigInt(get(2));
  } else {
    if (!Number.isFinite(usFloat)) ctx.err('OverflowError', 'timedelta value out of range', '');
    total = BigInt(roundHalfEven(usFloat));
  }
  const norm = tdNormalize(total);
  if (norm.d > 999999999 || norm.d < -999999999) {
    ctx.err('OverflowError', 'days=' + norm.d + '; must have magnitude <= 999999999', '');
  }
  return makeTd(ctx, norm);
}
const timedeltaDef = {
  typeName: 'timedelta',
  construct: timedeltaConstruct,
  attrs: {
    days: (ctx, self) => I(self.data.d),
    seconds: (ctx, self) => I(self.data.s),
    microseconds: (ctx, self) => I(self.data.us),
  },
  classAttrs: {
    min: (ctx) => makeTd(ctx, { d: -999999999, s: 0, us: 0 }),
    max: (ctx) => makeTd(ctx, { d: 999999999, s: 86399, us: 999999 }),
    resolution: (ctx) => makeTd(ctx, { d: 0, s: 0, us: 1 }),
  },
  methods: {
    total_seconds: (ctx, self) => {
      const total = tdTotalUs(self.data);
      const v = Number(total) / 1e6;
      return Number.isInteger(v) && Math.abs(Number(total)) % 1000000 === 0 ? F(v) : F(v);
    },
  },
  repr: (ctx, self) => tdRepr(self.data),
  str: (ctx, self) => tdStr(self.data),
  truthy: (ctx, self) => tdTotalUs(self.data) !== 0n,
  eq: (ctx, self, other) => isN(other, TDQ) ? tdTotalUs(self.data) === tdTotalUs(other.data) : (other === undefined ? null : false),
  hash: (ctx, self) => 'us:' + tdTotalUs(self.data).toString(),
  compare: (ctx, self, op, other) => {
    if (!isN(other, TDQ)) return null;
    const a = tdTotalUs(self.data), b = tdTotalUs(other.data);
    return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b;
  },
  binop: (ctx, self, op, other, reflected) => {
    const NH = ctx.NOT_HANDLED;
    const a = tdTotalUs(self.data);
    if (op === '==' || op === '!=') return NH;
    if (isN(other, TDQ)) {
      const b = tdTotalUs(other.data);
      if (op === '+') return tdFromUs(ctx, reflected ? b + a : a + b);
      if (op === '-') return reflected ? tdFromUs(ctx, b - a) : tdFromUs(ctx, a - b);
      if (op === '/') {
        if (b === 0n) ctx.err('ZeroDivisionError', 'division by zero', '');
        return F(Number(a) / Number(b));
      }
      if (op === '//') {
        if (b === 0n) ctx.err('ZeroDivisionError', 'division by zero', '');
        let q = a / b; if ((a % b !== 0n) && ((a < 0n) !== (b < 0n))) q -= 1n;
        return I(Number(q));
      }
      if (op === '%') {
        if (b === 0n) ctx.err('ZeroDivisionError', 'division by zero', '');
        let r = a % b; if (r !== 0n && ((r < 0n) !== (b < 0n))) r += b;
        return tdFromUs(ctx, r);
      }
      return NH;
    }
    if (ctx.isNum(other) || ctx.isBool(other)) {
      const n = ctx.num(other);
      const isInt = ctx.isBool(other) || !other.f;
      if (op === '*') {
        const total = isInt ? a * BigInt(Math.trunc(n)) : BigInt(roundHalfEven(Number(a) * n));
        return tdFromUs(ctx, total);
      }
      if (op === '/' && !reflected) {
        if (n === 0) ctx.err('ZeroDivisionError', 'division by zero', '');
        return tdFromUs(ctx, BigInt(roundHalfEven(Number(a) / n)));
      }
      if (op === '//' && !reflected) {
        if (n === 0) ctx.err('ZeroDivisionError', 'division by zero', '');
        if (isInt) {
          const bn = BigInt(Math.trunc(n));
          let q = a / bn; if ((a % bn !== 0n) && ((a < 0n) !== (bn < 0n))) q -= 1n;
          return tdFromUs(ctx, q);
        }
        return tdFromUs(ctx, BigInt(Math.floor(Number(a) / n)));
      }
      return NH;
    }
    return NH;
  },
  /* R5 フック配線：単項演算（-／+／abs()）。CPython 3.12.3 実走で照合：
   * -timedelta.max は OverflowError（days=-1000000000; must have magnitude
   * <= 999999999。コンストラクタと同じ文面）、abs(timedelta.min) は
   * timedelta(days=999999999) で範囲内。~ は NOT_HANDLED を返し、
   * 基盤の TypeError に委ねる（CPython も TypeError）。 */
  unary: (ctx, self, op) => {
    if (op === '+') return makeTd(ctx, { d: self.data.d, s: self.data.s, us: self.data.us });
    if (op === '-' || op === 'abs') {
      const total = tdTotalUs(self.data);
      if (op === 'abs' && total >= 0n) return makeTd(ctx, { d: self.data.d, s: self.data.s, us: self.data.us });
      const norm = tdNormalize(-total);
      if (norm.d > 999999999 || norm.d < -999999999) {
        ctx.err('OverflowError', 'days=' + norm.d + '; must have magnitude <= 999999999', '');
      }
      return makeTd(ctx, norm);
    }
    return NOT_HANDLED;
  },
};

/* ---------- date ---------- */
function dateConstruct(ctx, args, kwargs) {
  const vals = bind(ctx, args, kwargs, ['year', 'month', 'day'], 'date');
  if (vals.some((v) => v === undefined)) ctx.err('TypeError', 'date() には year, month, day の3引数が必要です', '');
  const y = intArg(ctx, vals[0], 'date() の year'), m = intArg(ctx, vals[1], 'date() の month'), d = intArg(ctx, vals[2], 'date() の day');
  checkDate(ctx, y, m, d);
  return ctx.native(DQ, { y, m, d });
}
const makeDate = (ctx, y, m, d) => ctx.native(DQ, { y, m, d });
function dateFromOrdinalChecked(ctx, ord) {
  if (ord < 1 || ord > MAXORDINAL) ctx.err('OverflowError', 'date value out of range', '');
  const r = fromOrdinal(ord);
  return makeDate(ctx, r.y, r.m, r.d);
}
function parseIsoDate(ctx, s, fname) {
  let mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) || /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (mm) {
    const y = +mm[1], mo = +mm[2], d = +mm[3];
    checkDate(ctx, y, mo, d);
    return { y, m: mo, d };
  }
  mm = /^(\d{4})-W(\d{2})(?:-(\d))?$/.exec(s) || /^(\d{4})W(\d{2})(\d)?$/.exec(s);
  if (mm) {
    const y = +mm[1], w = +mm[2], wd = mm[3] ? +mm[3] : 1;
    if (w < 1 || w > weeksInIsoYear(y)) ctx.err('ValueError', "Invalid isoformat string: '" + s + "'", '');
    if (wd < 1 || wd > 7) ctx.err('ValueError', "Invalid isoformat string: '" + s + "'", '');
    return fromOrdinal(ordinalFromIso(y, w, wd));
  }
  ctx.err('ValueError', "Invalid isoformat string: '" + s + "'", '');
  return null;
}
const dateDef = {
  typeName: 'date',
  construct: dateConstruct,
  attrs: {
    year: (ctx, self) => I(self.data.y),
    month: (ctx, self) => I(self.data.m),
    day: (ctx, self) => I(self.data.d),
  },
  classAttrs: {
    min: (ctx) => makeDate(ctx, 1, 1, 1),
    max: (ctx) => makeDate(ctx, 9999, 12, 31),
    resolution: (ctx) => makeTd(ctx, { d: 1, s: 0, us: 0 }),
  },
  classMethods: {
    today: (ctx) => unverified(ctx, 'date.today()', '現在の日付は実行時の時刻源に依存する'),
    fromtimestamp: (ctx) => unverified(ctx, 'date.fromtimestamp()', 'ローカルタイムゾーンに依存する'),
    fromordinal: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, 'date.fromordinal');
      if (args.length !== 1) ctx.err('TypeError', 'date.fromordinal() には引数が1つ必要です', '');
      return dateFromOrdinalChecked(ctx, intArg(ctx, args[0], 'date.fromordinal() の引数'));
    },
    fromisoformat: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, 'date.fromisoformat');
      const s = strArg(ctx, args[0], 'date.fromisoformat() の引数');
      const r = parseIsoDate(ctx, s, 'date.fromisoformat');
      return makeDate(ctx, r.y, r.m, r.d);
    },
    fromisocalendar: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, 'date.fromisocalendar');
      let y, w, wd;
      if (args.length === 1) {
        const t = ctx.listOf(args[0]);
        if (!t || t.length !== 3) ctx.err('TypeError', 'date.fromisocalendar() には (year, week, weekday) が必要です', '');
        y = intArg(ctx, t[0], 'year'); w = intArg(ctx, t[1], 'week'); wd = intArg(ctx, t[2], 'weekday');
      } else if (args.length === 3) {
        y = intArg(ctx, args[0], 'year'); w = intArg(ctx, args[1], 'week'); wd = intArg(ctx, args[2], 'weekday');
      } else ctx.err('TypeError', 'date.fromisocalendar() の引数の数が合いません', '');
      if (y < 1 || y > 9999) ctx.err('ValueError', 'Year is out of range: ' + y, '');
      if (w < 1 || w > weeksInIsoYear(y)) ctx.err('ValueError', 'Invalid week: ' + w, '');
      if (wd < 1 || wd > 7) ctx.err('ValueError', 'Invalid day: ' + wd + ' (range is [1, 7])', '');
      return dateFromOrdinalChecked(ctx, ordinalFromIso(y, w, wd));
    },
  },
  methods: {
    weekday: (ctx, self) => I(weekdayOf(self.data.y, self.data.m, self.data.d)),
    isoweekday: (ctx, self) => I(weekdayOf(self.data.y, self.data.m, self.data.d) + 1),
    toordinal: (ctx, self) => I(toOrdinal(self.data.y, self.data.m, self.data.d)),
    isocalendar: (ctx, self) => {
      const r = isoCalendar(self.data.y, self.data.m, self.data.d);
      return ctx.native('datetime.IsoCalendarDate', r);
    },
    isoformat: (ctx, self) => isoDateStr(self.data.y, self.data.m, self.data.d),
    ctime: (ctx, self) => ctimeStr(self.data.y, self.data.m, self.data.d, 0, 0, 0),
    timetuple: (ctx, self) => timetupleOf(ctx, self.data.y, self.data.m, self.data.d, 0, 0, 0, -1),
    replace: (ctx, self, args, kwargs) => {
      if (args.length) ctx.err('TypeError', 'date.replace() はキーワード引数で指定してください', '');
      const y = kwargs.year !== undefined ? intArg(ctx, kwargs.year, 'year') : self.data.y;
      const m = kwargs.month !== undefined ? intArg(ctx, kwargs.month, 'month') : self.data.m;
      const d = kwargs.day !== undefined ? intArg(ctx, kwargs.day, 'day') : self.data.d;
      for (const k of Object.keys(kwargs)) if (!['year', 'month', 'day'].includes(k)) ctx.err('TypeError', 'date.replace() にキーワード引数「' + k + '」はありません', '');
      checkDate(ctx, y, m, d);
      return makeDate(ctx, y, m, d);
    },
    strftime: (ctx, self, args, kwargs) => {
      noKwargs(ctx, kwargs, 'date.strftime');
      const fmt = strArg(ctx, args[0], 'date.strftime() の書式');
      return strftimeCore(strftimeFields(ctx, self.data.y, self.data.m, self.data.d, 0, 0, 0, 0, null), fmt);
    },
    __str__: (ctx, self) => isoDateStr(self.data.y, self.data.m, self.data.d),
    __format__: (ctx, self, args) => {
      const spec = args.length ? strArg(ctx, args[0], '__format__ の書式') : '';
      if (!spec) return isoDateStr(self.data.y, self.data.m, self.data.d);
      return strftimeCore(strftimeFields(ctx, self.data.y, self.data.m, self.data.d, 0, 0, 0, 0, null), spec);
    },
  },
  /* R5 フック配線：format()／f文字列の書式指定。空 spec は str(self)、
   * それ以外は __format__ メソッドと同じく全体を strftime 書式として解釈する
   * （CPython 3.12.3 実走：format(date, '>10') は '>10'、'hello' は 'hello'
   * と strftime の素通しになる）。 */
  format: (ctx, self, spec) => {
    if (!spec) return isoDateStr(self.data.y, self.data.m, self.data.d);
    return strftimeCore(strftimeFields(ctx, self.data.y, self.data.m, self.data.d, 0, 0, 0, 0, null), spec);
  },
  repr: (ctx, self) => 'datetime.date(' + self.data.y + ', ' + self.data.m + ', ' + self.data.d + ')',
  str: (ctx, self) => isoDateStr(self.data.y, self.data.m, self.data.d),
  eq: (ctx, self, other) => {
    if (isN(other, DQ) && !isN(other, DTQ)) return toOrdinal(self.data.y, self.data.m, self.data.d) === toOrdinal(other.data.y, other.data.m, other.data.d);
    return false;
  },
  hash: (ctx, self) => 'ord:' + toOrdinal(self.data.y, self.data.m, self.data.d),
  compare: (ctx, self, op, other) => {
    if (isN(other, DTQ)) ctx.err('TypeError', "can't compare datetime.datetime to datetime.date", '');
    if (!isN(other, DQ)) return null;
    const a = toOrdinal(self.data.y, self.data.m, self.data.d), b = toOrdinal(other.data.y, other.data.m, other.data.d);
    return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b;
  },
  binop: (ctx, self, op, other, reflected) => {
    const NH = ctx.NOT_HANDLED;
    const ord = toOrdinal(self.data.y, self.data.m, self.data.d);
    if (isN(other, TDQ)) {
      if (op === '+') return dateFromOrdinalChecked(ctx, ord + other.data.d);
      if (op === '-' && !reflected) return dateFromOrdinalChecked(ctx, ord - other.data.d);
      return NH;
    }
    if (isN(other, DQ) && !isN(other, DTQ) && op === '-' && !reflected) {
      return makeTd(ctx, tdNormalize(BigInt(ord - toOrdinal(other.data.y, other.data.m, other.data.d)) * US_PER_DAY));
    }
    return NH;
  },
};

/* IsoCalendarDate（isocalendar の戻り値。タプル互換の名前付きタプル） */
const isoCalDef = {
  typeName: 'IsoCalendarDate',
  attrs: {
    year: (ctx, self) => I(self.data.y),
    week: (ctx, self) => I(self.data.w),
    weekday: (ctx, self) => I(self.data.wd),
  },
  repr: (ctx, self) => 'datetime.IsoCalendarDate(year=' + self.data.y + ', week=' + self.data.w + ', weekday=' + self.data.wd + ')',
  eq: (ctx, self, other) => {
    const t = ctx.listOf(other);
    if (t && t.length === 3) return ctx.num(t[0]) === self.data.y && ctx.num(t[1]) === self.data.w && ctx.num(t[2]) === self.data.wd;
    if (isN(other, 'datetime.IsoCalendarDate')) return self.data.y === other.data.y && self.data.w === other.data.w && self.data.wd === other.data.wd;
    return false;
  },
  hash: (ctx, self) => 'iso:' + self.data.y + ',' + self.data.w + ',' + self.data.wd,
  len: () => 3,
  iter: (ctx, self) => [I(self.data.y), I(self.data.w), I(self.data.wd)],
  getitem: (ctx, self, key) => {
    const arr = [self.data.y, self.data.w, self.data.wd];
    if (key && key.__slice) return TUPLE(sliceIdxList(ctx, 3, key).map((j) => I(arr[j])));
    const ix = ctx.int(key);
    if (ix === null) return ctx.NOT_HANDLED;
    const j = ix < 0 ? ix + 3 : ix;
    if (j < 0 || j > 2) ctx.err('IndexError', 'tuple index out of range', '');
    return I(arr[j]);
  },
};

/* ---------- time ---------- */
function timeConstruct(ctx, args, kwargs) {
  const vals = bind(ctx, args, kwargs, ['hour', 'minute', 'second', 'microsecond', 'tzinfo', 'fold'], 'time');
  const gi = (i, name) => vals[i] === undefined ? 0 : intArg(ctx, vals[i], 'time() の ' + name);
  const h = gi(0, 'hour'), mi = gi(1, 'minute'), s = gi(2, 'second'), us = gi(3, 'microsecond');
  const fold = vals[5] === undefined ? 0 : intArg(ctx, vals[5], 'time() の fold');
  checkTime(ctx, h, mi, s, us);
  checkFold(ctx, fold);
  const tz = tzArgOk(ctx, vals[4] === undefined ? null : vals[4]);
  return ctx.native(TQ, { h, mi, s, us, tz, fold });
}
const makeTime = (ctx, data) => ctx.native(TQ, data);
function timeRepr(ctx, self) {
  const t = self.data;
  const parts = [t.h, t.mi];
  if (t.s || t.us) parts.push(t.s);
  if (t.us) parts.push(t.us);
  let r = 'datetime.time(' + parts.join(', ');
  if (t.tz) r += ', tzinfo=' + ctx.repr(t.tz);
  if (t.fold) r += ', fold=1';
  return r + ')';
}
function parseIsoTime(ctx, s) {
  // 戻り値 {h, mi, s, us, tzOffsetSec|null|'Z'}。失敗は ValueError。
  let rest = s, tzOff = null;
  const tzm = /(Z|[+-]\d{2}(?::?\d{2})?(?::?\d{2}(?:[.,]\d{1,6})?)?)$/.exec(rest);
  if (tzm && !/^\d+$/.test(rest)) {
    // 時刻部分の途中を掴まないよう、末尾オフセットとして妥当な場合だけ採用する
    tzOff = tzm[1];
    rest = rest.slice(0, rest.length - tzm[1].length);
  }
  const mm = /^(\d{2})(?::?(\d{2}))?(?::?(\d{2})(?:[.,](\d+))?)?$/.exec(rest);
  if (!mm) ctx.err('ValueError', "Invalid isoformat string: '" + s + "'", '');
  const h = +mm[1], mi = mm[2] ? +mm[2] : 0, sec = mm[3] ? +mm[3] : 0;
  let us = 0;
  if (mm[4]) us = parseInt(mm[4].slice(0, 6).padEnd(6, '0'), 10);
  checkTime(ctx, h, mi, sec, us);
  let offsetSec = null;
  if (tzOff === 'Z') offsetSec = 0;
  else if (tzOff) {
    const om = /^([+-])(\d{2})(?::?(\d{2}))?(?::?(\d{2}))?(?:[.,](\d{1,6}))?$/.exec(tzOff);
    let sec2 = parseInt(om[2], 10) * 3600 + (om[3] ? parseInt(om[3], 10) * 60 : 0) + (om[4] ? parseInt(om[4], 10) : 0);
    if (om[1] === '-') sec2 = -sec2;
    offsetSec = sec2;
  }
  return { h, mi, s: sec, us, offsetSec };
}
function tzFromOffsetSec(ctx, sec) {
  const td = tdNormalize(BigInt(sec) * 1000000n);
  return ctx.native(TZQ, { off: td, name: null });
}
const timeDef = {
  typeName: 'time',
  construct: timeConstruct,
  attrs: {
    hour: (ctx, self) => I(self.data.h),
    minute: (ctx, self) => I(self.data.mi),
    second: (ctx, self) => I(self.data.s),
    microsecond: (ctx, self) => I(self.data.us),
    tzinfo: (ctx, self) => self.data.tz || NONE,
    fold: (ctx, self) => I(self.data.fold),
  },
  classAttrs: {
    min: (ctx) => makeTime(ctx, { h: 0, mi: 0, s: 0, us: 0, tz: null, fold: 0 }),
    max: (ctx) => makeTime(ctx, { h: 23, mi: 59, s: 59, us: 999999, tz: null, fold: 0 }),
    resolution: (ctx) => makeTd(ctx, { d: 0, s: 0, us: 1 }),
  },
  classMethods: {
    fromisoformat: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, 'time.fromisoformat');
      const s = strArg(ctx, args[0], 'time.fromisoformat() の引数');
      const r = parseIsoTime(ctx, s);
      const tz = r.offsetSec === null ? null : tzFromOffsetSec(ctx, r.offsetSec);
      return makeTime(ctx, { h: r.h, mi: r.mi, s: r.s, us: r.us, tz, fold: 0 });
    },
  },
  methods: {
    isoformat: (ctx, self, args, kwargs) => {
      const ts = kwargs.timespec !== undefined ? strArg(ctx, kwargs.timespec, 'timespec') : (args.length ? strArg(ctx, args[0], 'timespec') : 'auto');
      const body = timeStr(self.data.h, self.data.mi, self.data.s, self.data.us, ts);
      if (body === null) ctx.err('ValueError', "Invalid timespec '" + ts + "'", '');
      return body + tzIsoSuffix(ctx, self.data.tz);
    },
    replace: (ctx, self, args, kwargs) => {
      if (args.length) ctx.err('TypeError', 'time.replace() はキーワード引数で指定してください', '');
      const g = (k, cur) => kwargs[k] !== undefined ? intArg(ctx, kwargs[k], k) : cur;
      const h = g('hour', self.data.h), mi = g('minute', self.data.mi), s = g('second', self.data.s), us = g('microsecond', self.data.us);
      const fold = kwargs.fold !== undefined ? intArg(ctx, kwargs.fold, 'fold') : self.data.fold;
      let tz = self.data.tz;
      if ('tzinfo' in kwargs) tz = tzArgOk(ctx, kwargs.tzinfo);
      for (const k of Object.keys(kwargs)) if (!['hour', 'minute', 'second', 'microsecond', 'tzinfo', 'fold'].includes(k)) ctx.err('TypeError', 'time.replace() にキーワード引数「' + k + '」はありません', '');
      checkTime(ctx, h, mi, s, us);
      checkFold(ctx, fold);
      return makeTime(ctx, { h, mi, s, us, tz, fold });
    },
    strftime: (ctx, self, args, kwargs) => {
      noKwargs(ctx, kwargs, 'time.strftime');
      const fmt = strArg(ctx, args[0], 'time.strftime() の書式');
      // 日付部を持たないため %Y 等の日付コードは CPython でも 1900-01-01 基準にはならず
      // time.strftime と同じく構造化時刻（1900-01-01）相当にはしない。CPython の
      // time.__format__／strftime は日付を 1900-01-01 として扱うためそれに合わせる。
      return strftimeCore(strftimeFields(ctx, 1900, 1, 1, self.data.h, self.data.mi, self.data.s, self.data.us, self.data.tz), fmt);
    },
    utcoffset: (ctx, self) => {
      if (!self.data.tz) return NONE;
      const off = tzOffsetUs(ctx, self.data.tz);
      if (off === 'unk') return unverified(ctx, 'time.utcoffset()', 'tz データベース未収載の');
      if (off === null) return NONE;
      return makeTd(ctx, tdNormalize(off));
    },
    dst: (ctx, self) => {
      if (!self.data.tz) return NONE;
      if (isN(self.data.tz, TZQ)) return NONE;
      if (isN(self.data.tz, 'datetime.tzinfo')) ctx.err('NotImplementedError', 'a tzinfo subclass must implement dst()', '');
      return unverified(ctx, 'time.dst()', 'tz データベース未収載の');
    },
    tzname: (ctx, self) => {
      if (!self.data.tz) return NONE;
      const nm = tzNameOf(ctx, self.data.tz);
      return nm === null ? NONE : nm;
    },
    __str__: (ctx, self) => timeStr(self.data.h, self.data.mi, self.data.s, self.data.us, 'auto') + tzIsoSuffix(ctx, self.data.tz),
    __format__: (ctx, self, args) => {
      const spec = args.length ? strArg(ctx, args[0], '__format__ の書式') : '';
      if (!spec) return timeStr(self.data.h, self.data.mi, self.data.s, self.data.us, 'auto') + tzIsoSuffix(ctx, self.data.tz);
      return strftimeCore(strftimeFields(ctx, 1900, 1, 1, self.data.h, self.data.mi, self.data.s, self.data.us, self.data.tz), spec);
    },
  },
  /* R5 フック配線：format()／f文字列。__format__ メソッドと同じ規則
   * （空 spec は str(self)、日付部は 1900-01-01 基準。CPython 実走：
   * format(time(3,4,5), '%Y') は '1900'）。 */
  format: (ctx, self, spec) => {
    if (!spec) return timeStr(self.data.h, self.data.mi, self.data.s, self.data.us, 'auto') + tzIsoSuffix(ctx, self.data.tz);
    return strftimeCore(strftimeFields(ctx, 1900, 1, 1, self.data.h, self.data.mi, self.data.s, self.data.us, self.data.tz), spec);
  },
  repr: timeRepr,
  str: (ctx, self) => timeStr(self.data.h, self.data.mi, self.data.s, self.data.us, 'auto') + tzIsoSuffix(ctx, self.data.tz),
  eq: (ctx, self, other) => {
    if (!isN(other, TQ)) return false;
    const a = self.data, b = other.data;
    const oa = a.tz ? tzOffsetUs(ctx, a.tz) : null, ob = b.tz ? tzOffsetUs(ctx, b.tz) : null;
    if (oa === 'unk' || ob === 'unk') return null;
    const aAware = oa !== null, bAware = ob !== null;
    if (aAware !== bAware) return false;
    const ka = BigInt(a.h * 3600 + a.mi * 60 + a.s) * 1000000n + BigInt(a.us) - (oa || 0n);
    const kb = BigInt(b.h * 3600 + b.mi * 60 + b.s) * 1000000n + BigInt(b.us) - (ob || 0n);
    return ka === kb;
  },
  hash: (ctx, self) => {
    const a = self.data;
    return 'time:' + a.h + ',' + a.mi + ',' + a.s + ',' + a.us;
  },
  compare: (ctx, self, op, other) => {
    if (!isN(other, TQ)) return null;
    const a = self.data, b = other.data;
    const oa = a.tz ? tzOffsetUs(ctx, a.tz) : null, ob = b.tz ? tzOffsetUs(ctx, b.tz) : null;
    if (oa === 'unk' || ob === 'unk') return null;
    if ((oa !== null) !== (ob !== null)) ctx.err('TypeError', "can't compare offset-naive and offset-aware times", '');
    const ka = BigInt(a.h * 3600 + a.mi * 60 + a.s) * 1000000n + BigInt(a.us) - (oa || 0n);
    const kb = BigInt(b.h * 3600 + b.mi * 60 + b.s) * 1000000n + BigInt(b.us) - (ob || 0n);
    return op === '<' ? ka < kb : op === '<=' ? ka <= kb : op === '>' ? ka > kb : ka >= kb;
  },
};

/* ---------- datetime ---------- */
function datetimeConstruct(ctx, args, kwargs) {
  const vals = bind(ctx, args, kwargs, ['year', 'month', 'day', 'hour', 'minute', 'second', 'microsecond', 'tzinfo', 'fold'], 'datetime');
  if (vals[0] === undefined || vals[1] === undefined || vals[2] === undefined) ctx.err('TypeError', 'datetime() には year, month, day が必要です', '');
  const y = intArg(ctx, vals[0], 'year'), mo = intArg(ctx, vals[1], 'month'), d = intArg(ctx, vals[2], 'day');
  const gi = (i, name) => vals[i] === undefined ? 0 : intArg(ctx, vals[i], 'datetime() の ' + name);
  const h = gi(3, 'hour'), mi = gi(4, 'minute'), s = gi(5, 'second'), us = gi(6, 'microsecond');
  const fold = vals[8] === undefined ? 0 : intArg(ctx, vals[8], 'fold');
  checkDate(ctx, y, mo, d);
  checkTime(ctx, h, mi, s, us);
  checkFold(ctx, fold);
  const tz = tzArgOk(ctx, vals[7] === undefined ? null : vals[7]);
  return ctx.native(DTQ, { y, m: mo, d, h, mi, s, us, tz, fold });
}
const makeDt = (ctx, data) => ctx.native(DTQ, data);
function dtKeyUs(ctx, data) {
  // UTC 換算した通算マイクロ秒（BigInt）。naive はそのまま。'unk' を返すことがある。
  let base = BigInt(toOrdinal(data.y, data.m, data.d)) * US_PER_DAY + BigInt(data.h * 3600 + data.mi * 60 + data.s) * 1000000n + BigInt(data.us);
  if (data.tz) {
    const off = tzOffsetUs(ctx, data.tz);
    if (off === 'unk') return 'unk';
    if (off !== null) base -= off;
  }
  return base;
}
function dtAware(ctx, data) {
  if (!data.tz) return false;
  const off = tzOffsetUs(ctx, data.tz);
  return off !== null; // 'unk' の場合は呼び出し側で別途処理する
}
function dtFromKeyUs(ctx, key, tz, fold) {
  let days = key / US_PER_DAY;
  let rem = key - days * US_PER_DAY;
  if (rem < 0n) { days -= 1n; rem += US_PER_DAY; }
  const ord = Number(days);
  if (ord < 1 || ord > MAXORDINAL) ctx.err('OverflowError', 'date value out of range', '');
  const r = fromOrdinal(ord);
  const sec = Number(rem / 1000000n), us = Number(rem % 1000000n);
  return makeDt(ctx, { y: r.y, m: r.m, d: r.d, h: Math.floor(sec / 3600), mi: Math.floor((sec % 3600) / 60), s: sec % 60, us, tz: tz || null, fold: fold || 0 });
}
function dtRepr(ctx, self) {
  const t = self.data;
  const parts = [t.y, t.m, t.d];
  if (t.h || t.mi || t.s || t.us) { parts.push(t.h); parts.push(t.mi); }
  if (t.s || t.us) parts.push(t.s);
  if (t.us) parts.push(t.us);
  let r = 'datetime.datetime(' + parts.join(', ');
  if (t.tz) r += ', tzinfo=' + ctx.repr(t.tz);
  if (t.fold) r += ', fold=1';
  return r + ')';
}
function dtIso(ctx, self, sep, timespec) {
  const t = self.data;
  const body = timeStr(t.h, t.mi, t.s, t.us, timespec || 'auto');
  if (body === null) ctx.err('ValueError', "Invalid timespec '" + timespec + "'", '');
  return isoDateStr(t.y, t.m, t.d) + sep + body + tzIsoSuffix(ctx, t.tz);
}
const datetimeDef = {
  typeName: 'datetime',
  parents: ['datetime.date'],
  construct: datetimeConstruct,
  attrs: {
    year: (ctx, self) => I(self.data.y),
    month: (ctx, self) => I(self.data.m),
    day: (ctx, self) => I(self.data.d),
    hour: (ctx, self) => I(self.data.h),
    minute: (ctx, self) => I(self.data.mi),
    second: (ctx, self) => I(self.data.s),
    microsecond: (ctx, self) => I(self.data.us),
    tzinfo: (ctx, self) => self.data.tz || NONE,
    fold: (ctx, self) => I(self.data.fold),
  },
  classAttrs: {
    min: (ctx) => makeDt(ctx, { y: 1, m: 1, d: 1, h: 0, mi: 0, s: 0, us: 0, tz: null, fold: 0 }),
    max: (ctx) => makeDt(ctx, { y: 9999, m: 12, d: 31, h: 23, mi: 59, s: 59, us: 999999, tz: null, fold: 0 }),
    resolution: (ctx) => makeTd(ctx, { d: 0, s: 0, us: 1 }),
  },
  classMethods: {
    today: (ctx) => unverified(ctx, 'datetime.today()', '現在の日時は実行時の時刻源とローカルタイムゾーンに依存する'),
    now: (ctx) => unverified(ctx, 'datetime.now()', '現在の日時は実行時の時刻源に依存する'),
    utcnow: (ctx) => unverified(ctx, 'datetime.utcnow()', '現在の日時は実行時の時刻源に依存する'),
    fromtimestamp: (ctx, args, kwargs) => {
      const ts = args.length ? numArg(ctx, args[0], 'datetime.fromtimestamp() の引数') : (kwargs.timestamp !== undefined ? numArg(ctx, kwargs.timestamp, 'timestamp') : null);
      if (ts === null) ctx.err('TypeError', 'datetime.fromtimestamp() には timestamp が必要です', '');
      const tz = kwargs.tz !== undefined ? tzArgOk(ctx, kwargs.tz) : (args.length > 1 ? tzArgOk(ctx, args[1]) : null);
      if (!tz) return unverified(ctx, 'datetime.fromtimestamp()', 'tz 省略時はローカルタイムゾーンに依存する');
      const off = tzOffsetUs(ctx, tz);
      if (off === 'unk' || off === null) return unverified(ctx, 'datetime.fromtimestamp()', 'tz のオフセットが確定できない');
      const totalUs = BigInt(roundHalfEven(ts * 1e6)) + off;
      // UTC 基準の序数へ：1970-01-01 の序数は 719163
      const key = totalUs + BigInt(719163) * US_PER_DAY;
      return dtFromKeyUs(ctx, key, tz, 0);
    },
    utcfromtimestamp: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, 'datetime.utcfromtimestamp');
      const ts = numArg(ctx, args[0], 'datetime.utcfromtimestamp() の引数');
      const totalUs = BigInt(roundHalfEven(ts * 1e6));
      const key = totalUs + BigInt(719163) * US_PER_DAY;
      return dtFromKeyUs(ctx, key, null, 0);
    },
    fromordinal: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, 'datetime.fromordinal');
      const ord = intArg(ctx, args[0], 'datetime.fromordinal() の引数');
      const dv = dateFromOrdinalChecked(ctx, ord);
      return makeDt(ctx, { y: dv.data.y, m: dv.data.m, d: dv.data.d, h: 0, mi: 0, s: 0, us: 0, tz: null, fold: 0 });
    },
    fromisoformat: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, 'datetime.fromisoformat');
      const s = strArg(ctx, args[0], 'datetime.fromisoformat() の引数');
      // 日付部と時刻部の分離：日付は 10 文字（拡張）または 8 文字（基本）、週日付も可
      let datePart, timePart = null;
      const wmatch = /^(\d{4}-W\d{2}(?:-\d)?|\d{4}W\d{2}\d?)/.exec(s);
      if (wmatch) {
        datePart = wmatch[1];
        const rest = s.slice(datePart.length);
        if (rest) {
          if (rest.length < 2) ctx.err('ValueError', "Invalid isoformat string: '" + s + "'", '');
          timePart = rest.slice(1);
        }
      } else if (s.length > 10 && (s[10] === 'T' || s[10] === ' ' || !/[0-9]/.test(s[10]))) {
        datePart = s.slice(0, 10); timePart = s.slice(11);
      } else if (s.length > 8 && !/[0-9]/.test(s[8])) {
        datePart = s.slice(0, 8); timePart = s.slice(9);
      } else datePart = s;
      const dv = parseIsoDate(ctx, datePart, 'datetime.fromisoformat');
      let tm = { h: 0, mi: 0, s: 0, us: 0, offsetSec: null };
      if (timePart !== null) tm = parseIsoTime(ctx, timePart);
      const tz = tm.offsetSec === null ? null : tzFromOffsetSec(ctx, tm.offsetSec);
      return makeDt(ctx, { y: dv.y, m: dv.m, d: dv.d, h: tm.h, mi: tm.mi, s: tm.s, us: tm.us, tz, fold: 0 });
    },
    fromisocalendar: (ctx, args, kwargs) => {
      const dv = dateDef.classMethods.fromisocalendar(ctx, args, kwargs);
      return makeDt(ctx, { y: dv.data.y, m: dv.data.m, d: dv.data.d, h: 0, mi: 0, s: 0, us: 0, tz: null, fold: 0 });
    },
    combine: (ctx, args, kwargs) => {
      const dv = args[0], tv = args[1];
      if (!isN(dv, DQ)) ctx.err('TypeError', 'datetime.combine() の第1引数には date を使ってください', '');
      if (!isN(tv, TQ)) ctx.err('TypeError', 'datetime.combine() の第2引数には time を使ってください', '');
      let tz = tv.data.tz;
      if (args.length > 2) tz = tzArgOk(ctx, args[2]);
      if (kwargs.tzinfo !== undefined) tz = tzArgOk(ctx, kwargs.tzinfo);
      return makeDt(ctx, { y: dv.data.y, m: dv.data.m, d: dv.data.d, h: tv.data.h, mi: tv.data.mi, s: tv.data.s, us: tv.data.us, tz, fold: tv.data.fold });
    },
    strptime: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, 'datetime.strptime');
      const data = strArg(ctx, args[0], 'datetime.strptime() の文字列');
      const fmt = strArg(ctx, args[1], 'datetime.strptime() の書式');
      const res = strptimeCore(data, fmt);
      if (!res) ctx.err('ValueError', "time data '" + data + "' does not match format '" + fmt + "'", '');
      if (res.leftover) ctx.err('ValueError', 'unconverted data remains: ' + res.leftover, '');
      const dd = strptimeDate(res);
      checkDate(ctx, dd.y, dd.mo, dd.d);
      const tz = res.tzOffsetSec === null ? null : tzFromOffsetSec(ctx, res.tzOffsetSec);
      return makeDt(ctx, { y: dd.y, m: dd.mo, d: dd.d, h: res.H || 0, mi: res.M || 0, s: res.S || 0, us: res.us || 0, tz, fold: 0 });
    },
  },
  methods: {
    date: (ctx, self) => makeDate(ctx, self.data.y, self.data.m, self.data.d),
    time: (ctx, self) => makeTime(ctx, { h: self.data.h, mi: self.data.mi, s: self.data.s, us: self.data.us, tz: null, fold: self.data.fold }),
    timetz: (ctx, self) => makeTime(ctx, { h: self.data.h, mi: self.data.mi, s: self.data.s, us: self.data.us, tz: self.data.tz, fold: self.data.fold }),
    weekday: (ctx, self) => I(weekdayOf(self.data.y, self.data.m, self.data.d)),
    isoweekday: (ctx, self) => I(weekdayOf(self.data.y, self.data.m, self.data.d) + 1),
    toordinal: (ctx, self) => I(toOrdinal(self.data.y, self.data.m, self.data.d)),
    isocalendar: (ctx, self) => ctx.native('datetime.IsoCalendarDate', isoCalendar(self.data.y, self.data.m, self.data.d)),
    isoformat: (ctx, self, args, kwargs) => {
      const sep = kwargs.sep !== undefined ? strArg(ctx, kwargs.sep, 'sep') : (args.length ? strArg(ctx, args[0], 'sep') : 'T');
      const ts = kwargs.timespec !== undefined ? strArg(ctx, kwargs.timespec, 'timespec') : (args.length > 1 ? strArg(ctx, args[1], 'timespec') : 'auto');
      if (sep.length !== 1) ctx.err('TypeError', 'sep must be a single character', '');
      return dtIso(ctx, self, sep, ts);
    },
    ctime: (ctx, self) => ctimeStr(self.data.y, self.data.m, self.data.d, self.data.h, self.data.mi, self.data.s),
    timetuple: (ctx, self) => {
      let isdst = -1;
      if (self.data.tz) {
        const dst = datetimeDstUs(ctx, self);
        isdst = dst === null ? -1 : (dst !== 0n ? 1 : 0);
      }
      return timetupleOf(ctx, self.data.y, self.data.m, self.data.d, self.data.h, self.data.mi, self.data.s, isdst);
    },
    utctimetuple: (ctx, self) => {
      if (!self.data.tz) return timetupleOf(ctx, self.data.y, self.data.m, self.data.d, self.data.h, self.data.mi, self.data.s, 0);
      const key = dtKeyUs(ctx, self.data);
      if (key === 'unk') return unverified(ctx, 'datetime.utctimetuple()', 'tz データベース未収載の');
      const utc = dtFromKeyUs(ctx, key, null, 0);
      return timetupleOf(ctx, utc.data.y, utc.data.m, utc.data.d, utc.data.h, utc.data.mi, utc.data.s, 0);
    },
    utcoffset: (ctx, self) => {
      if (!self.data.tz) return NONE;
      const off = tzOffsetUs(ctx, self.data.tz);
      if (off === 'unk') return unverified(ctx, 'datetime.utcoffset()', 'tz データベース未収載の');
      if (off === null) return NONE;
      return makeTd(ctx, tdNormalize(off));
    },
    dst: (ctx, self) => {
      if (!self.data.tz) return NONE;
      const dst = datetimeDstUs(ctx, self);
      if (dst === 'unk') return unverified(ctx, 'datetime.dst()', 'tz データベース未収載の');
      if (dst === null) return NONE;
      return makeTd(ctx, tdNormalize(dst));
    },
    tzname: (ctx, self) => {
      if (!self.data.tz) return NONE;
      const nm = tzNameOf(ctx, self.data.tz);
      return nm === null ? NONE : nm;
    },
    astimezone: (ctx, self, args, kwargs) => {
      const tz = args.length ? tzArgOk(ctx, args[0]) : (kwargs.tz !== undefined ? tzArgOk(ctx, kwargs.tz) : null);
      if (!tz) return unverified(ctx, 'datetime.astimezone()', 'tz 省略時はローカルタイムゾーンに依存する');
      if (!self.data.tz) return unverified(ctx, 'datetime.astimezone()', 'naive な datetime はローカル時刻として解釈されるため');
      const key = dtKeyUs(ctx, self.data);
      if (key === 'unk') return unverified(ctx, 'datetime.astimezone()', 'tz データベース未収載の');
      const off = tzOffsetUs(ctx, tz);
      if (off === 'unk' || off === null) return unverified(ctx, 'datetime.astimezone()', '変換先 tz のオフセットが確定できない');
      return dtFromKeyUs(ctx, key + off, tz, 0);
    },
    timestamp: (ctx, self) => {
      if (!self.data.tz) return unverified(ctx, 'datetime.timestamp()', 'naive な datetime はローカル時刻として解釈されるため');
      const key = dtKeyUs(ctx, self.data);
      if (key === 'unk') return unverified(ctx, 'datetime.timestamp()', 'tz データベース未収載の');
      const epochKey = BigInt(719163) * US_PER_DAY;
      return F(Number(key - epochKey) / 1e6);
    },
    replace: (ctx, self, args, kwargs) => {
      if (args.length) ctx.err('TypeError', 'datetime.replace() はキーワード引数で指定してください', '');
      const t = self.data;
      const g = (k, cur) => kwargs[k] !== undefined ? intArg(ctx, kwargs[k], k) : cur;
      const y = g('year', t.y), mo = g('month', t.m), d = g('day', t.d), h = g('hour', t.h), mi = g('minute', t.mi), s = g('second', t.s), us = g('microsecond', t.us);
      const fold = kwargs.fold !== undefined ? intArg(ctx, kwargs.fold, 'fold') : t.fold;
      let tz = t.tz;
      if ('tzinfo' in kwargs) tz = tzArgOk(ctx, kwargs.tzinfo);
      for (const k of Object.keys(kwargs)) if (!['year', 'month', 'day', 'hour', 'minute', 'second', 'microsecond', 'tzinfo', 'fold'].includes(k)) ctx.err('TypeError', 'datetime.replace() にキーワード引数「' + k + '」はありません', '');
      checkDate(ctx, y, mo, d);
      checkTime(ctx, h, mi, s, us);
      checkFold(ctx, fold);
      return makeDt(ctx, { y, m: mo, d, h, mi, s, us, tz, fold });
    },
    strftime: (ctx, self, args, kwargs) => {
      noKwargs(ctx, kwargs, 'datetime.strftime');
      const fmt = strArg(ctx, args[0], 'datetime.strftime() の書式');
      return strftimeCore(strftimeFields(ctx, self.data.y, self.data.m, self.data.d, self.data.h, self.data.mi, self.data.s, self.data.us, self.data.tz), fmt);
    },
    __str__: (ctx, self) => dtIso(ctx, self, ' ', 'auto'),
    __format__: (ctx, self, args) => {
      const spec = args.length ? strArg(ctx, args[0], '__format__ の書式') : '';
      if (!spec) return dtIso(ctx, self, ' ', 'auto');
      return strftimeCore(strftimeFields(ctx, self.data.y, self.data.m, self.data.d, self.data.h, self.data.mi, self.data.s, self.data.us, self.data.tz), spec);
    },
  },
  /* R5 フック配線：format()／f文字列。__format__ メソッドと同じ規則
   * （空 spec は str(self)、それ以外は strftime。tz 付きは %z／%Z も解決）。 */
  format: (ctx, self, spec) => {
    if (!spec) return dtIso(ctx, self, ' ', 'auto');
    return strftimeCore(strftimeFields(ctx, self.data.y, self.data.m, self.data.d, self.data.h, self.data.mi, self.data.s, self.data.us, self.data.tz), spec);
  },
  repr: dtRepr,
  str: (ctx, self) => dtIso(ctx, self, ' ', 'auto'),
  eq: (ctx, self, other) => {
    if (!isN(other, DTQ)) return false;
    const ka = dtKeyUs(ctx, self.data), kb = dtKeyUs(ctx, other.data);
    if (ka === 'unk' || kb === 'unk') return null;
    const aAware = !!self.data.tz, bAware = !!other.data.tz;
    // tz 付きでも utcoffset が None の基礎 tzinfo は NotImplementedError 側で処理される
    if (aAware !== bAware) return false;
    return ka === kb;
  },
  hash: (ctx, self) => {
    const k = dtKeyUs(ctx, self.data);
    return 'dt:' + (k === 'unk' ? 'unk' : k.toString());
  },
  compare: (ctx, self, op, other) => {
    if (isN(other, DQ) && !isN(other, DTQ)) ctx.err('TypeError', "can't compare datetime.datetime to datetime.date", '');
    if (!isN(other, DTQ)) return null;
    const aAware = !!self.data.tz, bAware = !!other.data.tz;
    if (aAware !== bAware) ctx.err('TypeError', "can't compare offset-naive and offset-aware datetimes", '');
    const ka = dtKeyUs(ctx, self.data), kb = dtKeyUs(ctx, other.data);
    if (ka === 'unk' || kb === 'unk') return null;
    return op === '<' ? ka < kb : op === '<=' ? ka <= kb : op === '>' ? ka > kb : ka >= kb;
  },
  binop: (ctx, self, op, other, reflected) => {
    const NH = ctx.NOT_HANDLED;
    if (isN(other, TDQ)) {
      // 壁時計演算：tz 付きでもフィールド上の加減算（CPython の仕様）
      const t = self.data;
      const wallKey = BigInt(toOrdinal(t.y, t.m, t.d)) * US_PER_DAY + BigInt(t.h * 3600 + t.mi * 60 + t.s) * 1000000n + BigInt(t.us);
      if (op === '+') return dtFromWall(ctx, self, wallKey + tdTotalUs(other.data));
      if (op === '-' && !reflected) return dtFromWall(ctx, self, wallKey - tdTotalUs(other.data));
      return NH;
    }
    if (isN(other, DTQ) && op === '-' && !reflected) {
      const aAware = !!self.data.tz, bAware = !!other.data.tz;
      if (aAware !== bAware) ctx.err('TypeError', "can't subtract offset-naive and offset-aware datetimes", '');
      const ka = dtKeyUs(ctx, self.data), kb = dtKeyUs(ctx, other.data);
      if (ka === 'unk' || kb === 'unk') return ctx.unk('timedelta（未検証）');
      return makeTd(ctx, tdNormalize(ka - kb));
    }
    return NH;
  },
};
function dtFromWall(ctx, self, wallKey) {
  // wallKey は「tz を外した壁時計」の通算。序数部と時刻部へ分解して同じ tz で作り直す。
  let days = wallKey / US_PER_DAY;
  let rem = wallKey - days * US_PER_DAY;
  if (rem < 0n) { days -= 1n; rem += US_PER_DAY; }
  const ord = Number(days);
  if (ord < 1 || ord > MAXORDINAL) ctx.err('OverflowError', 'date value out of range', '');
  const r = fromOrdinal(ord);
  const sec = Number(rem / 1000000n), us = Number(rem % 1000000n);
  return makeDt(ctx, { y: r.y, m: r.m, d: r.d, h: Math.floor(sec / 3600), mi: Math.floor((sec % 3600) / 60), s: sec % 60, us, tz: self.data.tz, fold: 0 });
}
function datetimeDstUs(ctx, self) {
  const tz = self.data.tz;
  if (isN(tz, TZQ)) return 0n;
  if (isN(tz, 'datetime.tzinfo')) ctx.err('NotImplementedError', 'a tzinfo subclass must implement dst()', '');
  return 'unk';
}

/* ---------- timezone ---------- */
const UTC_DATA = { off: { d: 0, s: 0, us: 0 }, name: null };
const timezoneDef = {
  typeName: 'timezone',
  parents: ['datetime.tzinfo'],
  construct: (ctx, args, kwargs) => {
    const vals = bind(ctx, args, kwargs, ['offset', 'name'], 'timezone');
    if (vals[0] === undefined) ctx.err('TypeError', 'timezone() には offset が必要です', '');
    const off = tdData(ctx, vals[0], 'timezone() の offset');
    const total = tdTotalUs(off);
    if (total <= -86400000000n || total >= 86400000000n) {
      ctx.err('ValueError', 'offset must be a timedelta strictly between -timedelta(hours=24) and timedelta(hours=24), not ' + tdRepr(off) + '.', '');
    }
    let name = null;
    if (vals[1] !== undefined && !ctx.isNone(vals[1])) name = strArg(ctx, vals[1], 'timezone() の name');
    return ctx.native(TZQ, { off, name });
  },
  classAttrs: {
    utc: () => UTC_VAL,
  },
  methods: {
    utcoffset: (ctx, self, args) => {
      if (args.length && !ctx.isNone(args[0]) && !isN(args[0], DTQ)) ctx.err('TypeError', 'timezone.utcoffset() の引数には datetime か None を使ってください', '');
      return makeTd(ctx, self.data.off);
    },
    dst: () => NONE,
    tzname: (ctx, self) => {
      const nm = tzNameOf(ctx, ctx.native(TZQ, self.data));
      return nm;
    },
    fromutc: (ctx, self, args) => {
      const dtv = args[0];
      if (!isN(dtv, DTQ)) ctx.err('TypeError', 'fromutc() の引数には datetime を使ってください', '');
      // CPython は dt.tzinfo is self（同一インスタンス）を要求する。
      // エンジン値は参照で受け渡されるため参照一致で判定できる。
      if (dtv.data.tz !== self) ctx.err('ValueError', 'fromutc: dt.tzinfo is not self', '');
      const wall = BigInt(toOrdinal(dtv.data.y, dtv.data.m, dtv.data.d)) * US_PER_DAY + BigInt(dtv.data.h * 3600 + dtv.data.mi * 60 + dtv.data.s) * 1000000n + BigInt(dtv.data.us);
      const shifted = wall + tdTotalUs(self.data.off);
      let days = shifted / US_PER_DAY;
      let rem = shifted - days * US_PER_DAY;
      if (rem < 0n) { days -= 1n; rem += US_PER_DAY; }
      const ord = Number(days);
      if (ord < 1 || ord > MAXORDINAL) ctx.err('OverflowError', 'date value out of range', '');
      const r = fromOrdinal(ord);
      const sec = Number(rem / 1000000n), us = Number(rem % 1000000n);
      return makeDt(ctx, { y: r.y, m: r.m, d: r.d, h: Math.floor(sec / 3600), mi: Math.floor((sec % 3600) / 60), s: sec % 60, us, tz: dtv.data.tz, fold: 0 });
    },
  },
  repr: (ctx, self) => {
    if (self.data.name) return 'datetime.timezone(' + tdRepr(self.data.off) + ", '" + self.data.name + "')";
    if (tdTotalUs(self.data.off) === 0n) return 'datetime.timezone.utc';
    return 'datetime.timezone(' + tdRepr(self.data.off) + ')';
  },
  // CPython の str(timezone) は tzname と同じ（名前か UTC±HH:MM[:SS]）。
  str: (ctx, self) => tzNameOf(ctx, self),
  eq: (ctx, self, other) => isN(other, TZQ) ? tdTotalUs(self.data.off) === tdTotalUs(other.data.off) : false,
  hash: (ctx, self) => 'tz:' + tdTotalUs(self.data.off).toString(),
};
/* timezone.utc のシングルトン（datetime.timezone.utc is datetime.UTC を
 * エンジン内でも保つため、生成は一度だけにして使い回す）。 */
const UTC_VAL = makeNative(TZQ, UTC_DATA);

/* ---------- tzinfo 基底 ---------- */
const tzinfoDef = {
  typeName: 'tzinfo',
  construct: (ctx) => ctx.native('datetime.tzinfo', {}),
  methods: {
    utcoffset: (ctx) => ctx.err('NotImplementedError', 'a tzinfo subclass must implement utcoffset()', ''),
    dst: (ctx) => ctx.err('NotImplementedError', 'a tzinfo subclass must implement dst()', ''),
    tzname: (ctx) => ctx.err('NotImplementedError', 'a tzinfo subclass must implement tzname()', ''),
    fromutc: (ctx) => ctx.err('NotImplementedError', 'a tzinfo subclass must implement utcoffset()', ''),
  },
  repr: () => 'datetime.tzinfo',
};

registerStdlibModule('datetime', {
  constants: {
    MINYEAR: I(1),
    MAXYEAR: I(9999),
    UTC: UTC_VAL,
  },
  classes: {
    timedelta: timedeltaDef,
    date: dateDef,
    datetime: datetimeDef,
    time: timeDef,
    timezone: timezoneDef,
    tzinfo: tzinfoDef,
    IsoCalendarDate: isoCalDef,
  },
});
