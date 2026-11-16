import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

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
const outputs = (p) => p.outputs.map((o) => o.text);
const finalVar = (p, name) => p.groups[0].entries.find(([k]) => k === name)?.[1];

// ---- RG-70（統合）: データフレームへの二項演算は列ごとの要素演算 ----
test("RG-70 data.frame arithmetic and comparison are element-wise", async () => {
  const p = await first("df <- data.frame(x = c(1, 2), y = c(3, 4))\nr1 <- df + 1\nr2 <- df == 4\nr3 <- 10 - df");
  assert.deepEqual(p.vars.r1, { kind: "data.frame", columns: { x: [2, 3], y: [4, 5] } });
  assert.deepEqual(p.vars.r2, { kind: "data.frame", columns: { x: [false, false], y: [false, true] } });
  assert.deepEqual(p.vars.r3, { kind: "data.frame", columns: { x: [9, 8], y: [7, 6] } });
});
test("RG-70 record values and character columns fail honestly, never NaN", async () => {
  const d = getDefinition("r");
  const m = structuredClone(d.model.defaults);
  m.variables = { rec: { a: 1 } };
  const r = await d.simulate("r1 <- rec + 1", m);
  assert.match((r.error || r.paths[0].error).message, /non-numeric argument/);
  const r2 = await run("df <- data.frame(x = c(1, 2))\nr1 <- df + \"a\"");
  assert.match((r2.error || r2.paths[0].error).message, /non-numeric argument/);
});

// ---- RG-03 追加表面（R20-N7）: if (NULL) は長さ0のエラー（RG-03 ラインで対応済みを確認） ----
test("RG-03 surface if(NULL) is the length-zero error", async () => {
  const r = await run("if (NULL) { print(\"T\") } else { print(\"F\") }");
  assert.match((r.error || r.paths[0].error).message, /argument is of length zero/);
});

// ---- RG-03: NULL is length 0 ----
test("RG-03 NULL arithmetic and comparison return length 0", async () => {
  const p = await first(
    "a <- NULL + 1\nb <- NULL == NULL\nprint(length(a))\nprint(length(b))\nprint(length(NULL))",
  );
  assert.deepEqual(p.vars.a, []);
  assert.deepEqual(p.vars.b, []);
  assert.deepEqual(outputs(p), ["0", "0", "0"]);
});

test("RG-03 is.na(NULL) is logical(0)", async () => {
  const p = await first("r <- is.na(NULL)\nprint(length(r))");
  assert.deepEqual(p.vars.r, []);
  assert.deepEqual(outputs(p), ["0"]);
});

test("RG-03 c() drops NULL but keeps other values; c(NULL) is NULL", async () => {
  const p = await first("print(c(1, NULL))\nx <- c(NULL)\nprint(length(x))");
  assert.deepEqual(outputs(p), ["c(1)", "0"]);
  assert.equal(p.vars.x, null);
});

test("RG-03 NA propagation is not regressed", async () => {
  const p = await first("print(NA + 1)\nprint(NA == NA)\nprint(is.na(c(1, NA, NaN)))");
  assert.deepEqual(outputs(p), ["c(NA)", "c(NA)", "c(FALSE, TRUE, TRUE)"]);
});

// ---- RG-38: named vectors ----
test("RG-38 c(a=1, b=2) keeps names and values", async () => {
  const p = await first('v <- c(a = 1, b = 2)\nprint(v)\nprint(v["a"])\nprint(v[["b"]])');
  assert.deepEqual(outputs(p), ["c(a = 1, b = 2)", "c(a = 1)", "2"]);
  assert.equal(finalVar(p, "v"), "c(a = 1, b = 2)");
  assert.deepEqual([...p.vars.v], [1, 2]);
  assert.deepEqual(p.vars.v.names, ["a", "b"]);
});

test("RG-38 names() and numeric subset preserve names", async () => {
  const p = await first('v <- c(a = 1, b = 2)\nprint(names(v))\nprint(v[2])\nprint(c(1, 2))');
  assert.deepEqual(outputs(p), ['c("a", "b")', "c(b = 2)", "c(1, 2)"]);
});

test("RG-38 missing name gives name-NA, unnamed c() unchanged", async () => {
  // テスト是正（Batch13 R7-236）: 旧期待 c(z = NA) は実Rと矛盾する。Codex実R4.2.2実測
  // （findings-step5-rb R7-236）では未一致の文字列添字の結果名は指定名でなく NA。
  // v["z"] の値側も名前 NA で表示されるため期待を c(NA) に是正した。
  const p = await first('v <- c(a = 1)\nprint(v["z"])\nw <- c(10, 20)\nprint(w[1])');
  assert.deepEqual(outputs(p), ["c(NA)", "c(10)"]);
});

