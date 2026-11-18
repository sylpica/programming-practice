// B7 追補 R5（G6/G2 フック配線）の検証。
// 基盤フック unary／round／format／setattr を既存実装へ配線した分のテスト：
//   1. datetime.timedelta の unary（-／+／abs）
//   2. date／datetime／time の format フック（format() と f文字列）
//   3. Fraction／Decimal の format フック
//   4. decimal.Context の setattr フック
//   5. Decimal の round フック
//   6. G6 未検証61件の再判定（kwargs 二重評価修正後の実走プローブ）
// 期待値はすべて CPython 3.12.3 実走との差分照合（キュレーション184件＋
// ランダムスイープ1,282件）で一致を確認したもの。
// 実行: node --test tests/muse-adv-b7-r5.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import '../js/types/python/impl-advanced-g1.js';
import '../js/types/python/impl-advanced-decimal.js';
import '../js/types/python/group-advanced-g6.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);
const traceText = (r) => JSON.stringify(r.paths[0]?.trace || []);
// decimal はモジュール状態（現在のコンテキスト）が simulate 間で残るため、
// G2 テストと同じく各プログラムの頭でリセットする。
const DEC_PRE = 'from decimal import *\nsetcontext(Context())\n';
const dec = (code) => DEC_PRE + code;

/* ---------- 1. timedelta の unary ---------- */
const TD_OK = [
  ['from datetime import timedelta\nprint(-timedelta(days=1))', ['-1 day, 0:00:00']],
  ['from datetime import timedelta\nprint(+timedelta(days=1))', ['1 day, 0:00:00']],
  ['from datetime import timedelta\nprint(-timedelta(days=-1))', ['1 day, 0:00:00']],
  ['from datetime import timedelta\nprint(abs(timedelta(days=-2)))', ['2 days, 0:00:00']],
  ['from datetime import timedelta\nprint(abs(timedelta(days=2)))', ['2 days, 0:00:00']],
  ['from datetime import timedelta\nprint(-timedelta(0))', ['0:00:00']],
  ['from datetime import timedelta\nprint(-timedelta.min)', ['999999999 days, 0:00:00']],
  ['from datetime import timedelta\nprint(abs(timedelta.min))', ['999999999 days, 0:00:00']],
  ['from datetime import timedelta\nprint(abs(timedelta.max))', ['999999999 days, 23:59:59.999999']],
  ['from datetime import timedelta\nprint(+timedelta.max)', ['999999999 days, 23:59:59.999999']],
  ['from datetime import timedelta\nprint(-timedelta(microseconds=-1))', ['0:00:00.000001']],
  ['from datetime import timedelta\nprint(-timedelta(seconds=-1))', ['0:00:01']],
  ['from datetime import timedelta\nprint(repr(-timedelta(days=1, seconds=3600)))', ['datetime.timedelta(days=-2, seconds=82800)']],
  ['from datetime import timedelta\nprint(-timedelta(days=1) == timedelta(days=-1))', ['True']],
  ['import datetime\nprint(-datetime.timedelta(days=3))', ['-3 days, 0:00:00']],
  ['from datetime import timedelta\nx = timedelta(days=5)\nprint(-x, +x, abs(x))', ['-5 days, 0:00:00 5 days, 0:00:00 5 days, 0:00:00']],
  // + はコピー（元の値と等しく、書き換えても互いに影響しない）
  ['from datetime import timedelta\nx = timedelta(days=1)\ny = +x\nprint(x == y, x is y)', ['True False']],
];
const TD_ERR = [
  ['from datetime import timedelta\nprint(-timedelta.max)', /OverflowError：days=-1000000000; must have magnitude <= 999999999/],
  ['from datetime import timedelta\nprint(~timedelta(days=1))', /TypeError/],
];

