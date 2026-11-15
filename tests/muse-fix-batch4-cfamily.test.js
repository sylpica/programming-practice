import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ4・C家族班の回帰テスト。
// 対象：R25-N8（C家族分：キーワードリテラルの代入先素通り）、
// R25-N11（C家族分：不完全な数値リテラルの虚偽原因）、
// R25-N25（C# u 接尾辞の大リテラル）、R25-N26（TryParse の out なし）、
// R25-N27（TryParse の out _ ディスカード）、
// R25-N28（C# null 配列の foreach・要素代入）、
// R25-N29（C++ 波括弧初期化の整数定数 narrowing）。
// 一次情報：gcc／g++ 13.3 と dotnet 8.0.428（~/dotnet）の実測。
// 注意：R25-N25 の `long l = 4294967296u;` は findings が「合法」と
// していたが、実 dotnet では CS0266（ulong→long の暗黙変換なし）で
// あることを再実測で確認したため、実物どおりエラーとして固定する。

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

// ---------- R25-N8（C家族分）: キーワードリテラルへの代入は左辺を先に名指す ----------
test("R25-N8 C# keyword literal assignment targets fail with CS0131 before the right side", async () => {
  // 実 csc の最初の診断は CS0131（左辺の誤り）。右辺の未定義名 x を
  // 先に指してはならない（x は全形で未定義のまま使う）。
  for (const code of [`1 = x;`, `true = x;`, `false = x;`, `null = x;`, `1 = 5;`, `true = 5;`, `null = 5;`])
    await expectError("csharp", code, /代入先が不正です：リテラルには代入できません。代入の左辺は変数、プロパティ、またはインデクサーでなければなりません（CS0131）/, "CompileError");
  // 式位置の代入でも同じく左辺を名指す。
  await expectError("csharp", `int x = 0; (true = true);`, /CS0131/, "CompileError");
  // 通常の代入・代入式は壊さない。
  assert.equal(output(await first("csharp", `int x = 0; if ((x = 5) > 0) { Console.WriteLine(x); }`)), "5");
  assert.equal(output(await first("csharp", `bool b = true; Console.WriteLine(b); Console.WriteLine(true == false);`)), "True\nFalse");
  assert.equal(output(await first("csharp", `string s = null; Console.WriteLine(s == null);`)), "True");
});

test("R25-N8 C/C++ keyword literal assignment targets name the literal form", async () => {
  await expectError("cpp", `#include <iostream>\nint main(){ true = x; return 0; }`, /代入先が不正です：リテラルには代入できません/, "SyntaxError");
  await expectError("cpp", `#include <iostream>\nint main(){ true = 5; return 0; }`, /代入先が不正です：リテラルには代入できません/, "SyntaxError");
  await expectError("cpp", `#include <iostream>\nint main(){ nullptr = x; return 0; }`, /代入先が不正です：リテラルには代入できません/, "SyntaxError");
  await expectError("c", `#include <stdio.h>\nint main(){ 1 = x; return 0; }`, /代入先が不正です：リテラルには代入できません/, "SyntaxError");
  await expectError("cpp", `#include <iostream>\nint main(){ false = x; return 0; }`, /代入先が不正です：リテラルには代入できません/, "SyntaxError");
  await expectError("c", `#include <stdio.h>\nint main(){ true = 5; return 0; }`, /代入先が不正です：リテラルには代入できません/, "SyntaxError");
  // キーワードリテラルの通常の読み取りは壊さない。
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ int* p = nullptr; std::cout << (p == nullptr); return 0; }`)), "1");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ int a[3] = {1,2,3}; a[true] = 9; printf("%d", a[1]); return 0; }`)), "9");
});

