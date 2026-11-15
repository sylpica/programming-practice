// 修正バッチ4（共有コア／JS／R班）回帰テスト。
// 対象：R25-N8（JS／R 分：キーワードリテラルへの代入）／R25-N9（先行ゼロ
// BigInt）／R25-N10（JS 分：数値直後の .＋数字）／R25-N11（共有 script
// 字句の他方言の不完全リテラル）／R25-N14（R の添字代入の説明文）。
// 一次情報：ECMAScript 仕様と実 Node v24 の挙動（N8／N9／N10）、
// R Language Definition／?Extract（N8 R 分／N14）。
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
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const traces = (r) => r.paths.map((p) => p.trace.map((t) => t.text));
const js = (code) => run("javascript", code);
const rr = (code) => run("r", code);

// ---------- R25-N8（JS）：キーワードリテラルへの代入 ----------
for (const code of ["true = 5;", "false = 5;", "null = 5;", "this = 5;"]) {
  test(`R25-N8 JS: ${code} names the assignment target`, async () => {
    const r = await js(code);
    assert.ok(
      errors(r).some((e) => e.startsWith("SyntaxError:") && e.includes("代入先が不正")),
      JSON.stringify(errors(r)),
    );
  });
}
test("R25-N8 JS: keyword target is named before the undefined RHS name", async () => {
  for (const code of ["true = x;", "false = x;", "null = x;"]) {
    const r = await js(code);
    assert.ok(errors(r).some((e) => e.includes("代入先が不正")), code);
    assert.ok(!errors(r).join(" ").includes("未定義の名前"), code);
  }
});
test("R25-N8 JS: undefined assignment keeps the sloppy real-Node behaviour", async () => {
  const r = await js("undefined = 5; console.log(undefined);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["undefined"]]);
});
test("R25-N8 JS: valid assignment targets still work", async () => {
  const r = await js("let o = {}; o.x = 3; let a = [1, 2]; a[0] = 9; let v = 1; v = 5; console.log(o.x, a[0], v);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["3 9 5"]]);
});

// ---------- R25-N8（R）：予約リテラル・非変数への代入 ----------
test("R25-N8 R: NULL <- 5 is named as an invalid target (not silently accepted)", async () => {
  const r = await rr("NULL <- 5");
  assert.ok(errors(r).some((e) => e.includes("代入先が不正") && e.includes("NULL")), JSON.stringify(errors(r)));
});
test("R25-N8 R: keyword / literal / call targets are named before the RHS", async () => {
  for (const code of ["TRUE <- x", "FALSE <- x", "1 <- x", "c(1, 2) <- x"]) {
    const r = await rr(code);
    assert.ok(errors(r).some((e) => e.includes("代入先が不正")), code + " " + JSON.stringify(errors(r)));
    assert.ok(!errors(r).join(" ").includes("未定義の名前"), code);
  }
});
test("R25-N8 R: T / F remain assignable variables and normal assignment works", async () => {
  const r = await rr("T <- 5\nx <- 1\nprint(T + x)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["c(6)"]]);
});

// ---------- R25-N9：先行ゼロ BigInt ----------
for (const lit of ["0777n", "08n", "0123n", "00n", "0_777n"]) {
  test(`R25-N9: leading-zero BigInt ${lit} is named`, async () => {
    const r = await js(`console.log(${lit});`);
    assert.ok(
      errors(r).some((e) => e.includes("先行ゼロ") && e.includes(lit)),
      JSON.stringify(errors(r)),
    );
    assert.deepEqual(outputs(r), []);
  });
}
test("R25-N9: valid BigInt forms still evaluate", async () => {
  const r = await js("console.log(0n, 123n, 1_000n, 0x1n, 0b101n, 0o17n);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["0n 123n 1000n 1n 5n 15n"]]);
});

// ---------- R25-N10（JS）：数値直後の .＋数字 ----------
for (const lit of ["1.5.2", "1..2", "0b101.5", "1e5.5"]) {
  test(`R25-N10 JS: ${lit} is named as an invalid literal`, async () => {
    const r = await js(`console.log(${lit});`);
    assert.ok(
      errors(r).some((e) => e.includes("数値リテラルの書き方が不正") && e.includes(lit)),
      JSON.stringify(errors(r)),
    );
    assert.ok(!errors(r).join(" ").includes(") が必要です"), JSON.stringify(errors(r)));
  });
}
test("R25-N10 JS: member access after a number keeps its current handling", async () => {
  const r = await js("console.log(1.5.toString());");
  // R24-N15 で是正済みの表面：未対応として関数名を名指す扱いを壊さない。
  assert.ok(!errors(r).join(" ").includes("数値リテラルの書き方が不正"), JSON.stringify(errors(r)));
  assert.ok(!errors(r).join(" ").includes(") が必要です"), JSON.stringify(errors(r)));
});

// ---------- R25-N11：他方言の不完全リテラル ----------
for (const lit of ["1e", "1e+", "1.5e", "0x", "123abc", "0b2"]) {
  test(`R25-N11 R: print(${lit}) names the literal`, async () => {
    const r = await rr(`print(${lit})`);
    assert.ok(
      errors(r).some((e) => e.includes("数値リテラルの書き方が不正") && e.includes(lit)),
      JSON.stringify(errors(r)),
    );
    assert.ok(!errors(r).join(" ").includes(") が必要です"), JSON.stringify(errors(r)));
  });
}
test("R25-N11 R: assignment position also names the literal", async () => {
  const r = await rr("x <- 1e");
  assert.ok(errors(r).some((e) => e.includes("数値リテラルの書き方が不正") && e.includes("1e")), JSON.stringify(errors(r)));
  assert.ok(!errors(r).join(" ").includes("代入の区切り"), JSON.stringify(errors(r)));
});
test("R25-N11 R: valid literals still evaluate and dedicated messages survive", async () => {
  const ok = await rr("print(1e5)\nprint(0x1F)\nprint(1.5)\nprint(.5)");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), [["100000", "31", "1.5", "0.5"]]);
  const suffix = await rr("print(123L)");
  assert.ok(errors(suffix).some((e) => e.includes("integer型リテラル")), JSON.stringify(errors(suffix)));
});
test("R25-N11 AutoHotkey: incomplete literals are named", async () => {
  for (const lit of ["1e", "0x", "0b2", "123abc"]) {
    const r = await run("autohotkey", `x := ${lit}`);
    assert.ok(
      errors(r).some((e) => e.includes("数値リテラルの書き方が不正") && e.includes(lit)),
      lit + " " + JSON.stringify(errors(r)),
    );
    assert.ok(!errors(r).join(" ").includes("代入の区切り"), lit);
  }
});
test("R25-N11 Power Fx: incomplete literals are named, valid forms survive", async () => {
  const bad = await run("powerapps", "Notify(1e)");
  assert.ok(errors(bad).some((e) => e.includes("数値リテラルの書き方が不正") && e.includes("1e")), JSON.stringify(errors(bad)));
  const bad2 = await run("powerapps", "Set(x, 123abc)");
  assert.ok(errors(bad2).some((e) => e.includes("数値リテラルの書き方が不正")), JSON.stringify(errors(bad2)));
  const ok = await run("powerapps", "Set(x, 1e5)");
  assert.deepEqual(errors(ok), []);
  const radix = await run("powerapps", "Set(x, 0x1F)");
  assert.ok(errors(radix).some((e) => e.includes("Power Fx に基数リテラルはありません")), JSON.stringify(errors(radix)));
});
test("R25-N11 C family: incomplete literals are named via the shared tokenizer", async () => {
  // C系の字句は c-family 側の変換を経て共有トークナイザ（script.js）に
  // 渡る。不完全リテラルは変換を素通りするため、共有側の検証で名指す。
  for (const [id, wrap] of [
    ["c", (s) => `int main(void) { ${s} return 0; }`],
    ["cpp", (s) => `int main(void) { ${s} return 0; }`],
    ["csharp", (s) => `class P { static void Main() { ${s} } }`],
  ]) {
    for (const lit of ["1e", "0x", "123abc", "1.5e"]) {
      const r = await run(id, wrap(`int x = ${lit};`));
      assert.ok(
        errors(r).some((e) => e.includes("数値リテラルの書き方が不正") && e.includes(lit)),
        `${id} ${lit} ` + JSON.stringify(errors(r)),
      );
      assert.ok(!errors(r).join(" ").includes("; が必要です"), `${id} ${lit}`);
    }
    const dedicated = await run(id, wrap("int x = 0b2;"));
    assert.ok(errors(dedicated).some((e) => e.includes("2進数リテラル 0b2")), id + " " + JSON.stringify(errors(dedicated)));
  }
});

// ---------- R25-N14：R の添字代入の説明 ----------
test("R25-N14: empty-subscript assignment names the target and all elements", async () => {
  const r = await rr("x <- c(1, 2, 3)\nx[] <- 0\nprint(x)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["c(0, 0, 0)"]]);
  assert.ok(traces(r).flat().some((t) => t.includes("x[]（全要素） に 0 を代入します")), JSON.stringify(traces(r)));
});
test("R25-N14: data.frame empty-subscript assignments name their targets", async () => {
  const all = await rr("df <- data.frame(a = c(1, 2), b = c(3, 4))\ndf[] <- 0");
  assert.ok(traces(all).flat().some((t) => t.includes("df[]（全要素） に 0 を代入します")), JSON.stringify(traces(all)));
  const col = await rr("df <- data.frame(a = c(1, 2), b = c(3, 4))\ndf$a[] <- 0");
  assert.ok(traces(col).flat().some((t) => t.includes("df.a[]（全要素） に 0 を代入します")), JSON.stringify(traces(col)));
});
test("R25-N14: ordinary subscript assignment names the element", async () => {
  const r = await rr("x <- c(1, 2, 3)\nx[1] <- 9\nprint(x)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["c(9, 2, 3)"]]);
  assert.ok(traces(r).flat().some((t) => t.includes("x[1] に 9 を代入します")), JSON.stringify(traces(r)));
  assert.ok(!traces(r).flat().some((t) => t.startsWith("対象 に")), JSON.stringify(traces(r)));
});
test("R25-N14: member assignment narration is unchanged", async () => {
  const r = await rr("df <- data.frame(a = c(1, 2))\ndf$a <- c(9, 9)");
  assert.ok(traces(r).flat().some((t) => t.includes("df.a に c(9, 9) を代入します")), JSON.stringify(traces(r)));
});
