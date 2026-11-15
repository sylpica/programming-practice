// バッチ6（C家族班）修正の回帰テスト。
// 対象：R27-N16（C++ bool／float への波括弧初期化 narrowing のカバー漏れ）／
// R27-N11（C／C++／C# の複数宣言子）／R27-N17（char 配列の波括弧で包んだ
// 文字列初期化）／R27-N18（入れ子波括弧の部分初期化子）／
// R27-N27（C# unchecked 項目 caution の実 C# 規則への是正）／
// R27-N10（C家族の非有限値の最終状態直列化）。
// 一次情報：当VM の gcc／g++ 13.3 と dotnet 8.0.428（~/dotnet）の実走。
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
const cppMain = (body) => `#include <iostream>\nint main(){ ${body} return 0; }`;
const cMain = (body) => `#include <stdio.h>\nint main(){ ${body} return 0; }`;
const roundTrip = (v) => JSON.parse(JSON.stringify(v));

// ---------- R27-N16：bool narrowing ----------
test("R27-N16: C++ bool brace-init integer constants outside {0,1} are narrowing errors", async () => {
  for (const body of [
    "bool b{2}; std::cout << b;",
    "bool b = {2}; std::cout << b;",
    "bool b{-1}; std::cout << b;",
    "bool b{1 + 1}; std::cout << b;",
    "bool b{'a'}; std::cout << b;",
    "bool a[]{true, 2}; std::cout << a[1];",
    "bool a[] = {true, 2}; std::cout << a[1];",
  ]) {
    const r = await run("cpp", cppMain(body));
    assert.ok(
      errors(r).some((e) => e.startsWith("CompileError:") && e.includes("bool") && e.includes("narrowing")),
      `${body} -> ${JSON.stringify(errors(r))}`,
    );
  }
});
test("R27-N16: C++ bool brace-init legal forms keep working", async () => {
  const r = await run("cpp", cppMain("bool a{1}; bool b{0}; bool c{true}; bool d = {false}; bool e{2 - 1}; std::cout << a << b << c << d << e;"));
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["10101"]]);
  const arr = await run("cpp", cppMain("bool a[] = {0, 1}; std::cout << a[0] << a[1];"));
  assert.deepEqual(errors(arr), []);
  assert.deepEqual(outputs(arr), [["01"]]);
  // 非定数（変数）の要素は g++ でも警告止まりで受理される。
  const varEl = await run("cpp", cppMain("int x = 2; bool b{x}; std::cout << b;"));
  assert.deepEqual(errors(varEl), []);
  assert.deepEqual(outputs(varEl), [["1"]]);
  // C には narrowing の概念はなく、{2} は通常変換で 1 になる（gcc 実測）。
  const c = await run("c", "#include <stdio.h>\n#include <stdbool.h>\nint main(){ bool b = {2}; printf(\"%d\", b); return 0; }");
  assert.deepEqual(errors(c), []);
  assert.deepEqual(outputs(c), [["1"]]);
});
test("R27-N16 inventory: C++ float brace-init inexact integer constants are narrowing errors", async () => {
  // g++ 13.3 実測：float{16777217} は narrowing conversion エラー。
  const s = await run("cpp", cppMain("float f{16777217}; std::cout << f;"));
  assert.ok(errors(s).some((e) => e.includes("float") && e.includes("narrowing")), JSON.stringify(errors(s)));
  const a = await run("cpp", cppMain("float a[1] = {16777217}; std::cout << a[0];"));
  assert.ok(errors(a).some((e) => e.includes("narrowing")), JSON.stringify(errors(a)));
  // 正確に表せる定数と double への定数は合法のまま。
  const ok = await run("cpp", cppMain("float f{1}; double d{16777217}; std::cout << f << \" \" << d;"));
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), [["1 1.67772e+07"]]);
});

