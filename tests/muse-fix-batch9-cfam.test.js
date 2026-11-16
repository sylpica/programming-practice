// バッチ9（cfam班）修正の回帰テスト。
// 対象：R30-N13（R の else 位置規則）／R30-N14（JS オブジェクト内
// スプレッド）／R30-N16（JS void・論理代入・delete）／R30-N17
// （C# switch 式の名指し）／R30-N30（C# 補間内の配列の型名表示）／
// R30-N31（C++ std::string の括弧付き波括弧構築）。
// 一次情報：R は R Language Definition の制御構造と ?Control
// （改行 else は "unexpected else" の parse error、else は if と
// 同じ行）、JS は ECMA-262（CopyDataProperties／論理代入／delete／
// void）、C# は当VM の dotnet 8.0.428 実走、C++ は g++ 13.3 実走。
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
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const cppMain = (body) => `#include <iostream>\n#include <string>\nint main(){ ${body} return 0; }`;

/* ---------------- R30-N13: R の else 位置規則 ---------------- */
test("R30-N13: same-line braceless else and else-if chains work in R", async () => {
  const cases = [
    ["if (TRUE) print(1) else print(2)", [["1"]]],
    ["if (FALSE) print(1) else print(2)", [["2"]]],
    ["if (FALSE) print(1) else if (TRUE) print(2) else print(3)", [["2"]]],
    ["if (FALSE) print(1) else if (FALSE) print(2) else print(3)", [["3"]]],
    ["x <- 5\nif (x > 3) print(\"big\") else print(\"small\")", [["\"big\""]]],
    ["x <- 1\nif (TRUE) x <- 2 else x <- 3\nprint(x)", [["2"]]],
    ["x <- 1\nif (FALSE) x <- 2 else x <- 3\nprint(x)", [["3"]]],
    // else の本体が次の行に続く形は実 R でも合法（else は結ばれている）。
    ["if (TRUE) print(1) else\nprint(2)", [["1"]]],
    ["if (FALSE) print(1) else\nprint(2)", [["2"]]],
  ];
  for (const [code, expected] of cases) {
    const r = await run("r", code);
    assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, code);
  }
});

test("R30-N13: newline else in R is a syntax error naming else", async () => {
  for (const code of [
    "if (FALSE) print(1)\nelse print(2)",
    "if (TRUE) print(1)\nelse print(2)",
    "if (TRUE) { print(1) }\nelse { print(2) }",
    "if (TRUE) {\n print(1)\n}\nelse {\n print(2)\n}",
    "if (TRUE) print(1); else print(2)",
    "for (i in 1:2) print(i) else print(3)",
  ]) {
    const r = await run("r", code);
    assert.ok(
      errors(r).some((e) => e.startsWith("SyntaxError:") && e.includes("else")),
      `${code} -> ${JSON.stringify(errors(r))}`,
    );
    assert.deepEqual(outputs(r), [], code);
  }
});

test("R30-N13: existing R if forms are unchanged", async () => {
  const block = await run("r", "if (TRUE) {\n  print(1)\n} else {\n  print(2)\n}");
  assert.deepEqual(outputs(block), [["1"]]);
  const expr = await run("r", "x <- if (TRUE) 1 else 2\nprint(x)");
  assert.deepEqual(outputs(expr), [["1"]]);
  const chain = await run("r", "x <- if (FALSE) 1 else if (TRUE) 2 else 3\nprint(x)");
  assert.deepEqual(outputs(chain), [["2"]]);
  const inCall = await run("r", "print(if (TRUE) 1 else 2)");
  assert.deepEqual(outputs(inCall), [["1"]]);
  // JavaScript では改行 else は従来どおり合法。
  const js = await run("javascript", "let x=0; if (x) console.log(1)\nelse console.log(2);");
  assert.deepEqual(errors(js), []);
  assert.deepEqual(outputs(js), [["2"]]);
});

