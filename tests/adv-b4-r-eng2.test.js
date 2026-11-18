import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 高度モード B4・R実装班2（文字列・テキスト）。
// 期待値は公式ヘルプ（stat.ethz.ch R-manual）の Examples と実 R 4.3.3 の
// 実測出力から導いた（報告書 docs/audit/ADV-B4-r-eng2.md に根拠を記録）。
// ロケールは UTF-8 ロケールをモデル化しているため、引用符（sQuote 等）や
// 非 ASCII の扱いは C ロケールの実 R と意図的に異なる箇所がある。

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

// ---- paste / paste0 ----
test("eng2 paste and paste0", async () => {
  await outIs('print(paste("a", "b", "c"))', ['c("a b c")']);
  await outIs('print(paste0("a", "b"))', ['c("ab")']);
  await outIs('print(paste(c("a", "b"), 1:2, sep = "-"))', ['c("a-1", "b-2")']);
  await outIs('print(paste(c("a", "b"), collapse = ","))', ['c("a,b")']);
  await outIs('print(paste("a", character(0)))', ['c("a ")']);
  await outIs('print(paste("a", character(0), recycle0 = TRUE))', ["c()"]);
  await outIs("print(paste(character(0), character(0)))", ["c()"]);
  await outIs('print(paste(c("a", NA), collapse = ","))', ['c("a,NA")']);
  await outIs("print(paste(1.5, TRUE, NA))", ['c("1.5 TRUE NA")']);
  await outIs('print(paste(NULL, "a"))', ['c(" a")']);
  await outIs("print(paste())", ["c()"]);
  // paste0 に sep は仮引数ではない（データとして扱われる）。
  await outIs('print(paste0("a", sep = ","))', ['c("a,")']);
  await errMatch('paste("a", sep = NA)', /invalid separator/);
  await errMatch('paste("a", collapse = NA)', /invalid 'collapse' argument/);
});

// ---- sprintf / gettextf ----
test("eng2 sprintf basics", async () => {
  await outIs('print(sprintf("%d", 42))', ['c("42")']);
  await outIs('print(sprintf("%5d|%-5d|%+d|% d", 42, 42, 42, 42))', [
    'c("   42|42   |+42| 42")',
  ]);
  await outIs('print(sprintf("%05d", 42))', ['c("00042")']);
  await outIs('print(sprintf("%.3d", 5))', ['c("005")']);
  await outIs('print(sprintf("%x %X %o", 255, 255, 8))', ['c("ff FF 10")']);
  await outIs('print(sprintf("%#x %#o", 255, 8))', ['c("0xff 010")']);
  await outIs('print(sprintf("%x", -1))', ['c("ffffffff")']);
  await outIs('print(sprintf("%f", 1.5))', ['c("1.500000")']);
  await outIs('print(sprintf("%.2f", 3.14159))', ['c("3.14")']);
  await outIs('print(sprintf("%e", 12345.678))', ['c("1.234568e+04")']);
  await outIs('print(sprintf("%E", 0.000012345))', ['c("1.234500E-05")']);
  await outIs('print(sprintf("%g", 0.000012345))', ['c("1.2345e-05")']);
  await outIs('print(sprintf("%g", 123456789))', ['c("1.23457e+08")']);
  await outIs('print(sprintf("%.3g", 0.000123456))', ['c("0.000123")']);
  await outIs('print(sprintf("%a", 1.5))', ['c("0x1.8p+0")']);
  await outIs('print(sprintf("%a", 2))', ['c("0x1p+1")']);
  await outIs('print(sprintf("%s", "abc"))', ['c("abc")']);
  await outIs('print(sprintf("%5s|%-5s|%.2s", "ab", "ab", "abcd"))', [
    'c("   ab|ab   |ab")',
  ]);
  await outIs('print(sprintf("%s", TRUE))', ['c("TRUE")']);
  await outIs('print(sprintf("%s", 1.5))', ['c("1.5")']);
  await outIs('print(sprintf("%d", TRUE))', ['c("1")']);
  await outIs('print(sprintf("%f", TRUE))', ['c("1.000000")']);
});