// ---------- R27-N11：複数宣言子 ----------
test("R27-N11: multiple declarators work in C, C++ and C#", async () => {
  const c = await run("c", cMain('int a = 1, b = 2; printf("%d", a + b);'));
  assert.deepEqual(errors(c), []);
  assert.deepEqual(outputs(c), [["3"]]);
  const cpp = await run("cpp", cppMain("int a, b; a = 1; b = 2; std::cout << a + b;"));
  assert.deepEqual(errors(cpp), []);
  assert.deepEqual(outputs(cpp), [["3"]]);
  const cs = await run("csharp", "int a = 1, b = 2; Console.WriteLine(a + b);");
  assert.deepEqual(errors(cs), []);
  assert.deepEqual(outputs(cs), [["3"]]);
});
test("R27-N11: per-declarator modifiers, initializers and for-init", async () => {
  const mixed = await run("c", cMain('int a = 1, *p = &a, b[2] = {3, 4}; printf("%d %d %d", a, *p, b[1]);'));
  assert.deepEqual(errors(mixed), []);
  assert.deepEqual(outputs(mixed), [["1 1 4"]]);
  const direct = await run("cpp", cppMain("int a(1), b(2); std::cout << a + b;"));
  assert.deepEqual(errors(direct), []);
  assert.deepEqual(outputs(direct), [["3"]]);
  const forInit = await run("cpp", cppMain("for (int i = 0, j = 3; i < j; i++) { std::cout << i; }"));
  assert.deepEqual(errors(forInit), []);
  assert.deepEqual(outputs(forInit), [["0", "1", "2"]]);
  const csArr = await run("csharp", "int[] a = {1, 2}, b = {3}; Console.WriteLine(a[1] + b[0]);");
  assert.deepEqual(errors(csArr), []);
  assert.deepEqual(outputs(csArr), [["5"]]);
  const laterUsesEarlier = await run("cpp", cppMain("int a = 1, b = a + 1; std::cout << b;"));
  assert.deepEqual(errors(laterUsesEarlier), []);
  assert.deepEqual(outputs(laterUsesEarlier), [["2"]]);
});

// ---------- R27-N17：char 配列の波括弧文字列 ----------
test("R27-N17: char array braced string initialization works in C and C++", async () => {
  const c = await run("c", cMain('char s[] = {"hi"}; printf("%s", s);'));
  assert.deepEqual(errors(c), []);
  assert.deepEqual(outputs(c), [["hi"]]);
  const cpp = await run("cpp", cppMain('char s[5] = {"hi"}; std::cout << s;'));
  assert.deepEqual(errors(cpp), []);
  assert.deepEqual(outputs(cpp), [["hi"]]);
  // C では終端ヌルなしの詰め込みも合法（gcc 実測）。C++ では停止する。
  const cExact = await run("c", cMain('char s[2] = {"hi"}; printf("%c%c", s[0], s[1]);'));
  assert.deepEqual(errors(cExact), []);
  assert.deepEqual(outputs(cExact), [["hi"]]);
  const cppExact = await run("cpp", cppMain('char s[2] = {"hi"}; std::cout << s;'));
  assert.ok(errors(cppExact).some((e) => e.includes("終端ヌル")), JSON.stringify(errors(cppExact)));
});

// ---------- R27-N18：入れ子波括弧 ----------
test("R27-N18: nested braces work where the real compilers accept them", async () => {
  const cScalar = await run("c", cMain('int x = {{5}}; printf("%d", x);'));
  assert.deepEqual(errors(cScalar), []);
  assert.deepEqual(outputs(cScalar), [["5"]]);
  const cTriple = await run("c", cMain('int x = {{{5}}}; printf("%d", x);'));
  assert.deepEqual(errors(cTriple), []);
  assert.deepEqual(outputs(cTriple), [["5"]]);
  const cArr = await run("c", cMain('int a[2] = {{1},{2}}; printf("%d", a[1]);'));
  assert.deepEqual(errors(cArr), []);
  assert.deepEqual(outputs(cArr), [["2"]]);
  const cExcess = await run("c", cMain('int a[2] = {{1,2},{3}}; printf("%d %d", a[0], a[1]);'));
  assert.deepEqual(errors(cExcess), []);
  assert.deepEqual(outputs(cExcess), [["1 3"]]);
  const cppArr = await run("cpp", cppMain("int a[2] = {{1},{2}}; std::cout << a[1];"));
  assert.deepEqual(errors(cppArr), []);
  assert.deepEqual(outputs(cppArr), [["2"]]);
  const cppEmpty = await run("cpp", cppMain("int a[2] = {{},{}}; std::cout << a[0] << a[1];"));
  assert.deepEqual(errors(cppEmpty), []);
  assert.deepEqual(outputs(cppEmpty), [["00"]]);
});
test("R27-N18: C++ scalar double braces stop with the true cause named", async () => {
  for (const body of ["int x = {{5}}; std::cout << x;", "int x{{5}}; std::cout << x;"]) {
    const r = await run("cpp", cppMain(body));
    assert.ok(
      errors(r).some((e) => e.includes("波括弧が多すぎます") && e.includes("too many braces")),
      `${body} -> ${JSON.stringify(errors(r))}`,
    );
    assert.ok(!errors(r).join(" ").includes("レコードのフィールド名"), JSON.stringify(errors(r)));
  }
  const cppTooMany = await run("cpp", cppMain("int a[2] = {{1,2},{3}}; std::cout << a[0];"));
  assert.ok(errors(cppTooMany).some((e) => e.includes("要素が多すぎます")), JSON.stringify(errors(cppTooMany)));
});

