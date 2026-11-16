// バッチ12（C家族・表示班）修正の回帰テスト。
// 対象：RG-373（R33-N10：接頭辞直後の区切り 0x'FF 等でエラー表示が
// 接頭辞だけに切れる）／RG-374（R33-N11：指数符号直後の区切り
// 1e+_5／1e-_5 で表示が 1e+／1e- に切れる）／RG-375（R33-N12：
// semantics 表明文の「多重宣言は未対応」が複数宣言子の実挙動と食い違う）。
// 一次情報・実走根拠：dotnet 8.0.428（1e+_5／1e-_5／0x'FF は CS1013、
// 0x_FF／1e1_0 は合法）／gcc・g++ 13.3（0x'FF は digit separator after
// base indicator、1e+_5 は exponent has no digits、1'000／0xFF'FF は
// 合法）の当VM実走結果を期待値に反映した。
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
const cs = (body) => `using System;\nclass Program {\n static void Main() {\n${body}\n }\n}`;
const cpp = (body) => `#include <iostream>\n#include <string>\nint main() {\n${body}\n return 0;\n}`;
const cc = (body) => `#include <stdio.h>\nint main() {\n${body}\n return 0;\n}`;
const wrap = { c: cc, cpp, csharp: cs };
const print = {
  c: (expr) => `printf("%d", ${expr});`,
  cpp: (expr) => `std::cout << ${expr};`,
  csharp: (expr) => `Console.WriteLine(${expr});`,
};
// 不正リテラル lit を宣言に入れ、エラー表示が lit 全文を含むことを要求する。
const expectFullDisplay = async (id, lit, { dbl = false } = {}) => {
  const body = dbl ? `double d = ${lit};` : `int x = ${lit};`;
  const r = await run(id, wrap[id](body));
  assert.ok(
    errors(r).some((e) => e.includes("数値リテラルの書き方が不正です") && e.includes(lit)),
    `${id} ${lit} -> ${JSON.stringify(errors(r))}`,
  );
};

/* ---------------- RG-373: 接頭辞直後の区切り ---------------- */
test("RG-373: separator right after 0x/0b/0o prefix displays the full literal in C/C++/C#", async () => {
  for (const id of ["c", "cpp", "csharp"]) {
    await expectFullDisplay(id, "0x'FF");
    await expectFullDisplay(id, "0b'1010");
    await expectFullDisplay(id, "0x''FF");
    await expectFullDisplay(id, "0x'1");
  }
  for (const id of ["c", "cpp"]) {
    await expectFullDisplay(id, "0o'7");
    await expectFullDisplay(id, "0x'FF'FF");
  }
  await expectFullDisplay("csharp", "0o'777");
  // C# の接頭辞直後の _ の後に別の不正文字が続く形も全文表示する。
  await expectFullDisplay("csharp", "0x_'FF");
  await expectFullDisplay("csharp", "0x_1G");
  // 対照（従来から全文表示だった形）は不変。
  for (const id of ["c", "cpp"]) {
    const r = await run(id, wrap[id](`int x = 1''000;`));
    assert.ok(errors(r).some((e) => e.includes("桁区切り") && e.includes("1''000")), JSON.stringify(errors(r)));
    const r2 = await run(id, wrap[id](`int x = 1000';`));
    assert.ok(errors(r2).some((e) => e.includes("桁区切り") && e.includes("1000'")), JSON.stringify(errors(r2)));
  }
});

/* ---------------- RG-374: 指数符号直後の区切り ---------------- */
test("RG-374: separator right after exponent sign displays the full literal", async () => {
  // C#（dotnet 実走で CS1013）。
  await expectFullDisplay("csharp", "1e+_5", { dbl: true });
  await expectFullDisplay("csharp", "1e-_5", { dbl: true });
  await expectFullDisplay("csharp", "1.5e+_3", { dbl: true });
  await expectFullDisplay("csharp", "1.5e-_3", { dbl: true });
  await expectFullDisplay("csharp", "1e+_5f", { dbl: true });
  await expectFullDisplay("csharp", "1e+__5", { dbl: true });
  await expectFullDisplay("csharp", "1e+_5_", { dbl: true });
  await expectFullDisplay("csharp", ".5e+_5", { dbl: true });
  // C／C++ の同形：_ は区切りではなく識別子文字だが、リテラルとして
  // 書かれた全文を表示し、桁区切りとは呼ばない（gcc/g++ 実走は
  // exponent has no digits）。
  for (const id of ["c", "cpp"]) {
    const r = await run(id, wrap[id](`double d = 1e+_5;`));
    assert.ok(
      errors(r).some((e) => e.includes("数値リテラルの書き方が不正です") && e.includes("1e+_5") && !e.includes("桁区切り")),
      `${id} 1e+_5 -> ${JSON.stringify(errors(r))}`,
    );
    await expectFullDisplay(id, "1e-_5", { dbl: true });
    await expectFullDisplay(id, "1e+'5", { dbl: true });
    await expectFullDisplay(id, "1.5e'3", { dbl: true });
    await expectFullDisplay(id, "1.5e+'3", { dbl: true });
    await expectFullDisplay(id, "1e'5", { dbl: true });
  }
  await expectFullDisplay("csharp", "1e+'5", { dbl: true });
});

