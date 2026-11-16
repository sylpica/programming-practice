import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ13・R班（Codex監査ステップ5裁定 B 40件：R7-23〜28, 80, 81,
// 83〜86, 152〜159, 232, 234〜237, 239〜243, 245〜247, 249〜255）。
// 実 R の挙動は裁定報告書（findings-step5-ra／rb）に引用された公式
// 一次情報（R 公式マニュアル／ヘルプ／ソース）で確定した。当 VM に
// Rscript は無い。
// 共有ファイル（js/core/script.js）は変更していない。R7-247 の trace
// refs は R 側の pendingRefs 経路、scan は R 側ラッパで解決した。

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

// ---- R7-23／24／25：NULL・NaN・NA の区別 ----
test("B13-R NULL and NaN are distinct in mean/median/as.numeric", async () => {
  await outIs("print(mean(NULL))", ["NA"]);
  await outIs("print(mean(c()))", ["NA"]);
  const p = await first("print(mean(NULL))");
  assert.ok(
    p.trace.some((t) => t.kind === "warning" && /not numeric or logical/.test(t.text)),
    JSON.stringify(p.trace),
  );
  await outIs("print(median(NULL))", ["NULL"]);
  await outIs("print(median(NaN))", ["NA"]);
  await outIs("print(as.numeric(NaN))", ["c(NaN)"]);
  await outIs('print(as.numeric("NaN"))', ["c(NaN)"]);
  await outIs('print(as.numeric(c("1", "x")))', ["c(1, NA)"]);
});

// ---- R7-26：引数なしの型変換 ----
test("B13-R as.numeric()/as.character() with no argument return length 0", async () => {
  await outIs("print(as.numeric())\nprint(length(as.numeric()))", ["c()", "0"]);
  await outIs("print(as.character())\nprint(length(as.character()))", ["c()", "0"]);
});

// ---- R7-27：data.frame の省略列名は引数式由来 ----
test("B13-R data.frame default column names come from the argument expression", async () => {
  await outIs("print(names(data.frame(1)))", ['c("X1")']);
  await outIs("print(names(data.frame(1, 2)))", ['c("X1", "X2")']);
  await outIs("v <- 1:3\nprint(names(data.frame(v)))", ['c("v")']);
  await outIs("print(names(data.frame(1:3)))", ['c("X1.3")']);
  // 公式 dataframe.R の deparse＋make.names 規則では c(1, 2) は
  // "c.1..2." になる（裁定文面の "X1" はこの形については一次情報と
  // 異なるため、一次情報を正とした）。
  await outIs("print(names(data.frame(c(1, 2))))", ['c("c.1..2.")']);
});

