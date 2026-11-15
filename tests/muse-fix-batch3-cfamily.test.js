import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ3・C家族班の回帰テスト。
// 対象：R24-N9（abs の引数検証）、R24-N10（C# null 配列）、
// R24-N11（new 型[n]{…} の要素数）、R24-N33／N34（TryParse）、
// R24-N15 の C# 部分（リテラル直結メンバー）、
// §3.3 既知残存2件（C++ narrowing／C# 接尾辞付き定数）。
// 一次情報：gcc／g++ 13.3 と dotnet 8 の実測。

const run = async (id, code, model) => {
  const d = getDefinition(id);
  const m = model
    ? { ...structuredClone(d.model.defaults), ...model }
    : structuredClone(d.model.defaults);
  return d.simulate(code, m);
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const first = async (id, code, model) => {
  const r = await run(id, code, model);
  assert.deepEqual(errors(r), [], JSON.stringify(errors(r)));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const output = (p) => p.outputs.map((o) => o.text).join("\n");
const expectError = async (id, code, pattern, category) => {
  const r = await run(id, code);
  const errs = errors(r);
  assert.ok(errs.length, `expected an error for: ${code}`);
  assert.match(errs[0].message, pattern);
  if (category) assert.equal(errs[0].category, category);
};

// ---------- R24-N9: abs の引数個数・型検証（gcc／g++ 実測は全てコンパイルエラー） ----------
test("R24-N9 abs validates argument count and type (C/C++)", async () => {
  const head = `#include <stdio.h>\n#include <stdlib.h>\n`;
  await expectError("c", `${head}int main(){ printf("%d\\n", abs()); return 0; }`, /abs は引数を1つだけ取ります/, "CompileError");
  await expectError("c", `${head}int main(){ printf("%d\\n", abs(1, 2)); return 0; }`, /abs は引数を1つだけ取ります/, "CompileError");
  await expectError("c", `${head}int main(){ printf("%d\\n", abs("x")); return 0; }`, /abs の引数は数値でなければなりません/, "CompileError");
  await expectError("cpp", `#include <iostream>\n#include <cstdlib>\nint main(){ std::cout << abs() << std::endl; return 0; }`, /abs は引数を1つだけ取ります/, "CompileError");
  await expectError("cpp", `#include <iostream>\n#include <cstdlib>\nint main(){ std::cout << abs(1, 2) << std::endl; return 0; }`, /abs は引数を1つだけ取ります/, "CompileError");
  await expectError("cpp", `#include <iostream>\n#include <cstdlib>\nint main(){ std::cout << abs("x") << std::endl; return 0; }`, /abs の引数は数値でなければなりません/, "CompileError");
  // 正規形は従来どおり動く。
  assert.equal(output(await first("c", `${head}int main(){ printf("%d\\n", abs(-3)); return 0; }`)), "3\n");
  assert.equal(output(await first("cpp", `#include <iostream>\n#include <cstdlib>\nint main(){ std::cout << abs(-3) << std::endl; return 0; }`)), "3\n");
  // 同根一掃：固定引数関数の件数検証（Console.ReadLine は引数を取らない）。
  await expectError("csharp", `string s = Console.ReadLine(1);`, /Console\.ReadLine は引数を取りません/, "CompileError");
});

// ---------- R24-N10: C# の null 配列変数 ----------
test("R24-N10 C# null array declaration is accepted, member access throws NullReferenceException", async () => {
  assert.equal(output(await first("csharp", `int[] a = null; Console.WriteLine("ok");`)), "ok");
  assert.equal(output(await first("csharp", `int[] a = null; Console.WriteLine(a == null);`)), "True");
  assert.equal(output(await first("csharp", `string[] s = null; Console.WriteLine(s == null);`)), "True");
  await expectError("csharp", `int[] a = null; Console.WriteLine(a.Length);`, /null参照です/, "NullReferenceException");
  await expectError("csharp", `int[] a = null; Console.WriteLine(a[0]);`, /null参照です/, "NullReferenceException");
});

// ---------- R24-N11: new 型[n]{…} の要素数不一致は CS0847 相当 ----------
test("R24-N11 C# new T[n]{...} element count must match the declared length", async () => {
  await expectError("csharp", `int[] a = new int[3]{1,2};`, /要素数（2）が宣言長（3）と一致しません/, "CompileError");
  await expectError("csharp", `int[] a = new int[2]{1,2,3};`, /要素数（3）が宣言長（2）と一致しません/, "CompileError");
  await expectError("csharp", `string[] s = new string[2]{"a"};`, /要素数（1）が宣言長（2）と一致しません/, "CompileError");
  assert.equal(output(await first("csharp", `int[] a = new int[2]{1,2}; Console.WriteLine(a.Length);`)), "2");
  assert.equal(output(await first("csharp", `int n = 3; int[] a = new int[n]{1,2,3}; Console.WriteLine(a[2]);`)), "3");
  assert.equal(output(await first("csharp", `int[] a = new int[0]{}; Console.WriteLine(a.Length);`)), "0");
  // 宣言長なし形・ construct 形は従来どおり。
  assert.equal(output(await first("csharp", `int[] a = new int[]{1,2,3}; Console.WriteLine(a.Length);`)), "3");
  assert.equal(output(await first("csharp", `int[] a = new int[3]; Console.WriteLine(a.Length);`)), "3");
});

// ---------- R24-N33/N34: TryParse の既定スタイルと null ----------
test("R24-N33/N34 C# TryParse follows the default styles and null returns False", async () => {
  const dbl = async (s) => {
    const p = await first("csharp", `double d; bool ok = double.TryParse(${s}, out d); Console.WriteLine(ok); Console.WriteLine(d);`);
    return output(p);
  };
  // dotnet 実測（Float | AllowThousands）。
  assert.equal(await dbl(`"NaN"`), "True\nNaN");
  assert.equal(await dbl(`"nan"`), "True\nNaN");
  assert.equal(await dbl(`"-NaN"`), "True\nNaN");
  assert.equal(await dbl(`"1,000.5"`), "True\n1000.5");
  assert.equal(await dbl(`"1,0,0"`), "True\n100");
  assert.equal(await dbl(`"100,"`), "True\n100");
  assert.equal(await dbl(`"1,000e2"`), "True\n100000");
  assert.equal(await dbl(`"Infinity"`), "True\nInfinity");
  assert.equal(await dbl(`"-Infinity"`), "True\n-Infinity");
  assert.equal(await dbl(`" 1.5 "`), "True\n1.5");
  assert.equal(await dbl(`"1."`), "True\n1");
  assert.equal(await dbl(`".5"`), "True\n0.5");
  assert.equal(await dbl(`"1e999"`), "True\nInfinity");
  // 実物が False の形は False のまま（Number() の緩い解釈を排除）。
  for (const bad of [`"0x10"`, `"0b101"`, `",100"`, `"1.5,5"`, `"1e1,0"`, `"1_000"`, `"1.5e"`, `"."`, `"$1.5"`, `"1 000"`, `"∞"`, `""`])
    assert.equal(await dbl(bad), "False\n0", bad);
  const int_ = async (s) => {
    const p = await first("csharp", `int n; bool ok = int.TryParse(${s}, out n); Console.WriteLine(ok); Console.WriteLine(n);`);
    return output(p);
  };
  assert.equal(await int_(`" 42 "`), "True\n42");
  assert.equal(await int_(`"+42"`), "True\n42");
  assert.equal(await int_(`"1,000"`), "False\n0"); // Integer スタイルは桁区切りを認めない
  assert.equal(await int_(`"2147483648"`), "False\n0");
  assert.equal(await int_(`"42.0"`), "False\n0");
  // N34：null は例外ではなく False。
  assert.equal(await int_(`null`), "False\n0");
  assert.equal(await dbl(`null`), "False\n0");
});

// ---------- R24-N15（C# 部分）: 整数リテラル直結のメンバーアクセス ----------
test("R24-N15 C# member access on an integer literal names the member", async () => {
  await expectError("csharp", `Console.WriteLine(10.ToString());`, /この関数は説明に対応していません：\.ToString/, undefined);
  const named = await run("csharp", `Console.WriteLine(10.ToString());`);
  assert.doesNotMatch(errors(named)[0].message, /\) が必要です/);
  // 浮動小数点リテラル・末尾ドット形は壊さない。
  assert.equal(output(await first("csharp", `double d = 10.5; Console.WriteLine(d);`)), "10.5");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ printf("%f\\n", 10.); return 0; }`)), "10.000000\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ double d = 1.e3; printf("%f\\n", d); return 0; }`)), "1000.000000\n");
});

