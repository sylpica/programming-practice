import { test} from "node:test";
import assert from "node:assert/strict";
import { getDefinition} from "../js/types/registry.js";
import { referenceAdvanced as refP1} from "../js/types/r/reference-advanced-part1.js";
import { referenceAdvanced as refP2} from "../js/types/r/reference-advanced-part2.js";
// B4S（stats／utils 補完、2026-11-18）：part3〜part10 を監査範囲へ拡張。
import { referenceAdvanced as refP3} from "../js/types/r/reference-advanced-part3.js";
import { referenceAdvanced as refP4} from "../js/types/r/reference-advanced-part4.js";
import { referenceAdvanced as refP5} from "../js/types/r/reference-advanced-part5.js";
import { referenceAdvanced as refP6} from "../js/types/r/reference-advanced-part6.js";
import { referenceAdvanced as refP7} from "../js/types/r/reference-advanced-part7.js";
import { referenceAdvanced as refP8} from "../js/types/r/reference-advanced-part8.js";
import { referenceAdvanced as refP9} from "../js/types/r/reference-advanced-part9.js";
import { referenceAdvanced as refP10} from "../js/types/r/reference-advanced-part10.js";
import { names as namesP1} from "../js/types/r/names-advanced-part1.js";
import { names as namesP2} from "../js/types/r/names-advanced-part2.js";
import { names as namesP3} from "../js/types/r/names-advanced-part3.js";
import { names as namesP4} from "../js/types/r/names-advanced-part4.js";
import { names as namesP5} from "../js/types/r/names-advanced-part5.js";
import { names as namesP6} from "../js/types/r/names-advanced-part6.js";
import { names as namesP7} from "../js/types/r/names-advanced-part7.js";
import { names as namesP8} from "../js/types/r/names-advanced-part8.js";
import { names as namesP9} from "../js/types/r/names-advanced-part9.js";
import { names as namesP10} from "../js/types/r/names-advanced-part10.js";
import { advancedBuiltins} from "../js/types/r/functions-advanced.js";
import { referenceOverrides} from "../js/types/r/reference-advanced-overrides.js";
import { templatesAdvanced} from "../js/types/r/templates-advanced.js";
import { glossaryAdvanced} from "../js/types/r/glossary-advanced.js";
import { definition} from "../js/types/r/index.js";

// ADV-B4 R監査班テスト（報告書 docs/audit/ADV-B4-audit-r.md）。
// 宣言（reference／names）と実装（advancedBuiltins）の最終裁定が
// 一致していること、監査で新規実装・修正したハンドラが実 R 4.3.3 の
// 実測値と一致すること、契約チェック（advanced-interface.md 第11章）の
// R 分が満たされることを固定する。期待値はすべて実 R 4.3.3 の実測。

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
const warnsOf = (p) =>
(p.trace || []).filter((t) => t.kind === "warning").map((t) => t.text);

// B4S 拡張（2026-11-18）：ALL は part1〜part10 の全高度項目を指す。
// part1／part2 の確定件数（下記テスト）は不変。B4S 分は公式ヘルプ
// （R-devel）の stats／utils 索引から機械確定した分母 916 名
// （stats 595＋utils 321、既存カバー5名を除く）。
const B4S = [
...refP3,...refP4,...refP5,...refP6,...refP7,...refP8,...refP9,...refP10,
];
const ALL = [...refP1,...refP2,...B4S];
const byName = new Map(ALL.map((r) => [r.name, r]));
const count = (arr, s) => arr.filter((r) => r.status === s).length;

