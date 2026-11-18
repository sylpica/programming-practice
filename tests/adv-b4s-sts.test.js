import { test} from "node:test";
import assert from "node:assert/strict";
import { referenceAdvanced as ref7} from "../js/types/r/reference-advanced-part7.js";
import { names as names7} from "../js/types/r/names-advanced-part7.js";
import { referenceAdvanced as refP1} from "../js/types/r/reference-advanced-part1.js";
import { referenceAdvanced as refP2} from "../js/types/r/reference-advanced-part2.js";
import { names as namesP1} from "../js/types/r/names-advanced-part1.js";
import { names as namesP2} from "../js/types/r/names-advanced-part2.js";
import { builtins} from "../js/types/r/functions-advanced-statsts.js";
import { definition} from "../js/types/r/index.js";

// 高度モード B4S・R stats 時系列・平滑化班（sts）。
// 期待値は実 R 4.3.3（/usr/bin/Rscript）の実測と、R 本体の関数ソース
// （stats/R のダンプ）の移植照合による。さらに 313 件のランダムケースで
// JS 実装と実 R を突き合わせ全件一致を確認済み（報告書 ADV-B4S-sts.md）。
// ハンドラは集約ファイルへの配線前なので、.bincode の前例
// （adv-b4-r-eng4.test.js）と同じく fake ctx で直接検証する。

const SLICE = [
"ARMAacf", "ARMAtoMA", "HoltWinters", "print.HoltWinters",
"residuals.HoltWinters", "KalmanForecast", "KalmanLike", "KalmanRun",
"KalmanSmooth", "makeARIMA", "predict.StructTS", "print.StructTS",
"StructTS", "acf", "ccf", "pacf", "[.acf", "acf2AR", "ar", "ar.burg",
"ar.burg.default", "ar.mle", "ar.yw", "ar.yw.default", "predict.ar",
"print.ar", "ar.ols", "arima", "arima.sim", "arima0", "predict.arima0",
"print.arima0", "approx", "approxfun", "bw.bcv", "bw.nrd", "bw.nrd0",
"bw.SJ", "bw.ucv", "cpgram", "decompose", "plot.decomposed.ts", "density",
"diffinv", "embed", "filter", "bandwidth.kernel", "df.kernel",
"is.tskernel", "kernel", "plot.tskernel", "kernapply", "ksmooth", "lag",
"lag.plot", "line", "residuals.tukeyline", "loess", "loess.control",
"lowess", "monthplot", "plot.HoltWinters", "plot.acf", "plot.density",
"lines.isoreg", "plot.isoreg", "lines.stepfun", "plot.stepfun", "lines.ts",
"plot.ts", "predict.HoltWinters", "predict.Arima", "predict.loess",
"predict.smooth.spline", "spec", "spectrum", "spec.ar", "spec.pgram",
"spec.taper", "spline", "splinefun", "splinefunH", "smooth",
"smooth.spline", ".nknots.smspl", "smoothEnds", "end", "start",
"as.stepfun", "is.stepfun", "knots", "print.stepfun", "stepfun",
"summary.stepfun", "stl", "plot.stl", "summary.stl", "supsmu", "cycle",
"deltat", "frequency", "time", "time.default", "as.ts", "cbind.ts",
"head.ts", "is.mts", "is.ts", "Ops.ts", "t.ts", "tail.ts", "ts", "[.ts",
"diff.ts", "na.omit.ts", "ts.plot", "ts.intersect", "ts.union", "tsSmooth",
"tsdiag", "hasTsp", "tsp", "window", "isoreg", "runmed", "loess.smooth",
"scatter.smooth",
];
const SUPPORTED = [
"ARMAacf", "ARMAtoMA", "bw.nrd", "bw.nrd0", "diffinv", "runmed", "smooth",
"smoothEnds", "spec.taper",
];
const NAMES_EXCLUDED = ["[.acf", "[.ts", "head.ts", "spec", "tail.ts"];

// ============================================================
// 1. データ整合（分母・内訳・形式・重複）
// ============================================================
test("sts data: スライス全127名にちょうど1項目ずつ（スライス順）", () => {
assert.equal(ref7.length, 127);
assert.deepEqual(ref7.map((r) => r.name), SLICE);
assert.equal(new Set(ref7.map((r) => r.name)).size, 127);
});

