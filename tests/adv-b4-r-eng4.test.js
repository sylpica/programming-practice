import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 高度モード B4・R実装班4（残余の純粋関数）。
// 期待値は公式ヘルプ（stat.ethz.ch R-manual）の Examples と実 R 4.3.3 の
// 実測出力から導いた（報告書 docs/audit/ADV-B4-r-eng4.md に根拠を記録）。
// pretty は R 4.3.3 の pretty.c／seq.c を移植し、1525ケースのグリッドで
// 実 R と照合した（値照合1524件全件一致。残り1件は実 R が111万点を返す
// 非正規数域の退化ケースで、アプリの上限により再現対象外）。
// 注：.bincode はドット始まり名で共有パーサが受理しないため simulate
// 経由では到達不能だったハンドラを、統合第2弾で申し送り §6(d) の裁定
// どおりハンドラごと削除した（項目は未対応のまま、理由は項目側に開示
// 済み）。かつてここにあった fake ctx での直接検証テストも同時に削除。

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
// 出力テキスト中の数値列を取り出して許容誤差で比べる（eng1 と同方式）。
const numsApprox = async (code, expected, tol = 1e-9, model) => {
  const p = await first(code, model);
  const text = outputs(p)[0];
  const got = [...text.matchAll(/-?\d+\.?\d*(e[+-]?\d+)?/gi)].map((m) =>
    Number(m[0]),
  );
  assert.equal(got.length, expected.length, code + " -> " + text);
  got.forEach((g, i) =>
    assert.ok(
      Math.abs(g - expected[i]) <= tol * Math.max(1, Math.abs(expected[i])),
      `${code} [${i}] got ${g} expected ${expected[i]}`,
    ),
  );
};
const DF = "df <- data.frame(x = c(1, 2), y = c(3, 4))\n";
const DFLOG = "df <- data.frame(x = c(TRUE, TRUE), y = c(TRUE, FALSE))\n";

// ---- all / any ----
test("eng4 all/any truth tables and NA rules", async () => {
  await outIs("print(all(c(TRUE, TRUE)))", ["TRUE"]);
  await outIs("print(all(c(TRUE, FALSE)))", ["FALSE"]);
  await outIs("print(all(c(TRUE, NA)))", ["NA"]);
  await outIs("print(all(c(FALSE, NA)))", ["FALSE"]);
  await outIs("print(all(c(TRUE, NA), na.rm = TRUE))", ["TRUE"]);
  await outIs("print(any(c(FALSE, NA)))", ["NA"]);
  await outIs("print(any(c(TRUE, NA)))", ["TRUE"]);
  await outIs("print(any(c(FALSE, NA), na.rm = TRUE))", ["FALSE"]);
  await outIs("print(all())", ["TRUE"]);
  await outIs("print(any())", ["FALSE"]);
  await outIs("print(all(logical(0)))", ["TRUE"]);
  await outIs("print(any(logical(0)))", ["FALSE"]);
  // na.rm は名前でのみ指定可。部分名 na.r はデータとして扱われる
  //（実 R 4.3.3 実測：all(NA, na.r = FALSE) は FALSE）。
  await outIs("print(all(NA, na.r = FALSE))", ["FALSE"]);
  // na.rm の強制規則：0 は FALSE、長さ2以上はエラー。
  await outIs("print(all(c(TRUE, NA), na.rm = 0))", ["NA"]);
  await errMatch(
    "print(all(c(TRUE, NA), na.rm = c(TRUE, TRUE)))",
    /'length = 2' in coercion to 'logical\(1\)'/,
  );
  // データフレームは列を連結して判定する。
  await outIs(DFLOG + "print(all(df))", ["FALSE"]);
  await outIs(DFLOG + "print(any(df))", ["TRUE"]);
});
test("eng4 all/any coercion warnings", async () => {
  await outIs("print(all(c(1, 2)))", ["TRUE"]);
  await warnHas("print(all(c(1, 2)))", /coercing argument of type 'double' to logical/);
  await outIs("print(all(c(0, 1)))", ["FALSE"]);
  await outIs("print(any('TRUE'))", ["TRUE"]);
  await warnHas("print(any('TRUE'))", /coercing argument of type 'character' to logical/);
  await outIs("print(any('x'))", ["NA"]);
});

