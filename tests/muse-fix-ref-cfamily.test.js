// Round22 reference-completeness fix: C / C++ / C# (C-family) items.
// Verifies that every adjudicated name exists in the right language only,
// that dot-form names resolve through scan, and that the examples and the
// documented model behaviours actually run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const errors = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const outputs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const run = async (id, code) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(d.model.defaults));
};
const names = (id) => getDefinition(id).reference.map((r) => r.name);

const cNew = ["long", "float", "char", "short", "bool", "unsigned int", "unsigned long", "unsigned short", "unsigned char", "signed char", "do", "sizeof", "キャスト", "三項演算子", "abs", "break", "continue"];
const cppNew = [...cNew, "string", "参照", "getline", "endl"];
const csNew = ["long", "float", "char", "bool", "short", "string", "uint", "ulong", "ushort", "byte", "sbyte", "do", "三項演算子", "キャスト", "foreach", "unchecked", "new", "文字列補間", "int.TryParse", "double.TryParse", "Length", "break", "continue"];
const csStatics = ["int.MaxValue", "int.MinValue", "uint.MaxValue", "uint.MinValue", "short.MaxValue", "short.MinValue", "byte.MaxValue", "byte.MinValue", "sbyte.MaxValue", "sbyte.MinValue", "char.MaxValue", "char.MinValue", "Math.PI", "Math.E", "String.Empty", "string.Empty", "long.MaxValue", "long.MinValue", "ulong.MaxValue"];

test("ref cfamily: reference totals after the fix", () => {
  assert.equal(getDefinition("c").reference.length, 26);
  assert.equal(getDefinition("cpp").reference.length, 31);
  assert.equal(getDefinition("csharp").reference.length, 53);
});

test("ref cfamily: every adjudicated name is present in its language", () => {
  for (const n of cNew) assert.ok(names("c").includes(n), "c/" + n);
  for (const n of cppNew) assert.ok(names("cpp").includes(n), "cpp/" + n);
  for (const n of [...csNew, ...csStatics]) assert.ok(names("csharp").includes(n), "csharp/" + n);
});

test("ref cfamily: language gates keep foreign items out", () => {
  assert.ok(!names("c").includes("string"));
  assert.ok(!names("c").includes("getline"));
  assert.ok(!names("c").includes("uint"));
  assert.ok(!names("cpp").includes("foreach"));
  assert.ok(!names("cpp").includes("int.TryParse"));
  assert.ok(!names("csharp").includes("sizeof"));
  assert.ok(!names("csharp").includes("unsigned int"));
  assert.ok(!names("csharp").includes("abs"));
  assert.ok(!names("csharp").includes("pointer"));
});

test("ref cfamily: new items carry returns and source from primary docs", () => {
  for (const n of cNew) {
    const r = getDefinition("c").reference.find((x) => x.name === n);
    assert.ok(r.returns && r.source?.includes("cppreference.com"), "c/" + n);
  }
  for (const n of cppNew) {
    const r = getDefinition("cpp").reference.find((x) => x.name === n);
    assert.ok(r.returns && r.source?.includes("cppreference.com"), "cpp/" + n);
  }
  for (const n of [...csNew, ...csStatics]) {
    const r = getDefinition("csharp").reference.find((x) => x.name === n);
    assert.ok(r.returns && r.source?.includes("learn.microsoft.com"), "csharp/" + n);
  }
});

test("ref cfamily: if item text covers else in all three languages", () => {
  for (const id of ["c", "cpp", "csharp"]) {
    const r = getDefinition(id).reference.find((x) => x.name === "if");
    assert.match(r.description, /else/);
    assert.match(r.syntax, /else/);
  }
});

test("ref cfamily: dot-form names resolve through scan", () => {
  const found = getDefinition("csharp").scan(
    "bool ok = int.TryParse(\"4\", out int n); bool ok2 = double.TryParse(\"1.5\", out double y); int m = a.Length; int mx = int.MaxValue; string s = String.Empty; double p = Math.PI; long l = long.MaxValue;",
  );
  for (const n of ["int.TryParse", "double.TryParse", "Length", "int.MaxValue", "String.Empty", "Math.PI", "long.MaxValue"])
    assert.ok(found.includes(n), n);
  const cppFound = getDefinition("cpp").scan("std::string s; std::getline(std::cin, s); std::cout << s << std::endl;");
  for (const n of ["string", "getline", "endl"]) assert.ok(cppFound.includes(n), "cpp/" + n);
  const cFound = getDefinition("c").scan("do { break; } while (n < 3); int b = sizeof(int); int a = abs(-1);");
  for (const n of ["do", "break", "sizeof", "abs"]) assert.ok(cFound.includes(n), "c/" + n);
});

test("ref cfamily: C bool cast is honestly unsupported, C++ bool cast works", async () => {
  const rc = await run("c", "#include <stdio.h>\nint main() {\nbool b = (bool)1;\nreturn 0;\n}");
  assert.ok(errors(rc).length);
  const rp = await run("cpp", "#include <iostream>\nint main() {\nbool b = (bool)1;\nstd::cout << b << std::endl;\nreturn 0;\n}");
  assert.deepEqual(errors(rp), []);
  assert.deepEqual(outputs(rp), ["1\n"]);
});

test("ref cfamily: C++ reference alias writes through, getline example runs", async () => {
  const d = getDefinition("cpp");
  const ref = d.reference.find((x) => x.name === "参照");
  const r1 = await run("cpp", ref.example);
  assert.deepEqual(errors(r1), []);
  assert.deepEqual(outputs(r1), ["2\n"]);
  const gl = d.reference.find((x) => x.name === "getline");
  const r2 = await run("cpp", gl.example);
  assert.deepEqual(errors(r2), []);
});

test("ref cfamily: C# statics return their documented values", async () => {
  const prog = (body) => "using System;\nclass Program {\n    static void Main() {\n" + body + "\n    }\n}";
  let r = await run("csharp", prog("Console.WriteLine(int.MaxValue);"));
  assert.deepEqual(outputs(r), ["2147483647"]);
  r = await run("csharp", prog("Console.WriteLine(uint.MaxValue);"));
  assert.deepEqual(outputs(r), ["4294967295"]);
  r = await run("csharp", prog("Console.WriteLine(Math.PI);"));
  assert.deepEqual(outputs(r), ["3.141592653589793"]);
  r = await run("csharp", prog("Console.WriteLine(long.MaxValue);"));
  assert.match(outputs(r)[0], /実行時に決まる/);
});

test("ref cfamily: C# TryParse, Length, foreach, unchecked, interpolation run", async () => {
  const prog = (body) => "using System;\nclass Program {\n    static void Main() {\n" + body + "\n    }\n}";
  let r = await run("csharp", prog("int n; bool ok = int.TryParse(\"42\", out n); Console.WriteLine(n);"));
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["42"]);
  r = await run("csharp", prog("int[] a = {1, 2, 3}; Console.WriteLine(a.Length);"));
  assert.deepEqual(outputs(r), ["3"]);
  r = await run("csharp", prog("int[] a = {1, 2, 3}; int t = 0; foreach (int v in a) { t += v; } Console.WriteLine(t);"));
  assert.deepEqual(outputs(r), ["6"]);
  r = await run("csharp", prog("int n = 2147483647; unchecked { n = n + 1; } Console.WriteLine(n);"));
  assert.deepEqual(outputs(r), ["-2147483648"]);
  r = await run("csharp", prog("int n = 3; Console.WriteLine($\"n={n}\");"));
  assert.deepEqual(outputs(r), ["n=3"]);
});
