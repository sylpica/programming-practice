import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 高度モード B4S・smisc 班（R stats：多変量・クラスタ・その他）。
// 期待値は実 R 4.3.3 の実測出力と R 本体ソース（stats R/fft.R・
// R/ppoints.R・R/mahalanobis.R・R/symnum.R・R/selfStart.R・
// src/library/stats/src/fourier.c）から導いた（報告書
// docs/audit/ADV-B4S-smisc.md に根拠を記録）。

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
// "c(1.23, NA)" や "2.5" の数値列を取り出して許容誤差で比べる。
const numsApprox = async (code, expected, tol = 1e-12, model) => {
  const p = await first(code, model);
  const text = outputs(p)[0];
  const got = [...text.matchAll(/-?\d+\.?\d*(e[+-]?\d+)?/gi)].map((m) =>
    Number(m[0]),
  );
  assert.equal(got.length, expected.length, code + " -> " + text);
  got.forEach((g, i) => {
    const e = expected[i];
    assert.ok(
      Math.abs(g - e) <= tol * Math.max(1, Math.abs(e)),
      `${code} [${i}]: got ${g}, expected ${e}`,
    );
  });
};
// 未対応の実在名は「このR関数は説明に対応していません：<名前>」で
// 名指し停止し、誤った値を返さないことを固定する。
const stopIs = async (code, name) => {
  const errs = await errOf(code);
  assert.ok(
    errs.some((e) => e.message === `このR関数は説明に対応していません：${name}`),
    code + " -> " + JSON.stringify(errs),
  );
};

// ---- convolve ----
test("smisc convolve typical and types", async () => {
  // 公式ヘルプの例（移動平均フィルタ）。FFT の浮動誤差は許容する。
  await numsApprox(
    "print(convolve(c(0, 0, 0, 100, 0, 0, 0), c(0, 0, 1, 2, 1, 0, 0)/4))",
    [50, 25, 0, 0, 0, 0, 25],
    1e-9,
  );
  await numsApprox(
    "print(convolve(c(0, 0, 0, 100, 0, 0, 0), c(0, 0, 1, 2, 1, 0, 0)/4, type = \"open\"))",
    [0, 0, 0, 0, 0, 25, 50, 25, 0, 0, 0, 0, 0],
    1e-9,
  );
  await outIs("print(convolve(1:3, 1:2, type = \"open\"))", ["c(2, 5, 8, 3)"]);
  await outIs("print(convolve(1:3, 1:2, type = \"open\", conj = FALSE))", [
    "c(6, 1, 4, 7)",
  ]);
  await outIs("print(convolve(1:3, 4:6))", ["c(32, 29, 29)"]);
  await outIs("print(convolve(1:5, c(1, 1), type = \"filter\"))", [
    "c(3, 5, 7, 9)",
  ]);
  // type の部分一致と NULL（既定 circular）。
  await outIs("print(convolve(1:3, 4:6, type = \"c\"))", ["c(32, 29, 29)"]);
  await outIs("print(convolve(1:3, 4:6, type = NULL))", ["c(32, 29, 29)"]);
  // filter の切り出し境界（n1 = 0 のとき両端1個ずつ除去される実 R の挙動）。
  await outIs("print(convolve(1:3, 5, type = \"filter\"))", ["c(10)"]);
  await outIs("print(convolve(c(3, 4), 2, type = \"filter\"))", ["c()"]);
  // 名前の伝播（y 側のみ名前付きでも伝わる）。
  await outIs("print(convolve(1:2, c(a = 1, b = 1)))", ["c(a = 3, b = 3)"]);
});

