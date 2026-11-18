/* 高度モード B7 G6：calendar モジュール（85件）の意味論実装。
 * 一次情報：公式ドキュメント 3.15 library/calendar、CPython 3.12.3 実走、
 * および CPython 同梱 calendar.py のアルゴリズム（整形規則の正本）。
 * 曜日・月名は C ロケール（英語）。Locale 系はロケール依存のため未検証。
 * iter 系はエンジン都合でリストとして実体化する（報告書に記録）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, makeNative, NOT_HANDLED } from './stdlib-registry.js';
import {
  I, BOOL, NONE, LIST, TUPLE, isLeap, daysInMonth, toOrdinal, weekdayOf,
  intArg, strArg, noKwargs, DAY_NAMES, DAY_ABBR, MONTH_NAMES, MONTH_ABBR,
} from './datetime-core-advanced.js';

const CALQ = 'calendar.Calendar';
const unverified = (ctx, what, why) => { ctx.diag('未検証：' + what + ' は ' + why + ' ため、この説明では値を確定できません'); return ctx.unk(what + '（未検証）'); };

/* ---------- Day／Month（IntEnum） ---------- */
const DAY_MEMBERS = DAY_NAMES.map((nm, i) => makeNative('calendar.Day', { v: i, name: nm.toUpperCase() }));
const MONTH_NAMES_UP = MONTH_NAMES.slice(1).map((nm) => nm.toUpperCase());
const MONTH_MEMBERS = MONTH_NAMES_UP.map((nm, i) => makeNative('calendar.Month', { v: i + 1, name: nm }));
function enumDef(kind, members, label) {
  return {
    typeName: label,
    construct: (ctx, args, kwargs) => {
      noKwargs(ctx, kwargs, label);
      const v = intArg(ctx, args[0], label + '() の引数');
      const found = members.find((m) => m.data.v === v);
      if (!found) ctx.err('ValueError', v + ' is not a valid ' + label, '');
      return found;
    },
    attrs: {
      value: (ctx, self) => I(self.data.v),
      name: (ctx, self) => self.data.name,
    },
    classAttrs: Object.fromEntries(members.map((m) => [m.data.name, m])),
    repr: (ctx, self) => 'calendar.' + self.data.name,
    str: (ctx, self) => String(self.data.v),
    eq: (ctx, self, other) => {
      if (other && other.__native === kind) return self.data.v === other.data.v;
      const n = ctx.num(other);
      return n !== null ? n === self.data.v : false;
    },
    hash: (ctx, self) => 'int:' + self.data.v,
    compare: (ctx, self, op, other) => {
      const n = other && other.__native === kind ? other.data.v : ctx.num(other);
      if (n === null || n === undefined) return null;
      const a = self.data.v;
      return op === '<' ? a < n : op === '<=' ? a <= n : op === '>' ? a > n : a >= n;
    },
    binop: (ctx, self, op, other, reflected) => {
      const n = other && other.__native === kind ? other.data.v : ctx.num(other);
      if (n === null || n === undefined) return ctx.NOT_HANDLED;
      const a = self.data.v;
      const x = reflected ? n : a, y = reflected ? a : n;
      if (op === '+') return I(x + y);
      if (op === '-') return I(x - y);
      if (op === '*') return I(x * y);
      if (op === '//') { if (y === 0) ctx.err('ZeroDivisionError', 'integer division or modulo by zero', ''); return I(Math.floor(x / y)); }
      if (op === '%') { if (y === 0) ctx.err('ZeroDivisionError', 'integer division or modulo by zero', ''); return I(((x % y) + y) % y); }
      if (op === '/') { if (y === 0) ctx.err('ZeroDivisionError', 'division by zero', ''); return PyAPI.NUM(x / y, true); }
      return ctx.NOT_HANDLED;
    },
  };
}
const dayDef = enumDef('calendar.Day', DAY_MEMBERS, 'Day');
const monthDef = enumDef('calendar.Month', MONTH_MEMBERS, 'Month');

