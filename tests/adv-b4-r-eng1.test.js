import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 高度モード B4・R実装班1（数値・数学・集計）。
// 期待値は公式ヘルプ（stat.ethz.ch R-manual）の Examples と実 R 4.3.3 の
// 実測出力から導いた（報告書 docs/audit/ADV-B4-r-eng1.md に根拠を記録）。
// gamma 系など近似計算を含むものは、実 R の %.17g 値との許容誤差で照合する。

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
// "c(1.23, NA)" や "2.5" の数値列を取り出して許容誤差で比べる。
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

// ---- MathFun／Trig／Hyperbolic／Log ----
test("eng1 elementary math functions", async () => {
  await outIs("print(abs(c(-2, 3, NA)))", ["c(2, 3, NA)"]);
  await outIs("print(sqrt(c(4, 9)))", ["c(2, 3)"]);
  await outIs("print(sin(0))", ["c(0)"]);
  await outIs("print(cos(0))", ["c(1)"]);
  await outIs("print(tan(0))", ["c(0)"]);
  await outIs("print(asin(1))", ["c(1.5707963267948966)"]);
  await outIs("print(acos(1))", ["c(0)"]);
  await outIs("print(atan(1))", ["c(0.7853981633974483)"]);
  await outIs("print(exp(c(0, 1)))", ["c(1, 2.718281828459045)"]);
  await outIs("print(expm1(0))", ["c(0)"]);
  await outIs("print(log1p(0))", ["c(0)"]);
  await outIs("print(log(c(8, 32), base = 2))", ["c(3, 5)"]);
  await outIs("print(logb(8, base = 2))", ["c(3)"]);
  await outIs("print(log10(1000))", ["c(3)"]);
  await outIs("print(log2(8))", ["c(3)"]);
  await outIs("print(log(0))", ["c(-Inf)"]);
  await outIs("print(sinh(0))", ["c(0)"]);
  await outIs("print(cosh(0))", ["c(1)"]);
  await outIs("print(tanh(0))", ["c(0)"]);
  await numsApprox("print(asinh(1))", [0.881373587019543]);
  await outIs("print(atan2(1, 0))", ["c(1.5707963267948966)"]);
  await outIs("print(atan2(0, 0))", ["c(0)"]);
  await outIs("print(sinpi(0.5))", ["c(1)"]);
  await outIs("print(cospi(1))", ["c(-1)"]);
  await outIs("print(sinpi(1))", ["c(0)"]);
  await outIs("print(tanpi(0.25))", ["c(0.9999999999999999)"]);
});
test("eng1 math domain warnings and errors", async () => {
  await outIs("print(sqrt(-1))", ["c(NaN)"]);
  await warnHas("print(sqrt(-1))", /NaNs produced/);
  await outIs("print(log(-1))", ["c(NaN)"]);
  await warnHas("print(log(-1))", /NaNs produced/);
  await outIs("print(acosh(0))", ["c(NaN)"]);
  await outIs("print(atanh(1))", ["c(Inf)"]);
  await outIs("print(sqrt(NA))", ["c(NA)"]);
  await outIs("print(exp(NA))", ["c(NA)"]);
  await errMatch("print(abs('a'))", /non-numeric argument to mathematical function/);
  await errMatch("print(sqrt('a'))", /non-numeric argument to mathematical function/);
  await errMatch("print(log10(8, 2))", /unused argument/);
  await errMatch("print(abs())", /argument "x" is missing/);
});
test("eng1 atan2 recycling with warning", async () => {
  const p = await first("print(atan2(c(1, 2, 3), c(1, 2)))");
  assert.deepEqual(outputs(p), [
    "c(0.7853981633974483, 0.7853981633974483, 1.2490457723982544)",
  ]);
  assert.ok(p.trace.some((t) => t.kind === "warning"));
});

