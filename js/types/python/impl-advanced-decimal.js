/* 高度モード B7 G2：decimal モジュール全163件の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/decimal）と CPython 3.12.3 実走。
 * 内部表現：Decimal は { s: 符号(0/1), k: 'f'|'i'|'n'|'s', d: 係数桁文字列, e: 指数 }、
 * Context は { prec, rounding, Emin, Emax, capitals, clamp, traps, flags } を
 * ネイティブ値の data に保持する。係数演算は BigInt で厳密に行い、コンテキストの
 * 精度・丸め・指数範囲・シグナル（flags／traps の二重挙動）を仕様どおり適用する。
 * exp／ln／log10 は BigInt 固定小数点（精度＋40桁のガード）で計算し HALF_EVEN で
 * 正しく丸める。sqrt は整数平方根で正しく丸める。冪（非整数）は exp／ln 経由。
 * 基盤の制約（単項演算子・int()/float()/abs() のネイティブ dispatch が無い等）は
 * docs/audit/b7-g2-report.md の基盤要請に記録した。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, registerStdlibClass, makeNative, NOT_HANDLED } from './stdlib-registry.js';

const { NUM, BOOL, NONE, TUPLE, DICT, UNK, dictSet } = PyAPI;
const I = (v) => NUM(v, false);
const BIGDESC = 'とても大きな整数・この説明では正確に計算しません';
const SIG_ORDER = ['InvalidOperation', 'FloatOperation', 'DivisionByZero', 'Overflow', 'Underflow', 'Subnormal', 'Inexact', 'Rounded', 'Clamped'];
/* repr／辞書での表示順（CPython 実走で確定した libmpdec のシグナル順） */
const REPR_ORDER = ['Clamped', 'InvalidOperation', 'DivisionByZero', 'Inexact', 'FloatOperation', 'Overflow', 'Rounded', 'Subnormal', 'Underflow'];
const ROUNDINGS = ['ROUND_CEILING', 'ROUND_FLOOR', 'ROUND_UP', 'ROUND_DOWN', 'ROUND_HALF_UP', 'ROUND_HALF_DOWN', 'ROUND_HALF_EVEN', 'ROUND_05UP'];
const MAX_EMAX_INT = 999999999999999999;

/* ============ Decimal データの基本 ============ */
const mkFin = (s, d, e) => ({ s, k: 'f', d, e });
const mkInf = (s) => ({ s, k: 'i', d: '', e: 0 });
const mkNan = (s, payload, snan) => ({ s, k: snan ? 's' : 'n', d: payload || '', e: 0 });
const isZeroD = (d) => d.k === 'f' && d.d === '0';
const adjOf = (d) => d.e + d.d.length - 1; // 有限非ゼロ前提
const cloneDec = (d) => ({ s: d.s, k: d.k, d: d.d, e: d.e });

function stripLeadingZeros(ds) { const r = ds.replace(/^0+/, ''); return r === '' ? '0' : r; }
function incDigitsStr(s) { const a = s.split(''); let i = a.length - 1; while (i >= 0 && a[i] === '9') { a[i] = '0'; i--; } if (i < 0) return '1' + a.join(''); a[i] = String(Number(a[i]) + 1); return a.join(''); }
function bigIsqrt(n) { if (n <= 0n) return 0n; let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2)); for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; } }
function bigGcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b !== 0n) { const t = a % b; a = b; b = t; } return a; }
const pow10 = (n) => 10n ** BigInt(n);

/* double の正確な10進展開（float → Decimal 変換用。engine.js の exactDecimal と同方式） */
function decFromDouble(x) {
  if (Number.isNaN(x)) return mkNan(0, '', false);
  if (x === Infinity) return mkInf(0);
  if (x === -Infinity) return mkInf(1);
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const bits = buf.getBigUint64(0);
  const sign = (bits >> 63n) === 1n ? 1 : 0;
  const expBits = Number((bits >> 52n) & 0x7ffn);
  let mant = bits & ((1n << 52n) - 1n);
  let e2;
  if (expBits === 0) { if (mant === 0n) return mkFin(sign, '0', 0); e2 = -1074; }
  else { mant |= (1n << 52n); e2 = expBits - 1075; }
  while ((mant & 1n) === 0n) { mant >>= 1n; e2 += 1; } // as_integer_ratio と同じ既約化（末尾ゼロを作らない）
  let digits, scale;
  if (e2 >= 0) { digits = (mant << BigInt(e2)).toString(); scale = 0; }
  else { digits = (mant * (5n ** BigInt(-e2))).toString(); scale = e2; }
  digits = stripLeadingZeros(digits);
  return mkFin(sign, digits, scale);
}
/* JS 数値（int）→ Decimal データ */
function decFromIntNum(v) {
  if (v === 0) return mkFin(0, '0', 0);
  const s = v < 0 ? 1 : 0;
  return mkFin(s, String(Math.abs(v)), 0);
}

/* ============ 文字列パース（Decimal コンストラクタ文法） ============ */
const ND_ZEROS = [0x30, 0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66, 0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x1090, 0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0xFF10];
function normDigits(s) {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 128) { out += ch; continue; }
    let rep = null;
    for (const z of ND_ZEROS) { const dd = cp - z; if (dd >= 0 && dd <= 9) { rep = String(dd); break; } }
    out += rep === null ? ch : rep;
  }
  return out;
}
/* Decimal 文字列をパースする。成功時は dec データ、失敗時は null。
 * allowUnderscore=false（create_decimal 用）はアンダースコア混入で失敗させる。
 * コンストラクタは全アンダースコアを除去してから文法照合する（CPython 3.12.3 実走）。 */
