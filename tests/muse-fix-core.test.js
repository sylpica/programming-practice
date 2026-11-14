import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { parseExpression, simulateScript } from "../js/core/script.js";
import { formatValue, refsInTrace } from "../js/core/contract.js";

const run = async (id, code) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(d.model.defaults));
};
const first = async (id, code) => {
  const r = await run(id, code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r.paths?.map((p) => p.error)));
  return r.paths[0];
};
// RG-39: 入れ子配列リテラルが隣接位置でも壊れない（JS）
test("RG-39 JS nested array literals at adjacent positions", async () => {
  const p = await first(
    "javascript",
    "let a = [[1, 2], [3, 4]];\nlet b = [1, [2, 3]];\na[0][1] = 9;\nconsole.log(a[0][1] + b[1][0]);",
  );
  assert.equal(p.vars.a[0][1], 9);
  assert.deepEqual(
    (await first("javascript", "console.log([[1, 2], [3, 4]].length);")).outputs.map((o) => o.text),
    ["2"],
  );
});

// RG-43: 他方言の代入演算子が漏れない
test("RG-43 JS x<-1 is a comparison, not assignment", async () => {
  const p = await first("javascript", "let x = 5;\nx<-1;\nconsole.log(x);");
  assert.equal(p.vars.x, 5);
  assert.deepEqual(p.outputs.map((o) => o.text), ["5"]);
});
test("RG-43 JS := stops honestly", async () => {
  const r = await run("javascript", "let x = 1;\nx := 5;");
  assert.ok(r.error, "must stop");
});
test("RG-43 R block comment is not silently removed", async () => {
  const r = await run("r", "x <- 4 /* 2 */ + 1\nprint(x)");
  assert.ok(r.error || r.paths?.[0]?.error, "must not silently compute");
});
test("RG-43 C does not execute Loop", async () => {
  const r = await run(
    "c",
    "#include <stdio.h>\nint main() {\n    int x = 0;\n    Loop 2 { x++; }\n    printf(\"%d\", x);\n    return 0;\n}",
  );
  assert.ok(r.error || r.paths?.[0]?.error, "must stop");
});

// RG-01: else-if 連鎖が深さを消費せず、真の入れ子超過は打ち切りとして記録される
test("RG-01 JS 65-condition else-if chain completes", async () => {
  const conds = Array.from({ length: 65 }, (_, i) =>
    i === 0
      ? `if (x === ${i}) { x = ${100 + i}; }`
      : `else if (x === ${i}) { x = ${100 + i}; }`,
  ).join("\n");
  const p = await first("javascript", `let x = 64;\n${conds}\nconsole.log(x);`);
  assert.equal(p.vars.x, 164);
});
test("RG-01 genuinely deep nesting records truncation", async () => {
  const nest =
    "let y = 0;\n" +
    "if (y === 0) {\n".repeat(70) +
    "y = 1;\n" +
    "}\n".repeat(70) +
    "console.log(y);";
  const r = await run("javascript", nest);
  assert.equal(r.truncated, true);
  assert.ok((r.reasons || []).some((x) => x.includes("深さ")));
});

// RG-21: R のコロン演算子の優先順位
test("RG-21 R colon binds tighter than * and +/-", async () => {
  const p = await first("r", "print(2*1:15)\nprint(1:5-1)\nprint(1:5+1)");
  assert.deepEqual(p.outputs.map((o) => o.text), [
    "c(2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30)",
    "c(0, 1, 2, 3, 4)",
    "c(2, 3, 4, 5, 6)",
  ]);
});

// RG-49: R の %any%・!・| と &&、C の & ^ | &&
test("RG-49 R special operators above * /", async () => {
  const p = await first("r", "print(2 * 5 %% 3)\nprint(2 * 5 %/% 3)");
  assert.deepEqual(p.outputs.map((o) => o.text), ["c(4)", "c(2)"]);
});
test("RG-49 R ! below comparisons, | below &&", async () => {
  const p = await first(
    "r",
    "print(!1 == 2)\nprint(!1 < 2)\nprint(TRUE | TRUE && FALSE)",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["c(TRUE)", "c(FALSE)", "c(TRUE)"]);
});
test("RG-49 C bitwise precedence matches C standard", async () => {
  const p = await first(
    "c",
    "#include <stdio.h>\nint main() {\n    printf(\"%d\\n\", 6 & 3 ^ 5);\n    printf(\"%d\\n\", 1 ^ 3 & 2);\n    printf(\"%d\\n\", 0 && 1 | 1);\n    return 0;\n}",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["7\n", "3\n", "0\n"]);
});

