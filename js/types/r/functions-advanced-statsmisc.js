// 高度モード B4S：R 高度関数グループ「統計その他（多変量・クラスタ・その他）」
// （高度差分）。ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章と
// B4S 共通ブリーフ。意味論は公式ヘルプ（stat.ethz.ch R-manual）と
// 実 R 4.3.3（/usr/bin/Rscript）の実測、ならびに R 本体ソース
// （stats パッケージの fft.R／ppoints.R／mahalanobis.R／symnum.R／
// selfStart.R、fourier.c の nextn 実装）で裁定した
// （報告書 docs/audit/ADV-B4S-smisc.md に根拠を記録）。
// 値モデルに無い型（行列・複素数・モデルオブジェクト等）を返す関数は
// 登録しない（リファレンス側で unsupported とし、名前の統合により
// 名指しで停止する）。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}
const RECYCLE_WARN =
  "長いオブジェクトの長さが短いオブジェクトの長さの倍数になっていません（longer object length is not a multiple of shorter object length）";

// ---- 引数照合（functions-advanced-math.js の bindArgs を複製。出典：
// B4 R 実装班1。SPEC 第4章：matchArgs を正とし、部分一致と余分な引数の
// 名指し停止を補う。nameOnly は `...` の後ろにある仮引数＝名前でのみ指定可）
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

// ---- if() 条件の論理値解釈（実 R の if／asLogical の規則：長さ0は
// "argument is of length zero"、長さ2以上は "the condition has length > 1"、
// NA／NaN は "missing value where TRUE/FALSE needed"）
function ifLogical(ctx, v) {
  const H = ctx.H;
  if (v === null || v === undefined) fail(ctx, "argument is of length zero");
  const els = H.vec(v);
  if (!els.length) fail(ctx, "argument is of length zero");
  if (els.length > 1) fail(ctx, "the condition has length > 1");
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

// 数値ベクトル化（logical は数値化、character は failMsg で停止）。
function numEls(ctx, v, failMsg) {
  const H = ctx.H;
  if (v === null || v === undefined) return [];
  return H.vec(v).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    fail(ctx, failMsg);
  });
}

