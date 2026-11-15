// バッチ8（C家族班）修正の回帰テスト。
// 対象：R29-N18（C# ジャグ配列の裸の入れ子初期化子 CS0623）／
// R29-N19（C# 矩形配列の foreach の要素列挙）／
// R29-N20（C# 矩形／ジャグの添字形混同 CS0022）／
// R29-N21（C# 配列全体の表示の型名と char[] オーバーロード）／
// R29-N22（C# 文字列連結・補間内の配列の型名表示）／
// R29-N23（C／C++ char 波括弧初期化の過剰一般化の是正）／
// R29-N24（C++ std::string 初期化子リスト構築）／
// R29-N25（C# 定数の浮動小数点キャスト CS0221）／
// R29-N7（C#「new」項目の caution 是正）／
// R29-N6（C／C++／C# 対応範囲文面の是正）。
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
const cppMain = (body) => `#include <iostream>\n#include <string>\nint main(){ ${body} return 0; }`;
const cMain = (body) => `#include <stdio.h>\nint main(){ ${body} return 0; }`;

// ---------- R29-N18：ジャグ配列の裸の入れ子初期化子は CS0623 ----------
test("R29-N18: jagged bare nested initializers stop with CS0623, new-form rows still work", async () => {
  for (const code of [
    "int[][] a = {{1,2},{3}}; Console.WriteLine(a[1][0]);",
    "int[][] a = {new int[]{1}, {2}}; Console.WriteLine(a[1][0]);",
    "int[] a = {{1},{2}}; Console.WriteLine(a[0]);",
    'string[] a = {{"x"}}; Console.WriteLine(a[0]);',
    "int[][] a = new int[2][]; a[0] = {1,2}; Console.WriteLine(a[0][0]);",
  ]) {
    const r = await run("csharp", code);
    assert.ok(
      errors(r).some((e) => e.startsWith("CompileError:") && e.includes("CS0623")),
      `${code} -> ${JSON.stringify(errors(r))}`,
    );
  }
  const ok = await run("csharp", "int[][] a = {new int[]{1,2}, new int[]{3}}; Console.WriteLine(a[1][0]);");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), [["3"]]);
  // 矩形の入れ子初期化子は実物でも合法で、従来どおり動作する。
  const rect = await run("csharp", "int[,] a = {{1,2},{3,4}}; Console.WriteLine(a[1,0]);");
  assert.deepEqual(outputs(rect), [["3"]]);
});

// ---------- R29-N19：矩形配列の foreach は要素を列挙する ----------
test("R29-N19: foreach over a rectangular array enumerates elements in row-major order", async () => {
  const sum = await run("csharp", "int[,] a = {{1,2},{3,4}}; int t = 0; foreach (int v in a) { t += v; } Console.WriteLine(t);");
  assert.deepEqual(errors(sum), []);
  assert.deepEqual(outputs(sum), [["10"]]);
  const each = await run("csharp", "int[,] a = {{1,2},{3,4}}; foreach (var v in a) { Console.WriteLine(v); }");
  assert.deepEqual(outputs(each), [["1", "2", "3", "4"]]);
  const brk = await run("csharp", "int[,] a = {{1,2},{3,4}}; int t = 0; foreach (int v in a) { t += v; if (v == 2) break; } Console.WriteLine(t);");
  assert.deepEqual(outputs(brk), [["3"]]);
  const bytes = await run("csharp", "byte[,] a = {{1,2},{3,4}}; foreach (byte v in a) { Console.WriteLine(v); }");
  assert.deepEqual(outputs(bytes), [["1", "2", "3", "4"]]);
  // ジャグ配列の foreach は従来どおり行を列挙する（実物どおり）。
  const jagged = await run("csharp", "int[][] a = {new int[]{1,2}, new int[]{3}}; foreach (int[] row in a) { Console.WriteLine(row[0]); }");
  assert.deepEqual(outputs(jagged), [["1", "3"]]);
  const oneDim = await run("csharp", "int[] a = {1,2,3}; int t = 0; foreach (int v in a) { t += v; } Console.WriteLine(t);");
  assert.deepEqual(outputs(oneDim), [["6"]]);
});

