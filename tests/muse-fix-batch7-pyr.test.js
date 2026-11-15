// 修正バッチ7・Python／R班 回帰テスト。
// 対象：R28-N16（Python：range と辞書ビューの真値判定が長さを無視し空でも常に True）
//       R28-N17（R：データフレームの唯一の列を df$列 <- NULL で削除すると行数が失われる）
//       R28-N18（R：names(x) <- 値 が虚偽原因「関数呼び出しの結果には代入できません」で停止）
// 一次情報：
//  - Python は当VMの実 CPython 3.12.3 で全期待値を機械突合した（真値判定は
//    __len__ を持つオブジェクトでは長さ0が偽。docs.python.org 3.12「真値判定」）。
//    イテレータ（iter／zip／map／enumerate 等）は __len__ を持たないため常に True が正。
//  - R は当VMに Rscript が無いため公式ドキュメントと公式ソースで裁定した。
//    行数：dim.data.frame は .row_names_info（row.names 属性）から行数を返す
//    （公式ソース dataframe.R）。0列×N行は通常の状態で、print.data.frame は
//    "data frame with 0 columns and N rows" と表示する。
//    names<-：公式 ?names（Usage に names(x) <- value を明記。value は x と
//    同じ長さまでの文字ベクトルか NULL。短い場合は NA で埋める）と公式
//    C ソース attrib.c の namesgets（as.character で強制、短い value は
//    xlengthgets で NA 埋め、長い場合は checkNames が
//    "'names' attribute [k] must be the same length as the vector [n]" で停止）。
//    データフレームの NA 列名は本モデルの columns（名前キー）では表現できない
//    ため、R 本体でも「名前なし」のプレースホルダとして NA と同一視される
//    "" で表す（R-devel 2015-04-27 の議論どおり NA と "" は名前なしの同義）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as pyd } from "../js/types/python/index.js";
import { getDefinition } from "../js/types/registry.js";

/* ================= Python ================= */
const pyrun = async (code) => pyd.simulate(code, structuredClone(pyd.model.defaults));
const pyout = (r) => (r.paths || []).flatMap((p) => p.outputs.map((o) => o.text));
const pyerr = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message || String(e))
    .join("\n");
const pyIs = async (code, want) => {
  const r = await pyrun(code);
  assert.equal(pyerr(r), "", `${code}: ${pyerr(r)}`);
  assert.deepEqual(pyout(r), want, code);
};

// ---------- R28-N16：空の range は False ----------
test("R28-N16 empty ranges are falsy, non-empty ranges truthy", async () => {
  await pyIs("print(bool(range(0)))", ["False"]);
  await pyIs("print(bool(range(0, 0)))", ["False"]);
  await pyIs("print(bool(range(5, 5)))", ["False"]);
  await pyIs("print(bool(range(5, 0)))", ["False"]);
  await pyIs("print(bool(range(0, 5, -1)))", ["False"]);
  await pyIs("print(bool(range(3)))", ["True"]);
  await pyIs("print(bool(range(0, 5, 2)))", ["True"]);
  await pyIs("print(bool(range(5, 0, -1)))", ["True"]);
});

// ---------- R28-N16：空の辞書ビューは False ----------
test("R28-N16 empty dict views are falsy, non-empty views truthy", async () => {
  await pyIs("print(bool({}.keys()))", ["False"]);
  await pyIs("print(bool({}.values()))", ["False"]);
  await pyIs("print(bool({}.items()))", ["False"]);
  await pyIs("d = {'a': 1}\nprint(bool(d.keys()), bool(d.values()), bool(d.items()))", ["True True True"]);
  // 要素を全て消した後のビューも長さに追随する（ビューはライブ）。
  await pyIs("d = {'a': 1}\ndel d['a']\nprint(bool(d.keys()), bool(d.values()), bool(d.items()))", ["False False False"]);
  await pyIs("d = {'a': 1}\nd.pop('a')\nprint(bool(d.keys()))", ["False"]);
  await pyIs("d = {}\nd['x'] = 1\nprint(bool(d.values()))", ["True"]);
});

// ---------- R28-N16：真値判定を使う全表面への伝播 ----------
test("R28-N16 truthiness propagates to if/while/or/and/not/any/all/filter/comprehension", async () => {
  await pyIs("if range(0):\n    print('T')\nelse:\n    print('F')", ["F"]);
  await pyIs("d = {}\nif d.keys():\n    print('T')\nelse:\n    print('F')", ["F"]);
  await pyIs("x = 0\nwhile range(0):\n    x = 1\nprint(x)", ["0"]);
  await pyIs("print(range(0) or 'fallback')", ["fallback"]);
  await pyIs("print(range(2) or 'fallback')", ["range(0, 2)"]);
  await pyIs("print(not range(0), not {}.keys())", ["True True"]);
  await pyIs("print(any([range(0)]), all([range(0)]))", ["False False"]);
  await pyIs("print(any([range(1)]), all([range(1)]))", ["True True"]);
  await pyIs("print([x for x in [1, 2] if range(0)])", ["[]"]);
  await pyIs("print([x for x in [1, 2] if range(1)])", ["[1, 2]"]);
  await pyIs("print(list(filter(None, [range(0), range(1)])))", ["[range(0, 1)]"]);
  await pyIs("print('yes' if {}.items() else 'no')", ["no"]);
});

