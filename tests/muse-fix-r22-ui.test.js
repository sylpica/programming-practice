import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { definitions, getDefinition } from "../js/types/registry.js";

// js/app.js cannot be imported in Node (it drives the DOM at module level),
// so the pure helpers under test are extracted from its source and evaluated,
// following tests/muse-fix-ui.test.js.
const appSource = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function extractFunctions(source, names) {
  const chunks = [];
  for (const name of names) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, name + " not found in js/app.js");
    let depth = 0,
      state = "code";
    let j = source.indexOf("{", start);
    for (; j < source.length; j++) {
      const c = source[j],
        next = source[j + 1];
      if (state === "code") {
        if (c === "'") state = "single";
        else if (c === '"') state = "double";
        else if (c === "`") state = "template";
        else if (c === "/" && next === "/") {
          state = "line";
          j++;
        } else if (c === "/" && next === "*") {
          state = "block";
          j++;
        } else if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      } else if (state === "single") {
        if (c === "\\") j++;
        else if (c === "'") state = "code";
      } else if (state === "double") {
        if (c === "\\") j++;
        else if (c === '"') state = "code";
      } else if (state === "template") {
        if (c === "\\") j++;
        else if (c === "`") state = "code";
      } else if (state === "line") {
        if (c === "\n") state = "code";
      } else if (state === "block") {
        if (c === "*" && next === "/") {
          state = "code";
          j++;
        }
      }
    }
    chunks.push(source.slice(start, j));
  }
  return chunks.join("\n");
}
const helpers = new Function(
  extractFunctions(appSource, [
    "templateSelectionAfterChange",
    "restoredTemplateSelection",
    "parseLegacyV2",
  ]) +
    "\nreturn { templateSelectionAfterChange, restoredTemplateSelection, parseLegacyV2 };",
)();
const { templateSelectionAfterChange, restoredTemplateSelection, parseLegacyV2 } =
  helpers;

// ---- R22-N25: explicit re-selection keeps the selector + explanation ----
test("R22-N25 preserve flag keeps selection when restored draft differs from template code", () => {
  const templates = [
    { id: "tpl-a", code: "A original" },
    { id: "tpl-b", code: "B original" },
  ];
  // Explicit selection (restore of an edited draft): keep the selection.
  assert.equal(
    templateSelectionAfterChange("tpl-a", templates, "A original\nedited", true),
    "tpl-a",
  );
  // A later genuine edit (no preserve flag) still detaches, as before.
  assert.equal(
    templateSelectionAfterChange("tpl-a", templates, "A original\nedited", false),
    "",
  );
  // Unedited code never detaches.
  assert.equal(
    templateSelectionAfterChange("tpl-a", templates, "A original", false),
    "tpl-a",
  );
  // No selection stays no selection, with or without the flag.
  assert.equal(templateSelectionAfterChange("", templates, "free", false), "");
  assert.equal(templateSelectionAfterChange("", templates, "free", true), "");
  // loadTemplate arms the one-shot flag and changed() consumes it.
  assert.ok(appSource.includes("preserveTemplateSelection = true;"));
  assert.ok(appSource.includes("preserveTemplateSelection = false;"));
});

test("R22-N25 type-switch restore keeps a recorded selection even for a draft", () => {
  const templates = [
    { id: "tpl-a", code: "A original" },
    { id: "tpl-b", code: "B original" },
  ];
  // Recorded selection + edited draft code: keep the selection (同型 fix).
  assert.equal(
    restoredTemplateSelection(
      { templateId: "tpl-a", code: "A original\nedited" },
      templates,
    ),
    "tpl-a",
  );
  // Recorded free practice stays free.
  assert.equal(
    restoredTemplateSelection({ templateId: "", code: "free text" }, templates),
    "",
  );
  // No saved draft at all: first template, as before.
  assert.equal(restoredTemplateSelection(undefined, templates), "tpl-a");
  assert.equal(restoredTemplateSelection(null, templates), "tpl-a");
  // Legacy data with no recorded selection: a differing draft is not
  // attributed to the first template; a matching one is.
  assert.equal(
    restoredTemplateSelection({ code: "legacy draft" }, templates),
    "",
  );
  assert.equal(
    restoredTemplateSelection({ code: "A original" }, templates),
    "tpl-a",
  );
  // A recorded selection that no longer exists is not resurrected.
  assert.equal(
    restoredTemplateSelection({ templateId: "gone", code: "x" }, templates),
    "",
  );
  // The old unconditional clear-on-difference in switchType is gone.
  assert.ok(
    !appSource.includes(
      'templates.find(t => t.id === templateId)?.code !== $("editor").value',
    ),
  );
});

// ---- R22-N27: syntactically broken v2 JSON is preserved, not swallowed ----
test("R22-N27 parseLegacyV2 returns recovery for broken JSON", () => {
  assert.deepEqual(parseLegacyV2("{bad"), { kind: "recovery", raw: "{bad" });
  assert.deepEqual(parseLegacyV2('{"drafts":'), {
    kind: "recovery",
    raw: '{"drafts":',
  });
});