/* ---------- 2. date／datetime／time の format ---------- */
const DT_FMT_OK = [
  ["from datetime import date\nprint(format(date(2026,1,2), '%Y'))", ['2026']],
  ["from datetime import date\nprint(format(date(2026,1,2), '%Y-%m-%d'))", ['2026-01-02']],
  ["from datetime import date\nprint(format(date(2026,1,2), ''))", ['2026-01-02']],
  ["from datetime import date\nd = date(2026,1,2)\nprint(f'{d:%Y-%m-%d}')", ['2026-01-02']],
  ["from datetime import date\nd = date(2026,1,2)\nprint(f'{d}')", ['2026-01-02']],
  // CPython では任意の spec が strftime 書式として解釈される（素通し含む）
  ["from datetime import date\nprint(format(date(2026,1,2), '>10'))", ['>10']],
  ["from datetime import date\nprint(format(date(2026,1,2), 'hello'))", ['hello']],
  ["from datetime import date\nprint(format(date(2026,1,2), '%Q'))", ['%Q']],
  ["from datetime import date\nprint(format(date(2024,2,29), '%A %a %B %b %j %U %W %w %y %%'))", ['Thursday Thu February Feb 060 08 09 4 24 %']],
  ["from datetime import datetime\nprint(format(datetime(2026,1,2,3,4,5,123456), '%Y-%m-%d %H:%M:%S %f'))", ['2026-01-02 03:04:05 123456']],
  ["from datetime import datetime\nprint(format(datetime(2026,1,2,3,4,5,123456), ''))", ['2026-01-02 03:04:05.123456']],
  ["from datetime import datetime, timezone\nprint(format(datetime(2026,1,2,3,4,5,tzinfo=timezone.utc), '%z|%Z'))", ['+0000|UTC']],
  ["from datetime import time\nprint(format(time(3,4,5), '%H:%M'))", ['03:04']],
  ["from datetime import time\nprint(format(time(3,4,5), ''))", ['03:04:05']],
  ["from datetime import time\nprint(format(time(3,4,5), '%Y'))", ['1900']],
  ["from datetime import time\nt = time(3,4,5)\nprint(f'{t:%H:%M:%S}')", ['03:04:05']],
  ["import datetime\nd = datetime.date(2026,1,2)\nprint(f'{d:%Y}')", ['2026']],
  // __format__ メソッド経由と format() 経由の一致
  ["from datetime import date\nprint(date(2026,1,2).__format__('%Y'), format(date(2026,1,2), '%Y'))", ['2026 2026']],
];

/* ---------- 3a. Fraction の format ---------- */
const FR_FMT_OK = [
  ["from fractions import Fraction\nprint(format(Fraction(1,3), '.2f'))", ['0.33']],
  ["from fractions import Fraction\nprint(format(Fraction(1,3), ''))", ['1/3']],
  ["from fractions import Fraction\nprint(format(Fraction(3,2), '.2f'))", ['1.50']],
  ["from fractions import Fraction\nprint(format(Fraction(-1,3), '.2f'))", ['-0.33']],
  ["from fractions import Fraction\nprint(format(Fraction(1,3), 'e'))", ['3.333333e-01']],
  ["from fractions import Fraction\nprint(format(Fraction(1,3), '.3g'))", ['0.333']],
  ["from fractions import Fraction\nprint(format(Fraction(22,7), '.5f'))", ['3.14286']],
  ["from fractions import Fraction\nprint(format(Fraction(1,3), '%'))", ['33.333333%']],
  ["from fractions import Fraction\nprint(format(Fraction(1,3), '.0%'))", ['33%']],
  ["from fractions import Fraction\nprint(format(Fraction(2,3), '.1%'))", ['66.7%']],
  ["from fractions import Fraction\nprint(format(Fraction(355,113), '.10f'))", ['3.1415929204']],
  ["from fractions import Fraction\nprint(format(Fraction(1,7), '.20f'))", ['0.14285714285714285714']],
  ["from fractions import Fraction\nprint(format(Fraction(-5,2), '08.1f'))", ['-00002.5']],
  ["from fractions import Fraction\nprint(format(Fraction(5,2), '08.1f'))", ['000002.5']],
  ["from fractions import Fraction\nprint(format(Fraction(1,3), '010.2f'))", ['0000000.33']],
  ["from fractions import Fraction\nf = Fraction(1,3)\nprint(f'{f:.2f}')", ['0.33']],
  // R5 で是正した2件（右揃え既定・グルーピング）も __format__ と一致する
  ["from fractions import Fraction\nprint(format(Fraction(3609091,1000), '12.2f'))", ['     3609.09']],
  ["from fractions import Fraction\nprint(format(Fraction(1234567,1), ',.2f'))", ['1,234,567.00']],
  ["from fractions import Fraction\nprint(format(Fraction(1234567,1), '_.2f'))", ['1_234_567.00']],
];
const FR_FMT_ERR = [
  ["from fractions import Fraction\nprint(format(Fraction(1,3), 'd'))", /ValueError：Invalid format specifier 'd' for object of type 'Fraction'/],
];