// ---------- R25-N14（C家族の同根表面）: ポインタ代入の narration が代入先を特定する ----------
test("R25-N14 C/C++ pointer assignment narration names the assignment target", async () => {
  const traces = async (id, code) => {
    const p = await first(id, code);
    return p.trace.map((t) => t.text);
  };
  const deref = await traces("c", `#include <stdio.h>\nint main(){ int a[3] = {1,2,3}; int *p = &a[0]; *(p + 1) = 99; printf("%d", a[1]); return 0; }`);
  assert.ok(deref.includes("*(p + 1) に 99 を代入します"), JSON.stringify(deref));
  const plain = await traces("c", `#include <stdio.h>\nint main(){ int x = 1; int *p = &x; *p = 99; printf("%d", x); return 0; }`);
  assert.ok(plain.includes("*p に 99 を代入します"), JSON.stringify(plain));
  const compound = await traces("cpp", `#include <iostream>\nint main(){ int a[3] = {1,2,3}; int *p = &a[0]; *(p + 1) += 99; std::cout << a[1]; return 0; }`);
  assert.ok(compound.includes("*(p + 1) に 101 を代入します"), JSON.stringify(compound));
  const mod = await traces("c", `#include <stdio.h>\nint main(){ int a[2] = {1,2}; int *p = &a[0]; *(p + 1) %= 2; printf("%d", a[1]); return 0; }`);
  assert.ok(mod.includes("*(p + 1) に 0 を代入します"), JSON.stringify(mod));
  for (const list of [deref, plain, compound, mod])
    assert.ok(!list.some((t) => t.startsWith("対象 に")), JSON.stringify(list));
  // 値そのものは従来どおり正しく書き込まれる。
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ int a[3] = {1,2,3}; int *p = &a[0]; *(p + 1) = 99; printf("%d", a[1]); return 0; }`)), "99");
});

// ---------- R25-N11（C家族分）: 不完全な数値リテラルはリテラル自体を名指す ----------
test("R25-N11 incomplete numeric literals name the literal, not a missing semicolon", async () => {
  for (const [id, code, lit] of [
    ["csharp", `int x = 1e;`, "1e"],
    ["csharp", `int x = 1e+;`, "1e+"],
    ["csharp", `double d = 1.5e;`, "1.5e"],
    ["csharp", `int x = 0x;`, "0x"],
    ["csharp", `int x = 123abc;`, "123abc"],
    ["csharp", `int x = 0x1Fg;`, "0x1Fg"],
    ["c", `#include <stdio.h>\nint main(){ int x = 1e; return 0; }`, "1e"],
    ["cpp", `#include <iostream>\nint main(){ int x = 1e+; return 0; }`, "1e+"],
  ]) {
    const r = await run(id, code);
    const errs = errors(r);
    assert.ok(errs.length, code);
    assert.match(errs[0].message, new RegExp(`数値リテラルの書き方が不正です：${lit.replace("+", "\\+")}`), code);
    assert.doesNotMatch(errs[0].message, /; が必要です/, code);
  }
  // 正当な接尾辞つき形・指数形は壊さない。
  assert.equal(output(await first("csharp", `double d = 1e5f; Console.WriteLine(d);`)), "100000");
  assert.equal(output(await first("csharp", `double d = 1.5e-3; Console.WriteLine(d);`)), "0.0015");
  assert.equal(output(await first("csharp", `double d = 1.5e-3f; Console.WriteLine(d);`)), "0.001500000013038516");
  assert.equal(output(await first("csharp", `Console.WriteLine(10.5);`)), "10.5");
  // リテラル直結のメンバーアクセス（ドット＋識別子）は対象外のまま。
  await expectError("csharp", `Console.WriteLine(10.ToString());`, /この関数は説明に対応していません：\.ToString/);
});