// ---- R7-27 差し戻し（兄弟形）：deparse の二項演算子の空白 ----
// 実 R の deparse は PP_BINARY2（/, ^, %%, %/%, :）だけを空白なしで
// 出力し、それ以外の二項演算子は前後に空白を置く（deparse.c／
// names.c を引いた R Core の r-devel での明言と実 R 出力
// "1 + 1"／"1/1"／"1 %in% 1" が一次情報）。make.names は空白も
// 1文字ずつ "." へ変換するため、data.frame(1 + 1) の列名は
// "X1...1" になる。括弧は deparse.c の needsparens 相当として
// 優先順位（?Syntax）から導出する。
test("B13-RFIX data.frame column names keep deparse spacing for binary operators", async () => {
  // 差し戻し形そのもの（空白あり・なしとも同じ AST になる）
  await outIs("print(names(data.frame(1 + 1)))", ['c("X1...1")']);
  await outIs("print(names(data.frame(1+1)))", ['c("X1...1")']);
  // 空白付き二項演算子（+, -, *, 比較, &, %in%）
  await outIs("print(names(data.frame(1 - 1)))", ['c("X1...1")']);
  await outIs("print(names(data.frame(1 * 2)))", ['c("X1...2")']);
  await outIs("print(names(data.frame(1 == 1)))", ['c("X1....1")']);
  await outIs("print(names(data.frame(1 < 2)))", ['c("X1...2")']);
  await outIs("print(names(data.frame(TRUE & FALSE)))", ['c("TRUE...FALSE")']);
  await outIs("print(names(data.frame(1 %in% c(1))))", ['c("X1..in..c.1.")']);
  // PP_BINARY2 は空白なし（従来どおり）
  await outIs("print(names(data.frame(1 / 2)))", ['c("X1.2")']);
  await outIs("print(names(data.frame(2 ^ 3)))", ['c("X2.3")']);
  await outIs("print(names(data.frame(5 %% 2)))", ['c("X5..2")']);
  await outIs("print(names(data.frame(5 %/% 2)))", ['c("X5...2")']);
  // 入れ子・括弧（優先順位から導出）・関数呼出しとの組合せ
  await outIs("print(names(data.frame(1 + 2 * 3)))", ['c("X1...2...3")']);
  await outIs("print(names(data.frame((1 + 2) * 3)))", ['c("X.1...2....3")']);
  await outIs("print(names(data.frame(1 + (2 + 3))))", ['c("X1....2...3.")']);
  await outIs("print(names(data.frame((2 ^ 3) ^ 2)))", ['c("X.2.3..2")']);
  await outIs("print(names(data.frame(2 ^ 3 ^ 2)))", ['c("X2.3.2")']);
  await outIs("print(names(data.frame(-(1 + 1))))", ['c("..1...1.")']);
  await outIs("print(names(data.frame(-1 + 1)))", ['c("X.1...1")']);
  await outIs("print(names(data.frame(mean(1 + 1))))", ['c("mean.1...1.")']);
  await outIs("print(names(data.frame(c(a = 1))))", ['c("c.a...1.")']);
  await outIs("print(names(data.frame(1:3 + 1)))", ['c("X1.3...1")']);
  await outIs("print(names(data.frame(1 + 1, 2 - 2)))", ['c("X1...1", "X2...2")']);
  // 対照形（検証で一致が確認された形）は不変
  await outIs("print(names(data.frame(-1)))", ['c("X.1")']);
  await outIs("print(names(data.frame(2.5)))", ['c("X2.5")']);
  await outIs("print(names(data.frame(mean(1))))", ['c("mean.1.")']);
  await outIs("print(names(data.frame(!TRUE)))", ['c(".TRUE")']);
});

// ---- R7-28：%in% の NA と NaN ----
test("B13-R %in% matches NA to NA and NaN to NaN but not across", async () => {
  await outIs(
    "print(NaN %in% c(NA))\nprint(NA %in% c(NA))\nprint(NaN %in% c(NaN))\nprint(NA %in% c(NaN))",
    ["c(FALSE)", "c(TRUE)", "c(TRUE)", "c(FALSE)"],
  );
});

// ---- R7-80：存在しない関数×未確定引数 ----
test("B13-R unknown function with unknown argument still names the function", async () => {
  await errMatch("a <- as.numerci(readline()); print(a)", /as\.numerci/);
  await errMatch("print(sqrt(readline()))", /sqrt/);
  // 実在する関数の未確定引数は従来どおり未確定値として扱う。
  const p = await first("a <- as.numeric(readline()); print(a)");
  assert.deepEqual(outputs(p), ["（実行時に決まる値）"]);
});

// ---- R7-81／84／85／86／251：rep の規則 ----
test("B13-R rep length.out wins over times, NULL stays NULL, fractions truncate", async () => {
  await outIs("print(rep(1:2, times = 0, length.out = 3))", ["c(1, 2, 1)"]);
  await outIs("print(rep(NULL))", ["NULL"]);
  await outIs("print(rep(NULL, length.out = 3))", ["NULL"]);
  await outIs("print(rep(1:2, times = 1.9))", ["c(1, 2)"]);
  await outIs("print(rep(1:2, each = 1.9))", ["c(1, 2)"]);
  await outIs("print(rep(1:2, length.out = 3.9))", ["c(1, 2, 1)"]);
  await errMatch("print(rep(c(a = 1, b = 2), times = NULL))", /invalid 'times' argument/);
  await errMatch('print(rep(1:2, times = ""))', /invalid 'times' argument/);
  await errMatch("print(rep(1:2, times = -1))", /invalid 'times' argument/);
});

