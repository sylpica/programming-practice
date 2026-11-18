import { test} from "node:test";
import assert from "node:assert/strict";
import { getDefinition} from "../js/types/registry.js";
import { referenceAdvanced as ref5} from "../js/types/r/reference-advanced-part5.js";
import { names as names5} from "../js/types/r/names-advanced-part5.js";
import { referenceAdvanced as refP1} from "../js/types/r/reference-advanced-part1.js";
import { referenceAdvanced as refP2} from "../js/types/r/reference-advanced-part2.js";
import { names as namesP1} from "../js/types/r/names-advanced-part1.js";
import { names as namesP2} from "../js/types/r/names-advanced-part2.js";
import { builtins} from "../js/types/r/functions-advanced-statstest.js";
import { definition} from "../js/types/r/index.js";

// 高度モード B4S・R stats 検定班（stest）。
// 期待値は実 R 4.3.3（/usr/bin/Rscript）の実測：
// - 名前の実在は stats 名前空間の機械確認（getNamespaceExports／
// getFromNamespace）による。
// - p.adjust の期待値は実 R の出力（%.17g）を採取したもの。さらに
// 25ケース×全8方式＝200件のランダムバッテリで JS 実装と実 R を
// 突き合わせ全件一致を確認済み（報告書 ADV-B4S-stest.md）。
// p.adjust ハンドラは集約ファイルへの配線前なので、.bincode の前例
// （adv-b4-r-eng4.test.js）と同じく fake ctx で直接検証する。

const SLICE = [
"ansari.test", "bartlett.test", "binom.test", "Box.test", "TukeyHSD",
"chisq.test", "cor.test", "fisher.test", "fligner.test", "friedman.test",
"kruskal.test", "ks.test", "mantelhaen.test", "mauchly.test",
"mcnemar.test", "mood.test", "oneway.test", "poisson.test", "PP.test",
"prop.test", "prop.trend.test", "quade.test", "shapiro.test", "t.test",
"var.test", "wilcox.test", "pairwise.prop.test", "pairwise.t.test",
"pairwise.wilcox.test", "pairwise.table", "p.adjust", "p.adjust.methods",
"power", "power.anova.test", "power.prop.test", "power.t.test",
"print.htest", "print.power.htest",
];

// ============================================================
// 1. データ整合（分母・内訳・形式・重複）
// ============================================================
test("stest data: スライス全38名にちょうど1項目ずつ", () => {
assert.equal(ref5.length, 38);
assert.deepEqual(ref5.map((r) => r.name), SLICE);
assert.equal(new Set(ref5.map((r) => r.name)).size, 38);
});

test("stest data: 内訳は対応1／未対応37／未検証0", () => {
const count = (s) => ref5.filter((r) => r.status === s).length;
assert.equal(count("supported"), 1);
assert.equal(count("unsupported"), 37);
assert.equal(count("unverified"), 0);
assert.equal(ref5.find((r) => r.status === "supported").name, "p.adjust");
});

test("stest data: 正規形（6フィールドのみ）・未対応は理由を名指し", () => {
const KEYS = ["name", "category", "syntax", "description", "example", "caution", "status"];
for (const r of ref5) {
assert.deepEqual(Object.keys(r), KEYS, r.name);
if (r.status === "unsupported")
assert.ok(r.description.includes("【未対応の理由】"), r.name);
if (r.status === "supported")
assert.ok(!r.description.includes("【未対応の理由】"), r.name);
}
// 検定系の未対応理由は htest／pairwise.htest／power.htest の
// 構成要素に触れていること（機械的複写でないことの最低限の固定）。
for (const r of ref5) {
if (r.name === "p.adjust.methods")
assert.ok(r.description.includes("データオブジェクト"), r.name);
else if (r.name === "pairwise.table")
assert.ok(r.description.includes("関数オブジェクト"), r.name);
else if (r.name === "power")
assert.ok(r.description.includes("linkfun"), r.name);
else if (r.name === "TukeyHSD")
assert.ok(r.description.includes("aov"), r.name);
else if (r.status === "unsupported")
assert.ok(/htest/.test(r.description), r.name);
}
});

