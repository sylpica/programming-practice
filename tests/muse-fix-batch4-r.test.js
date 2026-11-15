import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ4・R追随班（R25-N24）。
// 根拠は R 公式ドキュメント ?read.table（read.csv の Usage と既定値、
// type.convert による列型変換、引用された "42" の数値化、空フィールドの
// NA 化、ヘッダーが1フィールド少ない場合の行名規則、空入力はエラー・
// ヘッダーのみは0行）と ?cat（file／append）。当 VM に Rscript は無い
// ため、実機対照ではなく公式ドキュメントで裁定した期待値を固定する。

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

// ---- R25-N24 本体：cat(file=) で書いた CSV を read.csv がパースする ----
test("R25-N24 cat-written CSV parses like the seeded file", async () => {
  const p = await first(
    'cat("x,y\\n1,4\\n2,5\\n3,6\\n", file = "out.csv")\n' +
      'df <- read.csv("out.csv")\nprint(df)\nprint(nrow(df))\nprint(names(df))\nprint(df$x)',
  );
  assert.deepEqual(outputs(p), [
    "x: c(1, 2, 3)\ny: c(4, 5, 6)",
    "3",
    'c("x", "y")',
    "c(1, 2, 3)",
  ]);
  assert.deepEqual(p.vars.df, {
    kind: "data.frame",
    columns: { x: [1, 2, 3], y: [4, 5, 6] },
  });
  // 種まきファイルと同一の結果になること。
  const seeded = await first('df <- read.csv("model.csv")\nprint(df)');
  assert.deepEqual(outputs(seeded), ["x: c(1, 2, 3)\ny: c(4, 5, 6)"]);
});

test("R25-N24 cat built up in pieces (sep='') then read back", async () => {
  const p = await first(
    'cat("x,y\\n", file = "p.csv")\n' +
      'cat(1, ",", 4, "\\n", sep = "", file = "p.csv", append = TRUE)\n' +
      'df <- read.csv("p.csv")\nprint(df)',
  );
  assert.deepEqual(outputs(p), ["x: c(1)\ny: c(4)"]);
});

test("R25-N24 append=TRUE adds rows, overwrite replaces", async () => {
  const p = await first(
    'cat("x,y\\n1,4\\n", file = "a.csv")\n' +
      'cat("2,5\\n", file = "a.csv", append = TRUE)\n' +
      'df <- read.csv("a.csv")\nprint(df)\nprint(nrow(df))',
  );
  assert.deepEqual(outputs(p), ["x: c(1, 2)\ny: c(4, 5)", "2"]);
  const p2 = await first(
    'cat("x,y\\n1,4\\n", file = "a.csv")\n' +
      'cat("a,b\\n9,8\\n", file = "a.csv")\n' +
      'df <- read.csv("a.csv")\nprint(df)',
  );
  assert.deepEqual(outputs(p2), ["a: c(9)\nb: c(8)"]);
});

test("R25-N24 append to the seeded file keeps its existing rows", async () => {
  const p = await first(
    'cat("7,8\\n", file = "model.csv", append = TRUE)\n' +
      'df <- read.csv("model.csv")\nprint(df)\nprint(nrow(df))',
  );
  assert.deepEqual(outputs(p), ["x: c(1, 2, 3, 7)\ny: c(4, 5, 6, 8)", "4"]);
  // 上書きなら種まき内容は置き換わる。
  const p2 = await first(
    'cat("a,b\\n9,8\\n", file = "model.csv")\ndf <- read.csv("model.csv")\nprint(df)',
  );
  assert.deepEqual(outputs(p2), ["a: c(9)\nb: c(8)"]);
});

test("R25-N24 a string file supplied in the model JSON also parses", async () => {
  const model = { variables: {}, files: { "given.csv": "a,b\n10,20\n" } };
  const p = await first('df <- read.csv("given.csv")\nprint(df)', model);
  assert.deepEqual(outputs(p), ["a: c(10)\nb: c(20)"]);
});

// ---- 型変換（type.convert 相当）と欠損 ----
test("R25-N24 column types: integer, numeric, logical, character, NA", async () => {
  const p = await first(
    'cat("i,f,l,s,m\\n1,1.5,TRUE,hello,\\n2,2.5,FALSE,world,NA\\n", file = "t.csv")\n' +
      'df <- read.csv("t.csv")\nprint(df)\nprint(df$l)\nprint(is.na(df$m))',
  );
  assert.deepEqual(outputs(p), [
    "i: c(1, 2)\nf: c(1.5, 2.5)\nl: c(TRUE, FALSE)\ns: c(\"hello\", \"world\")\nm: c(NA, NA)",
    "c(TRUE, FALSE)",
    "c(TRUE, TRUE)",
  ]);
  // 数値と文字列が混ざる列は character になり、数値も文字列のまま残る。
  const p2 = await first(
    'cat("v\\n1\\nx\\n", file = "mix.csv")\ndf <- read.csv("mix.csv")\nprint(df$v)',
  );
  assert.deepEqual(outputs(p2), ['c("1", "x")']);
});

