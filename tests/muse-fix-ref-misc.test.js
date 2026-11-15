import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// リファレンス完全性修正（Round22付随）: R／JavaScript／Power Apps／
// Power Automate／UI.Vision 担当分の回帰テスト。
const added = {
  r: ["rnorm", "runif", "sample", "%in%", "$", "[", "[[", "NA", "NULL", "break", "next", "repeat", ":", "%%", "%/%", "NaN", "Inf", "TRUE", "FALSE", "T", "F"],
  javascript: ["join", "typeof", "while", "break", "continue", "BigInt", "オブジェクトリテラル", "id", "tagName", "children", "document.body", "undefined", "NaN", "Infinity"],
  powerapps: ["And", "Or", "Not", "ThisRecord", "in（演算子）"],
  powerautomate: ["Else if"],
  uivision: ["String", "${!times}", "!statusOK", "!errorIgnore"],
};

for (const [id, names] of Object.entries(added)) {
  test(`ref-misc ${id}: added reference items exist and are supported`, () => {
    const d = getDefinition(id);
    for (const name of names) {
      const r = d.reference.find((x) => x.name === name);
      assert.ok(r, `${id}/${name} missing`);
      assert.equal(r.supported, true, `${id}/${name} not supported`);
      assert.ok(r.description && r.example, `${id}/${name} incomplete`);
      assert.ok(r.returns && r.source, `${id}/${name} lacks returns/source`);
    }
  });
}

test("ref-misc javascript: length stays an intentional exclusion (no item)", () => {
  const d = getDefinition("javascript");
  assert.ok(!d.reference.some((r) => r.name === "length"));
});

test("ref-misc scan resolves identifier-shaped names", () => {
  const cases = [
    ["r", "x <- rnorm(3)", "rnorm"],
    ["r", "c(TRUE, FALSE)", "TRUE"],
    ["r", "x <- c(1, NA)", "NA"],
    ["javascript", "values.join(\"-\")", "join"],
    ["javascript", "document.body.children", "document.body"],
    ["javascript", "document.getElementById(\"result\").tagName", "tagName"],
    ["powerapps", "And(1 < 2, 2 < 3)", "And"],
    ["powerapps", "Sum(Sequence(3), ThisRecord.Value)", "ThisRecord"],
  ];
  for (const [id, code, name] of cases) {
    const d = getDefinition(id);
    assert.ok(d.scan(code).includes(name), `${id}/${name} not scanned`);
  }
});

test("ref-misc powerapps section5 syntax updates", () => {
  const d = getDefinition("powerapps");
  const byName = Object.fromEntries(d.reference.map((r) => [r.name, r]));
  assert.match(byName["Text"].syntax, /Format/);
  assert.match(byName["LookUp"].syntax, /ReductionFormula/);
  assert.match(byName["Sequence"].syntax, /\[, Start/);
  assert.match(byName["Navigate"].caution, /引数の数のエラー/);
});

test("ref-misc r section5 updates", () => {
  const d = getDefinition("r");
  const byName = Object.fromEntries(d.reference.map((r) => [r.name, r]));
  assert.match(byName["mean"].syntax, /trim/);
  assert.match(byName["names"].description, /名前付きベクトル/);
  assert.match(byName["length"].description, /列数/);
  assert.match(byName["if"].description, /式としても/);
  assert.match(byName["data.frame"].description, /要素演算/);
});
