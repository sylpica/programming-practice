// バッチ12（JS班）修正の回帰テスト。
// 対象：RG-364（R33-N1：JavaScript で代入先の添字内に代入式を書くと
// 「] が必要です」という虚偽原因で停止していた）。
// 根本原因は2層：(1) パーサの添字読みが素の expr() で、文頭の代入先
// など assignOk が立っていない文脈では添字内の代入式を消費しなかった。
// (2) 評価側では複合代入・論理代入・++ / -- が対象を読み取りと書き込み
// で別々に評価するため、添字内の副作用が二重実行され、代入文では右辺
// より後に添字が評価されていた。
// 処置：添字の中では JavaScript 方言に限り常に代入式の文脈を開き、
// 評価側では代入対象の添字キーを一度だけ評価してリテラルへ置き換える
// （操作完了時に復元）。期待値は Node 実走（ECMA-262）で確認した。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code, model) => {
  const d = getDefinition(id);
  return d.simulate(
    code,
    model === undefined ? structuredClone(d.model.defaults) : model,
  );
};
const js = (code) => run("javascript", code);
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message);
const outputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);
const vars = (r) => r.paths?.[0]?.vars || {};

/* ---------------- RG-364: 再現形（findings-r33-par R33-PAR-1） ---------------- */
test("RG-364: assignment expressions inside an assignment-target index run as in real JavaScript", async () => {
  const cases = [
    // [コード, 期待する a, 期待する x]
    ["let a=[0,0,0]; let x=1; a[x+=1]=5;", [0, 0, 5], 2],
    ["let a=[0,0,0]; let x=1; a[x=2]=5;", [0, 0, 5], 2],
    ["let a=[0,0,0]; let x=1; a[x-=1]=5;", [5, 0, 0], 0],
    ["let a=[0,0,0]; let x=1; a[x<<=1]=5;", [0, 0, 5], 2],
    ["let a=[0,0,0]; let x=1; a[x*=2]=5;", [0, 0, 5], 2],
    ["let a=[0,0,0]; let x=1; a[x=2]+=5;", [0, 0, 5], 2],
  ];
  for (const [code, expectedA, expectedX] of cases) {
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(vars(r).a, expectedA, code);
    assert.equal(vars(r).x, expectedX, code);
  }
  const member = await js('let o={}; let k="a"; o[k+="b"]=1;');
  assert.deepEqual(errors(member), []);
  assert.deepEqual(vars(member).o, { ab: 1 });
  assert.equal(vars(member).k, "ab");
});

test("RG-364: every assignment operator is accepted inside a target index", async () => {
  // x=2 から各演算子で添字を求め、a[添字]=9 する（Node 実走と一致）。
  const matrix = [
    ["=", 2, 2],
    ["+=", 1, 3],
    ["-=", 1, 1],
    ["*=", 2, 4],
    ["/=", 2, 1],
    ["%=", 2, 0],
    ["<<=", 1, 4],
    [">>=", 1, 1],
    [">>>=", 1, 1],
    ["&=", 2, 2],
    ["|=", 2, 2],
    ["^=", 3, 1],
  ];
  for (const [op, rhs, expectedIndex] of matrix) {
    const code = `let a=[0,0,0,0,0]; let x=2; a[x${op}${rhs}]=9;`;
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.equal(vars(r).x, expectedIndex, code);
    assert.equal(vars(r).a[expectedIndex], 9, code);
  }
  // 論理代入も添字内で受理される
  const and = await js("let a=[0,0,0]; let x=1; a[x&&=0]=5;");
  assert.deepEqual(errors(and), []);
  assert.deepEqual(vars(and).a, [5, 0, 0]);
  assert.equal(vars(and).x, 0);
  const or = await js("let a=[0,0,0]; let x=0; a[x||=2]=5;");
  assert.deepEqual(errors(or), []);
  assert.deepEqual(vars(or).a, [0, 0, 5]);
  assert.equal(vars(or).x, 2);
});

test("RG-364: compound assignment on the target itself combines with an index assignment", async () => {
  const matrix = [
    ["+=", 4],
    ["-=", -4],
    ["*=", 0],
    ["/=", 0],
    ["%=", 0],
    ["<<=", 0],
    [">>=", 0],
    ["&=", 0],
    ["|=", 4],
    ["^=", 4],
  ];
  for (const [op, expected] of matrix) {
    const code = `let a=[0,0,0]; let x=1; a[x=2]${op}4;`;
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.equal(vars(r).a[2], expected, code);
    assert.equal(vars(r).x, 2, code);
  }
});

