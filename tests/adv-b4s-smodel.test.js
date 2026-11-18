import { test} from "node:test";
import assert from "node:assert/strict";
import { getDefinition} from "../js/types/registry.js";
import { referenceAdvanced} from "../js/types/r/reference-advanced-part6.js";
import { names as namesPart6} from "../js/types/r/names-advanced-part6.js";
import { builtins} from "../js/types/r/functions-advanced-statsmodel.js";
import { referenceAdvanced as refP1} from "../js/types/r/reference-advanced-part1.js";
import { referenceAdvanced as refP2} from "../js/types/r/reference-advanced-part2.js";
import { names as namesP1} from "../js/types/r/names-advanced-part1.js";
import { names as namesP2} from "../js/types/r/names-advanced-part2.js";
import { definition} from "../js/types/r/index.js";

// 高度モード B4S・R stats モデル系（smodel 班）。
// 実装は na.fail／na.omit／na.pass／offset の4関数のみで、期待値は
// 実 R 4.3.3 の実走出力から導いた（報告書 docs/audit/ADV-B4S-smodel.md）。
// 未対応項目は「名指しで停止し、誤った値を返さない」ことを固定する。

const run = async (code, model) => {
const d = getDefinition("r");
return d.simulate(code, structuredClone(model?? d.model.defaults));
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
return [r.error,...(r.paths || []).map((p) => p.error)].filter(Boolean);
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

// ---- ハンドラ直接検証（fake ctx） ----
// 集約ファイルへの配線はコーディネーター担当のため、.bincode／stest の
// 前例に従い fake ctx でハンドラを直接検証する。期待値は実 R 4.3.3 の
// 実走で採取した（na.omit が NaN も除くこと、na.fail(NULL) の専用
// メッセージ、offset の unused argument 等）。なお simulate 経由の
// end-to-end 検証は一時配線して全件合格を確認済み（報告書に記録）。
const NAf = { kind: "NA" };
const fakeCtx = (name, vals, argNames) => ({
  name,
  args: vals.map((_, i) => ({ argName: argNames?.[i] ?? null })),
  vals,
  named: {},
  pos: vals,
  api: {
    fail: (msg) => { throw new Error(msg); },
    note: () => {},
  },
  s: null,
  node: null,
  H: {
    vec: (v) => (v === null || v === undefined ? [] : Array.isArray(v) ? v : [v]),
    isNA: (v) => v?.kind === "NA",
    isNaNVal: (v) => typeof v === "number" && Number.isNaN(v),
    isMissing: (v) => v?.kind === "NA" || (typeof v === "number" && Number.isNaN(v)),
    namesOf: (v) => (Array.isArray(v) && Array.isArray(v.names) ? v.names : null),
    withNames: (arr, names) => { if (names) arr.names = [...names]; return arr; },
    dfNrow: (v) => Array.isArray(v?.rowNames) ? v.rowNames.length : (Object.values(v?.columns ?? {})[0]?.length ?? 0),
    show: (v) => v === null ? "NULL" : v?.kind === "NA" ? "NA" : typeof v === "string" ? '"' + v + '"' : Array.isArray(v) ? "c(" + v.map((e) => (e?.kind === "NA" ? "NA" : String(e))).join(", ") + ")" : String(v),
  },
});
const callH = (name, vals, argNames) => builtins.get(name)(fakeCtx(name, vals, argNames));
const named = (els, ns) => { const a = [...els]; a.names = [...ns]; return a; };
const dfOf = (columns, rowNames) => ({ kind: "data.frame", columns, ...(rowNames ? { rowNames } : {}) });

test("smodel na.omit vectors (fake ctx)", () => {
  assert.deepEqual(callH("na.omit", [[1, NAf, 3]]), [1, 3]);
  // 実 R：NaN も欠損として除去される
  assert.deepEqual(callH("na.omit", [[1, NaN, NAf, 2]]), [1, 2]);
  const r = callH("na.omit", [named([1, NAf, 3], ["a", "b", "c"])]);
  assert.deepEqual([...r], [1, 3]);
  assert.deepEqual(r.names, ["a", "c"]);
  assert.deepEqual(callH("na.omit", [["x", NAf, "y"]]), ["x", "y"]);
  assert.deepEqual(callH("na.omit", [[true, NAf, false]]), [true, false]);
  // 除去が無ければ入力をそのまま返す（スカラの形を変えない）
  assert.equal(callH("na.omit", [5]), 5);
  assert.deepEqual(callH("na.omit", [[1, 2, 3]]), [1, 2, 3]);
  assert.deepEqual(callH("na.omit", [[NAf]]), []);
  assert.equal(callH("na.omit", [null]), null);
  // 名前付き・部分一致・... の余分な引数（実 R どおり無視）
  assert.deepEqual(callH("na.omit", [[1, NAf, 2]], ["obj"]), [1, 2]);
  assert.deepEqual(callH("na.omit", [[1, NAf, 2], 1], [null, "foo"]), [1, 2]);
  assert.throws(() => callH("na.omit", []), /argument "object" is missing/);
});
test("smodel na.omit data frames (fake ctx)", () => {
  const df = dfOf({ x: [1, 2, 3], y: [0, 10, NAf] }, ["1", "2", "3"]);
  const r = callH("na.omit", [df]);
  assert.deepEqual(r.columns, { x: [1, 2], y: [0, 10] });
  assert.deepEqual(r.rowNames, ["1", "2"]);
  const df2 = dfOf({ x: [1, 2], y: ["a", NAf] });
  assert.deepEqual(callH("na.omit", [df2]).columns, { x: [1], y: ["a"] });
  const df3 = dfOf({ x: [1, 2], y: [3, 4] });
  assert.equal(callH("na.omit", [df3]), df3);
});
test("smodel na.fail (fake ctx)", () => {
  assert.deepEqual(callH("na.fail", [[1, 2]]), [1, 2]);
  assert.throws(() => callH("na.fail", [[1, NAf]]), /missing values in object/);
  // 実 R：NaN でも同じエラー
  assert.throws(() => callH("na.fail", [[1, NaN]]), /missing values in object/);
  assert.throws(() => callH("na.fail", [dfOf({ x: [1, NAf] })]), /missing values in object/);
  // 実 R：NULL は専用メッセージ
  assert.throws(() => callH("na.fail", [null]), /no input has determined the number of cases/);
  assert.throws(() => callH("na.fail", []), /argument "object" is missing/);
  assert.deepEqual(callH("na.fail", [[1, 2], 1], [null, "foo"]), [1, 2]);
  // 組み合わせ：na.omit の結果は na.fail を通る
  assert.deepEqual(callH("na.fail", [callH("na.omit", [[1, NAf, 3]])]), [1, 3]);
});
test("smodel na.pass (fake ctx)", () => {
  assert.deepEqual(callH("na.pass", [[1, NAf, 3]]), [1, NAf, 3]);
  assert.equal(callH("na.pass", [null]), null);
  assert.equal(callH("na.pass", [5]), 5);
  assert.throws(() => callH("na.pass", []), /argument "object" is missing/);
});
test("smodel offset identity (fake ctx)", () => {
  // 公式ヘルプの Value は "The input value"（恒等）
  assert.deepEqual(callH("offset", [[1, 2, 3]]), [1, 2, 3]);
  assert.equal(callH("offset", [5]), 5);
  assert.equal(callH("offset", [null]), null);
  assert.equal(callH("offset", ["a"]), "a");
  const df = dfOf({ x: [1, 2] });
  assert.equal(callH("offset", [df]), df);
  assert.deepEqual(callH("offset", [[1, 2]], ["object"]), [1, 2]);
  assert.throws(() => callH("offset", []), /argument "object" is missing/);
  // ... を持たないため実 R どおり unused argument
  assert.throws(() => callH("offset", [1, 2]), /unused argument \(2\)/);
});

// ---- 未対応の名指し停止（モデル適合・抽出子・最適化・family 等） ----
// 呼び出し形で書ける未対応名は全件、エンジンの名指し停止文言で止まること。
const STOP_NAMES = [
"AIC", "BIC", "add1", "drop1", "alias", "anova", "anova.glm", "anova.lm",
"anova.mlm", "aov", "Error", "print.aov", "asOneSidedFormula", "case.names",
"case.names.lm", "variable.names", "variable.names.lm", "coef",
"coef.default", "coefficients", "confint", "constrOptim", "contr.helmert",
"contr.poly", "contr.SAS", "contr.sum", "contr.treatment", "contrasts",
"delete.response", "drop.terms", "reformulate", "D", "deriv", "deriv3",
"deviance", "df.residual", "dummy.coef", "dummy.coef.lm", "eff.aovlist",
"effects", "expand.model.frame", "extractAIC", "binomial", "family",
"Gamma", "gaussian", "inverse.gaussian", "poisson", "quasi",
"quasibinomial", "quasipoisson", "fitted.values", "as.formula",
"DF2formula", "formula", "print.formula", "formula.nls", "getInitial",
"glm", "weights.glm", "glm.control", "family.glm", "residuals.glm",
"cooks.distance", "cooks.distance.lm", "covratio", "dfbeta", "dfbetas",
"dffits", "hat", "hatvalues", "influence.measures", "rstandard",
"rstudent", "integrate", "print.integrate", "is.empty.model", "lm",
"print.lm", "influence", "lm.influence", "qr.influence", "family.lm",
"formula.lm", "labels.lm", "residuals.lm", "lm.fit", "lm.wfit", "logLik",
"ls.diag", "ls.print", "lsfit", "make.link", "makepredictcall", "manova",
"model.extract", "model.offset", "model.response", "model.weights",
"get_all_vars", "model.frame", "model.matrix", "model.tables",
"na.action", "na.contiguous", "na.exclude", "napredict", "naresid",
"naprint", "nlm", "nlminb", "nls", "nls.control", "NLSstAsymptotic",
"NLSstClosestX", "NLSstLfAsymptote", "NLSstRtAsymptote", "nobs",
"numericDeriv", "optim", "optimHess", "optimise", "optimize",
"makepredictcall.poly", "poly", "polym", "predict.poly", "pairs.profile",
"plot.profile", "plot.profile.nls", "predict", "predict.glm",
"predict.lm", "predict.nls", "printCoefmat", "profile", "profile.glm",
"profile.nls", "proj", "replications", "resid", "residuals",
"residuals.default", "se.contrast", "se.contrast.aov", "selfStart",
"sigma", "simulate", "SSasymp", "SSasympOff", "SSasympOrig", "SSbiexp",
"SSfol", "SSfpl", "SSgompertz", "SSlogis", "SSmicmen", "SSweibull",
"stat.anova", "step", "print.summary.aov", "summary.aov",
"print.summary.glm", "summary.glm", "print.summary.lm", "summary.lm",
"print.summary.manova", "summary.manova", "print.summary.nls",
"summary.nls", "termplot", "labels.terms", "terms", "terms.formula",
"uniroot", "getCall", "update", "update.formula", "vcov", "vcov.lme",
"vcov.summary.lm", "weighted.residuals", "weights",
];
test("smodel unsupported names stop by name", async () => {
for (const n of STOP_NAMES) {
await errMatch(
`print(${n}(1))`,
new RegExp("このR関数は説明に対応していません：" + n.replace(/\./g, "\\.")),
);
}
});
// ドット始まり名はパーサ段階で名指し停止する（実測：式を解釈できません）
test("smodel dot names stop at parser", async () => {
for (const n of [".checkMFClasses", ".getXlevels", ".MFclass", ".lm.fit", ".vcov.aliased"]) {
await errMatch(`${n}(1)`, /式を解釈できません/);
}
});
// 関数として存在しない見出し名は、値として読んでも未定義で止まる
test("smodel non-function headings stop as undefined", async () => {
await errMatch("print(SafePrediction)", /未定義の名前：SafePrediction/);
await errMatch("print(terms.object)", /未定義の名前：terms\.object/);
});

const SLICE_ORDER = ["AIC", "BIC", "add1", "drop1", "alias", "anova", "anova.glm", "anova.lm", "anova.mlm", "aov", "Error", "print.aov", "asOneSidedFormula", "case.names", "case.names.lm", "variable.names", "variable.names.lm", ".checkMFClasses", ".getXlevels", ".MFclass", "coef", "coef.default", "coefficients", "confint", "constrOptim", "contr.helmert", "contr.poly", "contr.SAS", "contr.sum", "contr.treatment", "contrasts", "delete.response", "drop.terms", "reformulate", "[.terms", "D", "deriv", "deriv3", "deviance", "df.residual", "dummy.coef", "dummy.coef.lm", "eff.aovlist", "effects", "expand.model.frame", "extractAIC", "binomial", "family", "Gamma", "gaussian", "inverse.gaussian", "poisson", "quasi", "quasibinomial", "quasipoisson", "fitted.values", "as.formula", "DF2formula", "formula", "print.formula", "[.formula", "formula.nls", "getInitial", "glm", "weights.glm", "glm.control", "family.glm", "residuals.glm", "cooks.distance", "cooks.distance.lm", "covratio", "dfbeta", "dfbetas", "dffits", "hat", "hatvalues", "influence.measures", "rstandard", "rstudent", "integrate", "print.integrate", "is.empty.model", "lm", "print.lm", "influence", "lm.influence", "qr.influence", "family.lm", "formula.lm", "labels.lm", "residuals.lm", "lm.fit", "lm.wfit", ".lm.fit", "logLik", "ls.diag", "ls.print", "lsfit", "make.link", "makepredictcall", "SafePrediction", "manova", "model.extract", "model.offset", "model.response", "model.weights", "get_all_vars", "model.frame", "model.matrix", "model.tables", "na.action", "na.contiguous", "na.exclude", "na.fail", "na.omit", "na.pass", "napredict", "naresid", "naprint", "nlm", "nlminb", "nls", "nls.control", "NLSstAsymptotic", "NLSstClosestX", "NLSstLfAsymptote", "NLSstRtAsymptote", "nobs", "numericDeriv", "offset", "optim", "optimHess", "optimise", "optimize", "makepredictcall.poly", "poly", "polym", "predict.poly", "pairs.profile", "plot.profile", "plot.profile.nls", "predict", "predict.glm", "predict.lm", "predict.nls", "printCoefmat", "profile", "profile.glm", "profile.nls", "proj", "replications", "resid", "residuals", "residuals.default", "se.contrast", "se.contrast.aov", "selfStart", "sigma", "simulate", "SSasymp", "SSasympOff", "SSasympOrig", "SSbiexp", "SSfol", "SSfpl", "SSgompertz", "SSlogis", "SSmicmen", "SSweibull", "stat.anova", "step", "print.summary.aov", "summary.aov", "print.summary.glm", "summary.glm", "print.summary.lm", "summary.lm", "print.summary.manova", "summary.manova", "print.summary.nls", "summary.nls", "termplot", "labels.terms", "terms", "terms.formula", "terms.object", "uniroot", "getCall", "update", "update.formula", "vcov", "vcov.lme", "vcov.summary.lm", ".vcov.aliased", "weighted.residuals", "weights"];

// ---- カタログ整合（F-02：項目⇔名前⇔ハンドラの3方向突き合わせ） ----
test("smodel catalog consistency", () => {
assert.equal(referenceAdvanced.length, 196);
const itemNames = referenceAdvanced.map((r) => r.name);
assert.equal(new Set(itemNames).size, 196);
// names は項目の部分集合で、186 件（除外10件は報告書に記録）
assert.equal(namesPart6.length, 186);
for (const n of namesPart6) assert.ok(itemNames.includes(n), n);
const excluded = itemNames.filter((n) =>!namesPart6.includes(n));
assert.deepEqual(
[...excluded].sort(),
[
"Error", "SafePrediction", "[.formula", "[.terms", "pairs.profile",
"plot.profile", "profile.glm", "qr.influence", "terms.object",
"vcov.lme",
].sort(),
);
// supported はちょうど実装4関数と一致する
const supported = referenceAdvanced
.filter((r) => r.status === "supported")
.map((r) => r.name)
.sort();
assert.deepEqual(supported, ["na.fail", "na.omit", "na.pass", "offset"]);
assert.deepEqual([...builtins.keys()].sort(), supported);
// 未対応項目は全件、理由が description に畳み込まれている
for (const r of referenceAdvanced) {
if (r.status === "unsupported")
assert.ok(r.description.includes(""), r.name);
assert.ok(["supported", "unsupported", "unverified"].includes(r.status), r.name);
assert.ok(r.syntax.length > 0 && r.example.length > 0, r.name);
}
// STOP_NAMES 台帳と未対応項目が一致する（ドット名・見出し名を除く）
const unsupported = referenceAdvanced
.filter((r) => r.status === "unsupported")
.map((r) => r.name);
assert.equal(unsupported.length, 192);
const special = [
".checkMFClasses", ".getXlevels", ".MFclass", ".lm.fit", ".vcov.aliased",
"[.terms", "[.formula", "SafePrediction", "terms.object",
];
assert.deepEqual(
[...STOP_NAMES].sort(),
unsupported.filter((n) =>!special.includes(n)).sort(),
);
});

test("smodel catalog form and duplicates", () => {
const KEYS = ["name", "category", "syntax", "description", "example", "caution", "status"];
for (const r of referenceAdvanced) {
assert.deepEqual(Object.keys(r), KEYS, r.name);
if (r.status === "supported")
assert.ok(!r.description.includes("【未対応の理由】"), r.name);
}
// スライス順どおりに項目が並ぶ
assert.deepEqual(referenceAdvanced.map((r) => r.name), SLICE_ORDER);
// B4（part1/part2）・基礎層との重複ゼロ
const b4Names = new Set([...namesP1, ...namesP2]);
const b4Items = new Set([...refP1, ...refP2].map((r) => r.name));
const baseItems = new Set(definition.reference.map((r) => r.name));
for (const n of namesPart6) {
assert.ok(!b4Names.has(n), "B4 names duplicate: " + n);
}
for (const r of referenceAdvanced) {
assert.ok(!b4Items.has(r.name), "B4 item duplicate: " + r.name);
assert.ok(!baseItems.has(r.name), "base item duplicate: " + r.name);
}
});