test("eng2 sprintf argument consumption", async () => {
  // 消費カウンタは行ごとに 0 に戻り、要素は ns 番目が使われる。
  await outIs('print(sprintf("%d", 1:3))', ['c("1", "2", "3")']);
  await outIs('print(sprintf("%s", c("a", "b")))', ['c("a", "b")']);
  await outIs('print(sprintf("%d %d", 1, 2))', ['c("1 2")']);
  await outIs('print(sprintf(c("%d", "%d"), 1:2))', ['c("1", "2")']);
  await outIs('print(sprintf("%2$s %1$s", "a", "b"))', ['c("b a")']);
  await outIs('print(sprintf("%1$d %1$d", 7))', ['c("7 7")']);
  await outIs('print(sprintf("%*d", 5, 42))', ['c("   42")']);
  await outIs('print(sprintf("%-*d|", 5, 42))', ['c("42   |")']);
  await outIs('print(sprintf("%.*f", 2, 3.14159))', ['c("3.14")']);
  await outIs('print(sprintf("100%%"))', ['c("100%")']);
  await outIs('print(sprintf("%d", NA))', ['c("NA")']);
  await outIs('print(sprintf("%5s|", NA))', ['c("   NA|")']);
  await outIs('print(sprintf("%f", Inf))', ['c("Inf")']);
  await outIs('print(sprintf("%+f", Inf))', ['c("+Inf")']);
  await outIs('print(sprintf("%f", NaN))', ['c("NaN")']);
  await outIs('print(sprintf("%d", 2147483647))', ['c("2147483647")']);
  await outIs('print(sprintf("%d", integer(0)))', ["c()"]);
  await outIs("print(sprintf(character(0), 1))", ["c()"]);
  await warnHas('sprintf("%d", 1, 2)', /one argument not used by format '%d'/);
  await errMatch('sprintf(c("%d", "%s"), 1, "x")', /invalid format '%s'; use format %d/);
  await errMatch('sprintf("%c", 65)', /unrecognised format specification '%c'/);
  await errMatch('sprintf("%q", 1)', /unrecognised format specification/);
  await errMatch('sprintf("%d", 3.7)', /invalid format '%d'; use format %f/);
  await errMatch('sprintf("%d", "a")', /invalid format '%d'; use format %s for character objects/);
  await errMatch('sprintf("%o", TRUE)', /invalid format '%o'; use format %d or %i for logical objects/);
  await errMatch('sprintf("%d")', /too few arguments/);
  await errMatch('sprintf("%d %d", 1)', /too few arguments/);
  await errMatch("sprintf(42, 1)", /'fmt' is not a character vector/);
});

test("eng2 gettextf", async () => {
  await outIs('print(gettextf("%s is %d", "x", 3))', ['c("x is 3")']);
  // カタログの無い環境では trim は効かない（翻訳結果にのみ適用される）。
  await outIs('print(gettextf("  %d  ", 5))', ['c("  5  ")']);
});

// ---- substr / substring ----
test("eng2 substr and substring", async () => {
  await outIs('print(substr("abcdef", 2, 4))', ['c("bcd")']);
  await outIs('print(substr("abcdef", -1, 3))', ['c("abc")']);
  await outIs('print(substr("abcdef", 0, 3))', ['c("abc")']);
  await outIs('print(substr(c("abc", "defgh"), 1, 2))', ['c("ab", "de")']);
  await outIs('print(substr("abcdef", 1.9, 3.9))', ['c("abc")']);
  await outIs('print(substr(c(a = "abcd", b = "efgh"), 1, 2))', [
    'c(a = "ab", b = "ef")',
  ]);
  await outIs('print(substr("abc", 5, 9))', ['c("")']);
  await outIs("print(substr(12345, 2, 3))", ['c("23")']);
  await outIs('print(substr(c("abc", NA), 1, 2))', ['c("ab", NA)']);
  // substr の結果の長さは常に length(x)（start/stop は切り詰められる）。
  await outIs('print(substr("abcd", 1:2, 2:3))', ['c("ab")']);
  await outIs('print(substring("abcdef", 2))', ['c("bcdef")']);
  // substring は3引数とも最長にリサイクルする。
  await outIs('print(substring("abcdef", 1:2, 2:3))', ['c("ab", "bc")']);
  await outIs('print(substring(c("abc", "defgh"), 2, 3))', ['c("bc", "ef")']);
  await errMatch('substr("abc", integer(0), 2)', /invalid substring arguments/);
  await errMatch('substring("abc", 1, NULL)', /invalid substring arguments/);
  await errMatch('substr("abc", 1, 2, bogus = 1)', /unused argument/);
});

// ---- nchar / nzchar ----
test("eng2 nchar and nzchar", async () => {
  await outIs('print(nchar("abc"))', ["c(3)"]);
  await outIs('print(nchar(c("a", "abcd", NA)))', ["c(1, 4, NA)"]);
  await outIs('print(nchar(c("a", NA), keepNA = FALSE))', ["c(1, 2)"]);
  await outIs("print(nchar(123))", ["c(3)"]);
  await outIs("print(nchar(character(0)))", ["c()"]);
  await outIs('print(nchar(NA, type = "width"))', ["c(2)"]);
  await outIs('print(nchar(c(x = "ab")))', ["c(x = 2)"]);
  await outIs('print(nchar("abc", type = "c"))', ["c(3)"]);
  await outIs('print(nzchar(c("", "a", NA)))', ["c(FALSE, TRUE, TRUE)"]);
  await outIs("print(nzchar(NA, keepNA = TRUE))", ["c(NA)"]);
  await outIs("print(nzchar(character(0)))", ["c()"]);
  await errMatch('nchar("abc", type = "x")', /invalid 'type' argument/);
});