/* ---------------- R30-N14: JS オブジェクト内スプレッド ---------------- */
test("R30-N14: object spread copies properties with CopyDataProperties semantics", async () => {
  const cases = [
    ["let o = {...{a:1}}; console.log(o.a);", [["1"]]],
    ["let a={x:1}; let o={...a}; console.log(o.x);", [["1"]]],
    ["let a={x:1}; let o={...a, y:2}; console.log(o.x + o.y);", [["3"]]],
    // 後勝ち（両方向）。
    ["let a={x:1}; let o={x:9, ...a}; console.log(o.x);", [["1"]]],
    ["let a={x:1}; let o={...a, x:9}; console.log(o.x);", [["9"]]],
    // 文字列は文字ごとの添字プロパティになる。
    ["let o={...'ab'}; console.log(o[0] + o[1]);", [["ab"]]],
    // null は無視される。
    ["let o={...null, x:1}; console.log(o.x);", [["1"]]],
    // 入れ子・式位置。
    ["let o={a:1}; console.log({...o}.a);", [["1"]]],
    ["let a={x:1}; let o={n:{...a}}; console.log(o.n.x);", [["1"]]],
  ];
  for (const [code, expected] of cases) {
    const r = await run("javascript", code);
    assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, code);
  }
  // シャローコピーの意味論：コピー後の元オブジェクトの変更は
  // コピー先に及ばず、コピー先の変更も元に及ばない。
  const copy = await run("javascript", "let a={x:1}; let o={...a}; a.x = 5; console.log(o.x); o.x = 7; console.log(a.x);");
  assert.deepEqual(outputs(copy), [["1", "5"]]);
  // 配列スプレッドは従来どおり対象を名指して停止する（本件の範囲外）。
  const arr = await run("javascript", "let a=[1,2]; let b=[...a]; console.log(b);");
  assert.ok(errors(arr).some((e) => e.includes("スプレッド構文")), JSON.stringify(errors(arr)));
});

/* ---------------- R30-N16: JS void／論理代入／delete ---------------- */
test("R30-N16: void evaluates its operand and yields undefined", async () => {
  const plain = await run("javascript", "console.log(void 0);");
  assert.deepEqual(outputs(plain), [["undefined"]]);
  const decl = await run("javascript", "let x = void 0; console.log(x);");
  assert.deepEqual(outputs(decl), [["undefined"]]);
  const side = await run("javascript", "let x = 0; let y = void (x = 5); console.log(x); console.log(y);");
  assert.deepEqual(outputs(side), [["5", "undefined"]]);
});

test("R30-N16: logical assignment short-circuits like ECMA-262", async () => {
  const cases = [
    ["let x=1; x &&= 2; console.log(x);", [["2"]]],
    ["let x=0; x &&= 2; console.log(x);", [["0"]]],
    ["let x=0; x ||= 5; console.log(x);", [["5"]]],
    ["let x=1; x ||= 5; console.log(x);", [["1"]]],
    ["let x=null; x ??= 3; console.log(x);", [["3"]]],
    ["let x=undefined; x ??= 7; console.log(x);", [["7"]]],
    ["let x=5; x ??= 3; console.log(x);", [["5"]]],
    ["let x=0; x ??= 3; console.log(x);", [["0"]]],
    // メンバ・添字への論理代入。
    ["let o={n:1}; o.n &&= 3; console.log(o.n);", [["3"]]],
    ["let a=[0]; a[0] ||= 9; console.log(a[0]);", [["9"]]],
    // 式位置（値は代入後の値／短絡時は現在の値）。
    ["let x=1; console.log(x &&= 0); console.log(x);", [["0", "0"]]],
    ["let x=0; console.log(x &&= 9); console.log(x);", [["0", "0"]]],
  ];
  for (const [code, expected] of cases) {
    const r = await run("javascript", code);
    assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, code);
  }
  // 短絡時は右辺を評価しない（右辺の代入式が実行されない）。
  const noEval = await run("javascript", "let x=1; let y=0; x ||= (y = 9); console.log(y);");
  assert.deepEqual(outputs(noEval), [["0"]]);
  const noEval2 = await run("javascript", "let x=5; let y=0; x ??= (y = 9); console.log(y);");
  assert.deepEqual(outputs(noEval2), [["0"]]);
});