test("B13-R rep of empty with huge times returns immediately", async () => {
  const t0 = Date.now();
  await outIs("print(rep(c(), times = 1000000000, length.out = 1))", ["NULL"]);
  await outIs("print(rep(seq_len(0), times = 1000000000))", ["c()"]);
  assert.ok(Date.now() - t0 < 5000, "rep empty took too long");
});

// ---- R7-83：データフレームの変換 ----
test("B13-R as.numeric(data.frame) errors and as.character flattens columns", async () => {
  await errMatch(
    "print(as.numeric(data.frame(x = 1:2)))",
    /'list' object cannot be coerced to type 'double'/,
  );
  await outIs("print(as.character(data.frame(x = 1:2)))", ['c("1", "2")']);
});

// ---- R7-85：seq_len の小数・検証 ----
test("B13-R seq_len truncates fractions and rejects NULL/empty string", async () => {
  await outIs("print(seq_len(1.9))", ["c(1)"]);
  await outIs("print(seq_len(0))", ["c()"]);
  await errMatch("print(seq_len(NULL))", /argument must be coercible to non-negative integer/);
  await errMatch('print(seq_len(""))', /argument must be coercible to non-negative integer/);
});

// ---- R7-152／153：c の名前合成と as.*／%in% の名前除去 ----
test("B13-R nested c names use dots and conversions drop names", async () => {
  await outIs(
    'v <- c(x = c(a = 1, b = 2))\nprint(names(v))\nprint(v["x.a"])',
    ['c("x.a", "x.b")', "c(x.a = 1)"],
  );
  await outIs("print(names(c(x = c(a = 1))))", ['c("x.a")']);
  await outIs(
    "print(names(as.numeric(c(a = 1))))\nprint(names(as.character(c(a = 1))))\nprint(names(c(a = 1) %in% 1))",
    ["NULL", "NULL", "NULL"],
  );
});

// ---- R7-154：引数照合 ----
test("B13-R positional arguments fill the remaining formals after named ones", async () => {
  await outIs("print(mean(x = c(1, 100, 2), 0.5))", ["2"]);
  await outIs("print(median(x = c(1, 3), TRUE))", ["2"]);
  const p = await first("print(sd(x = c(1, 3), TRUE))");
  assert.ok(Math.abs(Number(outputs(p)[0]) - Math.SQRT2) < 1e-12, outputs(p)[0]);
  await outIs("print(rep(x = c(1, 2), 3))", ["c(1, 2, 1, 2, 1, 2)"]);
});

// ---- R7-155：data.frame の重複列と NULL 列 ----
test("B13-R data.frame keeps duplicated names uniquified and drops NULL", async () => {
  await outIs(
    "d <- data.frame(x = 1, x = 2)\nprint(names(d))\nprint(d$x)",
    ['c("x", "x.1")', "c(1)"],
  );
  await outIs("print(ncol(data.frame(x = NULL)))", ["0"]);
  await outIs("print(ncol(data.frame(x = NULL, y = 1:2)))", ["1"]);
});

// ---- R7-156：集計の数値安定性 ----
test("B13-R aggregates avoid overflow and cancellation loss", async () => {
  const p1 = await first("print(mean(c(1e308, 1e308)))");
  assert.ok(Number(outputs(p1)[0]) === 1e308, outputs(p1)[0]);
  await outIs("print(sd(c(1e308, 1e308)))", ["0"]);
  // 相殺形は Codex の Linux x64 実測（拡張精度蓄積）に基づく。
  await outIs("print(sum(c(1e16, 1, -1e16)))", ["1"]);
  await outIs("print(sum(c(1, 2, 3)))", ["6"]);
});

