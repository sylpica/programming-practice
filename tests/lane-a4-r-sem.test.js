// 高度A4班 R基礎意味論チームの回帰テスト。
// 期待値は全て実 R 4.3.3（/usr/bin/Rscript）の実測と公式ヘルプで固定した。
// 対象: deparse再構成（data.frame列名）、sd文字列強制、scan（R-D06-1）、
// trace refs（R-D06-2）、未定義名への代入の帰属（R-挙動2）、
// sort.list の method="quick"、RB4／RB10 の再確認。
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
const refsOf = (r) => {
  const s = new Set();
  for (const p of r.paths ?? []) for (const t of p.trace ?? []) for (const x of t.refs ?? []) s.add(x);
  return s;
};
const dfNames = async (expr) => {
  const r = await run(`print(names(data.frame(${expr})))`);
  assert.equal(errOf(r), null, expr);
  return outs(r)[0];
};

// ---- deparse 再構成スイープ（実 R: names(data.frame(<式>)) 実測値） ----
test("deparse: X prefix follows the ORIGINAL first character (make.names)", async () => {
  assert.equal(await dfNames("-(1 + 1)"), 'c("X..1...1.")');
  assert.equal(await dfNames("!TRUE"), 'c("X.TRUE")');
  assert.equal(await dfNames("(-1) ^ 2"), 'c("X..1..2")');
  assert.equal(await dfNames("-sin(1)"), 'c("X.sin.1.")');
  assert.equal(await dfNames("!(TRUE & FALSE)"), 'c("X..TRUE...FALSE.")');
  assert.equal(await dfNames("-1"), 'c("X.1")');
});
test("deparse: string literals keep their quotes", async () => {
  assert.equal(await dfNames('"a"'), 'c("X.a.")');
  assert.equal(await dfNames('paste("a")'), 'c("paste..a..")');
  assert.equal(await dfNames('"a" == "a"'), 'c("X.a......a.")');
  assert.equal(await dfNames('"1"'), 'c("X.1.")');
});
test("deparse: no extra parens around unary right operand", async () => {
  assert.equal(await dfNames("2 ^ -1"), 'c("X2..1")');
  assert.equal(await dfNames("2 ^ -sin(1)"), 'c("X2..sin.1.")');
  assert.equal(await dfNames("1 / !TRUE"), 'c("X1..TRUE")');
});
test("deparse: kept forms stay stable", async () => {
  assert.equal(await dfNames("1 + 1"), 'c("X1...1")');
  assert.equal(await dfNames("(1 + 2) * 3"), 'c("X.1...2....3")');
  assert.equal(await dfNames("2 ^ 3 ^ 2"), 'c("X2.3.2")');
  assert.equal(await dfNames("TRUE"), 'c("TRUE.")');
});

// ---- sd の文字列強制（実 R 4.3.3: sd(c("a","b")) は NA＋警告） ----
test("sd coerces character input like as.double (real R via var)", async () => {
  const r = await run('print(sd(c("a", "1", "2"), na.rm = TRUE))');
  assert.equal(errOf(r), null);
  assert.equal(outs(r)[0], "0.7071067811865476");
  const r2 = await run('print(sd(c("a", "b")))');
  assert.equal(outs(r2)[0], "NA");
  const warns = (r2.paths[0].trace ?? []).filter((t) => t.kind === "warning");
  assert.ok(warns.length >= 1, "coercion warning expected");
});

// ---- R-D06-1: scan が実効カタログ（基礎＋高度）とドット名を解決する ----
test("scan resolves advanced items and dotted foundation names", () => {
  const scan = (code) => d.scan(code);
  assert.ok(scan("print(abbreviate(x, 2))").includes("abbreviate"));
  assert.ok(scan("print(is.na(x))").includes("is.na"));
  assert.ok(scan("df <- data.frame(a = 1)").includes("data.frame"));
  assert.ok(scan("df <- read.csv(\"model.csv\")").includes("read.csv"));
  assert.ok(scan("print(as.numeric(x))").includes("as.numeric"));
  assert.ok(scan("print(as.character(x))").includes("as.character"));
  assert.ok(scan("print(1 * 2 + 3)").includes("*"));
  assert.ok(scan("print(1 * 2 + 3)").includes("+"));
});

// ---- R-D06-2: 演算子・定数の使用が trace refs に登録される ----
test("trace refs register binary/unary operators and constants", async () => {
  assert.ok(refsOf(await run("print(1 * 2)")).has("*"));
  assert.ok(refsOf(await run("print(1 + 2)")).has("+"));
  assert.ok(refsOf(await run("print(-1)")).has("-"));
  assert.ok(refsOf(await run("print(!TRUE)")).has("!"));
  assert.ok(refsOf(await run("print(TRUE && FALSE)")).has("&&"));
  assert.ok(refsOf(await run("print(TRUE)")).has("TRUE"));
  assert.ok(refsOf(await run("print(NA)")).has("NA"));
  assert.ok(refsOf(await run("print(NULL)")).has("NULL"));
});
test("trace refs register assignment and replacement operators", async () => {
  assert.ok(refsOf(await run("x <- 1")).has("<-"));
  const r = await run("df <- data.frame(a = 1)\ndf$a <- 2");
  assert.ok(refsOf(r).has("$<-"));
  const r2 = await run("v <- c(1, 2)\nv[1] <- 9");
  assert.ok(refsOf(r2).has("[<-"));
});

// ---- R-挙動2: 未定義名への代入は「未定義の名前」で止まる ----
test("assignment to undefined base name reports undefined name", async () => {
  for (const code of ["df$x <- 1", "df[1] <- 1", "df$a[1] <- 1", "sum$x <- 1"]) {
    const r = await run(code);
    assert.match(String(errOf(r)), /未定義の名前/, code);
  }
  const ok = await run("df <- data.frame(a = 1)\ndf$a <- 2\nprint(df$a)");
  assert.equal(errOf(ok), null);
  assert.deepEqual(outs(ok), ["c(2)"]);
});

// ---- sort.list の method="quick"（実 R は受理、order は不受理） ----
test("sort.list accepts method='quick', order rejects it", async () => {
  const r = await run('print(sort.list(c(3, 1, 2), method = "quick", na.last = NA))');
  assert.equal(errOf(r), null);
  assert.equal(outs(r)[0], "c(2, 3, 1)");
  const r2 = await run('print(order(c(3, 1, 2), method = "quick"))');
  assert.ok(errOf(r2), "order must reject quick like real R");
});

// ---- RB4 / RB10 再確認 ----
test("RB4: data.frame with mismatched column lengths errors", async () => {
  const r = await run("data.frame(a = 1:3, b = 1:2)");
  assert.ok(errOf(r));
  const ok = await run("print(data.frame(a = 1:3, b = 1))");
  assert.equal(errOf(ok), null);
});
test("RB10: length>1 condition errors like R 4.3.3", async () => {
  const r = await run("if (c(TRUE, TRUE)) 1");
  assert.match(String(errOf(r)), /length > 1/);
});

// ---- プローブ裁定の固定（実 R 4.3.3） ----
test("adjudicated probe values: median(NaN), seq(NULL), as.numeric()", async () => {
  assert.equal(outs(await run("print(median(NaN))"))[0], "NA");
  assert.equal(outs(await run("print(is.nan(median(NaN)))"))[0], "c(FALSE)");
  assert.equal(outs(await run("print(seq(NULL))"))[0], "c()");
  assert.equal(outs(await run("print(length(as.numeric()))"))[0], "0");
});
