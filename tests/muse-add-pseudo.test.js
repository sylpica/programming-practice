// 第16種「IPA擬似言語」の新規実装（MUSE-ADD-PSEUDO）の検証。
// 一次情報：IPA 用語 Ver.5.1 別紙2「擬似言語の記述形式」と科目Bサンプル問題・
// 令和6年度・令和7年度公開問題の実例。裁定 C1〜C11 は docs/audit/MUSE-ADD-PSEUDO.md。
import test from "node:test";
import assert from "node:assert/strict";
import { definitions, getDefinition } from "../js/types/registry.js";

const pseudo = getDefinition("pseudo");
const run = (code, model) => pseudo.simulate(code, model || { globals: {}, args: [] });
const entry = (path, name) => path.groups.flatMap((g) => g.entries).find(([n]) => n === name)?.[1];

test("MUSE-ADD-PSEUDO 種類が16種目として登録され、全項目が対応済み", () => {
  assert.equal(definitions.length, 16);
  assert.equal(pseudo.name, "IPA擬似言語");
  assert.equal(pseudo.reference.length, 53);
  assert.ok(pseudo.reference.every((item) => item.supported === true));
  assert.equal(pseudo.templates.length, 8);
});

test("MUSE-ADD-PSEUDO fee（サンプル問1）：未知の引数で3パスに分かれ 100/300/500", () => {
  const code = pseudo.templates.find((t) => t.id === "pseudo-fee").code;
  const result = run(code);
  assert.equal(result.error, undefined);
  assert.equal(result.paths.length, 3);
  assert.deepEqual(result.paths.map((p) => p.vars["戻り値"]), [100, 300, 500]);
  // 引数をモデルで与えれば1パスに定まる
  const fixed = run(code, { globals: {}, args: [5] });
  assert.equal(fixed.paths.length, 1);
  assert.equal(fixed.paths[0].vars["戻り値"], 300);
});

test("MUSE-ADD-PSEUDO 演算子：整数÷は商、実数÷は実数除算、mod は余り（C1）", () => {
  const result = run(pseudo.templates.find((t) => t.id === "pseudo-calc").code);
  const vars = result.paths[0].vars;
  assert.equal(vars.q, 3);
  assert.equal(vars.r, 1);
  assert.equal(vars.d, 3.5);
  assert.equal(vars.s, 15);
  // 実数型の変数経由でも実数除算になる
  const viaVar = run("実数型: x ← 7\nx ← x ÷ 2");
  assert.equal(viaVar.paths[0].vars.x, 3.5);
  // 負数の商は0方向への切捨て
  const neg = run("整数型: q ← -7 ÷ 2\n整数型: r ← -7 mod 2");
  assert.equal(neg.paths[0].vars.q, -3);
  assert.equal(neg.paths[0].vars.r, -1);
});

test("MUSE-ADD-PSEUDO 配列の逆順（サンプル問2）：参照渡しで大域変数が反転する", () => {
  const result = run(pseudo.templates.find((t) => t.id === "pseudo-reverse").code);
  assert.deepEqual(result.paths[0].vars.data, [40, 30, 20, 10]);
});

test("MUSE-ADD-PSEUDO 疎行列変換（サンプル問4方式）：個数・列・値の並びになる", () => {
  const result = run(pseudo.templates.find((t) => t.id === "pseudo-sparse").code);
  const sm = result.paths[0].vars.sparseMatrix;
  assert.deepEqual(sm[0].slice(0, 3), [1, 1, 5]);
  assert.deepEqual(sm[1].slice(0, 1), [0]);
  assert.deepEqual(sm[2].slice(0, 3), [1, 3, 2]);
  assert.equal(sm[0][3], null, "未使用の場所は未定義（vars では null）");
  assert.match(entry(result.paths[0], "sparseMatrix"), /未定義/);
});

test("MUSE-ADD-PSEUDO スタック（R7問3方式）：push/pop と未定義の値", () => {
  const result = run(pseudo.templates.find((t) => t.id === "pseudo-stack").code);
  const vars = result.paths[0].vars;
  assert.equal(vars.x, 20);
  assert.equal(vars.top, 1);
  assert.deepEqual(vars.stk, [10, null, null]);
});

test("MUSE-ADD-PSEUDO リスト追加（サンプル問3方式）：未定義でない、で末尾までたどる", () => {
  const result = run(`大域: ListElement: head ← ListElement("a")
○append(文字型: qVal)
  ListElement: prev, curr
  curr ← ListElement(qVal)
  prev ← head
  while (prev.next が 未定義でない)
    prev ← prev.next
  endwhile
  prev.next ← curr
append("b")`);
  assert.equal(result.paths[0].error, undefined);
  assert.deepEqual(result.paths[0].vars.head, { next: {} });
});

