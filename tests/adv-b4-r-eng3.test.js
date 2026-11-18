import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 高度モード B4・R実装班3（データ・型・適用）。
// 期待値は公式ヘルプ（stat.ethz.ch R-manual）の Examples と実 R 4.3.3 の
// 実測出力から導いた（報告書 docs/audit/ADV-B4-r-eng3.md に根拠を記録）。
// 注：.colSums 等ドット始まり名は共有パーサが識別子として受理しないため
// 到達不能（報告書の申し送り参照）。ハンドラは登録済みだが本テストでは
// 呼び出し形を検証できない。

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
const DF = "df <- data.frame(x = c(1, 2), y = c(3, 4))\n";

// ---- 型判定・型情報 ----
test("eng3 typeof/mode/storage.mode/class", async () => {
  await outIs('print(typeof(c(1, 2)))', ['"double"']);
  await outIs('print(typeof(1))', ['"double"']);
  await outIs('print(typeof("a"))', ['"character"']);
  await outIs('print(typeof(TRUE))', ['"logical"']);
  await outIs('print(typeof(NA))', ['"logical"']);
  await outIs('print(typeof(NULL))', ['"NULL"']);
  await outIs(DF + 'print(typeof(df))', ['"list"']);
  await outIs('print(mode(c(1, 2)))', ['"numeric"']);
  await outIs('print(mode("a"))', ['"character"']);
  await outIs('print(storage.mode(c(1, 2)))', ['"double"']);
  await outIs(DF + 'print(storage.mode(df))', ['"list"']);
  await outIs(DF + 'print(class(df))', ['"data.frame"']);
  await outIs('print(class(c(1, 2)))', ['"numeric"']);
  await outIs('print(class("a"))', ['"character"']);
  await outIs('print(class(NULL))', ['"NULL"']);
  await errMatch('print(typeof())', /argument "x" is missing/);
  await errMatch('print(typeof(1, 2))', /unused argument/);
});
test("eng3 is.* predicates incl. data.frame boundaries", async () => {
  await outIs('print(is.numeric(c(1, 2)))', ["TRUE"]);
  await outIs('print(is.numeric("a"))', ["FALSE"]);
  await outIs(DF + 'print(is.numeric(df))', ["FALSE"]);
  await outIs('print(is.numeric(NA))', ["FALSE"]);
  await outIs('print(is.double(c(1.5)))', ["TRUE"]);
  // モデルに integer 型は無い（基礎層宣言どおり）。実 R の 1:3 は integer
  // だが、本モデルでは全て double として表す（報告書の型対応表）。
  await outIs('print(is.integer(c(1, 2)))', ["FALSE"]);
  await outIs('print(is.character(c("a", "b")))', ["TRUE"]);
  await outIs('print(is.logical(c(TRUE, NA)))', ["TRUE"]);
  await outIs(DF + 'print(is.list(df))', ["TRUE"]); // 実 R の規則
  await outIs('print(is.list(c(1, 2)))', ["FALSE"]);
  await outIs('print(is.list(NULL))', ["FALSE"]);
  await outIs(DF + 'print(is.data.frame(df))', ["TRUE"]);
  await outIs('print(is.data.frame(c(1, 2)))', ["FALSE"]);
  await outIs('print(is.vector(c(1, 2)))', ["TRUE"]);
  await outIs(DF + 'print(is.vector(df))', ["FALSE"]);
  await outIs('print(is.vector(NULL))', ["FALSE"]);
  await outIs('print(is.atomic(NULL))', ["TRUE"]); // 実 R 4.3.3 実測
  await outIs(DF + 'print(is.atomic(df))', ["FALSE"]);
  await outIs(DF + 'print(is.recursive(df))', ["TRUE"]);
  await outIs('print(is.recursive(c(1, 2)))', ["FALSE"]);
  await outIs('print(is.recursive(NULL))', ["FALSE"]);
  await outIs('print(is.null(NULL))', ["TRUE"]);
  await outIs('print(is.null(c(1)))', ["FALSE"]);
  await outIs(DF + 'print(is.array(df))', ["FALSE"]);
  await outIs(DF + 'print(is.matrix(df))', ["FALSE"]);
  await outIs('print(is.factor(c(1, 2)))', ["FALSE"]);
  await outIs('print(is.ordered(c(1, 2)))', ["FALSE"]);
});

