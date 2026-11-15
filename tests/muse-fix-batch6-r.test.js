import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ6・R班（R27-N21〜N26／N10 の R 分）。
// 一次情報は R 公式ドキュメントと公式ソース：?seq（length.out は
// 「seq／seq.int では分数は切り上げ」）と seq.default の公式ソース
// seq.R（ceiling()、検証項目ごとの stop、from の逆算）、?sample
// （母集団は長さ1以上の要素か正の整数、size = 0 の明示は許容）、
// ?Extract（$ は再帰的オブジェクトと NULL にのみ有効、NULL の代入は
// 要素・列の削除）。当 VM に Rscript は無いため実機突合は未実施で、
// 公式ドキュメントで裁定した期待値を固定する。

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
const outIs = async (code, want) => {
  const p = await first(code);
  assert.deepEqual(outputs(p), [want], code);
};
const errHas = async (code, part) => {
  const errs = await errOf(code);
  assert.ok(errs.length, `${code}: エラーにならなかった`);
  assert.ok(
    errs.some((e) => (e.message || String(e)).includes(part)),
    `${code}: ${JSON.stringify(errs.map((e) => e.message || String(e)))}`,
  );
};

// ---------- R27-N21：seq の分数 length.out は切り上げ ----------
test("R27-N21 fractional length.out is rounded up", async () => {
  await outIs("print(seq(1, 10, length.out = 2.5))", "c(1, 5.5, 10)");
  await outIs("print(seq(1, 3, length.out = 2.5))", "c(1, 2, 3)");
  await outIs("print(seq(length.out = 2.5))", "c(1, 2, 3)");
  await outIs("print(seq(length.out = 0.5))", "c(1)");
  await outIs("print(seq(1, 10, length.out = -0.5))", "c()");
});

// ---------- R27-N22：seq の省略形と NULL 端点 ----------
test("R27-N22 omitted seq forms follow seq.R defaults", async () => {
  await outIs("print(seq())", "c(1)");
  await outIs("print(seq(1, by = 2))", "c(1)");
  await outIs("print(seq(by = 2))", "c(1)");
  await outIs("print(seq(to = 3))", "c(1, 2, 3)");
  await outIs("print(seq(length.out = 3))", "c(1, 2, 3)");
  await outIs("print(seq(from = 2, length.out = 3))", "c(2, 3, 4)");
  // from 省略＋to 指定＋length.out は from を逆算する（seq.R）。
  await outIs("print(seq(to = 5, length.out = 3))", "c(3, 4, 5)");
  await outIs("print(seq(to = 5, length.out = 1))", "c(5)");
  await outIs("print(seq(to = 10, by = 3, length.out = 3))", "c(4, 7, 10)");
});
test("R27-N22 NULL endpoints are length errors, not defaulted values", async () => {
  await errHas("print(seq(NULL, 3))", "'from' must be of length 1");
  await errHas("print(seq(1, NULL))", "'to' must be of length 1");
  await errHas("print(seq(1, 3, length.out = NULL))", "'length.out' must be of length 1");
});

// ---------- R27-N23：seq のエラーは真因を名指す ----------
test("R27-N23 seq errors name the true cause", async () => {
  await errHas("print(seq(c(1, 2), 3))", "'from' must be of length 1");
  await errHas("print(seq(1, c(2, 3)))", "'to' must be of length 1");
  await errHas("print(seq(1, 3, by = c(1, 2)))", "'by' must be of length 1");
  await errHas("print(seq(1, 3, by = 'a'))", "non-numeric argument to binary operator");
  await errHas("print(seq(NA, 3))", "'from' must be a finite number");
  await errHas("print(seq(1, NA))", "'to' must be a finite number");
  await errHas("print(seq(1, Inf))", "'to' must be a finite number");
  await errHas("print(seq(1, 3, by = 0))", "invalid '(to - from)/by'");
  await errHas("print(seq(1, 3, length.out = -1))", "'length.out' must be a non-negative number");
  await errHas("print(seq(1, 3, by = 2, length.out = 2))", "too many arguments");
  // wrong sign は符号不一致のときに限る。
  await errHas("print(seq(1, 3, by = -1))", "wrong sign in 'by' argument");
  await errHas("print(seq(3, 1, by = 1))", "wrong sign in 'by' argument");
  // by = 0 でも del = 0 なら実 R は from／to を返す。
  await outIs("print(seq(1, 1, by = 0))", "c(1)");
  await outIs("print(seq(0, 0, by = 0))", "c(0)");
});

// ---------- seq の既存の正常形の保持 ----------
test("seq established forms are preserved", async () => {
  await outIs("print(seq(1, 5, 2))", "c(1, 3, 5)");
  await outIs("print(seq(5, 1))", "c(5, 4, 3, 2, 1)");
  await outIs("print(seq(0, 1, length.out = 5))", "c(0, 0.25, 0.5, 0.75, 1)");
  await outIs("print(seq(1, 2, along.with = c(9, 8, 7)))", "c(1, 1.5, 2)");
  await outIs("print(seq(1, by = 2, length.out = 3))", "c(1, 3, 5)");
  await outIs("print(seq(3))", "c(1, 2, 3)");
  await outIs("print(seq(0))", "c(1, 0)");
  await outIs("print(seq(-1))", "c(1, 0, -1)");
});

