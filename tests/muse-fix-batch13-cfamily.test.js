// 修正バッチ13（C家族班）の回帰テスト。対象は Codex 一周監査の
// ステップ5裁定で「現行でも有効（B）」となった C／C++／C# の14件
// （R7-44, 57, 95, 160, 162, 163, 164, 166, 168, 170, 172, 174,
// 177, 178）。期待値は当VMの gcc／g++ 13 系と dotnet SDK 8.0.428 の
// 実走（裁定報告 findings-step5-cfamily.md の再測定と突合）に基づく。
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
const first = async (id, code) => {
  const r = await run(id, code);
  assert.deepEqual(errors(r), [], `${id}: ${code} -> ${JSON.stringify(errors(r))}`);
  return r.paths[0];
};
const out1 = async (id, code) => (await first(id, code)).outputs.map((o) => o.text).join("");
const expectError = async (id, code, pattern, category) => {
  const r = await run(id, code);
  const errs = errors(r);
  assert.ok(
    errs.some((e) => pattern.test(e) && (!category || e.startsWith(category + ":"))),
    `${id}: ${code} -> ${JSON.stringify(errs)}`,
  );
};

/* ---------- R7-44：printf %c は unsigned char へ変換 ---------- */
test("R7-44: printf %c converts the int argument to unsigned char", async () => {
  for (const id of ["c", "cpp"]) {
    // gcc 実測バイト列：256 → 00、-1 → FF、65 → 'A'。
    assert.equal(await out1(id, `printf("%c\\n", 256);`), "\0\n");
    assert.equal(await out1(id, `printf("%c\\n", -1);`), "ÿ\n");
    assert.equal(await out1(id, `printf("%c", 65);`), "A");
    assert.equal(await out1(id, `printf("%c", 321);`), "A");
    // 戻り値は出力バイト数（256 のケースも1バイト）。
    assert.equal(await out1(id, `int r = printf("%c", 256); printf("|%d", r);`), "\0|1");
  }
});

/* ---------- R7-57：C# の変数経由の暗黙縮小変換は CS0266 ---------- */
test("R7-57: C# variable-to-narrower implicit conversions are CS0266", async () => {
  await expectError("csharp", `int n = 1; short x = n;`, /CS0266/, "CompileError");
  await expectError("csharp", `int n = 1; short x; x = n;`, /CS0266/, "CompileError");
  await expectError("csharp", `uint u = 1; int n = u;`, /CS0266/, "CompileError");
  await expectError("csharp", `long l = 1; int n = l;`, /暗黙/, "CompileError");
  await expectError("csharp", `int n = 65; char c = n;`, /CS0266/, "CompileError");
  await expectError("csharp", `ushort s = 1; short x = s;`, /CS0266/, "CompileError");
  await expectError("csharp", `ulong l = 1; long x = l;`, /CS0266/, "CompileError");
  // 符号なし型への実行時値の代入は、修正バッチ2で確定したモデル規則
  // （unchecked の折り返し。符号なし各項目の caution に開示済み）を
  // 維持するため、ここでは止めない（R7-57 の対象は符号付き縮小系）。
  assert.equal(await out1("csharp", `int n = 1; uint u = n; Console.WriteLine(u);`), "1");
  assert.equal(await out1("csharp", `int x = -1; uint u = x; Console.WriteLine(u);`), "4294967295");
  // 拡大変換・明示キャスト・定数変換は従来どおり通る。
  assert.equal(await out1("csharp", `int n = 1; long l = n; Console.WriteLine(l);`), "1");
  assert.equal(await out1("csharp", `int n = 1; short x = (short)n; Console.WriteLine(x);`), "1");
  assert.equal(await out1("csharp", `short x = 300; Console.WriteLine(x);`), "300");
  assert.equal(await out1("csharp", `byte b = 200; Console.WriteLine(b);`), "200");
  assert.equal(await out1("csharp", `char c = 65; Console.WriteLine(c);`), "A");
  assert.equal(await out1("csharp", `char c = 'a'; int n = c; Console.WriteLine(n);`), "97");
  // 複合代入は組み込みキャストバックがあるため対象外。
  assert.equal(await out1("csharp", `short x = 1; int n = 2; x += n; Console.WriteLine(x);`), "3");
});

