// 高度モード B4S：R 高度関数グループ「時系列・平滑化」（sts 班。高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 意味論は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3（/usr/bin/Rscript）
// の実走・関数ソースダンプで裁定した（報告書 docs/audit/ADV-B4S-sts.md）。
// 値モデルに無い型（ts クラス／tsp 属性・行列・リスト・関数オブジェクト・
// モデルオブジェクト）を本質的に必要とする関数は実装せず、リファレンス側で
// 未対応とする。本ファイルが実装するのは次の9関数のみ：
// diffinv／bw.nrd0／bw.nrd／runmed／smooth／smoothEnds／ARMAacf／ARMAtoMA／
// spec.taper（.nknots.smspl は意味論を確定したがドット始まり名で到達不能
// のため登録しない。ファイル末尾の注記参照）。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}

// ---- 引数照合（functions-advanced-statsmodel.js（B4S smodel 班）の bindArgs を
// 複製。SPEC 第4章：完全一致→部分一致→位置。dots=true のとき余分は dots へ）
function bindArgs(ctx, formals, opts = {}) {
  const { args, vals, api, node, H } = ctx;
  const dots = !!opts.dots;
  const nameOnly = new Set(opts.nameOnly ?? []);
  const positionalFormals = formals.filter((f) => !nameOnly.has(f));
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
    if (a.argName && formals.includes(a.argName)) {
      if (seenExact.has(a.argName))
        api.fail(
          `formal argument "${a.argName}" matched by multiple actual arguments`,
          node,
        );
      seenExact.add(a.argName);
    }
  }
  const result = new Map();
  const dotList = [];
  const used = new Set();
  args.forEach((a, i) => {
    if (a.argName && formals.includes(a.argName)) {
      result.set(a.argName, { present: true, value: vals[i], node: a });
      used.add(i);
    }
  });
  args.forEach((a, i) => {
    if (!a.argName || used.has(i)) return;
    const cand = formals.filter(
      (f) => f.startsWith(a.argName) && !result.has(f),
    );
    if (cand.length === 1 && !nameOnly.has(cand[0])) {
      result.set(cand[0], { present: true, value: vals[i], node: a });
      used.add(i);
    } else if (cand.length > 1)
      api.fail(`argument ${i + 1} matches multiple formal arguments`, node);
  });
  let fi = 0;
  args.forEach((a, i) => {
    if (a.argName || used.has(i)) return;
    while (fi < positionalFormals.length && result.has(positionalFormals[fi]))
      fi++;
    if (fi < positionalFormals.length) {
      result.set(positionalFormals[fi], {
        present: true,
        value: vals[i],
        node: a,
      });
      used.add(i);
      fi++;
    }
  });
  args.forEach((a, i) => {
    if (used.has(i)) return;
    if (dots) dotList.push({ name: a.argName ?? null, value: vals[i], node: a });
    else unusedFail(a, vals[i]);
  });
  // nameOnly 仮引数は名前でのみ埋まる（完全一致は上で処理済み）。
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

// ---- スカラー解釈（functions-advanced-math.js の asLogical と同じ規則）
function asLogical(ctx, v, label) {
  if (v === null || v === undefined) fail(ctx, "argument is of length zero");
  const els = ctx.H.vec(v);
  if (!els.length) fail(ctx, "argument is of length zero");
  const el = els[0];
  if (ctx.H.isNA(el) || ctx.H.isNaNVal(el))
    fail(ctx, "missing value where TRUE/FALSE needed");
  if (typeof el === "boolean") return el;
  if (typeof el === "number") return el !== 0;
  if (typeof el === "string") {
    if (["TRUE", "T", "True", "true"].includes(el)) return true;
    if (["FALSE", "F", "False", "false"].includes(el)) return false;
  }
  fail(ctx, "argument is not interpretable as logical");
}

// 数値ベクトル化。coerceStrings=true のとき as.numeric 相当（変換できない
// 文字列は NA＋coercedNA フラグ）。logical は数値化する。
function numVec(ctx, v, { coerceStrings = false } = {}) {
  const H = ctx.H;
  if (v === null || v === undefined) return { els: [], coercedNA: false };
  let coercedNA = false;
  const els = H.vec(v).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    if (typeof el === "string") {
      if (!coerceStrings)
        fail(ctx, "non-numeric argument to mathematical function");
      const t = el.trim();
      const n = t === "" ? NaN : Number(t);
      if (Number.isNaN(n) && t !== "NaN") {
        coercedNA = true;
        return H.NA;
      }
      return n;
    }
    fail(ctx, "non-numeric argument to mathematical function");
  });
  return { els, coercedNA };
}