test("sts data: 内訳は対応9／未対応118／未検証0", () => {
const count = (s) => ref7.filter((r) => r.status === s).length;
assert.equal(count("supported"), 9);
assert.equal(count("unsupported"), 118);
assert.equal(count("unverified"), 0);
assert.deepEqual(
ref7.filter((r) => r.status === "supported").map((r) => r.name).sort(),
[...SUPPORTED].sort(),
);
});

test("sts data: 正規形（7フィールドのみ）・未対応は理由を名指し", () => {
const KEYS = ["name", "category", "syntax", "description", "example", "caution", "status"];
for (const r of ref7) {
assert.deepEqual(Object.keys(r), KEYS, r.name);
if (r.status === "unsupported")
assert.ok(r.description.includes("【未対応の理由】"), r.name);
if (r.status === "supported")
assert.ok(!r.description.includes("【未対応の理由】"), r.name);
}
});

test("sts data: names は122件（除外5件のみ）・重複なし・既存層と非重複", () => {
assert.equal(names7.length, 122);
assert.deepEqual(
[...names7].sort(),
SLICE.filter((n) =>!NAMES_EXCLUDED.includes(n)).sort(),
);
assert.equal(new Set(names7).size, names7.length);
const b4Names = new Set([...namesP1,...namesP2]);
const b4Items = new Set([...refP1,...refP2].map((r) => r.name));
const baseItems = new Set(definition.reference.map((r) => r.name));
for (const n of names7) {
assert.ok(!b4Names.has(n), `B4 names と重複: ${n}`);
assert.ok(!b4Items.has(n), `B4 項目と重複: ${n}`);
assert.ok(!baseItems.has(n), `基礎項目と重複: ${n}`);
}
for (const r of ref7) assert.ok(!b4Items.has(r.name), r.name);
});

test("sts data: ハンドラは対応9関数のみ（未対応はエンジン側で名指し停止する）", () => {
assert.deepEqual([...builtins.keys()].sort(), [...SUPPORTED].sort());
});

// ============================================================
// 2. ハンドラ直接検証（fake ctx。実 R 4.3.3 実測値）
// ============================================================
const NA = { kind: "NA"};
const H = {
vec: (v) => (v === null || v === undefined? []: Array.isArray(v)? v: [v]),
isNA: (v) => v?.kind === "NA",
isNaNVal: (v) => typeof v === "number" && Number.isNaN(v),
isMissing: (v) =>
v?.kind === "NA" || (typeof v === "number" && Number.isNaN(v)),
namesOf: (v) => (Array.isArray(v) && Array.isArray(v.names)? v.names: null),
withNames: (arr, names) => {
if (names) arr.names = [...names];
return arr;
},
show: (v) => JSON.stringify(v),
NA,
};
let warnings = [];
const call = (name, vals, argNames) => {
warnings = [];
const ctx = {
name,
args: vals.map((_, i) => ({ argName: argNames?.[i]?? null})),
vals,
api: {
fail: (msg) => {
throw new Error(msg);
},
note: (s, node, text) => warnings.push(text),
},
s: null,
node: null,
H,
};
return builtins.get(name)(ctx);
};
const callErr = (name, vals, argNames, re) => {
assert.throws(() => call(name, vals, argNames), re, name);
};
const approx = (got, expected, tol = 1e-12) => {
const g = Array.isArray(got)? got: [got];
assert.equal(g.length, expected.length, JSON.stringify(got));
g.forEach((v, i) => {
const e = expected[i];
if (e?.kind === "NA") {
assert.ok(H.isNA(v), `idx ${i}: expected NA, got ${v}`);
return;
}
assert.ok(
Math.abs(v - e) <= tol * Math.max(1, Math.abs(e)),
`idx ${i}: got ${v}, expected ${e}`,
);
});
};

