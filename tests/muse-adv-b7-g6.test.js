/* 高度モード B7 G6（日時・カレンダー系）：datetime 109件／time 55件／
 * calendar 85件／zoneinfo 10件、計259件のケース（典型・境界・異常）。
 * 期待値はすべて CPython 3.12.3 実走で確認した値。例題の期待出力（F-04）は
 * リファレンスに入れず、このファイルのケース表と末尾の機械照合で保持する。
 * 既知の基盤制約（報告書 b7-g6-report.md の基盤要請）：
 * - モジュール属性経由のクラス生成 kwargs は二重評価されるため、kwargs が
 *   必要な生成は from-import 形式で書く。
 * - 単項マイナス／abs() はネイティブへ委譲されないためテスト対象外。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { referenceAdvanced } from '../js/types/python/group-advanced-g6.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);
const traceText = (r) => JSON.stringify(r.paths[0]?.trace || []);

/* 値ケース：[プログラム, 期待出力]。複数行の print は行ごとに分かれて届くため
 * 期待値が改行を含む場合は join で比較する。 */
const CASES = [
  // ---- datetime.timedelta：正規化（負値の floor 方向）・演算・repr ----
  ['from datetime import timedelta\nprint(timedelta(days=-1, seconds=1))', '-1 day, 0:00:01'],
  ['from datetime import timedelta\nprint(timedelta(seconds=-1))', '-1 day, 23:59:59'],
  ['from datetime import timedelta\nprint(timedelta(seconds=-1).seconds)', '86399'],
  ['from datetime import timedelta\nprint(timedelta(seconds=-1).days)', '-1'],
  ['from datetime import timedelta\nprint(timedelta(microseconds=1.5))', '0:00:00.000002'],
  ['from datetime import timedelta\nprint(timedelta(microseconds=2.5))', '0:00:00.000002'],
  ['from datetime import timedelta\nprint(timedelta(weeks=1.5))', '10 days, 12:00:00'],
  ['from datetime import timedelta\nprint(timedelta(days=1, seconds=3600).total_seconds())', '90000.0'],
  ['from datetime import timedelta\nprint(timedelta(days=1) + timedelta(days=2))', '3 days, 0:00:00'],
  ['from datetime import timedelta\nprint(timedelta(days=7) // timedelta(days=2))', '3'],
  ['from datetime import timedelta\nprint(timedelta(days=7) % timedelta(days=2))', '1 day, 0:00:00'],
  ['from datetime import timedelta\nprint(timedelta(days=1) / timedelta(days=2))', '0.5'],
  ['from datetime import timedelta\nprint(timedelta(days=1) / 2)', '12:00:00'],
  ['from datetime import timedelta\nprint(timedelta(days=1) * 1.5)', '1 day, 12:00:00'],
  ['from datetime import timedelta\nprint(repr(timedelta(days=1, seconds=3600)))', 'datetime.timedelta(days=1, seconds=3600)'],
  ['from datetime import timedelta\nprint(repr(timedelta()))', 'datetime.timedelta(0)'],
  ['from datetime import timedelta\nprint(timedelta.max.days)', '999999999'],
  ['import datetime\nprint(datetime.timedelta.resolution)', '0:00:00.000001'],

  // ---- datetime.date：序数・曜日・ISO週（境界） ----
  ['import datetime\nprint(datetime.date(2024, 2, 29))', '2024-02-29'],
  ['import datetime\nprint(datetime.date(2024, 2, 29).toordinal())', '738945'],
  ['import datetime\nprint(datetime.date.fromordinal(738945))', '2024-02-29'],
  ['import datetime\nprint(datetime.date.fromordinal(1))', '0001-01-01'],
  ['import datetime\nprint(datetime.date.fromordinal(3652059))', '9999-12-31'],
  ['import datetime\nprint(datetime.date(2024, 2, 29).weekday())', '3'],
  ['import datetime\nprint(datetime.date(2024, 2, 29).isoweekday())', '4'],
  ['import datetime\nprint(datetime.date(2021, 1, 1).isocalendar())', 'datetime.IsoCalendarDate(year=2020, week=53, weekday=5)'],
  ['import datetime\nprint(datetime.date(2023, 1, 1).isocalendar())', 'datetime.IsoCalendarDate(year=2022, week=52, weekday=7)'],
  ['import datetime\nprint(datetime.date(2019, 12, 30).isocalendar())', 'datetime.IsoCalendarDate(year=2020, week=1, weekday=1)'],
  ['import datetime\nprint(datetime.date(2021, 1, 1).isocalendar()[0])', '2020'],
  ['import datetime\nprint(datetime.date.fromisocalendar(2020, 53, 7))', '2021-01-03'],
  ['import datetime\nprint(datetime.date.fromisocalendar(2019, 1, 1))', '2018-12-31'],
  ['import datetime\nprint(datetime.date(2024, 2, 29).isoformat())', '2024-02-29'],
  ['import datetime\nprint(datetime.date.fromisoformat("2024-W09-4"))', '2024-02-29'],
  ['import datetime\nprint(datetime.date.fromisoformat("2024-W09"))', '2024-02-26'],
  ['from datetime import date, timedelta\nprint(date(2024, 1, 31) + timedelta(days=1))', '2024-02-01'],
  ['from datetime import date, timedelta\nprint(date(2024, 1, 1) + timedelta(hours=1))', '2024-01-01'],
  ['from datetime import date\nprint(date(2024, 3, 1) - date(2024, 2, 1))', '29 days, 0:00:00'],
  ['import datetime\nprint(datetime.date(2024, 2, 29).replace(day=28))', '2024-02-28'],
  ['import datetime\nprint(datetime.date(2024, 2, 29).strftime("%Y/%m/%d %a %A %j"))', '2024/02/29 Thu Thursday 060'],
  ['import datetime\nprint(datetime.date(2024, 2, 29).ctime())', 'Thu Feb 29 00:00:00 2024'],
  ['import datetime\nprint(datetime.date(2024, 2, 29).timetuple().tm_yday)', '60'],
  ['import datetime\nprint(datetime.date.min, datetime.date.max)', '0001-01-01 9999-12-31'],
  ['import datetime\nprint(datetime.MINYEAR, datetime.MAXYEAR)', '1 9999'],

  // ---- datetime.datetime：生成・演算・変換 ----
  ['import datetime\nprint(datetime.datetime(2024, 2, 29, 15, 4, 5, 123456))', '2024-02-29 15:04:05.123456'],
  ['import datetime\nprint(datetime.datetime(2024, 2, 29, 15, 4, 5).isoformat())', '2024-02-29T15:04:05'],
  ['import datetime\nprint(datetime.datetime.fromisoformat("20240102T030405"))', '2024-01-02 03:04:05'],
  ['import datetime\nprint(datetime.datetime.fromisoformat("2024-01-02 03:04:05+09:00").utcoffset())', '9:00:00'],
  ['import datetime\nprint(datetime.datetime.strptime("2024-02-29", "%Y-%m-%d"))', '2024-02-29 00:00:00'],
  ['import datetime\nprint(datetime.datetime.strptime("29 Feb 2024", "%d %b %Y"))', '2024-02-29 00:00:00'],
  ['import datetime\nprint(datetime.datetime.strptime("2024 08 4", "%Y %U %w"))', '2024-02-29 00:00:00'],
  ['import datetime\nprint(datetime.datetime.strptime("15:04", "%H:%M"))', '1900-01-01 15:04:00'],
  ['import datetime\nprint(datetime.datetime(2024, 2, 29, 15, 4, 5, 123456).strftime("%Y-%m-%d %H:%M:%S %f %j %U %W %w %p %I"))', '2024-02-29 15:04:05 123456 060 08 09 4 PM 03'],
  ['import datetime\ndt = datetime.datetime.combine(datetime.date(2024, 2, 29), datetime.time(15, 4))\nprint(dt)', '2024-02-29 15:04:00'],
  ['import datetime\nprint(datetime.datetime(2024, 2, 29, 15, 4).date())', '2024-02-29'],
  ['import datetime\nprint(datetime.datetime(2024, 2, 29, 15, 4).time())', '15:04:00'],
  ['import datetime\nprint(datetime.datetime.utcfromtimestamp(0))', '1970-01-01 00:00:00'],
  ['from datetime import datetime\nprint(datetime(2024, 1, 1, fold=1).fold)', '1'],
  ['from datetime import datetime\nprint(datetime(2024, 1, 1, fold=1).replace(day=2).fold)', '1'],
  ['from datetime import datetime, timedelta\nprint((datetime(2024, 1, 1, fold=1) + timedelta(days=1)).fold)', '0'],
  ['import datetime\nprint(datetime.datetime(2024, 1, 1) == datetime.datetime(2024, 1, 1))', 'True'],
  ['import datetime\nprint(datetime.datetime(2024, 1, 1) < datetime.datetime(2024, 1, 2))', 'True'],

  // ---- aware / timezone ----
  ['import datetime\nprint(datetime.timezone.utc)', 'UTC'],
  ['import datetime\nprint(repr(datetime.timezone.utc))', 'datetime.timezone.utc'],
  ['from datetime import timezone, timedelta\nprint(timezone(timedelta(hours=9)).tzname(None))', 'UTC+09:00'],
  ['from datetime import timezone, timedelta\nprint(timezone(timedelta(hours=-5, minutes=-30)).tzname(None))', 'UTC-05:30'],
  ['from datetime import timezone, timedelta\nprint(timezone(timedelta(seconds=90)).tzname(None))', 'UTC+00:01:30'],
  ['from datetime import timezone, timedelta\nprint(repr(timezone(timedelta(hours=9))))', 'datetime.timezone(datetime.timedelta(seconds=32400))'],
  ['from datetime import timezone, timedelta\nprint(timezone(timedelta(hours=5, minutes=30), "IST"))', 'IST'],
  ['from datetime import timezone, timedelta\nprint(repr(timezone(timedelta(hours=5, minutes=30), "IST")))', "datetime.timezone(datetime.timedelta(seconds=19800), 'IST')"],
  ['from datetime import datetime, timezone\nprint(datetime(1970, 1, 1, tzinfo=timezone.utc).timestamp())', '0.0'],
  ['from datetime import datetime, timezone, timedelta\nprint(datetime(2024, 1, 2, 12, tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=9))))', '2024-01-02 21:00:00+09:00'],
  ['from datetime import datetime, timezone, timedelta\nprint(datetime(2024, 1, 2, tzinfo=timezone(timedelta(hours=9))) - datetime(2024, 1, 1, tzinfo=timezone.utc))', '15:00:00'],
  ['from datetime import datetime, timezone, timedelta\nprint(datetime(2024, 1, 1, tzinfo=timezone.utc) == datetime(2024, 1, 1, 1, tzinfo=timezone(timedelta(hours=1))))', 'True'],
  ['from datetime import time, timezone, timedelta\nprint(time(12, tzinfo=timezone.utc) == time(13, tzinfo=timezone(timedelta(hours=1))))', 'True'],
  ['from datetime import datetime, timezone\nprint(datetime(2024, 1, 1, tzinfo=timezone.utc) == datetime(2024, 1, 1))', 'False'],
  ['from datetime import datetime, timezone\ntz = timezone.utc\nprint(tz.fromutc(datetime(2024, 1, 1, tzinfo=tz)))', '2024-01-01 00:00:00+00:00'],
  ['from datetime import datetime, timezone, timedelta\njst = timezone(timedelta(hours=9))\nprint(jst.fromutc(datetime(2024, 1, 1, tzinfo=jst)))', '2024-01-01 09:00:00+09:00'],

  // ---- datetime.time ----
  ['import datetime\nprint(datetime.time(15, 4, 5))', '15:04:05'],
  ['import datetime\nprint(datetime.time(15, 4, 5, 123456).isoformat())', '15:04:05.123456'],
  ['from datetime import time\nprint(time(1, 2, 3, 4000).isoformat(timespec="milliseconds"))', '01:02:03.004'],
  ['from datetime import time\nprint(time(1, 2, 3, 4000).isoformat(timespec="hours"))', '01'],
  ['import datetime\nprint(datetime.time.fromisoformat("030405"))', '03:04:05'],
  ['import datetime\nprint(datetime.time.fromisoformat("03"))', '03:00:00'],
  ['import datetime\nprint(datetime.time(1).utcoffset())', 'None'],
  ['import datetime\nprint(datetime.time.min, datetime.time.max)', '00:00:00 23:59:59.999999'],

  // ---- tzinfo 基底 ----
  ['from datetime import tzinfo\ntz = tzinfo()\ntry:\n    tz.utcoffset(None)\n    print("no error")\nexcept NotImplementedError:\n    print("NotImplementedError")', 'NotImplementedError'],

  // ---- time モジュール ----
  ['import time\nprint(time.gmtime(0))', 'time.struct_time(tm_year=1970, tm_mon=1, tm_mday=1, tm_hour=0, tm_min=0, tm_sec=0, tm_wday=3, tm_yday=1, tm_isdst=0)'],
  ['import time\nprint(time.gmtime(1709164800).tm_mday)', '29'],
  ['import time\nprint(time.gmtime(-1))', 'time.struct_time(tm_year=1969, tm_mon=12, tm_mday=31, tm_hour=23, tm_min=59, tm_sec=59, tm_wday=2, tm_yday=365, tm_isdst=0)'],
  ['import time\nprint(time.asctime((2024, 1, 2, 3, 4, 5, 1, 2, -1)))', 'Tue Jan  2 03:04:05 2024'],
  ['import time\nprint(time.strftime("%Y-%m-%d", (2024, 1, 2, 3, 4, 5, 1, 2, -1)))', '2024-01-02'],
  ['import time\nprint(time.strptime("2024-02-29", "%Y-%m-%d").tm_mday)', '29'],
  ['import time\nst = time.struct_time((2024, 1, 2, 3, 4, 5, 1, 2, -1))\nprint(st[1:3], st[-1], len(st))', '(1, 2) -1 9'],
  ['import time\nprint(time.struct_time.n_fields, time.struct_time.n_sequence_fields)', '11 9'],
  ['import time\nprint(time.gmtime(0).tm_zone, time.gmtime(0).tm_gmtoff)', 'GMT 0'],

  // ---- calendar モジュール ----
  ['import calendar\nprint(calendar.isleap(2000), calendar.isleap(1900), calendar.isleap(2024))', 'True False True'],
  ['import calendar\nprint(calendar.leapdays(2000, 2024))', '6'],
  ['import calendar\nprint(calendar.weekday(2024, 2, 29))', '3'],
  ['import calendar\nprint(calendar.monthrange(2024, 2))', '(calendar.THURSDAY, 29)'],
  ['import calendar\nprint(calendar.monthrange(1900, 2))', '(calendar.THURSDAY, 28)'],
  ['import calendar\nprint(calendar.monthcalendar(2024, 2)[0])', '[0, 0, 0, 1, 2, 3, 4]'],
  ['import calendar\nprint(calendar.month_name[2], calendar.day_name[3])', 'February Thursday'],
  ['import calendar\nprint(list(calendar.day_abbr))', "['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"],
  ['import calendar\nprint(calendar.timegm((2024, 1, 2, 3, 4, 5)))', '1704164645'],
  ['import calendar\nprint(calendar.TextCalendar().formatmonth(2024, 2))', '   February 2024\nMo Tu We Th Fr Sa Su\n          1  2  3  4\n 5  6  7  8  9 10 11\n12 13 14 15 16 17 18\n19 20 21 22 23 24 25\n26 27 28 29\n'],
  ['import calendar\nprint(calendar.TextCalendar(6).formatmonth(2024, 2))', '   February 2024\nSu Mo Tu We Th Fr Sa\n             1  2  3\n 4  5  6  7  8  9 10\n11 12 13 14 15 16 17\n18 19 20 21 22 23 24\n25 26 27 28 29\n'],
  ['import calendar\nprint(calendar.HTMLCalendar().formatmonth(2024, 2))', '<table border="0" cellpadding="0" cellspacing="0" class="month">\n<tr><th colspan="7" class="month">February 2024</th></tr>\n<tr><th class="mon">Mon</th><th class="tue">Tue</th><th class="wed">Wed</th><th class="thu">Thu</th><th class="fri">Fri</th><th class="sat">Sat</th><th class="sun">Sun</th></tr>\n<tr><td class="noday">&nbsp;</td><td class="noday">&nbsp;</td><td class="noday">&nbsp;</td><td class="thu">1</td><td class="fri">2</td><td class="sat">3</td><td class="sun">4</td></tr>\n<tr><td class="mon">5</td><td class="tue">6</td><td class="wed">7</td><td class="thu">8</td><td class="fri">9</td><td class="sat">10</td><td class="sun">11</td></tr>\n<tr><td class="mon">12</td><td class="tue">13</td><td class="wed">14</td><td class="thu">15</td><td class="fri">16</td><td class="sat">17</td><td class="sun">18</td></tr>\n<tr><td class="mon">19</td><td class="tue">20</td><td class="wed">21</td><td class="thu">22</td><td class="fri">23</td><td class="sat">24</td><td class="sun">25</td></tr>\n<tr><td class="mon">26</td><td class="tue">27</td><td class="wed">28</td><td class="thu">29</td><td class="noday">&nbsp;</td><td class="noday">&nbsp;</td><td class="noday">&nbsp;</td></tr>\n</table>\n'],
  ['import calendar\nprint(calendar.Calendar().monthdatescalendar(2024, 2)[0][3])', '2024-02-01'],
  ['import calendar\nprint(list(calendar.Calendar().itermonthdays(2024, 2))[:4])', '[0, 0, 0, 1]'],
  ['import calendar\nprint(calendar.Day(3).name, calendar.Month(12).value)', 'THURSDAY 12'],
  ['import calendar\nprint(calendar.MONDAY, calendar.SUNDAY)', '0 6'],
  ['import calendar\nprint(repr(calendar.MONDAY))', 'calendar.MONDAY'],
  ['import calendar\nprint(calendar.TextCalendar().formatweekheader(3))', 'Mon Tue Wed Thu Fri Sat Sun'],
];
for (const [code, expected] of CASES) {
  test('B7 G6: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), []);
    if (expected.includes('\n')) assert.equal(outs(r).join('\n'), expected);
    else assert.deepEqual(outs(r), [expected]);
  });
}

