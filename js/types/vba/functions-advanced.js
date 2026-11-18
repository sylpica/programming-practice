// 高度モード B4：VBA 追加組み込み関数（高度差分）。
// js/engine.js から import される。本ファイルは engine.js を import しない
// （循環参照回避）。ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第3章。
// キーは小文字の関数名。値：(args, ctx) => VBA値。
//
// 一次情報は Microsoft Learn の VBA 言語リファレンス各関数ページ
// （learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/、
// 確認日 2026-11-17）。QBColor の戻り値表のみ MS-VBAL の QBColor 節を正本とした
// （Learn の QBColor ページは色名のみで数値表を持たないため）。
//
// 日付モデル（報告書 ADV-B4-vba-eng.md にも明記）：
//  - 日付はシリアル値（1899-12-30 起点の Double）で表す。整数部が日、
//    小数部が時刻（1日=1.0）。負シリアルは trunc で日部を取り、
//    小数部は絶対値が時刻になる（実 VBA の負の日付シリアルの規則）。
//  - カレンダー変換はグレゴリオ暦の通日算法（civil-from-days）で行い、
//    JS Date やローカルタイムゾーンには依存しない。
//  - 文字列の日付解釈は en-US 形式を正本とする（YYYY/MM/DD、MM/DD/YYYY、
//    月名形式、時刻の AM/PM）。加えて日本語の YYYY年M月D日 形式を受理する
//    （モデル拡張として報告書に明記）。

const ERR_450 = "引数の数が一致していません";
const ERR_13 = "型が一致しません";
const ERR_5 = "プロシージャの呼び出し、または引数が不正です";
const ERR_94 = "Null の使い方が不正です";
const ERR_6 = "オーバーフローしました";

const isNull = (v) => v?.kind === "null";
const isEmpty = (v) => v?.kind === "empty";

function arity(ctx, args, min, max) {
  if (args.length < min || args.length > max) ctx.fail(ERR_450, 450);
}
// Null をエラー94にする変換系の共通前処理（呼び出し側で Null を先に判定する）
function numArg(ctx, v) {
  if (isNull(v)) ctx.fail(ERR_94, 94);
  if (v?.kind === "array" || v?.kind === "range") ctx.fail(ERR_13, 13);
  return ctx.num(v); // Empty→0、Boolean→-1/0、文字列は VBA 変換規則、失敗は13
}
function strArg(ctx, v) {
  if (isNull(v)) ctx.fail(ERR_94, 94);
  return ctx.str(v); // オブジェクト等は13
}
function boolArg(ctx, v) {
  if (isNull(v)) ctx.fail(ERR_94, 94);
  if (isEmpty(v)) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return numArg(ctx, v) !== 0;
}
function longArg(ctx, v) {
  if (isNull(v)) ctx.fail(ERR_94, 94);
  return ctx.toLong(v); // 銀行丸め＋Long 範囲外はエラー6
}

/* ---------------- 日付シリアルの基礎 ---------------- */
// daysFromCivil: Howard Hinnant の算法。戻り値は 1970-01-01 起点の通日。
function daysFromCivil(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const mp = m > 2 ? m - 3 : m + 9;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}
function civilFromDays(z0) {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  let y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  if (m <= 2) y += 1;
  return [y, m, d];
}
const EPOCH_OFFSET = 25569; // 1899-12-30 から 1970-01-01 までの日数
const serialFromYMD = (y, m, d) => daysFromCivil(y, m, d) + EPOCH_OFFSET;
function daysInMonth(y, m) {
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return serialFromYMD(ny, nm, 1) - serialFromYMD(y, m, 1);
}
// シリアルを「日（整数）」と「日の内秒数」に分解する（負数は trunc 規則）
function decompose(serial) {
  let day = Math.trunc(serial);
  const frac = Math.abs(serial - day);
  let sec = Math.round(frac * 86400);
  if (sec >= 86400) {
    sec = 86399; // 浮動小数の丸めで 24:00:00 になる寸前は 23:59:59 に留める
  }
  return { day, sec };
}
const ymdOf = (serial) => civilFromDays(decompose(serial).day - EPOCH_OFFSET);
const hmsOf = (serial) => {
  const { sec } = decompose(serial);
  return [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60];
};
// 曜日インデックス（0=日曜〜6=土曜）。シリアル0（1899-12-30）は土曜。
const sun0Of = (dayInt) => (((dayInt % 7) + 7) % 7 + 6) % 7;

/* ---------------- 日付文字列の解釈 ---------------- */
const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
function pivotYear(y, digits) {
  if (digits === 2) return y <= 29 ? 2000 + y : 1900 + y;
  return y;
}
function parseTimePart(t) {
  // "H:MM[:SS[.fff]] [AM|PM]" を日の内秒数へ。失敗は null。
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*([AaPp])\.?[Mm]\.?$|^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  if (!m) return null;
  const ampm = m[5] ? m[5].toUpperCase() : null;
  let h = Number(m[1] ?? m[6]);
  const mi = Number(m[2] ?? m[7]);
  const se = Number(m[3] ?? m[8] ?? 0);
  const fracSec = m[4] ?? m[9] ? Number("0." + (m[4] ?? m[9])) : 0;
  if (mi > 59 || se > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === "P" && h !== 12) h += 12;
    if (ampm === "A" && h === 12) h = 0;
  } else if (h > 23) return null;
  return h * 3600 + mi * 60 + se + fracSec;
}
function parseDatePart(t) {
  // 日付部だけを解釈してシリアル（整数）を返す。失敗は null。
  const s = t.trim();
  let m;
  if ((m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/))) {
    const [, y, mo, d] = m.map(Number);
    return validYMD(y, mo, d);
  }
  if ((m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/))) {
    // en-US 順（月/日/年）
    const mo = Number(m[1]), d = Number(m[2]);
    const y = pivotYear(Number(m[3]), m[3].length);
    return validYMD(y, mo, d);
  }
  if ((m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/))) {
    const [, y, mo, d] = m.map(Number);
    return validYMD(y, mo, d);
  }
  if ((m = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{2}|\d{4})$/i))) {
    const mo = MONTH_NAMES.indexOf(m[1].toLowerCase()) + 1 ||
      MONTH_NAMES.findIndex((n) => n.startsWith(m[1].toLowerCase())) + 1;
    if (!mo) return null;
    return validYMD(pivotYear(Number(m[3]), m[3].length), mo, Number(m[2]));
  }
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{2}|\d{4})$/i))) {
    const mo = MONTH_NAMES.indexOf(m[2].toLowerCase()) + 1 ||
      MONTH_NAMES.findIndex((n) => n.startsWith(m[2].toLowerCase())) + 1;
    if (!mo) return null;
    return validYMD(pivotYear(Number(m[3]), m[3].length), mo, Number(m[1]));
  }
  return null;
}
function validYMD(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return serialFromYMD(y, mo, d);
}
// 文字列全体（日付のみ／時刻のみ／日付+時刻）を解釈する。失敗は null。
function parseDateTimeString(raw) {
  const s = raw.trim();
  if (!s) return null;
  const asTime = parseTimePart(s);
  if (asTime !== null) return { day: 0, sec: asTime, hasDate: false, hasTime: true };
  const asDate = parseDatePart(s);
  if (asDate !== null) return { day: asDate, sec: 0, hasDate: true, hasTime: false };
  // 日付 + 時刻（空白または T 区切り）。時刻は末尾から切り出す。
  const tm = s.match(/^(.*?)[\sT]+(\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?\s*(?:[AaPp]\.?[Mm]\.?)?)$/);
  if (tm) {
    const day = parseDatePart(tm[1]);
    const sec = parseTimePart(tm[2]);
    if (day !== null && sec !== null)
      return { day, sec, hasDate: true, hasTime: true };
  }
  return null;
}
// OLE Automation の DATE エンコーディング：符号と整数部が日を、小数部の
// 「絶対値」が時刻を表す（例：-1.25 は 1899-12-29 06:00、-0.5 と 0.5 は
// どちらも 1899-12-30 12:00）。civil な（日, 秒）からシリアルを組むときは、
// 日が負なら時刻分を引く方向に合成する（監査 ADV-B4-audit-vba D7）。
function composeSerial(dayInt, secFloat) {
  return dayInt < 0 ? dayInt - secFloat / 86400 : dayInt + secFloat / 86400;
}
// 有効な日付範囲（MS-VBAL の Date の定義域：100年1月1日〜9999年12月31日）
const MIN_DATE_DAY = serialFromYMD(100, 1, 1); // -657434
const MAX_DATE_DAY = serialFromYMD(9999, 12, 31); // 2958465
const parsedToSerial = (p) => composeSerial(p.day, p.sec);
// 日付引数をシリアルへ（数値・Boolean・Empty・日付文字列を受理、それ以外は13）
function toSerial(ctx, v) {
  if (isNull(v)) ctx.fail(ERR_94, 94);
  if (isEmpty(v)) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? -1 : 0;
  if (typeof v === "string") {
    const p = parseDateTimeString(v);
    if (p) return parsedToSerial(p);
    ctx.fail(ERR_13, 13);
  }
  ctx.fail(ERR_13, 13);
}
function fdowArg(ctx, v) {
  if (v === undefined) return 1; // vbSunday
  const n = longArg(ctx, v);
  if (n === 0) ctx.unsupported("firstdayofweek の vbUseSystem（システム設定依存）");
  if (n < 1 || n > 7) ctx.fail(ERR_5, 5);
  return n; // 1=日曜〜7=土曜、そのまま sun0 との差に使える
}
function fwoyArg(ctx, v) {
  if (v === undefined) return 1; // vbFirstJan1
  const n = longArg(ctx, v);
  if (n === 0) ctx.unsupported("firstweekofyear の vbUseSystem（システム設定依存）");
  if (n < 1 || n > 3) ctx.fail(ERR_5, 5);
  return n;
}
function weekStartOf(dayInt, fdow) {
  return dayInt - ((sun0Of(dayInt) - (fdow - 1) + 7) % 7);
}
function week1Start(year, fdow, fwoy) {
  const jan1 = serialFromYMD(year, 1, 1);
  const w = weekStartOf(jan1, fdow);
  if (fwoy === 1) return w; // vbFirstJan1：1月1日を含む週
  if (fwoy === 3) return w === jan1 ? w : w + 7; // vbFirstFullWeek：年内の最初の丸一週
  // vbFirstFourDays：新年に4日以上含む最初の週
  return 7 - (jan1 - w) >= 4 ? w : w + 7;
}
function weekNumberOf(dayInt, fdow, fwoy) {
  const [y] = ymdOf(dayInt);
  const w1 = week1Start(y, fdow, fwoy);
  if (dayInt < w1)
    return Math.floor((weekStartOf(dayInt, fdow) - week1Start(y - 1, fdow, fwoy)) / 7) + 1;
  // 年末の日が翌年の第1週の開始以降でも、実 VBA の DatePart は当年の週番号
  // （最大53）を返すため、翌年への繰り越しはしない。
  return Math.floor((weekStartOf(dayInt, fdow) - w1) / 7) + 1;
}
const INTERVALS = new Set(["yyyy", "q", "m", "y", "d", "w", "ww", "h", "n", "s"]);
function intervalArg(ctx, v) {
  if (isNull(v)) ctx.fail(ERR_94, 94);
  const s = ctx.str(v).trim().toLowerCase();
  if (!INTERVALS.has(s)) ctx.fail(ERR_5, 5);
  return s;
}

