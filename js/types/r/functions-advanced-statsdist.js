// 高度モード B4S・sdist 班：R stats パッケージの確率分布関数（高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章、作業契約は
// work/b4s-notes/BRIEF.md。意味論は実 R 4.3.3（/usr/bin/Rscript）の
// 実測値と照合して裁定した（根拠は docs/audit/ADV-B4S-sdist.md）。
// 本ファイルは r/index.js を import しない。
//
// 設計：
// - d/p/q 系は純粋な数値計算として実装する。密度は対数密度で核を作り、
//   確率は下側／上側の両尾を精度良く持つペア {lo, hi, logLo, logHi} で返す。
// - r 系は基礎層 rnorm／runif の前例どおり、引数を実 R どおり検証してから
//   api.freshUnknown（実行時の値）を返す。
// - 精度を実 R と照合して確定できない ptukey／qtukey／psmirnov／qsmirnov は
//   登録しない（名前一覧には入るため、呼び出しはエンジンの名指し停止になる）。
// - bindArgs／warn／fail／rint／lgammaAbs は functions-advanced-math.js の
//   実装を複製した（出典：同ファイル。numVec は stats の C 実装の文言
//   "Non-numeric argument to mathematical function" に合わせた変形）。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}

// ---- 引数照合（functions-advanced-math.js から複製）
function bindArgs(ctx, formals, opts = {}) {
  const { args, vals, api, node, H } = ctx;
  const dots = !!opts.dots;
  const nameOnly = new Set(opts.nameOnly ?? []);
  const matchFormals = formals.filter((f) => !nameOnly.has(f));
  const showV = (v) => H.show(v);
  const unusedFail = (a, v) =>
    api.fail(
      a.argName
        ? `unused argument (${a.argName} = ${showV(v)})`
        : `unused argument (${showV(v)})`,
      node,
    );
  const seenExact = new Set();
  for (const a of args) {
    if (a.argName && (formals.includes(a.argName) || nameOnly.has(a.argName))) {
      if (seenExact.has(a.argName))
        api.fail(
          `formal argument "${a.argName}" matched by multiple actual arguments`,
          node,
        );
      seenExact.add(a.argName);
    }
  }
  const hasPartial = args.some(
    (a) =>
      a.argName &&
      !formals.includes(a.argName) &&
      formals.some((f) => f.startsWith(a.argName)),
  );
  const hasPositional = args.some((a) => !a.argName);
  const result = new Map();
  const dotList = [];
  if (hasPartial && hasPositional) {
    const used = new Set();
    args.forEach((a, i) => {
      if (a.argName && (formals.includes(a.argName) || nameOnly.has(a.argName))) {
        result.set(a.argName, { present: true, value: vals[i] });
        used.add(i);
      }
    });
    args.forEach((a, i) => {
      if (!a.argName || formals.includes(a.argName) || nameOnly.has(a.argName)) return;
      const cand = formals.filter((f) => f.startsWith(a.argName));
      if (cand.length === 1) {
        if (result.has(cand[0]))
          api.fail(
            `formal argument "${cand[0]}" matched by multiple actual arguments`,
            node,
          );
        result.set(cand[0], { present: true, value: vals[i] });
        used.add(i);
      } else if (cand.length > 1)
        api.fail(`argument ${i + 1} matches multiple formal arguments`, node);
    });
    let fi = 0;
    args.forEach((a, i) => {
      if (a.argName || used.has(i)) return;
      while (fi < matchFormals.length && result.has(matchFormals[fi])) fi++;
      if (fi < matchFormals.length) {
        result.set(matchFormals[fi], { present: true, value: vals[i] });
        used.add(i);
        fi++;
      }
    });
    args.forEach((a, i) => {
      if (used.has(i)) return;
      if (dots) dotList.push({ name: a.argName ?? null, value: vals[i] });
      else unusedFail(a, vals[i]);
    });
  } else {
    const m = ctx.matchArgs(matchFormals);
    for (const f of matchFormals)
      if (m[f]?.present) result.set(f, { present: true, value: m[f].value });
    args.forEach((a, i) => {
      if (a.argName && nameOnly.has(a.argName))
        result.set(a.argName, { present: true, value: vals[i] });
    });
    const exactFilled = new Set(
      args
        .filter((a) => a.argName && matchFormals.includes(a.argName))
        .map((a) => a.argName),
    );
    let posSeen = 0;
    const posCapacity = matchFormals.length - exactFilled.size;
    args.forEach((a, i) => {
      if (!a.argName) {
        posSeen++;
        if (posSeen > posCapacity) {
          if (dots) dotList.push({ name: null, value: vals[i] });
          else unusedFail(a, vals[i]);
        }
        return;
      }
      if (formals.includes(a.argName) || nameOnly.has(a.argName)) return;
      const cand = formals.filter((f) => f.startsWith(a.argName));
      if (cand.length === 1 && !nameOnly.has(cand[0])) {
        if (result.has(cand[0]))
          api.fail(
            `formal argument "${cand[0]}" matched by multiple actual arguments`,
            node,
          );
        result.set(cand[0], { present: true, value: vals[i] });
      } else if (cand.length > 1)
        api.fail(`argument ${i + 1} matches multiple formal arguments`, node);
      else if (dots) dotList.push({ name: a.argName, value: vals[i] });
      else unusedFail(a, vals[i]);
    });
  }
  return {
    has: (n) => result.has(n),
    val: (n) => result.get(n)?.value,
    req: (n) => {
      if (!result.has(n))
        api.fail(`argument "${n}" is missing, with no default`, node);
      return result.get(n).value;
    },
    dots: dotList,
  };
}

// ---- 数値ベクトル化（math.js の numVec を複製し、文言を stats の C 実装
// "Non-numeric argument to mathematical function" に合わせた）
function numVecDist(ctx, v) {
  const H = ctx.H;
  if (isDf(v)) fail(ctx, "データフレームはこの関数の対象外です");
  if (v === null) return [];
  return H.vec(v).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    fail(ctx, "Non-numeric argument to mathematical function");
  });
}

// R の rint（最近傍・偶数丸め。functions-advanced-math.js から複製）
function rint(v) {
  if (!Number.isFinite(v)) return v;
  const f = Math.floor(v);
  const d = v - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

// ---- log gamma（Lanczos g=7。functions-advanced-math.js から複製）
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
function lgammaAbs(v) {
  if (Number.isInteger(v) && v >= 1) {
    if (v <= 171) {
      let p = 1;
      for (let i = 2; i < v; i++) p *= i;
      return Math.log(p);
    }
    let s = 0;
    for (let i = 2; i < v; i++) s += Math.log(i);
    return s;
  }
  if (Number.isInteger(v - 0.5)) {
    let s = 0.5 * Math.log(Math.PI);
    let cur = 0.5;
    if (v > 0.5) {
      while (cur < v) {
        s += Math.log(cur);
        cur += 1;
      }
    } else {
      while (cur > v) {
        cur -= 1;
        s -= Math.log(Math.abs(cur));
      }
    }
    return s;
  }
  if (v < 0.5)
    return (
      Math.log(Math.PI) -
      Math.log(Math.abs(Math.sin(Math.PI * v))) -
      lgammaAbs(1 - v)
    );
  const z = v - 1;
  let x = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
// 正の引数専用 log Γ。巨大整数では lgammaAbs の総和ループが重いため
// Lanczos 本体へ直接回す（精度差は報告書に記載）。
function lgam(x) {
  if (Number.isInteger(x) && x > 200000) {
    const z = x - 1;
    let s = LANCZOS[0];
    for (let i = 1; i < LANCZOS.length; i++) s += LANCZOS[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(s);
  }
  return lgammaAbs(x);
}
const lbetaF = (a, b) => lgam(a) + lgam(b) - lgam(a + b);
const lchooseF = (n, k) => lgam(n + 1) - lgam(k + 1) - lgam(n - k + 1);

// ---- 論理フラグ（log／lower.tail／log.p）の解釈。
// 実 R の C 実装は NA_LOGICAL（INT_MIN）を真として扱うため、NA は TRUE に
// 倒す（実測：dnorm(0, log=NA) は対数密度、pnorm(1, lower.tail=NA) は下側）。
function flagVal(ctx, b, name, dflt) {
  if (!b.has(name)) return dflt;
  const raw = b.val(name);
  if (ctx.H.isUnknown(raw)) return raw;
  if (raw === null || raw === undefined) fail(ctx, "argument is of length zero");
  const els = ctx.H.vec(raw);
  if (!els.length) fail(ctx, "argument is of length zero");
  const el = els[0];
  if (ctx.H.isNA(el) || ctx.H.isNaNVal(el)) return true;
  if (typeof el === "boolean") return el;
  if (typeof el === "number") return el !== 0;
  if (typeof el === "string") {
    if (["TRUE", "T", "True", "true"].includes(el)) return true;
    if (["FALSE", "F", "False", "false"].includes(el)) return false;
  }
  fail(ctx, "argument is not interpretable as logical");
}

// ---- 確率ペア {lo, hi, logLo, logHi}
const PAIR0 = { lo: 0, hi: 1, logLo: -Infinity, logHi: 0 };
const PAIR1 = { lo: 1, hi: 0, logLo: 0, logHi: -Infinity };
const PAIRHALF = { lo: 0.5, hi: 0.5, logLo: -Math.LN2, logHi: -Math.LN2 };
const PAIRNAN = { lo: NaN, hi: NaN, logLo: NaN, logHi: NaN };
const pairFromLo = (lo) => ({
  lo,
  hi: 1 - lo,
  logLo: lo > 0 ? Math.log(lo) : -Infinity,
  logHi: lo < 1 ? Math.log1p(-lo) : -Infinity,
});

// ---- 正規化不完全ベータ I_x(a,b)（連分数・Lentz 法。両尾と対数を返す）
function betacf(a, b, x) {
  const MAXIT = 500, EPS = 3e-16, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function betaincPair(x, a, b) {
  if (Number.isNaN(x) || Number.isNaN(a) || Number.isNaN(b)) return PAIRNAN;
  if (x <= 0) return PAIR0;
  if (x >= 1) return PAIR1;
  const lbt =
    lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log1p(-x);
  if (x < (a + 1) / (a + b + 2)) {
    const cf = betacf(a, b, x);
    const logLo = lbt + Math.log(cf) - Math.log(a);
    const lo = Math.exp(logLo);
    return { lo, hi: 1 - lo, logLo, logHi: Math.log1p(-lo) };
  }
  const cf = betacf(b, a, 1 - x);
  const logHi = lbt + Math.log(cf) - Math.log(b);
  const hi = Math.exp(logHi);
  return { lo: 1 - hi, hi, logLo: Math.log1p(-hi), logHi };
}

// ---- 正規化不完全ガンマ P(a,x)／Q(a,x)（級数と連分数。対数も返す）
function gserLogP(a, x) {
  // P = exp(-x + a log x - lgamma(a+1)) * S'、S' は t0=1 の級数和。
  let term = 1, sum = 1;
  for (let n = 1; n <= 10000; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
  }
  return Math.log(sum) - x + a * Math.log(x) - lgam(a + 1);
}
function gcfLogQ(a, x) {
  const FPMIN = 1e-300;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= 10000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.log(h) - x + a * Math.log(x) - lgam(a);
}
function gammpPair(a, x) {
  if (Number.isNaN(a) || Number.isNaN(x)) return PAIRNAN;
  if (x <= 0) return PAIR0;
  if (x === Infinity) return PAIR1;
  if (x < a + 1) {
    const logLo = gserLogP(a, x);
    const lo = Math.exp(logLo);
    return { lo, hi: 1 - lo, logLo, logHi: Math.log1p(-lo) };
  }
  const logHi = gcfLogQ(a, x);
  const hi = Math.exp(logHi);
  return { lo: 1 - hi, hi, logLo: Math.log1p(-hi), logHi };
}

// ---- 標準正規の CDF ペア（不完全ガンマ経由：Φ(z) の裾も対数まで正確）
function normPair(z) {
  if (Number.isNaN(z)) return PAIRNAN;
  if (z === Infinity) return PAIR1;
  if (z === -Infinity) return PAIR0;
  const x = (z * z) / 2;
  if (x === Infinity)
    return z > 0 ? PAIR1 : PAIR0;
  const gp = gammpPair(0.5, x); // gp.lo = erf(|z|/√2), gp.hi = erfc(|z|/√2)
  if (z >= 0) {
    const lo = 0.5 * (1 + gp.lo);
    return { lo, hi: 0.5 * gp.hi, logLo: Math.log(lo), logHi: gp.logHi - Math.LN2 };
  }
  const hi = 0.5 * (1 + gp.lo);
  return { lo: 0.5 * gp.hi, hi, logLo: gp.logHi - Math.LN2, logHi: Math.log(hi) };
}

// ---- 標準正規の分位点（Acklam 初期値＋Newton 補正。極端な裾は対数空間で解く）
const ACK_A = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285984469534e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
const ACK_B = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
const ACK_C = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
const ACK_D = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
function acklam(p) {
  const plow = 0.02425, phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((ACK_C[0] * q + ACK_C[1]) * q + ACK_C[2]) * q + ACK_C[3]) * q + ACK_C[4]) * q + ACK_C[5]) /
      ((((ACK_D[0] * q + ACK_D[1]) * q + ACK_D[2]) * q + ACK_D[3]) * q + 1)
    );
  }
  if (p <= phigh) {
    const q = p - 0.5, r = q * q;
    return (
      ((((((ACK_A[0] * r + ACK_A[1]) * r + ACK_A[2]) * r + ACK_A[3]) * r + ACK_A[4]) * r + ACK_A[5]) * q) /
      (((((ACK_B[0] * r + ACK_B[1]) * r + ACK_B[2]) * r + ACK_B[3]) * r + ACK_B[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((ACK_C[0] * q + ACK_C[1]) * q + ACK_C[2]) * q + ACK_C[3]) * q + ACK_C[4]) * q + ACK_C[5]) /
    ((((ACK_D[0] * q + ACK_D[1]) * q + ACK_D[2]) * q + ACK_D[3]) * q + 1)
  );
}
function qnormRefine(p) {
  let z = acklam(p);
  for (let i = 0; i < 3; i++) {
    const F = normPair(z).lo;
    const pdf = Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
    if (pdf === 0) break;
    const step = (F - p) / pdf;
    z -= step;
    if (Math.abs(step) < 1e-15 * Math.max(1, Math.abs(z))) break;
  }
  return z;
}
function qnormTailSolve(logPl) {
  // log Φ(z) = logPl（logPl < log(1e-16) 級）を Newton で解く（z<0）。
  let z = -Math.sqrt(-2 * logPl);
  for (let i = 0; i < 60; i++) {
    const logPhi = normPair(z).logLo;
    const logPdf = -(z * z) / 2 - 0.5 * Math.log(2 * Math.PI);
    const mills = Math.exp(logPdf - logPhi);
    const step = (logPhi - logPl) / mills;
    z -= step;
    if (Math.abs(step) < 1e-14 * Math.max(1, Math.abs(z))) break;
  }
  return z;
}
function qnormCore(pl, logPl, logPu) {
  if (pl === 0) return -Infinity;
  if (pl === 1) return Infinity;
  if (pl <= 0.5) {
    if (logPl < -34) return qnormTailSolve(logPl);
    return qnormRefine(pl);
  }
  if (logPu < -34) return -qnormTailSolve(logPu);
  return -qnormRefine(1 - pl);
}

