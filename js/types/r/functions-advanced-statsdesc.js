// 高度モード B4S：R 高度関数グループ「記述統計・集計」（stats、高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章／B4S 共通ブリーフ。
// 意味論は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3（/usr/bin/Rscript）
// の実測、ならびに R 公式ソース（stats/R/cor.R、quantile.R、
// weighted.mean.R、src/main/cov.c）で裁定した（報告書
// docs/audit/ADV-B4S-sdesc.md に根拠を記録）。
// 値モデルの硬い制約：リスト型なし・因子なし・行列型なし・関数値なし。
// 行列・因子・リスト・関数オブジェクトを返す関数は登録せず、
// リファレンス側で unsupported（名指し理由つき）とする。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}

// ---- 引数照合（functions-advanced-math.js の bindArgs を複製。出典：
// 高度モード B4・R 数値班。SPEC 第4章：完全名→部分一致→位置。
// nameOnly は `...` の後ろの仮引数で名前でのみ指定できる）
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

// ---- 小物 ------------------------------------------------------------
// 厳格な論理スカラー（基礎層 sd 等の na.rm 解釈と同じ：NA／NaN は
// "missing value where TRUE/FALSE needed"、長さ0は "argument is of length zero"）
function asLogicalScalar(ctx, v) {
  const H = ctx.H;
  if (v === null || v === undefined) fail(ctx, "argument is of length zero");
  const els = H.vec(v);
  if (!els.length) fail(ctx, "argument is of length zero");
  const el = els[0];
  if (H.isNA(el) || H.isNaNVal(el))
    fail(ctx, "missing value where TRUE/FALSE needed");
  if (typeof el === "boolean") return el;
  if (typeof el === "number") return el !== 0;
  if (typeof el === "string") {
    if (["TRUE", "T", "True", "true"].includes(el)) return true;
    if (["FALSE", "F", "False", "false"].includes(el)) return false;
  }
  fail(ctx, "argument is not interpretable as logical");
}
// mad の low／high 用の緩い論理解釈（実 R 4.3.3 実測：NA は FALSE 扱い）
function lenientLogical(ctx, v) {
  const H = ctx.H;
  if (v === null || v === undefined) fail(ctx, "argument is of length zero");
  const els = H.vec(v);
  if (!els.length) fail(ctx, "argument is of length zero");
  const el = els[0];
  if (H.isMissing(el)) return false;
  if (typeof el === "boolean") return el;
  if (typeof el === "number") return el !== 0;
  fail(ctx, "argument is not interpretable as logical");
}
// 補償加算（基礎層 index.js の compensatedSum と同じ方針）
function compSum(nums) {
  let sum = 0,
    c = 0;
  for (const x of nums) {
    const t = sum + x;
    if (Number.isFinite(t)) {
      if (Math.abs(sum) >= Math.abs(x)) c += sum - t + x;
      else c += x - t + sum;
    }
    sum = t;
  }
  return sum + c;
}
// 数値ベクトル化（logical は数値化。文字列は msg で fail）
function numEls(ctx, v, msg) {
  const H = ctx.H;
  if (v === null || v === undefined) return [];
  return H.vec(v).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    fail(ctx, msg);
  });
}
// var 専用の C 変換（coerceVector(REALSXP) 相当：文字列は数値として解釈し、
// 解釈できないものは NA＋警告 "NAs introduced by coercion"）
function coerceCovNums(ctx, v) {
  const H = ctx.H;
  let coerced = false;
  const out = (v === null ? [] : H.vec(v)).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    const t = String(el).trim();
    if (t === "NA") return H.NA;
    if (t === "NaN") return NaN;
    if (t === "Inf" || t === "+Inf" || t === "Infinity" || t === "+Infinity")
      return Infinity;
    if (t === "-Inf" || t === "-Infinity") return -Infinity;
    if (t === "") {
      coerced = true;
      return H.NA;
    }
    const num = Number(t);
    if (Number.isNaN(num)) {
      coerced = true;
      return H.NA;
    }
    return num;
  });
  if (coerced) warn(ctx, "NAs introduced by coercion");
  return out;
}
// 平均順位（タイは平均。spearman 用）
function rankAvg(els) {
  const order = els.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(els.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k][1]] = r;
    i = j + 1;
  }
  return out;
}
// 数値ベクトルの中央値（欠損があれば NA）
function medianNums(ctx, els) {
  const H = ctx.H;
  if (!els.length) return H.NA;
  if (els.some((e) => H.isMissing(e))) return H.NA;
  const s = [...els].sort((a, c) => a - c);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ================= quantile / IQR =================
// quantile.default の中核（R 公式ソース quantile.R の算法どおり）。
// sorted は昇順ソート済みの数値配列、probs は [0,1] にクランプ済み
// （NA は H.NA、NaN は NaN で伝播させる）。
function quantileOne(ctx, sorted, p, type, fuzz) {
  const H = ctx.H;
  if (H.isNA(p)) return H.NA;
  if (typeof p === "number" && Number.isNaN(p)) return NaN;
  const n = sorted.length;
  if (!n) return H.NA;
  // 文字列要素の補間は実 R どおりエラーにする（順序統計の選択のみ可）
  const interp = (a, b, h) => {
    if (a === undefined) return H.NA;
    if (b === undefined) b = a;
    if (typeof a === "string" || typeof b === "string") {
      if (h === 0) return a;
      if (h === 1) return b;
      if (a === b) return a;
      fail(ctx, "non-numeric argument to binary operator");
    }
    return (1 - h) * a + h * b;
  };
  if (type === 7) {
    const index = 1 + Math.max(n - 1, 0) * p;
    const lo = Math.floor(index),
      hi = Math.ceil(index);
    const qs = sorted[lo - 1];
    if (qs === undefined) return H.NA;
    if (index > lo && sorted[hi - 1] !== qs)
      return interp(qs, sorted[hi - 1], index - lo);
    return qs;
  }
  // パディング済み配列（前2・後2に端の値を置く。原典の c(x[1],x[1],x,x[n],x[n])）
  const X2 = [sorted[0], sorted[0], ...sorted, sorted[n - 1], sorted[n - 1]];
  if (type <= 3) {
    const nppm = type === 3 ? n * p - 0.5 : n * p;
    const j = Math.floor(nppm);
    let h;
    if (type === 1) h = nppm > j ? 1 : 0;
    else if (type === 2) h = (nppm > j ? 1 : 0) + 1;
    else h = nppm !== j || j % 2 !== 0 ? 1 : 0;
    // type 2 の h は (0+1)/2=0.5 または (1+1)/2=1
    if (type === 2) h = h / 2;
    const a = X2[j + 1],
      b = X2[j + 2];
    if (h === 1) return b === undefined ? H.NA : b;
    if (h === 0) return a === undefined ? H.NA : a;
    return interp(a, b, h);
  }
  const AB = {
    4: [0, 1],
    5: [0.5, 0.5],
    6: [0, 0],
    8: [1 / 3, 1 / 3],
    9: [3 / 8, 3 / 8],
  };
  const [a, b] = AB[type];
  const nppm = a + p * (n + 1 - a - b);
  const j = Math.floor(nppm + fuzz);
  let h = nppm - j;
  if (Math.abs(h) < fuzz) h = 0;
  const va = X2[j + 1],
    vb = X2[j + 2];
  if (va === undefined) return H.NA;
  if (h === 1) return vb === undefined ? H.NA : vb;
  if (h === 0 || va === vb) return va;
  return interp(va, vb, h);
}
function parseQuantileType(ctx, b) {
  const H = ctx.H;
  if (!b.has("type")) return 7;
  const t = H.vec(b.val("type"))[0];
  if (typeof t === "string" || t === undefined)
    fail(ctx, "non-numeric argument to binary operator");
  const tn = Number(t);
  if (!Number.isInteger(tn) || tn < 1 || tn > 9)
    fail(ctx, "'type' must be in 1:9");
  return tn;
}
// format_perc（digits 桁の formatC "fg" 近似）＋ "%"。NA／NaN は ""
function formatPerc(ctx, p, digits) {
  const H = ctx.H;
  if (H.isNA(p) || (typeof p === "number" && Number.isNaN(p))) return "";
  const v = 100 * p;
  return Number(v.toPrecision(digits)).toString() + "%";
}
function quantileFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "probs", "na.rm", "names", "type", "digits", "fuzz"], {
    dots: true,
  });
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "cannot xtfrm data frames");
  const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : false;
  let els = x === null ? [] : H.vec(x);
  if (naRm) els = els.filter((e) => !H.isMissing(e));
  else if (els.some((e) => H.isMissing(e)))
    fail(ctx, "missing values and NaN's not allowed if 'na.rm' is FALSE");
  // probs
  if (b.has("probs") && b.val("probs") === null) return [];
  if (b.has("probs") && isDf(b.val("probs")))
    fail(ctx, "quantile: probs にデータフレームは使えません");
  const probsRaw = b.has("probs") ? b.val("probs") : [0, 0.25, 0.5, 0.75, 1];
  let probs = H.vec(probsRaw).map((e) => {
    if (H.isNA(e)) return H.NA;
    if (typeof e === "number") return e;
    if (typeof e === "boolean") return e ? 1 : 0;
    fail(ctx, "'probs' outside [0,1]");
  });
  const eps = 100 * Number.EPSILON;
  for (const p of probs)
    if (
      typeof p === "number" &&
      !Number.isNaN(p) &&
      (p < -eps || p > 1 + eps)
    )
      fail(ctx, "'probs' outside [0,1]");
  probs = probs.map((p) =>
    typeof p === "number" && !Number.isNaN(p)
      ? Math.min(1, Math.max(0, p))
      : p,
  );
  const type = parseQuantileType(ctx, b);
  const useNames = b.has("names") ? asLogicalScalar(ctx, b.val("names")) : true;
  let digits = 7;
  if (b.has("digits")) {
    const d = H.vec(b.val("digits"))[0];
    if (typeof d !== "number" || H.isNA(d))
      fail(ctx, "is.numeric(digits) is not TRUE");
    if (d < 1) fail(ctx, "digits >= 1 is not TRUE");
    digits = Math.trunc(d);
  }
  let fuzz = type === 7 ? 0 : 4 * Number.EPSILON;
  if (b.has("fuzz")) {
    const f = H.vec(b.val("fuzz"))[0];
    if (typeof f === "number" && !Number.isNaN(f)) fuzz = f;
  }
  const isChar = els.some((e) => typeof e === "string");
  const sorted = isChar
    ? [...els].sort((a, c) => (a < c ? -1 : a > c ? 1 : 0))
    : els
        .map((e) => (typeof e === "boolean" ? (e ? 1 : 0) : e))
        .sort((a, c) => a - c);
  const out = probs.map((p) => quantileOne(ctx, sorted, p, type, fuzz));
  if (useNames && probs.length)
    return H.withNames(
      out,
      probs.map((p) => formatPerc(ctx, p, digits)),
    );
  return out;
}
function iqrFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "na.rm", "type"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "'list' object cannot be coerced to type 'double'");
  // IQR は as.numeric(x) を quantile に渡す（公式ソース quantile.R）
  let coerced = false;
  let nums = (x === null ? [] : H.vec(x)).map((e) => {
    if (H.isNA(e)) return H.NA;
    if (typeof e === "number") return e;
    if (typeof e === "boolean") return e ? 1 : 0;
    const t = String(e).trim();
    if (t === "") {
      coerced = true;
      return H.NA;
    }
    const v = Number(t);
    if (Number.isNaN(v) && t !== "NaN") {
      coerced = true;
      return H.NA;
    }
    return v;
  });
  if (coerced) warn(ctx, "NAs introduced by coercion");
  const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : false;
  if (naRm) nums = nums.filter((e) => !H.isMissing(e));
  else if (nums.some((e) => H.isMissing(e)))
    fail(ctx, "missing values and NaN's not allowed if 'na.rm' is FALSE");
  const type = parseQuantileType(ctx, b);
  const fuzz = type === 7 ? 0 : 4 * Number.EPSILON;
  const sorted = [...nums].sort((a, c) => a - c);
  const q1 = quantileOne(ctx, sorted, 0.25, type, fuzz);
  const q3 = quantileOne(ctx, sorted, 0.75, type, fuzz);
  if (H.isNA(q1) || H.isNA(q3)) return H.NA;
  return q3 - q1;
}