/* ---------------- 文字列・数学・変換の基本関数 ---------------- */
function nullPropagating(fn) {
  // 伝播系：引数に Null があれば Null を返す（Is 系・変換系は個別に書く）
  return (args, ctx) => {
    if (args.some(isNull)) return ctx.NULL;
    return fn(args, ctx);
  };
}
const hAsc = (args, ctx) => {
  arity(ctx, args, 1, 1);
  if (isNull(args[0])) ctx.fail(ERR_94, 94);
  const s = strArg(ctx, args[0]);
  if (s.length === 0) ctx.fail(ERR_5, 5);
  // モデル：最初の文字の Unicode コードポイントを返す（実 VBA の Asc は
  // ロケールのコードページ値。ASCII 範囲では一致する。報告書に明記）。
  return s.codePointAt(0);
};
const hChr = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const n = longArg(ctx, args[0]);
  // モデル：0〜255 を Latin-1 として返す（実 VBA はロケールのコードページ）。
  if (n < 0 || n > 255) ctx.fail(ERR_5, 5);
  return String.fromCharCode(n);
};
const hHexOct = (isHex) => (args, ctx) => {
  arity(ctx, args, 1, 1);
  const n = longArg(ctx, args[0]);
  if (n >= 0) return n.toString(isHex ? 16 : 8).toUpperCase();
  // 負数は 2 の補数。Integer 範囲内なら 16 ビット、それ以外は 32 ビット。
  const bits = n >= -32768 ? 16 : 32;
  const u = n + 2 ** bits;
  return u.toString(isHex ? 16 : 8).toUpperCase().padStart(isHex ? bits / 4 : Math.ceil(bits / 3), "0");
};
const hStr = (args, ctx) => {
  arity(ctx, args, 1, 1);
  if (isNull(args[0])) return ctx.NULL;
  const n = numArg(ctx, args[0]);
  return (n >= 0 ? " " : "") + ctx.str(n);
};
const hMath1 = (f, domain) => nullPropagating((args, ctx) => {
  arity(ctx, args, 1, 1);
  const x = numArg(ctx, args[0]);
  if (domain && !domain(x)) ctx.fail(ERR_5, 5);
  const r = f(x);
  if (!Number.isFinite(r)) ctx.fail(ERR_6, 6);
  return r;
});
const hCBool = (args, ctx) => {
  arity(ctx, args, 1, 1);
  return boolArg(ctx, args[0]);
};
const hCByte = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const n = ctx.roundEven(numArg(ctx, args[0]));
  if (n < 0 || n > 255) ctx.fail(ERR_6, 6);
  return n;
};
const hCCur = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const x = numArg(ctx, args[0]);
  const r = ctx.roundEven(x * 10000) / 10000;
  if (Math.abs(r) > 922337203685477.5807) ctx.fail(ERR_6, 6);
  return r;
};
const hCDec = (args, ctx) => {
  arity(ctx, args, 1, 1);
  // モデル：Decimal の 96 ビット精度は再現できないため Double で保持する
  // （値の範囲内では実 VBA と同じ数値になる。報告書に明記）。
  // ただし Decimal の定義域（±79,228,162,514,264,337,593,543,950,335、
  // MS-VBAL の Decimal の項）を超える値は実 VBA ではオーバーフロー（6）。
  const x = numArg(ctx, args[0]);
  if (Math.abs(x) > 7.922816251426434e28) ctx.fail(ERR_6, 6);
  return x;
};
const hCSng = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const r = Math.fround(numArg(ctx, args[0]));
  if (!Number.isFinite(r)) ctx.fail(ERR_6, 6);
  return r;
};
const hCLngLng = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const n = ctx.roundEven(numArg(ctx, args[0]));
  if (!Number.isFinite(n) || Math.abs(n) > 9223372036854775807) ctx.fail(ERR_6, 6);
  return n;
};
const hCVar = (args, ctx) => {
  arity(ctx, args, 1, 1);
  return args[0]; // CVar(Null) は Null のまま（変換系で唯一 Null を許す）
};
const hCDate = (args, ctx) => {
  arity(ctx, args, 1, 1);
  // 日付型はモデルではシリアル数値そのもの。受理書式は parseDateTimeString。
  return toSerial(ctx, args[0]);
};
const hError = (args, ctx) => {
  arity(ctx, args, 0, 1);
  const ERROR_MESSAGES = {
    3: "Return without GoSub", 5: "Invalid procedure call or argument",
    6: "Overflow", 7: "Out of memory", 9: "Subscript out of range",
    10: "This array is fixed or temporarily locked", 11: "Division by zero",
    13: "Type mismatch", 14: "Out of string space", 16: "Expression too complex",
    17: "Can't perform requested operation", 18: "User interrupt occurred",
    20: "Resume without error", 28: "Out of stack space",
    35: "Sub or Function not defined", 47: "Too many DLL application clients",
    48: "Error in loading DLL", 49: "Bad DLL calling convention",
    51: "Internal error", 52: "Bad file name or number", 53: "File not found",
    54: "Bad file mode", 55: "File already open", 57: "Device I/O error",
    58: "File already exists", 59: "Bad record length", 61: "Disk full",
    62: "Input past end of file", 63: "Bad record number", 67: "Too many files",
    68: "Device unavailable", 70: "Permission denied", 71: "Disk not ready",
    74: "Can't rename with different drive", 75: "Path/File access error",
    76: "Path not found", 91: "Object variable or With block variable not set",
    92: "For loop not initialized", 93: "Invalid pattern string",
    94: "Invalid use of Null", 424: "Object required",
    429: "ActiveX component can't create object",
    438: "Object doesn't support this property or method",
    445: "Object doesn't support this action",
    446: "Object doesn't support named arguments",
    447: "Object doesn't support current locale setting",
    448: "Named argument not found", 449: "Argument not optional",
    450: "Wrong number of arguments or invalid property assignment",
    451: "Property let procedure not defined and property get procedure did not return an object",
    452: "Invalid ordinal", 453: "Specified DLL function not found",
    454: "Code resource not found", 455: "Code resource lock error",
    457: "This key is already associated with an element of this collection",
    458: "Variable uses an Automation type not supported in Visual Basic",
    481: "Invalid picture", 482: "Printer error",
  };
  if (args.length === 0) {
    const cur = ctx.s?.err || 0;
    return cur === 0 ? "" : ERROR_MESSAGES[cur] || "Application-defined or object-defined error";
  }
  const n = longArg(ctx, args[0]);
  return ERROR_MESSAGES[n] || "Application-defined or object-defined error";
};
const hCVErr = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const n = longArg(ctx, args[0]);
  return { kind: "err", code: n };
};