test("MUSE-ADD-PSEUDO 日本語の文：末尾追加・値を増やす・出力する", () => {
  const appended = run("整数型の配列: a ← {1, 2}\naの末尾 に 3の値 を追加する");
  assert.deepEqual(appended.paths[0].vars.a, [1, 2, 3]);
  const out = run("整数型: a ← 1\n整数型: b ← 2\naの値とbの値をこの順にコンマ区切りで出力する\naの値を1増やす");
  assert.deepEqual(out.paths[0].outputs.map((o) => o.text), ["1, 2"]);
  assert.equal(out.paths[0].vars.a, 2);
});

test("MUSE-ADD-PSEUDO 制御：do は後判定、for-each、ラベル付き終了", () => {
  const doResult = run("整数型: i ← 1\ndo\n  i ← i + 1\nwhile (i ≦ 3)");
  assert.equal(doResult.paths[0].vars.i, 4);
  const each = run("整数型の配列: a ← {5, 7, 9}\n整数型: total ← 0\nfor (xにaの要素を順に代入する)\n  total ← total + x\nendfor");
  assert.equal(each.paths[0].vars.total, 21);
  const brk = run("整数型: i ← 0\nwhile (i < 10)  // α\n  i ← i + 1\n  if (i = 3)\n    αの行から始まる繰返し処理を終了する\n  endif\nendwhile");
  assert.equal(brk.paths[0].vars.i, 3);
  // ラベルなしの終了
  const brk2 = run("整数型: i ← 0\nwhile (i < 10)\n  i ← i + 1\n  if (i = 2)\n    繰返し処理を終了する\n  endif\nendwhile");
  assert.equal(brk2.paths[0].vars.i, 2);
});

test("MUSE-ADD-PSEUDO 文字列：文字数・文字目の文字・連結（C2）", () => {
  const result = run("文字列型: s ← \"abc\"\n整数型: n ← sの文字数\n文字型: c ← s の 2文字目の文字\n文字列型: t ← s + \"d\"");
  assert.equal(result.paths[0].vars.n, 3);
  assert.equal(result.paths[0].vars.c, "b");
  assert.equal(result.paths[0].vars.t, "abcd");
});

test("MUSE-ADD-PSEUDO 二次元：a[i, j] と a[i][j] の両形式・行数・列数（C4）", () => {
  const result = run("整数型の二次元配列: m ← {{1, 2}, {3, 4}}\n整数型: a ← m[2, 1]\n整数型: b ← m[2][2]\n整数型: rn ← mの行数\n整数型: cn ← mの列数");
  const vars = result.paths[0].vars;
  assert.deepEqual([vars.a, vars.b, vars.rn, vars.cn], [3, 4, 2, 2]);
});

test("MUSE-ADD-PSEUDO 未定義：宣言のみは未定義、判定と再代入（C6）", () => {
  const result = run("整数型: x\n論理型: b ← x が 未定義である\nx ← 5\n論理型: c ← x が 未定義でない");
  assert.equal(result.paths[0].vars.b, true);
  assert.equal(result.paths[0].vars.c, true);
  // 未定義のまま演算すると名指しエラー
  const bad = run("整数型: x\n整数型: y ← x + 1");
  assert.match(bad.paths[0].error.message, /未定義の値では演算できません/);
});

test("MUSE-ADD-PSEUDO 宣言なし代入は許し、未宣言の読取りはエラー（C9）", () => {
  const ok = run("u ← 3\nu ← u + 1");
  assert.equal(ok.paths[0].vars.u, 4);
  const bad = run("整数型: y ← z + 1");
  assert.match(bad.paths[0].error.message, /宣言も代入もされていません/);
});

test("MUSE-ADD-PSEUDO 未定義の関数は未確定値になり、エラーにしない", () => {
  const result = run("整数型: y ← mystery(3)");
  assert.equal(result.paths[0].error, undefined);
  assert.match(String(result.paths[0].vars.y), /実行時に決まる/);
  assert.ok(result.paths[0].trace.some((s) => /定義されていないため/.test(s.text)));
});

test("MUSE-ADD-PSEUDO 名指し停止：範囲外添字・0除算・構文エラー・未対応形式", () => {
  const oob = run("整数型の配列: a ← {1, 2}\n整数型: v ← a[5]");
  assert.match(oob.paths[0].error.message, /要素番号 5 は範囲外/);
  const div0 = run("整数型: q ← 7 ÷ 0");
  assert.match(div0.paths[0].error.message, /0で割ることはできません/);
  const syntax = run("if (x > 1)\n  x ← 2");
  assert.equal(syntax.paths.length, 0);
  assert.match(syntax.error.message, /endif が必要です/);
  const decrease = run("for (i を 5 から 1 まで 1 ずつ減らす)\nendfor");
  assert.equal(decrease.error.category, "未対応");
  const star = run("整数型: a ← 3 * 4");
  assert.equal(star.error.category, "未対応");
  assert.match(star.error.message, /× を使います/);
});