// ---- gamma／Special ----
test("eng1 gamma family", async () => {
  await outIs("print(gamma(5))", ["c(24)"]);
  await outIs("print(gamma(10))", ["c(362880)"]);
  await outIs("print(gamma(0.5))", ["c(1.7724538509055159)"]);
  await outIs("print(gamma(-0.5))", ["c(-3.5449077018110318)"]);
  await numsApprox("print(gamma(3.7))", [4.170651783796604], 1e-13);
  await outIs("print(gamma(-1))", ["c(NaN)"]);
  await warnHas("print(gamma(-1))", /NaNs produced/);
  await outIs("print(gamma(172))", ["c(Inf)"]);
  await outIs("print(lgamma(5))", ["c(3.1780538303479458)"]);
  await outIs("print(lgamma(-1))", ["c(Inf)"]);
  await outIs("print(factorial(0))", ["c(1)"]);
  await outIs("print(factorial(20))", ["c(2432902008176640000)"]);
  await outIs("print(factorial(171))", ["c(Inf)"]);
  await outIs("print(factorial(-1))", ["c(NaN)"]);
  await numsApprox("print(lfactorial(20))", [42.3356164607535], 1e-12);
});
test("eng1 beta and choose", async () => {
  await outIs("print(beta(2, 3))", ["c(0.08333333333333333)"]);
  await outIs("print(lbeta(2, 3))", ["c(-2.4849066497880004)"]);
  await outIs("print(beta(0, 1))", ["c(Inf)"]);
  await outIs("print(beta(-1, 2))", ["c(NaN)"]);
  await outIs("print(choose(5, 2))", ["c(10)"]);
  await outIs("print(choose(50, 25))", ["c(126410606437752)"]);
  await outIs("print(choose(5, -1))", ["c(0)"]);
  await outIs("print(choose(5, 7))", ["c(0)"]);
  await outIs("print(choose(5.5, 2))", ["c(12.375)"]);
  await outIs("print(choose(-2, 2))", ["c(3)"]);
  await outIs("print(choose(-1, 1))", ["c(-1)"]);
  await numsApprox("print(choose(2.5, 3))", [0.3125], 1e-12);
  await outIs("print(lchoose(5, -1))", ["c(-Inf)"]);
  await outIs("print(lchoose(5, 7))", ["c(-Inf)"]);
  await outIs("print(choose(5, 2.5))", ["c(10)"]);
  await warnHas("print(choose(5, 2.5))", /must be integer/);
});

// ---- Round ----
test("eng1 round follows IEC 60559 via fround algorithm", async () => {
  // 公式ヘルプ Round の Examples と実 R 4.3.3 実測。
  await outIs("print(round(.5 + -2:4))", ["c(-2, 0, 0, 2, 2, 4, 4)"]);
  await outIs("print(round(0.5))", ["c(0)"]);
  await outIs("print(round(1.5))", ["c(2)"]);
  await outIs("print(round(2.5))", ["c(2)"]);
  await outIs("print(round(-1.5))", ["c(-2)"]);
  await outIs("print(round(0.15, 1))", ["c(0.1)"]);
  await outIs("print(round(2.675, 2))", ["c(2.67)"]);
  await outIs("print(round(0.05, 1))", ["c(0)"]);
  await outIs("print(round(0.45, 1))", ["c(0.4)"]);
  await outIs("print(round(0.55, 1))", ["c(0.6)"]);
  await outIs("print(round(0.65, 1))", ["c(0.7)"]);
  await outIs("print(round(0.125, 2))", ["c(0.12)"]);
  await outIs("print(round(0.375, 2))", ["c(0.38)"]);
  await outIs("print(round(1.005, 2))", ["c(1)"]);
  await outIs("print(round(123.456, -1))", ["c(120)"]);
  await outIs("print(round(125, -1))", ["c(120)"]);
  await outIs("print(round(135, -1))", ["c(140)"]);
  await outIs("print(round(1234567.89, -2))", ["c(1234600)"]);
  await outIs("print(round(c(1.234, 5.678), c(1, 2)))", ["c(1.2, 5.68)"]);
  await outIs("print(round(1.5, NA))", ["c(NA)"]);
  await outIs("print(round(NA, 1))", ["c(NA)"]);
  await outIs(
    "print(round(3.14159265358979 * 100^c(-1, 0, 1, 2, 3), 3))",
    ["c(0.031, 3.142, 314.159, 31415.927, 3141592.654)"],
  );
});
test("eng1 signif and trunc family", async () => {
  await outIs("print(signif(0.15, 1))", ["c(0.2)"]);
  await outIs("print(signif(0.25, 1))", ["c(0.2)"]);
  await outIs("print(signif(0.35, 1))", ["c(0.4)"]);
  await outIs("print(signif(2.675, 3))", ["c(2.68)"]);
  await outIs("print(signif(1.005, 3))", ["c(1)"]);
  await outIs("print(signif(123.456, 3))", ["c(123)"]);
  await outIs("print(signif(123.456, 0))", ["c(100)"]);
  await outIs("print(signif(0.000123456, 3))", ["c(0.000123)"]);
  await outIs("print(signif(99999, 3))", ["c(100000)"]);
  await outIs(
    "print(signif(3.14159265358979 * 100^c(-1, 0, 1, 2, 3), 3))",
    ["c(0.0314, 3.14, 314, 31400, 3140000)"],
  );
  await outIs("print(trunc(c(-1.5, 1.5)))", ["c(-1, 1)"]);
  await outIs("print(trunc(1.5, 2))", ["c(1)"]);
  await outIs("print(ceiling(c(-1.5, 1.5)))", ["c(-1, 2)"]);
  await outIs("print(floor(c(-1.5, 1.5)))", ["c(-2, 1)"]);
  await errMatch("print(floor(1.5, 2))", /2 arguments passed to 'floor' which requires 1/);
  await errMatch("print(ceiling(1.5, 2))", /2 arguments passed to 'ceiling' which requires 1/);
  await errMatch("print(round('a'))", /non-numeric argument to mathematical function/);
});