test("smisc convolve errors and propagation", async () => {
  await errMatch("convolve(1:3, 1:2)", /length mismatch in convolution/);
  await errMatch("convolve(numeric(0), 1, type = \"open\")", /invalid 'times' value/);
  await errMatch("convolve(\"a\", 1)", /non-numeric argument/);
  await errMatch("convolve(1:3, 4:6, type = \"x\")", /'arg' should be one of/);
  await errMatch(
    "convolve(1:3, 4:6, type = c(\"open\", \"filter\"))",
    /'arg' must be of length 1/,
  );
  await errMatch("convolve(1:3, 4:6, type = NA)", /'arg' must be NULL or a character vector/);
  await errMatch("convolve(1, 2, z = 3)", /unused argument/);
  // NA は全要素へ伝播し、NaN は全要素を NaN にする（FFT の伝播）。
  await outIs("print(convolve(c(1, NA), c(1, 1), type = \"open\"))", [
    "c(NA, NA, NA)",
  ]);
  await outIs("print(convolve(c(1, NaN), c(1, 1)))", ["c(NaN, NaN)"]);
  // 論理値入力は実 R では複素数を返すため名指し停止する。
  await errMatch("convolve(TRUE, 1)", /複素数を返すため説明に対応していません/);
});

// ---- ppoints ----
test("smisc ppoints", async () => {
  await numsApprox("print(ppoints(4))", [
    0.14705882352941177, 0.38235294117647056, 0.61764705882352944,
    0.8529411764705882,
  ]);
  await numsApprox("print(ppoints(10))", [
    0.06097560975609756, 0.15853658536585366, 0.25609756097560976,
    0.35365853658536583, 0.45121951219512196, 0.5487804878048781,
    0.6463414634146342, 0.7439024390243902, 0.8414634146341463,
    0.9390243902439024,
  ]);
  // 個数11で a の既定が 1/2 に切り替わる。
  await numsApprox("print(ppoints(11))", [
    0.045454545454545456, 0.13636363636363635, 0.22727272727272727,
    0.3181818181818182, 0.4090909090909091, 0.5, 0.5909090909090909,
    0.6818181818181818, 0.7727272727272727, 0.8636363636363636,
    0.9545454545454546,
  ]);
  await outIs("print(ppoints(1))", ["c(0.5)"]);
  await outIs("print(ppoints(0))", ["c()"]);
  await outIs("print(ppoints(-3))", ["c()"]);
  // ベクトル n はその長さが個数になる。
  await numsApprox("print(ppoints(1:4))", [
    0.14705882352941177, 0.38235294117647056, 0.61764705882352944,
    0.8529411764705882,
  ]);
  // 非整数 n：列は 1:floor(n)、分母は n そのものを使う。
  await numsApprox("print(ppoints(4.5))", [
    0.13157894736842105, 0.34210526315789475, 0.5526315789473685,
    0.7631578947368421,
  ]);
  await numsApprox("print(ppoints(0.5))", [0.8333333333333334]);
  // a のリサイクル（分子・分母で別々に評価され警告が2回出る）。
  await numsApprox("print(ppoints(3, a = c(0, 0.5)))", [0.25, 0.5, 0.75]);
  await warnHas("ppoints(3, a = c(0, 0.5))", /longer object length/);
  await outIs("print(ppoints(3, a = numeric(0)))", ["c()"]);
});

test("smisc ppoints errors", async () => {
  await errMatch("ppoints(NA)", /missing value where TRUE\/FALSE needed/);
  await errMatch("ppoints(numeric(0))", /argument is of length zero/);
  await errMatch("ppoints(NULL)", /argument is of length zero/);
  await errMatch("ppoints(\"a\")", /NA\/NaN argument/);
  await errMatch("ppoints(3, a = \"a\")", /non-numeric argument to binary operator/);
});

