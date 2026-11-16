// 修正バッチ8・Python／R班 回帰テスト。
// 対象：R29-N15（Python：ユーザー定義クラスの __bool__／__len__ が真値判定で
//       無視され常に True、len() は定義済み __len__ を「長さがありません」と
//       虚偽原因で停止）
//       R29-N16（R：1列データフレームの行選択 df[i, ] がベクトルへ落ち
//       nrow が NULL になる、という所見）→ 一次情報で裁定の結果、所見は
//       不成立（現行挙動が実 R どおり）であり、本ファイルでは実 R の
//       挙動を固定するピンテストとして記録する。
//       R29-N17（R：ベクトルへの names(v) <- c("", "") が名前を NULL へ潰す）
// 一次情報：
//  - Python は当VMの実 CPython 3.12.3 で全期待値を機械突合した（32ケースの
//    バッテリーで出力・例外種別が全て一致）。規則の出典は docs.python.org
//    3.12 の真値判定／len() の定義（__bool__ 優先、無ければ __len__ 非ゼロ、
//    どちらも無ければ True。特殊メソッドは型から引く）。
//  - R は当VMに Rscript が無いため公式ドキュメント・公式ソースで裁定した。
//    N16：公式ソース dataframe.R の `[.data.frame` は drop の既定が
//    `if(missing(i)) TRUE else length(cols) == 1` で、選択後の列が1本に
//    なると `if(n == 1L) return(x[[1L]])` とベクトルを返す。?Extract の
//    data.frame 節の記述「default is to drop if only one column is left,
//    but not to drop if only one row is left」は列が2本以上残る場合の話で、
//    1列データフレームの行選択はベクトルへ落ちるのが実 R の規則
//    （R-help 2010-11-15 Bill Venables の回答でも同旨）。
//    N17：公式 ?names と C ソース attrib.c の namesgets は value をそのまま
//    名前属性に付ける（NULL のときだけ属性が消える）。全て "" や NA の
//    名前でも属性は残る。
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
const pyErrHas = async (code, part) => {
  const r = await pyrun(code);
  assert.ok(pyerr(r).includes(part), `${code}: ${pyerr(r)}`);
};

// ---------- R29-N15：__len__ が真値判定と len() の両方で効く ----------
test("R29-N15 __len__ drives truthiness and len()", async () => {
  await pyIs("class A:\n    def __len__(self):\n        return 0\nprint(bool(A()), len(A()))", ["False 0"]);
  await pyIs("class A:\n    def __len__(self):\n        return 3\nprint(bool(A()), len(A()))", ["True 3"]);
  // __init__ で設定した属性を __len__ が読む形も実物どおりに効く。
  await pyIs(
    "class A:\n    def __init__(self, n):\n        self.n = n\n    def __len__(self):\n        return self.n\nprint(bool(A(0)), bool(A(2)), len(A(5)))",
    ["False True 5"],
  );
});

// ---------- R29-N15：__bool__ が優先され、無ければ __len__、どちらも無ければ True ----------
test("R29-N15 __bool__ takes priority over __len__", async () => {
  await pyIs("class B:\n    def __bool__(self):\n        return False\nprint(bool(B()))", ["False"]);
  await pyIs(
    "class C:\n    def __bool__(self):\n        return True\n    def __len__(self):\n        return 0\nprint(bool(C()), len(C()))",
    ["True 0"],
  );
  await pyIs("class J:\n    pass\nprint(bool(J()))", ["True"]);
  await pyErrHas("class J:\n    pass\nprint(len(J()))", "TypeError");
  await pyIs(
    "class B:\n    def __init__(self, v):\n        self.v = v\n    def __bool__(self):\n        return self.v\nprint(bool(B(False)), bool(B(True)))",
    ["False True"],
  );
  // クラス定義の後から型属性として足した __bool__ も効く（型から引くため）。
  await pyIs("def f(self):\n    return False\nclass A:\n    pass\nA.__bool__ = f\nprint(bool(A()))", ["False"]);
  // 明示呼び出し a.__bool__()／a.__len__() は従来どおりメソッドとして効く。
  await pyIs(
    "class A:\n    def __bool__(self):\n        return False\n    def __len__(self):\n        return 7\na = A()\nprint(a.__bool__(), a.__len__())",
    ["False 7"],
  );
});

