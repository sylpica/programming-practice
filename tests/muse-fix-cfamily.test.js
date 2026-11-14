import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const first = async (id, code) => {
  const r = await run(id, code);
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

// ---------- RG-05: C# type semantics ----------
test("RG-05 C# char arithmetic promotes to int", async () => {
  assert.equal(output(await first("csharp", `Console.WriteLine('a' + 1);`)), "98");
  assert.equal(output(await first("csharp", `Console.WriteLine('a' + 'b');`)), "195");
  assert.equal(output(await first("csharp", `char c = 'a'; Console.WriteLine(c + 1);`)), "98");
  assert.equal(output(await first("csharp", `int n = 'a'; Console.WriteLine(n);`)), "97");
});
test("RG-05 C# equality across incompatible types is a compile error", async () => {
  await expectError("csharp", `Console.WriteLine(1 == "1");`, /型が一致しません/, "CompileError");
  await expectError("csharp", `Console.WriteLine(true == 1);`, /型が一致しません/, "CompileError");
  await expectError("csharp", `Console.WriteLine("a" < "b");`, /文字列に関係演算子/, "CompileError");
});
test("RG-05 C# null string concatenation treats null as empty", async () => {
  assert.equal(output(await first("csharp", `string s = null; Console.WriteLine(s + 1);`)), "1");
  assert.equal(output(await first("csharp", `string s = null; Console.WriteLine(s + "x");`)), "x");
});
test("RG-05 C# implicit narrowing from double is an explicit error, cast works", async () => {
  await expectError("csharp", `double d = 1.9; int i = d;`, /暗黙の縮小変換はできません/, "CompileError");
  assert.equal(output(await first("csharp", `double d = 1.9; Console.WriteLine((int)d);`)), "1");
});

// ---------- RG-52: C# operator rules ----------
test("RG-52 C# bool &, |, ^ are logical operators", async () => {
  assert.equal(output(await first("csharp", `bool b = true & false; Console.WriteLine(b);`)), "False");
  assert.equal(output(await first("csharp", `Console.WriteLine(true | false);`)), "True");
  assert.equal(output(await first("csharp", `if (true ^ false) { Console.WriteLine("y"); }`)), "y");
});
test("RG-52 C# MinValue % -1 is 0 while MinValue / -1 overflows", async () => {
  assert.equal(output(await first("csharp", `int x = int.MinValue; Console.WriteLine(x % -1);`)), "0");
  await expectError("csharp", `int x = int.MinValue; Console.WriteLine(x / -1);`, /オーバーフロー/, "OverflowException");
});
test("RG-52 C# ++/-- wrap in unchecked context; C/C++ ++ overflow is UB", async () => {
  assert.equal(output(await first("csharp", `int x = 2147483647; x++; Console.WriteLine(x);`)), "-2147483648");
  assert.equal(output(await first("csharp", `int x = -2147483648; x--; Console.WriteLine(x);`)), "2147483647");
  await expectError("c", String.raw`int main(){ int x = 2147483647; x++; printf("%d", x); return 0; }`, /符号付き整数のオーバーフロー/, "未定義動作");
});

// ---------- RG-53: literal safe-range guard at expression positions ----------
test("RG-53 oversized integer literals stop honestly at expression positions", async () => {
  await expectError("cpp", `#include <iostream>\nint main(){ std::cout << 9007199254740993L; return 0; }`, /安全に計算できる範囲外/, "未確認");
  await expectError("c", String.raw`int main(){ printf("%d", (int)(9223372036854775807L - 9223372036854775806L)); return 0; }`, /安全に計算できる範囲外/, "未確認");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ std::cout << 9007199254740991L; return 0; }`)), "9007199254740991");
});

// ---------- RG-54 / RG-06: shifts and C# string members ----------
test("RG-54 shifts work at argument positions too", async () => {
  assert.equal(output(await first("c", String.raw`int main(){ printf("%d", 1 << 3); return 0; }`)), "8");
  assert.equal(output(await first("c", String.raw`int main(){ int y = 16 >> 2; printf("%d", y); return 0; }`)), "4");
});
test("RG-54 C# string index returns char, .Length works", async () => {
  assert.equal(output(await first("csharp", `string s = "hello"; Console.WriteLine((int)s[0]);`)), "104");
  assert.equal(output(await first("csharp", `string s = "hello"; Console.WriteLine(s[1]);`)), "e");
  assert.equal(output(await first("csharp", `string s = "hello"; Console.WriteLine(s.Length);`)), "5");
});

// ---------- RG-06: parser syntax coverage ----------
test("RG-06 ternary operator in all positions", async () => {
  assert.equal(output(await first("csharp", `Console.WriteLine(1 < 2 ? "y" : "n");`)), "y");
  assert.equal(output(await first("c", String.raw`int main(){ int x = 1 < 2 ? 10 : 20; printf("%d", x); return 0; }`)), "10");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ int n = 3; std::cout << (n > 0 ? "pos" : "neg"); return 0; }`)), "pos");
});
test("RG-06 C# string interpolation", async () => {
  assert.equal(output(await first("csharp", `int n = 5; Console.WriteLine($"n={n}!");`)), "n=5!");
  await expectError("csharp", `int n = 5; Console.WriteLine($"{n:00}");`, /書式指定子/, "未対応");
});
test("RG-06 braceless if-else in C and C#", async () => {
  assert.equal(output(await first("c", String.raw`int main(){ int x = 1; if (x > 0) printf("a"); else printf("b"); return 0; }`)), "a");
  assert.equal(output(await first("csharp", `int x = 0; if (x > 0) Console.WriteLine("a"); else Console.WriteLine("b");`)), "b");
});
test("RG-06 user function definitions stop naming the function", async () => {
  await expectError("c", `int add(int a, int b) { return a + b; } int main(){ return 0; }`, /ユーザー定義関数 add/, "未対応");
});
test("RG-06 static members and casts in C#", async () => {
  assert.equal(output(await first("csharp", `Console.WriteLine(int.MaxValue);`)), "2147483647");
  assert.equal(output(await first("csharp", `Console.WriteLine(Math.PI);`)), "3.141592653589793");
  assert.equal(output(await first("csharp", `Console.WriteLine(String.Empty + "x");`)), "x");
  await expectError("csharp", `DateTime d = new DateTime(2024, 1, 1);`, /DateTime/);
});
test("RG-06 assignment expressions, foreach, checked expressions", async () => {
  assert.equal(output(await first("csharp", `int x = 0; if ((x = 5) > 0) { Console.WriteLine(x); }`)), "5");
  assert.equal(output(await first("csharp", `int[] a = {1,2,3}; int t = 0; foreach (int v in a) { t += v; } Console.WriteLine(t);`)), "6");
  await expectError("csharp", `int x = 2147483647; int y = checked(x + 1);`, /オーバーフロー/, "OverflowException");
  assert.equal(output(await first("csharp", `int x = 2147483647; int y = unchecked(x + 1); Console.WriteLine(y);`)), "-2147483648");
});
test("RG-06 prefix ++/--, %=, generics, TryParse, new array initializer, getline, do-while, switch", async () => {
  assert.equal(output(await first("c", String.raw`int main(){ int x = 1; ++x; printf("%d", x); return 0; }`)), "2");
  assert.equal(output(await first("c", String.raw`int main(){ int x = 10; x %= 3; printf("%d", x); return 0; }`)), "1");
  await expectError("cpp", `#include <iostream>\nint main(){ std::vector<int> v; return 0; }`, /ジェネリック型 vector/, "未対応");
  assert.equal(output(await first("csharp", `string t = "42"; int v; bool ok = int.TryParse(t, out v); Console.WriteLine(v);`)), "42");
  assert.equal(output(await first("csharp", `string t = "42"; bool ok = int.TryParse(t, out int v); Console.WriteLine(v);`)), "42");
  assert.equal(output(await first("csharp", `int[] a = new int[] {1, 2}; Console.WriteLine(a[1]);`)), "2");
  assert.equal(output(await first("cpp", `#include <iostream>\n#include <string>\nint main(){ std::string s; std::getline(std::cin, s); std::cout << "done"; return 0; }`)), "done");
  assert.equal(output(await first("c", String.raw`int main(){ int x = 5; do { x++; } while (x < 7); printf("%d", x); return 0; }`)), "7");
  await expectError("c", String.raw`int main(){ int x = 1; switch (x) { case 1: printf("a"); } return 0; }`, /switch 文は未対応/, "未対応");
});
test("RG-06 preprocessing lines and sizeof forms (R15-N4/N5)", async () => {
  assert.equal(output(await first("cpp", `#include<stdio.h>\nint main(){ printf("a"); return 0; }`)), "a");
  await expectError("cpp", `#include <iostream>\nint main(){ std::cout << sizeof(int*); return 0; }`, /sizeof\(int \*\) は未対応/);
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ std::cout << sizeof(long long); return 0; }`)), "8");
  await expectError("c", `#define MAX 3\nint main(){ return 0; }`, /#define/, "未対応");
});
test("RG-06 adjacent string literals and literal prefixes (R15-N8/N9)", async () => {
  assert.equal(output(await first("c", String.raw`int main(){ char s[] = "ab" "cd"; printf("%s", s); return 0; }`)), "abcd");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ std::cout << u8"hi"; return 0; }`)), "hi");
  await expectError("cpp", `#include <iostream>\n#include <string>\nint main(){ std::string s = R"(hi)"; return 0; }`, /raw 文字列/, "未対応");
  await expectError("csharp", `string s = """hi""";`, /raw 文字列/, "未対応");
});