// ---- diffinv
test("diffinv: 典型・lag・differences・xi・空・NA伝播", () => {
assert.deepEqual(call("diffinv", [[1, 2, 3]]), [0, 1, 3, 6]);
assert.deepEqual(
call("diffinv", [new Array(9).fill(1), [1]], [null, "xi"]),
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
);
assert.deepEqual(
call("diffinv", [[1, 2, 3, 4], 2, [10, 20]], [null, "lag", "xi"]),
[10, 20, 11, 22, 14, 26],
);
assert.deepEqual(
call("diffinv", [[1, 1, 1], 2, [5, 7]], [null, "differences", "xi"]),
[5, 7, 10, 14, 19],
);
assert.deepEqual(
call("diffinv", [[1, 0, 0], 3, [2, 3, 5]], [null, "differences", "xi"]),
[2, 3, 5, 9, 15, 23],
);
assert.deepEqual(call("diffinv", [[]]), [0]);
approx(call("diffinv", [[1, NA, 3]]), [0, 1, NA, NA], 0);
});

test("diffinv: 異常系（実 R の文言）", () => {
callErr("diffinv", [[1, 2], 0], [null, "lag"], /bad value for 'lag' or 'differences'/);
callErr("diffinv", [[1, 2], [1, 2, 3]], [null, "xi"], /'xi' does not have the right length/);
callErr("diffinv", [null], null, /'x' is not a vector or matrix/);
});

// ---- bw.nrd0 / bw.nrd
test("bw: 経験則とフォールバック（実測値）", () => {
approx(call("bw.nrd0", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]), [1.7192864046922831]);
approx(call("bw.nrd", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]), [2.0249373210820227]);
approx(call("bw.nrd0", [new Array(10).fill(5)]), [2.8393080501608696]);
approx(call("bw.nrd0", [[0, 0, 0, 0, 0]]), [0.65230169730992604]);
approx(call("bw.nrd0", [[1, 1, 1, 1, 2]]), [0.29171818740469724]);
assert.equal(call("bw.nrd", [[1, 1, 1, 1, 2]]), 0);
approx(call("bw.nrd0", [[1, 3]]), [0.58469813952724747]);
approx(call("bw.nrd", [[1, 3]]), [0.68864447544320262]);
});