// ---- Poisson 混合（非心分布用）：Σ_j w_j * term(j)、w は Poisson(mu) の確率。
// 最大重み項から両方向へ辿り、重みが消える側で打ち切る。
function poissonWeights(mu, fn) {
  if (mu === 0) {
    fn(0, 1);
    return;
  }
  const j0 = Math.floor(mu);
  const w0 = Math.exp(-mu + j0 * Math.log(mu) - lgam(j0 + 1));
  fn(j0, w0);
  let w = w0;
  for (let j = j0 + 1; ; j++) {
    w *= mu / j;
    if (w === 0) break;
    fn(j, w);
    if (j > mu && w < 1e-17) break;
    if (j > j0 + 100000) break;
  }
  w = w0;
  for (let j = j0; j >= 1; j--) {
    w *= j / mu;
    if (w === 0) break;
    fn(j - 1, w);
    if (w < 1e-17) break;
  }
}
function poissonMixture(mu, term) {
  let s = 0;
  poissonWeights(mu, (j, w) => {
    s += w * term(j);
  });
  return s;
}

// ---- 非心カイ二乗専用の Poisson 混合（対数空間・寄与基準の打切り）
// F9 の根因：poissonWeights は重み w_j < 1e-17（絶対値）で打ち切るため、
// 遠い裾では支配項が w_j ≈ 1e-20 級の小さい j にあるのに欠落していた
// （pchisq(4, 4, ncp = 150)：真値 3.667e-26 に対し 5.56e-27、
// dchisq の対数で誤差 1.58。支配項は j ≈ 6..17：mpmath 50 桁で確認）。
// ここでは対数重みで峰から両方向へ走査し、打切りは「その先の全項が
// 現在の最大項の e^-50 以下」という上限評価（CDF は logP <= 0、密度は
// lcMax = log f の全域上限）でのみ行う。lc(j) は中心項の対数。
function ncx2LogMixture(lam, lc, lcMax) {
  if (lam === 0) return lc(0);
  const j0 = Math.floor(lam);
  const logw0 = -lam + j0 * Math.log(lam) - lgam(j0 + 1);
  const terms = [];
  let maxLog = -Infinity;
  const push = (j, logw) => {
    const lt = logw + lc(j);
    terms.push(lt);
    if (lt > maxLog) maxLog = lt;
  };
  let logw = logw0;
  push(j0, logw);
  for (let j = j0 + 1; j <= j0 + 1000000; j++) {
    logw += Math.log(lam) - Math.log(j);
    push(j, logw);
    if (logw + lcMax < maxLog - 50) break;
    // 項がすべて -Inf の間（q = 0 や x = 0 の退化形）は相対基準が発火
    // しないため、倍精度の指数範囲を超えたら絶対基準で打ち切る。
    if (maxLog === -Infinity && logw + lcMax < -700) break;
  }
  logw = logw0;
  for (let j = j0; j >= 1; j--) {
    logw += Math.log(j) - Math.log(lam);
    push(j - 1, logw);
    if (logw + lcMax < maxLog - 50) break;
  }
  if (maxLog === -Infinity) return -Infinity;
  if (maxLog === Infinity) return Infinity;
  let s = 0;
  for (const lt of terms) s += Math.exp(lt - maxLog);
  return maxLog + Math.log(s);
}
// 中心カイ二乗密度の対数（固定 x）について、形状 a 全域での上限の見積り。
// 密度は a について単峰なので、峰付近の候補点の最大値に余裕を持たせる。
function chisqLdMax(x, df) {
  if (x === 0) return 0; // a < 1 の項は +Inf になり混合側で即座に返る
  let m = -Infinity;
  for (const a of [df / 2, x / 4, x / 2, x / 2 + 0.5, x / 2 + 1, x, 2 * x]) {
    if (a > 0) {
      const v = dgammaLd(x, a, 2);
      if (v > m) m = v;
    }
  }
  return m + 2;
}

// ---- 連続 CDF の逆転（二分法。単調性のみ仮定する堅牢な解法）
function invertCdf(cdf, pl, lo, hi) {
  let a = lo, b = hi;
  let fb = cdf(b);
  let guard = 0;
  while (fb < pl && guard++ < 300) {
    a = b;
    b = lo + (b - lo) * 2 + 1;
    if (!Number.isFinite(b)) b = 1e300;
    fb = cdf(b);
  }
  for (let i = 0; i < 200; i++) {
    const m = a + (b - a) / 2;
    if (m === a || m === b) break;
    if (cdf(m) < pl) a = m;
    else b = m;
    if (b - a <= 1e-13 * Math.max(1, Math.abs(m))) break;
  }
  return a + (b - a) / 2;
}
function invertCdfReal(cdf, pl, guess) {
  let lo = guess - 1, hi = guess + 1;
  let flo = cdf(lo), fhi = cdf(hi);
  let guard = 0;
  while (flo > pl && guard++ < 300) {
    hi = lo;
    fhi = flo;
    lo = guess - (guess - lo) * 2 - 1;
    flo = cdf(lo);
  }
  while (fhi < pl && guard++ < 300) {
    lo = hi;
    flo = fhi;
    hi = guess + (hi - guess) * 2 + 1;
    fhi = cdf(hi);
  }
  for (let i = 0; i < 200; i++) {
    const m = lo + (hi - lo) / 2;
    if (m === lo || m === hi) break;
    if (cdf(m) < pl) lo = m;
    else hi = m;
    if (hi - lo <= 1e-13 * Math.max(1, Math.abs(m))) break;
  }
  return lo + (hi - lo) / 2;
}

// ---- 離散 CDF の分位点：F(k) >= pl を満たす最小の k。
function discreteQuantile(cdf, pl, lo, hi) {
  if (pl <= 0) return lo;
  if (pl >= 1) return hi;
  let a = lo, b = hi;
  if (b === Infinity) {
    b = lo + 1;
    let step = 1;
    while (cdf(b) < pl) {
      a = b;
      step *= 2;
      b += step;
      if (b > 1e15) break;
    }
  }
  while (a < b) {
    const m = Math.floor((a + b) / 2);
    if (cdf(m) >= pl) b = m;
    else a = m + 1;
  }
  return a;
}

// ---- q 系の入力変換：p（または log p）を下側確率 pl とその対数へ。
// lower.tail=FALSE は「1-p への変換」で実 R と一致することを実測で確認した
// （連続・離散とも。qpois(1, lower.tail=FALSE)=0、qpois(0, lower.tail=FALSE)=Inf）。
function pConvert(p, F) {
  const lower = F["lower.tail"], logp = F["log.p"];
  if (logp) {
    if (p > 0) return { invalid: true };
    if (lower) {
      const logPl = p;
      return { pl: Math.exp(logPl), logPl, logPu: Math.log1p(-Math.exp(p)) };
    }
    const logPu = p;
    const logPl = Math.log1p(-Math.exp(p));
    return { pl: Math.exp(logPl), logPl, logPu };
  }
  if (p < 0 || p > 1) return { invalid: true };
  const pl = lower ? p : 1 - p;
  return {
    pl,
    logPl: Math.log(pl),
    logPu: lower ? Math.log1p(-p) : Math.log(p),
  };
}

// ---- d/p/q 共通エンジン。
// spec: {kind, formals, main, flags, params(b)->{name: els}, core(el, F, W, failFn)}
// core は kind="d" で対数密度、"p" で確率ペア、"q" で分位点を返す。
// NA 要素は NA、NaN 要素は NaN（いずれも警告なし）。入力が正常なのに結果が
// NaN になった要素がある場合のみ "NaNs produced" を警告する（実 R の規則）。
function distRun(ctx, spec) {
  const b = bindArgs(ctx, spec.formals);
  for (const f of spec.formals)
    if (b.has(f) && ctx.H.isUnknown(b.val(f))) return b.val(f);
  const F = {};
  for (const fname of spec.flags) {
    const dflt = fname === "lower.tail" ? true : false;
    const v = flagVal(ctx, b, fname, dflt);
    if (ctx.H.isUnknown(v)) return v;
    F[fname] = v;
  }
  const P = spec.params(ctx, b);
  let n = 1, zeroLen = false;
  for (const arr of Object.values(P)) {
    if (arr.length === 0) zeroLen = true;
    n = Math.max(n, arr.length);
  }
  if (zeroLen) return [];
  // リサイクリングは実 R の stats C 実装どおり無警告で行う（実測：
  // pnorm(c(-1,0,1), sd=c(1,2)) や dnorm(1:3, mean=1:2) は警告なし）。
  const W = { nan: false, nonInt: [], nonIntN: [] };
  const out = new Array(n);
  const mainArr = P[spec.main];
  for (let i = 0; i < n; i++) {
    const el = {};
    let hasNA = false, hasNaN = false;
    for (const [name, arr] of Object.entries(P)) {
      const e = arr[i % arr.length];
      el[name] = e;
      if (ctx.H.isNA(e)) hasNA = true;
      else if (typeof e === "number" && Number.isNaN(e)) hasNaN = true;
    }
    if (hasNA) {
      out[i] = ctx.H.NA;
      continue;
    }
    if (hasNaN) {
      out[i] = NaN;
      continue;
    }
    if (spec.kind === "q") {
      const conv = pConvert(el[spec.main], F);
      if (conv.invalid) {
        out[i] = NaN;
        W.nan = true;
        continue;
      }
      el.__pl = conv;
    }
    const r = spec.core(el, F, W, (m) => fail(ctx, m));
    if (spec.kind === "d") {
      const v = F.log ? r : Math.exp(r);
      out[i] = v;
      if (Number.isNaN(v)) W.nan = true;
    } else if (spec.kind === "p") {
      const v = F["lower.tail"]
        ? F["log.p"]
          ? r.logLo
          : r.lo
        : F["log.p"]
          ? r.logHi
          : r.hi;
      out[i] = v;
      if (Number.isNaN(v)) W.nan = true;
    } else {
      out[i] = r;
      if (Number.isNaN(r)) W.nan = true;
    }
  }
  if (W.nan) warn(ctx, "NaNが生成されました（NaNs produced）");
  for (const m of W.nonInt.slice(0, 10)) warn(ctx, m);
  for (const m of W.nonIntN.slice(0, 10)) warn(ctx, m);
  const srcNames = ctx.H.namesOf(b.val(spec.main));
  if (srcNames && mainArr.length === n) return ctx.H.withNames(out, srcNames);
  return out;
}

const pv = (ctx, b, name, dflt) =>
  b.has(name) ? numVecDist(ctx, b.val(name)) : [dflt];
const pvReq = (ctx, b, name) => numVecDist(ctx, b.req(name));
const stdParams = (mainName, rest) => (ctx, b) => {
  const o = { [mainName]: pvReq(ctx, b, mainName) };
  for (const r of rest)
    o[r.n] = r.req ? pvReq(ctx, b, r.n) : pv(ctx, b, r.n, r.d);
  return o;
};
const DH = (formals, params, core) => (ctx) =>
  distRun(ctx, { kind: "d", formals, main: "x", flags: ["log"], params, core });