function parseDecimalString(raw, allowUnderscore) {
  let t = raw.trim();
  if (!allowUnderscore && t.includes('_')) return null;
  if (allowUnderscore) t = t.replace(/_/g, '');
  t = normDigits(t);
  let sign = 0;
  if (/^[+-]/.test(t)) { sign = t[0] === '-' ? 1 : 0; t = t.slice(1); }
  const low = t.toLowerCase();
  if (low === 'inf' || low === 'infinity') return mkInf(sign);
  let m = /^snan(\d*)$/i.exec(t);
  if (m) return mkNan(sign, stripPayload(m[1]), true);
  m = /^nan(\d*)$/i.exec(t);
  if (m) return mkNan(sign, stripPayload(m[1]), false);
  m = /^(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/.exec(t);
  if (!m) return null;
  let exp = 0;
  if (m[2] !== undefined) {
    const es = m[2];
    const digitsOnly = es.replace(/^[+-]/, '');
    if (digitsOnly.length > 18) return { overflowExp: true, s: sign };
    exp = parseInt(es, 10);
    if (!Number.isSafeInteger(exp) || Math.abs(exp) > MAX_EMAX_INT) return { overflowExp: true, s: sign };
  }
  const body = m[1];
  const dot = body.indexOf('.');
  let digits, e;
  if (dot < 0) { digits = body; e = exp; }
  else { digits = body.slice(0, dot) + body.slice(dot + 1); e = exp - (body.length - dot - 1); }
  digits = digits.replace(/^0+/, '');
  if (digits === '') return mkFin(sign, '0', e);
  return mkFin(sign, digits, e);
}
function stripPayload(p) { if (!p) return ''; const r = p.replace(/^0+/, ''); return r; }

/* ============ Context データ ============ */
function defaultTraps() { const t = {}; for (const n of SIG_ORDER) t[n] = (n === 'InvalidOperation' || n === 'DivisionByZero' || n === 'Overflow'); return t; }
function emptySignals(v) { const o = {}; for (const n of SIG_ORDER) o[n] = !!v; return o; }
function templateData() { return { prec: 28, rounding: 'ROUND_HALF_EVEN', Emin: -999999, Emax: 999999, capitals: 1, clamp: 0, traps: defaultTraps(), flags: emptySignals(false) }; }
function basicData() { const d = templateData(); d.prec = 9; d.rounding = 'ROUND_HALF_UP'; for (const n of SIG_ORDER) d.traps[n] = ['Clamped', 'InvalidOperation', 'DivisionByZero', 'Overflow', 'Underflow'].includes(n); return d; }
function extendedData() { const d = templateData(); d.prec = 9; for (const n of SIG_ORDER) d.traps[n] = false; return d; }
function copyCxData(d) { return { prec: d.prec, rounding: d.rounding, Emin: d.Emin, Emax: d.Emax, capitals: d.capitals, clamp: d.clamp, traps: { ...d.traps }, flags: { ...d.flags } }; }

const DefaultContextNative = makeNative('decimal.Context', templateData());
const BasicContextNative = makeNative('decimal.Context', basicData());
const ExtendedContextNative = makeNative('decimal.Context', extendedData());
let CUR = null; // 現在のコンテキスト（ネイティブ値）。初回 getcontext で DefaultContext の複製を作る
function curNative() { if (!CUR) CUR = makeNative('decimal.Context', copyCxData(DefaultContextNative.data)); return CUR; }
function curData() { return curNative().data; }

/* ============ シグナル ============ */
const sigMsg = (name) => "[<class 'decimal." + name + "'>]";
function sig(ctx, cx, name, kind, msg) {
  cx.flags[name] = true;
  if (cx.traps[name]) ctx.err(kind || ('decimal.' + name), msg || sigMsg(name), '');
}
function sigAll(ctx, cx, list) {
  // list: [[signalName, kind?, msg?], ...]。フラグを全て立ててから、優先順に最初のトラップを送出する
  for (const [name] of list) cx.flags[name] = true;
  const prio = ['InvalidOperation', 'DivisionByZero', 'Overflow', 'Underflow', 'FloatOperation', 'Inexact', 'Subnormal', 'Rounded', 'Clamped'];
  for (const p of prio) {
    const hit = list.find(([n]) => n === p);
    if (hit && cx.traps[p]) ctx.err(hit[1] || ('decimal.' + p), hit[2] || sigMsg(p), '');
  }
}

/* ============ 丸めのコア ============ */
function decideInc(mode, sign, keep, dropped, sticky) {
  const anyNz = /[1-9]/.test(dropped) || !!sticky;
  switch (mode) {
    case 'ROUND_DOWN': return false;
    case 'ROUND_UP': return anyNz;
    case 'ROUND_CEILING': return sign === 0 && anyNz;
    case 'ROUND_FLOOR': return sign === 1 && anyNz;
    case 'ROUND_05UP': return anyNz && (keep.endsWith('0') || keep.endsWith('5'));
    default: { // HALF 系
      if (dropped.length === 0) return false;
      const half = '5' + '0'.repeat(dropped.length - 1);
      if (dropped > half) return true;
      if (dropped < half) return false;
      if (sticky) return true;
      if (mode === 'ROUND_HALF_UP') return true;
      if (mode === 'ROUND_HALF_DOWN') return false;
      return (keep.charCodeAt(keep.length - 1) - 48) % 2 === 1;
    }
  }
}
/* 係数文字列 C（先行ゼロなし）を prec 桁へ丸める */
function roundTo(C, e, prec, mode, sign, sticky) {
  if (C === '0' || C.length <= prec) return { C, e, rounded: false, inexact: false };
  const keep = C.slice(0, prec), dropped = C.slice(prec);
  const inexact = /[1-9]/.test(dropped) || !!sticky;
  let C2 = keep, e2 = e + dropped.length;
  if (decideInc(mode, sign, keep, dropped, sticky)) {
    C2 = incDigitsStr(keep);
    if (C2.length > prec) { C2 = C2.slice(0, prec); e2 += 1; }
  }
  return { C: C2, e: e2, rounded: true, inexact };
}
/* 係数の右から shift 桁を落として丸める（Etiny への丸め用） */
function roundDrop(C, shift, mode, sign, sticky) {
  if (shift <= 0) return { C, rounded: false, inexact: false };
  if (shift >= C.length) {
    const Cb = BigInt(C);
    const unit = pow10(shift);
    const inexact = Cb !== 0n || !!sticky;
    let inc = false;
    if (mode === 'ROUND_DOWN') inc = false;
    else if (mode === 'ROUND_UP') inc = inexact;
    else if (mode === 'ROUND_CEILING') inc = sign === 0 && inexact;
    else if (mode === 'ROUND_FLOOR') inc = sign === 1 && inexact;
    else if (mode === 'ROUND_05UP') inc = inexact; // 保持側は 0 なので末尾は 0
    else {
      const twice = Cb * 2n;
      if (twice > unit) inc = true;
      else if (twice === unit) inc = !!sticky || mode === 'ROUND_HALF_UP';
    }
    return { C: inc ? '1' : '0', rounded: true, inexact };
  }
  const keep = C.slice(0, C.length - shift), dropped = C.slice(C.length - shift);
  const inexact = /[1-9]/.test(dropped) || !!sticky;
  let C2 = keep;
  if (decideInc(mode, sign, keep, dropped, sticky)) C2 = incDigitsStr(keep);
  return { C: C2, rounded: true, inexact };
}

/* コンテキストを有限の厳密値（sign, C, e）に適用する。{dec, signals} を返す */
function applyCtx(sign, C, e, cx, sticky = false, modeOv = null) {
  const mode = modeOv || cx.rounding;
  const Etiny = cx.Emin - cx.prec + 1, Etop = cx.Emax - cx.prec + 1;
  const sigs = [];
  const push = (n) => { if (!sigs.some(([x]) => x === n)) sigs.push([n]); };
  if (C !== '0' && e + C.length - 1 < cx.Emin) push('Subnormal');
  let r = roundTo(C, e, cx.prec, mode, sign, sticky);
  C = r.C; e = r.e;
  if (r.rounded) push('Rounded');
  if (r.inexact) push('Inexact');
  let inexact = r.inexact;
  if (C === '0') {
    let ee = e;
    if (ee < Etiny) { ee = Etiny; push('Clamped'); if (inexact) push('Underflow'); }
    if (cx.clamp === 1 && ee > Etop) { ee = Etop; push('Clamped'); }
    return { dec: mkFin(sign, '0', ee), signals: sigs };
  }
  if (e < Etiny) {
    const r2 = roundDrop(C, Etiny - e, mode, sign, inexact);
    C = r2.C; e = Etiny;
    if (r2.rounded) push('Rounded');
    if (r2.inexact) { push('Inexact'); inexact = true; }
    if (C === '0') {
      if (inexact) push('Underflow');
      push('Clamped');
      return { dec: mkFin(sign, '0', Etiny), signals: sigs };
    }
  }
  const adj = e + C.length - 1;
  if (adj > cx.Emax) {
    push('Overflow'); push('Inexact'); push('Rounded');
    const toInf = mode === 'ROUND_UP' || mode === 'ROUND_HALF_UP' || mode === 'ROUND_HALF_DOWN' || mode === 'ROUND_HALF_EVEN' || mode === 'ROUND_05UP'
      || (mode === 'ROUND_CEILING' && sign === 0) || (mode === 'ROUND_FLOOR' && sign === 1);
    if (toInf) return { dec: mkInf(sign), signals: sigs };
    return { dec: mkFin(sign, '9'.repeat(cx.prec), Etop), signals: sigs };
  }
  if (cx.clamp === 1 && e > Etop) {
    const pad = Math.min(cx.prec - C.length, e - Etop);
    if (pad > 0) { C = C + '0'.repeat(pad); e -= pad; push('Clamped'); }
  }
  return { dec: mkFin(sign, C, e), signals: sigs };
}
function finish(ctx, cx, res) { sigAll(ctx, cx, res.signals); return res.dec; }

/* 任意精度の有理数 num/den × 10^exp10 をコンテキストへ丸める */
function rationalToDec(ctx, sign, num, den, exp10, cx) {
  const nd = num.toString().length, dd = den.toString().length;
  let t = dd - nd + cx.prec + 2;
  let scaled, rem;
  if (t >= 0) { const n2 = num * pow10(t); scaled = n2 / den; rem = n2 % den; }
  else { const d2 = den * pow10(-t); scaled = num / d2; rem = num % d2; }
  let C = scaled.toString();
  let e = exp10 - t;
  if (rem === 0n) { // 厳密な商：末尾ゼロは丸めではないので落とす
    while (C.length > 1 && C.endsWith('0')) { C = C.slice(0, -1); e += 1; }
    return finish(ctx, cx, applyCtx(sign, C, e, cx, false));
  }
  return finish(ctx, cx, applyCtx(sign, C, e, cx, true));
}

/* ============ オペランド変換 ============ */
const isDecNative = (v) => !!v && v.__native === 'decimal.Decimal';
const isCtxNative = (v) => !!v && v.__native === 'decimal.Context';
function decDataOf(v) { return v.data; }
/* メソッド引数としての変換（int／bool／Decimal のみ。float・str は TypeError） */
function toDecMethod(ctx, v) {
  if (isDecNative(v)) return decDataOf(v);
  if (ctx.isBool(v)) return mkFin(0, v.v ? '1' : '0', 0);
  if (ctx.isNum(v) && !v.f) {
    if (!Number.isSafeInteger(v.v)) return null;
    return decFromIntNum(v.v);
  }
  if (ctx.isNum(v) && v.f) ctx.err('TypeError', 'conversion from float to Decimal is not supported', '');
  if (typeof v === 'string') ctx.err('TypeError', 'conversion from str to Decimal is not supported', '');
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', 'conversion from ' + ctx.typeName(v) + ' to Decimal is not supported', '');
  return null;
}
/* 比較（演算子）用の変換：float は正確変換してよい */
function toDecCompare(ctx, v) {
  if (isDecNative(v)) return { d: decDataOf(v), isFloat: false };
  if (ctx.isBool(v)) return { d: mkFin(0, v.v ? '1' : '0', 0), isFloat: false };
  if (ctx.isNum(v) && !v.f) { if (!Number.isSafeInteger(v.v)) return null; return { d: decFromIntNum(v.v), isFloat: false }; }
  if (ctx.isNum(v) && v.f) return { d: decFromDouble(v.v), isFloat: true };
  return null;
}
/* 整数として解釈（scaleb／shift／rotate 用）。{n: BigInt} か null（非整数・変換不可） */
function toIntExact(ctx, v) {
  const d = toDecMethod(ctx, v);
  if (d === null) return null;
  if (d.k !== 'f') return null;
  if (d.d === '0') return 0n;
  if (d.e >= 0) return BigInt(d.d) * pow10(d.e) * (d.s ? -1n : 1n);
  const div = pow10(-d.e);
  const C = BigInt(d.d);
  if (C % div !== 0n) return null;
  return (C / div) * (d.s ? -1n : 1n);
}
function resolveCx(ctx, kwargs) {
  const c = kwargs ? kwargs.context : undefined;
  if (c === undefined || (c && ctx.isNone(c))) return curData();
  if (isCtxNative(c)) return c.data;
  ctx.err('TypeError', 'context must be a Context', '');
  return null;
}

/* ============ NaN 伝播 ============ */
/* sNaN があればシグナルしてその NaN を、qNaN があればそれを返す。どちらも無ければ null */
function nanProp(ctx, cx, list) {
  for (const d of list) if (d.k === 's') { sig(ctx, cx, 'InvalidOperation'); return mkNan(d.s, d.d, false); }
  for (const d of list) if (d.k === 'n') return mkNan(d.s, d.d, false);
  return null;
}

/* ============ 四則演算（cx は使用コンテキストのデータ） ============ */
function opAdd(ctx, cx, a, b) {
  const nan = nanProp(ctx, cx, [a, b]); if (nan) return nan;
  if (a.k === 'i' || b.k === 'i') {
    if (a.k === 'i' && b.k === 'i' && a.s !== b.s) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
    return a.k === 'i' ? mkInf(a.s) : mkInf(b.s);
  }
  const emin = Math.min(a.e, b.e);
  const A = BigInt(a.d) * pow10(a.e - emin) * (a.s ? -1n : 1n);
  const B = BigInt(b.d) * pow10(b.e - emin) * (b.s ? -1n : 1n);
  const S = A + B;
  if (S === 0n) {
    const sign = (a.s === 1 && b.s === 1) ? 1 : 0;
    return finish(ctx, cx, applyCtx(sign, '0', emin, cx));
  }
  const sign = S < 0n ? 1 : 0;
  return finish(ctx, cx, applyCtx(sign, (S < 0n ? -S : S).toString(), emin, cx));
}
function opSub(ctx, cx, a, b) { const b2 = cloneDec(b); b2.s = b.s ? 0 : 1; return opAdd(ctx, cx, a, b2); }
function opMul(ctx, cx, a, b) {
  const nan = nanProp(ctx, cx, [a, b]); if (nan) return nan;
  const sign = a.s ^ b.s;
  if (a.k === 'i' || b.k === 'i') {
    const other = a.k === 'i' ? b : a;
    if (isZeroD(other)) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
    return mkInf(sign);
  }
  const C = (BigInt(a.d) * BigInt(b.d)).toString();
  return finish(ctx, cx, applyCtx(sign, C, a.e + b.e, cx));
}
function opDiv(ctx, cx, a, b) {
  const nan = nanProp(ctx, cx, [a, b]); if (nan) return nan;
  const sign = a.s ^ b.s;
  if (a.k === 'i' && b.k === 'i') { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  if (a.k === 'i') return mkInf(sign);
  if (b.k === 'i') { const Etiny = cx.Emin - cx.prec + 1; return mkFin(sign, '0', Etiny); }
  if (isZeroD(b)) {
    if (isZeroD(a)) { sig(ctx, cx, 'InvalidOperation', 'decimal.DivisionUndefined', sigMsg('DivisionUndefined')); return mkNan(0, '', false); }
    sig(ctx, cx, 'DivisionByZero');
    return mkInf(sign);
  }
  if (isZeroD(a)) return mkFin(sign, '0', a.e - b.e);
  return rationalToDec(ctx, sign, BigInt(a.d), BigInt(b.d), a.e - b.e, cx);
}
/* 整数除算の商（BigInt、0方向への切り捨て）と剰余の共通計算 */
function divmodExact(a, b) {
  // a, b は有限非ゼロ。|a|/|b| の商（切り捨て）を返す {q: BigInt(>=0), emin}
  const emin = Math.min(a.e, b.e);
  const A = BigInt(a.d) * pow10(a.e - emin);
  const B = BigInt(b.d) * pow10(b.e - emin);
  return { q: A / B, A, B, emin };
}
function opDivideInt(ctx, cx, a, b) {
  const nan = nanProp(ctx, cx, [a, b]); if (nan) return nan;
  const sign = a.s ^ b.s;
  if (a.k === 'i' || b.k === 'i') {
    if (b.k === 'i' && a.k !== 'i') return mkFin(sign, '0', 0);
    sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false);
  }
  if (isZeroD(b)) {
    if (isZeroD(a)) { sig(ctx, cx, 'InvalidOperation', 'decimal.DivisionUndefined', sigMsg('DivisionUndefined')); return mkNan(0, '', false); }
    sig(ctx, cx, 'DivisionByZero');
    return mkInf(sign);
  }
  if (isZeroD(a)) return mkFin(sign, '0', 0);
  const { q } = divmodExact(a, b);
  const qs = q.toString();
  if (qs.length > cx.prec) { sig(ctx, cx, 'InvalidOperation', 'decimal.DivisionImpossible', sigMsg('DivisionImpossible')); return mkNan(0, '', false); }
  return mkFin(sign, qs, 0);
}
function opRemainder(ctx, cx, a, b, near) {
  const nan = nanProp(ctx, cx, [a, b]); if (nan) return nan;
  if (a.k === 'i' || b.k === 'i' || isZeroD(b)) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  if (isZeroD(a)) return mkFin(a.s, '0', Math.min(a.e, b.e));
  const { q, A, B, emin } = divmodExact(a, b);
  let qq = q;
  if (near) {
    const rem = A - q * B;
    const twice = rem * 2n;
    if (twice > B || (twice === B && (q & 1n) === 1n)) qq = q + 1n;
  }
  if (qq.toString().length > cx.prec) { sig(ctx, cx, 'InvalidOperation', 'decimal.DivisionImpossible', sigMsg('DivisionImpossible')); return mkNan(0, '', false); }
  const R = A - qq * B; // near のときは負になりうる
  if (R === 0n) return mkFin(a.s, '0', emin);
  // remainder の符号は被除数。remainder_near は実値 a - q*b の符号（= a の符号 XOR R の負符号）
  const rSign = near ? ((R < 0n) !== (a.s === 1) ? 1 : 0) : a.s;
  // 結果にはコンテキスト（精度）が適用される（CPython 実走グリッドで確認）
  return finish(ctx, cx, applyCtx(rSign, (R < 0n ? -R : R).toString(), emin, cx));
}
function opFma(ctx, cx, a, b, c) {
  for (const d of [a, b, c]) if (d.k === 's') { sig(ctx, cx, 'InvalidOperation'); return mkNan(d.s, d.d, false); }
  const prodInf = (a.k === 'i' || b.k === 'i') && !((a.k === 'i' && isZeroD(b)) || (b.k === 'i' && isZeroD(a)));
  if ((a.k === 'i' && isZeroD(b)) || (b.k === 'i' && isZeroD(a))) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  const nan = nanProp(ctx, cx, [a, b, c]); if (nan) return nan;
  const psign = a.s ^ b.s;
  if (prodInf || a.k === 'i' || b.k === 'i') {
    if (c.k === 'i' && c.s !== psign) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
    return mkInf(psign);
  }
  if (c.k === 'i') return mkInf(c.s);
  const pe = a.e + b.e;
  const emin = Math.min(pe, c.e);
  const P = BigInt(a.d) * BigInt(b.d) * pow10(pe - emin) * (psign ? -1n : 1n);
  const C = BigInt(c.d) * pow10(c.e - emin) * (c.s ? -1n : 1n);
  const S = P + C;
  if (S === 0n) return finish(ctx, cx, applyCtx((psign === 1 && c.s === 1) ? 1 : 0, '0', emin, cx));
  return finish(ctx, cx, applyCtx(S < 0n ? 1 : 0, (S < 0n ? -S : S).toString(), emin, cx));
}

/* ============ 固定小数点（exp／ln／log10／非整数冪） ============ */
const LN2_STR = '69314718055994530941723212145817656807550013436025525412068000949339362196969471560586332699641868754200148102057';
const LN10_STR = '2302585092994045684017991454684364207601101488628772976033327900967572609677352480235997205089598298341967784042286248633409525465';
function lnConstAt(scale) { // ln(10) = 2.<frac>
  const frac = LN10_STR.slice(1);
  return BigInt('2' + frac.padEnd(scale, '0').slice(0, scale));
}
function ln2ConstAt(scale) { const frac = LN2_STR; return BigInt('0' + frac.padEnd(scale, '0').slice(0, scale)); }
function fpIsqrt(v, scale) { return bigIsqrt(v * pow10(scale)); } // sqrt(v/10^scale) を scale 桁固定で
/* m（[1,10) の固定小数点 BigInt、scale 桁）の自然対数 × 10^scale */
function fpLnMantissa(M, scale) {
  let z = M;
  const SQ = 8; // sqrt を 8 回 → 引数は 1 に近づく
  for (let i = 0; i < SQ; i++) z = fpIsqrt(z, scale);
  // ln(z) = 2*atanh((z-1)/(z+1))、z-1 は小さい
  const one = pow10(scale);
  const num = (z - one) * one, den = z + one;
  let t = num / den; // 固定小数点の (z-1)/(z+1)
  const t2 = (t * t) / one;
  let term = t, sum = t;
  for (let n = 1; n < 400; n++) {
    term = (term * t2) / one;
    const add = term / BigInt(2 * n + 1);
    if (add === 0n) break;
    sum += add;
  }
  return sum * 2n * BigInt(2 ** SQ);
}
/* dec データ（有限正）の自然対数 × 10^scale（符号つき BigInt） */
function fpLn(d, scale) {
  const dc = d.d.length;
  const adj = d.e + dc - 1;
  let M; // [1,10) に正規化した仮数 × 10^scale
  if (dc - 1 <= scale) M = BigInt(d.d) * pow10(scale - (dc - 1));
  else M = BigInt(d.d.slice(0, scale + 1));
  const lnM = fpLnMantissa(M, scale);
  const ln10 = lnConstAt(scale);
  return lnM + BigInt(adj) * ln10;
}
/* y（固定小数点、scale 桁。符号つき）の exp を {C, e}（10進係数・指数）で返す */
function fpExpToDec(y, scale) {
  const one = pow10(scale);
  const ln2 = ln2ConstAt(scale);
  let k = 0;
  let r = y;
  if (y !== 0n) {
    k = Number((y * one) / ln2 / one); // 近似でよい（r は厳密に再計算して調整する）
    // k を厳密化：r = y - k*ln2 が [-ln2/2, ln2/2] に入るよう調整
    // （ln2 は scale 桁固定小数点なので k*ln2 も scale 桁固定のまま）
    for (;;) {
      r = y - BigInt(k) * ln2;
      if (r > ln2 / 2n) { k += 1; continue; }
      if (r < -(ln2 / 2n)) { k -= 1; continue; }
      break;
    }
  }
  // e^r の級数（r は scale 桁固定、|r| <= 0.35）
  let term = one, sum = one;
  for (let n = 1; n < 300; n++) {
    term = (term * r) / (one * BigInt(n));
    if (term === 0n) break;
    sum += term;
  }
  if (k >= 0) return { C: (sum * (2n ** BigInt(k))).toString(), e: -scale, sticky: false };
  // k<0：2^|k| で割ると有効桁が落ちるため、余分な10進桁を確保してから割る
  const div = 2n ** BigInt(-k);
  const extra = Math.ceil(-k * 0.30103) + 2;
  const num = sum * pow10(extra);
  return { C: (num / div).toString(), e: -scale - extra, sticky: (num % div) !== 0n };
}
function decToFp(d, scale) { // 有限 dec を scale 桁固定小数点（符号つき BigInt）へ。桁落ちは切り捨て
  const dc = d.d.length;
  const shift = d.e + scale;
  let v;
  if (shift >= 0) v = BigInt(d.d) * pow10(shift);
  else v = BigInt(d.d) / pow10(-shift);
  return d.s ? -v : v;
}

/* ============ sqrt／exp／ln／log10／power ============ */
function opSqrt(ctx, cx, a) {
  const nan = nanProp(ctx, cx, [a]); if (nan) return nan;
  if (a.k === 'i') { if (a.s) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); } return mkInf(0); }
  if (a.s && !isZeroD(a)) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  if (isZeroD(a)) return mkFin(a.s, '0', Math.ceil(a.e / 2));
  let C = a.d, e = a.e;
  if (e % 2 !== 0) { C = C + '0'; e -= 1; }
  const dc = C.length;
  const g = cx.prec + 6 - Math.ceil(dc / 2); // ガード桁（負なら係数を落としてから根を取る）
  let S, sticky;
  if (g >= 0) {
    const N = BigInt(C) * pow10(2 * g);
    S = bigIsqrt(N);
    sticky = (N - S * S) !== 0n;
  } else {
    const C1 = BigInt(C) / pow10(-2 * g);
    S = bigIsqrt(C1);
    sticky = (S * S * pow10(-2 * g)) !== BigInt(C);
  }
  let SC = S.toString(), Se = e / 2 - g;
  if (!sticky) { while (SC.length > 1 && SC.endsWith('0')) { SC = SC.slice(0, -1); Se += 1; } } // 完全平方は短い係数で返す
  return finish(ctx, cx, applyCtx(0, SC, Se, cx, sticky, 'ROUND_HALF_EVEN'));
}
function approxVal(d) { // 概算の JS 数値（範囲判定専用）
  if (d.k !== 'f') return d.k === 'i' ? (d.s ? -Infinity : Infinity) : NaN;
  const head = Number(d.d.slice(0, 15));
  const adj = d.e + d.d.length - 1;
  const v = head * Math.pow(10, adj - (Math.min(d.d.length, 15) - 1));
  return d.s ? -v : v;
}
function opExp(ctx, cx, a) {
  const nan = nanProp(ctx, cx, [a]); if (nan) return nan;
  if (a.k === 'i') return a.s ? mkFin(0, '0', 0) : mkInf(0);
  if (isZeroD(a)) return mkFin(0, '1', 0);
  const scale = cx.prec + 40;
  const av = approxVal(a);
  const ln10v = 2.302585092994046;
  if (av > (cx.Emax + 2) * ln10v) return finish(ctx, cx, applyCtx(0, '1', cx.Emax + 1, cx));
  if (av < (cx.Emin - cx.prec - 2) * ln10v) return finish(ctx, cx, applyCtx(0, '1', cx.Emin - cx.prec - 1, cx, true));
  if (Math.abs(av) > 3000000) { ctx.diag('exp の引数が非常に大きいため、この説明では正確に計算しません'); return ctx.unk('exp の結果'); }
  const y = decToFp(a, scale);
  if (y === 0n) { // |x| がガード桁より小さい非ゼロ：結果は精度桁まで 1.000...0
    sigAll(ctx, cx, [['Inexact'], ['Rounded']]);
    return mkFin(0, '1' + '0'.repeat(cx.prec - 1), -(cx.prec - 1));
  }
  const { C, e, sticky } = fpExpToDec(y, scale);
  return finish(ctx, cx, applyCtx(0, C, e, cx, sticky, 'ROUND_HALF_EVEN'));
}
function opLn(ctx, cx, a) {
  const nan = nanProp(ctx, cx, [a]); if (nan) return nan;
  if (a.k === 'i') { if (a.s) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); } return mkInf(0); }
  if (isZeroD(a)) return mkInf(1); // CPython 実走：ln(0) はシグナルなしで -Infinity
  if (a.s) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  if (a.d === '1' && a.e === 0) return mkFin(0, '0', 0);
  const scale = cx.prec + 40;
  const v = fpLn(a, scale);
  const sign = v < 0n ? 1 : 0;
  return finish(ctx, cx, applyCtx(sign, (v < 0n ? -v : v).toString(), -scale, cx, true, 'ROUND_HALF_EVEN'));
}
function opLog10(ctx, cx, a) {
  const nan = nanProp(ctx, cx, [a]); if (nan) return nan;
  if (a.k === 'i') { if (a.s) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); } return mkInf(0); }
  if (isZeroD(a)) return mkInf(1);
  if (a.s) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  if (a.d.replace(/0+$/, '') === '1') { const adj = adjOf(a); return mkFin(adj < 0 ? 1 : 0, String(Math.abs(adj)), 0); } // 10 の冪は厳密
  const scale = cx.prec + 52;
  const lnV = fpLn(a, scale);
  const ln10 = lnConstAt(scale);
  const q = (lnV * pow10(scale)) / ln10; // q は (ln/ln10) × 10^scale 相当
  const sign = q < 0n ? 1 : 0;
  return finish(ctx, cx, applyCtx(sign, (q < 0n ? -q : q).toString(), -scale, cx, true, 'ROUND_HALF_EVEN'));
}
function opLogb(ctx, cx, a) {
  const nan = nanProp(ctx, cx, [a]); if (nan) return nan;
  if (a.k === 'i') return mkInf(0);
  if (isZeroD(a)) { sig(ctx, cx, 'DivisionByZero'); return mkInf(1); }
  const adj = adjOf(a);
  // 結果にもコンテキストが適用される（prec=1 で logb の 27 が 3E+1 になる。CPython 実走）
  return finish(ctx, cx, applyCtx(adj < 0 ? 1 : 0, String(Math.abs(adj)), 0, cx));
}
function isIntegralDec(d) {
  if (d.k !== 'f') return false;
  if (d.d === '0') return true;
  if (d.e >= 0) return true;
  return BigInt(d.d) % pow10(-d.e) === 0n;
}
function integralBig(d) { // 整数値の Decimal → BigInt（呼び出し前に isIntegralDec を確認）
  if (d.d === '0') return 0n;
  let v;
  if (d.e >= 0) v = BigInt(d.d) * pow10(d.e);
  else v = BigInt(d.d) / pow10(-d.e);
  return d.s ? -v : v;
}
function opPower(ctx, cx, a, b, modulo) {
  if (modulo !== undefined && modulo !== null) return opPowerMod(ctx, cx, a, b, modulo);
  for (const d of [a, b]) if (d.k === 's') { sig(ctx, cx, 'InvalidOperation'); return mkNan(d.s, d.d, false); }
  for (const d of [a, b]) if (d.k === 'n') return mkNan(d.s, d.d, false);
  // b が有限ゼロ
  if (b.k === 'f' && isZeroD(b)) {
    if (a.k === 'f' && isZeroD(a)) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
    return mkFin(0, '1', 0);
  }
  if (b.k === 'i') {
    const aAbs1 = a.k === 'f' && !isZeroD(a) && ((a.d === '1' && a.e === 0));
    if (aAbs1 || (a.k === 'f' && a.d === '1' && a.e === 0)) {
      return mkFin(0, '1' + '0'.repeat(cx.prec - 1), -(cx.prec - 1));
    }
    if (a.k === 'f' && a.d === '1' && a.e === 0) return mkFin(0, '1', 0);
    const gt1 = a.k === 'i' || (a.k === 'f' && !isZeroD(a) && cmpAbsVal(a, mkFin(0, '1', 0)) > 0);
    const lt1 = a.k === 'f' && !isZeroD(a) && cmpAbsVal(a, mkFin(0, '1', 0)) < 0;
    if (a.k === 'f' && isZeroD(a)) return b.s ? mkInf(0) : mkFin(0, '0', 0);
    if (a.k === 'i') return b.s ? mkFin(0, '0', 0) : mkInf(0);
    if (gt1) return b.s ? mkFin(0, '0', 0) : mkInf(0);
    if (lt1) return b.s ? mkInf(0) : mkFin(0, '0', 0);
    return mkFin(0, '1' + '0'.repeat(cx.prec - 1), -(cx.prec - 1)); // |a| == 1（a = -1）
  }
  if (a.k === 'i') {
    if (b.s) {
      const odd = isIntegralDec(b) && (integralBig(b) & 1n) === 1n;
      return mkFin(a.s && odd ? 1 : 0, '0', 0);
    }
    return mkInf(a.s && isIntegralDec(b) && (integralBig(b) & 1n) === 1n ? 1 : 0);
  }
  if (isZeroD(a)) {
    if (!b.s) {
      const odd = isIntegralDec(b) && (integralBig(b) & 1n) === 1n;
      return mkFin(a.s && odd ? 1 : 0, '0', 0);
    }
    const odd = isIntegralDec(b) && (integralBig(b) & 1n) === 1n;
    return mkInf(a.s && odd ? 1 : 0); // CPython 実走：シグナルなしで Infinity
  }
  if (a.s && !isIntegralDec(b)) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  const sign = (a.s && isIntegralDec(b) && (integralBig(b) & 1n) === 1n) ? 1 : 0;
  const ax = a.s ? mkFin(0, a.d, a.e) : a;
  if (isIntegralDec(b)) {
    const y = integralBig(b);
    const ay = y < 0n ? -y : y;
    if (ay > 100000n) { // 巨大な整数冪は範囲だけを確定させる
      const gt1 = cmpAbsVal(ax, mkFin(0, '1', 0)) > 0;
      const lt1 = cmpAbsVal(ax, mkFin(0, '1', 0)) < 0;
      if (!gt1 && !lt1) return mkFin(sign, '1', 0);
      const over = (gt1 && y > 0n) || (lt1 && y < 0n);
      if (over) return finish(ctx, cx, applyCtx(sign, '1', cx.Emax + 1, cx));
      return finish(ctx, cx, applyCtx(sign, '1', cx.Emin - cx.prec - 1, cx, true));
    }
    const estDigits = ax.d.length * Number(ay);
    if (y > 0n && estDigits <= 30000) {
      const C = (BigInt(ax.d) ** ay).toString();
      return finish(ctx, cx, applyCtx(sign, C, ax.e * Number(y), cx));
    }
    if (y < 0n && estDigits <= 30000) {
      const den = BigInt(ax.d) ** ay;
      const r = rationalToDec(ctx, sign, 1n, den, ax.e * Number(y), cx);
      return r;
    }
    // 桁数見積もり超過時は近似経路へ
  }
  // 非整数冪（または巨大な整数冪）：exp(b * ln(a)) を高精度で計算する
  if (cmpAbsVal(ax, mkFin(0, '1', 0)) === 0) return mkFin(sign, '1' + '0'.repeat(cx.prec - 1), -(cx.prec - 1));
  const scale = cx.prec + 40;
  const yv = approxVal(b);
  if (Math.abs(yv) > 1e6) {
    const gt1 = cmpAbsVal(ax, mkFin(0, '1', 0)) > 0;
    const over = (gt1 && yv > 0) || (!gt1 && yv < 0);
    if (over) return finish(ctx, cx, applyCtx(sign, '1', cx.Emax + 1, cx));
    return finish(ctx, cx, applyCtx(sign, '1', cx.Emin - cx.prec - 1, cx, true));
  }
  const lnA = fpLn(ax, scale);
  const yFp = decToFp(b, scale);
  const t = (yFp * lnA) / pow10(scale);
  if (t === 0n) return mkFin(sign, '1' + '0'.repeat(cx.prec - 1), -(cx.prec - 1));
  const tApprox = Number(t) / Math.pow(10, scale);
  if (tApprox > (cx.Emax + 2) * 2.302585092994046) return finish(ctx, cx, applyCtx(sign, '1', cx.Emax + 1, cx));
  if (tApprox < (cx.Emin - cx.prec - 2) * 2.302585092994046) return finish(ctx, cx, applyCtx(sign, '1', cx.Emin - cx.prec - 1, cx, true));
  const { C, e, sticky } = fpExpToDec(t, scale);
  const res = applyCtx(sign, C, e, cx, sticky);
  return finish(ctx, cx, res);
}
function opPowerMod(ctx, cx, a, b, m) {
  const bad = () => { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); };
  if (a.k !== 'f' || b.k !== 'f' || m.k !== 'f') return bad();
  if (!isIntegralDec(a) || !isIntegralDec(b) || !isIntegralDec(m)) return bad();
  const x = integralBig(a), y = integralBig(b), mod = integralBig(m);
  if (y < 0n || mod === 0n || (x === 0n && y === 0n)) return bad();
  const am = mod < 0n ? -mod : mod;
  if (am.toString().length > cx.prec) return bad(); // |modulo| が prec 桁を超える場合は InvalidOperation
  // |x**y| mod |modulo| を求め、Decimal 剰余の符号規則（被除数 x**y の符号）に合わせる
  const ax = x < 0n ? -x : x;
  let result;
  if (y <= 2000n) {
    const p = ax ** y;
    result = p % am;
  } else {
    let base = ax % am;
    result = 1n % am;
    let e2 = y;
    while (e2 > 0n) { if (e2 & 1n) result = (result * base) % am; base = (base * base) % am; e2 >>= 1n; }
  }
  const neg = x < 0n && (y & 1n) === 1n;
  const r = (result !== 0n && neg) ? -result : result;
  if (r === 0n) return mkFin(0, '0', 0);
  return mkFin(r < 0n ? 1 : 0, (r < 0n ? -r : r).toString(), 0);
}
/* 絶対値の比較（有限同士）：-1/0/1 */
function cmpAbsVal(a, b) {
  const az = isZeroD(a), bz = isZeroD(b);
  if (az && bz) return 0;
  if (az) return -1;
  if (bz) return 1;
  const aa = adjOf(a), ab = adjOf(b);
  if (aa !== ab) return aa < ab ? -1 : 1;
  const len = Math.max(a.d.length, b.d.length);
  const da = a.d.padEnd(len, '0'), db = b.d.padEnd(len, '0');
  return da < db ? -1 : da > db ? 1 : 0;
}
/* 数値比較（有限・無限。NaN は呼び出し側で処理）：-1/0/1 */
function cmpNum(a, b) {
  if (a.k === 'i' || b.k === 'i') {
    if (a.k === 'i' && b.k === 'i') return a.s === b.s ? 0 : a.s ? -1 : 1;
    if (a.k === 'i') return a.s ? -1 : 1;
    return b.s ? 1 : -1;
  }
  if (isZeroD(a) && isZeroD(b)) return 0;
  if (a.s !== b.s) return a.s ? -1 : 1;
  const c = cmpAbsVal(a, b);
  return a.s ? -c : c;
}