// ============================================================
// 1. 最終マトリクス（監査裁定の確定件数）
// ============================================================
test("audit-r: 最終件数（項目1085・対応240・未対応845・未検証0）", () => {
assert.equal(refP1.length, 618);
assert.equal(count(refP1, "supported"), 129);
assert.equal(count(refP1, "unsupported"), 489);
assert.equal(count(refP1, "unverified"), 0);
assert.equal(refP2.length, 467);
assert.equal(count(refP2, "supported"), 111);
assert.equal(count(refP2, "unsupported"), 356);
assert.equal(count(refP2, "unverified"), 0);
assert.equal(refP1.length + refP2.length, 1085);
assert.equal(count(refP1, "supported") + count(refP2, "supported"), 240);
assert.equal(count(refP1, "unsupported") + count(refP2, "unsupported"), 845);
// B4S 分（part3〜part10）：916項目・対応129・未対応787・未検証0。
assert.equal(B4S.length, 916);
assert.equal(count(B4S, "supported"), 129);
assert.equal(count(B4S, "unsupported"), 787);
assert.equal(count(B4S, "unverified"), 0);
assert.equal(ALL.length, 2001);
assert.equal(count(ALL, "supported"), 369);
assert.equal(count(ALL, "unsupported"), 1632);
assert.equal(count(ALL, "unverified"), 0);
// 未検証5件（format.info／grouping／.rangeNum／.unlist／
//.standard_regexps）は全件を未対応へ裁定し、未検証は0件。
for (const n of ["format.info", "grouping", ".rangeNum", ".unlist", ".standard_regexps"])
assert.equal(byName.get(n).status, "unsupported", n);
});

// ============================================================
// 2. status ⇔ ハンドラ到達可能性の一致
// ============================================================
// ハンドラを持たずエンジン（基礎層）が直接評価する演算子・構文21件。
const ENGINE_EVALUABLE = new Set([
"*", "+", "-", "/", "^", "<-", "=", "!=", "<", "<=", "==", ">", ">=",
"$<-", "[<-", "!", "&", "&&", "|", "||", "(",
]);
test("audit-r: 対応項目は全件到達可能、未対応項目に到達可能なハンドラは無い", () => {
for (const r of ALL) {
if (r.status === "supported")
assert.ok(
advancedBuiltins.has(r.name) || ENGINE_EVALUABLE.has(r.name),
`対応なのに到達不能: ${r.name}`,
);
if (r.status === "unsupported")
// かつての唯一の例外 .bincode（ドット始まりでパーサ到達不能のため
// 登録だけ残していたハンドラ）は、統合第2弾で申し送り §6(d) の裁定
// どおりハンドラと eng4 の直接検証テストを削除したため、例外は無い。
assert.ok(
!advancedBuiltins.has(r.name),
`未対応なのにハンドラがある: ${r.name}`,
);
}
// ハンドラがあるのに項目が無いものは無い（sort.int／seq.int／
// rep.int の3件は監査で項目を追加済み）。
const itemNames = new Set(ALL.map((r) => r.name));
for (const h of advancedBuiltins.keys())
assert.ok(itemNames.has(h), `項目の無いハンドラ: ${h}`);
// 未対応項目は全件 description に理由を持つ（データ班テストと二重化）。
for (const r of ALL)
if (r.status === "unsupported")
assert.ok(r.description.includes(""), r.name);
});

test("audit-r: 裁定スポットチェック（倒した項目・起こした項目）", () => {
// 対応→未対応：定数／行列／Bessel／パーサ不到達ほか
for (const n of [
"pi", "letters", "NA_real_", "matrix", "qr", "svd", "factor", "list",
"lapply", "besselI", "besselY", "cut", "{", "**", "->", "<<-", "%||%",
".colSums", ".bincode", "sort_by", "anyMissing", "assignOps", "%notin%",
])
assert.equal(byName.get(n).status, "unsupported", n);
// 未対応→対応：環境アクセス8件
for (const n of ["assign", "get", "get0", "exists", "ls", "objects", "is.data.frame", "class"])
assert.equal(byName.get(n).status, "supported", n);
// 新規実装で対応を維持した11件
for (const n of [
"bitwAnd", "bitwNot", "bitwOr", "bitwShiftL", "bitwShiftR", "bitwXor",
"anyNA", "digamma", "trigamma", "psigamma", "match.arg",
])
assert.equal(byName.get(n).status, "supported", n);
// anyMissing は base R に存在しない関数名（項目は未対応で残す）
assert.ok(byName.get("anyMissing").description.includes("存在しない"));
// scale は caution で表現の限定（行列形状・属性なし）を開示して対応維持
assert.ok(byName.get("scale").caution.includes("属性は付きません"));
// zapsmall は 4.3.3 基準の syntax に直し、devel 引数を caution で開示
assert.ok(byName.get("zapsmall").syntax.includes("digits"));
assert.ok(byName.get("zapsmall").caution.includes("mFUN"));
});