/* ---------- 3b. Decimal の format ---------- */
const DFMT = [
  ['.2f', '1.5', '1.50'], ['.2f', '1.005', '1.00'], ['.0f', '2.5', '2'], ['.0f', '3.5', '4'],
  ['.2f', '-1.5', '-1.50'], ['.2f', '0', '0.00'], [',.2f', '1234567.891', '1,234,567.89'],
  ['10.2f', '1234.5', '   1234.50'], ['<10.2f', '1234.5', '1234.50   '], ['^10.2f', '1234.5', ' 1234.50  '],
  ['010.2f', '1234.5', '0001234.50'], ['010.2f', '-1234.5', '-001234.50'], ['+.2f', '1.5', '+1.50'],
  [' .2f', '1.5', ' 1.50'], ['.2e', '12345.678', '1.23e+4'], ['.2E', '12345.678', '1.23E+4'],
  ['.2e', '0.00012345', '1.23e-4'], ['.3g', '12345.678', '1.23e+4'], ['g', '12345.678', '12345.678'],
  ['g', '0.00012345', '0.00012345'], ['g', '100', '100'], ['%', '1.5', '150%'], ['.1%', '0.015', '1.5%'],
  ['f', 'Infinity', 'Infinity'], ['f', '-Infinity', '-Infinity'], ['f', 'NaN', 'NaN'],
  ['%', 'Infinity', 'Infinity%'], ['%', 'NaN', 'NaN%'],
  ['f', '1E+30', '1000000000000000000000000000000'], ['f', '1E-30', '0.000000000000000000000000000001'],
  ['', '2.50', '2.50'], ['', '1E+2', '1E+2'], ['e', '123.456', '1.23456e+2'], ['f', '123.456', '123.456'],
  ['.10f', '123.456', '123.4560000000'], ['.1f', '-0', '-0.0'], ['n', '5', '5'], ['n', '1234.5', '1234.5'],
  ['#.0f', '1.5', '2.'], ['#g', '100', '100.'], ['#.0g', '0.25', '0.2'], ['05', '7', '00007'],
  ['08.1f', '7.5', '000007.5'], ['08.1f', '-7.5', '-00007.5'], ['.2', '1.5', '1.5'],
  ['>12', '123.456', '     123.456'], ['10', '1E+2', '      1E+2'], ['n', '1E+2', '1e+2'],
  // ゼロの e 書式の癖（精度省略時は元の指数、明示時は指数＋精度）
  ['.2e', '0', '0.00e+2'], ['.2e', '0.00', '0.00e+0'], ['e', '0', '0e+0'], ['e', '0.0', '0e-1'],
  ['e', '0E+5', '0e+5'], ['g', '0.00', '0.00'], ['g', '0E+3', '0e+3'],
  // g の科学表記切替は to-sci 規則（指数>0 または調整指数<-6）
  ['.5g', '999999', '1.0000e+6'], ['.6g', '999999', '999999'], ['.2g', '999', '1.0e+3'],
  ['.2g', '0.0009999', '0.0010'], ['.2g', '3E-6', '0.000003'], ['g', '1.5E-7', '1.5e-7'],
  ['.3', '123.456', '123'], ['.3', '123456.789', '1.23E+5'], ['.3', '0.000123456', '0.000123'],
  ['.3g', '7.5', '7.5'], ['.5e', '1.5', '1.50000e+0'], ['.3G', '123456.789', '1.23E+5'],
  ['.3n', '123456.789', '1.23e+5'], ['010f', 'Infinity', '  Infinity'], ['010f', 'NaN', '       NaN'],
  ['=10f', '-Infinity', '- Infinity'], ['+f', 'Infinity', '+Infinity'], ['#.2e', '1.5', '1.50e+0'],
  ['#.0e', '2', '2.e+0'], ['.1f', '9.99', '10.0'], ['.1f', '9.85', '9.8'], ['z.1f', '-0', '0.0'],
  ['f', '0.00005', '0.00005'], [',', '1234.5', '1,234.5'],
];
const DFMT_ERR_SPECS = ['_.2f', 'd', 'x', 's', 'c', ',n', '.f', 'q', 'b', 'o'];