test("stest data: names は37件（p.adjust.methods のみ除外）・重複なし", () => {
assert.equal(names5.length, 37);
assert.deepEqual(
[...names5].sort(),
SLICE.filter((n) => n!== "p.adjust.methods").sort(),
);
assert.equal(new Set(names5).size, names5.length);
const b4Names = new Set([...namesP1,...namesP2]);
const b4Items = new Set([...refP1,...refP2].map((r) => r.name));
const baseItems = new Set(definition.reference.map((r) => r.name));
for (const n of names5) {
assert.ok(!b4Names.has(n), `B4 names と重複: ${n}`);
assert.ok(!b4Items.has(n), `B4 項目と重複: ${n}`);
assert.ok(!baseItems.has(n), `基礎項目と重複: ${n}`);
}
for (const r of ref5) assert.ok(!b4Items.has(r.name), r.name);
});

test("stest data: ハンドラは p.adjust のみ（未対応に到達可能な実装は無い）", () => {
assert.deepEqual([...builtins.keys()], ["p.adjust"]);
});

// ============================================================
// 2. p.adjust ハンドラ（fake ctx で直接検証。実 R 4.3.3 実測値）
// ============================================================
const NA = { kind: "NA"};
const fakeCtx = (vals, argNames) => {
const warnings = [];
const ctx = {
name: "p.adjust",
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
H: {
vec: (v) => (v === null? []: Array.isArray(v)? v: [v]),
isNA: (v) => v?.kind === "NA",
isNaNVal: (v) => typeof v === "number" && Number.isNaN(v),
isMissing: (v) => v?.kind === "NA" || (typeof v === "number" && Number.isNaN(v)),
namesOf: (v) => (Array.isArray(v) && Array.isArray(v.names)? v.names: null),
withNames: (arr, names) => {
if (names) arr.names = [...names];
return arr;
},
show: (v) => JSON.stringify(v),
NA,
},
warnings,
matchArgs(formals) {
const out = {};
let pos = 0;
vals.forEach((v, i) => {
const nm = argNames?.[i];
if (nm && formals.includes(nm)) out[nm] = { present: true, value: v};
else if (!nm) {
while (pos < formals.length && out[formals[pos]]) pos++;
if (pos < formals.length)
out[formals[pos++]] = { present: true, value: v};
}
});
return out;
},
};
return ctx;
};
const padjust = builtins.get("p.adjust");
const approx = (got, exp, label) => {
assert.equal(got.length, exp.length, label);
got.forEach((g, i) => {
const e = exp[i];
if (e === NA) assert.equal(g, NA, `${label}[${i}]`);
else if (typeof e === "number" && Number.isNaN(e))
assert.ok(Number.isNaN(g), `${label}[${i}]`);
else
assert.ok(
Math.abs(g - e) <= 1e-12 * Math.max(1, Math.abs(e)),
`${label}[${i}]: got ${g}, expected ${e}`,
);
});
};
const P1 = [0.01, 0.04, 0.03, 0.005, 0.2];

test("stest p.adjust: 全8方式（典型。実 R 実測）", () => {
approx(padjust(fakeCtx([P1, "holm"])), [0.04, 0.09, 0.09, 0.025, 0.2], "holm");
approx(padjust(fakeCtx([P1, "hochberg"])), [0.04, 0.08, 0.08, 0.025, 0.2], "hochberg");
approx(padjust(fakeCtx([P1, "hommel"])), [0.04, 0.08, 0.06, 0.025, 0.2], "hommel");
approx(padjust(fakeCtx([P1, "bonferroni"])), [0.05, 0.2, 0.15, 0.025, 1], "bonferroni");
approx(padjust(fakeCtx([P1, "BH"])), [0.025, 0.05, 0.05, 0.025, 0.2], "BH");
approx(
padjust(fakeCtx([P1, "BY"])),
[0.05708333333333333, 0.11416666666666667, 0.11416666666666665, 0.05708333333333333, 0.45666666666666667],
"BY",
);
approx(padjust(fakeCtx([P1, "fdr"])), [0.025, 0.05, 0.05, 0.025, 0.2], "fdr=BH");
approx(padjust(fakeCtx([P1, "none"])), P1, "none");
// 既定は holm、method 省略・NULL・全候補ベクトルでも holm。
approx(padjust(fakeCtx([P1])), [0.04, 0.09, 0.09, 0.025, 0.2], "default");
approx(padjust(fakeCtx([P1, null])), [0.04, 0.09, 0.09, 0.025, 0.2], "NULL");
approx(
padjust(fakeCtx([P1, ["holm", "hochberg", "hommel", "bonferroni", "BH", "BY", "fdr", "none"]])),
[0.04, 0.09, 0.09, 0.025, 0.2],
"fullvec",
);
});