// ---- xor / isTRUE / isFALSE ----
test("eng4 xor and isTRUE/isFALSE", async () => {
  await outIs("print(xor(c(TRUE, FALSE, NA), c(TRUE, TRUE, TRUE)))", [
    "c(FALSE, TRUE, NA)",
  ]);
  await outIs("print(xor(1, 0))", ["c(TRUE)"]);
  await outIs("print(xor(c(TRUE, TRUE, TRUE), c(TRUE, FALSE)))", [
    "c(FALSE, TRUE, FALSE)",
  ]);
  await warnHas(
    "print(xor(c(TRUE, TRUE, TRUE), c(TRUE, FALSE)))",
    /longer object length is not a multiple of shorter object length/,
  );
  await errMatch(
    "print(xor('a', TRUE))",
    /operations are possible only for numeric, logical or complex types/,
  );
  await outIs("print(isTRUE(TRUE))", ["TRUE"]);
  await outIs("print(isTRUE(1))", ["FALSE"]);
  await outIs("print(isTRUE('TRUE'))", ["FALSE"]);
  await outIs("print(isTRUE(c(TRUE, TRUE)))", ["FALSE"]);
  await outIs("print(isTRUE(NA))", ["FALSE"]);
  await outIs("print(isFALSE(FALSE))", ["TRUE"]);
  await outIs("print(isFALSE(NA))", ["FALSE"]);
  await outIs("print(isFALSE(NULL))", ["FALSE"]);
  await errMatch("print(isTRUE(TRUE, 1))", /unused argument/);
});

// ---- is.finite / is.infinite / is.nan ----
test("eng4 is.finite family", async () => {
  await outIs("print(is.finite(c(1, NA, NaN, Inf, -Inf)))", [
    "c(TRUE, FALSE, FALSE, FALSE, FALSE)",
  ]);
  await outIs("print(is.infinite(c(1, Inf, -Inf, NA)))", [
    "c(FALSE, TRUE, TRUE, FALSE)",
  ]);
  await outIs("print(is.nan(c(NA, NaN, 1)))", ["c(FALSE, TRUE, FALSE)"]);
  await outIs("print(is.finite('a'))", ["c(FALSE)"]);
  await outIs("print(is.nan('a'))", ["c(FALSE)"]);
  await outIs("print(is.finite(TRUE))", ["c(TRUE)"]);
  await outIs("print(is.nan(NULL))", ["c()"]);
  await outIs("print(is.finite(c(a = 1, b = Inf)))", ["c(a = TRUE, b = FALSE)"]);
  await errMatch(
    "print(is.finite(1, 2))",
    /2 arguments passed to 'is\.finite' which requires 1/,
  );
  await errMatch(
    "print(is.nan(1, 2))",
    /2 arguments passed to 'is\.nan' which requires 1/,
  );
  await errMatch(
    DF + "print(is.finite(df))",
    /default method not implemented for type 'list'/,
  );
});

// ---- sets ----
test("eng4 set operations", async () => {
  await outIs("print(union(c(1, 2, 2), c(2, 3)))", ["c(1, 2, 3)"]);
  await outIs("print(intersect(c(1, 2, 2, 3), c(2, 3, 4)))", ["c(2, 3)"]);
  await outIs("print(setdiff(c(1, 2, 3), c(2)))", ["c(1, 3)"]);
  await outIs("print(setequal(c(1, 2), c(2, 1)))", ["TRUE"]);
  await outIs("print(setequal(c(1, 2), c(1, 3)))", ["FALSE"]);
  // 型統一（as.vector 同士の共通型）と match の NA／NaN 区別。
  await outIs("print(union(c('a'), c(1)))", ['c("a", "1")']);
  await outIs("print(intersect(1, '1'))", ['c("1")']);
  await outIs("print(setequal(1, '1'))", ["TRUE"]);
  await outIs("print(setdiff(c('a', 'b'), 'a'))", ['c("b")']);
  await outIs("print(union(c(1, NA), c(NA, 2)))", ["c(1, NA, 2)"]);
  await outIs("print(setequal(NA, NaN))", ["FALSE"]);
  await outIs("print(is.element(c(1, 3), c(1, 2, 3)))", ["c(TRUE, TRUE)"]);
  await outIs("print(is.element(NA, c(1, NA)))", ["c(TRUE)"]);
  await outIs("print(is.element(NaN, c(1, NA)))", ["c(FALSE)"]);
  await errMatch(DF + "print(union(df, df))", /データフレームに対応していません/);
});