// ---- R7-157：na.rm の強制と条件エラー（mean は isTRUE 相当を維持） ----
test("B13-R na.rm coercion and condition errors", async () => {
  await outIs("print(sum(c(1, NA), na.rm = 1))", ["1"]);
  await outIs("print(mean(c(1, NA), na.rm = c(a = TRUE)))", ["1"]);
  await outIs("print(median(c(1, NA), na.rm = 1))", ["1"]);
  const p = await first("print(sd(c(1, 2, NA), na.rm = 1))");
  assert.ok(Math.abs(Number(outputs(p)[0]) - Math.SQRT1_2) < 1e-12, outputs(p)[0]);
  await errMatch("print(median(c(1, NA), na.rm = NA))", /missing value where TRUE\/FALSE needed/);
  await errMatch("print(median(c(1, NA), na.rm = NULL))", /argument is of length zero/);
});

// ---- R7-158：sd の文字列変換 ----
test("B13-R sd accepts numeric strings", async () => {
  const p = await first('print(sd(c("1", "2")))');
  assert.ok(Math.abs(Number(outputs(p)[0]) - 0.7071067811865476) < 1e-15, outputs(p)[0]);
  await outIs('print(sd("1"))', ["NA"]);
  await errMatch('print(sd(c("a", "b")))', /invalid type of argument/);
});

// ---- R7-159：cat の sep／fill／sep 検証 ----
test("B13-R cat recycles sep vector, wraps with fill, validates sep", async () => {
  await outIs('cat(1:3, sep = c(",", ";"))', ["1,2;3"]);
  await outIs('cat("a b c", fill = 1)', ["a\nb\nc\n"]);
  await errMatch("cat(1, sep = NULL)", /sep/);
  await errMatch("cat(1, sep = 1)", /sep/);
  await outIs('cat("a", "b", sep = "-")', ["a-b"]);
});

// ---- R7-232：[[ の添字ベクトル・小数・負添字 ----
test("B13-R [[ vector subscripts, truncation and negative subscripts", async () => {
  await errMatch(
    "v <- c(10, 20)\nprint(v[[c(1, 2)]])",
    /attempt to select more than one element in vectorIndex/,
  );
  await outIs(
    "d <- data.frame(x = 1:3, y = 4:6)\nprint(d[[c(1, 2)]])\nprint(d[[c(2, 1)]])",
    ["2", "4"],
  );
  await errMatch(
    "d <- data.frame(x = 1:3, y = 4:6)\nprint(d[[c(1, 2, 3)]])",
    /subscript out of bounds/,
  );
  await outIs("print(c(10, 20)[[1.9]])", ["10"]);
  await outIs("print(c(10, 20)[[-1]])", ["20"]);
});

// ---- R7-234：要素代入の型・名前・警告 ----
test("B13-R replacement assignment coerces the whole vector", async () => {
  await outIs(
    "v <- c(TRUE, FALSE)\nv[1] <- 2\nprint(v)\nprint(as.character(v))",
    ["c(2, 0)", 'c("2", "0")'],
  );
  await outIs(
    'v <- c(1, 2)\nv[1] <- "x"\nprint(v)',
    ['c("x", "2")'],
  );
  await outIs(
    "v <- c(a = 1, b = 2)\nv[3] <- 7\nprint(names(v))\nprint(v)",
    ['c("a", "b", "")', "c(a = 1, b = 2, 7)"],
  );
  const p = await first("v <- c(1, 2, 3)\nv[c(1, 2, 3)] <- c(1, 2)\nprint(v)");
  assert.deepEqual(outputs(p), ["c(1, 2, 1)"]);
  assert.ok(
    p.trace.some((t) => t.kind === "warning" && /not a multiple of replacement length/.test(t.text)),
    JSON.stringify(p.trace),
  );
});

// ---- R7-235／236：名前の "" と NA ----
test("B13-R unnamed elements get empty names and missing names are NA", async () => {
  await outIs("print(names(c(a = 1, 2)))", ['c("a", "")']);
  await outIs("print(names(c(1, b = 2)))", ['c("", "b")']);
  await outIs(
    'v <- c(a = 10, b = 20)\nprint(names(v["missing"]))\nprint(names(v[c("a", "missing")]))',
    ["c(NA)", 'c("a", NA)'],
  );
});