/* ---------------- 制御・配列・判定 ---------------- */
const hIIf = (args, ctx) => {
  arity(ctx, args, 3, 3);
  // 実 VBA の IIf は両分岐とも評価する（エンジンの eager 評価と一致）。
  return boolArg(ctx, args[0]) ? args[1] : args[2];
};
const hChoose = (args, ctx) => {
  arity(ctx, args, 2, Number.MAX_SAFE_INTEGER);
  if (isNull(args[0])) return ctx.NULL;
  const idx = ctx.roundEven(numArg(ctx, args[0]));
  if (idx < 1 || idx > args.length - 1) return ctx.NULL;
  return args[idx];
};
const hSwitch = (args, ctx) => {
  if (args.length < 2 || args.length % 2 !== 0) ctx.fail(ERR_5, 5);
  for (let i = 0; i < args.length; i += 2) {
    if (isNull(args[i])) ctx.fail(ERR_94, 94);
    if (boolArg(ctx, args[i])) return args[i + 1];
  }
  return ctx.NULL;
};
const hIsArray = (args, ctx) => {
  arity(ctx, args, 1, 1);
  return args[0]?.kind === "array";
};
const hIsDate = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const v = args[0];
  // 実 VBA：数値式は日付とみなされない（IsDate(45000) は False）。
  // モデルでは日付型と Double が同一表現のため、数値は一律 False とし、
  // 日付として解釈できる文字列のみ True とする（報告書に明記）。
  if (typeof v !== "string") return false;
  return parseDateTimeString(v) !== null;
};
const hIsError = (args, ctx) => {
  arity(ctx, args, 1, 1);
  return args[0]?.kind === "err" && typeof args[0].code === "number";
};
const hIsMissing = (args, ctx) => {
  arity(ctx, args, 1, 1);
  // このモデルではユーザー定義プロシージャに Optional 引数が無く、
  // 呼び出しは常に対象の引数を伴うため、渡された引数は欠けていない。
  return false;
};
const hIsObject = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const k = args[0]?.kind;
  // エラー値（CVErr）は Variant の Error サブタイプでありオブジェクトでは
  // ない（実 VBA の IsObject(CVErr(...)) は False。監査 D8）。
  return k === "range" || k === "nothing";
};
function arrayArg(ctx, v) {
  if (isNull(v)) ctx.fail(ERR_94, 94);
  if (v?.kind !== "array") ctx.fail(ERR_13, 13);
  return v;
}
const hJoin = (args, ctx) => {
  arity(ctx, args, 1, 2);
  const arr = arrayArg(ctx, args[0]);
  const delim = args.length === 2 ? strArg(ctx, args[1]) : " ";
  const parts = arr.values.map((v) => {
    if (isNull(v)) ctx.fail(ERR_94, 94);
    return ctx.str(v);
  });
  return parts.join(delim);
};
const hSplit = (args, ctx) => {
  arity(ctx, args, 1, 4);
  if (isNull(args[0])) ctx.fail(ERR_94, 94);
  const expr = ctx.str(args[0]);
  const delim = args.length >= 2 ? strArg(ctx, args[1]) : " ";
  const limit = args.length >= 3 ? longArg(ctx, args[2]) : -1;
  const compare = args.length >= 4 ? longArg(ctx, args[3]) : 0;
  if (compare === -1) ctx.unsupported("Split の compare 引数 -1（Option Compare 依存）");
  if (compare !== 0 && compare !== 1) ctx.fail(ERR_5, 5);
  if (limit < -1) ctx.fail(ERR_5, 5);
  if (expr === "" || limit === 0) return { kind: "array", low: 0, values: [] };
  if (delim === "") return { kind: "array", low: 0, values: [expr] };
  const hay = compare === 1 ? expr.toLowerCase() : expr;
  const needle = compare === 1 ? delim.toLowerCase() : delim;
  const out = [];
  let pos = 0;
  const maxParts = limit === -1 ? Infinity : limit;
  while (out.length < maxParts - 1) {
    const at = hay.indexOf(needle, pos);
    if (at < 0) break;
    out.push(expr.slice(pos, at));
    pos = at + delim.length;
  }
  out.push(expr.slice(pos));
  return { kind: "array", low: 0, values: out };
};
const hFilter = (args, ctx) => {
  arity(ctx, args, 2, 4);
  const arr = arrayArg(ctx, args[0]);
  if (isNull(args[1])) return ctx.NULL;
  const match = ctx.str(args[1]);
  const include = args.length >= 3 ? boolArg(ctx, args[2]) : true;
  const compare = args.length >= 4 ? longArg(ctx, args[3]) : 0;
  if (compare === -1) ctx.unsupported("Filter の compare 引数 -1（Option Compare 依存）");
  if (compare !== 0 && compare !== 1) ctx.fail(ERR_5, 5);
  const needle = compare === 1 ? match.toLowerCase() : match;
  const out = [];
  for (const v of arr.values) {
    if (isNull(v)) ctx.fail(ERR_94, 94);
    const s = ctx.str(v);
    const hit = (compare === 1 ? s.toLowerCase() : s).includes(needle);
    if (hit === include) out.push(v);
  }
  return { kind: "array", low: 0, values: out };
};
const hInStrRev = (args, ctx) => {
  arity(ctx, args, 2, 4);
  // Null の規則は引数ごとに異なる（MS-VBAL 6.1.2.11.1.15）：stringcheck／
  // stringmatch が Null なら Null を返すが、start／compare が Null なら
  // エラー（94）になる（監査 D2）。
  if (isNull(args[0]) || isNull(args[1])) return ctx.NULL;
  const check = ctx.str(args[0]);
  const match = ctx.str(args[1]);
  let start = args.length >= 3 ? longArg(ctx, args[2]) : -1;
  const compare = args.length >= 4 ? longArg(ctx, args[3]) : 0;
  if (compare === -1) ctx.unsupported("InStrRev の compare 引数 -1（Option Compare 依存）");
  if (compare !== 0 && compare !== 1) ctx.fail(ERR_5, 5);
  if (start === -1) start = check.length;
  if (check.length === 0) return 0; // Learn：対象が空文字列なら 0（start 検証より先）
  if (start < 1) ctx.fail(ERR_5, 5);
  // stringmatch が空文字列なら start を返す（MS-VBAL／Learn の戻り値表の
  // 記載順どおり。start > Len の 0 は通常検索の場合に適用する。監査 D2）。
  if (match.length === 0) return start;
  if (start > check.length) return 0;
  const hay = compare === 1 ? check.toLowerCase() : check;
  const needle = compare === 1 ? match.toLowerCase() : match;
  const at = hay.lastIndexOf(needle, start - 1);
  return at < 0 ? 0 : at + 1;
};
const hStrComp = (args, ctx) => {
  arity(ctx, args, 2, 3);
  // string1／string2 の Null は Null を返すが、compare（数値引数）の Null は
  // エラー（94）になる（InStr／InStrRev と同じ規則。監査 D3）。
  if (isNull(args[0]) || isNull(args[1])) return ctx.NULL;
  const a = ctx.str(args[0]);
  const b = ctx.str(args[1]);
  const compare = args.length >= 3 ? longArg(ctx, args[2]) : 0;
  if (compare === -1) ctx.unsupported("StrComp の compare 引数 -1（Option Compare 依存）");
  if (compare !== 0 && compare !== 1) ctx.fail(ERR_5, 5);
  const x = compare === 1 ? a.toLowerCase() : a;
  const y = compare === 1 ? b.toLowerCase() : b;
  return x < y ? -1 : x > y ? 1 : 0;
};
const hPartition = (args, ctx) => {
  arity(ctx, args, 4, 4);
  if (args.some(isNull)) return ctx.NULL;
  const [number, start, stop, interval] = args.map((v) => ctx.roundEven(numArg(ctx, v)));
  if (start < 0 || stop <= start || interval < 1) ctx.fail(ERR_5, 5);
  // 幅は (stop+1) の文字数（VB.NET 版 Partition の Remarks が明示する規則で、
  // VBA 版の「stop の文字数＋1」と通常一致し、stop=1000 の例では 4 になる）。
  const width = String(stop + 1).length;
  const fmt = (n) => String(n).padStart(width, " ");
  let low, high;
  if (number < start) { low = ""; high = String(start - 1); }
  else if (number > stop) { low = String(stop + 1); high = ""; }
  else if (interval === 1) { low = String(number); high = String(number); }
  else {
    low = String(start + Math.floor((number - start) / interval) * interval);
    high = String(Math.min(Number(low) + interval - 1, stop));
  }
  // 空側も幅いっぱいの空白にする（Learn の規則：コロンの左右とも
  // stop の文字数＋1 の幅を確保する）。
  return `${fmt(low)}:${fmt(high)}`;
};

