// バッチ12（C#班）修正の回帰テスト。
// 対象：RG-365（属性）／RG-366（タプル）／RG-367（sizeof／typeof／
// nameof）／RG-368（null 条件インデックス ?[]）／RG-369（インデクサ／
// unsafe／stackalloc／ジェネリック型パラメータ宣言＋兄弟表面の
// ジェネリック型利用形・キャスト・ジェネリックメソッド）。
// いずれも「構文そのものを名指して停止する」処置であり、受理範囲は
// 変えていない。一次裁定：dotnet 8.0.428（~/dotnet）実走で、対象形が
// 実 C# で合法であること（属性の全位置・形、タプルの型・リテラル・
// 分解、sizeof／typeof／nameof、?[]、unsafe、Span への stackalloc、
// ジェネリック宣言群、Func<int, int>）を確認済み。例外として
// int[] への stackalloc 代入は実 C# でも CS8346 で違法であり、
// アプリ側も stackalloc そのものを名指して停止するのが正しい。
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
const named = async (code, name, forbidden = []) => {
  const r = await run("csharp", code);
  const es = errors(r);
  assert.ok(
    es.some((e) => e.includes("この構文は説明に対応していません") && e.includes(name)),
    `${code} -> ${JSON.stringify(es)} (expected naming: ${name})`,
  );
  for (const f of forbidden)
    assert.ok(
      !es.some((e) => e.includes(f)),
      `${code} should not say ${f} -> ${JSON.stringify(es)}`,
    );
};

/* ---------------- RG-365: 属性 ---------------- */
test("RG-365: C# attributes are named as attributes at every position", async () => {
  const cases = [
    `[Obsolete] class Foo {}`,
    `[Serializable] class Foo {}`,
    `[Obsolete("msg")] class Foo {}`,
    `[System.Obsolete] class Foo {}`,
    `[Obsolete, Serializable] class Foo {}`,
    `[Obsolete][Serializable] class Foo {}`,
    `[assembly: Obsolete] class Foo {}`,
    `[Serializable] struct S {}`,
    `[Obsolete] public class Foo {}`,
    `class Foo { [Obsolete] void M() {} }`,
    `class Foo { [Obsolete] int x; }`,
    `class Foo { [Obsolete] int X { get; set; } }`,
    `class Foo { [return: Obsolete] int M() { return 1; } }`,
    cs(`[Obsolete] class Foo {}`),
    cs(`[Obsolete] void Local() {}`),
    cs(`void M([Obsolete] int x) {}`),
    cs(`void M(int a, [Obsolete] int b) {}`),
  ];
  for (const code of cases)
    await named(code, "属性（アトリビュート）", ["; が必要です", "クラスのフィールド型 ["]);
});

/* ---------------- RG-366: タプル ---------------- */
test("RG-366: C# tuples are named as tuples at every position", async () => {
  const bodies = [
    `(int, int) t = (1, 2); Console.WriteLine(t);`,
    `(int, int) t;`,
    `(int x, int y) t = (1, 2);`,
    `Console.WriteLine((1, 2));`,
    `Console.WriteLine((1, 2).Item1);`,
    `Console.WriteLine(((1, 2), 3));`,
    `(int x, int y) = (1, 2);`,
    `int x; int y; (x, y) = (1, 2);`,
    `var (x, y) = (1, 2);`,
    `(int, int) M() { return (1, 2); }`,
    `int x = (1, 2);`,
    `int[] a = {1, 2}; Console.WriteLine(a[(0, 1).Item1]);`,
  ];
  for (const body of bodies)
    await named(cs(body), "タプル", [") が必要です"]);
  // 対照：通常の括弧式とキャストは従来どおり動く。
  const paren = await run("csharp", cs(`Console.WriteLine((1 + 2));`));
  assert.deepEqual(errors(paren), []);
  assert.deepEqual(outputs(paren), [["3"]]);
  const cast = await run("csharp", cs(`double d = 1.9; int x = (int)d; Console.WriteLine(x);`));
  assert.deepEqual(errors(cast), []);
  assert.deepEqual(outputs(cast), [["1"]]);
  // 対照：単一ジェネリック型の括弧はタプルではなくジェネリック型
  // として名指される（キャスト位置）。
  await named(cs(`Console.WriteLine((Func<int, int>)null);`), "ジェネリック型 Func<...>", ["タプル"]);
});