/* ---------- 5. Decimal の round ---------- */
const DR_OK = [
  ["print(round(Decimal('2.5')))", ['2']],
  ["print(type(round(Decimal('2.5'))))", ["<class 'int'>"]],
  ["print(round(Decimal('3.5')))", ['4']],
  ["print(round(Decimal('-2.5')))", ['-2']],
  ["print(round(Decimal('0.5')))", ['0']],
  ["print(round(Decimal('1.5')))", ['2']],
  ["print(round(Decimal('2.567'), 2))", ['2.57']],
  ["print(type(round(Decimal('2.567'), 2)))", ["<class 'decimal.Decimal'>"]],
  ["print(round(Decimal('2.5'), 0))", ['2']],
  ["print(round(Decimal('2.567'), 1))", ['2.6']],
  ["print(round(Decimal('123.456'), -1))", ['1.2E+2']],
  ["print(round(Decimal('150'), -2))", ['2E+2']],
  ["print(round(Decimal('250'), -2))", ['2E+2']],
  ["print(round(Decimal('2.5'), None))", ['2']],
  ["print(round(Decimal('NaN'), 2))", ['NaN']],
  ["print(round(Decimal('0.125'), 2))", ['0.12']],
  ["print(round(Decimal('2.675'), 2))", ['2.68']],
  ["print(round(Decimal('1E+2'), -5))", ['0E+5']],
  ["print(round(Decimal('5'), -1))", ['0E+1']],
  ["print(round(Decimal('-0.5')))", ['0']],
  ["print(round(Decimal('2.5'), -100))", ['0E+100']],
  ["print(round(Decimal('2.5'), True))", ['2.5']],
  ["print(round(Decimal('0.0001'), 2))", ['0.00']],
];
const DR_CTX = [
  // ndigits ありは現在のコンテキスト（丸めモード・prec）で quantize と等価
  ["setcontext(Context(prec=3, rounding='ROUND_DOWN'))\nprint(round(Decimal('2.567'), 2))", ['2.56']],
  ["setcontext(Context(rounding='ROUND_DOWN'))\nprint(round(Decimal('3.5'), 0))", ['3']],
  // ndigits 省略はコンテキストの影響を受けない（偶数丸めで int）
  ["setcontext(Context(prec=3, rounding='ROUND_DOWN'))\nprint(round(Decimal('2.9')))", ['3']],
];
const DR_ERR = [
  ["print(round(Decimal('NaN')))", /ValueError：cannot convert NaN to integer/],
  ["print(round(Decimal('Infinity')))", /OverflowError：cannot convert Infinity to integer/],
  ["print(round(Decimal('Infinity'), 2))", /decimal\.InvalidOperation/],
  ["print(round(Decimal('sNaN'), 2))", /decimal\.InvalidOperation/],
  ["print(round(Decimal('2.5'), 100))", /decimal\.InvalidOperation/],
  ["print(round(Decimal('12345'), -1))", null], // 既定コンテキストでは成功（対照）
  ["print(round(Decimal('2.567'), 2.0))", /TypeError：optional arg must be an integer/],
];

