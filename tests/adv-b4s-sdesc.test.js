import { test} from "node:test";
import assert from "node:assert/strict";
import { referenceAdvanced as ref4} from "../js/types/r/reference-advanced-part4.js";
import { names as names4} from "../js/types/r/names-advanced-part4.js";
import { referenceAdvanced as refP1} from "../js/types/r/reference-advanced-part1.js";
import { referenceAdvanced as refP2} from "../js/types/r/reference-advanced-part2.js";
import { names as namesP1} from "../js/types/r/names-advanced-part1.js";
import { names as namesP2} from "../js/types/r/names-advanced-part2.js";
import { builtins} from "../js/types/r/functions-advanced-statsdesc.js";
import { definition} from "../js/types/r/index.js";

// 高度モード B4S・R stats 記述統計・集計班（sdesc）。
// 期待値は実 R 4.3.3（/usr/bin/Rscript）の実測（%.17g 採取）による。
// ハンドラは集約ファイルへの配線前なので、stest 班／.bincode の前例と
// 同じく fake ctx で直接検証する（H は js/types/r/index.js の実装を複製）。

const SLICE = [
"addmargins", "aggregate", "ave", "complete.cases", "cor", "cov",
"cov2cor", "var", "cov.wt", "ecdf", "plot.ecdf", "print.ecdf",
"quantile.ecdf", "summary.ecdf", "as.table.ftable", "ftable",
"ftable.formula", "format.ftable", "print.ftable", "read.ftable",
"write.ftable", "fivenum", "IQR", "mad", "quantile", "weighted.mean",
"weighted.mean.default", "print.xtabs", "xtabs", "setNames", "relevel",
"reorder", "reshape",
];
const SUPPORTED = [
"var", "cov", "cor", "quantile", "IQR", "fivenum", "mad",
"weighted.mean", "weighted.mean.default", "complete.cases", "setNames",
"ave",
];

// ============================================================
// 1. データ整合（分母・内訳・形式・重複）
// ============================================================
test("sdesc data: スライス全33名にちょうど1項目ずつ（スライス順）", () => {
assert.equal(ref4.length, 33);
assert.deepEqual(ref4.map((r) => r.name), SLICE);
assert.equal(new Set(ref4.map((r) => r.name)).size, 33);
});

test("sdesc data: 内訳は対応12／未対応21／未検証0", () => {
const count = (s) => ref4.filter((r) => r.status === s).length;
assert.equal(count("supported"), 12);
assert.equal(count("unsupported"), 21);
assert.equal(count("unverified"), 0);
assert.deepEqual(
ref4.filter((r) => r.status === "supported").map((r) => r.name).sort(),
[...SUPPORTED].sort(),
);
});

test("sdesc data: 正規形（7フィールドのみ）・未対応は理由を名指し", () => {
const KEYS = ["name", "category", "syntax", "description", "example", "caution", "status"];
const CATS = new Set([
"ベクトル", "行列・配列", "データフレーム", "文字列", "数値計算", "数学",
"統計", "確率分布", "ファイル", "型変換", "欠損値", "日時", "環境",
"グラフィックス", "集計",
]);
for (const r of ref4) {
assert.deepEqual(Object.keys(r), KEYS, r.name);
assert.ok(CATS.has(r.category), `${r.name}: ${r.category}`);
if (r.status === "unsupported")
assert.ok(r.description.includes("【未対応の理由】"), r.name);
if (r.status === "supported")
assert.ok(!r.description.includes("【未対応の理由】"), r.name);
}
});

test("sdesc data: names は33件全件（実在関数のみ・除外なし）・重複なし", () => {
assert.equal(names4.length, 33);
assert.deepEqual([...names4].sort(), [...SLICE].sort());
assert.equal(new Set(names4).size, names4.length);
const b4Names = new Set([...namesP1,...namesP2]);
const b4Items = new Set([...refP1,...refP2].map((r) => r.name));
const baseItems = new Set(definition.reference.map((r) => r.name));
for (const n of names4) {
assert.ok(!b4Names.has(n), `B4 names と重複: ${n}`);
assert.ok(!b4Items.has(n), `B4 項目と重複: ${n}`);
assert.ok(!baseItems.has(n), `基礎項目と重複: ${n}`);
}
for (const r of ref4) assert.ok(!b4Items.has(r.name), r.name);
});

