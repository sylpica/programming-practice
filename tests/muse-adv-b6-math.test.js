// 高度モード ブロックB6・C班1（math/tgmath）の F-01 テスト。
// 対象: <math.h> 全183件（分類・比較マクロ12件を含む）の意味論と
// <tgmath.h> 型総称マクロの振り分け（項目は math 側へ一本化）。
// 期待値は gcc 13.3.0 の実走（printf %.6f / %d 表示）で裏付けた。
// erf/erfc/tgamma/lgamma は自前数値実装のため、%f 6桁表示の一致で
// 照合する（実測の相対誤差はおよそ 1e-15 以下。%.17g での完全一致は
// 保証しない＝精度の限界として報告に明記）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { applyAdvancedEngine } from "../js/types/c/advanced-engine.js";
applyAdvancedEngine(getDefinition("c"));

const run = async (code) => {
  const d = getDefinition("c");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const out1 = async (code) => {
  const r = await run(code);
  assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
  return r.paths[0].outputs.map((o) => o.text).join("");
};
const expectError = async (code, pattern, category) => {
  const r = await run(code);
  const errs = errors(r);
  assert.ok(
    errs.some((e) => pattern.test(e) && (!category || e.startsWith(category + ":"))),
    `${code} -> ${JSON.stringify(errs)}`,
  );
};

// [コード, 期待出力]。全実装項目を最低1ケース（典型）含む。
const CASES = [
  // ---- 絶対値・剰余 ----
  [`printf("%f", fabs(-2.5));`, "2.500000"],
  [`printf("%f", fabsf(-2.5));`, "2.500000"],
  [`double r = fabsl(-2.5); printf("%f", r);`, "2.500000"],
  [`printf("%f", fmod(-10.0, 3.0));`, "-1.000000"],
  [`printf("%f", fmod(10.0, -3.0));`, "1.000000"],
  [`printf("%f", fmodf(-10.0, 3.0));`, "-1.000000"],
  [`double r = fmodl(-10.0, 3.0); printf("%f", r);`, "-1.000000"],
  [`printf("%f", fmod(1.0, 0.0));`, "nan"], // printf の NaN 表示は基礎決定 RG-04 により符号なし。符号は signbit で gcc 一致（A-C P3-1）
  [`printf("%f", remainder(10.0, 3.0));`, "1.000000"],
  [`printf("%f", remainder(-10.0, 3.0));`, "-1.000000"],
  [`printf("%f", remainder(5.0, 2.0));`, "1.000000"], // 商 2.5 は偶数側 2
  [`printf("%f", remainder(3.0, 2.0));`, "-1.000000"], // 商 1.5 は偶数側 2
  [`printf("%f", remainderf(10.0, 3.0));`, "1.000000"],
  [`double r = remainderl(10.0, 3.0); printf("%f", r);`, "1.000000"],
  [`int q; double r = remquo(10.0, 3.0, &q); printf("%f %d", r, q);`, "1.000000 3"],
  [`int q; double r = remquo(-10.0, 3.0, &q); printf("%f %d", r, q);`, "-1.000000 -3"],
  [`int q; double r = remquo(5.0, 2.0, &q); printf("%f %d", r, q);`, "1.000000 2"],
  [`int q; float r = remquof(10.0, 3.0, &q); printf("%f %d", r, q);`, "1.000000 3"],
  [`int q; double r = remquol(10.0, 3.0, &q); printf("%f %d", r, q);`, "1.000000 3"],
  // ---- fma / fmax / fmin / fdim / nan ----
  [`printf("%f", fma(2.0, 3.0, 4.0));`, "10.000000"],
  // 補償演算でないと 0 になるケース（gcc 実測 -5366162204393472）
  [`printf("%f", fma(1e16, 1e16, -1e32));`, "-5366162204393472.000000"],
  [`printf("%f", fmaf(2.0, 3.0, 4.0));`, "10.000000"],
  [`double r = fmal(2.0, 3.0, 4.0); printf("%f", r);`, "10.000000"],
  [`printf("%f", fmax(1.0, 2.0));`, "2.000000"],
  [`printf("%f", fmax(nan(""), 1.0));`, "1.000000"],
  [`printf("%f", fmaxf(1.0, 2.0));`, "2.000000"],
  [`double r = fmaxl(1.0, 2.0); printf("%f", r);`, "2.000000"],
  [`printf("%f", fmin(1.0, 2.0));`, "1.000000"],
  [`printf("%f", fmin(nan(""), 1.0));`, "1.000000"],
  [`printf("%f", fminf(1.0, 2.0));`, "1.000000"],
  [`double r = fminl(1.0, 2.0); printf("%f", r);`, "1.000000"],
  [`printf("%f", fdim(5.0, 3.0));`, "2.000000"],
  [`printf("%f", fdim(3.0, 5.0));`, "0.000000"],
  [`printf("%f", fdimf(5.0, 3.0));`, "2.000000"],
  [`double r = fdiml(5.0, 3.0); printf("%f", r);`, "2.000000"],
  [`printf("%d", isnan(nan("")));`, "1"],
  [`printf("%d", isnan(nanf("")));`, "1"],
  [`printf("%d", isnan(nanl("")));`, "1"],
  // ---- 指数・対数 ----
  [`printf("%f", exp(1.0));`, "2.718282"],
  [`printf("%f", exp(1000.0));`, "inf"],
  [`printf("%f", exp(-1000.0));`, "0.000000"],
  [`printf("%f", expf(1.0));`, "2.718282"],
  [`double r = expl(1.0); printf("%f", r);`, "2.718282"],
  [`printf("%f", exp2(10.0));`, "1024.000000"],
  [`printf("%f", exp2f(10.0));`, "1024.000000"],
  [`double r = exp2l(10.0); printf("%f", r);`, "1024.000000"],
  [`printf("%f", expm1(1.0));`, "1.718282"],
  [`printf("%f", expm1(-1.0));`, "-0.632121"],
  [`printf("%f", expm1f(1.0));`, "1.718282"],
  [`double r = expm1l(1.0); printf("%f", r);`, "1.718282"],
  [`printf("%f", log(10.0));`, "2.302585"],
  [`printf("%f", log(0.0));`, "-inf"],
  [`printf("%f", log(-1.0));`, "nan"], // printf 表示は RG-04 で "nan" 統一。NaN の符号自体は signbit で gcc 一致
  [`printf("%f", logf(10.0));`, "2.302585"],
  [`double r = logl(10.0); printf("%f", r);`, "2.302585"],
  [`printf("%f", log10(100.0));`, "2.000000"],
  [`printf("%f", log10(0.0));`, "-inf"],
  [`printf("%f", log10f(100.0));`, "2.000000"],
  [`double r = log10l(100.0); printf("%f", r);`, "2.000000"],
  [`printf("%f", log2(8.0));`, "3.000000"],
  [`printf("%f", log2f(8.0));`, "3.000000"],
  [`double r = log2l(8.0); printf("%f", r);`, "3.000000"],
  [`printf("%f", log1p(1.0));`, "0.693147"],
  [`printf("%f", log1p(-1.0));`, "-inf"],
  [`printf("%f", log1p(-0.5));`, "-0.693147"],
  [`printf("%f", log1pf(1.0));`, "0.693147"],
  [`double r = log1pl(1.0); printf("%f", r);`, "0.693147"],
  // ---- 冪・根 ----
  [`printf("%f", pow(2.0, 10.0));`, "1024.000000"],
  [`printf("%f", pow(0.0, -1.0));`, "inf"],
  [`printf("%f", pow(-8.0, 1.0 / 3.0));`, "nan"],
  [`printf("%f", pow(1.0, nan("")));`, "1.000000"],
  [`printf("%f", pow(nan(""), 0.0));`, "1.000000"],
  [`printf("%f", powf(2.0, 10.0));`, "1024.000000"],
  [`double r = powl(2.0, 10.0); printf("%f", r);`, "1024.000000"],
  [`printf("%f", sqrt(2.0));`, "1.414214"],
  [`printf("%f", sqrt(-1.0));`, "nan"],
  [`printf("%f", sqrtf(2.0));`, "1.414214"],
  [`double r = sqrtl(2.0); printf("%f", r);`, "1.414214"],
  [`printf("%f", cbrt(-8.0));`, "-2.000000"],
  [`printf("%f", cbrtf(-8.0));`, "-2.000000"],
  [`double r = cbrtl(-8.0); printf("%f", r);`, "-2.000000"],
  [`printf("%f", hypot(3.0, 4.0));`, "5.000000"],
  [`printf("%f", hypot(exp(1000.0), nan("")));`, "inf"],
  [`printf("%f", hypotf(3.0, 4.0));`, "5.000000"],
  [`double r = hypotl(3.0, 4.0); printf("%f", r);`, "5.000000"],
  // ---- 三角関数 ----
  [`printf("%f", sin(1.0));`, "0.841471"],
  [`printf("%f", sinf(1.0));`, "0.841471"],
  [`double r = sinl(1.0); printf("%f", r);`, "0.841471"],
  [`printf("%f", cos(1.0));`, "0.540302"],
  [`printf("%f", cosf(1.0));`, "0.540302"],
  [`double r = cosl(1.0); printf("%f", r);`, "0.540302"],
  [`printf("%f", tan(1.0));`, "1.557408"],
  [`printf("%f", tanf(1.0));`, "1.557408"],
  [`double r = tanl(1.0); printf("%f", r);`, "1.557408"],
  [`printf("%f", asin(0.5));`, "0.523599"],
  [`printf("%f", asin(2.0));`, "nan"],
  [`printf("%f", asinf(0.5));`, "0.523599"],
  [`double r = asinl(0.5); printf("%f", r);`, "0.523599"],
  [`printf("%f", acos(0.5));`, "1.047198"],
  [`printf("%f", acosf(0.5));`, "1.047198"],
  [`double r = acosl(0.5); printf("%f", r);`, "1.047198"],
  [`printf("%f", atan(0.5));`, "0.463648"],
  [`printf("%f", atanf(0.5));`, "0.463648"],
  [`double r = atanl(0.5); printf("%f", r);`, "0.463648"],
  [`printf("%f", atan2(1.0, 2.0));`, "0.463648"],
  [`printf("%f", atan2f(1.0, 2.0));`, "0.463648"],
  [`double r = atan2l(1.0, 2.0); printf("%f", r);`, "0.463648"],
  // ---- 双曲線関数 ----
  [`printf("%f", sinh(1.0));`, "1.175201"],
  [`printf("%f", sinhf(1.0));`, "1.175201"],
  [`double r = sinhl(1.0); printf("%f", r);`, "1.175201"],
  [`printf("%f", cosh(1.0));`, "1.543081"],
  [`printf("%f", coshf(1.0));`, "1.543081"],
  [`double r = coshl(1.0); printf("%f", r);`, "1.543081"],
  [`printf("%f", tanh(1.0));`, "0.761594"],
  [`printf("%f", tanhf(1.0));`, "0.761594"],
  [`double r = tanhl(1.0); printf("%f", r);`, "0.761594"],
  [`printf("%f", asinh(1.0));`, "0.881374"],
  [`printf("%f", asinhf(1.0));`, "0.881374"],
  [`double r = asinhl(1.0); printf("%f", r);`, "0.881374"],
  [`printf("%f", acosh(2.0));`, "1.316958"],
  [`printf("%f", acosh(0.5));`, "nan"],
  [`printf("%f", acoshf(2.0));`, "1.316958"],
  [`double r = acoshl(2.0); printf("%f", r);`, "1.316958"],
  [`printf("%f", atanh(0.5));`, "0.549306"],
  [`printf("%f", atanh(1.0));`, "inf"],
  [`printf("%f", atanh(-1.0));`, "-inf"],
  [`printf("%f", atanhf(0.5));`, "0.549306"],
  [`double r = atanhl(0.5); printf("%f", r);`, "0.549306"],
  // ---- 誤差・ガンマ関数（自前数値実装。%f 6桁で照合） ----
  [`printf("%f", erf(1.0));`, "0.842701"],
  [`printf("%f", erf(0.5));`, "0.520500"],
  [`printf("%f", erf(-1.0));`, "-0.842701"],
  [`printf("%f", erff(1.0));`, "0.842701"],
  [`double r = erfl(1.0); printf("%f", r);`, "0.842701"],
  [`printf("%f", erfc(1.0));`, "0.157299"],
  [`printf("%f", erfc(2.0));`, "0.004678"],
  [`printf("%f", erfc(-1.0));`, "1.842701"],
  [`printf("%f", erfcf(1.0));`, "0.157299"],
  [`double r = erfcl(1.0); printf("%f", r);`, "0.157299"],
  [`printf("%f", tgamma(5.0));`, "24.000000"],
  [`printf("%f", tgamma(0.5));`, "1.772454"],
  [`printf("%f", tgamma(-0.5));`, "-3.544908"],
  [`printf("%f", tgamma(0.0));`, "inf"],
  [`printf("%f", tgamma(-1.0));`, "nan"],
  [`printf("%f", tgammaf(5.0));`, "24.000000"],
  [`double r = tgammal(5.0); printf("%f", r);`, "24.000000"],
  [`printf("%f", lgamma(5.0));`, "3.178054"],
  [`printf("%f", lgamma(0.5));`, "0.572365"],
  [`printf("%f", lgamma(-0.5));`, "1.265512"],
  [`printf("%f", lgamma(0.0));`, "inf"],
  [`printf("%f", lgammaf(5.0));`, "3.178054"],
  [`double r = lgammal(5.0); printf("%f", r);`, "3.178054"],
  // ---- 丸め ----
  [`printf("%f", ceil(2.5));`, "3.000000"],
  [`printf("%f", ceil(-2.5));`, "-2.000000"],
  [`printf("%f", ceilf(2.5));`, "3.000000"],
  [`double r = ceill(2.5); printf("%f", r);`, "3.000000"],
  [`printf("%f", floor(2.5));`, "2.000000"],
  [`printf("%f", floor(-2.5));`, "-3.000000"],
  [`printf("%f", floorf(2.5));`, "2.000000"],
  [`double r = floorl(2.5); printf("%f", r);`, "2.000000"],
  [`printf("%f", trunc(-2.7));`, "-2.000000"],
  [`printf("%f", trunc(2.7));`, "2.000000"],
  [`printf("%f", truncf(-2.7));`, "-2.000000"],
  [`double r = truncl(-2.7); printf("%f", r);`, "-2.000000"],
  [`printf("%f", nearbyint(2.5));`, "2.000000"],
  [`printf("%f", nearbyint(3.5));`, "4.000000"],
  [`printf("%f", nearbyintf(2.5));`, "2.000000"],
  [`double r = nearbyintl(2.5); printf("%f", r);`, "2.000000"],
  [`printf("%f", rint(2.5));`, "2.000000"],
  [`printf("%f", rint(3.5));`, "4.000000"],
  [`printf("%f", rint(-2.5));`, "-2.000000"],
  [`printf("%f", rintf(2.5));`, "2.000000"],
  [`double r = rintl(2.5); printf("%f", r);`, "2.000000"],
  [`printf("%f", round(2.5));`, "3.000000"],
  [`printf("%f", round(-2.5));`, "-3.000000"],
  [`printf("%f", roundf(2.5));`, "3.000000"],
  [`double r = roundl(2.5); printf("%f", r);`, "3.000000"],
  [`long r = lrint(2.5); double d = r; printf("%f", d);`, "2.000000"],
  [`long r = lrint(-2.5); double d = r; printf("%f", d);`, "-2.000000"],
  [`long r = lrintf(3.5); double d = r; printf("%f", d);`, "4.000000"],
  [`long r = lrintl(2.5); double d = r; printf("%f", d);`, "2.000000"],
  [`long long r = llrint(3.5); double d = r; printf("%f", d);`, "4.000000"],
  [`long long r = llrintf(2.5); double d = r; printf("%f", d);`, "2.000000"],
  [`long long r = llrintl(2.5); double d = r; printf("%f", d);`, "2.000000"],
  [`long r = lround(2.5); double d = r; printf("%f", d);`, "3.000000"],
  [`long r = lround(-2.5); double d = r; printf("%f", d);`, "-3.000000"],
  [`long r = lroundf(2.5); double d = r; printf("%f", d);`, "3.000000"],
  [`long r = lroundl(2.5); double d = r; printf("%f", d);`, "3.000000"],
  [`long long r = llround(-2.5); double d = r; printf("%f", d);`, "-3.000000"],
  [`long long r = llround(2.4); double d = r; printf("%f", d);`, "2.000000"],
  [`long long r = llroundf(2.5); double d = r; printf("%f", d);`, "3.000000"],
  [`long long r = llroundl(2.5); double d = r; printf("%f", d);`, "3.000000"],
  // ---- 分解・スケーリング ----
  [`int e; double m = frexp(12.0, &e); printf("%f %d", m, e);`, "0.750000 4"],
  [`int e; double m = frexp(0.0, &e); printf("%f %d", m, e);`, "0.000000 0"],
  [`int e; double m = frexp(0.5, &e); printf("%f %d", m, e);`, "0.500000 0"],
  [`int e; float m = frexpf(12.0, &e); printf("%f %d", m, e);`, "0.750000 4"],
  [`int e; double m = frexpl(12.0, &e); printf("%f %d", m, e);`, "0.750000 4"],
  [`printf("%f", ldexp(1.5, 4));`, "24.000000"],
  [`printf("%f", ldexp(1.5, -2));`, "0.375000"],
  [`printf("%f", ldexpf(1.5, 4));`, "24.000000"],
  [`double r = ldexpl(1.5, 4); printf("%f", r);`, "24.000000"],
  [`double ip; double f = modf(3.7, &ip); printf("%f %f", f, ip);`, "0.700000 3.000000"],
  [`double ip; double f = modf(-3.7, &ip); printf("%f %f", f, ip);`, "-0.700000 -3.000000"],
  [`float ip; float f = modff(3.7, &ip); printf("%f %f", f, ip);`, "0.700000 3.000000"],
  [`double ip; double f = modfl(3.7, &ip); printf("%f %f", f, ip);`, "0.700000 3.000000"],
  [`printf("%f", scalbn(1.5, 4));`, "24.000000"],
  [`printf("%f", scalbn(3.0, 2000));`, "inf"],
  [`printf("%f", scalbnf(1.5, 4));`, "24.000000"],
  [`double r = scalbnl(1.5, 4); printf("%f", r);`, "24.000000"],
  [`printf("%f", scalbln(1.5, 4));`, "24.000000"],
  [`printf("%f", scalblnf(1.5, 4));`, "24.000000"],
  [`double r = scalblnl(1.5, 4); printf("%f", r);`, "24.000000"],
  [`printf("%d", ilogb(8.0));`, "3"],
  [`printf("%d", ilogb(0.5));`, "-1"],
  [`printf("%d", ilogb(0.0));`, "-2147483648"], // FP_ILOGB0 (gcc 実測)
  [`printf("%d", ilogb(nan("")));`, "-2147483648"], // FP_ILOGBNAN
  [`printf("%d", ilogb(exp(1000.0)));`, "2147483647"], // INT_MAX
  [`printf("%d", ilogbf(8.0));`, "3"],
  [`printf("%d", ilogbl(8.0));`, "3"],
  [`printf("%f", logb(8.0));`, "3.000000"],
  [`printf("%f", logb(0.5));`, "-1.000000"],
  [`printf("%f", logb(0.0));`, "-inf"],
  [`printf("%f", logbf(8.0));`, "3.000000"],
  [`double r = logbl(8.0); printf("%f", r);`, "3.000000"],
  // ---- 隣接値・符号 ----
  // 2^-52 の刻みを拡大して確認する（gcc 実測 1.000000）
  [`printf("%f", (nextafter(1.0, 2.0) - 1.0) * 4503599627370496.0);`, "1.000000"],
  [`printf("%f", (nextafter(1.0, 0.0) - 1.0) * 4503599627370496.0);`, "-0.500000"], // 1 の下側の刻みは 2^-53（gcc 実測）
  [`printf("%f", nextafter(1.0, 1.0));`, "1.000000"],
  [`double d = nextafterf(1.0, 2.0); printf("%f", (d - 1.0) * 8388608.0);`, "1.000000"],
  [`double r = nextafterl(1.0, 2.0); printf("%f", (r - 1.0) * 4503599627370496.0);`, "1.000000"],
  [`printf("%f", (nexttoward(1.0, 2.0) - 1.0) * 4503599627370496.0);`, "1.000000"],
  [`printf("%f", nexttowardf(1.0, 2.0));`, "1.000000"],
  [`double r = nexttowardl(1.0, 2.0); printf("%f", r);`, "1.000000"],
  [`printf("%f", copysign(3.0, -1.0));`, "-3.000000"],
  [`printf("%f", copysign(-3.0, 1.0));`, "3.000000"],
  [`printf("%d", signbit(copysign(3.0, -0.0)));`, "1"],
  [`printf("%f", copysignf(3.0, -1.0));`, "-3.000000"],
  [`double r = copysignl(3.0, -1.0); printf("%f", r);`, "-3.000000"],
  // ---- 分類マクロ（定数値は gcc 実測: NAN=0 INF=1 ZERO=2 SUBNORMAL=3 NORMAL=4） ----
  [`printf("%d", fpclassify(1.0));`, "4"],
  [`printf("%d", fpclassify(0.0));`, "2"],
  [`printf("%d", fpclassify(-0.0));`, "2"],
  [`printf("%d", fpclassify(nan("")));`, "0"],
  [`printf("%d", fpclassify(exp(1000.0)));`, "1"],
  [`printf("%d", fpclassify(1e-320));`, "3"],
  [`printf("%d", isfinite(1.0));`, "1"],
  [`printf("%d", isfinite(exp(1000.0)));`, "0"],
  [`printf("%d", isfinite(nan("")));`, "0"],
  [`printf("%d", isinf(exp(1000.0)));`, "1"],
  [`printf("%d", isinf(-exp(1000.0)));`, "-1"], // glibc は符号付き
  [`printf("%d", isinf(1.0));`, "0"],
  [`printf("%d", isnan(1.0));`, "0"],
  [`printf("%d", isnormal(1.0));`, "1"],
  [`printf("%d", isnormal(0.0));`, "0"],
  [`printf("%d", isnormal(1e-320));`, "0"],
  [`printf("%d", signbit(-1.0));`, "1"],
  [`printf("%d", signbit(-0.0));`, "1"],
  [`printf("%d", signbit(0.0));`, "0"],
  // 定義域エラー NaN の符号は gcc 13.3 実測に一致（A-C P3-1是正。printf 表示は RG-04 で "nan" 統一）
  [`printf("%d", signbit(log(-1.0)));`, "1"],
  [`printf("%d", signbit(log2(-1.0)));`, "1"],
  [`printf("%d", signbit(log1p(-2.0)));`, "1"],
  [`printf("%d", signbit(log10(-1.0)));`, "0"],
  [`printf("%d", signbit(asin(2.0)));`, "0"],
  [`printf("%d", signbit(acosh(0.5)));`, "1"],
  [`printf("%d", signbit(atanh(2.0)));`, "1"],
  [`printf("%d", signbit(fmod(1.0, 0.0)));`, "1"],
  [`printf("%d", signbit(remainder(1.0, 0.0)));`, "1"],
  // ---- 比較マクロ ----
  [`printf("%d", isgreater(2.0, 1.0));`, "1"],
  [`printf("%d", isgreater(1.0, 2.0));`, "0"],
  [`printf("%d", isgreater(nan(""), 1.0));`, "0"],
  [`printf("%d", isgreaterequal(2.0, 2.0));`, "1"],
  [`printf("%d", isgreaterequal(1.0, 2.0));`, "0"],
  [`printf("%d", isless(1.0, 2.0));`, "1"],
  [`printf("%d", isless(2.0, 1.0));`, "0"],
  [`printf("%d", islessequal(2.0, 2.0));`, "1"],
  [`printf("%d", islessequal(3.0, 2.0));`, "0"],
  [`printf("%d", islessgreater(1.0, 2.0));`, "1"],
  [`printf("%d", islessgreater(2.0, 2.0));`, "0"],
  [`printf("%d", islessgreater(nan(""), 1.0));`, "0"],
  [`printf("%d", isunordered(nan(""), 1.0));`, "1"],
  [`printf("%d", isunordered(1.0, 2.0));`, "0"],
  // ---- tgmath 振り分け: float 引数は f 版（結果を float へ丸める） ----
  // gcc 実測: (sinf(1.0f) - sin(1.0)) * 1e9 = -28.005528
  [`float x = 1.0; printf("%f", (sin(x) - sin(1.0)) * 1e9);`, "-28.005528"],
  [`float x = 1.0; printf("%f", (sinf(x) - sin(1.0)) * 1e9);`, "-28.005528"],
  // double 引数は丸めない
  [`double x = 1.0; printf("%f", (sin(x) - sin(1.0)) * 1e9);`, "0.000000"],
  // sqrtf の float 丸め（gcc 実測 -24.203234）
  [`printf("%f", (sqrtf(2.0) - sqrt(2.0)) * 1e9);`, "-24.203234"],
  // ---- 組み合わせ ----
  [`printf("%f", sqrt(pow(3.0, 2.0) + pow(4.0, 2.0)));`, "5.000000"],
  [`printf("%f", hypot(3.0, 4.0) + fabs(-2.5));`, "7.500000"],
  [`double x = 12.0; int e; double m = frexp(x, &e); printf("%f", ldexp(m, e));`, "12.000000"],
  [`printf("%d", isfinite(sqrt(2.0)) + isnan(log(-1.0)));`, "2"],
];

test("B6-math F-01: typical/boundary/domain cases per function", async () => {
  for (const [code, want] of CASES) {
    assert.equal(await out1(code), want, code);
  }
});

test("B6-math F-01: arity and type errors are CompileError", async () => {
  await expectError(`printf("%f", sqrt(1.0, 2.0));`, /sqrt は引数を1つだけ取ります/, "CompileError");
  await expectError(`printf("%f", sqrt());`, /sqrt は引数を1つだけ取ります/, "CompileError");
  await expectError(`printf("%f", pow(1.0));`, /pow は引数を2つだけ取ります/, "CompileError");
  await expectError(`printf("%f", fma(1.0, 2.0));`, /fma は引数を3つだけ取ります/, "CompileError");
  await expectError(`printf("%f", sqrt("x"));`, /引数は数値でなければなりません/, "CompileError");
  await expectError(`int e; double m = frexp(12.0, 3);`, /ポインタでなければなりません/, "CompileError");
  await expectError(`printf("%f", nan(3));`, /ポインタでなければなりません/, "CompileError");
});

test("B6-math F-01: long conversions out of range are undefined behavior", async () => {
  await expectError(`long r = lrint(exp(1000.0));`, /変換範囲外/, "未定義動作");
  await expectError(`long long r = llround(nan(""));`, /変換範囲外/, "未定義動作");
  await expectError(`long r = lround(1e300);`, /表せません/, "未定義動作");
});

test("B6-math: reference examples all execute", async () => {
  const { referenceAdvanced: items } = await import("../js/types/c/ref-math-advanced.js");
  assert.equal(items.length, 183);
  for (const it of items) {
    assert.equal(it.status, "supported", it.name);
    const r = await run(it.example);
    assert.deepEqual(errors(r), [], `${it.name}: ${it.example}`);
  }
});