// ---- case conversion / chartr ----
test("eng2 case functions and chartr", async () => {
  await outIs('print(toupper("aBc"))', ['c("ABC")']);
  await outIs('print(tolower("aBc"))', ['c("abc")']);
  await outIs('print(casefold("aBc", TRUE))', ['c("ABC")']);
  await outIs('print(casefold("aBc"))', ['c("abc")']);
  await outIs('print(toupper(c(a = "x")))', ['c(a = "X")']);
  await outIs("print(toupper(NA))", ["c(NA)"]);
  await outIs('print(chartr("a", "X", "banana"))', ['c("bXnXnX")']);
  await outIs('print(chartr("abc", "XYZ", "abcabc"))', ['c("XYZXYZ")']);
  // old の重複文字は最後の対応が勝つ。
  await outIs('print(chartr("aa", "AB", "aaa"))', ['c("BBB")']);
  await outIs('print(chartr("", "X", "abc"))', ['c("abc")']);
  await errMatch('chartr("ab", "A", "ab")', /'old' is longer than 'new'/);
  await warnHas(
    'chartr(c("a", "b"), "AB", "ab")',
    /argument 'old' has length > 1 and only the first element will be used/,
  );
});

// ---- sub / gsub ----
test("eng2 sub and gsub", async () => {
  await outIs('print(sub("a", "X", "banana"))', ['c("bXnana")']);
  await outIs('print(gsub("a", "X", "banana"))', ['c("bXnXnX")']);
  await outIs('print(sub("[0-9]+", "#", "abc123def"))', ['c("abc#def")']);
  await outIs('print(gsub("x*", "-", "abc"))', ['c("-a-b-c-")']);
  await outIs('print(sub("", "X", "abc"))', ['c("Xabc")']);
  await outIs('print(gsub("", "X", "abc"))', ['c("XaXbXcX")']);
  // 選択肢は POSIX の最左最長一致で処理する。
  await outIs('print(sub("a|b", "X", "abc"))', ['c("Xbc")']);
  await outIs('print(sub("a|ab", "X", "ab"))', ['c("X")']);
  await outIs('print(gsub("a|ab", "X", "aab ab"))', ['c("XX X")']);
  await outIs('print(sub("(a)(b)", "\\\\2\\\\1", "ab"))', ['c("ba")']);
  // 置換先が NA のときは、一致した要素だけが NA になる。
  await outIs('print(sub("a", NA, c("abc", "xyz")))', ['c(NA, "xyz")']);
  await outIs('print(sub("A", "X", "banana", ignore.case = TRUE))', ['c("bXnana")']);
  await outIs('print(sub(".", "X", "a.b", fixed = TRUE))', ['c("aXb")']);
  await outIs('print(gsub(".", "X", "a.b", fixed = TRUE))', ['c("aXb")']);
  await outIs('print(gsub(".", "X", "a.b"))', ['c("XXX")']);
  await outIs('print(gsub("a", "X", c("a", NA)))', ['c("X", NA)']);
  await outIs('print(sub("a", "X", character(0)))', ["c()"]);
  await outIs('print(sub("a$", "X", "a\\n"))', ['c("a\\n")']);
  await errMatch('sub("a", "X", "abc", perl = TRUE)', /perl = TRUE は未対応です/);
  await errMatch('gsub("a", "X", "abc", perl = TRUE)', /perl = TRUE は未対応です/);
  await errMatch('sub("a|b$", "X", "ab")', /選択肢（\|）と境界アサーション/);
  await errMatch('sub("[z-a]", "X", "abc")', /invalid regular expression/);
});