// ================= fivenum / mad =================
function fivenumFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "na.rm"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "cannot xtfrm data frames");
  let els = x === null ? [] : H.vec(x);
  if (els.some((e) => H.isMissing(e))) {
    const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : true;
    if (!naRm) return [H.NA, H.NA, H.NA, H.NA, H.NA];
    els = els.filter((e) => !H.isMissing(e));
  }
  if (els.some((e) => typeof e === "string"))
    fail(ctx, "non-numeric argument to binary operator");
  const nums = els.map((e) => (typeof e === "boolean" ? (e ? 1 : 0) : e));
  const n = nums.length;
  if (!n) return [H.NA, H.NA, H.NA, H.NA, H.NA];
  const s = [...nums].sort((a, c) => a - c);
  const n4 = Math.floor((n + 3) / 2) / 2;
  const d = [1, n4, (n + 1) / 2, n + 1 - n4, n];
  return d.map((v) => 0.5 * (s[Math.floor(v) - 1] + s[Math.ceil(v) - 1]));
}
function madFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "center", "constant", "na.rm", "low", "high"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "need numeric data");
  const els = x === null ? [] : H.vec(x);
  if (els.some((e) => typeof e === "string"))
    fail(ctx, "non-numeric argument to binary operator");
  let nums = els.map((e) =>
    H.isNA(e) ? H.NA : typeof e === "boolean" ? (e ? 1 : 0) : e,
  );
  const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : false;
  if (naRm) nums = nums.filter((e) => !H.isMissing(e));
  const n = nums.length;
  if (!n) return H.NA;
  const low = b.has("low") ? lenientLogical(ctx, b.val("low")) : false;
  const high = b.has("high") ? lenientLogical(ctx, b.val("high")) : false;
  if (low && high && n % 2 === 0)
    fail(ctx, "'low' and 'high' cannot be both TRUE");
  // center（既定は median(x)。ベクトルはリサイクル）
  let centerEls;
  if (b.has("center")) {
    const c = b.val("center");
    if (isDf(c)) fail(ctx, "non-numeric argument to binary operator");
    centerEls = (c === null ? [] : H.vec(c)).map((e) => {
      if (H.isNA(e)) return H.NA;
      if (typeof e === "string")
        fail(ctx, "non-numeric argument to binary operator");
      return typeof e === "boolean" ? (e ? 1 : 0) : e;
    });
    if (!centerEls.length) return H.NA;
  } else centerEls = [medianNums(ctx, nums)];
  const L = Math.max(n, centerEls.length);
  if (L % n !== 0 || L % centerEls.length !== 0)
    warn(ctx, "longer object length is not a multiple of shorter object length");
  const devs = Array.from({ length: L }, (_, i) => {
    const v = nums[i % n],
      c = centerEls[i % centerEls.length];
    return H.isMissing(v) || H.isMissing(c) ? H.NA : Math.abs(v - c);
  });
  // constant
  let constantEls = [1.4826];
  if (b.has("constant")) {
    const c = b.val("constant");
    if (isDf(c)) fail(ctx, "non-numeric argument to binary operator");
    constantEls = (c === null ? [] : H.vec(c)).map((e) => {
      if (H.isNA(e)) return H.NA;
      if (typeof e === "string")
        fail(ctx, "non-numeric argument to binary operator");
      return typeof e === "boolean" ? (e ? 1 : 0) : e;
    });
  }
  if (!constantEls.length) return [];
  if (devs.some((e) => H.isMissing(e)))
    return constantEls.length === 1
      ? H.NA
      : constantEls.map(() => H.NA);
  const s = [...devs].sort((a, c) => a - c);
  const m = s.length;
  let cMed;
  if (low) cMed = s[Math.floor((m + 1) / 2) - 1];
  else if (high) cMed = s[Math.ceil((m + 1) / 2) - 1];
  else cMed = m % 2 ? s[(m - 1) / 2] : (s[m / 2 - 1] + s[m / 2]) / 2;
  const out = constantEls.map((c) => (H.isNA(c) ? H.NA : c * cMed));
  return out.length === 1 ? out[0] : out;
}

