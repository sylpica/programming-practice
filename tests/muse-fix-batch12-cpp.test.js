// バッチ12（C++班）修正の回帰テスト。対象：RG-376（C++ std::string
// 配列要素の読み取り不具合、R33 F-01 §4 で確定した5様相）。
// 根本原因は typeOf の添字要素型の誤導出（string[] の要素を char と
// 誤判定し、連鎖添字では int に化けていたこと）、複合代入の連結認定が
// スカラー変数に限られていたこと、文字列値への添字書込み経路の欠落、
// std::string（クラス型）配列要素の既定値が未初期化／null／0 だった
// こと。期待値は g++ 13.3.0 の当VM実走で裁定した。
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
const outputs = (r) => (r.paths || []).map((p) => p.outputs.map((o) => o.text));
const cpp = (body) => `#include <iostream>\n#include <string>\n#include <vector>\nint main() {\n${body}\n return 0;\n}`;
const cc = (body) => `#include <stdio.h>\nint main() {\n${body}\n return 0;\n}`;
const cs = (body) => `using System;\nclass Program {\n static void Main() {\n${body}\n }\n}`;

/* ---------- 様相1: cout 直接読みが "\u0000" にならない ---------- */
test("RG-376-1: cout reads std::string array elements directly", async () => {
  const cases = [
    [`std::string a[2] = {"ab", "cd"}; std::cout << a[0];`, [["ab"]]],
    [`std::string a[2] = {"ab", "cd"}; std::cout << a[1];`, [["cd"]]],
    // 添字が変数・式の形。
    [`std::string a[3] = {"a", "b", "c"}; int i = 1; std::cout << a[i];`, [["b"]]],
    [`std::string a[3] = {"a", "b", "c"}; int i = 1; std::cout << a[i + 1];`, [["c"]]],
    [`std::string a[3] = {"a", "b", "c"}; std::cout << a[1 + 1];`, [["c"]]],
    // cout 連鎖の中・前後に他の値があっても要素そのものが出る。
    [`std::string a[2] = {"ab", "cd"}; std::cout << "[" << a[0] << "," << a[1] << "]";`, [["[ab,cd]"]]],
    // 空文字列要素は NUL 1文字ではなく空。
    [`std::string a[1] = {""}; std::cout << "[" << a[0] << "]";`, [["[]"]]],
    // 要素代入後・char 代入後の読み取りは代入値どおり（RG-357 の代入形）。
    [`std::string a[1]; a[0] = "hello"; std::cout << a[0];`, [["hello"]]],
    [`std::string a[1]; a[0] = 'z'; std::cout << a[0];`, [["z"]]],
    // for ループ内でも同一に読める。
    [`std::string a[2] = {"ab", "cd"}; for (int i = 0; i < 2; i++) { std::cout << a[i]; }`, [["ab", "cd"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("cpp", cpp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
});

/* ---------- 様相2: 要素に対する文字列演算 ---------- */
test("RG-376-2: string operations on std::string array elements", async () => {
  const cases = [
    [`std::string a[2] = {"ab", "cd"}; std::cout << a[0] + a[1];`, [["abcd"]]],
    [`std::string a[2] = {"ab", "cd"}; std::cout << a[0] + "!";`, [["ab!"]]],
    // 連結の逆順（リテラルが左）も連結になる。
    [`std::string a[2] = {"ab", "cd"}; std::cout << "!" + a[0];`, [["!ab"]]],
    // char との連結（両順序）。
    [`std::string a[1] = {"ab"}; std::cout << a[0] + '!';`, [["ab!"]]],
    [`std::string a[1] = {"ab"}; std::cout << '!' + a[0];`, [["!ab"]]],
    // 複合代入（文位置・式位置の両方、リテラル／要素／char）。
    [`std::string a[2] = {"ab", "cd"}; a[0] += "X"; std::cout << a[0];`, [["abX"]]],
    [`std::string a[2] = {"ab", "cd"}; a[0] += a[1]; std::cout << a[0];`, [["abcd"]]],
    [`std::string a[1] = {"ab"}; a[0] += 'X'; std::cout << a[0];`, [["abX"]]],
    [`std::string a[1] = {"ab"}; std::string t = (a[0] += "X"); std::cout << t << a[0];`, [["abXabX"]]],
    // 通常代入の右辺での連結。
    [`std::string a[1] = {"ab"}; a[0] = a[0] + "c"; std::cout << a[0];`, [["abc"]]],
    // 三項演算子の分岐に置いても string として扱われる。
    [`std::string a[2] = {"ab", "cd"}; std::string t = true ? a[0] : a[1]; std::cout << t;`, [["ab"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("cpp", cpp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // 対照：数値との演算はスカラー string と同じく型不一致で停止する
  // （要素だけが緩くならない）。
  for (const body of [
    `std::string a[1] = {"ab"}; std::cout << a[0] + 1;`,
    `std::string s = "ab"; std::cout << s + 1;`,
  ]) {
    const r = await run("cpp", cpp(body));
    assert.ok(errors(r).some((e) => e.includes("型が一致しません")), `${body} -> ${JSON.stringify(errors(r))}`);
  }
});

/* ---------- 様相3: 二重添字の書込み ---------- */
test("RG-376-3: writing a character through a double subscript", async () => {
  const cases = [
    [`std::string b[1] = {"xy"}; b[0][0] = 'z'; std::cout << b[0];`, [["zy"]]],
    [`std::string b[1] = {"xy"}; b[0][1] = 'z'; std::cout << b[0];`, [["xz"]]],
    // 添字が変数の形。
    [`std::string b[1] = {"xy"}; int i = 0; b[0][i] = 'z'; std::cout << b[0];`, [["zy"]]],
    // 代入式の位置でも書き込め、値は char として読める。
    [`std::string b[1] = {"xy"}; char c = (b[0][0] = 'z'); std::cout << c << b[0];`, [["zzy"]]],
    // 後置インクリメントも文字として進む（'x' -> 'y'）。
    [`std::string b[1] = {"xy"}; b[0][0]++; std::cout << b[0];`, [["yy"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("cpp", cpp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // 範囲外の文字書込みはスカラー形と同じ理由（文字列の有効範囲外）で停止。
  const oob = await run("cpp", cpp(`std::string b[1] = {"xy"}; b[0][5] = 'z';`));
  assert.ok(
    errors(oob).some((e) => e.includes("未定義動作") && e.includes("文字列の有効範囲外")),
    JSON.stringify(errors(oob)),
  );
});

/* ---------- 様相4: 二重添字の cout 表示は文字 ---------- */
test("RG-376-4: cout prints an element character as a character", async () => {
  const cases = [
    [`std::string b[1] = {"xy"}; std::cout << b[0][0];`, [["x"]]],
    [`std::string b[1] = {"xy"}; std::cout << b[0][1];`, [["y"]]],
    // 数値として欲しい場合はキャストでコードになる（値自体は従来どおり）。
    [`std::string b[1] = {"xy"}; std::cout << (int)b[0][0];`, [["120"]]],
    // char 変数経由は従来どおり文字。
    [`std::string b[1] = {"xy"}; char c = b[0][0]; std::cout << c;`, [["x"]]],
    // printf %c の引数位置でも char として扱われる。
    [`std::string b[1] = {"xy"}; printf("%c", b[0][0]);`, [["x"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("cpp", cpp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // 範囲外の文字読みは文字列の範囲外として停止する（従来の読み取り規則）。
  const oob = await run("cpp", cpp(`std::string b[1] = {"xy"}; std::cout << b[0][5];`));
  assert.ok(
    errors(oob).some((e) => e.includes("未定義動作") && e.includes("文字列の有効範囲外")),
    JSON.stringify(errors(oob)),
  );
});

/* ---------- 様相5: 未初期化要素は既定構築された "" ---------- */
test("RG-376-5: uninitialized std::string elements are empty strings", async () => {
  const cases = [
    [`std::string a[1]; std::string t = a[0]; std::cout << "[" << t << "]";`, [["[]"]]],
    [`std::string a[1]; std::cout << "[" << a[0] << "]";`, [["[]"]]],
    // 部分初期化の残り要素・空の初期化子も ""（集約初期化の値初期化）。
    [`std::string a[3] = {"ab"}; std::cout << "[" << a[1] << "][" << a[2] << "]";`, [["[][]"]]],
    [`std::string a[2] = {}; std::cout << "[" << a[0] << "]";`, [["[]"]]],
    // 多次元でも同じ（未初期化・部分初期化とも）。
    [`std::string a[2][2]; std::cout << "[" << a[1][1] << "]";`, [["[]"]]],
    [`std::string a[2][2] = {{"a"}}; std::cout << "[" << a[0][1] << "][" << a[1][0] << "]";`, [["[][]"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("cpp", cpp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // 対照：trivial 型配列の未初期化要素は実物どおり未定義動作で止まる
  // （string 限定の是正が int／char へ広がっていないこと）。
  for (const body of [
    `int a[1]; int t = a[0]; std::cout << t;`,
    `char a[1]; std::cout << (int)a[0];`,
  ]) {
    const r = await run("cpp", cpp(body));
    assert.ok(
      errors(r).some((e) => e.includes("未定義動作") && e.includes("未初期化の配列要素")),
      `${body} -> ${JSON.stringify(errors(r))}`,
    );
  }
  // 対照：部分初期化された int 要素は従来どおり 0。
  const intPartial = await run("cpp", cpp(`int a[3] = {1}; std::cout << a[1];`));
  assert.deepEqual(errors(intPartial), []);
  assert.deepEqual(outputs(intPartial), [["0"]]);
});

/* ---------- 保持すべき既存の正しい挙動 ---------- */
test("RG-376: previously correct surfaces stay correct", async () => {
  const cases = [
    // 保存値経由の読み（コピー・printf・.length プロパティ）は従来どおり。
    [`std::string a[2] = {"ab", "cd"}; std::string t = a[0]; std::cout << t;`, [["ab"]]],
    [`std::string a[2] = {"ab", "cd"}; printf("%s", a[0]);`, [["ab"]]],
    [`std::string a[2] = {"ab", "cd"}; std::cout << a[0].length;`, [["2"]]],
    // 比較は従来どおり（要素同士・リテラル・変数）。
    [`std::string a[2] = {"ab", "cd"}; std::cout << (a[0] == "ab") << (a[0] == a[1]) << (a[0] < a[1]);`, [["101"]]],
    // スカラー std::string の全挙動は不変。
    [`std::string s = "xy"; std::cout << s << s[0]; s[0] = 'z'; std::cout << s; s += "w"; std::cout << s;`, [["xyx", "zy", "zyw"]]],
    // int 配列・char 配列要素の直接 cout は不変。
    [`int a[2] = {10, 20}; std::cout << a[0];`, [["10"]]],
    [`char a[2] = {'x', 'y'}; std::cout << a[0];`, [["x"]]],
    // 条件に string 要素を置く形はスカラーと同じくコンパイルエラー
    // （要素の型が char に化けて素通りしていた同根表面の是正）。
  ];
  for (const [body, expected] of cases) {
    const r = await run("cpp", cpp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // 修正バッチ13（R7-163）で是正：std::string 要素と char の比較演算子は
  // 実在しない（g++ 13 実測）。旧「従来どおり」ケースの a[0] == 'x' は
  // 誤った前提に基づいていたため、エラー側で固定する。
  const charCmp = await run("cpp", cpp(`std::string a[1] = {"x"}; std::cout << (a[0] == 'x');`));
  assert.ok(
    errors(charCmp).some((e) => e.includes("std::string と char は比較できません")),
    JSON.stringify(errors(charCmp)),
  );
  // 範囲外添字は配列の有効範囲外として名指し停止（不変）。
  const oob = await run("cpp", cpp(`std::string a[2] = {"ab", "cd"}; std::cout << a[5];`));
  assert.ok(
    errors(oob).some((e) => e.includes("未定義動作") && e.includes("配列の有効範囲外")),
    JSON.stringify(errors(oob)),
  );
  // .c_str() は要素でもスカラーでも宣言どおり名指し未対応（不変）。
  for (const body of [
    `std::string a[1] = {"ab"}; std::cout << a[0].c_str();`,
    `std::string s = "ab"; std::cout << s.c_str();`,
  ]) {
    const r = await run("cpp", cpp(body));
    assert.ok(errors(r).some((e) => e.includes(".c_str")), `${body} -> ${JSON.stringify(errors(r))}`);
  }
  // string 要素を条件に置く形はスカラーと同じ停止。
  const cond = await run("cpp", cpp(`std::string a[1] = {"ab"}; if (a[0]) { std::cout << 1; }`));
  assert.ok(
    errors(cond).some((e) => e.includes("std::string を条件には使えません")),
    JSON.stringify(errors(cond)),
  );
  // 数値との比較はスカラーと同じく型を名指して停止。
  const cmpInt = await run("cpp", cpp(`std::string a[1] = {"ab"}; std::cout << (a[0] == 1);`));
  assert.ok(
    errors(cmpInt).some((e) => e.includes("std::string") && e.includes("比較できません")),
    JSON.stringify(errors(cmpInt)),
  );
});

/* ---------- 多次元 string 配列・同根の兄弟表面 ---------- */
test("RG-376: multidimensional std::string arrays and sibling surfaces", async () => {
  const cases = [
    [`std::string a[2][2] = {{"a", "b"}, {"c", "d"}}; std::cout << a[0][1] << a[1][0];`, [["bc"]]],
    [`std::string a[2][2] = {{"a", "b"}, {"c", "d"}}; std::string t = a[1][0]; std::cout << t;`, [["c"]]],
    [`std::string a[2][2] = {{"a", "b"}, {"c", "d"}}; a[0][1] = 'z'; std::cout << a[0][1];`, [["z"]]],
    [`std::string a[2][2] = {{"a", "b"}, {"c", "d"}}; a[0][1] += "Z"; std::cout << a[0][1];`, [["bZ"]]],
    // 要素文字列への三重添字は char アクセス（読み書きとも）。
    [`std::string a[2][2] = {{"a", "b"}, {"c", "d"}}; std::cout << a[0][0][0];`, [["a"]]],
    [`std::string a[2][2] = {{"a", "b"}, {"c", "d"}}; a[0][0][0] = 'q'; std::cout << a[0][0];`, [["q"]]],
    // 関数引数位置（getline／cin の書き込み先）でも要素は使える。
    [`std::string a[1]; std::getline(std::cin, a[0]); std::cout << "ok";`, [["ok"]]],
    [`std::string a[1]; std::cin >> a[0]; std::cout << "ok";`, [["ok"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("cpp", cpp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // 対照：int 多次元配列への次元超過の添字は従来どおり次元超過で停止。
  const extra = await run("cpp", cpp(`int a[2][2] = {{1, 2}, {3, 4}}; std::cout << a[0][0][0];`));
  assert.ok(
    errors(extra).some((e) => e.includes("添字の数が次元の数を超えています")),
    JSON.stringify(errors(extra)),
  );
  // B8 高度モードで std::vector<std::string> の宣言・要素アクセスを実装
  // したため、この形は正常動作する（旧仕様「ジェネリック型そのものが
  // 未対応」は B8 で意図的に反転）。
  const vec = await run("cpp", cpp(`std::vector<std::string> v = {"ab"}; std::cout << v[0];`));
  assert.deepEqual(errors(vec), [], JSON.stringify(errors(vec)));
  assert.deepEqual(outputs(vec), [["ab"]]);
});

/* ---------- 対照言語（C／C#）の不変 ---------- */
test("RG-376: C and C# contrast forms are unchanged", async () => {
  // C の char 二次元配列は従来どおり（読み・%c・文字書込み）。
  const c2d = await run("c", cc(`char a[2][8] = {"xy", "zz"}; printf("%s", a[0]); printf("%c", a[0][0]); a[0][0] = 'q'; printf("%s", a[0]);`));
  assert.deepEqual(errors(c2d), [], JSON.stringify(errors(c2d)));
  assert.deepEqual(outputs(c2d), [["xy", "x", "qy"]]);
  // C++ の char 二次元配列の要素文字も文字として出る（typeOf の再帰
  // 導出で連鎖添字の型が int に化けなくなった同根の是正）。
  const cpp2d = await run("cpp", cpp(`char a[2][8] = {"xy", "zz"}; std::cout << a[0]; std::cout << a[0][0]; a[0][0] = 'q'; std::cout << a[0];`));
  assert.deepEqual(errors(cpp2d), [], JSON.stringify(errors(cpp2d)));
  assert.deepEqual(outputs(cpp2d), [["xy", "x", "qy"]]);
  // C# の string 配列は従来どおり（要素の出力・連結・複合代入・文字）。
  const csArr = await run("csharp", cs(`string[] a = {"ab", "cd"}; Console.WriteLine(a[0]); Console.WriteLine(a[0] + "!"); a[0] += "X"; Console.WriteLine(a[0]); Console.WriteLine(a[0][0]);`));
  assert.deepEqual(errors(csArr), [], JSON.stringify(errors(csArr)));
  assert.deepEqual(outputs(csArr), [["ab", "ab!", "abX", "a"]]);
  // C# の string[] の既定要素は null のまま（C++ の "" 化が漏れていない）。
  const csNull = await run("csharp", cs(`string[] a = new string[1]; Console.WriteLine(a[0] == null);`));
  assert.deepEqual(errors(csNull), []);
  assert.deepEqual(outputs(csNull), [["True"]]);
});