/* ---------------- 表示スイープ：小数点前後・サフィックス隣接・連続／末尾 ---------------- */
test("RG-373/374 sweep: decimal-point, suffix-adjacent and chained positions display in full", async () => {
  // 小数点の後の続き（第2の小数点の後の区切り・指数・末尾区切り）。
  await expectFullDisplay("csharp", "1.5.2_3", { dbl: true });
  await expectFullDisplay("csharp", "1e5.5_", { dbl: true });
  await expectFullDisplay("csharp", "1e5.5e3", { dbl: true });
  await expectFullDisplay("cpp", "1.5.2e3", { dbl: true });
  await expectFullDisplay("c", "1.5.2'3", { dbl: true });
  await expectFullDisplay("c", "1e5.5'", { dbl: true });
  // 区切りが先行する複合形（整数部の区切りの後に小数部・指数符号）。
  await expectFullDisplay("csharp", "1_000.5_e+_3", { dbl: true });
  await expectFullDisplay("c", "1'000.5e+'3", { dbl: true });
  // サフィックス隣接（区切りと接尾辞の混在）は従来どおり全文表示。
  await expectFullDisplay("csharp", "1000_u");
  await expectFullDisplay("csharp", "0xFF_u");
  await expectFullDisplay("csharp", "1_000u_");
  await expectFullDisplay("csharp", "1e+_5m", { dbl: true });
  // 不完全リテラル自体（1e／1e+）は全文＝自身のまま。
  for (const id of ["c", "cpp", "csharp"]) {
    await expectFullDisplay(id, "1e", { dbl: true });
    await expectFullDisplay(id, "1e+", { dbl: true });
    await expectFullDisplay(id, "0x");
  }
});