// ============================================================
// 3. 名前キュレーション（監査の独立検証結果）
// ============================================================
test("audit-r: names は507+422=929件、混入除去と復帰・追加が反映されている", () => {
assert.equal(namesP1.length, 507);
assert.equal(namesP2.length, 422);
// B4S 拡張：part3〜part10 の names は 830 件、全体で 1,759 件。
const namesB4S = [
...namesP3,...namesP4,...namesP5,...namesP6,...namesP7,...namesP8,...namesP9,...namesP10,
];
assert.equal(namesB4S.length, 830);
const all = [...namesP1,...namesP2,...namesB4S];
assert.equal(all.length, 1759);
assert.equal(new Set(all).size, all.length, "names に重複なし");
// 除去：AsIs はクラス名、Math.POSIXlt／summary.difftime は R 4.3.3 の
// base にメソッド実体が無く、anyMissing は関数自体が存在しない。
for (const n of ["AsIs", "Math.POSIXlt", "summary.difftime", "anyMissing"])
assert.ok(!all.includes(n), `混入が残っている: ${n}`);
// 復帰・追加：grepv は R-devel の grep ヘルプで実在を確認。
// sort.int／seq.int／rep.int は項目追加に合わせて登録。
for (const n of ["grepv", "sort.int", "seq.int", "rep.int"])
assert.ok(all.includes(n), `実在関数が names に無い: ${n}`);
// 項目側との整合：対応項目の関数名は names か基礎側にある
// （演算子・定数等の項目はこの限りでないため、関数形の名前だけを見る）。
const nameSet = new Set(all);
const baseNames = new Set(definition.reference.map((r) => r.name));
const shaped = (n) => /^[A-Za-z][A-Za-z0-9._]*$/.test(n);
for (const r of ALL)
if (r.status === "supported" && shaped(r.name) &&!r.name.includes("%"))
assert.ok(nameSet.has(r.name) || baseNames.has(r.name), `${r.name} が names に無い`);
});

