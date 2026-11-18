/* 高度モード B7 G1（数理・統計系）：cmath／fractions／numbers の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/cmath, fractions, numbers）と
 * CPython 3.12.3 実走（監査台帳は docs/audit/b7-g1-report.md）。
 * cmath はエンジンに複素数値型が無いため、実数定数（pi/e/tau/inf/nan）のみ
 * 束ね値で対応し、複素数を必要とする全項目は未対応（diag＋未確定値で正直に停止）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, NOT_HANDLED } from './stdlib-registry.js';

const { NUM, BOOL, NONE, TUPLE, UNK } = PyAPI;
const F = (v) => NUM(v, true);
const I = (v) => NUM(v, false);
const BIGDESC = 'とても大きな整数・この説明では正確に計算しません';
const SAFE_BIG = (b) => b <= 9007199254740991n && b >= -9007199254740991n;
export const intVal = (b) => (SAFE_BIG(b) ? I(Number(b)) : UNK(BIGDESC));

/* ---------- BigInt 有理数ユーティリティ（群内共通） ---------- */
export function bigGcd(a, b) {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b !== 0n) { const t = a % b; a = b; b = t; }
  return a;
}
export function normFrac(n, d) {
  if (d < 0n) { n = -n; d = -d; }
  if (n === 0n) return [0n, 1n];
  const g = bigGcd(n, d);
  return [n / g, d / g];
}
export function floorDivBig(a, b) { // b > 0 前提
  let q = a / b;
  if (a % b !== 0n && a < 0n) q -= 1n;
  return q;
}
/* double の厳密な二進有理数分解：x = m * 2^e */
const _dv = new DataView(new ArrayBuffer(8));
export function floatParts(x) {
  _dv.setFloat64(0, x);
  const bits = _dv.getBigUint64(0);
  const neg = (bits >> 63n) === 1n;
  const ef = Number((bits >> 52n) & 0x7ffn);
  const frac = bits & ((1n << 52n) - 1n);
  if (ef === 0) return [neg ? -frac : frac, -1074];
  return [(neg ? -1n : 1n) * (frac + (1n << 52n)), ef - 1075];
}
export function floatToRatio(x) {
  const [m, e] = floatParts(x);
  return e >= 0 ? [m << BigInt(e), 1n] : [m, 1n << BigInt(-e)];
}
function bitLenBig(a) { return a <= 0n ? 0 : a.toString(2).length; }
/* 有理数 n/d（d>0）を最も近い double に正しく丸める（最近接・偶数）。 */
export function fracToFloat(n, d) {
  if (n === 0n) return 0;
  const neg = n < 0n;
  let N = neg ? -n : n;
  const D = d;
  let e = bitLenBig(N) - bitLenBig(D);
  // 2^e <= N/D < 2^(e+1) になるよう e を調整
  const cmpAt = (ee) => {
    if (ee >= 0) { const rhs = D << BigInt(ee); return N < rhs ? -1 : N === rhs ? 0 : 1; }
    const lhs = N << BigInt(-ee); return lhs < D ? -1 : lhs === D ? 0 : 1;
  };
  if (cmpAt(e) < 0) e -= 1;
  else if (cmpAt(e + 1) >= 0) e += 1;
  if (e > 1023) return neg ? -Infinity : Infinity;
  let result;
  if (e >= -1022) {
    const shift = 52 - e;
    let num, den;
    if (shift >= 0) { num = N << BigInt(shift); den = D; } else { num = N; den = D << BigInt(-shift); }
    let m = num / den;
    const r = num % den;
    const twice = r * 2n;
    if (twice > den || (twice === den && (m & 1n) === 1n)) m += 1n;
    if (m >> 53n) { m >>= 1n; e += 1; if (e > 1023) return neg ? -Infinity : Infinity; }
    result = Number(m) * Math.pow(2, e - 52);
  } else {
    // 非正規化数：2^-1074 を単位に丸める
    const shift = -1074 - 0; // value = N/D = m * 2^-1074 となる m を求める
    const num = N << 1074n; // N * 2^1074 / D
    let m = num / D;
    const r = num % D;
    const twice = r * 2n;
    if (twice > D || (twice === D && (m & 1n) === 1n)) m += 1n;
    result = Number(m) * Math.pow(2, -1074);
    void shift;
  }
  return neg ? -result : result;
}
/* CPython の数値ハッシュ（有理数）：sign * (num * den^-1 mod (2^61-1))、-1 は -2 */
const HASH_P = (1n << 61n) - 1n;
function modPowBig(base, exp, mod) {
  let r = 1n, b = base % mod, e = exp;
  while (e > 0n) { if (e & 1n) r = (r * b) % mod; b = (b * b) % mod; e >>= 1n; }
  return r;
}
export function rationalHash(n, d) {
  // n/d は既約でなくてよい（値としてのハッシュ）
  if (n === 0n) return 0n;
  const sign = n < 0n ? -1n : 1n;
  const num = (n < 0n ? -n : n) % HASH_P;
  // d の逆数：d = 2^k * odd の形とは限らないため Fermat（P は素数）で一般に求める
  const inv = modPowBig(d % HASH_P, HASH_P - 2n, HASH_P);
  let hv = (num * inv) % HASH_P;
  hv *= sign;
  if (hv === -1n) hv = -2n;
  return hv;
}
export function floatHash(x) {
  if (Number.isNaN(x)) return 0n;
  if (x === Infinity) return 314159n;
  if (x === -Infinity) return -314159n;
  const [n, d] = floatToRatio(x);
  return rationalHash(n, d);
}