test("MUSE-ADD-PSEUDO サイズ指定生成と for の変形（R7問1方式）", () => {
  const fill = run("整数型の配列: a ← {3個の 0}\n整数型の二次元配列: m ← {2行2列の 未定義の値}");
  assert.deepEqual(fill.paths[0].vars.a, [0, 0, 0]);
  assert.deepEqual(fill.paths[0].vars.m, [[null, null], [null, null]]);
  const variant = run("整数型: total ← 0\nfor (i を 1から始めて7を超えない範囲で3ずつ増やす)\n  total ← total + i\nendfor");
  assert.equal(variant.paths[0].vars.total, 1 + 4 + 7);
});

test("MUSE-ADD-PSEUDO scan は実在項目だけを返し、トレースの参照も実在のみ", () => {
  const scanned = pseudo.scan(pseudo.templates.find((t) => t.id === "pseudo-fee").code);
  const names = new Set(pseudo.reference.map((item) => item.name));
  assert.ok(scanned.length > 0 && scanned.every((name) => names.has(name)));
  assert.ok(scanned.includes("日本語の条件句"));
  assert.ok(!scanned.includes("関係演算子"), "日本語の条件句は関係演算子と数えない");
  const result = run(pseudo.templates.find((t) => t.id === "pseudo-sparse").code);
  for (const path of result.paths) {
    for (const step of path.trace) for (const ref of step.refs) assert.ok(names.has(ref), `未知の参照 ${ref}`);
  }
});

test("MUSE-ADD-PSEUDO 独立検証の差し戻し4件の回帰（総量上限・実数性の伝播・要素の和・C2の範囲）", () => {
  // 問題1: 二次元サイズ生成の総量上限
  const huge = run("整数型の二次元配列: m ← {10000行10000列の 0}");
  assert.match(huge.paths[0].error.message, /要素数の指定が大きすぎます/);
  const atCap = run("整数型の二次元配列: m ← {100行100列の 0}\n整数型: n ← mの行数");
  assert.equal(atCap.paths[0].vars.n, 100);
  // 問題2: 宣言なし変数・配列要素を跨いでも小数点リテラルの実数性が残る
  const viaVar = run("x ← 7.0\ny ← x ÷ 2");
  assert.equal(viaVar.paths[0].vars.y, 3.5);
  const viaElem = run("a ← {7.0, 8}\ny ← a[1] ÷ 2\nz ← a[2] ÷ 2");
  assert.equal(viaElem.paths[0].vars.y, 3.5);
  assert.equal(viaElem.paths[0].vars.z, 4);
  // 宣言型がある場合は型が優先する（整数型に 7.0 を入れても商）
  const declared = run("整数型: x ← 7.0\ny ← x ÷ 2");
  assert.equal(declared.paths[0].vars.y, 3);
  // 問題3: 要素の和・行番号／列番号の要素の和（令和7年度問5の形）
  const sums = run("整数型の配列: a ← {1, 2, 3}\n整数型: s ← aの要素の和");
  assert.equal(sums.paths[0].vars.s, 6);
  const r7 = run(`○実数型の二次元配列: f(実数型の二次元配列: data)
  実数型: t ← dataの要素の和
  整数型: row ← dataの行数
  整数型: col ← dataの列数
  実数型の二次元配列: result ← {row行col列の 未定義の値}
  整数型: r, c
  for (r を 1 から row まで 1 ずつ増やす)
    for (c を 1 から col まで 1 ずつ増やす)
      result[r, c] ← (dataの行番号rの要素の和) × (dataの列番号cの要素の和) ÷ t
    endfor
  endfor
  return result
実数型の二次元配列: ans ← f({{10, 20}, {30, 40}})`);
  assert.deepEqual(r7.paths[0].vars.ans, [[12, 18], [28, 42]]);
  // 参考観察: C2 の範囲は文字列どうしまで（文字列+数値は名指し停止）
  const mixed = run('文字列型: s ← "a" + 1');
  assert.match(mixed.paths[0].error.message, /文字列とつなげられるのは/);
  // 再検証 N1: 型宣言のない関数の戻り値を跨いでも実数性が残る（型宣言があれば型が優先）
  const untyped = run("○get()\n  return 7.0\nv ← get()\nx ← v ÷ 2");
  assert.equal(untyped.paths[0].vars.x, 3.5);
  const untypedLocal = run("○get()\n  実数型: t ← 7\n  return t\nx ← get() ÷ 2");
  assert.equal(untypedLocal.paths[0].vars.x, 3.5);
  const typedInt = run("○整数型: get()\n  return 7.0\nx ← get() ÷ 2");
  assert.equal(typedInt.paths[0].vars.x, 3);
});