// ============================================================
// 4. 新規実装ハンドラ（実 R 4.3.3 実測値との照合）
// ============================================================
test("audit-r: bitw 系（型規則・切り捨て・範囲外・シフト）", async () => {
await outIs("print(bitwAnd(15, 7))", ["c(7)"]);
await outIs("print(bitwNot(0:3))", ["c(-1, -2, -3, -4)"]);
await outIs("print(bitwShiftL(1, 1:3))", ["c(2, 4, 8)"]);
// 右シフトは符号なし（実 R 実測 bitwShiftR(-1, 1) == 2^31-1）
await outIs("print(bitwShiftR(-1, 1))", ["c(2147483647)"]);
await outIs("print(bitwShiftR(-1, 0))", ["c(-1)"]);
// リサイクリングは警告なしで繰り返す（実 R 実測）
await outIs("print(bitwAnd(c(1, 2, 3), c(1, 2)))", ["c(1, 2, 1)"]);
await outIs("print(bitwAnd(c(1, NA), c(2, 3)))", ["c(0, NA)"]);
await outIs("print(bitwShiftL(c(1, 2), c(1, NA)))", ["c(2, NA)"]);
// 1<<31 は NA_integer_ のビットパターンになるため NA、32以上も NA
await outIs("print(bitwShiftL(1, 31))", ["c(NA)"]);
await outIs("print(bitwShiftL(1, 32))", ["c(NA)"]);
await outIs("print(bitwShiftR(c(8, 9), -1))", ["c(NA, NA)"]);
// 小数は切り捨て（実 R 実測 bitwAnd(-1.9, 1) == 1）
await outIs("print(bitwAnd(-1.9, 1))", ["c(1)"]);
await outIs("print(bitwShiftL(1.9, 1))", ["c(2)"]);
// 型規則：logical／character は unimplemented type、型混在は type error
await errMatch("print(bitwAnd(TRUE, FALSE))", /unimplemented type 'logical' in 'bitwAnd'/);
await errMatch("print(bitwAnd(\"a\", \"b\"))", /unimplemented type 'character' in 'bitwAnd'/);
await errMatch("print(bitwNot(TRUE))", /unimplemented type 'logical' in 'bitwNot'/);
// 範囲外は NA＋警告
const p = await first("print(bitwAnd(2^31, 1))");
assert.deepEqual(outputs(p), ["c(NA)"]);
assert.ok(warnsOf(p).some((w) => w.includes("NAs introduced by coercion to integer range")));
});

test("audit-r: digamma／trigamma／psigamma（実 R グリッド照合の代表値）", async () => {
await outIs("print(digamma(1))", ["c(-0.5772156649015323)"]);
await outIs("print(digamma(0.5))", ["c(-1.963510026021423)"]);
await outIs("print(digamma(-0.5))", ["c(0.03648997397857601)"]);
await outIs("print(trigamma(1))", ["c(1.6449340668482264)"]);
await outIs("print(trigamma(-1.5))", ["c(9.379246644989122)"]);
await outIs("print(psigamma(2, deriv = 1))", ["c(0.6449340668482265)"]);
await outIs("print(psigamma(2, deriv = 2))", ["c(-0.40411380631918853)"]);
await outIs("print(psigamma(c(1, 2), deriv = c(0, 1)))", ["c(-0.5772156649015323, 0.6449340668482265)"]);
// 極（0・負の整数）：deriv 奇数→Inf、偶数→NaN＋警告（実 R 実測）
await outIs("print(trigamma(0))", ["c(Inf)"]);
await outIs("print(digamma(Inf))", ["c(Inf)"]);
await outIs("print(trigamma(Inf))", ["c(0)"]);
const p1 = await first("print(digamma(0))");
assert.deepEqual(outputs(p1), ["c(NaN)"]);
assert.ok(warnsOf(p1).some((w) => w.includes("NaNs produced")));
const p2 = await first("print(psigamma(0, deriv = 2))");
assert.deepEqual(outputs(p2), ["c(NaN)"]);
// deriv の上限は 100（実 R の n_max）。超過は NaN＋2件の警告
const p3 = await first("print(psigamma(1, deriv = 101))");
assert.deepEqual(outputs(p3), ["c(NaN)"]);
assert.ok(warnsOf(p3).some((w) => w.includes("deriv = 101 > 100 (= n_max)")));
assert.ok(warnsOf(p3).some((w) => w.includes("NaNs produced")));
// deriv=100 は上限内で計算できる（実 R と 15 桁一致を確認済み）
await outIs("print(psigamma(1, deriv = 100))", ["c(-9.33262154439441e+157)"]);
await outIs("print(psigamma(1, deriv = NA))", ["c(NA)"]);
await errMatch("print(digamma(\"a\"))", /non-numeric argument to mathematical function/);
});

