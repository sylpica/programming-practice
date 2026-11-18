import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced as ref3 } from "../js/types/r/reference-advanced-part3.js";
import { referenceAdvanced as ref6 } from "../js/types/r/reference-advanced-part6.js";
import { referenceAdvanced as ref7 } from "../js/types/r/reference-advanced-part7.js";
import { referenceAdvanced as ref9 } from "../js/types/r/reference-advanced-part9.js";
import { referenceAdvanced as ref10 } from "../js/types/r/reference-advanced-part10.js";

// ADV-B4S 独立監査（docs/audit/ADV-B4S-AUDIT.md）の欠陥 F1〜F10 に対する
// 修正チームの回帰テスト。期待値は実 R 4.3.3（/usr/bin/Rscript）の実測と、
// 非心カイ二乗については mpmath 40〜50 桁の独立計算（SciPy は極端裾で
// アンダーフロー／誤差があるため真値の正本にしない）を根拠とする。
// 処置の詳細は docs/audit/ADV-B4S-FIX.md。

const run = async (code) => {
  const d = getDefinition("r");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const first = async (code) => {
  const r = await run(code);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const errOf = async (code) => {
  const r = await run(code);
  return [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
};
const errMatch = async (code, re) => {
  const errs = await errOf(code);
  assert.ok(errs.some((e) => re.test(e.message)), code + " -> " + JSON.stringify(errs));
};
const outputs = (p) => p.outputs.map((o) => o.text);
const outIs = async (code, expected) => {
  const p = await first(code);
  assert.deepEqual(outputs(p), expected, code);
};
const warnsOf = async (code) => {
  const p = await first(code);
  return p.trace.filter((t) => t.kind === "warning").map((t) => t.text);
};
const numsApprox = async (code, expected, tol = 1e-12) => {
  const p = await first(code);
  const text = outputs(p)[0];
  const got = [...text.matchAll(/-?\d+\.?\d*(e[+-]?\d+)?/gi)].map((m) => Number(m[0]));
  assert.equal(got.length, expected.length, code + " -> " + text);
  got.forEach((g, i) => {
    const e = expected[i];
    assert.ok(
      Math.abs(g - e) <= tol * Math.max(1, Math.abs(e)),
      `${code} [${i}]: got ${g}, expected ${e}`,
    );
  });
};
const item = (ref, name) => ref.find((r) => r.name === name);

// ---- F1: pnbinom の q = Inf（実 R: 1／0／0、警告なし）
test("B4S-FIX F1 pnbinom Inf", async () => {
  await outIs("print(pnbinom(Inf, 10, 0.4))", ["c(1)"]);
  await outIs("print(pnbinom(Inf, 10, 0.4, lower.tail = FALSE))", ["c(0)"]);
  await outIs("print(pnbinom(Inf, 10, 0.4, log.p = TRUE))", ["c(0)"]);
  await outIs("print(pnbinom(Inf, size = 10, mu = 15))", ["c(1)"]);
  assert.deepEqual(await warnsOf("print(pnbinom(Inf, 10, 0.4))"), []);
  // 有限 q の従来値が壊れていないこと（実 R 4.3.3 実測）
  await numsApprox("print(pnbinom(3, 10, 0.4))", [0.007793016832000013], 1e-12);
  await numsApprox("print(qnbinom(0.5, 10, 0.4))", [14], 1e-12);
});

// ---- F2: 離散 d 系の x = ±Inf で余分な警告を出さない（実 R は警告なし）
// 有限の非整数では従来どおり警告する。
test("B4S-FIX F2 discrete d Inf warnings", async () => {
  await outIs("print(dpois(c(3, Inf, -Inf), 4))", [
    "c(0.19536681481316454, 0, 0)",
  ]);
  assert.deepEqual(await warnsOf("print(dpois(c(3, Inf, -Inf), 4))"), []);
  assert.deepEqual(await warnsOf("print(dgeom(Inf, 0.4))"), []);
  assert.deepEqual(await warnsOf("print(dnbinom(Inf, 10, 0.4))"), []);
  assert.deepEqual(await warnsOf("print(dbinom(Inf, 10, 0.4))"), []);
  assert.deepEqual(await warnsOf("print(dhyper(Inf, 10, 5, 4))"), []);
  // 有限非整数の警告は維持（実 R 実測: non-integer x = 2.500000）
  for (const fn of ["dpois", "dgeom", "dnbinom", "dbinom", "dhyper"]) {
    const args =
      fn === "dpois" ? "2.5, 4" :
      fn === "dgeom" ? "2.5, 0.4" :
      fn === "dhyper" ? "2.5, 10, 5, 4" : "2.5, 10, 0.4";
    const w = await warnsOf(`print(${fn}(${args}))`);
    assert.ok(w.some((t) => /non-integer x = 2\.500000/.test(t)), fn + " -> " + JSON.stringify(w));
  }
  // dwilcox／dsignrank は実 R でも非整数・Inf で警告しない（同根なしを確認）
  assert.deepEqual(await warnsOf("print(dwilcox(2.5, 5, 4))"), []);
  assert.deepEqual(await warnsOf("print(dsignrank(Inf, 10))"), []);
});

// ---- F3: r 系の警告有無を実 R に合わせる
test("B4S-FIX F3 r-family warnings", async () => {
  // rlogis は負の scale でも正常値・警告なし（実測）。NA では警告する。
  assert.deepEqual(await warnsOf("print(rlogis(3, 0, -1))"), []);
  assert.ok((await warnsOf("print(rlogis(3, 0, NA))")).length > 0);
  assert.ok((await warnsOf("print(rlogis(3, NA, 1))")).length > 0);
  // 同根の洗い出し（いずれも実 R 4.3.3 実測）
  assert.ok((await warnsOf("print(rexp(3, 0))")).length > 0); // rate=0 で警告
  assert.deepEqual(await warnsOf("print(rexp(3, Inf))"), []);
  assert.ok((await warnsOf("print(rgeom(3, 0))")).length > 0); // prob=0 で警告
  assert.deepEqual(await warnsOf("print(rgeom(3, 1))"), []);
  assert.ok((await warnsOf("print(rgamma(3, 1, scale = -1))")).length > 0);
  assert.ok((await warnsOf("print(rgamma(3, 1, rate = -1))")).length > 0);
  assert.deepEqual(await warnsOf("print(rgamma(3, 1, scale = 0))"), []);
  assert.ok((await warnsOf("print(rhyper(3, 10, 5, 16))")).length > 0); // k > m+n
  assert.deepEqual(await warnsOf("print(rhyper(3, 10, 5, 15))"), []); // k = m+n は正常
  assert.ok((await warnsOf("print(rnbinom(3, 0, 0.5))")).length > 0); // size=0
  assert.ok((await warnsOf("print(rt(3, 5, ncp = NA))")).length > 0);
  assert.ok((await warnsOf("print(rcauchy(3, NA, 1))")).length > 0);
  assert.ok((await warnsOf("print(rlnorm(3, NA, 1))")).length > 0);
});

// ---- F4: rsmirnov の sizes 値検証（実 R の文言どおり）
test("B4S-FIX F4 rsmirnov sizes validation", async () => {
  await errMatch("print(rsmirnov(3, c(-1, 12)))", /not enough 'x' data/);
  await errMatch("print(rsmirnov(3, c(0, 12)))", /not enough 'x' data/);
  await errMatch(
    "print(rsmirnov(3, c(10, NA)))",
    /missing value where TRUE\/FALSE needed/,
  );
  await errMatch("print(rsmirnov(3, c(10, Inf)))", /invalid 'times' value/);
  await errMatch(
    "print(rsmirnov(3, c(4)))",
    /argument 'sizes' must be a vector of length 2/,
  );
  // 正常形（非整数は切り捨て）は通る
  await first("print(rsmirnov(3, c(10, 12)))");
  await first("print(rsmirnov(3, c(10.5, 12)))");
});

// ---- F5: rWishart の n／df 検証を実 R に合わせる
test("B4S-FIX F5 rWishart validation", async () => {
  // n は負・0・NA でも実 R は配列を返す（エラーにしない）
  await first("print(rWishart(-1, 5, c(1, 0, 0, 1)))");
  await first("print(rWishart(0, 5, c(1, 0, 0, 1)))");
  await first("print(rWishart(NA, 5, c(1, 0, 0, 1)))");
  // df < 次元（c(1,0,0,1) は 2 次元）で実 R どおり停止
  await errMatch(
    "print(rWishart(2, -1, c(1, 0, 0, 1)))",
    /inconsistent degrees of freedom and dimension/,
  );
  await errMatch(
    "print(rWishart(2, 0, c(1, 0, 0, 1)))",
    /inconsistent degrees of freedom and dimension/,
  );
  await errMatch(
    "print(rWishart(2, 1.5, c(1, 0, 0, 1)))",
    /inconsistent degrees of freedom and dimension/,
  );
  await first("print(rWishart(2, 2, c(1, 0, 0, 1)))");
  // df = NA は NaN の配列を返す（エラー・警告なし）
  const p = await first("print(rWishart(2, NA, c(1, 0, 0, 1)))");
  assert.deepEqual(p.trace.filter((t) => t.kind === "warning"), []);
});

// ---- F6: setNames の不足分は NA 埋め（実 R 実測）
test("B4S-FIX F6 setNames NA fill", async () => {
  await outIs("print(names(setNames(c(1, 2, 3), \"a\")))", [
    "c(\"a\", NA, NA)",
  ]);
  await outIs("print(names(setNames(c(1, 2), c(\"a\", NA))))", [
    "c(\"a\", NA)",
  ]);
  // 生の戻り値の名前属性も NA（監査の照合形式："" ではない）
  const d = getDefinition("r");
  const r = await d.simulate(
    "zz <- setNames(c(1, 2, 3), \"a\")",
    structuredClone(d.model.defaults),
  );
  const v = r.paths[0].vars.zz;
  assert.equal(v.names[0], "a");
  assert.equal(v.names[1]?.kind, "NA");
  assert.equal(v.names[2]?.kind, "NA");
});

// ---- F7: 対応項目の example がシミュレータで実行できる形
test("B4S-FIX F7 examples run in simulator", async () => {
  const rw = item(ref3, "rWishart");
  assert.equal(rw.example, "rWishart(2, 5, c(1, 0, 0, 1))");
  await first(rw.example);
  for (const nm of ["head", "tail"]) {
    const it = item(ref9, nm);
    assert.ok(!/letters/.test(it.example), nm + " example must not use letters");
    await first(it.example);
  }
  await outIs(item(ref9, "head").example.replace(/^head/, "print(head") + ")", [
    "c(\"a\", \"b\")",
  ]);
  await outIs(item(ref9, "tail").example.replace(/^tail/, "print(tail") + ")", [
    "c(\"g\", \"h\")",
  ]);
});

// ---- F8: syntax の事実誤り 5 件（実 R formals と公式ヘルプ Usage で確認）
test("B4S-FIX F8 syntax corrections", () => {
  // utils::find の formals／?apropos の Usage と一致
  assert.equal(
    item(ref10, "find").syntax,
    "find(what, mode = \"any\", numeric = FALSE, simple.words = TRUE)",
  );
  // stats::arima／arima0 の formals（n.cond は method の直後）
  assert.ok(item(ref7, "arima").syntax.includes("method = c(\"CSS-ML\", \"ML\", \"CSS\"), n.cond, SSinit"));
  assert.ok(item(ref7, "arima0").syntax.includes("method = c(\"ML\", \"CSS\"), n.cond, optim.control"));
  // ?lag.plot の Usage（oma／ask／do.lines／labels は type の後、... の前）
  assert.ok(
    item(ref7, "lag.plot").syntax.includes(
      "type = \"p\", oma = NULL, ask = NULL, do.lines = (n <= 150), labels = do.lines,...",
    ),
  );
  // diffinv.default の formals は末尾に ... を持つ
  assert.equal(item(ref7, "diffinv").syntax, "diffinv(x, lag = 1, differences = 1, xi, ...)");
  // ?lm.influence の Usage
  assert.equal(
    item(ref6, "qr.influence").syntax,
    "qr.influence(qr, res, tol = 10 * .Machine$double.eps)",
  );
});

// ---- F9: 非心カイ二乗の極端領域の精度（真値は mpmath 40 桁。
// 実 R の pchisq は真値と一致するが、実 R の dchisq は ncp が大きいと
// R 自身がずれる（ncp=150 で対数誤差 0.24）ため密度は mpmath を正本とする。
// SciPy の ncx2 も (1, 10, ncp=300) で 1.3e-3 ずれることを確認済み）
test("B4S-FIX F9 noncentral chisq extreme ncp", async () => {
  // 監査の再現ケース
  await numsApprox("print(pchisq(4, 4, ncp = 150))", [3.6673779157925854e-26], 1e-9);
  await numsApprox("print(dchisq(4, 4, ncp = 150, log = TRUE))", [-57.54422477258186], 1e-9);
  await numsApprox("print(pchisq(10, 4, ncp = 150))", [6.386166583856157e-21], 1e-9);
  await numsApprox("print(dchisq(10, 4, ncp = 150, log = TRUE))", [-46.07439282970611], 1e-9);
  // ncp = 100／300／1000 の裾（mpmath 照合済み）
  await numsApprox("print(pchisq(4, 4, ncp = 100))", [4.97053043714935e-17], 1e-9);
  await numsApprox("print(dchisq(4, 4, ncp = 100, log = TRUE))", [-36.7386304704747], 1e-9);
  await numsApprox("print(pchisq(1, 10, ncp = 300))", [4.4763376711262869e-66], 1e-9);
  await numsApprox(
    "print(pchisq(4, 4, ncp = 1000, log.p = TRUE))",
    [-447.2356057394405],
    1e-9,
  );
  await numsApprox("print(dchisq(4, 4, ncp = 1000, log = TRUE))", [-445.20675218704434], 1e-9);
  // 中央付近と分位点の回帰（実 R 実測）
  await numsApprox("print(pchisq(100, 4, ncp = 150))", [0.008587142975359823], 1e-9);
  await numsApprox("print(qchisq(0.5, 4, ncp = 150))", [153.00331345697901], 1e-9);
  // 退化形（q = 0、df = 0）が壊れていないこと
  await numsApprox("print(pchisq(0, 0, ncp = 2))", [0.36787944117144233], 1e-9);
  await outIs("print(dchisq(0, 0, ncp = 2))", ["c(Inf)"]);
});

// ---- F10: ブラケットメソッドの example が実 R の式として解析できる形
// （裸の名前 "[.getAnywhere" 等は R の parser で構文解析できない。
// part6 の [.terms の例 "terms[1]" と同じく、添字式の使用例に統一した。
// 4 件とも実 R 4.3.3 の parse() で解析できることを修正時に確認済みで、
// getAnywhere／person の 2 系統は実走も確認済み）
test("B4S-FIX F10 bracket method examples", () => {
  assert.equal(item(ref10, "[.getAnywhere").example, "getAnywhere(\"mean\")[1]");
  assert.equal(item(ref10, "[[.hashtab").example, "h[[\"key\"]]");
  assert.equal(
    item(ref10, "$.person").example,
    "person(\"John\", \"Doe\", email = \"john@example.com\")$email",
  );
  assert.equal(item(ref10, "[.person").example, "person(\"John\", \"Doe\")[1]");
});