// ---------- R29-N20：矩形／ジャグの添字形混同は CS0022 ----------
test("R29-N20: mixed index forms on rectangular/jagged arrays stop with CS0022", async () => {
  for (const code of [
    "int[,] a = {{1,2},{3,4}}; Console.WriteLine(a[0][1]);",
    "int[,] a = {{1,2},{3,4}}; Console.WriteLine(a[1]);",
    "int[,] a = {{1,2},{3,4}}; Console.WriteLine(a[0,1,2]);",
    "int[][] a = new int[2][]; a[0] = new int[]{1,2}; Console.WriteLine(a[0,1]);",
    "int[][] a = new int[2][]; a[0] = new int[]{1,2}; a[0,1] = 9; Console.WriteLine(a[0][1]);",
    "int[,] a = {{1,2},{3,4}}; a[0][1] = 9; Console.WriteLine(a[0,1]);",
    "int[,] a = {{1,2},{3,4}}; a[1] = 9; Console.WriteLine(a[0,0]);",
    "int[] a = {1,2}; Console.WriteLine(a[0,1]);",
  ]) {
    const r = await run("csharp", code);
    assert.ok(
      errors(r).some((e) => e.startsWith("CompileError:") && e.includes("CS0022")),
      `${code} -> ${JSON.stringify(errors(r))}`,
    );
  }
  // 正規形は従来どおり動作する。
  const rect = await run("csharp", "int[,] a = {{1,2},{3,4}}; a[0,1] = 9; Console.WriteLine(a[0,1]);");
  assert.deepEqual(outputs(rect), [["9"]]);
  const jagged = await run("csharp", "int[][] a = new int[2][]; a[0] = new int[]{1,2}; a[0][1] = 9; Console.WriteLine(a[0][1]);");
  assert.deepEqual(outputs(jagged), [["9"]]);
});