// ================= var / cov / cor =================
const USE_CHOICES = [
  "all.obs",
  "complete.obs",
  "pairwise.complete.obs",
  "everything",
  "na.or.complete",
];
function pmatchUse(ctx, raw) {
  const H = ctx.H;
  const el = raw === null || raw === undefined ? undefined : H.vec(raw)[0];
  if (typeof el !== "string" || el === "") fail(ctx, "invalid 'use' argument");
  if (USE_CHOICES.includes(el)) return el;
  const cand = USE_CHOICES.filter((c) => c.startsWith(el));
  if (cand.length === 1) return cand[0];
  fail(ctx, "invalid 'use' argument");
}
function matchMethod(ctx, raw) {
  const H = ctx.H;
  const el = raw === null || raw === undefined ? undefined : H.vec(raw)[0];
  const choices = ["pearson", "kendall", "spearman"];
  if (typeof el === "string" && el !== "") {
    if (choices.includes(el)) return el;
    const cand = choices.filter((c) => c.startsWith(el));
    if (cand.length === 1) return cand[0];
  }
  fail(ctx, `'arg' should be one of "pearson", "kendall", "spearman"`);
}
function covCorEngine(ctx, kind) {
  const H = ctx.H;
  let x, y, use, method = "pearson";
  if (kind === "var") {
    const b = bindArgs(ctx, ["x", "y", "na.rm", "use"]);
    x = b.req("x");
    y = b.has("y") ? b.val("y") : null;
    if (x === null) fail(ctx, "'x' is NULL");
    if (isDf(x) || isDf(y))
      fail(ctx, "var: データフレーム入力は分散共分散行列を返すため未対応です");
    if (b.has("use")) use = pmatchUse(ctx, b.val("use"));
    else {
      const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : false;
      use = naRm ? "na.or.complete" : "everything";
    }
  } else {
    const b = bindArgs(ctx, ["x", "y", "use", "method"]);
    x = b.req("x");
    y = b.has("y") ? b.val("y") : null;
    use = b.has("use") ? pmatchUse(ctx, b.val("use")) : "everything";
    method = b.has("method") ? matchMethod(ctx, b.val("method")) : "pearson";
    if (isDf(x) || isDf(y))
      fail(
        ctx,
        `${kind}: データフレーム入力は分散共分散行列／相関行列を返すため未対応です`,
      );
    if (x === null)
      fail(
        ctx,
        kind === "cor"
          ? "'x' must be numeric"
          : "is.numeric(x) || is.logical(x) is not TRUE",
      );
    if (y === null)
      fail(ctx, "supply both 'x' and 'y' or a matrix-like 'x'");
    // 文字列は型エラー（cor は明示 stop、cov は stopifnot の文言。実測）
    for (const [v, nm] of [
      [x, "x"],
      [y, "y"],
    ]) {
      if (v === null || v === undefined) continue;
      if (H.vec(v).some((e) => typeof e === "string")) {
        if (kind === "cor") fail(ctx, `'${nm}' must be numeric`);
        else fail(ctx, `is.numeric(${nm}) || is.logical(${nm}) is not TRUE`);
      }
    }
  }
  const xs = kind === "var" ? coerceCovNums(ctx, x) : numEls(ctx, x, "'x' must be numeric");
  const ys =
    y === null
      ? null
      : kind === "var"
        ? coerceCovNums(ctx, y)
        : numEls(ctx, y, "'y' must be numeric");
  const n = xs.length;
  if (ys !== null && ys.length !== n) fail(ctx, "incompatible dimensions");
  if (
    kind === "cov" &&
    method !== "pearson" &&
    use === "pairwise.complete.obs"
  )
    fail(ctx, "cannot handle 'pairwise.complete.obs'");
  const yv = ys === null ? xs : ys;
  if (n === 0) {
    if (use === "everything" || use === "na.or.complete") return H.NA;
    if (use === "complete.obs") fail(ctx, "no complete element pairs");
    fail(ctx, "'x' is empty");
  }
  if (use === "all.obs") {
    if (xs.some((e) => H.isMissing(e)) || yv.some((e) => H.isMissing(e)))
      fail(ctx, "missing observations in cov/cor");
  }
  let px = xs,
    py = yv;
  if (use === "everything") {
    if (xs.some((e) => H.isMissing(e)) || yv.some((e) => H.isMissing(e)))
      return H.NA;
  } else if (use !== "all.obs") {
    const pairs = [];
    for (let i = 0; i < n; i++)
      if (!H.isMissing(xs[i]) && !H.isMissing(yv[i]))
        pairs.push([xs[i], yv[i]]);
    if (!pairs.length) {
      if (use === "complete.obs") fail(ctx, "no complete element pairs");
      return H.NA;
    }
    px = pairs.map((p) => p[0]);
    py = pairs.map((p) => p[1]);
  }
  const m = px.length;
  if (method === "kendall") {
    if (m <= 1) return H.NA;
    let C = 0,
      D = 0,
      Tx = 0,
      Ty = 0;
    for (let i = 0; i < m; i++)
      for (let j = i + 1; j < m; j++) {
        const sx = Math.sign(px[i] - px[j]),
          sy = Math.sign(py[i] - py[j]);
        const prod = sx * sy;
        if (prod > 0) C++;
        else if (prod < 0) D++;
        else if (sx === 0 && sy !== 0) Tx++;
        else if (sy === 0 && sx !== 0) Ty++;
      }
    if (kind === "cor") {
      const den = Math.sqrt((C + D + Tx) * (C + D + Ty));
      if (den === 0) {
        warn(ctx, "the standard deviation is zero");
        return H.NA;
      }
      return (C - D) / den;
    }
    // cov の kendall は C_cov の未正規化値 2*(C-D)（R 公式 C ソースで確認）
    return 2 * (C - D);
  }
  let ax = px,
    ay = py;
  if (method === "spearman") {
    ax = rankAvg(px);
    ay = rankAvg(py);
  }
  if (m <= 1) return H.NA;
  const mx = compSum(ax) / m,
    my = compSum(ay) / m;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (let i = 0; i < m; i++) {
    const dx = ax[i] - mx,
      dy = ay[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const covVal = sxy / (m - 1);
  if (kind !== "cor") return covVal;
  const vx = sxx / (m - 1),
    vy = syy / (m - 1);
  if (vx === 0 || vy === 0) {
    warn(ctx, "the standard deviation is zero");
    return H.NA;
  }
  const r = covVal / (Math.sqrt(vx) * Math.sqrt(vy));
  return r > 1 ? 1 : r;
}

// ================= weighted.mean =================
function weightedMeanFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "w"], { dots: true, nameOnly: ["na.rm"] });
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "weighted.mean: データフレーム入力は未対応です");
  const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : false;
  const xEls = (x === null ? [] : H.vec(x)).map((e) => {
    if (H.isNA(e)) return H.NA;
    if (typeof e === "string")
      fail(ctx, "non-numeric argument to binary operator");
    return typeof e === "boolean" ? (e ? 1 : 0) : e;
  });
  let wEls;
  if (!b.has("w")) wEls = xEls.map(() => 1);
  else {
    const w = b.val("w");
    if (isDf(w)) fail(ctx, "weighted.mean: 重み w にデータフレームは使えません");
    let coerced = false;
    wEls = (w === null ? [] : H.vec(w)).map((e) => {
      if (H.isNA(e)) return H.NA;
      if (typeof e === "number") return e;
      if (typeof e === "boolean") return e ? 1 : 0;
      const t = String(e).trim();
      if (t === "") {
        coerced = true;
        return H.NA;
      }
      const v = Number(t);
      if (Number.isNaN(v) && t !== "NaN") {
        coerced = true;
        return H.NA;
      }
      return v;
    });
    if (coerced) warn(ctx, "NAs introduced by coercion");
  }
  if (wEls.length !== xEls.length)
    fail(ctx, "'x' and 'w' must have the same length");
  let pairs = xEls.map((xv, i) => [xv, wEls[i]]);
  if (naRm) pairs = pairs.filter(([xv]) => !H.isMissing(xv));
  // 公式ソース：sum((x*w)[w != 0]) / sum(w)（重み0の要素は和から除く）
  let num = 0,
    numNA = false,
    numNaN = false;
  for (const [xv, wv] of pairs) {
    if (typeof wv === "number" && wv === 0) continue;
    const p = H.isNA(xv) || H.isNA(wv) ? H.NA : xv * wv;
    if (H.isNA(p)) numNA = true;
    else if (typeof p === "number" && Number.isNaN(p)) numNaN = true;
    else num += p;
  }
  let den = 0,
    denNA = false,
    denNaN = false;
  for (const [, wv] of pairs) {
    if (H.isNA(wv)) denNA = true;
    else if (typeof wv === "number" && Number.isNaN(wv)) denNaN = true;
    else den += wv;
  }
  if (numNA || denNA) return H.NA;
  if (numNaN || denNaN) return NaN;
  return num / den;
}

