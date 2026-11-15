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
const out = (p) => p.outputs.map((o) => o.text);
const expectError = async (id, code, pattern, category) => {
  const r = await run(id, code);
  const errs = errors(r);
  assert.ok(errs.length, `expected an error for: ${code}`);
  assert.match(errs[0].message, pattern);
  if (category) assert.equal(errs[0].category, category);
  return errs[0];
};

// ---------- R22-N19: Python — 二項演算子の後の単項 * ----------
test("R22-N19 unary * after a binary operator is a SyntaxError (CPython)", async () => {
  for (const code of [
    "print(1 + * 2)",
    "print(1 * * 2)",
    "print(1 - * 2)",
    "print(1 + *2)",
    "x = 1 + * 2\nprint(x)",
    "print(- * 2)",
    "print([1 + * 2])",
  ]) {
    const e = await expectError("python", code, /SyntaxError/);
    assert.match(e.message, /「\*」はここでは使えません/, code);
  }
});
test("R22-N19 the fabricated values are gone (no output is produced)", async () => {
  const r = await run("python", "print(1 + * 2)");
  assert.deepEqual(out(r.paths[0] || { outputs: [] }), []);
});
test("R22-N19 * applied to a non-iterable literal is a TypeError, not silence", async () => {
  for (const code of [
    "print(*2)",
    "print(*None)",
    "print(*True)",
    "x = [1, *2]\nprint(x)",
    "x = (1, *2)\nprint(x)",
    "x = *2",
  ]) {
    const e = await expectError("python", code, /展開/);
    assert.match(e.message, /TypeError|展開/, code);
  }
});
test("R22-N19 legitimate starred forms and ** keep working", async () => {
  assert.deepEqual(out(await first("python", "print(1 + + 2)")), ["3"]);
  assert.deepEqual(out(await first("python", "print(1 + - 2)")), ["-1"]);
  assert.deepEqual(out(await first("python", "print(*[1, 2])")), ["1 2"]);
  assert.deepEqual(out(await first("python", 'print(*"ab")')), ["a b"]);
  assert.deepEqual(out(await first("python", "x = [1, *[2, 3]]\nprint(x)")), ["[1, 2, 3]"]);
  assert.deepEqual(out(await first("python", "print((1, *[2, 3]))")), ["(1, 2, 3)"]);
  assert.deepEqual(out(await first("python", "print({*[1, 2]})")), ["{1, 2}"]);
  assert.deepEqual(out(await first("python", "x = *[1, 2], 5\nprint(x)")), ["(1, 2, 5)"]);
  assert.deepEqual(out(await first("python", "print(2 ** 3)")), ["8"]);
  assert.deepEqual(out(await first("python", "def f(a, *args):\n    print(args)\nf(1, 2, 3)")), ["(2, 3)"]);
  assert.deepEqual(out(await first("python", "a, *b = [1, 2, 3]\nprint(b)")), ["[2, 3]"]);
  // the pre-existing correct SyntaxError for other operators is unchanged
  await expectError("python", "print(1 + / 2)", /SyntaxError/);
});

// ---------- R22-N20: C/C++/C# — 代入文・式文の ; 欠落は真因表示 ----------
test("R22-N20 missing ; after assignment/expression statements names the semicolon", async () => {
  await expectError(
    "c",
    '#include <stdio.h>\nint main() { int x = 0; x = 5 printf("%d", x); return 0; }',
    /; が必要です/,
    "SyntaxError",
  );
  await expectError(
    "csharp",
    "using System;\nclass Program { static void Main() { int x = 0; x = 5 Console.WriteLine(x); } }",
    /; が必要です/,
    "SyntaxError",
  );
  await expectError(
    "cpp",
    "#include <iostream>\nint main() { int x = 0; x = 5 std::cout << x; return 0; }",
    /; が必要です/,
    "SyntaxError",
  );
  await expectError(
    "c",
    '#include <stdio.h>\nint main() { printf("%d", 5) printf("%d", 6); return 0; }',
    /; が必要です/,
    "SyntaxError",
  );
  await expectError(
    "csharp",
    "using System;\nclass Program { static void Main() { int x = 0; x += 5 Console.WriteLine(x); } }",
    /; が必要です/,
    "SyntaxError",
  );
});
test("R22-N20 valid C-family code and honest unsupported errors are unchanged", async () => {
  assert.deepEqual(
    out(await first("c", '#include <stdio.h>\nint main() { int x = 0; x = 5; printf("%d", x); return 0; }')),
    ["5"],
  );
  assert.deepEqual(
    out(await first("cpp", "#include <iostream>\nint main() { for (int i = 0; i < 3; i++) std::cout << i; return 0; }")),
    ["0", "1", "2"],
  );
  // a genuinely unsupported construct keeps its own named cause
  const e = await expectError(
    "c",
    "#include <stdio.h>\nint main() { switch (1) { } return 0; }",
    /対応していません/,
  );
  assert.doesNotMatch(e.message, /; が必要です/);
});

