import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced as ref9 } from "../js/types/r/reference-advanced-part9.js";
import { names as names9 } from "../js/types/r/names-advanced-part9.js";
import { names as names1 } from "../js/types/r/names-advanced-part1.js";
import { names as names2 } from "../js/types/r/names-advanced-part2.js";
import { names as names7 } from "../js/types/r/names-advanced-part7.js";
import { builtins } from "../js/types/r/functions-advanced-utilsdata.js";

// 高度モード B4S・udata 班（R utils：データ操作・入出力）。
// 期待値は公式ヘルプ（stat.ethz.ch R-manual）の Usage／Examples と
// 実 R 4.3.3 の実測・関数ソースから導いた（報告書
// docs/audit/ADV-B4S-udata.md に根拠を記録）。

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

// ---------- 内容の自己検査（分母・重複・状態内訳） ----------

test("part9: 37項目・正規7フィールド・状態内訳 14/23/0", () => {
  assert.equal(ref9.length, 37);
  const counts = { supported: 0, unsupported: 0, unverified: 0 };
  for (const it of ref9) {
    assert.deepEqual(Object.keys(it).sort(), [
      "category",
      "caution",
      "description",
      "example",
      "name",
      "status",
      "syntax",
    ]);
    counts[it.status] += 1;
  }
  assert.deepEqual(counts, { supported: 14, unsupported: 23, unverified: 0 });
  const names = ref9.map((i) => i.name);
  assert.equal(new Set(names).size, 37);
});

test("part9: names は35件、既存 part と重複なし、.checkHT/.romans は除外", () => {
  assert.equal(names9.length, 35);
  const prior = new Set([...names1, ...names2, ...names7]);
  for (const n of names9) assert.ok(!prior.has(n), n);
  assert.ok(!names9.includes(".checkHT"));
  assert.ok(!names9.includes(".romans"));
  // names の全項目は reference に存在する
  const refNames = new Set(ref9.map((i) => i.name));
  for (const n of names9) assert.ok(refNames.has(n), n);
});

test("part9: supported 項目は全てハンドラを持ち、逆も成り立つ", () => {
  for (const it of ref9) {
    if (it.status === "supported") assert.ok(builtins.has(it.name), it.name);
  }
  for (const k of builtins.keys()) {
    assert.equal(ref9.find((i) => i.name === k)?.status, "supported", k);
  }
  assert.equal(builtins.size, 14);
});

// ---------- glob2rx（公式ヘルプの stopifnot 例が正本） ----------

test("glob2rx: ヘルプの変換例と各種パターン", async () => {
  await outIs('print(glob2rx("abc.*"))', ['c("^abc\\\\.")']);
  await outIs('print(glob2rx("*.doc"))', ['c("^.*\\\\.doc$")']);
  await outIs('print(glob2rx("*.doc", trim.head = TRUE))', ['c("\\\\.doc$")']);
  await outIs('print(glob2rx("a?b.*"))', ['c("^a.b\\\\.")']);
  await outIs('print(glob2rx("a?b.*", trim.tail = FALSE))', ['c("^a.b\\\\..*$")']);
  await outIs('print(glob2rx("*.t*"))', ['c("^.*\\\\.t")']);
  await outIs('print(glob2rx("*.t??"))', ['c("^.*\\\\.t..$")']);
  await outIs('print(glob2rx("*[*"))', ['c("^.*\\\\[")']);
  await outIs('print(glob2rx(c("*.a", "*.b"))) ', ['c("^.*\\\\.a$", "^.*\\\\.b$")']);
});

// ---------- URLencode / URLdecode ----------

test("URLencode: ヘルプ例と reserved の差異", async () => {
  await outIs('print(URLencode("a url with spaces and / and @"))', [
    'c("a%20url%20with%20spaces%20and%20/%20and%20@")',
  ]);
  await outIs('print(URLencode("a url with spaces and / and @", reserved = TRUE))', [
    'c("a%20url%20with%20spaces%20and%20%2F%20and%20%40")',
  ]);
  await outIs('print(URLencode("already%20done"))', ['c("already%20done")']);
  await outIs('print(URLencode("already%20done", repeated = TRUE))', [
    'c("already%2520done")',
  ]);
});

