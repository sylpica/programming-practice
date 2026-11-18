/* 高度モード B7 G6 共有コア：暦計算（proleptic Gregorian・序数ベース整数演算）、
 * strftime／strptime エンジン（C ロケール＝英語名固定）、timedelta 正規化。
 * 一次情報：Python 公式ドキュメント 3.15（datetime／time／calendar）と
 * CPython 3.12.3 実走、CPython 同梱 calendar.py／_strptime.py のアルゴリズム。
 * JS の Date はタイムゾーン事故の温床のため一切使わない。 */
import { PyAPI } from './engine.js';

export const { NUM, BOOL, NONE, LIST, TUPLE } = PyAPI;
export const I = (v) => NUM(v, false);
export const F = (v) => NUM(v, true);

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_ABBR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MDAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DBM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // 1月1日からの累積（平年）

export const isLeap = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
export const daysInMonth = (y, m) => MDAYS[m] + (m === 2 && isLeap(y) ? 1 : 0);
export const daysBeforeYear = (y) => { const n = y - 1; return 365 * n + Math.floor(n / 4) - Math.floor(n / 100) + Math.floor(n / 400); };
export const daysBeforeMonth = (y, m) => DBM[m - 1] + (m > 2 && isLeap(y) ? 1 : 0);
export const toOrdinal = (y, m, d) => daysBeforeYear(y) + daysBeforeMonth(y, m) + d;
export const MAXORDINAL = toOrdinal(9999, 12, 31); // 3652059

export function fromOrdinal(ord) {
  // CPython の ord2ymd と同じ 400/100/4/1 年周期分解。
  let n = ord - 1;
  const n400 = Math.floor(n / 146097); n -= n400 * 146097;
  const n100 = Math.floor(n / 36524); n -= n100 * 36524;
  const n4 = Math.floor(n / 1461); n -= n4 * 1461;
  const n1 = Math.floor(n / 365); n -= n1 * 365;
  const year = 400 * n400 + 100 * n100 + 4 * n4 + n1 + 1;
  if (n100 === 4 || n1 === 4) return { y: year - 1, m: 12, d: 31 };
  let m = 1;
  while (n >= daysInMonth(year, m)) { n -= daysInMonth(year, m); m += 1; }
  return { y: year, m, d: n + 1 };
}
export const weekdayOf = (y, m, d) => (toOrdinal(y, m, d) - 1) % 7; // 月曜=0
export const ydayOf = (y, m, d) => daysBeforeMonth(y, m) + d; // 1始まり

export function isoCalendar(y, m, d) {
  const ord = toOrdinal(y, m, d);
  const wd = (ord - 1) % 7; // 月曜=0
  const isoWd = wd + 1;
  const thu = fromOrdinal(ord + (4 - isoWd));
  const isoYear = thu.y;
  const jan4 = toOrdinal(isoYear, 1, 4);
  const week1Mon = jan4 - ((jan4 - 1) % 7);
  const week = Math.floor((ord - week1Mon) / 7) + 1;
  return { y: isoYear, w: week, wd: isoWd };
}
export function weeksInIsoYear(y) {
  // 12月28日は常にその ISO 年の最終週に属する。
  return isoCalendar(y, 12, 28).w;
}
export function ordinalFromIso(y, w, wd) {
  const jan4 = toOrdinal(y, 1, 4);
  const week1Mon = jan4 - ((jan4 - 1) % 7);
  return week1Mon + (w - 1) * 7 + (wd - 1);
}