// ---------- R22-N21: C# — クラス末尾の } 欠落で生 TypeError を出さない ----------
test("R22-N21 missing class closing brace reports } by name", async () => {
  for (const code of [
    "using System;\nclass Program { static void Main() { Console.WriteLine(1);}",
    "using System;\nclass Program { static void Main() { if (true) { Console.WriteLine(1); }",
    "using System;\nclass Program { static",
    "using System;\nclass Program { int",
  ]) {
    const e = await expectError("csharp", code, /} が必要です/);
    assert.doesNotMatch(e.message, /Cannot read properties/, code);
  }
});
test("R22-N21 valid C# classes keep working", async () => {
  assert.deepEqual(
    out(await first("csharp", "using System;\nclass Program { static int count; static void Main() { Console.WriteLine(1); } }")),
    ["1"],
  );
  assert.deepEqual(out(await first("csharp", "using System;\nConsole.WriteLine(2);")), ["2"]);
});

// ---------- R22-N22: C# — 文字列連結チェーンの結果型伝播 ----------
test("R22-N22 C# string concatenation chains propagate the string type", async () => {
  const wrap = (s) => `using System;\nclass Program { static void Main() { ${s} } }`;
  assert.deepEqual(out(await first("csharp", wrap('Console.WriteLine("x" + 1 + 2);'))), ["x12"]);
  assert.deepEqual(out(await first("csharp", wrap('Console.WriteLine(("x" + 1) + 2);'))), ["x12"]);
  assert.deepEqual(out(await first("csharp", wrap("Console.WriteLine(\"x\" + 1 + 'c');"))), ["x1c"]);
  assert.deepEqual(out(await first("csharp", wrap('string s = "x"; Console.WriteLine(s + 1 + 2);'))), ["x12"]);
  assert.deepEqual(out(await first("csharp", wrap('Console.WriteLine("x" + 1.5 + 2);'))), ["x1.52"]);
  assert.deepEqual(out(await first("csharp", wrap('Console.WriteLine("x" + true + 2);'))), ["xTrue2"]);
});
test("R22-N22 previously working C# forms and other operators are unchanged", async () => {
  const wrap = (s) => `using System;\nclass Program { static void Main() { ${s} } }`;
  assert.deepEqual(out(await first("csharp", wrap('Console.WriteLine("x" + 1);'))), ["x1"]);
  assert.deepEqual(out(await first("csharp", wrap('Console.WriteLine(1 + 2 + "x");'))), ["3x"]);
  assert.deepEqual(out(await first("csharp", wrap('Console.WriteLine("x" + (1 + 2));'))), ["x3"]);
  assert.deepEqual(out(await first("csharp", wrap("Console.WriteLine(1 + 2 + 3);"))), ["6"]);
  await expectError("csharp", wrap('Console.WriteLine("x" - 1);'), /演算する型が一致しません/, "CompileError");
});

// ---------- R22-N23: Power Automate — Set variable の必須項目 ----------
const enc = (actions) => JSON.stringify({ name: "学習フロー", actions }, null, 2);
test("R22-N23 Set variable without target fails by name and creates no phantom variable", async () => {
  const r = await run("powerautomate", enc([{ action: "Set variable", value: 1 }]));
  const errs = errors(r);
  assert.ok(errs.length, "expected an error");
  assert.match(errs[0].message, /target/);
  for (const p of r.paths || [])
    assert.ok(!("undefined" in (p.vars || {})), "phantom variable undefined must not appear");
});
test("R22-N23 Set variable without value fails by name", async () => {
  const r = await run("powerautomate", enc([{ action: "Set variable", target: "X" }]));
  const errs = errors(r);
  assert.ok(errs.length, "expected an error");
  assert.match(errs[0].message, /value/);
});
test("R22-N23 Set variable with explicit falsy values keeps working", async () => {
  for (const value of [0, false, null, ""]) {
    const p = await first("powerautomate", enc([{ action: "Set variable", target: "X", value }]));
    assert.ok("X" in p.vars, `value ${JSON.stringify(value)} must be set`);
    assert.deepEqual(p.vars.X, value);
  }
  const p = await first("powerautomate", enc([{ action: "Set variable", target: "X", value: 1 }]));
  assert.equal(p.vars.X, 1);
});