test("audit-r: anyNA／match.arg", async () => {
await outIs("print(anyNA(c(1, NA, 3)))", ["TRUE"]);
await outIs("print(anyNA(c(1, NaN)))", ["TRUE"]);
await outIs("print(anyNA(c(1, 2)))", ["FALSE"]);
await outIs("print(anyNA(NULL))", ["FALSE"]);
await outIs("print(anyNA(numeric(0)))", ["FALSE"]);
await outIs("print(anyNA(data.frame(x = c(1, NA), y = c(1, 2))))", ["TRUE"]);
await outIs("print(match.arg(\"b\", c(\"a\", \"b\")))", ["c(\"b\")"]);
await outIs("print(match.arg(\"app\", c(\"apple\", \"banana\")))", ["c(\"apple\")"]);
await outIs("print(match.arg(NULL, c(\"a\", \"b\")))", ["c(\"a\")"]);
await outIs("print(match.arg(c(\"a\", \"b\"), c(\"a\", \"b\")))", ["c(\"a\")"]);
await outIs("print(match.arg(c(\"a\", \"a\"), c(\"a\", \"b\"), several.ok = TRUE))", ["c(\"a\", \"a\")"]);
await errMatch("print(match.arg(\"a\", c(\"apple\", \"avocado\")))", /'arg' should be one of "apple", "avocado"/);
await errMatch("print(match.arg(c(\"b\", \"a\"), c(\"a\", \"b\")))", /'arg' must be of length 1/);
await errMatch("print(match.arg(1, c(\"a\", \"b\")))", /'arg' must be NULL or a character vector/);
});

// ============================================================
// 5. 欠陥修正の固定（rep.int のスカラー times）
// ============================================================
test("audit-r: rep.int のスカラー times はベクトル全体の繰り返し（実 R 実測）", async () => {
// 実 R 4.3.3：rep.int(c(1, 2), 2) == c(1, 2, 1, 2)。
// 従来実装は要素ごとの回数として c(1, 1, 2, 2) を返していた（誤値）。
await outIs("print(rep.int(c(1, 2), 2))", ["c(1, 2, 1, 2)"]);
await outIs("print(rep.int(c(\"a\", \"b\"), 2))", ["c(\"a\", \"b\", \"a\", \"b\")"]);
// ベクトルの times は要素ごとの回数
await outIs("print(rep.int(1:3, c(3, 2, 1)))", ["c(1, 1, 1, 2, 2, 3)"]);
await outIs("print(rep.int(c(1, 2), 0))", ["c()"]);
});

// ============================================================
// 6. 重複登録の解消（残した実装が実 R と一致すること）
// ============================================================
test("audit-r: 重複登録の解消（char.expand／validUTF8／strtoi）", async () => {
// char.expand は mopup 版が正：完全一致が複数ある場合は曖昧として
// character(0)（実 R 実測。char 版は先頭一致を返し誤りだった）
await outIs("print(char.expand(\"a\", c(\"a\", \"a\")))", ["c()"]);
await outIs("print(char.expand(\"a\", c(\"ab\", \"a\")))", ["c(\"a\")"]);
// validUTF8 は mopup 版が正：非文字列は "invalid 'x' argument"
// （実 R 実測。char 版は強制変換して値を返していた）
await errMatch("print(validUTF8(1))", /invalid 'x' argument/);
await outIs("print(validUTF8(c(\"a\", NA)))", ["c(TRUE, TRUE)"]);
// strtoi は data 版を残し、先行空白のみ読み飛ばすよう修正
// （実 R 実測：strtoi(" 42")==42、strtoi("42 ")==NA）
await outIs(
"print(strtoi(c(\" 42\", \"42 \", \"0x1F\", \"010\", \"\", \"-2147483648\", \"2147483647\", \"3.9\", \" 0x10\")))",
["c(42, NA, 31, 8, NA, NA, 2147483647, NA, 16)"],
);
});

