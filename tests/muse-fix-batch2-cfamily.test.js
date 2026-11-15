import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ2・C家族班の回帰テスト。
// 対象：NX-N5／NX-N6／NX-N10／NX-N19（narrcheck §3）、
// P-N3／P-N4（perfcheck）、D2-4（verification-reffix D2 表）。

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
const termNotes = (p) =>
  (p.trace || []).map((t) => t.text).filter((t) => /回実行してループを終了します/.test(t));

// ---------- NX-N5: do-while の実行回数注記は先行実行分を含む ----------
test("NX-N5 do-while count includes the first iteration (C/C++/C#)", async () => {
  const c1 = await first("c", `#include <stdio.h>\nint main(){ int n = 10; do { n++; } while (n < 3); printf("%d\\n", n); return 0; }`);
  assert.equal(output(c1), "11\n");
  assert.deepEqual(termNotes(c1), ["1回実行してループを終了します"]);
  const c3 = await first("c", `#include <stdio.h>\nint main(){ int n = 0; do { n++; } while (n < 3); printf("%d\\n", n); return 0; }`);
  assert.equal(output(c3), "3\n");
  assert.deepEqual(termNotes(c3), ["3回実行してループを終了します"]);
  const cpp1 = await first("cpp", `#include <iostream>\nint main(){ int n = 10; do { n++; } while (n < 3); std::cout << n; return 0; }`);
  assert.deepEqual(termNotes(cpp1), ["1回実行してループを終了します"]);
  const cs3 = await first("csharp", `int n = 0; do { n++; } while (n < 3); Console.WriteLine(n);`);
  assert.equal(output(cs3), "3");
  assert.deepEqual(termNotes(cs3), ["3回実行してループを終了します"]);
  // 前判定 while の「0回」は従来どおり正しい（do-while と混同しない）。
  const w0 = await first("c", `#include <stdio.h>\nint main(){ int n = 10; while (n < 3) { n++; } printf("%d\\n", n); return 0; }`);
  assert.deepEqual(termNotes(w0), ["0回実行してループを終了します"]);
});

// ---------- NX-N10: do-while 初回反復の break／continue ----------
test("NX-N10 do-while break/continue work in the first iteration (C/C++/C#)", async () => {
  const brk = await first("c", `#include <stdio.h>\nint main(){ int n = 0; do { n++; if (n == 1) { break; } } while (n < 10); printf("%d\\n", n); return 0; }`);
  assert.equal(output(brk), "1\n");
  // gcc 実測と一致する継続ケース：continue は条件判定へ進む。
  const cnt = await first("c", `#include <stdio.h>\nint main(){ int n = 0; do { n++; if (n == 1) { continue; } n = n + 10; } while (n < 3); printf("%d\\n", n); return 0; }`);
  assert.equal(output(cnt), "12\n");
  assert.deepEqual(termNotes(cnt), ["2回実行してループを終了します"]);
  const brkCpp = await first("cpp", `#include <iostream>\nint main(){ int n = 0; do { n++; if (n == 1) { break; } } while (n < 10); std::cout << n; return 0; }`);
  assert.equal(output(brkCpp), "1");
  const brkCs = await first("csharp", `int n = 0; do { n++; if (n == 1) { break; } } while (n < 10); Console.WriteLine(n);`);
  assert.equal(output(brkCs), "1");
  const cntCs = await first("csharp", `int n = 0; do { n++; if (n == 1) { continue; } n = n + 10; } while (n < 3); Console.WriteLine(n);`);
  assert.equal(output(cntCs), "12");
});