const PH = (formals, params, core) => (ctx) =>
  distRun(ctx, {
    kind: "p",
    formals,
    main: "q",
    flags: ["lower.tail", "log.p"],
    params,
    core,
  });
const QH = (formals, params, core) => (ctx) =>
  distRun(ctx, {
    kind: "q",
    formals,
    main: "p",
    flags: ["lower.tail", "log.p"],
    params,
    core,
  });

// ================= 連続分布の核 =================

// ---- 正規分布
const dnormCore = ({ x, mean, sd }) => {
  if (sd < 0) return NaN;
  if (sd === 0) return x === mean ? Infinity : -Infinity;
  const z = (x - mean) / sd;
  return -0.5 * Math.log(2 * Math.PI) - Math.log(sd) - (z * z) / 2;
};
const pnormCore = ({ q, mean, sd }) => {
  if (sd < 0) return PAIRNAN;
  if (sd === 0) return q < mean ? PAIR0 : PAIR1;
  return normPair((q - mean) / sd);
};
const qnormCoreF = ({ mean, sd, __pl }) => {
  if (sd < 0) return NaN;
  if (sd === 0) {
    if (__pl.pl === 0) return -Infinity;
    if (__pl.pl === 1) return Infinity;
    return mean;
  }
  return mean + sd * qnormCore(__pl.pl, __pl.logPl, __pl.logPu);
};

// ---- コーシー分布（scale=0 の q は全 p で location を返す：実測）
const dcauchyCore = ({ x, location, scale }) => {
  if (scale <= 0) return NaN;
  const z = (x - location) / scale;
  return -Math.log(Math.PI) - Math.log(scale) - Math.log1p(z * z);
};
const pcauchyCore = ({ q, location, scale }) => {
  if (scale <= 0) return PAIRNAN;
  const z = (q - location) / scale;
  if (z === 0) return PAIRHALF;
  if (z > 0) {
    const hi = Math.atan(1 / z) / Math.PI;
    return { lo: 1 - hi, hi, logLo: Math.log1p(-hi), logHi: Math.log(hi) };
  }
  const lo = -Math.atan(1 / z) / Math.PI;
  return { lo, hi: 1 - lo, logLo: Math.log(lo), logHi: Math.log1p(-lo) };
};
const qcauchyCore = ({ location, scale, __pl }) => {
  if (scale < 0) return NaN;
  if (scale === 0) return location;
  if (__pl.pl === 0) return -Infinity;
  if (__pl.pl === 1) return Infinity;
  return location + scale * Math.tan(Math.PI * (__pl.pl - 0.5));
};

// ---- ロジスティック分布（scale=0 の q は端点で ∓Inf、内部で location：実測）
const dlogisCore = ({ x, location, scale }) => {
  if (scale <= 0) return NaN;
  const z = (x - location) / scale;
  if (z >= 0) return -Math.log(scale) - z - 2 * Math.log1p(Math.exp(-z));
  return -Math.log(scale) + z - 2 * Math.log1p(Math.exp(z));
};
const plogisCore = ({ q, location, scale }) => {
  if (scale <= 0) return PAIRNAN;
  const z = (q - location) / scale;
  if (z >= 0) {
    const hi = 1 / (1 + Math.exp(z));
    const logHi = -z - Math.log1p(Math.exp(-z));
    const lo = 1 - hi;
    return { lo, hi, logLo: Math.log(lo), logHi };
  }
  const lo = 1 / (1 + Math.exp(-z));
  const logLo = z - Math.log1p(Math.exp(z));
  const hi = 1 - lo;
  return { lo, hi, logLo, logHi: Math.log(hi) };
};
const qlogisCore = ({ location, scale, __pl }) => {
  if (scale < 0) return NaN;
  if (scale === 0) {
    if (__pl.pl === 0) return -Infinity;
    if (__pl.pl === 1) return Infinity;
    return location;
  }
  return location + scale * (__pl.logPl - __pl.logPu);
};

// ---- 指数分布（rate=Inf は d で NaN、p は式どおり 1、q は 0：実測）
const dexpCore = ({ x, rate }) => {
  if (rate < 0 || rate === Infinity) return NaN;
  if (x < 0) return -Infinity;
  if (rate === 0) return -Infinity;
  return Math.log(rate) - rate * x;
};
const pexpCore = ({ q, rate }) => {
  if (q <= 0) return PAIR0;
  if (rate < 0) return PAIRNAN;
  const t = q * rate;
  if (Number.isNaN(t)) return PAIRNAN;
  const lo = -Math.expm1(-t);
  return { lo, hi: Math.exp(-t), logLo: Math.log(lo), logHi: -t };
};
const qexpCore = ({ rate, __pl }) => {
  if (rate < 0) return NaN;
  if (rate === 0) return __pl.pl === 0 ? 0 : Infinity;
  return -__pl.logPu / rate;
};

// ---- 一様分布（min==max は d で NaN、p は縮退分布、q は min：実測）
const dunifCore = ({ x, min, max }) => {
  if (!(min <= max) || !Number.isFinite(min) || !Number.isFinite(max))
    return NaN;
  if (min === max) return NaN;
  if (x < min || x > max) return -Infinity;
  return -Math.log(max - min);
};
const punifCore = ({ q, min, max }) => {
  if (!(min <= max) || !Number.isFinite(min) || !Number.isFinite(max))
    return PAIRNAN;
  if (min === max) return q < min ? PAIR0 : PAIR1;
  const v = (q - min) / (max - min);
  return pairFromLo(v < 0 ? 0 : v > 1 ? 1 : v);
};
const qunifCore = ({ min, max, __pl }) => {
  if (!(min <= max) || !Number.isFinite(min) || !Number.isFinite(max))
    return NaN;
  return min + __pl.pl * (max - min);
};

// ---- 対数正規分布（pnorm／qnorm の合成。sdlog=0 は実測の退化規則）
const dlnormCore = ({ x, meanlog, sdlog }) => {
  if (sdlog < 0) return NaN;
  if (x <= 0) return -Infinity;
  if (sdlog === 0) return x === Math.exp(meanlog) ? Infinity : -Infinity;
  const lx = Math.log(x);
  const z = (lx - meanlog) / sdlog;
  return -lx - Math.log(sdlog) - 0.5 * Math.log(2 * Math.PI) - (z * z) / 2;
};
const plnormCore = ({ q, meanlog, sdlog }) => {
  if (sdlog < 0) return PAIRNAN;
  if (q <= 0) return PAIR0;
  if (sdlog === 0) return q < Math.exp(meanlog) ? PAIR0 : PAIR1;
  return normPair((Math.log(q) - meanlog) / sdlog);
};
const qlnormCore = ({ meanlog, sdlog, __pl }) => {
  if (sdlog < 0) return NaN;
  if (sdlog === 0) {
    if (__pl.pl === 0) return 0;
    if (__pl.pl === 1) return Infinity;
    return Math.exp(meanlog);
  }
  return Math.exp(meanlog + sdlog * qnormCore(__pl.pl, __pl.logPl, __pl.logPu));
};

// ---- ワイブル分布
const dweibullCore = ({ x, shape, scale }) => {
  if (shape <= 0 || scale <= 0) return NaN;
  if (x < 0) return -Infinity;
  if (x === 0) {
    if (shape < 1) return Infinity;
    if (shape === 1) return -Math.log(scale);
    return -Infinity;
  }
  if (x === Infinity) return -Infinity;
  const lx = Math.log(x) - Math.log(scale);
  const t = Math.exp(shape * lx);
  return Math.log(shape) - Math.log(scale) + (shape - 1) * lx - t;
};
const pweibullCore = ({ q, shape, scale }) => {
  if (shape <= 0 || scale <= 0) return PAIRNAN;
  if (q <= 0) return PAIR0;
  if (q === Infinity) return PAIR1;
  const t = Math.exp(shape * (Math.log(q) - Math.log(scale)));
  const lo = -Math.expm1(-t);
  return { lo, hi: Math.exp(-t), logLo: Math.log(lo), logHi: -t };
};
const qweibullCore = ({ shape, scale, __pl }) => {
  if (shape <= 0 || scale <= 0) return NaN;
  if (__pl.pl === 0) return 0;
  if (__pl.pl === 1) return Infinity;
  return scale * Math.exp(Math.log(-__pl.logPu) / shape);
};

// ---- ガンマ分布（shape=0 は 0 への質量。pgamma(0,0)=0 の P[X<x] 規約：実測）
function dgammaLd(x, a, s) {
  if (a < 0 || s <= 0) return NaN;
  if (x < 0) return -Infinity;
  if (a === 0) return x === 0 ? Infinity : -Infinity;
  if (x === 0) {
    if (a < 1) return Infinity;
    if (a === 1) return -Math.log(s);
    return -Infinity;
  }
  if (x === Infinity) return -Infinity;
  return (a - 1) * Math.log(x) - x / s - a * Math.log(s) - lgam(a);
}
function pgammaPair(q, a, s) {
  if (a < 0 || s <= 0) return PAIRNAN;
  if (a === 0) return q <= 0 ? PAIR0 : PAIR1;
  if (q <= 0) return PAIR0;
  const xx = q / s;
  if (Number.isNaN(xx)) return PAIRNAN;
  if (xx === Infinity) return PAIR1;
  return gammpPair(a, xx);
}
function qgammaVal(pl, a, s) {
  if (a < 0 || s <= 0) return NaN;
  if (a === 0) return pl === 1 ? Infinity : 0;
  if (s === Infinity) return pl === 0 ? 0 : Infinity;
  if (pl === 0) return 0;
  if (pl === 1) return Infinity;
  const hi0 = Math.min(Math.max(a * s, s), 1e300);
  return invertCdf((v) => gammpPair(a, v / s).lo, pl, 0, hi0);
}
const dgammaCore = ({ x, shape, scale }) => dgammaLd(x, shape, scale);
const pgammaCore = ({ q, shape, scale }) => pgammaPair(q, shape, scale);
const qgammaCore = ({ shape, scale, __pl }) => qgammaVal(__pl.pl, shape, scale);

// rate と scale の両指定（実 R ソース distn.R の規則）：
// |rate*scale - 1| < 1e-15 なら警告して続行、それ以外は同文言で停止。
function checkRateScale(ctx, b) {
  if (!b.has("rate") || !b.has("scale")) return;
  const r = numVecDist(ctx, b.val("rate"));
  const s = numVecDist(ctx, b.val("scale"));
  if (!r.length || !s.length) return;
  const n = Math.max(r.length, s.length);
  for (let i = 0; i < n; i++) {
    const rv = r[i % r.length], sv = s[i % s.length];
    if (ctx.H.isNA(rv) || ctx.H.isNA(sv)) continue;
    if (Math.abs(rv * sv - 1) >= 1e-15)
      fail(ctx, "specify 'rate' or 'scale' but not both");
  }
  warn(ctx, "specify 'rate' or 'scale' but not both");
}
const gammaParams = (mainName) => (ctx, b) => {
  checkRateScale(ctx, b);
  const o = { [mainName]: pvReq(ctx, b, mainName), shape: pvReq(ctx, b, "shape") };
  if (b.has("scale")) o.scale = pv(ctx, b, "scale", 1);
  else if (b.has("rate")) o.scale = pv(ctx, b, "rate", 1).map((r) => 1 / r);
  else o.scale = [1];
  return o;
};

// ---- カイ二乗分布（ガンマの特殊形＋非心は Poisson 混合）
const dchisqCore = ({ x, df, ncp }) => {
  if (ncp === 0) return dgammaLd(x, df / 2, 2);
  if (ncp < 0 || df < 0) return NaN;
  if (x < 0) return -Infinity;
  // F9：対数空間の混合（ncx2LogMixture）で遠裾の支配項を取りこぼさない。
  return dchisqNcLd(x, df, ncp);
};
function pchisqNcPair(q, df, ncp) {
  if (q < 0) return PAIR0;
  if (q === Infinity) return PAIR1;
  // F9：対数空間の混合。logLo をそのまま保持し、log.p でも裾の精度を保つ。
  const logLo = ncx2LogMixture(
    ncp / 2,
    (j) =>
      df + 2 * j === 0 ? 0 : gammpPair((df + 2 * j) / 2, q / 2).logLo,
    0,
  );
  const lo = Math.exp(logLo);
  return {
    lo,
    hi: 1 - lo,
    logLo,
    logHi: lo < 1 ? Math.log1p(-lo) : -Infinity,
  };
}
const pchisqCore = ({ q, df, ncp }) => {
  if (ncp === 0) return pgammaPair(q, df / 2, 2);
  if (ncp < 0 || df < 0) return PAIRNAN;
  return pchisqNcPair(q, df, ncp);
};
const qchisqCore = ({ df, ncp, __pl }) => {
  if (ncp === 0) return qgammaVal(__pl.pl, df / 2, 2);
  if (ncp < 0 || df < 0) return NaN;
  if (__pl.pl === 0) return 0;
  if (__pl.pl === 1) return Infinity;
  const hi0 = Math.min(Math.max(df + ncp, 1), 1e300);
  return invertCdf((v) => pchisqNcPair(v, df, ncp).lo, __pl.pl, 0, hi0);
};