/* ---------------- RG-364: 単一評価と評価順序 ---------------- */
test("RG-364: the index of an assignment target is evaluated exactly once", async () => {
  // 複合代入（文レベル）：読み取りと書き込みで添字を二重評価しない
  const stmt = await js("let a=[0,0,0]; let x=1; a[x+=1]+=5;");
  assert.deepEqual(errors(stmt), []);
  assert.deepEqual(vars(stmt).a, [0, 0, 5]);
  assert.equal(vars(stmt).x, 2);
  // 後置 ++ を含む添字＋複合代入
  const post = await js("let a=[10,20,30]; let x=1; a[x++]+=5;");
  assert.deepEqual(errors(post), []);
  assert.deepEqual(vars(post).a, [10, 25, 30]);
  assert.equal(vars(post).x, 2);
  // 式位置の複合代入
  const expr = await js("let a=[10,20,30]; let x=1; let y=(a[x+=1]+=5);");
  assert.deepEqual(errors(expr), []);
  assert.deepEqual(vars(expr).a, [10, 20, 35]);
  assert.equal(vars(expr).x, 2);
  assert.equal(vars(expr).y, 35);
  // 対象への後置 ++（添字内の代入式は一度だけ）
  const inc = await js("let a=[10,20,30]; let x=1; let y=(a[x+=1]++);");
  assert.deepEqual(errors(inc), []);
  assert.deepEqual(vars(inc).a, [10, 20, 31]);
  assert.equal(vars(inc).x, 2);
  assert.equal(vars(inc).y, 30);
  // 論理代入（文レベル）でも二重評価しない
  const logical = await js("let a=[0,0,0]; let x=1; a[x+=1] ||= 7;");
  assert.deepEqual(errors(logical), []);
  assert.deepEqual(vars(logical).a, [0, 0, 7]);
  assert.equal(vars(logical).x, 2);
});

test("RG-364: the target index is evaluated before the right-hand side", async () => {
  // Node: a[x=0]=x は x=0 を先に評価するため a[0] へ 0 が入る
  const r = await js("let a=[0,0,0]; let x=1; a[x=0]=x;");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(vars(r).a, [0, 0, 0]);
  assert.equal(vars(r).x, 0);
  const e = await js("let a=[0,0,0]; let x=1; let y=(a[x=0]=x);");
  assert.deepEqual(errors(e), []);
  assert.deepEqual(vars(e).a, [0, 0, 0]);
  assert.equal(vars(e).y, 0);
});

test("RG-364: index evaluation repeats correctly across loop iterations (keys are restored)", async () => {
  const loop = await js(
    "let a=[0,0,0]; let x=0; for (let i=0; i<2; i++) a[x++]=9;",
  );
  assert.deepEqual(errors(loop), []);
  assert.deepEqual(vars(loop).a, [9, 9, 0]);
  assert.equal(vars(loop).x, 2);
  const loop2 = await js(
    "let a=[0,0,0]; let x=0; for (let i=0; i<2; i++) a[x+=1]=5;",
  );
  assert.deepEqual(errors(loop2), []);
  assert.deepEqual(vars(loop2).a, [0, 5, 5]);
  assert.equal(vars(loop2).x, 2);
  // 解決済みリテラルが後続文へ残らないこと
  const after = await js("let a=[0,0,0]; let x=1; a[x+=1]=5; a[x]=7;");
  assert.deepEqual(errors(after), []);
  assert.deepEqual(vars(after).a, [0, 0, 7]);
  assert.equal(vars(after).x, 2);
});

/* ---------------- RG-364: 入れ子・メンバー・分割代入 ---------------- */
test("RG-364: nested indexes, member chains and destructuring targets", async () => {
  const nested = await js("let a=[0,0,0]; let b=[7,8,9]; let x=0; a[b[x=1]]=5;");
  assert.deepEqual(errors(nested), []);
  assert.equal(vars(nested).x, 1);
  assert.equal(vars(nested).a.length, 9);
  assert.equal(vars(nested).a[8], 5);
  const member = await js("let o={p:[0,0,0]}; let x=1; o.p[x+=1]=5;");
  assert.deepEqual(errors(member), []);
  assert.deepEqual(vars(member).o, { p: [0, 0, 5] });
  assert.equal(vars(member).x, 2);
  const deep = await js("let a=[[0,0,0]]; let x=1; a[0][x+=1]=5;");
  assert.deepEqual(errors(deep), []);
  assert.deepEqual(vars(deep).a, [[0, 0, 5]]);
  const destructure = await js("let a=[0,0,0]; let x=1; [a[x=1]]=[9];");
  assert.deepEqual(errors(destructure), []);
  assert.deepEqual(vars(destructure).a, [0, 9, 0]);
  assert.equal(vars(destructure).x, 1);
});