/* ---- timedelta：総マイクロ秒（BigInt）経由で正規化する ---- */
export const US_PER_DAY = 86400000000n;
export function tdNormalize(totalUs) {
  // CPython の規則：days は負方向へ floor、seconds／microseconds は正の範囲。
  let days = totalUs / US_PER_DAY;
  let rem = totalUs - days * US_PER_DAY;
  if (rem < 0n) { days -= 1n; rem += US_PER_DAY; }
  const seconds = Number(rem / 1000000n);
  const us = Number(rem % 1000000n);
  return { d: Number(days), s: seconds, us };
}
export const tdTotalUs = (t) => BigInt(t.d) * US_PER_DAY + BigInt(t.s) * 1000000n + BigInt(t.us);
export function tdCheckRange(ctx, t) {
  if (t.d > 999999999 || t.d < -999999999) ctx.err('OverflowError', 'timedelta value out of range', '');
  return t;
}
export function tdStr(t) {
  const mm = Math.floor(t.s / 60), ss = t.s % 60, hh = Math.floor(mm / 60), m2 = mm % 60;
  let time = hh + ':' + String(m2).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  if (t.us) time += '.' + String(t.us).padStart(6, '0');
  if (t.d !== 0) return t.d + (Math.abs(t.d) === 1 ? ' day, ' : ' days, ') + time;
  return time;
}
export function tdRepr(t) {
  if (t.d === 0 && t.s === 0 && t.us === 0) return 'datetime.timedelta(0)';
  const parts = [];
  if (t.d) parts.push('days=' + t.d);
  if (t.s) parts.push('seconds=' + t.s);
  if (t.us) parts.push('microseconds=' + t.us);
  return 'datetime.timedelta(' + parts.join(', ') + ')';
}