// ---------- R29-N15：真値判定を使う全表面への伝播 ----------
test("R29-N15 special methods propagate to all truthiness surfaces", async () => {
  const len0 = "class A:\n    def __len__(self):\n        return 0\n";
  await pyIs(len0 + "if A():\n    print('T')\nelse:\n    print('F')", ["F"]);
  await pyIs(len0 + "print('y' if A() else 'n')", ["n"]);
  await pyIs(len0 + "print(not A(), A() or 'fb')", ["True fb"]);
  await pyIs("class B:\n    def __bool__(self):\n        return False\nx = 0\nwhile B():\n    x = 1\nprint(x)", ["0"]);
  await pyIs(len0 + "print(any([A()]), all([A()]))", ["False False"]);
  await pyIs(len0 + "print([x for x in [1, 2] if A()])", ["[]"]);
  await pyIs(len0 + "print(list(filter(None, [A()])))", ["[]"]);
  await pyErrHas(len0 + "assert A()", "AssertionError");
  // コンテナの真値判定は要素の __bool__ ではなくコンテナ自身の長さで決まる。
  await pyIs(len0 + "print(bool([A()]), bool((A(),)))", ["True True"]);
  // キーワード引数の真値判定（sorted の reverse 等）も __bool__ を引く。
  await pyIs("class A:\n    def __bool__(self):\n        return False\nprint(sorted([3, 1], reverse=A()))", ["[1, 3]"]);
});

// ---------- R29-N15：戻り値の検証は実 CPython の例外種別どおり ----------
test("R29-N15 invalid special-method results raise the CPython error kinds", async () => {
  await pyErrHas("class D:\n    def __bool__(self):\n        return 1\nprint(bool(D()))", "TypeError");
  await pyErrHas("class D:\n    def __bool__(self):\n        return None\nprint(bool(D()))", "TypeError");
  await pyErrHas("class D:\n    def __bool__(self):\n        return 'x'\nprint(bool(D()))", "TypeError");
  await pyErrHas("class E:\n    def __len__(self):\n        return -1\nprint(len(E()))", "ValueError");
  await pyErrHas("class E:\n    def __len__(self):\n        return -1\nprint(bool(E()))", "ValueError");
  await pyErrHas("class F:\n    def __len__(self):\n        return 1.5\nprint(len(F()))", "TypeError");
  await pyErrHas("class F:\n    def __len__(self):\n        return 1.5\nprint(bool(F()))", "TypeError");
  await pyErrHas("class H:\n    def __len__(self):\n        return '3'\nprint(len(H()))", "TypeError");
  await pyErrHas("class I:\n    def __len__(self):\n        return None\nprint(bool(I()))", "TypeError");
  // bool の戻り値は整数として受理する（bool は int のサブクラス）。
  await pyIs(
    "class G:\n    def __len__(self):\n        return True\nclass G2:\n    def __len__(self):\n        return False\nprint(len(G()), bool(G()), len(G2()), bool(G2()))",
    ["1 True 0 False"],
  );
  // __index__ を持つインスタンスの戻り値は整数化される。
  await pyIs(
    "class Idx:\n    def __index__(self):\n        return 3\nclass D:\n    def __len__(self):\n        return Idx()\nprint(len(D()), bool(D()))",
    ["3 True"],
  );
  // 呼び出せない値が型属性に入っていたら TypeError（実物：'bool' object is not callable）。
  await pyErrHas("class A:\n    __bool__ = True\nprint(bool(A()))", "TypeError");
  await pyErrHas("class B:\n    __len__ = 5\nprint(len(B()))", "TypeError");
  // 引数不足の __len__ は TypeError。
  await pyErrHas("class K:\n    def __len__(self, x):\n        return 1\nprint(len(K()))", "TypeError");
  // メソッド内で送出した例外はそのまま伝播する。
  await pyErrHas("class L:\n    def __bool__(self):\n        raise ValueError('boom')\nprint(bool(L()))", "ValueError");
  await pyErrHas("class M:\n    def __len__(self):\n        raise ValueError('boomlen')\nprint(bool(M()))", "ValueError");
});

// ---------- R29-N15：インスタンス属性の __bool__／__len__ は無視される（型から引く） ----------
test("R29-N15 instance attributes named __bool__/__len__ are ignored", async () => {
  await pyIs("class K:\n    pass\nk = K()\nk.__bool__ = 1\nprint(bool(k))", ["True"]);
  await pyErrHas("class K:\n    pass\nk = K()\nk.__len__ = 1\nprint(len(k))", "TypeError");
});

// ---------- R29-N15：結果が未確定なら判定も未確定（黙って True に倒さない） ----------
test("R29-N15 unknown special-method results stay unknown", async () => {
  const r1 = await pyrun("class A:\n    def __len__(self):\n        return int(input())\nprint(len(A()))");
  assert.equal(pyerr(r1), "");
  assert.ok(pyout(r1).join(" ").includes("実行時に決まる"), JSON.stringify(pyout(r1)));
  const r2 = await pyrun("class A:\n    def __bool__(self):\n        return bool(input())\nprint(bool(A()))");
  assert.equal(pyerr(r2), "");
  assert.ok(pyout(r2).join(" ").includes("実行時に決まる"), JSON.stringify(pyout(r2)));
});

/* ================= R ================= */
const rd = getDefinition("r");
const rrun = async (code, model) => rd.simulate(code, model ?? structuredClone(rd.model.defaults));
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