// ---- ベータ分布（退化形は実測の質量規則。非心は Poisson 混合）
function betaMassLoc(a, b) {
  if (a === 0 && b === 0) return "both";
  if (a === 0) return 0;
  if (b === 0) return 1;
  if (a === Infinity && b === Infinity) return 0.5;
  if (a === Infinity) return 1;
  if (b === Infinity) return 0;
  return null;
}
function dbetaLdCentral(x, a, b) {
  if (a < 0 || b < 0) return NaN;
  const mass = betaMassLoc(a, b);
  if (mass !== null) {
    if (mass === "both") return x === 0 || x === 1 ? Infinity : -Infinity;
    return x === mass ? Infinity : -Infinity;
  }
  if (x < 0 || x > 1) return -Infinity;
  if (x === 0) {
    if (a < 1) return Infinity;
    if (a === 1) return -lbetaF(a, b);
    return -Infinity;
  }
  if (x === 1) {
    if (b < 1) return Infinity;
    if (b === 1) return -lbetaF(a, b);
    return -Infinity;
  }
  return -lbetaF(a, b) + (a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x);
}
function pbetaPairCentral(q, a, b) {
  if (a < 0 || b < 0) return PAIRNAN;
  const mass = betaMassLoc(a, b);
  if (mass !== null) {
    if (mass === "both") return q < 0 ? PAIR0 : q < 1 ? PAIRHALF : PAIR1;
    if (mass === 0) return q < 0 ? PAIR0 : PAIR1;
    if (mass === 1) return q < 1 ? PAIR0 : PAIR1;
    return q < 0.5 ? PAIR0 : PAIR1;
  }
  if (q <= 0) return PAIR0;
  if (q >= 1) return PAIR1;
  return betaincPair(q, a, b);
}
function qbetaValCentral(pl, a, b) {
  if (a < 0 || b < 0) return NaN;
  if (pl === 0) return 0;
  if (pl === 1) return 1;
  const mass = betaMassLoc(a, b);
  if (mass !== null) {
    if (mass === "both") return pl < 0.5 ? 0 : pl === 0.5 ? 0.5 : 1;
    return mass;
  }
  return invertCdf((v) => betaincPair(v, a, b).lo, pl, 0, 1);
}
function dbetaLdNc(x, a, b, ncp) {
  if (!(a > 0) || !(b > 0) || !Number.isFinite(a) || !Number.isFinite(b))
    return NaN;
  if (x < 0 || x > 1) return -Infinity;
  const dens = poissonMixture(ncp / 2, (j) =>
    Math.exp(dbetaLdCentral(x, a + j, b)),
  );
  return Math.log(dens);
}
function pbetaPairNc(q, a, b, ncp) {
  if (!(a > 0) || !(b > 0) || !Number.isFinite(a) || !Number.isFinite(b))
    return PAIRNAN;
  if (q <= 0) return PAIR0;
  if (q >= 1) return PAIR1;
  const lo = poissonMixture(ncp / 2, (j) => betaincPair(q, a + j, b).lo);
  return pairFromLo(lo);
}
function qbetaValNc(pl, a, b, ncp) {
  if (!(a > 0) || !(b > 0) || !Number.isFinite(a) || !Number.isFinite(b))
    return NaN;
  if (pl === 0) return 0;
  if (pl === 1) return 1;
  return invertCdf((v) => pbetaPairNc(v, a, b, ncp).lo, pl, 0, 1);
}
const dbetaCore = ({ x, shape1, shape2, ncp }) =>
  ncp === 0
    ? dbetaLdCentral(x, shape1, shape2)
    : ncp > 0
      ? dbetaLdNc(x, shape1, shape2, ncp)
      : NaN;
const pbetaCore = ({ q, shape1, shape2, ncp }) =>
  ncp === 0
    ? pbetaPairCentral(q, shape1, shape2)
    : ncp > 0
      ? pbetaPairNc(q, shape1, shape2, ncp)
      : PAIRNAN;
const qbetaCore = ({ shape1, shape2, ncp, __pl }) =>
  ncp === 0
    ? qbetaValCentral(__pl.pl, shape1, shape2)
    : ncp > 0
      ? qbetaValNc(__pl.pl, shape1, shape2, ncp)
      : NaN;

// ---- F 分布（中心はベータ変換、非心は非心ベータ変換。df=Inf は実測の極限形）
function dfLdCentral(x, d1, d2) {
  if (!(d1 > 0) || !(d2 > 0)) return NaN;
  if (d1 === Infinity && d2 === Infinity) return x === 1 ? Infinity : -Infinity;
  if (x < 0) return -Infinity;
  if (x === 0) {
    if (d1 === Infinity) return -Infinity;
    if (d2 === Infinity) return Math.log(d1) + dgammaLd(0, d1 / 2, 2);
    if (d1 < 2) return Infinity;
    if (d1 === 2) return 0;
    return -Infinity;
  }
  if (x === Infinity) return -Infinity;
  if (d1 === Infinity)
    return Math.log(d2) + dgammaLd(d2 / x, d2 / 2, 2) - 2 * Math.log(x);
  if (d2 === Infinity) return Math.log(d1) + dgammaLd(d1 * x, d1 / 2, 2);
  const lr = Math.log(d1) + Math.log(x) - Math.log(d2);
  const logTerm = lr > 50 ? lr + Math.log1p(Math.exp(-lr)) : Math.log1p(Math.exp(lr));
  return (
    lgam((d1 + d2) / 2) - lgam(d1 / 2) - lgam(d2 / 2) +
    (d1 / 2) * (Math.log(d1) - Math.log(d2)) +
    (d1 / 2 - 1) * Math.log(x) -
    ((d1 + d2) / 2) * logTerm
  );
}
function pfPairCentral(q, d1, d2) {
  if (!(d1 > 0) || !(d2 > 0)) return PAIRNAN;
  if (q <= 0) return PAIR0;
  if (d1 === Infinity && d2 === Infinity)
    return q < 1 ? PAIR0 : q === 1 ? PAIRHALF : PAIR1;
  if (q === Infinity) return PAIR1;
  if (d1 === Infinity) {
    const gp = gammpPair(d2 / 2, d2 / (2 * q));
    return { lo: gp.hi, hi: gp.lo, logLo: gp.logHi, logHi: gp.logLo };
  }
  if (d2 === Infinity) return gammpPair(d1 / 2, (d1 * q) / 2);
  const y = (d1 * q) / (d2 + d1 * q);
  return betaincPair(y, d1 / 2, d2 / 2);
}
function qfValCentral(pl, d1, d2) {
  if (!(d1 > 0) || !(d2 > 0)) return NaN;
  if (d1 === Infinity && d2 === Infinity) {
    if (pl === 0) return 0;
    if (pl === 1) return Infinity;
    return 1;
  }
  if (d1 === Infinity)
    return invertCdf((v) => pfPairCentral(v, d1, d2).lo, pl, 0, 2);
  if (d2 === Infinity) return qgammaVal(pl, d1 / 2, 2) / d1;
  const y = qbetaValCentral(pl, d1 / 2, d2 / 2);
  if (y === 1) return Infinity;
  return (d2 / d1) * (y / (1 - y));
}
const dfCore = ({ x, df1, df2, ncp }) => {
  if (ncp === 0) return dfLdCentral(x, df1, df2);
  if (ncp < 0) return NaN;
  if (df1 === Infinity) return dfLdCentral(x, df1, df2);
  if (df2 === Infinity) return Math.log(df1) + dchisqNcLd(df1 * x, df1, ncp);
  if (!(df1 > 0) || !(df2 > 0)) return NaN;
  if (x < 0) return -Infinity;
  if (x === Infinity) return -Infinity;
  const y = (df1 * x) / (df2 + df1 * x);
  return (
    dbetaLdNc(y, df1 / 2, df2 / 2, ncp) +
    Math.log(df1 * df2) -
    2 * Math.log(df2 + df1 * x)
  );
};
function dchisqNcLd(x, df, ncp) {
  if (x < 0) return -Infinity;
  // F9：対数空間の混合（ncx2LogMixture）。
  return ncx2LogMixture(
    ncp / 2,
    (j) => dgammaLd(x, (df + 2 * j) / 2, 2),
    chisqLdMax(x, df),
  );
}
const pfCore = ({ q, df1, df2, ncp }) => {
  if (ncp === 0) return pfPairCentral(q, df1, df2);
  if (ncp < 0) return PAIRNAN;
  if (df1 === Infinity) return pfPairCentral(q, df1, df2);
  if (df2 === Infinity) return pchisqNcPair(df1 * q, df1, ncp);
  if (!(df1 > 0) || !(df2 > 0)) return PAIRNAN;
  if (q <= 0) return PAIR0;
  if (q === Infinity) return PAIR1;
  const y = (df1 * q) / (df2 + df1 * q);
  return pbetaPairNc(y, df1 / 2, df2 / 2, ncp);
};
const qfCore = ({ df1, df2, ncp, __pl }) => {
  if (ncp === 0) return qfValCentral(__pl.pl, df1, df2);
  if (ncp < 0) return NaN;
  if (df1 === Infinity) return qfValCentral(__pl.pl, df1, df2);
  if (df2 === Infinity) {
    if (__pl.pl === 0) return 0;
    if (__pl.pl === 1) return Infinity;
    const hi0 = Math.min(Math.max(df1 + ncp, 1), 1e300);
    return invertCdf((v) => pchisqNcPair(v, df1, ncp).lo, __pl.pl, 0, hi0) / df1;
  }
  if (!(df1 > 0) || !(df2 > 0)) return NaN;
  const y = qbetaValNc(__pl.pl, df1 / 2, df2 / 2, ncp);
  if (y === 1) return Infinity;
  return (df2 / df1) * (y / (1 - y));
};

// ---- t 分布（中心はベータ関係。非心は AS 243 型の級数：
// F(t) = Φ(-δ) + ½Σ_j [ p_j I_x(j+½, ν/2) + q_j I_x(j+1, ν/2) ]、
// x = t²/(ν+t²)、p_j は Poisson(δ²/2)、q_j = p_j・δ・Γ(j+1)/(√2 Γ(j+3/2))。
// mpmath／SciPy と全桁一致し、実 R 自身の打切り誤差（約1e-13）より正確）
function dtLdCentral(x, df) {
  if (df === Infinity)
    return -0.5 * Math.log(2 * Math.PI) - (x * x) / 2;
  return (
    lgam((df + 1) / 2) - lgam(df / 2) - 0.5 * Math.log(df * Math.PI) -
    ((df + 1) / 2) * Math.log1p((x * x) / df)
  );
}
function ptPairCentral(t, df) {
  if (df === Infinity) return normPair(t);
  if (t === 0) return PAIRHALF;
  const xb = df / (df + t * t);
  const ib = betaincPair(xb, df / 2, 0.5);
  if (t > 0) {
    const hi = 0.5 * ib.lo;
    return {
      lo: 1 - hi,
      hi,
      logLo: Math.log1p(-hi),
      logHi: Math.log(0.5) + ib.logLo,
    };
  }
  const lo = 0.5 * ib.lo;
  return {
    lo,
    hi: 1 - lo,
    logLo: Math.log(0.5) + ib.logLo,
    logHi: Math.log1p(-lo),
  };
}
function qtValCentral(pl, logPl, logPu, df) {
  if (df === Infinity) return qnormCore(pl, logPl, logPu);
  if (pl === 0) return -Infinity;
  if (pl === 1) return Infinity;
  if (pl === 0.5) return 0;
  if (pl > 0.5) {
    const xb = qbetaValCentral(2 * Math.exp(logPu), df / 2, 0.5);
    return Math.sqrt((df * (1 - xb)) / xb);
  }
  const xb = qbetaValCentral(2 * Math.exp(logPl), df / 2, 0.5);
  return -Math.sqrt((df * (1 - xb)) / xb);
}
function ptNcPair(t, df, ncp) {
  if (df === Infinity) return normPair(t - ncp);
  if (t === 0) return normPair(-ncp);
  if (t < 0) {
    const r = ptNcPair(-t, df, -ncp);
    return { lo: r.hi, hi: r.lo, logLo: r.logHi, logHi: r.logLo };
  }
  if (t === Infinity) return PAIR1;
  const x = (t * t) / (df + t * t), b = df / 2, lam = (ncp * ncp) / 2;
  const coef = ncp / Math.SQRT2;
  let S1 = 0, S2 = 0;
  const add = (j, w) => {
    if (w === 0) return;
    S1 += w * betaincPair(x, j + 0.5, b).lo;
    const rr = Math.exp(lgam(j + 1) - lgam(j + 1.5));
    S2 += w * coef * rr * betaincPair(x, j + 1, b).lo;
  };
  if (lam === 0) add(0, 1);
  else poissonWeights(lam, add);
  const base = normPair(-ncp);
  let lo = base.lo + 0.5 * (S1 + S2);
  let hi = base.hi - 0.5 * (S1 + S2);
  if (lo < 0) lo = 0;
  if (lo > 1) lo = 1;
  if (hi < 0) hi = 0;
  if (hi > 1) hi = 1;
  return { lo, hi, logLo: Math.log(lo), logHi: Math.log(hi) };
}
function dtNcLd(t, df, ncp) {
  if (df === Infinity) {
    const z = t - ncp;
    return -0.5 * Math.log(2 * Math.PI) - (z * z) / 2;
  }
  if (t === 0) return -(ncp * ncp) / 2 + dtLdCentral(0, df);
  if (t < 0) return dtNcLd(-t, df, -ncp);
  if (t === Infinity) return -Infinity;
  const lam = (ncp * ncp) / 2, b = df / 2;
  const x = (t * t) / (df + t * t), omx = df / (df + t * t);
  const logDxDt = Math.log(2 * t * df) - 2 * Math.log(df + t * t);
  const coef = ncp / Math.SQRT2;
  let S = 0;
  const add = (j, w) => {
    if (w === 0) return;
    const lE1 =
      (j - 0.5) * Math.log(x) + (b - 1) * Math.log(omx) -
      lbetaF(j + 0.5, b) + logDxDt;
    const lE2 =
      j * Math.log(x) + (b - 1) * Math.log(omx) - lbetaF(j + 1, b) + logDxDt;
    const rr = Math.exp(lgam(j + 1) - lgam(j + 1.5));
    S += w * (Math.exp(lE1) + coef * rr * Math.exp(lE2));
  };
  if (lam === 0) add(0, 1);
  else poissonWeights(lam, add);
  const f = 0.5 * S;
  return f > 0 ? Math.log(f) : -Infinity;
}
const dtCore = ({ x, df, ncp }) => {
  if (!(df > 0)) return NaN;
  if (ncp === 0) return dtLdCentral(x, df);
  return dtNcLd(x, df, ncp);
};
const ptCore = ({ q, df, ncp }) => {
  if (!(df > 0)) return PAIRNAN;
  if (ncp === 0) return ptPairCentral(q, df);
  return ptNcPair(q, df, ncp);
};
const qtCore = ({ df, ncp, __pl }) => {
  if (!(df > 0)) return NaN;
  if (ncp === 0) return qtValCentral(__pl.pl, __pl.logPl, __pl.logPu, df);
  if (df === Infinity) return ncp + qnormCore(__pl.pl, __pl.logPl, __pl.logPu);
  if (__pl.pl === 0) return -Infinity;
  if (__pl.pl === 1) return Infinity;
  return invertCdfReal((t) => ptNcPair(t, df, ncp).lo, __pl.pl, ncp);
};

