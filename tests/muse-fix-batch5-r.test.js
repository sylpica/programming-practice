import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ5・R班（R26-N6／N24／N25）。
// 根拠は R 公式ドキュメント ?Reserved（予約定数の一覧）、?seq（第5の
// 用法：長さ1の数値なら 1:from、それ以外は 1:length(from)。seq(0) の
// S 互換の明記）と seq.default の公式ソース、?sample（size は非負、
// 長さ1の数値の x は正の整数で母集団 1:x、replace=FALSE では母集団
// 超過不可）、?Normal／?Uniform（n は観測数）。
// 当 VM に Rscript は無いため、実機対照ではなく公式ドキュメントで
// 裁定した期待値を固定する（実機突合は未実施）。

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

// ---- R26-N6：予約定数への代入 ----
const RESERVED = [
  "NA",
  "NA_integer_",
  "NA_real_",
  "NA_complex_",
  "NA_character_",
  "Inf",
  "NaN",
  // RG-181 で是正済みの分も同じ列挙で維持されること。
  "TRUE",
  "FALSE",
  "NULL",
];

test("R26-N6 reserved constants reject <- and = by name, with no phantom variable", async () => {
  for (const name of RESERVED) {
    for (const op of ["<-", "="]) {
      const code = `${name} ${op} 5`;
      const r = await run(code);
      const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
      assert.ok(
        errs.some(
          (e) =>
            e.message.includes("代入先が不正です") && e.message.includes(name),
        ),
        code + " -> " + JSON.stringify(errs),
      );
      for (const p of r.paths || [])
        assert.ok(!(name in (p.vars || {})), code + " left a phantom variable");
    }
  }
});

test("R26-N6 typed NA no longer rebinds (print must not fabricate 5)", async () => {
  const errs = await errOf("NA_integer_ <- 5\nprint(NA_integer_)");
  assert.ok(
    errs.some((e) => e.message.includes("NA_integer_")),
    JSON.stringify(errs),
  );
});

test("R26-N6 assignment target is named before the right-hand side is read", async () => {
  // 右辺の未定義名ではなく、代入先の予約定数が先に名指されること。
  const errs = await errOf("NA <- undefined_name_xyz");
  assert.ok(
    errs.some((e) => e.message.includes("NA には代入できません")),
    JSON.stringify(errs),
  );
});

test("R26-N6 compound assignment and for-loop variables are also rejected", async () => {
  for (const code of ["NA += 1", "NA_integer_ += 1", "Inf -= 1", "NaN *= 2"]) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => e.message.includes("代入先が不正です")),
      code + " -> " + JSON.stringify(errs),
    );
  }
  for (const name of ["NA", "TRUE", "NA_character_"]) {
    const errs = await errOf(`for (${name} in 1:2) print(${name})`);
    assert.ok(
      errs.some((e) => e.message.includes(name)),
      name + " -> " + JSON.stringify(errs),
    );
  }
});

test("R26-N6 -> and <<- stop honestly instead of silently rebinding", async () => {
  for (const code of ["5 -> NA", "5 ->> NA_integer_", "NA <<- 5"]) {
    const r = await run(code);
    const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
    assert.ok(errs.length > 0, code + " was silently accepted");
    for (const p of r.paths || []) assert.deepEqual(p.vars || {}, {});
  }
});

test("R26-N6 T and F stay assignable, and the constants still read correctly", async () => {
  const p = await first("T <- 5\nprint(T)\nF <- 7\nprint(F)");
  assert.deepEqual(outputs(p), ["5", "7"]);
  const p2 = await first(
    "print(NA)\nprint(Inf)\nprint(NaN)\nx <- c(1, NA)\nprint(is.na(x))",
  );
  assert.deepEqual(outputs(p2), ["NA", "Inf", "NaN", "c(FALSE, TRUE)"]);
});

// ---- R26-N24：seq の単独引数形 ----
test("R26-N24 seq(single numeric) is 1:arg, including 0 and negatives", async () => {
  const cases = [
    ["print(seq(0))", ["c(1, 0)"]],
    ["print(seq(-1))", ["c(1, 0, -1)"]],
    ["print(seq(-0.5))", ["c(1, 0)"]],
    ["print(seq(2.5))", ["c(1, 2)"]],
    ["print(seq(-2.5))", ["c(1, 0, -1, -2)"]],
    ["print(seq(1))", ["c(1)"]],
    ["print(seq(2))", ["c(1, 2)"]],
    ["print(seq(5))", ["c(1, 2, 3, 4, 5)"]],
    ["print(seq(0.5))", ["c(1)"]],
    ["print(seq(1.5))", ["c(1)"]],
    // 長さ1ベクトル・変数経由でも数値形を取り逃がさないこと。
    ["print(seq(c(5)))", ["c(1, 2, 3, 4, 5)"]],
    ["x <- -3\nprint(seq(x))", ["c(1, 0, -1, -2, -3)"]],
    ["x <- 0\nprint(seq(x))", ["c(1, 0)"]],
  ];
  for (const [code, expected] of cases) {
    const p = await first(code);
    assert.deepEqual(outputs(p), expected, code);
  }
});

test("R26-N24 seq(0) membership knock-on is fixed", async () => {
  const p = await first("print(0 %in% seq(0))");
  assert.deepEqual(outputs(p), ["c(TRUE)"]);
});