/* ============ quantize／整数化／normalize／scaleb／shift／rotate／論理演算 ============ */
function opQuantize(ctx, cx, a, y, roundingOv) {
  for (const d of [a]) if (d.k === 's') { sig(ctx, cx, 'InvalidOperation'); return mkNan(d.s, d.d, false); }
  if (a.k === 'n') return mkNan(a.s, a.d, false);
  if (y.k === 'n' || y.k === 's') return mkNan(0, '', false);
  if (a.k === 'i' || y.k === 'i') { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  const mode = roundingOv || cx.rounding;
  const te = y.e;
  const Etiny = cx.Emin - cx.prec + 1, Etop = cx.Emax - cx.prec + 1;
  if (te > Etop || te < Etiny) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  if (isZeroD(a)) return mkFin(a.s, '0', te);
  let C = a.d, e = a.e;
  const sigs = [];
  if (e > te) { C = C + '0'.repeat(e - te); e = te; }
  else if (e < te) {
    const r = roundDrop(C, te - e, mode, a.s, false);
    C = r.C; e = te;
    if (r.rounded) sigs.push(['Rounded']);
    if (r.inexact) sigs.push(['Inexact']);
  }
  if (C.length > cx.prec) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  sigAll(ctx, cx, sigs);
  return mkFin(a.s, C, e);
}
function opToIntegral(ctx, cx, a, roundingOv, exact) {
  const nan = nanProp(ctx, cx, [a]); if (nan) return nan;
  if (a.k === 'i') return mkInf(a.s);
  if (a.e >= 0) return cloneDec(a);
  const mode = roundingOv || cx.rounding;
  const r = roundDrop(a.d, -a.e, mode, a.s, false);
  if (exact) { const sigs = []; if (r.rounded) sigs.push(['Rounded']); if (r.inexact) sigs.push(['Inexact']); sigAll(ctx, cx, sigs); }
  return mkFin(a.s, r.C, 0);
}
function opNormalize(ctx, cx, a) {
  const nan = nanProp(ctx, cx, [a]); if (nan) return nan;
  if (a.k === 'i') return mkInf(a.s);
  if (isZeroD(a)) return finish(ctx, cx, applyCtx(a.s, '0', 0, cx));
  // CPython 実走：先にコンテキストを適用（丸め）し、その後で末尾ゼロを取り除く
  const r = finish(ctx, cx, applyCtx(a.s, a.d, a.e, cx));
  if (r.k !== 'f' || isZeroD(r)) return r;
  let C = r.d, e = r.e;
  while (C.length > 1 && C.endsWith('0')) { C = C.slice(0, -1); e += 1; }
  return mkFin(r.s, C, e);
}
function opScaleb(ctx, cx, a, yDec) {
  const nan = nanProp(ctx, cx, [a, yDec]); if (nan) return nan;
  if (a.k === 'i') return mkInf(a.s);
  const y = integralBig(yDec);
  const ne = a.e + Number(y);
  if (!Number.isSafeInteger(ne)) {
    if (isZeroD(a)) return cloneDec(a);
    if ((y > 0n) === (a.d !== '0')) return finish(ctx, cx, applyCtx(a.s, a.d, y > 0n ? cx.Emax + 1 : cx.Emin - cx.prec - 1, cx, true));
    return cloneDec(a);
  }
  return finish(ctx, cx, applyCtx(a.s, a.d, ne, cx));
}
function checkLogical(ctx, cx, d) {
  if (d.k !== 'f' || d.s !== 0 || d.e !== 0 || /[^01]/.test(d.d)) { sig(ctx, cx, 'InvalidOperation'); return false; }
  return true;
}
function opLogical(ctx, cx, a, b, kind) {
  const nan = nanProp(ctx, cx, b ? [a, b] : [a]); if (nan) return nan;
  if (a.k !== 'f' || (b && b.k !== 'f')) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  if (!checkLogical(ctx, cx, a)) return mkNan(0, '', false);
  if (b && !checkLogical(ctx, cx, b)) return mkNan(0, '', false);
  if (kind === 'invert') {
    const w = a.d.padStart(cx.prec, '0');
    const out = w.split('').map((ch) => (ch === '0' ? '1' : '0')).join('');
    return mkFin(0, stripLeadingZeros(out), 0);
  }
  const w = Math.max(a.d.length, b.d.length);
  const A = a.d.padStart(w, '0'), B = b.d.padStart(w, '0');
  let out = '';
  for (let i = 0; i < w; i++) {
    const x = A[i] === '1', y = B[i] === '1';
    const r = kind === 'and' ? (x && y) : kind === 'or' ? (x || y) : (x !== y);
    out += r ? '1' : '0';
  }
  return mkFin(0, stripLeadingZeros(out), 0);
}
function opShiftRotate(ctx, cx, a, yDec, rotate) {
  const nan = nanProp(ctx, cx, [a]); if (nan) return nan;
  if (a.k !== 'f') { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  const y = integralBig(yDec);
  if (y > BigInt(cx.prec) || y < BigInt(-cx.prec)) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  const n = Number(y);
  if (rotate) {
    // CPython 実走・ドキュメント：正の y は左回転（prec=5 で '12345' を 1 → '23451'）
    const w = a.d.padStart(cx.prec, '0');
    const k = ((n % cx.prec) + cx.prec) % cx.prec;
    const out = w.slice(k) + w.slice(0, k);
    return mkFin(a.s, stripLeadingZeros(out), a.e);
  }
  let C = a.d;
  if (n > 0) { C = C + '0'.repeat(n); if (C.length > cx.prec) C = C.slice(C.length - cx.prec); }
  else if (n < 0) { C = C.length + n <= 0 ? '0' : C.slice(0, C.length + n); }
  return mkFin(a.s, stripLeadingZeros(C), a.e);
}

/* ============ next_plus／next_minus／next_toward ============ */
function maxFinite(cx) { return mkFin(0, '9'.repeat(cx.prec), cx.Emax - cx.prec + 1); }
function stepMag(C, e, cx, dir) { // dir=+1: 大きさを1量子増やす / -1: 減らす。(C,e) は有限非ゼロ
  const Etiny = cx.Emin - cx.prec + 1;
  if (e < Etiny) {
    // Etiny グリッド上で切り上げ／切り捨て
    const shift = Etiny - e;
    const Cb = BigInt(C);
    const unit = pow10(shift);
    let q = Cb / unit;
    if (dir > 0) { q = q + 1n; return { C: q.toString(), e: Etiny }; }
    if (Cb % unit === 0n) q = q - 1n; // グリッド上にちょうどある場合は1量子下へ
    if (q <= 0n) return { C: '0', e: Etiny };
    return { C: q.toString(), e: Etiny };
  }
  // prec 桁グリッド（係数ちょうど prec 桁・指数 q）での ±1。借り・桁上がりを処理する
  const stepGrid = (Cc, q, d2) => {
    if (d2 > 0) {
      if (Cc === '9'.repeat(cx.prec)) return { C: '1' + '0'.repeat(cx.prec - 1), e: q + 1 };
      return { C: (BigInt(Cc) + 1n).toString(), e: q };
    }
    if (Cc === '1' + '0'.repeat(cx.prec - 1)) {
      if (q > Etiny) return { C: '9'.repeat(cx.prec), e: q - 1 }; // 例：prec=3 で 1.00 の前は 0.999
      return { C: (BigInt(Cc) - 1n).toString(), e: q }; // Etiny グリッド上ではそのまま -1
    }
    const v = BigInt(Cc) - 1n;
    if (v <= 0n) return { C: '0', e: q };
    return { C: v.toString(), e: q };
  };
  if (C.length > cx.prec) {
    const dropped = C.slice(cx.prec);
    const q = e + (C.length - cx.prec);
    const Cc = C.slice(0, cx.prec);
    if (/[1-9]/.test(dropped)) {
      if (dir < 0) return { C: Cc, e: q }; // 切り捨てた値が直下の表現可能数
      return stepGrid(Cc, q, +1);
    }
    return stepGrid(Cc, q, dir); // 落とした桁が全て 0 ＝グリッド上
  }
  if (C.length < cx.prec) {
    const pad = cx.prec - C.length;
    if (e - pad >= Etiny) return stepGrid(C.padEnd(cx.prec, '0'), e - pad, dir);
    // Etiny グリッド（量子は Etiny でクランプ）
    const v = BigInt(C) * pow10(e - Etiny) + BigInt(dir);
    if (v <= 0n) return { C: '0', e: Etiny };
    return { C: v.toString(), e: Etiny };
  }
  return stepGrid(C, e, dir);
}
function nextPlusDec(cx, a) {
  if (a.k === 'i') return a.s ? (() => { const m = maxFinite(cx); return mkFin(1, m.d, m.e); })() : mkInf(0);
  const Etiny = cx.Emin - cx.prec + 1;
  if (isZeroD(a)) return mkFin(0, '1', Etiny);
  if (a.s) { const r = stepMag(a.d, a.e, cx, -1); return mkFin(1, r.C, r.e); }
  const r = stepMag(a.d, a.e, cx, +1);
  if (r.C !== '0' && r.e + r.C.length - 1 > cx.Emax) return mkInf(0);
  return mkFin(0, r.C, r.e);
}
function nextMinusDec(cx, a) {
  if (a.k === 'i') return a.s ? mkInf(1) : (() => { const m = maxFinite(cx); return mkFin(0, m.d, m.e); })();
  const Etiny = cx.Emin - cx.prec + 1;
  if (isZeroD(a)) return mkFin(1, '1', Etiny);
  if (!a.s) { const r = stepMag(a.d, a.e, cx, -1); return mkFin(0, r.C, r.e); }
  const r = stepMag(a.d, a.e, cx, +1);
  if (r.C !== '0' && r.e + r.C.length - 1 > cx.Emax) return mkInf(1);
  return mkFin(1, r.C, r.e);
}
function opNextToward(ctx, cx, a, b) {
  for (const d of [a, b]) if (d.k === 's') { sig(ctx, cx, 'InvalidOperation'); return mkNan(d.s, d.d, false); }
  if (a.k === 'n' || b.k === 'n') return mkNan(a.k === 'n' ? a.s : b.s, a.k === 'n' ? a.d : b.d, false);
  const c = cmpNum(a, b);
  if (c === 0) return cloneDec(b);
  return c < 0 ? nextPlusDec(cx, a) : nextMinusDec(cx, a);
}

/* ============ compare_total／max／min ============ */
function totalRank(d) {
  if (d.k === 's') return d.s ? 0 : 9;
  if (d.k === 'n') return d.s ? 1 : 8;
  if (d.k === 'i') return d.s ? 2 : 7;
  if (isZeroD(d)) return d.s ? 3 : 4;
  return d.s ? 2.5 : 5.5;
}
function cmpTotal(a, b) {
  const ra = totalRank(a), rb = totalRank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (a.k === 'n' || a.k === 's') {
    const pa = a.d === '' ? 0n : BigInt(a.d), pb = b.d === '' ? 0n : BigInt(b.d);
    if (pa === pb) return 0;
    const c = pa < pb ? -1 : 1;
    return a.s ? -c : c;
  }
  if (a.k !== 'f' || isZeroD(a)) return 0;
  const c = cmpAbsVal(a, b);
  if (c !== 0) return a.s ? -c : c;
  // 数値が等しい場合：正数は指数が大きい方が大きく、負数は指数が小さい方が大きい
  if (a.e === b.e) return 0;
  const ec = a.e < b.e ? -1 : 1;
  return a.s ? -ec : ec;
}
function opMaxMin(ctx, cx, a, b, isMax, mag) {
  for (const d of [a, b]) if (d.k === 's') { sig(ctx, cx, 'InvalidOperation'); return mkNan(d.s, d.d, false); }
  if (a.k === 'n' && b.k === 'n') return cloneDec(a);
  if (a.k === 'n') return cloneDec(b);
  if (b.k === 'n') return cloneDec(a);
  let c;
  if (mag) {
    const aa = mkFin(0, a.d, a.e), bb = mkFin(0, b.d, b.e);
    if (a.k === 'i' && b.k === 'i') c = 0;
    else if (a.k === 'i') c = 1;
    else if (b.k === 'i') c = -1;
    else c = cmpAbsVal(aa, bb);
    if (c === 0) c = cmpTotal(mkFin(0, a.d, a.e), mkFin(0, b.d, b.e));
  } else {
    c = cmpNum(a, b);
    if (c === 0) c = cmpTotal(a, b);
  }
  const pick = isMax ? (c >= 0 ? a : b) : (c <= 0 ? a : b);
  return cloneDec(pick);
}
function opCompare(ctx, cx, a, b, signal) {
  for (const d of [a, b]) if (d.k === 's') { sig(ctx, cx, 'InvalidOperation'); return mkNan(d.s, d.d, false); }
  if (signal && (a.k === 'n' || b.k === 'n')) { sig(ctx, cx, 'InvalidOperation'); return mkNan(0, '', false); }
  if (a.k === 'n' || b.k === 'n') return mkNan(0, '', false);
  const c = cmpNum(a, b);
  return c === 0 ? mkFin(0, '0', 0) : mkFin(c < 0 ? 1 : 0, '1', 0);
}
const magOf = (d) => ({ s: 0, k: d.k, d: d.d, e: d.e }); // 絶対値版（種別を保つ）

/* ============ 文字列化（to-sci／to-eng） ============ */
function sciString(d, capitals) {
  const E = capitals ? 'E' : 'e';
  if (d.k === 'i') return (d.s ? '-' : '') + 'Infinity';
  if (d.k === 'n') return (d.s ? '-' : '') + 'NaN' + d.d;
  if (d.k === 's') return (d.s ? '-' : '') + 'sNaN' + d.d;
  const sign = d.s ? '-' : '';
  const digits = d.d, e = d.e;
  const adj = e + digits.length - 1;
  if (e <= 0 && adj >= -6) {
    if (adj >= 0) {
      const ip = digits.slice(0, adj + 1).padEnd(adj + 1, '0');
      const fp = digits.slice(adj + 1);
      return sign + ip + (fp ? '.' + fp : (e < 0 ? '.' + '0'.repeat(-e - (digits.length - adj - 1)) : ''));
    }
    return sign + '0.' + '0'.repeat(-adj - 1) + digits;
  }
  if (e === 0 && adj >= -6 && adj < digits.length) return sign + digits;
  let mant = digits[0];
  if (digits.length > 1) mant += '.' + digits.slice(1);
  return sign + mant + E + (adj < 0 ? '-' : '+') + Math.abs(adj);
}
function engString(d, capitals) {
  const E = capitals ? 'E' : 'e';
  if (d.k !== 'f') return sciString(d, capitals);
  const sign = d.s ? '-' : '';
  const digits = d.d, e = d.e;
  const adj = e + digits.length - 1;
  if (e <= 0 && adj >= -6) return sciString(d, capitals);
  const engAdj = adj - ((adj % 3 + 3) % 3);
  const left = adj - engAdj + 1; // 1..3
  const padded = digits.padEnd(left, '0');
  let mant = padded.slice(0, left);
  const rest = digits.slice(left);
  if (rest) mant += '.' + rest;
  if (engAdj === 0) return sign + mant + (e > 0 ? '' : '');
  return sign + mant + E + (engAdj < 0 ? '-' : '+') + Math.abs(engAdj);
}
function decRepr(d) { return "Decimal('" + sciString(d, 1) + "')"; }
function ctxRepr(d) {
  const fl = REPR_ORDER.filter((n) => d.flags[n]);
  const tr = REPR_ORDER.filter((n) => d.traps[n]);
  return 'Context(prec=' + d.prec + ', rounding=' + d.rounding + ', Emin=' + d.Emin + ', Emax=' + d.Emax + ', capitals=' + d.capitals + ', clamp=' + d.clamp + ', flags=[' + fl.join(', ') + '], traps=[' + tr.join(', ') + '])';
}
function numberClassOf(cx, d) {
  if (d.k === 'i') return (d.s ? '-' : '+') + 'Infinity';
  if (d.k === 'n') return 'NaN';
  if (d.k === 's') return 'sNaN';
  const sign = d.s ? '-' : '+';
  if (isZeroD(d)) return sign + 'Zero';
  return sign + (adjOf(d) >= cx.Emin ? 'Normal' : 'Subnormal');
}

/* ============ R5：Decimal の format フック（__format__ 相当） ============
 * CPython 3.12.3 実走マトリクス（約120件）で照合した規則：
 * - 丸めは現在のコンテキストの rounding を使う（prec は使わない）。
 * - 精度の既定値は「係数の桁をそのまま出す」こと：f／% は小数部桁数＝
 *   max(0, -e)（% は指数を +2 してから）、e は小数部桁数＝係数桁数-1、
 *   g／n は有効桁数＝係数桁数。精度を明示した場合は丸めとゼロ埋めを行う。
 * - g／n は丸めた桁をそのまま保持する（末尾ゼロを落とさない。ただし
 *   元の桁数を超えてゼロ埋めはしない）。科学表記への切替は float の
 *   g と違い Decimal の to-sci 規則（丸め後の指数 > 0、または調整指数
 *   < -6）。指数は符号必須・ゼロ埋めなし（'e+4'）。
 * - 型なし・精度なしは str(self)（capitals はコンテキスト依存）。
 *   型なし・精度ありは有効桁へ丸めて to-sci 文字列化する。
 * - ゼロの e 書式は CPython の癖まで再現する：精度省略時は元の指数を
 *   そのまま使い（0.00 → '0e-2'）、精度明示時は 指数＋精度（0 → '0.00e+2'）。
 * - '_' グルーピングと整数型（d／x／o／b）・s・c 等は ValueError
 *   （'invalid format string'）。',' グルーピングは f／%／g（固定部）のみ。 */
function decRoundSigDigits(digits, e, p, mode, sign) {
  if (digits === '0' || digits.length <= p) return { digits, e };
  const keep = digits.slice(0, p), dropped = digits.slice(p);
  let nd = keep, ne = e + dropped.length;
  if (decideInc(mode, sign, keep, dropped, false)) {
    nd = incDigitsStr(keep);
    if (nd.length > p) { nd = nd.slice(0, p); ne += 1; }
  }
  return { digits: nd, e: ne };
}
function decFixedBody(digits, e) {
  const adj = e + digits.length - 1;
  if (e >= 0) return digits + '0'.repeat(e);
  if (adj >= 0) {
    const ip = digits.slice(0, adj + 1), fp = digits.slice(adj + 1);
    return fp ? ip + '.' + fp : ip;
  }
  return '0.' + '0'.repeat(-adj - 1) + digits;
}
function decFormatFixed(d, p, mode) {
  if (isZeroD(d)) return p > 0 ? '0.' + '0'.repeat(p) : '0';
  const te = -p;
  let digits = d.d, e = d.e;
  if (e > te) { digits += '0'.repeat(e - te); e = te; }
  else if (e < te) { const r = roundDrop(digits, te - e, mode, d.s, false); digits = r.C; e = te; }
  const adj = e + digits.length - 1;
  let ip, fp;
  if (adj >= 0) { ip = digits.slice(0, adj + 1).padEnd(adj + 1, '0'); fp = digits.slice(adj + 1); }
  else { ip = '0'; fp = '0'.repeat(-adj - 1) + digits; }
  fp = fp.padEnd(p, '0');
  return p > 0 ? ip + '.' + fp : ip;
}
function decFormatSci(d, prec, mode, hash, type) {
  const E = type === 'E' ? 'E' : 'e';
  if (isZeroD(d)) {
    const p = prec === null ? 0 : prec;
    const mant = '0' + (p > 0 || hash ? '.' + '0'.repeat(p) : '');
    const exp = d.e + p;
    return mant + E + (exp < 0 ? '-' : '+') + Math.abs(exp);
  }
  const p = prec === null ? d.d.length - 1 : prec;
  const r = decRoundSigDigits(d.d, d.e, p + 1, mode, d.s);
  let digits = r.digits, e = r.e;
  if (digits.length < p + 1) { e -= (p + 1 - digits.length); digits = digits.padEnd(p + 1, '0'); }
  const adj = e + digits.length - 1;
  const mant = digits[0] + (p > 0 || hash ? '.' + digits.slice(1) : '');
  return mant + E + (adj < 0 ? '-' : '+') + Math.abs(adj);
}
function decFormatG(d, prec, mode, hash, E) {
  const p0 = prec === null ? d.d.length : prec;
  const p = p0 === 0 ? 1 : p0;
  if (isZeroD(d)) {
    if (d.e > 0 || d.e < -6) return '0' + (hash ? '.' : '') + E + (d.e < 0 ? '-' : '+') + Math.abs(d.e);
    return decFixedBody('0', d.e);
  }
  const r = decRoundSigDigits(d.d, d.e, p, mode, d.s);
  const adj = r.e + r.digits.length - 1;
  /* 科学表記への切替は float の g（調整指数 < -4）と違い、Decimal の
   * to-sci 規則そのもの：丸め後の指数 e > 0、または調整指数 < -6。
   * CPython 実走：3E-6 の '.2g' は '0.000003'（固定）、1.5E-7 は '1.5e-7'。 */
  if (r.e > 0 || adj < -6) {
    const mant = r.digits[0] + (r.digits.length > 1 ? '.' + r.digits.slice(1) : (hash ? '.' : ''));
    return mant + E + (adj < 0 ? '-' : '+') + Math.abs(adj);
  }
  const body = decFixedBody(r.digits, r.e);
  return hash && !body.includes('.') ? body + '.' : body;
}
function decGroupBody(body) {
  const dot = body.indexOf('.');
  const ip = dot < 0 ? body : body.slice(0, dot);
  const rest = dot < 0 ? '' : body.slice(dot);
  return ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + rest;
}
function decPadBody(signStr, body, fill, align, width) {
  const core = signStr + body;
  const len = [...core].length;
  if (len >= width) return core;
  const n = width - len;
  if (align === '=') return signStr + fill.repeat(n) + body;
  if (align === '<') return core + fill.repeat(n);
  if (align === '^') { const l = Math.floor(n / 2); return fill.repeat(l) + core + fill.repeat(n - l); }
  return fill.repeat(n) + core;
}
function decFormatValue(ctx, self, spec) {
  const d = self.data;
  const cx = curData();
  const mode = cx.rounding;
  const invalid = () => ctx.err('ValueError', 'invalid format string', '');
  if (typeof spec !== 'string') invalid();
  if (spec === '') return sciString(d, cx.capitals);
  const m = /^(?:([\s\S])?([<>^=]))?([+\- ]?)(z?)(#?)(0?)(\d*)(,?)(?:\.(\d+))?([eEfFgG%n]?)$/.exec(spec);
  if (!m) invalid();
  const fillCh = m[1], alignCh = m[2], signOpt = m[3] || '', zflag = m[4] === 'z', hash = m[5] === '#', zero = m[6] === '0';
  const width = m[7] ? parseInt(m[7], 10) : 0;
  const group = m[8] === ',';
  const prec = m[9] !== undefined ? parseInt(m[9], 10) : null;
  const type = m[10] || '';
  if (fillCh === '{' || fillCh === '}') invalid();
  if (type === 'n' && group) invalid();
  const special = d.k !== 'f';
  let body;
  if (special) {
    body = d.k === 'i' ? 'Infinity' : d.k === 'n' ? 'NaN' + d.d : 'sNaN' + d.d;
    if (type === '%') body += '%'; // CPython 実走：Infinity%／NaN%
  } else if (type === 'f' || type === 'F') {
    const p = prec === null ? Math.max(0, -d.e) : prec;
    body = decFormatFixed(d, p, mode);
    if (hash && p === 0) body += '.';
    if (group) body = decGroupBody(body);
  } else if (type === '%') {
    const d2 = { s: d.s, k: 'f', d: d.d, e: d.e + 2 };
    const p = prec === null ? Math.max(0, -d2.e) : prec;
    body = decFormatFixed(d2, p, mode);
    if (hash && p === 0) body += '.';
    if (group) body = decGroupBody(body);
    body += '%';
  } else if (type === 'e' || type === 'E') {
    body = decFormatSci(d, prec, mode, hash, type);
  } else if (type === 'g' || type === 'G' || type === 'n') {
    body = decFormatG(d, prec, mode, hash, type === 'G' ? 'E' : 'e');
    if (group && !/[eE]/.test(body)) body = decGroupBody(body);
  } else {
    if (prec === null) body = sciString({ s: 0, k: d.k, d: d.d, e: d.e }, cx.capitals);
    else {
      const r = decRoundSigDigits(d.d, d.e, prec === 0 ? 1 : prec, mode, d.s);
      body = sciString(mkFin(0, r.digits, r.e), cx.capitals);
    }
    if (group) body = decGroupBody(body);
  }
  /* z フラグ：符号が落ちるのは「整形後の本体がゼロ」のとき（元の値が
   * ゼロの場合だけでなく、丸めでゼロになった負値も。CPython 実走：
   * format(Decimal('-1.35E-5'), 'z.1f') は '0.0'）。 */
  const bodyZero = d.k === 'f' && !/[1-9]/.test(body);
  const neg = d.s === 1 && !(zflag && bodyZero);
  const signStr = neg ? '-' : signOpt === '+' ? '+' : signOpt === ' ' ? ' ' : '';
  const fill = fillCh !== undefined ? fillCh : (zero && !special ? '0' : ' ');
  const align = alignCh || (zero && !special ? '=' : '>');
  return decPadBody(signStr, body, fill, align, width);
}

/* ============ Decimal クラス ============ */
const wrapDec = (ctx, d) => (d && ctx.isUnk(d) ? d : ctx.native('decimal.Decimal', d)); // UNK は包まずそのまま返す
function roundingArg(ctx, kwargs) {
  const r = kwargs ? kwargs.rounding : undefined;
  if (r === undefined || (r && ctx.isNone(r))) return null;
  if (typeof r === 'string' && ROUNDINGS.includes(r)) return r;
  ctx.err('TypeError', 'valid values for rounding are:\n  [ROUND_CEILING, ROUND_FLOOR, ROUND_UP, ROUND_DOWN,\n   ROUND_HALF_UP, ROUND_HALF_DOWN, ROUND_HALF_EVEN,\n   ROUND_05UP]', '');
  return null;
}
function operand(ctx, v) { // メソッド引数（変換できなければ UNK を返す）
  const d = toDecMethod(ctx, v);
  if (d === null) return null;
  return d;
}
function integralOperand(ctx, cx, v) { // scaleb／shift／rotate の第2引数
  const d = toDecMethod(ctx, v);
  if (d === null) return null;
  if (d.k !== 'f' || !isIntegralDec(d)) { sig(ctx, cx, 'InvalidOperation'); return null; }
  return d;
}

const DEC_METHODS = {
  adjusted: (ctx, self) => { const d = self.data; return I(d.k === 'f' && !isZeroD(d) ? adjOf(d) : 0); },
  as_integer_ratio: (ctx, self) => {
    const d = self.data;
    if (d.k === 'i') ctx.err('OverflowError', 'cannot convert Infinity to integer ratio', '');
    if (d.k !== 'f') ctx.err('ValueError', 'cannot convert NaN to integer ratio', '');
    let num, den;
    if (d.e >= 0) { num = BigInt(d.d) * pow10(d.e); den = 1n; }
    else { num = BigInt(d.d); den = pow10(-d.e); }
    const g = bigGcd(num, den); num /= g; den /= g;
    if (d.s) num = -num;
    const SAFE = 9007199254740991n;
    if (num > SAFE || num < -SAFE || den > SAFE) return ctx.unk(BIGDESC);
    return TUPLE([I(Number(num)), I(Number(den))]);
  },
  as_tuple: (ctx, self) => {
    const d = self.data;
    const digits = d.k === 'f' ? (d.d === '0' ? [0] : d.d.split('').map(Number)) : (d.k === 'i' ? [0] : (d.d === '' ? [] : d.d.split('').map(Number)));
    const exp = d.k === 'f' ? I(d.e) : (d.k === 'i' ? 'F' : d.k === 'n' ? 'n' : 'N');
    return TUPLE([I(d.s), TUPLE(digits.map((x) => I(x))), exp]);
  },
  canonical: (ctx, self) => wrapDec(ctx, cloneDec(self.data)),
  compare: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('比較の結果'); return wrapDec(ctx, opCompare(ctx, resolveCx(ctx, kwargs), self.data, o, false)); },
  compare_signal: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('比較の結果'); return wrapDec(ctx, opCompare(ctx, resolveCx(ctx, kwargs), self.data, o, true)); },
  compare_total: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('比較の結果'); const c = cmpTotal(self.data, o); return wrapDec(ctx, mkFin(c < 0 ? 1 : 0, String(Math.abs(c)), 0)); },
  compare_total_mag: (ctx, self, args) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('比較の結果'); const c = cmpTotal(magOf(self.data), magOf(o)); return wrapDec(ctx, mkFin(c < 0 ? 1 : 0, String(Math.abs(c)), 0)); },
  conjugate: (ctx, self) => wrapDec(ctx, cloneDec(self.data)),
  copy_abs: (ctx, self) => { const d = cloneDec(self.data); d.s = 0; return wrapDec(ctx, d); },
  copy_negate: (ctx, self) => { const d = cloneDec(self.data); d.s = d.s ? 0 : 1; return wrapDec(ctx, d); },
  copy_sign: (ctx, self, args) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('コピーの結果'); const d = cloneDec(self.data); d.s = o.s; return wrapDec(ctx, d); },
  exp: (ctx, self, args, kwargs) => wrapDec(ctx, opExp(ctx, resolveCx(ctx, kwargs), self.data)),
  fma: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]), t = operand(ctx, args[1]); if (!o || !t) return ctx.unk('fma の結果'); return wrapDec(ctx, opFma(ctx, resolveCx(ctx, kwargs), self.data, o, t)); },
  is_canonical: (ctx) => BOOL(true),
  is_finite: (ctx, self) => BOOL(self.data.k === 'f'),
  is_infinite: (ctx, self) => BOOL(self.data.k === 'i'),
  is_nan: (ctx, self) => BOOL(self.data.k === 'n' || self.data.k === 's'),
  is_normal: (ctx, self, args, kwargs) => { const cx = resolveCx(ctx, kwargs); const d = self.data; return BOOL(d.k === 'f' && !isZeroD(d) && adjOf(d) >= cx.Emin); },
  is_qnan: (ctx, self) => BOOL(self.data.k === 'n'),
  is_signed: (ctx, self) => BOOL(self.data.s === 1),
  is_snan: (ctx, self) => BOOL(self.data.k === 's'),
  is_subnormal: (ctx, self, args, kwargs) => { const cx = resolveCx(ctx, kwargs); const d = self.data; return BOOL(d.k === 'f' && !isZeroD(d) && adjOf(d) < cx.Emin); },
  is_zero: (ctx, self) => BOOL(isZeroD(self.data)),
  ln: (ctx, self, args, kwargs) => wrapDec(ctx, opLn(ctx, resolveCx(ctx, kwargs), self.data)),
  log10: (ctx, self, args, kwargs) => wrapDec(ctx, opLog10(ctx, resolveCx(ctx, kwargs), self.data)),
  logb: (ctx, self, args, kwargs) => wrapDec(ctx, opLogb(ctx, resolveCx(ctx, kwargs), self.data)),
  logical_and: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('論理演算の結果'); return wrapDec(ctx, opLogical(ctx, resolveCx(ctx, kwargs), self.data, o, 'and')); },
  logical_invert: (ctx, self, args, kwargs) => wrapDec(ctx, opLogical(ctx, resolveCx(ctx, kwargs), self.data, null, 'invert')),
  logical_or: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('論理演算の結果'); return wrapDec(ctx, opLogical(ctx, resolveCx(ctx, kwargs), self.data, o, 'or')); },
  logical_xor: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('論理演算の結果'); return wrapDec(ctx, opLogical(ctx, resolveCx(ctx, kwargs), self.data, o, 'xor')); },
  max: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('比較の結果'); return wrapDec(ctx, opMaxMin(ctx, resolveCx(ctx, kwargs), self.data, o, true, false)); },
  max_mag: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('比較の結果'); return wrapDec(ctx, opMaxMin(ctx, resolveCx(ctx, kwargs), self.data, o, true, true)); },
  min: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('比較の結果'); return wrapDec(ctx, opMaxMin(ctx, resolveCx(ctx, kwargs), self.data, o, false, false)); },
  min_mag: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('比較の結果'); return wrapDec(ctx, opMaxMin(ctx, resolveCx(ctx, kwargs), self.data, o, false, true)); },
  next_minus: (ctx, self, args, kwargs) => wrapDec(ctx, nextMinusDec(resolveCx(ctx, kwargs), self.data)),
  next_plus: (ctx, self, args, kwargs) => wrapDec(ctx, nextPlusDec(resolveCx(ctx, kwargs), self.data)),
  next_toward: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opNextToward(ctx, resolveCx(ctx, kwargs), self.data, o)); },
  normalize: (ctx, self, args, kwargs) => wrapDec(ctx, opNormalize(ctx, resolveCx(ctx, kwargs), self.data)),
  number_class: (ctx, self, args, kwargs) => numberClassOf(resolveCx(ctx, kwargs), self.data),
  quantize: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('quantize の結果'); return wrapDec(ctx, opQuantize(ctx, resolveCx(ctx, kwargs), self.data, o, roundingArg(ctx, kwargs))); },
  radix: (ctx) => wrapDec(ctx, mkFin(0, '10', 0)),
  remainder_near: (ctx, self, args, kwargs) => { const o = operand(ctx, args[0]); if (!o) return ctx.unk('剰余'); return wrapDec(ctx, opRemainder(ctx, resolveCx(ctx, kwargs), self.data, o, true)); },
  rotate: (ctx, self, args, kwargs) => { const cx = resolveCx(ctx, kwargs); const o = integralOperand(ctx, cx, args[0]); if (!o) return ctx.unk('rotate の結果'); return wrapDec(ctx, opShiftRotate(ctx, cx, self.data, o, true)); },
  same_quantum: (ctx, self, args) => {
    const o = operand(ctx, args[0]); if (!o) return ctx.unk('判定の結果');
    const a = self.data;
    if ((a.k === 'n' || a.k === 's') && (o.k === 'n' || o.k === 's')) return BOOL(true);
    if (a.k === 'i' && o.k === 'i') return BOOL(true);
    if (a.k !== 'f' || o.k !== 'f') return BOOL(false);
    return BOOL(a.e === o.e);
  },
  scaleb: (ctx, self, args, kwargs) => { const cx = resolveCx(ctx, kwargs); const o = integralOperand(ctx, cx, args[0]); if (!o) return ctx.unk('scaleb の結果'); return wrapDec(ctx, opScaleb(ctx, cx, self.data, o)); },
  shift: (ctx, self, args, kwargs) => { const cx = resolveCx(ctx, kwargs); const o = integralOperand(ctx, cx, args[0]); if (!o) return ctx.unk('shift の結果'); return wrapDec(ctx, opShiftRotate(ctx, cx, self.data, o, false)); },
  sqrt: (ctx, self, args, kwargs) => wrapDec(ctx, opSqrt(ctx, resolveCx(ctx, kwargs), self.data)),
  to_eng_string: (ctx, self, args, kwargs) => engString(self.data, resolveCx(ctx, kwargs).capitals),
  to_integral: (ctx, self, args, kwargs) => wrapDec(ctx, opToIntegral(ctx, resolveCx(ctx, kwargs), self.data, roundingArg(ctx, kwargs), false)),
  to_integral_exact: (ctx, self, args, kwargs) => wrapDec(ctx, opToIntegral(ctx, resolveCx(ctx, kwargs), self.data, roundingArg(ctx, kwargs), true)),
  to_integral_value: (ctx, self, args, kwargs) => wrapDec(ctx, opToIntegral(ctx, resolveCx(ctx, kwargs), self.data, roundingArg(ctx, kwargs), false)),
};

