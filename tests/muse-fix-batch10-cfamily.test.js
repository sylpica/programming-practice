// バッチ10（C家族班）修正の回帰テスト。
// 対象：R31-N7（C# 文字列への foreach）／R31-N12（モデル intBits 欠落時の
// 虚偽原因）／R31-N8 の C家族分（式の途中終了での内部トークン <eof> 露出）。
// 一次情報：Microsoft Learn の iteration statements（string は
// IEnumerable<char>）、当VM の dotnet 8.0.428 実走（文字列 foreach の
// 出力・空文字列0回・break／continue・char 比較・UTF-16 コード単位の
// 分割 97／55357／56832／98 を照合済み）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code, model) => {
  const d = getDefinition(id);
  return d.simulate(code, model === undefined ? structuredClone(d.model.defaults) : model);
};
const runModel = async (id, model) => {
  const d = getDefinition(id);
  return d.simulate(d.templates[0].code, model);
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const allTexts = (r) =>
  [...errors(r), ...(r.paths || []).flatMap((p) => (p.trace || []).map((t) => t.text))].join("\n");
const outputs = (r) => (r.paths || []).map((p) => p.outputs.map((o) => o.text));
const cs = (body) => `using System;\nclass Program {\n static void Main() {\n${body}\n }\n}`;

/* ---------------- R31-N7: C# 文字列への foreach ---------------- */
test("R31-N7: foreach over string literal and variable (char/var) iterates chars", async () => {
  const cases = [
    [`foreach (char c in "ab") { Console.WriteLine(c); }`, [["a", "b"]]],
    [`foreach (var c in "xy") { Console.WriteLine(c); }`, [["x", "y"]]],
    [`string s = "ab"; foreach (char c in s) { Console.WriteLine(c); }`, [["a", "b"]]],
    [`string s = "ab"; foreach (var c in s) { Console.WriteLine(c); }`, [["a", "b"]]],
    // 式で組み立てた対象（連結・補間・+= で構築した変数）。
    [`foreach (char c in "a" + "b") { Console.WriteLine(c); }`, [["a", "b"]]],
    [`string s = "a"; s += "b"; foreach (char c in s) { Console.WriteLine(c); }`, [["a", "b"]]],
    [`string s = $"x{"yz"}"; foreach (char c in s) { Console.WriteLine(c); }`, [["x", "y", "z"]]],
    // 空文字列は0回（dotnet 実走どおり後続文が実行される）。
    [`foreach (char c in "") { Console.WriteLine(c); } Console.WriteLine("done");`, [["done"]]],
    // 入れ子ループ。
    [`foreach (char a in "xy") { foreach (char b in "12") { Console.WriteLine(a); Console.WriteLine(b); } }`,
      [["x", "1", "x", "2", "y", "1", "y", "2"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("csharp", cs(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
});

test("R31-N7: string foreach supports break/continue, char comparison and accumulation", async () => {
  const cases = [
    [`foreach (char c in "abc") { if (c == 'b') { break; } Console.WriteLine(c); }`, [["a"]]],
    [`foreach (char c in "abc") { if (c == 'b') { continue; } Console.WriteLine(c); }`, [["a", "c"]]],
    [`foreach (char c in "abc") { if (c < 'c') { Console.WriteLine(c); } }`, [["a", "b"]]],
    [`string t = ""; foreach (char c in "ab") { t += c; } Console.WriteLine(t);`, [["ab"]]],
    // char 変数への代入と後続利用。
    [`char last = '?'; foreach (char c in "ab") { last = c; } Console.WriteLine(last);`, [["b"]]],
    // UTF-16 コード単位で分割する（dotnet 実走：97, 55357, 56832, 98）。
    [`foreach (char c in "a😀b") { Console.WriteLine((int)c); }`, [["97", "55357", "56832", "98"]]],
  ];
  for (const [body, expected] of cases) {
    const r = await run("csharp", cs(body));
    assert.deepEqual(errors(r), [], `${body} -> ${JSON.stringify(errors(r))}`);
    assert.deepEqual(outputs(r), expected, body);
  }
});

test("R31-N7: array foreach, undefined name, numeric target and null/unknown strings are unchanged", async () => {
  const arr = await run("csharp", cs(`int[] a = {1,2}; foreach (int v in a) { Console.WriteLine(v); }`));
  assert.deepEqual(errors(arr), []);
  assert.deepEqual(outputs(arr), [["1", "2"]]);
  const chars = await run("csharp", cs(`char[] a = {'x','y'}; foreach (char c in a) { if (c == 'y') { Console.WriteLine("hit"); } }`));
  assert.deepEqual(errors(chars), []);
  assert.deepEqual(outputs(chars), [["hit"]]);
  const undef = await run("csharp", cs(`foreach (char c in nosuch) { Console.WriteLine(c); }`));
  assert.ok(errors(undef).some((e) => e.includes("未定義の名前") && e.includes("nosuch")), JSON.stringify(errors(undef)));
  const numeric = await run("csharp", cs(`foreach (char c in 42) { Console.WriteLine(c); }`));
  assert.ok(errors(numeric).some((e) => e.includes("未確定または配列でない繰り返し対象")), JSON.stringify(errors(numeric)));
  const nullStr = await run("csharp", cs(`string s = null; foreach (char c in s) { Console.WriteLine(c); }`));
  assert.ok(errors(nullStr).some((e) => e.includes("null参照")), JSON.stringify(errors(nullStr)));
  const unknownStr = await run("csharp", cs(`string s = Console.ReadLine(); foreach (char c in s) { Console.WriteLine(c); }`));
  assert.ok(errors(unknownStr).some((e) => e.includes("未確定または配列でない繰り返し対象")), JSON.stringify(errors(unknownStr)));
});

/* ---------------- R31-N12: モデル intBits の形状検証 ---------------- */
test("R31-N12: missing/invalid model shapes name the model, valid unsupported width keeps wording", async () => {
  for (const id of ["c", "cpp", "csharp"]) {
    for (const model of [null, 123, "x", [], {}]) {
      const r = await runModel(id, model);
      assert.ok(
        errors(r).some((e) => e.includes("モデルに intBits が必要です")),
        `${id} ${JSON.stringify(model)} -> ${JSON.stringify(errors(r))}`,
      );
    }
    const undef = await runModel(id, undefined);
    assert.ok(errors(undef).some((e) => e.includes("モデルに intBits が必要です")), `${id} undefined`);
    const wide = await runModel(id, { intBits: 64 });
    assert.ok(
      errors(wide).some((e) => e.includes("このモデルのintは32ビットのみ対応です")),
      `${id} intBits:64 -> ${JSON.stringify(errors(wide))}`,
    );
    const typed = await runModel(id, { intBits: "32" });
    assert.ok(
      errors(typed).some((e) => e.includes("モデルの intBits は数値で指定してください")),
      `${id} intBits:"32" -> ${JSON.stringify(errors(typed))}`,
    );
    // 正当なモデルは従来どおり実行できる。
    const ok = await runModel(id, structuredClone(getDefinition(id).model.defaults));
    assert.deepEqual(errors(ok), [], `${id} defaults`);
  }
});

/* ---------------- R31-N8（C家族分）: <eof> 露出 ---------------- */
test("R31-N8: truncated expressions never expose <eof> in C/C++/C#", async () => {
  const cases = [
    ["c", `int main(){ int x = `],
    ["c", `int main(){ int x = 1 +`],
    ["c", `int x =`],
    ["c", `int main(){ foo(`],
    ["c", `int main(){ if (`],
    ["c", `int main(){ int a[3] = {1,`],
    ["cpp", `int main(){ int x = `],
    ["cpp", `#include <iostream>\nint main(){ cout << `],
    ["csharp", `int x = `],
    ["csharp", `int x = 1 +`],
  ];
  for (const [id, code] of cases) {
    const r = await run(id, code);
    assert.ok(errors(r).length > 0, `${id} ${code} should stop`);
    assert.ok(!allTexts(r).includes("<eof>"), `${id} ${code} -> ${allTexts(r)}`);
  }
  // 途中終了は学習者の言葉で示される。
  const r = await run("c", `int main(){ int x = `);
  assert.ok(
    errors(r).some((e) => e.includes("式を解釈できません（式が途中で終わっています）")),
    JSON.stringify(errors(r)),
  );
});

test("R31-N8 sweep: malformed-input battery exposes no internal tokens in C family", async () => {
  const bodies = [
    `int x = }`, `int x = ;`, `foo(1,`, `if (1) {`, `while (`, `for (int i = 0;`,
    `return`, `}`, `)`, `]`, `int Foo() {`, `foreach (char c in`, `int x = a[`, `int x = 1 ? 2 :`,
  ];
  const wraps = {
    c: (b) => `int main(){ ${b} }`,
    cpp: (b) => `#include <iostream>\nint main(){ ${b} }`,
    csharp: (b) => cs(b),
  };
  for (const [id, wrap] of Object.entries(wraps))
    for (const b of bodies) {
      const r = await run(id, wrap(b));
      assert.ok(!allTexts(r).includes("<eof>"), `${id} ${b} -> ${allTexts(r)}`);
      assert.ok(!/TypeError|Cannot read|Cannot convert/.test(allTexts(r)), `${id} ${b} -> ${allTexts(r)}`);
    }
});