// ---- grep / grepl / grepv ----
test("eng2 grep family", async () => {
  await outIs('print(grep("an", c("banana", "apple", "peach")))', ["c(1)"]);
  await outIs('print(grep("an", c("banana", "apple"), value = TRUE))', [
    'c("banana")',
  ]);
  await outIs('print(grep("an", c("banana", "apple"), invert = TRUE))', ["c(2)"]);
  await outIs('print(grep("^a", c("apple", "banana")))', ["c(1)"]);
  await outIs('print(grep("A", c("apple", "Banana"), ignore.case = TRUE))', [
    "c(1, 2)",
  ]);
  // NA 要素は一致しない。invert のときは NA の位置も含まれる。
  await outIs('print(grep("a", c("apple", NA, "berry"), invert = TRUE))', [
    "c(2, 3)",
  ]);
  await outIs(
    'print(grep("a", c("apple", NA, "berry"), invert = TRUE, value = TRUE))',
    ['c(NA, "berry")'],
  );
  await outIs('print(grep(NA, c("a", "b")))', ["c(NA, NA)"]);
  await outIs('print(grep("z", c("a", "b")))', ["c()"]);
  await outIs('print(grep("1", c(12, 34)))', ["c(1)"]);
  await outIs('print(grep("[0-9]", c("a1", "ab")))', ["c(1)"]);
  await outIs('print(grep("a.c", c("abc", "a.c"), fixed = TRUE))', ["c(2)"]);
  await outIs('print(grepl("an", c("banana", "apple")))', ["c(TRUE, FALSE)"]);
  // grepl は NA 要素に FALSE を返す（パターンが NA のときだけ NA）。
  await outIs('print(grepl("a", c("apple", NA)))', ["c(TRUE, FALSE)"]);
  await outIs('print(grepl(NA, c("a", "b")))', ["c(NA, NA)"]);
  // grepv は R-devel（4.6）で追加された関数。データ班宣言に従い実装。
  await outIs('print(grepv("an", c("banana", "apple")))', ['c("banana")']);
  await warnHas(
    'grep(c("a", "b"), "abc")',
    /argument 'pattern' has length > 1 and only the first element will be used/,
  );
  await errMatch('grep("a", "abc", useBytes = TRUE)', /useBytes = TRUE は未対応です/);
  await errMatch('grep(character(0), "abc")', /invalid 'pattern' argument/);
});

// ---- trimws / startsWith / endsWith ----
test("eng2 trimws startsWith endsWith", async () => {
  await outIs('print(trimws("  abc  "))', ['c("abc")']);
  await outIs('print(trimws("  abc  ", which = "left"))', ['c("abc  ")']);
  await outIs('print(trimws("  abc  ", which = "right"))', ['c("  abc")']);
  await outIs('print(trimws("xxabcxx", whitespace = "x"))', ['c("abc")']);
  await outIs('print(trimws("..a..", whitespace = "[.]"))', ['c("a")']);
  await outIs('print(trimws(c(n = " a ")))', ['c(n = "a")']);
  await outIs("print(trimws(123))", ['c("123")']);
  await errMatch('trimws("a", which = "middle")', /'arg' should be one of "both", "left", "right"/);
  await outIs('print(startsWith(c("abc", "abd", "xbc"), "ab"))', [
    "c(TRUE, TRUE, FALSE)",
  ]);
  await outIs('print(endsWith(c("abc", "abd"), "c"))', ["c(TRUE, FALSE)"]);
  await outIs('print(startsWith("abc", ""))', ["c(TRUE)"]);
  await outIs('print(startsWith(c("abc", NA), "a"))', ["c(TRUE, NA)"]);
  await outIs('print(startsWith(character(0), "a"))', ["c()"]);
  await errMatch('startsWith(123, "1")', /non-character object\(s\)/);
  await errMatch('endsWith(TRUE, "E")', /non-character object\(s\)/);
});

// ---- make.names / make.unique ----
test("eng2 make.names and make.unique", async () => {
  await outIs(
    'print(make.names(c("a b", "1x", "if", ".5", "a-b", "_x", "")))',
    ['c("a.b", "X1x", "if.", "X.5", "a.b", "X_x", "X")'],
  );
  await outIs("print(make.names(NA))", ['c("NA.")']);
  await outIs('print(make.names(c("a and b", "a-and-b"), unique = TRUE))', [
    'c("a.and.b", "a.and.b.1")',
  ]);
  await outIs('print(make.names(c("x", "x"), unique = TRUE))', ['c("x", "x.1")']);
  await outIs('print(make.names("_x", allow_ = FALSE))', ['c("X.x")']);
  await outIs('print(make.names("..."))', ['c("...")']);
  await outIs('print(make.names("..1"))', ['c("..1")']);
  await outIs('print(make.unique(c("a", "a", "a.1", "a")))', [
    'c("a", "a.2", "a.1", "a.3")',
  ]);
  await outIs('print(make.unique(c("a", NA, "a", NA)))', [
    'c("a", NA, "a.1", "NA.1")',
  ]);
  await outIs('print(make.unique(c("x", "x"), sep = "_"))', ['c("x", "x_1")']);
  await outIs('print(make.unique("a"))', ['c("a")']);
  await errMatch("make.unique(1:3)", /'names' must be a character vector/);
});