/* ---------- 暦ヘルパ ---------- */
function monthrangeCalc(ctx, year, month) {
  if (month < 1 || month > 12) ctx.err('calendar.IllegalMonthError', 'bad month number ' + month + '; must be 1-12', '');
  return { day1: weekdayOf(year, month, 1), ndays: daysInMonth(year, month) };
}
function iterMonthDays(fwd, year, month, ctx) {
  const { day1, ndays } = monthrangeCalc(ctx, year, month);
  const before = ((day1 - fwd) % 7 + 7) % 7;
  const after = ((fwd - day1 - ndays) % 7 + 7) % 7;
  const out = [];
  for (let i = 0; i < before; i++) out.push(0);
  for (let d = 1; d <= ndays; d++) out.push(d);
  for (let i = 0; i < after; i++) out.push(0);
  return out;
}
function iterMonthDays3(fwd, year, month, ctx) {
  const { day1, ndays } = monthrangeCalc(ctx, year, month);
  const before = ((day1 - fwd) % 7 + 7) % 7;
  const after = ((fwd - day1 - ndays) % 7 + 7) % 7;
  const out = [];
  let py = year, pm = month - 1;
  if (pm === 0) { pm = 12; py = year - 1; }
  const plen = daysInMonth(py, pm);
  for (let d = plen - before + 1; d <= plen; d++) out.push([py, pm, d]);
  for (let d = 1; d <= ndays; d++) out.push([year, month, d]);
  let ny = year, nm = month + 1;
  if (nm === 13) { nm = 1; ny = year + 1; }
  for (let d = 1; d <= after; d++) out.push([ny, nm, d]);
  return out;
}
const chunk7 = (arr) => { const out = []; for (let i = 0; i < arr.length; i += 7) out.push(arr.slice(i, i + 7)); return out; };
const ints = (arr) => LIST(arr.map((v) => I(v)));
const tuples = (arr) => LIST(arr.map((t) => TUPLE(t.map((v) => I(v)))));
function makeDateVal(ctx, y, m, d) {
  if (y < 1 || y > 9999) ctx.err('OverflowError', 'date value out of range', '');
  return ctx.native('datetime.date', { y, m, d });
}
function monthDatesCal(ctx, fwd, year, month) {
  return LIST(chunk7(iterMonthDays3(fwd, year, month, ctx)).map((week) => LIST(week.map(([y, m, d]) => makeDateVal(ctx, y, m, d)))));
}
function monthDaysCal(fwd, year, month, ctx) {
  return LIST(chunk7(iterMonthDays(fwd, year, month, ctx)).map((week) => ints(week)));
}
function monthDays2Cal(fwd, year, month, ctx) {
  const days = iterMonthDays(fwd, year, month, ctx);
  const pairs = days.map((d, i) => [d, (fwd + i) % 7]);
  return LIST(chunk7(pairs).map((week) => tuples(week)));
}
function yearCal(ctx, fwd, year, width, kind) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    if (kind === 'dates') months.push(monthDatesCal(ctx, fwd, year, m));
    else if (kind === 'days2') months.push(monthDays2Cal(fwd, year, m, ctx));
    else months.push(monthDaysCal(fwd, year, m, ctx));
  }
  const rows = [];
  for (let i = 0; i < 12; i += width) rows.push(LIST(months.slice(i, i + width)));
  return LIST(rows);
}