// ---------- R29-N21：配列全体の表示は宣言した要素型・形状の型名 ----------
test("R29-N21: WriteLine(array) shows the declared element type and shape", async () => {
  const cases = [
    ["byte", "{1,2}", "System.Byte[]"],
    ["sbyte", "{1,2}", "System.SByte[]"],
    ["short", "{1,2}", "System.Int16[]"],
    ["ushort", "{1,2}", "System.UInt16[]"],
    ["uint", "{1,2}", "System.UInt32[]"],
    ["ulong", "{1,2}", "System.UInt64[]"],
    ["int", "{1,2}", "System.Int32[]"],
    ["long", "{1,2}", "System.Int64[]"],
    ["float", "{1,2}", "System.Single[]"],
    ["double", "{1,2}", "System.Double[]"],
    ["string", '{"x","y"}', "System.String[]"],
    ["bool", "{true,false}", "System.Boolean[]"],
    ["byte", "{}", "System.Byte[]"],
  ];
  for (const [type, init, expected] of cases) {
    const r = await run("csharp", `${type}[] a = ${init}; Console.WriteLine(a);`);
    assert.deepEqual(errors(r), [], `${type} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), [[expected]], type);
  }
  const rect = await run("csharp", "int[,] a = {{1,2},{3,4}}; Console.WriteLine(a);");
  assert.deepEqual(outputs(rect), [["System.Int32[,]"]]);
  const byteRect = await run("csharp", "byte[,] a = {{1,2},{3,4}}; Console.WriteLine(a);");
  assert.deepEqual(outputs(byteRect), [["System.Byte[,]"]]);
  const jagged = await run("csharp", "int[][] a = {new int[]{1,2}, new int[]{3}}; Console.WriteLine(a);");
  assert.deepEqual(outputs(jagged), [["System.Int32[][]"]]);
  const row = await run("csharp", "byte[][] a = {new byte[]{1,2}}; Console.WriteLine(a[0]);");
  assert.deepEqual(outputs(row), [["System.Byte[]"]]);
  const viaNew = await run("csharp", "Console.WriteLine(new byte[]{1,2});");
  assert.deepEqual(outputs(viaNew), [["System.Byte[]"]]);
  // char[] は WriteLine(char[]) オーバーロードで文字そのものを出力する。
  const chars = await run("csharp", "char[] a = {'x','y'}; Console.WriteLine(a);");
  assert.deepEqual(outputs(chars), [["xy"]]);
});

// ---------- R29-N22：連結・補間内の配列は型名になる ----------
test("R29-N22: arrays inside string concatenation and interpolation show their type name", async () => {
  const concat = await run("csharp", 'int[] a = {1,2,3}; Console.WriteLine("v=" + a);');
  assert.deepEqual(outputs(concat), [["v=System.Int32[]"]]);
  const interp = await run("csharp", 'int[] a = {1,2,3}; Console.WriteLine($"v={a}");');
  assert.deepEqual(outputs(interp), [["v=System.Int32[]"]]);
  const byteConcat = await run("csharp", 'byte[] a = {1,2}; Console.WriteLine("v=" + a);');
  assert.deepEqual(outputs(byteConcat), [["v=System.Byte[]"]]);
  const rectConcat = await run("csharp", 'int[,] a = {{1,2},{3,4}}; Console.WriteLine("v=" + a);');
  assert.deepEqual(outputs(rectConcat), [["v=System.Int32[,]"]]);
  // 連結では char[] オーバーロードは選ばれず、型名になる（実物どおり）。
  const charConcat = await run("csharp", "char[] a = {'x','y'}; Console.WriteLine(\"v=\" + a);");
  assert.deepEqual(outputs(charConcat), [["v=System.Char[]"]]);
  const viaNew = await run("csharp", 'string s = "x" + new int[]{1,2}; Console.WriteLine(s);');
  assert.deepEqual(outputs(viaNew), [["xSystem.Int32[]"]]);
});

// ---------- R29-N23：char 波括弧初期化の過剰一般化の是正 ----------
test("R29-N23: a string literal as one char-array element among others is not excess in C, and names conversion in C++", async () => {
  const cSized = await run("c", cMain("char s[5] = {'h','i',0,\"x\",'y'}; printf(\"%s\", s);"));
  assert.deepEqual(errors(cSized), []);
  assert.deepEqual(outputs(cSized), [["hi"]]);
  const cUnsized = await run("c", cMain("char s[] = {'h','i',0,\"x\"}; printf(\"%s\", s);"));
  assert.deepEqual(errors(cUnsized), []);
  assert.deepEqual(outputs(cUnsized), [["hi"]]);
  const cpp = await run("cpp", cppMain("char s[5] = {'h','i',0,\"x\",'y'}; std::cout << s;"));
  assert.ok(
    errors(cpp).some((e) => e.includes("invalid conversion") && e.includes("char")),
    JSON.stringify(errors(cpp)),
  );
  assert.ok(!errors(cpp).join(" ").includes("excess"), JSON.stringify(errors(cpp)));
  // 先頭要素が文字列の形は、従来どおり excess（両言語とも実物はエラー）。
  for (const [id, code] of [
    ["c", cMain('char s[] = {"hi","x"}; printf("%s", s);')],
    ["cpp", cppMain('char s[] = {"hi","x"}; std::cout << s;')],
    ["c", cMain("char s[10] = {\"hi\",'x'}; printf(\"%s\", s);")],
  ]) {
    const r = await run(id, code);
    assert.ok(errors(r).some((e) => e.includes("excess elements")), `${code} -> ${JSON.stringify(errors(r))}`);
  }
});

// ---------- R29-N24：std::string の初期化子リスト構築 ----------
test("R29-N24: std::string initializer-list construction from chars works", async () => {
  for (const decl of [
    "std::string s{{'h','i'}};",
    "std::string s = {{'h','i'}};",
    "std::string s{'h','i'};",
    "std::string s = {'h','i'};",
    "std::string s{{'h','i','!'}};",
  ]) {
    const r = await run("cpp", cppMain(`${decl} std::cout << s;`));
    assert.deepEqual(errors(r), [], `${decl} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), [[decl.includes("'!'") ? "hi!" : "hi"]], decl);
  }
  const fromVar = await run("cpp", cppMain("char c = 'x'; std::string s{{c,'y'}}; std::cout << s;"));
  assert.deepEqual(outputs(fromVar), [["xy"]]);
  const fromInts = await run("cpp", cppMain("std::string s{{104,105}}; std::cout << s;"));
  assert.deepEqual(outputs(fromInts), [["hi"]]);
  // 従来どおり受理される形は維持する。
  const single = await run("cpp", cppMain('std::string s{{"hi"}}; std::cout << s;'));
  assert.deepEqual(outputs(single), [["hi"]]);
  const plain = await run("cpp", cppMain('std::string s{"hi"}; std::cout << s;'));
  assert.deepEqual(outputs(plain), [["hi"]]);
  // 文字列リテラルを要素に混ぜる形と三重波括弧は、真因を名指して停止する。
  const mixed = await run("cpp", cppMain('std::string s{{"hi","x"}}; std::cout << s;'));
  assert.ok(errors(mixed).some((e) => e.includes("invalid conversion")), JSON.stringify(errors(mixed)));
  const triple = await run("cpp", cppMain("std::string s{{{'h','i'}}}; std::cout << s;"));
  assert.ok(errors(triple).some((e) => e.includes("波括弧が多すぎます")), JSON.stringify(errors(triple)));
});