// ================= 離散分布の核 =================

// ---- 二項分布（q の size は rint 強制、d/p の非整数 size は NaN：実測）
const nonIntX = (W, x) => {
  // 実 R は有限の非整数にのみ警告する（x = ±Inf では警告なし・値は 0。
  // 実 R 4.3.3 実測：dpois(Inf, 4)／dgeom(Inf, 0.4)／dnbinom(Inf, 10, 0.4)
  // はいずれも警告なし）。F2 の根因修正として共有ヘルパ側で有限性を見る。
  if (!Number.isFinite(x)) return;
  W.nonInt.push(`non-integer x = ${x.toFixed(6)}`);
};
const dbinomCore = ({ x, size, prob }, F, W) => {
  if (size < 0 || size !== Math.floor(size) || !Number.isFinite(size))
    return NaN;
  if (prob < 0 || prob > 1) return NaN;
  if (x < 0 || x > size) return -Infinity;
  if (!Number.isInteger(x)) {
    nonIntX(W, x);
    return -Infinity;
  }
  if (prob === 0) return x === 0 ? 0 : -Infinity;
  if (prob === 1) return x === size ? 0 : -Infinity;
  return (
    lchooseF(size, x) + x * Math.log(prob) + (size - x) * Math.log1p(-prob)
  );
};
function pbinomPair(q, size, prob) {
  if (q < 0) return PAIR0;
  if (q >= size) return PAIR1;
  const k = Math.floor(q);
  return betaincPair(1 - prob, size - k, k + 1);
}
const pbinomCore = ({ q, size, prob }, F, W) => {
  if (size < 0 || !Number.isFinite(size)) return PAIRNAN;
  if (size !== Math.floor(size)) {
    W.nonIntN.push(`non-integer n = ${size.toFixed(6)}`);
    return PAIRNAN;
  }
  if (prob < 0 || prob > 1) return PAIRNAN;
  return pbinomPair(q, size, prob);
};
const qbinomCore = ({ size, prob, __pl }) => {
  const n = rint(size);
  if (!(n >= 0) || !Number.isFinite(n)) return NaN;
  if (prob < 0 || prob > 1) return NaN;
  return discreteQuantile((k) => pbinomPair(k, n, prob).lo, __pl.pl, 0, n);
};

// ---- ポアソン分布（p は上側ガンマ関係）
const dpoisCore = ({ x, lambda }, F, W) => {
  if (lambda < 0) return NaN;
  if (lambda === 0) return x === 0 ? 0 : -Infinity;
  if (lambda === Infinity) return -Infinity;
  if (x < 0) return -Infinity;
  if (!Number.isInteger(x)) {
    nonIntX(W, x);
    return -Infinity;
  }
  return x * Math.log(lambda) - lambda - lgam(x + 1);
};
function ppoisPair(q, lambda) {
  if (q < 0) return PAIR0;
  if (q === Infinity) return PAIR1;
  if (lambda === 0) return PAIR1;
  if (lambda === Infinity) return PAIR0;
  const gp = gammpPair(Math.floor(q) + 1, lambda);
  return { lo: gp.hi, hi: gp.lo, logLo: gp.logHi, logHi: gp.logLo };
}
const ppoisCore = ({ q, lambda }) => {
  if (lambda < 0) return PAIRNAN;
  return ppoisPair(q, lambda);
};
const qpoisCore = ({ lambda, __pl }) => {
  if (lambda < 0) return NaN;
  if (lambda === 0) return 0;
  if (lambda === Infinity) return __pl.pl === 0 ? 0 : NaN;
  return discreteQuantile((k) => ppoisPair(k, lambda).lo, __pl.pl, 0, Infinity);
};

// ---- 幾何分布
const dgeomCore = ({ x, prob }, F, W) => {
  if (prob <= 0 || prob > 1) return NaN;
  if (x < 0) return -Infinity;
  if (!Number.isInteger(x)) {
    nonIntX(W, x);
    return -Infinity;
  }
  if (prob === 1) return x === 0 ? 0 : -Infinity;
  return Math.log(prob) + x * Math.log1p(-prob);
};
const pgeomCore = ({ q, prob }) => {
  if (prob <= 0 || prob > 1) return PAIRNAN;
  if (q < 0) return PAIR0;
  const t = (Math.floor(q) + 1) * Math.log1p(-prob);
  const lo = -Math.expm1(t);
  return { lo, hi: Math.exp(t), logLo: Math.log(lo), logHi: t };
};
const qgeomCore = ({ prob, __pl }) => {
  if (prob <= 0 || prob > 1) return NaN;
  if (prob === 1) return 0;
  if (__pl.pl === 0) return 0;
  if (__pl.pl === 1) return Infinity;
  let x = Math.ceil(__pl.logPu / Math.log1p(-prob)) - 1;
  if (x < 0) x = 0;
  const F = (k) => pgeomCore({ q: k, prob }).lo;
  while (F(x) < __pl.pl) x++;
  while (x > 0 && F(x - 1) >= __pl.pl) x--;
  return x;
};

// ---- 負の二項分布（prob と mu の排他は引数準備側で処理）
const dnbinomCore = ({ x, size, prob }, F, W) => {
  if (size < 0 || prob <= 0 || prob > 1) return NaN;
  if (x < 0) return -Infinity;
  if (!Number.isInteger(x)) {
    nonIntX(W, x);
    return -Infinity;
  }
  if (size === 0) return x === 0 ? 0 : -Infinity;
  if (prob === 1) return x === 0 ? 0 : -Infinity;
  return (
    lgam(x + size) - lgam(size) - lgam(x + 1) +
    size * Math.log(prob) + x * Math.log1p(-prob)
  );
};
function pnbinomPair(q, size, prob) {
  if (q < 0) return PAIR0;
  // F1：q = Inf は実 R では 1（lower.tail=FALSE で 0、log.p で 0）。
  // 兄弟の ppoisPair（q === Infinity で PAIR1）と同型のガードが無く、
  // betaincPair(prob, size, Inf) が NaN を返していたのが根因。
  if (q === Infinity) return PAIR1;
  if (size === 0) return PAIR1;
  return betaincPair(prob, size, Math.floor(q) + 1);
}
const pnbinomCore = ({ q, size, prob }) => {
  if (size < 0 || prob <= 0 || prob > 1) return PAIRNAN;
  return pnbinomPair(q, size, prob);
};
const qnbinomCore = ({ size, prob, __pl }) => {
  if (size < 0 || prob <= 0 || prob > 1) return NaN;
  if (size === 0 || prob === 1) return 0;
  return discreteQuantile((k) => pnbinomPair(k, size, prob).lo, __pl.pl, 0, Infinity);
};
// dnbinom 系の共通引数準備：prob と mu の両指定はエラー、両方なしは
// prob の欠落エラー（実 R ソース distn.R の文言どおり）。
const nbinomParams = (mainName) => (ctx, b) => {
  if (b.has("prob") && b.has("mu"))
    fail(ctx, "'prob' and 'mu' both specified");
  const o = {
    [mainName]: pvReq(ctx, b, mainName),
    size: pvReq(ctx, b, "size"),
  };
  if (b.has("prob")) {
    o.prob = pv(ctx, b, "prob", 0);
  } else if (b.has("mu")) {
    o.prob = null; // 下で実効 prob を合成する印
  } else {
    b.req("prob"); // 実 R どおり prob の欠落で停止する
  }
  if (o.prob === null) {
    const muArr = numVecDist(ctx, b.val("mu"));
    const n = Math.max(o[mainName].length, o.size.length, muArr.length);
    o.prob = Array.from({ length: n }, (_, i) => {
      const sz = o.size[i % o.size.length];
      const m = muArr[i % muArr.length];
      return sz / (sz + m);
    });
  }
  return o;
};

// ---- 超幾何分布（d は非整数パラメータで NaN、p/q は rint 強制：実測）
const dhyperCore = ({ x, m, n, k }, F, W) => {
  if (
    m < 0 || n < 0 || k < 0 || k > m + n ||
    m !== Math.floor(m) || n !== Math.floor(n) || k !== Math.floor(k)
  )
    return NaN;
  const lo = Math.max(0, k - n), hi = Math.min(k, m);
  if (x < lo || x > hi) return -Infinity;
  if (!Number.isInteger(x)) {
    nonIntX(W, x);
    return -Infinity;
  }
  return lchooseF(m, x) + lchooseF(n, k - x) - lchooseF(m + n, k);
};
function hyperSupport(m, n, k) {
  return { lo: Math.max(0, k - n), hi: Math.min(k, m) };
}
function phyperPair(q, m, n, k) {
  const { lo, hi } = hyperSupport(m, n, k);
  if (q < lo) return PAIR0;
  if (q >= hi) return PAIR1;
  const qq = Math.floor(q);
  const pmf = (x) =>
    Math.exp(lchooseF(m, x) + lchooseF(n, k - x) - lchooseF(m + n, k));
  const ratio = (x) => ((m - x) * (k - x)) / ((x + 1) * (n - k + x + 1));
  if (qq <= (lo + hi) / 2) {
    let term = pmf(lo), s = term;
    for (let x = lo; x < qq; x++) {
      term *= ratio(x);
      s += term;
    }
    return pairFromLo(s);
  }
  let term = pmf(hi), s = term;
  for (let x = hi; x > qq + 1; x--) {
    term /= ratio(x - 1);
    s += term;
  }
  const hiP = s;
  return { lo: 1 - hiP, hi: hiP, logLo: Math.log1p(-hiP), logHi: Math.log(hiP) };
}
const phyperCore = ({ q, m, n, k }) => {
  const mr = rint(m), nr = rint(n), kr = rint(k);
  if (mr < 0 || nr < 0 || kr < 0 || kr > mr + nr) return PAIRNAN;
  return phyperPair(q, mr, nr, kr);
};
const qhyperCore = ({ m, n, k, __pl }) => {
  const mr = rint(m), nr = rint(n), kr = rint(k);
  if (mr < 0 || nr < 0 || kr < 0 || kr > mr + nr) return NaN;
  const { lo, hi } = hyperSupport(mr, nr, kr);
  return discreteQuantile((x) => phyperPair(x, mr, nr, kr).lo, __pl.pl, lo, hi);
};