/* ---------------- RG-364: 位置マトリクス ---------------- */
test("RG-364: assignment-in-index works in for headers, bodies and expression positions", async () => {
  const cases = [
    ["let a=[0,0,0]; let x=1; for (a[x=0]=9; x<2; x++) {}", [9, 0, 0], 2],
    ["let a=[0,0,0]; let x=1; if (true) a[x=2]=5;", [0, 0, 5], 2],
    ["let a=[0,0,0]; let x=1; while (x<2) { a[x+=1]=5; break; }", [0, 0, 5], 2],
  ];
  for (const [code, expectedA, expectedX] of cases) {
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(vars(r).a, expectedA, code);
    assert.equal(vars(r).x, expectedX, code);
  }
  const update = await js(
    "let a=[0,0,0]; let x=0; for (; x<2; a[x++]=9) { x++; }",
  );
  assert.deepEqual(errors(update), []);
  assert.deepEqual(vars(update).a, [0, 9, 0]);
  assert.equal(vars(update).x, 2);
  const exprStmt = await js("let a=[0,0,0]; let x=1; console.log(a[x+=1]=5);");
  assert.deepEqual(errors(exprStmt), []);
  assert.deepEqual(outputs(exprStmt), ["5"]);
  assert.deepEqual(vars(exprStmt).a, [0, 0, 5]);
  assert.equal(vars(exprStmt).x, 2);
  // 文頭の単項演算子（delete／typeof）の被演算子でも同じ文脈が開く
  const del = await js("let a=[0,0,0]; let x=1; delete a[x+=1];");
  assert.deepEqual(errors(del), []);
  assert.equal(vars(del).x, 2);
  const typeOf = await js("let a=[0,0,0]; let x=1; typeof a[x+=1];");
  assert.deepEqual(errors(typeOf), []);
  assert.equal(vars(typeOf).x, 2);
});

/* ---------------- RG-364: 対照の維持 ---------------- */
test("RG-364: reading positions, parenthesised and ternary indexes are unchanged", async () => {
  const read = await js("let a=[0,0,0]; let x=1; console.log(a[x+=1]);");
  assert.deepEqual(errors(read), []);
  assert.deepEqual(outputs(read), ["0"]);
  assert.equal(vars(read).x, 2);
  const decl = await js("let a=[0,0,0]; let x=1; let y=a[x+=1];");
  assert.deepEqual(errors(decl), []);
  assert.equal(vars(decl).y, 0);
  assert.equal(vars(decl).x, 2);
  const paren = await js("let a=[0,0,0]; let x=1; a[(x+=1)]=5;");
  assert.deepEqual(errors(paren), []);
  assert.deepEqual(vars(paren).a, [0, 0, 5]);
  const ternary = await js("let a=[0,0,0]; let x=1; a[x>0?2:0]=5;");
  assert.deepEqual(errors(ternary), []);
  assert.deepEqual(vars(ternary).a, [0, 0, 5]);
  // 後置 ++ の添字は従来どおり動作する
  const post = await js("let a=[0,0,0]; let x=1; a[x++]=5;");
  assert.deepEqual(errors(post), []);
  assert.deepEqual(vars(post).a, [0, 5, 0]);
  assert.equal(vars(post).x, 2);
  // 引数位置の多重添字は従来どおり名指しで停止する
  const multi = await js("let a=[0,0,0]; console.log(a[0,1]);");
  assert.match(errors(multi)[0] || "", /この添字式は未対応です/);
});