/* ---------- R7-95：std::getline の戻り値は代入できない ---------- */
test("R7-95: std::getline return value (istream&) cannot be assigned", async () => {
  const pre = `#include <iostream>\n#include <string>\nint main() {\nstd::string s;\n`;
  await expectError("cpp", pre + `std::string r = std::getline(std::cin, s); return 0; }`, /std::getline の戻り値/, "CompileError");
  await expectError("cpp", pre + `int r = std::getline(std::cin, s); return 0; }`, /std::getline の戻り値/, "CompileError");
  await expectError("cpp", pre + `bool r = std::getline(std::cin, s); return 0; }`, /std::getline の戻り値/, "CompileError");
  await expectError("cpp", pre + `std::string r; r = std::getline(std::cin, s); return 0; }`, /std::getline の戻り値/, "CompileError");
  // 文として呼び出す正規形は従来どおり動き、抽出先は未確定値になる。
  const p = await first("cpp", pre + `std::getline(std::cin, s); std::cout << "done"; return 0; }`);
  assert.equal(p.outputs.map((o) => o.text).join(""), "done");
  assert.equal(p.vars.s?.kind, "unknown");
  // リファレンスの caution も戻り値代入不可を明記する。
  const gl = getDefinition("cpp").reference.find((r) => r.name === "getline");
  assert.match(gl.caution, /戻り値は std::istream& であり/);
  assert.match(gl.caution, /抽出先の変数が未確定値になります/);
});

/* ---------- R7-160：sizeof の単項演算は整数昇格 ---------- */
test("R7-160: sizeof of a unary +/- expression applies integer promotion", async () => {
  for (const id of ["c", "cpp"]) {
    assert.equal(await out1(id, `char x = 65; int n = sizeof(+x); printf("%d", n);`), "4");
    assert.equal(await out1(id, `short x = 1; int n = sizeof(-x); printf("%d", n);`), "4");
    assert.equal(await out1(id, `unsigned char x = 65; int n = sizeof(+x); printf("%d", n);`), "4");
    // 昇格しない形は従来どおり。
    assert.equal(await out1(id, `char x = 65; int n = sizeof(x); printf("%d", n);`), "1");
    assert.equal(await out1(id, `short x = 1; int n = sizeof(x); printf("%d", n);`), "2");
    assert.equal(await out1(id, `int n = sizeof(-2147483647); printf("%d", n);`), "4");
  }
});

/* ---------- R7-162：printf は書式のヌル文字で終端 ---------- */
test("R7-162: printf stops the format string at the first NUL", async () => {
  for (const id of ["c", "cpp"]) {
    assert.equal(await out1(id, `printf("A\\0B%d", 7);`), "A");
    // 戻り値は実際に書いた文字数1。ヌル以降の引数は無視される。
    assert.equal(await out1(id, `int r = printf("A\\0B%d", 7); printf("|%d", r);`), "A|1");
    assert.equal(await out1(id, `printf("AB\\0");`), "AB");
    // ヌルより前の書式は通常どおり処理する。
    assert.equal(await out1(id, `printf("%d\\0%d", 7, 8);`), "7");
  }
});

/* ---------- R7-163：std::string と char の比較演算子はない ---------- */
test("R7-163: std::string == char is a compile error in C++", async () => {
  const pre = `#include <iostream>\n#include <string>\nint main() {\nstd::string s = "a";\n`;
  await expectError("cpp", pre + `std::cout << (s == 'a'); return 0; }`, /std::string と char は比較できません/, "CompileError");
  await expectError("cpp", pre + `char c = 'a'; std::cout << (s == c); return 0; }`, /std::string と char は比較できません/, "CompileError");
  await expectError("cpp", pre + `std::cout << ('a' != s); return 0; }`, /比較できません/, "CompileError");
  await expectError("cpp", pre + `std::cout << (s < 'a'); return 0; }`, /比較できません/, "CompileError");
  // 文字列リテラルとの比較と、char との連結は実在するため従来どおり。
  assert.equal(await out1("cpp", pre + `std::cout << (s == "a"); return 0; }`), "1");
  assert.equal(await out1("cpp", pre + `std::cout << (s + 'b'); return 0; }`), "ab");
});

