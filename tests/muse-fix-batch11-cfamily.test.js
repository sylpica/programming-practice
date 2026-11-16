// バッチ11（C家族班）修正の回帰テスト。
// 対象：RG-348（複合代入の全標準形）／RG-349（メンバー末尾形）／
// RG-351（C# 式位置の構文群の名指し）／RG-352（C# 桁区切り 1_000）／
// RG-353（C／C++ 桁区切り 1'000）／RG-356（C／C++ カンマ演算子＋
// for 句）／RG-357（C++ std::string への char 代入）／RG-359（C#
// foreach の要素変換）／RG-360（C# char スカラーへの foreach）。
// 一次情報・実走根拠：dotnet 8.0.428（C# 桁区切りの配置規則・foreach
// 変換の値）／gcc・g++ 13.3（C／C++ 桁区切り・std::string 代入）の
// 当VM実走結果を期待値に反映した。
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

/* ---------------- RG-348: 複合代入の全標準形 ---------------- */
test("RG-348: all compound assignments work on variables in C/C++/C#", async () => {
  // [演算子, 初期値, 右辺, 期待値]（二項演算の実走値と一致）。
  const matrix = [
    ["<<=", 32, 2, "128"],
    [">>=", 32, 2, "8"],
    ["&=", 5, 3, "1"],
    ["|=", 5, 8, "13"],
    ["^=", 5, 3, "6"],
    ["%=", 5, 3, "2"],
    ["+=", 5, 3, "8"],
    ["-=", 5, 3, "2"],
    ["*=", 5, 3, "15"],
    ["/=", 7, 2, "3"],
  ];
  for (const id of ["c", "cpp", "csharp"])
    for (const [op, init, rhs, expected] of matrix) {
      const body = `int x = ${init}; x ${op} ${rhs}; ${print[id]("x")}`;
      const r = await run(id, wrap[id](body));
      assert.deepEqual(errors(r), [], `${id} x ${op} ${rhs} -> ${JSON.stringify(errors(r))}`);
      assert.deepEqual(outputs(r), [[expected]], `${id} x ${op} ${rhs}`);
    }
});

