/* 高度モード B7 パイロット：math モジュール全67件の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/math）と CPython 3.12.3 実走
 * （fmax／fmin／signbit／isnormal／issubnormal は 3.15 で追加されたため
 * 公式ドキュメントの記述に基づく。実走照合は監査台帳に記録）。
 * 戻り値の型規則：原則 float。floor／ceil／trunc／gcd／lcm／factorial／
 * comb／perm／isqrt は int。frexp は (float, int)、modf は (float, float)。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { getattrOf, callWithKwargs, isUnk } from './impl-advanced-g5-common.js';

const { NUM, BOOL, TUPLE, UNK } = PyAPI;
const F = (v) => NUM(v, true);
const I = (v) => NUM(v, false);
const BIGDESC = 'とても大きな整数・この説明では正確に計算しません';
const SAFE = (n) => Number.isSafeInteger(n);

function noKwargs(ctx, kwargs, fname) {
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', 'math.' + fname + '() にキーワード引数「' + ks[0] + '」はありません', 'キーワード引数なしで呼び出してください');
}
function arity(ctx, args, min, max, fname) {
  if (args.length < min || args.length > max) ctx.err('TypeError', 'math.' + fname + '() の引数の数が合いません（' + args.length + '個渡されました）', 'リファレンスで使い方を確認してください');
}
function numArg(ctx, v, fname) {
  const n = ctx.num(v);
  if (n === null) ctx.err('TypeError', 'math.' + fname + '() の引数には数値を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return n;
}
function intArg(ctx, v, fname) {
  // 高度A7班是正: 安全範囲を超えた整数（エンジンが UNK で表す）を
  // 「整数でない」と虚偽の理由で TypeError にしない。呼び出し側は
  // null を受けたら UNK(BIGDESC) を返す（factorial 等の既存方針と一致）。
  if (ctx.isUnk(v)) return null;
  // CPython の __index__ 規則：float は小数部があっても無くても TypeError。
  if (ctx.isNum(v) && !v.f) return v.v;
  if (ctx.isBool(v)) return v.v ? 1 : 0;
  ctx.err('TypeError', 'math.' + fname + '() の引数には整数を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return 0;
}
function seqArg(ctx, v, fname) {
  const items = ctx.iterable(v);
  if (items === null) ctx.err('TypeError', 'math.' + fname + '() の引数にはリストなどの「並び」を使ってください', '');
  return items;
}

/* ---- 浮動小数点のビット操作（nextafter／ulp／signbit 用） ---- */
const _dv = new DataView(new ArrayBuffer(8));
const f2b = (x) => { _dv.setFloat64(0, x); return _dv.getBigUint64(0); };
const b2f = (b) => { _dv.setBigUint64(0, b); return _dv.getFloat64(0); };
const MIN_NORMAL = 2.2250738585072014e-308;

/* ---- erf／gamma 用の不完全ガンマ関数（Numerical Recipes の系列・連分数） ---- */
function lgammaHalf(a) { return a === 0.5 ? 0.5 * Math.log(Math.PI) : lgammaLanczos(a); }
function gserP(a, x) {
  if (x === 0) return 0;
  let ap = a, sum = 1 / a, del = sum;
  for (let n = 0; n < 10000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 3e-17) break; }
  return sum * Math.exp(-x + a * Math.log(x) - lgammaHalf(a));
}
function gcfQ(a, x) {
  const FPMIN = 1e-300;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgammaHalf(a)) * h;
}
/* Lanczos 近似（g=7、Wikipedia 掲載の係数。実 CPython とグリッド照合済み） */
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function gammaLanczos(x) {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaLanczos(1 - x));
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}
function lgammaLanczos(x) {
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.abs(Math.sin(Math.PI * x))) - lgammaLanczos(1 - x);
  const xm = x - 1;
  let a = LANCZOS[0];
  const t = xm + 7.5;
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i] / (xm + i);
  return 0.5 * Math.log(2 * Math.PI) + (xm + 0.5) * Math.log(t) - t + Math.log(a);
}


/* ---- double-double（約106ビット精度）演算：gamma／lgamma 用 ----
 * Lanczos 近似を倍精度のまま評価すると数 ulp の誤差が出て CPython（libm）の
 * 結果と大半の入力で一致しないため、係数和・log・exp を DD で評価する。 */