// ---- Summary／Extremes ----
test("eng1 prod and cumulative", async () => {
  await outIs("print(prod(c(2, 3, 4)))", ["24"]);
  await outIs("print(prod(c()))", ["1"]);
  await outIs("print(prod(c(2, NA)))", ["NA"]);
  await outIs("print(prod(c(2, NaN)))", ["NaN"]);
  await outIs("print(prod(c(2, NA), na.rm = TRUE))", ["2"]);
  await outIs("print(prod(c(1e308, 10)))", ["Inf"]);
  await errMatch("print(prod('a'))", /invalid 'type' \(character\) of argument/);
  await outIs("print(cumsum(c(1, 2, 3)))", ["c(1, 3, 6)"]);
  await outIs("print(cumsum(c(1, NA, 3)))", ["c(1, NA, NA)"]);
  await outIs("print(cumsum(c(1, NaN, 3)))", ["c(1, NaN, NaN)"]);
  await outIs("print(cumsum(c('1', '2')))", ["c(1, 3)"]);
  await outIs("print(cumprod(c(2, 3, 4)))", ["c(2, 6, 24)"]);
  await outIs("print(cumprod(c(2, NA, 3)))", ["c(2, NA, NA)"]);
  await outIs("print(cummax(c(1, 3, 2)))", ["c(1, 3, 3)"]);
  await outIs("print(cummax(c(1, NA, 3)))", ["c(1, NA, NA)"]);
  await outIs("print(cummin(c(3, 1, 2)))", ["c(3, 1, 1)"]);
});
test("eng1 diff and range", async () => {
  await outIs("print(diff(c(1, 4, 9, 16)))", ["c(3, 5, 7)"]);
  await outIs("print(diff(c(1, 4, 9, 16), lag = 2))", ["c(8, 12)"]);
  await outIs("print(diff(c(1, 4, 9, 16), differences = 2))", ["c(2, 2)"]);
  await outIs("print(diff(c(1, NA, 4)))", ["c(NA, NA)"]);
  await errMatch("print(diff(c('a', 'b')))", /non-numeric argument to binary operator/);
  await outIs("print(range(c(3, 1, 2)))", ["c(1, 3)"]);
  await outIs("print(range(c(1, NA)))", ["c(NA, NA)"]);
  await outIs("print(range(c(1, NaN)))", ["c(NaN, NaN)"]);
  await outIs("print(range(c(1, NaN), na.rm = TRUE))", ["c(1, 1)"]);
  await outIs("print(range(c(1, Inf), finite = TRUE))", ["c(1, 1)"]);
  await outIs("print(range(c()))", ["c(Inf, -Inf)"]);
  await outIs("print(range(c('b', 'a')))", ['c("a", "b")']);
});
test("eng1 min max pmax pmin", async () => {
  await outIs("print(min(c(3, 1, 2)))", ["1"]);
  await outIs("print(max(c(3, 1, 2)))", ["3"]);
  await outIs("print(min(c(1, NA)))", ["NA"]);
  await outIs("print(min(c(1, NaN)))", ["NaN"]);
  await outIs("print(min(c(NA, NaN)))", ["NA"]);
  await outIs("print(min(c(1, NaN), na.rm = TRUE))", ["1"]);
  await outIs("print(min(c()))", ["Inf"]);
  await warnHas("print(min(c()))", /no non-missing arguments to min/);
  await outIs("print(max(c()))", ["-Inf"]);
  await outIs("print(max(c(NA, NA), na.rm = TRUE))", ["-Inf"]);
  await outIs("print(min(c('b', 'a')))", ['"a"']);
  await outIs("print(min(c(TRUE, FALSE)))", ["0"]);
  await outIs("print(pmax(c(1, 5, 3), 2))", ["c(2, 5, 3)"]);
  await outIs("print(pmin(c(5, 4, 3, 2, 1), 3.5))", ["c(3.5, 3.5, 3, 2, 1)"]);
  await outIs("print(pmax(c(1, NA), 2))", ["c(2, NA)"]);
  await outIs("print(pmax(c(1, NA), 2, na.rm = TRUE))", ["c(2, 2)"]);
  await outIs("print(pmax(c(NA, NA), na.rm = TRUE))", ["c(NA, NA)"]);
  await outIs("print(pmax(c('a', 'c'), 'b'))", ['c("b", "c")']);
  await outIs("print(pmax(c(a = 1, b = 5), 2))", ["c(a = 2, b = 5)"]);
  await outIs("print(pmax.int(c(a = 1, b = 5), 2))", ["c(2, 5)"]);
  await outIs("print(pmin(c(), 1))", ["c()"]);
});