// match.arg 相当（部分一致・大文字小文字を区別。実 R の文言で停止）。
function matchArg(ctx, b, label, choices) {
  if (!b.has(label)) return choices[0];
  const v = b.val(label);
  const els = v === null || v === undefined ? [] : ctx.H.vec(v);
  // 実 R の match.arg の文言は引数名によらず 'arg' 固定。
  const oneOf = `'arg' should be one of ${choices.map((c) => `"${c}"`).join(", ")}`;
  if (els.length !== 1 || typeof els[0] !== "string") fail(ctx, oneOf);
  const s = els[0];
  if (choices.includes(s)) return s;
  const cand = choices.filter((c) => c.startsWith(s));
  if (cand.length === 1) return cand[0];
  fail(ctx, oneOf);
}

// as.integer 相当のスカラー整数化（NA・長さ異常は実 R の文言で停止）。
function intScalar(ctx, v) {
  const els = v === null || v === undefined ? [] : ctx.H.vec(v);
  if (!els.length) fail(ctx, "argument is of length zero");
  if (els.length > 1) fail(ctx, "the condition has length > 1");
  let el = els[0];
  if (typeof el === "boolean") el = el ? 1 : 0;
  else if (typeof el === "string") {
    const t = el.trim();
    el = t === "" ? NaN : Number(t);
  }
  if (ctx.H.isNA(el) || typeof el !== "number" || Number.isNaN(el))
    fail(ctx, "missing value where TRUE/FALSE needed");
  return Math.trunc(el);
}

// 中央値（NA／NaN を含まない数値列用。偶数個は中央2値の平均＝実 R の median）。
function medianOf(els) {
  const s = els.slice().sort((a, b) => a - b);
  const n = s.length;
  const m = Math.floor(n / 2);
  return n % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---- diffinv（diffinv.default／diffinv.vector の実 R 4.3.3 ソースを移植。
// differences>1 は diff(xi) を使った再帰そのまま）
function diffinvVec(H, x, lag, differences, xi) {
  if (differences === 1) {
    const y = new Array(x.length + lag);
    for (let i = 0; i < lag; i++) y[i] = xi[i];
    for (let i = lag; i < y.length; i++) {
      const a = y[i - lag];
      const b = x[i - lag];
      y[i] = H.isNA(a) || H.isNA(b) ? H.NA : a + b;
    }
    return y;
  }
  const xiDiff = [];
  for (let i = lag; i < xi.length; i++) {
    const a = xi[i];
    const b = xi[i - lag];
    xiDiff.push(H.isNA(a) || H.isNA(b) ? H.NA : a - b);
  }
  const inner = diffinvVec(H, x, lag, differences - 1, xiDiff);
  return diffinvVec(H, inner, lag, 1, xi.slice(0, lag));
}
function diffinvHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "lag", "differences", "xi"], { dots: true });
  const x = b.req("x");
  if (isDf(x) || x === null) fail(ctx, "'x' is not a vector or matrix");
  const lag = b.has("lag") ? intScalar(ctx, b.val("lag")) : 1;
  const differences = b.has("differences")
    ? intScalar(ctx, b.val("differences"))
    : 1;
  if (lag < 1 || differences < 1)
    fail(ctx, "bad value for 'lag' or 'differences'");
  const { els, coercedNA } = numVec(ctx, x, { coerceStrings: true });
  if (coercedNA)
    warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
  let xi;
  if (b.has("xi")) {
    const xiRaw = b.val("xi");
    if (isDf(xiRaw)) fail(ctx, "'xi' does not have the right length");
    const c = numVec(ctx, xiRaw, { coerceStrings: true });
    if (c.coercedNA)
      warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
    xi = c.els;
  } else xi = new Array(lag * differences).fill(0);
  if (xi.length !== lag * differences)
    fail(ctx, "'xi' does not have the right length");
  return diffinvVec(H, els, lag, differences, xi);
}