test("RG-364: **= inside a target index still names the operator, and prefix ++ stays consistent", async () => {
  const pow = await js("let a=[0,0,0]; let x=1; a[x**=2]=5;");
  assert.match(errors(pow)[0] || "", /\*\*= 演算子/);
  assert.doesNotMatch(errors(pow)[0] || "", /\] が必要です/);
  // 前置 ++ は JS 方言の全位置で未対応（既存候補）であり、添字内だけ
  // 別の虚偽原因にならないこと
  const inIndex = await js("let a=[0,0,0]; let x=1; a[++x]=5;");
  const bare = await js("let x=1; console.log(++x);");
  assert.equal(errors(inIndex)[0], errors(bare)[0]);
  assert.doesNotMatch(errors(inIndex)[0] || "", /\] が必要です/);
});

/* ---------------- RG-364 追随（観察②）: 複合代入の現在値の読み取り順序 ----------------
   文レベルの複合代入で「現在値の読み」が右辺評価より後に行われていたため、
   右辺が対象自身を書き換えると実 JavaScript と異なる値になっていた
   （例：x += x++ がアプリ 21／Node 20）。ECMA-262 どおり、対象の参照解決
   （RG-364 の添字キー先行評価）に続いて現在値を右辺より先に読むよう処置。
   式位置の代入式と論理代入は従来から正しい順序であり、その維持も固定する。
   期待値は全て Node 実走と機械突合した。 */
test("follow-up: statement compound assignment reads the current value before the right-hand side (all operators)", async () => {
  // [演算子, 初期値, Node での結果]。右辺 x++ は初期値を返して x を増やすため、
  // 現在値を先に読む Node では 初期値 op 初期値 になる（処置前は全行で不一致）。
  const matrix = [
    ["+=", 10, 20],
    ["-=", 10, 0],
    ["*=", 10, 100],
    ["/=", 10, 1],
    ["%=", 10, 0],
    ["<<=", 1, 2],
    [">>=", 256, 256],
    [">>>=", 256, 256],
    ["&=", 13, 13],
    ["|=", 10, 10],
    ["^=", 10, 0],
  ];
  for (const [op, init, expected] of matrix) {
    const varCase = await js(`let x=${init}; x ${op} x++;`);
    assert.deepEqual(errors(varCase), [], `x ${op} x++`);
    assert.equal(vars(varCase).x, expected, `x ${op} x++`);
    const indexCase = await js(`let a=[${init}]; a[0] ${op} a[0]++;`);
    assert.deepEqual(errors(indexCase), [], `a[0] ${op} a[0]++`);
    assert.deepEqual(vars(indexCase).a, [expected], `a[0] ${op} a[0]++`);
    const memberCase = await js(`let o={v:${init}}; o.v ${op} o.v++;`);
    assert.deepEqual(errors(memberCase), [], `o.v ${op} o.v++`);
    assert.deepEqual(vars(memberCase).o, { v: expected }, `o.v ${op} o.v++`);
    // 式位置の複合代入は従来から正しい順序であり、文レベルと一致すること
    const exprCase = await js(`let x=${init}; let y=(x ${op} x++);`);
    assert.deepEqual(errors(exprCase), [], `(x ${op} x++)`);
    assert.equal(vars(exprCase).x, expected, `(x ${op} x++)`);
    assert.equal(vars(exprCase).y, expected, `(x ${op} x++)`);
  }
  // 後置 -- を右辺に持つ形も同じ順序になる
  const dec = await js("let x=10; x += x--;");
  assert.deepEqual(errors(dec), []);
  assert.equal(vars(dec).x, 20);
});

test("follow-up: right-hand side assignment expressions and call-driven rewrites use the pre-read value", async () => {
  // 右辺の代入式が対象自身を書き換える形（現在値 10 を先に読む）
  const matrix = [
    ["+=", 15],
    ["-=", 5],
    ["*=", 50],
    ["/=", 2],
    ["%=", 0],
  ];
  for (const [op, expected] of matrix) {
    const r = await js(`let x=10; x ${op} (x = 5);`);
    assert.deepEqual(errors(r), [], `x ${op} (x = 5)`);
    assert.equal(vars(r).x, expected, `x ${op} (x = 5)`);
  }
  const bare = await js("let x=10; x += x = 5;");
  assert.deepEqual(errors(bare), []);
  assert.equal(vars(bare).x, 15);
  // カンマ式の右辺（x++ の後に x を読む）
  const comma = await js("let x=10; x += (x++, x);");
  assert.deepEqual(errors(comma), []);
  assert.equal(vars(comma).x, 21);
  // 関数呼出し経由の書換え：pop() が対象の要素そのものを取り除く形
  const popStmt = await js("let a=[10]; a[0] += a.pop();");
  assert.deepEqual(errors(popStmt), []);
  assert.deepEqual(vars(popStmt).a, [20]);
  const popStmt2 = await js("let a=[10,20]; a[1] += a.pop();");
  assert.deepEqual(errors(popStmt2), []);
  assert.deepEqual(vars(popStmt2).a, [10, 40]);
  const popExpr = await js("let a=[10]; let y=(a[0] += a.pop());");
  assert.deepEqual(errors(popExpr), []);
  assert.deepEqual(vars(popExpr).a, [20]);
  assert.equal(vars(popExpr).y, 20);
});