/* ================= cmath =================
 * エンジンに複素数値型が存在しないため、複素数を返す／受け取る項目は
 * すべて未対応。実数の定数だけを束ね値として正確に解決する。 */
const CMATH_FUNCS = ['acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'cos', 'cosh',
  'exp', 'isclose', 'isfinite', 'isinf', 'isnan', 'log', 'log10', 'phase', 'polar',
  'rect', 'sin', 'sinh', 'sqrt', 'tan', 'tanh'];
const cmathFunctions = {};
for (const name of CMATH_FUNCS) {
  cmathFunctions[name] = (ctx) => {
    ctx.diag('cmath.' + name + ' は複素数を扱いますが、本エンジンには複素数値型がないため未対応です（値は確定しません）');
    return ctx.unk('複素数（未対応）');
  };
}
registerStdlibModule('cmath', {
  constants: {
    pi: F(Math.PI), e: F(Math.E), tau: F(2 * Math.PI), inf: F(Infinity), nan: F(NaN),
  },
  functions: cmathFunctions,
});

/* ================= fractions.Fraction ================= */
const FRAC_Q = 'fractions.Fraction';
export const isFrac = (v) => !!v && v.__native === FRAC_Q;
export const fracData = (v) => v.data; // { n: BigInt, d: BigInt }（既約・d>0）
export function makeFrac(ctx, n, d) {
  const [nn, dd] = normFrac(n, d);
  return ctx.native(FRAC_Q, { n: nn, d: dd });
}
/* 値を有理数として解釈する：{n, d} | {float: x} | null */
function asRational(ctx, v) {
  if (isFrac(v)) return { n: v.data.n, d: v.data.d };
  if (ctx.isBool(v)) return { n: v.v ? 1n : 0n, d: 1n };
  if (ctx.isNum(v) && !v.f) {
    if (!Number.isSafeInteger(v.v)) return null;
    return { n: BigInt(v.v), d: 1n };
  }
  return null;
}
function asFloatOperand(ctx, v) {
  if (ctx.isNum(v)) return v.v;
  if (ctx.isBool(v)) return v.v ? 1 : 0;
  if (isFrac(v)) return fracToFloat(v.data.n, v.data.d);
  return null;
}
const DIGITS = '\\d(?:_?\\d)*';
const FRAC_STR_RE = new RegExp('^([+-]?)(' + DIGITS + ')?(?:\\.(' + DIGITS + ')?)?(?:[eE]([+-]?\\d(?:_?\\d)*))?$');
function parseFractionString(ctx, s) {
  const orig = s;
  const t = s.trim();
  const fail = () => ctx.err('ValueError', "Invalid literal for Fraction: " + ctx.repr(orig), '');
  if (t.includes('/')) {
    const parts = t.split('/');
    if (parts.length !== 2) fail();
    const mNum = new RegExp('^([+-]?)(' + DIGITS + ')$').exec(parts[0].trim());
    const mDen = new RegExp('^(' + DIGITS + ')$').exec(parts[1].trim());
    if (!mNum || !mDen) fail();
    let n = BigInt(mNum[2].replace(/_/g, ''));
    if (mNum[1] === '-') n = -n;
    const d = BigInt(mDen[1].replace(/_/g, ''));
    if (d === 0n) ctx.err('ZeroDivisionError', 'Fraction(' + n.toString() + ', 0)', '');
    return [n, d];
  }
  const m = FRAC_STR_RE.exec(t);
  if (!m || (m[2] === undefined && m[3] === undefined)) fail();
  const intPart = (m[2] || '').replace(/_/g, '');
  const fracPart = (m[3] || '').replace(/_/g, '');
  let n = BigInt((intPart + fracPart) || '0');
  let d = 10n ** BigInt(fracPart.length);
  if (m[4] !== undefined) {
    const exp = BigInt(m[4].replace(/_/g, ''));
    if (exp >= 0n) n *= 10n ** exp; else d *= 10n ** (-exp);
  }
  if (m[1] === '-') n = -n;
  return [n, d];
}
function floatRatioOrErr(ctx, x) {
  if (Number.isNaN(x)) ctx.err('ValueError', 'cannot convert NaN to integer ratio', '');
  if (!Number.isFinite(x)) ctx.err('OverflowError', 'cannot convert Infinity to integer ratio', '');
  return floatToRatio(x);
}
function constructFraction(ctx, args, kwargs) {
  const hasKwN = kwargs && 'numerator' in kwargs;
  const hasKwD = kwargs && 'denominator' in kwargs;
  if (args.length > 2) ctx.err('TypeError', 'Fraction() は引数を最大で2つまでしか取りません（' + args.length + '個渡されました）', '');
  if (hasKwN && args.length >= 1) ctx.err('TypeError', 'Fraction() に numerator が2つ渡されています', '');
  if (hasKwD && args.length >= 2) ctx.err('TypeError', 'Fraction() に denominator が2つ渡されています', '');
  const numV = args.length >= 1 ? args[0] : hasKwN ? kwargs.numerator : I(0);
  const denGiven = args.length >= 2 || hasKwD;
  const denV = args.length >= 2 ? args[1] : hasKwD ? kwargs.denominator : NONE;
  if (ctx.isUnk(numV) || (denGiven && ctx.isUnk(denV))) {
    ctx.diag('Fraction の引数が確定しないため、値は確定しません');
    return ctx.unk('Fraction の値');
  }
  if (!denGiven || (denV && ctx.isNone(denV))) {
    if (isFrac(numV)) return makeFrac(ctx, numV.data.n, numV.data.d);
    const r = asRational(ctx, numV);
    if (r) return makeFrac(ctx, r.n, r.d);
    if (ctx.isNum(numV) && numV.f) { const [n, d] = floatRatioOrErr(ctx, numV.v); return makeFrac(ctx, n, d); }
    if (typeof numV === 'string') { const [n, d] = parseFractionString(ctx, numV); return makeFrac(ctx, n, d); }
    if (numV && numV.__native === 'decimal.Decimal') {
      ctx.diag('Decimal から Fraction への変換は decimal 実装との連携が必要なため未検証です');
      return ctx.unk('Fraction の値（Decimal 由来・未検証）');
    }
    ctx.err('TypeError', 'argument should be a string or a Rational instance', '');
  }
  const rn = asRational(ctx, numV);
  const rd = asRational(ctx, denV);
  if (!rn || !rd) ctx.err('TypeError', 'both arguments should be Rational instances', '');
  if (rd.n === 0n) ctx.err('ZeroDivisionError', 'Fraction(' + rn.n.toString() + ', 0)', '');
  // (rn.n/rn.d) / (rd.n/rd.d)
  return makeFrac(ctx, rn.n * rd.d, rn.d * rd.n);
}
function roundHalfEvenDiv(n, d) { // d>0。n/d を最近接整数へ（同点は偶数）
  const q = floorDivBig(n, d);
  const r = n - q * d;
  const twice = r * 2n;
  if (twice < d) return q;
  if (twice > d) return q + 1n;
  return (q & 1n) === 0n ? q : q + 1n;
}
/* 正確な10進書式（__format__ の e/f/g/% 用）：digits 生成 */
function roundScaledDigits(n, d, scaleExp) {
  // |n|/d * 10^scaleExp を整数へ最近接・偶数丸めした BigInt（n は符号なし）
  if (scaleExp >= 0) {
    const num = n * (10n ** BigInt(scaleExp));
    return roundHalfEvenDiv(num, d);
  }
  return roundHalfEvenDiv(n, d * (10n ** BigInt(-scaleExp)));
}
function formatFloatStyle(ctx, self, spec) {
  // spec は型指定子を含む全体。float 書式規則を有理数の厳密値で評価する。
  const m = /^([^{}<>=\^]*?)([<>=\^])?([+\- ])?(#)?(0)?(\d*)([,_]?)(?:\.(\d+))?([eEfFgG%])$/.exec(spec);
  if (!m) return null;
  const [, fillRaw, align, signOpt, alt, zero, widthS, groupCh, precS, type] = m;
  const fill = fillRaw || (zero ? '0' : ' ');
  const width = widthS ? parseInt(widthS, 10) : 0;
  const prec = precS !== undefined ? parseInt(precS, 10) : 6;
  const neg = self.data.n < 0n;
  const an = neg ? -self.data.n : self.data.n;
  const ad = self.data.d;
  let body;
  if (type === 'f' || type === 'F') {
    const scaled = roundScaledDigits(an, ad, prec);
    let s = scaled.toString().padStart(prec + 1, '0');
    body = prec > 0 ? s.slice(0, s.length - prec) + '.' + s.slice(s.length - prec) : s + (alt ? '.' : '');
    if (prec === 0 && alt) body += '.';
  } else if (type === '%') {
    const scaled = roundScaledDigits(an * 100n, ad, prec);
    let s = scaled.toString().padStart(prec + 1, '0');
    body = (prec > 0 ? s.slice(0, s.length - prec) + '.' + s.slice(s.length - prec) : s) + '%';
  } else if (type === 'e' || type === 'E') {
    if (an === 0n) {
      body = '0' + (prec > 0 ? '.' + '0'.repeat(prec) : (alt ? '.' : '')) + type + '+00';
    } else {
      // 10進指数を求める
      let exp10 = an.toString().length - ad.toString().length;
      const cmpPow = (e10) => { // an/ad と 10^e10 の比較
        if (e10 >= 0) { const rhs = ad * (10n ** BigInt(e10)); return an < rhs ? -1 : an === rhs ? 0 : 1; }
        const lhs = an * (10n ** BigInt(-e10)); return lhs < ad ? -1 : lhs === ad ? 0 : 1;
      };
      if (cmpPow(exp10) < 0) exp10 -= 1;
      else if (cmpPow(exp10 + 1) >= 0) exp10 += 1;
      let scaled = roundScaledDigits(an, ad, prec - exp10);
      let digits = scaled.toString();
      if (digits.length > prec + 1) { exp10 += 1; digits = digits.slice(0, prec + 1); }
      digits = digits.padStart(prec + 1, '0');
      body = digits[0] + (prec > 0 ? '.' + digits.slice(1) : (alt ? '.' : '')) +
        type + (exp10 < 0 ? '-' : '+') + String(Math.abs(exp10)).padStart(2, '0');
    }
  } else { // g / G
    const P = prec === 0 ? 1 : prec;
    if (an === 0n) {
      body = '0' + (alt ? '.' + '0'.repeat(P - 1) : '');
    } else {
      let exp10 = an.toString().length - ad.toString().length;
      const cmpPow = (e10) => {
        if (e10 >= 0) { const rhs = ad * (10n ** BigInt(e10)); return an < rhs ? -1 : an === rhs ? 0 : 1; }
        const lhs = an * (10n ** BigInt(-e10)); return lhs < ad ? -1 : lhs === ad ? 0 : 1;
      };
      if (cmpPow(exp10) < 0) exp10 -= 1;
      else if (cmpPow(exp10 + 1) >= 0) exp10 += 1;
      let scaled = roundScaledDigits(an, ad, P - 1 - exp10);
      let digits = scaled.toString();
      if (digits.length > P) { exp10 += 1; digits = digits.slice(0, P); }
      digits = digits.padStart(P, '0');
      if (exp10 < -4 || exp10 >= P) {
        let mant = digits[0];
        let rest = digits.slice(1);
        if (!alt) rest = rest.replace(/0+$/, '');
        if (rest || alt) mant += '.' + rest;
        body = mant + (type === 'G' ? 'E' : 'e') + (exp10 < 0 ? '-' : '+') + String(Math.abs(exp10)).padStart(2, '0');
      } else if (exp10 >= 0) {
        const ip = digits.slice(0, exp10 + 1).padEnd(exp10 + 1, '0');
        let fp = digits.slice(exp10 + 1);
        if (!alt) fp = fp.replace(/0+$/, '');
        body = ip + (fp || alt ? '.' + fp : '');
        if (alt && !fp) body = ip + '.' + '0'.repeat(Math.max(0, P - exp10 - 1));
      } else {
        let fp = '0'.repeat(-exp10 - 1) + digits;
        if (!alt) fp = fp.replace(/0+$/, '');
        body = '0.' + fp;
      }
    }
    if (type === 'G') body = body.replace('e', 'E');
  }
  /* R5 照合で判明した CPython との差異2件をここで是正する（__format__
   * メソッド経由にも効く）：(1) ','／'_' グルーピングは本体の整数部へ
   * 適用する（従来は正規表現で読み捨てていた）。(2) 配置の既定は数値と
   * して右揃え（従来は '<' で、幅指定時に左揃えになっていた）。 */
  if (groupCh) {
    const cut = body.search(/[.eE%]/);
    const ip = cut < 0 ? body : body.slice(0, cut);
    const rest = cut < 0 ? '' : body.slice(cut);
    if (/^\d+$/.test(ip)) body = ip.replace(/\B(?=(\d{3})+(?!\d))/g, groupCh) + rest;
  }
  const sign = neg ? '-' : signOpt === '+' ? '+' : signOpt === ' ' ? ' ' : '';
  let out = sign + body;
  if (width > out.length) {
    const pad = fill.repeat(width - out.length);
    const a = align || (zero ? '=' : '>');
    if (a === '>') out = pad + out;
    else if (a === '^') { const l = Math.floor((width - out.length) / 2); out = fill.repeat(l) + out + fill.repeat(width - out.length - l); }
    else if (a === '=') out = sign + pad + body;
    else out = out + pad;
  }
  return out;
}
function formatGeneral(ctx, self, spec) {
  // 型指定なし：str(self) への fill/align/sign/#/width/grouping（3.13+ の規則）
  const m = /^(?:(.)?([<>=\^]))?([+\- ])?(#)?(\d*)([,_])?$/.exec(spec);
  if (!m) return null;
  const [, fillCh, align, signOpt, alt, widthS, group] = m;
  let body = self.data.d === 1n && !alt ? self.data.n.toString() : self.data.n.toString() + '/' + self.data.d.toString();
  if (group) {
    const grp = (s) => {
      const negG = s.startsWith('-');
      const digs = negG ? s.slice(1) : s;
      return (negG ? '-' : '') + digs.replace(/\B(?=(\d{3})+(?!\d))/g, group);
    };
    body = body.split('/').map(grp).join('/');
  }
  const neg = self.data.n < 0n;
  const sign = !neg && signOpt === '+' ? '+' : !neg && signOpt === ' ' ? ' ' : '';
  let core = body.startsWith('-') ? body : sign + body;
  const width = widthS ? parseInt(widthS, 10) : 0;
  if (width > core.length) {
    const fill = fillCh || ' ';
    const a = align || '<';
    const padLen = width - core.length;
    if (a === '>') core = fill.repeat(padLen) + core;
    else if (a === '^') { const l = Math.floor(padLen / 2); core = fill.repeat(l) + core + fill.repeat(padLen - l); }
    else if (a === '=') { const sgn = core.match(/^[+\- ]/) ? core[0] : ''; core = sgn + fill.repeat(padLen) + core.slice(sgn.length); }
    else core = core + fill.repeat(padLen);
  }
  return core;
}
const FractionDef = {
  typeName: 'Fraction',
  parents: ['numbers.Rational'],
  construct: constructFraction,
  attrs: {
    numerator: (ctx, self) => intVal(self.data.n),
    denominator: (ctx, self) => intVal(self.data.d),
    real: (ctx, self) => self,
    imag: () => I(0),
  },
  methods: {
    as_integer_ratio: (ctx, self) => TUPLE([intVal(self.data.n), intVal(self.data.d)]),
    is_integer: (ctx, self) => BOOL(self.data.d === 1n),
    limit_denominator: (ctx, self, args, kwargs) => {
      let maxD = 1000000n;
      const v = args.length >= 1 ? args[0] : kwargs && 'max_denominator' in kwargs ? kwargs.max_denominator : null;
      if (v !== null && v !== undefined) {
        const r = asRational(ctx, v);
        if (!r || r.d !== 1n) ctx.err('TypeError', "'" + ctx.typeName(v) + "' object cannot be interpreted as an integer", '');
        maxD = r.n;
      }
      if (args.length > 1) ctx.err('TypeError', 'limit_denominator() は引数を最大で1つまでしか取りません', '');
      if (maxD < 1n) ctx.err('ValueError', 'max_denominator should be at least 1', '');
      if (self.data.d <= maxD) return makeFrac(ctx, self.data.n, self.data.d);
      let p0 = 0n, q0 = 1n, p1 = 1n, q1 = 0n;
      let n = self.data.n, d = self.data.d;
      for (;;) {
        const a = floorDivBig(n, d);
        const q2 = q0 + a * q1;
        if (q2 > maxD) break;
        const np1 = p0 + a * p1;
        p0 = p1; q0 = q1; p1 = np1; q1 = q2;
        const nd = n - a * d;
        n = d; d = nd;
      }
      const k = (maxD - q0) / q1;
      if (2n * d * (q0 + k * q1) <= self.data.d) return makeFrac(ctx, p1, q1);
      return makeFrac(ctx, p0 + k * p1, q0 + k * q1);
    },
    conjugate: (ctx, self) => self,
    __floor__: (ctx, self) => intVal(floorDivBig(self.data.n, self.data.d)),
    __ceil__: (ctx, self) => intVal(-floorDivBig(-self.data.n, self.data.d)),
    __round__: (ctx, self, args) => {
      if (args.length === 0 || (args.length === 1 && ctx.isNone(args[0]))) {
        return intVal(roundHalfEvenDiv(self.data.n, self.data.d));
      }
      const r = asRational(ctx, args[0]);
      if (!r || r.d !== 1n) ctx.err('TypeError', "'" + ctx.typeName(args[0]) + "' object cannot be interpreted as an integer", '');
      const nd = r.n;
      if (nd > 0n) {
        const shift = 10n ** nd;
        const q = roundHalfEvenDiv(self.data.n * shift, self.data.d);
        return makeFrac(ctx, q, shift);
      }
      const shift = 10n ** (-nd);
      const q = roundHalfEvenDiv(self.data.n, self.data.d * shift);
      return makeFrac(ctx, q * shift, 1n);
    },
    __format__: (ctx, self, args) => {
      const spec = args.length >= 1 ? ctx.str(args[0]) : '';
      if (spec === null) ctx.err('TypeError', 'format spec は文字列で指定してください', '');
      if (spec === '') return self.data.d === 1n ? self.data.n.toString() : self.data.n.toString() + '/' + self.data.d.toString();
      let out = null;
      if (/[eEfFgG%]$/.test(spec)) out = formatFloatStyle(ctx, self, spec);
      else out = formatGeneral(ctx, self, spec);
      if (out === null) { ctx.diag('この書式指定は未検証のため確定しません'); return ctx.unk('書式化した文字列（未検証）'); }
      return out;
    },
  },
  classMethods: {
    from_float: (ctx, args) => {
      if (args.length !== 1) ctx.err('TypeError', 'from_float() は引数を1つ取ります', '');
      const v = args[0];
      if (ctx.isNum(v) && v.f) { const [n, d] = floatRatioOrErr(ctx, v.v); return makeFrac(ctx, n, d); }
      const r = asRational(ctx, v);
      if (r) return makeFrac(ctx, r.n, r.d);
      ctx.err('TypeError', 'Fraction.from_float() only takes floats, not ' + ctx.repr(v) + ' (' + ctx.typeName(v) + ')', '');
    },
    from_decimal: (ctx, args) => {
      if (args.length !== 1) ctx.err('TypeError', 'from_decimal() は引数を1つ取ります', '');
      const v = args[0];
      const r = asRational(ctx, v);
      if (r) return makeFrac(ctx, r.n, r.d);
      if (v && v.__native === 'decimal.Decimal') {
        ctx.diag('Decimal から Fraction への変換は decimal 実装との連携が必要なため未検証です');
        return ctx.unk('Fraction の値（Decimal 由来・未検証）');
      }
      ctx.err('TypeError', 'Fraction.from_decimal() only takes Decimals, not ' + ctx.repr(v) + ' (' + ctx.typeName(v) + ')', '');
    },
    from_number: (ctx, args) => {
      // Python 3.14 で追加（公式ドキュメント 3.15 の受け入れ規則に基づく）
      if (args.length !== 1) ctx.err('TypeError', 'from_number() は引数を1つ取ります', '');
      const v = args[0];
      if (isFrac(v)) return makeFrac(ctx, v.data.n, v.data.d);
      const r = asRational(ctx, v);
      if (r) return makeFrac(ctx, r.n, r.d);
      if (ctx.isNum(v) && v.f) { const [n, d] = floatRatioOrErr(ctx, v.v); return makeFrac(ctx, n, d); }
      if (v && v.__native === 'decimal.Decimal') {
        ctx.diag('Decimal から Fraction への変換は decimal 実装との連携が必要なため未検証です');
        return ctx.unk('Fraction の値（Decimal 由来・未検証）');
      }
      ctx.err('TypeError', 'Fraction.from_number() only takes numbers with as_integer_ratio, not ' + ctx.repr(v) + ' (' + ctx.typeName(v) + ')', '');
    },
  },
  /* R5 フック配線：format()／f文字列の書式指定。__format__ メソッドと
   * 同じ整形関数（formatFloatStyle／formatGeneral）を使い結果を一致させる。
   * どちらの整形でも解釈できない書式は CPython どおり ValueError にする
   * （__format__ メソッド側は未検証として停止する従来動作のまま）。 */
  format: (ctx, self, spec) => {
    if (!spec) return self.data.d === 1n ? self.data.n.toString() : self.data.n.toString() + '/' + self.data.d.toString();
    let out = null;
    if (/[eEfFgG%]$/.test(spec)) out = formatFloatStyle(ctx, self, spec);
    else out = formatGeneral(ctx, self, spec);
    if (out === null) ctx.err('ValueError', "Invalid format specifier '" + spec + "' for object of type 'Fraction'", '');
    return out;
  },
  repr: (ctx, self) => 'Fraction(' + self.data.n.toString() + ', ' + self.data.d.toString() + ')',
  str: (ctx, self) => (self.data.d === 1n ? self.data.n.toString() : self.data.n.toString() + '/' + self.data.d.toString()),
  truthy: (ctx, self) => self.data.n !== 0n,
  eq: (ctx, self, other) => {
    if (isFrac(other)) return self.data.n === other.data.n && self.data.d === other.data.d;
    const r = asRational(ctx, other);
    if (r) return self.data.n * r.d === r.n * self.data.d;
    if (ctx.isNum(other) && other.f) {
      if (Number.isNaN(other.v)) return false;
      if (!Number.isFinite(other.v)) return false;
      const [fn, fd] = floatToRatio(other.v);
      return self.data.n * fd === fn * self.data.d;
    }
    if (ctx.isUnk(other)) return null;
    return false;
  },
  hash: (ctx, self) => 'rat:' + rationalHash(self.data.n, self.data.d).toString(),
  compare: (ctx, self, op, other) => {
    let cmp = null;
    const r = asRational(ctx, other);
    if (r) {
      const lhs = self.data.n * r.d, rhs = r.n * self.data.d;
      cmp = lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
    } else if (ctx.isNum(other) && other.f) {
      if (Number.isNaN(other.v)) return false;
      if (other.v === Infinity) cmp = -1;
      else if (other.v === -Infinity) cmp = 1;
      else { const [fn, fd] = floatToRatio(other.v); const lhs = self.data.n * fd, rhs = fn * self.data.d; cmp = lhs < rhs ? -1 : lhs > rhs ? 1 : 0; }
    } else if (isFrac(other)) {
      const lhs = self.data.n * other.data.d, rhs = other.data.n * self.data.d;
      cmp = lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
    }
    if (cmp === null) return null;
    return op === '<' ? cmp < 0 : op === '<=' ? cmp <= 0 : op === '>' ? cmp > 0 : cmp >= 0;
  },
  binop: (ctx, self, op, other, reflected) => {
    if (ctx.isUnk(other)) return ctx.unk('Fraction の演算結果');
    const a = reflected ? null : self;
    // 浮動小数点との混合演算は float へ寄せる（CPython の _operator_fallbacks）
    const otherIsFloat = ctx.isNum(other) && !!other.f;
    if (otherIsFloat || (reflected && false)) {
      const fa = fracToFloat(self.data.n, self.data.d);
      const fo = other.v;
      const x = reflected ? fo : fa, y = reflected ? fa : fo;
      switch (op) {
        case '+': return F(x + y);
        case '-': return F(x - y);
        case '*': return F(x * y);
        case '/':
          if (y === 0) ctx.err('ZeroDivisionError', 'float division by zero', '');
          return F(x / y);
        case '**': {
          const r = Math.pow(x, y);
          if (Number.isNaN(r)) { ctx.diag('結果が複素数になるため確定しません'); return ctx.unk('複素数になる冪乗（未対応）'); }
          return F(r);
        }
        case '//': if (y === 0) ctx.err('ZeroDivisionError', 'float floor division by zero', ''); return F(Math.floor(x / y));
        case '%': if (y === 0) ctx.err('ZeroDivisionError', 'float modulo', ''); return F(x - Math.floor(x / y) * y);
        default: return NOT_HANDLED;
      }
    }
    let ro = asRational(ctx, other);
    if (isFrac(other)) ro = { n: other.data.n, d: other.data.d };
    if (!ro) {
      if (op === '**' && (ctx.isNum(other) || isFrac(other))) { /* handled below */ }
      return NOT_HANDLED;
    }
    const L = reflected ? ro : { n: self.data.n, d: self.data.d };
    const R = reflected ? { n: self.data.n, d: self.data.d } : ro;
    switch (op) {
      case '+': return makeFrac(ctx, L.n * R.d + R.n * L.d, L.d * R.d);
      case '-': return makeFrac(ctx, L.n * R.d - R.n * L.d, L.d * R.d);
      case '*': return makeFrac(ctx, L.n * R.n, L.d * R.d);
      case '/':
        if (R.n === 0n) ctx.err('ZeroDivisionError', 'Fraction(1, 0)', '');
        return makeFrac(ctx, L.n * R.d, L.d * R.n);
      case '//': {
        if (R.n === 0n) ctx.err('ZeroDivisionError', 'integer division or modulo by zero', '');
        // floor((L.n*R.d) / (L.d*R.n))（分母の符号を正に直してから）
        let num = L.n * R.d, den = L.d * R.n;
        if (den < 0n) { num = -num; den = -den; }
        return intVal(floorDivBig(num, den));
      }
      case '%': {
        if (R.n === 0n) ctx.err('ZeroDivisionError', 'integer modulo by zero', '');
        let num = L.n * R.d, den = L.d * R.n;
        if (den < 0n) { num = -num; den = -den; }
        const q = floorDivBig(num, den);
        const remN = L.n * R.d - q * (L.d * R.n);
        return makeFrac(ctx, remN, L.d * R.d);
      }
      case '**': {
        if (R.d !== 1n) {
          const base = fracToFloat(L.n, L.d), ex = fracToFloat(R.n, R.d);
          const r = Math.pow(base, ex);
          if (Number.isNaN(r)) { ctx.diag('結果が複素数になるため確定しません'); return ctx.unk('複素数になる冪乗（未対応）'); }
          return F(r);
        }
        const p = R.n;
        if (p >= 0n) return makeFrac(ctx, L.n ** p, L.d ** p);
        if (L.n === 0n) ctx.err('ZeroDivisionError', 'Fraction(' + (L.d ** (-p)).toString() + ', 0)', '');
        if (L.n > 0n) return makeFrac(ctx, L.d ** (-p), L.n ** (-p));
        return makeFrac(ctx, (-L.d) ** (-p), (-L.n) ** (-p));
      }
      default: return NOT_HANDLED;
    }
  },
};
registerStdlibModule('fractions', { classes: { Fraction: FractionDef } });

/* ================= numbers =================
 * 抽象基底クラス群。Number のみ直接インスタンス化でき、他は CPython と
 * 同じ TypeError（抽象メソッド列挙）で停止する。parents で継承鎖を表す。 */
const ABSTRACT_MSGS = {
  Complex: "Can't instantiate abstract class Complex without an implementation for abstract methods '__abs__', '__add__', '__complex__', '__eq__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rmul__', '__rpow__', '__rtruediv__', '__truediv__', 'conjugate', 'imag', 'real'",
  Real: "Can't instantiate abstract class Real without an implementation for abstract methods '__abs__', '__add__', '__ceil__', '__eq__', '__float__', '__floor__', '__floordiv__', '__le__', '__lt__', '__mod__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rfloordiv__', '__rmod__', '__rmul__', '__round__', '__rpow__', '__rtruediv__', '__truediv__', '__trunc__'",
  Rational: "Can't instantiate abstract class Rational without an implementation for abstract methods '__abs__', '__add__', '__ceil__', '__eq__', '__floor__', '__floordiv__', '__le__', '__lt__', '__mod__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rfloordiv__', '__rmod__', '__rmul__', '__round__', '__rpow__', '__rtruediv__', '__trunc__', 'denominator', 'numerator'",
  Integral: "Can't instantiate abstract class Integral without an implementation for abstract methods '__abs__', '__add__', '__and__', '__ceil__', '__eq__', '__floor__', '__floordiv__', '__int__', '__invert__', '__le__', '__lshift__', '__lt__', '__mod__', '__mul__', '__neg__', '__or__', '__pos__', '__pow__', '__radd__', '__rand__', '__rfloordiv__', '__rlshift__', '__rmod__', '__rmul__', '__ror__', '__round__', '__rpow__', '__rrshift__', '__rshift__', '__rtruediv__', '__rxor__', '__truediv__', '__trunc__', '__xor__'",
};
function abstractDef(name, parents, extra) {
  return Object.assign({
    typeName: name,
    parents,
    construct: (ctx) => ctx.err('TypeError', ABSTRACT_MSGS[name], ''),
  }, extra || {});
}
/* builtinTypes（B7 追補 R4）：CPython の numbers.py の登録どおりに組み込み型を
 * 接続する。numbers.py の明示登録は Complex.register(complex)／
 * Real.register(float)／Integral.register(int) の3件で、bool は int の
 * サブクラスとして全階層に含まれる。基盤の isinstance は対象 ABC の
 * builtinTypes だけを見る（親 ABC へ辿らない）ため、各 ABC に到達可能な
 * 組み込み型を直接列挙する（CPython 3.12.3 実走の isinstance 行列と一致）：
 *   int／bool → Number／Complex／Real／Rational／Integral すべて True
 *   float     → Number／Complex／Real のみ True
 * Decimal は _pydecimal.py で Number にだけ登録される（Number.register(Decimal)。
 * Real には登録しないことが numbers.py／_pydecimal.py のコメントで明示）。
 * ネイティブ値である Decimal の接続は decimal 側の parents で行う（R4 報告書）。 */
registerStdlibModule('numbers', {
  classes: {
    Number: {
      typeName: 'Number',
      builtinTypes: ['int', 'float', 'bool'],
      construct: (ctx) => ctx.native('numbers.Number', {}),
    },
    Complex: abstractDef('Complex', ['numbers.Number'], {
      builtinTypes: ['int', 'float', 'bool'],
      classAttrs: {
        real: (ctx) => ctx.unk('property オブジェクト'),
        imag: (ctx) => ctx.unk('property オブジェクト'),
      },
      methods: {
        conjugate: (ctx, self) => { ctx.diag('Complex.conjugate は抽象メソッドです'); return ctx.unk('共役複素数'); },
      },
    }),
    Real: abstractDef('Real', ['numbers.Complex'], {
      builtinTypes: ['int', 'float', 'bool'],
    }),
    Rational: abstractDef('Rational', ['numbers.Real'], {
      builtinTypes: ['int', 'bool'],
      classAttrs: {
        numerator: (ctx) => ctx.unk('property オブジェクト'),
        denominator: (ctx) => ctx.unk('property オブジェクト'),
      },
    }),
    Integral: abstractDef('Integral', ['numbers.Rational'], {
      builtinTypes: ['int', 'bool'],
    }),
  },
});
