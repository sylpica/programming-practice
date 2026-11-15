import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { simulate } from "../js/engine.js";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ2（VBA班）: NX-N9 / NX-N18 / D1-4 / T-1 の回帰テスト。
const sim = (s, m = {}) => simulate(s, m);
const path = (s, m) => {
  const r = sim(s, m);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const termNote = (p) => p.trace.find((t) => /回実行してループを終了します/.test(t.text));

// ---- NX-N9: 配列要素への代入説明は、変換前の値ではなく格納後の値を引用する ----
test("NX-N9 array assignment note quotes the bank-rounded stored value", () => {
  const p = path("Dim a(1) As Integer\na(0) = 2.5\na(1) = 3.5\nDebug.Print a(0)\nDebug.Print a(1)");
  assert.ok(p.trace.some((t) => t.text === "a(0) ← 2"), JSON.stringify(p.trace.map((t) => t.text)));
  assert.ok(p.trace.some((t) => t.text === "a(1) ← 4"));
  assert.deepEqual(p.vars.a.values, [2, 4]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["2", "4"]);
});

test("NX-N9 array assignment note quotes -1 for True stored in an Integer array", () => {
  const p = path("Dim a(1) As Integer\na(0) = True");
  assert.ok(p.trace.some((t) => t.text === "a(0) ← -1"), JSON.stringify(p.trace.map((t) => t.text)));
  assert.deepEqual(p.vars.a.values, [-1, 0]);
});

test("NX-N9 array assignment note quotes the cell value for a Range right-hand side", () => {
  const p = path('Dim a(1) As Variant\na(0) = Range("B2")', { B2: 85 });
  assert.ok(p.trace.some((t) => t.text === "a(0) ← 85"), JSON.stringify(p.trace.map((t) => t.text)));
  assert.equal(p.vars.a.values[0], 85);
});

test("NX-N9 array assignment notes inside a loop quote each stored value", () => {
  const p = path("Dim a(2) As Integer\nDim i As Long\nFor i = 0 To 2\na(i) = i + 0.5\nNext i");
  for (const text of ["a(0) ← 0", "a(1) ← 2", "a(2) ← 2"])
    assert.ok(p.trace.some((t) => t.text === text), text + " in " + JSON.stringify(p.trace.map((t) => t.text)));
  assert.deepEqual(p.vars.a.values, [0, 2, 2]);
});

test("NX-N9 array assignment note quotes the converted value for a numeric string", () => {
  const p = path('Dim a(1) As Long\na(0) = "42"');
  assert.ok(p.trace.some((t) => t.text === "a(0) ← 42"));
  assert.deepEqual(p.vars.a.values, [42, 0]);
});

// ---- NX-N18: 後判定 Do の終了注記は Loop 行に帰属する ----
test("NX-N18 post-test Do While termination note belongs to the Loop line", () => {
  const p = path("Dim x As Long\nx = 10\nDo\nx = x + 1\nLoop While x < 3\nDebug.Print x");
  const term = termNote(p);
  assert.ok(term, JSON.stringify(p.trace));
  assert.equal(term.text, "1回実行してループを終了します");
  assert.equal(term.line, 5, JSON.stringify(p.trace.map((t) => [t.line, t.text])));
  assert.equal(p.vars.x, 11);
});

test("NX-N18 post-test Do Until termination note belongs to the Loop line", () => {
  const p = path("Dim x As Long\nx = 10\nDo\nx = x + 1\nLoop Until x >= 3\nDebug.Print x");
  const term = termNote(p);
  assert.ok(term);
  assert.equal(term.line, 5, JSON.stringify(p.trace.map((t) => [t.line, t.text])));
});

test("NX-N18 post-test Do termination after several iterations still belongs to the Loop line", () => {
  const p = path("Dim x As Long\nx = 0\nDo\nx = x + 1\nLoop While x < 3");
  const term = termNote(p);
  assert.ok(term);
  assert.equal(term.text, "3回実行してループを終了します");
  assert.equal(term.line, 5);
});

test("NX-N18 uncertain post-test Do termination notes belong to the Loop line on every ending path", () => {
  const r = sim("Dim x As Long\nx = 0\nDo\nx = x + 1\nLoop While Rnd < 0.5");
  const terms = r.paths.flatMap((p) => p.trace.filter((t) => /回実行してループを終了します/.test(t.text)));
  assert.ok(terms.length >= 2, JSON.stringify(r.paths.map((p) => p.trace)));
  for (const t of terms) assert.equal(t.line, 5, t.text);
});

test("NX-N18 pre-test Do termination note stays on the Do line", () => {
  const p = path("Dim x As Long\nx = 0\nDo While x < 3\nx = x + 1\nLoop");
  const term = termNote(p);
  assert.ok(term);
  assert.equal(term.text, "3回実行してループを終了します");
  assert.equal(term.line, 3, JSON.stringify(p.trace.map((t) => [t.line, t.text])));
});

test("NX-N18 For termination note stays on the For line", () => {
  const p = path("Dim i As Long\nFor i = 1 To 3\nNext i");
  const term = termNote(p);
  assert.ok(term);
  assert.equal(term.line, 2, JSON.stringify(p.trace.map((t) => [t.line, t.text])));
});

// ---- D1-4: Attribute 文のリファレンス項目 ----
const vba = getDefinition("vba");
const attr = vba.reference.find((r) => r.name === "Attribute");

test("D1-4 Attribute is an individual supported reference entry like Rem", () => {
  assert.ok(attr, "Attribute entry must exist");
  assert.equal(attr.supported, true, "parser accepts and skips Attribute lines, as with Rem");
  assert.equal(attr.category, "文");
  for (const field of ["syntax", "description", "example", "caution", "returns", "source"])
    assert.ok(typeof attr[field] === "string" && attr[field].length > 0, `Attribute.${field}`);
  assert.match(attr.syntax, /Attribute/);
  assert.match(attr.example, /Attribute VB_Name = "Module1"/);
  assert.equal(vba.reference.length, 91, "90 existing + Attribute");
});

test("D1-4 Attribute example and module-header code run without error", async () => {
  const errors = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
  const r1 = await vba.simulate(attr.example, structuredClone(vba.model.defaults));
  assert.deepEqual(errors(r1), []);
  assert.ok(r1.paths.length >= 1);
  const r2 = await vba.simulate(
    'Attribute VB_Name = "Module1"\nAttribute VB_GlobalNameSpace = False\nx = 1\nDebug.Print x',
    structuredClone(vba.model.defaults),
  );
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(r2.paths[0].outputs.map((o) => o.text), ["1"]);
});

test("D1-4 Attribute resolves through scan (usedReferences)", () => {
  assert.ok(vba.scan('Attribute VB_Name = "Module1"').includes("Attribute"));
});

test("D1-4 reference-r2.json carries the matching Attribute row and no sha256 changes", () => {
  const rows = JSON.parse(readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"));
  // 統合後の総数: 905 existing + Attribute + ImageJ .length（D1-1）+ Python math 定数5件とその CloudFormation 伝播5件（R23-N6）
  assert.equal(rows.length, 1007, "905 existing + Attribute + .length + math constants x2 kinds + batch3 数値の属性 x2 kinds + batch4 pyref exceptions x2 kinds");
  const row = rows.find((r) => r.kind === "vba" && r.name === "Attribute");
  assert.ok(row, "Attribute row must exist in reference-r2.json");
  assert.equal(row.supported, true);
  for (const field of ["description", "returns", "caution", "example", "source"])
    assert.equal(row.fields[field], attr[field], `reference-r2 Attribute.${field} must match the definition`);
  assert.equal(rows.filter((r) => r.kind === "vba").length, 91);
  // 既存行の sha256 は触らない: Rem 行の記録が従来どおりであること
  const rem = rows.find((r) => r.kind === "vba" && r.name === "Rem");
  assert.equal(rem.sha256, "6e6cd356a5317df07d53b20a5a826ca5169823906e2699b235b045d9381199de");
  // D2-2: sha256 を欠いていた7行は統合時に同方式で補完され、全行が sha256 を持つ
  assert.ok(rows.every((r) => typeof r.sha256 === "string" && r.sha256.length === 64), "all rows carry a sha256");
});

// ---- T-1: each テンプレートの説明は、存在しない Set を「学べる」と述べない ----
test("T-1 each template intro explains that For Each needs no Set", () => {
  const t = vba.templates.find((x) => x.id === "each");
  assert.ok(t);
  assert.doesNotMatch(t.intro, /Setで扱うオブジェクトと通常の値の違いを学べます/);
  assert.match(t.intro, /参照がそのまま渡される/);
  assert.match(t.intro, /Setは、For Eachでは書きません/);
  assert.doesNotMatch(t.code, /\bSet\b/, "template code itself has no Set (behaviour unchanged)");
});

// ---- D-N4（アプリ側）: semantics の「動的配列」無条件未対応宣言を実態に即した限定文言へ ----
test("D-N4 semantics support text qualifies the dynamic-array limitation", () => {
  const support = vba.semantics.support;
  assert.match(support, /動的配列の要素参照・ReDim（宣言のみ対応）/);
  assert.doesNotMatch(support, /・動的配列・/, "unconditional '動的配列' must not remain in the unsupported list");
});

test("D-N4 dynamic-array behaviour matches the qualified wording", () => {
  // 宣言のみ対応: Dim a() は受理され、動的配列として用意される
  const decl = path("Dim a() As Integer\nDebug.Print 1");
  assert.ok(decl.trace.some((t) => /動的配列/.test(t.text)));
  assert.deepEqual(decl.outputs.map((o) => o.text), ["1"]);
  // 要素参照（読み・書き）は実行時エラー9
  for (const code of ["Dim a() As Integer\nDebug.Print a(0)", "Dim a() As Integer\na(0) = 1"]) {
    const r = sim(code);
    assert.equal((r.error || r.paths[0]?.error)?.code, 9, code);
  }
  // ReDim は未対応として構文名を挙げて停止する
  for (const code of ["Dim a() As Integer\nReDim a(3)", "Dim a() As Integer\nReDim Preserve a(3)"]) {
    const r = sim(code);
    assert.match((r.error || r.paths[0]?.error)?.message || "", /ReDim/, code);
  }
});

test("D-N4 semantics text is not a reference item, so reference-r2 needs no sync for it", () => {
  const rows = JSON.parse(readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"));
  // semantics 文はリファレンス項目ではないため個票には現れない
  assert.ok(!rows.some((r) => JSON.stringify(r).includes("動的配列の要素参照")));
  // 代わりに、定義と個票の文面同期そのものは全VBA項目で維持されている
  const byName = new Map(rows.filter((r) => r.kind === "vba").map((r) => [r.name, r]));
  for (const ref of vba.reference) {
    const row = byName.get(ref.name);
    assert.ok(row, ref.name);
    for (const f of ["description", "returns", "caution", "example", "source"])
      assert.equal(row.fields[f], ref[f], `${ref.name}.${f}`);
    assert.equal(row.supported, ref.supported, ref.name + ".supported");
  }
});

test("T-1 each template still fills A1:A5 with 100", async () => {
  const t = vba.templates.find((x) => x.id === "each");
  const r = await vba.simulate(t.code, structuredClone(vba.model.defaults));
  const errors = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
  assert.deepEqual(errors, []);
  const changes = Object.fromEntries(r.paths[0].groups.find((g) => g.title === "セルの変化").entries);
  for (const cell of ["A1", "A2", "A3", "A4", "A5"]) assert.equal(changes[cell], "100", cell);
});