// ---------- NX-N6: unsigned 変換は 2^N の剰余で折り返す ----------
test("NX-N6 unsigned char conversion wraps modulo 256", async () => {
  const p = await first("c", `#include <stdio.h>\nint main(){ unsigned char c = 200; unsigned char d = c + 100; printf("%d %d\\n", c, d); return 0; }`);
  assert.equal(output(p), "200 44\n");
  assert.equal(p.vars.d, 44);
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned char d = -1; printf("%d\\n", d); return 0; }`)), "255\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned char d = 260; printf("%d\\n", d); return 0; }`)), "4\n");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ unsigned char d = 300; std::cout << (int)d; return 0; }`)), "44");
});
test("NX-N6 unsigned int/short defined conversions no longer stop as implementation-defined", async () => {
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned int u = 3000000000; printf("%u\\n", u); return 0; }`)), "3000000000\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned int u = 4294967295; u = u + 1; printf("%u\\n", u); return 0; }`)), "0\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned int u = 0 - 1; printf("%u\\n", u); return 0; }`)), "4294967295\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned short s = 40000; printf("%d\\n", s); return 0; }`)), "40000\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned short s = 70000; printf("%d\\n", s); return 0; }`)), "4464\n");
});
test("NX-N6 unsigned siblings: array init, increment, assignment, double source", async () => {
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned char a[2] = {200, 300}; printf("%d %d\\n", a[0], a[1]); return 0; }`)), "200 44\n");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ unsigned char c = 255; c++; std::cout << (int)c; return 0; }`)), "0");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned short s = 1; s = 70000; printf("%d\\n", s); return 0; }`)), "4464\n");
  // 浮動小数点からの変換は、表せる範囲なら値どおり、範囲外は未定義動作で停止。
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned int u = 3000000000.0; printf("%u\\n", u); return 0; }`)), "3000000000\n");
  await expectError("c", `#include <stdio.h>\nint main(){ unsigned char d = 300.5; printf("%d\\n", d); return 0; }`, /浮動小数点から整数への変換が範囲外です/, "未定義動作");
});
test("NX-N6 signed conversions still stop, and C# model limits are unchanged", async () => {
  await expectError("c", `#include <stdio.h>\nint main(){ short s = 40000; printf("%d\\n", s); return 0; }`, /整数への変換結果は処理系依存です/, "環境依存");
  await expectError("c", `#include <stdio.h>\nint main(){ signed char c = 200; printf("%d\\n", c); return 0; }`, /整数への変換結果は処理系依存です/, "環境依存");
  // C# の byte は funcheck D3 で符号なし範囲へ是正済み（200 は受理、範囲外リテラルは停止）。
  assert.equal(output(await first("csharp", `byte b = 200; Console.WriteLine(b);`)), "200");
  await expectError("csharp", `byte b = 300; Console.WriteLine(b);`, /整数への変換が範囲外です/, "OverflowException");
});

// ---------- NX-N19: C# foreach 反復変数は終了時に残らない ----------
test("NX-N19 foreach iteration variable is removed from final vars and groups", async () => {
  const p = await first("csharp", `int[] v = {7, 8}; foreach (int x in v) {} Console.WriteLine(1);`);
  assert.equal(output(p), "1");
  assert.ok(!("x" in p.vars), "x must not remain in final vars");
  const groupNames = p.groups.flatMap((g) => g.entries.map(([k]) => k));
  assert.ok(!groupNames.includes("x"), "x must not remain in groups");
  const twice = await first("csharp", `int[] v = {7, 8}; int t = 0; foreach (int x in v) { t += x; } foreach (int x in v) { t += x; } Console.WriteLine(t);`);
  assert.equal(output(twice), "30");
  assert.ok(!("x" in twice.vars));
  const brk = await first("csharp", `int[] v = {7, 8, 9}; int t = 0; foreach (int x in v) { if (x == 8) { break; } t += x; } Console.WriteLine(t);`);
  assert.equal(output(brk), "7");
  assert.ok(!("x" in brk.vars));
  const nested = await first("csharp", `int[] a = {1, 2}; int[] b = {10, 20}; int t = 0; foreach (int x in a) { foreach (int y in b) { t += x + y; } } Console.WriteLine(t);`);
  assert.equal(output(nested), "66");
  assert.ok(!("x" in nested.vars) && !("y" in nested.vars));
});

// ---------- P-N3: ホスト例外の生文言が漏れない ----------
test("P-N3 C++ string doubling stops with a Japanese reason, not the V8 wording", { timeout: 180000 }, async () => {
  const r = await run("cpp", `#include <iostream>\n#include <string>\nint main(){ std::string s = "a"; for (int i = 0; i < 40; i++) { s = s + s; } std::cout << s.length(); return 0; }`);
  const errs = errors(r);
  assert.ok(errs.length, "expected the run to stop");
  assert.match(errs[0].message, /文字列が長くなりすぎて処理できませんでした/);
  assert.equal(errs[0].category, "limit");
  assert.ok(!/Invalid string length/.test(errs[0].message));
  for (const p of r.paths || [])
    for (const t of p.trace || [])
      assert.ok(!/Invalid string length/.test(t.text), "host wording must not appear in trace");
});

// ---------- P-N4: 準備コストは文数に対して超線形にならない ----------
test("P-N4 C preparation cost stays near-linear in statement count", async () => {
  const gen = (n) => {
    let body = "int v0 = nosuchvar;\n";
    for (let i = 1; i < n; i++) body += `int v${i} = ${i % 10};\n`;
    return `#include <stdio.h>\nint main(){\n${body}return 0;\n}`;
  };
  const bench = async (n) => {
    // 伸びの測定が時間上限の打ち切りと干渉しないよう、制限は広く取る。
    const d = getDefinition("c");
    let best = Infinity;
    for (let k = 0; k < 3; k++) {
      const t0 = performance.now();
      const r = await d.simulate(gen(n), structuredClone(d.model.defaults), { milliseconds: 60000 });
      assert.match(errors(r)[0].message, /未定義の名前/);
      best = Math.min(best, performance.now() - t0);
    }
    return best;
  };
  const t1000 = await bench(1000);
  const t4000 = await bench(4000);
  // 修正前（同一条件の実測）：1000文 276ms → 4000文 3916ms（約14倍）。
  // 線形化後は 4000文でも公称上限 1200ms を大きく下回り、伸びも緩やか。
  assert.ok(t4000 < 1500, `4000 statements took ${t4000.toFixed(0)}ms (min of 3)`);
  assert.ok(t4000 <= Math.max(t1000 * 10, 400), `superlinear growth: 1000=${t1000.toFixed(0)}ms 4000=${t4000.toFixed(0)}ms`);
});
test("P-N4 preparation is covered by the time limit with an honest Japanese cutoff", async () => {
  let body = "";
  for (let i = 0; i < 4000; i++) body += `int v${i} = ${i % 10};\n`;
  const code = `#include <stdio.h>\nint main(){\n${body}return 0;\n}`;
  const d = getDefinition("c");
  const r = await d.simulate(code, structuredClone(d.model.defaults), { milliseconds: 1 });
  assert.ok(r.error, "expected a top-level preparation error");
  assert.match(r.error.message, /解析時間の上限で停止しました/);
  assert.equal(r.error.category, "limit");
});