/* ---------- R7-164：値型と null の比較は警告のみで確定真偽 ---------- */
test("R7-164: C# value type compared with null yields the fixed result", async () => {
  assert.equal(await out1("csharp", `int x = 1; Console.WriteLine(x == null);`), "False");
  assert.equal(await out1("csharp", `int x = 1; Console.WriteLine(x != null);`), "True");
  assert.equal(await out1("csharp", `int x = 1; Console.WriteLine(x < null);`), "False");
  assert.equal(await out1("csharp", `int x = 1; Console.WriteLine(x >= null);`), "False");
  assert.equal(await out1("csharp", `bool b = true; Console.WriteLine(b == null);`), "False");
  assert.equal(await out1("csharp", `long l = 5; Console.WriteLine(l == null);`), "False");
  assert.equal(await out1("csharp", `double d = 1.5; Console.WriteLine(d != null);`), "True");
  // 参照型と null の比較は従来どおり。
  assert.equal(await out1("csharp", `string s = null; Console.WriteLine(s == null);`), "True");
  assert.equal(await out1("csharp", `string s = "a"; Console.WriteLine(s == null);`), "False");
});

/* ---------- R7-166：checked のシフトは例外にならない ---------- */
test("R7-166: C# shifts ignore the checked context", async () => {
  assert.equal(await out1("csharp", `int x = 1; Console.WriteLine(checked(x << 31));`), "-2147483648");
  assert.equal(await out1("csharp", `int x = 1; checked { x = x << 31; } Console.WriteLine(x);`), "-2147483648");
  assert.equal(await out1("csharp", `int x = 1; checked { x <<= 31; } Console.WriteLine(x);`), "-2147483648");
  // 対照：checked の加算オーバーフローは従来どおり例外。
  await expectError("csharp", `int x = 2147483647; Console.WriteLine(checked(x + 1));`, /オーバーフロー/, "OverflowException");
});

/* ---------- R7-168：checked／unchecked 式の型は中の型 ---------- */
test("R7-168: checked/unchecked expressions keep the operand type", async () => {
  assert.equal(await out1("csharp", `double x = 5; Console.WriteLine(checked(x) / 2);`), "2.5");
  assert.equal(await out1("csharp", `double x = 5; Console.WriteLine(unchecked(x) / 2);`), "2.5");
  assert.equal(await out1("csharp", `double x = 5; Console.WriteLine(checked(x));`), "5");
  assert.equal(await out1("csharp", `float x = 5.0f; Console.WriteLine(checked(x) / 2);`), "2.5");
  // 整数の checked 式は従来どおり整数除算。
  assert.equal(await out1("csharp", `int x = 5; Console.WriteLine(checked(x) / 2);`), "2");
});

/* ---------- R7-170：Console.WriteLine(null) は CS0121 ---------- */
test("R7-170: Console.WriteLine(null) is ambiguous (CS0121)", async () => {
  await expectError("csharp", `Console.WriteLine(null);`, /CS0121/, "CompileError");
  // 型が決まる形は従来どおり空行。
  assert.equal(await out1("csharp", `Console.WriteLine((string)null);`), "");
  assert.equal(await out1("csharp", `string s = null; Console.WriteLine(s);`), "");
  // ReadLine の引数形は処置済み（回帰確認）。
  await expectError("csharp", `string s = Console.ReadLine(1);`, /引数を取りません/, "CompileError");
});