// ---- sort／order／rank／rev ----
test("eng1 sort family", async () => {
  await outIs("print(sort(c(3, 1, 2)))", ["c(1, 2, 3)"]);
  await outIs("print(sort(c(3, 1, 2), decreasing = TRUE))", ["c(3, 2, 1)"]);
  await outIs("print(sort(c(3, NA, 1)))", ["c(1, 3)"]);
  await outIs("print(sort(c(3, NA, 1), na.last = TRUE))", ["c(1, 3, NA)"]);
  await outIs("print(sort(c(3, NA, 1), na.last = FALSE))", ["c(NA, 1, 3)"]);
  await outIs("print(sort(c('b', 'a', 'c')))", ['c("a", "b", "c")']);
  await outIs("print(sort(c(TRUE, FALSE, TRUE)))", ["c(FALSE, TRUE, TRUE)"]);
  await outIs("print(sort(c(b = 3, a = 1, c = 2)))", ["c(a = 1, c = 2, b = 3)"]);
  await outIs("print(sort.int(c(3, 1, 2)))", ["c(1, 2, 3)"]);
  await errMatch(
    "print(sort.int(c(3, 1, 2), index.return = TRUE))",
    /index\.return/,
  );
  await errMatch("print(sort.int(c(3, 1, 2), partial = 2))", /partial/);
  await outIs("print(sort.list(c(3, 1, 2)))", ["c(2, 3, 1)"]);
  await outIs("print(sort.list(c(3, NA, 1)))", ["c(3, 1, 2)"]);
  await outIs("print(rev(c(1, 2, 3)))", ["c(3, 2, 1)"]);
  await outIs("print(rev(c(a = 1, b = 2)))", ["c(b = 2, a = 1)"]);
});
test("eng1 order and rank", async () => {
  await outIs("print(order(c(3, 1, 2)))", ["c(2, 3, 1)"]);
  await outIs("print(order(c(1, 1, 2), c(3, 2, 1)))", ["c(2, 1, 3)"]);
  await outIs(
    "print(order(c(1, 1, 2), c(3, 2, 1), decreasing = c(FALSE, TRUE)))",
    ["c(1, 2, 3)"],
  );
  await outIs("print(order(c(1, 3, 2), decreasing = TRUE))", ["c(2, 3, 1)"]);
  await outIs("print(order(c(3, NA, 1)))", ["c(3, 1, 2)"]);
  await outIs("print(order(c(3, NA, 1), na.last = FALSE))", ["c(2, 3, 1)"]);
  await outIs("print(order(c(3, NA, 1), na.last = NA))", ["c(3, 1)"]);
  await errMatch("print(order(c(2, 1, 3), 1))", /argument lengths differ/);
  await outIs("print(rank(c(3, 1, 4, 15, 92)))", ["c(2, 1, 3, 4, 5)"]);
  await outIs("print(rank(c(3, 1, 4, 1, 5)))", ["c(3, 1.5, 4, 1.5, 5)"]);
  await outIs("print(rank(c(3, NA, 1)))", ["c(2, 3, 1)"]);
  await outIs("print(rank(c(3, NA, 1), na.last = FALSE))", ["c(3, 1, 2)"]);
  await outIs("print(rank(c(3, NA, 1), na.last = 'keep'))", ["c(2, NA, 1)"]);
  await outIs("print(rank(c(3, NA, 1), na.last = NA))", ["c(2, 1)"]);
  await outIs(
    "print(rank(c(2, 2, 1), ties.method = 'first'))",
    ["c(2, 3, 1)"],
  );
  await outIs(
    "print(rank(c(2, 2, 1), ties.method = 'last'))",
    ["c(3, 2, 1)"],
  );
  await outIs("print(rank(c(2, 2, 1), ties.method = 'max'))", ["c(3, 3, 1)"]);
  await outIs("print(rank(c(2, 2, 1), ties.method = 'min'))", ["c(2, 2, 1)"]);
  await outIs("print(rank(c('b', 'a', 'b')))", ["c(2.5, 1, 2.5)"]);
  await errMatch(
    "print(rank(c(1, 1), ties.method = 'random'))",
    /ties\.method = "random"/,
  );
});