// ---- bw.nrd0／bw.nrd（実 R 4.3.3 ソースを移植。IQR は quantile の type 7）
function sampleSd(els) {
  const n = els.length;
  const m = els.reduce((a, v) => a + v, 0) / n;
  let s = 0;
  for (const e of els) s += (e - m) * (e - m);
  return Math.sqrt(s / (n - 1));
}
function quantile7(els, p) {
  const s = els.slice().sort((a, b) => a - b);
  const n = s.length;
  const h = (n - 1) * p;
  const j = Math.floor(h);
  const g = h - j;
  return j + 1 < n ? s[j] + g * (s[j + 1] - s[j]) : s[j];
}
function bwPrep(ctx) {
  const b = bindArgs(ctx, ["x"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
  const rawLen = x === null || x === undefined ? 0 : ctx.H.vec(x).length;
  if (rawLen < 2) fail(ctx, "need at least 2 data points");
  const { els } = numVec(ctx, x, { coerceStrings: true });
  // 実 R では sd は NA を返し IQR（quantile）がこの文言で停止する。
  if (els.some((e) => ctx.H.isNA(e) || ctx.H.isNaNVal(e)))
    fail(ctx, "missing values and NaN's not allowed if 'na.rm' is FALSE");
  return els;
}
function bwNrd0Handler(ctx) {
  const els = bwPrep(ctx);
  const n = els.length;
  const hi = sampleSd(els);
  let lo = Math.min(hi, (quantile7(els, 0.75) - quantile7(els, 0.25)) / 1.34);
  // 実 R は !(lo) の判定で lo が NaN だと if(NA) エラーになる。JS の !NaN は
  // true になり素通りしてしまうため、NaN を明示的に場合分ける。
  if (Number.isNaN(lo)) fail(ctx, "missing value where TRUE/FALSE needed");
  if (lo === 0) {
    lo = hi;
    if (Number.isNaN(lo)) fail(ctx, "missing value where TRUE/FALSE needed");
    if (lo === 0) {
      lo = Math.abs(els[0]);
      if (Number.isNaN(lo)) fail(ctx, "missing value where TRUE/FALSE needed");
      if (lo === 0) lo = 1;
    }
  }
  return 0.9 * lo * Math.pow(n, -0.2);
}
function bwNrdHandler(ctx) {
  const els = bwPrep(ctx);
  const n = els.length;
  const h = (quantile7(els, 0.75) - quantile7(els, 0.25)) / 1.34;
  return 1.06 * Math.min(sampleSd(els), h) * Math.pow(n, -0.2);
}

// ---- smoothEnds（実 R 4.3.3 の stats/R/runmed.R ソースを移植。
// med3／med.3／med3i／med.odd の NA 扱い（欠損を除いた平均・下側中央値）まで
// ソースどおりに再現する）
function med3R(a, b, c) {
  let m = b;
  if (a < b) {
    if (c < b) m = a >= c ? a : c;
  } else {
    if (c > b) m = a <= c ? a : c;
  }
  return m;
}
function meanNonMiss(H, vals) {
  const pool = vals.filter((v) => !H.isMissing(v));
  if (!pool.length) return NaN;
  return pool.reduce((a, v) => a + v, 0) / pool.length;
}
function med3NA(H, triple) {
  // med.3：欠損があれば欠損を除いた平均、無ければ med3。
  if (triple.some((v) => H.isMissing(v))) return meanNonMiss(H, triple);
  return med3R(triple[0], triple[1], triple[2]);
}
function med3i(H, a, b, c) {
  const t = [a, b, c];
  if (t.some((v) => H.isMissing(v))) return meanNonMiss(H, t);
  return med3R(a, b, c);
}
function medOdd(H, x) {
  // med.odd：欠損を除き、(n+1)%/%2 番目（1始まり）の順序統計量。
  let els = x;
  if (x.some((v) => H.isMissing(v))) els = x.filter((v) => !H.isMissing(v));
  const half = Math.floor((els.length + 1) / 2);
  if (half > 0) {
    const s = els.slice().sort((a, b) => a - b);
    return s[half - 1];
  }
  return x[0];
}
function subNA(H, a, b) {
  if (H.isNA(a) || H.isNA(b)) return H.NA;
  return a - b;
}
function tukeyExtrap(H, sNear, sFar) {
  // sNear - 2*(sFar - sNear)（NA は伝播、NaN はそのまま）
  const d = subNA(H, sFar, sNear);
  if (H.isNA(d)) return H.NA;
  return subNA(H, sNear, 2 * d);
}
function smoothEndsCore(H, y, k) {
  const n = y.length;
  const k2 = Math.trunc(k / 2);
  const sm = y.slice();
  if (k2 < 1) return sm;
  if (k2 >= 2) {
    sm[1] = med3NA(H, [y[0], y[1], y[2]]);
    sm[n - 2] = med3NA(H, [y[n - 1], y[n - 2], y[n - 3]]);
    if (k2 >= 3) {
      for (let i = 3; i <= k2; i++) {
        const j = 2 * i - 1;
        sm[i - 1] = medOdd(H, y.slice(0, j));
        sm[n - i] = medOdd(H, y.slice(Math.max(0, n - j)));
      }
    }
  }
  sm[0] = med3i(H, y[0], sm[1], tukeyExtrap(H, sm[1], sm[2]));
  sm[n - 1] = med3i(H, y[n - 1], sm[n - 2], tukeyExtrap(H, sm[n - 2], sm[n - 3]));
  return sm;
}
function smoothEndsHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["y", "k"]);
  const y = b.req("y");
  if (isDf(y)) fail(ctx, "データフレームはこの関数の対象外です");
  const k = b.has("k") ? intScalar(ctx, b.val("k")) : 3;
  if (k < 0 || k % 2 === 0) fail(ctx, "bandwidth 'k' must be >= 1 and odd!");
  const { els } = numVec(ctx, y);
  if (Math.trunc(k / 2) >= 1 && els.length <= 2)
    fail(ctx, "argument is of length zero");
  // k が長さに対して大きすぎる場合、実 R は右端の添字が負と正の混在に
  // なって停止する（y[(n+1-j):n]）。その領域は名指しで止める。
  if (Math.trunc(k / 2) >= 3 && 2 * Math.trunc(k / 2) - 1 > els.length + 1)
    fail(ctx, "only 0's may be mixed with negative subscripts");
  const out = smoothEndsCore(H, els, k);
  const nm = H.namesOf(y);
  return nm ? H.withNames(out, nm.slice()) : out;
}