// ---- rep.int / rep_len ----
test("eng4 rep.int and rep_len", async () => {
  // 期待値を実 R 4.3.3 の実測で是正（コーディネーター統合時）：スカラーの
  // times はベクトル全体の繰り返しであり、要素ごとの繰り返しではない
  // （rep.int(c(1, 2), 2) = c(1, 2, 1, 2)。監査報告書 ADV-B4-audit-r §5-1）。
  await outIs("print(rep.int(c(1, 2), 2))", ["c(1, 2, 1, 2)"]);
  await outIs("print(rep.int(c(1, 2), c(2, 1)))", ["c(1, 1, 2)"]);
  await outIs("print(rep.int('a', 2.9))", ['c("a", "a")']);
  // rep.int／rep_len は名前を落とす（rep 本体との違い。実 R 実測）。
  await outIs("print(rep.int(c(a = 1), 2))", ["c(1, 1)"]);
  await outIs("print(rep_len(c(1, 2), 5))", ["c(1, 2, 1, 2, 1)"]);
  await outIs("print(rep_len(c(a = 1), 2))", ["c(1, 1)"]);
  await outIs("print(rep_len(1, 0))", ["c()"]);
  await outIs("print(rep_len(NULL, 0))", ["NULL"]);
  await errMatch("print(rep.int(NULL, 3))", /unimplemented type 'NULL' in 'rep3'/);
  await errMatch("print(rep_len(NULL, 3))", /cannot replicate NULL to a non-zero length/);
  await errMatch("print(rep.int(c(1, 2), -1))", /invalid 'times' value/);
  await errMatch("print(rep.int(c(1, 2), c(1, 2, 3)))", /invalid 'times' value/);
  await errMatch("print(rep_len(c(1, 2), c(1, 2)))", /invalid 'length.out' value/);
});

// ---- replace / unname ----
test("eng4 replace", async () => {
  await outIs("print(replace(c(1, 2, 3), 2, 9))", ["c(1, 9, 3)"]);
  await outIs("print(replace(c(1, 2, 3), c(1, 3), c(10, 30)))", ["c(10, 2, 30)"]);
  // 範囲外は NA で埋めて拡張する（部分代入そのままの規則）。
  await outIs("print(replace(c(1, 2, 3), 5, 9))", ["c(1, 2, 3, NA, 9)"]);
  await outIs("print(replace(c(1, 2, 3), -1, 9))", ["c(1, 9, 9)"]);
  await outIs("print(replace(c(1, 2, 3), NA, 9))", ["c(1, 2, 3)"]);
  await outIs("print(replace(c(1, 2, 3), c(TRUE, FALSE, TRUE), c(9, 8)))", [
    "c(9, 2, 8)",
  ]);
  await outIs("print(replace(c(a = 1, b = 2), 'b', 9))", ["c(a = 1, b = 9)"]);
  await outIs("print(replace(c(a = 1), 'z', 9))", ["c(a = 1, z = 9)"]);
  await warnHas(
    "print(replace(c(1, 2, 3), c(1, 2, 3), c(9, 8)))",
    /number of items to replace is not a multiple of replacement length/,
  );
  await errMatch("print(replace(c(1, 2, 3), 1, NULL))", /replacement has length zero/);
  await errMatch(
    "print(replace(c(1, 2, 3), c(1, -1), 9))",
    /only 0's may be mixed with negative subscripts/,
  );
});
test("eng4 unname", async () => {
  await outIs("print(unname(c(a = 1, b = 2)))", ["c(1, 2)"]);
  await outIs("print(unname(1))", ["1"]);
  await outIs("print(unname(NULL))", ["NULL"]);
  await errMatch(DF + "print(unname(df))", /データフレームに対応していません/);
  await errMatch(
    DF + "print(unname(df, force = TRUE))",
    /invalid 'dimnames' given for data frame/,
  );
});

// ---- pretty ----
test("eng4 pretty basics and parameters", async () => {
  await outIs("print(pretty(c(1, 100)))", ["c(0, 20, 40, 60, 80, 100)"]);
  await outIs("print(pretty(c(0, 1)))", [
    "c(0, 0.2, 0.4, 0.6000000000000001, 0.8, 1)",
  ]);
  await outIs("print(pretty(1:5))", ["c(1, 2, 3, 4, 5)"]);
  await outIs("print(pretty(5))", ["c(0, 5)"]);
  // seq.int の生成規則（両端固定＋内側は from + i*step）まで含めた一致。
  await numsApprox(
    "print(pretty(c(0, 1), n = 10))",
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    1e-12,
  );
  await numsApprox(
    "print(pretty(c(-3, 3), n = 7, eps.correct = 1))",
    [-3, -2, -1, 0, 1, 2, 3],
    1e-9,
  );
  await numsApprox(
    "print(pretty(c(0, 1), n = 3, min.n = 1, shrink.sml = 0.5, high.u.bias = 2, u5.bias = 3))",
    [0, 0.5, 1],
    1e-12,
  );
  await outIs("print(pretty(numeric(0)))", ["c()"]);
  await outIs("print(pretty(NULL))", ["NULL"]);
  await warnHas("print(pretty('a'))", /NAs introduced by coercion/);
  await errMatch("print(pretty(c(1, 2), n = -1))", /invalid 'n' argument/);
  await errMatch(
    "print(pretty(c(1, 2), eps.correct = 3))",
    /'eps.correct' must be 0, 1, or 2/,
  );
  await errMatch("print(pretty(c(1, 2), n = 3, min.n = 5))", /invalid 'min.n' argument/);
  await errMatch("print(pretty(c(1, 2), shrink.sml = 0))", /invalid 'shrink.sml' argument/);
  await errMatch(
    "print(pretty(c(1, 2), high.u.bias = -1))",
    /invalid 'high.u.bias' argument/,
  );
});