// ---- 型変換・コンストラクタ ----
test("eng3 constructors and vector()", async () => {
  await outIs('print(numeric(3))', ["c(0, 0, 0)"]);
  await outIs('print(numeric())', ["c()"]);
  await outIs('print(double(2))', ["c(0, 0)"]);
  await outIs('print(integer(2))', ["c(0, 0)"]);
  await outIs('print(character(2))', ['c("", "")']);
  await outIs('print(logical(2))', ["c(FALSE, FALSE)"]);
  await outIs('print(vector("character", 2))', ['c("", "")']);
  await outIs('print(vector("numeric", 1))', ["c(0)"]);
  await outIs('print(vector())', ["c()"]);
  await errMatch('print(numeric(-1))', /invalid 'length' argument/);
  await errMatch('print(vector("foo"))', /cannot make a vector of mode/);
  await errMatch('print(vector("list", 2))', /未対応/);
});
test("eng3 as.double/as.integer/as.logical/as.null/as.vector/strtoi", async () => {
  await outIs('print(as.double(c("1.5", "x")))', ["c(1.5, NA)"]);
  await outIs('print(as.double(c(TRUE, FALSE)))', ["c(1, 0)"]);
  await outIs('print(as.double())', ["c()"]);
  await errMatch(DF + 'print(as.double(df))', /'list' object cannot be coerced to type 'double'/);
  await outIs('print(as.integer(c(1.9, -1.9, 3)))', ["c(1, -1, 3)"]);
  await outIs('print(as.integer(c("1.9", " 42 ")))', ["c(1, 42)"]);
  await outIs('print(as.integer(NaN))', ["c(NA)"]);
  await outIs('print(as.integer(1e10))', ["c(NA)"]);
  await warnHas('print(as.integer(1e10))', /coercion to integer range/);
  await outIs('print(as.logical(c(0, 2, NA)))', ["c(FALSE, TRUE, NA)"]);
  await outIs('print(as.logical(c("TRUE", "false", "T", "a", "1")))', ["c(TRUE, FALSE, TRUE, NA, NA)"]);
  await outIs('print(as.null(c(1, 2)))', ["NULL"]);
  await outIs('print(as.vector(c(a = 1, b = 2)))', ["c(1, 2)"]); // 名前は除去
  await outIs('print(as.vector(1:3, "character"))', ['c("1", "2", "3")']);
  await errMatch(DF + 'print(as.vector(df))', /未対応/);
  await outIs('print(strtoi(c("0x10", "010", "42", "zz")))', ["c(16, 8, 42, NA)"]);
  await outIs('print(strtoi("ff", 16))', ["c(255)"]);
  await outIs('print(strtoi(c("-12", NA)))', ["c(-12, NA)"]);
});