// ---------- D2-4: getline 項目の注意書きは実挙動に合う ----------
test("D2-4 getline caution matches the actual cin >> behavior", async () => {
  const d = getDefinition("cpp");
  const entry = d.reference.find((r) => r.name === "getline");
  assert.ok(entry, "getline reference entry must exist");
  // funcheck D7 で是正：cin >> x は抽出先を未確定値にする（旧値の保持＝値の捏造ではない）。
  assert.match(entry.caution, /抽出先の変数が未確定値になります/);
  assert.ok(!/解釈され停止します/.test(entry.caution));
  assert.ok(!/シフト式として評価されます/.test(entry.caution));
  // 実挙動の固定：cin >> x は停止せず、x は未確定値になる。
  const p = await first("cpp", `#include <iostream>\nint main(){ int x = 7; std::cin >> x; std::cout << x; return 0; }`);
  assert.match(output(p), /実行時に決まる：標準入力/);
  assert.equal(p.vars.x?.kind, "unknown");
});

// =====================================================================
// 修正バッチ2 フェーズ2（C家族・拡張班）：funcheck D1〜D14 の残存分、
// R23-N5、SEM-3、refacc RA-29〜RA-39。
// D1／D2 はフェーズ1（NX-N6）で解消済みのため、ここでは再現確認のみ。
// =====================================================================

// ---------- D3／SEM-3: C# 符号なし型は符号なし範囲で扱う ----------
test("D3 C# unsigned declarations and promotion use the unsigned range", async () => {
  assert.equal(output(await first("csharp", `byte b = 200; Console.WriteLine(b);`)), "200");
  assert.equal(output(await first("csharp", `byte b = 255; Console.WriteLine(b);`)), "255");
  assert.equal(output(await first("csharp", `ushort s = 65535; Console.WriteLine(s);`)), "65535");
  assert.equal(output(await first("csharp", `ushort s = 40000; Console.WriteLine(s);`)), "40000");
  assert.equal(output(await first("csharp", `uint u = 4000000000u; Console.WriteLine(u);`)), "4000000000");
  assert.equal(output(await first("csharp", `uint u = 4294967295u; Console.WriteLine(u + 1u);`)), "0");
  assert.equal(output(await first("csharp", `byte b = 200; Console.WriteLine(b + b);`)), "400");
  assert.equal(output(await first("csharp", `uint u = uint.MaxValue; Console.WriteLine(u);`)), "4294967295");
  assert.equal(output(await first("csharp", `byte b = byte.MaxValue; Console.WriteLine(b);`)), "255");
});
test("SEM-3 C# unsigned assignment wraps instead of storing -1", async () => {
  assert.equal(output(await first("csharp", `uint u = 0; u = u - 1; Console.WriteLine(u);`)), "4294967295");
  assert.equal(output(await first("csharp", `ushort s = 65535; Console.WriteLine((ushort)(s + 1));`)), "0");
  assert.equal(output(await first("csharp", `Console.WriteLine((byte)300);`)), "44");
  assert.equal(output(await first("csharp", `byte b = 255; b++; Console.WriteLine(b);`)), "0");
  assert.equal(output(await first("csharp", `ushort s = 65535; s++; Console.WriteLine(s);`)), "0");
  assert.equal(output(await first("csharp", `uint u = 4294967295u; u++; Console.WriteLine(u);`)), "0");
  assert.equal(output(await first("csharp", `Console.WriteLine(0u - 1u);`)), "4294967295");
  // 式単体 u - 1 は long へ昇格する実 C# の規則どおり -1（代入とは別）。
  assert.equal(output(await first("csharp", `uint u = 0; Console.WriteLine(u - 1);`)), "-1");
  // checked では折り返さず例外、定数リテラルの範囲外宣言も停止する。
  await expectError("csharp", `uint u = 4294967295u; Console.WriteLine(checked(u + 1u));`, /オーバーフロー/, "OverflowException");
  await expectError("csharp", `byte b = 300; Console.WriteLine(b);`, /整数への変換が範囲外です/, "OverflowException");
});

