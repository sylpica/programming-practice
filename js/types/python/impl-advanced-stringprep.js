/* 高度モード B7 G3：stringprep モジュール（全19件）の意味論実装。
 * 一次情報：CPython 3.12.3 の stringprep.py（RFC 3454 の表）実走。
 * 裁定：定義が明示的な集合・範囲・規則だけで閉じる項目は実装した
 * （in_table_b1／c11／c12／c11_c12／c21／c22／c21_c22／c3／c4／c5／c6／
 * c7／c8／c9／map_table_b2／map_table_b3）。Cc（制御文字）の範囲・Zs
 * （空白区切り）の集合・Co（私用領域）の範囲・Cs（サロゲート）の範囲は
 * Unicode 3.2.0 から現行まで不変であることを実走照合で確認した。
 * in_table_a1（未割り当て Cn は版ごとに変わる）と in_table_d1／d2
 * （双方向クラスは版差が大きい）は、Unicode 3.2.0 の表を本アプリが
 * 保持しないため未対応とする。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { SP_B1, SP_B3 } from './impl-advanced-stringprep-tables.js';

const { BOOL } = PyAPI;
const B1SET = new Set(SP_B1);
// Zs は CPython の stringprep が使う Unicode 3.2.0 の集合に合わせる
// （U+205F は Unicode 4.0 で Zs に追加されたため 3.2.0 には含まれない）
const ZS = new Set([0x20, 0xA0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x3000]);
const C22_SPECIALS = new Set([1757, 1807, 6158, 8204, 8205, 8232, 8233, 65279,
  ...range(8288, 8292), ...range(8298, 8304), ...range(65529, 65533), ...range(119155, 119163)]);
function range(a, b) { const out = []; for (let i = a; i < b; i++) out.push(i); return out; }
const isCc = (cp) => (cp >= 0 && cp <= 0x1F) || (cp >= 0x7F && cp <= 0x9F);
const isCo = (cp) => (cp >= 0xE000 && cp <= 0xF8FF) || (cp >= 0xF0000 && cp <= 0xFFFFD) || (cp >= 0x100000 && cp <= 0x10FFFD);
const isCs = (cp) => cp >= 0xD800 && cp <= 0xDFFF;

function charArg(ctx, v, fname) {
  if (ctx.isUnk(v)) return null;
  const s = ctx.str(v);
  if (s === null) ctx.err('TypeError', 'stringprep.' + fname + '() の引数には1文字の文字列を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  const chars = [...s];
  if (chars.length !== 1) ctx.err('TypeError', 'stringprep.' + fname + '() の引数は1文字でなければなりません（' + chars.length + '文字が渡されました）', '');
  return chars[0];
}
function tableFn(fname, pred) {
  return (ctx, args, kwargs) => {
    const ks = Object.keys(kwargs || {});
    if (ks.length) ctx.err('TypeError', 'stringprep.' + fname + '() にキーワード引数「' + ks[0] + '」はありません', '');
    if (args.length !== 1) ctx.err('TypeError', 'stringprep.' + fname + '() の引数の数が合いません（' + args.length + '個渡されました）', '');
    const ch = charArg(ctx, args[0], fname);
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return BOOL(pred(ch.codePointAt(0), ch));
  };
}
function unsupported(fname, reason) {
  return (ctx) => ctx.err('未対応', 'stringprep.' + fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', '');
}
function mapB3(ch) {
  const cp = ch.codePointAt(0);
  if (Object.prototype.hasOwnProperty.call(SP_B3, cp)) return SP_B3[cp];
  return ch.toLowerCase();
}
function mapB2(ch) {
  const al = mapB3(ch);
  const b = al.normalize('NFKC');
  const bl = [...b].map((c) => mapB3(c)).join('');
  const c2 = bl.normalize('NFKC');
  return b !== c2 ? c2 : al;
}

const FUNCTIONS = {
  in_table_a1: unsupported('in_table_a1', 'Unicode 3.2.0 の未割り当て表を保持していないため'),
  in_table_b1: tableFn('in_table_b1', (cp) => B1SET.has(cp)),
  in_table_c11: tableFn('in_table_c11', (cp, ch) => ch === ' '),
  in_table_c12: tableFn('in_table_c12', (cp, ch) => ZS.has(cp) && ch !== ' '),
  in_table_c11_c12: tableFn('in_table_c11_c12', (cp) => ZS.has(cp)),
  in_table_c21: tableFn('in_table_c21', (cp) => cp < 128 && isCc(cp)),
  in_table_c22: tableFn('in_table_c22', (cp) => cp >= 128 && (isCc(cp) || C22_SPECIALS.has(cp))),
  in_table_c21_c22: tableFn('in_table_c21_c22', (cp) => isCc(cp) || C22_SPECIALS.has(cp)),
  in_table_c3: tableFn('in_table_c3', (cp) => isCo(cp)),
  in_table_c4: tableFn('in_table_c4', (cp) => (cp >= 0xFDD0 && cp < 0xFDF0) || (cp & 0xFFFF) === 0xFFFE || (cp & 0xFFFF) === 0xFFFF),
  in_table_c5: tableFn('in_table_c5', (cp) => isCs(cp)),
  in_table_c6: tableFn('in_table_c6', (cp) => cp >= 65529 && cp < 65534),
  in_table_c7: tableFn('in_table_c7', (cp) => cp >= 12272 && cp < 12284),
  in_table_c8: tableFn('in_table_c8', (cp) => [832, 833, 8206, 8207].includes(cp) || (cp >= 8234 && cp < 8239) || (cp >= 8298 && cp < 8304)),
  in_table_c9: tableFn('in_table_c9', (cp) => cp === 917505 || (cp >= 917536 && cp < 917632)),
  in_table_d1: unsupported('in_table_d1', 'Unicode 3.2.0 の双方向クラス表を保持していないため'),
  in_table_d2: unsupported('in_table_d2', 'Unicode 3.2.0 の双方向クラス表を保持していないため'),
  map_table_b2: (ctx, args, kwargs) => {
    if (args.length !== 1 || Object.keys(kwargs || {}).length) ctx.err('TypeError', 'stringprep.map_table_b2() の引数が合いません', '');
    const ch = charArg(ctx, args[0], 'map_table_b2');
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return mapB2(ch);
  },
  map_table_b3: (ctx, args, kwargs) => {
    if (args.length !== 1 || Object.keys(kwargs || {}).length) ctx.err('TypeError', 'stringprep.map_table_b3() の引数が合いません', '');
    const ch = charArg(ctx, args[0], 'map_table_b3');
    if (ch === null) return ctx.unk('文字が実行時に決まる値');
    return mapB3(ch);
  },
};

registerStdlibModule('stringprep', { functions: FUNCTIONS });