// ---- ベクトル・データフレーム操作 ----
test("eng3 append/lengths/NROW/NCOL/dim/colnames/rownames", async () => {
  await outIs('print(append(1:5, 0:1, after = 3))', ["c(1, 2, 3, 0, 1, 4, 5)"]);
  await outIs('print(append(1:3, 99, after = 0))', ["c(99, 1, 2, 3)"]);
  await outIs('print(append(c(a = 1, b = 2), 9, after = 1))', ["c(a = 1, 9, b = 2)"]);
  await outIs('print(append(NULL, 1))', ["c(1)"]);
  await outIs(DF + 'print(lengths(df))', ["c(x = 2, y = 2)"]);
  await outIs('print(lengths(c(1, 2, 3)))', ["c(1, 1, 1)"]); // 実測
  await outIs('print(lengths(NULL))', ["c()"]);
  await outIs(DF + 'print(NROW(df))', ["2"]);
  await outIs('print(NROW(c(1, 2, 3)))', ["3"]);
  await outIs('print(NROW(NULL))', ["0"]);
  await outIs(DF + 'print(NCOL(df))', ["2"]);
  await outIs('print(NCOL(c(1, 2)))', ["1"]);
  await outIs('print(NCOL(NULL))', ["0"]);
  await outIs(DF + 'print(dim(df))', ["c(2, 2)"]);
  await outIs('print(dim(c(1, 2)))', ["NULL"]);
  await outIs('print(dim(NULL))', ["NULL"]);
  await outIs(DF + 'print(colnames(df))', ['c("x", "y")']);
  await outIs(DF + 'print(rownames(df))', ['c("1", "2")']);
  await outIs('print(colnames(c(1, 2)))', ["NULL"]);
  await outIs('print(rownames(c(1, 2)))', ["NULL"]);
});
test("eng3 getElement/drop/identity/levels/ifelse/is.unsorted", async () => {
  await outIs(DF + 'print(getElement(df, "x"))', ["c(1, 2)"]);
  await outIs(DF + 'print(getElement(df, "zz"))', ["NULL"]); // 実測
  await outIs('print(getElement(c(a = 5), "a"))', ["5"]);
  await errMatch('print(getElement(c(a = 5), "b"))', /subscript out of bounds/);
  await outIs('print(drop(c(1, 2, 3)))', ["c(1, 2, 3)"]);
  await outIs(DF + 'print(drop(df))', ["x: c(1, 2)\ny: c(3, 4)"]);
  await outIs('print(identity(c(1, NA)))', ["c(1, NA)"]);
  await outIs('print(levels(c(1, 2)))', ["NULL"]);
  await outIs('print(ifelse(c(TRUE, FALSE, NA), 1:3, 10:12))', ["c(1, 11, NA)"]);
  await outIs('print(ifelse(c(a = TRUE, b = FALSE), 1:2, 3:4))', ["c(a = 1, b = 4)"]);
  await outIs('print(ifelse(c(TRUE, FALSE), "y", "n"))', ['c("y", "n")']);
  await outIs('print(is.unsorted(c(1, 3, 2)))', ["TRUE"]);
  await outIs('print(is.unsorted(c(1, 2, 2)))', ["FALSE"]);
  await outIs('print(is.unsorted(c(1, 2, 2), strictly = TRUE))', ["TRUE"]);
  await outIs('print(is.unsorted(c(1, NA, 2)))', ["NA"]);
  await outIs('print(is.unsorted(c(1, NA, 2), na.rm = TRUE))', ["FALSE"]);
});
test("eng3 cbind/rbind data.frame forms and named stops", async () => {
  await outIs(
    DF + 'print(cbind(df, data.frame(z = c(9, 10))))',
    ["x: c(1, 2)\ny: c(3, 4)\nz: c(9, 10)"],
  );
  await outIs(
    DF + 'print(cbind(df, w = c(10, 11)))',
    ["x: c(1, 2)\ny: c(3, 4)\nw: c(10, 11)"],
  );
  await outIs(
    DF + 'print(cbind(df, 10:11))', // 列名は deparse の "10:11"
    ["x: c(1, 2)\ny: c(3, 4)\n10:11: c(10, 11)"],
  );
  await errMatch('print(cbind(1:3, 4:6))', /行列を返すため未対応/);
  await errMatch(
    DF + 'print(cbind(df, data.frame(z = 1:3)))',
    /arguments imply differing number of rows/,
  );
  await outIs(
    'print(rbind(data.frame(x = 1:2, y = 3:4), data.frame(y = 5:6, x = 7:8)))',
    ["x: c(1, 2, 7, 8)\ny: c(3, 4, 5, 6)"], // 名前で照合される
  );
  await errMatch(
    'print(rbind(data.frame(x = 1), data.frame(z = 1)))',
    /numbers of columns of arguments do not match/,
  );
  await errMatch('print(rbind(1:3, 4:6))', /行列を返すため未対応/);
});
test("eng3 merge", async () => {
  await outIs(
    'print(merge(data.frame(id = 1:2, a = c("x", "y")), data.frame(id = 1:2, b = c(10, 20))))',
    ['id: c(1, 2)\na: c("x", "y")\nb: c(10, 20)'],
  );
  // 一致しない行は落ちる（内部結合）
  await outIs(
    'print(merge(data.frame(id = c(1, 2), a = c("x", "y")), data.frame(id = c(2, 3), b = c(10, 20))))',
    ['id: c(2)\na: c("y")\nb: c(10)'],
  );
  // NA キーは NA に一致する（実測）
  await outIs(
    'print(merge(data.frame(id = c(1, NA), a = 1:2), data.frame(id = c(1, NA), b = 3:4)))',
    ["id: c(1, NA)\na: c(1, 2)\nb: c(3, 4)"],
  );
  // all.x と sort（実測：id 昇順に整列。id=1 は a=2,b=3／id=2 は a=1,b=4）
  await outIs(
    'print(merge(data.frame(id = c(2, 1), a = 1:2), data.frame(id = c(1, 2), b = 3:4), all.x = TRUE))',
    ["id: c(1, 2)\na: c(2, 1)\nb: c(3, 4)"],
  );
  // 非 by 列の同名は .x/.y サフィックス
  await outIs(
    'print(merge(data.frame(id = 1, v = 5), data.frame(id = 1, v = 7), by = "id"))',
    ["id: c(1)\nv.x: c(5)\nv.y: c(7)"],
  );
  await errMatch(
    'print(merge(data.frame(a = 1), data.frame(b = 2), by = "zz"))',
    /'by' must specify a uniquely valid column/,
  );
});
test("eng3 expand.grid", async () => {
  await outIs(
    'print(expand.grid(a = 1:2, b = 3:4))',
    ["a: c(1, 2, 1, 2)\nb: c(3, 3, 4, 4)"], // 第1引数が最速で変わる
  );
  await outIs(
    'print(expand.grid(a = 1:2, b = c("x", "y"), stringsAsFactors = FALSE))',
    ['a: c(1, 2, 1, 2)\nb: c("x", "x", "y", "y")'],
  );
  await errMatch(
    'print(expand.grid(a = 1:2, b = c("x", "y")))',
    /因子になるため未対応/,
  );
});
test("eng3 colSums/rowSums/colMeans/rowMeans on data frames", async () => {
  await outIs(DF + 'print(colSums(df))', ["c(x = 3, y = 7)"]);
  await outIs(DF + 'print(rowSums(df))', ["c(1 = 4, 2 = 6)"]);
  await outIs(DF + 'print(colMeans(df))', ["c(x = 1.5, y = 3.5)"]);
  await outIs(DF + 'print(rowMeans(df))', ["c(1 = 2, 2 = 3)"]);
  await outIs(
    'print(colSums(data.frame(x = c(1, NA), y = c(3, 4)), na.rm = TRUE))',
    ["c(x = 1, y = 7)"],
  );
  await outIs(
    'print(colSums(data.frame(x = c(1, NA))))',
    ["c(x = NA)"],
  );
  await errMatch('print(colSums(1:3))', /'x' must be an array of at least two dimensions/);
  await errMatch(
    'print(colSums(data.frame(x = 1:2, s = c("a", "b"))))',
    /'x' must be numeric/,
  );
});
test("eng3 sweep and scale", async () => {
  await outIs(
    DF + 'print(sweep(df, 2, c(100, 200), "-"))',
    ["x: c(-99, -98)\ny: c(-197, -196)"],
  );
  await outIs(
    DF + 'print(sweep(df, 1, c(10, 20), "+"))',
    ["x: c(11, 22)\ny: c(13, 24)"],
  );
  await outIs(
    DF + 'print(sweep(df, 2, 5, "*"))',
    ["x: c(5, 10)\ny: c(15, 20)"],
  );
  await errMatch('print(sweep(1:3, 1, 10, "-"))', /次元がないため未対応/);
  await errMatch(DF + 'print(sweep(df, 2, 5, "sum"))', /四則演算子の文字列/);
  await outIs('print(scale(c(2, 4, 6)))', ["c(-1, 0, 1)"]); // 実測
  await outIs('print(scale(c(3, 4), center = FALSE))', ["c(0.6, 0.8)"]); // 実測
  await outIs('print(scale(5))', ["c(NaN)"]); // 実測
  await errMatch('print(scale("a"))', /'x' must be numeric/);
  await outIs(
    'print(scale(data.frame(x = c(2, 4, 6))))',
    ["x: c(-1, 0, 1)"], // 値の部分集合（実 R は行列を返す。報告書参照）
  );
});
test("eng3 rowsum/tabulate/proportions/unlist", async () => {
  await outIs('print(rowsum(c(10, 20, 30), c("b", "a", "b")))', ["c(a = 20, b = 40)"]);
  await outIs('print(rowsum(c(10, 20, 30), c("b", "a", "b"), reorder = FALSE))', ["c(b = 40, a = 20)"]);
  await warnHas('print(rowsum(c(1, 2, 3), c("a", NA, "a")))', /missing values for 'group'/);
  await outIs('print(tabulate(c(1, 2, 2, 5), 5))', ["c(1, 2, 0, 0, 1)"]);
  await outIs('print(tabulate(c(0, 1, NA, 7), 3))', ["c(1, 0, 0)"]); // 実測
  await outIs('print(tabulate(c(3, 1)))', ["c(1, 0, 1)"]);
  await outIs('print(proportions(c(1, 3)))', ["c(0.25, 0.75)"]);
  await outIs('print(prop.table(c(a = 1, b = 3)))', ["c(a = 0.25, b = 0.75)"]);
  await outIs(DF + 'print(unlist(df))', ["c(x1 = 1, x2 = 2, y1 = 3, y2 = 4)"]); // 実測の名前
  await outIs('print(unlist(c(a = 1, b = 2)))', ["c(a = 1, b = 2)"]);
  await outIs('print(unlist(NULL))', ["NULL"]);
});

