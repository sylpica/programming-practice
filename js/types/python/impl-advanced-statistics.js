/* 高度モード B7 G1：statistics モジュールの意味論実装。
 * 一次情報：CPython Lib/statistics.py（3.12.3 実走で照合、kde／kde_random は
 * 3.13 で追加されたため CPython 公式リポジトリの 3.13 ソースと公式ドキュ
 * メント 3.15 の例で照合）と公式ドキュメント 3.15。
 * CPython は内部で正確な有理数演算（_sum／_ss）を使うため、ここでも float を
 * 厳密な二進有理数として BigInt で蓄積し、結果を CPython と一致させる。
 * Decimal 入力は decimal 実装（他群）との連携が必要なため未検証に倒す。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, NOT_HANDLED } from './stdlib-registry.js';
import { floatToRatio, fracToFloat, normFrac, makeFrac, isFrac } from './impl-advanced-g1.js';
import { createMtState, seedStateFromValue, gaussFromState, mtRandom, randbelowBig } from './impl-advanced-g1-random.js';

const { NUM, BOOL, NONE, LIST, TUPLE, UNK } = PyAPI;
const F = (v) => NUM(v, true);
const I = (v) => NUM(v, false);
const SE = 'statistics.StatisticsError';
const statErr = (ctx, msg) => ctx.err(SE, msg, '');

/* ---------- 正確な有理数ユーティリティ ---------- */
const R = (n, d) => normFrac(n, d); // [n, d]（既約・d>0）
const rAdd = (a, b) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const rSub = (a, b) => R(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const rMul = (a, b) => R(a[0] * b[0], a[1] * b[1]);
const rDiv = (a, b) => R(a[0] * b[1], a[1] * b[0]);
const rCmp = (a, b) => { const l = a[0] * b[1], r = b[0] * a[1]; return l < r ? -1 : l > r ? 1 : 0; };
const ZERO = [0n, 1n];

/* 値の種別：'int' | 'float' | 'Fraction' | 'Decimal' | null（非数値） */
function kindOf(ctx, v) {
  if (ctx.isBool(v)) return 'int';
  if (ctx.isNum(v)) return v.f ? 'float' : 'int';
  if (isFrac(v)) return 'Fraction';
  if (v && typeof v.__native === 'string' && v.__native.startsWith('decimal.')) return 'Decimal';
  return null;
}
/* 厳密有理数化。有限でない float は { special: x }、変換不能は null。 */
function exactRatio(ctx, v) {
  const k = kindOf(ctx, v);
  if (k === 'int') return { r: [BigInt(ctx.isBool(v) ? (v.v ? 1 : 0) : v.v), 1n] };
  if (k === 'float') {
    if (!Number.isFinite(v.v)) return { special: v.v };
    return { r: floatToRatio(v.v) };
  }
  if (k === 'Fraction') return { r: [v.data.n, v.data.d] };
  return null;
}
function coerceKinds(kinds) {
  // CPython _coerce の要約：int は相手に合わせ、Fraction×float は float。
  let T = 'int';
  for (const k of kinds) {
    if (k === T) continue;
    if (T === 'int') { T = k; continue; }
    if (k === 'int') continue;
    if ((T === 'Fraction' && k === 'float') || (T === 'float' && k === 'Fraction')) { T = 'float'; continue; }
    return null; // Decimal 混在など
  }
  return T;
}
/* 有理数 [n,d] を種別 T のエンジン値へ変換する（CPython _convert）。 */
function convertRat(ctx, rat, T) {
  if (T === 'Fraction') return makeFrac(ctx, rat[0], rat[1]);
  if (T === 'int') {
    if (rat[1] === 1n) {
      const b = rat[0];
      return b <= 9007199254740991n && b >= -9007199254740991n ? I(Number(b)) : UNK('とても大きな整数・この説明では正確に計算しません');
    }
    return F(fracToFloat(rat[0], rat[1]));
  }
  return F(fracToFloat(rat[0], rat[1])); // float
}
function toFloat(ctx, v) {
  const k = kindOf(ctx, v);
  if (k === 'int') return ctx.isBool(v) ? (v.v ? 1 : 0) : v.v;
  if (k === 'float') return v.v;
  if (k === 'Fraction') return fracToFloat(v.data.n, v.data.d);
  return null;
}
/* データ列を取り出す。イテラブルでなければ TypeError、未確定値混在は null。 */
function dataOf(ctx, v, fname) {
  const items = ctx.iterable(v);
  if (items === null) {
    if (ctx.isUnk(v)) return null;
    ctx.err('TypeError', "'" + ctx.typeName(v) + "' object is not iterable", '');
  }
  return items;
}
function hasUnk(ctx, items) { return items.some((v) => ctx.isUnk(v)); }
/* 全要素を検証し { kinds, rats, specials } を返す。Decimal は未検証で null。 */
function analyze(ctx, items, fname) {
  const kinds = new Set();
  const rats = [];
  let special = null;
  for (const v of items) {
    const k = kindOf(ctx, v);
    if (k === 'Decimal') { ctx.diag('Decimal 入力の統計計算は decimal 実装との連携が必要なため未検証です'); return null; }
    if (k === null) ctx.err('TypeError', "can't convert type '" + ctx.typeName(v) + "' to numerator/denominator", '');
    kinds.add(k);
    const er = exactRatio(ctx, v);
    if (er.special !== undefined) { special = er.special; rats.push(null); }
    else rats.push(er.r);
  }
  return { kinds, rats, special };
}
/* CPython _sum：(T, total有理数, n)。special 時は total=null。 */
function exactSum(ctx, items, fname) {
  const a = analyze(ctx, items, fname);
  if (a === null) return null;
  const T = coerceKinds([...a.kinds]);
  if (T === null) ctx.err('TypeError', "don't know how to coerce types", '');
  if (a.special !== null) return { T, total: null, special: a.special, n: items.length, rats: a.rats };
  let total = ZERO;
  for (const r of a.rats) total = rAdd(total, r);
  return { T, total, special: null, n: items.length, rats: a.rats };
}
/* CPython _ss：(T, ssd有理数, c有理数, n)。cValue は xbar（エンジン値）か null。 */
function exactSs(ctx, items, cValue, fname) {
  if (cValue !== null && cValue !== undefined && !ctx.isNone(cValue)) {
    // c が与えられた場合は (x-c)^2 の _sum
    const ck = kindOf(ctx, cValue);
    if (ck === null || ck === 'Decimal') { ctx.diag('xbar の型が確定できないため未検証です'); return null; }
    const ce = exactRatio(ctx, cValue);
    if (ce.special !== undefined) { ctx.diag('xbar が有限でないため未検証です'); return null; }
    const diffs = [];
    const kinds = new Set();
    for (const v of items) {
      const k = kindOf(ctx, v);
      if (k === null || k === 'Decimal') ctx.err('TypeError', "can't convert type '" + ctx.typeName(v) + "' to numerator/denominator", '');
      kinds.add(k);
      const er = exactRatio(ctx, v);
      if (er.special !== undefined) { ctx.diag('有限でない値を含むため未検証です'); return null; }
      const d = rSub(er.r, ce.r);
      diffs.push(rMul(d, d));
    }
    kinds.add(ck);
    const T = coerceKinds([...kinds]);
    if (T === null) ctx.err('TypeError', "don't know how to coerce types", '');
    let total = ZERO;
    for (const d of diffs) total = rAdd(total, d);
    return { T, ssd: total, c: ce.r, n: items.length };
  }
  const a = analyze(ctx, items, fname);
  if (a === null) return null;
  const T = coerceKinds([...a.kinds]);
  if (T === null) ctx.err('TypeError', "don't know how to coerce types", '');
  const n = items.length;
  if (a.special !== null) { ctx.diag('有限でない値を含むため分散は確定しません'); return null; }
  if (!n) return { T, ssd: ZERO, c: ZERO, n: 0 };
  let sx = ZERO, sxx = ZERO;
  for (const r of a.rats) { sx = rAdd(sx, r); sxx = rAdd(sxx, rMul(r, r)); }
  const nn = BigInt(n);
  const c = rDiv(sx, [nn, 1n]);
  const ssd = rDiv(rSub(rMul([nn, 1n], sxx), rMul(sx, sx)), [nn, 1n]);
  return { T, ssd, c, n };
}
/* 有理数の正しく丸めた平方根（CPython _float_sqrt_of_frac の移植）。 */
function bigIsqrt(n) {
  if (n <= 0n) return 0n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2) + 1);
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) break; x = y; }
  while (x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}