// ---- charmatch / pmatch / char.expand ----
test("eng2 charmatch pmatch char.expand", async () => {
  await outIs('print(charmatch("med", c("mean", "median", "mode")))', ["c(2)"]);
  await outIs('print(charmatch("mean", c("mean", "median")))', ["c(1)"]);
  await outIs('print(charmatch("x", c("mean", "median")))', ["c(NA)"]);
  await outIs('print(charmatch("", c("mean", "mode")))', ["c(0)"]);
  await outIs('print(charmatch("", c("mean", "")))', ["c(2)"]);
  await outIs('print(charmatch(NA, c("mean")))', ["c(NA)"]);
  await outIs('print(charmatch("x", c("mean"), nomatch = -1))', ["c(-1)"]);
  await outIs('print(pmatch("med", c("mean", "median", "mode")))', ["c(2)"]);
  await outIs('print(pmatch(c("mean", "mean"), c("mean", "median")))', [
    "c(1, NA)",
  ]);
  await outIs(
    'print(pmatch(c("mean", "mean"), c("mean", "median"), duplicates.ok = TRUE))',
    ["c(1, 1)"],
  );
  await outIs('print(pmatch("x", c("mean")))', ["c(NA)"]);
  await outIs('print(char.expand("med", c("mean", "median")))', ['c("median")']);
  await errMatch('char.expand("med", c("mean", "mode"))', /no match/);
  await errMatch(
    'char.expand(c("a", "b"), c("mean"))',
    /'input' must have length 1/,
  );
  await errMatch(
    'char.expand(1, c("mean"))',
    /'input' and 'target' must be character vectors/,
  );
});

// ---- agrep / agrepl ----
test("eng2 agrep and agrepl", async () => {
  await outIs('print(agrep("lasy", "1 lazy 2"))', ["c(1)"]);
  await outIs('print(agrep("abc", c("abc", "abd", "xyz", "ab")))', [
    "c(1, 2, 4)",
  ]);
  await outIs('print(agrep("abc", "acb", max.distance = 1))', ["c(1)"]);
  await outIs('print(agrep("abc", "acb", max.distance = 0))', ["c()"]);
  await outIs('print(agrep("ABC", "abc", ignore.case = TRUE))', ["c(1)"]);
  await outIs('print(agrep("abc", c(n = "abc", m = "xyz"), value = TRUE))', [
    'c(n = "abc")',
  ]);
  await outIs('print(agrepl("abc", c("abc", "abd", "xyz")))', [
    "c(TRUE, TRUE, FALSE)",
  ]);
  await outIs('print(agrepl(NA, c("a", "b")))', ["c(NA, NA)"]);
  await errMatch('agrep("", "abc")', /'pattern' must be a non-empty character string/);
  await errMatch(
    'agrep("abc", "abd", max.distance = c(1, 2))',
    /'length = 2' in coercion to 'logical\(1\)'/,
  );
  await errMatch(
    'agrep("abc", "abc", useBytes = TRUE)',
    /useBytes = TRUE は未対応です/,
  );
});

// ---- abbreviate ----
test("eng2 abbreviate", async () => {
  await outIs('print(abbreviate(c("apple", "banana", "cherry")))', [
    'c(apple = "appl", banana = "bann", cherry = "chrr")',
  ]);
  await outIs('print(abbreviate(c("Alabama", "Alaska", "Arizona"), 3))', [
    'c(Alabama = "Alb", Alaska = "Als", Arizona = "Arz")',
  ]);
  await outIs('print(abbreviate("hello world", 4))', [
    'c(hello world = "hllw")',
  ]);
  await outIs('print(abbreviate("hello world", 8))', [
    'c(hello world = "hellwrld")',
  ]);
  await outIs('print(abbreviate("banana split", 5))', [
    'c(banana split = "bnnsp")',
  ]);
  await outIs('print(abbreviate(c("abcd", "abce"), 3))', [
    'c(abcd = "abcd", abce = "abce")',
  ]);
  await outIs('print(abbreviate(c("abcd", "abce"), 3, strict = TRUE))', [
    'c(abcd = "abc", abce = "abc")',
  ]);
  await outIs('print(abbreviate(c("abcd", "abce"), 3, method = "both.sides"))', [
    'c(abcd = "abc", abce = "bce")',
  ]);
  await outIs('print(abbreviate("banana", 3, use.classes = FALSE))', [
    'c(banana = "ban")',
  ]);
  await outIs('print(abbreviate("banana", 3, dot = TRUE))', [
    'c(banana = "bnn.")',
  ]);
  await outIs('print(abbreviate("banana", 0))', ['c(banana = "")']);
});