// ---------- R25-N25: C# u 接尾辞リテラルの型決定（dotnet 実測行列） ----------
test("R25-N25 C# u-suffixed literals take the first fitting type of uint, ulong", async () => {
  // uint に収まる境界は従来どおり uint のまま。
  assert.equal(output(await first("csharp", `uint u = 4294967295u; Console.WriteLine(u);`)), "4294967295");
  // uint 変数と int 変数の加算は long へ昇格する（dotnet 実測）。
  // int 定数リテラルとの加算は実物では定数固有の uint 昇格になるが、
  // それは従来からの別表面であり本バッチの対象外（報告書に申し送り）。
  assert.equal(output(await first("csharp", `uint u = 4294967295u; int one = 1; Console.WriteLine(u + one);`)), "4294967296");
  assert.equal(output(await first("csharp", `uint u = 200u; Console.WriteLine(u);`)), "200");
  // uint を超える u リテラルは ulong。値がそのまま届く経路。
  assert.equal(output(await first("csharp", `ulong ul = 4294967296u; Console.WriteLine(ul);`)), "4294967296");
  assert.equal(output(await first("csharp", `ulong ul = 5000000000u; Console.WriteLine(ul);`)), "5000000000");
  assert.equal(output(await first("csharp", `double d = 4294967296u; Console.WriteLine(d);`)), "4294967296");
  assert.equal(output(await first("csharp", `Console.WriteLine(4294967296u);`)), "4294967296");
  assert.equal(output(await first("csharp", `Console.WriteLine(4294967296u + 1);`)), "4294967297");
  assert.equal(output(await first("csharp", `Console.WriteLine(0x100000000u);`)), "4294967296");
  assert.equal(output(await first("csharp", `Console.WriteLine((long)4294967296u);`)), "4294967296");
  // ulong から uint／long／byte への暗黙変換はない（実 dotnet は CS0266）。
  await expectError("csharp", `uint u = 4294967296u;`, /ulong から uint への暗黙の変換はできません/, "CompileError");
  await expectError("csharp", `uint u = 5000000000u;`, /ulong から uint への暗黙の変換はできません/, "CompileError");
  await expectError("csharp", `long l = 4294967296u;`, /ulong から long への暗黙の変換はできません/, "CompileError");
  await expectError("csharp", `byte b = 4294967296u;`, /ulong から byte への暗黙の変換はできません/, "CompileError");
  await expectError("csharp", `uint[] a = {4294967296u};`, /ulong から uint への暗黙の変換はできません/, "CompileError");
  // ul／L 接尾辞の大リテラルは従来どおり壊さない。
  assert.equal(output(await first("csharp", `ulong ul = 5000000000ul; Console.WriteLine(ul);`)), "5000000000");
  assert.equal(output(await first("csharp", `long l = 5000000000L; Console.WriteLine(l);`)), "5000000000");
  assert.equal(output(await first("csharp", `Console.WriteLine(4294967296LU);`)), "4294967296");
});

// ---------- R25-N26: TryParse の out なし呼び出しは CS1620 ----------
test("R25-N26 C# TryParse without out is CS1620 and does not execute the assignment", async () => {
  await expectError("csharp", `int n = 0; bool ok = int.TryParse("42", n);`, /int\.TryParse の第2引数は out キーワードを付けて渡す必要があります（CS1620）/, "CompileError");
  await expectError("csharp", `double v = 0; bool ok = double.TryParse("1.5", v);`, /double\.TryParse の第2引数は out キーワードを付けて渡す必要があります（CS1620）/, "CompileError");
  await expectError("csharp", `int n; int.TryParse("42", n);`, /CS1620/, "CompileError");
  // out つきの正規形は壊さない。
  assert.equal(output(await first("csharp", `int n; bool ok = int.TryParse("42", out n); Console.WriteLine(ok); Console.WriteLine(n);`)), "True\n42");
  assert.equal(output(await first("csharp", `bool ok = int.TryParse("42", out int n); Console.WriteLine(n);`)), "42");
});

// ---------- R25-N27: TryParse の out _ ディスカード ----------
test("R25-N27 C# TryParse out _ discard is legal and creates no variable", async () => {
  const p1 = await first("csharp", `bool ok = int.TryParse("42", out _); Console.WriteLine(ok);`);
  assert.equal(output(p1), "True");
  assert.ok(!("_" in p1.vars), "discard must not create a variable named _");
  assert.equal(output(await first("csharp", `bool ok = double.TryParse("1.5", out _); Console.WriteLine(ok);`)), "True");
  assert.equal(output(await first("csharp", `bool ok = int.TryParse("xx", out _); Console.WriteLine(ok);`)), "False");
  // 未宣言名への out は従来どおり正しい理由で停止する。
  await expectError("csharp", `bool ok = int.TryParse("42", out zz);`, /変数が宣言されていません：zz/, "CompileError");
  // 宣言済み変数としての `_` の通常使用は壊さない。実 dotnet では
  // 宣言済みの `_` への out _ はディスカードではなくその変数への
  // 代入になる（実測：_ は 42 になる）。
  assert.equal(output(await first("csharp", `int _ = 5; Console.WriteLine(_);`)), "5");
  assert.equal(output(await first("csharp", `int _ = 5; bool ok = int.TryParse("42", out _); Console.WriteLine(_);`)), "42");
});