test("MUSE-ADD-PSEUDO 独立検証第3回の別件観察：関数内部で分岐する呼出しを右辺に置いても代入が全パスに残る", () => {
  const forkFn = `○整数型: get(整数型: n)
  if (n > 0)
    return 100
  else
    return 200
  endif
`;
  // 宣言なし変数への代入（真パス＝複製された状態でも値が残る）
  const plain = run(forkFn + "u ← mystery()\nv ← get(u)");
  assert.deepEqual(plain.paths.map((p) => p.vars.v).sort(), [100, 200]);
  // 宣言済み変数への再代入と後続の計算
  const pre = run(forkFn + "整数型: v ← 0\nu ← mystery()\nv ← get(u)\nw ← v ÷ 2");
  assert.deepEqual(pre.paths.map((p) => [p.vars.v, p.vars.w]).sort((a, b) => a[0] - b[0]), [[100, 50], [200, 100]]);
  // 宣言の初期化式の中の呼出し
  const declInit = run(forkFn + "u ← mystery()\n整数型: v ← get(u)");
  assert.deepEqual(declInit.paths.map((p) => p.vars.v).sort(), [100, 200]);
  // 末尾に追加する値の中の呼出し
  const append = run(forkFn + "整数型の配列: a ← {}\nu ← mystery()\naの末尾に get(u) を追加する");
  assert.deepEqual(append.paths.map((p) => p.vars.a[0]).sort(), [100, 200]);
  // 「の値を〜増やす」の増分に式を書いた場合は、誤解を招く別文の文言でなく専用の名指し停止にする
  const incrExpr = run("整数型: cnt ← 0\ncnt の値を one(1) 増やす");
  assert.match(incrExpr.error.message, /増分は数値で書きます/);
});

test("MUSE-ADD-PSEUDO 独立検証第4回の新規問題：代入先の添字式が分岐しても書き込みが混線しない", () => {
  const idxFn = `○整数型: idx(整数型: n)
  if (n > 0)
    return 1
  else
    return 2
  endif
`;
  const plain = run(idxFn + "整数型の配列: a ← {0, 0}\nu ← mystery()\na[idx(u)] ← 7");
  assert.deepEqual(plain.paths.map((p) => p.vars.a), [[7, 0], [0, 7]]);
  const incr = run(idxFn + "整数型の配列: a ← {0, 0}\nu ← mystery()\na[idx(u)] の値を 5 増やす");
  assert.deepEqual(incr.paths.map((p) => p.vars.a), [[5, 0], [0, 5]]);
  const nested = run(idxFn + "整数型の二次元配列: m ← {{0, 0}, {0, 0}}\nu ← mystery()\nm[idx(u)][2] ← 9");
  assert.deepEqual(nested.paths.map((p) => p.vars.m), [[[0, 9], [0, 0]], [[0, 0], [0, 9]]]);
  const comma = run(idxFn + "整数型の二次元配列: m ← {{0, 0}, {0, 0}}\nu ← mystery()\nm[idx(u), 1] ← 9");
  assert.deepEqual(comma.paths.map((p) => p.vars.m), [[[9, 0], [0, 0]], [[0, 0], [9, 0]]]);
});

test("MUSE-ADD-PSEUDO テンプレートと全項目の例が全て正常に実行できる", () => {
  for (const template of pseudo.templates) {
    const result = run(template.code);
    assert.equal(result.error, undefined, `${template.id} が致命的エラー`);
    assert.ok(result.paths.length >= 1, template.id);
    for (const path of result.paths) assert.equal(path.error, undefined, `${template.id} のパスエラー: ${path.error?.message}`);
    for (const ref of template.refs) assert.ok(pseudo.reference.some((item) => item.name === ref), `${template.id} の参照 ${ref} が実在しない`);
  }
  for (const item of pseudo.reference) {
    const result = run(item.example);
    assert.equal(result.error, undefined, `項目 ${item.name} の例が致命的エラー: ${result.error?.message}`);
    assert.ok(result.paths.length >= 1, item.name);
    for (const path of result.paths) assert.equal(path.error, undefined, `項目 ${item.name} の例のパスエラー: ${path.error?.message}`);
  }
});