test("sdesc data: ハンドラは対応12件のみ", () => {
assert.deepEqual([...builtins.keys()].sort(), [...SUPPORTED].sort());
});

// ============================================================
// 2. ハンドラ検証（fake ctx。H は index.js の複製）
// ============================================================
const NA = { kind: "NA"};
const UNKNOWN = { kind: "unknown"};
const H = {
NA,
vec: (v) => (v === null? []: Array.isArray(v)? v: [v]),
isNA: (v) => v?.kind === "NA",
isNaNVal: (v) => typeof v === "number" && Number.isNaN(v),
isMissing: (v) =>
v?.kind === "NA" || (typeof v === "number" && Number.isNaN(v)),
namesOf: (v) => (Array.isArray(v) && Array.isArray(v.names)? v.names: null),
withNames: (arr, names) => {
if (names) arr.names = [...names];
return arr;
},
show: (v) => {
if (v === null) return "NULL";
if (v?.kind === "NA") return "NA";
if (v?.kind === "data.frame")
return `data.frame(${Object.keys(v.columns).join(", ")})`;
if (Array.isArray(v))
return v.length === 1? H.show(v[0]): `c(${v.map((e) => H.show(e)).join(", ")})`;
if (typeof v === "string") return `"${v}"`;
return String(v);
},
formatRNum: (n) => {
if (Number.isNaN(n)) return "NaN";
if (n === Infinity) return "Inf";
if (n === -Infinity) return "-Inf";
if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
return String(Number(n.toPrecision(15)));
},
dfNrow: (df) => {
const cols = Object.values(df.columns);
if (cols.length) return cols[0].length;
return Array.isArray(df.rowNames)? df.rowNames.length: 0;
},
unknown: () => UNKNOWN,
isUnknown: (v) => v?.kind === "unknown",
};
function fakeCtx(name, vals, argNames) {
const warnings = [];
const ctx = {
name,
args: vals.map((_, i) => ({ argName: argNames?.[i]?? null})),
vals,
named: {},
pos: [],
api: {
fail: (msg) => {
throw new Error(msg);
},
note: (s, node, text) => warnings.push(text),
},
s: null,
node: null,
H,
warnings,
matchArgs(formals) {
const out = {};
const namedIdx = new Map();
ctx.args.forEach((a, i) => {
if (a.argName && formals.includes(a.argName) &&!namedIdx.has(a.argName))
namedIdx.set(a.argName, i);
});
for (const f of formals)
if (namedIdx.has(f))
out[f] = { present: true, value: vals[namedIdx.get(f)]};
let fi = 0;
ctx.args.forEach((a, i) => {
if (a.argName) return;
while (fi < formals.length && out[formals[fi]]) fi++;
if (fi < formals.length)
out[formals[fi++]] = { present: true, value: vals[i]};
});
return out;
},
};
vals.forEach((v, i) => {
const nm = argNames?.[i];
if (nm) ctx.named[nm] = v;
else ctx.pos.push(v);
});
return ctx;
}
const call = (name, vals, argNames) =>
builtins.get(name)(fakeCtx(name, vals, argNames));
const approx = (got, exp, label) => {
if (exp === NA) {
assert.equal(got, NA, `${label}: got ${got}, expected NA`);
return;
}
if (typeof exp === "number") {
if (Number.isNaN(exp)) {
assert.ok(Number.isNaN(got), `${label}: got ${got}, expected NaN`);
return;
}
assert.ok(
typeof got === "number" &&
Math.abs(got - exp) <= 1e-12 * Math.max(1, Math.abs(exp)),
`${label}: got ${got}, expected ${exp}`,
);
return;
}
assert.equal(got.length, exp.length, label);
exp.forEach((e, i) => {
const g = got[i];
if (e === NA) assert.equal(g, NA, `${label}[${i}]`);
else if (typeof e === "number" && Number.isNaN(e))
assert.ok(Number.isNaN(g), `${label}[${i}]`);
else if (typeof e === "number")
assert.ok(
Math.abs(g - e) <= 1e-12 * Math.max(1, Math.abs(e)),
`${label}[${i}]: got ${g}, expected ${e}`,
);
else assert.equal(g, e, `${label}[${i}]`);
});
};
const errMatch = (fn, re, label) =>
assert.throws(fn, (e) => re.test(e.message), label);