function ddTwoSum(a, b) { const s = a + b; const bb = s - a; const e = (a - (s - bb)) + (b - bb); return [s, e]; }
function ddQuickTwoSum(a, b) { const s = a + b; return [s, b - (s - a)]; }
function ddSplit(a) { const c = 134217729 * a; const hi = c - (c - a); return [hi, a - hi]; }
function ddTwoProd(a, b) { const p = a * b; const [ah, al] = ddSplit(a); const [bh, bl] = ddSplit(b); const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl; return [p, e]; }
function ddAdd(A, B) { const [s, e] = ddTwoSum(A[0], B[0]); return ddQuickTwoSum(s, e + (A[1] + B[1])); }
function ddAddD(A, b) { const [s, e] = ddTwoSum(A[0], b); return ddQuickTwoSum(s, e + A[1]); }
function ddNeg(A) { return [-A[0], -A[1]]; }
function ddSub(A, B) { return ddAdd(A, ddNeg(B)); }
function ddMul(A, B) { const [p, e] = ddTwoProd(A[0], B[0]); return ddQuickTwoSum(p, e + (A[0] * B[1] + A[1] * B[0])); }
function ddMulD(A, b) { const [p, e] = ddTwoProd(A[0], b); return ddQuickTwoSum(p, e + A[1] * b); }
function ddDiv(A, B) { const q1 = A[0] / B[0]; const [p, e] = ddTwoProd(q1, B[0]); const r = ((A[0] - p) + (A[1] - e)) - q1 * B[1]; return ddQuickTwoSum(q1, r / B[0]); }
function ddToDouble(A) { return A[0] + A[1]; }
const DD_LN2 = [0.6931471805599453, 2.3190468123462997e-17]; // ln 2（Decimal 60桁で検算済み）
const DD_PI = [Math.PI, 1.2246467991473532e-16];
const DD_LN_SQRT_2PI = [0.9189385332046728, -3.8782941580672414e-17]; // log(sqrt(2π))（同上）
function ddLog(A) {
  // A > 0 の DD 値の自然対数。A = m * 2^k（m は [√(1/2), √(2)]）に分解し、
  // log m = 2 * atanh((m-1)/(m+1)) の級数で求める。
  let hi = A[0], lo = A[1];
  if (hi !== 0 && Math.abs(hi) < MIN_NORMAL) { const r = ddLog([hi * 18446744073709551616, lo * 18446744073709551616]); return ddSub(r, ddMulD(DD_LN2, 64)); }
  const b = f2b(hi);
  let k = Number((b >> 52n) & 0x7ffn) - 1023;
  let mHi = b2f((b & ~(0x7ffn << 52n)) | (1023n << 52n)); // 指数を 0 にした仮数（[1,2)）
  let mLo = lo * Math.pow(2, -k);
  if (mHi > 1.4142135623730951) { mHi /= 2; mLo /= 2; k += 1; }
  if (mHi < 0.7071067811865476) { mHi *= 2; mLo *= 2; k -= 1; }
  const s = ddDiv(ddAddD([mHi, mLo], -1), ddAddD([mHi, mLo], 1));
  const s2 = ddMul(s, s);
  let term = s, sum = s;
  for (let n = 1; n < 40; n++) {
    term = ddMul(term, s2);
    const add = ddMulD(term, 1 / (2 * n + 1));
    sum = ddAdd(sum, add);
    if (Math.abs(add[0]) < 1e-35) break;
  }
  const logM = ddMulD(sum, 2);
  return ddAdd(ddMulD(DD_LN2, k), logM);
}
function ddExp(A) {
  // A は [-750, 710] 程度の DD 値。2^k * exp(r)（|r| <= ln2/2）に帰着させる。
  const k = Math.round(A[0] / Math.LN2);
  const r = ddSub(A, ddMulD(DD_LN2, k));
  let term = [1, 0], sum = [1, 0];
  for (let n = 1; n < 30; n++) {
    term = ddMulD(ddMul(term, r), 1 / n);
    sum = ddAdd(sum, term);
    if (Math.abs(term[0]) < 1e-35) break;
  }
  const scale = Math.pow(2, k);
  return [sum[0] * scale, sum[1] * scale];
}
function ddSin(A) {
  // |A| <= π/2 前提の sin（DD テイラー級数）
  const A2 = ddMul(A, A);
  let term = A, sum = A;
  for (let n = 1; n < 30; n++) {
    term = ddMulD(ddMul(term, A2), -1 / ((2 * n) * (2 * n + 1)));
    sum = ddAdd(sum, term);
    if (Math.abs(term[0]) < 1e-36) break;
  }
  return sum;
}
function ddSinPi(x) {
  // sin(π x) を DD で返す（x は double、非整数）。周期で [-1/2, 1/2] に落とす。
  const n = Math.round(x);
  const f = x - n; // |f| <= 0.5、厳密
  const px = ddMulD(DD_PI, f); // π f（|π f| <= π/2）
  const v = ddSin(px);
  return (n % 2 !== 0) ? ddNeg(v) : v;
}
const DD_SQRT_PI = [1.772453850905516, -7.666586499825799e-17];
function erfcAsymptotic(x) {
  // x > 9 の erfc(x) = e^(-x^2) / (x √π) ・ Σ (-1)^n (2n-1)!! / (2x^2)^n
  // （漸近級数。x > 9 では最小項が約 1e-36 以下になるため DD 精度で収束する）
  const X = [x, 0];
  const X2 = ddMul(X, X);
  const E = ddExp(ddNeg(X2));
  const twoX2 = ddMulD(X2, 2);
  let term = [1, 0], sum = [1, 0];
  let prevAbs = Infinity;
  for (let n = 1; n < 200; n++) {
    term = ddMul(term, ddDiv([-(2 * n - 1), 0], twoX2));
    if (Math.abs(term[0]) > prevAbs) break; // 発散に転じたら打ち切る
    prevAbs = Math.abs(term[0]);
    sum = ddAdd(sum, term);
    if (Math.abs(term[0]) < 1e-36) break;
  }
  const den = ddMul(X, DD_SQRT_PI);
  return ddToDouble(ddDiv(ddMul(E, sum), den));
}
/* Γ の評価は Lanczos（g=7 係数）では近似誤差が約 1e-15 相対に達し、
 * libm の結果と大半の入力で一致しないため、Stirling 級数（Bernoulli 数）に
 * よる log Γ を DD で評価する。z >= 16 では B14 の項までで打ち切り誤差は
 * 約 1e-18 以下。小さい引数は漸化式で z >= 16 へ寄せ、積と log の和を
 * 別々に DD で持ち、桁落ちを避ける。 */