// ---- unique／duplicated ----
test("eng1 unique family", async () => {
  await outIs("print(unique(c(1, 2, 1, 3, 2)))", ["c(1, 2, 3)"]);
  await outIs(
    "print(unique(c(1, 2, 1, NA, NA, NaN, NaN)))",
    ["c(1, 2, NA, NaN)"],
  );
  await outIs("print(unique(c(a = 1, b = 2, c = 1)))", ["c(a = 1, b = 2)"]);
  await outIs(
    "print(unique(c(1, 1, 2, 2), incomparables = 2))",
    ["c(1, 2, 2)"],
  );
  await outIs(
    "print(duplicated(c(1, 2, 1, NA, NA)))",
    ["c(FALSE, FALSE, TRUE, FALSE, TRUE)"],
  );
  await outIs(
    "print(duplicated(c(1, 2, 1), fromLast = TRUE))",
    ["c(TRUE, FALSE, FALSE)"],
  );
  await outIs(
    "print(duplicated(c(1, 1, 2, 2), incomparables = 2))",
    ["c(FALSE, TRUE, FALSE, FALSE)"],
  );
  await outIs("print(anyDuplicated(c(1, 2, 1)))", ["3"]);
  await outIs("print(anyDuplicated(c(1, 2, 3)))", ["0"]);
  await outIs("print(anyDuplicated(c(1, 2, 1), fromLast = TRUE))", ["1"]);
});

