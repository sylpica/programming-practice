// バッチ7（C家族班）修正の回帰テスト。
// 対象：R28-N22（C# 定数キャストの CS0221 と unchecked caution 文面）／
// R28-N19（C／C++／C# 多次元配列）／R28-N20（char 配列の2文字列波括弧
// 初期化の excess elements）／R28-N21（std::string の二重波括弧）／
// R28-N23（非有限値のモデルメモリ表示の言語別表記）。
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
const memGroup = (r) =>
  (r.paths[0].groups || []).find((g) => g.title.includes("モデル"))?.entries;

// ---------- R28-N22：C# 定数キャスト ----------
test("R28-N22: constant casts out of range stop with CS0221 in default and checked contexts", async () => {
  for (const code of [
    "byte b = (byte)300; Console.WriteLine(b);",
    "sbyte s = (sbyte)200; Console.WriteLine(s);",
    "uint u = (uint)(-1); Console.WriteLine(u);",
    "short s = (short)70000; Console.WriteLine(s);",
    "int x = (int)3000000000L; Console.WriteLine(x);",
    "byte b = checked((byte)300); Console.WriteLine(b);",
    "Console.WriteLine((byte)300);",
    "byte b = (byte)(200 + 100); Console.WriteLine(b);",
  ]) {
    const r = await run("csharp", code);
    assert.ok(
      errors(r).some((e) => e.startsWith("CompileError:") && e.includes("CS0221")),
      `${code} -> ${JSON.stringify(errors(r))}`,
    );
  }
});
test("R28-N22: unchecked constant casts wrap, runtime casts keep their semantics", async () => {
  const unc = await run("csharp", "byte b = unchecked((byte)300); Console.WriteLine(b);");
  assert.deepEqual(errors(unc), []);
  assert.deepEqual(outputs(unc), [["44"]]);
  const uncBlock = await run("csharp", "unchecked { byte b = (byte)300; Console.WriteLine(b); }");
  assert.deepEqual(errors(uncBlock), []);
  assert.deepEqual(outputs(uncBlock), [["44"]]);
  const inRange = await run("csharp", "byte b = (byte)200; Console.WriteLine(b);");
  assert.deepEqual(outputs(inRange), [["200"]]);
  const runtime = await run("csharp", "int n = 300; byte b = (byte)n; Console.WriteLine(b);");
  assert.deepEqual(outputs(runtime), [["44"]]);
  const runtimeChecked = await run("csharp", "int n = 300; byte b = checked((byte)n); Console.WriteLine(b);");
  assert.ok(errors(runtimeChecked).some((e) => e.startsWith("OverflowException:")), JSON.stringify(errors(runtimeChecked)));
  // 暗黙の定数変換は unchecked でも停止する（実物は CS0031）。
  const implicit = await run("csharp", "unchecked { byte b = 300; Console.WriteLine(b); }");
  assert.ok(errors(implicit).length > 0, JSON.stringify(errors(implicit)));
});
test("R28-N22: unchecked caution states CS0221 for casts and CS0031 only for implicit conversions", async () => {
  const d = getDefinition("csharp");
  const row = d.reference.find((r) => r.name === "unchecked");
  assert.ok(row, "unchecked reference row exists");
  assert.ok(row.caution.includes("CS0220"), row.caution);
  assert.ok(row.caution.includes("CS0221"), row.caution);
  assert.ok(row.caution.includes("CS0031"), row.caution);
  assert.ok(row.caution.includes("暗黙の定数変換だけは unchecked でも"), row.caution);
  assert.ok(!row.caution.includes("範囲外の定数変換は unchecked でも CS0031 で拒否されます"), row.caution);
  assert.ok(row.caution.includes("モデルの制限"), row.caution);
});