/* ---------- Calendar ---------- */
function calendarConstruct(ctx, args, kwargs) {
  const fwd = args.length ? intArg(ctx, args[0], 'Calendar() の firstweekday') : (kwargs.firstweekday !== undefined ? intArg(ctx, kwargs.firstweekday, 'firstweekday') : 0);
  return ctx.native(CALQ, { fwd });
}
const calConstructFor = (qualname) => (ctx, args, kwargs) => {
  const fwd = args.length ? intArg(ctx, args[0], 'firstweekday') : (kwargs.firstweekday !== undefined ? intArg(ctx, kwargs.firstweekday, 'firstweekday') : 0);
  return ctx.native(qualname, { fwd });
};
const calendarDef = {
  typeName: 'Calendar',
  construct: calendarConstruct,
  attrs: {
    firstweekday: (ctx, self) => I(((self.data.fwd % 7) + 7) % 7),
  },
  methods: {
    getfirstweekday: (ctx, self) => I(((self.data.fwd % 7) + 7) % 7),
    setfirstweekday: (ctx, self, args) => { self.data.fwd = intArg(ctx, args[0], 'setfirstweekday() の引数'); return NONE; },
    iterweekdays: (ctx, self) => {
      const f = ((self.data.fwd % 7) + 7) % 7;
      const out = [];
      for (let i = 0; i < 7; i++) out.push((f + i) % 7);
      return ints(out);
    },
    itermonthdays: (ctx, self, args) => ints(iterMonthDays(((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), ctx)),
    itermonthdays2: (ctx, self, args) => {
      const f = ((self.data.fwd % 7) + 7) % 7;
      const days = iterMonthDays(f, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), ctx);
      return tuples(days.map((d, i) => [d, (f + i) % 7]));
    },
    itermonthdays3: (ctx, self, args) => tuples(iterMonthDays3(((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), ctx)),
    itermonthdays4: (ctx, self, args) => {
      const f = ((self.data.fwd % 7) + 7) % 7;
      const days = iterMonthDays3(f, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), ctx);
      return tuples(days.map(([y, m, d], i) => [y, m, d, (f + i) % 7]));
    },
    itermonthdates: (ctx, self, args) => LIST(iterMonthDays3(((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), ctx).map(([y, m, d]) => makeDateVal(ctx, y, m, d))),
    monthdatescalendar: (ctx, self, args) => monthDatesCal(ctx, ((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month')),
    monthdayscalendar: (ctx, self, args) => monthDaysCal(((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), ctx),
    monthdays2calendar: (ctx, self, args) => monthDays2Cal(((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), ctx),
    yeardatescalendar: (ctx, self, args) => yearCal(ctx, ((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), args.length > 1 ? intArg(ctx, args[1], 'width') : 3, 'dates'),
    yeardayscalendar: (ctx, self, args) => yearCal(ctx, ((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), args.length > 1 ? intArg(ctx, args[1], 'width') : 3, 'days'),
    yeardays2calendar: (ctx, self, args) => yearCal(ctx, ((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'year'), args.length > 1 ? intArg(ctx, args[1], 'width') : 3, 'days2'),
  },
  repr: (ctx, self) => '<calendar.Calendar object>',
};

/* ---------- TextCalendar ---------- */
function pyCenter(s, width) {
  if (s.length >= width) return s;
  const marg = width - s.length;
  const left = Math.floor(marg / 2) + ((marg & width & 1) ? 1 : 0);
  return ' '.repeat(left) + s + ' '.repeat(marg - left);
}
const rstrip = (s) => s.replace(/\s+$/, '');
function textFormatDay(day, width) {
  const s = day === 0 ? '' : String(day).padStart(2, ' ');
  return pyCenter(s, width);
}
function textFormatWeek(weekPairs, width) {
  return weekPairs.map(([d]) => textFormatDay(d, width)).join(' ');
}
function textFormatWeekday(fwd, day, width) {
  const names = width >= 9 ? DAY_NAMES : DAY_ABBR;
  return pyCenter(names[day].slice(0, width), width);
}
function textFormatWeekheader(fwd, width) {
  const out = [];
  for (let i = 0; i < 7; i++) out.push(textFormatWeekday(fwd, (fwd + i) % 7, width));
  return out.join(' ');
}
function textFormatMonthname(year, month, width, withyear) {
  let s = MONTH_NAMES[month];
  if (withyear) s = s + ' ' + year;
  return pyCenter(s, width);
}
function textFormatMonth(ctx, fwd, year, month, w, l) {
  w = Math.max(2, w); l = Math.max(1, l);
  let s = rstrip(textFormatMonthname(year, month, 7 * (w + 1) - 1, true));
  s += '\n'.repeat(l);
  s += rstrip(textFormatWeekheader(fwd, w));
  s += '\n'.repeat(l);
  const days = iterMonthDays(fwd, year, month, ctx);
  const pairs = days.map((d, i) => [d, (fwd + i) % 7]);
  for (const week of chunk7(pairs)) {
    s += rstrip(textFormatWeek(week, w));
    s += '\n'.repeat(l);
  }
  return s;
}
function formatstring(cols, colwidth, c) {
  return cols.map((col) => pyCenter(col, colwidth)).join(' '.repeat(c));
}
function textFormatYear(ctx, fwd, year, w, l, c, m) {
  w = Math.max(2, w); l = Math.max(1, l); c = Math.max(2, c);
  const colwidth = (w + 1) * 7 - 1;
  const v = [];
  v.push(rstrip(pyCenter(String(year), colwidth * m + c * (m - 1))));
  v.push('\n'.repeat(l));
  const header = textFormatWeekheader(fwd, w);
  // yeardays2calendar(year, m) 相当の行構造
  for (let rowIx = 0; rowIx * m < 12; rowIx++) {
    const monthNums = [];
    for (let k = m * rowIx + 1; k <= Math.min(m * (rowIx + 1), 12); k++) monthNums.push(k);
    const cals = monthNums.map((mn) => {
      const days = iterMonthDays(fwd, year, mn, ctx);
      const pairs = days.map((d, i) => [d, (fwd + i) % 7]);
      return chunk7(pairs);
    });
    v.push('\n'.repeat(l));
    v.push(rstrip(formatstring(monthNums.map((mn) => textFormatMonthname(year, mn, colwidth, false)), colwidth, c)));
    v.push('\n'.repeat(l));
    v.push(rstrip(formatstring(monthNums.map(() => header), colwidth, c)));
    v.push('\n'.repeat(l));
    const height = Math.max(...cals.map((cal) => cal.length));
    for (let j = 0; j < height; j++) {
      const weeks = cals.map((cal) => j >= cal.length ? '' : textFormatWeek(cal[j], w));
      v.push(rstrip(formatstring(weeks, colwidth, c)));
      v.push('\n'.repeat(l));
    }
  }
  return v.join('');
}
const textCalendarDef = {
  typeName: 'TextCalendar',
  parents: ['calendar.Calendar'],
  construct: calConstructFor('calendar.TextCalendar'),
  attrs: calendarDef.attrs,
  methods: {
    ...calendarDef.methods,
    formatday: (ctx, self, args) => textFormatDay(intArg(ctx, args[0], 'day'), intArg(ctx, args[2], 'width')),
    formatweek: (ctx, self, args) => {
      const items = ctx.listOf(args[0]);
      if (!items) ctx.err('TypeError', 'formatweek() には (day, weekday) のリストを使ってください', '');
      const pairs = items.map((t) => { const p = ctx.listOf(t); return [ctx.int(p[0]), ctx.int(p[1])]; });
      return textFormatWeek(pairs, intArg(ctx, args[1], 'width'));
    },
    formatweekday: (ctx, self, args) => textFormatWeekday(((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'day'), intArg(ctx, args[1], 'width')),
    formatweekheader: (ctx, self, args) => textFormatWeekheader(((self.data.fwd % 7) + 7) % 7, intArg(ctx, args[0], 'width')),
    formatmonthname: (ctx, self, args, kwargs) => {
      const withyear = kwargs.withyear !== undefined ? ctx.truthy(kwargs.withyear) : (args.length > 3 ? ctx.truthy(args[3]) : true);
      return textFormatMonthname(intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), intArg(ctx, args[2], 'width'), withyear);
    },
    formatmonth: (ctx, self, args, kwargs) => {
      const y = intArg(ctx, args[0], 'year'), mo = intArg(ctx, args[1], 'month');
      const w = args.length > 2 ? intArg(ctx, args[2], 'w') : (kwargs.w !== undefined ? intArg(ctx, kwargs.w, 'w') : 0);
      const l = args.length > 3 ? intArg(ctx, args[3], 'l') : (kwargs.l !== undefined ? intArg(ctx, kwargs.l, 'l') : 0);
      return textFormatMonth(ctx, ((self.data.fwd % 7) + 7) % 7, y, mo, w, l);
    },
    formatyear: (ctx, self, args, kwargs) => {
      const y = intArg(ctx, args[0], 'year');
      const g = (i, k, def) => args.length > i ? intArg(ctx, args[i], k) : (kwargs[k] !== undefined ? intArg(ctx, kwargs[k], k) : def);
      return textFormatYear(ctx, ((self.data.fwd % 7) + 7) % 7, y, g(1, 'w', 2), g(2, 'l', 1), g(3, 'c', 6), g(4, 'm', 3));
    },
    prmonth: (ctx) => unverified(ctx, 'TextCalendar.prmonth()', '標準出力への表示はエンジンから再現できない'),
    prweek: (ctx) => unverified(ctx, 'TextCalendar.prweek()', '標準出力への表示はエンジンから再現できない'),
    pryear: (ctx) => unverified(ctx, 'TextCalendar.pryear()', '標準出力への表示はエンジンから再現できない'),
  },
  repr: () => '<calendar.TextCalendar object>',
};

/* ---------- HTMLCalendar ---------- */
const CSSCLASSES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
function htmlFormatDay(day, weekday) {
  if (day === 0) return '<td class="noday">&nbsp;</td>';
  return '<td class="' + CSSCLASSES[weekday] + '">' + day + '</td>';
}
function htmlFormatMonth(ctx, fwd, year, month, withyear) {
  const v = [];
  v.push('<table border="0" cellpadding="0" cellspacing="0" class="month">');
  v.push('\n');
  const title = withyear ? MONTH_NAMES[month] + ' ' + year : MONTH_NAMES[month];
  v.push('<tr><th colspan="7" class="month">' + title + '</th></tr>');
  v.push('\n');
  let hdr = '';
  for (let i = 0; i < 7; i++) { const d = (fwd + i) % 7; hdr += '<th class="' + CSSCLASSES[d] + '">' + DAY_ABBR[d] + '</th>'; }
  v.push('<tr>' + hdr + '</tr>');
  v.push('\n');
  const days = iterMonthDays(fwd, year, month, ctx);
  const pairs = days.map((d, i) => [d, (fwd + i) % 7]);
  for (const week of chunk7(pairs)) {
    v.push('<tr>' + week.map(([d, wd]) => htmlFormatDay(d, wd)).join('') + '</tr>');
    v.push('\n');
  }
  v.push('</table>');
  v.push('\n');
  return v.join('');
}
function htmlFormatYear(ctx, fwd, year, width) {
  width = Math.max(width, 1);
  const v = [];
  v.push('<table border="0" cellpadding="0" cellspacing="0" class="year">');
  v.push('\n');
  v.push('<tr><th colspan="' + width + '" class="year">' + year + '</th></tr>');
  for (let i = 1; i < 13; i += width) {
    v.push('<tr>');
    for (let m = i; m < Math.min(i + width, 13); m++) {
      v.push('<td>');
      v.push(htmlFormatMonth(ctx, fwd, year, m, false));
      v.push('</td>');
    }
    v.push('</tr>');
  }
  v.push('</table>');
  return v.join('');
}
const htmlCalendarDef = {
  typeName: 'HTMLCalendar',
  parents: ['calendar.Calendar'],
  construct: calConstructFor('calendar.HTMLCalendar'),
  attrs: calendarDef.attrs,
  classAttrs: {
    cssclasses: LIST(CSSCLASSES.slice()),
    cssclasses_weekday_head: LIST(CSSCLASSES.slice()),
    cssclass_noday: 'noday',
    cssclass_month_head: 'month',
    cssclass_month: 'month',
    cssclass_year_head: 'year',
    cssclass_year: 'year',
  },
  methods: {
    ...calendarDef.methods,
    formatmonthname: (ctx, self, args, kwargs) => {
      const y = intArg(ctx, args[0], 'year'), mo = intArg(ctx, args[1], 'month');
      const withyear = kwargs.withyear !== undefined ? ctx.truthy(kwargs.withyear) : (args.length > 2 ? ctx.truthy(args[2]) : true);
      const title = withyear ? MONTH_NAMES[mo] + ' ' + y : MONTH_NAMES[mo];
      return '<tr><th colspan="7" class="month">' + title + '</th></tr>';
    },
    formatmonth: (ctx, self, args, kwargs) => {
      const y = intArg(ctx, args[0], 'year'), mo = intArg(ctx, args[1], 'month');
      const withyear = kwargs.withyear !== undefined ? ctx.truthy(kwargs.withyear) : (args.length > 2 ? ctx.truthy(args[2]) : true);
      return htmlFormatMonth(ctx, ((self.data.fwd % 7) + 7) % 7, y, mo, withyear);
    },
    formatyear: (ctx, self, args, kwargs) => {
      const y = intArg(ctx, args[0], 'year');
      const width = args.length > 1 ? intArg(ctx, args[1], 'width') : (kwargs.width !== undefined ? intArg(ctx, kwargs.width, 'width') : 3);
      return htmlFormatYear(ctx, ((self.data.fwd % 7) + 7) % 7, y, width);
    },
    formatyearpage: (ctx) => unverified(ctx, 'HTMLCalendar.formatyearpage()', '戻り値が bytes で既定エンコーディングが環境依存のため'),
  },
  repr: () => '<calendar.HTMLCalendar object>',
};

/* ---------- Locale 系（ロケール依存→未検証） ---------- */
function localeConstruct(kind) {
  return (ctx, args, kwargs) => {
    const fwd = args.length ? intArg(ctx, args[0], 'firstweekday') : 0;
    return ctx.native(kind, { fwd });
  };
}
const localeTextDef = {
  typeName: 'LocaleTextCalendar',
  parents: ['calendar.TextCalendar'],
  construct: localeConstruct('calendar.LocaleTextCalendar'),
  attrs: calendarDef.attrs,
  methods: {
    ...textCalendarDef.methods,
    formatweekday: (ctx) => unverified(ctx, 'LocaleTextCalendar.formatweekday()', 'ロケール依存の曜日名のため'),
    formatmonthname: (ctx) => unverified(ctx, 'LocaleTextCalendar.formatmonthname()', 'ロケール依存の月名のため'),
    formatmonth: (ctx) => unverified(ctx, 'LocaleTextCalendar.formatmonth()', 'ロケール依存の名前を含むため'),
    formatyear: (ctx) => unverified(ctx, 'LocaleTextCalendar.formatyear()', 'ロケール依存の名前を含むため'),
  },
  repr: () => '<calendar.LocaleTextCalendar object>',
};
const localeHtmlDef = {
  typeName: 'LocaleHTMLCalendar',
  parents: ['calendar.HTMLCalendar'],
  construct: localeConstruct('calendar.LocaleHTMLCalendar'),
  attrs: calendarDef.attrs,
  classAttrs: htmlCalendarDef.classAttrs,
  methods: {
    ...htmlCalendarDef.methods,
    formatmonthname: (ctx) => unverified(ctx, 'LocaleHTMLCalendar.formatmonthname()', 'ロケール依存の月名のため'),
    formatmonth: (ctx) => unverified(ctx, 'LocaleHTMLCalendar.formatmonth()', 'ロケール依存の名前を含むため'),
    formatyear: (ctx) => unverified(ctx, 'LocaleHTMLCalendar.formatyear()', 'ロケール依存の名前を含むため'),
  },
  repr: () => '<calendar.LocaleHTMLCalendar object>',
};

/* ---------- モジュール関数（既定 TextCalendar の状態） ---------- */
const defaultState = { fwd: 0 };
const FUNCTIONS = {
  isleap: (ctx, args, kwargs) => { noKwargs(ctx, kwargs, 'isleap'); return BOOL(isLeap(intArg(ctx, args[0], 'isleap() の引数'))); },
  leapdays: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'leapdays');
    let y1 = intArg(ctx, args[0], 'y1') - 1, y2 = intArg(ctx, args[1], 'y2') - 1;
    return I((Math.floor(y2 / 4) - Math.floor(y1 / 4)) - (Math.floor(y2 / 100) - Math.floor(y1 / 100)) + (Math.floor(y2 / 400) - Math.floor(y1 / 400)));
  },
  weekday: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'weekday');
    let y = intArg(ctx, args[0], 'year');
    const m = intArg(ctx, args[1], 'month'), d = intArg(ctx, args[2], 'day');
    if (y < 1 || y > 9999) y = 2000 + (((y % 400) + 400) % 400);
    if (m < 1 || m > 12) ctx.err('ValueError', 'month must be in 1..12', '');
    if (d < 1 || d > daysInMonth(y, m)) ctx.err('ValueError', 'day is out of range for month', '');
    return DAY_MEMBERS[weekdayOf(y, m, d)];
  },
  monthrange: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'monthrange');
    const y = intArg(ctx, args[0], 'year'), m = intArg(ctx, args[1], 'month');
    const r = monthrangeCalc(ctx, y, m);
    return TUPLE([DAY_MEMBERS[r.day1], I(r.ndays)]);
  },
  monthcalendar: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'monthcalendar');
    return monthDaysCal(defaultState.fwd, intArg(ctx, args[0], 'year'), intArg(ctx, args[1], 'month'), ctx);
  },
  month: (ctx, args, kwargs) => {
    const y = intArg(ctx, args[0], 'year'), m = intArg(ctx, args[1], 'month');
    const w = args.length > 2 ? intArg(ctx, args[2], 'w') : 0, l = args.length > 3 ? intArg(ctx, args[3], 'l') : 0;
    return textFormatMonth(ctx, defaultState.fwd, y, m, w, l);
  },
  calendar: (ctx, args, kwargs) => {
    const y = intArg(ctx, args[0], 'year');
    const g = (i, k, def) => args.length > i ? intArg(ctx, args[i], k) : (kwargs[k] !== undefined ? intArg(ctx, kwargs[k], k) : def);
    return textFormatYear(ctx, defaultState.fwd, y, g(1, 'w', 2), g(2, 'l', 1), g(3, 'c', 6), g(4, 'm', 3));
  },
  prmonth: (ctx) => unverified(ctx, 'calendar.prmonth()', '標準出力への表示はエンジンから再現できない'),
  prcal: (ctx) => unverified(ctx, 'calendar.prcal()', '標準出力への表示はエンジンから再現できない'),
  firstweekday: (ctx, args, kwargs) => { noKwargs(ctx, kwargs, 'firstweekday'); return I(defaultState.fwd); },
  setfirstweekday: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'setfirstweekday');
    const wd = intArg(ctx, args[0], 'setfirstweekday() の引数');
    if (wd < 0 || wd > 6) ctx.err('calendar.IllegalWeekdayError', 'bad weekday number ' + wd + '; must be 0 (Monday) to 6 (Sunday)', '');
    defaultState.fwd = wd;
    return NONE;
  },
  weekheader: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'weekheader');
    return textFormatWeekheader(defaultState.fwd, intArg(ctx, args[0], 'weekheader() の引数'));
  },
  timegm: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'timegm');
    const items = args[0] && args[0].__native === 'time.struct_time' ? args[0].data.f : ctx.listOf(args[0]);
    if (!items || items.length < 6) ctx.err('TypeError', 'timegm() には6要素以上のタプルを使ってください', '');
    const g = (i) => Array.isArray(items) ? intArg(ctx, items[i], 'timegm() の要素') : items[i];
    const y = g(0), m = g(1), d = g(2), h = g(3), mi = g(4), s = g(5);
    if (m < 1 || m > 12) ctx.err('ValueError', 'month must be in 1..12', '');
    if (d < 1 || d > daysInMonth(y, m)) ctx.err('ValueError', 'day is out of range for month', '');
    return I((toOrdinal(y, m, d) - 719163) * 86400 + h * 3600 + mi * 60 + s);
  },
};