// ---- toString / is.string ----
test("eng2 toString and is.string", async () => {
  // toString は長さ1の文字列（スカラー）を返すため c() で包まれない。
  await outIs('print(toString(c("a", "b", "c")))', ['"a, b, c"']);
  await outIs("print(toString(1:3))", ['"1, 2, 3"']);
  await outIs("print(toString(NULL))", ['""']);
  await outIs("print(toString(character(0)))", ['""']);
  await outIs('print(toString(c(NA, "a")))', ['"NA, a"']);
  await outIs('print(toString("abcdefghij", width = 8))', ['"abcd...."']);
  await outIs('print(toString("abcdefghij", width = 3))', ['"ab...."']);
  // is.string は R-devel（4.6）で追加された関数。データ班宣言に従い実装。
  // is.string は長さ1の論理値（スカラー）を返すため c() で包まれない。
  await outIs('print(is.string("abc"))', ["TRUE"]);
  await outIs('print(is.string(c("a", "b")))', ["FALSE"]);
  await outIs('print(is.string(""))', ["TRUE"]);
  await outIs("print(is.string(42))", ["FALSE"]);
  await outIs('print(is.string(c("a", NA)[2]))', ["TRUE"]);
});

// ---- formatC ----
test("eng2 formatC", async () => {
  await outIs("print(formatC(3.14159))", ['c("3.142")']);
  await outIs("print(formatC(2))", ['c("2")']);
  await outIs('print(formatC(1.5, format = "f"))', ['c("1.5000")']);
  await outIs('print(formatC(1.5, format = "f", digits = 2))', ['c("1.50")']);
  await outIs('print(formatC(1.5, format = "e"))', ['c("1.5000e+00")']);
  await outIs('print(formatC(12345.678, format = "fg", digits = 3))', [
    'c("12346")',
  ]);
  await outIs('print(formatC(0.00012345, format = "fg", digits = 3))', [
    'c("0.000123")',
  ]);
  await outIs('print(formatC(1e20, format = "fg", digits = 3))', [
    'c("100000000000000000000")',
  ]);
  await outIs('print(formatC(9.99, format = "fg", digits = 2))', ['c(" 10")']);
  await outIs('print(formatC(0.0999, format = "fg", digits = 2))', ['c("0.1")']);
  await outIs('print(formatC(1000, format = "g", digits = 3))', ['c("1e+03")']);
  await outIs('print(formatC(42, format = "d", digits = 5))', ['c("    42")']);
  await outIs('print(formatC(3.7, format = "d"))', ['c("3")']);
  await outIs('print(formatC(-3.7, format = "d"))', ['c("-3")']);
  await outIs('print(formatC(c(1.5, 222.5, NA), format = "f", digits = 2))', [
    'c("1.50", "222.50", " NA")',
  ]);
  await outIs('print(formatC(c(Inf, -Inf, NaN), format = "f", digits = 2))', [
    'c(" Inf", "-Inf", " NaN")',
  ]);
  await outIs('print(formatC(c("a", "bcd")))', ['c("  a", "bcd")']);
  await outIs('print(formatC(c("a", "bcd"), width = 5))', [
    'c("    a", "  bcd")',
  ]);
  await outIs('print(formatC(c("ab", NA), width = 4))', ['c("  ab", "  NA")']);
  await outIs(
    'print(formatC(1.5, format = "f", digits = 2, width = 8, flag = "0"))',
    ['c("00001.50")'],
  );
  await outIs('print(formatC(1.5, format = "f", digits = 2, width = -8))', [
    'c("1.50    ")',
  ]);
  await outIs('print(formatC(1.5, format = "g", digits = 3, flag = "#"))', [
    'c("1.50")',
  ]);
  await outIs(
    'print(formatC(1234567.891, format = "f", digits = 2, big.mark = ","))',
    ['c("1,234,567.89")'],
  );
  await outIs(
    'print(formatC(1.23456789, format = "f", digits = 8, small.mark = "_"))',
    ['c("1.23456_789")'],
  );
  await outIs('print(formatC(c(n = 1.5), format = "f", digits = 2))', [
    'c(n = "1.50")',
  ]);
  await warnHas(
    'formatC(1.5, format = "s")',
    /coercing argument to "character" for format="s"/,
  );
  await errMatch('formatC(1.5, flag = "z")', /'flag' should contain only characters/);
  await errMatch('formatC(1.5, format = "q")', /'format' must be one of/);
  await errMatch('formatC(TRUE, format = "f")', /unsupported type/);
});