// ---- 符号付き順位（SignRank）と Wilcoxon 順位和：標本数は rint 強制（実測）。
// 確率 DP は値モデルで保持できる規模に上限を設け、超過は名指しで停止する。
const SIGNRANK_MAX_N = 400;
const signrankCache = new Map();
function signrankDist(n, failFn) {
  if (signrankCache.has(n)) return signrankCache.get(n);
  if (n > SIGNRANK_MAX_N)
    failFn(
      `dsignrank 系は n が ${SIGNRANK_MAX_N} 以下の場合のみ説明に対応しています（n = ${n}）`,
    );
  let dp = [1];
  for (let r = 1; r <= n; r++) {
    const ndp = new Array(dp.length + r).fill(0);
    for (let s = 0; s < dp.length; s++) {
      ndp[s] += dp[s] / 2;
      ndp[s + r] += dp[s] / 2;
    }
    dp = ndp;
  }
  const prefix = new Array(dp.length + 1).fill(0);
  for (let s = 0; s < dp.length; s++) prefix[s + 1] = prefix[s] + dp[s];
  const entry = { dp, prefix };
  signrankCache.set(n, entry);
  return entry;
}
const dsignrankCore = ({ x, n }, F, W, failFn) => {
  const nn = rint(n);
  if (!(nn > 0)) return NaN;
  const { dp } = signrankDist(nn, failFn);
  if (!Number.isInteger(x) || x < 0 || x >= dp.length) return -Infinity;
  return Math.log(dp[x]);
};
const psignrankCore = ({ q, n }, F, W, failFn) => {
  const nn = rint(n);
  if (!(nn > 0)) return PAIRNAN;
  const { dp, prefix } = signrankDist(nn, failFn);
  const S = dp.length - 1;
  const qq = Math.floor(q + 0.5); // 実 R は floor(q + 0.5) で丸める（実測）
  if (qq < 0) return PAIR0;
  if (qq >= S) return PAIR1;
  let lo = prefix[qq + 1];
  if (lo > 0.5) {
    const hi = prefix[S - qq];
    return { lo: 1 - hi, hi, logLo: Math.log1p(-hi), logHi: Math.log(hi) };
  }
  return { lo, hi: 1 - lo, logLo: Math.log(lo), logHi: Math.log1p(-lo) };
};
const qsignrankCore = ({ n, __pl }, F, W, failFn) => {
  const nn = rint(n);
  if (!(nn > 0)) return NaN;
  const { prefix } = signrankDist(nn, failFn);
  const S = prefix.length - 2;
  return discreteQuantile((k) => prefix[k + 1], __pl.pl, 0, S);
};

const WILCOX_MAX_OPS = 3e7;
const wilcoxCache = new Map();
function wilcoxDist(m, n, failFn) {
  const key = m + "," + n;
  if (wilcoxCache.has(key)) return wilcoxCache.get(key);
  const ops = (m * (m + 1)) / 2 * ((n * (n + 1)) / 2);
  if (ops > WILCOX_MAX_OPS)
    failFn(
      `dwilcox 系は m, n が大きすぎるため説明に対応していません（m = ${m}, n = ${n}）`,
    );
  let prev = new Map([["0,0", [1]]]);
  for (let t = 1; t <= m + n; t++) {
    const cur = new Map();
    for (let a = Math.max(0, t - n); a <= Math.min(m, t); a++) {
      const bb = t - a;
      if (bb < 0 || bb > n) continue;
      const arr = new Array(a * bb + 1).fill(0);
      if (bb >= 1 && prev.has(a + "," + (bb - 1))) {
        const src = prev.get(a + "," + (bb - 1));
        const wgt = bb / (a + bb);
        for (let k = 0; k < src.length; k++) arr[k] += wgt * src[k];
      }
      if (a >= 1 && prev.has(a - 1 + "," + bb)) {
        const src = prev.get(a - 1 + "," + bb);
        const wgt = a / (a + bb);
        for (let k = 0; k < src.length; k++) arr[k + bb] += wgt * src[k];
      }
      cur.set(a + "," + bb, arr);
    }
    prev = cur;
  }
  const dist = prev.get(key);
  const prefix = new Array(dist.length + 1).fill(0);
  for (let s = 0; s < dist.length; s++) prefix[s + 1] = prefix[s] + dist[s];
  const entry = { dist, prefix };
  wilcoxCache.set(key, entry);
  return entry;
}
const dwilcoxCore = ({ x, m, n }, F, W, failFn) => {
  const mm = rint(m), nn = rint(n);
  if (!(mm > 0) || !(nn > 0)) return NaN;
  const { dist } = wilcoxDist(mm, nn, failFn);
  if (!Number.isInteger(x) || x < 0 || x >= dist.length) return -Infinity;
  return Math.log(dist[x]);
};
const pwilcoxCore = ({ q, m, n }, F, W, failFn) => {
  const mm = rint(m), nn = rint(n);
  if (!(mm > 0) || !(nn > 0)) return PAIRNAN;
  const { dist, prefix } = wilcoxDist(mm, nn, failFn);
  const mn = dist.length - 1;
  const qq = Math.floor(q);
  if (qq < 0) return PAIR0;
  if (qq >= mn) return PAIR1;
  if (qq < mn / 2) {
    const lo = prefix[qq + 1];
    return { lo, hi: 1 - lo, logLo: Math.log(lo), logHi: Math.log1p(-lo) };
  }
  const hi = prefix[mn - qq];
  return { lo: 1 - hi, hi, logLo: Math.log1p(-hi), logHi: Math.log(hi) };
};
const qwilcoxCore = ({ m, n, __pl }, F, W, failFn) => {
  const mm = rint(m), nn = rint(n);
  if (!(mm > 0) || !(nn > 0)) return NaN;
  const { prefix } = wilcoxDist(mm, nn, failFn);
  const mn = prefix.length - 2;
  return discreteQuantile((k) => prefix[k + 1], __pl.pl, 0, mn);
};

// ================= ハンドラ登録（d/p/q） =================

const NORM_P = stdParams("x", [{ n: "mean", d: 0 }, { n: "sd", d: 1 }]);
const NORM_PQ = stdParams("q", [{ n: "mean", d: 0 }, { n: "sd", d: 1 }]);
const NORM_Q = stdParams("p", [{ n: "mean", d: 0 }, { n: "sd", d: 1 }]);
const CAUCHY_P = stdParams("x", [{ n: "location", d: 0 }, { n: "scale", d: 1 }]);
const CAUCHY_PQ = stdParams("q", [{ n: "location", d: 0 }, { n: "scale", d: 1 }]);
const CAUCHY_Q = stdParams("p", [{ n: "location", d: 0 }, { n: "scale", d: 1 }]);
const EXP_P = stdParams("x", [{ n: "rate", d: 1 }]);
const EXP_PQ = stdParams("q", [{ n: "rate", d: 1 }]);
const EXP_Q = stdParams("p", [{ n: "rate", d: 1 }]);
const UNIF_P = stdParams("x", [{ n: "min", d: 0 }, { n: "max", d: 1 }]);
const UNIF_PQ = stdParams("q", [{ n: "min", d: 0 }, { n: "max", d: 1 }]);
const UNIF_Q = stdParams("p", [{ n: "min", d: 0 }, { n: "max", d: 1 }]);
const LNORM_P = stdParams("x", [{ n: "meanlog", d: 0 }, { n: "sdlog", d: 1 }]);
const LNORM_PQ = stdParams("q", [{ n: "meanlog", d: 0 }, { n: "sdlog", d: 1 }]);
const LNORM_Q = stdParams("p", [{ n: "meanlog", d: 0 }, { n: "sdlog", d: 1 }]);
const WEIB_P = stdParams("x", [{ n: "shape", req: true }, { n: "scale", d: 1 }]);
const WEIB_PQ = stdParams("q", [{ n: "shape", req: true }, { n: "scale", d: 1 }]);
const WEIB_Q = stdParams("p", [{ n: "shape", req: true }, { n: "scale", d: 1 }]);
const BETA_P = stdParams("x", [
  { n: "shape1", req: true }, { n: "shape2", req: true }, { n: "ncp", d: 0 },
]);
const BETA_PQ = stdParams("q", [
  { n: "shape1", req: true }, { n: "shape2", req: true }, { n: "ncp", d: 0 },
]);
const BETA_Q = stdParams("p", [
  { n: "shape1", req: true }, { n: "shape2", req: true }, { n: "ncp", d: 0 },
]);
const CHISQ_P = stdParams("x", [{ n: "df", req: true }, { n: "ncp", d: 0 }]);
const CHISQ_PQ = stdParams("q", [{ n: "df", req: true }, { n: "ncp", d: 0 }]);
const CHISQ_Q = stdParams("p", [{ n: "df", req: true }, { n: "ncp", d: 0 }]);
const F_P = stdParams("x", [
  { n: "df1", req: true }, { n: "df2", req: true }, { n: "ncp", d: 0 },
]);
const F_PQ = stdParams("q", [
  { n: "df1", req: true }, { n: "df2", req: true }, { n: "ncp", d: 0 },
]);
const F_Q = stdParams("p", [
  { n: "df1", req: true }, { n: "df2", req: true }, { n: "ncp", d: 0 },
]);
const T_P = stdParams("x", [{ n: "df", req: true }, { n: "ncp", d: 0 }]);
const T_PQ = stdParams("q", [{ n: "df", req: true }, { n: "ncp", d: 0 }]);
const T_Q = stdParams("p", [{ n: "df", req: true }, { n: "ncp", d: 0 }]);
const BINOM_P = stdParams("x", [{ n: "size", req: true }, { n: "prob", req: true }]);
const BINOM_PQ = stdParams("q", [{ n: "size", req: true }, { n: "prob", req: true }]);
const BINOM_Q = stdParams("p", [{ n: "size", req: true }, { n: "prob", req: true }]);
const POIS_P = stdParams("x", [{ n: "lambda", req: true }]);
const POIS_PQ = stdParams("q", [{ n: "lambda", req: true }]);
const POIS_Q = stdParams("p", [{ n: "lambda", req: true }]);
const GEOM_P = stdParams("x", [{ n: "prob", req: true }]);
const GEOM_PQ = stdParams("q", [{ n: "prob", req: true }]);
const GEOM_Q = stdParams("p", [{ n: "prob", req: true }]);
const HYPER_P = stdParams("x", [
  { n: "m", req: true }, { n: "n", req: true }, { n: "k", req: true },
]);
const HYPER_PQ = stdParams("q", [
  { n: "m", req: true }, { n: "n", req: true }, { n: "k", req: true },
]);
const HYPER_Q = stdParams("p", [
  { n: "m", req: true }, { n: "n", req: true }, { n: "k", req: true },
]);
const SIGNRANK_P = stdParams("x", [{ n: "n", req: true }]);
const SIGNRANK_PQ = stdParams("q", [{ n: "n", req: true }]);
const SIGNRANK_Q = stdParams("p", [{ n: "n", req: true }]);
const WILCOX_P = stdParams("x", [{ n: "m", req: true }, { n: "n", req: true }]);
const WILCOX_PQ = stdParams("q", [{ n: "m", req: true }, { n: "n", req: true }]);
const WILCOX_Q = stdParams("p", [{ n: "m", req: true }, { n: "n", req: true }]);

const LT = ["lower.tail", "log.p"];

// ================= 多項分布の密度（実 R の R ソースの処理順をそのまま再現） =================
const dmultinomH = (ctx) => {
  const b = bindArgs(ctx, ["x", "size", "prob", "log"]);
  for (const f of ["x", "size", "prob", "log"])
    if (b.has(f) && ctx.H.isUnknown(b.val(f))) return b.val(f);
  const logF = flagVal(ctx, b, "log", false);
  if (ctx.H.isUnknown(logF)) return logF;
  const xEls = numVecDist(ctx, b.req("x"));
  const probEls = numVecDist(ctx, b.req("prob"));
  if (xEls.length !== probEls.length)
    fail(ctx, "x[] and prob[] must be equal length vectors.");
  let s = 0, probBad = false;
  for (const e of probEls) {
    if (ctx.H.isNA(e) || typeof e !== "number" || !Number.isFinite(e) || e < 0)
      probBad = true;
    else s += e;
  }
  if (probBad || s === 0)
    fail(ctx, "probabilities must be finite, non-negative and not all 0");
  const prob = probEls.map((e) => e / s);
  const xi = xEls.map((e) =>
    ctx.H.isNA(e) || typeof e !== "number" || !Number.isFinite(e)
      ? null
      : Math.trunc(e + 0.5),
  );
  if (xi.some((v) => v !== null && v < 0)) fail(ctx, "'x' must be non-negative");
  if (xi.some((v) => v === null))
    fail(ctx, "missing value where TRUE/FALSE needed");
  const N = xi.reduce((acc, v) => acc + v, 0);
  let size = N;
  if (b.has("size")) {
    const sv = ctx.H.vec(b.val("size"));
    if (sv.length > 1) fail(ctx, "the condition has length > 1");
    if (sv.length === 0) fail(ctx, "argument is of length zero");
    const sEl = sv[0];
    if (ctx.H.isNA(sEl) || (typeof sEl === "number" && Number.isNaN(sEl)))
      fail(ctx, "missing value where TRUE/FALSE needed");
    const sNum = typeof sEl === "boolean" ? (sEl ? 1 : 0) : sEl;
    if (typeof sNum !== "number")
      fail(ctx, "missing value where TRUE/FALSE needed");
    if (sNum !== N) fail(ctx, "size != sum(x), i.e. one is wrong");
    size = sNum;
  }
  let r = lgam(size + 1);
  for (let i = 0; i < xi.length; i++) {
    if (prob[i] === 0) {
      if (xi[i] !== 0) return logF ? -Infinity : 0;
      continue;
    }
    r += xi[i] * Math.log(prob[i]) - lgam(xi[i] + 1);
  }
  return logF ? r : Math.exp(r);
};

