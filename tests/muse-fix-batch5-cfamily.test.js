// バッチ5（コア班・C家族）修正の回帰テスト。
// 対象：R26-N19（C++：直接リスト初期化 `型 名{値};` を実装。narrowing は
// RG-192 の規則を直接形にも適用）／R26-N20（C：スカラー波括弧初期化
// `型 名 = {値};` を受理し C の通常変換を適用。C++ の narrowing は不変）。
// 一次情報：当VM の gcc／g++ 13.3 実走（C11 / C++17）。
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
const cppMain = (body) => `#include <iostream>\nint main(){ ${body} return 0; }`;
const cMain = (body) => `#include <stdio.h>\nint main(){ ${body} return 0; }`;

// ---------- R26-N19：C++ 直接リスト初期化 ----------
test("R26-N19: C++ direct list initialization for scalars and std::string", async () => {
  const r = await run("cpp", cppMain('int x{5}; double d{1.5}; char c{97}; std::cout << x << " " << d << " " << c;'));
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["5 1.5 a"]]);
  const s = await run("cpp", '#include <iostream>\n#include <string>\nint main(){ std::string s{"hi"}; std::cout << s; return 0; }');
  assert.deepEqual(errors(s), []);
  assert.deepEqual(outputs(s), [["hi"]]);
});
test("R26-N19: C++ direct list initialization for arrays and empty braces", async () => {
  const r = await run("cpp", cppMain("int a[]{1,2,3}; int e{}; std::cout << a[1] << e;"));
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["20"]]);
});
test("R26-N19: C++ direct form applies the RG-192 narrowing rules", async () => {
  const r1 = await run("cpp", cppMain("unsigned int u{-1}; std::cout << u;"));
  assert.ok(errors(r1).some((e) => e.includes("narrowing") && e.includes("-1") && e.includes("unsigned int")), JSON.stringify(errors(r1)));
  const r2 = await run("cpp", cppMain("unsigned char c{300}; std::cout << (int)c;"));
  assert.ok(errors(r2).some((e) => e.includes("narrowing")), JSON.stringify(errors(r2)));
  const r3 = await run("cpp", cppMain("int x{1.5}; std::cout << x;"));
  assert.ok(errors(r3).some((e) => e.includes("narrowing")), JSON.stringify(errors(r3)));
});
test("R26-N19: C direct brace initialization is rejected with the true cause named", async () => {
  const r = await run("c", cMain('int x{5}; printf("%d", x);'));
  assert.ok(errors(r).some((e) => e.startsWith("SyntaxError:") && e.includes("Cでは波括弧による直接初期化はできません")), JSON.stringify(errors(r)));
  assert.ok(!errors(r).join(" ").includes("; が必要です"), JSON.stringify(errors(r)));
});

// ---------- R26-N20：C スカラー波括弧初期化 ----------
test("R26-N20: C scalar brace initialization takes the single element", async () => {
  const r = await run("c", cMain('int x = {5}; printf("%d", x);'));
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["5"]]);
});
test("R26-N20: C applies usual conversions (no narrowing error in C)", async () => {
  const u = await run("c", cMain('unsigned int u = {-1}; printf("%u", u);'));
  assert.deepEqual(errors(u), []);
  assert.deepEqual(outputs(u), [["4294967295"]]);
  const uc = await run("c", cMain('unsigned char c = {300}; printf("%d", c);'));
  assert.deepEqual(errors(uc), []);
  assert.deepEqual(outputs(uc), [["44"]]);
  const t = await run("c", cMain('double d = {1.9}; int x = {d}; printf("%d", x);'));
  assert.deepEqual(errors(t), []);
  assert.deepEqual(outputs(t), [["1"]]);
});
test("R26-N20: C excess elements use the first (gcc behaviour); empty braces give 0", async () => {
  const r = await run("c", cMain('int x = {1, 2}; int e = {}; printf("%d %d", x, e);'));
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [["1 0"]]);
});
test("R26-N20: C array brace form and C++ copy form are unchanged", async () => {
  const a = await run("c", cMain('int a[] = {1,2,3}; printf("%d", a[1]);'));
  assert.deepEqual(errors(a), []);
  assert.deepEqual(outputs(a), [["2"]]);
  const cp = await run("cpp", cppMain("int x = {5}; std::cout << x;"));
  assert.deepEqual(errors(cp), []);
  assert.deepEqual(outputs(cp), [["5"]]);
  const cpn = await run("cpp", cppMain("unsigned int u = {-1}; std::cout << u;"));
  assert.ok(errors(cpn).some((e) => e.includes("narrowing")), JSON.stringify(errors(cpn)));
});