// ---------- §3.3(a): unsigned 配列初期化子の浮動小数点要素は言語別 ----------
test("§3.3(a) floating elements in braced array initializers: C truncates, C++ errors on constants", async () => {
  // C：暗黙変換として合法（gcc 実測で警告止まり、値は切り捨て）。
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned int a[2] = {1.5, 2}; printf("%u %u\\n", a[0], a[1]); return 0; }`)), "1 2\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ int a[2] = {1.5, 2}; printf("%d %d\\n", a[0], a[1]); return 0; }`)), "1 2\n");
  // C++：定数の浮動小数点→整数は narrowing でエラー（g++ 実測）。
  await expectError("cpp", `#include <cstdio>\nint main(){ unsigned int a[2] = {1.5, 2}; std::printf("%u\\n", a[0]); return 0; }`, /narrowing/, "CompileError");
  await expectError("cpp", `#include <cstdio>\nint main(){ int a[2] = {1.0, 2}; std::printf("%d\\n", a[0]); return 0; }`, /narrowing/, "CompileError");
  // C++：非定数（変数）の浮動小数点要素は g++ でも警告止まりで切り捨て。
  assert.equal(output(await first("cpp", `#include <cstdio>\nint main(){ double d = 1.5; int a[2] = {d, 2}; std::printf("%d %d\\n", a[0], a[1]); return 0; }`)), "1 2\n");
  // C++：浮動小数点型の配列への浮動小数点要素は従来どおり。
  assert.equal(output(await first("cpp", `#include <cstdio>\nint main(){ double a[2] = {1.5, 2}; std::printf("%f\\n", a[0]); return 0; }`)), "1.500000\n");
});

