import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// R22 リファレンス完全性修正（VBA担当）: 第1層10件・第2層14件の追加と
// Replace 注意書きの実装追随を検証する。
const NEW_NAMES = [
  // 第1層
  "Time", "Rnd", "Timer", "Command", "CurDir", "FreeFile", "DoEvents",
  "IMEStatus", "Single", "Object",
  // 第2層（定数7・演算子5・文キーワード2）
  "Empty", "Null", "Nothing", "True", "False", "vbCrLf", "vbTab",
  "And", "Or", "Xor", "Mod", "Not", "Let", "Rem",
];

const vba = getDefinition("vba");
const byName = new Map(vba.reference.map((r) => [r.name, r]));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);

test("ref-r22 VBA: all 24 missing names are individual supported entries", () => {
  assert.equal(vba.reference.length, 91, "66 existing + 25 new");
  for (const name of NEW_NAMES) {
    const r = byName.get(name);
    assert.ok(r, name + " must exist as its own reference entry");
    assert.equal(r.supported, true, name);
    for (const field of ["category", "syntax", "description", "example", "caution", "returns", "source"])
      assert.ok(typeof r[field] === "string" && r[field].length > 0, `${name}.${field}`);
    assert.match(r.source, /^https:\/\/raw\.githubusercontent\.com\/MicrosoftDocs\/VBA-Docs\//, name + " source must be the official VBA-Docs page");
  }
});

test("ref-r22 VBA: every new example runs without error", async () => {
  for (const name of NEW_NAMES) {
    const r = await vba.simulate(byName.get(name).example, structuredClone(vba.model.defaults));
    assert.deepEqual(errors(r), [], `${name}: ${byName.get(name).example}`);
    assert.ok(r.paths.length >= 1, name);
  }
});

test("ref-r22 VBA: every new name resolves through usedReferences (scan)", () => {
  const samples = {
    Time: "x = Time",
    Rnd: "x = Rnd",
    Timer: "x = Timer",
    Command: "x = Command",
    CurDir: "x = CurDir",
    FreeFile: "x = FreeFile",
    DoEvents: "x = DoEvents",
    IMEStatus: "x = IMEStatus",
    Single: "Dim x As Single",
    Object: "Dim obj As Object",
    Empty: "x = Empty",
    Null: "x = Null",
    Nothing: "Set obj = Nothing",
    True: "x = True",
    False: "x = False",
    vbCrLf: 'x = "a" & vbCrLf & "b"',
    vbTab: 'x = "a" & vbTab & "b"',
    And: "x = True And False",
    Or: "x = True Or False",
    Xor: "x = True Xor False",
    Mod: "x = 10 Mod 3",
    Not: "x = Not True",
    Let: "Let x = 5",
    Rem: "Rem comment",
  };
  assert.deepEqual(Object.keys(samples).sort(), [...NEW_NAMES].sort());
  for (const [name, code] of Object.entries(samples))
    assert.ok(vba.scan(code).includes(name), `${name} must resolve from: ${code} (got ${JSON.stringify(vba.scan(code))})`);
});

test("ref-r22 VBA: bare built-in examples keep runtime-determined semantics", async () => {
  // 括弧なし組み込みは暗黙変数ではなく「実行時に決まる値」になる（RG-24 と同じ扱い）
  for (const name of ["Time", "Rnd", "Timer", "Command", "CurDir", "FreeFile", "DoEvents", "IMEStatus"]) {
    const r = await vba.simulate(`x = ${name}`, structuredClone(vba.model.defaults));
    assert.deepEqual(errors(r), [], name);
    assert.equal(r.paths[0].groups[0].entries.length, 1, name + " must not create a phantom variable");
    assert.match(r.paths[0].groups[0].entries[0][1], /実行時に決まる/, name);
  }
});

test("ref-r22 VBA: Replace caution and syntax match the 3-6 argument implementation", async () => {
  const r = byName.get("Replace");
  assert.doesNotMatch(r.caution, /3引数のバイナリ比較のみ/);
  assert.match(r.caution, /3〜6引数/);
  assert.match(r.caution, /-1/);
  assert.match(r.syntax, /開始位置/);
  // 実装どおり6引数（compare=1）まで実行できる
  const run = await vba.simulate('Debug.Print Replace("AaA", "a", "b", 1, -1, 1)', structuredClone(vba.model.defaults));
  assert.deepEqual(errors(run), []);
  assert.deepEqual(run.paths[0].outputs.map((o) => o.text), ["bbb"]);
  // compare=-1 だけが未対応であることも文面どおり
  const ng = await vba.simulate('Debug.Print Replace("abc", "a", "b", 1, -1, -1)', structuredClone(vba.model.defaults));
  assert.ok(errors(ng).some((e) => /compare 引数 -1/.test(e.message)));
});