// ---- prettyNum ----
test("eng2 prettyNum", async () => {
  await outIs('print(prettyNum(1234567.891, big.mark = ","))', [
    'c("1,234,568")',
  ]);
  await outIs('print(prettyNum("1234567.891", big.mark = ","))', [
    'c("1,234,567.891")',
  ]);
  await outIs('print(prettyNum("-1234567.891", big.mark = ","))', [
    'c("-1,234,567.891")',
  ]);
  await outIs(
    'print(prettyNum("1234.56789", big.mark = ",", small.mark = "_", small.interval = 2))',
    ['c("1,234.56_78_9")'],
  );
  await outIs('print(prettyNum("1.500", drop0trailing = TRUE))', ['c("1.5")']);
  await outIs('print(prettyNum("1.500e+00", drop0trailing = TRUE))', [
    'c("1.500")',
  ]);
  await outIs('print(prettyNum("0.00", zero.print = "__"))', ['c("__  ")']);
  await outIs('print(prettyNum(c("1234", "56"), big.mark = ","))', [
    'c("1,234", "   56")',
  ]);
  // 数値入力は format()（format.c の規則）で文字列化される。
  await outIs('print(prettyNum(123456789, big.mark = ","))', [
    'c("123,456,789")',
  ]);
  await outIs('print(prettyNum(9999999.9, big.mark = ","))', ['c("1e+07")']);
  await outIs('print(prettyNum(12345678.9, big.mark = ","))', [
    'c("12,345,679")',
  ]);
  await outIs('print(prettyNum(0.000012345, big.mark = ","))', [
    'c("1.2345e-05")',
  ]);
});

// ---- sQuote / dQuote ----
test("eng2 sQuote and dQuote", async () => {
  // UTF-8 ロケールのモデル化：既定ではファンシー引用符になる。
  await outIs('print(sQuote("abc"))', ['c("‘abc’")']);
  await outIs('print(dQuote("abc"))', ['c("“abc”")']);
  await outIs('print(sQuote("abc", q = FALSE))', ["c(\"'abc'\")"]);
  await outIs('print(sQuote("abc", q = "TeX"))', ['c("`abc\'")']);
  await outIs('print(dQuote("abc", q = "TeX"))', ['c("``abc\'\'")']);
  await outIs('print(sQuote(c("a", "b"), q = c("[", "]", "{", "}")))', [
    'c("[a]", "[b]")',
  ]);
  await outIs('print(dQuote("x", q = c("[", "]", "{", "}")))', ['c("{x}")']);
  await outIs("print(sQuote(42))", ['c("‘42’")']);
  await outIs("print(sQuote(NA))", ['c("‘NA’")']);
  await outIs("print(sQuote(character(0)))", ["c()"]);
});

// ---- utf8ToInt / intToUtf8 / validUTF8 / validEnc ----
test("eng2 utf8 conversions", async () => {
  await outIs('print(utf8ToInt("A"))', ["c(65)"]);
  await outIs('print(utf8ToInt("あ"))', ["c(12354)"]);
  await outIs('print(utf8ToInt(""))', ["c()"]);
  await outIs('print(utf8ToInt(c("ab", NA)[2]))', ["c(NA)"]);
  await warnHas('utf8ToInt(c("A", "B"))', /character vector of length 1/);
  // intToUtf8（multiple = FALSE）は長さ1の文字列（スカラー）を返す。
  await outIs("print(intToUtf8(65))", ['"A"']);
  await outIs("print(intToUtf8(c(97, 98, 99)))", ['"abc"']);
  await outIs("print(intToUtf8(c(97, 0, 98)))", ['"ab"']);
  await outIs("print(intToUtf8(c(65, 66), multiple = TRUE))", ['c("A", "B")']);
  await outIs("print(intToUtf8(NA))", ["NA"]);
  await outIs("print(intToUtf8(integer(0)))", ['""']);
  await errMatch("intToUtf8(-1)", /負の値は再現できません/);
  await outIs('print(validUTF8(c("abc", NA)))', ["c(TRUE, TRUE)"]);
  await outIs('print(validEnc("abc"))', ["c(TRUE)"]);
});

// ---- strtoi ----
test("eng2 strtoi", async () => {
  await outIs('print(strtoi("42"))', ["c(42)"]);
  await outIs('print(strtoi("0x2A", base = 0))', ["c(42)"]);
  await outIs('print(strtoi("010", base = 0))', ["c(8)"]);
  await outIs('print(strtoi("2A", base = 16))', ["c(42)"]);
  await outIs('print(strtoi("zz", base = 36))', ["c(1295)"]);
  await outIs('print(strtoi("42abc"))', ["c(NA)"]);
  await outIs('print(strtoi(" 42"))', ["c(42)"]);
  await outIs('print(strtoi(""))', ["c(NA)"]);
  await outIs('print(strtoi("-2147483647"))', ["c(-2147483647)"]);
  await outIs('print(strtoi("2147483648"))', ["c(NA)"]);
});