const STIRLING_COEFS = [[1, 12], [-1, 360], [1, 1260], [-1, 1680], [1, 1188], [-691, 360360], [1, 156], [-3617, 122400]];
function lgammaStirlingCore(Z) {
  // Z（DD、>= 16 前提）の log Γ(Z)
  const lz = ddLog(Z);
  let r = ddMul(lz, ddAddD(Z, -0.5));
  r = ddSub(r, Z);
  r = ddAdd(r, DD_LN_SQRT_2PI);
  const zp2 = ddDiv([1, 0], ddMul(Z, Z));
  let zp = ddDiv([1, 0], Z);
  for (const [cn, cd] of STIRLING_COEFS) {
    r = ddAdd(r, ddMul(ddDiv([cn, 0], [cd, 0]), zp));
    zp = ddMul(zp, zp2);
  }
  return r;
}
function lgammaDD(x) { return lgammaDD2([x, 0]); }
function lgammaDD2(X) {
  // X（DD）の log Γ(X)。シフト因子 X+i は DD のまま厳密に扱う
  // （double に丸めた因子の log を取ると、因子あたり約 1e-16 の誤差が
  // 因子の個数だけ累積するため）。
  if (X[0] < 0.5) return ddSub(lgammaDD2(ddAddD(X, 1)), ddLog(X));
  if (X[0] < 16) {
    const n = Math.ceil(16 - X[0]);
    let shiftLogs = [0, 0];
    for (let i = 0; i < n; i++) shiftLogs = ddAdd(shiftLogs, ddLog(ddAddD(X, i)));
    return ddSub(lgammaStirlingCore(ddAddD(X, n)), shiftLogs);
  }
  return lgammaStirlingCore(X);
}
function gammaPartsDD(x) { return gammaPartsDD2([x, 0]); }
function gammaPartsDD2(X) {
  // X（DD、>= 0.5）の Γ(X) を DD で返す。
  if (X[0] < 16) {
    const n = Math.ceil(16 - X[0]);
    let prod = [1, 0];
    for (let i = 0; i < n; i++) prod = ddMul(prod, ddAddD(X, i));
    return ddDiv(ddExp(lgammaStirlingCore(ddAddD(X, n))), prod);
  }
  return ddExp(lgammaStirlingCore(X));
}
function gammaDD(x) {
  // x != 0, 負の整数でない double の Γ(x) を double で返す。
  if (x < 0) {
    // 反射公式：Γ(x) = π / (sin(πx) Γ(1-x))
    const s = ddSinPi(x);
    const g = gammaPartsDD(1 - x);
    return ddToDouble(ddDiv(DD_PI, ddMul(s, g)));
  }
  if (x < 0.5) return ddToDouble(ddDiv(gammaPartsDD2(ddAddD([x, 0], 1)), [x, 0]));
  return ddToDouble(gammaPartsDD(x));
}
function lgammaNegDD(x) {
  // x < 0（非整数）の log|Γ(x)| = log π - log|sin(πx)| - lgamma(1-x)
  const s = ddSinPi(x);
  const absS = s[0] < 0 ? ddNeg(s) : s;
  return ddSub(ddSub(ddLog(DD_PI), ddLog(absS)), lgammaDD(1 - x));
}

/* ---- 正確な浮動小数点和（fsum／sumprod／fma 用：BigInt で厳密に足す） ---- */
function exactParts(x) {
  // x（有限の double）を [BigInt 仮数, 指数] に分解する（x = m * 2^e）
  const b = f2b(x);
  const neg = (b >> 63n) === 1n;
  const expField = Number((b >> 52n) & 0x7ffn);
  const frac = b & ((1n << 52n) - 1n);
  if (expField === 0) return [neg ? -frac : frac, -1074];
  return [(neg ? -1n : 1n) * (frac + (1n << 52n)), expField - 1075];
}
function exactSumToFloat(terms) {
  // terms: [[BigInt m, int e], ...] の厳密な和を最近接の double に丸める。
  // 戻り値：{ v } または { overflow: true }
  let minE = Infinity;
  for (const [, e] of terms) if (e < minE) minE = e;
  let sum = 0n;
  for (const [m, e] of terms) sum += m << BigInt(e - minE);
  if (sum === 0n) return { v: 0 };
  const neg = sum < 0n;
  let mag = neg ? -sum : sum;
  const bits = mag.toString(2).length;
  // 仮数 53 ビットへ丸める（最近接・偶数）
  let shift = bits - 53;
  let mant;
  if (shift > 0) {
    const keep = mag >> BigInt(shift);
    const rest = mag - (keep << BigInt(shift));
    const half = 1n << BigInt(shift - 1);
    mant = keep + (rest > half || (rest === half && (keep & 1n) === 1n) ? 1n : 0n);
    if (mant >> 53n) { mant >>= 1n; shift += 1; }
  } else { mant = mag << BigInt(-shift); }
  const exp2 = minE + shift; // 値 = mant * 2^exp2、mant は 53 ビット
  const unbiased = exp2 + 52;
  if (unbiased > 1023) return { overflow: true };
  if (unbiased >= -1022) {
    const bitsOut = (neg ? (1n << 63n) : 0n) | (BigInt(unbiased + 1023) << 52n) | (mant - (1n << 52n));
    return { v: b2f(bitsOut) };
  }
  // 非正規化数への丸め
  const rshift = -1022 - unbiased + 1; // mant を右へずらして指数 0 の表現にする追加分
  let sub = mant;
  if (rshift > 0) {
    const keep = sub >> BigInt(rshift);
    const rest = sub - (keep << BigInt(rshift));
    const half = 1n << BigInt(rshift - 1);
    sub = keep + (rest > half || (rest === half && (keep & 1n) === 1n) ? 1n : 0n);
  }
  if (sub >= (1n << 52n)) { // 丸めで最小の正規化数へ繰り上がる
    return { v: b2f((neg ? (1n << 63n) : 0n) | (1n << 52n)) };
  }
  return { v: b2f((neg ? (1n << 63n) : 0n) | sub) };
}
/* erf の厳密級数：erf(x) = (2/√π) Σ (-1)^n x^(2n+1) / (n! (2n+1))。
 * 項は double の冪（厳密）÷整数（厳密）なので、固定小数点 BigInt で
 * 誤差 2^-340 以下に抑えて合計し、2/√π も 300 ビット精度で掛ける。
 * これにより libm と同じ最近接丸めの結果が得られる（グリッド照合済み）。 */
