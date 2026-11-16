import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ2「R／JavaScript・拡張班」
// 対象：funcheck R-01 / R-02（= refacc RA-42）/ JS-01、
//       R23-N4、refacc RA-40〜RA-44（R）、RA-45〜RA-48（JavaScript）

const runR = async (code) => {
  const d = getDefinition("r");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const runJS = async (code) => {
  const d = getDefinition("javascript");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errOf = (r) => r.error || r.paths?.[0]?.error;
const okPath = async (run, code) => {
  const r = await run(code);
  assert.equal(errOf(r), undefined, JSON.stringify(errOf(r)));
  assert.equal(r.paths.length, 1, JSON.stringify(r));
  return r.paths[0];
};
const outputs = (p) => p.outputs.map((o) => o.text);

// ---- R-01：if / while / if式の数値条件は論理値へ黙って強制しない ----
for (const code of [
  "if (1) print('yes')",
  "if (0) print('yes')",
  "i <- 0; while (1) { i <- i + 1; if (i > 2) break }; print(i)",
  "x <- if (1) 2 else 3",
  "x <- if (0) 2 else 3",
]) {
  test("R-01 numeric condition stops: " + code, async () => {
    const r = await runR(code);
    assert.match(errOf(r).message, /argument is not interpretable as logical/);
    assert.deepEqual(outputs(r.paths[0] || { outputs: [] }), []);
  });
}
test("R-01 logical conditions and existing condition errors are unchanged", async () => {
  const p = await okPath(runR, "if (TRUE) print('yes')");
  assert.deepEqual(outputs(p), ['"yes"']);
  const rNA = await runR("if (NA) print('yes')");
  assert.match(errOf(rNA).message, /missing value where TRUE\/FALSE needed/);
  const rLen = await runR("if (c(TRUE, FALSE)) print('yes')");
  assert.match(errOf(rLen).message, /the condition has length > 1/);
  const rStr = await runR("if ('a') print('yes')");
  assert.match(errOf(rStr).message, /argument is not interpretable as logical/);
});
test("R-01 sibling separation: !, &&, || still coerce numerics per ?Logic", async () => {
  // ?Logic「Numeric and complex vectors will be coerced to logical values」
  assert.deepEqual(outputs(await okPath(runR, "print(!1)")), ["c(FALSE)"]);
  assert.deepEqual(outputs(await okPath(runR, "print(1 && TRUE)")), ["TRUE"]);
  assert.deepEqual(outputs(await okPath(runR, "print(0 || FALSE)")), ["FALSE"]);
  assert.deepEqual(outputs(await okPath(runR, "print(2 && 3)")), ["TRUE"]);
});
test("R-01 sibling separation: && / || keep NA three-valued logic", async () => {
  assert.deepEqual(outputs(await okPath(runR, "print(NA && FALSE)")), ["FALSE"]);
  assert.deepEqual(outputs(await okPath(runR, "print(NA && TRUE)")), ["NA"]);
  assert.deepEqual(outputs(await okPath(runR, "print(NA || TRUE)")), ["TRUE"]);
  assert.deepEqual(outputs(await okPath(runR, "print(NA || FALSE)")), ["NA"]);
  const r = await runR("print('a' && TRUE)");
  assert.match(errOf(r).message, /argument is not interpretable as logical/);
});

// ---- R-02 / RA-42：$ の部分一致 ----
test("R-02/RA-42 $ does partial matching when the prefix is unique", async () => {
  const p = await okPath(runR, "df <- data.frame(xyz = c(1, 2))\nprint(df$xy)");
  assert.deepEqual(outputs(p), ["c(1, 2)"]);
  const p2 = await okPath(runR, "df <- data.frame(xyz = c(1, 2))\nprint(mean(df$xy))");
  assert.deepEqual(outputs(p2), ["1.5"]);
});
test("R-02/RA-42 $ is NULL when no match or the prefix is ambiguous", async () => {
  const p = await okPath(runR, "df <- data.frame(xyz = c(1, 2))\nprint(df$zz)");
  assert.deepEqual(outputs(p), ["NULL"]);
  const p2 = await okPath(
    runR,
    "df <- data.frame(xyz = c(1, 2), xya = c(3, 4))\nprint(df$xy)",
  );
  assert.deepEqual(outputs(p2), ["NULL"]);
});
test("R-02/RA-42 exact match wins and $ assignment never partial-matches", async () => {
  const p = await okPath(
    runR,
    "df <- data.frame(xyz = c(1, 2), xy = c(7, 8))\nprint(df$xy)",
  );
  assert.deepEqual(outputs(p), ["c(7, 8)"]);
  // $<- は部分一致しない：xyz がある状態で df$xy へ代入すると新しい列 xy ができる
  const p2 = await okPath(
    runR,
    "df <- data.frame(xyz = c(1, 2))\ndf$xy <- c(9, 9)\nprint(df$xyz)\nprint(df$xy)",
  );
  assert.deepEqual(outputs(p2), ["c(1, 2)", "c(9, 9)"]);
});
test("R-02 sibling: [[ keeps exact matching by default (?Extract exact=TRUE)", async () => {
  const r = await runR("df <- data.frame(xyz = c(1, 2))\nprint(df[['xy']])");
  assert.match(errOf(r).message, /subscript out of bounds/);
  const p = await okPath(runR, "df <- data.frame(xyz = c(1, 2))\nprint(df[['xyz']])");
  assert.deepEqual(outputs(p), ["c(1, 2)"]);
});

// ---- JS-01：未対応メンバー呼び出しの理由は虚偽にしない ----
for (const [code, name] of [
  ["console.log(Math.max(1, 2));", "Math.max"],
  ["console.log(Math.ceil(1.5));", "Math.ceil"],
  ["console.log(Math.sqrt(4));", "Math.sqrt"],
  ["console.log(JSON.parse('{}'));", "JSON.parse"],
  ["console.log(Object.keys({a: 1}));", "Object.keys"],
  ["console.log(Array.isArray([1]));", "Array.isArray"],
  ["console.warn('x');", "console.warn"],
]) {
  test("JS-01 unsupported member call names the function: " + code, async () => {
    const r = await runJS(code);
    const e = errOf(r);
    assert.equal(e.message, "このJavaScript関数は説明に対応していません：" + name);
    assert.notEqual(e.category, "ReferenceError");
    assert.doesNotMatch(e.message, /未定義の名前/);
  });
}
test("JS-01 supported members still work and true undefined names still ReferenceError", async () => {
  const p = await okPath(runJS, "console.log(Math.abs(-3));");
  assert.deepEqual(outputs(p), ["3"]);
  const p2 = await okPath(runJS, "console.log(JSON.stringify({a: 1}));");
  assert.deepEqual(outputs(p2), ['{"a":1}']);
  const r = await runJS("foo.bar();");
  assert.equal(errOf(r).category, "ReferenceError");
  assert.match(errOf(r).message, /未定義の名前：foo/);
});
test("JS-01 sibling surfaces: property reads and bare global names are honest", async () => {
  const r = await runJS("console.log(Math.PI);");
  assert.match(errOf(r).message, /このJavaScriptプロパティは説明に対応していません：Math\.PI/);
  assert.doesNotMatch(errOf(r).message, /未定義の名前/);
  // ユーザーが同名の変数を定義した場合はそちらが優先される
  const p = await okPath(runJS, "let Math = {max: 5}; console.log(Math.max);");
  assert.deepEqual(outputs(p), ["5"]);
  const p2 = await okPath(runJS, "console.log(typeof Math.abs);");
  assert.deepEqual(outputs(p2), ["function"]);
});

// ---- R23-N4：必須引数を欠いた呼び出しは値を捏造しない ----
for (const [code, param] of [
  ["print()", "x"],
  ["x <- length(); print(x)", "x"],
  ["x <- is.na(); print(x)", "x"],
  ["x <- rep(); print(x)", "x"],
  // B13-R（R7-26）テスト是正：as.numeric()／as.character() は実 R
  // （Codex の実 R 4.2.2 実測）では引数なしで長さ0ベクトルを返すため、
  // missing エラーの対象から外す。一次情報と矛盾する固定だった。
  ["x <- nrow(); print(x)", "x"],
  ["x <- ncol(); print(x)", "x"],
  ["x <- names(); print(x)", "x"],
  ["mean()", "x"],
  ["x <- median(); print(x)", "x"],
  ["x <- sd(); print(x)", "x"],
  ["x <- seq_len(); print(x)", "length.out"],
  ["x <- read.csv(); print(x)", "file"],
  ["x <- rnorm(); print(x)", "n"],
  ["x <- runif(); print(x)", "n"],
  ["x <- sample(); print(x)", "x"],
  ["x <- rep(times = 2); print(x)", "x"],
]) {
  test("R23-N4 missing required argument stops: " + code, async () => {
    const r = await runR(code);
    assert.equal(
      errOf(r).message,
      `argument "${param}" is missing, with no default`,
    );
  });
}
test("R23-N4 calls that are valid with no arguments stay valid", async () => {
  const p = await okPath(runR, "x <- sum(); print(x)");
  assert.deepEqual(outputs(p), ["0"]);
  await okPath(runR, "x <- c(); print(length(x))");
  // B13-R（R7-26）：引数なしの型変換は長さ0ベクトルとして有効。
  await okPath(runR, "x <- as.numeric(); print(length(x))");
  await okPath(runR, "x <- as.character(); print(length(x))");
  await okPath(runR, "cat()");
  await okPath(runR, "df <- data.frame(); print(ncol(df))");
  const p2 = await okPath(runR, "print(length(x = c(1, 2, 3)))");
  assert.deepEqual(outputs(p2), ["3"]);
});

// ---- RA-40〜RA-44（R 文面） ----
test("RA-40 %/% text says floor division and the engine agrees", async () => {
  const d = getDefinition("r");
  const row = d.reference.find((r) => r.name === "%/%");
  assert.match(row.description, /floor除算/);
  assert.match(row.description, /-7 %\/% 3 は -2 ではなく -3/);
  assert.match(row.returns, /floor除算/);
  const p = await okPath(runR, "print(-7 %/% 3)");
  assert.deepEqual(outputs(p), ["c(-3)"]);
});
test("RA-41 NA text states the propagation exceptions the engine implements", async () => {
  const d = getDefinition("r");
  const row = d.reference.find((r) => r.name === "NA");
  assert.match(row.description, /NA \| TRUE は TRUE/);
  assert.match(row.description, /NA & FALSE は FALSE/);
  assert.match(row.description, /NA \^ 0 は 1/);
  const p = await okPath(runR, "print(NA | TRUE); print(NA & FALSE); print(NA ^ 0)");
  assert.deepEqual(outputs(p), ["c(TRUE)", "c(FALSE)", "c(1)"]);
});
test("RA-42 $ text documents partial matching", async () => {
  const d = getDefinition("r");
  const row = d.reference.find((r) => r.name === "$");
  assert.match(row.description, /部分一致/);
  assert.match(row.returns, /部分一致/);
});
test("RA-43 data.frame text limits element-wise arithmetic to numeric columns", async () => {
  const d = getDefinition("r");
  const row = d.reference.find((r) => r.name === "data.frame");
  assert.match(row.description, /数値列（numeric／logical）のみ/);
  assert.match(row.description, /文字列などの列を含むデータフレームへの四則演算はエラー/);
  const r = await runR("df <- data.frame(a = c(1, 2), b = c('x', 'y'))\nprint(df + 1)");
  assert.match(errOf(r).message, /non-numeric argument/);
});
test("RA-44 data.frame source URL is data.frame.html", async () => {
  const d = getDefinition("r");
  const row = d.reference.find((r) => r.name === "data.frame");
  assert.equal(
    row.source,
    "https://stat.ethz.ch/R-manual/R-devel/library/base/html/data.frame.html",
  );
});

// ---- RA-45〜RA-48（JavaScript 文面） ----
test("RA-45 typeof returns include \"symbol\"", async () => {
  const d = getDefinition("javascript");
  const row = d.reference.find((r) => r.name === "typeof");
  assert.match(row.returns, /"symbol"/);
});
test("RA-46 BigInt caution does not call BigInt(...) a constructor call", async () => {
  const d = getDefinition("javascript");
  const row = d.reference.find((r) => r.name === "BigInt");
  assert.doesNotMatch(row.caution, /コンストラクタ呼び出し/);
  assert.match(row.caution, /関数としてのBigInt\(\.\.\.\)呼び出し/);
  assert.match(row.caution, /BigIntはコンストラクタではなく/);
});
test("RA-47 break text covers switch and labelled statements (JS only)", async () => {
  const d = getDefinition("javascript");
  const row = d.reference.find((r) => r.name === "break");
  assert.match(row.description, /switch文/);
  assert.match(row.description, /ラベル付き文/);
  // R の break はループのみで正しいため文面を変えていないこと
  const rd = getDefinition("r");
  const rrow = rd.reference.find((r) => r.name === "break");
  assert.doesNotMatch(rrow.description, /switch/);
});
test("RA-48 object literal source is the Object initializer page", async () => {
  const d = getDefinition("javascript");
  const row = d.reference.find((r) => r.name === "オブジェクトリテラル");
  assert.equal(
    row.source,
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer",
  );
});

// ---- 個票 reference-r2.json の同期（sha256 は不変） ----
test("RA-40..48 changed rows stay in sync with reference-r2.json", async () => {
  const rows = JSON.parse(
    readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"),
  );
  const targets = [
    ["r", "%/%"], ["r", "NA"], ["r", "$"], ["r", "data.frame"],
    ["javascript", "typeof"], ["javascript", "BigInt"],
    ["javascript", "break"], ["javascript", "オブジェクトリテラル"],
  ];
  for (const [kind, name] of targets) {
    const def = getDefinition(kind);
    const ref = def.reference.find((r) => r.name === name);
    const row = rows.find((x) => x.kind === kind && x.name === name);
    assert.ok(row, kind + "/" + name);
    const fields = Object.fromEntries(
      ["description", "returns", "caution", "example", "source"].map((k) => [k, ref[k] || ""]),
    );
    assert.deepEqual(row.fields, fields, kind + "/" + name);
    assert.match(row.sha256, /^[0-9a-f]{64}$/, kind + "/" + name + " sha256 kept");
  }
});