/* ---- 引数ヘルパ ---- */
export function intArg(ctx, v, what) {
  if (ctx.isBool(v)) return v.v ? 1 : 0;
  if (ctx.isNum(v) && !v.f) return v.v;
  if (v && v.__native && (v.__native === 'calendar.Day' || v.__native === 'calendar.Month')) return v.data.v;
  ctx.err('TypeError', what + ' には整数を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return 0;
}
export function numArg(ctx, v, what) {
  const n = ctx.num(v);
  if (n === null) ctx.err('TypeError', what + ' には数値を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return n;
}
export function strArg(ctx, v, what) {
  const s = ctx.str(v);
  if (s === null) ctx.err('TypeError', what + ' には文字列を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return s;
}
export function noKwargs(ctx, kwargs, fname) {
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', fname + '() にキーワード引数「' + ks[0] + '」はありません', '');
}
export function roundHalfEven(x) {
  const f = Math.floor(x), diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

/* ---- strftime（C ロケール） ----
 * fields: {y, m, d, H, M, S, us, wdayMon(0=Mon), yday(1始まり),
 *          tzOffsetSec(null=naive/不明), tzName(''可), iso:{y,w,wd}|null} */
export function strftimeCore(f, fmt) {
  const p2 = (n) => String(n).padStart(2, '0');
  const wdaySun = (f.wdayMon + 1) % 7;
  let out = '';
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] !== '%') { out += fmt[i]; continue; }
    i += 1;
    if (i >= fmt.length) { out += '%'; break; }
    const c = fmt[i];
    switch (c) {
      case '%': out += '%'; break;
      case 'Y': out += String(f.y).padStart(4, '0'); break;
      case 'y': out += p2(f.y % 100); break;
      case 'm': out += p2(f.m); break;
      case 'd': out += p2(f.d); break;
      case 'e': out += String(f.d).padStart(2, ' '); break;
      case 'H': out += p2(f.H); break;
      case 'I': out += p2(f.H % 12 === 0 ? 12 : f.H % 12); break;
      case 'M': out += p2(f.M); break;
      case 'S': out += p2(f.S); break;
      case 'f': out += String(f.us || 0).padStart(6, '0'); break;
      case 'j': out += String(f.yday).padStart(3, '0'); break;
      case 'p': out += f.H < 12 ? 'AM' : 'PM'; break;
      case 'a': out += DAY_ABBR[f.wdayMon]; break;
      case 'A': out += DAY_NAMES[f.wdayMon]; break;
      case 'b': case 'h': out += MONTH_ABBR[f.m]; break;
      case 'B': out += MONTH_NAMES[f.m]; break;
      case 'w': out += String(wdaySun); break;
      case 'U': out += p2(Math.floor((f.yday - 1 - wdaySun + 7) / 7)); break;
      case 'W': out += p2(Math.floor((f.yday - 1 - f.wdayMon + 7) / 7)); break;
      case 'G': out += f.iso ? String(f.iso.y).padStart(4, '0') : ''; break;
      case 'V': out += f.iso ? p2(f.iso.w) : ''; break;
      case 'u': out += f.iso ? String(f.iso.wd) : String(f.wdayMon + 1); break;
      case 'z': {
        if (f.tzOffsetSec === null || f.tzOffsetSec === undefined) break;
        const off = f.tzOffsetSec;
        const sign = off < 0 ? '-' : '+';
        const a = Math.abs(off);
        const hh = Math.floor(a / 3600), mm = Math.floor((a % 3600) / 60), ss = a % 60;
        out += sign + p2(hh) + p2(mm) + (ss ? p2(ss) : '');
        break;
      }
      case 'Z': out += f.tzName || ''; break;
      default: out += '%' + c; break;
    }
  }
  return out;
}

/* ---- strptime（_strptime.py 相当の部分集合） ----
 * 戻り値：{y, mo, d, H, M, S, us, wdayMon|null, yday|null, tzOffsetSec|null|'Z'}
 * 失敗時は null（呼び出し側が CPython の文面で ValueError を出す）。 */
export function strptimeCore(data, fmt) {
  const res = { y: null, mo: null, d: null, H: null, M: null, S: null, us: 0, wdayMon: null, yday: null, tzOffsetSec: null, weekU: null, weekW: null, wdaySun: null };
  let di = 0;
  const fail = { fail: true };
  const isWs = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
  function digits(min, max) {
    let j = di, s = '';
    while (j < data.length && s.length < max && data[j] >= '0' && data[j] <= '9') { s += data[j]; j += 1; }
    if (s.length < min) throw fail;
    di = j;
    return parseInt(s, 10);
  }
  function nameMatch(names, skipEmpty) {
    const rest = data.slice(di).toLowerCase();
    let best = -1, bestLen = 0;
    for (let k = 0; k < names.length; k++) {
      const nm = names[k];
      if (!nm) continue;
      if (rest.startsWith(nm.toLowerCase()) && nm.length > bestLen) { best = k; bestLen = nm.length; }
    }
    if (best < 0) throw fail;
    di += bestLen;
    return best;
  }
  try {
    for (let fi = 0; fi < fmt.length; fi++) {
      const fc = fmt[fi];
      if (fc === '%') {
        fi += 1;
        if (fi >= fmt.length) throw fail;
        const c = fmt[fi];
        switch (c) {
          case '%': if (data[di] !== '%') throw fail; di += 1; break;
          case 'Y': res.y = digits(1, 4); break;
          case 'y': { const v = digits(2, 2); res.y = v <= 68 ? 2000 + v : 1900 + v; break; }
          case 'm': res.mo = digits(1, 2); break;
          case 'd': res.d = digits(1, 2); break;
          case 'H': res.H = digits(1, 2); break;
          case 'I': { const v = digits(1, 2); res.H = v; res._i12 = true; break; }
          case 'M': res.M = digits(1, 2); break;
          case 'S': res.S = digits(1, 2); break;
          case 'f': { let j = di, s = ''; while (j < data.length && s.length < 6 && data[j] >= '0' && data[j] <= '9') { s += data[j]; j += 1; } if (!s) throw fail; di = j; res.us = parseInt(s.padEnd(6, '0'), 10); break; }
          case 'j': res.yday = digits(1, 3); break;
          case 'p': {
            const rest = data.slice(di, di + 2).toLowerCase();
            if (rest === 'am') res._pm = false; else if (rest === 'pm') res._pm = true; else throw fail;
            di += 2; break;
          }
          case 'a': res.wdayMon = nameMatch(DAY_ABBR.concat(DAY_NAMES).map((n, ix) => ix < 7 ? n : DAY_NAMES[ix - 7]), true) % 7; break;
          case 'A': res.wdayMon = nameMatch(DAY_NAMES, true); break;
          case 'b': case 'h': { const names = []; for (let k = 1; k <= 12; k++) names.push(MONTH_ABBR[k]); for (let k = 1; k <= 12; k++) names.push(MONTH_NAMES[k]); res.mo = nameMatch(names, true) % 12 + 1; break; }
          case 'B': res.mo = nameMatch(MONTH_NAMES.slice(1), true) + 1; break;
          case 'w': { const v = digits(1, 1); res.wdaySun = v; res.wdayMon = (v + 6) % 7; break; }
          case 'U': res.weekU = digits(1, 2); break;
          case 'W': res.weekW = digits(1, 2); break;
          case 'z': {
            if (data[di] === 'Z') { res.tzOffsetSec = 0; di += 1; break; }
            const mm = /^([+-])(\d{2})(?::?(\d{2}))?(?::?(\d{2}))?(?:\.(\d{1,6}))?/.exec(data.slice(di));
            if (!mm) throw fail;
            di += mm[0].length;
            let sec = parseInt(mm[2], 10) * 3600 + (mm[3] ? parseInt(mm[3], 10) * 60 : 0) + (mm[4] ? parseInt(mm[4], 10) : 0);
            if (mm[1] === '-') sec = -sec;
            res.tzOffsetSec = sec;
            break;
          }
          case 'Z': {
            const rest = data.slice(di).toLowerCase();
            if (rest.startsWith('utc')) { res.tzOffsetSec = 0; di += 3; }
            else if (rest.startsWith('gmt')) { res.tzOffsetSec = 0; di += 3; }
            else throw fail;
            break;
          }
          default: throw fail;
        }
      } else if (isWs(fc)) {
        while (di < data.length && isWs(data[di])) di += 1;
      } else {
        if (data[di] !== fc) throw fail;
        di += 1;
      }
    }
  } catch (e) {
    if (e === fail) return null;
    throw e;
  }
  if (di < data.length) return { leftover: data.slice(di) };
  if (res._i12) {
    if (res._pm === true && res.H < 12) res.H += 12;
    if (res._pm === false && res.H === 12) res.H = 0;
  }
  return res;
}

/* エンジンのスライス添字オブジェクト {__slice, lo, hi, step}（lo/hi/step は値か null）から
 * CPython の slice.indices と同じ規則でインデックス列を作る。 */
export function sliceIdxList(ctx, len, sl) {
  const iv = (v) => (v === null || v === undefined || (v && v.__none)) ? null : ctx.int(v);
  let step = iv(sl.step);
  if (step === null) step = 1;
  if (step === 0) ctx.err('ValueError', 'slice step cannot be zero');
  const adj = (v, def, lowB, highB) => { if (v === null) return def; if (v < 0) { v += len; if (v < lowB) v = lowB; } else if (v > highB) v = highB; return v; };
  const a = step > 0 ? adj(iv(sl.lo), 0, 0, len) : adj(iv(sl.lo), len - 1, -1, len - 1);
  const b = step > 0 ? adj(iv(sl.hi), len, 0, len) : adj(iv(sl.hi), -1, -1, len - 1);
  const idx = [];
  if (step > 0) for (let k = a; k < b; k += step) idx.push(k); else for (let k = a; k > b; k += step) idx.push(k);
  return idx;
}

/* strptime の結果から日付を確定する（%j／週番号の換算を含む）。
 * year の既定は CPython と同じ 1900。{y, mo, d} を返す。 */
export function strptimeDate(res) {
  let y = res.y === null ? 1900 : res.y;
  let mo = res.mo, d = res.d;
  if (res.yday !== null && mo === null) {
    let yy = y, rem = res.yday;
    let mm2 = 1;
    while (rem > daysInMonth(yy, mm2)) { rem -= daysInMonth(yy, mm2); mm2 += 1; }
    mo = mm2; d = rem;
  }
  const week = res.weekU !== null ? res.weekU : res.weekW;
  if (week !== null && res.wdayMon !== null && mo === null) {
    // %U は日曜始まり（週内オフセットは日曜=0）、%W は月曜始まり（月曜=0）。
    // 週0はその年の最初の週頭曜日より前の日々（CPython _strptime の換算）。
    const isU = res.weekU !== null;
    const jan1Ord = toOrdinal(y, 1, 1);
    const jan1W = isU ? (weekdayOf(y, 1, 1) + 1) % 7 : weekdayOf(y, 1, 1);
    const targetW = isU ? res.wdaySun : res.wdayMon;
    let ord;
    if (week === 0) ord = jan1Ord + (targetW - jan1W);
    else {
      const firstOrd = jan1Ord + ((7 - jan1W) % 7); // 週1の始まり（最初の週頭曜日）
      ord = firstOrd + (week - 1) * 7 + targetW;
    }
    const r = fromOrdinal(ord);
    return { y: r.y, mo: r.m, d: r.d };
  }
  return { y, mo: mo === null ? 1 : mo, d: d === null ? 1 : d };
}