test("follow-up: index-key side effects combine with the pre-read current value", async () => {
  // キーは RG-364 で先行評価され、現在値はその後に右辺より先に読まれる
  const keyAndRhs = await js("let a=[0,0,0]; let x=1; a[x+=1] += x++;");
  assert.deepEqual(errors(keyAndRhs), []);
  assert.deepEqual(vars(keyAndRhs).a, [0, 0, 2]);
  assert.equal(vars(keyAndRhs).x, 3);
  const keyPost = await js("let a=[10,20,30]; let x=1; a[x++] += a[x];");
  assert.deepEqual(errors(keyPost), []);
  assert.deepEqual(vars(keyPost).a, [10, 50, 30]);
  assert.equal(vars(keyPost).x, 2);
  // 右辺の添字読みがキー変数を進める形（現在値・書き込み先はキー確定時点の要素）
  const combo = await js("let a=[10,20]; let i=0; a[i] += a[i++];");
  assert.deepEqual(errors(combo), []);
  assert.deepEqual(vars(combo).a, [20, 20]);
  assert.equal(vars(combo).i, 1);
  const comboAssign = await js("let a=[10,20]; let i=0; a[i] += (i = 1);");
  assert.deepEqual(errors(comboAssign), []);
  assert.deepEqual(vars(comboAssign).a, [11, 20]);
  assert.equal(vars(comboAssign).i, 1);
});

test("follow-up: logical assignment keeps reading the current value first (statement and expression)", async () => {
  const cases = [
    // [コード, 対象変数, 期待値]
    ["let x=0; x ||= (x = 5);", "x", 5],
    ["let x=10; x ||= (x = 5);", "x", 10],
    ["let x=10; x &&= (x = 5);", "x", 5],
    ["let x=0; x &&= (x = 5);", "x", 0],
    ["let x=null; x ??= (x = 5);", "x", 5],
    ["let x=1; x ??= (x = 5);", "x", 1],
    ["let x=0; x ||= x++;", "x", 0],
    ["let x=10; x ||= x++;", "x", 10],
    ["let x=10; x &&= x++;", "x", 10],
    ["let x=0; x &&= x++;", "x", 0],
  ];
  for (const [code, name, expected] of cases) {
    const r = await js(code);
    assert.deepEqual(errors(r), [], code);
    assert.equal(vars(r)[name], expected, code);
  }
  const expr = await js("let x=10; let y=(x &&= x++);");
  assert.deepEqual(errors(expr), []);
  assert.equal(vars(expr).x, 10);
  assert.equal(vars(expr).y, 10);
  const index = await js("let a=[0]; a[0] ||= a[0]++;");
  assert.deepEqual(errors(index), []);
  assert.deepEqual(vars(index).a, [0]);
  const indexAnd = await js("let a=[5]; a[0] &&= a[0]++;");
  assert.deepEqual(errors(indexAnd), []);
  assert.deepEqual(vars(indexAnd).a, [5]);
  const member = await js("let o={v:0}; o.v ||= o.v++;");
  assert.deepEqual(errors(member), []);
  assert.deepEqual(vars(member).o, { v: 0 });
});