registerStdlibModule('calendar', {
  constants: {
    JANUARY: MONTH_MEMBERS[0], FEBRUARY: MONTH_MEMBERS[1], MARCH: MONTH_MEMBERS[2], APRIL: MONTH_MEMBERS[3],
    MAY: MONTH_MEMBERS[4], JUNE: MONTH_MEMBERS[5], JULY: MONTH_MEMBERS[6], AUGUST: MONTH_MEMBERS[7],
    SEPTEMBER: MONTH_MEMBERS[8], OCTOBER: MONTH_MEMBERS[9], NOVEMBER: MONTH_MEMBERS[10], DECEMBER: MONTH_MEMBERS[11],
    MONDAY: DAY_MEMBERS[0], TUESDAY: DAY_MEMBERS[1], WEDNESDAY: DAY_MEMBERS[2], THURSDAY: DAY_MEMBERS[3],
    FRIDAY: DAY_MEMBERS[4], SATURDAY: DAY_MEMBERS[5], SUNDAY: DAY_MEMBERS[6],
    day_name: LIST(DAY_NAMES.slice()),
    day_abbr: LIST(DAY_ABBR.slice()),
    month_name: LIST(MONTH_NAMES.slice()),
    month_abbr: LIST(MONTH_ABBR.slice()),
    standalone_month_name: LIST(MONTH_NAMES.slice()),
    standalone_month_abbr: LIST(MONTH_ABBR.slice()),
  },
  functions: FUNCTIONS,
  classes: {
    Calendar: calendarDef,
    TextCalendar: textCalendarDef,
    HTMLCalendar: htmlCalendarDef,
    LocaleTextCalendar: localeTextDef,
    LocaleHTMLCalendar: localeHtmlDef,
    Day: dayDef,
    Month: monthDef,
    IllegalMonthError: { typeName: 'IllegalMonthError', exc: 'calendar.IllegalMonthError', excParents: ['ValueError'] },
    IllegalWeekdayError: { typeName: 'IllegalWeekdayError', exc: 'calendar.IllegalWeekdayError', excParents: ['ValueError'] },
  },
});