const PI_DECIMAL = '3141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342117067982148086513282306647';
function bigIsqrt(n) {
  if (n <= 0n) return 0n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
}
const ERF_K = 350;
const ERF_C = (() => {
  // C ≈ (2/√π) * 2^300
  const scaleDigits = 10n ** BigInt(PI_DECIMAL.length - 1);
  const piScaled = BigInt(PI_DECIMAL); // π * 10^(桁数-1)（末尾の切り捨て誤差は 1e-110 未満で無視できる）
  // √π を 2^300 スケールで：sqrt(piScaled / 10^128 * 2^600) = sqrt(piScaled * 2^600 / 10^128)
  const sqrtPi = bigIsqrt((piScaled << 600n) / scaleDigits);
  return (2n << 600n) / sqrtPi;
})();
function erfParts(ax) {
  // erf(ax) を厳密な [BigInt num, int e]（値 = num * 2^e）で返す。
  const [m0, e0] = exactParts(ax);
  const m02 = m0 * m0;
  let sum = 0n;
  let powM = 1n;
  let fact = 1n;
  for (let n = 0; n < 500; n++) {
    if (n > 0) { powM *= m02; fact *= BigInt(n); }
    const shift = BigInt(ERF_K) + BigInt(2 * e0 * n);
    const den = fact * BigInt(2 * n + 1);
    let term;
    if (shift >= 0n) term = (powM << shift) / den;
    else term = powM / (den << (-shift));
    if (term === 0n && n > ax * ax + 2) break;
    sum += (n % 2 === 0) ? term : -term;
  }
  return [sum * ERF_C * m0, e0 - (ERF_K + 300)];
}
function erfExact(ax) {
  if (ax === 0) return 0;
  const r = exactSumToFloat([erfParts(ax)]);
  return r.overflow ? 1 : r.v;
}
function erfcExact(ax) {
  // 1 - erf を未丸めの厳密値のまま引いてから丸める（桁落ち防止）。
  const [num, e] = erfParts(ax);
  const one = 1n << BigInt(-e);
  const r = exactSumToFloat([[one - num, e]]);
  return r.overflow ? 0 : r.v;
}

function intToExactParts(n) {
  // 整数（Number、安全範囲外も含む有限値）を厳密な [m, e] にする
  if (n === 0) return [0n, 0];
  return exactParts(n); // 整数の double は厳密値なのでビット分解でよい
}

/* ---- 1引数の実数関数をまとめて作る ---- */
function unary(name, jsFn, opt = {}) {
  return (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, name); arity(ctx, args, 1, 1, name);
    const x = numArg(ctx, args[0], name);
    if (opt.domain && !opt.domain(x)) ctx.err('ValueError', 'math domain error', '');
    const r = jsFn(x);
    if (typeof r === 'number') {
      if (Number.isNaN(r) && !Number.isNaN(x)) ctx.err('ValueError', 'math domain error', '');
      if (!Number.isFinite(r) && Number.isFinite(x) && opt.overflow !== false) ctx.err('OverflowError', 'math range error', '');
    }
    return F(r);
  };
}
function unaryInt(name, jsFn, dunder) {
  return (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, name); arity(ctx, args, 1, 1, name);
    // A6監査PYF-01：対応項目 object.__trunc__／__floor__／__ceil__ の宣言どおり、
    // インスタンスが対応ダンダーを定義していれば先に呼び出す（CPython の
    // math.floor／ceil／trunc は引数のダンダーへ委譲する）。戻り値が整数で
    // なければ TypeError（CPython は Integral でない戻り値を拒否する）。
    const v = args[0];
    if (v && v.__instance) {
      const m = getattrOf(ctx, v, dunder);
      if (m.value !== undefined) {
        const r = callWithKwargs(ctx, m.value, [], {});
        if (isUnk(r)) return UNK('math.' + name + ' の結果');
        if (ctx.isNum(r) && !r.f) return SAFE(r.v) ? I(r.v) : UNK(BIGDESC);
        if (ctx.isBool(r)) return I(r.v ? 1 : 0);
        ctx.err('TypeError', dunder + '() が整数でない値を返しました（' + ctx.typeName(r) + '）', '');
      }
    }
    const x = numArg(ctx, args[0], name);
    if (Number.isNaN(x)) ctx.err('ValueError', 'cannot convert float NaN to integer', '');
    if (!Number.isFinite(x)) ctx.err('OverflowError', 'cannot convert float infinity to integer', '');
    const r = jsFn(x);
    return SAFE(r) ? I(r) : UNK(BIGDESC);
  };
}

