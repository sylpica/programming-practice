import { test } from "node:test";
import assert from "node:assert/strict";
import { templatesAdvanced } from "../js/types/r/templates-advanced.js";
import { glossaryAdvanced } from "../js/types/r/glossary-advanced.js";
import { referenceAdvanced } from "../js/types/r/reference-advanced.js";
import { advancedBuiltins } from "../js/types/r/functions-advanced.js";
import { definition } from "../js/types/r/index.js";

// 高度モード B4・Rコンテンツ班（テンプレート／用語集）。
// 期待出力は実 R 4.3.3（/usr/bin/Rscript）で実測し、本シミュレータの
// 出力表記に合わせて照合したもの（報告書 docs/audit/ADV-B4-r-content.md）。

// r/index.js の IMPLEMENTED（基礎実装済み関数）の写し。テンプレートの
// コードは、この集合と高度ハンドラ（advancedBuiltins）の和集合にしか
// 依存してはならない（未実装名は FUNCTION_NAMES にあっても実行できない）。
const BASE_IMPLEMENTED = new Set([
  "c", "length", "is.na", "as.numeric", "as.character", "print",
  "cat", "sum", "mean", "median", "sd", "data.frame", "nrow",
  "ncol", "names", "seq_len", "seq", "rep", "read.csv",
]);
const ALLOWED_CALLS = new Set([...BASE_IMPLEMENTED, ...advancedBuiltins.keys()]);
const LEVELS = new Set(["基礎", "実践", "応用"]);
const allRefNames = new Set([
  ...definition.reference.map((r) => r.name),
  ...referenceAdvanced.map((r) => r.name),
]);

const EXPECTED_OUTPUTS = {
  "r-adv-sort-rank": ["c(95, 95, 80, 70)", "c(2, 4, 3, 1)", "c(1, 3.5, 2, 3.5)"],
  "r-adv-cumsum-diff": ["c(3, 8, 10, 16)", "c(5, 2, 6)", "c(2, -3, 4)"],
  "r-adv-which-match": ["c(2, 4)", "c(3, 1)", "c(2)"],
  "r-adv-unique-dup": [
    "c(5, 3, 1)",
    "c(FALSE, FALSE, TRUE, FALSE, TRUE)",
    "c(5, 3, 1)",
    "3",
  ],
  "r-adv-tapply-group": ["c(A = 70, B = 95)", "c(A = 210, B = 190)"],
  "r-adv-merge-colsums": [
    'item: c("a", "b", "c")\nqty: c(2, 3, 5)\nunit: c(100, 200, 300)\ntotal: c(200, 600, 1500)',
    "c(qty = 10, total = 2300)",
  ],
  "r-adv-apply-df": [
    "c(math = 80, eng = 80)",
    "c(140, 190, 150)",
    "c(math = 90, eng = 100)",
  ],
};

test("content templates: schema, unique r-adv- ids, resolvable refs", () => {
  assert.ok(templatesAdvanced.length >= 6, "テンプレートは6件程度");
  const baseIds = new Set(definition.templates.map((t) => t.id));
  const seen = new Set();
  for (const t of templatesAdvanced) {
    assert.deepEqual(
      Object.keys(t).sort(),
      ["code", "id", "intro", "level", "refs", "title"],
      t.id,
    );
    assert.ok(t.id.startsWith("r-adv-"), t.id);
    assert.ok(!seen.has(t.id), `id重複: ${t.id}`);
    assert.ok(!baseIds.has(t.id), `基礎テンプレートとid重複: ${t.id}`);
    seen.add(t.id);
    assert.equal(typeof t.title, "string");
    assert.ok(t.title.length > 0, t.id);
    assert.equal(typeof t.code, "string");
    assert.ok(t.code.length > 0, t.id);
    assert.equal(typeof t.intro, "string");
    assert.ok(t.intro.length > 0, t.id);
    assert.ok(LEVELS.has(t.level), `${t.id}: level=${t.level}`);
    assert.ok(Array.isArray(t.refs) && t.refs.length > 0, t.id);
    for (const ref of t.refs)
      assert.ok(allRefNames.has(ref), `${t.id}: refs に実在しない項目 ${ref}`);
  }
});

test("content templates: code only calls implemented functions", () => {
  const KEYWORDS = new Set(["if", "for", "while", "function", "repeat"]);
  for (const t of templatesAdvanced) {
    const codeNoStrings = t.code.replace(/"[^"]*"/g, '""');
    const calls = new Set(
      [...codeNoStrings.matchAll(/([A-Za-z_.][A-Za-z0-9_.]*)\s*\(/g)].map(
        (m) => m[1],
      ),
    );
    for (const name of calls) {
      if (KEYWORDS.has(name)) continue;
      assert.ok(
        ALLOWED_CALLS.has(name),
        `${t.id}: 未実装関数 ${name} を呼んでいる`,
      );
    }
  }
});

test("content templates: simulator runs clean and matches real R values", async () => {
  for (const t of templatesAdvanced) {
    const r = await definition.simulate(
      t.code,
      structuredClone(definition.model.defaults),
    );
    assert.equal(r.error, undefined, `${t.id}: ${JSON.stringify(r.error)}`);
    assert.equal(r.paths.length, 1, t.id);
    assert.equal(
      r.paths[0].error,
      undefined,
      `${t.id}: ${JSON.stringify(r.paths[0].error)}`,
    );
    const expected = EXPECTED_OUTPUTS[t.id];
    assert.ok(expected, `${t.id}: 期待出力が未登録`);
    assert.deepEqual(
      r.paths[0].outputs.map((o) => o.text),
      expected,
      t.id,
    );
  }
});

test("content glossary: pair format, no overlap with base glossary", () => {
  assert.ok(glossaryAdvanced.length >= 12, "用語集は12件程度");
  const baseTerms = new Set(definition.glossary.map((g) => g[0]));
  const seen = new Set();
  for (const pair of glossaryAdvanced) {
    assert.ok(Array.isArray(pair) && pair.length === 2, JSON.stringify(pair));
    const [term, def] = pair;
    assert.equal(typeof term, "string");
    assert.ok(term.length > 0);
    assert.equal(typeof def, "string");
    assert.ok(def.length > 0, term);
    assert.ok(!seen.has(term), `用語重複: ${term}`);
    assert.ok(!baseTerms.has(term), `基礎用語集と重複: ${term}`);
    seen.add(term);
  }
});