function constructDecimal(ctx, args, kwargs) {
  let cx = curData();
  const cArg = args.length > 1 ? args[1] : (kwargs ? kwargs.context : undefined);
  if (cArg !== undefined && !(cArg && ctx.isNone(cArg))) {
    if (isCtxNative(cArg)) cx = cArg.data;
    else ctx.err('TypeError', 'context must be a Context', '');
  }
  if (args.length === 0) return wrapDec(ctx, mkFin(0, '0', 0));
  const v = args[0];
  if (isDecNative(v)) return wrapDec(ctx, cloneDec(v.data));
  if (ctx.isBool(v)) return wrapDec(ctx, mkFin(0, v.v ? '1' : '0', 0));
  if (ctx.isNum(v) && !v.f) {
    if (!Number.isSafeInteger(v.v)) return ctx.unk(BIGDESC);
    return wrapDec(ctx, decFromIntNum(v.v));
  }
  if (ctx.isNum(v) && v.f) {
    sig(ctx, cx, 'FloatOperation');
    return wrapDec(ctx, decFromDouble(v.v));
  }
  if (typeof v === 'string') {
    const p = parseDecimalString(v, true);
    if (p === null) { sig(ctx, cx, 'InvalidOperation', 'decimal.InvalidOperation', sigMsg('ConversionSyntax')); return wrapDec(ctx, mkNan(0, '', false)); }
    if (p.overflowExp) { sig(ctx, cx, 'InvalidOperation'); return wrapDec(ctx, mkNan(0, '', false)); }
    return wrapDec(ctx, p);
  }
  if (ctx.isTuple(v) || ctx.isList(v)) {
    const items = ctx.isTuple(v) ? v.__tuple : v.__list;
    if (items.length !== 3) ctx.err('ValueError', 'argument must be a sequence of length 3', '');
    const [sv, dv, ev] = items;
    let sign;
    if (ctx.isBool(sv)) sign = sv.v ? 1 : 0;
    else if (ctx.isNum(sv) && !sv.f && (sv.v === 0 || sv.v === 1)) sign = sv.v;
    else ctx.err('ValueError', 'sign must be an integer with the value 0 or 1', '');
    if (!(ctx.isTuple(dv) || ctx.isList(dv))) ctx.err('ValueError', 'coefficient must be a tuple of digits', '');
    const dItems = ctx.isTuple(dv) ? dv.__tuple : dv.__list;
    let digits = '';
    for (const it of dItems) {
      if (ctx.isBool(it)) digits += it.v ? '1' : '0';
      else if (ctx.isNum(it) && !it.f && it.v >= 0 && it.v <= 9) digits += String(it.v);
      else ctx.err('ValueError', 'coefficient must be a tuple of digits', '');
    }
    if (typeof ev === 'string') {
      if (ev === 'F') return wrapDec(ctx, mkInf(sign));
      if (ev === 'n') return wrapDec(ctx, mkNan(sign, stripPayload(digits), false));
      if (ev === 'N') return wrapDec(ctx, mkNan(sign, stripPayload(digits), true));
      ctx.err('ValueError', 'exponent must be an integer', '');
    }
    if (ctx.isNum(ev) && !ev.f) {
      if (!Number.isSafeInteger(ev.v)) return ctx.unk(BIGDESC);
      if (digits === '') return wrapDec(ctx, mkFin(sign, '0', ev.v));
      return wrapDec(ctx, mkFin(sign, stripLeadingZeros(digits), ev.v));
    }
    if (ctx.isBool(ev)) return wrapDec(ctx, mkFin(sign, stripLeadingZeros(digits === '' ? '0' : digits), ev.v ? 1 : 0));
    ctx.err('TypeError', 'exponent must be an integer', '');
  }
  if (ctx.isUnk(v)) return ctx.unk(v.desc || 'Decimal の値');
  ctx.err('TypeError', 'conversion from ' + ctx.typeName(v) + ' to Decimal is not supported', '');
  return ctx.unk('Decimal の値');
}