// ---------- R28-N16：イテレータは __len__ を持たないため常に True（実物どおり） ----------
test("R28-N16 iterators stay truthy even when empty", async () => {
  await pyIs("print(bool(iter([])))", ["True"]);
  await pyIs("print(bool(zip([])))", ["True"]);
  await pyIs("print(bool(map(str, [])))", ["True"]);
  await pyIs("print(bool(enumerate([])))", ["True"]);
  // 既存の長さ判定（list/dict/set/tuple/str）は不変。
  await pyIs("print(bool([]), bool({}), bool(set()), bool(()), bool(''))", ["False False False False False"]);
  await pyIs("print(len(range(0)), len({}.keys()))", ["0 0"]);
});

/* ================= R ================= */
const rd = getDefinition("r");
const rrun = async (code, model) => rd.simulate(code, structuredClone(model ?? rd.model.defaults));
const rfirst = async (code, model) => {
  const r = await rrun(code, model);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r));
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const rout = (p) => p.outputs.map((o) => o.text);
const rerrs = async (code, model) => {
  const r = await rrun(code, model);
  return [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
};
const rOutIs = async (code, want) => {
  const p = await rfirst(code);
  assert.deepEqual(rout(p), want, code);
};
const rErrHas = async (code, part) => {
  const errs = await rerrs(code);
  assert.ok(errs.length, `${code}: エラーにならなかった`);
  assert.ok(
    errs.some((e) => (e.message || String(e)).includes(part)),
    `${code}: ${JSON.stringify(errs.map((e) => e.message || String(e)))}`,
  );
};

// ---------- R28-N17：唯一の列を削除しても行数が残る ----------
test("R28-N17 deleting the only column keeps the row count", async () => {
  await rOutIs(
    "df <- data.frame(a = c(1, 2))\ndf$a <- NULL\nprint(nrow(df))\nprint(ncol(df))",
    ["2", "0"],
  );
  await rOutIs(
    "df <- data.frame(a = c(1, 2))\ndf$a <- NULL\nprint(df)",
    ["data frame with 0 columns and 2 rows"],
  );
  await rOutIs(
    "df <- data.frame(a = c(1, 2, 3))\ndf$a <- NULL\nprint(nrow(df))",
    ["3"],
  );
});

test("R28-N17 row count still constrains later column assignment", async () => {
  // 行数不一致（3行）の列追加は停止する。
  await rErrHas(
    "df <- data.frame(a = c(1, 2))\ndf$a <- NULL\ndf$b <- c(9, 8, 7)",
    "replacement has incompatible rows",
  );
  // 行数が合う列追加と長さ1のリサイクルは通る。
  await rOutIs(
    "df <- data.frame(a = c(1, 2))\ndf$a <- NULL\ndf$b <- c(9, 8)\nprint(nrow(df))\nprint(df$b)",
    ["2", "c(9, 8)"],
  );
  await rOutIs(
    "df <- data.frame(a = c(1, 2))\ndf$a <- NULL\ndf$b <- 9\nprint(df$b)",
    ["c(9, 9)"],
  );
  // 0行×0列のデータフレームへの最初の列追加は行数を確立する（従来どおり）。
  await rOutIs(
    "df <- data.frame()\ndf$b <- c(9, 8, 7)\nprint(nrow(df))",
    ["3"],
  );
});

test("R28-N17 RG-237 established deletion forms are preserved", async () => {
  // 2列からの削除、存在しない列への無操作は従来どおり。
  await rOutIs(
    "df <- data.frame(a = c(1, 2), b = c(3, 4))\ndf$b <- NULL\nprint(nrow(df))\nprint(names(df))\nprint(df$a)",
    ["2", 'c("a")', "c(1, 2)"],
  );
  await rOutIs(
    "df <- data.frame(a = c(1, 2))\ndf$zzz <- NULL\nprint(nrow(df))\nprint(names(df))",
    ["2", 'c("a")'],
  );
  // 明示的な row.names を持つ場合はそれが保持される。
  const p = await rfirst(
    "df <- data.frame(a = c(1, 2), row.names = c('r1', 'r2'))\ndf$a <- NULL\nprint(nrow(df))",
  );
  assert.deepEqual(rout(p), ["2"]);
  assert.deepEqual(p.vars.df.rowNames, ["r1", "r2"]);
  // 列が0本でも row.names だけで作られたデータフレームは行数を持つ。
  await rOutIs("df <- data.frame(row.names = c('r1', 'r2'))\nprint(nrow(df))\nprint(ncol(df))", ["2", "0"]);
});

// ---------- R28-N18：names(x) <- 値 の置換関数代入 ----------
test("R28-N18 names<- sets and renames vector names", async () => {
  await rOutIs("v <- c(1, 2)\nnames(v) <- c('x', 'y')\nprint(names(v))\nprint(v)", ['c("x", "y")', "c(x = 1, y = 2)"]);
  await rOutIs("v <- c(a = 1, b = 2)\nnames(v) <- c('x', 'y')\nprint(names(v))", ['c("x", "y")']);
  // 名前による添字参照も新しい名前で効く。
  await rOutIs("v <- c(1, 2)\nnames(v) <- c('x', 'y')\nprint(v['y'])", ["c(y = 2)"]);
  // スカラー（長さ1ベクトル）にも設定できる。
  await rOutIs("x <- 5\nnames(x) <- 'a'\nprint(names(x))\nprint(x)", ['c("a")', "c(a = 5)"]);
});

test("R28-N18 names<- NULL removes names, shorter values pad with NA, non-character coerces", async () => {
  await rOutIs("v <- c(a = 1, b = 2)\nnames(v) <- NULL\nprint(names(v))\nprint(v)", ["NULL", "c(1, 2)"]);
  // ?names／attrib.c namesgets：短い value は NA で埋める。
  await rOutIs("v <- c(1, 2)\nnames(v) <- c('a')\nprint(names(v))", ['c("a", NA)']);
  // value は as.character で強制される。
  await rOutIs("v <- c(1, 2)\nnames(v) <- c(10, 20)\nprint(names(v))", ['c("10", "20")']);
});

test("R28-N18 names<- longer than the object is a length error naming the lengths", async () => {
  await rErrHas(
    "v <- c(1, 2)\nnames(v) <- c('a', 'b', 'c')",
    "'names' attribute [3] must be the same length as the vector [2]",
  );
  await rErrHas(
    "df <- data.frame(a = c(1, 2), b = c(3, 4))\nnames(df) <- c('x', 'y', 'z')",
    "'names' attribute [3] must be the same length as the vector [2]",
  );
});

test("R28-N18 names<- renames data.frame columns", async () => {
  await rOutIs(
    "df <- data.frame(a = c(1, 2), b = c(3, 4))\nnames(df) <- c('x', 'y')\nprint(names(df))\nprint(df$x)\nprint(df)",
    ['c("x", "y")', "c(1, 2)", "x: c(1, 2)\ny: c(3, 4)"],
  );
  // 短い value は残りの列名を NA（本モデルでは ""）で埋める。
  await rOutIs(
    "df <- data.frame(a = c(1, 2), b = c(3, 4))\nnames(df) <- c('x')\nprint(names(df))",
    ['c("x", "")'],
  );
});

test("R28-N18 names(x)[i] <- partial update works", async () => {
  await rOutIs("v <- c(a = 1, b = 2)\nnames(v)[2] <- 'z'\nprint(names(v))", ['c("a", "z")']);
  await rOutIs("v <- c(1, 2)\nnames(v)[1] <- 'z'\nprint(names(v))", ['c("z", NA)']);
});

test("R28-N18 names on NULL and reserved constants", async () => {
  // 実 R の特例：存在しない名前の除去だけは無操作。それ以外は長さ0との不一致。
  await rOutIs("names(NULL) <- NULL\nprint(1)", ["1"]);
  await rErrHas("names(NULL) <- 'a'", "'names' attribute [1] must be the same length as the vector [0]");
  await rErrHas("names(TRUE) <- 'a'", "TRUE には代入できません");
  await rErrHas("names(NA) <- 'a'", "NA には代入できません");
  await rErrHas("names(undefinedvar) <- 'a'", "未定義の名前");
});

test("R28-N18 other replacement functions stop honestly by name, never with the false cause", async () => {
  for (const [code, fn] of [
    ["v <- c(1, 2)\ncolnames(v) <- c('x', 'y')", "colnames"],
    ["df <- data.frame(a = c(1, 2))\nrownames(df) <- c('r1', 'r2')", "rownames"],
    ["x <- c(1, 2)\nlength(x) <- 3", "length"],
    ["x <- c(1, 2)\nsqrt(x) <- 1", "sqrt"],
  ]) {
    const errs = await rerrs(code);
    assert.ok(errs.length, `${code}: エラーにならなかった`);
    const msgs = errs.map((e) => e.message || String(e)).join("\n");
    assert.ok(msgs.includes(fn), `${code}: ${msgs}`);
    assert.ok(!msgs.includes("関数呼び出しの結果には代入できません"), `${code}: 虚偽原因が残っている: ${msgs}`);
  }
  // names(df) <- NULL は列名の全削除で、本モデル（列名キー）では表現できないため
  // 名指しで停止する（虚偽原因ではない）。
  const errs = await rerrs("df <- data.frame(a = c(1, 2))\nnames(df) <- NULL");
  assert.ok(errs.length, "names(df) <- NULL: エラーにならなかった");
  assert.ok(!errs.map((e) => e.message || String(e)).join("\n").includes("関数呼び出しの結果には代入できません"));
});