// ---- nextn ----
test("smisc nextn", async () => {
  await outIs("print(nextn(1001))", ["c(1024)"]);
  await outIs("print(nextn(c(1, 7, 100)))", ["c(1, 8, 100)"]);
  await outIs("print(nextn(100, factors = 2))", ["c(128)"]);
  await outIs("print(nextn(100, factors = c(2, 3)))", ["c(108)"]);
  await outIs("print(nextn(100, factors = 4))", ["c(256)"]);
  // factors の順序どおりに割り切るため、非互素では最小にならない。
  await outIs("print(nextn(91, c(2, 6)))", ["c(128)"]);
  await outIs("print(nextn(96, c(6, 2)))", ["c(96)"]);
  await outIs("print(nextn(96, c(2, 3)))", ["c(96)"]);
  // 小さい n は整数へ切り捨ててから探索する。
  await outIs("print(nextn(8.1))", ["c(8)"]);
  await outIs("print(nextn(100.5))", ["c(100)"]);
  await outIs("print(nextn(7.9))", ["c(8)"]);
  await outIs("print(nextn(0))", ["c(1)"]);
  await outIs("print(nextn(-5))", ["c(1)"]);
  // 文字列の factors は数値へ変換されて受理される。
  await outIs("print(nextn(5, factors = \"2\"))", ["c(8)"]);
  await outIs("print(nextn(2.9, factors = 2.9))", ["c(2)"]);
  // ベクトル中の NA は NA を返す。
  await outIs("print(nextn(c(NA, 5)))", ["c(NA, 5)"]);
});

test("smisc nextn errors", async () => {
  await errMatch("nextn(NA)", /'n' must have typeof/);
  await errMatch("nextn(\"5\")", /'n' must have typeof/);
  await errMatch("nextn(TRUE)", /'n' must have typeof/);
  await errMatch("nextn(5, factors = numeric(0))", /no factors/);
  await errMatch("nextn(5, factors = 1)", /invalid factors/);
  await errMatch("nextn(5, factors = NA)", /invalid factors/);
  // 実 R 自体が終了しない入力は名指し停止する。
  await errMatch("nextn(Inf)", /実 R でも終了しないため説明に対応していません/);
});

// ---- mahalanobis ----
test("smisc mahalanobis", async () => {
  const idf = "data.frame(a = c(1, 0), b = c(0, 1))";
  await numsApprox(`print(mahalanobis(c(0, 0), c(1, 2), ${idf}))`, [5]);
  // 複数行の x（データフレーム）。
  await numsApprox(
    `print(mahalanobis(data.frame(a = c(0, 3), b = c(0, 4)), c(0, 0), ${idf}))`,
    [0, 25],
  );
  // center = FALSE でセンタリング省略。
  await numsApprox(`print(mahalanobis(c(3, 4), FALSE, ${idf}))`, [25]);
  // inverted = TRUE（cov は逆行列として渡す）。
  await numsApprox(
    "print(mahalanobis(c(1, 1), c(0, 0), data.frame(a = c(0.5, 0), b = c(0, 0.25)), inverted = TRUE))",
    [0.75],
  );
  // center のリサイクル。
  await numsApprox(`print(mahalanobis(c(1, 2), 1, ${idf}))`, [1]);
  // NA の行は NA。
  await outIs(`print(mahalanobis(c(NA, 1), c(0, 0), ${idf}))`, ["c(NA)"]);
  // cov に NA があると全行 NA。
  await outIs(
    "print(mahalanobis(c(1, 1), c(0, 0), data.frame(a = c(NA, 0), b = c(0, 1))))",
    ["c(NA)"],
  );
  // tol = 0 では計算特異でも値が返る（... の名前付き引数）。
  await numsApprox(
    "print(mahalanobis(c(0, 0), c(0, 0), data.frame(a = c(1, 0), b = c(0, 1e-18)), tol = 0))",
    [0],
  );
  // x が明示 rownames を持つ data.frame のとき結果へ名前が付く。
  await outIs(
    `print(mahalanobis(data.frame(a = c(0, 3), b = c(0, 4), row.names = c("p", "q")), c(0, 0), ${idf}))`,
    ["c(p = 0, q = 25)"],
  );
});