// ---------- R27-N24：sample の空・NULL・NA は名指し停止 ----------
test("R27-N24 sample rejects empty/NULL/NA x by name", async () => {
  await errHas("x <- sample(c())", "invalid first argument");
  await errHas("x <- sample(NULL)", "invalid first argument");
  await errHas("x <- sample(NA)", "invalid first argument");
});
test("R27-N24 sample valid forms are preserved", async () => {
  // size = 0 の明示がある長さ0は ?sample の記述により許される。
  await first("x <- sample(c(), size = 0)");
  await first("x <- sample(5)");
  await first("x <- sample(5.5)");
  await first("x <- sample('a')");
  await first("x <- sample(c(2, 4, 6))");
});

// ---------- R27-N25：原子ベクトルへの $ は読み書きとも名指し停止 ----------
test("R27-N25 $ on atomic vectors fails by name, no ghost fields", async () => {
  await errHas("x <- c(1, 2)\nx$y <- 5", "$ operator is invalid for atomic vectors");
  await errHas("x <- c(1, 2)\nprint(x$y)", "$ operator is invalid for atomic vectors");
  await errHas("x <- 5\nx$y <- 3", "$ operator is invalid for atomic vectors");
  await errHas("x <- 'abc'\nprint(x$y)", "$ operator is invalid for atomic vectors");
  await errHas("x <- NA\nprint(x$y)", "$ operator is invalid for atomic vectors");
  await errHas("x <- c(1, 2)\nx$y <- 5\nprint(x$y)", "$ operator is invalid for atomic vectors");
  // 停止した代入の後もベクトル自体は無傷（幽霊フィールドを作らない）。
  const p = await first("x <- c(1, 2)\nprint(x)");
  assert.deepEqual(outputs(p), ["c(1, 2)"]);
  assert.deepEqual(p.vars.x, [1, 2]);
});
test("R27-N25 $ on NULL stays valid (returns NULL)", async () => {
  await outIs("x <- NULL\nprint(x$y)", "NULL");
});

// ---------- R27-N26：df$列 <- NULL は列の削除 ----------
test("R27-N26 df column deletion via NULL assignment", async () => {
  const base = "df <- data.frame(a = c(1, 2), b = c(3, 4))\ndf$b <- NULL\n";
  await outIs(base + "print(names(df))", 'c("a")');
  await outIs(base + "print(df$a)", "c(1, 2)");
  await outIs(base + "print(df$b)", "NULL");
  await outIs(base + "print(df)", "a: c(1, 2)");
  // 存在しない列への NULL 代入は実 R でも無言の無操作。
  await outIs(
    "df <- data.frame(a = c(1, 2))\ndf$zzz <- NULL\nprint(names(df))",
    'c("a")',
  );
  // 手順文が削除の効果に一致する。
  const p = await first(base + "print(df$a)");
  assert.ok(
    JSON.stringify(p.trace).includes("列を削除"),
    JSON.stringify(p.trace),
  );
  // 最終状態からも列が消えている。
  assert.deepEqual(Object.keys(p.vars.df.columns), ["a"]);
});
test("R27-N26 df normal $ operations are preserved", async () => {
  await outIs(
    "df <- data.frame(a = c(1, 2))\ndf$b <- c(5, 6)\nprint(df$b)",
    "c(5, 6)",
  );
  await outIs("df <- data.frame(a = c(1, 2))\nprint(df$a)", "c(1, 2)");
  await outIs("df <- data.frame(a = c(1, 2))\nprint(df$zzz)", "NULL");
  await outIs(
    "df <- data.frame(a = c(1, 2))\ndf$b <- NA\nprint(df$b)",
    "c(NA, NA)",
  );
});

// ---------- R27-N10（R 分）：最終状態の非有限数は R 表記の文字列 ----------
test("R27-N10 non-finite values in final vars use R display strings", async () => {
  const p1 = await first("x <- 1/0\nprint(x)");
  assert.deepEqual(outputs(p1), ["c(Inf)"]);
  assert.deepEqual(p1.vars.x, ["Inf"]);
  const p2 = await first("x <- c(1/0, 0/0, -1/0)\ny <- 2.5");
  assert.deepEqual(p2.vars.x, ["Inf", "NaN", "-Inf"]);
  assert.equal(p2.vars.y, 2.5); // 有限値は数値のまま
  const p3 = await first("df <- data.frame(a = c(1/0, 2))");
  assert.deepEqual(p3.vars.df.columns.a, ["Inf", 2]);
  // 名前付きベクトルの .names 属性もスナップショットで保持する。
  const p4 = await first("x <- c(a = 1/0, b = 2)");
  assert.deepEqual([...p4.vars.x], ["Inf", 2]);
  assert.deepEqual(p4.vars.x.names, ["a", "b"]);
  // JSON 直列化しても null 化しない（表示面の不変条件）。
  assert.ok(!JSON.stringify(p2.vars).includes("null"), JSON.stringify(p2.vars));
  // groups（実行中に確定する表示）は従来どおり。
  assert.ok(
    JSON.stringify(p1.groups).includes("c(Inf)"),
    JSON.stringify(p1.groups),
  );
});
