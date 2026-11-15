import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ3・R班（R24-N8／N26／N27／N28／N29）。
// 根拠は R 公式ドキュメント（?Extract、?Control、R Language Definition、
// 各関数の base ヘルプ Usage）。当 VM に実機 R は無いため、実機対照では
// なく公式ドキュメントで裁定した期待値を固定する。

const run = async (code) => {
  const d = getDefinition("r");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const first = async (code) => {
  const r = await run(code);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r));
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const errOf = async (code) => {
  const r = await run(code);
  return [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
};
const outputs = (p) => p.outputs.map((o) => o.text);

// ---- R24-N8: 空添字代入 x[] <- v は全要素への代入（?Extract） ----
test("R24-N8 x[] <- 0 assigns to every element", async () => {
  const p = await first("x <- c(1, 2, 3)\nx[] <- 0\nprint(x)");
  assert.deepEqual(outputs(p), ["c(0, 0, 0)"]);
  assert.deepEqual([...p.vars.x], [0, 0, 0]);
});

test("R24-N8 x[] <- vector recycles and keeps names", async () => {
  const p = await first("v <- c(a = 1, b = 2)\nv[] <- c(9, 8)\nprint(v)");
  assert.deepEqual(outputs(p), ["c(a = 9, b = 8)"]);
  const p2 = await first("x <- c(1, 2, 3)\nx[] <- c(9, 8)\nprint(x)");
  assert.deepEqual(outputs(p2), ["c(9, 8, 9)"]);
});

test("R24-N8 scalar x[] <- v replaces the single element", async () => {
  const p = await first("x <- 5\nx[] <- 0\nprint(x)");
  assert.deepEqual(outputs(p), ["0"]);
  assert.equal(p.vars.x, 0);
});

test("R24-N8 data.frame df[] <- 0 assigns every column element", async () => {
  const p = await first(
    "df <- data.frame(a = c(1, 2), b = c(3, 4))\ndf[] <- 0\nprint(df)",
  );
  assert.deepEqual(outputs(p), ["a: c(0, 0)\nb: c(0, 0)"]);
});

test("R24-N8 column df$a[] <- 0 assigns that column", async () => {
  const p = await first("df <- data.frame(a = c(1, 2))\ndf$a[] <- 0\nprint(df)");
  assert.deepEqual(outputs(p), ["a: c(0, 0)"]);
});

test("R24-N8 read form x[] is x itself (scalar, NULL, single-column df)", async () => {
  const p = await first("x <- 5\nprint(x[])\ny <- NULL\nprint(y[])");
  assert.deepEqual(outputs(p), ["5", "NULL"]);
  const p2 = await first("df <- data.frame(a = c(1, 2))\nprint(df[])");
  assert.deepEqual(outputs(p2), ["a: c(1, 2)"]);
  const p3 = await first("x <- c(1, 2)\nprint(x[])\nprint(x[NULL])");
  assert.deepEqual(outputs(p3), ["c(1, 2)", "c()"]);
});

test("R24-N8 empty replacement and wrong dimensions fail honestly", async () => {
  const e1 = await errOf("x <- c(1, 2)\nx[] <- c()");
  assert.ok(e1.some((e) => /replacement has length zero/.test(e.message)), JSON.stringify(e1));
  const e2 = await errOf("x <- c(1, 2, 3)\nx[1, 2] <- 0");
  assert.ok(e2.some((e) => /incorrect number of dimensions/.test(e.message)), JSON.stringify(e2));
  const e3 = await errOf("x <- c(1, 2, 3)\nprint(x[1, 2])");
  assert.ok(e3.some((e) => /incorrect number of dimensions/.test(e.message)), JSON.stringify(e3));
});

test("R24-N8 NULL subscript assignment stays a no-op, logical stays named-unsupported", async () => {
  const p = await first("x <- c(1, 2, 3)\nx[NULL] <- 0\nprint(x)");
  assert.deepEqual(outputs(p), ["c(1, 2, 3)"]);
  const e = await errOf("x <- c(1, 2, 3)\nx[c(TRUE, TRUE, FALSE)] <- 0");
  assert.ok(e.some((x) => /未対応/.test(x.message)), JSON.stringify(e));
});

// ---- R24-N26: `...` を持たない関数の余分な引数は unused argument ----
test("R24-N26 extra positional arguments are unused argument errors", async () => {
  const cases = [
    "length(c(1, 2), c(3))",
    "is.na(c(1), c(2))",
    "nrow(data.frame(a = c(1, 2)), c(1))",
    "ncol(data.frame(a = c(1, 2)), c(1))",
    "names(c(a = 1), c(2))",
    "seq_len(3, 4)",
    "rnorm(1, 0, 1, 2)",
    "runif(1, 0, 1, 2)",
    "sample(c(1, 2), 1, FALSE, NULL, 5)",
    "readline('a', 'b')",
    "rep(1, 1, 1, 1, 1)",
  ];
  for (const code of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => /unused argument/.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("R24-N26 extra named arguments name the argument", async () => {
  const cases = [
    ["length(c(1, 2), foo = 1)", "foo"],
    ["is.na(c(1), foo = 1)", "foo"],
    ["sd(c(1, 2), foo = 1)", "foo"],
    ["rnorm(1, foo = 1)", "foo"],
    ["sample(c(1, 2), foo = 1)", "foo"],
    ["seq_len(3, foo = 1)", "foo"],
  ];
  for (const [code, arg] of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => e.message.includes("unused argument") && e.message.includes(arg)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("R24-N26 functions with ... still accept extra arguments", async () => {
  // print(x, ...) / as.numeric(x, ...) / as.character(x, ...) は ... を持つ。
  const p = await first("print(c(1, 2), c(3))\nprint(as.numeric(c('1'), c(2)))");
  assert.deepEqual(outputs(p), ["c(1, 2)", "c(1)"]);
  // mean(x, trim, na.rm, ...) / median(x, na.rm, ...) の名前付き ... は
  // 実 R でも黙って無視される。
  const p2 = await first("print(mean(c(1, 2), extra = 1))\nprint(median(c(1, 3), extra = 1))");
  assert.deepEqual(outputs(p2), ["1.5", "2"]);
  // sum(...) の名前付き ... は合計対象のデータ。
  const p3 = await first("print(sum(c(1, 2), foo = 10))\nprint(sum(1, 2, na.rm = TRUE))");
  assert.deepEqual(outputs(p3), ["13", "3"]);
  // cat(...) は ... を持つ。
  const p4 = await first("cat('a', 'b')");
  assert.deepEqual(outputs(p4), ["a b"]);
});

test("R24-N26 formal named arguments keep working", async () => {
  const p = await first(
    "print(length(x = c(1, 2)))\nprint(seq_len(length.out = 3))\nprint(sd(c(1, 2, 3), na.rm = TRUE))",
  );
  assert.deepEqual(outputs(p), ["2", "c(1, 2, 3)", "1"]);
});

// ---- R24-N27: for の対象の意味論（?Control） ----
test("R24-N27 for over NULL and length-0 runs zero times and continues", async () => {
  const p = await first("for (i in c()) print(i)\nfor (i in NULL) print(i)\nprint(99)");
  assert.deepEqual(outputs(p), ["99"]);
  assert.equal(p.vars.i, undefined);
});

test("R24-N27 for over a scalar runs exactly once", async () => {
  const p = await first("for (i in 5) print(i)\nfor (i in 'a') print(i)\nfor (i in TRUE) print(i)");
  assert.deepEqual(outputs(p), ["5", '"a"', "TRUE"]);
});

test("R24-N27 for over a vector, data.frame and with break/next is unchanged", async () => {
  const p = await first(
    "total <- 0\nfor (i in 1:5) { total <- total + i }\nprint(total)\nprint(i)",
  );
  assert.deepEqual(outputs(p), ["c(15)", "5"]);
  const p2 = await first("for (i in c(1, 2, 3)) { if (i == 2) { next } print(i) }");
  assert.deepEqual(outputs(p2), ["1", "3"]);
  const p3 = await first("for (i in 1:5) { if (i > 2) { break } }\nprint(i)");
  assert.deepEqual(outputs(p3), ["3"]);
  const p4 = await first("df <- data.frame(a = c(1, 2), b = c(3, 4))\nfor (col in df) print(col)");
  assert.deepEqual(outputs(p4), ["c(1, 2)", "c(3, 4)"]);
});

test("R24-N27 unknown loop target stops with a truthful reason", async () => {
  const errs = await errOf("for (i in runif(1)) print(i)");
  assert.ok(errs.length, "no error");
  assert.ok(
    !errs.some((e) => /配列でない/.test(e.message)),
    JSON.stringify(errs),
  );
  assert.ok(
    errs.some((e) => /未確定の繰り返し対象/.test(e.message)),
    JSON.stringify(errs),
  );
});

// ---- R24-N28: 名前付き引数は仮引数として扱う ----
test("R24-N28(a) data.frame row.names is a parameter, not a column", async () => {
  const p = await first(
    "df <- data.frame(a = c(1, 2), row.names = c('r1', 'r2'))\nprint(df)\nprint(nrow(df))\nprint(names(df))",
  );
  assert.deepEqual(outputs(p), ["a: c(1, 2)", "2", 'c("a")']);
  assert.deepEqual(p.vars.df.rowNames, ["r1", "r2"]);
  assert.deepEqual(Object.keys(p.vars.df.columns), ["a"]);
});

test("R24-N28(a) data.frame row.names=NULL and other formals are not columns", async () => {
  const p = await first(
    "df <- data.frame(a = c(1, 2), row.names = NULL, check.names = FALSE, stringsAsFactors = FALSE)\nprint(df)",
  );
  assert.deepEqual(outputs(p), ["a: c(1, 2)"]);
  assert.deepEqual(Object.keys(p.vars.df.columns), ["a"]);
});

test("R24-N28(a) wrong-length row.names fails", async () => {
  const errs = await errOf("df <- data.frame(a = c(1, 2), row.names = c('r1'))");
  assert.ok(
    errs.some((e) => /row names supplied are of the wrong length/.test(e.message)),
    JSON.stringify(errs),
  );
});

test("R24-N28(b) cat with file writes to the model file, not the screen", async () => {
  const p = await first("cat('x', file = 'f.txt')\nprint('done')");
  assert.deepEqual(outputs(p), ['"done"']);
  assert.equal(p.model.files["f.txt"], "x");
});

test("R24-N28(b) cat file appends only with append=TRUE, sep still applies", async () => {
  const p = await first(
    "cat('a', 'b', sep = '-', file = 'f.txt')\ncat('c', file = 'f.txt', append = TRUE)\ncat('z', file = 'g.txt')",
  );
  assert.deepEqual(outputs(p), []);
  assert.equal(p.model.files["f.txt"], "a-bc");
  assert.equal(p.model.files["g.txt"], "z");
  const p2 = await first("cat('a', file = '')");
  assert.deepEqual(outputs(p2), ["a"]);
});

test("R24-N28 cat named non-formal arguments are ... data, in order", async () => {
  const p = await first("cat('a', foo = 2)");
  assert.deepEqual(outputs(p), ["a 2"]);
});

// ---- R24-N29: is.na は形状を保持する（?is.na） ----
test("R24-N29 is.na(data.frame) keeps the shape, NA cells included", async () => {
  const p = await first("print(is.na(data.frame(a = c(1, NA))))");
  assert.deepEqual(outputs(p), ["a: c(FALSE, TRUE)"]);
  const p2 = await first(
    "r <- is.na(data.frame(a = c(1, NA), b = c(NA, 2)))\nprint(r)\nprint(length(r$a))",
  );
  assert.deepEqual(outputs(p2), ["a: c(FALSE, TRUE)\nb: c(TRUE, FALSE)", "2"]);
  assert.deepEqual(p2.vars.r.columns, { a: [false, true], b: [true, false] });
});

test("R24-N29 is.na shapes for vector, scalar, NULL and read.csv frame", async () => {
  const p = await first(
    "print(is.na(c(1, NA, NaN)))\nprint(is.na(5))\nprint(is.na(NULL))\ndf <- read.csv('model.csv')\nprint(is.na(df))",
  );
  assert.deepEqual(outputs(p), [
    "c(FALSE, TRUE, TRUE)",
    "c(FALSE)",
    "c()",
    "x: c(FALSE, FALSE, FALSE)\ny: c(FALSE, FALSE, FALSE)",
  ]);
});