test("R25-N24 na.strings is honoured", async () => {
  const p = await first(
    'cat("x\\nfoo\\nbar\\n", file = "na.csv")\n' +
      'df <- read.csv("na.csv", na.strings = "foo")\nprint(is.na(df$x))',
  );
  assert.deepEqual(outputs(p), ["c(TRUE, FALSE)"]);
});

// ---- 引用符・改行のバリエーション ----
test("R25-N24 quoted fields: embedded comma, doubled quote, embedded newline", async () => {
  const p = await first(
    'cat("name,note\\n\\"A, B\\",\\"say \\"\\"hi\\"\\"\\"\\nC,plain\\n", file = "q.csv")\n' +
      'df <- read.csv("q.csv")\nprint(df)\nprint(df$name)',
  );
  assert.deepEqual(outputs(p), [
    'name: c("A, B", "C")\nnote: c("say \\"hi\\"", "plain")',
    'c("A, B", "C")',
  ]);
  const p2 = await first(
    'cat("x\\n\\"a\\nb\\"\\n", file = "m.csv")\ndf <- read.csv("m.csv")\nprint(df$x)',
  );
  assert.deepEqual(outputs(p2), ['c("a\\nb")']);
});

test("R25-N24 quoted numbers still convert, quote='' disables quoting", async () => {
  const p = await first(
    'cat("x\\n\\"42\\"\\n", file = "q2.csv")\ndf <- read.csv("q2.csv")\nprint(df)',
  );
  assert.deepEqual(outputs(p), ["x: c(42)"]);
  const p2 = await first(
    'cat("x\\n\\"42\\"\\n", file = "q2.csv")\ndf <- read.csv("q2.csv", quote = "")\nprint(df)',
  );
  assert.deepEqual(outputs(p2), ['x: c("\\"42\\"")']);
});

test("R25-N24 CRLF, missing final newline and blank lines", async () => {
  const p = await first(
    'cat("x,y\\r\\n1,4\\r\\n2,5", file = "c.csv")\ndf <- read.csv("c.csv")\nprint(df)',
  );
  assert.deepEqual(outputs(p), ["x: c(1, 2)\ny: c(4, 5)"]);
  const p2 = await first(
    'cat("x,y\\n\\n1,4\\n\\n2,5\\n", file = "bl.csv")\ndf <- read.csv("bl.csv")\nprint(nrow(df))',
  );
  assert.deepEqual(outputs(p2), ["2"]);
});

// ---- ヘッダー有無と仮引数 ----
test("R25-N24 header=FALSE gives V1..Vn and treats line 1 as data", async () => {
  const p = await first(
    'cat("1,4\\n2,5\\n", file = "h.csv")\n' +
      'df <- read.csv("h.csv", header = FALSE)\nprint(df)\nprint(names(df))',
  );
  assert.deepEqual(outputs(p), ["V1: c(1, 2)\nV2: c(4, 5)", 'c("V1", "V2")']);
  // 位置引数でも同じ。
  const p2 = await first(
    'cat("1,4\\n", file = "h.csv")\ndf <- read.csv("h.csv", FALSE)\nprint(df)',
  );
  assert.deepEqual(outputs(p2), ["V1: c(1)\nV2: c(4)"]);
});

test("R25-N24 header=FALSE on the seeded file re-reads the header as a row", async () => {
  const p = await first(
    'df <- read.csv("model.csv", header = FALSE)\nprint(df)\nprint(names(df))\nprint(nrow(df))',
  );
  assert.deepEqual(outputs(p), [
    'V1: c("x", "1", "2", "3")\nV2: c("y", "4", "5", "6")',
    'c("V1", "V2")',
    "4",
  ]);
});

test("R25-N24 sep and dec arguments", async () => {
  const p = await first(
    'cat("x;y\\n1,5;4\\n", file = "e.csv")\n' +
      'df <- read.csv("e.csv", sep = ";", dec = ",")\nprint(df)',
  );
  assert.deepEqual(outputs(p), ["x: c(1.5)\ny: c(4)"]);
});