test("stest p.adjust: hommel の長めのベクトルとタイ（実 R 実測）", () => {
approx(
padjust(fakeCtx([[0.001, 0.008, 0.02, 0.035, 0.04, 0.09, 0.5], "hommel"])),
[0.007, 0.048, 0.08, 0.105, 0.12, 0.18, 0.5],
"hommel7",
);
approx(
padjust(fakeCtx([[0.01, 0.01, 0.05, 0.05], "hommel"])),
[0.03, 0.03, 0.05, 0.05],
"hommel ties",
);
approx(
padjust(fakeCtx([[0.01, 0.01, 0.05, 0.05], "holm"])),
[0.04, 0.04, 0.1, 0.1],
"holm ties",
);
// n = 2 の hommel は hochberg に切り替わる（実 R 実測で同値）。
approx(padjust(fakeCtx([[0.01, 0.04], "hommel"])), [0.02, 0.04], "n2 hommel");
});

test("stest p.adjust: NA／NaN の保持と既定 n の癖（実 R 実測）", () => {
const pNA = [0.01, NA, 0.04, 0.03];
// 既定の n は NA を除いた長さ（lp = 3）になる（遅延評価の癖）。
approx(padjust(fakeCtx([pNA, "holm"])), [0.03, NA, 0.06, 0.06], "NA holm");
approx(padjust(fakeCtx([pNA, "BH"])), [0.03, NA, 0.04, 0.04], "NA BH");
approx(padjust(fakeCtx([pNA, "hommel"])), [0.03, NA, 0.04, 0.04], "NA hommel");
approx(padjust(fakeCtx([pNA, "bonferroni"])), [0.03, NA, 0.12, 0.09], "NA bonf");
// 明示した n はそのまま使われる。
approx(
padjust(fakeCtx([pNA, "holm", 4], [null, null, null])),
[0.04, NA, 0.09, 0.09],
"NA holm n=4",
);
// NaN も欠損として除外され、値は NaN のまま保持される。
approx(
padjust(fakeCtx([[0.01, NaN, 0.04], "holm"])),
[0.02, NaN, 0.04],
"NaN holm",
);
// 全て NA／長さ 0／長さ 1 はそのまま返る。
approx(padjust(fakeCtx([[NA, NA], "holm"])), [NA, NA], "allNA");
approx(padjust(fakeCtx([[], "holm"])), [], "empty");
approx(padjust(fakeCtx([0.05, "hommel"])), [0.05], "single");
});

test("stest p.adjust: n を大きくした場合（実 R 実測）", () => {
const call = (m, n) => padjust(fakeCtx([P1, m, n]));
approx(call("bonferroni", 10), [0.1, 0.4, 0.3, 0.05, 1], "n10 bonf");
approx(call("holm", 10), [0.09, 0.28, 0.24, 0.05, 1], "n10 holm");
approx(call("hochberg", 10), [0.09, 0.28, 0.24, 0.05, 1], "n10 hochberg");
approx(call("hommel", 10), [0.09, 0.28, 0.21, 0.05, 1], "n10 hommel");
approx(call("BH", 10), [0.05, 0.1, 0.1, 0.05, 0.4], "n10 BH");
approx(
call("BY", 10),
[0.14644841269841269, 0.29289682539682538, 0.29289682539682538, 0.14644841269841269, 1],
"n10 BY",
);
approx(
padjust(fakeCtx([[0.01, NA, 0.04, 0.03], "hommel", 7])),
[0.07, NA, 0.2, 0.15],
"n7 hommel NA",
);
});