// ---------- R25-N28: C# null 配列の foreach・要素代入は NullReferenceException ----------
test("R25-N28 C# null array foreach and element assignment throw NullReferenceException", async () => {
  await expectError("csharp", `int[] a = null; foreach (int x in a) { Console.WriteLine(x); }`, /null参照です/, "NullReferenceException");
  await expectError("csharp", `string[] s = null; foreach (string x in s) { Console.WriteLine(x); }`, /null参照です/, "NullReferenceException");
  await expectError("csharp", `int[] a = null; a[0] = 5;`, /null参照です/, "NullReferenceException");
  await expectError("csharp", `int[] a = null; a[0] += 5;`, /null参照です/, "NullReferenceException");
  // RG-172 で是正済みの経路と、非 null の foreach は壊さない。
  await expectError("csharp", `int[] a = null; Console.WriteLine(a[0]);`, /null参照です/, "NullReferenceException");
  await expectError("csharp", `int[] a = null; Console.WriteLine(a.Length);`, /null参照です/, "NullReferenceException");
  assert.equal(output(await first("csharp", `int[] a = {1,2}; int t = 0; foreach (int x in a) { t += x; } Console.WriteLine(t);`)), "3");
  assert.equal(output(await first("csharp", `int[] a = {1,2}; a[0] = 5; Console.WriteLine(a[0]);`)), "5");
});

// ---------- R25-N29: C++ 波括弧初期化の整数定数 narrowing ----------
test("R25-N29 C++ braced-init integer constant narrowing to unsigned types errors", async () => {
  const H = `#include <cstdio>\n`;
  await expectError("cpp", `${H}int main(){ unsigned int a[1] = {-1}; std::printf("%u\\n", a[0]); return 0; }`, /波括弧初期化で整数の定数 -1 を unsigned int へ縮小変換（narrowing）はできません/, "CompileError");
  await expectError("cpp", `${H}int main(){ unsigned char a[1] = {300}; std::printf("%d\\n", a[0]); return 0; }`, /波括弧初期化で整数の定数 300 を unsigned char へ縮小変換（narrowing）はできません/, "CompileError");
  await expectError("cpp", `${H}int main(){ unsigned short a[1] = {70000}; std::printf("%u\\n", a[0]); return 0; }`, /波括弧初期化で整数の定数 70000 を unsigned short へ縮小変換（narrowing）はできません/, "CompileError");
  await expectError("cpp", `${H}int main(){ unsigned long a[1] = {-1}; std::printf("%lu\\n", a[0]); return 0; }`, /narrowing/, "CompileError");
  await expectError("cpp", `${H}int main(){ unsigned int a[1] = {4294967296}; std::printf("%u\\n", a[0]); return 0; }`, /narrowing/, "CompileError");
  // スカラー波括弧形も同じ理由文に揃える。
  await expectError("cpp", `${H}int main(){ unsigned char c = {300}; std::printf("%d\\n", c); return 0; }`, /波括弧初期化で整数の定数 300 を unsigned char へ縮小変換（narrowing）はできません/, "CompileError");
  await expectError("cpp", `${H}int main(){ unsigned int u = {-1}; std::printf("%u\\n", u); return 0; }`, /narrowing/, "CompileError");
  await expectError("cpp", `${H}int main(){ int x = {1.5}; std::printf("%d\\n", x); return 0; }`, /波括弧初期化で浮動小数点の定数を整数型へ縮小変換（narrowing）はできません/, "CompileError");
  // 範囲内の定数・変数要素・符号付きの既存裁定・C 側は壊さない。
  assert.equal(output(await first("cpp", `${H}int main(){ unsigned char a[2] = {65, 66}; std::printf("%d %d\\n", a[0], a[1]); return 0; }`)), "65 66\n");
  assert.equal(output(await first("cpp", `${H}int main(){ int v = -1; unsigned int a[1] = {v}; std::printf("%u\\n", a[0]); return 0; }`)), "4294967295\n");
  assert.equal(output(await first("cpp", `${H}int main(){ unsigned char c = {65}; std::printf("%d\\n", c); return 0; }`)), "65\n");
  assert.equal(output(await first("cpp", `${H}int main(){ int x = {5}; std::printf("%d\\n", x); return 0; }`)), "5\n");
  await expectError("cpp", `${H}int main(){ short a[1] = {70000}; std::printf("%d\\n", a[0]); return 0; }`, /処理系依存/, "環境依存");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned int a[1] = {-1}; printf("%u\\n", a[0]); return 0; }`)), "4294967295\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned char a[1] = {300}; printf("%d\\n", a[0]); return 0; }`)), "44\n");
  // 浮動小数点定数の既是正分も維持する。
  await expectError("cpp", `${H}int main(){ int a[1] = {1.5}; std::printf("%d\\n", a[0]); return 0; }`, /narrowing/, "CompileError");
});