test("RG-373/374: legal literals and neighbouring expressions are not broken", async () => {
  // 合法形の受理（dotnet／gcc／g++ 実走と一致）。
  const csLegal = [
    [`int x = 0x_FF; Console.WriteLine(x);`, [["255"]]],
    [`int x = 1_000; Console.WriteLine(x);`, [["1000"]]],
    [`double d = 1e1_0; Console.WriteLine(d);`, [["10000000000"]]],
    [`double d = 1e+5; Console.WriteLine(d);`, [["100000"]]],
    [`double d = 1e5+5; Console.WriteLine(d);`, [["100005"]]],
  ];
  for (const [body, expected] of csLegal) {
    const r = await run("csharp", cs(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  for (const id of ["c", "cpp"]) {
    const r = await run(id, wrap[id](`int x = 1'000; ${print[id]("x")}`));
    assert.deepEqual(errors(r), [], `${id} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), [["1000"]]);
    const r2 = await run(id, wrap[id](`int x = 0xFF'FF; ${print[id]("x")}`));
    assert.deepEqual(errors(r2), [], `${id} -> ${JSON.stringify(errors(r2))}`);
    assert.deepEqual(outputs(r2), [["65535"]]);
    // 表示走査が正当な後続の演算子を取り込まないこと。
    const r3 = await run(id, wrap[id](id === "c" ? `double d = 1e5+5; printf("%f", d);` : `double d = 1e5+5; std::cout << d;`));
    assert.deepEqual(errors(r3), [], `${id} 1e5+5 -> ${JSON.stringify(errors(r3))}`);
  }
});

/* ---------------- RG-375: 複数宣言子の実挙動と表明文 ---------------- */
test("RG-375: multiple declarators work at statement position in C/C++/C#", async () => {
  for (const id of ["c", "cpp", "csharp"]) {
    const cases = [
      // 初期化あり／なし／混在／3つ以上／後続宣言子が前を参照。
      [`int a = 1, b = 2; ${print[id]("a + b")}`, [["3"]]],
      [`int a, b; a = 1; b = 2; ${print[id]("a + b")}`, [["3"]]],
      [`int a = 1, b; b = 2; ${print[id]("a + b")}`, [["3"]]],
      [`int a, b = 2; a = 1; ${print[id]("a + b")}`, [["3"]]],
      [`int a = 1, b = 2, c = 3; ${print[id]("a + b + c")}`, [["6"]]],
      [`int a = 1, b = a + 1; ${print[id]("b")}`, [["2"]]],
      // 配列宣言子との混在（両順序）。
      [`int a[2] = {1, 2}, b = 3; ${print[id]("a[0] + a[1] + b")}`, [["6"]]],
      [`int a = 1, b[2] = {2, 3}; ${print[id]("a + b[0] + b[1]")}`, [["6"]]],
    ];
    for (const [body, expected] of cases) {
      const r = await run(id, wrap[id](body));
      assert.deepEqual(errors(r), [], `${id} ${body} -> ${JSON.stringify(errors(r))}`);
      assert.deepEqual(outputs(r), expected, `${id} ${body}`);
    }
    // for 初期化部の複数宣言子。
    const f = await run(id, wrap[id](`int s = 0; for (int i = 0, j = 0; i < 3; i++) { s += i + j; } ${print[id]("s")}`));
    assert.deepEqual(errors(f), [], `${id} for-init -> ${JSON.stringify(errors(f))}`);
    assert.deepEqual(outputs(f), [["3"]], `${id} for-init`);
  }
  // ポインタ宣言子（C／C++。C# のポインタ自体は unsafe として別途未対応）。
  for (const id of ["c", "cpp"]) {
    const r = await run(id, wrap[id](`int a = 1, *p = &a, b[2] = {3, 4}; ${print[id]("a + *p + b[1]")}`));
    assert.deepEqual(errors(r), [], `${id} pointer multi -> ${JSON.stringify(errors(r))}`);
    // printf は "%d %d %d" 形式ではないため合計で検証する（6）。
    assert.deepEqual(outputs(r), [["6"]], `${id} pointer multi`);
    const mixed = await run(id, wrap[id](`int x = 5; int *p, q; p = &x; q = 7; ${print[id]("*p + q")}`));
    assert.deepEqual(errors(mixed), [], `${id} *p, q -> ${JSON.stringify(errors(mixed))}`);
    assert.deepEqual(outputs(mixed), [["12"]]);
  }
  const csPtr = await run("csharp", cs(`int x = 5; int *p, q;`));
  assert.ok(errors(csPtr).some((e) => e.includes("unsafeポインタは未対応")), JSON.stringify(errors(csPtr)));
  // C# の配列型（型側 []）の複数宣言子。
  const csArr = await run("csharp", cs(`int[] a = {1, 2}, b = {3}; Console.WriteLine(a[1] + b[0]);`));
  assert.deepEqual(errors(csArr), []);
  assert.deepEqual(outputs(csArr), [["5"]]);
  // 同名の重複は複数宣言子の受理とは別に、重複として名指して停止する。
  for (const id of ["c", "cpp", "csharp"]) {
    const dup = await run(id, wrap[id](`int a = 1, a = 2; ${print[id]("a")}`));
    assert.ok(errors(dup).some((e) => e.includes("重複")), `${id} dup -> ${JSON.stringify(errors(dup))}`);
  }
});

test("RG-375: semantics support text matches the multiple-declarator behaviour", () => {
  for (const id of ["c", "cpp", "csharp"]) {
    const support = getDefinition(id).semantics.support;
    assert.ok(!/未対応：[^。]*多重宣言/.test(support), `${id}: ${support}`);
    assert.ok(!support.includes("多重宣言"), `${id}: ${support}`);
    assert.ok(support.includes("複数宣言子"), `${id}: ${support}`);
    // 既存の正しい表明（多次元配列対応・他の未対応項目）は維持する。
    assert.ok(support.includes("多次元配列にも対応します"), `${id}: ${support}`);
    assert.ok(support.includes("型推論（auto / var）"), `${id}: ${support}`);
  }
});