// ---- 適用・グループ化 ----
test("eng3 tapply with string FUN", async () => {
  await outIs(
    'print(tapply(c(10, 20, 30, 40), c("b", "a", "b", "a"), "sum"))',
    ["c(a = 60, b = 40)"],
  );
  await outIs(
    'print(tapply(c(1, 2, 3), c("a", NA, "a"), "sum"))',
    ["c(a = 4)"], // NA の添字は落ちる（実測）
  );
  await outIs(
    'print(tapply(1:4, c(2, 1, 2, 1), "mean"))',
    ["c(1 = 3, 2 = 2)"],
  );
  await outIs(
    'print(tapply(c(1, NA, 3), c("a", "a", "a"), "sum", na.rm = TRUE))',
    ["c(a = 4)"],
  );
  await errMatch('print(tapply(1:3, "a", "sum"))', /arguments must have same length/);
  await errMatch('print(tapply(1:3, c("a", "a", "a"), "range"))', /単純な集計のみ/);
  await errMatch('print(tapply(1:3, c("a", "a", "a")))', /FUN が指定されていません/);
  await errMatch('print(tapply(1:3, c("a", "a", "a"), "sum", simplify = FALSE))', /リストを返すため未対応/);
});
test("eng3 table", async () => {
  await outIs('print(table(c("b", "a", "b", NA)))', ["c(a = 1, b = 2)"]);
  // NA 水準の名前は NA（モデルの show では名前なしとして表示される）
  await outIs('print(table(c(2, 1, 2, NA), useNA = "always"))', ["c(1 = 1, 2 = 2, 1)"]);
  await outIs('print(table(c(2, 1, 2, NA), useNA = "ifany"))', ["c(1 = 1, 2 = 2, 1)"]);
  // NA と NaN は別水準で、並びは通常水準→NaN→NA（実 R 4.3.3 実測）
  await outIs('print(table(c(1, NaN, NA), useNA = "always"))', ["c(1 = 1, NaN = 1, 1)"]);
  await outIs('print(table(c(1, NaN)))', ["c(1 = 1)"]);
  await outIs('print(table(numeric(0)))', ["c()"]);
  await outIs('print(table(c(TRUE, FALSE, TRUE)))', ["c(FALSE = 1, TRUE = 2)"]);
  await errMatch('print(table(c(1, 2), c(1, 2)))', /未対応/);
});
test("eng3 sapply/vapply/mapply/apply with string FUN", async () => {
  await outIs(DF + 'print(sapply(df, "sum"))', ["c(x = 3, y = 7)"]);
  await outIs('print(sapply(c("x", "yy"), "length"))', ["c(x = 1, yy = 1)"]); // USE.NAMES の実測規則
  await outIs('print(sapply(1:3, "typeof"))', ['c("double", "double", "double")']);
  await outIs(DF + 'print(vapply(df, "sum", numeric(1)))', ["c(x = 3, y = 7)"]);
  await errMatch(DF + 'print(vapply(df, "sum", numeric(2)))', /未対応/);
  await errMatch(DF + 'print(vapply(df, "sum", character(1)))', /values must be type/);
  await errMatch('print(sapply(1:3, "sum", simplify = FALSE))', /リストを返すため未対応/);
  await outIs('print(mapply("+", 1:3, 10))', ["c(11, 12, 13)"]);
  await outIs('print(mapply("sum", 1:3, 4:6))', ["c(5, 7, 9)"]); // 実測
  await outIs(DF + 'print(apply(df, 2, "mean"))', ["c(x = 1.5, y = 3.5)"]);
  await outIs(DF + 'print(apply(df, 1, "sum"))', ["c(4, 6)"]);
  await errMatch('print(apply(1:3, 1, "sum"))', /dim\(X\) must have a positive length/);
  // bare な関数名は基礎層が「関数名を値として使う形」で名指し停止する
  await errMatch('print(tapply(1:3, c("a", "a", "a"), sum))', /関数名 sum を値として使う形/);
  await errMatch('print(lapply(1:3, "sum"))', /説明に対応していません/);
});

