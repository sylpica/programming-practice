/* 高度モード B7 G3：unicodedata モジュール（全22件）の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/unicodedata）と
 * CPython 3.12.3（Unicode 15.0.0）実走。
 * - normalize／is_normalized は JS String.prototype.normalize で再現する
 *   （同一文字列について CPython と全数照合済みの範囲は報告書参照）。
 * - category は JS の Unicode プロパティエスケープ（\p{...}）で導出する。
 * - combining／east_asian_width／mirrored／isxidstart／isxidcontinue／
 *   digit／numeric の Nd 以外は、CPython 実走走査から転記したデータ表
 *   （impl-advanced-unicodedata-tables.js）で再現する。
 * - name／lookup／decomposition／bidirectional／block／
 *   extended_pictographic／grapheme_cluster_break／indic_conjunct_break／
 *   iter_graphemes／ucd_3_2_0 は、再現に必要な名前・分解・双方向等の
 *   データ表を本アプリが保持しないため未対応とする。
 * - unidata_version は実行基盤（JS エンジン）の Unicode 版と CPython の
 *   版が一致しないため値を確定できず未検証とする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { UCD_COMBINING, UCD_EAW, UCD_MIRRORED, UCD_XID_START, UCD_XID_CONTINUE, UCD_DIGIT, UCD_NUMERIC } from './impl-advanced-unicodedata-tables.js';

const { NUM, BOOL } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);

function arity1(ctx, args, kwargs, fname) {
  if (args.length !== 1) ctx.err('TypeError', 'unicodedata.' + fname + '() の引数の数が合いません（' + args.length + '個渡されました）', '');
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', 'unicodedata.' + fname + '() にキーワード引数「' + ks[0] + '」はありません', '');
}
function charArg(ctx, v, fname) {
  if (ctx.isUnk(v)) return null;
  const s = ctx.str(v);
  if (s === null) ctx.err('TypeError', 'unicodedata.' + fname + '() の引数には1文字の文字列を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  const chars = [...s];
  if (chars.length !== 1) ctx.err('TypeError', 'unicodedata.' + fname + '() の引数は1文字でなければなりません', '');
  return chars[0];
}
function strArg(ctx, v, fname) {
  if (ctx.isUnk(v)) return null;
  const s = ctx.str(v);
  if (s === null) ctx.err('TypeError', 'unicodedata.' + fname + '() の引数には文字列を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return s;
}
function inRanges(flat, cp) { // [開始, 終了] の繰り返し
  let lo = 0, hi = flat.length / 2 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cp < flat[mid * 2]) hi = mid - 1;
    else if (cp > flat[mid * 2 + 1]) lo = mid + 1;
    else return true;
  }
  return false;
}
function rangeVal(flat, cp, dflt) { // [開始, 終了, 値] の繰り返し
  let lo = 0, hi = flat.length / 3 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cp < flat[mid * 3]) hi = mid - 1;
    else if (cp > flat[mid * 3 + 1]) lo = mid + 1;
    else return flat[mid * 3 + 2];
  }
  return dflt;
}

/* category：JS プロパティエスケープで各一般カテゴリを判定する */
const CAT_RES = {};
for (const c of ['Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'Mn', 'Mc', 'Me', 'Nd', 'Nl', 'No', 'Pc', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'Po', 'Sm', 'Sc', 'Sk', 'So', 'Zs', 'Zl', 'Zp', 'Cc', 'Cf', 'Cs', 'Co', 'Cn']) {
  CAT_RES[c] = new RegExp('\\p{' + c + '}', 'u');
}
function categoryOf(ch) {
  for (const c of Object.keys(CAT_RES)) if (CAT_RES[c].test(ch)) return c;
  return 'Cn';
}
function decimalOf(ch) {
  // Nd の10進値：Nd は 0〜9 の完全な10文字ブロックの連続で構成される
  // （数学用英数字のように複数ブロックが隣接する場合は走査区間の長さが
  // 20 以上になるため、区間先頭からの位置を 10 で割った余りを取る）。
  // 全 Nd 文字（680件）で CPython と一致することを検証済み。
  if (!CAT_RES.Nd.test(ch)) return null;
  let cp = ch.codePointAt(0);
  let start = cp;
  while (start > 0 && CAT_RES.Nd.test(String.fromCodePoint(start - 1))) start -= 1;
  return (cp - start) % 10;
}
function unsupported(fname, reason) {
  return (ctx) => ctx.err('未対応', 'unicodedata.' + fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', '');
}
function numWithDefault(ctx, args, kwargs, fname, kind) {
  // decimal／digit／numeric：(chr[, default])。値が無ければ default か ValueError
  if (args.length < 1 || args.length > 2) ctx.err('TypeError', 'unicodedata.' + fname + '() の引数の数が合いません', '');
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', 'unicodedata.' + fname + '() にキーワード引数「' + ks[0] + '」はありません', '');
  const ch = charArg(ctx, args[0], fname);
  if (ch === null) return ctx.unk('文字が実行時に決まる値');
  const cp = ch.codePointAt(0);
  let val = null;
  const dec = decimalOf(ch);
  if (kind === 'decimal') val = dec;
  else if (kind === 'digit') val = dec !== null ? dec : (Object.prototype.hasOwnProperty.call(UCD_DIGIT, cp) ? UCD_DIGIT[cp] : null);
  else val = dec !== null ? dec : (Object.prototype.hasOwnProperty.call(UCD_NUMERIC, cp) ? UCD_NUMERIC[cp] : null);
  if (val === null) {
    if (args.length === 2) return args[1];
    ctx.err('ValueError', 'unicodedata.' + fname + '() で値が定義されていない文字です', '');
  }
  return kind === 'numeric' ? F(val) : I(val);
}

const FUNCTIONS = {
  normalize: (ctx, args, kwargs) => {
    if (args.length !== 2) ctx.err('TypeError', 'unicodedata.normalize() の引数の数が合いません（' + args.length + '個渡されました）', '');
    const form = strArg(ctx, args[0], 'normalize');
    const s = strArg(ctx, args[1], 'normalize');
    if (form === null || s === null) return ctx.unk('引数が実行時に決まる値');
    if (!['NFC', 'NFD', 'NFKC', 'NFKD'].includes(form)) ctx.err('ValueError', 'invalid normalization form', '');
    return s.normalize(form);
  },
  is_normalized: (ctx, args, kwargs) => {
    if (args.length !== 2) ctx.err('TypeError', 'unicodedata.is_normalized() の引数の数が合いません（' + args.length + '個渡されました）', '');
    const form = strArg(ctx, args[0], 'is_normalized');
    const s = strArg(ctx, args[1], 'is_normalized');
    if (form === null || s === null) return ctx.unk('引数が実行時に決まる値');
    if (!['NFC', 'NFD', 'NFKC', 'NFKD'].includes(form)) ctx.err('ValueError', 'invalid normalization form', '');
    return BOOL(s.normalize(form) === s);
  },
  category: (ctx, args, kwargs) => {
    arity1(ctx, args, kwargs, 'category');
    const ch = charArg(ctx, args[0], 'category');
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return categoryOf(ch);
  },
  combining: (ctx, args, kwargs) => {
    arity1(ctx, args, kwargs, 'combining');
    const ch = charArg(ctx, args[0], 'combining');
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return I(rangeVal(UCD_COMBINING, ch.codePointAt(0), 0));
  },
  east_asian_width: (ctx, args, kwargs) => {
    arity1(ctx, args, kwargs, 'east_asian_width');
    const ch = charArg(ctx, args[0], 'east_asian_width');
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return rangeVal(UCD_EAW, ch.codePointAt(0), 'N');
  },
  mirrored: (ctx, args, kwargs) => {
    arity1(ctx, args, kwargs, 'mirrored');
    const ch = charArg(ctx, args[0], 'mirrored');
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return I(inRanges(UCD_MIRRORED, ch.codePointAt(0)) ? 1 : 0);
  },
  isxidstart: (ctx, args, kwargs) => {
    arity1(ctx, args, kwargs, 'isxidstart');
    const ch = charArg(ctx, args[0], 'isxidstart');
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return BOOL(inRanges(UCD_XID_START, ch.codePointAt(0)));
  },
  isxidcontinue: (ctx, args, kwargs) => {
    arity1(ctx, args, kwargs, 'isxidcontinue');
    const ch = charArg(ctx, args[0], 'isxidcontinue');
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return BOOL(inRanges(UCD_XID_CONTINUE, ch.codePointAt(0)));
  },
  decimal: (ctx, args, kwargs) => numWithDefault(ctx, args, kwargs, 'decimal', 'decimal'),
  digit: (ctx, args, kwargs) => numWithDefault(ctx, args, kwargs, 'digit', 'digit'),
  numeric: (ctx, args, kwargs) => numWithDefault(ctx, args, kwargs, 'numeric', 'numeric'),
  name: unsupported('name', 'Unicode 名データベースを保持していないため'),
  lookup: unsupported('lookup', 'Unicode 名データベースを保持していないため'),
  decomposition: unsupported('decomposition', '分解マッピング表を保持していないため'),
  bidirectional: unsupported('bidirectional', '双方向クラス表を保持していないため'),
  block: unsupported('block', 'Unicode ブロック表を保持していないため'),
  extended_pictographic: unsupported('extended_pictographic', '拡張絵文字表を保持していないため'),
  grapheme_cluster_break: unsupported('grapheme_cluster_break', '書記素クラスタ境界表を保持していないため'),
  indic_conjunct_break: unsupported('indic_conjunct_break', 'インド系結合切断表を保持していないため'),
  iter_graphemes: unsupported('iter_graphemes', '書記素クラスタ境界表を保持していないため'),
};

registerStdlibModule('unicodedata', {
  data: {
    // 実行基盤の Unicode 版と一致しないため実値化しない（未検証）
    unidata_version: PyAPI.UNK('Unicode データのバージョン（実行環境に依存し確定できません）'),
    ucd_3_2_0: PyAPI.UNK('Unicode 3.2.0 のデータベースオブジェクト（本アプリでは未対応）'),
  },
  functions: FUNCTIONS,
});