// ---------- RG-11: numeric literal grammar ----------
test("RG-11 radix literals and leading-zero octal", async () => {
  assert.equal(output(await first("c", String.raw`int main(){ printf("%d", 0x1F); return 0; }`)), "31");
  assert.equal(output(await first("c", String.raw`int main(){ printf("%d", 0b101); return 0; }`)), "5");
  assert.equal(output(await first("c", String.raw`int main(){ printf("%d", 010); return 0; }`)), "8");
  assert.equal(output(await first("c", String.raw`int main(){ printf("%d", 077); return 0; }`)), "63");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ std::cout << 0x1F << " " << 0b101 << " " << 010; return 0; }`)), "31 5 8");
  await expectError("c", String.raw`int main(){ int x = 08; return 0; }`, /8進整数リテラル/, "CompileError");
});
test("RG-11 suffixes and long long declarations leave no phantom variables", async () => {
  assert.equal(output(await first("c", String.raw`int main(){ unsigned int x = 1U; printf("%u", x); return 0; }`)), "1");
  const p = await first("c", String.raw`int main(){ long long x = 5; printf("%d", (int)x); return 0; }`);
  assert.equal(output(p), "5");
  assert.ok(!("long" in p.vars), "phantom variable 'long' must not exist");
  await expectError("csharp", `decimal d = 1.5m;`, /decimal/);
  await expectError("csharp", `Console.WriteLine(1.5m);`, /decimal リテラル/);
});

// ---------- RG-40: C++ std::string model ----------
test("RG-40 std::string valid indexing and direct initialization", async () => {
  assert.equal(output(await first("cpp", `#include <iostream>\n#include <string>\nint main(){ std::string s = "hello"; std::cout << s[1]; return 0; }`)), "e");
  assert.equal(output(await first("cpp", `#include <iostream>\n#include <string>\nint main(){ std::string s("ab"); std::cout << s; return 0; }`)), "ab");
  assert.equal(output(await first("cpp", `#include <iostream>\n#include <string>\nint main(){ std::string s = "hi"; s[0] = 'H'; std::cout << s; return 0; }`)), "Hi");
  await expectError("cpp", `#include <iostream>\n#include <string>\nint main(){ std::string s = "hi"; std::cout << s[5]; return 0; }`, /有効範囲外の添字/, "未定義動作");
});