test("RG-348: compound assignments work on index, member and deref targets", async () => {
  for (const id of ["c", "cpp", "csharp"])
    for (const [op, init, rhs, expected] of [
      ["<<=", 16, 2, "64"],
      [">>=", 16, 2, "4"],
      ["&=", 12, 10, "8"],
      ["|=", 12, 3, "15"],
      ["^=", 12, 10, "6"],
    ]) {
      const body = `int a[1] = {${init}}; a[0] ${op} ${rhs}; ${print[id]("a[0]")}`;
      const r = await run(id, wrap[id](body));
      assert.deepEqual(errors(r), [], `${id} a[0] ${op} -> ${JSON.stringify(errors(r))}`);
      assert.deepEqual(outputs(r), [[expected]], `${id} a[0] ${op}`);
    }
  // C# のクラスフィールド（メンバー対象）。
  const member = await run("csharp", cs(
    `class Counter { public int x; } Counter c = new Counter(); c.x = 8; c.x >>= 1; c.x <<= 3; Console.WriteLine(c.x);`,
  ));
  assert.deepEqual(errors(member), [], JSON.stringify(errors(member)));
  assert.deepEqual(outputs(member), [["32"]]);
  // C の逆参照対象（*p への複合代入は expr が対象として受理しない形で、
  // simple 側の受け皿が全演算子を処理する）。
  for (const [op, expected] of [["<<=", "18"], ["+=", "10"], ["%=", "1"], ["&=", "8"]]) {
    const r = await run("c", cc(`int a[1] = {9}; int* p = &a[0]; *p ${op} ${op === "%=" ? 4 : op === "&=" ? 10 : op === "<<=" ? 1 : 1}; printf("%d", a[0]);`));
    assert.deepEqual(errors(r), [], `*p ${op} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), [[expected]], `*p ${op}`);
  }
  // 代入式の位置（条件の中）でも複合代入が働く。
  const inCond = await run("cpp", cpp(`int x = 1; if ((x <<= 2) == 4) { std::cout << x; }`));
  assert.deepEqual(errors(inCond), []);
  assert.deepEqual(outputs(inCond), [["4"]]);
  // C# の bool への &=（論理演算の複合代入）。
  const boolAnd = await run("csharp", cs(`bool b = true; b &= false; Console.WriteLine(b);`));
  assert.deepEqual(errors(boolAnd), []);
  assert.deepEqual(outputs(boolAnd), [["False"]]);
});

/* ---------------- RG-349: メンバー末尾形 ---------------- */
test("RG-349: trailing member access names the missing member name", async () => {
  const cases = [
    ["c", `int a = 1; int x = a.;`],
    ["c", `int a = 1; int x = a->;`],
    ["cpp", `int a = 1; int x = a.;`],
    ["cpp", `int a = 1; int x = a->b.;`],
    ["csharp", `int a = 1; int x = a.;`],
    ["csharp", `int a = 1; int x = a->b.;`],
  ];
  for (const [id, body] of cases) {
    const r = await run(id, wrap[id](body));
    assert.ok(
      errors(r).some((e) => e.includes("メンバー名が必要です")),
      `${id} ${body} -> ${JSON.stringify(errors(r))}`,
    );
    assert.ok(
      !errors(r).some((e) => e.includes("; が必要です")),
      `${id} ${body} should not blame the semicolon -> ${JSON.stringify(errors(r))}`,
    );
  }
  // 対照：完結したメンバーアクセスは従来どおり動く。
  const okCs = await run("csharp", cs(`class Counter { public int x; } Counter c = new Counter(); c.x = 41; c.x++; Console.WriteLine(c.x);`));
  assert.deepEqual(errors(okCs), []);
  assert.deepEqual(outputs(okCs), [["42"]]);
  const okCpp = await run("cpp", cpp(`std::string s = "abc"; std::cout << s.length;`));
  assert.deepEqual(errors(okCpp), []);
  assert.deepEqual(outputs(okCpp), [["3"]]);
});

/* ---------------- RG-351: C# 式位置の構文群の名指し ---------------- */
test("RG-351: C# expression-position syntax is named by its syntax name", async () => {
  const cases = [
    [`int x = 1; Console.WriteLine(x is int);`, "is 演算子"],
    [`int x = 1; bool b = x is not 2;`, "is 演算子"],
    [`int[] a = {1}; Console.WriteLine(a is int[]);`, "is 演算子"],
    [`string s = "a"; Console.WriteLine(s as string);`, "as 演算子"],
    [`int x = default(int);`, "default 式"],
    [`int x = 1; Func<int> f = () => x;`, "ラムダ式"],
    [`int? x = null;`, "nullable 型（int?）"],
    [`int x = 1; Console.WriteLine((int?)x);`, "nullable 型（int?）"],
  ];
  for (const [body, name] of cases) {
    const r = await run("csharp", cs(body));
    assert.ok(
      errors(r).some((e) => e.includes("この構文は説明に対応していません") && e.includes(name)),
      `${body} -> ${JSON.stringify(errors(r))}`,
    );
  }
  // 単一引数（括弧なし）のラムダも、位置により従来のアロー関数名
  // ないしラムダ式名で、構文そのものが名指される。
  const arrow = await run("csharp", cs(`Func<int> f = x => x;`));
  assert.ok(
    errors(arrow).some((e) => e.includes("アロー関数（=>）") || e.includes("ラムダ式")),
    JSON.stringify(errors(arrow)),
  );
  // 文頭形（文として現れる構文）。
  const heads = [
    [`try { } catch { }`, "try 文"],
    [`catch { }`, "catch 節"],
    [`using (var r = null) { }`, "using 文"],
    [`lock (new object()) { }`, "lock 文"],
  ];
  for (const [body, name] of heads) {
    const r = await run("csharp", cs(body));
    assert.ok(
      errors(r).some((e) => e.includes(name)),
      `${body} -> ${JSON.stringify(errors(r))}`,
    );
    assert.ok(
      !errors(r).some((e) => e.includes("が必要です") && !e.includes(name)),
      `${body} should not blame punctuation -> ${JSON.stringify(errors(r))}`,
    );
  }
  // C++ の文頭 try も同根として構文名で停止する。C では try は
  // 識別子として使えるため受理を壊さない。
  const cppTry = await run("cpp", cpp(`try { } catch { }`));
  assert.ok(errors(cppTry).some((e) => e.includes("try 文")), JSON.stringify(errors(cppTry)));
  const cTry = await run("c", cc(`int try = 3; printf("%d", try);`));
  assert.deepEqual(errors(cTry), []);
  assert.deepEqual(outputs(cTry), [["3"]]);
  // 対照：既に正しく名指される形は壊れていない。
  const contrasts = [
    [`int x = 1; string s = x switch { 1 => "one", _ => "other" };`, "switch 式"],
    [`string s = null; Console.WriteLine(s?.Length);`, "オプショナルチェーン"],
    [`string s = null; Console.WriteLine(s ?? "d");`, "null 合体演算子"],
  ];
  for (const [body, name] of contrasts) {
    const r = await run("csharp", cs(body));
    assert.ok(errors(r).some((e) => e.includes(name)), `${body} -> ${JSON.stringify(errors(r))}`);
  }
});

/* ---------------- RG-352: C# 桁区切り 1_000 ---------------- */
test("RG-352: C# digit separators are accepted per dotnet rules", async () => {
  // dotnet 8.0.428 実走で合法だった形と値。
  const legal = [
    [`int x = 1_000; Console.WriteLine(x);`, [["1000"]]],
    [`int x = 1__000; Console.WriteLine(x);`, [["1000"]]],
    [`int x = 0x_FF; Console.WriteLine(x);`, [["255"]]],
    [`int x = 0xFF_FF; Console.WriteLine(x);`, [["65535"]]],
    [`int x = 0b_1010; Console.WriteLine(x);`, [["10"]]],
    [`int x = 0b10_10; Console.WriteLine(x);`, [["10"]]],
    [`double d = 1_0.5; Console.WriteLine(d);`, [["10.5"]]],
    [`double d = 1.5_0; Console.WriteLine(d);`, [["1.5"]]],
    [`uint x = 1_000u; Console.WriteLine(x);`, [["1000"]]],
  ];
  for (const [body, expected] of legal) {
    const r = await run("csharp", cs(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // dotnet 実走で CS1013 だった配置は、全文表示で書式を名指して停止。
  const illegal = [
    [`int x = 1000_;`, "1000_"],
    [`int x = 1000_u;`, "1000_u"],
    [`double d = 1e_5;`, "1e_5"],
    [`double d = 1_0.5_;`, "1_0.5_"],
  ];
  for (const [body, shown] of illegal) {
    const r = await run("csharp", cs(body));
    assert.ok(
      errors(r).some((e) => e.includes("数値リテラルの書き方が不正です") && e.includes(shown)),
      `${body} -> ${JSON.stringify(errors(r))}`,
    );
  }
  // 対照：区切りなしの数値と、先頭アンダースコアの識別子は従来どおり。
  const plain = await run("csharp", cs(`int x = 1000; Console.WriteLine(x);`));
  assert.deepEqual(outputs(plain), [["1000"]]);
  const ident = await run("csharp", cs(`int x = _1000;`));
  assert.ok(errors(ident).some((e) => e.includes("未定義の名前")), JSON.stringify(errors(ident)));
});

/* ---------------- RG-353: C／C++ 桁区切り 1'000 ---------------- */
test("RG-353: C/C++ digit separators are accepted per gcc/g++ rules", async () => {
  // g++ -std=c++14／gcc -std=c2x 実走で合法だった形と値。
  for (const id of ["c", "cpp"]) {
    const legal = [
      [`int x = 1'000; ${print[id]("x")}`, [["1000"]]],
      [`int x = 1'000'000; ${print[id]("x")}`, [["1000000"]]],
      [`int x = 0x1'000; ${print[id]("x")}`, [["4096"]]],
      [`int x = 0b1'0; ${print[id]("x")}`, [["2"]]],
      [`int x = 0'7; ${print[id]("x")}`, [["7"]]],
    ];
    for (const [body, expected] of legal) {
      const r = await run(id, wrap[id](body));
      assert.deepEqual(errors(r), [], `${id} ${body} -> ${JSON.stringify(errors(r))}`);
      assert.deepEqual(outputs(r), expected, `${id} ${body}`);
    }
    // 実コンパイラでエラーになる配置は桁区切りを名指して停止する。
    for (const body of [`int x = 1''000;`, `int x = 1000';`]) {
      const r = await run(id, wrap[id](body));
      assert.ok(
        errors(r).some((e) => e.includes("桁区切り") && e.includes(body.slice(8, -1))),
        `${id} ${body} -> ${JSON.stringify(errors(r))}`,
      );
      assert.ok(
        !errors(r).some((e) => e.includes("文字列")),
        `${id} ${body} must not blame strings -> ${JSON.stringify(errors(r))}`,
      );
    }
  }
  const frac = await run("cpp", cpp(`double d = 1'000.5; std::cout << d;`));
  assert.deepEqual(errors(frac), []);
  assert.deepEqual(outputs(frac), [["1000.5"]]);
  // 対照：文字リテラルは従来どおり。
  const ch = await run("cpp", cpp(`char c = 'a'; std::cout << (int)c;`));
  assert.deepEqual(errors(ch), []);
  assert.deepEqual(outputs(ch), [["97"]]);
});