// ---------- R28-N19：多次元配列 ----------
test("R28-N19: C/C++ multidimensional arrays initialize and index correctly", async () => {
  const c = await run("c", cMain('int a[2][2] = {{1,2},{3,4}}; printf("%d", a[1][1]);'));
  assert.deepEqual(errors(c), []);
  assert.deepEqual(outputs(c), [["4"]]);
  const noInit = await run("c", cMain('int a[2][2]; a[1][1] = 7; printf("%d", a[1][1]);'));
  assert.deepEqual(outputs(noInit), [["7"]]);
  const flat = await run("c", cMain('int a[2][3] = {1,2,3,4}; printf("%d %d", a[1][0], a[1][2]);'));
  assert.deepEqual(outputs(flat), [["4 0"]]);
  const partial = await run("c", cMain('int a[2][2] = {{1},{3,4}}; printf("%d %d", a[0][1], a[1][0]);'));
  assert.deepEqual(outputs(partial), [["0 3"]]);
  const inferred = await run("c", cMain('int a[][2] = {{1,2},{3,4}}; printf("%d", a[1][0]);'));
  assert.deepEqual(outputs(inferred), [["3"]]);
  const cpp = await run("cpp", cppMain("int a[2][2] = {{1,2},{3,4}}; std::cout << a[0][1] + a[1][0];"));
  assert.deepEqual(outputs(cpp), [["5"]]);
  const loops = await run("c", cMain('int a[2][2] = {{1,2},{3,4}}; int t = 0; for (int i = 0; i < 2; i++) { for (int j = 0; j < 2; j++) { t += a[i][j]; } } printf("%d", t);'));
  assert.deepEqual(outputs(loops), [["10"]]);
  const oob = await run("cpp", cppMain("int a[2][2] = {{1,2},{3,4}}; std::cout << a[2][0];"));
  assert.ok(errors(oob).some((e) => e.includes("範囲外")), JSON.stringify(errors(oob)));
  const char2d = await run("c", cMain('char s[2][4] = {"ab","cd"}; printf("%s %s", s[0], s[1]);'));
  assert.deepEqual(outputs(char2d), [["ab cd"]]);
});
test("R28-N19: C# rectangular and jagged arrays work", async () => {
  const rect = await run("csharp", "int[,] a = new int[2,2]; a[1,1] = 4; Console.WriteLine(a[1,1]);");
  assert.deepEqual(errors(rect), []);
  assert.deepEqual(outputs(rect), [["4"]]);
  const rectInit = await run("csharp", "int[,] a = {{1,2},{3,4}}; Console.WriteLine(a[1,1] + a[0,1]);");
  assert.deepEqual(outputs(rectInit), [["6"]]);
  const rectLen = await run("csharp", "int[,] a = new int[2,3]; Console.WriteLine(a.Length);");
  assert.deepEqual(outputs(rectLen), [["6"]]);
  const jagged = await run("csharp", "int[][] a = new int[2][]; a[0] = new int[]{1,2}; Console.WriteLine(a[0][1]);");
  assert.deepEqual(errors(jagged), []);
  assert.deepEqual(outputs(jagged), [["2"]]);
  const jaggedInit = await run("csharp", "int[][] a = {new int[]{5}, new int[]{6,7}}; Console.WriteLine(a[1][1]);");
  assert.deepEqual(outputs(jaggedInit), [["7"]]);
  const nullRow = await run("csharp", "int[][] a = new int[2][]; Console.WriteLine(a[0][0]);");
  assert.ok(errors(nullRow).some((e) => e.startsWith("NullReferenceException:")), JSON.stringify(errors(nullRow)));
  const oob = await run("csharp", "int[,] a = new int[2,2]; Console.WriteLine(a[2,0]);");
  assert.ok(errors(oob).some((e) => e.startsWith("IndexOutOfRangeException:")), JSON.stringify(errors(oob)));
  const ragged = await run("csharp", "int[,] a = {{1,2},{3}}; Console.WriteLine(a[0,0]);");
  assert.ok(errors(ragged).some((e) => e.includes("要素数が一致しません")), JSON.stringify(errors(ragged)));
});