// RG-06: 条件演算子・null 合体・do-while を評価し、switch は名指しで停止する
test("RG-06 JS ternary and nullish coalescing evaluate", async () => {
  const p = await first(
    "javascript",
    "let a = 1 < 2 ? 10 : 20;\nlet b = null ?? 42;\nlet c = 0 ?? 9;\nconsole.log(a + b + c);",
  );
  assert.equal(p.vars.a, 10);
  assert.equal(p.vars.b, 42);
  assert.equal(p.vars.c, 0);
  assert.deepEqual(p.outputs.map((o) => o.text), ["52"]);
});
test("RG-06 JS do-while runs body before testing", async () => {
  const p = await first(
    "javascript",
    "let i = 10;\ndo { i++; } while (i < 3);\nconsole.log(i);",
  );
  assert.equal(p.vars.i, 11);
});
test("RG-06 JS switch stops with its name", async () => {
  const r = await run("javascript", "let x = 1;\nswitch (x) { case 1: break; }");
  assert.ok(r.error?.message.includes("switch"), JSON.stringify(r.error));
});
test("RG-06 C ternary evaluates", async () => {
  const p = await first(
    "c",
    "#include <stdio.h>\nint main() {\n    int a = 5 > 3 ? 100 : 200;\n    printf(\"%d\\n\", a);\n    return 0;\n}",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["100\n"]);
});

// RG-07: レコードリテラル初期化・改行継続・R の if 式・名指し停止
test("RG-07 JS declaration with record literal", async () => {
  const p = await first(
    "javascript",
    "let o = {a: 1, b: 2};\nconsole.log(o.a + o.b);",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["3"]);
});
test("RG-07 JS multiline expression inside brackets", async () => {
  const p = await first(
    "javascript",
    "let a = [\n1,\n2\n];\nconsole.log(a.length);",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["2"]);
});
test("RG-07 JS arrow function and optional chain stop with names", async () => {
  const r1 = await run("javascript", "let f = (x) => x * 2;");
  assert.ok(r1.error?.message.includes("アロー関数"), JSON.stringify(r1.error));
  const r2 = await run("javascript", "let o = {a: 1};\nlet v = o?.a;");
  assert.ok(r2.error?.message.includes("オプショナルチェーン"), JSON.stringify(r2.error));
});
// RG-07 追加表面（R21-N10 同根）: 行頭の二項演算子も式の継続として扱う
// （JS／C系の実物どおり）。演算子で始まらない改行は従来どおり文の区切りで、
// R は改行が文の区切りなので対象外。
test("RG-07 leading binary operator continues the expression (JS/C/C++/C#)", async () => {
  const js = await first("javascript", "let x = 1\n  + 2;\nconsole.log(x);");
  assert.deepEqual(js.outputs.map((o) => o.text), ["3"]);
  const jsArg = await first("javascript", "console.log(1\n  + 2);");
  assert.deepEqual(jsArg.outputs.map((o) => o.text), ["3"]);
  const jsChain = await first("javascript", "let y = 10\n  - 4\n  * 2;\nconsole.log(y);");
  assert.deepEqual(jsChain.outputs.map((o) => o.text), ["2"]);
  const c = await first("c", "#include <stdio.h>\nint main() { int x = 1\n  + 2; printf(\"%d\\n\", x); return 0; }");
  assert.deepEqual(c.outputs.map((o) => o.text), ["3\n"]);
  const cpp = await first("cpp", "#include <iostream>\nint main() { int x = 1\n  + 2; std::cout << x; return 0; }");
  assert.deepEqual(cpp.outputs.map((o) => o.text), ["3"]);
  const cs = await first("csharp", "int x = 1\n  + 2;\nConsole.WriteLine(x);");
  assert.deepEqual(cs.outputs.map((o) => o.text), ["3"]);
});
test("RG-07 newline without a leading operator still ends the statement", async () => {
  const p = await first("javascript", "let a = 1\nlet b = 2\nconsole.log(a + b);");
  assert.deepEqual(p.outputs.map((o) => o.text), ["3"]);
  const r = await first("r", "x <- 1\ny <- 2\nprint(x + y)");
  assert.deepEqual(r.outputs.map((o) => o.text), ["c(3)"]);
});
test("RG-07 R line continuation and if expression", async () => {
  const p = await first(
    "r",
    "x <- 1 +\n2\nprint(x)\ny <- if (2 > 1) 10 else 20\nprint(y)\nz <- if (FALSE) 1\nprint(z)",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["c(3)", "10", "NULL"]);
  assert.equal(p.vars.y, 10);
  assert.equal(p.vars.z, null);
});

