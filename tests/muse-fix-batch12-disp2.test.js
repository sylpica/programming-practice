// バッチ12（C家族・表示追随班）修正の回帰テスト。台帳 RG-379。
// 対象：semantics 表明文の「スコープのシャドーイングは未対応」と、
// declare 実行時文言「この初版は同名変数の再宣言・スコープの
// シャドーイングに対応していません」が実挙動と食い違っていた件。
// 実挙動の全数マッピング（本ファイルの各テストが固定する範囲）：
// - C／C++：内側ブロック・for 初期化部・while／if／do-while 本体での
//   同名再宣言（同型・異型とも）は受理され、ブロックを抜けると外側の
//   変数（値・型）が戻る。gcc／g++ 13.3 実走と一致。
// - C#：入れ子関係の同名宣言は全位置で CS0136 として停止し、兄弟
//   ブロック・連続する for の再利用は受理。dotnet 8.0.428 実走と一致。
// - 同じスコープでの再宣言は全言語で「同じスコープで名前が重複して
//   います」として停止（実物でもエラー）。
// 表明文は言語で出し分け、実行時文言は同一スコープの重複として
// 名指す形に是正した。挙動（受理・停止の別）自体は変更していない。
// 実物との既知の差異（観察として報告済み・本バッチでは是正しない）を
// 固定するテストには、その旨を明記した（D1／D2）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
// 出力テキストを全て連結し、区切り（| と改行）を除いて比べる。
const flat = (r) =>
  (r.paths || []).flatMap((p) => p.outputs.map((o) => o.text)).join("").replace(/[|\n]/g, "");
const wrap = {
  c: (b) => `#include <stdio.h>\nint main() {\n${b}\n return 0;\n}`,
  cpp: (b) => `#include <iostream>\n#include <string>\nint main() {\n${b}\n return 0;\n}`,
  csharp: (b) => `using System;\nclass Program {\n static void Main() {\n${b}\n }\n}`,
};
const P = {
  c: (e) => `printf("%d|", ${e});`,
  cpp: (e) => `std::cout << ${e} << "|";`,
  csharp: (e) => `Console.WriteLine(${e});`,
};
const D = {
  c: (e) => `printf("%f|", ${e});`,
  cpp: (e) => `std::cout << ${e} << "|";`,
  csharp: (e) => `Console.WriteLine(${e});`,
};
const OLD_MSG = "この初版は同名変数";

/* ---------- C／C++：内側ブロックのシャドーイングは動作する ---------- */
test("RG-379: C/C++ inner-block shadowing works (same/different type, restore, depth)", async () => {
  for (const id of ["c", "cpp"]) {
    const cases = [
      // 同型シャドーイング＋ブロック後の外側の復帰。
      [`int a = 1; { int a = 2; ${P[id]("a")} } ${P[id]("a")}`, "21"],
      // 異型シャドーイング（double で隠し、抜けると int の外側に戻る）。
      [`int a = 1; { double a = 2.5; ${D[id]("a")} } ${P[id]("a")}`, id === "c" ? "2.5000001" : "2.51"],
      // 内側での代入は外側へ漏れない。
      [`int a = 1; { int a = 2; a = 9; ${P[id]("a")} } ${P[id]("a")}`, "91"],
      // 入れ子2段・3段（各段で隠し、抜けるごとに一段外へ戻る）。
      [`int a = 1; { int a = 2; { int a = 3; ${P[id]("a")} } ${P[id]("a")} } ${P[id]("a")}`, "321"],
      [`int a = 1; { int a = 2; { int a = 3; { int a = 4; ${P[id]("a")} } ${P[id]("a")} } ${P[id]("a")} } ${P[id]("a")}`, "4321"],
      // 再宣言せず内側から外側を使う・書き換える形は従来どおり。
      [`int a = 1; { a = 2; ${P[id]("a")} } ${P[id]("a")}`, "22"],
      // 兄弟ブロック同士の同名はそれぞれ独立。
      [`{ int a = 2; ${P[id]("a")} } { int a = 3; ${P[id]("a")} }`, "23"],
      // 内側が先・外側の宣言が後でもよい（ブロックが閉じれば名前は戻る）。
      [`{ int a = 2; ${P[id]("a")} } int a = 1; ${P[id]("a")}`, "21"],
      // 配列・文字列（C++）の異型シャドーイング。
      ...(id === "c"
        ? [[`int a[2] = {1, 2}; { int a[2] = {3, 4}; ${P[id]("a[0]")} } ${P[id]("a[0]")}`, "31"]]
        : [[`int a = 1; { std::string a = "x"; std::cout << a << "|"; } ${P[id]("a")}`, "x1"]]),
    ];
    for (const [body, expected] of cases) {
      const r = await run(id, wrap[id](body));
      assert.deepEqual(errors(r), [], `${id} ${body} -> ${JSON.stringify(errors(r))}`);
      assert.equal(flat(r), expected, `${id} ${body}`);
    }
    // 文の断片（main 無し）でも同じ。
    const frag = await run(id, `int a = 1; { int a = 2; ${P[id]("a")} } ${P[id]("a")}`);
    assert.deepEqual(errors(frag), [], `${id} fragment`);
    assert.equal(flat(frag), "21", `${id} fragment`);
  }
});