// ---- strwrap / strtrim / strrep ----
test("eng2 strwrap strtrim strrep", async () => {
  await outIs('print(strwrap("Hello world this is a test", 10))', [
    'c("Hello", "world", "this is a", "test")',
  ]);
  await outIs('print(strwrap("hello world foo bar", 10, indent = 2))', [
    'c("  hello", "world foo", "bar")',
  ]);
  await outIs('print(strwrap("hello world foo bar", 10, prefix = ">> "))', [
    'c(">> hello", ">> world", ">> foo", ">> bar")',
  ]);
  await outIs('print(strwrap("one two\\n\\nthree four", 10))', [
    'c("one two", "", "three", "four")',
  ]);
  await outIs('print(strwrap(c("hello world", NA), 10))', [
    'c("hello", "world", "NA")',
  ]);
  await errMatch(
    'strwrap("abc", 10, simplify = FALSE)',
    /simplify = FALSE（リスト返却）は未対応/,
  );
  await outIs('print(strtrim("abcdef", 3))', ['c("abc")']);
  await outIs('print(strtrim(c("abcdef", "abc"), c(2, 4)))', [
    'c("ab", "abc")',
  ]);
  await errMatch('strtrim("abc", -1)', /invalid 'width' argument/);
  await errMatch(
    'strtrim(c("abc", "def", "ghi"), c(2, 1))',
    /invalid 'width' argument/,
  );
  await outIs('print(strrep("ab", 3))', ['c("ababab")']);
  await outIs('print(strrep(c("a", "b"), c(2, 3)))', ['c("aa", "bbb")']);
  await outIs('print(strrep("a", 0))', ['c("")']);
  await outIs('print(strrep(c(n = "ab"), 2))', ['c(n = "abab")']);
  await errMatch('strrep("a", -1)', /invalid 'times' value/);
});

// ---- encodeString / shQuote ----
test("eng2 encodeString and shQuote", async () => {
  await outIs('print(encodeString("abc"))', ['c("abc")']);
  await outIs('print(encodeString("a\\tb"))', ['c("a\\\\tb")']);
  await outIs('print(encodeString("abc", width = 8, quote = "\\""))', [
    'c("\\"abc\\"   ")',
  ]);
  await outIs('print(encodeString("abc", width = 8, justify = "right"))', [
    'c("     abc")',
  ]);
  await outIs('print(encodeString("abc", width = 9, justify = "centre"))', [
    'c("   abc   ")',
  ]);
  await outIs("print(encodeString(NA))", ['c("<NA>")']);
  await outIs('print(encodeString(NA, width = 5))', ['c("<NA> ")']);
  await outIs('print(encodeString(NA, quote = "\\""))', ['c("NA")']);
  await outIs('print(shQuote("abc"))', ["c(\"'abc'\")"]);
  await outIs('print(shQuote("a\'b"))', ['c("\\"a\'b\\"")']);
  await outIs('print(shQuote(c("abc", "a\'b")))', [
    'c("\\"abc\\"", "\\"a\'b\\"")',
  ]);
  await outIs('print(shQuote("a$b", type = "csh"))', ["c(\"'a$b'\")"]);
  await outIs('print(shQuote("a\\"b", type = "cmd"))', [
    'c("\\"a\\\\\\"b\\"")',
  ]);
  await outIs('print(shQuote("a&b", type = "cmd2"))', ['c("a^&b")']);
  await outIs('print(shQuote("abc", type = "cmd"))', ['c("\\"abc\\"")']);
});

// ---- 実装しない名前（名指し停止） ----
test("eng2 not-implemented names stop by name", async () => {
  // strsplit はリストを返すが値モデルにリスト型が無い。
  await errMatch('strsplit("a,b", ",")', /説明に対応していません：strsplit/);
  // regexpr 系は match.length 属性が本質だが属性を保持できない。
  await errMatch('regexpr("a", "abc")', /説明に対応していません：regexpr/);
  await errMatch('gregexpr("a", "abc")', /説明に対応していません：gregexpr/);
  await errMatch('regexec("a", "abc")', /説明に対応していません：regexec/);
  // iconv はエンコーディング変換で忠実に表せない。
  await errMatch(
    'iconv("abc", "UTF-8", "UTF-8")',
    /説明に対応していません：iconv/,
  );
  // format は S3 ジェネリックで format.default のベクトル整形が別途必要。
  await errMatch("format(1.5)", /説明に対応していません：format/);
});

// ---- データフレームの扱い（eng1 の先例どおり名指しで対象外） ----
test("eng2 data frames are rejected by name", async () => {
  await errMatch(
    'nchar(data.frame(x = "ab"))',
    /データフレームはこの関数の対象外です/,
  );
  await errMatch(
    'paste(data.frame(x = 1), "a")',
    /データフレームはこの関数の対象外です/,
  );
});