// ---- runmed（R ラッパーは実 R 4.3.3 の stats/R/runmed.R、C 側の内部中央値・
// keep／constant 端規則は公式ヘルプと実走で確定した。endrule="median" は
// ラッパーどおり smoothEnds の合成。NA を含む入力は C 実装の ±Big 置換と
// 中央値更新の相互作用で決まるため、na.action="fail"（実 R の文言で停止）
// 以外は名指し停止する）
function runmedHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, [
    "x",
    "k",
    "endrule",
    "algorithm",
    "na.action",
    "print.level",
  ]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
  if (!b.has("k")) fail(ctx, `argument "k" is missing, with no default`);
  const kRaw = b.val("k");
  const kEls = kRaw === null || kRaw === undefined ? [] : H.vec(kRaw);
  if (!kEls.length) fail(ctx, "argument is of length zero");
  if (kEls.length > 1) fail(ctx, "the condition has length > 1");
  let kEl = kEls[0];
  if (typeof kEl === "boolean") kEl = kEl ? 1 : 0;
  else if (typeof kEl === "string") {
    const t = kEl.trim();
    kEl = t === "" ? NaN : Number(t);
  }
  if (H.isNA(kEl) || typeof kEl !== "number" || Number.isNaN(kEl))
    fail(ctx, "invalid value of 'k'");
  let k = Math.trunc(kEl);
  if (k < 0) fail(ctx, "'k' must be positive");
  if (k % 2 === 0) {
    const nk = 1 + 2 * Math.floor(k / 2);
    warn(ctx, `'k' を奇数に変更します（'k' must be odd! Changing 'k' to ${nk}）`);
    k = nk;
  }
  const endrule = matchArg(ctx, b, "endrule", ["median", "keep", "constant"]);
  // algorithm は2方式とも同一結果（公式ヘルプ）なので照合のみ行う。
  if (b.has("algorithm") && b.val("algorithm") !== null)
    matchArg(ctx, b, "algorithm", ["Stuetzle", "Turlach"]);
  // na.action は match.arg ではなく pmatch で、C へ索引が渡る。一致しない
  // 値は NA 索引となり、C は欠損が無ければ既定動作し、欠損があれば
  // "runmed(): invalid 'na.action'" で停止する（実 R 4.3.3 実測）。
  const NA_ACTIONS = ["+Big_alternate", "-Big_alternate", "na.omit", "fail"];
  let naAction = "+Big_alternate";
  let naActionValid = true;
  if (b.has("na.action")) {
    const nv = b.val("na.action");
    const nEls = nv === null || nv === undefined ? [] : H.vec(nv);
    const s = nEls.length === 1 && typeof nEls[0] === "string" ? nEls[0] : null;
    const cand =
      s === null || s === ""
        ? []
        : NA_ACTIONS.filter((c) => c.startsWith(s));
    if (cand.length === 1) naAction = cand[0];
    else naActionValid = false;
  }
  const { els, coercedNA } = numVec(ctx, x, { coerceStrings: true });
  if (coercedNA)
    warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
  const n = els.length;
  if (n === 0) return [];
  if (k > n) {
    const nk = 1 + 2 * Math.floor((n - 1) / 2);
    warn(ctx, `'k' を長さ以下に変更します（'k' is bigger than 'n'! Changing 'k' to ${nk}）`);
    k = nk;
  }
  const firstMiss = els.findIndex((e) => H.isMissing(e));
  if (firstMiss >= 0) {
    if (!naActionValid) fail(ctx, "runmed(): invalid 'na.action'");
    if (naAction === "fail")
      fail(
        ctx,
        `runmed(x, .., na.action="na.fail"): have NAs starting at x[${firstMiss + 1}]`,
      );
    fail(
      ctx,
      `runmed の NA を含む入力（na.action = "${naAction}"）は、C 実装の ±Big 置換と中央値更新の相互作用で結果が決まるため説明に対応していません`,
    );
  }
  const k2 = (k - 1) / 2;
  const y = els.slice();
  for (let j = k2; j < n - k2; j++)
    y[j] = medianOf(els.slice(j - k2, j + k2 + 1));
  if (endrule === "constant" && k2 > 0) {
    const lv = medianOf(els.slice(0, k));
    const rv = medianOf(els.slice(n - k));
    for (let j = 0; j < k2; j++) {
      y[j] = lv;
      y[n - 1 - j] = rv;
    }
    return y;
  }
  if (endrule === "median") return smoothEndsCore(H, y, k);
  return y;
}