// ================= convolve =================
// 実 R の定義（stats R/fft.R）：type != "circular" では x の左に
// length(y)-1 個の 0、y の右に length(x)-1 個の 0 を詰めたうえで
// 円畳み込み（DFT 積）を行い、"filter" では先頭と末尾から
// length(y)-1 個ずつ（ただし長さ0の場合は R の添字列の規則で
// 両端1個ずつ）を取り除く。本実装は DFT を使わず、同じ代数定義を
// 直接和で計算する（実数入力では一致する。NA は全要素へ伝播し、
// NaN／Inf は FFT の演算どおり全要素を NaN にする）。
function convolveHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "y", "conj", "type"]);
  const xv = b.req("x");
  const yv = b.req("y");
  if (isDf(xv) || isDf(yv)) fail(ctx, "データフレームはこの関数の対象外です");
  // type の match.arg（実 R では最初に評価される）
  let type = "circular";
  if (b.has("type")) {
    const tv = b.val("type");
    if (tv !== null) {
      const els = H.vec(tv);
      if (!els.length || els.some((e) => typeof e !== "string"))
        fail(ctx, "'arg' must be NULL or a character vector");
      if (els.length > 1) fail(ctx, "'arg' must be of length 1");
      const cand = ["circular", "open", "filter"].filter((c) =>
        c.startsWith(els[0]),
      );
      if (cand.length !== 1)
        fail(ctx, "'arg' should be one of \"circular\", \"open\", \"filter\"");
      type = cand[0];
    }
  }
  const xElsRaw = xv === null ? [] : H.vec(xv);
  const yElsRaw = yv === null ? [] : H.vec(yv);
  const nx = xElsRaw.length;
  const ny = yElsRaw.length;
  if (type === "circular") {
    if (nx !== ny) fail(ctx, "length mismatch in convolution");
  } else if (nx === 0 || ny === 0) {
    fail(ctx, "invalid 'times' value");
  }
  // fft の型検査：character は "non-numeric argument"、logical は
  // 複素数結果になるため値モデルでは名指し停止する。
  if (
    xElsRaw.some((e) => typeof e === "string") ||
    yElsRaw.some((e) => typeof e === "string")
  )
    fail(ctx, "non-numeric argument");
  const isLogicalVec = (els) =>
    els.some((e) => typeof e === "boolean") &&
    els.every((e) => typeof e === "boolean" || H.isNA(e));
  if (isLogicalVec(xElsRaw) || isLogicalVec(yElsRaw))
    fail(
      ctx,
      "convolve の論理値入力は複素数を返すため説明に対応していません",
    );
  const conj = b.has("conj") ? ifLogical(ctx, b.val("conj")) : true;
  const xs = numEls(ctx, xv, "non-numeric argument");
  const ys = numEls(ctx, yv, "non-numeric argument");
  // 結果の名前（fft と二項演算の名前引き継ぎ：詰めた x 側を優先し、
  // 無ければ y 側）
  const xNames = H.namesOf(xv);
  const yNames = H.namesOf(yv);
  let X, Y, XN, YN, N;
  if (type === "circular") {
    X = xs; Y = ys; N = nx;
    XN = xNames; YN = yNames;
  } else {
    const n1 = ny - 1;
    X = [...Array(n1).fill(0), ...xs];
    Y = [...ys, ...Array(nx - 1).fill(0)];
    N = nx + ny - 1;
    XN = xNames ? [...Array(n1).fill(""), ...xNames] : null;
    YN = yNames ? [...yNames, ...Array(nx - 1).fill("")] : null;
  }
  let zNames = XN ?? YN;
  let z;
  const anyNA = [...xs, ...ys].some((e) => H.isNA(e));
  const anyBad = [...xs, ...ys].some(
    (e) => !H.isNA(e) && (H.isNaNVal(e) || !Number.isFinite(e)),
  );
  if (anyNA) z = Array(N).fill(H.NA);
  else if (anyBad) z = Array(N).fill(NaN);
  else {
    z = new Array(N);
    for (let k = 1; k <= N; k++) {
      let s = 0;
      for (let j = 1; j <= N; j++) {
        const yi = conj
          ? Y[(((j - k) % N) + N) % N]
          : Y[(((k - j) % N) + N) % N];
        s += X[j - 1] * yi;
      }
      z[k - 1] = s;
    }
  }
  if (type === "filter") {
    const n1 = ny - 1;
    const rem = new Set();
    if (n1 >= 1) {
      for (let i = 1; i <= n1; i++) rem.add(i);
      for (let i = N - n1 + 1; i <= N; i++) rem.add(i);
    } else {
      rem.add(1);
      rem.add(N);
    }
    z = z.filter((_, i) => !rem.has(i + 1));
    if (zNames) zNames = zNames.filter((_, i) => !rem.has(i + 1));
  }
  if (zNames) return H.withNames(z, zNames);
  return z;
}

// ================= ppoints =================
// 実 R の定義（stats R/ppoints.R）：
//   ppoints <- function(n, a = if(n <= 10) 3/8 else 1/2) {
//     if (length(n) > 1L) n <- length(n)
//     if (n > 0) (1L:n - a)/(n + 1 - 2*a) else numeric() }
// 既定の a は n の再代入後に遅延評価されるため、個数 m に対して決まる。
function ppointsHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["n", "a"]);
  const nv = b.req("n");
  if (isDf(nv)) fail(ctx, "データフレームはこの関数の対象外です");
  const els = nv === null ? [] : H.vec(nv);
  let baseN; // 分母に使う n（スカラー値または個数）
  let seq; // 1L:n の列
  if (els.length > 1) {
    baseN = els.length;
    seq = Array.from({ length: baseN }, (_, i) => i + 1);
  } else if (els.length === 0) {
    fail(ctx, "argument is of length zero");
  } else {
    const el = els[0];
    if (H.isNA(el) || H.isNaNVal(el))
      fail(ctx, "missing value where TRUE/FALSE needed");
    if (typeof el === "string") {
      warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
      fail(ctx, "NA/NaN argument");
    }
    const num = typeof el === "boolean" ? (el ? 1 : 0) : el;
    if (num <= 0) return [];
    if (!Number.isFinite(num)) fail(ctx, "結果が長すぎます（result would be too long）");
    baseN = num;
    const count = num >= 1 ? Math.floor(num) : 1;
    if (count > 1e7) fail(ctx, "結果が長すぎます（result would be too long）");
    seq = Array.from({ length: count }, (_, i) => i + 1);
  }
  // a の決定（既定は baseN で決まる。引数の a は二項演算の規則で
  // character はエラー、NA は伝播する）
  let aEls;
  if (b.has("a")) {
    const av = b.val("a");
    if (isDf(av)) fail(ctx, "データフレームはこの関数の対象外です");
    aEls = (av === null ? [] : H.vec(av)).map((el) => {
      if (H.isNA(el)) return H.NA;
      if (typeof el === "number") return el;
      if (typeof el === "boolean") return el ? 1 : 0;
      fail(ctx, "non-numeric argument to binary operator");
    });
    if (!aEls.length) return [];
  } else {
    aEls = [baseN <= 10 ? 3 / 8 : 1 / 2];
  }
  // (seq - a) と (baseN + 1 - 2*a) の2回の演算としてリサイクルする
  const L1 = Math.max(seq.length, aEls.length);
  if (L1 % Math.min(seq.length, aEls.length) !== 0) warn(ctx, RECYCLE_WARN);
  const numArr = Array.from({ length: L1 }, (_, i) => {
    const a = aEls[i % aEls.length];
    return H.isNA(a) ? H.NA : seq[i % seq.length] - a;
  });
  if (L1 % aEls.length !== 0) warn(ctx, RECYCLE_WARN);
  const out = numArr.map((nv2, i) => {
    const a = aEls[i % aEls.length];
    if (H.isNA(nv2) || H.isNA(a)) return H.NA;
    return nv2 / (baseN + 1 - 2 * a);
  });
  return out;
}