// ================= 誕生日のパラドックス（実 R ソース birthday.R の式を再現） =================
function pbirthdayCore(n, c, k) {
  if (k < 2) return 1;
  if (k === 2) {
    if (n <= 1) return 0;
    if (n > c) return 1;
    const terms = Math.floor(n);
    let s = 0;
    for (let i = 0; i < terms; i++) s += Math.log1p(-i / c);
    return -Math.expm1(s);
  }
  if (k > n) return 0;
  if (n > c * (k - 1)) return 1;
  const lhs =
    (n * Math.exp(-n / (c * k))) / Math.pow(1 - n / (c * (k + 1)), 1 / k);
  const lxx = k * Math.log(lhs) - (k - 1) * Math.log(c) - lgam(k + 1);
  return -Math.expm1(-Math.exp(lxx));
}
function firstWithWarn(ctx, b, name, dflt) {
  if (!b.has(name)) return dflt;
  const els = numVecDist(ctx, b.val(name));
  if (els.length > 1)
    warn(
      ctx,
      `numerical expression has ${els.length} elements: only the first used`,
    );
  if (els.length === 0) fail(ctx, "argument is of length zero");
  return els[0];
}
const pbirthdayH = (ctx) => {
  const b = bindArgs(ctx, ["n", "classes", "coincident"]);
  for (const f of ["n", "classes", "coincident"])
    if (b.has(f) && ctx.H.isUnknown(b.val(f))) return b.val(f);
  const nEls = numVecDist(ctx, b.req("n"));
  if (nEls.length === 0) return [];
  if (nEls.length > 1) fail(ctx, "invalid 'times' argument");
  const n = nEls[0];
  const c = firstWithWarn(ctx, b, "classes", 365);
  const k = firstWithWarn(ctx, b, "coincident", 2);
  if (ctx.H.isNA(n) || ctx.H.isNA(c) || ctx.H.isNA(k)) return ctx.H.NA;
  return pbirthdayCore(n, c, k);
};
const qbirthdayH = (ctx) => {
  const b = bindArgs(ctx, ["prob", "classes", "coincident"]);
  for (const f of ["prob", "classes", "coincident"])
    if (b.has(f) && ctx.H.isUnknown(b.val(f))) return b.val(f);
  const pEls = b.has("prob") ? numVecDist(ctx, b.val("prob")) : [0.5];
  if (pEls.length === 0) fail(ctx, "argument is of length zero");
  if (pEls.length > 1) fail(ctx, "the condition has length > 1");
  const prob = pEls[0];
  const c = firstWithWarn(ctx, b, "classes", 365);
  const k = firstWithWarn(ctx, b, "coincident", 2);
  if (ctx.H.isNA(prob) || ctx.H.isNA(c) || ctx.H.isNA(k)) return ctx.H.NA;
  // coincident < 2 では実 R の qbirthday は無限ループになる（実測で確認）。
  // pbirthday は常に 1 なので、意味のある最小の人数 1 を返す。
  if (k < 2) return 1;
  if (prob <= 0) return 1;
  if (prob >= 1) return c * (k - 1) + 1;
  let N = Math.ceil(
    Math.exp(
      ((k - 1) * Math.log(c) + lgam(k + 1) + Math.log(-Math.log1p(-prob))) / k,
    ),
  );
  if (!(N >= 1)) N = 1;
  while (pbirthdayCore(N, c, k) < prob) N++;
  while (N > 1 && pbirthdayCore(N - 1, c, k) >= prob) N--;
  return N;
};

// ================= r 系（検証してから freshUnknown） =================
function rRun(ctx, formals, nName, opts = {}) {
  const b = bindArgs(ctx, formals);
  for (const f of formals)
    if (b.has(f) && ctx.H.isUnknown(b.val(f))) return b.val(f);
  const rawN = b.req(nName);
  const nv = ctx.H.vec(rawN);
  let bad = nv.length === 0;
  if (!bad && nv.length === 1) {
    let el = nv[0];
    if (typeof el === "boolean") el = el ? 1 : 0;
    if (
      typeof el !== "number" || Number.isNaN(el) || el < 0 ||
      !Number.isFinite(el)
    )
      bad = true;
  }
  if (bad) fail(ctx, opts.nMsg ?? "invalid arguments");
  if (opts.extra) opts.extra(ctx, b);
  return ctx.api.freshUnknown(ctx.name + "の実行時の値", ctx.s);
}
const NVreq = (ctx, b, name) => numVecDist(ctx, b.req(name));
const NVopt = (ctx, b, name) =>
  b.has(name) ? numVecDist(ctx, b.val(name)) : null;
function anyBad(ctx, els, pred) {
  if (!els) return false;
  return els.some(
    (e) =>
      ctx.H.isNA(e) ||
      (typeof e === "number" && (Number.isNaN(e) || pred(e))),
  );
}
function warnNA(ctx, b, checks) {
  for (const [name, els, pred] of checks) {
    void name;
    if (anyBad(ctx, els, pred)) {
      warn(ctx, "NAが生成されました（NAs produced）");
      return;
    }
  }
  void b;
}
const RH = (formals, nName, extra) => (ctx) =>
  rRun(ctx, formals, nName, { extra });

const rmultinomH = (ctx) => {
  const b = bindArgs(ctx, ["n", "size", "prob"]);
  for (const f of ["n", "size", "prob"])
    if (b.has(f) && ctx.H.isUnknown(b.val(f))) return b.val(f);
  const nv = ctx.H.vec(b.req("n"));
  let nEl = nv[0];
  if (typeof nEl === "boolean") nEl = nEl ? 1 : 0;
  if (
    nv.length === 0 || typeof nEl !== "number" || Number.isNaN(nEl) ||
    nEl < 0 || !Number.isFinite(nEl)
  )
    fail(ctx, "invalid first argument 'n'");
  const sizeEls = NVreq(ctx, b, "size");
  const sEl = sizeEls[0];
  if (
    sizeEls.length === 0 || ctx.H.isNA(sEl) || typeof sEl !== "number" ||
    Number.isNaN(sEl) || sEl < 0
  )
    fail(ctx, "invalid second argument 'size'");
  const probEls = NVreq(ctx, b, "prob");
  let total = 0, badProb = probEls.length === 0;
  for (const e of probEls) {
    if (ctx.H.isNA(e) || typeof e !== "number" || Number.isNaN(e) || !Number.isFinite(e))
      badProb = true;
    else total += e;
  }
  if (badProb || !(total > 0)) fail(ctx, "no positive probabilities");
  return ctx.api.freshUnknown(ctx.name + "の実行時の値", ctx.s);
};
// F5：rWishart は通常の r 系（rRun）の n 検証と実 R が食い違う。
// 実 R 4.3.3 実測：n が負・0・NA・numeric(0) でもエラーにならず
// 1 スライスの配列を返し、n = 2.5 は 2 スライス（切り捨て）、
// ベクトル n は先頭要素を使う。よって n は存在確認のみとし値を検証しない。
// df は次元 p に対し df < p で "inconsistent degrees of freedom and
// dimension"（C 実装の検証）。p >= 1 は常に成り立つので df < 1 は
// 無条件に停止し、Sigma が具体的な平方長ベクトルなら p = sqrt(length)
// でも判定する。df = NA は NaN の配列を返す（エラー・警告なし）。
const rWishartH = (ctx) => {
  const b = bindArgs(ctx, ["n", "df", "Sigma"]);
  for (const f of ["n", "df", "Sigma"])
    if (b.has(f) && ctx.H.isUnknown(b.val(f))) return b.val(f);
  b.req("n");
  const dfRaw = b.req("df");
  const sgRaw = b.req("Sigma");
  if (!ctx.H.isUnknown(dfRaw)) {
    const dv = ctx.H.vec(dfRaw);
    const d0 = dv[0];
    if (typeof d0 === "number" && !Number.isNaN(d0)) {
      let p = 1;
      if (!isDf(sgRaw) && !ctx.H.isUnknown(sgRaw)) {
        const sl = ctx.H.vec(sgRaw).length;
        const sq = Math.sqrt(sl);
        if (Number.isInteger(sq) && sq >= 1) p = sq;
      }
      if (d0 < p)
        fail(ctx, "inconsistent degrees of freedom and dimension");
    }
  }
  return ctx.api.freshUnknown(ctx.name + "の実行時の値", ctx.s);
};
const r2dtableH = (ctx) => {
  const b = bindArgs(ctx, ["n", "r", "c"]);
  for (const f of ["n", "r", "c"])
    if (b.has(f) && ctx.H.isUnknown(b.val(f))) return b.val(f);
  const nv = ctx.H.vec(b.req("n"));
  let nEl = nv[0];
  if (typeof nEl === "boolean") nEl = nEl ? 1 : 0;
  if (
    nv.length === 0 || typeof nEl !== "number" || Number.isNaN(nEl) ||
    nEl < 0 || !Number.isFinite(nEl)
  )
    fail(ctx, "invalid argument 'n'");
  const truncSum = (els, label) => {
    let s = 0;
    for (const e of els) {
      if (ctx.H.isNA(e) || typeof e !== "number" || Number.isNaN(e))
        fail(ctx, `invalid argument '${label}'`);
      const t = Math.trunc(e);
      if (t < 0) fail(ctx, `invalid argument '${label}'`);
      s += t;
    }
    return s;
  };
  const sr = truncSum(NVreq(ctx, b, "r"), "r");
  const sc = truncSum(NVreq(ctx, b, "c"), "c");
  if (sr !== sc) fail(ctx, "arguments 'r' and 'c' must have the same sums");
  return ctx.api.freshUnknown(ctx.name + "の実行時の値", ctx.s);
};