// ============================================================
// 7. 環境アクセス8件の再裁定（対応化）の挙動
// ============================================================
test("audit-r: assign／get／get0／exists／ls／objects／class／is.data.frame", async () => {
await outIs(
"assign(\"qq\", 7)\nprint(get(\"qq\"))\nprint(ls())\nprint(exists(\"qq\"))",
["7", "c(\"qq\")", "TRUE"],
);
await outIs("print(get(\"pi\"))", ["3.141592653589793"]);
await outIs("print(get0(\"zzz\", ifnotfound = \"none\"))", ["\"none\""]);
await outIs("print(exists(\"zzz\"))", ["FALSE"]);
await outIs("print(class(c(1, 2)))", ["\"numeric\""]);
await outIs("print(class(data.frame(x = 1)))", ["\"data.frame\""]);
await outIs("print(class(NULL))", ["\"NULL\""]);
await outIs("print(is.data.frame(data.frame(x = c(1, 2))))", ["TRUE"]);
await outIs("print(is.data.frame(c(1, 2)))", ["FALSE"]);
// 関数オブジェクトは返せないため名指しで停止（正直な未対応の開示）
await errMatch("print(get(\"c\"))", /関数オブジェクトとして返せない/);
// inherits = FALSE は現在の環境だけを探す（実 R 4.3.3 実測）。
// 監査で発見・修正した欠陥：従来は inherits を無視し、組み込み定数に
// 対しても TRUE／値を返していた。
await outIs("print(exists(\"pi\", inherits = FALSE))", ["FALSE"]);
await outIs("print(exists(\"pi\", inherits = TRUE))", ["TRUE"]);
await outIs("x <- 1\nprint(exists(\"x\", inherits = FALSE))", ["TRUE"]);
await errMatch("print(get(\"pi\", inherits = FALSE))", /object 'pi' not found/);
await outIs("print(get0(\"pi\", inherits = FALSE, ifnotfound = \"NF\"))", ["\"NF\""]);
// assign の inherits = TRUE と環境引数は名指しで停止
await errMatch("print(assign(\"x\", 1, inherits = TRUE))", /inherits = TRUE/);
await errMatch("print(ls(envir = 2))", /環境引数 envir/);
});

// ============================================================
// 8. apply 系の限定実装（実 R 差分バッテリの固定）
// ============================================================
test("audit-r: apply 系は FUN 文字列の単純集計で実 R と一致する", async () => {
await outIs("print(tapply(c(1, 2, 3, 4), c(\"a\", \"a\", \"b\", \"b\"), \"sum\"))", ["c(a = 3, b = 7)"]);
await outIs("print(tapply(c(1, NA, 3, 4), c(\"a\", \"a\", \"b\", \"b\"), \"sum\"))", ["c(a = NA, b = 7)"]);
await outIs("print(table(c(\"a\", \"b\", \"a\", NA)))", ["c(a = 2, b = 1)"]);
await outIs("print(table(c(3, 1, 3, 3, 1)))", ["c(1 = 2, 3 = 3)"]);
await outIs("print(sapply(c(-1, 2, -3), \"abs\"))", ["c(1, 2, 3)"]);
await outIs("print(vapply(c(-1, 2), \"abs\", 0))", ["c(1, 2)"]);
await outIs("print(mapply(\"+\", c(1, 2), c(10, 20)))", ["c(11, 22)"]);
await outIs("print(apply(data.frame(x = c(1, 2), y = c(3, 4)), 2, \"sum\"))", ["c(x = 3, y = 7)"]);
await outIs("print(apply(data.frame(x = c(1, 2), y = c(3, 4)), 1, \"sum\"))", ["c(4, 6)"]);
// scale：値は実 R と一致（行列形状・属性は付かない＝caution で開示）
await outIs("print(scale(c(1, 2, 3)))", ["c(-1, 0, 1)"]);
await outIs("print(scale(c(1, 2, 3), center = FALSE))", ["c(0.3779644730092272, 0.7559289460184544, 1.1338934190276817)"]);
});