// ---- zapsmall ----
test("eng4 zapsmall", async () => {
  await outIs("print(zapsmall(c(1e-10, 1.5)))", ["c(0, 1.5)"]);
  await outIs("print(zapsmall(c(0.001, 100)))", ["c(0.001, 100)"]);
  await outIs("print(zapsmall(c(1e-8, 2e8), digits = 3))", ["c(0, 200000000)"]);
  await outIs("print(zapsmall(c(a = 1e-12, b = 5)))", ["c(a = 0, b = 5)"]);
  // データフレームは全列を通じた最大値で digits が決まる（実 R 実測）。
  await outIs(
    "print(zapsmall(data.frame(a = c(1000000, 2), b = c(0.123456789, 3))))",
    ["a: c(1000000, 2)\nb: c(0.1, 3)"],
  );
  await outIs("print(zapsmall(numeric(0)))", ["c()"]);
  // R 4.3.3 の zapsmall に mFUN／min.d は無い（宣言との不一致は申し送り）。
  await errMatch("print(zapsmall(c(1, 2), mFUN = 1))", /unused argument/);
  await errMatch("print(zapsmall('a'))", /non-numeric argument to mathematical function/);
});

// ---- basename / dirname / file.path ----
test("eng4 basename and dirname", async () => {
  await outIs("print(basename('/a/b/c.txt'))", ['c("c.txt")']);
  await outIs("print(dirname('/a/b/c.txt'))", ['c("/a/b")']);
  await outIs("print(basename('a/b/'))", ['c("b")']);
  await outIs("print(basename('/'))", ['c("")']);
  await outIs("print(dirname(''))", ['c("")']);
  await outIs("print(dirname('a//'))", ['c("a")']);
  await outIs("print(dirname('//a//b//'))", ['c("//a//b")']);
  await outIs("print(basename(c('/a/b', '/c/d')))", ['c("b", "d")']);
  await outIs("print(basename(c('/a/b', NA)))", ['c("b", NA)']);
  await errMatch("print(basename(1))", /a character vector argument expected/);
  await errMatch("print(dirname(TRUE))", /a character vector argument expected/);
});
test("eng4 file.path", async () => {
  await outIs("print(file.path('a', 'b'))", ['c("a/b")']);
  await outIs("print(file.path('a', 'b', fsep = '-'))", ['c("a-b")']);
  await outIs("print(file.path(1, 2))", ['c("1/2")']);
  await outIs("print(file.path())", ["c()"]);
  // NA 要素は伝播せず文字列 "NA" になる（実 R の規則）。
  await outIs("print(file.path('a', NA))", ['c("a/NA")']);
  await outIs("print(file.path(c('a', 'b', 'c'), c('x', 'y')))", [
    'c("a/x", "b/y", "c/x")',
  ]);
});

// ---- char.expand ----
test("eng4 char.expand", async () => {
  await outIs("print(char.expand('mea', c('mean', 'median')))", ['c("mean")']);
  await outIs("print(char.expand('mean', c('mean', 'median')))", ['c("mean")']);
  await outIs("print(char.expand('', 'mean'))", ['c("mean")']);
  // 曖昧な前方一致は nomatch を評価せず character(0)。
  await outIs("print(char.expand('me', c('mean', 'median', 'mode')))", ["c()"]);
  await outIs("print(char.expand('x', c('a', 'b'), nomatch = NA))", ["NA"]);
  await errMatch("print(char.expand('x', c('a', 'b')))", /no match/);
  await errMatch(
    "print(char.expand(c('a', 'b'), 'a'))",
    /'input' must have length 1/,
  );
  await errMatch(
    "print(char.expand(1, 'a'))",
    /'input' and 'target' must be character vectors/,
  );
});