/* 異常ケース：正しい例外種別で止まること */
const ERROR_CASES = [
  ['import datetime\nprint(datetime.date(2023, 2, 29))', /ValueError：day is out of range for month/],
  ['import datetime\nprint(datetime.date(1900, 2, 29))', /ValueError：day is out of range for month/],
  ['import datetime\nprint(datetime.date(2024, 13, 1))', /ValueError：month must be in 1\.\.12/],
  ['import datetime\nprint(datetime.date(0, 1, 1))', /ValueError：year 0 is out of range/],
  ['import datetime\nprint(datetime.time(24))', /ValueError：hour must be in 0\.\.23/],
  ['from datetime import date, timedelta\nprint(date(9999, 12, 31) + timedelta(days=1))', /OverflowError：date value out of range/],
  ['from datetime import timedelta\nprint(timedelta(days=1000000000))', /OverflowError/],
  ['from datetime import timezone, timedelta\nprint(timezone(timedelta(hours=24)))', /ValueError：offset must be a timedelta strictly between/],
  ['from datetime import datetime, timezone\nprint(datetime(2024, 1, 1) < datetime(2024, 1, 1, tzinfo=timezone.utc))', /TypeError：can't compare offset-naive and offset-aware datetimes/],
  ['import datetime\nprint(datetime.date(2024, 1, 1) - datetime.datetime(2024, 1, 1))', /TypeError/],
  ['import datetime\nprint(datetime.date.fromisocalendar(2019, 53, 1))', /ValueError：Invalid week: 53/],
  ['import datetime\nprint(datetime.date.fromisocalendar(2020, 53, 8))', /ValueError：Invalid day: 8/],
  ['import datetime\nprint(datetime.date.fromisoformat("2024-02"))', /ValueError：Invalid isoformat string/],
  ['import datetime\nprint(datetime.datetime.strptime("2024/02/29", "%Y-%m-%d"))', /ValueError：time data/],
  ['import datetime\nprint(datetime.datetime.strptime("2024-02-29x", "%Y-%m-%d"))', /ValueError：unconverted data remains: x/],
  ['import time\nprint(time.strftime("%Y", (2024, 1, 2, 3, 4, 5, 1, 2, -1, "GMT", 0)))', /TypeError：illegal time tuple argument/],
  ['import time\nprint(time.gmtime(0)[9])', /IndexError/],
  ['import calendar\nprint(calendar.monthrange(2024, 13))', /calendar\.IllegalMonthError：bad month number 13; must be 1-12/],
  ['import calendar\ncalendar.setfirstweekday(7)', /calendar\.IllegalWeekdayError：bad weekday number 7; must be 0 \(Monday\) to 6 \(Sunday\)/],
  ['import zoneinfo\nzoneinfo.reset_tzpath()', /未対応/],
  ['import time\ntime.sleep(0)', /未対応/],
];
for (const [code, expected] of ERROR_CASES) {
  test('B7 G6 error: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.match(errs(r).join(' '), expected);
  });
}