// ---- 環境アクセス ----
test("eng3 assign/get/get0/exists/ls against simulator state", async () => {
  const p = await first('assign("y", 42)\nprint(y)\nprint(get("y"))');
  assert.deepEqual(outputs(p), ["42", "42"]);
  assert.equal(p.vars.y, 42); // 後続の評価と最終状態の両方に反映される
  await outIs('x <- 5\nprint(get("x"))', ["5"]);
  await outIs('print(get0("nopeXYZ"))', ["NULL"]);
  await outIs('print(get0("nopeXYZ", ifnotfound = 42))', ["42"]);
  await errMatch('print(get("nopeXYZ"))', /object 'nopeXYZ' not found/);
  await outIs('x <- 1\nprint(exists("x"))', ["TRUE"]);
  await outIs('print(exists("nopeXYZ"))', ["FALSE"]);
  await outIs('print(exists("mean"))', ["TRUE"]); // base の関数（実測）
  await outIs('print(exists("mean", mode = "function"))', ["TRUE"]);
  await outIs('x <- 1\nprint(exists("x", mode = "function"))', ["FALSE"]);
  await outIs('print(exists("NA"))', ["TRUE"]);
  await errMatch('print(exists(1))', /invalid first argument/);
  await errMatch('print(assign("TRUE", 1))', /invalid \(do_set\) left-hand side/);
  await errMatch('x <- 1\nprint(get("x", envir = 1))', /写像できないため未対応/);
  const p2 = await first('b <- 1\na <- 2\nprint(ls())');
  assert.deepEqual(outputs(p2), ['c("a", "b")']); // ソート済み
  await outIs('b <- 1\na <- 2\nprint(ls(pattern = "^a"))', ['c("a")']);
  await outIs('print(objects())', ["c()"]);
});
test("eng3 unknown values propagate, not fabricated", async () => {
  // 未確定値が絡む呼び出しは汎用伝播で未確定のままになる（値を捏造しない）
  const p = await first('x <- rnorm(3)\nprint(is.numeric(x))');
  assert.equal(p.outputs.length, 1);
  assert.match(p.outputs[0].text, /実行時に決まる|未確定|c\(/);
});