test("URLencode/URLdecode: 多バイト・NA・異常系", async () => {
  await outIs('print(URLencode("あ"))', ['c("%E3%81%82")']);
  await outIs('print(URLdecode("%E3%81%82"))', ['c("あ")']);
  await outIs('print(URLdecode("a+b"))', ['c("a+b")']);
  await outIs("print(URLencode(NA))", ['c("NA")']);
  await errMatch("URLencode(42)", /non-character argument/);
  await errMatch("URLdecode(42)", /argument must be a character vector of length 1/);
  await errMatch('URLdecode("a%zzb")', /embedded nul in string/);
  await warnHas('URLdecode("%zz")', /out-of-range values treated as 0/);
  await outIs('print(URLdecode("%zz"))', ['c("")']);
  await warnHas('URLdecode("trail%")', /out-of-range values treated as 0/);
});

// ---------- compareVersion ----------

test("compareVersion: 比較規則（要素の有無が勝つ）", async () => {
  await outIs('print(compareVersion("1.0", "1.0.0"))', ["-1"]);
  await outIs('print(compareVersion("1.0.0", "1.0"))', ["1"]);
  await outIs('print(compareVersion("1.0-0", "1.0"))', ["1"]);
  await outIs('print(compareVersion("1.0", "1.0-1"))', ["-1"]);
  await outIs('print(compareVersion("7.2-0", "7.1-12"))', ["1"]);
  await outIs('print(compareVersion("1.01", "1.1"))', ["0"]);
  await outIs('print(compareVersion("1.2", "1.10"))', ["-1"]);
});

// ---------- hasName ----------

test("hasName: 名前付きベクトルとデータフレーム", async () => {
  await outIs('print(hasName(c(a = 1, b = 2), c("a", "c")))', ["c(TRUE, FALSE)"]);
  await outIs('print(hasName(data.frame(a = 1, b = 2), "b"))', ["c(TRUE)"]);
  await outIs('print(hasName(1:3, "a"))', ["c(FALSE)"]);
  await outIs('print(hasName(NULL, "a"))', ["c(FALSE)"]);
});

// ---------- head / tail ----------

test("head/tail: ベクトルの基本・負値・既定値", async () => {
  await outIs("print(head(1:10))", ["c(1, 2, 3, 4, 5, 6)"]);
  await outIs("print(tail(1:10))", ["c(5, 6, 7, 8, 9, 10)"]);
  await outIs("print(head(1:10, 3))", ["c(1, 2, 3)"]);
  await outIs("print(head(1:10, -3))", ["c(1, 2, 3, 4, 5, 6, 7)"]);
  await outIs("print(tail(1:10, -3))", ["c(4, 5, 6, 7, 8, 9, 10)"]);
  await outIs("print(head(1:3, 10))", ["c(1, 2, 3)"]);
  await outIs("print(head(NULL))", ["NULL"]);
  await outIs('print(head(c("a", "b", "c", "d", "e", "f", "g", "h"), -6))', [
    'c("a", "b")',
  ]);
});

test("head/tail: データフレーム（行名保持・2次元 n）", async () => {
  await outIs("print(head(data.frame(a = 1:4, b = 5:8), 2))", [
    "a: c(1, 2)\nb: c(5, 6)",
  ]);
  await outIs("print(tail(data.frame(a = 1:4, b = 5:8), 2))", [
    "a: c(3, 4)\nb: c(7, 8)",
  ]);
  await outIs("print(head(data.frame(a = 1:4, b = 5:8, c = 9:12), c(2, 1)))", [
    "a: c(1, 2)",
  ]);
  await outIs("print(head(data.frame(a = 1:4, b = 5:8), c(NA, 1)))", [
    "a: c(1, 2, 3, 4)",
  ]);
});

test("head/tail: checkHT の異常系（実 R の文言）", async () => {
  await errMatch("head(1:5, NA)", /invalid 'n' - must contain at least one non-missing element/);
  await errMatch("head(1:5, 'a')", /invalid 'n' - must be numeric/);
  await errMatch("head(1:5, c(1, 2))", /invalid 'n' - must have length one when dim\(x\) is NULL/);
  await errMatch(
    "head(data.frame(a = 1), c(1, 1, 1))",
    /invalid 'n' - length\(n\) must be <= length\(dim\(x\)\)/,
  );
});

// ---------- combn ----------