/* ---------------- RG-356: カンマ演算子＋for 句 ---------------- */
test("RG-356: comma operator evaluates left for side effects and yields right", async () => {
  for (const id of ["c", "cpp"]) {
    const cases = [
      [`int a = (1, 2); ${print[id]("a")}`, [["2"]]],
      [`int i = 0; int a = (i = 5, i + 1); ${print[id]("a")}`, [["6"]]],
      [`int i = 0; while ((i++, i < 3)) { } ${print[id]("i")}`, [["3"]]],
      // for 初期化部（代入のカンマ列）と増分部のカンマ列。
      [`int i; int j; for (i = 0, j = 0; i < 3; i++, j++) { } ${print[id]("i")}`, [["3"]]],
      [`int i; int j; for (i = 0, j = 0; i < 3; i++, j++) { } ${print[id]("j")}`, [["3"]]],
      // for 初期化部の複数宣言子（ブロック位置・C++ と揃えて受理）。
      [`int n = 0; for (int i = 0, j = 0; i < 3; i++) { n++; } ${print[id]("n")}`, [["3"]]],
      // 文位置のカンマ列。
      [`int i = 0; int j = 0; i++, j++; ${print[id]("i + j")}`, [["2"]]],
    ];
    for (const [body, expected] of cases) {
      const r = await run(id, wrap[id](body));
      assert.deepEqual(errors(r), [], `${id} ${body} -> ${JSON.stringify(errors(r))}`);
      assert.deepEqual(outputs(r), expected, `${id} ${body}`);
    }
    // 対照：呼出し引数のカンマは区切りのまま（演算子として消費しない）。
    const call = await run(id, wrap[id](
      id === "c" ? `printf("%d %d", 1, 2);` : `std::cout << 1 << 2;`,
    ));
    assert.deepEqual(errors(call), [], `${id} call args -> ${JSON.stringify(errors(call))}`);
    assert.deepEqual(outputs(call), id === "c" ? [["1 2"]] : [["12"]]);
  }
  // C++ の直接初期化の複数引数は、カンマ演算子に化けず従来の名指し。
  const direct = await run("cpp", cpp(`std::string s(1, 2);`));
  assert.ok(
    errors(direct).some((e) => e.includes("複数引数の直接初期化は未対応です")),
    JSON.stringify(errors(direct)),
  );
  // C# のカンマ式の扱いは変更しない（式位置のカンマは従来どおり停止）。
  const csComma = await run("csharp", cs(`int a = (1, 2);`));
  assert.ok(errors(csComma).length > 0, "C# comma expression must still stop");
  // C# の for 句の文式の列（文法上の列挙）は実 C# どおり受理する。
  const csFor = await run("csharp", cs(`int i; int j; for (i = 0, j = 0; i < 3; i++, j++) { } Console.WriteLine(i + " " + j);`));
  assert.deepEqual(errors(csFor), [], JSON.stringify(errors(csFor)));
  assert.deepEqual(outputs(csFor), [["3 3"]]);
});