const DEC_CLASS = {
  typeName: 'Decimal',
  // B7 追補 R4：CPython の _pydecimal.py は Number.register(Decimal) で
  // Decimal を numbers.Number にだけ登録する（Real には登録しないことが
  // numbers.py／_pydecimal.py のコメントで明示。CPython 3.12.3 実走：
  // isinstance(Decimal('1'), numbers.Number) は True、Complex／Real／
  // Rational／Integral はすべて False）。parents は numbers.Number のみ。
  parents: ['numbers.Number'],
  construct: constructDecimal,
  methods: DEC_METHODS,
  /* R5 フック配線：format()／f文字列（実装と照合規則は decFormatValue の
   * コメント参照）。 */
  format: (ctx, self, spec) => decFormatValue(ctx, self, spec),
  /* R5 フック配線：round()。CPython 3.12.3 実走で照合した __round__：
   * ndigits 省略／None は偶数丸め（コンテキスト不使用）で int を返す
   * （round(Decimal('2.5')) は int の 2。Decimal('3') ではない）。
   * ndigits ありは現在のコンテキストでの quantize と等価（丸めモード・
   * prec・InvalidOperation の発生条件までコンテキスト依存）。 */
  round: (ctx, self, nd) => {
    const d = self.data;
    if (nd === undefined || (nd && ctx.isNone(nd))) {
      if (d.k === 'n' || d.k === 's') ctx.err('ValueError', 'cannot convert NaN to integer', '');
      if (d.k === 'i') ctx.err('OverflowError', 'cannot convert Infinity to integer', '');
      let digits = d.d, e = d.e;
      if (e < 0) { const r = roundDrop(digits, -e, 'ROUND_HALF_EVEN', d.s, false); digits = r.C; }
      else if (e > 0) digits = digits + '0'.repeat(e);
      if (digits === '0') return I(0);
      const v = BigInt(digits);
      if (v > 9007199254740991n) return ctx.unk(BIGDESC);
      return I(d.s ? -Number(v) : Number(v));
    }
    if (ctx.isUnk(nd)) return ctx.unk('round の結果');
    let n;
    if (ctx.isBool(nd)) n = nd.v ? 1 : 0;
    else if (ctx.isNum(nd) && !nd.f) n = nd.v;
    else ctx.err('TypeError', 'optional arg must be an integer', '');
    return wrapDec(ctx, opQuantize(ctx, curData(), d, mkFin(0, '1', -n)));
  },
  classMethods: {
    from_float: (ctx, args) => {
      const v = args[0];
      if (ctx.isBool(v)) return wrapDec(ctx, mkFin(0, v.v ? '1' : '0', 0));
      if (ctx.isNum(v) && v.f) return wrapDec(ctx, decFromDouble(v.v));
      if (ctx.isNum(v) && !v.f) { if (!Number.isSafeInteger(v.v)) return ctx.unk(BIGDESC); return wrapDec(ctx, decFromIntNum(v.v)); }
      if (ctx.isUnk(v)) return ctx.unk('Decimal の値');
      ctx.err('TypeError', 'argument must be int or float', '');
      return ctx.unk('Decimal の値');
    },
    from_number: (ctx, args) => {
      const v = args[0];
      if (isDecNative(v)) return wrapDec(ctx, cloneDec(v.data));
      if (ctx.isBool(v)) return wrapDec(ctx, mkFin(0, v.v ? '1' : '0', 0));
      if (ctx.isNum(v) && v.f) return wrapDec(ctx, decFromDouble(v.v));
      if (ctx.isNum(v) && !v.f) { if (!Number.isSafeInteger(v.v)) return ctx.unk(BIGDESC); return wrapDec(ctx, decFromIntNum(v.v)); }
      if (ctx.isUnk(v)) return ctx.unk('Decimal の値');
      ctx.err('TypeError', 'argument must be a number', '');
      return ctx.unk('Decimal の値');
    },
  },
  repr: (ctx, self) => decRepr(self.data),
  str: (ctx, self) => sciString(self.data, curData().capitals),
  truthy: (ctx, self) => !isZeroD(self.data),
  eq: (ctx, self, other) => {
    const a = self.data;
    const conv = other && other.__native === 'decimal.Decimal' ? { d: other.data } : toDecCompare(ctx, other);
    if (!conv) return ctx.isUnk(other) ? null : false;
    // float との等価比較は例外にはならないが FloatOperation フラグは立つ（CPython 実走）
    if (conv.isFloat) { try { curData().flags.FloatOperation = true; } catch (e) { /* 現在のコンテキスト未生成時は無視 */ } }
    const b = conv.d;
    if (a.k === 'n' || a.k === 's' || b.k === 'n' || b.k === 's') return false;
    return cmpNum(a, b) === 0;
  },
  hash: (ctx, self) => {
    const d = self.data;
    if (d.k === 'i') return 'inf:' + d.s;
    if (d.k === 'n' || d.k === 's') return 'nan';
    if (d.d === '0') return 'zero';
    let C = d.d, e = d.e;
    while (C.length > 1 && C.endsWith('0')) { C = C.slice(0, -1); e += 1; }
    return 'n:' + d.s + ':' + C + ':' + e;
  },
  compare: (ctx, self, op, other) => {
    const a = self.data;
    const conv = toDecCompare(ctx, other);
    if (!conv) {
      if (ctx.isUnk(other)) return null;
      ctx.err('TypeError', "'" + op + "' not supported between instances of 'decimal.Decimal' and '" + ctx.typeName(other) + "'", '');
      return false;
    }
    const cx = curData();
    if (conv.isFloat) { cx.flags.FloatOperation = true; if (cx.traps.FloatOperation) ctx.err('decimal.FloatOperation', sigMsg('FloatOperation'), ''); }
    const b = conv.d;
    if (a.k === 'n' || a.k === 's' || b.k === 'n' || b.k === 's') {
      sig(ctx, cx, 'InvalidOperation');
      return false;
    }
    const c = cmpNum(a, b);
    return op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0;
  },
  binop: (ctx, self, op, other, reflected) => {
    if (!['+', '-', '*', '/', '//', '%', '**'].includes(op)) return NOT_HANDLED;
    const a = self.data;
    let b = null;
    if (isDecNative(other)) b = other.data;
    else if (ctx.isBool(other)) b = mkFin(0, other.v ? '1' : '0', 0);
    else if (ctx.isNum(other) && !other.f) { if (!Number.isSafeInteger(other.v)) return ctx.unk(BIGDESC); b = decFromIntNum(other.v); }
    else if (ctx.isUnk(other)) return ctx.unk('演算の結果');
    else {
      const tSelf = 'decimal.Decimal';
      const tOther = ctx.isNum(other) && other.f ? 'float' : ctx.typeName(other);
      const lt = reflected ? tOther : tSelf, rt = reflected ? tSelf : tOther;
      const opDisp = op === '**' ? '** or pow()' : op;
      ctx.err('TypeError', 'unsupported operand type(s) for ' + opDisp + ": '" + lt + "' and '" + rt + "'", '');
      return NOT_HANDLED;
    }
    const L = reflected ? b : a, R = reflected ? a : b;
    const cx = curData();
    let res;
    if (op === '+') res = opAdd(ctx, cx, L, R);
    else if (op === '-') res = opSub(ctx, cx, L, R);
    else if (op === '*') res = opMul(ctx, cx, L, R);
    else if (op === '/') res = opDiv(ctx, cx, L, R);
    else if (op === '//') res = opDivideInt(ctx, cx, L, R);
    else if (op === '%') res = opRemainder(ctx, cx, L, R, false);
    else res = opPower(ctx, cx, L, R, null);
    return wrapDec(ctx, res);
  },
};