// ---- RG-45: NaN comparisons and logic yield NA ----
test("RG-45 NaN comparisons return NA", async () => {
  const p = await first(
    "print((0/0) == (0/0))\nprint((0/0) < 1)\nprint((0/0) != 1)\nprint((0/0) <= (0/0))\nprint(NaN >= 1)\nprint(NaN == NaN)",
  );
  assert.deepEqual(outputs(p), ["c(NA)", "c(NA)", "c(NA)", "c(NA)", "c(NA)", "c(NA)"]);
});

test("RG-45 NaN logic follows NA truth tables, arithmetic stays NaN", async () => {
  const p = await first(
    "print((0/0) & TRUE)\nprint((0/0) & FALSE)\nprint((0/0) | FALSE)\nprint((0/0) | TRUE)\nprint(!(0/0))\nprint((0/0) + 1)",
  );
  assert.deepEqual(outputs(p), ["c(NA)", "c(FALSE)", "c(NA)", "c(TRUE)", "c(NA)", "c(NaN)"]);
});

// ---- RG-47: df[[...]] returns the column vector ----
test("RG-47 df[[name]] and df[[pos]] return column vectors", async () => {
  const p = await first(
    'df <- data.frame(x = c(1, 2), y = c(3, 4))\nprint(df[["x"]])\nprint(df[[2]])\nprint(df[["x"]] + 10)\nprint(mean(df[["x"]]))',
  );
  assert.deepEqual(outputs(p), ["c(1, 2)", "c(3, 4)", "c(11, 12)", "1.5"]);
});

test("RG-47 single-bracket df selection still returns a data.frame", async () => {
  const p = await first(
    'df <- data.frame(x = c(1, 2), y = c(3, 4))\nprint(df["x"])\nprint(df[1, ])',
  );
  assert.deepEqual(outputs(p), ["x: c(1, 2)", "x: c(1)\ny: c(3)"]);
});

test("RG-47 df[[missing]] stops with subscript error", async () => {
  const r = await run('df <- data.frame(x = c(1, 2))\nprint(df[["z"]])');
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
  assert.ok(errs.some((e) => /subscript out of bounds/.test(e.message)), JSON.stringify(r));
});

// ---- RG-14: type checks before shortcuts, %in%, function honesty ----
const errOf = async (code) => {
  const r = await run(code);
  return [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
};

test("RG-14 character operands error before NA / ^ shortcuts", async () => {
  for (const code of ['print("a" + NA)', 'print(NA + "a")', 'print("a" ^ 0)', 'print("2" + NA)', 'print("a" * NA)']) {
    const errs = await errOf(code);
    assert.ok(errs.some((e) => /non-numeric argument to binary operator/.test(e.message)), code + " -> " + JSON.stringify(errs));
  }
  // Numeric NA propagation and ^ identities still work.
  const p = await first("print(1 ^ NA)\nprint(NA ^ 0)\nprint(NA + 1)");
  assert.deepEqual(outputs(p), ["c(1)", "c(1)", "c(NA)"]);
});

test("RG-14 %in% works for character and numeric tables", async () => {
  const p = await first('print("a" %in% c("a", "b"))\nprint("z" %in% c("a", "b"))\nprint(c(1, 3) %in% c(1, 2))\nprint(NA %in% c(1, NA))');
  assert.deepEqual(outputs(p), ["c(TRUE)", "c(FALSE)", "c(TRUE, FALSE)", "c(TRUE)"]);
});

test("RG-14 function definitions stop as unsupported, naming function", async () => {
  for (const code of ["f <- function(x) x + 1", "f <- function(x) {\n x + 1\n}", "print(sapply(c(1, 2), function(v) v * 2))"]) {
    const errs = await errOf(code);
    assert.ok(errs.some((e) => e.category === "未対応" && /function/.test(e.message)), code + " -> " + JSON.stringify(errs));
    assert.ok(!errs.some((e) => /未定義の名前|\) が必要です/.test(e.message)), code);
  }
});