// ---- var / cov / cor ----
test("sdesc var/cov/cor: 典型（実 R 実測）", () => {
approx(call("var", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]), 9.1666666666666661, "var");
approx(call("cov", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]), 9.1666666666666661, "cov");
approx(call("cor", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]), 0.99999999999999978, "cor lin");
approx(call("cor", [[1, 2, 3, 4, 5], [2, 1, 4, 3, 5]]), 0.79999999999999982, "cor p");
approx(call("var", [[1, NA, 3], true], [null, "na.rm"]), 2, "var na.rm");
// var は文字列を数値へ変換する（C の coerceVector）
approx(call("var", [["1", "2", "3"]]), 1, "var char");
});

test("sdesc var/cov/cor: kendall／spearman（実 R 実測）", () => {
// cov の kendall は未正規化の 2(C-D)、cor は tau-b
approx(call("cov", [[1, 2, 3, 4], [2, 1, 4, 3], "kendall"], [null, null, "method"]), 4, "cov kendall");
approx(call("cor", [[1, 2, 3, 4], [2, 1, 4, 3], "kendall"], [null, null, "method"]), 0.33333333333333337, "cor kendall");
approx(call("cov", [[1, 1, 2, 3], [1, 2, 2, 3], "kendall"], [null, null, "method"]), 8, "cov kendall ties");
approx(call("cor", [[1, 1, 2, 3], [1, 2, 2, 3], "kendall"], [null, null, "method"]), 0.79999999999999982, "cor kendall ties");
approx(call("cor", [[1, 2, 3, 4, 5], [5, 6, 7, 8, 7], "spearman"], [null, null, "method"]), 0.82078268166812329, "cor spearman");
approx(call("cov", [[1, 2, 3, 4, 5], [5, 6, 7, 8, 7], "spearman"], [null, null, "method"]), 2, "cov spearman");
// method の前方一致
approx(call("cor", [[1, 2, 3, 4], [2, 1, 4, 3], "k"], [null, null, "method"]), 0.33333333333333337, "cor k");
});

test("sdesc var/cov/cor: use の各値と欠損（境界）", () => {
approx(call("cor", [[1, 2, NA, 4], [1, NA, 3, 4], "pairwise.complete.obs"], [null, null, "use"]), 1, "cor pairwise");
approx(call("cov", [[1, 2, NA, 4], [1, NA, 3, 4], "pairwise.complete.obs"], [null, null, "use"]), 4.5, "cov pairwise");
approx(call("var", [[1, NA, 3], "everything"], [null, "use"]), NA, "var everything NA");
// use 明示時は na.rm が無視される
approx(call("var", [[1, NA, 3], null, true, "everything"], [null, null, "na.rm", "use"]), NA, "var use>na.rm");
approx(call("var", [[NA, NA], "na.or.complete"], [null, "use"]), NA, "var na.or.complete");
approx(call("var", [[]]), NA, "var empty");
approx(call("var", [[5]]), NA, "var n=1");
errMatch(() => call("var", [[NA, NA], "complete.obs"], [null, "use"]), /no complete element pairs/, "var complete empty");
errMatch(() => call("var", [[1, NA, 3], "all.obs"], [null, "use"]), /missing observations in cov\/cor/, "var all.obs NA");
errMatch(() => call("var", [[], "all.obs"], [null, "use"]), /'x' is empty/, "var all.obs empty");
errMatch(() => call("var", [[1, 2], "bogus"], [null, "use"]), /invalid 'use' argument/, "var use invalid");
});