test("follow-up: compound assignment in loop and branch bodies, simple assignment and postfix statements stay correct", async () => {
  const whileBody = await js("let x=10; let i=0; while (i<1) { x += x++; i++; }");
  assert.deepEqual(errors(whileBody), []);
  assert.equal(vars(whileBody).x, 20);
  const ifBody = await js("let x=10; if (true) x += x++;");
  assert.deepEqual(errors(ifBody), []);
  assert.equal(vars(ifBody).x, 20);
  const forBody = await js("let x=10; for (let j=0; j<2; j++) x += x++;");
  assert.deepEqual(errors(forBody), []);
  assert.equal(vars(forBody).x, 40);
  const forUpdate = await js("let x=10; for (let i=0; i<1; i++, x += x++) {}");
  assert.deepEqual(errors(forUpdate), []);
  assert.equal(vars(forUpdate).x, 20);
  // 単純代入 x = x++ は従来から Node どおり（代入値が後置の増加を上書きする）
  const simple = await js("let x=10; x = x++;");
  assert.deepEqual(errors(simple), []);
  assert.equal(vars(simple).x, 10);
  // 後置 ++ / -- 文と式位置の値も従来どおり
  const postStmt = await js("let x=10; x++; x--;");
  assert.deepEqual(errors(postStmt), []);
  assert.equal(vars(postStmt).x, 10);
  const postExpr = await js("let x=10; let y=x++; let z=x--;");
  assert.deepEqual(errors(postExpr), []);
  assert.equal(vars(postExpr).x, 10);
  assert.equal(vars(postExpr).y, 10);
  assert.equal(vars(postExpr).z, 11);
  // **= は名指しの未対応を維持する（文レベルでも従来どおり）
  const pow = await js("let x=2; x **= 3;");
  assert.match(errors(pow)[0] || "", /\*\*= 演算子/);
});

/* ---------------- RG-364: 他方言の不変 ---------------- */
test("RG-364: other dialects keep their existing index-assignment behaviour", async () => {
  const c = await run(
    "c",
    "#include <stdio.h>\nint main() {\nint a[3] = {0,0,0}; int x = 1; a[x+=1] = 5; printf(\"%d %d\", a[2], x);\n return 0;\n}",
  );
  assert.deepEqual(errors(c), []);
  assert.deepEqual(outputs(c), ["5 2"]);
  const py = await run("python", "a = [0,0,0]\nx = 1\na[x+1] = 5\nprint(a)");
  assert.deepEqual(errors(py), []);
  assert.deepEqual(outputs(py), ["[0, 0, 5]"]);
});

/* ---------------- バッチ12追随第2段（§7.5：格納時の基底オブジェクト再評価） ----------------
   代入対象の基底オブジェクトが格納時点で再評価されていたため、右辺が
   基底変数を再束縛すると新しいオブジェクトへ黙って書いていた
   （例：a[0] = (a = [99])[0] が旧配列でなく新配列へ書く）。
   処置：RG-364 の対象解決を基底オブジェクトの捕捉まで拡張し、各
   index／member 節点で基底式をキー評価より前に一度だけ評価して
   その参照をリテラルへ置き換える（復元は従来どおり finally）。
   文代入・式代入・複合代入・論理代入・後置 ++/-- の全経路と、
   入れ子対象・キー側の再束縛・呼出し経由の再束縛で Node 実走と
   機械突合し、通常形と分割代入のタイミングが不変であることも固定する。 */
test("follow-up-2: a rebinding right-hand side still writes to the originally resolved array", async () => {
  // §7.5 の再現形（複合代入）：旧配列（b と共有）へ 109 が書かれる
  const compound = await js("let a=[10,20]; let b=a; a[0] += (a = [99])[0];");
  assert.deepEqual(errors(compound), []);
  assert.deepEqual(vars(compound).b, [109, 20]);
  assert.deepEqual(vars(compound).a, [99]);
  // 単純代入でも同じずれがあった
  const simple = await js("let a=[10,20]; let b=a; a[0] = (a = [99])[0];");
  assert.deepEqual(errors(simple), []);
  assert.deepEqual(vars(simple).b, [99, 20]);
  assert.deepEqual(vars(simple).a, [99]);
  // 式位置の単純代入・複合代入
  const exprSimple = await js("let a=[10,20]; let b=a; let y=(a[0] = (a = [99])[0]);");
  assert.deepEqual(errors(exprSimple), []);
  assert.deepEqual(vars(exprSimple).b, [99, 20]);
  assert.equal(vars(exprSimple).y, 99);
  const exprCompound = await js("let a=[10,20]; let b=a; let y=(a[0] += (a = [99])[0]);");
  assert.deepEqual(errors(exprCompound), []);
  assert.deepEqual(vars(exprCompound).b, [109, 20]);
  assert.equal(vars(exprCompound).y, 109);
  // 右辺が新しい a を読み直す形でも、格納先は旧配列のまま
  const readsNew = await js("let a=[10,20]; let b=a; a[0] = (a = [99])[0] + a[0];");
  assert.deepEqual(errors(readsNew), []);
  assert.deepEqual(vars(readsNew).b, [198, 20]);
  assert.deepEqual(vars(readsNew).a, [99]);
});