// ================= complete.cases / setNames =================
function completeCasesFn(ctx) {
  const H = ctx.H;
  const parts = ctx.vals.filter((v) => v !== null && v !== undefined);
  if (!parts.length) fail(ctx, "no input has determined the number of cases");
  const lens = parts.map((v) => (isDf(v) ? H.dfNrow(v) : H.vec(v).length));
  const n = lens[0];
  if (lens.some((l) => l !== n))
    fail(ctx, "not all arguments have the same length");
  if (n === 0) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    let ok = true;
    for (const v of parts) {
      if (isDf(v)) {
        for (const col of Object.values(v.columns))
          if (H.isMissing(col[i])) {
            ok = false;
            break;
          }
      } else if (H.isMissing(H.vec(v)[i])) ok = false;
      if (!ok) break;
    }
    out.push(ok);
  }
  return out;
}
function setNamesFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["object", "nm"]);
  const nmVal = b.req("nm");
  const object = b.has("object") ? b.val("object") : nmVal;
  if (isDf(nmVal)) fail(ctx, "setNames: nm にデータフレームは使えません");
  const nmEls = (nmVal === null ? [] : H.vec(nmVal)).map((e) => {
    // F6：名前の NA は値モデルの NA そのもので表す（実 R では名前属性の
    // NA は NA であり、空文字列ではない）。
    if (H.isNA(e)) return H.NA;
    if (typeof e === "string") return e;
    if (typeof e === "boolean") return e ? "TRUE" : "FALSE";
    return H.formatRNum(e);
  });
  if (isDf(object)) {
    const keys = Object.keys(object.columns);
    if (nmEls.length > keys.length)
      fail(
        ctx,
        `'names' attribute [${nmEls.length}] must be the same length as the vector [${keys.length}]`,
      );
    if (nmEls.length < keys.length)
      fail(
        ctx,
        "setNames: データフレームで列名が不足する形（不足分が NA 名になる形）は値モデルで表せないため未対応です",
      );
    if (nmEls.some((nm) => H.isNA(nm)))
      fail(
        ctx,
        "setNames: 列名に NA を含む形は値モデルで表せないため未対応です",
      );
    if (new Set(nmEls).size !== nmEls.length)
      fail(ctx, "setNames: 列名の重複は値モデルで表せないため未対応です");
    const columns = {};
    keys.forEach((k, i) => {
      columns[nmEls[i]] = object.columns[k];
    });
    const out = { kind: "data.frame", columns };
    if (Array.isArray(object.rowNames)) out.rowNames = [...object.rowNames];
    return out;
  }
  if (object === null) {
    if (nmEls.length > 0)
      fail(
        ctx,
        `'names' attribute [${nmEls.length}] must be the same length as the vector [0]`,
      );
    return null;
  }
  const els = H.vec(object);
  if (nmEls.length > els.length)
    fail(
      ctx,
      `'names' attribute [${nmEls.length}] must be the same length as the vector [${els.length}]`,
    );
  // F6：不足分の名前は実 R では NA で埋められる（実測：
  // names(setNames(c(1, 2, 3), "a")) は "a", NA, NA）。
  // 以前は null を入れており、表示・照合では空文字列 "" に化けていた。
  const names = Array.from({ length: els.length }, (_, i) =>
    i < nmEls.length ? nmEls[i] : H.NA,
  );
  return H.withNames([...els], names);
}

