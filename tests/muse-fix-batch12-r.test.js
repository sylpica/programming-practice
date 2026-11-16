import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ12・R班（RG-370／RG-372）。
// RG-370（R33-PAR-7）：R の名前空間演算子 ::／::: の完結形が名指しされず
// 「代入の区切りが必要です」「) が必要です」等の虚偽原因に化けていた。
// 裁定は R 公式ヘルプ ?::（ns-dblcolon：Usage は pkg::name／pkg:::name、
// pkg と name はいずれも "symbol or literal character string"）による。
// 本アプリはパッケージ名前空間を解決しないため、演算子そのものを
// 名指す未対応停止が正しい処置。
// RG-372（R33-F01C-N1）：モデル files の値の形状が未検証で、read.csv が
// data.frame でない値（数値・配列等）をそのまま結果にしていた。
// RG-362 で確立した水準（ファイル系モデル要素は simulate 入口で項目
// 名指し検証する。cmd／ImageJ の files が前例）に揃え、入口で検証する。
// 当 VM に Rscript は無いため、R の挙動の裁定は一次情報（R 公式
// マニュアル／ヘルプ）で行った。

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
const modelWithFiles = (files) => ({ variables: {}, files });

// ---- RG-370 本体：完結形が演算子そのものを名指す ----
test("RG-370 complete :: / ::: forms name the namespace operator", async () => {
  const cases = [
    ["x <- pkg::fn", /名前空間演算子（::）/],
    ["x <- pkg:::fn", /名前空間演算子（:::）/],
    ["x <- a:::b", /名前空間演算子（:::）/],
    // 連鎖形は最初の :: を名指す。
    ["x <- a::b::c", /名前空間演算子（::）/],
    ["x <- a:::b::c", /名前空間演算子（:::）/],
    // 文字列での名前指定（?:: どおり合法な形）も演算子を名指す。
    ['x <- pkg::"fn"', /名前空間演算子（::）/],
    ['x <- pkg:::"fn"', /名前空間演算子（:::）/],
    ['x <- "pkg"::fn', /名前空間演算子（::）/],
  ];
  for (const [code, re] of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => re.test(e.message) && e.category === "未対応"),
      code + " -> " + JSON.stringify(errs),
    );
    assert.ok(
      !errs.some((e) => /代入の区切りが必要です|が必要ですが必要です/.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("RG-370 namespace operator is named at every expression position", async () => {
  const cases = [
    "print(pkg::fn)", // 引数（::）
    "print(pkg:::fn)", // 引数（:::、旧再現形）
    "x <- pkg::fn(1)", // 関数位置の呼出し形
    "pkg::fn(1)", // 文頭の呼出し形
    "pkg::fn", // 式文
    "if (pkg::fn) { print(1) }", // if 条件
    "while (pkg::fn) { break }", // while 条件
    "for (i in pkg::fn) { print(i) }", // for の対象
    "v <- c(1, 2)\nprint(v[pkg::fn])", // 添字
    "x <- 1 + pkg::fn", // 二項演算子の被演算子
    "x <- a::b$c", // $ との混在（:: が先）
    "x <- a$b::c", // $ との混在（$ が先）
    "x <- ::fn", // 左辺なしの式先頭形
    "x <- :::fn", // 左辺なしの ::: 式先頭形
  ];
  for (const code of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => /名前空間演算子（::/.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
    assert.ok(
      !errs.some((e) =>
        /代入の区切りが必要です|\) が必要です|\] が必要です/.test(e.message),
      ),
      code + " -> " + JSON.stringify(errs),
    );
  }
});

test("RG-370 trailing forms keep the RG-349 naming and $ stays intact", async () => {
  const cases = [
    ["x <- a::", /「::」のあとには名前が必要です/],
    ["x <- a::;", /「::」のあとには名前が必要です/],
    ["print(a::)", /「::」のあとには名前が必要です/],
    ["x <- a:::", /「:::」のあとには名前が必要です/],
    ["x <- pkg:::", /「:::」のあとには名前が必要です/],
    ["x <- a$", /「\$」のあとには名前（列名など）が必要です/],
  ];
  for (const [code, re] of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => re.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
  // $ の完結形と : 連番演算子、文字列中の :: は従来どおり動作する。
  const p = await first(
    'df <- data.frame(x = c(1, 2))\nprint(df$x)\nprint(1:3)\ns <- "a::b"\nprint(s)',
  );
  assert.deepEqual(outputs(p), ["c(1, 2)", "c(1, 2, 3)", '"a::b"']);
});

// ---- RG-372 本体：files の値は入口で項目名指し検証される ----
test("RG-372 non-data.frame file values stop as named model errors", async () => {
  const cases = [
    [42, /モデルfiles\["a\.csv"\]はdata\.frameオブジェクトまたはCSV文字列で指定してください/],
    [[1, 2], /モデルfiles\["a\.csv"\]はdata\.frameオブジェクトまたはCSV文字列で指定してください/],
    [true, /モデルfiles\["a\.csv"\]はdata\.frameオブジェクトまたはCSV文字列で指定してください/],
    [null, /モデルfiles\["a\.csv"\]はdata\.frameオブジェクトまたはCSV文字列で指定してください/],
    // data.frame 似せの不完全オブジェクト群。
    [{}, /モデルfiles\["a\.csv"\]\.kindは"data\.frame"で指定してください/],
    [
      { kind: "other", columns: { x: [1] } },
      /モデルfiles\["a\.csv"\]\.kindは"data\.frame"で指定してください/,
    ],
    [
      { kind: "data.frame" },
      /モデルfiles\["a\.csv"\]\.columnsはオブジェクトで指定してください/,
    ],
    [
      { kind: "data.frame", columns: "x" },
      /モデルfiles\["a\.csv"\]\.columnsはオブジェクトで指定してください/,
    ],
    [
      { kind: "data.frame", columns: [1, 2] },
      /モデルfiles\["a\.csv"\]\.columnsはオブジェクトで指定してください/,
    ],
    [
      { kind: "data.frame", columns: { x: 5 } },
      /モデルfiles\["a\.csv"\]\.columns\["x"\]は配列で指定してください/,
    ],
    [
      { kind: "data.frame", columns: { x: [1] }, rowNames: "r1" },
      /モデルfiles\["a\.csv"\]\.rowNamesは配列で指定してください/,
    ],
  ];
  for (const [value, re] of cases) {
    const r = await run(
      'x <- read.csv("a.csv")\nprint(x)',
      modelWithFiles({ "a.csv": value }),
    );
    assert.ok(r.error, JSON.stringify(value) + " -> " + JSON.stringify(r));
    assert.equal(r.error.category, "モデルエラー");
    assert.match(r.error.message, re);
    assert.deepEqual(r.paths, []);
  }
});

test("RG-372 validation is at the simulate entry, not only on read", async () => {
  // 不正な要素は、そのファイルを読まないコードでも入口で名指される
  // （RG-362 の入口検証の水準どおり）。複数要素では不正な項目が名指される。
  const r = await run(
    "print(1)",
    modelWithFiles({
      "ok.csv": "x\n1\n",
      "bad.csv": 42,
    }),
  );
  assert.ok(r.error, JSON.stringify(r));
  assert.match(r.error.message, /モデルfiles\["bad\.csv"\]/);
});

test("RG-372 valid file shapes are unchanged", async () => {
  // 既定モデル（data.frame オブジェクト）。
  const p1 = await first('df <- read.csv("model.csv")\nprint(df)\nprint(nrow(df))');
  assert.deepEqual(outputs(p1), ["x: c(1, 2, 3)\ny: c(4, 5, 6)", "3"]);
  // CSV 文字列。
  const p2 = await first(
    'df <- read.csv("given.csv")\nprint(df)',
    modelWithFiles({ "given.csv": "a,b\n10,20\n" }),
  );
  assert.deepEqual(outputs(p2), ["a: c(10)\nb: c(20)"]);
  // rowNames・追加フィールドのある data.frame オブジェクトも受理される。
  const p3 = await first(
    'df <- read.csv("m.csv", header = FALSE)\nprint(nrow(df))',
    modelWithFiles({
      "m.csv": {
        kind: "data.frame",
        columns: { x: [1, 2, 3], y: [4, 5, 6] },
        rowNames: ["1", "2", "3"],
        extra: 1,
      },
    }),
  );
  assert.deepEqual(outputs(p3), ["4"]);
  // 空文字列は CSV として入口を通り、read.csv の正直なエラーになる。
  const errs = await errOf(
    'df <- read.csv("e.csv")',
    modelWithFiles({ "e.csv": "" }),
  );
  assert.ok(
    errs.some((e) => /no lines available in input/.test(e.message)),
    JSON.stringify(errs),
  );
  // 未存在ファイルの名指しは不変。
  const errs2 = await errOf('df <- read.csv("nope.csv")');
  assert.ok(
    errs2.some((e) => /モデルにファイルがありません/.test(e.message)),
    JSON.stringify(errs2),
  );
  // cat(file=) で書いたファイルの読み戻し（実行時に作られる文字列）も不変。
  const p4 = await first(
    'cat("x,y\\n1,4\\n", file = "w.csv")\ndf <- read.csv("w.csv")\nprint(df)',
  );
  assert.deepEqual(outputs(p4), ["x: c(1)\ny: c(4)"]);
});

test("RG-372 unimplemented file relatives still stop by name", async () => {
  // R 種で files を消費する関数は read.csv のみ実装され、read.table／
  // read.csv2／write 系／load 等は従来どおり関数名を名指して停止する
  // （入口検証の追加でこの表面は変わらない）。
  const cases = [
    'x <- read.table("model.csv")',
    'x <- read.csv2("model.csv")',
    'x <- load("model.csv")',
    "df <- data.frame(x = c(1))\nwrite.csv(df, \"o.csv\")",
  ];
  for (const code of cases) {
    const errs = await errOf(code);
    assert.ok(
      errs.some((e) => /説明に対応していません/.test(e.message)),
      code + " -> " + JSON.stringify(errs),
    );
  }
});