test("follow-up-2: member targets and logical assignment write to the captured base", async () => {
  const simple = await js("let o={v:10}; let p=o; o.v = (o = {v:33}).v;");
  assert.deepEqual(errors(simple), []);
  assert.deepEqual(vars(simple).p, { v: 33 });
  assert.deepEqual(vars(simple).o, { v: 33 });
  const compound = await js("let o={v:10}; let p=o; o.v += (o = {v:1}).v;");
  assert.deepEqual(errors(compound), []);
  assert.deepEqual(vars(compound).p, { v: 11 });
  assert.deepEqual(vars(compound).o, { v: 1 });
  // 論理代入（発火形は旧基底へ、短絡形は右辺自体が評価されない）
  const orFire = await js("let a=[0,20]; let b=a; a[0] ||= (a = [99])[0];");
  assert.deepEqual(errors(orFire), []);
  assert.deepEqual(vars(orFire).b, [99, 20]);
  assert.deepEqual(vars(orFire).a, [99]);
  const orShort = await js("let a=[5,20]; let b=a; a[0] ||= (a = [99])[0];");
  assert.deepEqual(errors(orShort), []);
  assert.deepEqual(vars(orShort).b, [5, 20]);
  assert.deepEqual(vars(orShort).a, [5, 20]);
  const andFire = await js("let a=[5,20]; let b=a; a[0] &&= (a = [99])[0];");
  assert.deepEqual(errors(andFire), []);
  assert.deepEqual(vars(andFire).b, [99, 20]);
  const nullish = await js("let a=[null,20]; let b=a; a[0] ??= (a = [99])[0];");
  assert.deepEqual(errors(nullish), []);
  assert.deepEqual(vars(nullish).b, [99, 20]);
  const memberLogical = await js("let o={v:0}; let p=o; o.v ||= (o = {v:44}).v;");
  assert.deepEqual(errors(memberLogical), []);
  assert.deepEqual(vars(memberLogical).p, { v: 44 });
  // 文字列キーの添字形
  const strKey = await js("let o={}; let p=o; o['k'] = (o = {k:8})['k'];");
  assert.deepEqual(errors(strKey), []);
  assert.deepEqual(vars(strKey).p, { k: 8 });
});

test("follow-up-2: compound operators with a rebinding right-hand side (index and member)", async () => {
  const matrix = [
    ["+=", 10, 99, 109],
    ["-=", 10, 99, -89],
    ["*=", 2, 99, 198],
    ["/=", 198, 99, 2],
    ["%=", 10, 99, 10],
    ["&=", 12, 99, 0],
    ["|=", 10, 99, 107],
    ["^=", 10, 99, 105],
    ["<<=", 1, 2, 4],
    [">>=", 256, 2, 64],
    [">>>=", 256, 2, 64],
  ];
  for (const [op, init, rhs, expected] of matrix) {
    const idx = await js(`let a=[${init},20]; let b=a; a[0] ${op} (a = [${rhs}])[0];`);
    assert.deepEqual(errors(idx), [], `a[0] ${op}`);
    assert.deepEqual(vars(idx).b, [expected, 20], `a[0] ${op}`);
    assert.deepEqual(vars(idx).a, [rhs], `a[0] ${op}`);
    const mem = await js(`let o={v:${init}}; let p=o; o.v ${op} (o = {v:${rhs}}).v;`);
    assert.deepEqual(errors(mem), [], `o.v ${op}`);
    assert.deepEqual(vars(mem).p, { v: expected }, `o.v ${op}`);
    assert.deepEqual(vars(mem).o, { v: rhs }, `o.v ${op}`);
  }
});