// RG-11: 基数リテラル（受理は言語の実在形式のみ、不正形式は名指しで弾く）
test("RG-11 R hex literal value and 0b rejection", async () => {
  const p = await first("r", "x <- 0x1F\nprint(x)");
  assert.equal(p.vars.x, 31);
  const r = await run("r", "z <- 0b101");
  assert.ok(r.error?.message.includes("0b"), JSON.stringify(r.error));
});
test("RG-11 C octal literal and invalid octal rejection", async () => {
  const p = await first(
    "c",
    "#include <stdio.h>\nint main() {\n    int o = 010;\n    printf(\"%d\\n\", o);\n    return 0;\n}",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["8\n"]);
  const r = await run(
    "c",
    "#include <stdio.h>\nint main() {\n    int bad = 08;\n    return 0;\n}",
  );
  assert.ok(r.error?.message.includes("8進整数リテラル"), JSON.stringify(r.error));
});
test("RG-11 JS radix literal values at parser level", () => {
  assert.equal(parseExpression("0x1F", "js").value, 31);
  assert.equal(parseExpression("0b101", "js").value, 5);
  assert.equal(parseExpression("0o17", "js").value, 15);
});

// RG-50: Power Fx の % 後置・And/Or の大文字綴り
test("RG-50 Power Fx percent postfix and capitalized And/Or", async () => {
  const p = await first(
    "powerapps",
    "Set(a, 50% + 1);\nSet(b, true And false);\nSet(c, true Or false);",
  );
  assert.equal(p.vars.a, 1.5);
  assert.equal(p.vars.b, false);
  assert.equal(p.vars.c, true);
});

// RG-51: JS シフト演算子と BigInt
test("RG-51 JS shift operators evaluate", async () => {
  const p = await first(
    "javascript",
    "console.log(1 << 3);\nconsole.log(16 >> 2);\nconsole.log(-8 >>> 28);",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["8", "4", "15"]);
});
test("RG-51 JS BigInt literal arithmetic and display", async () => {
  const p = await first("javascript", "let b = 10n * 3n;\nconsole.log(b);");
  assert.equal(p.vars.b, 30n);
  assert.equal(formatValue(30n), "30n");
});

// RG-04: 種類側 semantics.format がステップ表示に使われる
test("RG-04 semantics.format hook drives step notes", () => {
  const r = simulateScript("let b = true;", { variables: {} }, {
    dialect: "js",
    format: (v) => (v === true ? "真" : String(v)),
  });
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(
    r.paths[0].trace.some((t) => t.text.includes("真")),
    JSON.stringify(r.paths[0].trace),
  );
});

// RG-59: データ名・プロパティ名は trace refs に混入しない
test("RG-59 data and property names stay out of trace refs", async () => {
  const rd = getDefinition("r");
  for (const id of ["r-frame", "r-frame-select"]) {
    const tpl = rd.templates.find((t) => t.id === id);
    const r = await rd.simulate(tpl.code, structuredClone(rd.model.defaults));
    for (const p of r.paths || []) {
      const refs = refsInTrace(p);
      assert.ok(!refs.includes("score") && !refs.includes("bonus"), id + ": " + refs.join(","));
    }
  }
  const jd = getDefinition("javascript");
  const tpl = jd.templates.find((t) => t.id === "js-array");
  const r = await jd.simulate(tpl.code, structuredClone(jd.model.defaults));
  for (const p of r.paths || [])
    assert.ok(!refsInTrace(p).includes("length"), refsInTrace(p).join(","));
});

// RG-61: 不可視文字は名称とコードポイントで可視化して原因表示する
test("RG-61 invisible characters are named in the stop reason", async () => {
  const r = await run("javascript", "let x = 1;\n\u200bconsole.log(x);");
  assert.ok(r.error?.message.includes("ゼロ幅スペース（U+200B）"), JSON.stringify(r.error));
  const r2 = await run("autohotkey", "x := 1\nMsgBox x\u200b");
  const e2 = r2.error || r2.paths?.[0]?.error;
  assert.ok(e2?.message.includes("ゼロ幅スペース（U+200B）"), JSON.stringify(e2));
});