test("smisc mahalanobis errors", async () => {
  const idf = "data.frame(a = c(1, 0), b = c(0, 1))";
  // ベクトル x は1行の観測であり、長さ不一致は次元不整合。
  await errMatch("mahalanobis(c(1, 2, 3), 0, 1)", /non-conformable arguments/);
  await errMatch(
    "mahalanobis(c(1, 2), c(0, 0), c(1, 2))",
    /'a' \(2 x 1\) must be square/,
  );
  await errMatch(
    "mahalanobis(c(1, 2), c(0, 0), data.frame(a = 1:2, b = 1:2, c = 1:2))",
    /'a' \(2 x 3\) must be square/,
  );
  await errMatch("mahalanobis(c(1, 2), c(0, 0), \"a\")", /'a' must be a numeric matrix/);
  await errMatch(
    "mahalanobis(c(1, 1), c(0, 0), data.frame(a = c(1, 2), b = c(2, 4)))",
    /exactly singular/,
  );
  await errMatch(
    "mahalanobis(c(0, 0), c(0, 0), data.frame(a = c(1, 0), b = c(0, 1e-18)))",
    /computationally singular: reciprocal condition number = 1e-18/,
  );
  // ... への位置引数は名指し停止する。
  // 4番目の位置引数は inverted に束縛される（実 R どおり値が返る）。
  await numsApprox(`print(mahalanobis(c(1, 2), c(0, 0), ${idf}, 5))`, [5]);
  // 5番目以降の位置引数は ...（solve の b）であり名指し停止する
  // （実 R では solve の次元エラーになる経路の意図的な安全側の相違）。
  await errMatch(
    `mahalanobis(c(1, 2), c(0, 0), ${idf}, FALSE, 5)`,
    /位置引数.*説明に対応していません/,
  );
});

// ---- symnum ----
test("smisc symnum", async () => {
  // 公式ヘルプの相関行列の例（corr の既定経路）。
  await outIs("print(symnum(c(0, 0.1, 0.35, 0.7, 0.85, 0.92, 0.97, 1)))", [
    "c(\" \", \" \", \".\", \",\", \"+\", \"*\", \"B\", \"1\")",
  ]);
  await outIs("print(symnum(c(0.1, 0.5, 0.99)))", ["c(\" \", \".\", \"B\")"]);
  // p 値の星印（公式ヘルプの例）。
  await outIs(
    "print(symnum(c(0.0001, 0.005, 0.03, 0.2, 0.9), cutpoints = c(0, 0.001, 0.01, 0.05, 0.1, 1), symbols = c(\"***\", \"**\", \"*\", \".\", \" \")))",
    ["c(\"***\", \"**\", \"*\", \" \", \" \")"],
  );
  // 名前は保持される（setNames はこのシミュレータ未実装のため
  // 名前付き c() で作る。期待値は実 R の setNames(0:8, 0:8) の例からの抜粋）。
  await outIs(
    "print(symnum(c(a = 0, b = 2, c = 4, d = 6, e = 8), cutpoints = 2 * (0:4), symbols = c(\".\", \"-\", \"+\", \"$\")))",
    ["c(a = \".\", b = \".\", c = \"-\", d = \"+\", e = \"$\")"],
  );
  // 論理値経路。
  await outIs("print(symnum(c(TRUE, FALSE, NA)))", ["c(\"|\", \".\", \"?\")"]);
  // NA は na の文字列になる。
  await outIs("print(symnum(c(NA, 0.5)))", ["c(\"?\", \".\")"]);
  await outIs("print(symnum(NA, na = \"\"))", ["c(\"\")"]);
  // show.max = FALSE でも NULL でないため format(maxc) が使われる
  // （実 R の symnum.R の分岐どおりで、"B" にはならない）。
  await outIs("print(symnum(1, show.max = FALSE))", ["c(\"1\")"]);
  await outIs("print(symnum(-1))", ["c(\"1\")"]);
});