test("RG-379: C/C++ shadowing at for-init, while, if and do-while positions", async () => {
  for (const id of ["c", "cpp"]) {
    const cond = "1";
    const cases = [
      // for 初期化部で外側を隠す（同型）。ループ後は外側が戻る。
      [`int i = 99; int s = 0; for (int i = 0; i < 3; i++) { s += i; } ${P[id]("s")} ${P[id]("i")}`, "399"],
      // for 初期化部の異型シャドーイング。
      [`int i = 99; int c = 0; for (double i = 0; i < 2; i++) { c++; } ${P[id]("c")} ${P[id]("i")}`, "299"],
      // while 本体ブロックでのシャドーイング。
      [`int a = 1; int n = 0; while (n < 1) { int a = 2; ${P[id]("a")} n++; } ${P[id]("a")}`, "21"],
      // if 本体ブロックでのシャドーイング。
      [`int a = 1; if (${cond}) { int a = 2; ${P[id]("a")} } ${P[id]("a")}`, "21"],
      // do-while 本体ブロックでのシャドーイング。
      [`int a = 1; int n = 0; do { int a = 2; ${P[id]("a")} n++; } while (n < 1); ${P[id]("a")}`, "21"],
      // 入れ子 for の初期化部が外側ループ変数を隠す。
      [`for (int i = 0; i < 1; i++) { for (int i = 0; i < 1; i++) { ${P[id]("i")} } }`, "0"],
      // for 本体の二重に入れ子にしたブロックがループ変数を隠す
      // （実 C／C++ でも合法）。
      [`for (int i = 0; i < 1; i++) { { int i = 5; ${P[id]("i")} } }`, "5"],
    ];
    for (const [body, expected] of cases) {
      const r = await run(id, wrap[id](body));
      assert.deepEqual(errors(r), [], `${id} ${body} -> ${JSON.stringify(errors(r))}`);
      assert.equal(flat(r), expected, `${id} ${body}`);
    }
  }
});

/* ---------- 全言語：同じスコープの再宣言は重複として停止 ---------- */
test("RG-379: same-scope redeclaration stops as a duplicate in C/C++/C# (never as shadowing)", async () => {
  for (const id of ["c", "cpp", "csharp"]) {
    const bodies = [
      `int a = 1; int a = 2; ${P[id]("a")}`,
      `int a = 1; double a = 2.5; ${P[id]("a")}`,
      `int a = 1, a = 2; ${P[id]("a")}`,
      `{ int a = 1; int a = 2; ${P[id]("a")} }`,
    ];
    for (const body of bodies) {
      const r = await run(id, wrap[id](body));
      assert.ok(
        errors(r).some((e) => e.includes("同じスコープで名前が重複しています：a")),
        `${id} ${body} -> ${JSON.stringify(errors(r))}`,
      );
      assert.ok(!errors(r).some((e) => e.includes(OLD_MSG)), `${id} ${body}`);
      assert.ok(!errors(r).some((e) => e.includes("シャドーイング")), `${id} ${body}`);
    }
  }
});