test("RG-14 builtin function names as values are named, not NameError", async () => {
  for (const code of ["print(sapply(c(1, 4, 9), sqrt))", 'print(sapply(c("1", "2"), as.numeric))', "print(lapply(c(1, 2), as.character))", "print(mapply(sum, c(1, 2), c(10, 20)))"]) {
    const errs = await errOf(code);
    assert.ok(errs.length, code);
    assert.ok(!errs.some((e) => /未定義の名前/.test(e.message)), code + " -> " + JSON.stringify(errs));
    assert.ok(errs.some((e) => /関数名 (sqrt|as\.numeric|as\.character|sum) を値として使う形/.test(e.message)), code + " -> " + JSON.stringify(errs));
  }
});

// ---- RG-15: seq length.out / along.with, rep each etc. ----
test("RG-15 seq length.out and along.with are implemented", async () => {
  const p = await first(
    "print(seq(0, 1, length.out = 5))\nprint(seq(1, 2, along.with = c(9, 8, 7)))\nprint(seq(1, by = 2, length.out = 3))\nprint(seq(1, 5, 2))",
  );
  assert.deepEqual(outputs(p), ["c(0, 0.25, 0.5, 0.75, 1)", "c(1, 1.5, 2)", "c(1, 3, 5)", "c(1, 3, 5)"]);
});

test("RG-15 rep each, vector times and length.out are implemented", async () => {
  const p = await first(
    "print(rep(c(1, 2), each = 2))\nprint(rep(c(1, 2), each = 2, times = 2))\nprint(rep(c(1, 2), times = c(2, 1)))\nprint(rep(1, length.out = 3))\nprint(rep(c(1, 2), 2))",
  );
  assert.deepEqual(outputs(p), ["c(1, 1, 2, 2)", "c(1, 1, 2, 2, 1, 1, 2, 2)", "c(1, 1, 2)", "c(1, 1, 1)", "c(1, 2, 1, 2)"]);
});

test("RG-15 unknown named arguments are refused by name", async () => {
  for (const [code, arg] of [["print(seq(1, 5, foo = 2))", "foo"], ["print(rep(c(1, 2), foo = 2))", "foo"]]) {
    const errs = await errOf(code);
    assert.ok(errs.some((e) => e.message.includes(arg) && /引数/.test(e.message)), code + " -> " + JSON.stringify(errs));
  }
  const errs = await errOf("print(rep(c(1, 2), each = 2, times = c(1, 1)))");
  assert.ok(errs.some((e) => /each/.test(e.message)), JSON.stringify(errs));
});

// ---- RG-04 (R part): display notation on trace / output / final state ----
test("RG-04 NULL and Inf use R notation on all three surfaces", async () => {
  const p = await first("u <- NULL\nprint(u)\nprint(Inf)\nprint(-Inf)\nprint(1 / 0)");
  assert.deepEqual(outputs(p), ["NULL", "Inf", "c(-Inf)", "c(Inf)"]);
  assert.equal(finalVar(p, "u"), "NULL");
  assert.ok(p.trace.some((t) => t.text === "u に NULL を代入します"), JSON.stringify(p.trace));
  assert.ok(!p.trace.some((t) => /null|Infinity/.test(t.text)), JSON.stringify(p.trace));
});

test("RG-04 assignment narration matches output/final notation", async () => {
  const p = await first("passed <- c(FALSE, TRUE, TRUE)\nflag <- TRUE\nx <- c(1, 2, 3)\ny <- 2 + 3\nprint(y)");
  const texts = p.trace.map((t) => t.text);
  assert.ok(texts.includes("passed に c(FALSE, TRUE, TRUE) を代入します"), JSON.stringify(texts));
  assert.ok(texts.includes("flag に TRUE を代入します"), JSON.stringify(texts));
  assert.ok(texts.includes("x に c(1, 2, 3) を代入します"), JSON.stringify(texts));
  assert.ok(texts.includes("y に c(5) を代入します"), JSON.stringify(texts));
  assert.equal(finalVar(p, "y"), "c(5)");
  assert.deepEqual(outputs(p), ["c(5)"]);
  assert.ok(!texts.some((t) => /\[|\]/.test(t) && /代入/.test(t)), JSON.stringify(texts));
});

test("RG-04 cat uses R notation for logical and Inf", async () => {
  const p = await first("cat(TRUE, Inf)");
  assert.deepEqual(outputs(p), ["TRUE Inf"]);
});