// ---------- §3.3(b): C# 接尾辞付き定数 × 狭い整数型（dotnet 実測は全て CS0266） ----------
test("§3.3(b) C# suffixed integer constants have no implicit conversion to narrower types", async () => {
  for (const code of [
    `byte b = 200u;`,
    `byte b = 200L;`,
    `byte b = 200ul;`,
    `int n = 200u;`,
    `short s = 200u;`,
    `ushort us = 200u;`,
    `sbyte sb = 100u;`,
    `char c = 65u;`,
    `int n = 200L;`,
    `uint u = 200L;`,
    `long l = 200ul;`,
    `int n = 200ul;`,
    `byte b = (uint)200;`,
    `byte b = 100u + 100u;`,
  ])
    await expectError("csharp", code, /暗黙の変換はできません/, "CompileError");
  // 実 C# で合法な形は壊さない。
  assert.equal(output(await first("csharp", `uint u = 200u; Console.WriteLine(u);`)), "200");
  assert.equal(output(await first("csharp", `long l = 200u; Console.WriteLine(l);`)), "200");
  assert.equal(output(await first("csharp", `ulong ul = 200u; Console.WriteLine(ul);`)), "200");
  assert.equal(output(await first("csharp", `ulong ul = 200ul; Console.WriteLine(ul);`)), "200");
  assert.equal(output(await first("csharp", `long l = 200L; Console.WriteLine(l);`)), "200");
  assert.equal(output(await first("csharp", `ulong ul = 200L; Console.WriteLine(ul);`)), "200");
  assert.equal(output(await first("csharp", `byte b = 200; Console.WriteLine(b);`)), "200");
  assert.equal(output(await first("csharp", `float f = 200u; Console.WriteLine(f);`)), "200");
  assert.equal(output(await first("csharp", `byte b = (byte)200u; Console.WriteLine(b);`)), "200");
  assert.equal(output(await first("csharp", `uint[] a = {4000000000u}; Console.WriteLine(a[0]);`)), "4000000000");
  assert.equal(output(await first("csharp", `uint[] a = {3000000000}; Console.WriteLine(a[0]);`)), "3000000000");
});
