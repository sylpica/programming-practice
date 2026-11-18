// 収束判定ラウンド A4班の回帰テスト（CONV-A4-01）。
// 期待値は全て実 R 4.3.3（Rscript）の実測で固定した。
// 対象: sort／order 系の NULL 入力処理。
//  - sort(NULL)／sort.int(NULL) は NULL を返す（空ベクトルではない）
//  - order() は NULL を返す
//  - order のデータ引数に NULL があれば "argument N is not a vector" エラー
//  - sort.list(NULL) は "argument 1 is not a vector" エラー
//  - rev(NULL) は NULL、rank(NULL) は長さ0（従来どおり一致していた面の固定）
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const d = getDefinition("r");
const run = (code) => d.simulate(code, structuredClone(d.model.defaults));
const outs = (r) => (r.paths?.[0]?.outputs ?? []).map((o) => o.text);
const errOf = (r) => {
  const e = r.error ?? r.paths?.[0]?.error ?? null;
  return e == null ? null : (e.message ?? String(e));
};

test("CONV-A4-01: sort(NULL) returns NULL, not an empty vector", async () => {
  const r = await run("z <- sort(NULL); cat(is.null(z)); print(sort(NULL))");
  assert.equal(errOf(r), null);
  assert.deepEqual(outs(r), ["TRUE", "NULL"]);
});

test("CONV-A4-01: sort.int(NULL) returns NULL", async () => {
  const r = await run("z <- sort.int(NULL); cat(is.null(z))");
  assert.equal(errOf(r), null);
  assert.deepEqual(outs(r), ["TRUE"]);
});

test("CONV-A4-01: sort of an empty vector stays an empty vector", async () => {
  const r = await run("z <- sort(numeric(0)); cat(is.null(z), length(z))");
  assert.equal(errOf(r), null);
  assert.deepEqual(outs(r), ["FALSE 0"]);
});

test("CONV-A4-01: order() with no data arguments returns NULL", async () => {
  const r = await run("z <- order(); cat(is.null(z))");
  assert.equal(errOf(r), null);
  assert.deepEqual(outs(r), ["TRUE"]);
});

test("CONV-A4-01: order with a NULL data argument errors like real R", async () => {
  assert.equal(errOf(await run("z <- order(NULL)")), "argument 1 is not a vector");
  assert.equal(errOf(await run("z <- order(NULL, 1:3)")), "argument 1 is not a vector");
  assert.equal(errOf(await run("z <- order(1:3, NULL)")), "argument 2 is not a vector");
});

test("CONV-A4-01: sort.list(NULL) errors like real R", async () => {
  assert.equal(errOf(await run("z <- sort.list(NULL)")), "argument 1 is not a vector");
});

test("CONV-A4-01: rev(NULL) is NULL and rank(NULL) has length 0 (unchanged surfaces)", async () => {
  const r = await run("a <- rev(NULL); b <- rank(NULL); cat(is.null(a), is.null(b), length(b))");
  assert.equal(errOf(r), null);
  assert.deepEqual(outs(r), ["TRUE FALSE 0"]);
});

test("CONV-A4-01: ordinary sort/order behavior is unchanged", async () => {
  const r = await run('x <- c(3, 1, 2); cat(sort(x), order(x), sort.list(x), sort.int(x, decreasing = TRUE))');
  assert.equal(errOf(r), null);
  assert.deepEqual(outs(r), ["1 2 3 2 3 1 2 3 1 3 2 1"]);
});