test("R30-N16: delete removes properties and reports success", async () => {
  const cases = [
    ["let o={a:1}; delete o.a; console.log(o.a);", [["undefined"]]],
    ["let o={a:1,b:2}; console.log(delete o.a); console.log(o.b);", [["true", "2"]]],
    // 存在しないプロパティの削除も true。
    ["let o={a:1}; console.log(delete o.zzz);", [["true"]]],
    // 配列要素の削除は長さを変えない（穴になる）。
    ["let a=[1,2,3]; delete a[1]; console.log(a.length); console.log(a[1]);", [["3", "undefined"]]],
    // 変数そのものは削除できない（false を返し、変数は残る）。
    ["let x=1; console.log(delete x); console.log(x);", [["false", "1"]]],
    // 参照でない形は true。
    ["console.log(delete 5);", [["true"]]],
    ["let o={a:1}; let y = delete o.a; console.log(y);", [["true"]]],
  ];
  for (const [code, expected] of cases) {
    const r = await run("javascript", code);
    assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, code);
  }
});

/* ---------------- R30-N17: C# switch 式の名指し ---------------- */
test("R30-N17: C# switch expressions stop naming the switch expression", async () => {
  for (const code of [
    "int x = 1 switch { 1 => 10, _ => 20 }; Console.WriteLine(x);",
    "int n=2; string s = n switch { 1 => \"one\", _ => \"other\" }; Console.WriteLine(s);",
    "Console.WriteLine(2 switch { 2 => 5, _ => 0 });",
    "bool b = (1 switch { _ => 2 }) == 2; Console.WriteLine(b);",
  ]) {
    const r = await run("csharp", code);
    assert.ok(
      errors(r).some((e) => e.includes("switch 式")),
      `${code} -> ${JSON.stringify(errors(r))}`,
    );
    assert.ok(
      !errors(r).some((e) => e.includes("; が必要です")),
      `${code} -> ${JSON.stringify(errors(r))}`,
    );
  }
  // switch 文は従来どおり switch 文として名指される。
  const stmt = await run("csharp", "int x = 5; switch (x) { case 5: Console.WriteLine(1); break; }");
  assert.ok(errors(stmt).some((e) => e.includes("switch 文")), JSON.stringify(errors(stmt)));
});

/* ---------------- R30-N30: C# 補間内の配列は型名表示 ---------------- */
test("R30-N30: arrays inside string interpolation render as type names in every shape", async () => {
  const cases = [
    ["char[] a = {'h','i'}; Console.WriteLine($\"{a}\");", [["System.Char[]"]]],
    ["char[] a = {'h','i'}; string s = $\"{a}\"; Console.WriteLine(s);", [["System.Char[]"]]],
    ["char[] a = {'h','i'}; Console.WriteLine($\"{a}{a}\");", [["System.Char[]System.Char[]"]]],
    ["char[] a = {'h','i'}; Console.WriteLine($\"{a}!\");", [["System.Char[]!"]]],
    ["char[] a = new char[]{'h','i'}; Console.WriteLine($\"{a}\");", [["System.Char[]"]]],
    ["int[] a = {1,2}; Console.WriteLine($\"{a}\");", [["System.Int32[]"]]],
    ["int[] a = {1,2}; string s = $\"{a}\"; Console.WriteLine(s);", [["System.Int32[]"]]],
    ["int[] a = {1,2}; Console.WriteLine($\"{a}{a}\");", [["System.Int32[]System.Int32[]"]]],
    ["string[] a = {\"x\"}; Console.WriteLine($\"{a}\");", [["System.String[]"]]],
    ["byte[] a = {1}; Console.WriteLine($\"{a}\");", [["System.Byte[]"]]],
    ["int[,] a = {{1,2},{3,4}}; Console.WriteLine($\"{a}\");", [["System.Int32[,]"]]],
    ["int[][] a = {new int[]{1}}; Console.WriteLine($\"{a}\");", [["System.Int32[][]"]]],
    ["char[] a = {'h','i'}; Console.WriteLine($\"{a}\" + \"!\");", [["System.Char[]!"]]],
  ];
  for (const [code, expected] of cases) {
    const r = await run("csharp", code);
    assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, code);
  }
});