test("smisc symnum errors", async () => {
  await errMatch("symnum(2)", /'x' must be between -1 and 1/);
  await errMatch(
    "symnum(0.5, cutpoints = c(0.5, 0.5))",
    /'cutpoints' must be unique/,
  );
  await errMatch(
    "symnum(0.5, symbols = c(\"a\", \"a\", \"b\", \"c\", \"d\", \"e\"))",
    /'symbols' must be unique/,
  );
  // corr = FALSE を明示すると既定の個数が合わず実 R どおりエラーになる。
  await errMatch("symnum(0.5, corr = FALSE)", /number of 'cutpoints'/);
  await errMatch(
    "symnum(c(TRUE, FALSE), symbols = c(\"a\", \"b\", \"c\"))",
    /must have 2 'symbols' for logical 'x' argument/,
  );
  // 行列・データフレームへの適用は名指し停止する。
  await errMatch(
    "symnum(data.frame(a = 1))",
    /データフレーム（行列・配列）に対応していません/,
  );
});

// ---- sortedXyData ----
test("smisc sortedXyData", async () => {
  await outIs("print(sortedXyData(c(2, 1, 2), c(4, 3, 5))$x)", ["c(1, 2)"]);
  await outIs("print(sortedXyData(c(2, 1, 2), c(4, 3, 5))$y)", ["c(3, 4.5)"]);
  // NA の y を含むグループは行ごと消える。
  await outIs("print(sortedXyData(c(2, 1, 2), c(4, NA, 5))$x)", ["c(2)"]);
  await outIs("print(sortedXyData(c(2, 1, 2), c(4, NA, 5))$y)", ["c(4.5)"]);
  // data 引数は数値形式では無視される。
  await outIs("print(sortedXyData(c(2, 1), c(4, 3), data = 99)$y)", ["c(3, 4)"]);
  // 文字列は数値化され、変換できない要素は NA として落ちる。
  await warnHas(
    "sortedXyData(c(\"a\", \"2\"), c(3, 4))",
    /NAs introduced by coercion/,
  );
  await outIs("print(sortedXyData(c(\"1\", \"2\"), c(3, 4))$x)", ["c(1, 2)"]);
});

test("smisc sortedXyData errors", async () => {
  await errMatch(
    "sortedXyData(1:3, 1:2)",
    /arguments must have same length/,
  );
  // 式（文字列）形式は名指し停止する。
  await errMatch(
    "sortedXyData(\"y ~ x\", \"y\", data.frame(x = 1))",
    /文字列（式）形式は説明に対応していません/,
  );
});

// ---- 未対応（名指し停止） ----
test("smisc unsupported: multivariate models and objects", async () => {
  await stopIs("Pair(1:3, 1:3)", "Pair");
  await stopIs("estVar(1)", "estVar");
  await stopIs("SSD(1)", "SSD");
  await stopIs("factanal(1, 2)", "factanal");
  await stopIs("cancor(1, 2)", "cancor");
  await stopIs("cmdscale(1)", "cmdscale");
  await stopIs("loglin(1, 1)", "loglin");
  await stopIs("medpolish(1)", "medpolish");
  await stopIs("ppr(1)", "ppr");
  await stopIs("preplot(1)", "preplot");
  await stopIs("prcomp(1)", "prcomp");
  await stopIs("princomp(1)", "princomp");
  await stopIs("kmeans(1, 2)", "kmeans");
  await stopIs("varimax(1)", "varimax");
  await stopIs("promax(1)", "promax");
  await stopIs("loadings(1)", "loadings");
  await stopIs("C(1, \"treatment\")", "C");
  await stopIs("factor.scope(1, 2)", "factor.scope");
  await stopIs("add.scope(1, 2)", "add.scope");
  await stopIs("drop.scope(1)", "drop.scope");
});