/* ---------------- RG-367: sizeof／typeof／nameof ---------------- */
test("RG-367: sizeof/typeof/nameof name the operator, not the argument", async () => {
  const cases = [
    [`Console.WriteLine(sizeof(int));`, "sizeof 演算子"],
    [`int n = sizeof(double);`, "sizeof 演算子"],
    [`int n = 1 + sizeof(int);`, "sizeof 演算子"],
    [`Console.WriteLine(sizeof(Foo));`, "sizeof 演算子"],
    [`Console.WriteLine(typeof(int));`, "typeof 演算子"],
    [`Console.WriteLine(typeof(Foo));`, "typeof 演算子"],
    [`Console.WriteLine(typeof(List<int>));`, "typeof 演算子"],
    [`Console.WriteLine(nameof(Console));`, "nameof 演算子"],
    [`int x = 1; Console.WriteLine(nameof(x));`, "nameof 演算子"],
    [`Console.WriteLine(nameof(System.Console));`, "nameof 演算子"],
  ];
  for (const [body, name] of cases)
    await named(cs(body), name, ["未定義の名前"]);
  // 対照：RG-351 で是正済みの default(int) の名指しは不変。
  await named(cs(`int x = default(int);`), "default 式");
});

/* ---------------- RG-368: null 条件インデックス ?[] ---------------- */
test("RG-368: null-conditional index names ?[], ternary and ?. stay intact", async () => {
  const bodies = [
    `string s = "a"; Console.WriteLine(s?[0]);`,
    `string s = "ab"; Console.WriteLine(s?[0].ToString());`,
    `int[] a = {1}; a?[0] = 5;`,
    `int[] a = {1, 2}; Console.WriteLine(a?[0]);`,
  ];
  for (const body of bodies)
    await named(cs(body), "null 条件アクセス（?[]）", ["三項演算子"]);
  // 対照：?. は従来どおりオプショナルチェーンとして名指される。
  await named(cs(`string s = null; Console.WriteLine(s?.Length);`), "オプショナルチェーン（?.）");
  // 対照：通常の三項演算子と添字内三項は従来どおり動く。
  const tern = await run("csharp", cs(`int x = 1; Console.WriteLine(x > 0 ? 2 : 0);`));
  assert.deepEqual(errors(tern), []);
  assert.deepEqual(outputs(tern), [["2"]]);
  const idx = await run("csharp", cs(`int[] a = {1, 2}; int i = 0; Console.WriteLine(a[i > 0 ? 1 : 0]);`));
  assert.deepEqual(errors(idx), []);
  assert.deepEqual(outputs(idx), [["1"]]);
  // 対照：nullable 型宣言の名指し（RG-351）は不変。
  await named(cs(`int? x = null;`), "nullable 型（int?）");
});

/* ---------------- RG-369: 宣言・文位置の構文群 ---------------- */
test("RG-369: indexers, unsafe, stackalloc and generic declarations are named", async () => {
  await named(`class C { public int this[int i] => i; }`, "インデクサ（this[...]）", ["; が必要です"]);
  await named(`class C { public string this[string s] => s; }`, "インデクサ（this[...]）");
  await named(cs(`unsafe { int x = 1; }`), "unsafe 文", ["; が必要です"]);
  await named(cs(`unsafe void M() {}`), "unsafe 文");
  await named(cs(`int[] a = stackalloc int[3];`), "stackalloc 式", ["; が必要です"]);
  await named(cs(`Console.WriteLine(stackalloc int[3]);`), "stackalloc 式");
  await named(`class Box<T> {}`, "ジェネリック型パラメータ（<T>）の宣言", ["{ が必要です"]);
  await named(`class Box<T> where T : class {}`, "ジェネリック型パラメータ（<T>）の宣言");
  await named(`struct Box<T> {}`, "ジェネリック型パラメータ（<T>）の宣言");
  await named(`interface IBox<T> {}`, "ジェネリック型パラメータ（<T>）の宣言");
  await named(`record R<T>(T X);`, "ジェネリック型パラメータ（<T>）の宣言");
  await named(`delegate void D<T>();`, "ジェネリック型パラメータ（<T>）の宣言");
  await named(cs(`void M<T>() {}`), "ジェネリックメソッド（型パラメータ）");
  await named(cs(`void M<T>() where T : class {}`), "ジェネリックメソッド（型パラメータ）");
  await named(`class C { void M<T>() {} }`, "ジェネリックメソッド（型パラメータ）");
  // 対照：unsafe は文脈キーワードであり、同名変数は従来どおり動く。
  const uvar = await run("csharp", cs(`int unsafe = 1; unsafe = 2; Console.WriteLine(unsafe);`));
  assert.deepEqual(errors(uvar), []);
  assert.deepEqual(outputs(uvar), [["2"]]);
  // 対照：非ジェネリックの型宣言の名指しは不変。
  await named(`struct S {}`, "型 struct の宣言は未対応です");
  const plainClass = await run("csharp", `class Foo {}`);
  assert.ok(
    !errors(plainClass).some((e) => e.includes("型パラメータ")),
    JSON.stringify(errors(plainClass)),
  );
});