test("follow-up-2: key-side rebinding, call-mediated rebinding and nested targets", async () => {
  // キー自身が基底変数を再束縛する形でも、格納先は捕捉済みの旧基底
  const keyRebinds = await js("let a=[10,20]; let b=a; let x=9; a[x = (a = [99], 0)] = 5;");
  assert.deepEqual(errors(keyRebinds), []);
  assert.deepEqual(vars(keyRebinds).b, [5, 20]);
  assert.deepEqual(vars(keyRebinds).a, [99]);
  assert.equal(vars(keyRebinds).x, 0);
  // キーは旧配列から読み、右辺がキー側・基底側の両方を再束縛する形
  const keyFromOld = await js("let a=[10,20]; let c=a; let b=[0]; a[b[0]] = (b = [1], (a = [99])[0]);");
  assert.deepEqual(errors(keyFromOld), []);
  assert.deepEqual(vars(keyFromOld).c, [99, 20]);
  assert.deepEqual(vars(keyFromOld).a, [99]);
  assert.deepEqual(vars(keyFromOld).b, [1]);
  // 関数呼出しの引数経由で再束縛される形
  const callMediated = await js("let a=[10,20]; let b=a; a[0] = Math.abs((a = [99], -5));");
  assert.deepEqual(errors(callMediated), []);
  assert.deepEqual(vars(callMediated).b, [5, 20]);
  assert.deepEqual(vars(callMediated).a, [99]);
  // 入れ子対象 a[0][1]（単純・複合）とメンバー／添字の混在チェーン
  const nested = await js("let a=[[1,2],[3,4]]; let b=a; let c=a[0]; a[0][1] = (a = [[9]])[0][0];");
  assert.deepEqual(errors(nested), []);
  assert.deepEqual(vars(nested).c, [1, 9]);
  assert.deepEqual(vars(nested).b, [[1, 9], [3, 4]]);
  assert.deepEqual(vars(nested).a, [[9]]);
  const nestedCompound = await js("let a=[[1,2],[3,4]]; let c=a[0]; a[0][1] += (a = [[9]])[0][0];");
  assert.deepEqual(errors(nestedCompound), []);
  assert.deepEqual(vars(nestedCompound).c, [1, 11]);
  const deep = await js("let o={p:{q:[10,20]}}; let arr=o.p.q; o.p.q[1] = (o = {p:{q:[77]}}).p.q[0];");
  assert.deepEqual(errors(deep), []);
  assert.deepEqual(vars(deep).arr, [10, 77]);
  const indexMember = await js("let a=[{v:10}]; let e=a[0]; a[0].v = (a = [{v:55}])[0].v;");
  assert.deepEqual(errors(indexMember), []);
  assert.deepEqual(vars(indexMember).e, { v: 55 });
  // ループ反復ごとに捕捉と復元が繰り返されること（後続文は新しい a を使う）
  const loop = await js("let a=[0]; let b=a; for (let i=0; i<2; i++) { a[0] = (a = [i])[0]; } a[0] = 7;");
  assert.deepEqual(errors(loop), []);
  assert.deepEqual(vars(loop).b, [0]);
  assert.deepEqual(vars(loop).a, [7]);
});

test("follow-up-2: ordinary forms, postfix and destructuring timing are unchanged", async () => {
  const normal = await js("let a=[10,20]; a[0] = 5; a[1] += 5;");
  assert.deepEqual(errors(normal), []);
  assert.deepEqual(vars(normal).a, [5, 25]);
  const member = await js("let o={v:10}; o.v = 3;");
  assert.deepEqual(errors(member), []);
  assert.deepEqual(vars(member).o, { v: 3 });
  // 後置 ++/-- は別名経由でも従来どおり対象そのものを増減する
  const post = await js("let a=[10,20]; let b=a; let y=a[0]++; a[1]--;");
  assert.deepEqual(errors(post), []);
  assert.deepEqual(vars(post).b, [11, 19]);
  assert.equal(vars(post).y, 10);
  const postMember = await js("let o={v:10}; let p=o; o.v--;");
  assert.deepEqual(errors(postMember), []);
  assert.deepEqual(vars(postMember).p, { v: 9 });
  // 分割代入は右辺評価の後にパターン参照を解決する実 JavaScript の
  // タイミングを維持する（本処置の捕捉は分割代入には適用しない）
  const destructure = await js("let a=[10,20]; let b=a; [a[0]] = [(a = [99])[0]];");
  assert.deepEqual(errors(destructure), []);
  assert.deepEqual(vars(destructure).a, [99]);
  assert.deepEqual(vars(destructure).b, [10, 20]);
  const len = await js("let a=[10,20,30]; a.length = 1;");
  assert.deepEqual(errors(len), []);
  assert.deepEqual(vars(len).a, [10]);
});