// ---------- R28-N20：char 配列の2文字列初期化 ----------
test("R28-N20: two string literals in a char array initializer name excess elements", async () => {
  for (const [id, code] of [
    ["c", cMain('char s[] = {"hi","x"}; printf("%s", s);')],
    ["cpp", cppMain('char s[] = {"hi","x"}; std::cout << s;')],
    ["c", cMain('char s[10] = {"hi","x"}; printf("%s", s);')],
  ]) {
    const r = await run(id, code);
    assert.ok(
      errors(r).some((e) => e.includes("要素が多すぎます") && e.includes("excess elements")),
      `${code} -> ${JSON.stringify(errors(r))}`,
    );
    assert.ok(!errors(r).join(" ").includes("数値型が一致しません"), JSON.stringify(errors(r)));
  }
  // 文字リテラルの並びと単一文字列は従来どおり合法。
  const chars = await run("c", cMain("char s[] = {'h','i',0}; printf(\"%s\", s);"));
  assert.deepEqual(errors(chars), []);
  assert.deepEqual(outputs(chars), [["hi"]]);
  const single = await run("c", cMain('char s[] = {"hi"}; printf("%s", s);'));
  assert.deepEqual(outputs(single), [["hi"]]);
});

// ---------- R28-N21：std::string の二重波括弧 ----------
test("R28-N21: std::string double-brace initialization is accepted, triple still stops", async () => {
  const direct = await run("cpp", "#include <iostream>\n#include <string>\nint main(){ std::string s{{\"hi\"}}; std::cout << s; return 0; }");
  assert.deepEqual(errors(direct), []);
  assert.deepEqual(outputs(direct), [["hi"]]);
  const copy = await run("cpp", "#include <iostream>\n#include <string>\nint main(){ std::string s = {{\"hi\"}}; std::cout << s; return 0; }");
  assert.deepEqual(outputs(copy), [["hi"]]);
  const triple = await run("cpp", "#include <iostream>\n#include <string>\nint main(){ std::string s{{{\"hi\"}}}; std::cout << s; return 0; }");
  assert.ok(errors(triple).some((e) => e.includes("波括弧が多すぎます")), JSON.stringify(errors(triple)));
  const scalar = await run("cpp", cppMain("int x = {{5}}; std::cout << x;"));
  assert.ok(errors(scalar).some((e) => e.includes("波括弧が多すぎます")), JSON.stringify(errors(scalar)));
});

// ---------- R28-N23：非有限値のモデルメモリ表示 ----------
test("R28-N23: C/C++ model-memory group uses inf/-inf/nan matching output and memory JSON", async () => {
  const nan = await run("c", cMain('double v = 0.0/0.0; printf("%f", v);'));
  assert.deepEqual(outputs(nan), [["nan"]]);
  assert.ok(memGroup(nan)[0][1].includes('"nan"'), JSON.stringify(memGroup(nan)));
  assert.ok(!memGroup(nan)[0][1].includes("NaN"), JSON.stringify(memGroup(nan)));
  const negInf = await run("c", cMain('double v = -1.0/0.0; printf("%f", v);'));
  assert.ok(memGroup(negInf)[0][1].includes('"-inf"'), JSON.stringify(memGroup(negInf)));
  const arr = await run("c", cMain('double a[2] = {1.0/0.0, 0.0/0.0}; printf("%f %f", a[0], a[1]);'));
  assert.deepEqual(outputs(arr), [["inf nan"]]);
  assert.ok(memGroup(arr)[0][1].includes('"inf"') && memGroup(arr)[0][1].includes('"nan"'), JSON.stringify(memGroup(arr)));
  assert.equal(JSON.parse(JSON.stringify(arr.paths[0].model.memory))["object-1"].values[0], "inf");
  const cpp = await run("cpp", cppMain("double v = 0.0/0.0; std::cout << v;"));
  assert.ok(memGroup(cpp)[0][1].includes('"nan"'), JSON.stringify(memGroup(cpp)));
  // C# は従来どおり Infinity 表記で一致する。
  const cs = await run("csharp", "double v = 1.0/0.0; Console.WriteLine(v);");
  assert.deepEqual(outputs(cs), [["Infinity"]]);
  assert.ok(memGroup(cs)[0][1].includes('"Infinity"'), JSON.stringify(memGroup(cs)));
  // 有限値の表示は変わらない。
  const finite = await run("c", cMain('double v = 1.5; printf("%f", v);'));
  assert.ok(memGroup(finite)[0][1].includes("1.5"), JSON.stringify(memGroup(finite)));
});