/* ============ Context クラス ============ */
const MAX_PREC_LIM = 999999999999999999;
function needInt(ctx, v) {
  if (ctx.isBool(v)) return v.v ? 1 : 0;
  if (ctx.isNum(v) && !v.f) { if (!Number.isSafeInteger(v.v)) return null; return v.v; }
  ctx.err('TypeError', 'an integer is required', '');
  return null;
}
function applyCxFields(ctx, d, fields) { // fields: {prec, rounding, Emin, Emax, capitals, clamp, flags, traps}（エンジン値）
  if (fields.prec !== undefined) {
    const p = needInt(ctx, fields.prec); if (p === null) return ctx.unk('Context');
    if (p < 1 || p > MAX_PREC_LIM) ctx.err('ValueError', 'valid range for prec is [1, MAX_PREC]', '');
    d.prec = p;
  }
  if (fields.rounding !== undefined) {
    if (typeof fields.rounding !== 'string' || !ROUNDINGS.includes(fields.rounding)) ctx.err('TypeError', 'valid values for rounding are:\n  [ROUND_CEILING, ROUND_FLOOR, ROUND_UP, ROUND_DOWN,\n   ROUND_HALF_UP, ROUND_HALF_DOWN, ROUND_HALF_EVEN,\n   ROUND_05UP]', '');
    d.rounding = fields.rounding;
  }
  if (fields.Emin !== undefined) {
    const p = needInt(ctx, fields.Emin); if (p === null) return ctx.unk('Context');
    if (p > 0) ctx.err('ValueError', 'valid range for Emin is [MIN_EMIN, 0]', '');
    d.Emin = p;
  }
  if (fields.Emax !== undefined) {
    const p = needInt(ctx, fields.Emax); if (p === null) return ctx.unk('Context');
    if (p < 0) ctx.err('ValueError', 'valid range for Emax is [0, MAX_EMAX]', '');
    d.Emax = p;
  }
  if (fields.capitals !== undefined) {
    const p = needInt(ctx, fields.capitals); if (p === null) return ctx.unk('Context');
    if (p !== 0 && p !== 1) ctx.err('ValueError', 'valid values for capitals are 0 or 1', '');
    d.capitals = p;
  }
  if (fields.clamp !== undefined) {
    const p = needInt(ctx, fields.clamp); if (p === null) return ctx.unk('Context');
    if (p !== 0 && p !== 1) ctx.err('ValueError', 'valid values for clamp are 0 or 1', '');
    d.clamp = p;
  }
  for (const key of ['flags', 'traps']) {
    if (fields[key] !== undefined) {
      const fv = fields[key];
      const target = {}; for (const n of SIG_ORDER) target[n] = false;
      const setOne = (clsVal, on) => {
        if (clsVal && clsVal.__ncls) { const nm = clsVal.__ncls.split('.').pop(); if (SIG_ORDER.includes(nm)) target[nm] = on; }
      };
      if (ctx.isList(fv) || ctx.isTuple(fv)) { const items = ctx.isList(fv) ? fv.__list : fv.__tuple; for (const it of items) setOne(it, true); }
      else if (ctx.isDict(fv)) {
        /* R5 再照合（CPython 3.12.3 実走）：信号 dict は「全信号ちょうど」を
         * キーに持つ dict なら受理され、値は真理値で解釈される。欠け・
         * 余分なキー・信号クラスでないキーがあると KeyError。従来の
         * 「辞書形は常に KeyError」は部分 dict だけを見た単純化だった。 */
        const seen = new Set();
        for (const ent of fv.__dict.values()) {
          const clsVal = ent.k;
          const nm = clsVal && clsVal.__ncls ? clsVal.__ncls.split('.').pop() : null;
          if (!nm || !SIG_ORDER.includes(nm)) ctx.err('KeyError', "'invalid signal dict'", '');
          target[nm] = ctx.truthy(ent.v);
          seen.add(nm);
        }
        if (seen.size !== SIG_ORDER.length) ctx.err('KeyError', "'invalid signal dict'", '');
      }
      else ctx.err('TypeError', key + ' must be a dict or a list', '');
      d[key] = target;
    }
  }
  return null;
}
function constructContext(ctx, args, kwargs) {
  const d = copyCxData(DefaultContextNative.data);
  const names = ['prec', 'rounding', 'Emin', 'Emax', 'capitals', 'clamp', 'flags', 'traps'];
  const fields = {};
  args.forEach((v, i) => { if (i < names.length) fields[names[i]] = v; });
  if (kwargs) for (const k of Object.keys(kwargs)) if (names.includes(k)) fields[k] = kwargs[k];
  if (fields.flags === undefined) d.flags = emptySignals(false);
  const bad = applyCxFields(ctx, d, fields);
  if (bad) return bad;
  return ctx.native('decimal.Context', d);
}
function ctxFlagsDict(ctx, map) {
  const d = DICT();
  for (const n of SIG_ORDER) dictSet(d, ctx.ncls('decimal.' + n), BOOL(!!map[n]));
  return d;
}
function cxOperand(ctx, cx, v) { // Context メソッドのオペランド（toDecMethod と同じ変換）
  return toDecMethod(ctx, v);
}
function cxUnaryCore(ctx, cx, d, kind) { // plus／minus／abs
  if (d.k === 's') { sig(ctx, cx, 'InvalidOperation'); const r = mkNan(d.s, d.d, false); if (kind === 'minus') r.s = r.s ? 0 : 1; if (kind === 'abs') r.s = 0; return r; }
  if (d.k === 'n') { const r = cloneDec(d); if (kind === 'minus') r.s = r.s ? 0 : 1; if (kind === 'abs') r.s = 0; return r; }
  if (d.k === 'i') { const r = mkInf(d.s); if (kind === 'minus') r.s = r.s ? 0 : 1; if (kind === 'abs') r.s = 0; return r; }
  const s = kind === 'abs' ? 0 : kind === 'minus' ? (d.s ? 0 : 1) : d.s;
  return finish(ctx, cx, applyCtx(s, d.d, d.e, cx));
}
const CX_METHODS = {
  Etiny: (ctx, self) => I(self.data.Emin - self.data.prec + 1),
  Etop: (ctx, self) => I(self.data.Emax - self.data.prec + 1),
  abs: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, cxUnaryCore(ctx, self.data, o, 'abs')); },
  add: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opAdd(ctx, self.data, a, b)); },
  canonical: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, cloneDec(o)); },
  clear_flags: (ctx, self) => { self.data.flags = emptySignals(false); return NONE; },
  clear_traps: (ctx, self) => { self.data.traps = emptySignals(false); return NONE; },
  compare: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opCompare(ctx, self.data, a, b, false)); },
  compare_signal: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opCompare(ctx, self.data, a, b, true)); },
  compare_total: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); const c = cmpTotal(a, b); return wrapDec(ctx, mkFin(c < 0 ? 1 : 0, String(Math.abs(c)), 0)); },
  compare_total_mag: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); const c = cmpTotal(magOf(a), magOf(b)); return wrapDec(ctx, mkFin(c < 0 ? 1 : 0, String(Math.abs(c)), 0)); },
  copy: (ctx, self) => ctx.native('decimal.Context', copyCxData(self.data)),
  copy_abs: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); const r = cloneDec(o); r.s = 0; return wrapDec(ctx, r); },
  copy_decimal: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, cloneDec(o)); },
  copy_negate: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); const r = cloneDec(o); r.s = r.s ? 0 : 1; return wrapDec(ctx, r); },
  copy_sign: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]), t = cxOperand(ctx, self.data, args[1]); if (!o || !t) return ctx.unk('結果'); const r = cloneDec(o); r.s = t.s; return wrapDec(ctx, r); },
  create_decimal: (ctx, self, args) => {
    const cx = self.data;
    const v = args.length ? args[0] : '0';
    let d;
    if (isDecNative(v)) d = cloneDec(v.data);
    else if (ctx.isBool(v)) d = mkFin(0, v.v ? '1' : '0', 0);
    else if (ctx.isNum(v) && !v.f) { if (!Number.isSafeInteger(v.v)) return ctx.unk(BIGDESC); d = decFromIntNum(v.v); }
    else if (ctx.isNum(v) && v.f) { sig(ctx, cx, 'FloatOperation'); d = decFromDouble(v.v); }
    else if (typeof v === 'string') {
      const p = parseDecimalString(v, false);
      if (p === null) { sig(ctx, cx, 'InvalidOperation', 'decimal.InvalidOperation', sigMsg('ConversionSyntax')); return wrapDec(ctx, mkNan(0, '', false)); }
      if (p.overflowExp) { sig(ctx, cx, 'InvalidOperation'); return wrapDec(ctx, mkNan(0, '', false)); }
      d = p;
    } else if (ctx.isUnk(v)) return ctx.unk('Decimal の値');
    else { ctx.err('TypeError', 'conversion from ' + ctx.typeName(v) + ' to Decimal is not supported', ''); return ctx.unk('Decimal の値'); }
    const nan = nanProp(ctx, cx, [d]); if (nan) return wrapDec(ctx, nan);
    if (d.k === 'i') return wrapDec(ctx, mkInf(d.s));
    return wrapDec(ctx, finish(ctx, cx, applyCtx(d.s, d.d, d.e, cx)));
  },
  create_decimal_from_float: (ctx, self, args) => {
    const v = args[0];
    let d;
    if (ctx.isNum(v) && v.f) d = decFromDouble(v.v);
    else if (ctx.isNum(v) && !v.f) { if (!Number.isSafeInteger(v.v)) return ctx.unk(BIGDESC); d = decFromIntNum(v.v); }
    else if (ctx.isBool(v)) d = mkFin(0, v.v ? '1' : '0', 0);
    else { ctx.err('TypeError', 'argument must be a float', ''); return ctx.unk('Decimal の値'); }
    return wrapDec(ctx, finish(ctx, self.data, applyCtx(d.s, d.d, d.e, self.data)));
  },
  divide: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opDiv(ctx, self.data, a, b)); },
  divide_int: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opDivideInt(ctx, self.data, a, b)); },
  divmod: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return TUPLE([wrapDec(ctx, opDivideInt(ctx, self.data, a, b)), wrapDec(ctx, opRemainder(ctx, self.data, a, b, false))]); },
  exp: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opExp(ctx, self.data, o)); },
  fma: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]), c = cxOperand(ctx, self.data, args[2]); if (!a || !b || !c) return ctx.unk('結果'); return wrapDec(ctx, opFma(ctx, self.data, a, b, c)); },
  is_canonical: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(true); },
  is_finite: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(o.k === 'f'); },
  is_infinite: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(o.k === 'i'); },
  is_nan: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(o.k === 'n' || o.k === 's'); },
  is_normal: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(o.k === 'f' && !isZeroD(o) && adjOf(o) >= self.data.Emin); },
  is_qnan: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(o.k === 'n'); },
  is_signed: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(o.s === 1); },
  is_snan: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(o.k === 's'); },
  is_subnormal: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(o.k === 'f' && !isZeroD(o) && adjOf(o) < self.data.Emin); },
  is_zero: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return BOOL(isZeroD(o)); },
  ln: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opLn(ctx, self.data, o)); },
  log10: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opLog10(ctx, self.data, o)); },
  logb: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opLogb(ctx, self.data, o)); },
  logical_and: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opLogical(ctx, self.data, a, b, 'and')); },
  logical_invert: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opLogical(ctx, self.data, o, null, 'invert')); },
  logical_or: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opLogical(ctx, self.data, a, b, 'or')); },
  logical_xor: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opLogical(ctx, self.data, a, b, 'xor')); },
  max: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opMaxMin(ctx, self.data, a, b, true, false)); },
  max_mag: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opMaxMin(ctx, self.data, a, b, true, true)); },
  min: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opMaxMin(ctx, self.data, a, b, false, false)); },
  min_mag: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opMaxMin(ctx, self.data, a, b, false, true)); },
  minus: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, cxUnaryCore(ctx, self.data, o, 'minus')); },
  multiply: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opMul(ctx, self.data, a, b)); },
  next_minus: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, nextMinusDec(self.data, o)); },
  next_plus: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, nextPlusDec(self.data, o)); },
  next_toward: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opNextToward(ctx, self.data, a, b)); },
  normalize: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opNormalize(ctx, self.data, o)); },
  number_class: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return numberClassOf(self.data, o); },
  plus: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, cxUnaryCore(ctx, self.data, o, 'plus')); },
  power: (ctx, self, args, kwargs) => {
    const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]);
    if (!a || !b) return ctx.unk('結果');
    let mod = null;
    const mv = args.length > 2 ? args[2] : (kwargs ? kwargs.modulo : undefined);
    if (mv !== undefined && !(mv && ctx.isNone(mv))) { mod = cxOperand(ctx, self.data, mv); if (!mod) return ctx.unk('結果'); }
    return wrapDec(ctx, opPower(ctx, self.data, a, b, mod));
  },
  quantize: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opQuantize(ctx, self.data, a, b, null)); },
  radix: (ctx) => wrapDec(ctx, mkFin(0, '10', 0)),
  remainder: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opRemainder(ctx, self.data, a, b, false)); },
  remainder_near: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opRemainder(ctx, self.data, a, b, true)); },
  rotate: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); const y = o && integralOperand(ctx, self.data, args[1]); if (!o || !y) return ctx.unk('結果'); return wrapDec(ctx, opShiftRotate(ctx, self.data, o, y, true)); },
  same_quantum: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); if ((a.k === 'n' || a.k === 's') && (b.k === 'n' || b.k === 's')) return BOOL(true); if (a.k === 'i' && b.k === 'i') return BOOL(true); if (a.k !== 'f' || b.k !== 'f') return BOOL(false); return BOOL(a.e === b.e); },
  scaleb: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); const y = o && integralOperand(ctx, self.data, args[1]); if (!o || !y) return ctx.unk('結果'); return wrapDec(ctx, opScaleb(ctx, self.data, o, y)); },
  shift: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); const y = o && integralOperand(ctx, self.data, args[1]); if (!o || !y) return ctx.unk('結果'); return wrapDec(ctx, opShiftRotate(ctx, self.data, o, y, false)); },
  sqrt: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opSqrt(ctx, self.data, o)); },
  subtract: (ctx, self, args) => { const a = cxOperand(ctx, self.data, args[0]), b = cxOperand(ctx, self.data, args[1]); if (!a || !b) return ctx.unk('結果'); return wrapDec(ctx, opSub(ctx, self.data, a, b)); },
  to_eng_string: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return engString(o, self.data.capitals); },
  to_integral: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opToIntegral(ctx, self.data, o, null, false)); },
  to_integral_exact: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opToIntegral(ctx, self.data, o, null, true)); },
  to_integral_value: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return wrapDec(ctx, opToIntegral(ctx, self.data, o, null, false)); },
  to_sci_string: (ctx, self, args) => { const o = cxOperand(ctx, self.data, args[0]); if (!o) return ctx.unk('結果'); return sciString(o, self.data.capitals); },
};
const CX_CLASS = {
  typeName: 'Context',
  construct: constructContext,
  /* R5 フック配線：属性代入。prec／rounding／Emin／Emax／capitals／clamp／
   * flags／traps は検証付きで実データへ反映する（検証規則と例外文面は
   * コンストラクタの applyCxFields と同一で、CPython 3.12.3 実走と一致）。
   * それ以外の名前は CPython どおり AttributeError（Context は任意の
   * 属性を持てない）。代入は self.data の変更なので、Context メソッドや
   * （getcontext() 経由なら）現在のコンテキストを使う演算へ即時反映される。 */
  setattr: (ctx, self, name, value) => {
    const FIELDS = ['prec', 'rounding', 'Emin', 'Emax', 'capitals', 'clamp', 'flags', 'traps'];
    if (!FIELDS.includes(name)) ctx.err('AttributeError', "'decimal.Context' object has no attribute '" + name + "'", '');
    // CPython 実走：属性代入では list／tuple 形を受け付けない（コンストラクタは受付ける）
    if ((name === 'flags' || name === 'traps') && (ctx.isList(value) || ctx.isTuple(value))) {
      ctx.err('TypeError', 'argument must be a signal dict', '');
    }
    const fields = {};
    fields[name] = value;
    applyCxFields(ctx, self.data, fields);
  },
  attrs: {
    prec: (ctx, self) => I(self.data.prec),
    rounding: (ctx, self) => self.data.rounding,
    Emin: (ctx, self) => I(self.data.Emin),
    Emax: (ctx, self) => I(self.data.Emax),
    capitals: (ctx, self) => I(self.data.capitals),
    clamp: (ctx, self) => I(self.data.clamp),
    flags: (ctx, self) => ctxFlagsDict(ctx, self.data.flags),
    traps: (ctx, self) => ctxFlagsDict(ctx, self.data.traps),
  },
  methods: CX_METHODS,
  repr: (ctx, self) => ctxRepr(self.data),
  str: (ctx, self) => ctxRepr(self.data),
};