/* ---------------- 日付・時刻 ---------------- */
function addMonthsSerial(serial, months) {
  const { day, sec } = decompose(serial);
  const [y, m, d] = civilFromDays(day - EPOCH_OFFSET);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12 + 1;
  const nd = Math.min(d, daysInMonth(ny, nm)); // 月末は切り詰める（実 VBA の規則）
  return composeSerial(serialFromYMD(ny, nm, nd), sec);
}
// 結果が Date の定義域（100年〜9999年）をはみ出す場合は実 VBA どおり
// エラーにする（MS-VBAL の DateSerial／DateAdd の意味論。監査 D6）。
function guardDateRange(ctx, serial, message, code) {
  const { day } = decompose(serial);
  if (day < MIN_DATE_DAY || day > MAX_DATE_DAY) ctx.fail(message, code);
}
const hDateAdd = (args, ctx) => {
  arity(ctx, args, 3, 3);
  const interval = intervalArg(ctx, args[0]);
  if (isNull(args[1]) || isNull(args[2])) return ctx.NULL;
  const number = numArg(ctx, args[1]);
  const serial = toSerial(ctx, args[2]);
  let result;
  switch (interval) {
    case "yyyy": result = addMonthsSerial(serial, Math.trunc(number) * 12); break;
    case "q": result = addMonthsSerial(serial, Math.trunc(number) * 3); break;
    case "m": result = addMonthsSerial(serial, Math.trunc(number)); break;
    default: {
      // 日以下の単位は civil な（日, 秒）空間で加算してから OLE 形式へ
      // 戻す。シリアルへ直接加算すると、負シリアル（1899-12-30 より前）
      // の小数部の絶対値規則と衝突して日がずれる（監査 D7）。
      const unitSec = { ww: 604800, y: 86400, d: 86400, w: 86400, h: 3600, n: 60, s: 1 }[interval];
      const { day, sec } = decompose(serial);
      const total = day * 86400 + sec + number * unitSec;
      const nd = Math.floor(total / 86400);
      result = composeSerial(nd, total - nd * 86400);
    }
  }
  guardDateRange(ctx, result, ERR_6, 6);
  return result;
};
const hDateDiff = (args, ctx) => {
  arity(ctx, args, 3, 5);
  const interval = intervalArg(ctx, args[0]);
  if (isNull(args[1]) || isNull(args[2])) return ctx.NULL;
  const s1 = toSerial(ctx, args[1]);
  const s2 = toSerial(ctx, args[2]);
  const fdow = fdowArg(ctx, args[3]);
  const fwoy = fwoyArg(ctx, args[4]);
  void fwoy; // ww の境界数えには firstweekofyear は影響しない（Learn の説明どおり）
  const d1 = decompose(s1), d2 = decompose(s2);
  const [y1, m1] = ymdOf(s1), [y2, m2] = ymdOf(s2);
  switch (interval) {
    case "yyyy": return y2 - y1;
    case "q": return (y2 - y1) * 4 + (Math.floor((m2 - 1) / 3) - Math.floor((m1 - 1) / 3));
    case "m": return (y2 - y1) * 12 + (m2 - m1);
    case "y": case "d": return d2.day - d1.day;
    case "w": return Math.trunc((d2.day - d1.day) / 7);
    case "ww": {
      // week の開始日（firstdayofweek の曜日）を (date1, date2] で数える。
      // 逆向きは符号を反転する（Learn：date1 が後の時点なら負数）。
      const countBoundaries = (from, to) => {
        const delta = (fdow - 1 - sun0Of(from) + 7) % 7;
        const first = from + (delta === 0 ? 7 : delta);
        if (first > to) return 0;
        return Math.floor((to - first) / 7) + 1;
      };
      return d2.day >= d1.day
        ? countBoundaries(d1.day, d2.day)
        : -countBoundaries(d2.day, d1.day);
    }
    case "h": return Math.floor((d2.day * 86400 + d2.sec) / 3600) - Math.floor((d1.day * 86400 + d1.sec) / 3600);
    case "n": return Math.floor((d2.day * 86400 + d2.sec) / 60) - Math.floor((d1.day * 86400 + d1.sec) / 60);
    case "s": return (d2.day * 86400 + d2.sec) - (d1.day * 86400 + d1.sec);
  }
};
const hDatePart = (args, ctx) => {
  arity(ctx, args, 2, 4);
  const interval = intervalArg(ctx, args[0]);
  if (isNull(args[1])) return ctx.NULL;
  const serial = toSerial(ctx, args[1]);
  const fdow = fdowArg(ctx, args[2]);
  const fwoy = fwoyArg(ctx, args[3]);
  const { day, sec } = decompose(serial);
  const [y, m, d] = civilFromDays(day - EPOCH_OFFSET);
  switch (interval) {
    case "yyyy": return y;
    case "q": return Math.floor((m - 1) / 3) + 1;
    case "m": return m;
    case "y": return day - serialFromYMD(y, 1, 1) + 1;
    case "d": return d;
    case "w": return ((sun0Of(day) - (fdow - 1) + 7) % 7) + 1;
    case "ww": return weekNumberOf(day, fdow, fwoy);
    case "h": return Math.floor(sec / 3600);
    case "n": return Math.floor((sec % 3600) / 60);
    case "s": return sec % 60;
  }
};
const hDateSerial = (args, ctx) => {
  arity(ctx, args, 3, 3);
  let [y, m, d] = args.map((v) => longArg(ctx, v));
  // 引数は Integer 型（MS-VBAL 6.1.2.4.1.4）。範囲外は変換オーバーフロー（6）。
  for (const v of [y, m, d]) if (v < -32768 || v > 32767) ctx.fail(ERR_6, 6);
  if (y >= 0 && y <= 99) y = pivotYear(y, 2); // Learn：0-29→2000年代、30-99→1900年代
  // 月・日のはみ出しは前後の月へ繰り越す（実 VBA の規則）。
  const total = y * 12 + (m - 1);
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12 + 1;
  const result = serialFromYMD(ny, nm, 1) + (d - 1);
  // 組み立てた日付が Date の定義域の外ならエラー（MS-VBAL：an error occurs）。
  if (result < MIN_DATE_DAY || result > MAX_DATE_DAY) ctx.fail(ERR_5, 5);
  return result;
};
const hDateValue = (args, ctx) => {
  arity(ctx, args, 1, 1);
  if (isNull(args[0])) ctx.fail(ERR_94, 94);
  if (typeof args[0] === "number") return Math.trunc(args[0]);
  const s = strArg(ctx, args[0]);
  const p = parseDateTimeString(s);
  if (!p || !p.hasDate) ctx.fail(ERR_13, 13);
  return p.day;
};
const hTimeSerial = (args, ctx) => {
  arity(ctx, args, 3, 3);
  const [h, m, s] = args.map((v) => longArg(ctx, v));
  // 引数は Integer 型（MS-VBAL 6.1.2.4.1.11）。範囲外は変換オーバーフロー（6）。
  for (const v of [h, m, s]) if (v < -32768 || v > 32767) ctx.fail(ERR_6, 6);
  // 各引数は相対値として扱われ、繰り上がり・借りを行って正規化される。
  // 合計秒を civil な（日, 秒）に分解し、OLE 形式で合成し直す。単純に
  // 86400 で割ると負の合計（例：TimeSerial(0, 0, -1)）が「前日の 23:59:59」
  // でなく「1899-12-30 の 00:00:01」に化ける（監査 D7）。
  const total = h * 3600 + m * 60 + s;
  const day = Math.floor(total / 86400);
  if (day < MIN_DATE_DAY || day > MAX_DATE_DAY) ctx.fail(ERR_5, 5);
  return composeSerial(day, total - day * 86400);
};
const hTimeValue = (args, ctx) => {
  arity(ctx, args, 1, 1);
  // MS-VBAL 6.1.2.4.1.12：Time が Null なら Null を返す（エラーではない）。
  if (isNull(args[0])) return ctx.NULL;
  if (typeof args[0] === "number") {
    const { sec } = decompose(args[0]);
    return sec / 86400;
  }
  const p = parseDateTimeString(strArg(ctx, args[0]));
  if (!p || !p.hasTime) ctx.fail(ERR_13, 13);
  return p.sec / 86400;
};
function datePartGetter(get) {
  return (args, ctx) => {
    arity(ctx, args, 1, 1);
    if (isNull(args[0])) return ctx.NULL;
    return get(toSerial(ctx, args[0]));
  };
}
const hWeekday = (args, ctx) => {
  arity(ctx, args, 1, 2);
  if (isNull(args[0])) return ctx.NULL;
  const serial = toSerial(ctx, args[0]);
  const fdow = fdowArg(ctx, args[1]);
  const { day } = decompose(serial);
  return ((sun0Of(day) - (fdow - 1) + 7) % 7) + 1;
};
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const hWeekdayName = (args, ctx) => {
  arity(ctx, args, 1, 3);
  if (isNull(args[0])) ctx.fail(ERR_94, 94);
  const n = longArg(ctx, args[0]);
  const abbr = args.length >= 2 && !isEmpty(args[1]) ? boolArg(ctx, args[1]) : false;
  const fdow = fdowArg(ctx, args[2]);
  if (n < 1 || n > 7) ctx.fail("インデックスが有効範囲にありません", 9);
  const idx = (fdow - 1 + (n - 1)) % 7;
  return (abbr ? WEEKDAY_ABBR : WEEKDAY_FULL)[idx];
};
const hMonthName = (args, ctx) => {
  arity(ctx, args, 1, 2);
  if (isNull(args[0])) ctx.fail(ERR_94, 94);
  const n = longArg(ctx, args[0]);
  const abbr = args.length >= 2 && !isEmpty(args[1]) ? boolArg(ctx, args[1]) : false;
  if (n < 1 || n > 12) ctx.fail("インデックスが有効範囲にありません", 9);
  return (abbr ? MONTH_ABBR : MONTH_FULL)[n - 1];
};
function formatDateTimeValue(ctx, serial, named) {
  const { day, sec } = decompose(serial);
  const [y, m, d] = civilFromDays(day - EPOCH_OFFSET);
  const [hh, mi, ss] = [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60];
  const shortDate = `${m}/${d}/${y}`;
  const ampm = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const longTime = `${h12}:${String(mi).padStart(2, "0")}:${String(ss).padStart(2, "0")} ${ampm}`;
  const hasDate = day !== 0;
  const hasTime = sec !== 0;
  switch (named) {
    case 0: // vbGeneralDate
      if (hasDate && hasTime) return `${shortDate} ${longTime}`;
      if (hasDate) return shortDate;
      if (hasTime) return longTime;
      return shortDate;
    case 1: // vbLongDate（en-US の長い形式）
      return `${WEEKDAY_FULL[sun0Of(day)]}, ${MONTH_FULL[m - 1]} ${d}, ${y}`;
    case 2: return shortDate; // vbShortDate
    case 3: return longTime; // vbLongTime
    case 4: // vbShortTime（24時間 hh:mm）
      return `${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    default: ctx.fail(ERR_5, 5);
  }
}
const hFormatDateTime = (args, ctx) => {
  arity(ctx, args, 1, 2);
  if (isNull(args[0])) ctx.fail(ERR_94, 94);
  const serial = toSerial(ctx, args[0]);
  const named = args.length >= 2 && !isEmpty(args[1]) ? longArg(ctx, args[1]) : 0;
  if (named < 0 || named > 4) ctx.fail(ERR_5, 5);
  return formatDateTimeValue(ctx, serial, named);
};

/* ---------------- 財務 ----------------
   符号規約は Learn 各ページの使用例で検証した相互に整合する恒等式で統一する：
     FV ＝ -(PV*q + Pmt*A)、q=(1+rate)^nper、A=((q-1)/rate)*(1+rate*type)
   （rate=0 では A=nper、FV=-(PV+Pmt*nper)）。
   例：FV の使用例は -Payment／-PVal を渡して正の将来価値を得る。 */
function annuityFactors(rate, nper, type) {
  const q = (1 + rate) ** nper;
  const A = rate === 0 ? nper : ((q - 1) / rate) * (1 + rate * type);
  return { q, A };
}
function finArgs(ctx, args, min, max) {
  arity(ctx, args, min, max);
  if (args.some(isNull)) ctx.fail(ERR_94, 94);
  return args.map((v) => numArg(ctx, v));
}
function typeArgFin(ctx, v) {
  if (v === undefined) return 0;
  const t = ctx.roundEven(numArg(ctx, v));
  if (t !== 0 && t !== 1) ctx.fail(ERR_5, 5);
  return t;
}
const hFV = (args, ctx) => {
  const [rate, nper, pmt, pv = 0] = finArgs(ctx, args, 3, 5);
  const type = typeArgFin(ctx, args[4]);
  const { q, A } = annuityFactors(rate, nper, type);
  const r = -(pv * q + pmt * A);
  if (!Number.isFinite(r)) ctx.fail(ERR_6, 6);
  return r;
};
const hPV = (args, ctx) => {
  const [rate, nper, pmt, fv = 0] = finArgs(ctx, args, 3, 5);
  const type = typeArgFin(ctx, args[4]);
  const { q, A } = annuityFactors(rate, nper, type);
  const r = -(fv + pmt * A) / q;
  if (!Number.isFinite(r)) ctx.fail(ERR_6, 6);
  return r;
};
const hPmt = (args, ctx) => {
  const [rate, nper, pv, fv = 0] = finArgs(ctx, args, 3, 5);
  const type = typeArgFin(ctx, args[4]);
  const { q, A } = annuityFactors(rate, nper, type);
  if (A === 0) ctx.fail("0 で除算しました", 11);
  const r = -(fv + pv * q) / A;
  if (!Number.isFinite(r)) ctx.fail(ERR_6, 6);
  return r;
};
const hNPer = (args, ctx) => {
  const [rate, pmt, pv, fv = 0] = finArgs(ctx, args, 3, 5);
  const type = typeArgFin(ctx, args[4]);
  if (rate === 0) {
    if (pmt === 0) ctx.fail("0 で除算しました", 11);
    return -(fv + pv) / pmt;
  }
  const B = (1 + rate * type) / rate;
  // FV = -(PV*q + Pmt*B*(q-1)) を q について解く
  const numerator = pmt * B - fv;
  const denominator = pv + pmt * B;
  if (denominator === 0) ctx.fail(ERR_5, 5);
  const q = numerator / denominator;
  if (q <= 0) ctx.fail(ERR_5, 5);
  const r = Math.log(q) / Math.log(1 + rate);
  if (!Number.isFinite(r)) ctx.fail(ERR_5, 5);
  return r;
};
function ipmtValue(ctx, rate, per, nper, pv, fv, type) {
  if (per < 1 || per > nper) ctx.fail(ERR_5, 5);
  const { q, A } = annuityFactors(rate, nper, type);
  const pmt = A === 0 ? 0 : -(fv + pv * q) / A;
  if (rate === 0) return 0;
  if (type === 0) {
    // 期首残高（FV 恒等式の符号で表した値）に利率を掛けたものが利息部分
    const qPrev = (1 + rate) ** (per - 1);
    const APrev = ((qPrev - 1) / rate);
    const balancePrev = -(pv * qPrev + pmt * APrev);
    return balancePrev * rate;
  }
  // type=1：期首払い。第1期の支払は全額元本（利息 0）。第 k 期（k>=2）の
  // 利息部分は「前期の支払直後の残高（FV 符号系）×利率」。
  // 検証例：IPmt(0.1, 2, 3, 1000, 0, 1) は Pmt=-365.58…、支払直後残高
  // -634.42… に対する利息 -63.44… になる（手計算で照合済み）。
  if (per === 1) return 0;
  let after = -pv - pmt; // 第1期支払直後の残高（FV 符号系）
  for (let k = 2; k < per; k++) after = after * (1 + rate) - pmt;
  return after * rate;
}
const hIPmt = (args, ctx) => {
  const [rate, per, nper, pv, fv = 0] = finArgs(ctx, args, 4, 6);
  const type = typeArgFin(ctx, args[5]);
  return ipmtValue(ctx, rate, per, nper, pv, fv, type);
};
const hPPmt = (args, ctx) => {
  const [rate, per, nper, pv, fv = 0] = finArgs(ctx, args, 4, 6);
  const type = typeArgFin(ctx, args[5]);
  const { q, A } = annuityFactors(rate, nper, type);
  if (A === 0) ctx.fail("0 で除算しました", 11);
  const pmt = -(fv + pv * q) / A;
  return pmt - ipmtValue(ctx, rate, per, nper, pv, fv, type);
};
const hRate = (args, ctx) => {
  const [nper, pmt, pv, fv = 0] = finArgs(ctx, args, 3, 6);
  const type = typeArgFin(ctx, args[4]);
  let guess = args.length >= 6 ? numArg(ctx, args[5]) : 0.1;
  // Learn：guess から反復し、0.00001% 以内に収まらなければ20回で失敗（エラー5）。
  const f = (r) => {
    if (r === 0) return pv + pmt * nper + fv;
    const { q, A } = annuityFactors(r, nper, type);
    return pv * q + pmt * A + fv;
  };
  let r = guess;
  for (let i = 0; i < 20; i++) {
    const y = f(r);
    const d = (f(r + 0.0001) - y) / 0.0001;
    if (d === 0 || !Number.isFinite(d) || !Number.isFinite(y)) break;
    const next = r - y / d;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - r) < 1e-7) return next;
    r = next;
  }
  if (Math.abs(f(r)) < 1e-7 * Math.max(1, Math.abs(pv), Math.abs(fv))) return r;
  ctx.fail(ERR_5, 5);
};
const hNPV = (args, ctx) => {
  arity(ctx, args, 2, 2);
  const rate = numArg(ctx, args[0]);
  const arr = arrayArg(ctx, args[1]);
  // rate = -1 は割引の分母が 0 になる（実 VBA では 0 除算エラー 11）。
  // 非有限の合計をそのまま返す経路も誤値になるため止める（監査 D4）。
  if (rate === -1 && arr.values.length > 0) ctx.fail("0 で除算しました", 11);
  let sum = 0;
  arr.values.forEach((v, i) => {
    sum += numArg(ctx, v) / (1 + rate) ** (i + 1);
  });
  if (!Number.isFinite(sum)) ctx.fail(ERR_6, 6);
  return sum;
};
const hIRR = (args, ctx) => {
  arity(ctx, args, 1, 2);
  const arr = arrayArg(ctx, args[0]);
  const vals = arr.values.map((v) => numArg(ctx, v));
  if (!vals.some((v) => v > 0) || !vals.some((v) => v < 0)) ctx.fail(ERR_5, 5);
  let r = args.length >= 2 ? numArg(ctx, args[1]) : 0.1;
  const npv = (x) => vals.reduce((s, v, i) => s + v / (1 + x) ** i, 0);
  const dnpv = (x) => vals.reduce((s, v, i) => s - (i * v) / (1 + x) ** (i + 1), 0);
  // Learn：guess から反復し、20回以内に 0.00001% まで収まらなければ失敗。
  for (let i = 0; i < 20; i++) {
    const y = npv(r), d = dnpv(r);
    if (d === 0 || !Number.isFinite(y) || !Number.isFinite(d)) break;
    const next = r - y / d;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - r) < 1e-7) return next;
    r = next;
  }
  if (Math.abs(npv(r)) < 1e-7) return r;
  ctx.fail(ERR_5, 5);
};
const hMIRR = (args, ctx) => {
  arity(ctx, args, 3, 3);
  const arr = arrayArg(ctx, args[0]);
  const vals = arr.values.map((v) => numArg(ctx, v));
  const finance = numArg(ctx, args[1]);
  const reinvest = numArg(ctx, args[2]);
  const n = vals.length;
  if (n < 2) ctx.fail(ERR_5, 5);
  let pvNeg = 0, fvPos = 0;
  vals.forEach((v, i) => {
    if (v < 0) pvNeg += v / (1 + finance) ** i;
    else if (v > 0) fvPos += v * (1 + reinvest) ** (n - 1 - i);
  });
  if (pvNeg === 0 || fvPos === 0) ctx.fail(ERR_5, 5);
  // finance = -1 で後期の負キャッシュフローを割り引くと中間値が非有限に
  // なり、誤った有限値（例：-1）が返る経路があったため止める（監査 D4）。
  if (!Number.isFinite(pvNeg) || !Number.isFinite(fvPos)) ctx.fail(ERR_6, 6);
  const result = (fvPos / -pvNeg) ** (1 / (n - 1)) - 1;
  if (!Number.isFinite(result)) ctx.fail(ERR_6, 6);
  return result;
};
const hSLN = (args, ctx) => {
  const [cost, salvage, life] = finArgs(ctx, args, 3, 3);
  if (life === 0) ctx.fail("0 で除算しました", 11);
  if (cost < 0 || salvage < 0 || life < 0) ctx.fail(ERR_5, 5);
  return (cost - salvage) / life;
};
const hSYD = (args, ctx) => {
  const [cost, salvage, life, per] = finArgs(ctx, args, 4, 4);
  if (cost < 0 || salvage < 0 || life <= 0 || per < 1 || per > life) ctx.fail(ERR_5, 5);
  return ((cost - salvage) * (life - per + 1) * 2) / (life * (life + 1));
};
const hDDB = (args, ctx) => {
  const [cost, salvage, life, period, factor = 2] = finArgs(ctx, args, 4, 5);
  if (cost < 0 || salvage < 0 || life <= 0 || period < 1 || period > life || factor <= 0)
    ctx.fail(ERR_5, 5);
  // 定率法：各期の償却は期首簿価×factor/life。ただし簿価が残存価額を
  // 下回らないよう、その期の上限は（期首簿価−残存価額）。
  // ※ Learn の DDB ページに印刷された式は初回期の形で、本文の
  // 「償却は初回が最大で以後逓減」と矛盾するため、簿価逓減の標準形で実装した
  // （報告書に明記）。
  let book = cost;
  let dep = 0;
  const last = Math.floor(period);
  for (let p = 1; p <= last; p++) {
    dep = Math.min((book * factor) / life, book - salvage);
    if (dep < 0) dep = 0;
    book -= dep;
  }
  return dep;
};

/* ---------------- 書式（Format 系） ---------------- */
// 10 進の丸め（Format 系は四捨五入＝0.5 を絶対値方向へ。VBA の Round 関数の
// 銀行丸めとは異なる、Format 関数の規則）。
function roundedParts(absValue, fracDigits) {
  const scale = 10 ** fracDigits;
  const rounded = Math.floor(absValue * scale + 0.5 + 1e-9);
  if (!Number.isFinite(rounded) || rounded >= 1e21) {
    const s = absValue.toFixed(fracDigits);
    const [i, f = ""] = s.split(".");
    return { intStr: i, fracStr: f.padEnd(fracDigits, "0") };
  }
  const intPart = Math.floor(rounded / scale);
  const fracPart = rounded - intPart * scale;
  return {
    intStr: String(intPart),
    fracStr: String(fracPart).padStart(fracDigits, "0"),
  };
}
function groupInt(intStr) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
// 数値1セクションの整形。対応外の指定子があれば ctx.fail で名指し停止する。
function formatNumericSection(ctx, value, section) {
  if (/[\[\]]/.test(section)) ctx.unsupported("Format の色指定子（[Red] 等）");
  // リテラル（"..." と \x）を退避する
  const literals = [];
  let work = "";
  for (let i = 0; i < section.length; i++) {
    const c = section[i];
    if (c === '"') {
      const end = section.indexOf('"', i + 1);
      if (end < 0) ctx.fail(ERR_5, 5);
      literals.push(section.slice(i + 1, end));
      work += "\u0001" + (literals.length - 1) + "\u0002";
      i = end;
    } else if (c === "\\" && i + 1 < section.length) {
      literals.push(section[i + 1]);
      work += "\u0001" + (literals.length - 1) + "\u0002";
      i++;
    } else work += c;
  }
  // 数字指定子（0/#）を一切含まないセクションはリテラル文字列として表示する
  // （例：ゼロ値用セクションの ZERO。E 等の文字も指定子として解釈しない）。
  if (!/[0#]/.test(work.replace(/\u0001\d+\u0002/g, "")))
    return work.replace(/\u0001(\d+)\u0002/g, (_, i) => literals[Number(i)]);
  const isPat = (c) => "0#.,%Ee+-".includes(c);
  let first = -1, last = -1;
  for (let i = 0; i < work.length; i++) if (isPat(work[i])) { if (first < 0) first = i; last = i; }
  if (first < 0) {
    // 数字指定子の無いセクションはリテラルそのもの
    return work.replace(/\u0001(\d+)\u0002/g, (_, i) => literals[Number(i)]);
  }
  const prefix = work.slice(0, first);
  const suffix = work.slice(last + 1);
  const mid = work.slice(first, last + 1);
  if (/\u0001/.test(mid) || /[^0#.,%Ee+\-]/.test(mid))
    ctx.unsupported(`Format の書式指定子（${section}）`);
  const lit = (t) => t.replace(/\u0001(\d+)\u0002/g, (_, i) => literals[Number(i)]);
  // % は値の拡大（×100）とリテラル表示を兼ねる。位置（接頭／接尾）を保つ。
  const percentCount = (mid.match(/%/g) || []).length;
  const lastDigitIdx = Math.max(mid.lastIndexOf("0"), mid.lastIndexOf("#"));
  const percentText = "%".repeat(percentCount);
  const pctPre = percentCount && mid.indexOf("%") < lastDigitIdx ? percentText : "";
  const pctSuf = percentCount && mid.indexOf("%") > lastDigitIdx ? percentText : "";
  const midClean = mid.replace(/%/g, "");
  // 科学表記
  const sci = midClean.match(/^(.*?)[Ee]([+-]?)([0#]+)$/);
  let scaled = Math.abs(value) * 100 ** percentCount;
  if (sci) {
    const mantPattern = sci[1].replace(/%/g, "");
    const expSign = sci[2];
    const expDigits = sci[3].length;
    let exp = 0;
    if (scaled !== 0) {
      exp = Math.floor(Math.log10(scaled));
      // 整数部が mantPattern の 0 の個数に収まるよう指数を調整する
      const intZeros = (mantPattern.split(".")[0].match(/0/g) || []).length;
      const shift = Math.max(0, intZeros - 1);
      exp -= shift;
      scaled = scaled / 10 ** exp;
      if (scaled >= 10 ** (shift + 1)) { scaled /= 10; exp += 1; }
    }
    const dotAt = mantPattern.indexOf(".");
    const fracPat = dotAt >= 0 ? mantPattern.slice(dotAt + 1) : "";
    const { intStr, fracStr } = roundedParts(scaled, fracPat.length);
    let frac = fracStr;
    while (frac.length && fracPat[frac.length - 1] === "#" && frac.endsWith("0")) frac = frac.slice(0, -1);
    const mant = intStr + (frac ? "." + frac : dotAt >= 0 && fracPat.includes("0") ? "." + fracStr : "");
    const expStr = (expSign === "+" || exp < 0 ? (exp < 0 ? "-" : "+") : "") +
      String(Math.abs(exp)).padStart(expDigits, "0");
    return lit(prefix) + pctPre + mant + "E" + expStr + pctSuf + lit(suffix);
  }
  const dotAt = midClean.indexOf(".");
  const intPatRaw = dotAt >= 0 ? midClean.slice(0, dotAt) : midClean;
  const fracPat = dotAt >= 0 ? midClean.slice(dotAt + 1) : "";
  // 末尾カンマは 1000 単位の縮小、途中のカンマは桁区切り
  let scalingCommas = 0;
  let intPat = intPatRaw;
  while (intPat.endsWith(",")) { scalingCommas++; intPat = intPat.slice(0, -1); }
  const grouping = intPat.includes(",");
  intPat = intPat.replace(/,/g, "");
  scaled = scaled / 1000 ** scalingCommas;
  const { intStr, fracStr } = roundedParts(scaled, fracPat.length);
  let intOut = intStr;
  const zeroPad = (intPat.match(/0/g) || []).length;
  if (intOut === "0" && zeroPad === 0 && scaled < 1) intOut = "";
  else intOut = intOut.padStart(zeroPad, "0");
  if (grouping && intOut) intOut = groupInt(intOut);
  let frac = fracStr;
  while (frac.length && fracPat[frac.length - 1] === "#" && frac.endsWith("0")) frac = frac.slice(0, -1);
  const showDot = dotAt >= 0 && (frac.length > 0 || fracPat.includes("0"));
  return lit(prefix) + pctPre + intOut + (showDot ? "." + frac : "") + pctSuf + lit(suffix);
}
function splitSections(fmt) {
  const out = [];
  let cur = "", quoted = false;
  for (const c of fmt) {
    if (c === '"') quoted = !quoted;
    if (c === ";" && !quoted) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function formatDateSection(ctx, serial, section) {
  const { day, sec } = decompose(serial);
  const [y, m, d] = civilFromDays(day - EPOCH_OFFSET);
  const [hh, mi, ss] = [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60];
  const tokens = [
    ["am/pm", () => (hh < 12 ? "AM" : "PM")],
    ["a/p", () => (hh < 12 ? "A" : "P")],
    ["yyyy", () => String(y).padStart(4, "0")],
    ["mmmm", () => MONTH_FULL[m - 1]],
    ["dddd", () => WEEKDAY_FULL[sun0Of(day)]],
    ["mmm", () => MONTH_ABBR[m - 1]],
    ["ddd", () => WEEKDAY_ABBR[sun0Of(day)]],
    ["yy", () => String(((y % 100) + 100) % 100).padStart(2, "0")],
    ["dd", () => String(d).padStart(2, "0")],
    ["hh", () => String(hh % 12 === 0 ? 12 : hh % 12).padStart(2, "0")],
    ["nn", () => String(mi).padStart(2, "0")],
    ["ss", () => String(ss).padStart(2, "0")],
    ["mm", null], // 文脈依存（月／分）は下で処理
    ["m", null],
    ["d", () => String(d)],
    ["h", () => String(hh % 12 === 0 ? 12 : hh % 12)],
    ["n", () => String(mi)],
    ["s", () => String(ss)],
    ["q", () => String(Math.floor((m - 1) / 3) + 1)],
    ["y", () => String(day - serialFromYMD(y, 1, 1) + 1)],
    ["ww", () => String(weekNumberOf(day, 1, 1))],
    ["w", () => String(sun0Of(day) + 1)],
    ["c", () => formatDateTimeValue(ctx, serial, 0)],
  ];
  let out = "";
  let prevToken = null;
  let i = 0;
  const lower = section.toLowerCase();
  while (i < section.length) {
    const c = section[i];
    if (c === '"') {
      const end = section.indexOf('"', i + 1);
      if (end < 0) ctx.fail(ERR_5, 5);
      out += section.slice(i + 1, end);
      i = end + 1;
      continue;
    }
    if (c === "\\" && i + 1 < section.length) { out += section[i + 1]; i += 2; continue; }
    let matched = null;
    for (const [name, fn] of tokens) {
      if (lower.startsWith(name, i)) { matched = [name, fn]; break; }
    }
    if (matched) {
      const [name, fn] = matched;
      if (name === "mm" || name === "m") {
        // h の直後または s の直前では分、それ以外では月（VBA の規則）
        const rest = lower.slice(i + name.length);
        const isMinute = prevToken === "h" || prevToken === "hh" || /^:?ss?\b/.test(rest) || rest.startsWith("s");
        out += isMinute
          ? (name === "mm" ? String(mi).padStart(2, "0") : String(mi))
          : (name === "mm" ? String(m).padStart(2, "0") : String(m));
        prevToken = isMinute ? "n" : "m";
      } else {
        out += fn();
        prevToken = name;
      }
      i += name.length;
      continue;
    }
    if (/[A-Za-z]/.test(c)) ctx.unsupported(`Format の日付指定子（${c}）`);
    out += c;
    i++;
  }
  return out;
}
const DATE_FORMAT_HINT = /(yyyy|yy|mmmm|mmm|mm|dddd|ddd|dd|am\/pm|a\/p|hh|nn|ss|ww)(?![a-z])/i;
function formatStringSection(ctx, value, section) {
  // @（文字または空白）／&（文字または無し）／< 小文字化／> 大文字化／! 左詰め
  let mode = null;
  let leftFill = false;
  const chars = Array.from(value);
  const seq = [];
  for (const c of section) {
    if (c === "<" || c === ">") { mode = c; seq.push({ t: "mode", c }); }
    else if (c === "!") { leftFill = true; seq.push({ t: "mode", c }); }
    else if (c === "@" || c === "&") seq.push({ t: "ph", c });
    else if (c === '"') continue;
    else seq.push({ t: "lit", c });
  }
  const applyCase = (ch) => (mode === "<" ? ch.toLowerCase() : mode === ">" ? ch.toUpperCase() : ch);
  const phCount = seq.filter((x) => x.t === "ph").length;
  if (phCount === 0) {
    // プレースホルダのない節：大文字小文字指定だけの節（"<"／">"）は文字列全体へ
    // 適用される（Learn の Format 使用例：Format("HELLO", "<") → "hello"）。
    // リテラルを含む節はリテラルをそのまま出す（従来挙動を維持）。
    const rest = seq.filter((x) => x.t === "lit").map((x) => x.c).join("");
    return rest === "" ? chars.map(applyCase).join("") : rest;
  }
  // プレースホルダは既定で右から左へ埋める（Learn「User-defined string formats」）。
  // 監査 D11：従来は不足分のパディングが末尾に付き " ab" であるべきものが "ab " に
  // なっていた。文字が過剰な場合は、右詰めでは左端、左詰め（!）では右端が落ちる。
  const win = Math.min(chars.length, phCount);
  const startChar = leftFill ? 0 : chars.length - win;
  const padBefore = leftFill ? 0 : phCount - win;
  let phIdx = 0;
  let out = "";
  for (const item of seq) {
    if (item.t === "mode") continue;
    if (item.t === "lit") { out += item.c; continue; }
    const k = phIdx - padBefore;
    if (k >= 0 && k < win) out += applyCase(chars[startChar + k]);
    else out += item.c === "@" ? " " : "";
    phIdx++;
  }
  return out;
}
const hFormat = (args, ctx) => {
  arity(ctx, args, 1, 2);
  const expr = args[0];
  if (isNull(expr)) return "";
  const fmt = args.length >= 2 && !isEmpty(args[1]) ? strArg(ctx, args[1]) : null;
  if (fmt === null || fmt === "") {
    return isEmpty(expr) ? "" : ctx.str(expr);
  }
  const named = fmt.trim().toLowerCase();
  const PREDEFINED = {
    "general number": () => ctx.str(numArg(ctx, expr)),
    "general date": () => formatDateTimeValue(ctx, toSerial(ctx, expr), 0),
    "long date": () => formatDateTimeValue(ctx, toSerial(ctx, expr), 1),
    "short date": () => formatDateTimeValue(ctx, toSerial(ctx, expr), 2),
    "long time": () => formatDateTimeValue(ctx, toSerial(ctx, expr), 3),
    "short time": () => formatDateTimeValue(ctx, toSerial(ctx, expr), 4),
    "medium date": () => {
      const { day } = decompose(toSerial(ctx, expr));
      const [y, m, d] = civilFromDays(day - EPOCH_OFFSET);
      return `${String(d).padStart(2, "0")}-${MONTH_ABBR[m - 1]}-${String(((y % 100) + 100) % 100).padStart(2, "0")}`;
    },
    "medium time": () => {
      const serial = toSerial(ctx, expr);
      const [hh, mi] = hmsOf(serial);
      return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mi).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
    },
    currency: () => formatCurrencyValue(ctx, numArg(ctx, expr), 2, -2, -2, -2),
    fixed: () => formatDecimalValue(ctx, numArg(ctx, expr), { digits: 2, group: false, leadingZero: true, parens: false }),
    standard: () => formatDecimalValue(ctx, numArg(ctx, expr), { digits: 2, group: true, leadingZero: true, parens: false }),
    percent: () => formatDecimalValue(ctx, numArg(ctx, expr) * 100, { digits: 2, group: false, leadingZero: true, parens: false }) + "%",
    scientific: () => formatNumericSection(ctx, numArg(ctx, expr), "0.00E+00"),
    "yes/no": () => (numArg(ctx, expr) !== 0 ? "Yes" : "No"),
    "true/false": () => (numArg(ctx, expr) !== 0 ? "True" : "False"),
    "on/off": () => (numArg(ctx, expr) !== 0 ? "On" : "Off"),
  };
  if (named in PREDEFINED) return PREDEFINED[named]();
  const sections = splitSections(fmt);
  if (sections.length > 4) ctx.fail(ERR_5, 5);
  // 文字列書式（@ & < > ! を含む）か
  if (/[@&<>!]/.test(fmt.replace(/"[^"]*"/g, ""))) {
    const s = isEmpty(expr) ? "" : typeof expr === "string" ? expr : ctx.str(expr);
    return formatStringSection(ctx, s, sections[0]);
  }
  // 日付書式か
  const unquoted = fmt.replace(/"[^"]*"/g, "");
  if (DATE_FORMAT_HINT.test(unquoted) || /(^|[^a-z])h([^a-z]|$)/i.test(unquoted) && /[:s]/.test(unquoted)) {
    const serial = typeof expr === "string" && parseDateTimeString(expr) ? toSerial(ctx, expr)
      : typeof expr === "number" || isEmpty(expr) ? (isEmpty(expr) ? 0 : expr)
      : ctx.fail(ERR_13, 13);
    return formatDateSection(ctx, serial, sections[0]);
  }
  // 数値書式
  let value;
  if (isEmpty(expr)) value = 0;
  else if (typeof expr === "string") {
    const p = parseDateTimeString(expr);
    void p;
    try { value = ctx.num(expr); } catch { return expr; } // 数値化できない文字列はそのまま返す
  } else value = numArg(ctx, expr);
  let section;
  if (sections.length === 1) section = sections[0];
  else if (sections.length === 2) section = value >= 0 ? sections[0] : sections[1];
  else section = value > 0 ? sections[0] : value < 0 ? sections[1] : sections[2];
  if (section === "") return "";
  const body = formatNumericSection(ctx, value, section);
  return value < 0 && sections.length === 1 && !section.includes("-") ? "-" + body : body;
};
// FormatNumber／FormatCurrency／FormatPercent の共通整形
function formatDecimalValue(ctx, value, { digits, group, leadingZero, parens }) {
  const neg = value < 0;
  const { intStr, fracStr } = roundedParts(Math.abs(value), digits);
  let intOut = intStr;
  if (!leadingZero && intOut === "0" && Math.abs(value) < 1) intOut = "";
  if (group && intOut) intOut = groupInt(intOut);
  const body = (intOut || "0") === "0" && intOut === "" ? "." + fracStr : intOut + (digits > 0 ? "." + fracStr : "");
  const plain = digits > 0 ? (intOut + "." + fracStr) : intOut;
  void body;
  if (neg && parens) return "(" + plain + ")";
  return (neg ? "-" : "") + plain;
}
function triState(ctx, v, defaultValue) {
  if (v === undefined || isEmpty(v)) return defaultValue;
  const n = longArg(ctx, v);
  if (n === -2) return defaultValue;
  return n !== 0;
}
function formatCurrencyValue(ctx, value, digitsArg, leadingArg, parensArg, groupArg) {
  const digits = digitsArg === -1 || digitsArg === undefined ? 2 : digitsArg;
  if (digits < 0) ctx.fail(ERR_5, 5);
  const leading = triState(ctx, leadingArg, true);
  const parens = triState(ctx, parensArg, true); // en-US ロケールの既定（負数は括弧）
  const group = triState(ctx, groupArg, true);
  const body = formatDecimalValue(ctx, Math.abs(value), { digits, group, leadingZero: leading, parens: false });
  if (value < 0) return parens ? `($${body})` : `-$${body}`;
  return "$" + body;
}
const hFormatNumber = (args, ctx) => {
  arity(ctx, args, 1, 5);
  const value = numArg(ctx, args[0]);
  const digits = args.length >= 2 && !isEmpty(args[1]) ? longArg(ctx, args[1]) : -1;
  const d = digits === -1 ? 2 : digits;
  if (d < 0) ctx.fail(ERR_5, 5);
  const leading = triState(ctx, args[2], true);
  const parens = triState(ctx, args[3], false);
  const group = triState(ctx, args[4], true);
  return formatDecimalValue(ctx, value, { digits: d, group, leadingZero: leading, parens });
};
const hFormatCurrency = (args, ctx) => {
  arity(ctx, args, 1, 5);
  const value = numArg(ctx, args[0]);
  const digits = args.length >= 2 && !isEmpty(args[1]) ? longArg(ctx, args[1]) : -1;
  return formatCurrencyValue(ctx, value, digits, args[2], args[3], args[4]);
};
const hFormatPercent = (args, ctx) => {
  arity(ctx, args, 1, 5);
  const value = numArg(ctx, args[0]);
  const digits = args.length >= 2 && !isEmpty(args[1]) ? longArg(ctx, args[1]) : -1;
  const d = digits === -1 ? 2 : digits;
  if (d < 0) ctx.fail(ERR_5, 5);
  const leading = triState(ctx, args[2], true);
  const parens = triState(ctx, args[3], false);
  const group = triState(ctx, args[4], true);
  return formatDecimalValue(ctx, value * 100, { digits: d, group, leadingZero: leading, parens }) + "%";
};

/* ---------------- StrConv・色・型情報・その他 ---------------- */
const HALF_KANA = "｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";
const FULL_KANA = "。「」、・ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン";
const DAKU_BASE = "カキクケコサシスセソタチツテトハヒフヘホウ";
const DAKU_VOICED = "ガギグゲゴザジズゼゾダヂヅデドバビブベボヴ";
const HANDAKU_BASE = "ハヒフヘホ";
const HANDAKU_VOICED = "パピプペポ";
function toWide(s) {
  let out = "";
  const chars = Array.from(s);
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const cp = c.codePointAt(0);
    if (c === " ") { out += "　"; continue; }
    if (cp >= 0x21 && cp <= 0x7e) { out += String.fromCodePoint(cp + 0xfee0); continue; }
    const hi = HALF_KANA.indexOf(c);
    if (hi >= 0) {
      const full = FULL_KANA[hi];
      const next = chars[i + 1];
      if (next === "ﾞ") {
        const di = DAKU_BASE.indexOf(full);
        if (di >= 0) { out += DAKU_VOICED[di]; i++; continue; }
      }
      if (next === "ﾟ") {
        const di = HANDAKU_BASE.indexOf(full);
        if (di >= 0) { out += HANDAKU_VOICED[di]; i++; continue; }
      }
      out += full;
      continue;
    }
    out += c;
  }
  return out;
}
function toNarrow(s) {
  let out = "";
  for (const c of s) {
    const cp = c.codePointAt(0);
    if (c === "　") { out += " "; continue; }
    if (cp >= 0xff01 && cp <= 0xff5e) { out += String.fromCodePoint(cp - 0xfee0); continue; }
    const di = DAKU_VOICED.indexOf(c);
    if (di >= 0) { out += HALF_KANA[FULL_KANA.indexOf(DAKU_BASE[di])] + "ﾞ"; continue; }
    const hi2 = HANDAKU_VOICED.indexOf(c);
    if (hi2 >= 0) { out += HALF_KANA[FULL_KANA.indexOf(HANDAKU_BASE[hi2])] + "ﾟ"; continue; }
    const fi = FULL_KANA.indexOf(c);
    if (fi >= 0) { out += HALF_KANA[fi]; continue; }
    out += c;
  }
  return out;
}
function shiftKana(s, from, to) {
  // ひらがな U+3041-3096 とカタカナ U+30A1-30F6 は 0x60 差で対応する
  let out = "";
  for (const c of s) {
    const cp = c.codePointAt(0);
    if (cp >= from && cp <= from + 0x55) out += String.fromCodePoint(cp + (to - from));
    else out += c;
  }
  return out;
}
const PROPER_SEPARATORS = new Set(["\0", "\t", "\n", "\v", "\f", "\r", " "]);
function toProperCase(s) {
  let out = "";
  let capNext = true;
  for (const c of s) {
    if (PROPER_SEPARATORS.has(c)) { out += c; capNext = true; continue; }
    if (/\p{L}/u.test(c)) {
      out += capNext ? c.toUpperCase() : c.toLowerCase();
      capNext = false;
    } else out += c;
  }
  return out;
}
const hStrConv = (args, ctx) => {
  arity(ctx, args, 2, 3);
  if (isNull(args[0])) ctx.fail(ERR_94, 94);
  let s = ctx.str(args[0]);
  const conv = longArg(ctx, args[1]);
  if (args.length >= 3 && !isEmpty(args[2])) {
    const lcid = longArg(ctx, args[2]);
    if (lcid !== 0) ctx.unsupported("StrConv の LCID 引数（ロケール依存変換）");
  }
  if (conv & 64 || conv & 128)
    ctx.unsupported("StrConv の vbUnicode／vbFromUnicode（バイト配列モデルが無いため）");
  if (conv & 256 || conv & 512 || conv & 1024)
    ctx.unsupported("StrConv の中国語変換／言語的ケース（ロケール依存）");
  const casePart = conv & 3;
  if (casePart === 1) s = s.toUpperCase();
  else if (casePart === 2) s = s.toLowerCase();
  else if (casePart === 3) s = toProperCase(s);
  if (conv & 4 && conv & 8) ctx.fail(ERR_5, 5); // vbWide と vbNarrow は相互排他
  if (conv & 16 && conv & 32) ctx.fail(ERR_5, 5); // vbKatakana と vbHiragana は相互排他
  if (conv & 4) s = toWide(s);
  if (conv & 8) s = toNarrow(s);
  if (conv & 16) s = shiftKana(s, 0x3041, 0x30a1);
  if (conv & 32) s = shiftKana(s, 0x30a1, 0x3041);
  return s;
};
const hRGB = (args, ctx) => {
  arity(ctx, args, 3, 3);
  const parts = args.map((v) => {
    const n = ctx.roundEven(numArg(ctx, v));
    if (n < 0) ctx.fail(ERR_5, 5);
    return Math.min(255, n); // 255 超は 255 とみなす（MS-VBAL RGB）
  });
  return parts[0] + parts[1] * 256 + parts[2] * 65536;
};
const QB_TABLE = [
  0, 0x800000, 0x8000, 0x808000, 0x80, 0x800080, 0x8080, 0xc0c0c0,
  0x808080, 0xff0000, 0xff00, 0xffff00, 0xff, 0xff00ff, 0xffff, 0xffffff,
]; // MS-VBAL QBColor の戻り値表
const hQBColor = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const n = longArg(ctx, args[0]);
  if (n < 0 || n > 15) ctx.fail(ERR_5, 5);
  return QB_TABLE[n];
};
// 値モデルの種別 → 実 VBA の型名／VarType コード対応（報告書に表で明記）。
// 数値はモデルが Double で保持するため一律 Double(5) とする（実 VBA の
// リテラル Integer 等のサブタイプは値だけでは区別できない。報告書に明記）。
function typeInfoOf(ctx, v) {
  if (isEmpty(v)) return ["Empty", 0];
  if (isNull(v)) return ["Null", 1];
  if (typeof v === "boolean") return ["Boolean", 11];
  if (typeof v === "number") return ["Double", 5];
  if (typeof v === "string") return ["String", 8];
  switch (v?.kind) {
    case "nothing": return ["Nothing", 9];
    case "array": return ["Variant()", 8192 + 12];
    case "range": return ["Range", 9];
    case "err": return typeof v.code === "number" ? ["Error", 10] : ["Object", 9];
    default: ctx.fail(ERR_13, 13);
  }
}
const hTypeName = (args, ctx) => {
  arity(ctx, args, 1, 1);
  return typeInfoOf(ctx, args[0])[0];
};
const hVarType = (args, ctx) => {
  arity(ctx, args, 1, 1);
  return typeInfoOf(ctx, args[0])[1];
};
const hSpace = (args, ctx) => {
  arity(ctx, args, 1, 1);
  const n = longArg(ctx, args[0]);
  if (n < 0) ctx.fail(ERR_5, 5);
  if (n > 200000) return ctx.unknown("とても長い文字列");
  return " ".repeat(n);
};
const hStrReverse = nullPropagating((args, ctx) => {
  arity(ctx, args, 1, 1);
  return Array.from(ctx.str(args[0])).reverse().join("");
});
const trimSide = (side) => nullPropagating((args, ctx) => {
  arity(ctx, args, 1, 1);
  const s = ctx.str(args[0]);
  return side === "l" ? s.replace(/^ +/, "") : s.replace(/ +$/, "");
});

export const advancedBuiltins = {
  asc: hAsc,
  chr: hChr,
  cverr: hCVErr,
  format: hFormat,
  hex: hHexOct(true),
  oct: hHexOct(false),
  str: hStr,
  atn: hMath1((x) => Math.atan(x)),
  cos: hMath1((x) => Math.cos(x)),
  exp: hMath1((x) => Math.exp(x)),
  log: hMath1((x) => Math.log(x), (x) => x > 0),
  sgn: nullPropagating((args, ctx) => {
    arity(ctx, args, 1, 1);
    const x = numArg(ctx, args[0]);
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  }),
  sin: hMath1((x) => Math.sin(x)),
  sqr: hMath1((x) => Math.sqrt(x), (x) => x >= 0),
  tan: hMath1((x) => Math.tan(x)),
  cbool: hCBool,
  cbyte: hCByte,
  ccur: hCCur,
  cdate: hCDate,
  cdec: hCDec,
  clnglng: hCLngLng,
  clngptr: hCLngLng, // モデルは 64 ビット前提（報告書に明記）
  csng: hCSng,
  cvar: hCVar,
  choose: hChoose,
  dateadd: hDateAdd,
  datediff: hDateDiff,
  datepart: hDatePart,
  dateserial: hDateSerial,
  datevalue: hDateValue,
  day: datePartGetter((s) => ymdOf(s)[2]),
  ddb: hDDB,
  error: hError,
  filter: hFilter,
  formatcurrency: hFormatCurrency,
  formatdatetime: hFormatDateTime,
  formatnumber: hFormatNumber,
  formatpercent: hFormatPercent,
  fv: hFV,
  hour: datePartGetter((s) => hmsOf(s)[0]),
  iif: hIIf,
  instrrev: hInStrRev,
  ipmt: hIPmt,
  irr: hIRR,
  isarray: hIsArray,
  isdate: hIsDate,
  iserror: hIsError,
  ismissing: hIsMissing,
  isobject: hIsObject,
  join: hJoin,
  ltrim: trimSide("l"),
  rtrim: trimSide("r"),
  minute: datePartGetter((s) => hmsOf(s)[1]),
  mirr: hMIRR,
  month: datePartGetter((s) => ymdOf(s)[1]),
  monthname: hMonthName,
  nper: hNPer,
  npv: hNPV,
  partition: hPartition,
  pmt: hPmt,
  ppmt: hPPmt,
  pv: hPV,
  qbcolor: hQBColor,
  rate: hRate,
  rgb: hRGB,
  second: datePartGetter((s) => hmsOf(s)[2]),
  sln: hSLN,
  space: hSpace,
  split: hSplit,
  strconv: hStrConv,
  strcomp: hStrComp,
  strreverse: hStrReverse,
  switch: hSwitch,
  syd: hSYD,
  timeserial: hTimeSerial,
  timevalue: hTimeValue,
  typename: hTypeName,
  vartype: hVarType,
  weekday: hWeekday,
  weekdayname: hWeekdayName,
  year: datePartGetter((s) => ymdOf(s)[0]),
};