// ---- smooth（stats/src/smooth.c の Rsm／sm_3／sm_3R／sm_split3 と
// stats/R/smooth.R のラッパーを移植。iter／changed 属性と tukeysmooth
// クラスは値モデルに無いため、値（平滑化された数値ベクトル）のみ返す）
function med3C(u, v, w) {
  if ((u <= v && v <= w) || (u >= v && v >= w)) return v;
  if ((u <= w && w <= v) || (u >= w && w >= v)) return w;
  return u;
}
function imed3C(u, v, w) {
  if ((u <= v && v <= w) || (u >= v && v >= w)) return 0;
  if ((u <= w && w <= v) || (u >= w && w >= v)) return 1;
  return -1;
}
const SM_NO = 0;
const SM_COPY = 1;
const SM_TUKEY = 2;
function sm3(x, endRule) {
  const n = x.length;
  const y = new Array(n);
  if (n <= 2) {
    for (let i = 0; i < n; i++) y[i] = x[i];
    return { y, chg: false };
  }
  let chg = false;
  for (let i = 1; i < n - 1; i++) {
    const j = imed3C(x[i - 1], x[i], x[i + 1]);
    y[i] = x[i + j];
    if (j !== 0) chg = true;
  }
  if (endRule === SM_COPY) {
    y[0] = x[0];
    y[n - 1] = x[n - 1];
  } else if (endRule === SM_TUKEY) {
    y[0] = med3C(3 * y[1] - 2 * y[2], x[0], y[1]);
    if (y[0] !== x[0]) chg = true;
    y[n - 1] = med3C(y[n - 2], x[n - 1], 3 * y[n - 2] - 2 * y[n - 3]);
    if (y[n - 1] !== x[n - 1]) chg = true;
  } else {
    // SM_NO：端は後段で読まれない（C では未代入）。写しで埋める。
    y[0] = x[0];
    y[n - 1] = x[n - 1];
  }
  return { y, chg };
}
function sm3R(x, endRule) {
  const n = x.length;
  const first = sm3(x, SM_COPY);
  const y = first.y;
  let iter = first.chg ? 1 : 0;
  let chg = first.chg;
  while (chg) {
    const r = sm3(y, SM_NO);
    if (r.chg) {
      iter++;
      for (let i = 1; i < n - 1; i++) y[i] = r.y[i];
    } else chg = false;
  }
  let endChg = false;
  if (n > 2) {
    if (endRule === SM_COPY) {
      y[0] = x[0];
      y[n - 1] = x[n - 1];
    } else if (endRule === SM_TUKEY) {
      const a = med3C(3 * y[1] - 2 * y[2], x[0], y[1]);
      if (a !== x[0]) endChg = true;
      y[0] = a;
      const b2 = med3C(y[n - 2], x[n - 1], 3 * y[n - 2] - 2 * y[n - 3]);
      if (b2 !== x[n - 1]) endChg = true;
      y[n - 1] = b2;
    }
  }
  return { y, iter: iter !== 0 ? iter : endChg ? 1 : 0 };
}
function smSplit3(x, doEnds) {
  const n = x.length;
  const y = x.slice();
  if (n <= 4) return { y, chg: false };
  let chg = false;
  const sptest = (i) => {
    if (x[i] !== x[i + 1]) return false;
    if (
      (x[i - 1] <= x[i] && x[i + 1] <= x[i + 2]) ||
      (x[i - 1] >= x[i] && x[i + 1] >= x[i + 2])
    )
      return false;
    return true;
  };
  if (doEnds && sptest(1)) {
    chg = true;
    y[1] = x[0];
    y[2] = med3C(x[2], x[3], 3 * x[3] - 2 * x[4]);
  }
  for (let i = 2; i < n - 3; i++) {
    if (!sptest(i)) continue;
    let j = imed3C(x[i], x[i - 1], 3 * x[i - 1] - 2 * x[i - 2]);
    if (j > -1) {
      y[i] = j === 0 ? x[i - 1] : 3 * x[i - 1] - 2 * x[i - 2];
      if (y[i] !== x[i]) chg = true;
    }
    j = imed3C(x[i + 1], x[i + 2], 3 * x[i + 2] - 2 * x[i + 3]);
    if (j > -1) {
      y[i + 1] = j === 0 ? x[i + 2] : 3 * x[i + 2] - 2 * x[i + 3];
      if (y[i + 1] !== x[i + 1]) chg = true;
    }
  }
  if (doEnds && sptest(n - 3)) {
    chg = true;
    y[n - 2] = x[n - 1];
    y[n - 3] = med3C(x[n - 3], x[n - 4], 3 * x[n - 4] - 2 * x[n - 5]);
  }
  return { y, chg };
}
function sm3RS3R(x, endRule, splitEnds) {
  const r1 = sm3R(x, endRule);
  const sp = smSplit3(r1.y, splitEnds);
  if (!sp.chg) return r1.y;
  return sm3R(sp.y, endRule).y;
}
function sm3RSS(x, endRule, splitEnds) {
  const r1 = sm3R(x, endRule);
  const sp = smSplit3(r1.y, splitEnds);
  if (!sp.chg) return r1.y;
  return smSplit3(sp.y, splitEnds).y;
}
function sm3RSR(x, endRule, splitEnds) {
  const n = x.length;
  let { y, iter } = sm3R(x, endRule);
  for (;;) {
    iter++;
    const sp = smSplit3(y, splitEnds);
    const r = sm3R(sp.y, endRule);
    y = r.y;
    const chg = sp.chg || r.iter !== 0;
    if (!chg) break;
    if (iter > 2 * n) break;
  }
  return y;
}
function smoothCore(x, kind, iend) {
  switch (kind) {
    case "3RS3R":
      return sm3RS3R(x, Math.abs(iend), iend < 0);
    case "3RSS":
      return sm3RSS(x, Math.abs(iend), iend < 0);
    case "3RSR":
      return sm3RSR(x, Math.abs(iend), iend < 0);
    case "3R":
      return sm3R(x, iend).y;
    case "3":
      return sm3(x, iend).y;
    default: // "S"
      return smSplit3(x, iend !== 0).y;
  }
}
function smoothHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "kind", "twiceit", "endrule", "do.ends"]);
  const x = b.req("x");
  if (isDf(x) || x === null) fail(ctx, "attempt to smooth non-numeric values");
  const rawEls = H.vec(x);
  if (rawEls.some((e) => typeof e === "string" || typeof e === "boolean"))
    fail(ctx, "attempt to smooth non-numeric values");
  const { els } = numVec(ctx, x);
  if (els.some((e) => H.isMissing(e)))
    fail(ctx, "attempt to smooth NA values");
  const kind = matchArg(ctx, b, "kind", [
    "3RS3R",
    "3RSS",
    "3RSR",
    "3R",
    "3",
    "S",
  ]);
  const endrule = matchArg(ctx, b, "endrule", ["Tukey", "copy"]);
  const twiceit = b.has("twiceit")
    ? asLogical(ctx, b.val("twiceit"), "twiceit")
    : false;
  const doEnds = b.has("do.ends")
    ? asLogical(ctx, b.val("do.ends"), "do.ends")
    : false;
  // ラッパーの iend 決定（rules = c("copy","Tukey") の pmatch 位置）。
  let iend = endrule === "copy" ? SM_COPY : SM_TUKEY;
  if (kind.startsWith("3RS") && !doEnds) iend = -iend;
  else if (kind === "S") iend = doEnds ? 1 : 0;
  const y1 = smoothCore(els, kind, iend);
  if (!twiceit) return y1;
  const resid = els.map((v, i) => v - y1[i]);
  const y2 = smoothCore(resid, kind, iend);
  return y1.map((v, i) => v + y2[i]);
}