/* ============ ContextManager（localcontext の戻り値） ============ */
registerStdlibClass('decimal.ContextManager', {
  typeName: 'ContextManager',
  methods: {
    __enter__: (ctx, self) => {
      self.data.saved = CUR;
      const nm = ctx.native('decimal.Context', copyCxData(self.data.newData));
      CUR = nm;
      return nm;
    },
    __exit__: (ctx, self) => { if (self.data.saved) CUR = self.data.saved; return BOOL(false); },
  },
});

/* ============ 例外クラス ============ */
const EXC_DEFS = {};
{
  const P = 'decimal.DecimalException';
  const defs = {
    DecimalException: ['ArithmeticError'],
    Clamped: [P],
    DivisionByZero: [P, 'ZeroDivisionError'],
    FloatOperation: [P, 'TypeError'],
    Inexact: [P],
    InvalidOperation: [P],
    Rounded: [P],
    Subnormal: [P],
    Overflow: ['decimal.Inexact', 'decimal.Rounded'],
    Underflow: ['decimal.Inexact', 'decimal.Rounded', 'decimal.Subnormal'],
    ConversionSyntax: ['decimal.InvalidOperation'],
    DivisionImpossible: ['decimal.InvalidOperation'],
    DivisionUndefined: ['decimal.InvalidOperation', 'ZeroDivisionError'],
    InvalidContext: ['decimal.InvalidOperation'],
  };
  // exc は種別名（限定名）文字列が契約。excParents が例外階層、parents は isinstance 用。
  for (const [name, parents] of Object.entries(defs)) EXC_DEFS[name] = { exc: 'decimal.' + name, excParents: parents, parents };
}