// ---- R7-237／243／246：データフレームの列選択と 0 行表 ----
test("B13-R data.frame column selection keeps rows and follows R rules", async () => {
  await outIs(
    "d <- data.frame(x = 1:3, y = 4:6)\nprint(nrow(d[NULL]))\nprint(nrow(d[1:2, NULL]))\nprint(d[NULL])",
    ["3", "2", "data frame with 0 columns and 3 rows"],
  );
  await outIs(
    "d <- data.frame(x = 1:3, y = 4:6)\nprint(ncol(d[TRUE]))\nprint(ncol(d[c(TRUE, FALSE)]))\nprint(ncol(d[FALSE]))\nprint(ncol(d[-1]))\nprint(ncol(d[c(0, 2)]))",
    ["2", "1", "0", "1", "1"],
  );
  await errMatch(
    "d <- data.frame(x = 1:3, y = 4:6)\nd <- d[FALSE, ]\nd$z <- 1",
    /replacement has 1 row, data has 0/,
  );
  await errMatch(
    "d <- data.frame(x = 1:3, y = 4:6)\nd <- d[FALSE, ]\nd$x <- 1",
    /replacement has 1 row, data has 0/,
  );
});

// ---- R7-239：c の制御引数 ----
test("B13-R c treats use.names/recursive as control arguments", async () => {
  await outIs("print(length(c(1, 2, use.names = FALSE)))", ["2"]);
  await outIs("print(c(a = 1, b = 2, use.names = FALSE))", ["c(1, 2)"]);
  await outIs("print(c(1, 2, recursive = FALSE))", ["c(1, 2)"]);
  await outIs("print(c(a = 1, b = 2, use.names = TRUE))", ["c(a = 1, b = 2)"]);
});

// ---- R7-240：median の型保持 ----
test("B13-R median keeps logical and character types", async () => {
  await outIs("print(as.character(median(TRUE)))", ['c("TRUE")']);
  await outIs("print(median(c(TRUE, FALSE, TRUE)))", ["TRUE"]);
  await outIs("print(median(c(TRUE, FALSE)))", ["0.5"]);
  await outIs('print(median(c("a", "b", "c")))', ['"b"']);
  await outIs('print(median("a"))', ['"a"']);
  const p = await first('print(median(c("a", "b")))');
  assert.deepEqual(outputs(p), ["NA"]);
  assert.ok(p.trace.some((t) => t.kind === "warning"), JSON.stringify(p.trace));
});

// ---- R7-241：数値→文字列の R 表記 ----
test("B13-R numeric to character uses R formatting", async () => {
  await outIs("print(as.character(1e20))", ['c("1e+20")']);
  await outIs('print(as.character(1e20) == "1e+20")', ["c(TRUE)"]);
  await outIs("print(as.character(1e-7))", ['c("1e-07")']);
  await outIs("print(as.character(1e-6))", ['c("1e-06")']);
  await outIs("print(as.character(1.2345678901234567))", ['c("1.23456789012346")']);
  await outIs('print(c(Inf, "x"))', ['c("Inf", "x")']);
  await outIs("print(as.character(c(1, 2)))", ['c("1", "2")']);
});

// ---- R7-242：read.csv のオプション（種まき経路） ----
test("B13-R read.csv options apply on the seeded data.frame path", async () => {
  await outIs('print(nrow(read.csv("model.csv", nrows = 1)))', ["1"]);
  await outIs(
    'df <- read.csv("model.csv", colClasses = "character")\nprint(df$x)',
    ['c("1", "2", "3")'],
  );
  await outIs('print(nrow(read.csv("model.csv", skip = 1)))', ["2"]);
  await outIs(
    'df <- read.csv("model.csv", na.strings = "1")\nprint(df$x)',
    ["c(NA, 2, 3)"],
  );
  // 改善済みだった形は不変。
  await outIs('print(nrow(read.csv("model.csv", header = FALSE)))', ["4"]);
  await outIs(
    'df <- read.csv("model.csv", col.names = c("a", "b"))\nprint(names(df))',
    ['c("a", "b")'],
  );
  // 文字列ファイル経路でも colClasses が効く。
  const p = await first(
    'cat("x\\n1\\n2\\n", file = "s.csv")\ndf <- read.csv("s.csv", colClasses = "character")\nprint(df$x)',
  );
  assert.deepEqual(outputs(p), ['c("1", "2")']);
});

