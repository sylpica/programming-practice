// 高度モード B4S：R 高度関数グループ「検定（stest 班）」（高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章／BRIEF §5。
// 本スライスで実装するのは p.adjust のみ：検定系の他関数は全て
// クラス "htest"／"pairwise.htest"／"power.htest" のリストオブジェクトを
// 返すため値モデルで表せず、未登録（＝エンジンの
// 「このR関数は説明に対応していません：名前」で名指し停止）とする。
// p.adjust の意味論は、実 R 4.3.3 の stats 名前空間にある実装本体
// （getFromNamespace("p.adjust", "stats") で取得したソース）を
// そのまま移植した：NA（NaN を含む。実 R の is.na は NaN も真）の
// 除外と保持、stopifnot(n >= lp) を n <= 1 の早期リターンより先に
// 評価する順序、n == 2 のとき hommel → hochberg への切替、hommel で
// 未観測分を 1 で埋めて n まで拡張する処理、方式ごとの倍率が lp では
// なく n を使う点まで含む。特に、デフォルト引数 n = length(p) は
// 実 R では遅延評価され、NA 除去後の p に対して初めて強制される
// ため、既定の n は「NA を除いた長さ lp」になる（実測で確認した
// 実装上の癖。明示した n はそのまま使われる）。照合根拠は
// docs/audit/ADV-B4S-stest.md に記録する。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}

// ---- 引数照合（functions-advanced-math.js の bindArgs を複製。出典：
// B4 eng1 班。SPEC 第4章：matchArgs を正とし、部分一致と余分な引数の
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

// ---- as.numeric 相当の変換（p.adjust は p を as.numeric で強制変換する）
function asNumericVec(ctx, v) {
  const H = ctx.H;
  if (v === null || v === undefined) return { els: [], coercedNA: false };
  if (isDf(v)) fail(ctx, "'list' object cannot be coerced to type 'double'");
  let coercedNA = false;
  const els = H.vec(v).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    if (typeof el === "string") {
      const t = el.trim();
      if (t === "NA") return H.NA;
      if (t === "NaN") return NaN;
      if (t === "Inf" || t === "+Inf" || t === "Infinity") return Infinity;
      if (t === "-Inf" || t === "-Infinity") return -Infinity;
      const num = t === "" ? NaN : Number(t);
      if (Number.isNaN(num)) {
        coercedNA = true;
        return H.NA;
      }
      return num;
    }
    fail(ctx, "'list' object cannot be coerced to type 'double'");
  });
  return { els, coercedNA };
}

const METHODS = [
  "holm",
  "hochberg",
  "hommel",
  "bonferroni",
  "BH",
  "BY",
  "fdr",
  "none",
];
// match.arg 相当：NULL は第1候補、完全一致→前方一致（pmatch）。
// エラー文言は実 R 4.3.3 の実測どおり 'arg' 表記（'method' ではない）。
function matchMethod(ctx, v) {
  const H = ctx.H;
  if (v === null || v === undefined) return METHODS[0];
  if (isDf(v)) fail(ctx, "'arg' must be NULL or a character vector");
  const els = H.vec(v);
  if (els.length > 1) {
    if (
      els.length === METHODS.length &&
      els.every((e, i) => e === METHODS[i])
    )
      return METHODS[0];
    fail(ctx, "'arg' must be of length 1");
  }
  if (!els.length)
    fail(
      ctx,
      `'arg' should be one of "holm", "hochberg", "hommel", "bonferroni", "BH", "BY", "fdr", "none"`,
    );
  const arg = els[0];
  if (typeof arg !== "string" && !H.isNA(arg))
    fail(ctx, "'arg' must be NULL or a character vector");
  if (typeof arg === "string") {
    if (METHODS.includes(arg)) return arg;
    const cand = METHODS.filter((m) => m.startsWith(arg));
    if (cand.length === 1 && arg !== "") return cand[0];
  }
  fail(
    ctx,
    `'arg' should be one of "holm", "hochberg", "hommel", "bonferroni", "BH", "BY", "fdr", "none"`,
  );
}

