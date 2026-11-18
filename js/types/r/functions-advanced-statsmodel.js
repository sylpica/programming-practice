// 高度モード B4S：R 高度関数グループ「モデル系のうち値モデルで表せるもの」
// （smodel 班。高度差分）。ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 意味論は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3 の実走で裁定した
// （報告書 docs/audit/ADV-B4S-smodel.md に根拠を記録）。
// 本ファイルが実装するのは na.fail／na.omit／na.pass／offset の4関数のみ。
// モデル適合・数式・モデルオブジェクト・リスト／行列／関数値を返す関数は
// 値モデルで忠実に表せないため実装せず、リファレンス側で未対応とする。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}

// ---- 引数照合（functions-advanced-data.js（B4 データ班）の bindArgs を複製。
// SPEC 第4章：完全一致→部分一致→位置。dots=true のとき余分は dots へ）
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
  return {
    has: (n) => result.has(n),
    val: (n) => result.get(n)?.value,
    nodeOf: (n) => result.get(n)?.node,
    req: (n) => {
      if (!result.has(n))
        api.fail(`argument "${n}" is missing, with no default`, node);
      return result.get(n).value;
    },
    dots: dotList,
  };
}

// 欠損（NA／NaN）を含むか。データフレームはいずれかの列のいずれかの要素。
// 実 R 4.3.3 実走：na.fail は NaN でも "missing values in object" になる
// （is.na の意味論どおり NaN も欠損として扱う）。
function anyMissing(ctx, v) {
  const H = ctx.H;
  if (isDf(v))
    return Object.values(v.columns).some((col) =>
      H.vec(col).some((e) => H.isMissing(e)),
    );
  return H.vec(v).some((e) => H.isMissing(e));
}

// na.fail(object, ...)：欠損があれば実 R どおりの文言でエラー、無ければ
// object をそのまま返す。NULL は実 R では専用メッセージでエラーになる
// （実走確認："no input has determined the number of cases"）。
function naFail(ctx) {
  const b = bindArgs(ctx, ["object"], { dots: true });
  const obj = b.req("object");
  if (obj === null || obj === undefined)
    fail(ctx, "no input has determined the number of cases");
  if (anyMissing(ctx, obj)) fail(ctx, "missing values in object");
  return obj;
}

// na.pass(object, ...)：欠損があってもそのまま返す（恒等）。
function naPass(ctx) {
  const b = bindArgs(ctx, ["object"], { dots: true });
  return b.req("object");
}

// na.omit(object, ...)：欠損を含む要素（ベクトル）／行（データフレーム）を
// 除いて返す。実 R では除去位置が na.action 属性に残るが、値モデルには
// 属性が無いため保持しない（リファレンスの caution に明記）。
// 除去が無い場合は入力オブジェクトをそのまま返す（型・形を変えない）。
function naOmit(ctx) {
  const b = bindArgs(ctx, ["object"], { dots: true });
  const obj = b.req("object");
  const H = ctx.H;
  if (obj === null || obj === undefined) return null;
  if (isDf(obj)) {
    const n = H.dfNrow(obj);
    const cols = Object.entries(obj.columns);
    const keep = [];
    for (let i = 0; i < n; i++)
      if (cols.every(([, col]) => !H.isMissing(H.vec(col)[i]))) keep.push(i);
    if (keep.length === n) return obj;
    const columns = {};
    for (const [name, col] of cols) {
      const els = H.vec(col);
      const sub = keep.map((i) => els[i]);
      const nm = H.namesOf(col);
      columns[name] = nm ? H.withNames(sub, keep.map((i) => nm[i])) : sub;
    }
    const out = { kind: "data.frame", columns };
    if (Array.isArray(obj.rowNames))
      out.rowNames = keep.map((i) => obj.rowNames[i]);
    return out;
  }
  const els = H.vec(obj);
  if (!els.some((e) => H.isMissing(e))) return obj;
  const keepIdx = [];
  els.forEach((e, i) => {
    if (!H.isMissing(e)) keepIdx.push(i);
  });
  const sub = keepIdx.map((i) => els[i]);
  const nm = H.namesOf(obj);
  return nm ? H.withNames(sub, keepIdx.map((i) => nm[i])) : sub;
}

// offset(object)：公式ヘルプの Value は「The input value」。数式内での
// 役割は再現しないが、値としては入力をそのまま返す恒等関数として実装する。
// 余分な引数は実 R どおり unused argument でエラー（... を持たない）。
function offsetFn(ctx) {
  const b = bindArgs(ctx, ["object"]);
  return b.req("object");
}

export const builtins = new Map([
  ["na.fail", naFail],
  ["na.omit", naOmit],
  ["na.pass", naPass],
  ["offset", offsetFn],
]);