/* ---------- C#：入れ子同名は CS0136、兄弟・再利用は合法 ---------- */
test("RG-379: C# nested same-name declarations stop with CS0136 at every position", async () => {
  const W = P.csharp;
  const bodies = [
    `int a = 1; { int a = 2; ${W("a")} } ${W("a")}`,
    `int a = 1; { double a = 2.5; ${W("a")} } ${W("a")}`,
    `int a = 1; { int a = 2; { int a = 3; ${W("a")} } }`,
    `int i = 99; int s = 0; for (int i = 0; i < 3; i++) { s += i; } ${W("s")}`,
    `for (int i = 0; i < 1; i++) { int i = 5; ${W("i")} }`,
    `int a = 1; int n = 0; while (n < 1) { int a = 2; ${W("a")} n++; }`,
    `int a = 1; if (true) { int a = 2; ${W("a")} }`,
    `int a = 1; int n = 0; do { int a = 2; ${W("a")} n++; } while (n < 1);`,
    `{ int a = 2; ${W("a")} } int a = 1; ${W("a")}`,
    `for (int i = 0; i < 1; i++) { } int i = 5; ${W("i")}`,
    `int x = 9; int[] arr = {1, 2}; foreach (int x in arr) { ${W("x")} }`,
    `int[] arr = {1, 2}; foreach (int x in arr) { int x = 5; ${W("x")} }`,
    `for (int i = 0; i < 1; i++) { for (int i = 0; i < 1; i++) { ${W("i")} } }`,
  ];
  for (const body of bodies) {
    const r = await run("csharp", wrap.csharp(body));
    assert.ok(
      errors(r).some((e) => e.includes("CS0136")),
      `${body} -> ${JSON.stringify(errors(r))}`,
    );
    assert.ok(!errors(r).some((e) => e.includes(OLD_MSG)), body);
  }
});