// ---------- R29-N25：定数の浮動小数点キャストは CS0221 ----------
test("R29-N25: constant floating-point casts out of range stop with CS0221, runtime casts unchanged", async () => {
  for (const code of [
    "Console.WriteLine((byte)300.5);",
    "Console.WriteLine((byte)300.0);",
    "Console.WriteLine(checked((byte)300.5));",
    "checked { Console.WriteLine((byte)300.5); }",
    "Console.WriteLine((int)3000000000.5);",
    "Console.WriteLine((byte)(200.5 + 100.0));",
    "Console.WriteLine((int)(1.0/0.0));",
    "byte b = (byte)300.5; Console.WriteLine(b);",
    "Console.WriteLine((char)70000.5);",
    "Console.WriteLine((int)(char)70000);",
  ]) {
    const r = await run("csharp", code);
    assert.ok(
      errors(r).some((e) => e.startsWith("CompileError:") && e.includes("CS0221")),
      `${code} -> ${JSON.stringify(errors(r))}`,
    );
  }
  // 範囲内の定数キャストは従来どおり動作する。
  const inRange = await run("csharp", "Console.WriteLine((byte)200.5);");
  assert.deepEqual(outputs(inRange), [["200"]]);
  const intCast = await run("csharp", "Console.WriteLine((int)1.9);");
  assert.deepEqual(outputs(intCast), [["1"]]);
  const charOk = await run("csharp", "Console.WriteLine((char)66);");
  assert.deepEqual(outputs(charOk), [["B"]]);
  // 実行時（変数経由）の浮動小数点キャストは従来のモデル方針を維持する
  // （既定は未確認の unspecified 停止、checked は OverflowException）。
  const runtime = await run("csharp", "double d = 300.5; Console.WriteLine((byte)d);");
  assert.ok(errors(runtime).some((e) => e.startsWith("未確認:")), JSON.stringify(errors(runtime)));
  const runtimeChecked = await run("csharp", "double d = 300.5; Console.WriteLine(checked((byte)d));");
  assert.ok(errors(runtimeChecked).some((e) => e.startsWith("OverflowException:")), JSON.stringify(errors(runtimeChecked)));
  // 明示 unchecked の定数浮動小数点キャストの実物の畳み込み値は
  // unspecified のため、確定値を出さず未確認で停止する（監査裁定どおり）。
  const unc = await run("csharp", "Console.WriteLine(unchecked((byte)300.5));");
  assert.ok(errors(unc).some((e) => e.startsWith("未確認:")), JSON.stringify(errors(unc)));
  // 整数定数キャストの既存規則（RG-257）は不変。
  const intConst = await run("csharp", "Console.WriteLine((byte)300);");
  assert.ok(errors(intConst).some((e) => e.includes("CS0221")), JSON.stringify(errors(intConst)));
  const intUnc = await run("csharp", "Console.WriteLine(unchecked((byte)300));");
  assert.deepEqual(outputs(intUnc), [["44"]]);
});

// ---------- R29-N7／N6：文面の是正 ----------
test("R29-N7: the C# 'new' reference caution lists the rectangular and jagged forms", async () => {
  const d = getDefinition("csharp");
  const row = d.reference.find((r) => r.name === "new");
  assert.ok(row, "new reference row exists");
  assert.ok(row.caution.includes("new 型[個数,個数]"), row.caution);
  assert.ok(row.caution.includes("new 型[個数][]"), row.caution);
  assert.ok(!row.caution.includes("のみです"), row.caution);
  assert.ok(row.syntax.includes("new 型[個数,個数]"), row.syntax);
  assert.ok(row.syntax.includes("new 型[個数][]"), row.syntax);
  // 文面が主張する形は実際に動作する。
  const rect = await run("csharp", "int[,] a = new int[2,3]; Console.WriteLine(a.Length);");
  assert.deepEqual(outputs(rect), [["6"]]);
  const jagged = await run("csharp", "int[][] j = new int[2][]; j[0] = new int[3]; Console.WriteLine(j[0].Length);");
  assert.deepEqual(outputs(jagged), [["3"]]);
});
test("R29-N6: C/C++/C# support text no longer claims multidimensional arrays are unsupported", () => {
  for (const id of ["c", "cpp", "csharp"]) {
    const d = getDefinition(id);
    assert.ok(!d.semantics.support.includes("多次元配列、動的確保"), `${id}: ${d.semantics.support}`);
    assert.ok(!/未対応：[^。]*多次元配列/.test(d.semantics.support), `${id}: ${d.semantics.support}`);
    assert.ok(d.semantics.support.includes("多次元配列にも対応します"), `${id}: ${d.semantics.support}`);
  }
  const cs = getDefinition("csharp");
  const arrayRow = cs.reference.find((r) => r.name === "array");
  assert.ok(arrayRow.syntax.includes("int[,]"), arrayRow.syntax);
  assert.ok(arrayRow.syntax.includes("int[][]"), arrayRow.syntax);
});