test("sdesc var/cov/cor: 異常系", () => {
errMatch(() => call("cov", [[1, 2, 3]]), /supply both 'x' and 'y'/, "cov single");
errMatch(() => call("cor", [[1, 2, 3]]), /supply both 'x' and 'y'/, "cor single");
errMatch(() => call("cov", [[1, 2], [1, 2, 3]]), /incompatible dimensions/, "cov dims");
errMatch(() => call("cor", [["a", "b"], [1, 2]]), /'x' must be numeric/, "cor char x");
errMatch(() => call("cor", [[1, 2], ["a", "b"]]), /'y' must be numeric/, "cor char y");
errMatch(() => call("cov", [["a", "b"], [1, 2]]), /is\.numeric\(x\) \|\| is\.logical\(x\) is not TRUE/, "cov char x");
errMatch(() => call("var", [null]), /'x' is NULL/, "var NULL");
errMatch(
() => call("cov", [[1, 2, 3], [1, 2, 3], "pairwise.complete.obs", "kendall"], [null, null, "use", "method"]),
/cannot handle 'pairwise\.complete\.obs'/,
"cov kendall pairwise",
);
// 標準偏差0 → NA＋警告
const ctx = fakeCtx("cor", [[2, 2, 2], [1, 2, 3]], [null, null]);
assert.equal(builtins.get("cor")(ctx), NA);
assert.ok(ctx.warnings.some((w) => w.includes("the standard deviation is zero")));
});

// ---- quantile / IQR ----
const XQ = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
const QPROBS = [0, 0.25, 0.5, 0.75, 1];
const QEXP = {
1: [1, 2, 3, 5, 9],
2: [1, 2, 3.5, 5, 9],
3: [1, 1, 3, 5, 9],
4: [1, 1.5, 3, 5, 9],
5: [1, 2, 3.5, 5, 9],
6: [1, 1.75, 3.5, 5.25, 9],
7: [1, 2.25, 3.5, 5, 9],
8: [1, 1.9166666666666665, 3.4999999999999991, 5.0833333333333321, 9],
9: [1, 1.9375, 3.5, 5.0625, 9],
};
test("sdesc quantile: type 1〜9 全型式（実 R 実測）", () => {
for (let t = 1; t <= 9; t++)
approx(
call("quantile", [XQ, QPROBS, false, t], [null, "probs", "names", "type"]),
QEXP[t],
`type ${t}`,
);
});

test("sdesc quantile: 既定・名前・digits（典型）", () => {
const q = call("quantile", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]);
approx(q, [1, 3.25, 5.5, 7.75, 10], "quantile default");
assert.deepEqual(q.names, ["0%", "25%", "50%", "75%", "100%"]);
const q2 = call("quantile", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1 / 3, 2 / 3]], [null, "probs"]);
approx(q2, [4, 7], "quantile thirds");
assert.deepEqual(q2.names, ["33.33333%", "66.66667%"]);
const q3 = call("quantile", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1 / 3, 2], [null, "probs", "digits"]);
assert.deepEqual(q3.names, ["33%"]);
const q4 = call("quantile", [[1, 2, 3, 4, 5], [0.5, NA]], [null, "probs"]);
approx(q4, [3, NA], "quantile NA prob");
assert.deepEqual(q4.names, ["50%", ""]);
});

test("sdesc quantile: 境界・異常", () => {
approx(call("quantile", [[]]), [NA, NA, NA, NA, NA], "quantile empty");
assert.deepEqual(call("quantile", [[1, 2, 3], null], [null, "probs"]), [], "probs NULL");
approx(call("quantile", [["b", "a", "c"], [0, 0.5, 1], 1], [null, "probs", "type"]), ["a", "b", "c"], "char type1");
// 補間位置の両端が同じ値なら選択で返り、異なる場合だけエラー（実 R 実測）
approx(call("quantile", [["b", "a", "c"], [0.25], 4], [null, "probs", "type"]), ["a"], "char type4 same ends");
errMatch(
() => call("quantile", [["b", "a", "c"], [0.5], 4], [null, "probs", "type"]),
/non-numeric argument to binary operator/,
"char type4 interp",
);
errMatch(() => call("quantile", [[1, NA, 3]]), /missing values and NaN's not allowed/, "quantile NA");
errMatch(
() => call("quantile", [[1, 2, 3], [1.5]], [null, "probs"]),
/'probs' outside \[0,1\]/,
"probs outside",
);
errMatch(
() => call("quantile", [[1, 2, 3], [0.5], 0], [null, "probs", "type"]),
/'type' must be in 1:9/,
"type 0",
);
approx(call("IQR", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]), 4.5, "IQR");
approx(call("IQR", [XQ, 3], [null, "type"]), 4, "IQR type3");
approx(call("IQR", [["1", "2", "3", "4"]]), 1.5, "IQR char coerce");
approx(call("IQR", [[]]), NA, "IQR empty");
});