/* ---------------- RG-369 兄弟表面：ジェネリック型の利用形 ---------------- */
test("RG-369 sibling: generic type uses are named for any type name", async () => {
  // バッチ11 §5-4 の既知観察（Func<int, int> が「; が必要です」）は
  // 単一型引数形 List<int> と同根（既知名リスト依存）であり、同じ
  // 名指し水準に是正した。
  const bodies = [
    [`Func<int, int> f = null;`, "ジェネリック型 Func<...> の宣言は未対応です"],
    [`Func<int, int> f = x => x;`, "ジェネリック型 Func<...> の宣言は未対応です"],
    [`Box<int> b = null;`, "ジェネリック型 Box<...> の宣言は未対応です"],
    [`List<int>[] xs = null;`, "ジェネリック型 List<...> の宣言は未対応です"],
    [`List<List<int>> xs = null;`, "ジェネリック型 List<...> の宣言は未対応です"],
    [`List<int> xs = null;`, "ジェネリック型 List<...> の宣言は未対応です"],
    [`Dictionary<string, int> d = null;`, "ジェネリック型 Dictionary<...> の宣言は未対応です"],
  ];
  for (const [body, name] of bodies)
    await named(cs(body), name, ["; が必要です"]);
  // Span<int> への stackalloc は、先に現れるジェネリック型が
  // 名指される（出現順の名指し）。
  await named(cs(`Span<int> a = stackalloc int[3];`), "ジェネリック型 Span<...> の宣言は未対応です");
  // 出現順の名指し：ジェネリック型とラムダが同居する宣言では、
  // 先に現れるジェネリック型が名指される（RG-351 のラムダ名指しは
  // ジェネリック型を含まない形でバッチ11テスト側が確認を継続）。
  await named(cs(`Func<int> f = () => 1;`), "ジェネリック型 Func<...> の宣言は未対応です");
  await named(cs(`Func<int> f = null;`), "ジェネリック型 Func<...> の宣言は未対応です");
});

/* ---------------- C／C++ の同位置の不変性 ---------------- */
test("batch12-cs: C/C++ behavior at the same positions is unchanged", async () => {
  const cc = (body) => `#include <stdio.h>\nint main() {\n${body}\n return 0;\n}`;
  const cpp = (body) => `#include <iostream>\n#include <vector>\nint main() {\n${body}\n return 0;\n}`;
  // sizeof は C／C++ では従来どおり実働する。
  const cSize = await run("c", cc(`int x = sizeof(int); printf("%d", x);`));
  assert.deepEqual(errors(cSize), []);
  assert.deepEqual(outputs(cSize), [["4"]]);
  const cppSize = await run("cpp", cpp(`int x = sizeof(int); std::cout << x;`));
  assert.deepEqual(errors(cppSize), []);
  assert.deepEqual(outputs(cppSize), [["4"]]);
  // カンマ演算子の括弧式は C／C++ では従来どおり実働する（RG-356）。
  for (const [id, wrap, print] of [
    ["c", cc, (e) => `printf("%d", ${e});`],
    ["cpp", cpp, (e) => `std::cout << ${e};`],
  ]) {
    const r = await run(id, wrap(`int x = (1, 2); ${print("x")}`));
    assert.deepEqual(errors(r), [], `${id} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), [["2"]], id);
  }
  // C の添字内三項・キャストも不変。
  const cIdx = await run("c", cc(`int a[2] = {1, 2}; int i = 0; printf("%d", a[i > 0 ? 1 : 0]);`));
  assert.deepEqual(errors(cIdx), []);
  assert.deepEqual(outputs(cIdx), [["1"]]);
  const cppCast = await run("cpp", cpp(`double d = 1.9; int x = (int)d; std::cout << x;`));
  assert.deepEqual(errors(cppCast), []);
  assert.deepEqual(outputs(cppCast), [["1"]]);
  // B8 高度モードで std::vector の宣言・size() を実装したため、この形は
  // 正常動作する（旧仕様「ジェネリック型は未対応」は B8 で意図的に反転）。
  const cppVec = await run("cpp", cpp(`std::vector<int> v; std::cout << v.size();`));
  assert.deepEqual(errors(cppVec), []);
  assert.deepEqual(outputs(cppVec), [["0"]]);
});