test("combn: FUN 文字列による集計", async () => {
  await outIs('print(combn(1:4, 2, FUN = "sum"))', ["c(3, 4, 5, 5, 6, 7)"]);
  await outIs('print(combn(5, 2, FUN = "sum"))', [
    "c(3, 4, 5, 6, 5, 6, 7, 7, 8, 9)",
  ]);
  await outIs('print(combn(c(1, NA, 3), 2, FUN = "sum", na.rm = TRUE))', [
    "c(1, 4, 3)",
  ]);
  await outIs('print(combn(1:3, 3, FUN = "length"))', ["c(3)"]);
});

test("combn: 異常系と未対応形の名指し停止", async () => {
  await errMatch('combn(1:4, c(1, 2), FUN = "sum")', /length\(m\) == 1L is not TRUE/);
  await errMatch('combn(1:4, "a", FUN = "sum")', /is\.numeric\(m\) is not TRUE/);
  await errMatch('combn(1:4, NA, FUN = "sum")', /is\.numeric\(m\) is not TRUE/);
  await errMatch("combn(1:4, 2)", /行列|リスト/);
  await errMatch('combn(1:4, 2, simplify = FALSE, FUN = "sum")', /リスト/);
});

// ---------- modifyList（データフレーム同士） ----------

test("modifyList: 列の置換・追加・リサイクル", async () => {
  await outIs(
    "print(modifyList(data.frame(a = 1:3, b = 4:6), data.frame(b = 5:7, c = 7:9)))",
    ["a: c(1, 2, 3)\nb: c(5, 6, 7)\nc: c(7, 8, 9)"],
  );
  await outIs(
    "print(modifyList(data.frame(a = 1:3), data.frame(b = 9)))",
    ["a: c(1, 2, 3)\nb: c(9, 9, 9)"],
  );
  await errMatch(
    "modifyList(data.frame(a = 1:3), data.frame(b = 1:2))",
    /replacement has 2 rows, data has 3/,
  );
  await errMatch("modifyList(1:3, data.frame(a = 1))", /リスト|データフレーム/);
});

// ---------- type.convert ----------

test("type.convert: 型の梯子（typeof で照合）", async () => {
  // モデルでは integer と double は同じ数値型（typeof は "double"）。
  // 整数パターンの受理可否は値で担保し、型名では区別しない（報告書に明記）。
  await outIs('print(typeof(type.convert(c("1", "2"), as.is = TRUE)))', ['"double"']);
  await outIs('print(typeof(type.convert(c("1.5", "2"), as.is = TRUE)))', ['"double"']);
  await outIs('print(typeof(type.convert(c("T", "FALSE"), as.is = TRUE)))', ['"logical"']);
  await outIs('print(typeof(type.convert(c("a", "b"), as.is = TRUE)))', ['"character"']);
  await outIs('print(typeof(type.convert(c("NA", ""), as.is = TRUE)))', ['"logical"']);
  await outIs('print(typeof(type.convert(" 1", as.is = TRUE)))', ['"double"']);
  await outIs('print(typeof(type.convert("1 ", as.is = TRUE)))', ['"double"']);
  await outIs('print(typeof(type.convert("1,5", dec = ",", as.is = TRUE)))', ['"double"']);
  await outIs('print(typeof(type.convert("0x10", as.is = TRUE)))', ['"double"']);
  await outIs('print(typeof(type.convert("2147483648", as.is = TRUE)))', ['"double"']);
});

test("type.convert: 値・na.strings・警告・名指し停止", async () => {
  await outIs('print(type.convert(c("1", "NA", "3"), as.is = TRUE))', ["c(1, NA, 3)"]);
  await outIs('print(type.convert(c("x", "y"), na.strings = "x", as.is = TRUE))', [
    'c(NA, "y")',
  ]);
  await warnHas('type.convert(c("1", "2"))', /'as\.is' should be specified by the caller/);
  await warnHas(
    'type.convert("9007199254740993", numerals = "warn.loss", as.is = TRUE)',
    /accuracy loss in conversion/,
  );
  await outIs(
    'print(typeof(type.convert("9007199254740993", numerals = "no.loss", as.is = TRUE)))',
    ['"character"'],
  );
  await errMatch('type.convert("1+2i", as.is = TRUE)', /複素数/);
  await errMatch('type.convert(c("a", "b"), as.is = FALSE)', /因子|factor/);
  await outIs(
    "print(type.convert(data.frame(a = c(\"1\", \"2\"), b = c(\"x\", \"y\")), as.is = TRUE))",
    ['a: c(1, 2)\nb: c("x", "y")'],
  );
});