// RG-62: R／C／C++ は非 ASCII の空白的文字を無言で受理しない（JS は仕様どおり受理）
test("RG-62 R and C reject non-ASCII whitespace by name; JS accepts it", async () => {
  const rr = await run("r", "x\u3000<-\u300040 + 2\nprint(x)");
  assert.ok(rr.error?.message.includes("全角スペース（U+3000）"), JSON.stringify(rr.error));
  const rc = await run("c", "#include <stdio.h>\nint main() {\n    printf(\"%d\",\u00a042);\n    return 0;\n}");
  const ec = rc.error || rc.paths?.[0]?.error;
  assert.ok(ec?.message.includes("ノーブレークスペース（U+00A0）"), JSON.stringify(ec));
  const pj = await first("javascript", "let x\u3000=\u300040 + 2;\nconsole.log(x);");
  assert.equal(pj.vars.x, 42);
});

// RG-59（統合）: UI.Vision の executeScript_Sandbox 式に出る Number が語彙に存在する
test("RG-59 UI.Vision Number resolves against the type vocabulary", async () => {
  const { getDefinition } = await import("../js/types/registry.js");
  const def = await getDefinition("uivision");
  const names = new Set(def.reference.map((r) => r.name));
  assert.ok(names.has("Number"));
  for (const tpl of def.templates) {
    const r = await def.simulate(tpl.code, structuredClone(def.model.defaults));
    for (const p of r.paths || [])
      for (const step of p.trace || [])
        for (const ref of step.refs || [])
          assert.ok(names.has(ref), `${tpl.id}: ${ref}`);
  }
});

// RG-04 追加表面（R21-N5／N7）: JS の console.log 表記を実物に合わせる。
// スカラーの -0 は "-0"、コレクション内の undefined は「未設定」の
// 文字列ではなく undefined、-0 も -0。本物の文字列「未設定」は化けない。
test("RG-04 JS console.log renders -0 and undefined the JavaScript way", async () => {
  const texts = async (code) =>
    (await first("javascript", code)).outputs.map((o) => o.text);
  assert.deepEqual(await texts("console.log(-0);"), ["-0"]);
  assert.deepEqual(await texts("console.log(0);"), ["0"]);
  assert.deepEqual(await texts("console.log([undefined]);"), ["[\n  undefined\n]"]);
  assert.deepEqual(await texts("console.log([1, undefined, 3]);"), ["[\n  1,\n  undefined,\n  3\n]"]);
  assert.deepEqual(await texts("console.log([-0]);"), ["[\n  -0\n]"]);
  assert.deepEqual(await texts("console.log({a: undefined});"), ["{\n  \"a\": undefined\n}"]);
  assert.deepEqual(await texts("console.log([\"未設定\"]);"), ["[\n  \"未設定\"\n]"]);
  assert.deepEqual(await texts("console.log([1, 2]);"), ["[\n  1,\n  2\n]"]);
});

// RG-11 追加表面（R21-N12）: JS の数値区切り（1_000 等）を実物どおり受理し、
// 不正な配置はリテラルを名指しして弾く（位置依存の虚偽の原因表示にしない）。
test("RG-11 JS numeric separators are accepted and validated", async () => {
  const texts = async (code) =>
    (await first("javascript", code)).outputs.map((o) => o.text);
  assert.deepEqual(await texts("let x = 1_000;\nconsole.log(x);"), ["1000"]);
  assert.deepEqual(await texts("console.log(1_000 + 1);"), ["1001"]);
  assert.deepEqual(await texts("console.log(0xFF_FF);"), ["65535"]);
  assert.deepEqual(await texts("console.log(0b1010_0101);"), ["165"]);
  assert.deepEqual(await texts("console.log(1_000.5);"), ["1000.5"]);
  assert.deepEqual(await texts("console.log(1_000n);"), ["1000n"]);
  for (const bad of ["let y = 1__000;", "let y = 1_;", "let y = 1_.5;"]) {
    const r = await run("javascript", bad);
    assert.ok(r.error && /区切り（_）の位置が不正/.test(r.error.message), JSON.stringify(r.error));
  }
});