test("R30-N30: non-array interpolation shapes are unchanged", async () => {
  const cases = [
    ["int n = 3; Console.WriteLine($\"{n}\");", [["3"]]],
    ["int n = 3; Console.WriteLine($\"n={n}\");", [["n=3"]]],
    ["string w = \"tea\"; Console.WriteLine($\"{w}\");", [["tea"]]],
    ["bool f = true; string s = $\"{f}\"; Console.WriteLine(s);", [["True"]]],
    ["char c = 'x'; Console.WriteLine($\"{c}\");", [["x"]]],
    ["double d = 1.5; Console.WriteLine($\"{d}{d}\");", [["1.51.5"]]],
    ["char[] a = {'h','i'}; Console.WriteLine($\"x{a}\");", [["xSystem.Char[]"]]],
    ["char[] a = {'h','i'}; Console.WriteLine($\"{a.Length}\");", [["2"]]],
    ["Console.WriteLine($\"plain\");", [["plain"]]],
    ["Console.WriteLine($\"\");", [[""]]],
    // 補間の外の char[] 出力（WriteLine(char[]) オーバーロード）は不変。
    ["char[] a = {'h','i'}; Console.WriteLine(a);", [["hi"]]],
    // 連結での型名表示（RG-284）も不変。
    ["char[] a = {'h','i'}; Console.WriteLine(\"x\" + a);", [["xSystem.Char[]"]]],
  ];
  for (const [code, expected] of cases) {
    const r = await run("csharp", code);
    assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, code);
  }
});

/* ---------------- R30-N31: C++ 括弧付き波括弧構築 ---------------- */
test("R30-N31: std::string parenthesized brace construction works", async () => {
  const cases = [
    ["std::string s({'h','i'}); std::cout << s;", [["hi"]]],
    ["std::string s({'h'}); std::cout << s;", [["h"]]],
    ["std::string s({\"hi\"}); std::cout << s;", [["hi"]]],
    ["std::string s({'h', 105}); std::cout << s;", [["hi"]]],
    ["std::string s({}); std::cout << \"[\" << s << \"]\";", [["[]"]]],
    // (文字列, 個数) 形は basic_string(const char*, size_type)。
    ["std::string s({\"hi\", 1}); std::cout << s;", [["h"]]],
    ["int n = 1; std::string s({\"hi\", n}); std::cout << s;", [["h"]]],
    // 構築した文字列の後続利用。
    ["std::string s({'h','i'}); std::cout << s[0];", [["h"]]],
    ["std::string s({'h','i'}); std::string t = s + \"!\"; std::cout << t;", [["hi!"]]],
    // スカラーの括弧付き波括弧初期化も実 g++ どおり。
    ["int x({5}); std::cout << x;", [["5"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("cpp", cppMain(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
});

test("R30-N31: functional-cast form std::string({...}) works in expression position", async () => {
  const cast = await run("cpp", cppMain("std::string s = std::string({'h','i'}); std::cout << s;"));
  assert.deepEqual(errors(cast), []);
  assert.deepEqual(outputs(cast), [["hi"]]);
  const direct = await run("cpp", cppMain("std::cout << std::string({'h','i'});"));
  assert.deepEqual(outputs(direct), [["hi"]]);
  const plus = await run("cpp", cppMain("std::cout << std::string({'x'}) + \"y\";"));
  assert.deepEqual(outputs(plus), [["xy"]]);
  const counted = await run("cpp", cppMain("std::string s = std::string({\"hi\", 1}); std::cout << s;"));
  assert.deepEqual(outputs(counted), [["h"]]);
  // 文字列リテラル同士の混在は従来どおり invalid conversion を名指す。
  const mixed = await run("cpp", cppMain("std::string s({\"hi\",\"x\"}); std::cout << s;"));
  assert.ok(errors(mixed).some((e) => e.includes("invalid conversion")), JSON.stringify(errors(mixed)));
  // 従来形は不変。
  const plain = await run("cpp", cppMain("std::string s(\"hi\"); std::cout << s;"));
  assert.deepEqual(outputs(plain), [["hi"]]);
  const braced = await run("cpp", cppMain("std::string s{'h','i'}; std::cout << s;"));
  assert.deepEqual(outputs(braced), [["hi"]]);
});
