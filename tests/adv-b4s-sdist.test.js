import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 高度モード B4S・sdist 班（R stats：確率分布）。
// 期待値は実 R 4.3.3（/usr/bin/Rscript）の %.17g 実測から導いた
// （報告書 docs/audit/ADV-B4S-sdist.md に照合根拠を記録）。
// F-01 分類：典型／境界（区間端・p=0/1・退化パラメータ）／異常（不正な
// 引数・欠落・余分な引数）／組み合わせ（log・lower.tail・ベクトル・名前）。
// 非心 t の R 値は R 自身の打切り誤差（約1e-13）を含むため 1e-9 で照合する。
// qf(0.95, 5, 10, ncp=2) は実 R 値が独立系 SciPy の検証値から 1.8e-9 ずれる
// （R 側の誤差）ため 1e-8 で照合する。

const run = async (code, model) => {
  const d = getDefinition("r");
  return d.simulate(code, structuredClone(model ?? d.model.defaults));
};
const first = async (code, model) => {
  const r = await run(code, model);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r));
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const errOf = async (code, model) => {
  const r = await run(code, model);
  return [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
};
const outputs = (p) => p.outputs.map((o) => o.text);
const outIs = async (code, expected, model) => {
  const p = await first(code, model);
  assert.deepEqual(outputs(p), expected, code);
};
const errMatch = async (code, re, model) => {
  const errs = await errOf(code, model);
  assert.ok(
    errs.some((e) => re.test(e.message)),
    code + " -> " + JSON.stringify(errs),
  );
};
const warnHas = async (code, re, model) => {
  const p = await first(code, model);
  assert.ok(
    p.trace.some((t) => t.kind === "warning" && re.test(t.text)),
    code + " -> " + JSON.stringify(p.trace),
  );
};
const numsApprox = async (code, expected, tol = 1e-12, model) => {
  const p = await first(code, model);
  const text = outputs(p)[0];
  const got = [...text.matchAll(/-?\d+\.?\d*(e[+-]?\d+)?/gi)].map((m) =>
    Number(m[0]),
  );
  assert.equal(got.length, expected.length, code + " -> " + text);
  got.forEach((g, i) => {
    const e = expected[i];
    assert.ok(
      Math.abs(g - e) <= tol * Math.max(1, Math.abs(e)),
      `${code} [${i}]: got ${g}, expected ${e}`,
    );
  });
};

// ---- 正規分布（典型・境界・対数裾）
test("sdist norm typical and boundary", async () => {
  await numsApprox("print(dnorm(0))", [0.3989422804014327]);
  await numsApprox("print(dnorm(1.5, mean=1, sd=2))", [0.19333405840142462]);
  await numsApprox("print(dnorm(0, log=TRUE))", [-0.91893853320467278]);
  await numsApprox("print(pnorm(1.96))", [0.97500210485177963]);
  await numsApprox("print(pnorm(-3.5))", [0.00023262907903552494]);
  await numsApprox("print(qnorm(0.975))", [1.9599639845400536]);
  await numsApprox("print(qnorm(0.001))", [-3.0902323061678132]);
  await numsApprox("print(qnorm(1e-15))", [-7.9413453261709952], 1e-9);
  // sd=0 の退化（実測）
  await outIs("print(dnorm(2, sd=0))", ["c(0)"]);
  await outIs("print(dnorm(0, sd=0))", ["c(Inf)"]);
  await outIs("print(pnorm(0, sd=0))", ["c(1)"]);
  await outIs("print(pnorm(-1, sd=0))", ["c(0)"]);
  await outIs("print(qnorm(0.5, sd=0))", ["c(0)"]);
  await outIs("print(qnorm(0, sd=0))", ["c(-Inf)"]);
  await outIs("print(qnorm(1, sd=0))", ["c(Inf)"]);
  // 対数裾（log.p は裾でも正確）
  await numsApprox("print(pnorm(-38, log.p=TRUE))", [-726.5572160188201], 1e-9);
  await numsApprox("print(pnorm(38, lower.tail=FALSE, log.p=TRUE))", [-726.5572160188201], 1e-9);
  await numsApprox("print(qnorm(-300, log.p=TRUE))", [-24.326438906565588], 1e-9);
  await numsApprox("print(qnorm(0.05, lower.tail=FALSE))", [1.6448536269514722]);
  // NA ロジカルは実 R の C 実装どおり真として扱う（実測）
  await numsApprox("print(dnorm(0, log=NA))", [-0.91893853320467278]);
  await numsApprox("print(pnorm(1, lower.tail=NA))", [0.8413447460685429]);
});

test("sdist norm vector, names, NA propagation", async () => {
  await outIs("print(dnorm(c(a=0, b=1)))", [
    "c(a = 0.3989422804014327, b = 0.24197072451914337)",
  ]);
  await outIs("print(dnorm(c(0, NA, NaN)))", [
    "c(0.3989422804014327, NA, NaN)",
  ]);
  // 名前は第1引数からのみ（パラメータ側の名前は引き継がない：実測）
  await numsApprox("print(dnorm(c(a=0, b=1), mean=c(1, 2)))", [
    0.24197072451914337, 0.24197072451914337,
  ]);
  // リサイクリングは無警告（stats の C 実装の実測）
  await numsApprox("print(pnorm(c(-1, 0, 1), sd=c(1, 2)))", [
    0.15865525393145707, 0.5, 0.8413447460685429,
  ]);
  await outIs("print(dnorm(numeric(0)))", ["c()"]);
});

// ---- コーシー／ロジスティック／一様／指数／対数正規／ワイブル
test("sdist cauchy logis unif exp lnorm weibull", async () => {
  await numsApprox("print(dcauchy(0))", [0.31830988618379069]);
  await numsApprox("print(pcauchy(1))", [0.75]);
  await numsApprox("print(pcauchy(100))", [0.9968170072350917]);
  await numsApprox("print(qcauchy(0.9))", [3.0776835371752544]);
  await outIs("print(dcauchy(0, scale=0))", ["c(NaN)"]);
  await outIs("print(qcauchy(0.5, scale=0))", ["c(0)"]);
  await outIs("print(qcauchy(0, scale=0))", ["c(0)"]);
  await numsApprox("print(dlogis(0))", [0.25]);
  await numsApprox("print(plogis(3))", [0.95257412682243336]);
  await numsApprox("print(qlogis(0.9))", [2.1972245773362196]);
  await outIs("print(qlogis(0, scale=0))", ["c(-Inf)"]);
  await outIs("print(qlogis(0.5, scale=0))", ["c(0)"]);
  await numsApprox("print(dunif(0.5))", [1]);
  await numsApprox("print(dunif(2, min=1, max=3))", [0.5]);
  await outIs("print(dunif(0.5, min=2, max=2))", ["c(NaN)"]);
  await outIs("print(punif(2, min=2, max=2))", ["c(1)"]);
  await outIs("print(punif(1, min=2, max=2))", ["c(0)"]);
  await numsApprox("print(qunif(0.3, min=1, max=5))", [2.2000000000000002]);
  await numsApprox("print(dexp(1))", [0.36787944117144233]);
  await outIs("print(dexp(0, rate=0))", ["c(0)"]);
  await outIs("print(dexp(1, rate=Inf))", ["c(NaN)"]);
  await numsApprox("print(pexp(2, rate=0.5))", [0.63212055882855767]);
  await outIs("print(pexp(1, rate=0))", ["c(0)"]);
  await outIs("print(pexp(Inf, rate=0))", ["c(NaN)"]);
  await outIs("print(pexp(1, rate=Inf))", ["c(1)"]);
  await outIs("print(pexp(0, rate=Inf))", ["c(0)"]);
  await numsApprox("print(qexp(0.99, rate=2))", [2.302585092994045]);
  await outIs("print(qexp(0.5, rate=0))", ["c(Inf)"]);
  await outIs("print(qexp(0, rate=0))", ["c(0)"]);
  await numsApprox("print(dlnorm(1))", [0.3989422804014327]);
  await outIs("print(dlnorm(2.718281828459045, meanlog=1, sdlog=0))", ["c(Inf)"]);
  await outIs("print(dlnorm(1, sdlog=0))", ["c(Inf)"]);
  await outIs("print(plnorm(1, sdlog=0))", ["c(1)"]);
  await outIs("print(plnorm(2, meanlog=1, sdlog=0))", ["c(0)"]);
  await numsApprox("print(plnorm(10, meanlog=1, sdlog=0.5))", [0.99540856824252999]);
  await numsApprox("print(qlnorm(0.95, meanlog=1, sdlog=0.5))", [6.18685458819545]);
  await outIs("print(qlnorm(0.5, sdlog=0))", ["c(1)"]);
  await outIs("print(qlnorm(0, sdlog=0))", ["c(0)"]);
  await outIs("print(qlnorm(1, sdlog=0))", ["c(Inf)"]);
  await numsApprox("print(dweibull(1, 2))", [0.73575888234288467]);
  await outIs("print(dweibull(0, 0.5))", ["c(Inf)"]);
  await outIs("print(dweibull(0, 2))", ["c(0)"]);
  await numsApprox("print(dweibull(0, 1))", [1]);
  await numsApprox("print(dweibull(2, 1.5, scale=3))", [0.23687782228285617]);
  await numsApprox("print(pweibull(3, 1.5, scale=3))", [0.63212055882855767]);
  await numsApprox("print(qweibull(0.99, 1.5, scale=3))", [8.3039560950675728]);
});

// ---- ベータ（退化形の質量規則は実測どおり）
test("sdist beta central and degenerate", async () => {
  await numsApprox("print(dbeta(0.5, 2, 3))", [1.5000000000000004]);
  await outIs("print(pbeta(0.5, 2, 3))", ["c(0.6875)"]);
  await numsApprox("print(qbeta(0.95, 5, 2))", [0.93715010829164558]);
  await numsApprox("print(qbeta(0.999, 100, 2))", [0.99954833498483819], 1e-9);
  await outIs("print(dbeta(0, 0.5, 2))", ["c(Inf)"]);
  await outIs("print(dbeta(0, 1, 2))", ["c(2)"]);
  // 退化形：a=0 は 0 へ、b=0 は 1 へ、a=b=0 は両端へ、Inf 形は実測規則
  await outIs("print(dbeta(0.5, 0, 2))", ["c(0)"]);
  await outIs("print(dbeta(0, 0, 2))", ["c(Inf)"]);
  await outIs("print(pbeta(0, 0, 2))", ["c(1)"]);
  await outIs("print(pbeta(0.5, 0, 0))", ["c(0.5)"]);
  await outIs("print(pbeta(0, 0, 0))", ["c(0.5)"]);
  await outIs("print(dbeta(0, 0, 0))", ["c(Inf)"]);
  await outIs("print(qbeta(0.5, 0, 2))", ["c(0)"]);
  await outIs("print(qbeta(0.5, 2, 0))", ["c(1)"]);
  await outIs("print(qbeta(0.5, 0, 0))", ["c(0.5)"]);
  await outIs("print(qbeta(0.75, 0, 0))", ["c(1)"]);
  await outIs("print(qbeta(1, 0, 2))", ["c(1)"]);
  await outIs("print(dbeta(0.5, Inf, Inf))", ["c(Inf)"]);
  await outIs("print(pbeta(0.5, Inf, Inf))", ["c(1)"]);
  await outIs("print(pbeta(0.4, Inf, Inf))", ["c(0)"]);
  await outIs("print(qbeta(0.5, Inf, Inf))", ["c(0.5)"]);
  await outIs("print(dbeta(0.5, Inf, 2))", ["c(0)"]);
  await outIs("print(dbeta(0.5, 2, Inf))", ["c(0)"]);
});

test("sdist beta noncentral (Poisson mixture)", async () => {
  await numsApprox("print(dbeta(0.5, 2, 3, ncp=5))", [1.606273475365577], 1e-9);
  await numsApprox("print(pbeta(0.5, 2, 3, ncp=5))", [0.32287747589563853], 1e-9);
  await numsApprox("print(qbeta(0.5, 2, 3, ncp=5))", [0.59968101778605409], 1e-9);
});

// ---- ガンマ／カイ二乗
test("sdist gamma and chisq", async () => {
  await numsApprox("print(dgamma(1, 2))", [0.36787944117144233]);
  await outIs("print(dgamma(0, 0.5))", ["c(Inf)"]);
  await outIs("print(dgamma(0, 1))", ["c(1)"]);
  await outIs("print(dgamma(0, 2))", ["c(0)"]);
  await outIs("print(dgamma(0, 0))", ["c(Inf)"]);
  await numsApprox("print(dgamma(5, 2, scale=3))", [0.10493089046531216]);
  await outIs("print(dgamma(1, 2, rate=0))", ["c(0)"]);
  await numsApprox("print(pgamma(1, 2))", [0.26424111765711528]);
  await outIs("print(pgamma(0, 0))", ["c(0)"]);
  await outIs("print(pgamma(1, 0))", ["c(1)"]);
  await outIs("print(pgamma(Inf, 2, rate=0))", ["c(NaN)"]);
  await numsApprox("print(qgamma(0.5, 2))", [1.678346990016661]);
  await numsApprox("print(qgamma(0.95, 2, scale=3))", [14.231593555171731]);
  await numsApprox("print(qgamma(0.999, 100))", [133.77026391137861], 1e-9);
  await outIs("print(qgamma(0.5, 0))", ["c(0)"]);
  await outIs("print(qgamma(1, 0))", ["c(Inf)"]);
  // rate と scale の両指定：一致すれば警告、不一致はエラー（実 R ソースの規則）
  await numsApprox("print(dgamma(1, 2, rate=2, scale=0.5))", [0.54134113294645081]);
  await warnHas("print(dgamma(1, 2, rate=2, scale=0.5))", /specify 'rate' or 'scale' but not both/);
  await errMatch("print(dgamma(1, 2, rate=2, scale=0.4))", /specify 'rate' or 'scale' but not both/);
  // カイ二乗
  await numsApprox("print(dchisq(1, 3))", [0.24197072451914337]);
  await outIs("print(dchisq(0, 0))", ["c(Inf)"]);
  await outIs("print(pchisq(0, 0))", ["c(0)"]);
  await outIs("print(pchisq(0, 0, lower.tail=FALSE))", ["c(1)"]);
  await outIs("print(pchisq(1, 0))", ["c(1)"]);
  await numsApprox("print(qchisq(0.95, 3))", [7.8147279032511792]);
  await outIs("print(qchisq(0.5, 0))", ["c(0)"]);
  await outIs("print(qchisq(1, 0))", ["c(Inf)"]);
});

test("sdist chisq noncentral", async () => {
  await numsApprox("print(dchisq(1, 3, ncp=2))", [0.12180056753215079], 1e-9);
  await outIs("print(dchisq(0, 0, ncp=2))", ["c(Inf)"]);
  await numsApprox("print(dchisq(0, 2, ncp=2))", [0.18393972058572117], 1e-9);
  await numsApprox("print(pchisq(1, 3, ncp=2))", [0.08787311180734543], 1e-9);
  await numsApprox("print(pchisq(0, 0, ncp=2))", [0.36787944117144233], 1e-9);
  await numsApprox("print(qchisq(0.95, 3, ncp=2))", [12.283753723128118], 1e-9);
});

// ---- F／t
test("sdist F central and Inf df limits", async () => {
  await numsApprox("print(df(1, 5, 10))", [0.49547978348663857]);
  await outIs("print(df(0, 2, 10))", ["c(1)"]);
  await outIs("print(df(0, 5, 10))", ["c(0)"]);
  await numsApprox("print(df(1, Inf, 10))", [0.87733684883925367]);
  await numsApprox("print(df(1, 5, Inf))", [0.61020760674693697]);
  await outIs("print(df(1, Inf, Inf))", ["c(Inf)"]);
  await outIs("print(df(0.5, Inf, Inf))", ["c(0)"]);
  await numsApprox("print(pf(1, 5, 10))", [0.53488057346219964]);
  await numsApprox("print(pf(1, Inf, 10))", [0.44049328506521246]);
  await numsApprox("print(pf(1, 5, Inf))", [0.58411981300449201]);
  await outIs("print(pf(1, Inf, Inf))", ["c(0.5)"]);
  await outIs("print(pf(0.5, Inf, Inf))", ["c(0)"]);
  await outIs("print(pf(2, Inf, Inf))", ["c(1)"]);
  await numsApprox("print(qf(0.95, 5, 10))", [3.3258345304130108]);
  await numsApprox("print(qf(0.5, 5, Inf))", [0.87029203821910528]);
  await outIs("print(qf(0.5, Inf, Inf))", ["c(1)"]);
  await outIs("print(qf(1, Inf, Inf))", ["c(Inf)"]);
});

test("sdist F noncentral", async () => {
  await numsApprox("print(df(1, 5, 10, ncp=2))", [0.45874896901293866], 1e-9);
  await numsApprox("print(pf(1, 5, 10, ncp=2))", [0.36394974310257933], 1e-9);
  // 実 R 値は R 自身の誤差を含む（SciPy 検証値と一致するのは本実装側）
  await numsApprox("print(qf(0.95, 5, 10, ncp=2))", [4.5856562841396107], 1e-8);
});

test("sdist t central and noncentral", async () => {
  await numsApprox("print(dt(0, 5))", [0.37960668982249446]);
  await numsApprox("print(dt(0, 1))", [0.31830988618379069]);
  await numsApprox("print(pt(1, 5))", [0.81839126617543867]);
  await numsApprox("print(pt(-2, 10))", [0.036694017385370196]);
  await outIs("print(pt(0, 5))", ["c(0.5)"]);
  await numsApprox("print(qt(0.975, 5))", [2.5705818356363137]);
  await numsApprox("print(qt(0.025, 5))", [-2.5705818356363137]);
  // 非心 t（級数は SciPy と全桁一致。R 値とは R の打切り誤差の範囲で一致）
  await numsApprox("print(dt(1, 5, ncp=2))", [0.23977928799730208], 1e-9);
  await numsApprox("print(dt(0, 5, ncp=2))", [0.051374178885640269], 1e-9);
  await numsApprox("print(dt(-1, 5, ncp=2))", [0.0050696803839417343], 1e-9);
  await numsApprox("print(pt(1, 5, ncp=2))", [0.15813564355679147], 1e-9);
  await numsApprox("print(pt(-1, 5, ncp=2))", [0.0023163756541634273], 1e-9);
  await numsApprox("print(pt(0, 5, ncp=2))", [0.022750131948179195], 1e-9);
  await numsApprox("print(pt(3, 10, ncp=10))", [5.7225307011620377e-09], 1e-9);
  await numsApprox("print(dt(12, 10, ncp=10))", [0.10490984386333298], 1e-9);
  await numsApprox("print(pt(-3, 20, ncp=-1))", [0.037535357750911436], 1e-9);
  await numsApprox("print(qt(0.975, 5, ncp=2))", [6.2920311427253068], 1e-9);
  await numsApprox("print(qt(0.05, 20, ncp=-1))", [-2.8320514994969557], 1e-9);
});

// ---- 離散分布
test("sdist binomial poisson geometric", async () => {
  await numsApprox("print(dbinom(3, 10, 0.5))", [0.1171875], 1e-9);
  await numsApprox("print(dbinom(1000, 2000, 0.31))", [3.3277192295737778e-70], 1e-9);
  await numsApprox("print(dbinom(5000, 10000, 0.5))", [0.0079786461393821489], 1e-9);
  await outIs("print(dbinom(0, 10, 0))", ["c(1)"]);
  await outIs("print(dbinom(10, 10, 1))", ["c(1)"]);
  await outIs("print(dbinom(2.5, 10, 0.5))", ["c(0)"]);
  await warnHas("print(dbinom(2.5, 10, 0.5))", /non-integer x = 2\.500000/);
  await outIs("print(dbinom(2, 10.5, 0.5))", ["c(NaN)"]);
  await numsApprox("print(pbinom(3, 10, 0.5))", [0.171875]);
  await outIs("print(pbinom(2, 10.5, 0.5))", ["c(NaN)"]);
  await warnHas("print(pbinom(2, 10.5, 0.5))", /non-integer n = 10\.500000/);
  await outIs("print(qbinom(0.3, 10, 0.5))", ["c(4)"]);
  // q の size は rint 強制（実測：10.5→10、10.9→11 の答え）
  await outIs("print(qbinom(0.3, 10.5, 0.5))", ["c(4)"]);
  await outIs("print(qbinom(0.3, 10.9, 0.5))", ["c(5)"]);
  await outIs("print(qbinom(1, 10, 0.5))", ["c(10)"]);
  await outIs("print(qbinom(0.05, 10, 0.5, lower.tail=FALSE))", ["c(8)"]);
  await outIs("print(qbinom(0.5, 10, 0))", ["c(0)"]);
  await outIs("print(qbinom(0.5, 10, 1))", ["c(10)"]);
  await numsApprox("print(dpois(3, 2))", [0.18044704431548356]);
  await numsApprox("print(dpois(1000, 1000))", [0.012614611348721503], 1e-9);
  await outIs("print(dpois(0, 0))", ["c(1)"]);
  await outIs("print(dpois(2.5, 2))", ["c(0)"]);
  await warnHas("print(dpois(2.5, 2))", /non-integer x = 2\.500000/);
  await numsApprox("print(ppois(3, 2))", [0.85712346049854708]);
  await outIs("print(ppois(0, 0))", ["c(1)"]);
  await outIs("print(ppois(5, Inf))", ["c(0)"]);
  await outIs("print(qpois(0.5, 2))", ["c(2)"]);
  await outIs("print(qpois(1, 2))", ["c(Inf)"]);
  await outIs("print(qpois(0.05, 2, lower.tail=FALSE))", ["c(5)"]);
  await outIs("print(qpois(0, 2, lower.tail=FALSE))", ["c(Inf)"]);
  await outIs("print(qpois(1, 2, lower.tail=FALSE))", ["c(0)"]);
  await outIs("print(qpois(0.5, Inf))", ["c(NaN)"]);
  await numsApprox("print(dgeom(3, 0.25))", [0.10546875]);
  await outIs("print(dgeom(0, 1))", ["c(1)"]);
  await outIs("print(dgeom(3, 1))", ["c(0)"]);
  await numsApprox("print(pgeom(3, 0.25))", [0.68359375]);
  await outIs("print(qgeom(0.5, 0.25))", ["c(2)"]);
  await outIs("print(qgeom(1, 0.25))", ["c(Inf)"]);
  await outIs("print(qgeom(0.05, 0.25, lower.tail=FALSE))", ["c(10)"]);
  await outIs("print(qgeom(0.5, 1))", ["c(0)"]);
});

test("sdist nbinom and hypergeometric", async () => {
  await numsApprox("print(dnbinom(3, 5, 0.4))", [0.077414399999999953]);
  await outIs("print(dnbinom(0, 0, 0.4))", ["c(1)"]);
  await outIs("print(dnbinom(3, 0, 0.4))", ["c(0)"]);
  await outIs("print(dnbinom(0, 5, mu=0))", ["c(1)"]);
  await numsApprox("print(dnbinom(3, 5, mu=7.5))", [0.077414399999999953], 1e-9);
  await numsApprox("print(pnbinom(3, 5, 0.4))", [0.1736704]);
  await numsApprox("print(pnbinom(10, 5, mu=7.5))", [0.7827222943498241], 1e-9);
  await outIs("print(qnbinom(0.5, 5, 0.4))", ["c(7)"]);
  await outIs("print(qnbinom(1, 5, 0.4))", ["c(Inf)"]);
  await outIs("print(qnbinom(0.5, 5, mu=7.5))", ["c(7)"]);
  await errMatch("print(dnbinom(3, size=5, prob=0.4, mu=7.5))", /'prob' and 'mu' both specified/);
  await errMatch("print(dnbinom(3, size=5))", /argument "prob" is missing, with no default/);
  await numsApprox("print(dhyper(3, 10, 7, 8))", [0.10366104483751548]);
  await outIs("print(dhyper(3, 10.5, 7, 8))", ["c(NaN)"]);
  await numsApprox("print(phyper(3, 10, 7, 8))", [0.11703002879473474]);
  // p/q は rint 強制（実測：n=7.3→7、7.5→8 の値）
  await numsApprox("print(phyper(3, 10, 7.3, 8))", [0.11703002879473474], 1e-9);
  await numsApprox("print(phyper(3, 10, 7.5, 8))", [0.1842177430412725], 1e-9);
  await outIs("print(qhyper(0.5, 10, 7, 8))", ["c(5)"]);
  await outIs("print(qhyper(0, 10, 7, 8))", ["c(1)"]);
  await outIs("print(qhyper(1, 10, 7, 8))", ["c(8)"]);
});

// ---- SignRank／Wilcoxon（DP の正確値と丸め規則）
test("sdist signrank and wilcox", async () => {
  await numsApprox("print(dsignrank(7, 5))", [0.09375], 1e-9);
  await outIs("print(dsignrank(0, 5))", ["c(0.03125)"]);
  await outIs("print(dsignrank(15, 5))", ["c(0.03125)"]);
  await numsApprox("print(dsignrank(7, 5.5))", [0.0625], 1e-9);
  await outIs("print(dsignrank(7.5, 5))", ["c(0)"]);
  await outIs("print(psignrank(7, 5))", ["c(0.5)"]);
  // psignrank は floor(q + 0.5)（実測）
  await outIs("print(psignrank(7.4, 5))", ["c(0.5)"]);
  await outIs("print(psignrank(7.5, 5))", ["c(0.59375)"]);
  await outIs("print(psignrank(7.8, 5))", ["c(0.59375)"]);
  await outIs("print(qsignrank(0.5, 5))", ["c(7)"]);
  await outIs("print(qsignrank(1, 5))", ["c(15)"]);
  await outIs("print(qsignrank(0.05, 5, lower.tail=FALSE))", ["c(14)"]);
  await numsApprox("print(psignrank(2500, 100))", [0.46658314624224762], 1e-9);
  await numsApprox("print(dwilcox(12, 4, 6))", [0.085714285714285714], 1e-9);
  await numsApprox("print(pwilcox(12, 4, 6))", [0.54285714285714282], 1e-9);
  // pwilcox は通常の floor（実測）
  await numsApprox("print(pwilcox(12.99, 4, 6))", [0.54285714285714282], 1e-9);
  await numsApprox("print(pwilcox(12, 4.9, 6))", [0.33116883116883117], 1e-9);
  await numsApprox("print(pwilcox(1250, 50, 50))", [0.50136889550076946], 1e-9);
  await outIs("print(qwilcox(0.5, 4, 6))", ["c(12)"]);
  await outIs("print(qwilcox(1, 4, 6))", ["c(24)"]);
  await outIs("print(dwilcox(0, 0, 6))", ["c(NaN)"]);
  await outIs("print(dsignrank(0, 0))", ["c(NaN)"]);
  // 規模上限の名指し停止
  await errMatch("print(dsignrank(7, 401))", /dsignrank 系は n が 400 以下/);
  await errMatch("print(pwilcox(1, 200, 200))", /dwilcox 系は m, n が大きすぎる/);
});

// ---- 多項分布／誕生日
test("sdist multinom and birthday", async () => {
  await outIs("print(dmultinom(c(2, 3, 4), prob=c(0.2, 0.3, 0.5)))", [
    "0.08504999999999983",
  ]);
  await numsApprox(
    "print(dmultinom(c(2, 3, 4), prob=c(0.2, 0.3, 0.5), log=TRUE))",
    [-2.4645159601402682],
  );
  // x は as.integer(x + 0.5) で丸め（実測：c(2.4,3,4) と c(-1,3,4) の扱い）
  await numsApprox("print(dmultinom(c(2.4, 3, 4), prob=c(0.2, 0.3, 0.5)))", [0.085049999999999834], 1e-9);
  await numsApprox("print(dmultinom(c(-1, 3, 4), prob=c(0.2, 0.3, 0.5)))", [0.0590625], 1e-9);
  await outIs("print(dmultinom(c(1, 3, 4), prob=c(0, 0.4, 0.6)))", ["0"]);
  await errMatch("print(dmultinom(c(2, 3), prob=c(0.2, 0.3, 0.5)))", /x\[\] and prob\[\] must be equal length vectors\./);
  await errMatch("print(dmultinom(c(2, 3, 4), prob=c(0.2, -0.1, 0.5)))", /probabilities must be finite, non-negative and not all 0/);
  await errMatch("print(dmultinom(c(2, 3, 4), prob=c(0.2, NA, 0.5)))", /probabilities must be finite, non-negative and not all 0/);
  await errMatch("print(dmultinom(c(2, 3, 4), size=10, prob=c(0.2, 0.3, 0.5)))", /size != sum\(x\), i\.e\. one is wrong/);
  await errMatch("print(dmultinom(c(NA, 3, 4), prob=c(0.2, 0.3, 0.5)))", /missing value where TRUE\/FALSE needed/);
  await numsApprox("print(pbirthday(23))", [0.50729723432398544]);
  await numsApprox("print(pbirthday(23, coincident=3))", [0.014415406155024258], 1e-9);
  await numsApprox("print(pbirthday(1000, coincident=100))", [1.5314339531681993e-113], 1e-9);
  await outIs("print(qbirthday())", ["23"]);
  await outIs("print(qbirthday(coincident=4))", ["187"]);
  await outIs("print(qbirthday(coincident=10))", ["1179"]);
  await errMatch("print(pbirthday(c(10, 23)))", /invalid 'times' argument/);
  await errMatch("print(qbirthday(prob=c(0.5, 0.9)))", /the condition has length > 1/);
  await warnHas("print(pbirthday(23, classes=c(365, 100)))", /only the first used/);
  // coincident < 2 は実 R が無限ループになるため 1 を返す（逸脱を明記）
  await outIs("print(qbirthday(prob=0.5, coincident=1))", ["1"]);
});

// ---- r 系：検証してから freshUnknown
test("sdist random generators return runtime values", async () => {
  for (const code of [
    "print(rbeta(3, 2, 5))",
    "print(rbinom(3, 10, 0.5))",
    "print(rcauchy(3))",
    "print(rchisq(3, 5))",
    "print(rexp(3))",
    "print(rf(3, 5, 10))",
    "print(rgamma(3, 2))",
    "print(rgeom(3, 0.25))",
    "print(rhyper(3, 10, 7, 8))",
    "print(rlnorm(3))",
    "print(rlogis(3))",
    "print(rmultinom(3, 10, c(0.2, 0.3, 0.5)))",
    "print(rnbinom(3, 5, 0.4))",
    "print(rpois(3, 2))",
    "print(rsignrank(3, 10))",
    "print(rsmirnov(3, c(10, 12)))",
    "print(rt(3, 5))",
    "print(rweibull(3, 2))",
    "print(rwilcox(3, 4, 6))",
    "print(rWishart(2, 5, c(1, 0, 0, 1)))",
    "print(r2dtable(2, c(5, 5), c(3, 7)))",
    "print(rbeta(2.5, 2, 5))",
    "print(rchisq(2, 0))",
  ]) {
    await outIs(code, ["（実行時に決まる値）"]);
  }
});

test("sdist random generator validation errors and warnings", async () => {
  await errMatch("print(rbeta(-1, 2, 5))", /invalid arguments/);
  await errMatch("print(rbeta(NA, 2, 5))", /invalid arguments/);
  await errMatch("print(rpois(-2, 1))", /invalid arguments/);
  await errMatch("print(rgamma(2, 2, rate=2, scale=0.4))", /specify 'rate' or 'scale' but not both/);
  await errMatch("print(rnbinom(2, size=5))", /argument "prob" is missing, with no default/);
  await errMatch("print(rmultinom(-1, 10, c(0.5, 0.5)))", /invalid first argument 'n'/);
  await errMatch("print(rmultinom(2, -1, c(0.5, 0.5)))", /invalid second argument 'size'/);
  await errMatch("print(rmultinom(2, 10, c(0, 0)))", /no positive probabilities/);
  await errMatch("print(r2dtable(-1, c(5, 5), c(5, 5)))", /invalid argument 'n'/);
  await errMatch("print(r2dtable(2, c(5, -1), c(3, 2)))", /invalid argument 'r'/);
  await errMatch("print(r2dtable(2, c(5, 5), c(4, 5)))", /arguments 'r' and 'c' must have the same sums/);
  await errMatch("print(rsmirnov(3, c(4)))", /argument 'sizes' must be a vector of length 2/);
  await errMatch("print(rWishart(2, -1, c(1, 0, 0, 1)))", /inconsistent degrees of freedom and dimension/);
  // 無効パラメータは NA 生成の警告（実 R の "NAs produced"）
  await warnHas("print(rpois(2, -1))", /NAが生成されました（NAs produced）/);
  await warnHas("print(rt(2, 0))", /NAが生成されました（NAs produced）/);
  await warnHas("print(rchisq(2, -1))", /NAが生成されました（NAs produced）/);
  await warnHas("print(rf(2, 0, 5))", /NAが生成されました（NAs produced）/);
});

// ---- 異常系：余分な引数・欠落・範囲外の p・未対応の名指し停止
test("sdist argument errors and unsupported stops", async () => {
  await errMatch("print(dnorm(0, foo=1))", /unused argument \(foo = 1\)/);
  await errMatch("print(dnorm())", /argument "x" is missing, with no default/);
  await errMatch("print(dbeta(0.5, 2))", /argument "shape2" is missing, with no default/);
  await outIs("print(qnorm(2))", ["c(NaN)"]);
  await warnHas("print(qnorm(2))", /NaNが生成されました（NaNs produced）/);
  await outIs("print(qnorm(-0.1))", ["c(NaN)"]);
  await outIs("print(dunif(0.5, min=3, max=1))", ["c(NaN)"]);
  await outIs("print(dweibull(1, -1))", ["c(NaN)"]);
  // 部分一致（実 R どおり）
  await numsApprox("print(pnorm(1, mea=2))", [0.15865525393145705]);
  await numsApprox("print(dnorm(0, lo=TRUE))", [-0.91893853320467278]);
  // 未対応4関数は名指し停止（理由はリファレンス項目と報告書に明記）
  await errMatch("print(ptukey(3, 5, 10))", /このR関数は説明に対応していません：ptukey/);
  await errMatch("print(qtukey(0.95, 5, 10))", /このR関数は説明に対応していません：qtukey/);
  await errMatch("print(psmirnov(0.3, c(10, 12)))", /このR関数は説明に対応していません：psmirnov/);
  await errMatch("print(qsmirnov(0.95, c(10, 12)))", /このR関数は説明に対応していません：qsmirnov/);
});