// ================= ave =================
const AVE_FUNS = new Set([
  "sum",
  "mean",
  "median",
  "min",
  "max",
  "length",
  "sd",
  "seq_along",
  "range",
]);
function aveAgg(ctx, fun, els) {
  const H = ctx.H;
  if (fun === "length") return [els.length];
  if (fun === "seq_along") return els.map((_, i) => i + 1);
  if (els.some((e) => typeof e === "string")) {
    if (fun === "mean") {
      warn(ctx, "argument is not numeric or logical: returning NA");
      return [H.NA];
    }
    if (fun === "min" || fun === "max" || fun === "range") {
      if (els.some((e) => H.isMissing(e)))
        return fun === "range" ? [H.NA, H.NA] : [H.NA];
      const ss = els.map(String);
      const mn = ss.reduce((a, c) => (c < a ? c : a));
      const mx = ss.reduce((a, c) => (c > a ? c : a));
      if (fun === "range") return [mn, mx];
      return [fun === "min" ? mn : mx];
    }
    if (fun === "median") {
      if (els.some((e) => H.isMissing(e))) return [H.NA];
      const ss = [...els]
        .map(String)
        .sort((a, c) => (a < c ? -1 : a > c ? 1 : 0));
      const m = Math.floor(ss.length / 2);
      if (ss.length % 2) return [ss[m]];
      warn(ctx, "偶数長の character の中央値は定義できません。NAを返します");
      return [H.NA];
    }
    fail(ctx, "invalid 'type' (character) of argument");
  }
  const nums = els.map((e) => {
    if (H.isNA(e)) return H.NA;
    if (typeof e === "number") return e;
    if (typeof e === "boolean") return e ? 1 : 0;
    fail(ctx, "invalid 'type' (character) of argument");
  });
  const hasMiss = nums.some((e) => H.isMissing(e));
  switch (fun) {
    case "sum":
      return [hasMiss ? H.NA : compSum(nums)];
    case "mean":
      return [hasMiss ? H.NA : compSum(nums) / nums.length];
    case "median": {
      if (hasMiss) return [H.NA];
      const s = [...nums].sort((a, c) => a - c);
      const m = Math.floor(s.length / 2);
      return [s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2];
    }
    case "min":
      return [hasMiss ? H.NA : Math.min(...nums)];
    case "max":
      return [hasMiss ? H.NA : Math.max(...nums)];
    case "range":
      return hasMiss
        ? [H.NA, H.NA]
        : [Math.min(...nums), Math.max(...nums)];
    case "sd": {
      if (hasMiss || nums.length < 2) return [H.NA];
      const mu = compSum(nums) / nums.length;
      return [
        Math.sqrt(
          nums.reduce((a, c) => a + (c - mu) ** 2, 0) / (nums.length - 1),
        ),
      ];
    }
    default:
      fail(
        ctx,
        `ave: FUN として使えるのは文字列で指定した単純な集計のみです："${fun}"`,
      );
  }
}
function aveFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "FUN"], { dots: true, nameOnly: ["FUN"] });
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "ave: データフレーム入力は未対応です");
  if (x === null) return null;
  const xEls = H.vec(x);
  const n = xEls.length;
  let fun = "mean";
  if (b.has("FUN")) {
    const fv = H.vec(b.val("FUN"))[0];
    if (typeof fv !== "string")
      fail(
        ctx,
        "FUN は関数値では渡せません。文字列で集計名を指定してください（例: \"mean\"）",
      );
    if (!AVE_FUNS.has(fv))
      fail(
        ctx,
        `ave: FUN として使えるのは文字列で指定した単純な集計のみです："${fv}"`,
      );
    fun = fv;
  }
  const gcols = [];
  for (const d of b.dots) {
    if (isDf(d.value))
      for (const k of Object.keys(d.value.columns))
        gcols.push(d.value.columns[k]);
    else gcols.push(d.value === null ? [] : H.vec(d.value));
  }
  const nm = H.namesOf(x);
  if (!gcols.length) {
    if (!n) return [];
    const res = aveAgg(ctx, fun, xEls);
    if (!res.length) fail(ctx, "ave: FUN の結果が長さ0です");
    if (n % res.length !== 0)
      warn(ctx, "number of items to replace is not a multiple of replacement length");
    const out = Array.from({ length: n }, (_, i) => res[i % res.length]);
    return nm ? H.withNames(out, [...nm]) : out;
  }
  if (!n) return [];
  if (gcols.some((g) => g.length === 0))
    fail(ctx, "ave: グループ化変数の長さが0です");
  let L = n;
  for (const g of gcols) L = Math.max(L, g.length);
  for (const g of gcols)
    if (L % g.length !== 0)
      warn(ctx, "data length is not a multiple of split variable");
  const xR = Array.from({ length: L }, (_, i) => xEls[i % n]);
  const gR = gcols.map((g) =>
    Array.from({ length: L }, (_, i) => g[i % g.length]),
  );
  const groups = new Map();
  for (let i = 0; i < L; i++) {
    const vals = gR.map((g) => g[i]);
    // 実 R 4.3.3 実測：グループ化変数が欠損の要素は、それぞれ単独の
    // グループとして扱われる（split／unsplit の NA の扱い）
    const key = vals.some((v) => H.isMissing(v))
      ? "\u0000SINGLE" + i
      : vals.map((v) => typeof v + ":" + String(v)).join("\u0001");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  const outR = new Array(L);
  for (const idxs of groups.values()) {
    const res = aveAgg(
      ctx,
      fun,
      idxs.map((i) => xR[i]),
    );
    if (!res.length) fail(ctx, "ave: FUN の結果が長さ0です");
    if (idxs.length % res.length !== 0)
      warn(ctx, "number of items to replace is not a multiple of replacement length");
    idxs.forEach((pos, k) => {
      outR[pos] = res[k % res.length];
    });
  }
  const out = outR.slice(0, n);
  return nm ? H.withNames(out, [...nm]) : out;
}

export const builtins = new Map([
  ["var", (ctx) => covCorEngine(ctx, "var")],
  ["cov", (ctx) => covCorEngine(ctx, "cov")],
  ["cor", (ctx) => covCorEngine(ctx, "cor")],
  ["quantile", quantileFn],
  ["IQR", iqrFn],
  ["fivenum", fivenumFn],
  ["mad", madFn],
  ["weighted.mean", weightedMeanFn],
  ["weighted.mean.default", weightedMeanFn],
  ["complete.cases", completeCasesFn],
  ["setNames", setNamesFn],
  ["ave", aveFn],
]);