// ---- ARMAtoMA（C_ARMAtoMA の漸化式 ψ_j = θ_j + Σ_{i≤min(j,p)} φ_i ψ_{j-i}）
function armaToMA(H, ar, ma, lagMax) {
  const psi = [1];
  for (let j = 1; j <= lagMax; j++) {
    let s = j <= ma.length ? ma[j - 1] : 0;
    let hasNA = H.isNA(s);
    const up = Math.min(j, ar.length);
    for (let i = 1; i <= up; i++) {
      const a = ar[i - 1];
      const p = psi[j - i];
      if (H.isNA(a) || H.isNA(p)) hasNA = true;
      else s += a * p;
    }
    psi[j] = hasNA ? H.NA : s;
  }
  return psi.slice(1);
}
function coefVec(ctx, v) {
  if (v === null || v === undefined) return [];
  if (isDf(v)) fail(ctx, "データフレームはこの関数の対象外です");
  const { els, coercedNA } = numVec(ctx, v, { coerceStrings: true });
  if (coercedNA)
    warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
  return els;
}
function lagMaxArg(ctx, b) {
  const v = b.req("lag.max");
  const els = v === null || v === undefined ? [] : ctx.H.vec(v);
  if (els.length !== 1) fail(ctx, "invalid value of lag.max");
  let el = els[0];
  if (typeof el === "boolean") el = el ? 1 : 0;
  else if (typeof el === "string") {
    const t = el.trim();
    el = t === "" ? NaN : Number(t);
  }
  if (ctx.H.isNA(el) || typeof el !== "number" || Number.isNaN(el))
    fail(ctx, "invalid value of lag.max");
  return Math.trunc(el);
}
function armaToMAHandler(ctx) {
  const b = bindArgs(ctx, ["ar", "ma", "lag.max"]);
  const ar = b.has("ar") ? coefVec(ctx, b.val("ar")) : [];
  const ma = b.has("ma") ? coefVec(ctx, b.val("ma")) : [];
  const lagMax = lagMaxArg(ctx, b);
  if (lagMax < 1) fail(ctx, "invalid value of lag.max");
  return armaToMA(ctx.H, ar, ma, lagMax);
}