// ---------- D4: abs の引数変換 ----------
test("D4 abs converts its argument to int in C, keeps double overload in C++", async () => {
  const H = `#include <stdio.h>\n#include <stdlib.h>\nint main(){ `;
  assert.equal(output(await first("c", H + `printf("%d\\n", abs(-5.5)); return 0; }`)), "5\n");
  assert.equal(output(await first("c", H + `double d = -5.5; printf("%d\\n", abs(d)); return 0; }`)), "5\n");
  assert.equal(output(await first("c", H + `printf("%d\\n", abs(-5)); return 0; }`)), "5\n");
  // C++ では double オーバーロードの結果は double：%d は型不一致で停止し、
  // cout では 5.5 と表示される。
  await expectError("cpp", `#include <iostream>\n#include <cstdlib>\nint main(){ printf("%d\\n", abs(-5.5)); return 0; }`, /printfの書式と引数型が一致しません/, "未定義動作");
  assert.equal(output(await first("cpp", `#include <iostream>\n#include <cstdlib>\nint main(){ std::cout << abs(-5.5); return 0; }`)), "5.5");
});

// ---------- D5: C／C++ の浮動小数点 % はコンパイルエラー ----------
test("D5 floating-point % is rejected in C/C++ but stays valid in C#", async () => {
  await expectError("c", `#include <stdio.h>\nint main(){ printf("%f\\n", 5.5 % 2.0); return 0; }`, /剰余演算子 % の被演算子は整数型でなければなりません/, "CompileError");
  await expectError("c", `#include <stdio.h>\nint main(){ printf("%f\\n", 5 % 2.0); return 0; }`, /剰余演算子 %/, "CompileError");
  await expectError("cpp", `#include <iostream>\nint main(){ double a = 5.5; std::cout << (a % 2.0); return 0; }`, /剰余演算子 %/, "CompileError");
  await expectError("c", `#include <stdio.h>\nint main(){ double d = 5.5; d %= 2.0; printf("%f\\n", d); return 0; }`, /剰余演算子 %/, "CompileError");
  assert.equal(output(await first("csharp", `Console.WriteLine(5.5 % 2.0);`)), "1.5");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ printf("%d\\n", 5 % 2); return 0; }`)), "1\n");
});

// ---------- D6: cout の char 系は文字として出す ----------
test("D6 cout prints signed/unsigned char as characters", async () => {
  const H = `#include <iostream>\nint main(){ `;
  assert.equal(output(await first("cpp", H + `unsigned char c = 65; std::cout << c << std::endl; return 0; }`)), "A\n");
  assert.equal(output(await first("cpp", H + `signed char c = 65; std::cout << c << std::endl; return 0; }`)), "A\n");
  assert.equal(output(await first("cpp", H + `char c = 65; std::cout << c << std::endl; return 0; }`)), "A\n");
  // 数値として見たい場合はキャストで従来どおり。
  assert.equal(output(await first("cpp", H + `unsigned char c = 65; std::cout << (int)c; return 0; }`)), "65");
});

// ---------- D7: cin >> の抽出先は未確定値になる ----------
test("D7 cin extraction makes the target unknown instead of keeping the old value", async () => {
  const H = `#include <iostream>\n#include <string>\nint main(){ `;
  const p1 = await first("cpp", H + `int n = 42; std::cin >> n; std::cout << n << std::endl; return 0; }`);
  assert.match(output(p1), /実行時に決まる：標準入力/);
  assert.equal(p1.vars.n?.kind, "unknown");
  const p2 = await first("cpp", H + `std::string s = "keep"; std::cin >> s; std::cout << s << std::endl; return 0; }`);
  assert.match(output(p2), /実行時に決まる：標準入力/);
  // 未初期化の抽出先でも未初期化読みにならず、抽出として成立する。
  const p3 = await first("cpp", H + `int n; std::cin >> n; std::cout << "done"; return 0; }`);
  assert.equal(output(p3), "done");
  assert.equal(p3.vars.n?.kind, "unknown");
  // 連鎖抽出では両方が未確定値になる。
  const p4 = await first("cpp", H + `int a = 1; int b = 2; std::cin >> a >> b; std::cout << "done"; return 0; }`);
  assert.equal(p4.vars.a?.kind, "unknown");
  assert.equal(p4.vars.b?.kind, "unknown");
  // 通常のシフト演算は従来どおり。
  assert.equal(output(await first("cpp", H + `int n = 5; int m = n >> 1; std::cout << m; return 0; }`)), "2");
});