/* ---------------- RG-357: C++ std::string への char 代入 ---------------- */
test("RG-357: C++ std::string assignment converts char, initialization still stops", async () => {
  const ok = [
    [`std::string s; s = 'x'; std::cout << s;`, [["x"]]],
    [`char c = 'x'; std::string s; s = c; std::cout << s;`, [["x"]]],
    // g++ 実走：整数値も char への変換を経て1文字になる。
    [`std::string s; s = 65; std::cout << s;`, [["A"]]],
    // 対照：文字列代入・連結・複合代入は従来どおり。
    [`std::string s; s = "zz"; std::cout << s;`, [["zz"]]],
    [`std::string s = "z"; s += 'b'; std::cout << s;`, [["zb"]]],
    [`std::string s = "a"; std::string t = s + 'b'; std::cout << t;`, [["ab"]]],
    [`std::string s{'x'}; std::cout << s;`, [["x"]]],
    // 配列要素への代入も代入形として受理される（要素の読み取り側の
    // 既知の不具合とは独立に、代入文自体は停止しない）。
    [`std::string a[1]; a[0] = 'x'; std::cout << "ok";`, [["ok"]]],
  ];
  for (const [body, expected] of ok) {
    const r = await run("cpp", cpp(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // 初期化形は実 C++ でもコンパイルエラー。代入形と区別できる文言で
  // 停止し、従来の「文字列型が一致しません」単独にはしない。
  const init = await run("cpp", cpp(`std::string s = 'x';`));
  assert.ok(
    errors(init).some((e) => e.includes("std::string の初期化に char は使えません")),
    JSON.stringify(errors(init)),
  );
});

/* ---------------- RG-359: C# foreach の要素変換 ---------------- */
test("RG-359: foreach binds elements converted to the declared variable type", async () => {
  // dotnet 8.0.428 実走の値（char→コード単位値、int→文字化、
  // 範囲外は未チェック文脈でラップ、浮動小数点は切り捨て）。
  const cases = [
    [`foreach (int c in "ab") { Console.WriteLine(c); }`, [["97", "98"]]],
    [`foreach (double d in "ab") { Console.WriteLine(d); }`, [["97", "98"]]],
    [`foreach (byte b in "ab") { Console.WriteLine(b); }`, [["97", "98"]]],
    [`foreach (int c in new char[]{'a', 'b'}) { Console.WriteLine(c); }`, [["97", "98"]]],
    [`foreach (char c in new int[]{65, 66}) { Console.WriteLine(c); }`, [["A", "B"]]],
    [`foreach (char c in new int[]{70000}) { Console.WriteLine((int)c); }`, [["4464"]]],
    [`foreach (byte b in new int[]{300}) { Console.WriteLine(b); }`, [["44"]]],
    [`foreach (int c in new double[]{1.9, -1.9}) { Console.WriteLine(c); }`, [["1", "-1"]]],
    // 変換なし（同一型）は従来どおり。
    [`foreach (char c in "ab") { Console.WriteLine(c); }`, [["a", "b"]]],
    [`foreach (int v in new int[]{1, 2}) { Console.WriteLine(v); }`, [["1", "2"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("csharp", cs(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
  // checked 文脈では範囲外の変換が OverflowException になる（dotnet 実走）。
  const checked = await run("csharp", cs(`checked { foreach (byte b in new int[]{300}) { Console.WriteLine(b); } }`));
  assert.ok(
    errors(checked).some((e) => e.includes("OverflowException")),
    JSON.stringify(errors(checked)),
  );
  // 範囲外（本件の対象外）：変換が存在しない組合せの黙った反復は
  // バッチ10 §5 の既知の緩さとして変更しない。
  const loose = await run("csharp", cs(`foreach (string v in new int[]{1}) { Console.WriteLine(v); }`));
  assert.deepEqual(errors(loose), []);
  assert.deepEqual(outputs(loose), [["1"]]);
});

/* ---------------- RG-360: C# char スカラーへの foreach ---------------- */
test("RG-360: foreach over a char scalar stops like other scalars", async () => {
  for (const body of [
    `char ch = 'q'; foreach (char c in ch) { Console.WriteLine(c); }`,
    `foreach (char c in 'q') { Console.WriteLine(c); }`,
  ]) {
    const r = await run("csharp", cs(body));
    assert.ok(
      errors(r).some((e) => e.includes("未確定または配列でない繰り返し対象")),
      `${body} -> ${JSON.stringify(errors(r))}`,
    );
    assert.deepEqual(outputs(r), [[]], `${body} must not iterate`);
  }
  // 対照：文字列・char[]・空文字列の foreach（RG-338 の範囲）は不変。
  const contrasts = [
    [`foreach (char c in "ab") { Console.WriteLine(c); }`, [["a", "b"]]],
    [`char[] a = {'x'}; foreach (char c in a) { Console.WriteLine(c); }`, [["x"]]],
    [`foreach (char c in String.Empty) { Console.WriteLine(c); } Console.WriteLine("done");`, [["done"]]],
    [`foreach (char c in 42) { Console.WriteLine(c); }`, null],
  ];
  for (const [body, expected] of contrasts) {
    const r = await run("csharp", cs(body));
    if (expected === null)
      assert.ok(errors(r).some((e) => e.includes("未確定または配列でない繰り返し対象")), body);
    else {
      assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
      assert.deepEqual(outputs(r), expected, body);
    }
  }
});