test("R26-N24 seq(single non-numeric / vector / NULL) follows 1:length(from)", async () => {
  const cases = [
    ["print(seq(c(10, 20, 30)))", ["c(1, 2, 3)"]],
    ["print(seq(1:3))", ["c(1, 2, 3)"]],
    ["print(seq(NULL))", ["c()"]],
    ["print(seq(c()))", ["c()"]],
    // ?seq の第5用法＋seq.default ソース：数値でない長さ1は長さ扱い。
    ["print(seq(NA))", ["c(1)"]],
    ["print(seq('abc'))", ["c(1)"]],
  ];
  for (const [code, expected] of cases) {
    const p = await first(code);
    assert.deepEqual(outputs(p), expected, code);
  }
  for (const code of ["print(seq(NaN))", "print(seq(Inf))"]) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => /NA\/NaN argument/.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("R26-N24 named and multi-argument seq forms are unchanged", async () => {
  const cases = [
    ["print(seq(1, 5, 2))", ["c(1, 3, 5)"]],
    ["print(seq(5, 1))", ["c(5, 4, 3, 2, 1)"]],
    ["print(seq(from = 1, to = 5, by = 2))", ["c(1, 3, 5)"]],
    ["print(seq(0, 1, length.out = 5))", ["c(0, 0.25, 0.5, 0.75, 1)"]],
    ["print(seq(1, 2, along.with = c(9, 8, 7)))", ["c(1, 1.5, 2)"]],
    ["print(seq(to = 3))", ["c(1, 2, 3)"]],
    ["print(seq(length.out = 3))", ["c(1, 2, 3)"]],
    // from だけの名前付き形も第5用法に従う。
    ["print(seq(from = 0))", ["c(1, 0)"]],
    ["print(seq(from = -1))", ["c(1, 0, -1)"]],
  ];
  for (const [code, expected] of cases) {
    const p = await first(code);
    assert.deepEqual(outputs(p), expected, code);
  }
});

// ---- R26-N25：乱数系の決定的に不正な引数 ----
test("R26-N25 sample population overflow and negative size stop by name", async () => {
  const cases = [
    ["sample(1:3, 5)", /size[\s\S]*母集団/],
    ["sample(1:3, size = 5)", /size[\s\S]*母集団/],
    ["sample(5, 10)", /size[\s\S]*母集団/],
    ["sample(1:3, -1)", /sampleの size/],
    ["sample(1:3, size = -1)", /sampleの size/],
    ["sample(1:3, NA)", /sampleの size/],
  ];
  for (const [code, re] of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => re.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("R26-N25 sample with a non-positive single numeric x stops by name", async () => {
  for (const code of ["sample(0)", "sample(-1)", "sample(0.5)"]) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => e.message.includes("sampleの x")),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("R26-N25 negative or missing n for rnorm / runif stops by name", async () => {
  const cases = [
    ["rnorm(-1)", /rnormの n/],
    ["rnorm(n = -1)", /rnormの n/],
    ["runif(-2)", /runifの n/],
    ["rnorm(NA)", /rnormの n/],
    ["runif(NA)", /runifの n/],
  ];
  for (const [code, re] of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => re.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("R26-N25 legal random forms keep the unknown-value model", async () => {
  for (const code of [
    "rnorm(0)",
    "runif(0)",
    "sample(1:3, 0)",
    "sample(1:3, 5, replace = TRUE)",
    "sample(5, 10, replace = TRUE)",
    "sample(5)",
    "sample(1:3)",
    // ?Normal：length(n) > 1 のとき長さが個数になるため、要素の負値は
    // 個数の不正ではない。
    "rnorm(c(-1, -2))",
    // 小数 size の切り捨て要否は公式ページだけでは確定できないため
    // 現行維持（未確認）であることの回帰ガード。
    "sample(c(1, 2), size = 1.5)",
  ]) {
    const errs = await errOf(code);
    assert.deepEqual(errs, [], code);
  }
  const p = await first("x <- rnorm(3)\nprint(x)");
  assert.deepEqual(outputs(p), ["（実行時に決まる値）"]);
});

test("R26-N25 unimplemented random relatives still stop by name", async () => {
  // 前提更新（2026-11-18、高度モード B4S）：rbinom／rpois は stats の
  // 分布関数として対応化された（引数検証つき freshUnknown）。そのため
  // 本テストの対象は base 範囲で未実装のままの sample.int のみに縮小し、
  // rbinom／rpois は下の新テストで新挙動を固定する。sample.int は
  // 従来どおり未実装として名指し停止する経路にあること。
  for (const code of ["sample.int(10, 5)"]) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => /説明に対応していません/.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("R26-N25 (B4S) rbinom / rpois validate arguments like real R", async () => {
  // 実 R 4.3.3 実測：rbinom(-1, 10, 0.5) / rpois(-1, 2) は
  // "invalid arguments" でエラー。正の引数では実行時の値（未確定値）
  // となり、決め打ちの値を返さない。
  for (const code of ["rbinom(-1, 10, 0.5)", "rpois(-1, 2)"]) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => e.message === "invalid arguments"),
      code + " -> " + JSON.stringify(errs),
    );
  }
  for (const code of ["rbinom(3, 10, 0.5)", "rpois(3, 2)"]) {
    const errs = await errOf(code);
    assert.deepEqual(errs, [], code);
  }
});