// ---------- D8: printf %f は 1e21 以上でも固定小数表記 ----------
test("D8 printf %f stays fixed-notation at and above 1e21", async () => {
  const H = `#include <stdio.h>\nint main(){ `;
  assert.equal(output(await first("c", H + `printf("%f\\n", 1e21); return 0; }`)), "1000000000000000000000.000000\n");
  assert.equal(output(await first("c", H + `printf("%f\\n", -1e21); return 0; }`)), "-1000000000000000000000.000000\n");
  assert.equal(output(await first("c", H + `float f = 1e30f; printf("%f\\n", f); return 0; }`)), "1000000015047466219876688855040.000000\n");
  assert.equal(output(await first("c", H + `printf("%f\\n", 1e20); return 0; }`)), "100000000000000000000.000000\n");
});

// ---------- D9: 三項演算子の結果型は統一される ----------
test("D9 ternary result type is unified by arithmetic conversion (C/C++)", async () => {
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ printf("%f\\n", 1 ? 2 : 3.5); return 0; }`)), "2.000000\n");
  assert.equal(output(await first("cpp", `#include <cstdio>\nint main(){ printf("%f\\n", 0 ? 2 : 3.5); return 0; }`)), "3.500000\n");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ printf("%d\\n", 1 ? 2 : 3); return 0; }`)), "2\n");
});

// ---------- D10: 配列名の逆参照の型 ----------
test("D10 dereferencing an array name has the element type", async () => {
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ int v[3] = {4, 5, 6}; printf("%d\\n", *v); return 0; }`)), "4\n");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ int v[3] = {4, 5, 6}; std::cout << *v; return 0; }`)), "4");
});

// ---------- D11: C# の範囲外 float→int キャストは確定値を返さない ----------
test("D11 unchecked out-of-range float-to-int cast in C# stops as unspecified", async () => {
  await expectError("csharp", `Console.WriteLine((int)1e30);`, /不定（unspecified）/, "未確認");
  await expectError("csharp", `Console.WriteLine(unchecked((int)1e30));`, /不定（unspecified）/, "未確認");
  await expectError("csharp", `Console.WriteLine((int)(1.0/0.0));`, /不定（unspecified）/, "未確認");
  await expectError("csharp", `Console.WriteLine(checked((int)1e30));`, /キャストが範囲外/, "OverflowException");
  assert.equal(output(await first("csharp", `Console.WriteLine((int)1.5);`)), "1");
});

// ---------- D12: 未確定文字列の Length／要素は伝播する ----------
test("D12 Length and indexing of an unknown string propagate unknown", async () => {
  const p = await first("csharp", `string t = Console.ReadLine(); Console.WriteLine(t.Length);`);
  assert.match(output(p), /実行時に決まる：未確定の対象の Length/);
  const p2 = await first("csharp", `string t = Console.ReadLine(); Console.WriteLine(t[0]);`);
  assert.match(output(p2), /実行時に決まる/);
  assert.equal(output(await first("csharp", `string t = "abc"; Console.WriteLine(t.Length);`)), "3");
});

// ---------- D13: printf 引数の未順序競合は未定義動作として停止 ----------
test("D13 unsequenced side effect and read in printf arguments stop as UB", async () => {
  const H = `#include <stdio.h>\nint main(){ `;
  await expectError("c", H + `int i = 5; printf("%d %d\\n", i++, i); return 0; }`, /評価順が未規定/, "未定義動作");
  await expectError("c", H + `int i = 5; printf("%d %d\\n", i++, i++); return 0; }`, /評価順が未規定/, "未定義動作");
  // 競合のない形は従来どおり動く。cout の << 連鎖は C++17 で順序付け
  // られるため対象外。
  assert.equal(output(await first("c", H + `int i = 5; printf("%d\\n", i++ + 0); return 0; }`)), "5\n");
  assert.equal(output(await first("c", H + `int i = 5; int j = 7; printf("%d %d\\n", i++, j++); return 0; }`)), "5 7\n");
  assert.equal(output(await first("cpp", `#include <iostream>\nint main(){ int i = 5; std::cout << i++ << i; return 0; }`)), "56");
});