// ---- RG-21 追加表面（R21-N1）: コロンの優先順位は R の実物どおり ----
// R では : は * / より強く、+ - より弱く、^ より弱く結合する
// （実 R: 1:3*2 → 2 4 6、10-1:3 → 9 8 7、2^1:3 → 2 3）。
// 第1バッチの rPrec 是正で解消済みであることを固定する確認テスト。
test("RG-21 colon binds tighter than * and / but looser than ^", async () => {
  const cases = [
    ["1:3*2", [2, 4, 6]],
    ["1:3/2", [0.5, 1, 1.5]],
    ["2*1:3", [2, 4, 6]],
    ["2^1:3", [2, 3]],
  ];
  for (const [expr, expected] of cases) {
    const p = await first("x <- " + expr);
    assert.deepEqual(p.vars.x, expected, expr);
  }
});
test("RG-21 colon binds looser than + and -, including unary minus", async () => {
  const cases = [
    ["1:3+1", [2, 3, 4]],
    ["10-1:3", [9, 8, 7]],
    ["-1:3", [-1, 0, 1, 2, 3]],
    ["1:3-1", [0, 1, 2]],
  ];
  for (const [expr, expected] of cases) {
    const p = await first("x <- " + expr);
    assert.deepEqual(p.vars.x, expected, expr);
  }
});
test("RG-21 colon precedence also holds without spaces and via print", async () => {
  const p = await first("print(1:3*2)");
  assert.deepEqual(outputs(p), ["c(2, 4, 6)"]);
});

// ---- RG-79（R21-N11）: 同一行に区切りなく続く第2文を無言で実行しない ----
// 代入文だけ終端検査が無く、x <- 1 y <- 2 が両方実行されていた（式文の
// print(1) print(2) は従来から拒否され非一貫だった）。共有 simple() の
// 代入分岐にも終端検査を入れ、JS の同形もあわせて止める。
test("RG-79 two statements on one line without a separator stop", async () => {
  const r1 = await run("x <- 1 y <- 2");
  const e1 = r1.error || r1.paths?.[0]?.error;
  assert.ok(e1 && /区切り/.test(e1.message), JSON.stringify(r1.error || r1.paths));
  const d = getDefinition("javascript");
  const r2 = await d.simulate("let x = 0\nx = 1 y = 2", structuredClone(d.model.defaults));
  const e2 = r2.error || r2.paths?.[0]?.error;
  assert.ok(e2 && /区切り/.test(e2.message), JSON.stringify(r2.error || r2.paths));
});
test("RG-79 separated and braceless if-else assignments keep working", async () => {
  const p1 = await first("x <- 1; y <- 2\nprint(x + y)");
  assert.deepEqual(outputs(p1), ["c(3)"]);
  const p2 = await first("x <- 0\nif (TRUE) x <- 1 else x <- 2\nprint(x)");
  assert.deepEqual(outputs(p2), ["1"]);
  const p3 = await first("x <- 0\nif (FALSE) x <- 1 else x <- 2\nprint(x)");
  assert.deepEqual(outputs(p3), ["2"]);
  const p4 = await first("for (i in 1:3) x <- i\nprint(x)");
  assert.deepEqual(outputs(p4), ["3"]);
});

// ---- RG-80（R21-N4）: 未知値の print／cat で出力行自体が消えない ----
// call() 冒頭の一括短絡が print／cat のケース到達前に効き、エラーもなく
// 出力行が消えていた。出力系は一括短絡から外し、未知の部分は
// プレースホルダで示す。
test("RG-80 print of an unknown value still emits the line", async () => {
  const p1 = await first("x <- runif(1)\nprint(x + 1)");
  assert.deepEqual(outputs(p1), ["（実行時に決まる値）"]);
  const p2 = await first("print(runif(1))");
  assert.deepEqual(outputs(p2), ["（実行時に決まる値）"]);
  const p3 = await first("x <- readline()\nprint(x)");
  assert.deepEqual(outputs(p3), ["（実行時に決まる値）"]);
});
test("RG-80 cat renders unknown elements as placeholders, keeps known parts", async () => {
  const p1 = await first("cat(runif(1), 5)");
  assert.deepEqual(outputs(p1), ["（実行時に決まる値） 5"]);
  const p2 = await first("cat(\"a\", \"b\")");
  assert.deepEqual(outputs(p2), ["a b"]);
});
test("RG-80 non-output calls with unknown arguments stay unknown", async () => {
  const p = await first("x <- runif(1)\ny <- sum(x)\nprint(1)");
  assert.deepEqual(outputs(p), ["1"]);
  assert.equal(p.vars.y.kind, "unknown");
});