const cummax = (a) => {
  const out = [];
  let cur = -Infinity;
  for (const v of a) {
    cur = Math.max(cur, v);
    out.push(cur);
  }
  return out;
};
const cummin = (a) => {
  const out = [];
  let cur = Infinity;
  for (const v of a) {
    cur = Math.min(cur, v);
    out.push(cur);
  }
  return out;
};
// 安定ソートによる order()：添字の配列を返す（decreasing は値の降順）。
function orderIdx(vals, decreasing) {
  const idx = vals.map((_, i) => i);
  idx.sort((a, b) => {
    const d = decreasing ? vals[b] - vals[a] : vals[a] - vals[b];
    return d === 0 || Number.isNaN(d) ? a - b : d;
  });
  return idx;
}
// ro = order(o)：ソート済み位置から元の位置への逆置換。
function invPerm(o) {
  const ro = new Array(o.length);
  o.forEach((orig, j) => {
    ro[orig] = j;
  });
  return ro;
}
const unpermute = (sortedVals, ro) => sortedVals.map((_, k) => sortedVals[ro[k]]);

function pAdjustHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["p", "method", "n"]);
  const pRaw = b.req("p");
  let method = b.has("method") ? matchMethod(ctx, b.val("method")) : "holm";
  if (method === "fdr") method = "BH";
  const { els: pAll, coercedNA } = asNumericVec(ctx, pRaw);
  if (coercedNA)
    warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
  const nm = H.namesOf(pRaw);
  // 実 R の is.na は NaN も真：欠損として扱い、元の要素はそのまま保持する。
  const isMiss = (v) => H.isNA(v) || H.isNaNVal(v);
  const p0 = pAll.slice();
  const finish = () => (nm ? H.withNames(p0, nm.slice()) : p0);
  const p = pAll.filter((v) => !isMiss(v));
  const lp = p.length;
  // n の解釈：明示値はそのまま。既定値は実 R の遅延評価の癖により
  // NA 除去後の長さ lp になる（ファイル冒頭コメント参照）。
  let n = lp;
  if (b.has("n")) {
    const nv = b.val("n");
    if (nv === null || nv === undefined)
      fail(ctx, "argument is of length zero");
    if (isDf(nv)) fail(ctx, "'list' object cannot be coerced to type 'double'");
    // A4 独立監査で実 R 4.3.3 実測により裁定（RG-633 の未実測分を解消）：
    // 実 R の p.adjust は n を as.numeric 変換せず stopifnot(n >= lp) を
    // そのまま評価するため、文字列 n は lp を文字列化したものとの
    // 字句順比較になり、NA／NaN の n は "n >= lp is not TRUE" で停止する
    // （"missing value where TRUE/FALSE needed" ではない）。文字列 n が
    // 比較を通過した場合は method = "none" 以外では後段の算術
    // （n * p 等）で "non-numeric argument to binary operator" になる。
    const rawEls = H.vec(nv);
    if (!rawEls.length) fail(ctx, "argument is of length zero");
    if (rawEls.length > 1) fail(ctx, "the condition has length > 1");
    const rawEl = rawEls[0];
    if (typeof rawEl === "string") {
      if (!(rawEl >= String(lp))) fail(ctx, "n >= lp is not TRUE");
      if (rawEl <= "1") return finish();
      if (method === "none") return finish();
      fail(ctx, "non-numeric argument to binary operator");
    }
    const nEls = asNumericVec(ctx, nv).els;
    if (H.isNA(nEls[0]) || Number.isNaN(nEls[0]))
      fail(ctx, "n >= lp is not TRUE");
    n = nEls[0];
  }
  // 実 R の評価順序：stopifnot(n >= lp) が n <= 1 の早期リターンより先。
  if (!(n >= lp)) fail(ctx, "n >= lp is not TRUE");
  if (n <= 1) return finish();
  if (n === 2 && method === "hommel") method = "hochberg";
  const setAdjusted = (adj) => {
    let k = 0;
    pAll.forEach((v, i) => {
      if (!isMiss(v)) p0[i] = adj[k++];
    });
  };
  if (method === "bonferroni") {
    setAdjusted(p.map((v) => Math.min(1, n * v)));
  } else if (method === "holm") {
    const o = orderIdx(p, false);
    const ro = invPerm(o);
    const sorted = o.map((i) => p[i]);
    // i = seq_len(lp)（昇順位置 j に対して i = j + 1）、倍率は (n + 1 - i)。
    const adjSorted = cummax(
      sorted.map((v, j) => (n + 1 - (j + 1)) * v),
    ).map((v) => Math.min(1, v));
    setAdjusted(unpermute(adjSorted, ro));
  } else if (method === "hommel") {
    // 未観測分を 1 で埋めて n まで拡張し、n 本で計算する（上限 1 への
    // 切り捨ては実 R のこの方式には無い）。
    const pp = n > lp ? [...p, ...new Array(n - lp).fill(1)] : p.slice();
    const N = pp.length;
    const o = orderIdx(pp, false);
    const ro = invPerm(o);
    const s = o.map((i) => pp[i]);
    // q = pa = rep(min(n * s / i), n)、i = 1..n。
    const init = Math.min(...s.map((v, j) => (n * v) / (j + 1)));
    let q = new Array(N).fill(init);
    let pa = q.slice();
    for (let j = N - 1; j >= 2; j--) {
      // ij = 1..(N-j+1)、i2 = (N-j+2)..N、q1 = min(j * s[i2] / (2:j))。
      const ijCount = N - j + 1;
      const i2 = [];
      for (let t = N - j + 2; t <= N; t++) i2.push(t);
      const q1 = Math.min(...i2.map((idx2, t) => (j * s[idx2 - 1]) / (t + 2)));
      for (let t = 0; t < ijCount; t++) q[t] = Math.min(j * s[t], q1);
      for (const idx2 of i2) q[idx2 - 1] = q[N - j];
      pa = pa.map((v, t) => Math.max(v, q[t]));
    }
    const adjSorted = s.map((v, t) => Math.max(pa[t], v));
    // 実 R は pmax(pa, p)[if (lp < n) ro[1:lp] else ro] を代入する：
    // 観測分の位置 k（0-based）には adjSorted[ro[k]] が来る。
    const adj = p.map((_, k) => adjSorted[ro[k]]);
    setAdjusted(adj);
  } else if (method === "hochberg") {
    const o = orderIdx(p, true);
    const ro = invPerm(o);
    const sorted = o.map((i) => p[i]);
    // i = lp:1（降順位置 j に対して i = lp - j）、倍率は (n + 1 - i)。
    const adjSorted = cummin(
      sorted.map((v, j) => (n + 1 - (lp - j)) * v),
    ).map((v) => Math.min(1, v));
    setAdjusted(unpermute(adjSorted, ro));
  } else if (method === "BH") {
    const o = orderIdx(p, true);
    const ro = invPerm(o);
    const sorted = o.map((i) => p[i]);
    // i = lp:1、倍率は n / i。
    const adjSorted = cummin(
      sorted.map((v, j) => (n / (lp - j)) * v),
    ).map((v) => Math.min(1, v));
    setAdjusted(unpermute(adjSorted, ro));
  } else if (method === "BY") {
    let q = 0;
    for (let k = 1; k <= n; k++) q += 1 / k;
    const o = orderIdx(p, true);
    const ro = invPerm(o);
    const sorted = o.map((i) => p[i]);
    // i = lp:1、倍率は q * n / i。
    const adjSorted = cummin(
      sorted.map((v, j) => ((q * n) / (lp - j)) * v),
    ).map((v) => Math.min(1, v));
    setAdjusted(unpermute(adjSorted, ro));
  } else if (method === "none") {
    // 何もしない（p0 がそのまま返る）。
  }
  return finish();
}

export const builtins = new Map([["p.adjust", pAdjustHandler]]);