function floatSqrtOfFrac(n, m) { // n/m >= 0
  if (n === 0n) return 0;
  const bitLen = (b) => b.toString(2).length;
  const q = Math.floor((bitLen(n) - bitLen(m) - 109) / 2);
  const isqrtRto = (nn, mm) => {
    const a = bigIsqrt(nn / mm);
    return a | (a * a * mm !== nn ? 1n : 0n);
  };
  let numerator, denominator;
  if (q >= 0) { numerator = isqrtRto(n, m << BigInt(2 * q)) << BigInt(q); denominator = 1n; }
  else { numerator = isqrtRto(n << BigInt(-2 * q), m); denominator = 1n << BigInt(-q); }
  return fracToFloat(numerator, denominator);
}
/* erf（不完全ガンマ関数の級数・連分数による。NormalDist.cdf／overlap 用） */
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgammaJs(x) {
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.abs(Math.sin(Math.PI * x))) - lgammaJs(1 - x);
  const xm = x - 1;
  let a = LANCZOS[0];
  const t = xm + 7.5;
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i] / (xm + i);
  return 0.5 * Math.log(2 * Math.PI) + (xm + 0.5) * Math.log(t) - t + Math.log(a);
}
function erfJs(x) {
  if (Number.isNaN(x)) return NaN;
  if (!Number.isFinite(x)) return x > 0 ? 1 : -1;
  const ax = Math.abs(x);
  if (ax === 0) return 0;
  const x2 = ax * ax;
  let p;
  if (x2 < 1.5) {
    let ap = 0.5, sum = 2 / 0.5, del = sum;
    // P(1/2, x2) の級数（sum は 1/a から始める形に直して使う）
    ap = 0.5; sum = 1 / 0.5; del = sum;
    for (let n = 0; n < 1000; n++) { ap += 1; del *= x2 / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-17) break; }
    p = sum * Math.exp(-x2 + 0.5 * Math.log(x2) - lgammaJs(0.5));
  } else {
    const FPMIN = 1e-300;
    let b = x2 + 1 - 0.5, c = 1 / FPMIN, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - 0.5);
      b += 2; d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-17) break;
    }
    const q = Math.exp(-x2 + 0.5 * Math.log(x2) - lgammaJs(0.5)) * h;
    p = 1 - q;
  }
  return x < 0 ? -p : p;
}