// ================= 組み込み登録 =================
export const builtins = new Map([
  // ベータ分布
  ["dbeta", DH(["x", "shape1", "shape2", "ncp", "log"], BETA_P, dbetaCore)],
  ["pbeta", PH(["q", "shape1", "shape2", "ncp", ...LT], BETA_PQ, pbetaCore)],
  ["qbeta", QH(["p", "shape1", "shape2", "ncp", ...LT], BETA_Q, qbetaCore)],
  ["rbeta", RH(["n", "shape1", "shape2", "ncp"], "n", (ctx, b) => {
    const s1 = NVreq(ctx, b, "shape1"), s2 = NVreq(ctx, b, "shape2");
    const nc = NVopt(ctx, b, "ncp");
    warnNA(ctx, b, [["shape1", s1, (e) => e < 0], ["shape2", s2, (e) => e < 0], ["ncp", nc, (e) => e < 0]]);
  })],
  // 二項分布
  ["dbinom", DH(["x", "size", "prob", "log"], BINOM_P, dbinomCore)],
  ["pbinom", PH(["q", "size", "prob", ...LT], BINOM_PQ, pbinomCore)],
  ["qbinom", QH(["p", "size", "prob", ...LT], BINOM_Q, qbinomCore)],
  ["rbinom", RH(["n", "size", "prob"], "n", (ctx, b) => {
    const sz = NVreq(ctx, b, "size"), pr = NVreq(ctx, b, "prob");
    warnNA(ctx, b, [["size", sz, (e) => e < 0], ["prob", pr, (e) => e < 0 || e > 1]]);
  })],
  // コーシー分布
  ["dcauchy", DH(["x", "location", "scale", "log"], CAUCHY_P, dcauchyCore)],
  ["pcauchy", PH(["q", "location", "scale", ...LT], CAUCHY_PQ, pcauchyCore)],
  ["qcauchy", QH(["p", "location", "scale", ...LT], CAUCHY_Q, qcauchyCore)],
  ["rcauchy", RH(["n", "location", "scale"], "n", (ctx, b) => {
    const sc = NVopt(ctx, b, "scale");
    const lc = NVopt(ctx, b, "location");
    // location の NA／NaN でも実 R は NAs produced を警告する（実測）。
    warnNA(ctx, b, [["scale", sc, (e) => e < 0], ["location", lc, () => false]]);
  })],
  // カイ二乗分布
  ["dchisq", DH(["x", "df", "ncp", "log"], CHISQ_P, dchisqCore)],
  ["pchisq", PH(["q", "df", "ncp", ...LT], CHISQ_PQ, pchisqCore)],
  ["qchisq", QH(["p", "df", "ncp", ...LT], CHISQ_Q, qchisqCore)],
  ["rchisq", RH(["n", "df", "ncp"], "n", (ctx, b) => {
    const dfv = NVreq(ctx, b, "df");
    const nc = NVopt(ctx, b, "ncp");
    warnNA(ctx, b, [["df", dfv, (e) => e < 0], ["ncp", nc, (e) => e < 0]]);
  })],
  // 指数分布
  ["dexp", DH(["x", "rate", "log"], EXP_P, dexpCore)],
  ["pexp", PH(["q", "rate", ...LT], EXP_PQ, pexpCore)],
  ["qexp", QH(["p", "rate", ...LT], EXP_Q, qexpCore)],
  ["rexp", RH(["n", "rate"], "n", (ctx, b) => {
    const rt = NVopt(ctx, b, "rate");
    // F3 同根：rate = 0 でも実 R は NaN を返し NAs produced を警告する（実測）。
    warnNA(ctx, b, [["rate", rt, (e) => e <= 0]]);
  })],
  // F 分布（df は実在関数として登録する）
  ["df", DH(["x", "df1", "df2", "ncp", "log"], F_P, dfCore)],
  ["pf", PH(["q", "df1", "df2", "ncp", ...LT], F_PQ, pfCore)],
  ["qf", QH(["p", "df1", "df2", "ncp", ...LT], F_Q, qfCore)],
  ["rf", RH(["n", "df1", "df2", "ncp"], "n", (ctx, b) => {
    const d1 = NVreq(ctx, b, "df1"), d2 = NVreq(ctx, b, "df2");
    const nc = NVopt(ctx, b, "ncp");
    warnNA(ctx, b, [["df1", d1, (e) => e <= 0], ["df2", d2, (e) => e <= 0], ["ncp", nc, () => false]]);
  })],
  // ガンマ分布
  ["dgamma", DH(["x", "shape", "rate", "scale", "log"], gammaParams("x"), dgammaCore)],
  ["pgamma", PH(["q", "shape", "rate", "scale", ...LT], gammaParams("q"), pgammaCore)],
  ["qgamma", QH(["p", "shape", "rate", "scale", ...LT], gammaParams("p"), qgammaCore)],
  ["rgamma", RH(["n", "shape", "rate", "scale"], "n", (ctx, b) => {
    const sh = NVreq(ctx, b, "shape");
    checkRateScale(ctx, b);
    // F3 同根：scale／rate が負でも実 R は NAs produced を警告する（実測。
    // scale = 0／rate = 0 は警告なし：scale=0 は 0、rate=0 は Inf を返す）。
    const sc = NVopt(ctx, b, "scale"), rt2 = NVopt(ctx, b, "rate");
    warnNA(ctx, b, [["shape", sh, (e) => e < 0], ["scale", sc, (e) => e < 0], ["rate", rt2, (e) => e < 0]]);
  })],
  // 幾何分布
  ["dgeom", DH(["x", "prob", "log"], GEOM_P, dgeomCore)],
  ["pgeom", PH(["q", "prob", ...LT], GEOM_PQ, pgeomCore)],
  ["qgeom", QH(["p", "prob", ...LT], GEOM_Q, qgeomCore)],
  ["rgeom", RH(["n", "prob"], "n", (ctx, b) => {
    const pr = NVreq(ctx, b, "prob");
    // F3 同根：prob = 0 でも実 R は NA を返し NAs produced を警告する（実測）。
    warnNA(ctx, b, [["prob", pr, (e) => e <= 0 || e > 1]]);
  })],
  // 超幾何分布
  ["dhyper", DH(["x", "m", "n", "k", "log"], HYPER_P, dhyperCore)],
  ["phyper", PH(["q", "m", "n", "k", ...LT], HYPER_PQ, phyperCore)],
  ["qhyper", QH(["p", "m", "n", "k", ...LT], HYPER_Q, qhyperCore)],
  ["rhyper", RH(["nn", "m", "n", "k"], "nn", (ctx, b) => {
    const mv = NVreq(ctx, b, "m"), nv2 = NVreq(ctx, b, "n"), kv = NVreq(ctx, b, "k");
    // F3 同根：k > m + n でも実 R は NA を返し NAs produced を警告する
    // （実測：rhyper(3, 10, 5, 16)。k = m + n は正常）。警告は実 R どおり
    // 最大で 1 回だけ出すため、他の不正条件とまとめて判定する。
    const L = Math.max(mv.length, nv2.length, kv.length);
    let over = false;
    for (let i = 0; i < L; i++) {
      const mm = mv[i % mv.length], nn2 = nv2[i % nv2.length], kk = kv[i % kv.length];
      if (typeof mm === "number" && typeof nn2 === "number" && typeof kk === "number" &&
        !Number.isNaN(mm) && !Number.isNaN(nn2) && !Number.isNaN(kk) && kk > mm + nn2)
        over = true;
    }
    const bad = over ||
      anyBad(ctx, mv, (e) => e < 0) || anyBad(ctx, nv2, (e) => e < 0) ||
      anyBad(ctx, kv, (e) => e < 0);
    if (bad) warn(ctx, "NAが生成されました（NAs produced）");
  })],
  // 対数正規分布
  ["dlnorm", DH(["x", "meanlog", "sdlog", "log"], LNORM_P, dlnormCore)],
  ["plnorm", PH(["q", "meanlog", "sdlog", ...LT], LNORM_PQ, plnormCore)],
  ["qlnorm", QH(["p", "meanlog", "sdlog", ...LT], LNORM_Q, qlnormCore)],
  ["rlnorm", RH(["n", "meanlog", "sdlog"], "n", (ctx, b) => {
    const sd = NVopt(ctx, b, "sdlog");
    const ml = NVopt(ctx, b, "meanlog");
    warnNA(ctx, b, [["sdlog", sd, (e) => e < 0], ["meanlog", ml, () => false]]);
  })],
  // ロジスティック分布
  ["dlogis", DH(["x", "location", "scale", "log"], CAUCHY_P, dlogisCore)],
  ["plogis", PH(["q", "location", "scale", ...LT], CAUCHY_PQ, plogisCore)],
  ["qlogis", QH(["p", "location", "scale", ...LT], CAUCHY_Q, qlogisCore)],
  ["rlogis", RH(["n", "location", "scale"], "n", (ctx, b) => {
    const sc = NVopt(ctx, b, "scale");
    const lc = NVopt(ctx, b, "location");
    // F3：実 R の rlogis は負の scale でも正常な値を返し警告しない
    // （実測：rlogis(3, 0, -1) は値が返り警告なし。qlogis の単調反転として
    // 処理される）。警告するのは location／scale が NA／NaN のときだけ。
    warnNA(ctx, b, [["scale", sc, () => false], ["location", lc, () => false]]);
  })],
  // 多項分布
  ["dmultinom", dmultinomH],
  ["rmultinom", rmultinomH],
  // 負の二項分布
  ["dnbinom", DH(["x", "size", "prob", "mu", "log"], nbinomParams("x"), dnbinomCore)],
  ["pnbinom", PH(["q", "size", "prob", "mu", ...LT], nbinomParams("q"), pnbinomCore)],
  ["qnbinom", QH(["p", "size", "prob", "mu", ...LT], nbinomParams("p"), qnbinomCore)],
  ["rnbinom", RH(["n", "size", "prob", "mu"], "n", (ctx, b) => {
    if (b.has("prob") && b.has("mu")) fail(ctx, "'prob' and 'mu' both specified");
    const sz = NVreq(ctx, b, "size");
    // F3 同根：size = 0 でも実 R は NA／NaN を返し NAs produced を警告する
    // （実測：rnbinom(3, 0, 0.5)／rnbinom(3, size = 0, mu = 5)）。
    let bad = anyBad(ctx, sz, (e) => e <= 0);
    if (b.has("prob")) bad = bad || anyBad(ctx, NVopt(ctx, b, "prob"), (e) => e <= 0 || e > 1);
    else if (b.has("mu")) bad = bad || anyBad(ctx, NVopt(ctx, b, "mu"), (e) => e < 0);
    else b.req("prob");
    if (bad) warn(ctx, "NAが生成されました（NAs produced）");
  })],
  // 正規分布（rnorm は基礎層）
  ["dnorm", DH(["x", "mean", "sd", "log"], NORM_P, dnormCore)],
  ["pnorm", PH(["q", "mean", "sd", ...LT], NORM_PQ, pnormCore)],
  ["qnorm", QH(["p", "mean", "sd", ...LT], NORM_Q, qnormCoreF)],
  // ポアソン分布
  ["dpois", DH(["x", "lambda", "log"], POIS_P, dpoisCore)],
  ["ppois", PH(["q", "lambda", ...LT], POIS_PQ, ppoisCore)],
  ["qpois", QH(["p", "lambda", ...LT], POIS_Q, qpoisCore)],
  ["rpois", RH(["n", "lambda"], "n", (ctx, b) => {
    const lm = NVreq(ctx, b, "lambda");
    warnNA(ctx, b, [["lambda", lm, (e) => e < 0]]);
  })],
  // 符号付き順位分布
  ["dsignrank", DH(["x", "n", "log"], SIGNRANK_P, dsignrankCore)],
  ["psignrank", PH(["q", "n", ...LT], SIGNRANK_PQ, psignrankCore)],
  ["qsignrank", QH(["p", "n", ...LT], SIGNRANK_Q, qsignrankCore)],
  ["rsignrank", RH(["nn", "n"], "nn", (ctx, b) => {
    const nv2 = NVreq(ctx, b, "n");
    warnNA(ctx, b, [["n", nv2, (e) => e < 0]]);
  })],
  // Smirnov 分布（rsmirnov のみ生成系として登録。p/q は未対応）
  ["rsmirnov", RH(["n", "sizes", "z", "two.sided"], "n", (ctx, b) => {
    const sv = b.req("sizes");
    if (ctx.H.isUnknown(sv)) return;
    if (ctx.H.vec(sv).length !== 2)
      fail(ctx, "argument 'sizes' must be a vector of length 2");
    // F4：sizes の値の検証が無く、rsmirnov(3, c(-1, 12)) が通っていた。
    // 実 R 4.3.3 実測：要素が NA／NaN なら "missing value where TRUE/FALSE
    // needed"、0 以下なら "not enough 'x' data"、Inf なら
    // "invalid 'times' value" で停止する（非整数は切り捨てて正常）。
    const els = numVecDist(ctx, sv);
    if (els.some((e) => ctx.H.isNA(e) || (typeof e === "number" && Number.isNaN(e))))
      fail(ctx, "missing value where TRUE/FALSE needed");
    if (els.some((e) => typeof e === "number" && e <= 0))
      fail(ctx, "not enough 'x' data");
    if (els.some((e) => e === Infinity || e === -Infinity))
      fail(ctx, "invalid 'times' value");
  })],
  // t 分布
  ["dt", DH(["x", "df", "ncp", "log"], T_P, dtCore)],
  ["pt", PH(["q", "df", "ncp", ...LT], T_PQ, ptCore)],
  ["qt", QH(["p", "df", "ncp", ...LT], T_Q, qtCore)],
  ["rt", RH(["n", "df", "ncp"], "n", (ctx, b) => {
    const dfv = NVreq(ctx, b, "df");
    const nc = NVopt(ctx, b, "ncp");
    // ncp の NA／NaN でも実 R は NAs produced を警告する（実測）。
    warnNA(ctx, b, [["df", dfv, (e) => e <= 0], ["ncp", nc, () => false]]);
  })],
  // 一様分布（runif は基礎層）
  ["dunif", DH(["x", "min", "max", "log"], UNIF_P, dunifCore)],
  ["punif", PH(["q", "min", "max", ...LT], UNIF_PQ, punifCore)],
  ["qunif", QH(["p", "min", "max", ...LT], UNIF_Q, qunifCore)],
  // ワイブル分布
  ["dweibull", DH(["x", "shape", "scale", "log"], WEIB_P, dweibullCore)],
  ["pweibull", PH(["q", "shape", "scale", ...LT], WEIB_PQ, pweibullCore)],
  ["qweibull", QH(["p", "shape", "scale", ...LT], WEIB_Q, qweibullCore)],
  ["rweibull", RH(["n", "shape", "scale"], "n", (ctx, b) => {
    const sh = NVreq(ctx, b, "shape");
    const sc = NVopt(ctx, b, "scale");
    warnNA(ctx, b, [["shape", sh, (e) => e <= 0], ["scale", sc, (e) => e < 0]]);
  })],
  // Wilcoxon 順位和分布
  ["dwilcox", DH(["x", "m", "n", "log"], WILCOX_P, dwilcoxCore)],
  ["pwilcox", PH(["q", "m", "n", ...LT], WILCOX_PQ, pwilcoxCore)],
  ["qwilcox", QH(["p", "m", "n", ...LT], WILCOX_Q, qwilcoxCore)],
  ["rwilcox", RH(["nn", "m", "n"], "nn", (ctx, b) => {
    const mv = NVreq(ctx, b, "m"), nv2 = NVreq(ctx, b, "n");
    warnNA(ctx, b, [["m", mv, (e) => e < 0], ["n", nv2, (e) => e < 0]]);
  })],
  // 誕生日のパラドックス
  ["pbirthday", pbirthdayH],
  ["qbirthday", qbirthdayH],
  // Wishart 分布の生成（Sigma の行列性は値モデルで検証できないため
  // 行列性そのものは検証しない。n／df の扱いは実 R に合わせた専用
  // ハンドラ rWishartH を使う：F5）
  ["rWishart", rWishartH],
  // 分割表の生成
  ["r2dtable", r2dtableH],
]);