test("R22-N27 parseLegacyV2 keeps the previously working paths", () => {
  const good = JSON.stringify({
    drafts: { vba: { code: "x" } },
    active: "python",
  });
  const migrated = parseLegacyV2(good);
  assert.equal(migrated.kind, "drafts");
  assert.deepEqual(migrated.drafts, { vba: { code: "x" } });
  assert.equal(migrated.active, "python");
  // Valid JSON but wrong shape was already preserved before the fix.
  assert.deepEqual(parseLegacyV2('{"x":1}'), {
    kind: "recovery",
    raw: '{"x":1}',
  });
  assert.deepEqual(parseLegacyV2("123"), { kind: "recovery", raw: "123" });
  assert.deepEqual(parseLegacyV2("[1,2]"), { kind: "recovery", raw: "[1,2]" });
  // Nothing stored / JSON null: nothing to migrate or preserve.
  assert.deepEqual(parseLegacyV2(null), { kind: "empty" });
  assert.deepEqual(parseLegacyV2(""), { kind: "empty" });
  assert.deepEqual(parseLegacyV2("null"), { kind: "empty" });
});

test("R22-N27 startup v2 block routes through parseLegacyV2 to the recovery key", () => {
  const blockStart = appSource.indexOf('localStorage.getItem("macro-practice-v2")');
  assert.ok(blockStart >= 0);
  const block = appSource.slice(blockStart, blockStart + 900);
  assert.ok(block.includes("parseLegacyV2(raw)"));
  assert.ok(block.includes('"programming-practice-recovery-v2"'));
  // The old form parsed inline in the startup block and let the outer
  // catch swallow failures (parsing inside parseLegacyV2 itself is fine).
  assert.ok(!appSource.includes(', interim = JSON.parse(raw)'));
});

// ---- R22-N26: static wording residues ----
test("R22-N26 template view subtitle is type-neutral (no macro wording)", () => {
  assert.ok(!htmlSource.includes("小さなマクロから"));
  assert.ok(htmlSource.includes("小さなコードから、ひとつずつ。"));
});

test("R22-N26 empty-result wording is unified with the full stop", () => {
  const occurrences = appSource.match(/該当する項目はありません。?/g) || [];
  assert.ok(occurrences.length >= 3, occurrences.join(","));
  for (const text of occurrences)
    assert.ok(text.endsWith("。"), "missing full stop: " + text);
  assert.ok(!appSource.includes('"該当する項目はありません"'));
});

test("R22-N26 references without a caution render no empty caution element", () => {
  // The data really contains empty cautions (108/511 at audit time), so the
  // conditional in refArticle is what keeps empty <p class="caution"> out.
  let empty = 0,
    total = 0;
  for (const d of definitions)
    for (const r of d.reference) {
      total++;
      if (!r.caution) empty++;
    }
  assert.equal(total, 1186); // 995 + 包含演算子（R24-N4）+ 数値の属性（R24 §3.2）+ プロパティ .Name/.FullName は既存項目への追記のため増減なし、比較演算子は既存項目の拡張 + 修正バッチ4 Python追随班の例外44件×2種（Python＋CloudFormation伝播）+ 修正バッチ6 R27-N20 組み込み定数3件×2種（同）+ R27-N7 VBA 定数94件
  assert.ok(empty > 0, "expected some references without a caution");
  assert.ok(
    appSource.includes('...(r.caution ? [el("p", r.caution, "caution")] : [])'),
  );
  assert.ok(!appSource.includes('el("p", r.caution, "caution"),'));
});

// ---- R22-N24: model panel structure (static CSS guarantees) ----
// Behaviour itself (panel scrollTop stays 0, summary/reset stay inside the
// card, .model-body is the only scroller) was verified in a headless
// browser; these checks pin the CSS structure that produces it.
test("R22-N24 wide layout routes the details content through a flex column", () => {
  const at = cssSource.indexOf(".model-panel::details-content");
  assert.ok(at >= 0, "::details-content rule missing");
  const block = cssSource.slice(at, at + 1200);
  assert.ok(block.includes("display: flex"));
  assert.ok(block.includes("flex-direction: column"));
  assert.ok(block.includes("min-height: 0"));
  assert.ok(block.includes(".model-panel summary"));
  assert.ok(block.includes("flex-shrink: 0"));
  // .model-body is the internal scroller in the wide layout.
  assert.ok(block.includes(".model-panel .model-body"));
  assert.ok(block.includes("overflow: auto"));
  // The reset row sticks inside the scrolling .model-body.
  assert.ok(block.includes(".model-panel .model-actions"));
  assert.ok(block.includes("position: sticky"));
  assert.ok(block.includes("top: -9px"));
  // The whole fix is scoped to the constrained layout (>=761px).
  const mediaAt = cssSource.lastIndexOf("@media (min-width: 761px)", at);
  assert.ok(mediaAt >= 0 && mediaAt < at);
});