// ---- ARMAacf（実 R 4.3.3 の ARMAacf ソースを移植。自己共分散の線形方程式
// （Brockwell & Davis (3.3.8)）を解き、残りは再帰フィルタで伸ばす。
// pacf=TRUE は C_pacf1 相当の Durbin–Levinson 漸化）
function solveLinear(A, rhs) {
  const n = rhs.length;
  const M = A.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-300) return null;
    if (piv !== col) [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}
function armaacfRho(ctx, ar, ma, upto) {
  const H = ctx.H;
  const p0 = ar.length;
  const q = ma.length;
  let rho;
  if (p0 > 0) {
    const r = Math.max(p0, q + 1);
    if (r > 1) {
      const phi = [...ar, ...new Array(r - p0).fill(0)];
      const psi = [1, ...armaToMA(H, ar, ma, q)];
      const theta = (t) => (t === 0 ? 1 : t <= q ? ma[t - 1] : 0);
      const A = [];
      const rhs = [];
      for (let k = 0; k <= r; k++) {
        const row = new Array(r + 1).fill(0);
        row[k] += 1;
        for (let i = 1; i <= r; i++) row[Math.abs(k - i)] -= phi[i - 1];
        A.push(row);
        let s = 0;
        for (let m = 0; m <= q; m++) s += psi[m] * theta(k + m);
        rhs.push(s);
      }
      const g = solveLinear(A, rhs);
      if (g === null) fail(ctx, "system is exactly singular");
      rho = g.map((v) => v / g[0]);
    } else rho = [1, ar[0]];
    for (let k = rho.length; k <= upto; k++) {
      let s = 0;
      for (let i = 1; i <= p0; i++) s += ar[i - 1] * rho[k - i];
      rho[k] = s;
    }
  } else {
    const theta = (t) => (t === 0 ? 1 : ma[t - 1]);
    let g0 = 0;
    for (let j = 0; j <= q; j++) g0 += theta(j) * theta(j);
    rho = [1];
    for (let k = 1; k <= upto; k++) {
      if (k > q) {
        rho[k] = 0;
        continue;
      }
      let gk = 0;
      for (let j = 0; j <= q - k; j++) gk += theta(j) * theta(j + k);
      rho[k] = gk / g0;
    }
  }
  return rho;
}
function pacfFromRho(rho, L) {
  const out = [];
  let phi = [];
  for (let k = 1; k <= L; k++) {
    let num = rho[k];
    let den = 1;
    for (let j = 1; j < k; j++) {
      num -= phi[j - 1] * rho[k - j];
      den -= phi[j - 1] * rho[j];
    }
    const ak = num / den;
    const nphi = new Array(k);
    for (let j = 1; j < k; j++) nphi[j - 1] = phi[j - 1] - ak * phi[k - j - 1];
    nphi[k - 1] = ak;
    phi = nphi;
    out.push(ak);
  }
  return out;
}
function armaacfHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["ar", "ma", "lag.max", "pacf"]);
  const ar = b.has("ar") ? coefVec(ctx, b.val("ar")) : [];
  const ma = b.has("ma") ? coefVec(ctx, b.val("ma")) : [];
  if (!ar.length && !ma.length) fail(ctx, "empty model supplied");
  let effLag;
  if (b.has("lag.max")) {
    const v = b.val("lag.max");
    const els = v === null || v === undefined ? [] : H.vec(v);
    const el = els[0];
    if (els.length !== 1 || H.isNA(el) || H.isNaNVal(el))
      fail(ctx, "missing value where TRUE/FALSE needed");
    if (typeof el !== "number" && typeof el !== "boolean")
      fail(ctx, "non-numeric argument to binary operator");
    const lv = typeof el === "boolean" ? (el ? 1 : 0) : el;
    if (lv < 0) fail(ctx, "only 0's may be mixed with negative subscripts");
    effLag = Math.trunc(lv);
  } else effLag = Math.max(ar.length, ma.length + 1);
  const pacf = b.has("pacf") ? asLogical(ctx, b.val("pacf"), "pacf") : false;
  // 係数に NA／NaN がある場合の実 R の挙動（実測）：MA 専用は filter が必ず
  // 停止し、再帰 filter を使う場合（AR あり・非 pacf・lag.max > p）も停止。
  // それ以外は欠損が伝播した結果を返す。
  const missCoef = [...ar, ...ma].find((v) => H.isMissing(v));
  if (missCoef !== undefined) {
    if (!ar.length) fail(ctx, "missing values in 'filter'");
    if (!pacf && effLag > ar.length) fail(ctx, "missing values in 'filter'");
    if (pacf) return new Array(effLag).fill(missCoef);
    if (effLag === 0) return H.withNames([1, missCoef], ["0", null]);
    return H.withNames(
      [1, ...new Array(effLag).fill(missCoef)],
      Array.from({ length: effLag + 1 }, (_, i) => String(i)),
    );
  }
  const upto = Math.max(effLag, 1, ar.length === 0 ? ma.length : 0);
  const rho = armaacfRho(ctx, ar, ma, upto);
  if (pacf) return pacfFromRho(rho, effLag);
  if (!ar.length) {
    // 実 R の MA 専用分岐は lag.max < q でも q まで切り捨てない（名前だけが
    // 0:lag.max の割当てで不足分 NA になる）。その癖まで再現する。
    const L = Math.max(ma.length, effLag);
    const vals = rho.slice(0, L + 1);
    const names = Array.from({ length: L + 1 }, (_, i) =>
      i <= effLag ? String(i) : null,
    );
    return H.withNames(vals, names);
  }
  if (effLag === 0) {
    // 実 R の Acf[1L:0] の癖：c(1, ρ1) に名前 "0" と NA が付く。
    return H.withNames([1, rho[1]], ["0", null]);
  }
  const vals = rho.slice(0, effLag + 1);
  const names = Array.from({ length: effLag + 1 }, (_, i) => String(i));
  return H.withNames(vals, names);
}