/* ---------- 4. Context の setattr ---------- */
const CX_OK = [
  ["c = Context(prec=5)\nc.prec = 3\nprint(c.prec)", ['3']],
  ["c = Context(prec=5)\nc.prec = 3\nprint(c.create_decimal('1.2345'))", ['1.23']],
  ["c = Context(prec=3)\nc.rounding = 'ROUND_DOWN'\nprint(c.create_decimal('1.239'))", ['1.23']],
  ["c = Context(prec=3)\nprint(c.create_decimal('1.239'))", ['1.24']],
  ["c = Context(prec=5)\nc.rounding = ROUND_DOWN\nprint(c.rounding)", ['ROUND_DOWN']],
  ["c = Context(prec=5, Emax=3)\nc.Emax = 10\nprint(c.create_decimal('1E+5'))", ['1E+5']],
  ["c = Context(prec=5)\nc.prec = True\nprint(c.prec)", ['1']],
  ["getcontext().prec = 7\nprint(getcontext().prec)", ['7']],
  ["getcontext().prec = 7\nprint(Decimal('1.23456789') + Decimal(0))", ['1.234568']],
  ["c = Context(prec=5)\nc.prec = 3\nprint(c)", ["Context(prec=3, rounding=ROUND_HALF_EVEN, Emin=-999999, Emax=999999, capitals=1, clamp=0, flags=[], traps=[InvalidOperation, DivisionByZero, Overflow])"]],
  ["c = Context(prec=28)\nc.Emin = -10\nprint(c.Emin, c.create_decimal('1E-20'))", ['-10 1E-20']],
  // Emin の変更が Etiny（= Emin - prec + 1 = -37）経由で実際に効くこと
  ["c = Context(prec=28)\nc.Emin = -10\nprint(c.create_decimal('1E-40'))", ['0E-37']],
  // traps/flags の dict 丸ごと代入も検証経路（applyCxFields）を通る
  ["c = Context()\nc2 = Context()\nc2.traps = c.traps\nprint(c2.traps[InvalidOperation])", ['True']],
];
const CX_ERR = [
  ["c = Context(prec=5)\nc.prec = 0\nprint(c.prec)", /ValueError：valid range for prec is \[1, MAX_PREC\]/],
  ["c = Context(prec=5)\nc.prec = 'x'\nprint(c.prec)", /TypeError：an integer is required/],
  ["c = Context(prec=5)\nc.rounding = 'BAD'\nprint(c.rounding)", /TypeError：valid values for rounding are:/],
  ["c = Context(prec=5)\nc.Emin = 1\nprint(c.Emin)", /ValueError：valid range for Emin is \[MIN_EMIN, 0\]/],
  ["c = Context(prec=5)\nc.Emax = -1\nprint(c.Emax)", /ValueError：valid range for Emax is \[0, MAX_EMAX\]/],
  ["c = Context(prec=5)\nc.capitals = 2\nprint(c.capitals)", /ValueError：valid values for capitals are 0 or 1/],
  ["c = Context(prec=5)\nc.foo = 1\nprint(c.foo)", /AttributeError：'decimal\.Context' object has no attribute 'foo'/],
  // 信号 dict は全信号を含む dict でなければ KeyError（CPython 実走）
  ["c = Context()\nc.traps = {InvalidOperation: False}\nprint(c)", /KeyError：'invalid signal dict'/],
  ["c = Context()\nc.flags = {}\nprint(c)", /KeyError：'invalid signal dict'/],
  // 属性代入では list 形を受け付けない（コンストラクタとは異なる。CPython 実走）
  ["c = Context()\nc.traps = []\nprint(c)", /TypeError：argument must be a signal dict/],
];

/* ---------- 6. G6 再判定：モジュール修飾形 kwargs と未検証の正直な停止 ---------- */
const KW_OK = [
  ['import datetime\nprint(datetime.timedelta(days=1))', ['1 day, 0:00:00']],
  ['import datetime\nprint(datetime.datetime(2024,1,1, tzinfo=datetime.timezone.utc))', ['2024-01-01 00:00:00+00:00']],
  ['import calendar\nprint(calendar.TextCalendar(firstweekday=6).formatmonth(2024, 2))',
   ['   February 2024', 'Su Mo Tu We Th Fr Sa', '             1  2  3', ' 4  5  6  7  8  9 10', '11 12 13 14 15 16 17', '18 19 20 21 22 23 24', '25 26 27 28 29', '']],
  ['import datetime\nprint(datetime.date(2024,1,1).replace(year=2025))', ['2025-01-01']],
  ['import datetime\nprint(datetime.timedelta(weeks=1, days=2, hours=3))', ['9 days, 3:00:00']],
  // caution に明記された決定計算可能な形（固定 tz の fromtimestamp／aware timestamp）
  ['from datetime import datetime, timezone\nprint(datetime.fromtimestamp(0, timezone.utc))', ['1970-01-01 00:00:00+00:00']],
  ['from datetime import datetime, timezone\nprint(datetime(2024,1,1,tzinfo=timezone.utc).timestamp())', ['1704067200.0']],
];
const STILL_UNVERIFIED = [
  'from datetime import date\nprint(date.today())',
  'from datetime import datetime\nprint(datetime.now())',
  'from datetime import datetime\nprint(datetime.utcnow())',
  'from datetime import date\nprint(date.fromtimestamp(0))',
  'from datetime import datetime\nprint(datetime.fromtimestamp(0))',
  'from datetime import datetime\nprint(datetime(2024,1,1).timestamp())',
  'import time\nprint(time.time())',
  'import time\nprint(time.monotonic())',
  'import time\nprint(time.perf_counter())',
  'import time\nprint(time.localtime())',
  'import time\nprint(time.mktime((2024,1,1,0,0,0,0,1,-1)))',
  'import time\nprint(time.get_clock_info("monotonic"))',
  'import calendar\nprint(calendar.prmonth(2024, 2))',
  'import calendar\nprint(calendar.LocaleTextCalendar().formatmonth(2024, 2))',
  'import calendar\nprint(calendar.HTMLCalendar().formatyearpage(2024))',
  "from zoneinfo import ZoneInfo\nprint(ZoneInfo('Asia/Tokyo'))",
  'from zoneinfo import available_timezones\nprint(available_timezones())',
];