// ================= nextn =================
// 実 R の定義（stats src fourier.c）：factors は整数へ変換（切捨て）
// され、n は小さい場合は整数へ変換（切捨て）されてから、factors の
// 順に割り切れるかを調べる ok_n の線形スキャンで次の候補を探す。
// factors が互いに素でない場合の既知の非最小性（例：nextn(91, c(2,6))
// = 128）もこの定義どおりに再現される。
const INT_MAX = 2147483647;
function nextnHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["n", "factors"]);
  const nv = b.req("n");
  if (isDf(nv)) fail(ctx, "データフレームはこの関数の対象外です");
  // factors の検証（C 実装では n の型検査より先に行われる）
  let factors = [2, 3, 5];
  if (b.has("factors")) {
    const fv = b.val("factors");
    if (isDf(fv)) fail(ctx, "データフレームはこの関数の対象外です");
    const fEls = fv === null ? [] : H.vec(fv);
    if (!fEls.length) fail(ctx, "no factors");
    let coerced = false;
    factors = fEls.map((el) => {
      if (H.isNA(el) || H.isNaNVal(el)) return NaN;
      if (typeof el === "boolean") return el ? 1 : 0;
      if (typeof el === "number") {
        const t = Math.trunc(el);
        return Math.abs(t) > INT_MAX ? NaN : t;
      }
      if (typeof el === "string") {
        const t = el.trim();
        const num = t === "" ? NaN : Number(t);
        if (Number.isNaN(num)) {
          coerced = true;
          return NaN;
        }
        const tr = Math.trunc(num);
        return Math.abs(tr) > INT_MAX ? NaN : tr;
      }
      return NaN;
    });
    if (coerced)
      warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
    if (factors.some((f) => Number.isNaN(f) || f <= 1))
      fail(ctx, "invalid factors");
  }
  if (nv === null) return [];
  const els = H.vec(nv);
  if (!els.length) return [];
  // n の型検査：logical／character は C 実装どおりエラー。ただし
  // 長さ1の NA は logical の NA としてこのエラーになる（モデルの
  // NA は型を持たないため、数値要素を含むベクトル中の NA は
  // NA_real_ として NA を返す側に倒す）
  const hasNum = els.some((e) => typeof e === "number");
  if (
    els.some((e) => typeof e === "string") ||
    els.some((e) => typeof e === "boolean") ||
    (!hasNum && els.length === 1)
  )
    fail(ctx, "'n' must have typeof(.) \"integer\" or \"double\"");
  const ok = (m) => {
    let t = m;
    for (const f of factors) {
      while (t % f === 0) {
        t /= f;
        if (t === 1) return true;
      }
    }
    return t === 1;
  };
  let nMax = -1;
  for (const e of els) {
    if (typeof e === "number" && !Number.isNaN(e) && e > nMax) nMax = e;
  }
  const useInt = nMax <= Math.floor(INT_MAX / factors[0]);
  const out = els.map((el) => {
    if (H.isNA(el) || H.isNaNVal(el)) return H.NA;
    const m = Math.trunc(el);
    if (m <= 1) return 1;
    if (!Number.isFinite(m))
      fail(
        ctx,
        "nextn の n = Inf は実 R でも終了しないため説明に対応していません",
      );
    if (useInt) {
      let k = m;
      while (!ok(k) && k < INT_MAX) k++;
      if (k >= INT_MAX) {
        warn(
          ctx,
          "nextn() found no solution < 2147483647 = INT_MAX (the maximal integer); pass '0+ n' instead of 'n'",
        );
        return H.NA;
      }
      return k;
    }
    // double 経路（uint64 スキャン）。2^53 を超える領域は double の
    // 整数精度が尽きるため、m 自体が条件を満たす場合だけ返す。
    if (m > 9007199254740992) {
      if (ok(m)) {
        warn(
          ctx,
          `nextn() = ${m} > 2^53 may not be exactly representable in R (as "double")`,
        );
        return m;
      }
      fail(
        ctx,
        "nextn の 2^53 を超える探索は double の精度では説明に対応していません",
      );
    }
    let k = m;
    let iter = 0;
    while (!ok(k)) {
      k++;
      if (++iter > 2e7)
        fail(ctx, "nextn の探索範囲が大きすぎるため説明に対応していません");
    }
    if (k > 9007199254740992)
      warn(
        ctx,
        `nextn() = ${k} > 2^53 may not be exactly representable in R (as "double")`,
      );
    return k;
  });
  return out;
}