// ---- fivenum / mad ----
test("sdesc fivenum/mad: 典型と境界（実 R 実測）", () => {
approx(call("fivenum", [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]), [1, 3, 5.5, 8, 10], "fivenum");
approx(call("fivenum", [[3, 1, 4, 1, 5, 9, 2, 6]]), [1, 1.5, 3.5, 5.5, 9], "fivenum x");
approx(call("fivenum", [[]]), [NA, NA, NA, NA, NA], "fivenum empty");
approx(call("fivenum", [[1, NA, 3], false], [null, "na.rm"]), [NA, NA, NA, NA, NA], "fivenum na.rm FALSE");
errMatch(() => call("fivenum", [["a", "b"]]), /non-numeric argument/, "fivenum char");
approx(call("mad", [[1, 2, 3, 4, 5, 6, 7, 8, 9]]), 2.9651999999999998, "mad");
approx(call("mad", [[1, 2, 3, 5, 7, 8], 1], [null, "constant"]), 2.5, "mad c1");
approx(call("mad", [[1, 2, 3, 5, 7, 8], 1, true], [null, "constant", "low"]), 2, "mad low");
approx(call("mad", [[1, 2, 3, 5, 7, 8], 1, true], [null, "constant", "high"]), 3, "mad high");
approx(call("mad", [[]]), NA, "mad empty");
approx(call("mad", [[5]]), 0, "mad n=1");
// 奇数 n では low&high 両方 TRUE でもエラーにならない（実測）
approx(call("mad", [[1, 2, 3, 4, 5], true, true], [null, "low", "high"]), 1.4826, "mad both odd");
errMatch(
() => call("mad", [[1, 2, 3, 4], true, true], [null, "low", "high"]),
/'low' and 'high' cannot be both TRUE/,
"mad both even",
);
});

// ---- weighted.mean ----
test("sdesc weighted.mean: 典型・境界・異常（実 R 実測）", () => {
approx(
call("weighted.mean", [[3.7, 3.3, 3.5, 2.8], [5 / 15, 5 / 15, 4 / 15, 1 / 15]]),
3.4533333333333331,
"wm",
);
approx(call("weighted.mean.default", [[1, 2], [1, 3]]), 1.75, "wm.default");
approx(call("weighted.mean", [[1, 2, 3]]), 2, "wm no w");
// 重み0の要素は x が NA でも除かれる
approx(call("weighted.mean", [[NA, 2], [0, 1]]), 2, "wm zero-weight NA");
// na.rm は x のペアだけを除く（w の NA は残る）
approx(call("weighted.mean", [[1, NA, 3], [1, 1, 1], true], [null, null, "na.rm"]), 2, "wm na.rm");
approx(call("weighted.mean", [[1, 2], [1, NA]]), NA, "wm w NA");
approx(call("weighted.mean", [[]]), NaN, "wm empty");
// 3番目の位置引数は... に入り na.rm に効かない
approx(call("weighted.mean", [[1, NA, 3], [1, 1, 1], true]), NA, "wm positional na.rm trap");
errMatch(() => call("weighted.mean", [[1, 2], [1]]), /'x' and 'w' must have the same length/, "wm length");
errMatch(() => call("weighted.mean", [["a", "b"], [1, 1]]), /non-numeric argument/, "wm char");
});