test("smisc unsupported: clustering, dist, matrices, fft", async () => {
  await stopIs("dist(1)", "dist");
  await stopIs("as.dist(1)", "as.dist");
  await stopIs("as.matrix.dist(1)", "as.matrix.dist");
  await stopIs("format.dist(1)", "format.dist");
  await stopIs("labels.dist(1)", "labels.dist");
  await stopIs("print.dist(1)", "print.dist");
  await stopIs("hclust(1)", "hclust");
  await stopIs("as.hclust(1)", "as.hclust");
  await stopIs("cophenetic(1)", "cophenetic");
  await stopIs("cutree(1, 2)", "cutree");
  await stopIs("toeplitz(1:5)", "toeplitz");
  await stopIs("toeplitz2(1:5)", "toeplitz2");
  await stopIs("fft(1:4)", "fft");
  await stopIs("mvfft(1)", "mvfft");
});

test("smisc unsupported: dendrogram family", async () => {
  await stopIs("as.dendrogram(1)", "as.dendrogram");
  await stopIs("as.hclust.dendrogram(1)", "as.hclust.dendrogram");
  await stopIs("cut.dendrogram(1, 1)", "cut.dendrogram");
  await stopIs("is.leaf(1)", "is.leaf");
  await stopIs("merge.dendrogram(1, 2)", "merge.dendrogram");
  await stopIs("nobs.dendrogram(1)", "nobs.dendrogram");
  await stopIs("print.dendrogram(1)", "print.dendrogram");
  await stopIs("rev.dendrogram(1)", "rev.dendrogram");
  await stopIs("str.dendrogram(1)", "str.dendrogram");
  await stopIs("labels.dendrogram(1)", "labels.dendrogram");
  await stopIs("order.dendrogram(1)", "order.dendrogram");
  await stopIs("reorder.dendrogram(1, 1)", "reorder.dendrogram");
  await stopIs("dendrapply(1, 2)", "dendrapply");
});

test("smisc unsupported: S3 methods and graphics", async () => {
  await stopIs("summary.princomp(1)", "summary.princomp");
  await stopIs("print.summary.princomp(1)", "print.summary.princomp");
  await stopIs("summary.prcomp(1)", "summary.prcomp");
  await stopIs("print.summary.prcomp(1)", "print.summary.prcomp");
  await stopIs("print.prcomp(1)", "print.prcomp");
  await stopIs("print.princomp(1)", "print.princomp");
  await stopIs("predict.prcomp(1)", "predict.prcomp");
  await stopIs("predict.princomp(1)", "predict.princomp");
  await stopIs("fitted.kmeans(1)", "fitted.kmeans");
  await stopIs("print.kmeans(1)", "print.kmeans");
  await stopIs("print.hclust(1)", "print.hclust");
  await stopIs("print.loadings(1)", "print.loadings");
  await stopIs("print.ts(1)", "print.ts");
  // .preformat.ts は先頭が "." のため、このシミュレータのパーサが
  // 呼び出し式として解釈できず構文エラーになる（誤った値は返らない）。
  await errMatch(".preformat.ts(1)", /式を解釈できません/);
  await stopIs("biplot(1)", "biplot");
  await stopIs("biplot.princomp(1)", "biplot.princomp");
  await stopIs("plot.dendrogram(1)", "plot.dendrogram");
  await stopIs("plot.hclust(1)", "plot.hclust");
  await stopIs("plot.lm(1)", "plot.lm");
  await stopIs("plot.ppr(1)", "plot.ppr");
  await stopIs("plot.spec(1)", "plot.spec");
  await stopIs("plot.spec.coherency(1)", "plot.spec.coherency");
  await stopIs("plot.prcomp(1)", "plot.prcomp");
  await stopIs("plot.princomp(1)", "plot.princomp");
  await stopIs("heatmap(1)", "heatmap");
  await stopIs("identify.hclust(1)", "identify.hclust");
  await stopIs("interaction.plot(1, 2, 3)", "interaction.plot");
  await stopIs("qqnorm(1)", "qqnorm");
  await stopIs("qqline(1)", "qqline");
  await stopIs("qqplot(1, 2)", "qqplot");
  await stopIs("rect.hclust(1)", "rect.hclust");
  await stopIs("screeplot(1)", "screeplot");
});