/* ---------- 関数群 ---------- */
function needData(ctx, v, fname) {
  const items = dataOf(ctx, v, fname);
  if (items === null) return null;
  if (hasUnk(ctx, items)) { ctx.diag('データに確定しない値が含まれるため結果は確定しません'); return null; }
  return items;
}
const FUNCTIONS = {
  mean: (ctx, args) => {
    const items = needData(ctx, args[0], 'mean');
    if (items === null) return ctx.unk('平均値');
    const s = exactSum(ctx, items, 'mean');
    if (s === null) return ctx.unk('平均値（未検証）');
    if (s.n < 1) statErr(ctx, 'mean requires at least one data point');
    if (s.special !== null) {
      // 有限でない値：float として単純に平均する（CPython の _sum の特殊分岐に相当）
      let total = 0;
      for (const v of items) total += toFloat(ctx, v);
      return F(total / s.n);
    }
    return convertRat(ctx, rDiv(s.total, [BigInt(s.n), 1n]), s.T);
  },
  fmean: (ctx, args, kwargs) => {
    const items = needData(ctx, args[0], 'fmean');
    if (items === null) return ctx.unk('平均値');
    const weightsV = args.length >= 2 ? args[1] : kwargs && 'weights' in kwargs ? kwargs.weights : undefined;
    const floats = items.map((v) => toFloat(ctx, v));
    if (floats.some((x) => x === null)) { ctx.diag('float に変換できない値が含まれるため未検証です'); return ctx.unk('平均値（未検証）'); }
    if (weightsV === undefined || ctx.isNone(weightsV)) {
      if (!items.length) statErr(ctx, 'fmean requires at least one data point');
      let total = ZERO; let ok = true;
      for (const x of floats) { if (!Number.isFinite(x)) { ok = false; break; } total = rAdd(total, floatToRatio(x)); }
      const sumF = ok ? fracToFloat(total[0], total[1]) : floats.reduce((a, b) => a + b, 0);
      return F(sumF / items.length);
    }
    const wItems = needData(ctx, weightsV, 'fmean');
    if (wItems === null) return ctx.unk('平均値');
    const wf = wItems.map((v) => toFloat(ctx, v));
    if (wf.some((x) => x === null)) { ctx.diag('float に変換できない重みが含まれるため未検証です'); return ctx.unk('平均値（未検証）'); }
    if (wf.length !== floats.length) statErr(ctx, 'data and weights must be the same length');
    let num = ZERO, den = ZERO, ok = true;
    for (let i = 0; i < floats.length; i++) {
      if (!Number.isFinite(floats[i]) || !Number.isFinite(wf[i])) { ok = false; break; }
      const [fn, fd] = floatToRatio(floats[i]); const [wn, wd] = floatToRatio(wf[i]);
      num = rAdd(num, rMul([fn, fd], [wn, wd]));
      den = rAdd(den, [wn, wd]);
    }
    const numF = ok ? fracToFloat(num[0], num[1]) : NaN;
    const denF = ok ? fracToFloat(den[0], den[1]) : wf.reduce((a, b) => a + b, 0);
    if (!denF) statErr(ctx, 'sum of weights must be non-zero');
    return F(numF / denF);
  },
  geometric_mean: (ctx, args) => {
    const items = needData(ctx, args[0], 'geometric_mean');
    if (items === null) return ctx.unk('幾何平均');
    if (!items.length) statErr(ctx, 'fmean requires at least one data point');
    let logSum = 0;
    for (const v of items) {
      const x = toFloat(ctx, v);
      if (x === null) { ctx.diag('float に変換できない値が含まれるため未検証です'); return ctx.unk('幾何平均（未検証）'); }
      if (!(x > 0)) statErr(ctx, 'geometric mean requires a non-empty dataset containing positive numbers');
      logSum += Math.log(x);
    }
    return F(Math.exp(logSum / items.length));
  },
  harmonic_mean: (ctx, args, kwargs) => {
    const items = needData(ctx, args[0], 'harmonic_mean');
    if (items === null) return ctx.unk('調和平均');
    const errmsg = 'harmonic mean does not support negative values';
    const n = items.length;
    if (n < 1) statErr(ctx, 'harmonic_mean requires at least one data point');
    const weightsV = args.length >= 2 ? args[1] : kwargs && 'weights' in kwargs ? kwargs.weights : undefined;
    if (n === 1 && (weightsV === undefined || ctx.isNone(weightsV))) {
      const x = items[0];
      if (kindOf(ctx, x) === null) ctx.err('TypeError', 'unsupported type', '');
      const r = exactRatio(ctx, x);
      if (r.r && rCmp(r.r, ZERO) < 0) statErr(ctx, errmsg);
      return x;
    }
    let wItems = null;
    if (weightsV !== undefined && !ctx.isNone(weightsV)) {
      wItems = needData(ctx, weightsV, 'harmonic_mean');
      if (wItems === null) return ctx.unk('調和平均');
      if (wItems.length !== n) statErr(ctx, 'Number of weights does not match data size');
    }
    // 重みの _sum（負はエラー）
    let sumWeights = [BigInt(n), 1n];
    let wRats = items.map(() => [1n, 1n]);
    if (wItems) {
      wRats = [];
      sumWeights = ZERO;
      for (const w of wItems) {
        const er = exactRatio(ctx, w);
        if (!er || er.special !== undefined) { ctx.diag('重みが確定できないため未検証です'); return ctx.unk('調和平均（未検証）'); }
        if (rCmp(er.r, ZERO) < 0) statErr(ctx, errmsg);
        wRats.push(er.r);
        sumWeights = rAdd(sumWeights, er.r);
      }
    }
    const kinds = new Set();
    let total = ZERO;
    for (let i = 0; i < n; i++) {
      const k = kindOf(ctx, items[i]);
      if (k === null || k === 'Decimal') ctx.err('TypeError', "can't convert type '" + ctx.typeName(items[i]) + "' to numerator/denominator", '');
      // CPython は w / x を先に計算してから _sum するため、項の型は
      // int/int→float、Fraction を含めば Fraction、float を含めば float。
      const wk = wItems ? kindOf(ctx, wItems[i]) : 'int';
      const termKind = (k === 'float' || wk === 'float') ? 'float' : (k === 'Fraction' || wk === 'Fraction') ? 'Fraction' : 'float';
      kinds.add(termKind);
      const er = exactRatio(ctx, items[i]);
      if (er.special !== undefined) { ctx.diag('有限でない値を含むため未検証です'); return ctx.unk('調和平均（未検証）'); }
      if (rCmp(er.r, ZERO) < 0) statErr(ctx, errmsg);
      if (er.r[0] === 0n) return I(0); // CPython は ZeroDivisionError を捕捉して 0 を返す
      total = rAdd(total, rDiv(wRats[i], er.r));
    }
    if (rCmp(total, ZERO) <= 0) statErr(ctx, 'Weighted sum must be positive');
    const T = coerceKinds([...kinds]);
    if (T === null) ctx.err('TypeError', "don't know how to coerce types", '');
    return convertRat(ctx, rDiv(sumWeights, total), T);
  },
  median: (ctx, args) => medianImpl(ctx, args, 'median'),
  median_low: (ctx, args) => medianImpl(ctx, args, 'low'),
  median_high: (ctx, args) => medianImpl(ctx, args, 'high'),
  median_grouped: (ctx, args, kwargs) => {
    const items = needData(ctx, args[0], 'median_grouped');
    if (items === null) return ctx.unk('中央値');
    const n = items.length;
    if (!n) statErr(ctx, 'no median for empty data');
    const sorted = sortValues(ctx, items);
    if (sorted === null) return ctx.unk('中央値');
    const x = sorted[Math.floor(n / 2)];
    let i = 0;
    while (i < n && compareValues(ctx, sorted[i], x) < 0) i++;
    let j = i;
    while (j < n && compareValues(ctx, sorted[j], x) === 0) j++;
    const intervalV = args.length >= 2 ? args[1] : kwargs && 'interval' in kwargs ? kwargs.interval : F(1.0);
    const interval = toFloat(ctx, intervalV);
    const xf = toFloat(ctx, x);
    if (interval === null || xf === null) ctx.err('TypeError', 'Value cannot be converted to a float', '');
    const L = xf - interval / 2.0;
    const cf = i, f = j - i;
    return F(L + interval * (n / 2 - cf) / f);
  },
  mode: (ctx, args) => {
    const items = needData(ctx, args[0], 'mode');
    if (items === null) return ctx.unk('最頻値');
    const counts = countValues(ctx, items);
    if (!counts.length) statErr(ctx, 'no mode for empty data');
    let best = counts[0];
    for (const c of counts) if (c.count > best.count) best = c;
    return best.value;
  },
  multimode: (ctx, args) => {
    const items = needData(ctx, args[0], 'multimode');
    if (items === null) return ctx.unk('最頻値のリスト');
    const counts = countValues(ctx, items);
    if (!counts.length) return LIST([]);
    const max = Math.max(...counts.map((c) => c.count));
    return LIST(counts.filter((c) => c.count === max).map((c) => c.value));
  },
  quantiles: (ctx, args, kwargs) => {
    const items = needData(ctx, args[0], 'quantiles');
    if (items === null) return ctx.unk('分位点のリスト');
    let n = 4;
    if (kwargs && 'n' in kwargs) { const nv = ctx.int(kwargs.n); if (nv === null) ctx.err('TypeError', 'n は整数で指定してください', ''); n = nv; }
    let method = 'exclusive';
    if (kwargs && 'method' in kwargs) { const mv = ctx.str(kwargs.method); if (mv === null) ctx.err('TypeError', 'method は文字列で指定してください', ''); method = mv; }
    if (n < 1) statErr(ctx, 'n must be at least 1');
    const sorted = sortValues(ctx, items);
    if (sorted === null) return ctx.unk('分位点のリスト');
    const ld = sorted.length;
    if (ld < 2) statErr(ctx, 'must have at least two data points');
    const rats = sorted.map((v) => exactRatio(ctx, v).r);
    const kinds = new Set(sorted.map((v) => kindOf(ctx, v)));
    let T = coerceKinds([...kinds]) || 'float';
    if (T === 'int') T = 'float'; // 補間後の / n は真除算なので int データでも float
    const out = [];
    if (method === 'inclusive') {
      const m = ld - 1;
      for (let i = 1; i < n; i++) {
        const j = Math.floor((i * m) / n), delta = (i * m) % n;
        const val = rDiv(rAdd(rMul(rats[j], [BigInt(n - delta), 1n]), rMul(rats[j + 1], [BigInt(delta), 1n])), [BigInt(n), 1n]);
        out.push(convertRat(ctx, val, T));
      }
      return LIST(out);
    }
    if (method === 'exclusive') {
      const m = ld + 1;
      for (let i = 1; i < n; i++) {
        let j = Math.floor((i * m) / n);
        j = j < 1 ? 1 : j > ld - 1 ? ld - 1 : j;
        const delta = i * m - j * n;
        const val = rDiv(rAdd(rMul(rats[j - 1], [BigInt(n - delta), 1n]), rMul(rats[j], [BigInt(delta), 1n])), [BigInt(n), 1n]);
        out.push(convertRat(ctx, val, T));
      }
      return LIST(out);
    }
    ctx.err('ValueError', "Unknown method: '" + method + "'", '');
  },
  variance: (ctx, args) => varImpl(ctx, args, false, false),
  pvariance: (ctx, args) => varImpl(ctx, args, true, false),
  stdev: (ctx, args) => varImpl(ctx, args, false, true),
  pstdev: (ctx, args) => varImpl(ctx, args, true, true),
  covariance: (ctx, args) => covImpl(ctx, args),
  correlation: (ctx, args, kwargs) => corrImpl(ctx, args, kwargs),
  linear_regression: (ctx, args, kwargs) => linregImpl(ctx, args, kwargs),
  kde: (ctx, args, kwargs) => kdeImpl(ctx, args, kwargs, false),
  kde_random: (ctx, args, kwargs) => kdeImpl(ctx, args, kwargs, true),
};
function medianImpl(ctx, args, which) {
  const items = needData(ctx, args[0], 'median');
  if (items === null) return ctx.unk('中央値');
  const n = items.length;
  if (!n) statErr(ctx, 'no median for empty data');
  const sorted = sortValues(ctx, items);
  if (sorted === null) return ctx.unk('中央値');
  if (n % 2 === 1) return sorted[Math.floor(n / 2)];
  if (which === 'low') return sorted[n / 2 - 1];
  if (which === 'high') return sorted[n / 2];
  const a = sorted[n / 2 - 1], b = sorted[n / 2];
  const ea = exactRatio(ctx, a), eb = exactRatio(ctx, b);
  if (!ea || !eb || ea.special !== undefined || eb.special !== undefined) {
    const fa = toFloat(ctx, a), fb = toFloat(ctx, b);
    return F((fa + fb) / 2);
  }
  let T = coerceKinds([kindOf(ctx, a), kindOf(ctx, b)]) || 'float';
  if (T === 'int') T = 'float'; // (a + b) / 2 は真除算なので int 同士でも float
  return convertRat(ctx, rDiv(rAdd(ea.r, eb.r), [2n, 1n]), T);
}
function sortValues(ctx, items) {
  const arr = items.slice();
  // 数値・Fraction は厳密有理数で、その他はエンジンの比較でソートする
  const allNumeric = arr.every((v) => kindOf(ctx, v) !== null && kindOf(ctx, v) !== 'Decimal');
  if (allNumeric) {
    const withR = arr.map((v) => ({ v, r: exactRatio(ctx, v) }));
    if (withR.some((x) => x.r.special !== undefined)) { ctx.diag('有限でない値の並び順は確定しません'); return null; }
    withR.sort((a, b) => rCmp(a.r.r, b.r.r));
    return withR.map((x) => x.v);
  }
  arr.sort((a, b) => {
    const c = ctx.compare('<', a, b);
    if (c === true) return -1;
    const e = ctx.compare('==', a, b);
    if (e === true) return 0;
    return 1;
  });
  return arr;
}
function compareValues(ctx, a, b) {
  const ea = exactRatio(ctx, a), eb = exactRatio(ctx, b);
  if (ea && eb && ea.special === undefined && eb.special === undefined) return rCmp(ea.r, eb.r);
  const c = ctx.compare('<', a, b);
  if (c === true) return -1;
  const e = ctx.compare('==', a, b);
  if (e === true) return 0;
  return 1;
}
function countValues(ctx, items) {
  const out = [];
  for (const v of items) {
    let key;
    const k = kindOf(ctx, v);
    if (k !== null && k !== 'Decimal') {
      const er = exactRatio(ctx, v);
      key = er.special !== undefined ? 'f:' + String(er.special) : 'r:' + er.r[0].toString() + '/' + er.r[1].toString();
    } else if (typeof v === 'string') key = 's:' + v;
    else key = 'x:' + ctx.repr(v);
    const found = out.find((c) => c.key === key);
    if (found) found.count++;
    else out.push({ key, value: v, count: 1 });
  }
  return out;
}
function varImpl(ctx, args, pop, sqrtIt) {
  const name = pop ? (sqrtIt ? 'pstdev' : 'pvariance') : (sqrtIt ? 'stdev' : 'variance');
  const items = needData(ctx, args[0], name);
  if (items === null) return ctx.unk('分散');
  const cValue = args.length >= 2 ? args[1] : undefined;
  const ss = exactSs(ctx, items, cValue === undefined || (cValue && ctx.isNone(cValue)) ? null : cValue, name);
  if (ss === null) return ctx.unk('分散（未検証）');
  if (pop) { if (ss.n < 1) statErr(ctx, name + ' requires at least one data point'); }
  else if (ss.n < 2) statErr(ctx, name + ' requires at least two data points');
  const denom = pop ? ss.n : ss.n - 1;
  const mss = rDiv(ss.ssd, [BigInt(denom), 1n]);
  if (sqrtIt) {
    if (ss.T === 'Decimal') { ctx.diag('Decimal の平方根は未検証です'); return ctx.unk('標準偏差（未検証）'); }
    return F(floatSqrtOfFrac(mss[0], mss[1]));
  }
  return convertRat(ctx, mss, ss.T);
}
/* float 経路の二変量統計（CPython の covariance 等は fsum／sumprod の float 計算） */
function floatList(ctx, v, fname) {
  const items = needData(ctx, v, fname);
  if (items === null) return null;
  const out = items.map((x) => toFloat(ctx, x));
  if (out.some((x) => x === null)) { ctx.diag('float に変換できない値が含まれるため未検証です'); return null; }
  return out;
}
function fsumFloats(xs) {
  let total = ZERO;
  for (const x of xs) {
    if (!Number.isFinite(x)) return xs.reduce((a, b) => a + b, 0);
    total = rAdd(total, floatToRatio(x));
  }
  return fracToFloat(total[0], total[1]);
}
function sumprodFloats(xs, ys) {
  let total = ZERO;
  for (let i = 0; i < xs.length; i++) {
    if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) return NaN;
    const [an, ad] = floatToRatio(xs[i]); const [bn, bd] = floatToRatio(ys[i]);
    total = rAdd(total, rMul([an, ad], [bn, bd]));
  }
  return fracToFloat(total[0], total[1]);
}
function covImpl(ctx, args) {
  const xs = floatList(ctx, args[0], 'covariance');
  const ys = floatList(ctx, args[1], 'covariance');
  if (xs === null || ys === null) return ctx.unk('共分散');
  const n = xs.length;
  if (ys.length !== n) statErr(ctx, 'covariance requires that both inputs have same number of data points');
  if (n < 2) statErr(ctx, 'covariance requires at least two data points');
  const xbar = fsumFloats(xs) / n, ybar = fsumFloats(ys) / n;
  const sxy = sumprodFloats(xs.map((x) => x - xbar), ys.map((y) => y - ybar));
  return F(sxy / (n - 1));
}
function rankCentered(data) {
  // CPython _rank(data, start=(n-1)/-2)：同値は平均ランク、中心化済み
  const n = data.length;
  const start = (n - 1) / -2;
  const pairs = data.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const result = new Array(n);
  let i = start - 1, pos = 0;
  while (pos < n) {
    let end = pos;
    while (end + 1 < n && pairs[end + 1][0] === pairs[pos][0]) end++;
    const size = end - pos + 1;
    const rank = i + (size + 1) / 2;
    for (let k = pos; k <= end; k++) result[pairs[k][1]] = rank;
    i += size;
    pos = end + 1;
  }
  return result;
}
function corrImpl(ctx, args, kwargs) {
  let xs = floatList(ctx, args[0], 'correlation');
  let ys = floatList(ctx, args[1], 'correlation');
  if (xs === null || ys === null) return ctx.unk('相関係数');
  const n = xs.length;
  if (ys.length !== n) statErr(ctx, 'correlation requires that both inputs have same number of data points');
  if (n < 2) statErr(ctx, 'correlation requires at least two data points');
  let method = 'linear';
  if (kwargs && 'method' in kwargs) { const mv = ctx.str(kwargs.method); if (mv !== null) method = mv; }
  if (method !== 'linear' && method !== 'ranked') ctx.err('ValueError', "Unknown method: '" + method + "'", '');
  if (method === 'ranked') { xs = rankCentered(xs); ys = rankCentered(ys); }
  else {
    const xbar = fsumFloats(xs) / n, ybar = fsumFloats(ys) / n;
    xs = xs.map((x) => x - xbar); ys = ys.map((y) => y - ybar);
  }
  const sxy = sumprodFloats(xs, ys), sxx = sumprodFloats(xs, xs), syy = sumprodFloats(ys, ys);
  const den = Math.sqrt(sxx * syy);
  if (den === 0) statErr(ctx, 'at least one of the inputs is constant');
  return F(sxy / den);
}
function linregImpl(ctx, args, kwargs) {
  const xs0 = floatList(ctx, args[0], 'linear_regression');
  const ys0 = floatList(ctx, args[1], 'linear_regression');
  if (xs0 === null || ys0 === null) return ctx.unk('回帰直線');
  const n = xs0.length;
  if (ys0.length !== n) statErr(ctx, 'linear regression requires that both inputs have same number of data points');
  if (n < 2) statErr(ctx, 'linear regression requires at least two data points');
  const proportional = kwargs && 'proportional' in kwargs ? ctx.truthy(kwargs.proportional) : false;
  let xs = xs0, ys = ys0, xbar = 0, ybar = 0;
  if (!proportional) {
    xbar = fsumFloats(xs0) / n; ybar = fsumFloats(ys0) / n;
    xs = xs0.map((x) => x - xbar); ys = ys0.map((y) => y - ybar);
  }
  const sxy = sumprodFloats(xs, ys) + 0.0;
  const sxx = sumprodFloats(xs, xs);
  if (sxx === 0) statErr(ctx, 'x is constant');
  const slope = sxy / sxx;
  const intercept = proportional ? 0.0 : ybar - slope * xbar;
  return ctx.native('statistics.LinearRegression', { slope, intercept });
}
/* ---------- NormalDist ---------- */
const ND_Q = 'statistics.NormalDist';
function ndFloat(ctx, v, fname) {
  const x = toFloat(ctx, v);
  if (x === null) ctx.err('TypeError', "NormalDist の引数には数値を使ってください（" + ctx.typeName(v) + '）', '');
  return x;
}
function invCdfStd(p) {
  // Wichura AS241（CPython _normal_dist_inv_cdf の移植、mu=0, sigma=1）
  const q = p - 0.5;
  if (Math.abs(q) <= 0.425) {
    const r = 0.180625 - q * q;
    const num = (((((((2509.0809287301226727 * r + 33430.575583588128105) * r + 67265.770927008700853) * r + 45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r + 133.14166789178437745) * r + 3.387132872796366608) * q;
    const den = (((((((5226.495278852854561 * r + 28729.085735721942674) * r + 39307.89580009271061) * r + 21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r + 42.313330701600911252) * r + 1.0);
    return num / den;
  }
  let r = q <= 0 ? p : 1.0 - p;
  r = Math.sqrt(-Math.log(r));
  let num, den;
  if (r <= 5.0) {
    r = r - 1.6;
    num = (((((((7.7454501427834140764e-4 * r + 0.0227238449892691845833) * r + 0.24178072517745061177) * r + 1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r + 4.6303378461565452959) * r + 1.42343711074968357734);
    den = (((((((1.05075007164441684324e-9 * r + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r + 0.14810397642748007459) * r + 0.6897673349851000455) * r + 1.6763848301838038494) * r + 2.05319162663775882187) * r + 1.0);
  } else {
    r = r - 5.0;
    num = (((((((2.01033439929228813265e-7 * r + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r + 0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r + 5.4637849111641143699) * r + 6.6579046435011037772);
    den = (((((((2.04426310338993978564e-15 * r + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r + 7.868691311456132591e-4) * r + 0.0148753612908506148525) * r + 0.13692988092273580531) * r + 0.59983220655588793769) * r + 1.0);
  }
  let x = num / den;
  if (q < 0) x = -x;
  return x;
}
const NormalDistDef = {
  typeName: 'NormalDist',
  construct: (ctx, args, kwargs) => {
    const muV = args.length >= 1 ? args[0] : kwargs && 'mu' in kwargs ? kwargs.mu : F(0.0);
    const sigmaV = args.length >= 2 ? args[1] : kwargs && 'sigma' in kwargs ? kwargs.sigma : F(1.0);
    const mu = ndFloat(ctx, muV, 'NormalDist');
    const sigma = ndFloat(ctx, sigmaV, 'NormalDist');
    if (sigma < 0.0) statErr(ctx, 'sigma must be non-negative');
    return ctx.native(ND_Q, { mu, sigma });
  },
  attrs: {
    mean: (ctx, self) => F(self.data.mu),
    median: (ctx, self) => F(self.data.mu),
    mode: (ctx, self) => F(self.data.mu),
    stdev: (ctx, self) => F(self.data.sigma),
    variance: (ctx, self) => F(self.data.sigma * self.data.sigma),
  },
  methods: {
    pdf: (ctx, self, args) => {
      const variance = self.data.sigma * self.data.sigma;
      if (!variance) statErr(ctx, 'pdf() not defined when sigma is zero');
      const x = ndFloat(ctx, args[0], 'pdf');
      const diff = x - self.data.mu;
      return F(Math.exp(diff * diff / (-2.0 * variance)) / Math.sqrt(2 * Math.PI * variance));
    },
    cdf: (ctx, self, args) => {
      if (!self.data.sigma) statErr(ctx, 'cdf() not defined when sigma is zero');
      const x = ndFloat(ctx, args[0], 'cdf');
      return F(0.5 * (1.0 + erfJs((x - self.data.mu) / (self.data.sigma * Math.SQRT2))));
    },
    inv_cdf: (ctx, self, args) => {
      const p = ndFloat(ctx, args[0], 'inv_cdf');
      if (p <= 0.0 || p >= 1.0) statErr(ctx, 'p must be in the range 0.0 < p < 1.0');
      return F(self.data.mu + invCdfStd(p) * self.data.sigma);
    },
    quantiles: (ctx, self, args, kwargs) => {
      let n = 4;
      const nv = args.length >= 1 ? args[0] : kwargs && 'n' in kwargs ? kwargs.n : undefined;
      if (nv !== undefined) { const v = ctx.int(nv); if (v === null) ctx.err('TypeError', 'n は整数で指定してください', ''); n = v; }
      const out = [];
      for (let i = 1; i < n; i++) {
        const p = i / n;
        if (p <= 0.0 || p >= 1.0) statErr(ctx, 'p must be in the range 0.0 < p < 1.0');
        out.push(F(self.data.mu + invCdfStd(p) * self.data.sigma));
      }
      return LIST(out);
    },
    overlap: (ctx, self, args) => {
      const other = args[0];
      if (!other || other.__native !== ND_Q) ctx.err('TypeError', 'Expected another NormalDist instance', '');
      let X = self.data, Y = other.data;
      if (Y.sigma < X.sigma || (Y.sigma === X.sigma && Y.mu < X.mu)) { const t = X; X = Y; Y = t; }
      const Xvar = X.sigma * X.sigma, Yvar = Y.sigma * Y.sigma;
      if (!Xvar || !Yvar) statErr(ctx, 'overlap() not defined when sigma is zero');
      const dv = Yvar - Xvar;
      const dm = Math.abs(Y.mu - X.mu);
      const cdfOf = (nd, x) => 0.5 * (1.0 + erfJs((x - nd.mu) / (nd.sigma * Math.SQRT2)));
      if (!dv) return F(1.0 - erfJs(dm / (2.0 * X.sigma * Math.SQRT2)));
      const a = X.mu * Yvar - Y.mu * Xvar;
      const b = X.sigma * Y.sigma * Math.sqrt(dm * dm + dv * Math.log(Yvar / Xvar));
      const x1 = (a + b) / dv, x2 = (a - b) / dv;
      return F(1.0 - (Math.abs(cdfOf(Y, x1) - cdfOf(X, x1)) + Math.abs(cdfOf(Y, x2) - cdfOf(X, x2))));
    },
    zscore: (ctx, self, args) => {
      if (!self.data.sigma) statErr(ctx, 'zscore() not defined when sigma is zero');
      const x = ndFloat(ctx, args[0], 'zscore');
      return F((x - self.data.mu) / self.data.sigma);
    },
    samples: (ctx, self, args, kwargs) => {
      const nv = args.length >= 1 ? args[0] : kwargs && 'n' in kwargs ? kwargs.n : undefined;
      const n = nv === undefined ? null : ctx.int(nv);
      if (n === null) ctx.err('TypeError', 'samples() には個数を整数で指定してください', '');
      const seedV = kwargs && 'seed' in kwargs ? kwargs.seed : undefined;
      if (seedV === undefined || ctx.isNone(seedV)) {
        ctx.diag('seed が無い NormalDist.samples はグローバルな乱数を使うため値は確定しません');
        return ctx.unk('標本のリスト（シード未指定）');
      }
      const st = createMtState();
      seedStateFromValue(ctx, st, seedV, 2);
      if (!st.known) { ctx.diag('シードが確定しないため標本は確定しません'); return ctx.unk('標本のリスト'); }
      const out = [];
      for (let i = 0; i < n; i++) {
        const g = gaussFromState(ctx, st, self.data.mu, self.data.sigma);
        if (g === null) return ctx.unk('標本のリスト');
        out.push(F(g));
      }
      return LIST(out);
    },
  },
  classMethods: {
    from_samples: (ctx, args) => {
      const items = needData(ctx, args[0], 'from_samples');
      if (items === null) return ctx.unk('NormalDist');
      const ss = exactSs(ctx, items, null, 'from_samples');
      if (ss === null) return ctx.unk('NormalDist（未検証）');
      if (ss.n < 2) statErr(ctx, 'stdev requires at least two data points');
      const mu = fracToFloat(ss.c[0], ss.c[1]);
      const mss = rDiv(ss.ssd, [BigInt(ss.n - 1), 1n]);
      const sigma = floatSqrtOfFrac(mss[0], mss[1]);
      return ctx.native(ND_Q, { mu, sigma });
    },
  },
  repr: (ctx, self) => 'NormalDist(mu=' + ctx.repr(F(self.data.mu)) + ', sigma=' + ctx.repr(F(self.data.sigma)) + ')',
  eq: (ctx, self, other) => (other && other.__native === ND_Q) ? (self.data.mu === other.data.mu && self.data.sigma === other.data.sigma) : false,
  hash: (ctx, self) => 'nd:' + self.data.mu + ':' + self.data.sigma,
  binop: (ctx, self, op, other, reflected) => {
    const me = self.data;
    const mk = (mu, sigma) => ctx.native(ND_Q, { mu, sigma });
    if (other && other.__native === ND_Q) {
      const o = other.data;
      if (op === '+') { const a = reflected ? o : me, b = reflected ? me : o; return mk(a.mu + b.mu, Math.hypot(a.sigma, b.sigma)); }
      if (op === '-') {
        if (reflected) return mk(o.mu - me.mu, Math.hypot(o.sigma, me.sigma));
        return mk(me.mu - o.mu, Math.hypot(me.sigma, o.sigma));
      }
      return NOT_HANDLED;
    }
    const c = toFloat(ctx, other);
    if (c === null) return NOT_HANDLED;
    if (op === '+') return mk(me.mu + c, me.sigma);
    if (op === '-') return reflected ? mk(c - me.mu, me.sigma) : mk(me.mu - c, me.sigma);
    if (op === '*') return mk(me.mu * c, me.sigma * Math.abs(c));
    if (op === '/') { if (reflected) return NOT_HANDLED; if (c === 0) ctx.err('ZeroDivisionError', 'float division by zero', ''); return mk(me.mu / c, me.sigma * Math.abs(c)); }
    return NOT_HANDLED;
  },
};
const LinearRegressionDef = {
  typeName: 'LinearRegression',
  attrs: {
    slope: (ctx, self) => F(self.data.slope),
    intercept: (ctx, self) => F(self.data.intercept),
  },
  repr: (ctx, self) => 'LinearRegression(slope=' + ctx.repr(F(self.data.slope)) + ', intercept=' + ctx.repr(F(self.data.intercept)) + ')',
  eq: (ctx, self, other) => (other && other.__native === 'statistics.LinearRegression')
    ? (self.data.slope === other.data.slope && self.data.intercept === other.data.intercept) : null,
  hash: (ctx, self) => 'lr:' + self.data.slope + ':' + self.data.intercept,
  len: () => 2,
  iter: (ctx, self) => [F(self.data.slope), F(self.data.intercept)],
  getitem: (ctx, self, key) => {
    const i = ctx.int(key);
    if (i === 0) return F(self.data.slope);
    if (i === 1 || i === -1) return F(self.data.intercept);
    if (i === -2) return F(self.data.slope);
    return NOT_HANDLED;
  },
};
/* ---------- kde / kde_random（CPython 3.13 ソースの移植） ---------- */
const KERNELS = {
  normal: { K: (t) => Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI), W: (t) => 0.5 * (1.0 + erfJs(t / Math.SQRT2)), support: null },
  logistic: { K: (t) => 0.5 / (1.0 + Math.cosh(t)), W: (t) => 1.0 - 1.0 / (Math.exp(t) + 1.0), support: null },
  sigmoid: { K: (t) => (1 / Math.PI) / Math.cosh(t), W: (t) => (2 / Math.PI) * Math.atan(Math.exp(t)), support: null },
  rectangular: { K: () => 0.5, W: (t) => 0.5 * t + 0.5, support: 1.0 },
  triangular: { K: (t) => 1.0 - Math.abs(t), W: (t) => t * t * (t < 0.0 ? 0.5 : -0.5) + t + 0.5, support: 1.0 },
  parabolic: { K: (t) => 0.75 * (1.0 - t * t), W: (t) => -0.25 * t ** 3 + 0.75 * t + 0.5, support: 1.0 },
  quartic: { K: (t) => (15 / 16) * (1.0 - t * t) ** 2, W: (t) => (3 / 16) * t ** 5 - (5 / 8) * t ** 3 + (15 / 16) * t + 0.5, support: 1.0 },
  triweight: { K: (t) => (35 / 32) * (1.0 - t * t) ** 3, W: (t) => (35 / 32) * (-(1 / 7) * t ** 7 + (3 / 5) * t ** 5 - t ** 3 + t) + 0.5, support: 1.0 },
  cosine: { K: (t) => (Math.PI / 4) * Math.cos((Math.PI / 2) * t), W: (t) => 0.5 * Math.sin((Math.PI / 2) * t) + 0.5, support: 1.0 },
};
KERNELS.gauss = KERNELS.normal;
KERNELS.uniform = KERNELS.rectangular;
KERNELS.epanechnikov = KERNELS.parabolic;
KERNELS.biweight = KERNELS.quartic;
function newtonInv(f, fPrime, estimate) {
  return (y) => {
    let x = estimate(y);
    let diff = f(x) - y;
    let guard = 0;
    while (Math.abs(diff) > 1e-12 && guard++ < 100) { x -= diff / fPrime(x); diff = f(x) - y; }
    return x;
  };
}
const quarticInv = newtonInv(KERNELS.quartic.W, KERNELS.quartic.K, (p) => {
  const sign = p <= 0.5 ? 1.0 : -1.0;
  const pp = p <= 0.5 ? p : 1.0 - p;
  let x = Math.pow(2.0 * pp, 0.4258865685331) - 1.0;
  if (pp >= 0.004 && pp < 0.499) x += 0.026818732 * Math.sin(7.101753784 * pp + 2.73230839482953);
  return x * sign;
});
const triweightInv = newtonInv(KERNELS.triweight.W, KERNELS.triweight.K, (p) => {
  const sign = p <= 0.5 ? 1.0 : -1.0;
  const pp = p <= 0.5 ? p : 1.0 - p;
  return (Math.pow(2.0 * pp, 0.3400218741872791) - 1.0) * sign;
});
const KERNEL_INVCDFS = {
  normal: (p) => invCdfStd(p),
  logistic: (p) => Math.log(p / (1 - p)),
  sigmoid: (p) => Math.log(Math.tan(p * Math.PI / 2)),
  rectangular: (p) => 2 * p - 1,
  parabolic: (p) => 2 * Math.cos((Math.acos(2 * p - 1) + Math.PI) / 3),
  quartic: quarticInv,
  triweight: triweightInv,
  triangular: (p) => (p < 0.5 ? Math.sqrt(2 * p) - 1 : 1 - Math.sqrt(2 - 2 * p)),
  cosine: (p) => 2 * Math.asin(2 * p - 1) / Math.PI,
};
KERNEL_INVCDFS.gauss = KERNEL_INVCDFS.normal;
KERNEL_INVCDFS.uniform = KERNEL_INVCDFS.rectangular;
KERNEL_INVCDFS.epanechnikov = KERNEL_INVCDFS.parabolic;
KERNEL_INVCDFS.biweight = KERNEL_INVCDFS.quartic;

const KdeFuncDef = {
  typeName: 'function',
  call: (ctx, self, args) => {
    const d = self.data;
    const kern = KERNELS[d.kernel];
    const n = d.data.length;
    if (d.random) {
      // kde_random の rand()：choice(data) + h * invcdf(random())
      const st = d.st;
      if (!st.known) { ctx.diag('シードが確定しないため値は確定しません'); return ctx.unk('乱数（KDE）'); }
      // choice は _randbelow 経由（random impl と同じ手順を再現するため MT を直接使う）
      const idx = randbelowFromState(st, n);
      const p = mtRandomFromState(st);
      return F(d.data[idx] + d.h * KERNEL_INVCDFS[d.kernel](p));
    }
    const x = toFloat(ctx, args[0]);
    if (x === null) ctx.err('TypeError', 'kde の引数には数値を使ってください', '');
    if (kern.support === null) {
      if (d.cumulative) {
        let s = 0;
        for (const xi of d.data) s += kern.W((x - xi) / d.h);
        return F(s / n);
      }
      let s = 0;
      for (const xi of d.data) s += kern.K((x - xi) / d.h);
      return F(s / (n * d.h));
    }
    // support あり：帯域内の点だけ（cdf は帯域外の左側の点の数 i を加える）
    const bw = d.h * kern.support;
    const sorted = d.sorted;
    let i = 0;
    while (i < sorted.length && sorted[i] < x - bw) i++;
    let j = sorted.length;
    while (j > 0 && sorted[j - 1] > x + bw) j--;
    if (d.cumulative) {
      let s = i;
      for (let k = i; k < j; k++) s += kern.W((x - sorted[k]) / d.h);
      return F(s / n);
    }
    let s = 0;
    for (let k = i; k < j; k++) s += kern.K((x - sorted[k]) / d.h);
    return F(s / (n * d.h));
  },
  repr: () => '<function>',
};
/* random impl の MT（mtRandom／randbelowBig は CPython の random()／
 * _randbelow と同一手順で、kde_random の choice→random の呼び出し順を再現する） */
function mtRandomFromState(st) { return mtRandom(st); }
function randbelowFromState(st, n) { return Number(randbelowBig(st, BigInt(n))); }
function kdeImpl(ctx, args, kwargs, isRandom) {
  const fname = isRandom ? 'kde_random' : 'kde';
  const items = needData(ctx, args[0], fname);
  if (items === null) return ctx.unk('関数');
  const n = items.length;
  if (!n) statErr(ctx, 'Empty data sequence');
  const first = items[0];
  if (!(ctx.isNum(first) || ctx.isBool(first))) ctx.err('TypeError', 'Data sequence must contain ints or floats', '');
  const data = items.map((v) => toFloat(ctx, v));
  if (data.some((x) => x === null)) ctx.err('TypeError', 'Data sequence must contain ints or floats', '');
  const hV = args.length >= 2 ? args[1] : kwargs && 'h' in kwargs ? kwargs.h : undefined;
  const h = hV === undefined ? null : toFloat(ctx, hV);
  if (h === null) ctx.err('TypeError', 'kde() には帯域幅 h が必要です', '');
  if (h <= 0.0) statErr(ctx, 'Bandwidth h must be positive, not ' + ctx.repr(hV));
  let kernel = 'normal';
  const kV = args.length >= 3 ? args[2] : kwargs && 'kernel' in kwargs ? kwargs.kernel : undefined;
  if (kV !== undefined) { const ks = ctx.str(kV); if (ks === null) ctx.err('TypeError', 'kernel は文字列で指定してください', ''); kernel = ks; }
  const table = isRandom ? KERNEL_INVCDFS : KERNELS;
  if (!(kernel in table)) statErr(ctx, "Unknown kernel name: '" + kernel + "'");
  if (isRandom) {
    const seedV = kwargs && 'seed' in kwargs ? kwargs.seed : undefined;
    const st = createMtState();
    if (seedV !== undefined && !ctx.isNone(seedV)) seedStateFromValue(ctx, st, seedV, 2);
    return ctx.native('statistics._kde_random', { random: true, data, h, kernel, st });
  }
  const cumulative = kwargs && 'cumulative' in kwargs ? !!ctx.truthy(kwargs.cumulative) : false;
  return ctx.native('statistics._kde_function', { random: false, data, sorted: data.slice().sort((a, b) => a - b), h, kernel, cumulative });
}

registerStdlibModule('statistics', {
  functions: FUNCTIONS,
  classes: {
    NormalDist: NormalDistDef,
    LinearRegression: LinearRegressionDef,
    _kde_function: KdeFuncDef,
    _kde_random: KdeFuncDef,
    StatisticsError: { typeName: 'StatisticsError', exc: SE, excParents: ['ValueError'] },
  },
});