// ============================================================
// 9. 到達不能・zapsmall・新規項目
// ============================================================
test("audit-r: ドット始まり名はパーサで正直に停止し、項目も未対応", async () => {
await errMatch("print(.colSums(c(1, 2), 1, 2))", /解釈できません|説明に対応していません/);
await errMatch("print(.bincode(1, 1:2))", /解釈できません|説明に対応していません/);
// zapsmall の devel 引数は 4.3.3 基準で unused argument（実 R 実測）
await errMatch("print(zapsmall(c(1, 1e-12), mFUN = 1))", /unused argument \(mFUN = 1\)/);
});

test("audit-r: 追加した3項目（sort.int／seq.int／rep.int）が実 R と一致する", async () => {
await outIs("print(sort.int(c(3, 1, NA)))", ["c(1, 3)"]);
await outIs("print(sort.int(c(3, 1, NA), na.last = TRUE))", ["c(1, 3, NA)"]);
await outIs("print(sort.int(c(3, 1, 2), decreasing = TRUE))", ["c(3, 2, 1)"]);
await outIs("print(seq.int(1, 5))", ["c(1, 2, 3, 4, 5)"]);
await outIs("print(seq.int(2, by = 2, length.out = 3))", ["c(2, 4, 6)"]);
await outIs("print(seq.int(to = 3))", ["c(1, 2, 3)"]);
for (const n of ["sort.int", "seq.int", "rep.int"])
assert.equal(byName.get(n).status, "supported", n);
});

// ============================================================
// 10. 契約チェック（advanced-interface.md 第11章の R 分）
// ============================================================
test("audit-r: 契約チェック（overrides／テンプレート到達性／用語集）", () => {
// (c) overrides は空：基礎項目で status 反転が必要な名前は無い
assert.deepEqual(referenceOverrides, []);
// (b) 項目名の重複なし（part 間を含む）
assert.equal(new Set(ALL.map((r) => r.name)).size, ALL.length);
// (d)(f) テンプレートの refs は全件実在し、基礎か対応項目である
const status = new Map();
for (const r of definition.reference) status.set(r.name, "supported");
for (const r of ALL) status.set(r.name, r.status);
for (const t of templatesAdvanced)
for (const ref of t.refs) {
assert.ok(status.has(ref), `${t.id}: refs に無い ${ref}`);
assert.equal(status.get(ref), "supported", `${t.id}: 未対応への依存 ${ref}`);
}
// (d) 用語集は基礎と重複せず、内部重複も無い
const baseTerms = new Set((definition.glossary || []).map((g) => g[0]));
const advTerms = glossaryAdvanced.map((g) => g[0]);
assert.equal(new Set(advTerms).size, advTerms.length);
for (const t of advTerms) assert.ok(!baseTerms.has(t), `用語集の基礎重複: ${t}`);
});

// ============================================================
// 11. A-03：監査で書き換えた example が全件エラーなく実行できる
// ============================================================
test("audit-r: 書き換えた example の実走（55件）", async () => {
const targets = [
"cbind", "rbind", "expand.grid", "tapply", "sapply", "vapply", "mapply",
"apply", "table", "drop", "levels", "is.matrix", "mode", "as.null",
"is.null", "range", "startsWith", "sweep", "unlist", "as.vector", "grepl",
"intToUtf8", "utf8ToInt", "sign", "min", "max", "pmin", "pmax", "pmin.int",
"pmax.int", "as.logical", "logical", "bitwAnd", "bitwOr", "bitwXor",
"bitwShiftL", "bitwShiftR", "bitwNot", "digamma", "trigamma", "psigamma",
"anyNA", "match.arg", "assign", "get", "get0", "exists", "ls", "objects",
"is.data.frame", "class", "sort.int", "seq.int", "rep.int", "zapsmall",
];
for (const nm of targets) {
const r = byName.get(nm);
assert.ok(r, `項目が無い: ${nm}`);
assert.equal(r.status, "supported", nm);
const errs = await errOf(r.example);
assert.deepEqual(errs, [], `${nm} の example が止まる: ${r.example}`);
}
});