test("bw: 異常系（長さ・NA・Inf）", () => {
callErr("bw.nrd0", [[5]], null, /need at least 2 data points/);
callErr("bw.nrd", [[1, NA, 3]], null, /missing values and NaN's not allowed if 'na.rm' is FALSE/);
callErr("bw.nrd0", [[1, 2, Infinity]], null, /missing value where TRUE\/FALSE needed/);
assert.ok(Number.isNaN(call("bw.nrd", [[1, 2, Infinity]])));
});

// ---- runmed
const Y41 = (() => {
const y = Array.from({ length: 41}, (_, i) => (i - 20) ** 2);
y[0] = 100; y[9] = 30; y[20] = 400; y[40] = 470;
return y;
})();
const KEEP41 = [100, 361, 324, 256, 256, 225, 196, 169, 144, 100, 81, 64, 49, 49, 36, 25, 16, 16, 9, 4, 4, 4, 9, 16, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256, 289, 324, 361, 470];
const CONST41 = [256, 256, 256, 256, 256, 225, 196, 169, 144, 100, 81, 64, 49, 49, 36, 25, 16, 16, 9, 4, 4, 4, 9, 16, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256, 289, 289, 289, 289];
const MED41 = [324, 324, 256, 256, 256, 225, 196, 169, 144, 100, 81, 64, 49, 49, 36, 25, 16, 16, 9, 4, 4, 4, 9, 16, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256, 289, 324, 361, 435];

test("runmed: ヘルプ例データで3つの endrule（実測値）", () => {
assert.deepEqual(call("runmed", [Y41, 7, "keep"], [null, null, "endrule"]), KEEP41);
assert.deepEqual(call("runmed", [Y41, 7, "constant"], [null, null, "endrule"]), CONST41);
assert.deepEqual(call("runmed", [Y41, 7, "median"], [null, null, "endrule"]), MED41);
assert.deepEqual(call("runmed", [Y41, 7]), KEEP41.length === 41? call("runmed", [Y41, 7, "median"], [null, null, "endrule"]): null);
});

test("runmed: 小ケース・k の調整と警告", () => {
assert.deepEqual(call("runmed", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3]), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepEqual(call("runmed", [[5, 1, 4, 2, 3], 3]), [5, 4, 2, 3, 3]);
assert.deepEqual(call("runmed", [[1, 2, 3, 4, 5], 2]), [1, 2, 3, 4, 5]);
assert.ok(warnings.some((w) => w.includes("'k' must be odd!")), JSON.stringify(warnings));
assert.deepEqual(call("runmed", [[1, 2, 3], 7]), [1, 2, 3]);
assert.ok(warnings.some((w) => w.includes("'k' is bigger than 'n'!")), JSON.stringify(warnings));
assert.deepEqual(call("runmed", [[1, 2, 3, 4, 5], 0]), [1, 2, 3, 4, 5]);
assert.deepEqual(call("runmed", [[1, Infinity, 3, 2, 5], 3]), [3, 3, 3, 3, 3]);
assert.deepEqual(call("runmed", [[], 3]), []);
});

test("runmed: 異常系と NA の名指し停止", () => {
callErr("runmed", [[1, 2, 3]], null, /argument "k" is missing, with no default/);
callErr("runmed", [[1, 2, 3], -3], null, /'k' must be positive/);
callErr("runmed", [[1, 2, 3], [3, 5]], null, /the condition has length > 1/);
callErr("runmed", [[1, 2, 3], 3, "s"], [null, null, "algorithm"], /'arg' should be one of "Stuetzle", "Turlach"/);
callErr("runmed", [[1, NA, 3], 3, "fail"], [null, null, "na.action"],
/runmed\(x, \.\., na\.action="na\.fail"\): have NAs starting at x\[2\]/);
callErr("runmed", [[1, NA, 3], 3], null, /説明に対応していません/);
callErr("runmed", [[1, NA, 3], 3, "bogus"], [null, null, "na.action"], /runmed\(\): invalid 'na\.action'/);
// 欠損が無ければ不正な na.action は実 R どおり既定動作する。
assert.deepEqual(call("runmed", [[1, 2, 3, 4, 5], 3, "bogus"], [null, null, "na.action"]), [1, 2, 3, 4, 5]);
});

// ---- smoothEnds
test("smoothEnds: 端点規則・NA・名前保持・異常系", () => {
assert.deepEqual(call("smoothEnds", [[1, 10, 2, 3, 4, 5], 3]), [10, 10, 2, 3, 4, 5]);
approx(call("smoothEnds", [[NA, 5, 1, 2, 3], 3]), [9, 5, 1, 2, 3], 0);
assert.deepEqual(call("smoothEnds", [[3, 1, 2], 5]), [2, 2, 2]);
assert.deepEqual(call("smoothEnds", [[1, 2], 1]), [1, 2]);
const named = [1, 10, 2, 3, 4, 5];
named.names = ["a", "b", "c", "d", "e", "f"];
assert.deepEqual(call("smoothEnds", [named, 3]).names, ["a", "b", "c", "d", "e", "f"]);
callErr("smoothEnds", [[1, 2, 3], 2], null, /bandwidth 'k' must be >= 1 and odd!/);
callErr("smoothEnds", [[1, 2], 3], null, /argument is of length zero/);
});

// ---- smooth
test("smooth: 全 kind と台地データ（実測値）", () => {
const sx = [1, 3, 2, 5, 4, 7, 6, 9, 8, 11];
const flat = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
for (const kind of ["3RS3R", "3RSS", "3RSR", "3R", "3"])
assert.deepEqual(call("smooth", [sx, kind], [null, "kind"]), flat, kind);
assert.deepEqual(call("smooth", [sx, "S"], [null, "kind"]), sx);
const sx2 = [5, 5, 1, 5, 5, 9, 5, 5, 2, 5];
for (const kind of ["3RS3R", "3RSS", "3RSR", "3R", "3"])
assert.deepEqual(call("smooth", [sx2, kind], [null, "kind"]), new Array(10).fill(5), kind);
assert.deepEqual(call("smooth", [sx2, "S"], [null, "kind"]), sx2);
assert.deepEqual(call("smooth", [[5]]), [5]);
assert.deepEqual(call("smooth", [[]]), []);
});

test("smooth: 異常系（NA・非数値・kind の曖昧）", () => {
callErr("smooth", [[1, NA, 3]], null, /attempt to smooth NA values/);
callErr("smooth", [["a", "b"]], null, /attempt to smooth non-numeric values/);
callErr("smooth", [[1, 2, 3], "3RS"], [null, "kind"], /'arg' should be one of/);
});

// ---- ARMAacf / ARMAtoMA
test("ARMAtoMA: 閉形式との一致・異常系", () => {
approx(
call("ARMAtoMA", [[1, -0.25], [1], 10], [null, null, "lag.max"]),
[2, 1.75, 1.25, 0.8125, 0.5, 0.296875, 0.171875, 0.09765625, 0.0546875, 0.0302734375],
);
callErr("ARMAtoMA", [[0.5]], null, /argument "lag.max" is missing, with no default/);
callErr("ARMAtoMA", [[0.5], [], 0], [null, null, "lag.max"], /invalid value of lag.max/);
approx(call("ARMAtoMA", [[0.5, NA], [], 3], [null, null, "lag.max"]), [0.5, NA, NA], 0);
});

test("ARMAacf: 閉形式・pacf・MA 専用（実測値）", () => {
const rho = Array.from({ length: 11}, (_, k) => 2 ** -k * (1 + 0.75 * k));
const got = call("ARMAacf", [[1, -0.25], [1], 10], [null, null, "lag.max"]);
approx(got, rho, 1e-12);
assert.deepEqual(got.names, Array.from({ length: 11}, (_, i) => String(i)));
approx(
call("ARMAacf", [[1, -0.25], [1], 10, true], [null, null, "lag.max", "pacf"]),
[0.875, -0.6, 0.375, -0.2727272727272727, 0.2142857142857143, -0.17647058823529413, 0.15, -0.13043478260869568, 0.11538461538461542, -0.10344827586206985],
1e-12,
);
approx(
call("ARMAacf", [[], [0.5, 0.3], 5], ["ar", "ma", "lag.max"]),
[1, 0.4850746268656717, 0.22388059701492538, 0, 0, 0],
);
approx(call("ARMAacf", [[0.8]]), [1, 0.8]);
approx(call("ARMAacf", [[0.5, 0.2], [], 2], [null, null, "lag.max"]), [1, 0.625, 0.5125]);
});

test("ARMAacf: 実 R の癖（lag.max=0・MA の切り捨てなし・名前の NA）", () => {
const g0 = call("ARMAacf", [[0.8], [], 0], [null, null, "lag.max"]);
approx(g0, [1, 0.8], 0);
assert.deepEqual(g0.names, ["0", null]);
const gm = call("ARMAacf", [[], [0.5, 0.3], 1], ["ar", "ma", "lag.max"]);
approx(gm, [1, 0.4850746268656717, 0.22388059701492538]);
assert.deepEqual(gm.names, ["0", "1", null]);
});

test("ARMAacf: 異常系と NA 係数（実 R の挙動）", () => {
callErr("ARMAacf", [[], []], null, /empty model supplied/);
callErr("ARMAacf", [[2, -1], [], 3], [null, null, "lag.max"], /singular/);
callErr("ARMAacf", [[NA], [], 3], [null, null, "lag.max"], /missing values in 'filter'/);
callErr("ARMAacf", [[], [0.5, NA], 2], ["ar", "ma", "lag.max"], /missing values in 'filter'/);
approx(call("ARMAacf", [[NA], [], 1], [null, null, "lag.max"]), [1, NA], 0);
approx(call("ARMAacf", [[NA, 0.5], [], 2], [null, null, "lag.max"]), [1, NA, NA], 0);
approx(
call("ARMAacf", [[0.5, NA], [], 2, true], [null, null, "lag.max", "pacf"]),
[NA, NA],
0,
);
});

// ---- spec.taper
test("spec.taper: テーパー値・名前保持・異常系", () => {
approx(
call("spec.taper", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.2]),
[0.1464466094067262, 1.7071067811865475, 3, 4, 5, 6, 7, 8, 7.681980515339464, 1.464466094067262],
);
approx(
call("spec.taper", [[1, 2, 3, 4], 0.5]),
[0.14644660940672621, 1.7071067811865475, 2.560660171779821, 0.5857864376269049],
);
assert.deepEqual(call("spec.taper", [["a"], 0]), ["a"]);
const named = [1, 2, 3, 4];
named.names = ["a", "b", "c", "d"];
assert.deepEqual(call("spec.taper", [named, 0.25]).names, ["a", "b", "c", "d"]);
callErr("spec.taper", [[1, 2, 3], 0.6], null, /'p' must be between 0 and 0.5/);
callErr("spec.taper", [[1, 2, 3], [0.1, 0.2]], null, /length of 'p' must be 1 or equal/);
});