test('R5-1: timedelta の unary（-／+／abs・境界・エラー）', async () => {
  for (const [code, expected] of TD_OK) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), expected, code);
  }
  for (const [code, re] of TD_ERR) {
    const r = await run(code);
    assert.match(errs(r).join('\n'), re, code);
  }
});

test('R5-2: date／datetime／time の format フック（format() と f文字列）', async () => {
  for (const [code, expected] of DT_FMT_OK) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), expected, code);
  }
});

test('R5-3a: Fraction の format フック', async () => {
  for (const [code, expected] of FR_FMT_OK) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), expected, code);
  }
  for (const [code, re] of FR_FMT_ERR) {
    const r = await run(code);
    assert.match(errs(r).join('\n'), re, code);
  }
});

test('R5-3b: Decimal の format フック（書式マトリクス）', async () => {
  for (const [spec, val, expected] of DFMT) {
    const code = dec(`print(format(Decimal('${val}'), '${spec}'))`);
    const r = await run(code);
    assert.deepEqual(errs(r), [], `${val} @ ${spec}`);
    assert.deepEqual(outs(r), [expected], `${val} @ ${spec}`);
  }
  // f文字列経由
  const r2 = await run(dec("d = Decimal('2.567')\nprint(f'{d:.2f}')"));
  assert.deepEqual(outs(r2), ['2.57']);
  // コンテキストの rounding は効くが prec は効かない
  const r3 = await run(dec("setcontext(Context(prec=3, rounding='ROUND_DOWN'))\nprint(format(Decimal('2.567'), '.2f'))"));
  assert.deepEqual(outs(r3), ['2.56']);
  const r4 = await run(dec("setcontext(Context(prec=3, rounding='ROUND_DOWN'))\nprint(format(Decimal('12345.678'), 'f'))"));
  assert.deepEqual(outs(r4), ['12345.678']);
  // 不正な書式は ValueError（CPython 3.12.3 実走：'_' も Decimal では不正）
  for (const spec of DFMT_ERR_SPECS) {
    const r = await run(dec(`print(format(Decimal('1.5'), '${spec}'))`));
    assert.match(errs(r).join('\n'), /ValueError：invalid format string/, spec);
  }
});

test('R5-5: Decimal の round フック', async () => {
  for (const [body, expected] of DR_OK) {
    const r = await run(dec(body));
    assert.deepEqual(errs(r), [], body);
    assert.deepEqual(outs(r), expected, body);
  }
  for (const [body, expected] of DR_CTX) {
    const r = await run(dec(body));
    assert.deepEqual(errs(r), [], body);
    assert.deepEqual(outs(r), expected, body);
  }
  for (const [body, re] of DR_ERR) {
    const r = await run(dec(body));
    if (re) assert.match(errs(r).join('\n'), re, body);
    else assert.deepEqual(errs(r), [], body);
  }
  // 安全整数を超える整数化は、正直な未検証停止（誤った値を出さない）
  const big = await run(dec("print(round(Decimal('1E+30')))"));
  assert.deepEqual(errs(big), []);
  assert.ok(traceText(big).includes('未検証') || outs(big).join('').includes('実行時に決まる'), 'huge int round must stop honestly');
});

test('R5-4: Context の setattr フック', async () => {
  for (const [body, expected] of CX_OK) {
    const r = await run(dec(body));
    assert.deepEqual(errs(r), [], body);
    assert.deepEqual(outs(r), expected, body);
  }
  for (const [body, re] of CX_ERR) {
    const r = await run(dec(body));
    assert.match(errs(r).join('\n'), re, body);
  }
});

test('R5-6: モジュール修飾形 kwargs は決定計算でき、未検証61件は今も正直に止まる', async () => {
  for (const [code, expected] of KW_OK) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), expected, code);
    assert.ok(!traceText(r).includes('未検証：'), code);
  }
  for (const code of STILL_UNVERIFIED) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.ok(traceText(r).includes('未検証：'), code + ' は未検証のまま正直に止まること');
  }
  // CPython に存在しない strptime（date／time）は AttributeError のまま
  const r = await run('from datetime import date\nprint(date.strptime)');
  assert.match(errs(r).join('\n'), /AttributeError/);
});