// ---- R7-245：seq_len の空値（R7-85 と共通のテストで担保済み） ----

// ---- R7-247：演算子・添字の参照解決 ----
test("B13-R operator references resolve in scan and trace refs", async () => {
  const d = getDefinition("r");
  for (const [code, name] of [
    ["7 %% 3", "%%"],
    ["7 %/% 3", "%/%"],
    ["1:3", ":"],
    ["x[1]", "["],
    ["x[[1]]", "[["],
    ["df$x", "$"],
    ["1 %in% c(1)", "%in%"],
  ])
    assert.ok(d.scan(code).includes(name), code + " -> " + JSON.stringify(d.scan(code)));
  // 文字列リテラル中の演算子文字列は拾わない。
  assert.ok(!d.scan('s <- "%%"').includes("%%"));
  const p1 = await first("print(7 %% 3)");
  assert.ok(p1.trace.some((t) => t.refs.includes("%%")), JSON.stringify(p1.trace));
  const p2 = await first("x <- c(10, 20)\nprint(x[1])");
  assert.ok(p2.trace.some((t) => t.refs.includes("[")), JSON.stringify(p2.trace));
  const p3 = await first("df <- data.frame(x = c(1, 2))\nprint(df$x)");
  assert.ok(p3.trace.some((t) => t.refs.includes("$")), JSON.stringify(p3.trace));
});

// ---- R7-249：print の表示引数 ----
test("B13-R print honours quote and digits", async () => {
  await outIs('print("abc", quote = FALSE)', ["abc"]);
  await outIs("print(1.23456789, digits = 2)", ["1.2"]);
  await errMatch("print(1, digits = 0)", /invalid printing digits 0/);
  await outIs('print("abc")', ['"abc"']);
});

// ---- R7-250：seq length.out の数値文字列 ----
test("B13-R seq length.out does not coerce numeric strings", async () => {
  await errMatch(
    'print(seq(from = 1, to = 3, length.out = "1"))',
    /non-numeric argument to mathematical function/,
  );
  await outIs("print(seq(from = 1, to = 3, length.out = 2))", ["c(1, 3)"]);
});

// ---- R7-252：mean trim=NULL ----
test("B13-R mean trim NULL is an error, not the default", async () => {
  await errMatch(
    "print(mean(c(1, 100, 2), trim = NULL))",
    /'trim' must be numeric of length one/,
  );
  await outIs("print(mean(c(1, 2, 3, 100), trim = 0.25))", ["2.5"]);
});

// ---- R7-253／254／255：演算の型検証・恒等形・異種比較 ----
test("B13-R binary operators validate types and special cases", async () => {
  await errMatch('print(NULL + "1")', /non-numeric argument to binary operator/);
  await errMatch('print(NULL & "1")', /operations are possible only for numeric, logical or complex types/);
  await outIs("print(NULL + 1)", ["c()"]);
  await outIs("print(TRUE ^ NA)", ["c(1)"]);
  await outIs("print(FALSE ^ NA)", ["c(NA)"]);
  await outIs("print(1 ^ NA)", ["c(1)"]);
  await outIs('print(NaN == "1")', ["c(FALSE)"]);
  await outIs('print(NaN != "1")', ["c(TRUE)"]);
  await outIs("print(NaN == NaN)", ["c(NA)"]);
  const p = await first('if (NaN == "1") { print("then") } else { print("else") }');
  assert.deepEqual(outputs(p), ['"else"']);
});