test("R25-N24 check.names adjusts and de-duplicates column names", async () => {
  const p = await first(
    'cat("a b,x,x\\n1,4,5\\n", file = "d.csv")\ndf <- read.csv("d.csv")\nprint(names(df))',
  );
  assert.deepEqual(outputs(p), ['c("a.b", "x", "x.1")']);
  // check.names=FALSE では調整自体を行わない（重複名そのものはモデルの
  // columns がオブジェクト形状のため表現できず、対象外）。
  const p2 = await first(
    'cat("a b,c d\\n1,4\\n", file = "d.csv")\n' +
      'df <- read.csv("d.csv", check.names = FALSE)\nprint(names(df))',
  );
  assert.deepEqual(outputs(p2), ['c("a b", "c d")']);
});

test("R25-N24 header one field short makes the first column row names", async () => {
  const p = await first(
    'cat("x,y\\n1,1,4\\n2,2,5\\n", file = "r.csv")\n' +
      'df <- read.csv("r.csv")\nprint(df)\nprint(nrow(df))',
  );
  assert.deepEqual(outputs(p), ["x: c(1, 2)\ny: c(4, 5)", "2"]);
  assert.deepEqual(p.vars.df.rowNames, ["1", "2"]);
});

test("R25-N24 row.names=1 and col.names arguments", async () => {
  const p = await first(
    'cat(",x\\nr1,4\\nr2,5\\n", file = "rn.csv")\n' +
      'df <- read.csv("rn.csv", row.names = 1)\nprint(df)',
  );
  assert.deepEqual(outputs(p), ["x: c(4, 5)"]);
  assert.deepEqual(p.vars.df.rowNames, ["r1", "r2"]);
  const p2 = await first(
    'df <- read.csv("model.csv", col.names = c("p", "q"))\nprint(names(df))',
  );
  assert.deepEqual(outputs(p2), ['c("p", "q")']);
});

// ---- 行の形・境界 ----
test("R25-N24 fill=TRUE pads short rows with NA", async () => {
  const p = await first(
    'cat("x,y,z\\n1,4\\n2,5,6\\n", file = "f.csv")\n' +
      'df <- read.csv("f.csv")\nprint(df)\nprint(is.na(df$z))',
  );
  assert.deepEqual(outputs(p), ["x: c(1, 2)\ny: c(4, 5)\nz: c(NA, 6)", "c(TRUE, FALSE)"]);
});

test("R25-N24 too many fields is an error naming the element count", async () => {
  const errs = await errOf(
    'cat("x,y\\n1,4,9,8\\n", file = "x.csv")\ndf <- read.csv("x.csv")',
  );
  assert.ok(
    errs.some((e) => /did not have 2 elements/.test(e.message)),
    JSON.stringify(errs),
  );
});

test("R25-N24 empty input errors, header-only gives a 0-row frame", async () => {
  const errs = await errOf('cat("", file = "e.csv")\ndf <- read.csv("e.csv")');
  assert.ok(
    errs.some((e) => /no lines available in input/.test(e.message)),
    JSON.stringify(errs),
  );
  const p = await first(
    'cat("x,y\\n", file = "ho.csv")\ndf <- read.csv("ho.csv")\nprint(nrow(df))\nprint(names(df))',
  );
  assert.deepEqual(outputs(p), ["0", 'c("x", "y")']);
});

test("R25-N24 plain text still reads as a one-column frame, missing file still fails", async () => {
  const p = await first(
    'cat("hello\\nworld\\n", file = "t.txt")\ndf <- read.csv("t.txt")\nprint(df)',
  );
  assert.deepEqual(outputs(p), ['hello: c("world")']);
  const errs = await errOf('df <- read.csv("nope.csv")');
  assert.ok(
    errs.some((e) => /モデルにファイルがありません/.test(e.message)),
    JSON.stringify(errs),
  );
});

// ---- 兄弟表面：未実装の読み書き関数は名指しで正直に停止する ----
test("R25-N24 unimplemented read/write relatives stop by name", async () => {
  const cases = [
    'x <- read.table("model.csv")',
    'x <- read.delim("model.csv")',
    'x <- read.csv2("model.csv")',
    'x <- readLines("model.csv")',
    "df <- data.frame(x = c(1))\nwrite.csv(df, \"o.csv\")",
    "df <- data.frame(x = c(1))\nwrite.table(df, \"o.csv\")",
    'writeLines("a", "o.txt")',
  ];
  for (const code of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => /説明に対応していません/.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});