// ---------- is.relistable / strcapture / stack ----------

test("is.relistable: 常に FALSE（relistable は生成不能）", async () => {
  await outIs("print(is.relistable(c(1, 2)))", ["FALSE"]);
  await outIs("print(is.relistable(data.frame(a = 1)))", ["FALSE"]);
});

test("strcapture: 公式例と非マッチ行", async () => {
  await outIs(
    'print(strcapture("(.*?):([[:digit:]]+)-([[:digit:]]+)", "chr1:1-1000", data.frame(chr = character(), start = integer(), end = integer())))',
    ['chr: c("chr1")\nstart: c(1)\nend: c(1000)'],
  );
  await outIs(
    'print(strcapture("([[:alpha:]]+):([[:digit:]]+)", c("a:1", "xyz"), data.frame(chr = character(), pos = integer())))',
    ['chr: c("a", NA)\npos: c(1, NA)'],
  );
  await errMatch(
    'strcapture("(a)(b)", "ab", data.frame(x = character()))',
    /The number of captures in 'pattern'/,
  );
  await errMatch(
    'strcapture("([.ch.]+)", "ch", data.frame(x = character()))',
    /照合要素・等価クラスは未対応/,
  );
});

test("stack: values/ind の構成と select", async () => {
  await outIs("print(stack(data.frame(a = 1:2, b = 3:4)))", [
    'values: c(1, 2, 3, 4)\nind: c("a", "a", "b", "b")',
  ]);
  await outIs('print(stack(data.frame(a = 1:2, b = 3:4), select = "b"))', [
    'values: c(3, 4)\nind: c("b", "b")',
  ]);
  await outIs("print(stack(data.frame(a = 1:2, b = 3:4), select = -1))", [
    'values: c(3, 4)\nind: c("b", "b")',
  ]);
  await outIs('print(stack(data.frame(a = c("x", "y"), b = 1:2)))', [
    'values: c("x", "y", "1", "2")\nind: c("a", "a", "b", "b")',
  ]);
  await errMatch('stack(data.frame(a = 1), select = "zzz")', /undefined columns selected/);
  await errMatch(
    "stack(data.frame(a = 1), select = character(0))",
    /no vector columns were selected/,
  );
});

// ---------- 未対応の名指し停止（誤った値を返さない） ----------

test("未対応: ファイル入出力・データセット・表示系は名指しで停止", async () => {
  const cases = [
    ['read.table("data.txt")', "read.table"],
    ['read.fwf("data.txt", 1)', "read.fwf"],
    ['read.DIF("data.dif")', "read.DIF"],
    ['read.fortran("data.txt", "F2")', "read.fortran"],
    ['count.fields("data.txt")', "count.fields"],
    ['write.table(data.frame(a = 1), "data.txt")', "write.table"],
    ["data()", "data"],
    ['file_test("-f", "data.txt")', "file_test"],
    ['capture.output(1 + 1)', "capture.output"],
    ["str(1:3)", "str"],
    ["strOptions()", "strOptions"],
    ["print.packageIQR(1)", "print.packageIQR"],
  ];
  for (const [code, name] of cases) {
    await errMatch(
      code,
      new RegExp("説明に対応していません：" + name.replace(/\./g, "\\.")),
    );
  }
});

test("未対応: 表せない戻り値の関数は名指しで停止", async () => {
  const cases = [
    ['adist("kitten", "sitting")', "adist"],
    ['aregexec("laysy", "1 lazy")', "aregexec"],
    ["as.relistable(c(1, 2))", "as.relistable"],
    ["relist(c(1, 2), c(1, 2))", "relist"],
    ["unlist.relistable(c(1, 2))", "unlist.relistable"],
    ["as.roman(3)", "as.roman"],
    ["unstack(data.frame(a = 1:2))", "unstack"],
  ];
  for (const [code, name] of cases) {
    await errMatch(
      code,
      new RegExp("説明に対応していません：" + name.replace(/\./g, "\\.")),
    );
  }
});
