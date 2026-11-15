// Glossary audit fix (G-N1..G-N13 / RG-136..RG-142).
// Pins the per-language C-family glossaries (previously one shared array),
// the Power Automate desktop-flow definition, the app-wide 未確定（値）entry,
// and the completeness additions per type.
import { test } from "node:test";
import assert from "node:assert/strict";
import { definitions, getDefinition } from "../js/types/registry.js";

const terms = (id) => getDefinition(id).glossary.map((g) => g[0]);
const defOf = (id, word) =>
  getDefinition(id).glossary.find((g) => g[0] === word)?.[1];

test("gloss cfamily: C# glossary has no pointer / undefined-behavior (G-N1, G-N2)", () => {
  assert.deepEqual(terms("csharp"), ["配列", "参照オブジェクト", "未確定（値）"]);
  assert.ok(!terms("csharp").includes("ポインタ"));
  assert.ok(!terms("csharp").includes("未定義動作"));
});

test("gloss cfamily: C glossary has no C#-only 参照オブジェクト (G-N3)", () => {
  assert.deepEqual(terms("c"), ["配列", "ポインタ", "未定義動作", "未確定（値）"]);
  assert.ok(!terms("c").includes("参照オブジェクト"));
  assert.ok(!terms("c").includes("参照"));
});

test("gloss cfamily: C++ glossary uses 参照, not 参照オブジェクト (G-N4)", () => {
  assert.deepEqual(terms("cpp"), [
    "配列",
    "ポインタ",
    "未定義動作",
    "参照",
    "未確定（値）",
  ]);
  assert.ok(!terms("cpp").includes("参照オブジェクト"));
  assert.match(defOf("cpp", "参照"), /別名/);
});

test("gloss cfamily: splitting the glossary left shared data untouched", () => {
  // Reference and template sets are built from the same factory; the
  // glossary split must not leak into them (totals pinned by RG-131..133).
  assert.equal(getDefinition("c").reference.length, 26);
  assert.equal(getDefinition("cpp").reference.length, 31);
  assert.equal(getDefinition("csharp").reference.length, 53);
  for (const id of ["c", "cpp", "csharp"])
    assert.equal(getDefinition(id).templates.length, 6);
});

test("gloss powerautomate: desktop flow definition names the desktop (G-N5)", () => {
  const def = defOf("powerautomate", "デスクトップフロー");
  assert.match(def, /自分のパソコン（デスクトップ）/);
  assert.match(def, /Power Automate for desktop/);
});

test("gloss: every type defines the core model term 未確定（値） (G-N6)", () => {
  assert.equal(definitions.length, 15);
  for (const d of definitions) {
    assert.ok(
      d.glossary.some((g) => g[0] === "未確定（値）"),
      `${d.id} に未確定（値）がない`,
    );
    assert.match(defOf(d.id, "未確定（値）"), /実行時に決まる値/);
  }
});

test("gloss cloudformation: マクロ and 断片（フラグメント） exist (G-N7, G-N8)", () => {
  assert.ok(terms("cloudformation").includes("マクロ"));
  assert.ok(terms("cloudformation").includes("断片（フラグメント）"));
  assert.match(defOf("cloudformation", "マクロ"), /Lambdaハンドラ/);
});

test("gloss imagej: スタック / 閾値・二値化 / 結果表（Results） exist (G-N9..G-N11)", () => {
  for (const w of ["スタック", "閾値・二値化", "結果表（Results）"])
    assert.ok(terms("imagej").includes(w), `imagej/${w}`);
});

test("gloss powerapps: レコード / テーブル / データソース exist (G-N12)", () => {
  for (const w of ["レコード", "テーブル", "データソース"])
    assert.ok(terms("powerapps").includes(w), `powerapps/${w}`);
  // The pre-existing コレクション definition relies on these two terms.
  assert.match(defOf("powerapps", "コレクション"), /レコード/);
  assert.match(defOf("powerapps", "コレクション"), /テーブル/);
});

test("gloss autohotkey: 自動実行 exists (G-N13)", () => {
  assert.ok(terms("autohotkey").includes("自動実行"));
  assert.match(defOf("autohotkey", "自動実行"), /冒頭/);
});

test("gloss: totals and structural sanity across all types", () => {
  const expected = {
    vba: 14,
    imagej: 7,
    cloudformation: 5,
    powerautomate: 3,
    autohotkey: 4,
    uivision: 3,
    powerapps: 7,
    python: 35,
    r: 5,
    c: 4,
    cpp: 5,
    csharp: 3,
    javascript: 4,
    cmd: 6,
    powershell: 6,
  };
  let total = 0;
  for (const d of definitions) {
    assert.equal(d.glossary.length, expected[d.id], `${d.id} の用語集件数`);
    total += d.glossary.length;
    const seen = new Set();
    for (const [word, def] of d.glossary) {
      assert.equal(typeof word, "string");
      assert.equal(typeof def, "string");
      assert.ok(word.length > 0 && def.length > 0, `${d.id}/${word}`);
      assert.ok(!seen.has(word), `${d.id} で用語が重複: ${word}`);
      seen.add(word);
    }
  }
  assert.equal(total, 111);
});