// ================= mahalanobis =================
// 実 R の定義（stats R/mahalanobis.R）：ベクトル x は1行の観測、
// 行列 x は行ごとの観測として、center で引いた（sweep）後に
// solve(cov)（inverted=FALSE のとき）との二次形式
// rowSums(x %*% cov * x) を返す。値モデルには行列が無いため、
// 行列はデータフレーム（x は行＝観測、cov は正方）で表す形と
// p=1 のスカラー形だけを再現し、それ以外の形は名指しで止める
// （実 R でも data.frame の cov は solve が受け付けることを実測済み）。
function invertMatrix(ctx, A, tol) {
  const q = A.length;
  // 1ノルムによる相互条件数の推定（solve の計算特異チェック）
  const colSum = (M, j) => M.reduce((s, row) => s + Math.abs(row[j]), 0);
  const normA = Math.max(...A.map((_, j) => colSum(A, j)));
  const M = A.map((row, i) => [
    ...row,
    ...Array.from({ length: q }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < q; col++) {
    let piv = col;
    for (let r = col + 1; r < q; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (M[piv][col] === 0)
      fail(
        ctx,
        `Lapack routine dgesv: system is exactly singular: U[${col + 1},${col + 1}] = 0`,
      );
    if (piv !== col) [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = 0; j < 2 * q; j++) M[col][j] /= d;
    for (let r = 0; r < q; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * q; j++) M[r][j] -= f * M[col][j];
    }
  }
  const inv = M.map((row) => row.slice(q));
  const normI = Math.max(...inv.map((_, j) => colSum(inv, j)));
  const rcond = 1 / (normA * normI);
  if (Number.isFinite(rcond) && rcond < tol)
    fail(
      ctx,
      `system is computationally singular: reciprocal condition number = ${ctx.H.formatRNum(rcond)}`,
    );
  return inv;
}
function mahalanobisHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "center", "cov", "inverted"], { dots: true });
  // ... は solve へ渡る：位置引数は solve の b になるため名指し停止。
  // 名前付きは tol だけを使い、それ以外は実 R どおり黙って無視する。
  let tol = 2.220446049250313e-16;
  for (const d of b.dots) {
    if (d.name === null)
      fail(
        ctx,
        "mahalanobis の ... への位置引数（solve の b）の受け渡しは説明に対応していません",
      );
    if (d.name === "tol" || ("tol".startsWith(d.name) && d.name.length > 0 && !"LINPACK".startsWith(d.name))) {
      const els = d.value === null ? [] : H.vec(d.value);
      if (els.length && typeof els[0] === "number") tol = els[0];
    }
  }
  const xv = b.req("x");
  const centerV = b.req("center");
  const covV = b.req("cov");
  const inverted = b.has("inverted") ? ifLogical(ctx, b.val("inverted")) : false;
  // ---- x を行列（行＝観測）へ
  let rows, p, resultNames = null;
  if (isDf(xv)) {
    const cols = Object.values(xv.columns);
    p = cols.length;
    const nrow = H.dfNrow(xv);
    for (const col of cols)
      if (col.some((e) => typeof e === "string"))
        fail(ctx, "non-numeric argument to binary operator");
    rows = Array.from({ length: nrow }, (_, i) =>
      cols.map((col) => {
        const el = col[i];
        if (H.isNA(el)) return H.NA;
        return typeof el === "boolean" ? (el ? 1 : 0) : el;
      }),
    );
    if (Array.isArray(xv.rowNames)) resultNames = xv.rowNames.slice();
  } else {
    if (xv === null)
      fail(ctx, "mahalanobis の x = NULL は説明に対応していません");
    const els = H.vec(xv);
    if (els.some((e) => typeof e === "string"))
      fail(ctx, "non-numeric argument to binary operator");
    rows = [
      els.map((el) => {
        if (H.isNA(el)) return H.NA;
        return typeof el === "boolean" ? (el ? 1 : 0) : el;
      }),
    ];
    p = els.length;
  }
  // ---- center（FALSE はセンタリング省略。それ以外は sweep の
  // リサイクル規則：長い場合は警告して切り捨て、割り切れない
  // 場合は警告して繰り返す）
  let center = null;
  const cEls0 = centerV === null ? [] : H.vec(centerV);
  const isFalseCenter =
    centerV !== null && cEls0.length === 1 && cEls0[0] === false;
  if (!isFalseCenter) {
    if (isDf(centerV))
      fail(ctx, "non-numeric argument to binary operator");
    if (centerV === null)
      fail(ctx, "mahalanobis の center = NULL は説明に対応していません");
    if (cEls0.some((e) => typeof e === "string"))
      fail(ctx, "non-numeric argument to binary operator");
    const c = cEls0.map((el) => {
      if (H.isNA(el)) return H.NA;
      return typeof el === "boolean" ? (el ? 1 : 0) : el;
    });
    if (c.length > p) {
      warn(ctx, "STATS is longer than the extent of 'dim(x)[MARGIN]'");
      center = c.slice(0, p);
    } else if (c.length === 0) {
      fail(ctx, "non-numeric argument to binary operator");
    } else {
      if (p % c.length !== 0)
        warn(ctx, "STATS does not recycle exactly across MARGIN");
      center = Array.from({ length: p }, (_, i) => c[i % c.length]);
    }
  }
  // ---- cov を正方行列へ
  let covM, q;
  if (isDf(covV)) {
    const cols = Object.values(covV.columns);
    const R = H.dfNrow(covV);
    const C = cols.length;
    for (const col of cols)
      if (col.some((e) => typeof e === "string"))
        fail(ctx, "'a' must be a numeric matrix");
    if (R === 0 && C === 0) fail(ctx, "'a' is 0-diml");
    if (R !== C) fail(ctx, `'a' (${R} x ${C}) must be square`);
    q = R;
    covM = Array.from({ length: R }, (_, i) =>
      cols.map((col) => {
        const el = col[i];
        if (H.isNA(el)) return H.NA;
        return typeof el === "boolean" ? (el ? 1 : 0) : el;
      }),
    );
  } else {
    const els = covV === null ? [] : H.vec(covV);
    if (els.some((e) => typeof e === "string"))
      fail(ctx, "'a' must be a numeric matrix");
    if (!els.length) fail(ctx, "'a' is 0-diml");
    if (els.length > 1) fail(ctx, `'a' (${els.length} x 1) must be square`);
    q = 1;
    const el = els[0];
    covM = [
      [H.isNA(el) ? H.NA : typeof el === "boolean" ? (el ? 1 : 0) : el],
    ];
  }
  // ---- solve（inverted=FALSE）と整合性検査
  // 実 R の順序：solve のエラー（特異等）→ %*% の次元不整合の順。
  // NA を含む solve は NA の逆行列を返し（エラーにしない）、
  // 次元不整合はその後でも検出される。
  let Cinv;
  let covNA = false;
  let covBad = false;
  if (!inverted) {
    const flatCov = covM.flat();
    covNA = flatCov.some((e) => H.isNA(e));
    covBad = flatCov.some((e) => H.isNaNVal(e) || !Number.isFinite(e));
    if (!covNA && !covBad) Cinv = invertMatrix(ctx, covM, tol);
  } else {
    Cinv = covM;
  }
  if (q !== p) fail(ctx, "non-conformable arguments");
  if (covNA) return rows.map(() => H.NA);
  if (covBad) return rows.map(() => NaN);
  // ---- 二次形式
  const out = rows.map((row) => {
    const d = center
      ? row.map((v, i) => {
          if (H.isNA(v) || H.isNA(center[i])) return H.NA;
          return v - center[i];
        })
      : row.slice();
    if (d.some((v) => H.isNA(v))) return H.NA;
    if (Cinv.flat().some((e) => H.isNA(e))) return H.NA;
    let s = 0;
    for (let i = 0; i < p; i++) {
      let t = 0;
      for (let j = 0; j < p; j++) t += Cinv[i][j] * d[j];
      s += d[i] * t;
    }
    return s;
  });
  if (resultNames) return H.withNames(out, resultNames);
  return out;
}