// ---------- D14: C# の過剰受理（abs／C 形式の型名） ----------
test("D14 C# rejects the C abs function and C-style type names", async () => {
  await expectError("csharp", `Console.WriteLine(abs(-5));`, /C# に abs 関数はありません/, "CompileError");
  await expectError("csharp", `unsigned int u = 5; Console.WriteLine(u);`, /C# に「unsigned int」という型名はありません（uint を使います）/, "未対応");
  await expectError("csharp", `unsigned long u = 5; Console.WriteLine(u);`, /C# に「unsigned long」という型名はありません/, "未対応");
  await expectError("csharp", `signed char c = 65; Console.WriteLine(c);`, /C# に「signed char」という型名はありません/, "未対応");
  await expectError("csharp", `unsigned char c = 65; Console.WriteLine(c);`, /C# に「unsigned char」という型名はありません/, "未対応");
  assert.equal(output(await first("csharp", `long n = 1; Console.WriteLine(n);`)), "1");
  assert.equal(output(await first("csharp", `short n = 1; Console.WriteLine(n);`)), "1");
});

// ---------- R23-N5: 小数・非整数の添字は型として停止する ----------
test("R23-N5 non-integer subscripts stop as a type error in C/C++/C#", async () => {
  const msg = /添字は整数型でなければなりません/;
  await expectError("cpp", `#include <iostream>\nint main(){ int a[3] = {1,2,3}; std::cout << a[1.5]; return 0; }`, msg, "CompileError");
  await expectError("cpp", `#include <iostream>\nint main(){ int a[3] = {1,2,3}; std::cout << a["x"]; return 0; }`, msg, "CompileError");
  await expectError("cpp", `#include <iostream>\nint main(){ int a[3] = {1,2,3}; a[1.5] = 9; std::cout << a[1]; return 0; }`, msg, "CompileError");
  await expectError("c", `#include <stdio.h>\nint main(){ int a[3] = {1,2,3}; printf("%d", a[1.5]); return 0; }`, msg, "CompileError");
  await expectError("c", `#include <stdio.h>\nint main(){ int a[3] = {1,2,3}; a[1.5] = 9; printf("%d", a[1]); return 0; }`, msg, "CompileError");
  await expectError("csharp", `int[] a = {1,2,3}; Console.WriteLine(a[1.5]);`, msg, "CompileError");
  await expectError("csharp", `int[] a = {1,2,3}; Console.WriteLine(a[true]);`, msg, "CompileError");
  await expectError("csharp", `int[] a = {1,2,3}; a[1.5] = 9; Console.WriteLine(a[1]);`, msg, "CompileError");
  await expectError("cpp", `#include <iostream>\n#include <string>\nint main(){ std::string s = "abc"; std::cout << s[1.5]; return 0; }`, msg, "CompileError");
  // 整数の添字・bool（C／C++ では int へ変換）・char 添字（C#）は従来どおり。
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ int a[3] = {1,2,3}; printf("%d", a[1]); return 0; }`)), "2");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ int a[3] = {1,2,3}; a[true] = 9; printf("%d", a[1]); return 0; }`)), "9");
  await expectError("csharp", `int[] a = {10,20,30}; Console.WriteLine(a[(char)98]);`, /配列範囲外/, "IndexOutOfRangeException");
});

// ---------- RA-29〜RA-39: 文面・使用例の照合 ----------
test("RA-29/30/31/36 resolved surfaces stay resolved", async () => {
  const cpp = getDefinition("cpp");
  const gl = cpp.reference.find((r) => r.name === "getline");
  assert.ok(!/解釈され停止します/.test(gl.caution));
  const str = cpp.reference.find((r) => r.name === "string");
  assert.match(str.example, /std::string s = "ab";/);
  assert.match(str.example, /#include <string>/);
  assert.match(gl.example, /std::string line;/);
  const cBool = getDefinition("c").reference.find((r) => r.name === "bool");
  assert.match(cBool.example, /#include <stdbool\.h>/);
  const cAbs = getDefinition("c").reference.find((r) => r.name === "abs");
  assert.match(cAbs.example, /#include <stdlib\.h>/);
});
test("RA-32 model type widths are not stated as universal facts (C/C++)", () => {
  for (const id of ["c", "cpp"]) {
    const d = getDefinition(id);
    const short = d.reference.find((r) => r.name === "short");
    assert.match(short.description, /モデルでは16ビット/);
    assert.match(short.caution, /保証される最小範囲は -32767〜32767/);
    const ushort = d.reference.find((r) => r.name === "unsigned short");
    assert.match(ushort.description, /モデルでは16ビット/);
    const float = d.reference.find((r) => r.name === "float");
    assert.match(float.description, /モデルでは32ビット/);
    assert.match(float.description, /保証されません/);
    const schar = d.reference.find((r) => r.name === "signed char");
    assert.match(schar.description, /モデルでは1バイト（8ビット）/);
    assert.match(schar.description, /CHAR_BIT/);
  }
  // C# の float／short は仕様で固定幅のため、その旨が明記されている。
  const cs = getDefinition("csharp");
  assert.match(cs.reference.find((r) => r.name === "float").description, /System\.Single/);
  assert.match(cs.reference.find((r) => r.name === "short").description, /System\.Int16/);
});
test("RA-33 C# cast entry states the bool/string restrictions", () => {
  const cast = getDefinition("csharp").reference.find((r) => r.name === "キャスト");
  assert.match(cast.description, /bool へキャストできるのは bool の値だけ/);
  assert.match(cast.caution, /数値から bool／string へのキャストはできません/);
  // 実挙動とも一致する（従来から停止していた）。
});
test("RA-34 unknown-constant returns carry the real values", () => {
  const cs = getDefinition("csharp");
  assert.match(cs.reference.find((r) => r.name === "long.MaxValue").returns, /9223372036854775807/);
  assert.match(cs.reference.find((r) => r.name === "long.MinValue").returns, /-9223372036854775808/);
  assert.match(cs.reference.find((r) => r.name === "ulong.MaxValue").returns, /18446744073709551615/);
});
test("RA-35 signed alias forms are mentioned in C/C++ entries", () => {
  for (const id of ["c", "cpp"]) {
    const d = getDefinition(id);
    assert.match(d.reference.find((r) => r.name === "int").caution, /signed、signed int も同じ型です（signed 単独でも int を表します）/);
    assert.match(d.reference.find((r) => r.name === "long").caution, /signed long int/);
    assert.match(d.reference.find((r) => r.name === "short").caution, /signed short int/);
  }
});
test("RA-37 ulong.MinValue non-support is disclosed", () => {
  const ulong = getDefinition("csharp").reference.find((r) => r.name === "ulong");
  assert.match(ulong.caution, /ulong\.MinValue は静的メンバーの表になく未対応として停止します（実値は 0）/);
});
test("RA-38 C# int and return cautions are C#-correct", () => {
  const cs = getDefinition("csharp");
  assert.match(cs.reference.find((r) => r.name === "int").caution, /常に32ビット固定/);
  assert.match(cs.reference.find((r) => r.name === "return").caution, /Main の終了にも使います/);
  for (const id of ["c", "cpp"]) {
    const d = getDefinition(id);
    assert.match(d.reference.find((r) => r.name === "return").caution, /main の終了にも使います/);
  }
});
test("RA-39 C/C++ return example has no duplicated return 0;", () => {
  for (const id of ["c", "cpp"]) {
    const ret = getDefinition(id).reference.find((r) => r.name === "return");
    assert.ok(!/return 0;\nreturn 0;/.test(ret.example), ret.example);
    assert.match(ret.example, /if \(n > 0\) \{ return 0; \}/);
  }
});
test("RA-D3-linked C# unsigned cautions no longer claim the signed-range limit", () => {
  const cs = getDefinition("csharp");
  for (const n of ["uint", "byte", "ushort"]) {
    const e = cs.reference.find((r) => r.name === n);
    assert.ok(!/モデル側の制限：代入時の変換では/.test(e.caution), n);
    assert.match(e.caution, /checked では OverflowException/);
  }
  assert.match(cs.reference.find((r) => r.name === "uint.MaxValue").caution, /変数へ代入しても、そのままの値が入ります/);
});

// =====================================================================
// 修正バッチ2 追随班：D3 の狭い残存表面（配列初期化子／単項マイナス
// 定数／キャスト位置の C 形式型名）。期待値は C# 仕様の暗黙の定数式
// 変換（§10.2.11、範囲外は CS0031）に基づく。停止の文面・カテゴリは
// 宣言リテラル本体の既存扱い（OverflowException）に揃える。
// =====================================================================

// ---------- D3 追随1: 配列初期化子の要素にも定数変換チェックが効く ----------
test("D3-followup array initializer elements get the constant conversion check", async () => {
  const msg = /整数への変換が範囲外です/;
  await expectError("csharp", `byte[] a = {300}; Console.WriteLine(a[0]);`, msg, "OverflowException");
  await expectError("csharp", `byte[] a = {200, 300}; Console.WriteLine(a[1]);`, msg, "OverflowException");
  await expectError("csharp", `byte[] a = new byte[]{300}; Console.WriteLine(a[0]);`, msg, "OverflowException");
  await expectError("csharp", `byte[] a = new byte[1]{300}; Console.WriteLine(a[0]);`, msg, "OverflowException");
  await expectError("csharp", `ushort[] a = {70000}; Console.WriteLine(a[0]);`, msg, "OverflowException");
  await expectError("csharp", `uint[] a = {-1}; Console.WriteLine(a[0]);`, msg, "OverflowException");
  // ulong の -1 は折り返し先が安全整数範囲外でも「未確認」でなく定数変換エラー。
  await expectError("csharp", `ulong[] a = {-1}; Console.WriteLine(a[0]);`, msg, "OverflowException");
  // 範囲内の要素は従来どおり格納される（符号なし4型とも）。
  assert.equal(output(await first("csharp", `byte[] a = {200, 255}; Console.WriteLine(a[0] + a[1]);`)), "455");
  assert.equal(output(await first("csharp", `ushort[] a = {40000, 65535}; Console.WriteLine(a[1]);`)), "65535");
  assert.equal(output(await first("csharp", `uint[] a = {3000000000}; Console.WriteLine(a[0]);`)), "3000000000");
  assert.equal(output(await first("csharp", `uint[] a = {4000000000u}; Console.WriteLine(a[0]);`)), "4000000000");
  assert.equal(output(await first("csharp", `ulong[] a = {10000000000ul}; Console.WriteLine(a[0]);`)), "10000000000");
  // 符号付き型の配列・他型の配列は影響を受けない。
  assert.equal(output(await first("csharp", `int[] a = {300, -1}; Console.WriteLine(a[0] + a[1]);`)), "299");
  assert.equal(output(await first("csharp", `double[] a = {1.5, 300.5}; Console.WriteLine(a[1]);`)), "300.5");
  // C／C++ の符号なし配列初期化子は規格どおり剰余変換のまま。
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ unsigned char a[2] = {200, 300}; printf("%d %d\\n", a[0], a[1]); return 0; }`)), "200 44\n");
});

// ---------- D3 追随2: 単項マイナス等を含む定数式にも定数変換チェックが効く ----------
test("D3-followup unary-minus and folded constant expressions get the constant conversion check", async () => {
  const msg = /整数への変換が範囲外です/;
  await expectError("csharp", `uint u = -1; Console.WriteLine(u);`, msg, "OverflowException");
  await expectError("csharp", `byte b = -1; Console.WriteLine(b);`, msg, "OverflowException");
  await expectError("csharp", `ushort s = -1; Console.WriteLine(s);`, msg, "OverflowException");
  await expectError("csharp", `ulong u = -1; Console.WriteLine(u);`, msg, "OverflowException");
  await expectError("csharp", `uint u = -2147483648; Console.WriteLine(u);`, msg, "OverflowException");
  await expectError("csharp", `byte b = 100 + 200; Console.WriteLine(b);`, msg, "OverflowException");
  await expectError("csharp", `byte b = -100 + 50; Console.WriteLine(b);`, msg, "OverflowException");
  // checked／unchecked で包んでも定数式のまま（unchecked 項目の開示方針）。
  await expectError("csharp", `byte b = checked(300); Console.WriteLine(b);`, msg, "OverflowException");
  await expectError("csharp", `uint u = unchecked(-1); Console.WriteLine(u);`, msg, "OverflowException");
  // 単純代入でも同じ変換規則（要素代入も含む）。
  await expectError("csharp", `uint u = 0; u = -1; Console.WriteLine(u);`, msg, "OverflowException");
  await expectError("csharp", `byte[] a = {200}; a[0] = -1; Console.WriteLine(a[0]);`, msg, "OverflowException");
  // 範囲内の定数式は従来どおり。
  assert.equal(output(await first("csharp", `byte b = 100 + 100; Console.WriteLine(b);`)), "200");
  assert.equal(output(await first("csharp", `byte b = 50 - 10; Console.WriteLine(b);`)), "40");
  assert.equal(output(await first("csharp", `byte b = checked(200); Console.WriteLine(b);`)), "200");
});
test("D3-followup runtime-determined expressions are not statically checked", async () => {
  // 変数を含む式は定数ではないため、従来どおり unchecked の折り返し。
  assert.equal(output(await first("csharp", `int x = 5; uint u = -x; Console.WriteLine(u);`)), "4294967291");
  assert.equal(output(await first("csharp", `int x = -1; uint u = x; Console.WriteLine(u);`)), "4294967295");
  assert.equal(output(await first("csharp", `byte[] a = {200}; int x = 300; a[0] = x; Console.WriteLine(a[0]);`)), "44");
  // 複合代入の変換元は対象変数の実行時の値を含むため定数扱いしない。
  assert.equal(output(await first("csharp", `byte b = 255; b += 1; Console.WriteLine(b);`)), "0");
  assert.equal(output(await first("csharp", `uint u = 0; u += -1; Console.WriteLine(u);`)), "4294967295");
  assert.equal(output(await first("csharp", `uint u = 0; u = u - 1; Console.WriteLine(u);`)), "4294967295");
});

// ---------- D14 追随: キャスト位置の C 形式型名も正名を提示して停止 ----------
test("D14-followup C-style type names in cast position name the C# type", async () => {
  await expectError("csharp", `Console.WriteLine((unsigned int)5);`, /C# に「unsigned int」という型名はありません（uint を使います）/, "未対応");
  await expectError("csharp", `Console.WriteLine((unsigned long)5);`, /C# に「unsigned long」という型名はありません（ulong を使います）/, "未対応");
  await expectError("csharp", `Console.WriteLine((unsigned short)3);`, /C# に「unsigned short」という型名はありません（ushort を使います）/, "未対応");
  await expectError("csharp", `Console.WriteLine((unsigned char)65);`, /C# に「unsigned char」という型名はありません（byte を使います）/, "未対応");
  await expectError("csharp", `Console.WriteLine((signed char)65);`, /C# に「signed char」という型名はありません（sbyte を使います）/, "未対応");
  await expectError("csharp", `Console.WriteLine((signed int)5);`, /C# に「signed int」という型名はありません（int を使います）/, "未対応");
  await expectError("csharp", `Console.WriteLine((unsigned)5);`, /C# に「unsigned」という型名はありません（uint を使います）/, "未対応");
  await expectError("csharp", `int y = (unsigned int)5; Console.WriteLine(y);`, /C# に「unsigned int」という型名はありません/, "未対応");
  // 正名のキャストと C／C++ の同形式は従来どおり。
  assert.equal(output(await first("csharp", `Console.WriteLine((uint)5);`)), "5");
  assert.equal(output(await first("c", `#include <stdio.h>\nint main(){ int x = (unsigned int)5; printf("%d\\n", x); return 0; }`)), "5\n");
});