/* ---------- R7-172：MinValue % -1 は OverflowException ---------- */
test("R7-172: int.MinValue % -1 throws OverflowException", async () => {
  await expectError("csharp", `Console.WriteLine(unchecked(int.MinValue % -1));`, /オーバーフロー/, "OverflowException");
  await expectError("csharp", `int m = int.MinValue; Console.WriteLine(m % -1);`, /オーバーフロー/, "OverflowException");
  await expectError("csharp", `int m = int.MinValue; Console.WriteLine(m / -1);`, /オーバーフロー/, "OverflowException");
  // 通常の剰余は従来どおり。
  assert.equal(await out1("csharp", `Console.WriteLine(5 % -1);`), "0");
  assert.equal(await out1("csharp", `Console.WriteLine(-7 % 3);`), "-1");
  // C／C++ の同形は未定義動作として従来どおり停止する。
  await expectError("c", `int m = -2147483647 - 1; printf("%d", m % -1);`, /オーバーフロー/, "未定義動作");
});

/* ---------- R7-174：NULL／nullptr のリファレンス項目 ---------- */
test("R7-174: NULL and nullptr have reference entries", () => {
  const c = getDefinition("c"), cpp = getDefinition("cpp"), cs = getDefinition("csharp");
  // 新件数：C 27、C++ 33、C# 53（全種類合計 1396）。
  assert.equal(c.reference.length, 27);
  assert.equal(cpp.reference.length, 33);
  assert.equal(cs.reference.length, 53);
  const cNull = c.reference.find((r) => r.name === "NULL");
  assert.ok(cNull && cNull.returns && cNull.source.includes("cppreference.com"));
  const cppNull = cpp.reference.find((r) => r.name === "NULL");
  assert.ok(cppNull && cppNull.returns && cppNull.source.includes("cppreference.com"));
  const np = cpp.reference.find((r) => r.name === "nullptr");
  assert.ok(np && np.returns && np.source.includes("cppreference.com"));
  assert.ok(!c.reference.some((r) => r.name === "nullptr"));
  assert.ok(!cs.reference.some((r) => r.name === "NULL" || r.name === "nullptr"));
  // 使用中チップとして解決される。
  assert.ok(c.scan("int *p = NULL;").includes("NULL"));
  assert.ok(cpp.scan("int *p = nullptr;").includes("nullptr"));
});

test("R7-174: NULL/nullptr examples in the reference run as written", async () => {
  for (const [id, name] of [["c", "NULL"], ["cpp", "NULL"], ["cpp", "nullptr"]]) {
    const item = getDefinition(id).reference.find((r) => r.name === name);
    const r = await run(id, item.example);
    assert.deepEqual(errors(r), [], `${id}/${name}: ${JSON.stringify(errors(r))}`);
  }
  // 実行自体も従来どおり（ポインタ比較）。
  assert.equal(await out1("c", `int *p = NULL; printf("%d", p == NULL);`), "1");
  assert.equal(await out1("cpp", `int *p = nullptr; std::cout << (p == nullptr);`), "1");
});

/* ---------- R7-177：char 配列経由の printf 書式 ---------- */
test("R7-177: printf accepts a format string from a char array", async () => {
  for (const id of ["c", "cpp"]) {
    assert.equal(await out1(id, `char fmt[] = "%d"; printf(fmt, 7);`), "7");
    assert.equal(await out1(id, `char fmt[] = "%d"; int r = printf(fmt, 7); printf("|%d", r);`), "7|1");
    assert.equal(await out1(id, `char fmt[4] = "%s"; printf(fmt, "ok");`), "ok");
  }
  // std::string そのものは書式に使えない（実 g++ でも変換エラー）。
  await expectError("cpp", `#include <string>\nstd::string f = "%d"; printf(f, 7);`, /std::string は使えません/, "CompileError");
});

/* ---------- R7-178：printf caution に %u を含む ---------- */
test("R7-178: printf reference caution lists %u as supported", async () => {
  for (const id of ["c", "cpp"]) {
    const item = getDefinition(id).reference.find((r) => r.name === "printf");
    assert.match(item.caution, /%u/);
    // 文面どおり実行でも受理する。
    assert.equal(await out1(id, `unsigned int n = 1; printf("%u", n);`), "1");
  }
});