// ---- spec.taper（実 R 4.3.3 ソースを移植。ベクトル入力では属性が戻され
// 実質数値ベクトル×コサインベル。行列・データフレーム入力は対象外）
function specTaperHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "p"]);
  let p = 0.1;
  if (b.has("p")) {
    const pv = b.val("p");
    const els = pv === null || pv === undefined ? [] : H.vec(pv);
    if (els.some((e) => H.isMissing(e)))
      fail(ctx, "missing value where TRUE/FALSE needed");
    if (
      els.some((e) => typeof e !== "number" && typeof e !== "boolean") ||
      !els.length
    )
      fail(ctx, "'p' must be between 0 and 0.5");
    const nums = els.map((e) => (typeof e === "boolean" ? (e ? 1 : 0) : e));
    if (nums.some((v) => v < 0 || v > 0.5))
      fail(ctx, "'p' must be between 0 and 0.5");
    if (nums.length !== 1)
      fail(
        ctx,
        "length of 'p' must be 1 or equal the number of columns of 'x'",
      );
    p = nums[0];
  }
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "spec.taper はデータフレームに対応していません");
  const n = x === null || x === undefined ? 0 : H.vec(x).length;
  const m = Math.floor(n * p);
  if (m === 0) return x;
  const { els } = numVec(ctx, x);
  const w = [];
  for (let i = 1; i <= m; i++)
    w.push(0.5 * (1 - Math.cos((Math.PI * (2 * i - 1)) / (2 * m))));
  const taper = [
    ...w,
    ...new Array(n - 2 * m).fill(1),
    ...w.slice().reverse(),
  ];
  const out = els.map((e, i) => (H.isNA(e) ? H.NA : e * taper[i]));
  const nm = H.namesOf(x);
  return nm ? H.withNames(out, nm.slice()) : out;
}

// ---- .nknots.smspl（実 R 4.3.3 ソースを移植。smooth.spline の内部関数）
// 注意：ドット始まりの識別子は共有パーサが受理しないため simulate 経由では
// 到達できない。意味論は確定済みだが、B4 の確定方針（到達不能ハンドラは
// 登録せず項目を未対応化する。ADV-B4-REPORT §6）に倣い、builtins には
// 登録しない。パーサがドット始まり名を受理するようになれば、この実装を
// そのまま登録して supported に昇格できる。
function nknotsHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["n"]);
  const v = b.req("n");
  const els = v === null || v === undefined ? [] : H.vec(v);
  if (!els.length) fail(ctx, "argument is of length zero");
  if (els.length > 1) fail(ctx, "the condition has length > 1");
  let n = els[0];
  if (typeof n === "boolean") n = n ? 1 : 0;
  if (typeof n !== "number" || H.isNA(n) || Number.isNaN(n))
    fail(ctx, "missing value where TRUE/FALSE needed");
  if (n < 50) return n;
  const a1 = Math.log2(50);
  const a2 = Math.log2(100);
  const a3 = Math.log2(140);
  const a4 = Math.log2(200);
  let r;
  if (n < 200) r = 2 ** (a1 + ((a2 - a1) * (n - 50)) / 150);
  else if (n < 800) r = 2 ** (a2 + ((a3 - a2) * (n - 200)) / 600);
  else if (n < 3200) r = 2 ** (a3 + ((a4 - a3) * (n - 800)) / 2400);
  else r = 200 + (n - 3200) ** 0.2;
  return Math.trunc(r);
}

export const builtins = new Map([
  ["diffinv", diffinvHandler],
  ["bw.nrd0", bwNrd0Handler],
  ["bw.nrd", bwNrdHandler],
  ["runmed", runmedHandler],
  ["smooth", smoothHandler],
  ["smoothEnds", smoothEndsHandler],
  ["ARMAacf", armaacfHandler],
  ["ARMAtoMA", armaToMAHandler],
  ["spec.taper", specTaperHandler],
  // ".nknots.smspl" は到達不能（ドット始まり名）のため登録しない（上記注記）。
]);