test("stest p.adjust: 名前属性の引き継ぎ・型強制（実 R 実測）", () => {
const named = [0.01, 0.04, 0.03];
named.names = ["a", "b", "c"];
const out = padjust(fakeCtx([named, "BH"]));
approx(out, [0.03, 0.04, 0.04], "named BH");
assert.deepEqual(out.names, ["a", "b", "c"]);
// 文字列は as.numeric で強制変換される。
approx(padjust(fakeCtx([["0.01", "0.5"], "bonferroni"])), [0.02, 1], "char");
const badCtx = fakeCtx([["0.01", "x"], "bonferroni"]);
// 変換で NA になった要素は調整対象から外れ、既定の n は lp = 1 に
// なるため 0.01 はそのまま返る（実 R 4.3.3 実測 [0.01, NA]）。
approx(padjust(badCtx), [0.01, NA], "char bad");
assert.ok(badCtx.warnings.some((w) => w.includes("NAs introduced by coercion")));
// 論理値は 1／0 に変換される。
approx(padjust(fakeCtx([[true, false], "bonferroni"])), [1, 0], "logical");
});

test("stest p.adjust: 異常系（実 R の文言で停止する）", () => {
assert.throws(() => padjust(fakeCtx([P1, "h"])), /'arg' should be one of/);
assert.throws(() => padjust(fakeCtx([P1, "xyz"])), /'arg' should be one of/);
assert.throws(() => padjust(fakeCtx([P1, NA])), /'arg' should be one of/);
assert.throws(
() => padjust(fakeCtx([P1, ["holm", "BH"]])),
/'arg' must be of length 1/,
);
assert.throws(
() => padjust(fakeCtx([P1, 1])),
/'arg' must be NULL or a character vector/,
);
// 省略形（前方一致）は通る。
approx(padjust(fakeCtx([P1, "bonf"])), [0.05, 0.2, 0.15, 0.025, 1], "bonf");
// 引数名の部分一致（met → method）も実 R どおり通る。
approx(
padjust(fakeCtx([P1, "BH"], [null, "met"])),
[0.025, 0.05, 0.05, 0.025, 0.2],
"partial met",
);
// n < lp は stopifnot の文言で停止（n = 1 でも早期リターンにならない）。
assert.throws(() => padjust(fakeCtx([P1, "holm", 3])), /n >= lp is not TRUE/);
assert.throws(() => padjust(fakeCtx([P1, "holm", 1])), /n >= lp is not TRUE/);
// 余分な引数・必須引数の欠落。
assert.throws(
() => padjust(fakeCtx([P1, "holm", 5, 1], [null, null, null, "foo"])),
/unused argument \(foo = 1\)/,
);
assert.throws(() => padjust(fakeCtx([])), /argument "p" is missing/);
// データフレームは as.numeric で変換できない。
assert.throws(
() => padjust(fakeCtx([{ kind: "data.frame", columns: {}, rowNames: []}, "holm"])),
/'list' object cannot be coerced to type 'double'/,
);
});

// ============================================================
// 3. 未対応項目は simulate で名指し停止し、誤った値を返さない
// ============================================================
const run = async (code, model) => {
const d = getDefinition("r");
return d.simulate(code, structuredClone(model?? d.model.defaults));
};
const errOf = async (code, model) => {
const r = await run(code, model);
return [r.error,...(r.paths || []).map((p) => p.error)].filter(Boolean);
};

test("stest unsupported: 全37件が関数名を挙げて停止する", async () => {
for (const name of SLICE) {
if (name === "p.adjust") continue;
if (name === "p.adjust.methods") {
const errs = await errOf("p.adjust.methods");
assert.ok(
errs.some((e) => e.message.includes("p.adjust.methods")),
`p.adjust.methods: ${JSON.stringify(errs)}`,
);
continue;
}
const errs = await errOf(`${name}(c(1, 2, 3))`);
assert.ok(
errs.some((e) =>
e.message.includes(`このR関数は説明に対応していません：${name}`),
),
`${name}: ${JSON.stringify(errs)}`,
);
}
});