// ================= symnum =================
// 実 R の定義（stats R/symnum.R）をベクトル入力について再現する。
// 行列・配列の次元属性・列名略記・下三角表示と、結果の "legend"
// 属性と "noquote" クラスは値モデルで表せないため再現しない
// （符号化された文字列そのものと名前属性は再現する）。
function symnumHandler(ctx) {
  const H = ctx.H;
  const formals = [
    "x", "cutpoints", "symbols", "legend", "na", "eps", "numeric.x",
    "corr", "show.max", "show.min", "abbr.colnames", "lower.triangular",
    "diag.lower.tri",
  ];
  const b = bindArgs(ctx, formals);
  const xv = b.req("x");
  if (isDf(xv))
    fail(ctx, "symnum はデータフレーム（行列・配列）に対応していません");
  const els = xv === null ? [] : H.vec(xv);
  if (!els.length) return [];
  const numericX = b.has("numeric.x")
    ? ifLogical(ctx, b.val("numeric.x"))
    : !els.some((e) => typeof e === "string") &&
      !els.some((e) => typeof e === "boolean");
  const hasNA = els.some((e) => H.isNA(e) || H.isNaNVal(e));
  const fmt = (v) => H.formatRNum(v);
  let ans;
  let cutpoints = null;
  let maxc = null;
  let minc = null;
  let xVals = null; // show.max／min 判定に使う値（corr では abs 後）
  if (numericX) {
    if (els.some((e) => typeof e === "string"))
      fail(ctx, "non-numeric argument to binary operator");
    const corr = b.has("corr")
      ? ifLogical(ctx, b.val("corr"))
      : !b.has("cutpoints") && numericX;
    // cutpoints（sort は欠損を取り除く）
    let cuts;
    if (b.has("cutpoints")) {
      const cv = b.val("cutpoints");
      if (isDf(cv)) fail(ctx, "データフレームはこの関数の対象外です");
      cuts = numEls(ctx, cv, "non-numeric argument to binary operator")
        .filter((e) => !H.isNA(e) && !H.isNaNVal(e))
        .sort((u, w) => u - w);
    } else cuts = [0.3, 0.6, 0.8, 0.9, 0.95];
    if (corr) cuts = [0, ...cuts, 1];
    cutpoints = cuts;
    const dupOrRange =
      new Set(cuts).size !== cuts.length ||
      (corr && cuts.some((c) => c > 1 || c < 0));
    if (dupOrRange)
      fail(
        ctx,
        (corr
          ? "'cutpoints' must be unique in 0 < cuts < 1, but are = "
          : "'cutpoints' must be unique, but are = ") +
          cuts.map(fmt).join("|"),
      );
    const nc = cuts.length;
    minc = cuts[0];
    maxc = cuts[nc - 1];
    const eps = (() => {
      if (!b.has("eps")) return 1e-5;
      const ev = b.val("eps");
      const eEls = ev === null ? [] : H.vec(ev);
      if (!eEls.length) return NaN;
      const el = eEls[0];
      if (typeof el === "string")
        fail(ctx, "non-numeric argument to binary operator");
      if (H.isNA(el)) return NaN;
      return Number(el);
    })();
    xVals = els.map((el) => {
      if (H.isNA(el)) return H.NA;
      const n = typeof el === "boolean" ? (el ? 1 : 0) : el;
      return corr ? Math.abs(n) : n;
    });
    const rangeMsg =
      nc > 0
        ? corr
          ? "'x' must be between -1 and 1"
          : `'x' must be between ${fmt(minc)} and ${fmt(maxc)}`
        : "";
    if (nc > 0) {
      if (
        !corr &&
        xVals.some((v) => !H.isNA(v) && !H.isNaNVal(v) && v < minc - eps)
      )
        fail(ctx, rangeMsg);
      if (xVals.some((v) => !H.isNA(v) && !H.isNaNVal(v) && v > maxc + eps))
        fail(ctx, rangeMsg);
    }
    // symbols
    let symbols;
    if (b.has("symbols")) {
      const sv = b.val("symbols");
      if (isDf(sv)) fail(ctx, "データフレームはこの関数の対象外です");
      symbols = (sv === null ? [] : H.vec(sv)).map((el) => {
        if (H.isNA(el)) return H.NA;
        if (typeof el === "string") return el;
        if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
        return fmt(el);
      });
    } else symbols = [" ", ".", ",", "+", "*", "B"];
    const symKeys = symbols.map((s) => (H.isNA(s) ? " NA" : "s:" + s));
    if (new Set(symKeys).size !== symKeys.length)
      fail(
        ctx,
        "'symbols' must be unique, but are = " +
          symbols.map((s) => (H.isNA(s) ? "NA" : s)).join("|"),
      );
    if (nc !== symbols.length + 1)
      fail(
        ctx,
        corr
          ? "number of 'cutpoints' must be one less than number of symbols"
          : "number of 'cutpoints' must be one more than number of symbols",
      );
    // cut(x, breaks, include.lowest = TRUE, labels = FALSE) 相当
    const codes = xVals.map((v) => {
      if (H.isNA(v) || H.isNaNVal(v)) return null;
      if (v < cuts[0] || v > cuts[nc - 1]) return null;
      // 区間は (c_j, c_{j+1}]（最初の区間のみ左端を含む）。
      let j = cuts.filter((c) => c < v).length - 1;
      if (j < 0) j = 0;
      if (j > nc - 2) j = nc - 2;
      return j + 1;
    });
    // minc ちょうど下（eps 以内）の補正
    codes.forEach((c, i) => {
      if (c === null && !H.isNA(xVals[i]) && !H.isNaNVal(xVals[i])) {
        if (Math.abs(xVals[i] - minc) < eps) codes[i] = 1;
      }
    });
    ans = buildSymnumAns(ctx, els, codes, symbols, b);
    // show.max／show.min
    const fmt1 = (v) => H.formatRNum(v, 1);
    let showMax = null;
    if (b.has("show.max")) {
      const sv = b.val("show.max");
      if (sv !== null) {
        const e = H.vec(sv)[0];
        showMax = typeof e === "string" ? e : fmt1(maxc);
      }
    } else if (corr) showMax = "1";
    if (showMax !== null)
      ans = ans.map((a, i) => {
        const v = xVals[i];
        if (!H.isNA(v) && !H.isNaNVal(v) && v >= maxc - eps) return showMax;
        return a;
      });
    let showMin = null;
    if (b.has("show.min")) {
      const sv = b.val("show.min");
      if (sv !== null) {
        const e = H.vec(sv)[0];
        showMin = typeof e === "string" ? e : fmt1(minc);
      }
    }
    if (showMin !== null)
      ans = ans.map((a, i) => {
        const v = xVals[i];
        if (!H.isNA(v) && !H.isNaNVal(v) && v <= minc + eps) return showMin;
        return a;
      });
  } else {
    // logical 扱いの経路（iS <- x + 1）
    if (els.some((e) => typeof e === "string"))
      fail(ctx, "non-numeric argument to binary operator");
    let symbols;
    if (b.has("symbols")) {
      const sv = b.val("symbols");
      if (isDf(sv)) fail(ctx, "データフレームはこの関数の対象外です");
      const sEls = sv === null ? [] : H.vec(sv);
      if (sEls.length !== 2)
        fail(ctx, "must have 2 'symbols' for logical 'x' argument");
      symbols = sEls.map((el) => {
        if (H.isNA(el)) return H.NA;
        if (typeof el === "string") return el;
        if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
        return fmt(el);
      });
    } else symbols = [".", "|"];
    const codes = els.map((el) => {
      if (H.isNA(el) || H.isNaNVal(el)) return null;
      const n = typeof el === "boolean" ? (el ? 1 : 0) : Math.trunc(el);
      const idx = n + 1;
      return idx >= 1 && idx <= 2 ? idx : -1; // 範囲外は NA コード
    });
    ans = buildSymnumAns(ctx, els, codes, symbols, b);
  }
  // legend は属性のみ（値には影響しない）。実 R の if(legend) の
  // 検証だけは行う。lower.triangular もベクトルでは無効だが、
  // NA の場合は実 R が if で停止する点だけ再現する。
  if (b.has("legend")) ifLogical(ctx, b.val("legend"));
  if (b.has("lower.triangular")) {
    const lv = b.val("lower.triangular");
    const lEls = lv === null ? [] : H.vec(lv);
    if (lEls.length && (H.isNA(lEls[0]) || H.isNaNVal(lEls[0])))
      fail(ctx, "missing value where TRUE/FALSE needed");
  }
  const names = H.namesOf(xv);
  if (names) return H.withNames(ans, names.slice());
  return ans;
}
// symnum の NA 符号化（ソースの has.na 分岐）：na が character の
// ときだけ NA 位置へその文字列を入れ、それ以外は "" になる。
function buildSymnumAns(ctx, els, codes, symbols, b) {
  const H = ctx.H;
  const hasNA = els.some((e) => H.isNA(e) || H.isNaNVal(e));
  let naChar = null;
  if (b.has("na")) {
    const nav = b.val("na");
    const nEls = nav === null ? [] : H.vec(nav);
    if (nEls.length && typeof nEls[0] === "string") naChar = nEls[0];
  } else naChar = "?";
  return els.map((el, i) => {
    if (H.isNA(el) || H.isNaNVal(el)) return hasNA ? (naChar ?? "") : H.NA;
    const c = codes[i];
    if (c === null || c === -1) return H.NA;
    return symbols[c - 1];
  });
}