// ---- validUTF8 / validEnc ----
test("eng4 validUTF8 and validEnc", async () => {
  await outIs("print(validUTF8(c('a', NA)))", ["c(TRUE, TRUE)"]);
  await outIs("print(validEnc('abc'))", ["c(TRUE)"]);
  await outIs("print(validUTF8(character(0)))", ["c()"]);
  await errMatch("print(validUTF8(1))", /invalid 'x' argument/);
  await errMatch("print(validEnc(NULL))", /invalid 'x' argument/);
});

// ---- sign ----
test("eng4 sign", async () => {
  await outIs("print(sign(c(-2, 0, 3, NA)))", ["c(-1, 0, 1, NA)"]);
  await outIs("print(sign(-0.5))", ["c(-1)"]);
  await outIs("print(sign(c(a = -3)))", ["c(a = -1)"]);
  await outIs(DF + "print(sign(df))", ["x: c(1, 1)\ny: c(1, 1)"]);
  await errMatch("print(sign('a'))", /non-numeric argument to mathematical function/);
  await errMatch("print(sign())", /0 arguments passed to 'sign' which requires 1/);
  await errMatch("print(sign(1, 2))", /2 arguments passed to 'sign' which requires 1/);
});

// ---- summary ----
test("eng4 summary numeric", async () => {
  await outIs("print(summary(c(1, 2, 3, 4)))", [
    "c(Min. = 1, 1st Qu. = 1.75, Median = 2.5, Mean = 2.5, 3rd Qu. = 3.25, Max. = 4)",
  ]);
  await outIs("print(summary(c(1, 2, NA)))", [
    "c(Min. = 1, 1st Qu. = 1.25, Median = 1.5, Mean = 1.5, 3rd Qu. = 1.75, Max. = 2, NA's = 1)",
  ]);
  await outIs("print(summary(c(1, 2, NaN)))", [
    "c(Min. = 1, 1st Qu. = 1.25, Median = 1.5, Mean = 1.5, 3rd Qu. = 1.75, Max. = 2, NA's = 1)",
  ]);
  await outIs("print(summary(numeric(0)))", [
    "c(Min. = NA, 1st Qu. = NA, Median = NA, Mean = NaN, 3rd Qu. = NA, Max. = NA)",
  ]);
  // quantile.type は全9タイプを quantile.default どおり再現する。
  await outIs("print(summary(c(1, 2, 3), quantile.type = 1))", [
    "c(Min. = 1, 1st Qu. = 1, Median = 2, Mean = 2, 3rd Qu. = 3, Max. = 3)",
  ]);
  await outIs("print(summary(c(1, 2, 3), quantile.type = 3))", [
    "c(Min. = 1, 1st Qu. = 1, Median = 2, Mean = 2, 3rd Qu. = 2, Max. = 3)",
  ]);
  await outIs("print(summary(c(1, 2, 3, 4, 5), quantile.type = 6))", [
    "c(Min. = 1, 1st Qu. = 1.5, Median = 3, Mean = 3, 3rd Qu. = 4.5, Max. = 5)",
  ]);
  await outIs("print(summary(c(1.2345, 2.3456, 3.4567), digits = 2))", [
    "c(Min. = 1.2, 1st Qu. = 1.8, Median = 2.3, Mean = 2.3, 3rd Qu. = 2.9, Max. = 3.5)",
  ]);
  // 余分な位置引数は ... で黙って無視される（実 R 実測）。
  await outIs("print(summary(c(1, 2, 3), 4))", [
    "c(Min. = 1, 1st Qu. = 1.5, Median = 2, Mean = 2, 3rd Qu. = 2.5, Max. = 3)",
  ]);
  await errMatch(
    "print(summary(c(1, 2, 3), quantile.type = 10))",
    /'quantile.type' must be an integer between 1 and 9/,
  );
});
test("eng4 summary logical/character/NULL and df refusal", async () => {
  await outIs("print(summary(c(TRUE, FALSE, TRUE)))", [
    'c(Mode = "logical", FALSE = "1", TRUE = "2")',
  ]);
  await outIs("print(summary(c(NA, NA)))", ['c(Mode = "logical", NA\'s = "2")']);
  await outIs("print(summary(c('a', 'b')))", [
    'c(Length = "2", Class = "character", Mode = "character")',
  ]);
  await outIs("print(summary(NULL))", [
    'c(Length = "0", Class = "NULL", Mode = "NULL")',
  ]);
  await errMatch(DF + "print(summary(df))", /データフレームに対応していません/);
});