// ---------- R29-N17：全て ""／NA の名前でも名前属性が残る ----------
test("R29-N17 all-empty and all-NA names are kept, not collapsed to NULL", async () => {
  await rOutIs("v <- c(1, 2)\nnames(v) <- c('', '')\nprint(names(v))\nprint(length(names(v)))", ['c("", "")', "2"]);
  await rOutIs("v <- c(1, 2)\nnames(v) <- c(NA, NA)\nprint(names(v))\nprint(length(names(v)))", ["c(NA, NA)", "2"]);
  // 短い value はリサイクルではなく NA 埋め（namesgets の規則、従来どおり）。
  await rOutIs("v <- c(1, 2)\nnames(v) <- ''\nprint(names(v))", ['c("", NA)']);
  // スカラー（長さ1ベクトルに包む経路）も同規則。
  await rOutIs("x <- 5\nnames(x) <- ''\nprint(names(x))\nprint(length(names(x)))", ['c("")', "1"]);
  // 部分更新は保持された名前属性の上に効く。
  await rOutIs("v <- c(1, 2)\nnames(v) <- c('', '')\nnames(v)[2] <- 'z'\nprint(names(v))", ['c("", "z")']);
  // NULL 代入だけが名前を消す（従来どおり）。
  await rOutIs("v <- c(a = 1, b = 2)\nnames(v) <- NULL\nprint(names(v))", ["NULL"]);
  // データフレーム側（従来から保持）と扱いが一致する。
  await rOutIs("df <- data.frame(a = 1:2, b = 3:4)\nnames(df) <- c('', 'b')\nprint(names(df))", ['c("", "b")']);
});

// ---------- R29-N17：同根の兄弟表面（名前を合成・伝播する演算） ----------
test("R29-N17 empty names propagate through subsetting and combining ops", async () => {
  const base = "v <- c(1, 2)\nnames(v) <- c('', '')\n";
  await rOutIs(base + "print(names(v[1]))\nprint(names(v[c(TRUE, FALSE)]))\nprint(names(v[-1]))", ['c("")', 'c("")', 'c("")']);
  await rOutIs(base + "print(names(-v))\nprint(names(v + 0))", ['c("", "")', 'c("", "")']);
  await rOutIs(base + "print(names(rep(v, 2)))", ['c("", "", "", "")']);
  await rOutIs(base + "print(names(c(v)))", ['c("", "")']);
  // B13-R（R7-153）テスト是正：as.character／as.double（as.numeric）は
  // 公式 ?character／?double どおり「like as.vector it strips attributes
  // including names」で名前を取り除く。従来の伝播期待は一次情報と
  // 矛盾する固定だった。
  await rOutIs(base + "print(names(as.character(v)))\nprint(names(as.numeric(v)))", ["NULL", "NULL"]);
});

// ---------- R29-N17：名前属性が無い入力は無いまま（NULL のまま） ----------
test("R29-N17 unnamed inputs stay unnamed through the same ops", async () => {
  await rOutIs(
    "print(names(c(1, 2)))\nprint(names(c(1, 2)[1]))\nprint(names(c(1, 2)[c(TRUE, FALSE)]))\nprint(names(rep(1:2, 2)))\nprint(names(c(1, 2) + 1))\nprint(names(-c(1, 2)))",
    ["NULL", "NULL", "NULL", "NULL", "NULL", "NULL"],
  );
});

// ---------- R29-N16（裁定：所見不成立。実 R の drop 規則を固定する） ----------
// 公式ソース dataframe.R の `[.data.frame`：drop の既定は
// length(cols) == 1 のとき TRUE で、選択後の列が1本なら x[[1L]]（ベクトル）
// を返す。「1行だけ残っても落とさない」保護は列が2本以上残る場合だけ。
test("R29-N16 pin: one-column data frame row selection drops to the column vector (real R)", async () => {
  await rOutIs("df <- data.frame(a = c(1, 2, 3))\nprint(df[c(1, 3), ])", ["c(1, 3)"]);
  await rOutIs("df <- data.frame(a = c(1, 2, 3))\nprint(df[2, ])\nprint(nrow(df[2, ]))", ["c(2)", "NULL"]);
  await rOutIs("df <- data.frame(a = c(1, 2, 3))\nprint(length(df[0, ]))", ["0"]);
  // 列選択も同じ drop 規則（従来どおり）。
  await rOutIs("df <- data.frame(a = c(1, 2, 3))\nprint(nrow(df[, 1]))\nprint(length(df[, 1]))", ["NULL", "3"]);
  // リスト的な選択（df[1]／df[]）はデータフレームのまま。
  await rOutIs("df <- data.frame(a = c(1, 2, 3))\nprint(nrow(df[1]))\nprint(nrow(df[]))", ["3", "3"]);
});

test("R29-N16 pin: two-column data frame row selection stays a data frame (real R)", async () => {
  await rOutIs(
    "df <- data.frame(a = 1:3, b = 4:6)\nprint(nrow(df[2, ]))\nprint(ncol(df[2, ]))\nprint(nrow(df[c(1, 3), ]))",
    ["1", "2", "2"],
  );
});