// ---- complete.cases / setNames ----
test("sdesc complete.cases: 典型・境界・異常", () => {
assert.deepEqual(call("complete.cases", [[1, NA, 3]]), [true, false, true]);
assert.deepEqual(call("complete.cases", [[1, NA, 3], [1, 2, NA]]), [true, false, false]);
assert.deepEqual(call("complete.cases", [[NaN, 1]]), [false, true]);
assert.deepEqual(call("complete.cases", [[]]), []);
const df = {
kind: "data.frame",
columns: { a: [1, NA, 3], b: [4, 5, 6]},
rowNames: ["1", "2", "3"],
};
assert.deepEqual(call("complete.cases", [df]), [true, false, true]);
errMatch(() => call("complete.cases", []), /no input has determined the number of cases/, "cc none");
errMatch(() => call("complete.cases", [null]), /no input has determined the number of cases/, "cc NULL");
errMatch(() => call("complete.cases", [[1, 2], [1, 2, 3]]), /not all arguments have the same length/, "cc length");
});

test("sdesc setNames: 典型・境界・異常", () => {
const r1 = call("setNames", [[1, 2, 3], ["foo", "bar", "baz"]]);
assert.deepEqual([...r1], [1, 2, 3]);
assert.deepEqual(r1.names, ["foo", "bar", "baz"]);
const r2 = call("setNames", [[1, 2, 3], ["a"]]);
// F6 修正（監査指摘）：不足分の名前は実 R 4.3.3 実測で NA 埋め
// （names(setNames(c(1, 2, 3), "a")) は "a", NA, NA）。旧期待値の
// null は表示層で "" に化ける誤りだったため、実測根拠により NA へ変更。
assert.deepEqual(r2.names, ["a", NA, NA]);
const r3 = call("setNames", [["First", "2nd"]], ["nm"]);
assert.deepEqual([...r3], ["First", "2nd"]);
assert.deepEqual(r3.names, ["First", "2nd"]);
assert.equal(call("setNames", [null, null]), null);
const df = { kind: "data.frame", columns: { a: [1, 2], b: [3, 4]}, rowNames: ["1", "2"]};
const rd = call("setNames", [df, ["x", "y"]]);
assert.deepEqual(Object.keys(rd.columns), ["x", "y"]);
errMatch(
() => call("setNames", [[1, 2], ["a", "b", "c"]]),
/'names' attribute \[3\] must be the same length as the vector \[2\]/,
"setNames long nm",
);
errMatch(() => call("setNames", []), /argument "nm" is missing/, "setNames no args");
});

// ---- ave ----
test("sdesc ave: 典型・境界・異常（実 R 実測）", () => {
approx(call("ave", [[1, 2, 3, 4], ["a", "a", "b", "b"]]), [1.5, 1.5, 3.5, 3.5], "ave groups");
approx(call("ave", [[1, 2, 10, 20], ["x", "x", "y", "y"], "sum"], [null, null, "FUN"]), [3, 3, 30, 30], "ave FUN sum");
// グループ化変数が NA の要素は単独グループ
approx(call("ave", [[10, 200, 300, 30], ["a", NA, NA, "a"]]), [20, 200, 300, 20], "ave NA group");
// FUN の結果はリサイクルされる（警告つき）
const ctx = fakeCtx("ave", [[1, 5, 9], "range"], [null, "FUN"]);
approx(builtins.get("ave")(ctx), [1, 9, 1], "ave range recycle");
assert.ok(ctx.warnings.some((w) => w.includes("number of items to replace")));
// 文字グループへの mean は NA＋警告
const ctx2 = fakeCtx("ave", [["a", "b"], ["g", "g"]], [null, null]);
assert.deepEqual(builtins.get("ave")(ctx2), [NA, NA]);
assert.ok(ctx2.warnings.some((w) => w.includes("not numeric or logical")));
// FUN は文字列指定のみ
errMatch(() => call("ave", [[1, 2], "bogus"], [null, "FUN"]), /FUN として使えるのは/, "ave FUN bogus");
errMatch(() => call("ave", [[1, 2], 42], [null, "FUN"]), /FUN は関数値では渡せません/, "ave FUN non-string");
});