// ---------- RG-42: literals are never rewritten ----------
test("RG-42 std:: inside string literals is preserved", async () => {
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ std::cout << "std::ok"; return 0; }`)), "std::ok");
  assert.equal(output(await first("c", String.raw`int main(){ printf("std::ok"); return 0; }`)), "std::ok");
  assert.equal(output(await first("csharp", `string s = "std::ok"; Console.WriteLine(s);`)), "std::ok");
});

// ---------- RG-04: language-correct display ----------
test("RG-04 C# display: bool casing, concatenation, double format, array WriteLine, -0.0", async () => {
  assert.equal(output(await first("csharp", `bool b = true; Console.WriteLine("x" + b);`)), "xTrue");
  assert.equal(output(await first("csharp", `Console.WriteLine(1e20);`)), "1E+20");
  assert.equal(output(await first("csharp", `Console.WriteLine(100.0 / 7);`)), "14.285714285714286");
  assert.equal(output(await first("csharp", `int[] a = {1,2}; Console.WriteLine(a);`)), "System.Int32[]");
  assert.equal(output(await first("csharp", `double d = -0.0; Console.WriteLine(d);`)), "-0");
  const p = await first("csharp", `bool b = true; double d = -0.0;`);
  const groups = Object.fromEntries(p.groups.flatMap((g) => g.entries));
  assert.equal(groups.b, "True");
  assert.equal(groups.d, "-0");
});
test("RG-04 C/C++ display: printf %f and cout %g keep the -0.0 sign and digits", async () => {
  assert.equal(output(await first("c", String.raw`int main(){ double d = -0.0; printf("%f", d); return 0; }`)), "-0.000000");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ std::cout << 1.0 / 3.0; return 0; }`)), "0.333333");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ double d = -0.0; std::cout << d; return 0; }`)), "-0");
});

// ---------- RG-58: return reference entries ----------
test("RG-58 C/C++/C# references include a return entry with details", () => {
  for (const id of ["c", "cpp", "csharp"]) {
    const d = getDefinition(id);
    const entry = d.reference.find((r) => r.name === "return");
    assert.ok(entry, `${id} must have a return reference entry`);
    assert.ok(entry.returns, `${id}/return must have returns`);
    assert.match(entry.source, /^https:\/\//);
  }
});

// ---------- RG-59: user-defined names never reach trace refs ----------
test("RG-59 trace refs contain only reference names for all C-family templates", async () => {
  for (const id of ["c", "cpp", "csharp"]) {
    const d = getDefinition(id);
    const names = new Set(d.reference.map((r) => r.name));
    for (const t of d.templates) {
      const r = await run(id, t.code);
      for (const p of r.paths || [])
        for (const tr of p.trace || [])
          for (const ref of tr.refs || [])
            assert.ok(names.has(ref), `${id}/${t.id}: ref '${ref}' has no reference entry`);
    }
  }
});

// RG-67（R19-N1）: C／C++ の行スプライス（行末バックスラッシュ）がコメントを次行へつなぐ
test("RG-67 C/C++ line comment splice swallows the next line", async () => {
  const code = "#include <stdio.h>\nint main() {\n    int x = 42;\n    // comment \\\n    x = 999;\n    printf(\"%d\\n\", x);\n    return 0;\n}";
  for (const id of ["c", "cpp"]) {
    const p = await first(id, code);
    assert.deepEqual(p.outputs.map((o) => o.text), ["42\n"], id);
  }
});
test("RG-67 C/C++ block comment can end through a splice", async () => {
  const code = "#include <stdio.h>\nint main() {\n    int x = 42;\n    /* comment *\\\n/ x = 999;\n    printf(\"%d\\n\", x);\n    return 0;\n}";
  const p = await first("c", code);
  assert.deepEqual(p.outputs.map((o) => o.text), ["999\n"]);
});

// RG-40 追加表面（R20-N1）: C++ の std::string 既定構築は空文字列として初期化済み
test("RG-40 surface a default-constructed std::string is an empty string", async () => {
  const code = "#include <iostream>\n#include <string>\nint main() {\n    std::string s;\n    std::cout << \"[\" << s << \"]\" << std::endl;\n    std::cout << (s == \"\") << std::endl;\n    s += \"x\";\n    std::cout << s << std::endl;\n    return 0;\n}";
  const p = await first("cpp", code);
  assert.deepEqual(p.outputs.map((o) => o.text), ["[]\n", "1\n", "x\n"]);
});

// RG-71（R19-N9）: C++ の std::string × 数値の比較は型を指して停止する
test("RG-71 std::string compared with a number stops with the types named", async () => {
  const code = "#include <iostream>\n#include <string>\nint main() {\n    std::string s = \"a\";\n    std::cout << (s == 1) << std::endl;\n    return 0;\n}";
  const r = await run("cpp", code);
  assert.match(errors(r)[0].message, /std::string と int は比較できません/);
  const ok = await first("cpp", "#include <iostream>\n#include <string>\nint main() {\n    std::string s = \"a\";\n    std::cout << (s == \"a\") << (s == 'a') << std::endl;\n    return 0;\n}");
  assert.deepEqual(ok.outputs.map((o) => o.text), ["11\n"]);
});

// RG-76（R20-N6）: C++ で std::string を条件に置くと型エラーで停止する
test("RG-76 a std::string condition is a type error in C++", async () => {
  const code = "#include <iostream>\n#include <string>\nint main() {\n    std::string s = \"x\";\n    if (s) { std::cout << \"T\" << std::endl; }\n    return 0;\n}";
  const r = await run("cpp", code);
  assert.match(errors(r)[0].message, /std::string を条件には使えません/);
});

// RG-77（R20-N8）: C# の入れ子宣言スペースでの同名宣言は CS0136
test("RG-77 C# nested same-name declarations are CS0136, siblings stay legal", async () => {
  const nested = await run("csharp", "using System;\nclass P {\n    static void Main() {\n        int x = 1;\n        {\n            int x = 2;\n            Console.WriteLine(x);\n        }\n    }\n}");
  assert.match(errors(nested)[0].message, /CS0136/);
  const innerFirst = await run("csharp", "using System;\nclass P {\n    static void Main() {\n        {\n            int y = 2;\n            Console.WriteLine(y);\n        }\n        int y = 1;\n        Console.WriteLine(y);\n    }\n}");
  assert.match(errors(innerFirst)[0].message, /CS0136/);
  const siblings = await first("csharp", "using System;\nclass P {\n    static void Main() {\n        {\n            int z = 3;\n            Console.WriteLine(z);\n        }\n        {\n            int z = 4;\n            Console.WriteLine(z);\n        }\n    }\n}");
  assert.deepEqual(siblings.outputs.map((o) => o.text), ["3", "4"]);
  const cShadow = await first("c", "#include <stdio.h>\nint main() {\n    int x = 1;\n    {\n        int x = 2;\n        printf(\"%d\\n\", x);\n    }\n    printf(\"%d\\n\", x);\n    return 0;\n}");
  assert.deepEqual(cShadow.outputs.map((o) => o.text), ["2\n", "1\n"]);
});

// RG-05 追加表面（R20-N8）: C# の値型と null の等値比較は CS0019 相当で停止する
test("RG-05 surface C# value-type == null stops instead of returning false", async () => {
  const bad = await run("csharp", "using System;\nclass P {\n    static void Main() {\n        Console.WriteLine(true == null);\n    }\n}");
  assert.match(errors(bad)[0].message, /bool と null は比較できません/);
  const ok = await first("csharp", "using System;\nclass P {\n    static void Main() {\n        string t = \"x\";\n        Console.WriteLine(t == null);\n        Console.WriteLine(null == null);\n    }\n}");
  assert.deepEqual(ok.outputs.map((o) => o.text), ["False", "True"]);
});

// RG-78（R21-N9）: C系で文末の ; が無い形を「次の文」として無言で実行しない。
// 宣言・代入・式文・cout 文の直後に ; を必須化し、無ければ名指しで停止する。
test("RG-78 missing semicolons stop in C, C++ and C#", async () => {
  await expectError("c", "#include <stdio.h>\nint main() { int x = 5\n printf(\"%d\\n\", x); return 0; }", /; が必要です/, "SyntaxError");
  await expectError("c", "#include <stdio.h>\nint main() { int x = 5; x = 6\n printf(\"%d\\n\", x); return 0; }", /; が必要です/);
  await expectError("c", "#include <stdio.h>\nint main() { printf(\"a\\n\")\n return 0; }", /; が必要です/);
  await expectError("cpp", "#include <iostream>\nint main() { std::cout << 1\n return 0; }", /; が必要です/);
  await expectError("csharp", "int x = 5\nConsole.WriteLine(x);", /; が必要です/);
  await expectError("csharp", "Console.WriteLine(1)\nConsole.WriteLine(2);", /; が必要です/);
});
test("RG-78 valid semicolon forms keep working", async () => {
  const c = await first("c", "#include <stdio.h>\nint main() { int s = 0; for (int i = 0; i < 3; i++) s += i; printf(\"%d\\n\", s); return 0; }");
  assert.equal(output(c), "3\n");
  const cif = await first("c", "#include <stdio.h>\nint main() { if (1) printf(\"a\\n\"); else printf(\"b\\n\"); return 0; }");
  assert.equal(output(cif), "a\n");
  const cpp = await first("cpp", "#include <iostream>\nint main() { std::cout << 1 << 2; return 0; }");
  assert.equal(output(cpp), "12");
  const empty = await first("c", "#include <stdio.h>\nint main() { int x = 5;; printf(\"%d\\n\", x); return 0; }");
  assert.equal(output(empty), "5\n");
});

// RG-40 追加表面（R21-N2）: C++ の std::string と char の + は実物どおり連結。
// char は数値コードで保持されるため、連結分岐の前に1文字へ戻す。
// char + char は実 C++ でも数値加算のまま。
test("RG-40 std::string and char concatenation in C++", async () => {
  const H = "#include <iostream>\n#include <string>\n";
  const p1 = await first("cpp", H + "int main() { std::string s = \"ab\"; std::string t = s + 'c'; std::cout << t; return 0; }");
  assert.equal(output(p1), "abc");
  const p2 = await first("cpp", H + "int main() { std::string s = \"ab\"; std::string t = 'c' + s; std::cout << t; return 0; }");
  assert.equal(output(p2), "cab");
  const p3 = await first("cpp", H + "int main() { std::string s = \"ab\"; s += 'c'; std::cout << s; return 0; }");
  assert.equal(output(p3), "abc");
  const p4 = await first("cpp", H + "int main() { char c = 'a'; std::string s = \"b\"; std::cout << (s + c); return 0; }");
  assert.equal(output(p4), "ba");
  const p5 = await first("cpp", H + "int main() { std::cout << ('a' + 'b'); return 0; }");
  assert.equal(output(p5), "195");
});

// RG-06 追加表面（R21-N3）: C系の自己初期化は「未定義の名前」ではなく、
// 未初期化読みとして停止する（C／C++ は未定義動作、C# は未割り当て）。
// 初期化子を読む前に自変数を未初期化として登録する。
test("RG-06 self-initialization reports uninitialized use, not an undefined name", async () => {
  await expectError("c", "#include <stdio.h>\nint main() { int x = x + 1; printf(\"%d\\n\", x); return 0; }", /未初期化の値を読み取っています/, "未定義動作");
  await expectError("cpp", "#include <iostream>\nint main() { int x = x + 1; std::cout << x; return 0; }", /未初期化の値を読み取っています/, "未定義動作");
  await expectError("csharp", "int x = x + 1;\nConsole.WriteLine(x);", /未割り当てのローカル変数です/, "CompileError");
  await expectError("c", "#include <stdio.h>\nint main() { int a[2] = {1, a[0]}; printf(\"%d\\n\", a[1]); return 0; }", /未初期化/, "未定義動作");
});
test("RG-06 ordinary initialization from other variables is unchanged", async () => {
  const p = await first("c", "#include <stdio.h>\nint main() { int x = 5; int y = x + 1; printf(\"%d\\n\", y); return 0; }");
  assert.equal(output(p), "6\n");
});

// RG-81（R21-N8）: エラー表示でカテゴリが二重にならない。カテゴリは
// category 欄だけが持ち、メッセージ本文に接頭辞を焼き込まない
// （script.js の run() の前置と c-family の埋め込み接頭辞をともに除去）。
test("RG-81 error messages never repeat their own category", async () => {
  const cases = [
    ["c", "#include <stdio.h>\nint main() { int x; printf(\"%d\\n\", x); return 0; }", "未定義動作"],
    ["c", "#include <stdio.h>\nint main() { int a[1] = {1}; printf(\"%d\", a[1]); return 0; }", "未定義動作"],
    ["c", "#include <stdio.h>\nint main() { printf(\"%q\\n\", 1); return 0; }", "未対応"],
    ["c", "#include <stdio.h>\nint main() { long long x = 9007199254740993LL; printf(\"%lld\\n\", x); return 0; }", "未確認"],
    ["cpp", "#include <iostream>\nint main() { int a = 1; int &r = a + 1; std::cout << r; return 0; }", "未対応"],
  ];
  for (const [id, code, category] of cases) {
    const r = await run(id, code);
    const errs = errors(r);
    assert.ok(errs.length, code);
    assert.equal(errs[0].category, category, code);
    assert.ok(!errs[0].message.startsWith(category), errs[0].message);
    assert.ok(!errs[0].message.includes(category + "："), errs[0].message);
  }
});

// RG-04 追加表面（R21-N6）: C／C++ の printf %f の非有限値は実物表記
// （inf／-inf／nan）。JS の toFixed の "Infinity" を出さない。
// C# の "Infinity" は .NET の正しい表示なので対象外。
test("RG-04 printf %f prints inf and nan the C way", async () => {
  const p1 = await first("c", "#include <stdio.h>\nint main() { double x = 1.0/0.0; printf(\"%f\\n\", x); return 0; }");
  assert.equal(output(p1), "inf\n");
  const p2 = await first("c", "#include <stdio.h>\nint main() { double x = -1.0/0.0; printf(\"%f\\n\", x); return 0; }");
  assert.equal(output(p2), "-inf\n");
  const p3 = await first("c", "#include <stdio.h>\nint main() { double x = 0.0/0.0; printf(\"%f\\n\", x); return 0; }");
  assert.equal(output(p3), "nan\n");
  const p4 = await first("c", "#include <stdio.h>\nint main() { printf(\"%f\\n\", 1.5); return 0; }");
  assert.equal(output(p4), "1.500000\n");
});