const FUNCTIONS = {
  sqrt: unary('sqrt', Math.sqrt, { domain: (x) => x >= 0 || Number.isNaN(x) }),
  fabs: unary('fabs', Math.abs, { overflow: false }),
  sin: unary('sin', Math.sin), cos: unary('cos', Math.cos), tan: unary('tan', Math.tan),
  asin: unary('asin', Math.asin, { domain: (x) => (x >= -1 && x <= 1) || Number.isNaN(x) }),
  acos: unary('acos', Math.acos, { domain: (x) => (x >= -1 && x <= 1) || Number.isNaN(x) }),
  atan: unary('atan', Math.atan),
  sinh: unary('sinh', Math.sinh), cosh: unary('cosh', Math.cosh), tanh: unary('tanh', Math.tanh),
  asinh: unary('asinh', Math.asinh), acosh: unary('acosh', Math.acosh, { domain: (x) => x >= 1 || Number.isNaN(x) }),
  atanh: unary('atanh', Math.atanh, { domain: (x) => (x > -1 && x < 1) || Number.isNaN(x) }),
  exp: unary('exp', Math.exp), exp2: unary('exp2', (x) => Math.pow(2, x)), expm1: unary('expm1', Math.expm1),
  log2: unary('log2', Math.log2, { domain: (x) => x > 0 || Number.isNaN(x) }),
  log10: unary('log10', Math.log10, { domain: (x) => x > 0 || Number.isNaN(x) }),
  log1p: unary('log1p', Math.log1p, { domain: (x) => x > -1 || Number.isNaN(x) }),
  cbrt: unary('cbrt', Math.cbrt, { overflow: false }),
  degrees: unary('degrees', (x) => x * (180 / Math.PI), { overflow: false }),
  radians: unary('radians', (x) => x * (Math.PI / 180), { overflow: false }),
  erf: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'erf'); arity(ctx, args, 1, 1, 'erf');
    const x = numArg(ctx, args[0], 'erf');
    if (Number.isNaN(x)) return F(NaN);
    if (!Number.isFinite(x)) return F(x > 0 ? 1 : -1);
    const ax = Math.abs(x);
    const v = ax <= 9 ? erfExact(ax) : 1;
    return F(x < 0 ? -v : v);
  },
  erfc: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'erfc'); arity(ctx, args, 1, 1, 'erfc');
    const x = numArg(ctx, args[0], 'erfc');
    if (Number.isNaN(x)) return F(NaN);
    if (x === Infinity) return F(0);
    if (x === -Infinity) return F(2);
    const ax = Math.abs(x);
    const q = ax <= 9 ? erfcExact(ax) : erfcAsymptotic(ax);
    return F(x < 0 ? 2 - q : q);
  },
  gamma: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'gamma'); arity(ctx, args, 1, 1, 'gamma');
    const x = numArg(ctx, args[0], 'gamma');
    if (Number.isNaN(x)) return F(NaN);
    if (x === Infinity) return F(Infinity);
    if (x === -Infinity || x === 0 || (x < 0 && Number.isInteger(x))) ctx.err('ValueError', 'math domain error', '');
    const r = gammaDD(x);
    if (!Number.isFinite(r) && Number.isFinite(x)) ctx.err('OverflowError', 'math range error', '');
    return F(r);
  },
  lgamma: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'lgamma'); arity(ctx, args, 1, 1, 'lgamma');
    const x = numArg(ctx, args[0], 'lgamma');
    if (Number.isNaN(x)) return F(NaN);
    if (x === Infinity) return F(Infinity);
    if (x === -Infinity || x === 0 || (x < 0 && Number.isInteger(x))) ctx.err('ValueError', 'math domain error', '');
    return F(ddToDouble(x > 0 ? lgammaDD(x) : lgammaNegDD(x)));
  },
  floor: unaryInt('floor', Math.floor, '__floor__'),
  ceil: unaryInt('ceil', Math.ceil, '__ceil__'),
  trunc: unaryInt('trunc', Math.trunc, '__trunc__'),
  log: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'log'); arity(ctx, args, 1, 2, 'log');
    const x = numArg(ctx, args[0], 'log');
    if (!(x > 0) && !Number.isNaN(x)) ctx.err('ValueError', 'math domain error', '');
    if (args.length === 1) return F(Math.log(x));
    const base = numArg(ctx, args[1], 'log');
    if (!(base > 0) || base === 1) { if (!Number.isNaN(base)) ctx.err('ValueError', 'math domain error', ''); }
    if (Number.isNaN(x) || Number.isNaN(base)) return F(NaN);
    if (base === 10) return F(Math.log10(x));
    if (base === 2) return F(Math.log2(x));
    if (base === Math.E) return F(Math.log(x));
    return F(Math.log(x) / Math.log(base));
  },
  pow: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'pow'); arity(ctx, args, 2, 2, 'pow');
    const x = numArg(ctx, args[0], 'pow'), y = numArg(ctx, args[1], 'pow');
    const r = Math.pow(x, y);
    if (Number.isNaN(r) && !Number.isNaN(x) && !Number.isNaN(y)) ctx.err('ValueError', 'math domain error', '');
    if (!Number.isFinite(r) && Number.isFinite(x) && Number.isFinite(y) && r !== -Infinity) ctx.err('OverflowError', 'math range error', '');
    if (r === -Infinity) ctx.err('ValueError', 'math domain error', '');
    return F(r);
  },
  atan2: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'atan2'); arity(ctx, args, 2, 2, 'atan2');
    return F(Math.atan2(numArg(ctx, args[0], 'atan2'), numArg(ctx, args[1], 'atan2')));
  },
  copysign: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'copysign'); arity(ctx, args, 2, 2, 'copysign');
    const x = numArg(ctx, args[0], 'copysign'), y = numArg(ctx, args[1], 'copysign');
    const neg = (f2b(y) >> 63n) === 1n;
    return F(neg ? -Math.abs(x) : Math.abs(x));
  },
  fmod: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'fmod'); arity(ctx, args, 2, 2, 'fmod');
    const x = numArg(ctx, args[0], 'fmod'), y = numArg(ctx, args[1], 'fmod');
    if (Number.isNaN(x) || Number.isNaN(y)) return F(NaN);
    if (!Number.isFinite(x)) ctx.err('ValueError', 'math domain error', '');
    if (y === 0) ctx.err('ValueError', 'math domain error', '');
    if (!Number.isFinite(y)) return F(x);
    return F(x % y);
  },
  remainder: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'remainder'); arity(ctx, args, 2, 2, 'remainder');
    const x = numArg(ctx, args[0], 'remainder'), y = numArg(ctx, args[1], 'remainder');
    if (y === 0 || !Number.isFinite(x)) { if (!Number.isNaN(x) && !Number.isNaN(y)) ctx.err('ValueError', 'math domain error', ''); }
    if (Number.isNaN(x) || Number.isNaN(y)) return F(NaN);
    if (!Number.isFinite(y)) return F(x);
    const q = x / y;
    let n = Math.floor(q);
    const frac = q - n;
    if (frac > 0.5 || (frac === 0.5 && n % 2 !== 0)) n += 1;
    let r = x - n * y;
    if (r === 0) r = (f2b(x) >> 63n) === 1n ? -0 : 0; // 剰余0の符号は x の符号
    return F(r);
  },
  frexp: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'frexp'); arity(ctx, args, 1, 1, 'frexp');
    const x = numArg(ctx, args[0], 'frexp');
    if (x === 0) return TUPLE([F(0), I(0)]);
    if (!Number.isFinite(x)) return TUPLE([F(x), I(0)]);
    const b = f2b(x);
    const expField = Number((b >> 52n) & 0x7ffn);
    let e, m;
    if (expField === 0) { const scaled = x * Math.pow(2, 64); const r = frexpRaw(scaled); m = r[0]; e = r[1] - 64; }
    else { e = expField - 1022; m = b2f((b & ~(0x7ffn << 52n)) | (1022n << 52n)); }
    return TUPLE([F(m), I(e)]);
  },
  modf: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'modf'); arity(ctx, args, 1, 1, 'modf');
    const x = numArg(ctx, args[0], 'modf');
    if (Number.isNaN(x)) return TUPLE([F(NaN), F(NaN)]);
    if (!Number.isFinite(x)) return TUPLE([F(x > 0 ? 0 : -0), F(x)]);
    const ip = Math.trunc(x);
    return TUPLE([F(x - ip), F(ip)]);
  },
  ldexp: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'ldexp'); arity(ctx, args, 2, 2, 'ldexp');
    const x = numArg(ctx, args[0], 'ldexp');
    const i = intArg(ctx, args[1], 'ldexp');
    if (i === null) return UNK(BIGDESC);
    if (Number.isNaN(x)) return F(NaN);
    const r = x * Math.pow(2, i);
    if (!Number.isFinite(r) && Number.isFinite(x) && x !== 0) ctx.err('OverflowError', 'math range error', '');
    return F(r);
  },
  factorial: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'factorial'); arity(ctx, args, 1, 1, 'factorial');
    const n = intArg(ctx, args[0], 'factorial');
    if (n === null) return UNK(BIGDESC);
    if (n < 0) ctx.err('ValueError', 'factorial() not defined for negative values', '');
    let r = 1n;
    for (let k = 2n; k <= BigInt(n); k++) r *= k;
    return SAFE(Number(r)) && BigInt(Number(r)) === r ? I(Number(r)) : UNK(BIGDESC);
  },
  gcd: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'gcd');
    let g = 0n;
    for (const a of args) { const iv = intArg(ctx, a, 'gcd'); if (iv === null) return UNK(BIGDESC); let x = BigInt(Math.abs(iv)); let y = g; while (y !== 0n) { const t = x % y; x = y; y = t; } g = x; }
    return SAFE(Number(g)) ? I(Number(g)) : UNK(BIGDESC);
  },
  lcm: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'lcm');
    let l = 1n;
    for (const a of args) {
      const iv = intArg(ctx, a, 'lcm'); if (iv === null) return UNK(BIGDESC);
      const x = BigInt(Math.abs(iv));
      if (x === 0n || l === 0n) { l = 0n; continue; }
      let p = l, q = x; while (q !== 0n) { const t = p % q; p = q; q = t; }
      l = (l / p) * x;
    }
    return SAFE(Number(l)) && BigInt(Number(l)) === l ? I(Number(l)) : UNK(BIGDESC);
  },
  comb: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'comb'); arity(ctx, args, 2, 2, 'comb');
    const n = intArg(ctx, args[0], 'comb'), k = intArg(ctx, args[1], 'comb');
    if (n === null || k === null) return UNK(BIGDESC);
    if (n < 0 || k < 0) ctx.err('ValueError', 'comb() not defined for negative values', '');
    if (k > n) return I(0);
    const kk = Math.min(k, n - k);
    let r = 1n;
    for (let i = 0; i < kk; i++) r = (r * BigInt(n - i)) / BigInt(i + 1);
    return SAFE(Number(r)) && BigInt(Number(r)) === r ? I(Number(r)) : UNK(BIGDESC);
  },
  perm: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'perm'); arity(ctx, args, 1, 2, 'perm');
    const n = intArg(ctx, args[0], 'perm');
    const k = args.length === 2 ? intArg(ctx, args[1], 'perm') : n;
    if (n === null || k === null) return UNK(BIGDESC);
    if (n < 0 || k < 0) ctx.err('ValueError', 'perm() not defined for negative values', '');
    if (k > n) return I(0);
    let r = 1n;
    for (let i = 0; i < k; i++) r *= BigInt(n - i);
    return SAFE(Number(r)) && BigInt(Number(r)) === r ? I(Number(r)) : UNK(BIGDESC);
  },
  isqrt: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'isqrt'); arity(ctx, args, 1, 1, 'isqrt');
    const n = intArg(ctx, args[0], 'isqrt');
    if (n === null) return UNK(BIGDESC);
    if (n < 0) ctx.err('ValueError', 'isqrt() argument must be nonnegative', '');
    const N = BigInt(n);
    let r = BigInt(Math.floor(Math.sqrt(n)));
    while ((r + 1n) * (r + 1n) <= N) r += 1n;
    while (r * r > N) r -= 1n;
    return I(Number(r));
  },
  isfinite: (ctx, args, kwargs) => { noKwargs(ctx, kwargs, 'isfinite'); arity(ctx, args, 1, 1, 'isfinite'); return BOOL(Number.isFinite(numArg(ctx, args[0], 'isfinite'))); },
  isinf: (ctx, args, kwargs) => { noKwargs(ctx, kwargs, 'isinf'); arity(ctx, args, 1, 1, 'isinf'); const x = numArg(ctx, args[0], 'isinf'); return BOOL(x === Infinity || x === -Infinity); },
  isnan: (ctx, args, kwargs) => { noKwargs(ctx, kwargs, 'isnan'); arity(ctx, args, 1, 1, 'isnan'); return BOOL(Number.isNaN(numArg(ctx, args[0], 'isnan'))); },
  isclose: (ctx, args, kwargs) => {
    arity(ctx, args, 2, 2, 'isclose');
    const relTol = kwargs && 'rel_tol' in kwargs ? numArg(ctx, kwargs.rel_tol, 'isclose') : 1e-09;
    const absTol = kwargs && 'abs_tol' in kwargs ? numArg(ctx, kwargs.abs_tol, 'isclose') : 0.0;
    for (const k of Object.keys(kwargs || {})) if (k !== 'rel_tol' && k !== 'abs_tol') ctx.err('TypeError', 'math.isclose() にキーワード引数「' + k + '」はありません', '');
    if (relTol < 0 || absTol < 0) ctx.err('ValueError', 'tolerances must be non-negative', '');
    const a = numArg(ctx, args[0], 'isclose'), b = numArg(ctx, args[1], 'isclose');
    if (a === b) return BOOL(true);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return BOOL(false);
    return BOOL(Math.abs(a - b) <= Math.max(relTol * Math.max(Math.abs(a), Math.abs(b)), absTol));
  },
  fsum: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'fsum'); arity(ctx, args, 1, 1, 'fsum');
    const items = seqArg(ctx, args[0], 'fsum');
    const terms = [];
    let sawPosInf = false, sawNegInf = false, sawNaN = false;
    for (const it of items) {
      const x = numArg(ctx, it, 'fsum');
      if (Number.isNaN(x)) { sawNaN = true; continue; }
      if (!Number.isFinite(x)) { if (x > 0) sawPosInf = true; else sawNegInf = true; continue; }
      if (x !== 0) terms.push(exactParts(x));
    }
    if (sawPosInf && sawNegInf) ctx.err('ValueError', '-inf + inf in fsum', '');
    if (sawNaN) return F(NaN);
    if (sawPosInf) return F(Infinity);
    if (sawNegInf) return F(-Infinity);
    if (!terms.length) return F(0); // CPython の fsum は符号なしの 0.0 を返す（-0.0 のみの和でも 0.0）
    const r = exactSumToFloat(terms);
    if (r.overflow) ctx.err('OverflowError', 'intermediate overflow in fsum', '');
    return F(r.v);
  },
  prod: (ctx, args, kwargs) => {
    arity(ctx, args, 1, 1, 'prod');
    for (const k of Object.keys(kwargs || {})) if (k !== 'start') ctx.err('TypeError', 'math.prod() にキーワード引数「' + k + '」はありません', '');
    const items = seqArg(ctx, args[0], 'prod');
    const startV = kwargs && 'start' in kwargs ? kwargs.start : I(1);
    let allInt = (ctx.isNum(startV) && !startV.f) || ctx.isBool(startV);
    for (const it of items) { if (!((ctx.isNum(it) && !it.f) || ctx.isBool(it))) { allInt = false; break; } }
    if (allInt) {
      let r = BigInt(ctx.int(startV));
      for (const it of items) r *= BigInt(ctx.int(it));
      return SAFE(Number(r)) && BigInt(Number(r)) === r ? I(Number(r)) : UNK(BIGDESC);
    }
    let r = numArg(ctx, startV, 'prod');
    for (const it of items) r *= numArg(ctx, it, 'prod');
    return F(r);
  },
  sumprod: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'sumprod'); arity(ctx, args, 2, 2, 'sumprod');
    const p = seqArg(ctx, args[0], 'sumprod'), q = seqArg(ctx, args[1], 'sumprod');
    if (p.length !== q.length) ctx.err('ValueError', 'Inputs are not the same length', '');
    let allInt = true;
    for (let i = 0; i < p.length; i++) { if (!((ctx.isNum(p[i]) && !p[i].f) || ctx.isBool(p[i])) || !((ctx.isNum(q[i]) && !q[i].f) || ctx.isBool(q[i]))) { allInt = false; break; } }
    if (allInt) {
      let r = 0n;
      for (let i = 0; i < p.length; i++) r += BigInt(ctx.int(p[i])) * BigInt(ctx.int(q[i]));
      return SAFE(Number(r)) && BigInt(Number(r)) === r ? I(Number(r)) : UNK(BIGDESC);
    }
    const terms = [];
    let infSign = 0;
    for (let i = 0; i < p.length; i++) {
      const a = numArg(ctx, p[i], 'sumprod'), b = numArg(ctx, q[i], 'sumprod');
      if (Number.isNaN(a) || Number.isNaN(b)) return F(NaN);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        const pr = a * b;
        if (Number.isNaN(pr)) return F(NaN);
        const sg = pr > 0 ? 1 : -1;
        if (infSign !== 0 && infSign !== sg) return F(NaN);
        infSign = sg;
        continue;
      }
      const [ma, ea] = exactParts(a), [mb, eb] = exactParts(b);
      terms.push([ma * mb, ea + eb]);
    }
    if (infSign !== 0) return F(infSign > 0 ? Infinity : -Infinity);
    if (!terms.length) return I(0);
    const r = exactSumToFloat(terms);
    if (r.overflow) return F(Infinity);
    return F(r.v);
  },
  dist: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'dist'); arity(ctx, args, 2, 2, 'dist');
    const p = seqArg(ctx, args[0], 'dist'), q = seqArg(ctx, args[1], 'dist');
    if (p.length !== q.length) ctx.err('ValueError', 'both points must have the same number of dimensions', '');
    const diffs = p.map((v, i) => numArg(ctx, v, 'dist') - numArg(ctx, q[i], 'dist'));
    return F(Math.hypot(...diffs));
  },
  hypot: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'hypot');
    const xs = args.map(a => numArg(ctx, a, 'hypot'));
    return F(Math.hypot(...xs));
  },
  nextafter: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'nextafter'); arity(ctx, args, 2, 2, 'nextafter');
    const x = numArg(ctx, args[0], 'nextafter'), y = numArg(ctx, args[1], 'nextafter');
    if (Number.isNaN(x) || Number.isNaN(y)) return F(NaN);
    if (x === y) return F(y);
    if (x === 0) return F(y > 0 ? b2f(1n) : b2f((1n << 63n) | 1n));
    let b = f2b(x);
    const towardInf = (y > x) === (x > 0);
    b = towardInf ? b + 1n : b - 1n;
    return F(b2f(b));
  },
  ulp: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'ulp'); arity(ctx, args, 1, 1, 'ulp');
    const x = numArg(ctx, args[0], 'ulp');
    if (Number.isNaN(x)) return F(NaN);
    if (!Number.isFinite(x)) return F(Infinity);
    const ax = Math.abs(x);
    if (ax === 0) return F(b2f(1n));
    const b = f2b(ax);
    const expField = Number((b >> 52n) & 0x7ffn);
    if (expField === 0) return F(b2f(1n));
    const ef = expField - 52; // ulp の値 2^(E-1023-52) の指数フィールド
    if (ef >= 1) return F(b2f(BigInt(ef) << 52n));
    return F(b2f(1n << BigInt(expField - 1))); // 結果が非正規化数になる場合
  },
  fma: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'fma'); arity(ctx, args, 3, 3, 'fma');
    const x = numArg(ctx, args[0], 'fma'), y = numArg(ctx, args[1], 'fma'), z = numArg(ctx, args[2], 'fma');
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return F(NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const p = x * y;
      if (Number.isNaN(p)) return F(NaN);
      return F(p + z);
    }
    if (!Number.isFinite(z)) return F(z);
    const [mx, ex] = exactParts(x), [my, ey] = exactParts(y), [mz, ez] = exactParts(z);
    const r = exactSumToFloat([[mx * my, ex + ey], [mz, ez]]);
    if (r.overflow) ctx.err('OverflowError', 'math range error', '');
    return F(r.v);
  },
  /* 3.15 で追加（公式ドキュメントの記述に基づく実装） */
  fmax: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'fmax'); arity(ctx, args, 2, 2, 'fmax');
    const x = numArg(ctx, args[0], 'fmax'), y = numArg(ctx, args[1], 'fmax');
    if (Number.isNaN(x)) return F(y);
    if (Number.isNaN(y)) return F(x);
    return F(Math.max(x, y));
  },
  fmin: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'fmin'); arity(ctx, args, 2, 2, 'fmin');
    const x = numArg(ctx, args[0], 'fmin'), y = numArg(ctx, args[1], 'fmin');
    if (Number.isNaN(x)) return F(y);
    if (Number.isNaN(y)) return F(x);
    return F(Math.min(x, y));
  },
  signbit: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'signbit'); arity(ctx, args, 1, 1, 'signbit');
    const x = numArg(ctx, args[0], 'signbit');
    return BOOL((f2b(x) >> 63n) === 1n);
  },
  isnormal: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'isnormal'); arity(ctx, args, 1, 1, 'isnormal');
    const x = numArg(ctx, args[0], 'isnormal');
    return BOOL(Number.isFinite(x) && x !== 0 && Math.abs(x) >= MIN_NORMAL);
  },
  issubnormal: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'issubnormal'); arity(ctx, args, 1, 1, 'issubnormal');
    const x = numArg(ctx, args[0], 'issubnormal');
    return BOOL(Number.isFinite(x) && x !== 0 && Math.abs(x) < MIN_NORMAL);
  },
};

function frexpRaw(x) {
  const b = f2b(x);
  const expField = Number((b >> 52n) & 0x7ffn);
  const e = expField - 1022;
  const m = b2f((b & ~(0x7ffn << 52n)) | (1022n << 52n));
  return [m, e];
}

registerStdlibModule('math', {
  constants: {
    pi: F(Math.PI), e: F(Math.E), tau: F(2 * Math.PI), inf: F(Infinity), nan: F(NaN),
  },
  functions: FUNCTIONS,
});