/* ============ モジュール関数と登録 ============ */
function ieeeContextData(bits) {
  const d = templateData();
  const k = bits / 32;
  d.prec = 9 * k - 2;
  d.Emax = 3 * Math.pow(2, bits / 16 + 3);
  d.Emin = -d.Emax;
  d.clamp = 1;
  d.rounding = 'ROUND_HALF_EVEN';
  d.traps = emptySignals(false);
  d.traps.InvalidOperation = true; d.traps.DivisionByZero = true; d.traps.Overflow = true;
  return d;
}
registerStdlibModule('decimal', {
  data: {
    ROUND_CEILING: 'ROUND_CEILING', ROUND_DOWN: 'ROUND_DOWN', ROUND_FLOOR: 'ROUND_FLOOR',
    ROUND_HALF_DOWN: 'ROUND_HALF_DOWN', ROUND_HALF_EVEN: 'ROUND_HALF_EVEN', ROUND_HALF_UP: 'ROUND_HALF_UP',
    ROUND_UP: 'ROUND_UP', ROUND_05UP: 'ROUND_05UP',
    HAVE_THREADS: BOOL(true), HAVE_CONTEXTVAR: BOOL(true),
    IEEE_CONTEXT_MAX_BITS: I(512),
    SPEC_VERSION: UNK('汎用十進演算仕様のバージョン（この実行環境では確定しません）'),
    MAX_PREC: UNK(BIGDESC), MAX_EMAX: UNK(BIGDESC), MIN_EMIN: UNK(BIGDESC), MIN_ETINY: UNK(BIGDESC),
    BasicContext: BasicContextNative, DefaultContext: DefaultContextNative, ExtendedContext: ExtendedContextNative,
  },
  functions: {
    getcontext: (ctx, args, kwargs) => {
      if (kwargs && Object.keys(kwargs).length) ctx.err('TypeError', 'getcontext() takes no keyword arguments', '');
      return curNative();
    },
    setcontext: (ctx, args, kwargs) => {
      if (kwargs && Object.keys(kwargs).length) ctx.err('TypeError', 'setcontext() takes no keyword arguments', '');
      const v = args[0];
      if (!isCtxNative(v)) ctx.err('TypeError', 'argument must be a context', '');
      CUR = v;
      return NONE;
    },
    localcontext: (ctx, args, kwargs) => {
      let base;
      if (args.length && !(args[0] && ctx.isNone(args[0]))) {
        if (!isCtxNative(args[0])) ctx.err('TypeError', 'argument must be a context', '');
        base = copyCxData(args[0].data);
      } else base = copyCxData(curData());
      if (kwargs && Object.keys(kwargs).length) {
        const bad = applyCxFields(ctx, base, kwargs);
        if (bad) return bad;
      }
      return ctx.native('decimal.ContextManager', { saved: null, newData: base });
    },
    IEEEContext: (ctx, args, kwargs) => {
      if (kwargs && Object.keys(kwargs).length) ctx.err('TypeError', 'IEEEContext() takes no keyword arguments', '');
      const bits = needInt(ctx, args[0]);
      if (bits === null) return ctx.unk('Context');
      if (bits <= 0 || bits % 32 !== 0 || bits >= 512) ctx.err('ValueError', 'bits must be a multiple of 32 up to IEEE_CONTEXT_MAX_BITS', '');
      return ctx.native('decimal.Context', ieeeContextData(bits));
    },
  },
  classes: { Decimal: DEC_CLASS, Context: CX_CLASS, ...EXC_DEFS },
});