// ---------- R27-N27：unchecked caution ----------
test("R27-N27: C# unchecked caution states the real rule and attributes the stop to the model", async () => {
  const d = getDefinition("csharp");
  const row = d.reference.find((r) => r.name === "unchecked");
  assert.ok(row, "unchecked reference row exists");
  assert.ok(row.caution.includes("実 C# では"), row.caution);
  assert.ok(row.caution.includes("折り返し"), row.caution);
  assert.ok(row.caution.includes("CS0220"), row.caution);
  assert.ok(row.caution.includes("CS0031"), row.caution);
  assert.ok(row.caution.includes("モデルの制限"), row.caution);
  assert.ok(!row.caution.includes("unchecked でもコンパイルエラーとして停止します"), row.caution);
  // アプリの停止挙動自体はモデル制限として維持する（バッチ2の開示方針）。
  const arith = await run("csharp", "int n = unchecked(2147483647 + 1); Console.WriteLine(n);");
  assert.ok(errors(arith).length > 0, JSON.stringify(errors(arith)));
  const conv = await run("csharp", "uint u = unchecked(-1); Console.WriteLine(u);");
  assert.ok(errors(conv).length > 0, JSON.stringify(errors(conv)));
});

// ---------- R27-N10：非有限値の最終状態 ----------
test("R27-N10: C/C++/C# non-finite final state survives JSON round-trip matching the output", async () => {
  const c = await run("c", cMain('double x = 1.0/0.0; printf("%f", x);'));
  assert.deepEqual(outputs(c), [["inf"]]);
  assert.equal(roundTrip(c.paths[0].vars).x, "inf");
  const cNeg = await run("c", cMain('double x = -1.0/0.0; double y = 0.0/0.0; printf("%f %f", x, y);'));
  assert.deepEqual(outputs(cNeg), [["-inf nan"]]);
  assert.equal(roundTrip(cNeg.paths[0].vars).x, "-inf");
  assert.equal(roundTrip(cNeg.paths[0].vars).y, "nan");
  const cppArr = await run("cpp", cppMain("double a[2] = {1.0/0.0, 0.0/0.0}; std::cout << a[0];"));
  assert.deepEqual(outputs(cppArr), [["inf"]]);
  const mem = Object.values(roundTrip(cppArr.paths[0].model.memory));
  assert.deepEqual(mem.map((m) => m.values), [["inf", "nan"]]);
  const cs = await run("csharp", "double x = 1.0/0.0; Console.WriteLine(x);");
  assert.deepEqual(outputs(cs), [["Infinity"]]);
  assert.equal(roundTrip(cs.paths[0].vars).x, "Infinity");
  const csArr = await run("csharp", "double[] a = {1.0/0.0, 0.0/0.0}; Console.WriteLine(a[0]);");
  assert.deepEqual(roundTrip(csArr.paths[0].vars).a, ["Infinity", "NaN"]);
  // 有限値は数値のまま変わらない。
  const finite = await run("c", cMain('double x = 1.5; printf("%f", x);'));
  assert.equal(roundTrip(finite.paths[0].vars).x, 1.5);
});