test("RG-379: C# sibling blocks and sequential loops may reuse a name", async () => {
  const W = P.csharp;
  const cases = [
    [`{ int a = 2; ${W("a")} } { int a = 3; ${W("a")} }`, "23"],
    [`int s = 0; for (int i = 0; i < 2; i++) { s += i; } for (int i = 0; i < 2; i++) { s += i; } ${W("s")}`, "2"],
    [`int s = 0; for (int i = 0; i < 2; i++) { s += i; } { int i = 7; ${W("i")} } ${W("s")}`, "71"],
    [`int a = 1; { a = 2; ${W("a")} } ${W("a")}`, "22"],
    [`int n = 0; int s = 0; while (n < 3) { int t = n * 2; s += t; n++; } ${W("s")}`, "6"],
  ];
  for (const [body, expected] of cases) {
    const r = await run("csharp", wrap.csharp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.equal(flat(r), expected, body);
  }
});

/* ---------- 表明文：実挙動と一致すること ---------- */
test("RG-379: semantics support text matches the shadowing behaviour per language", () => {
  for (const id of ["c", "cpp"]) {
    const support = getDefinition(id).semantics.support;
    assert.ok(support.includes("シャドーイング）に対応します"), `${id}: ${support}`);
    assert.ok(support.includes("ブロックを抜けると外側の変数に戻ります"), `${id}: ${support}`);
    assert.ok(support.includes("同じスコープでの同名の再宣言はエラーとして停止します"), `${id}: ${support}`);
    assert.ok(support.includes("大域変数と同名の変数を main の直下で宣言する形は、同一スコープとして停止します"), `${id}: ${support}`);
    assert.ok(!/未対応：[^。]*シャドーイング/.test(support), `${id}: ${support}`);
  }
  const csSupport = getDefinition("csharp").semantics.support;
  assert.ok(csSupport.includes("CS0136 として停止します"), csSupport);
  assert.ok(csSupport.includes("兄弟ブロック同士の同名宣言は対応します"), csSupport);
  assert.ok(csSupport.includes("同じスコープでの同名の再宣言はエラーとして停止します"), csSupport);
  assert.ok(!/未対応：[^。]*シャドーイング/.test(csSupport), csSupport);
  // RG-375 で是正した複数宣言子・多次元配列の表明は全言語で維持する。
  for (const id of ["c", "cpp", "csharp"]) {
    const support = getDefinition(id).semantics.support;
    assert.ok(support.includes("複数宣言子"), `${id}: ${support}`);
    assert.ok(support.includes("多次元配列にも対応します"), `${id}: ${support}`);
    assert.ok(support.includes("型推論（auto / var）"), `${id}: ${support}`);
    assert.ok(!support.includes("スコープのシャドーイング。"), `${id}: ${support}`);
  }
});

/* ---------- 関数パラメータ相当の位置は存在しないことの固定 ---------- */
test("RG-379: user-defined functions stop as unsupported, so no parameter shadowing surface exists", async () => {
  const defs = {
    c: `#include <stdio.h>\nint f(int a) { return a; }\nint main() { printf("%d", f(3)); return 0; }`,
    cpp: `#include <iostream>\nint f(int a) { return a; }\nint main() { std::cout << f(3); return 0; }`,
  };
  for (const id of ["c", "cpp"]) {
    const r = await run(id, defs[id]);
    assert.ok(
      errors(r).some((e) => e.includes("ユーザ定義関数 f の定義は未対応です")),
      `${id} -> ${JSON.stringify(errors(r))}`,
    );
  }
});

/* ---------- 実物との既知の差異（観察 D1／D2・現行挙動の固定） ---------- */
// D1：C++ では for 本体の最外ブロック（および括弧なし本体）でループ
// 変数を再宣言する形は実 g++ 13.3 が redeclaration エラーにするが、
// アプリは現在 C と同じく受理する。C# は実物どおり CS0136。
// 挙動の是正は共有スコープ機構に触れるため本バッチでは行わず、
// 観察として報告した。是正が決まったら本テストを更新すること。
test("RG-379 (observation D1): C++ for-body outermost redeclaration of the loop variable is currently accepted", async () => {
  const cppR = await run("cpp", wrap.cpp(`for (int i = 0; i < 1; i++) { int i = 5; ${P.cpp("i")} }`));
  assert.deepEqual(errors(cppR), []);
  assert.equal(flat(cppR), "5");
  const cR = await run("c", wrap.c(`for (int i = 0; i < 1; i++) { int i = 5; ${P.c("i")} }`));
  assert.deepEqual(errors(cR), []);
  assert.equal(flat(cR), "5");
  const csR = await run("csharp", wrap.csharp(`for (int i = 0; i < 1; i++) { int i = 5; ${P.csharp("i")} }`));
  assert.ok(errors(csR).some((e) => e.includes("CS0136")));
});

// D2：C／C++ の大域変数と同名の変数を main の直下で宣言する形は、
// 実物ではシャドーイングとして合法だが、アプリは入口ブロックに
// 大域宣言と main 本体を平坦化するため同一スコープとして停止する
// （表明文にもその旨を明記した）。main 内の内側ブロックからは
// 大域変数を隠せる。是正が決まったら本テストと表明文を更新すること。
test("RG-379 (observation D2): a global can be shadowed from inner blocks but not at main's top level", async () => {
  for (const id of ["c", "cpp"]) {
    const pre = id === "c" ? `#include <stdio.h>\nint a = 1;\n` : `#include <iostream>\nint a = 1;\n`;
    const mainOpen = `int main() {\n`;
    const mainClose = id === "c" ? ` return 0;\n}` : ` return 0;\n}`;
    const top = await run(id, `${pre}${mainOpen} int a = 2; ${P[id]("a")}${mainClose}`);
    assert.ok(
      errors(top).some((e) => e.includes("同じスコープで名前が重複しています：a")),
      `${id} top-level -> ${JSON.stringify(errors(top))}`,
    );
    const inner = await run(id, `${pre}${mainOpen} { int a = 2; ${P[id]("a")} } ${P[id]("a")}${mainClose}`);
    assert.deepEqual(errors(inner), [], `${id} inner -> ${JSON.stringify(errors(inner))}`);
    assert.equal(flat(inner), "21", `${id} inner`);
  }
});