// ---- which／match／findInterval ----
test("eng1 which family", async () => {
  await outIs("print(which(c(TRUE, FALSE, NA, TRUE)))", ["c(1, 4)"]);
  await outIs(
    "print(which(c(a = TRUE, b = FALSE, c = TRUE)))",
    ["c(a = 1, c = 3)"],
  );
  await outIs("print(which(c(FALSE, FALSE)))", ["c()"]);
  await errMatch("print(which(c(0, 1, 2)))", /argument to 'which' is not logical/);
  await errMatch(
    "print(which(c(TRUE), arr.ind = TRUE))",
    /arr\.ind/,
  );
  await outIs("print(which.min(c(3, 1, 2, 1)))", ["2"]);
  await outIs("print(which.max(c(3, 1, 2)))", ["1"]);
  await outIs("print(which.min(c(NA, NA)))", ["c()"]);
  await outIs("print(which.min(c()))", ["c()"]);
  await outIs("print(which.min(c(a = 3, b = 1)))", ["c(b = 2)"]);
  await outIs("print(which.min(c(FALSE, TRUE)))", ["1"]);
  await outIs("print(which.max(c(FALSE, TRUE)))", ["2"]);
});
test("eng1 match and findInterval", async () => {
  await outIs(
    "print(match(c(3, 1, 5, NA, NaN), c(1, 3, NA, NaN)))",
    ["c(2, 1, NA, 3, 4)"],
  );
  await outIs("print(match(5, c(1, 2, 3), nomatch = 0))", ["c(0)"]);
  await outIs("print(match(c('b', 'a'), c('a', 'b')))", ["c(2, 1)"]);
  await outIs(
    "print(match(c(1, 2), c(1, 2), incomparables = 2))",
    ["c(1, NA)"],
  );
  await outIs("print(match(1, NULL))", ["c(NA)"]);
  // 公式ヘルプ findInterval の Examples（x <- 2:18、v <- c(5, 10, 15)）相当。
  await outIs(
    "print(findInterval(c(2, 5, 10, 15, 18), c(5, 10, 15)))",
    ["c(0, 1, 2, 3, 3)"],
  );
  await outIs(
    "print(findInterval(15, c(5, 10, 15), rightmost.closed = TRUE))",
    ["c(2)"],
  );
  await outIs(
    "print(findInterval(c(2, 18), c(5, 10, 15), all.inside = TRUE))",
    ["c(1, 2)"],
  );
  await outIs(
    "print(findInterval(c(5, 10), c(5, 10, 15), left.open = TRUE))",
    ["c(0, 1)"],
  );
  await outIs("print(findInterval(NA, c(5, 10)))", ["c(NA)"]);
  await outIs("print(findInterval(5, c()))", ["c(0)"]);
  await errMatch(
    "print(findInterval(1, c(10, 5)))",
    /'vec' must be sorted non-decreasingly/,
  );
});

// ---- seq 系 ----
test("eng1 seq family", async () => {
  await outIs("print(seq.int(1, 5, 2))", ["c(1, 3, 5)"]);
  await outIs("print(seq.int(5, 1, -2))", ["c(5, 3, 1)"]);
  await outIs("print(seq.int(to = 5, length.out = 3))", ["c(3, 4, 5)"]);
  await outIs("print(seq.int(1, 10, length.out = 4))", ["c(1, 4, 7, 10)"]);
  await outIs("print(seq.int(along.with = c(9, 9, 9)))", ["c(1, 2, 3)"]);
  await outIs("print(seq.int(5))", ["c(1, 2, 3, 4, 5)"]);
  await errMatch("print(seq.int(1, 5, 0))", /invalid '\(to - from\)\/by'/);
  await outIs("print(seq_along(c(5, 6, 7)))", ["c(1, 2, 3)"]);
  await outIs("print(seq_along(NULL))", ["c()"]);
  await outIs("print(sequence(c(2, 3)))", ["c(1, 2, 1, 2, 3)"]);
  await outIs("print(sequence(c(2, 0, 1)))", ["c(1, 2, 1)"]);
  await outIs("print(sequence(2.5))", ["c(1, 2)"]);
  await errMatch(
    "print(sequence(-1))",
    /'lengths' must be a vector of non-negative integers/,
  );
});

// ---- 名指し停止（値モデルで表せない経路） ----
test("eng1 named stops for unrepresentable paths", async () => {
  await errMatch("print(sqrt(data.frame(x = 1)))", /データフレームはこの関数の対象外です/);
  await errMatch("print(sort(data.frame(x = 1)))", /cannot xtfrm data frames/);
  await errMatch("print(unique(data.frame(x = 1)))", /データフレームの行単位/);
});