// ================= sortedXyData =================
// 実 R の定義（stats R/selfStart.R の sortedXyData.default）：
// x／y を数値化し、tapply(y, x, mean, na.rm = TRUE) で同じ x の
// y を平均し、x の昇順に並べ、NA の行を落とした（na.omit）
// 2列データフレームを返す。x のグループ化は as.character 経由の
// 文字列化（15有効桁）を経るため、グループキーは formatRNum で作る。
// 式（language）形式とクラス属性は値モデルで表せないため、
// 長さ1の文字列（片側式）の引数は名指しで止める。
function sortedXyDataHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "y", "data"]);
  const xv = b.req("x");
  const yv = b.req("y");
  if (isDf(xv) || isDf(yv))
    fail(ctx, "データフレームはこの関数の対象外です");
  const coerceArg = (v, label) => {
    const els = v === null ? [] : H.vec(v);
    if (els.length === 1 && typeof els[0] === "string")
      fail(
        ctx,
        `sortedXyData の ${label} の文字列（式）形式は説明に対応していません`,
      );
    let coercedNA = false;
    const out = els.map((el) => {
      if (H.isNA(el)) return H.NA;
      if (typeof el === "number") return el;
      if (typeof el === "boolean") return el ? 1 : 0;
      const t = el.trim();
      const n = t === "" ? NaN : Number(t);
      if (Number.isNaN(n) && t !== "NaN") {
        coercedNA = true;
        return H.NA;
      }
      return n;
    });
    if (coercedNA)
      warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
    return out;
  };
  const xs = coerceArg(xv, "x");
  const ys = coerceArg(yv, "y");
  if (xs.length !== ys.length) fail(ctx, "arguments must have same length");
  const groups = new Map(); // key -> {xval, sum, count, allNA}
  xs.forEach((x, i) => {
    if (H.isNA(x) || H.isNaNVal(x)) return;
    const key = H.formatRNum(x);
    let g = groups.get(key);
    if (!g) {
      g = {
        xval:
          key === "Inf" ? Infinity : key === "-Inf" ? -Infinity : Number(key),
        sum: 0,
        comp: 0,
        count: 0,
      };
      groups.set(key, g);
    }
    const y = ys[i];
    if (H.isNA(y) || H.isNaNVal(y)) return;
    // 補償加算（基礎層 mean と同じ規則）
    const t = g.sum + y;
    if (Number.isFinite(t)) {
      if (Math.abs(g.sum) >= Math.abs(y)) g.comp += g.sum - t + y;
      else g.comp += y - t + g.sum;
    }
    g.sum = t;
    g.count++;
  });
  const rows = [...groups.values()]
    .filter((g) => g.count > 0)
    .map((g) => ({ x: g.xval, y: (g.sum + g.comp) / g.count }))
    .sort((u, w) => u.x - w.x);
  return {
    kind: "data.frame",
    columns: { x: rows.map((r) => r.x), y: rows.map((r) => r.y) },
  };
}

export const builtins = new Map([
  ["convolve", convolveHandler],
  ["ppoints", ppointsHandler],
  ["nextn", nextnHandler],
  ["mahalanobis", mahalanobisHandler],
  ["symnum", symnumHandler],
  ["sortedXyData", sortedXyDataHandler],
]);