/* 未検証・未対応の正直さ：黙って値を返さず、診断で明示すること */
const UNVERIFIED_CASES = [
  'import datetime\nprint(datetime.date.today())',
  'import datetime\nprint(datetime.datetime.now())',
  'import time\nprint(time.time())',
  'import time\nprint(time.localtime(0))',
  'import zoneinfo\nprint(zoneinfo.ZoneInfo("Asia/Tokyo"))',
  'import zoneinfo\nprint(zoneinfo.available_timezones())',
];
for (const code of UNVERIFIED_CASES) {
  test('B7 G6 unverified: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.match(traceText(r), /未検証：/);
  });
}

test('B7 G6: リファレンスは259件・正規形・status内訳が一致する', () => {
  assert.equal(referenceAdvanced.length, 259);
  const count = { supported: 0, unverified: 0, unsupported: 0 };
  const seen = new Set();
  for (const it of referenceAdvanced) {
    assert.ok(it.name && it.category && it.syntax && it.description && it.example && it.source, it.name);
    assert.ok(it.status in count, it.name);
    assert.ok(!seen.has(it.name), 'duplicate: ' + it.name);
    seen.add(it.name);
    count[it.status] += 1;
  }
  assert.deepEqual(count, { supported: 193, unverified: 61, unsupported: 5 });
});

/* F-04 照合：supported 項目の example は全件エラーなく実行でき、
 * 未検証診断も出ないこと（期待出力そのものは上のケース表で保持）。 */
test('B7 G6 F-04: supported 例題193件が全件実行できる', async () => {
  const bad = [];
  for (const it of referenceAdvanced) {
    if (it.status !== 'supported') continue;
    const r = await run(it.example);
    if (errs(r).length || traceText(r).includes('未検証：')) bad.push(it.name);
  }
  assert.deepEqual(bad, []);
});
