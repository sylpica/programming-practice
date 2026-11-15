import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Fix batch 2 (a11y + storage): A-N1..A-N7, S-N1..S-N3.
// Following tests/muse-fix-ui.test.js: js/app.js cannot be imported in Node
// (it drives the DOM at module level), so the pure helpers under test are
// extracted from its source and evaluated. Contrast ratios are recomputed
// mechanically from style.css with the WCAG relative-luminance formula.
const appSource = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const actionEditorSource = fs.readFileSync(
  new URL("../js/core/action-editor.js", import.meta.url),
  "utf8",
);
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
    "parseLegacyV1",
    "retryPendingRecoveries",
    "preferredScrollBehavior",
    "fileDraft",
  ]) +
    "\nreturn { parseLegacyV1, retryPendingRecoveries, preferredScrollBehavior, fileDraft };",
)();
const {
  parseLegacyV1,
  retryPendingRecoveries,
  preferredScrollBehavior,
  fileDraft,
} = helpers;

// ---- WCAG contrast machinery ----
function luminance(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
// Applied CSS with comments stripped: old colours mentioned in explanatory
// comments must not count as still-applied values.
const cssApplied = cssSource.replace(/\/\*[\s\S]*?\*\//g, "");
function cssVar(name) {
  const m = cssSource.match(new RegExp(name + ":\\s*(#[0-9a-fA-F]{3,6})"));
  assert.ok(m, name + " not found in style.css");
  return m[1];
}
function cssBlock(selector) {
  const start = cssSource.indexOf(selector);
  assert.ok(start >= 0, selector + " not found in style.css");
  return cssSource.slice(start, cssSource.indexOf("}", start));
}
function resolveColor(value) {
  const v = value.trim();
  if (v.startsWith("var(")) return cssVar(v.slice(4, -1));
  return v;
}
function blockColor(block, property) {
  const m = block.match(new RegExp(property + ":\\s*([^;]+);"));
  assert.ok(m, property + " not found in block: " + block.slice(0, 80));
  return resolveColor(m[1]);
}

// ---- A-N1: --muted meets AA on every background it is used on ----
test("A-N1 --muted contrast is >= 4.5:1 on all of its backgrounds", () => {
  const muted = cssVar("--muted");
  assert.notEqual(muted.toLowerCase(), "#6a7c73", "old failing colour remains");
  const backgrounds = {
    white: "#ffffff",
    "page background": cssVar("--bg"),
    "sheet header": "#edf3ed",
    "output box": "#f3f5f1",
    pale: cssVar("--pale"),
    "editor chrome": "#fbfcfa",
  };
  for (const [name, bg] of Object.entries(backgrounds)) {
    const ratio = contrast(muted, bg);
    assert.ok(ratio >= 4.5, `--muted on ${name}: ${ratio.toFixed(2)} < 4.5`);
  }
});

test("A-N1 sibling sweep: previously passing text pairs still pass AA", () => {
  const pairs = [
    ["--ink on white", cssVar("--ink"), "#ffffff", 4.5],
    ["--ink on page background", cssVar("--ink"), cssVar("--bg"), 4.5],
    ["--green on white", cssVar("--green"), "#ffffff", 4.5],
    ["--green on pale", cssVar("--green"), cssVar("--pale"), 4.5],
    ["--green on chip background", cssVar("--green"), "#f3f8f0", 4.5],
    ["--green on status background", cssVar("--green"), "#e6eee5", 4.5],
    ["white on --green (run button)", "#ffffff", cssVar("--green"), 4.5],
    ["white on --deep (run hover)", "#ffffff", cssVar("--deep"), 4.5],
    ["editor text", "#285740", "#fbfcfa", 4.5],
    ["unsupported badge", "#916322", "#fff2df", 4.5],
    ["notice text", "#84601d", "#fff6dc", 4.5],
    ["caution text", "#7c6847", "#ffffff", 4.5],
    ["trace error", "#a83d30", "#fff0ee", 4.5],
  ];
  for (const [name, fg, bg, min] of pairs) {
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= min, `${name}: ${ratio.toFixed(2)} < ${min}`);
  }
});

// ---- A-N2: editor line numbers ----
test("A-N2 line-number colour meets 4.5:1 on its background", () => {
  const block = cssBlock(".editor-wrap pre");
  const fg = blockColor(block, "color");
  const bg = blockColor(block, "background");
  const ratio = contrast(fg, bg);
  assert.ok(ratio >= 4.5, `line numbers: ${ratio.toFixed(2)} < 4.5`);
  assert.ok(!cssApplied.includes("#a1b0a6"), "old line-number colour remains");
});

// ---- A-N3: focus outline colour ----
test("A-N3 focus outline colour meets 3:1 on adjacent backgrounds", () => {
  const focus = cssVar("--focus");
  assert.notEqual(focus.toLowerCase(), "#e7ad42", "old failing colour remains");
  for (const [name, bg] of Object.entries({
    white: "#ffffff",
    "page background": cssVar("--bg"),
    pale: cssVar("--pale"),
    "editor chrome": "#fbfcfa",
    "sheet header": "#edf3ed",
  })) {
    const ratio = contrast(focus, bg);
    assert.ok(ratio >= 3, `--focus on ${name}: ${ratio.toFixed(2)} < 3`);
  }
  // Both outline sites use the shared variable (root-cause fix, not per-site).
  assert.ok(cssBlock(":focus-visible").includes("var(--focus)"));
  assert.ok(cssBlock(".action-list li.selected").includes("var(--focus)"));
  assert.ok(!cssApplied.includes("#e7ad42"), "old focus colour remains");
});

// ---- A-N4: boundaries of interactive components ----
test("A-N4 input/button/sheet/chip boundaries meet 3:1 against white", () => {
  const strong = cssVar("--border-strong");
  const ratio = contrast(strong, "#ffffff");
  assert.ok(ratio >= 3, `--border-strong on white: ${ratio.toFixed(2)} < 3`);
  assert.ok(contrast(strong, cssVar("--bg")) >= 3);
  assert.ok(contrast(strong, "#f3f8f0") >= 3, "chip boundary vs chip background");
  // The essential boundaries route through the shared strong colour.
  assert.ok(cssBlock("button {").includes("var(--border-strong)"));
  assert.ok(cssBlock("input,\nselect {").includes("var(--border-strong)"));
  assert.ok(cssBlock(".sheet td,").includes("var(--border-strong)"));
  assert.ok(cssBlock(".chip {").includes("var(--border-strong)"));
  assert.ok(cssBlock("#modelJson {").includes("var(--border-strong)"));
  // Old failing boundary colours are gone.
  for (const old of ["#dde6de", "#cdded0", "#9fbdab"])
    assert.ok(!cssApplied.includes(old), "old boundary colour remains: " + old);
  // Sibling: the hover border now uses --green, which passes 3:1 and 4.5:1.
  assert.ok(cssBlock("button:hover").includes("var(--green)"));
  assert.ok(contrast(cssVar("--green"), "#ffffff") >= 3);
});

// ---- A-N5: truncation reaches the live region ----
test("A-N5 truncation text is composed into #resultStatus (the live region)", () => {
  const start = appSource.indexOf("function applyResult(");
  assert.ok(start >= 0);
  const block = appSource.slice(start, appSource.indexOf("function run()", start));
  // One shared limitText feeds both the visual notice and the live region.
  assert.ok(block.includes("const limitText = r.truncated"));
  assert.ok(block.includes('$("limit").textContent = limitText'));
  assert.ok(block.includes("limitText ? `。${limitText}` : \"\""));
  assert.ok(block.includes('$("resultStatus").textContent ='));
  // The old split (status without the truncation fact) is gone.
  assert.ok(!block.includes('$("limit").textContent =\n      `最大'));
});

// ---- A-N6: reference detail updates reach assistive technology ----
test("A-N6 #refDetail is a polite atomic live region", () => {
  const tag = htmlSource.match(/<article[^>]*id="refDetail"[^>]*>/s);
  assert.ok(tag, "refDetail article not found");
  assert.ok(tag[0].includes('aria-live="polite"'));
  assert.ok(tag[0].includes('aria-atomic="true"'));
});

test("A-N6 sibling sweep: storage notice and path counter are live regions", () => {
  const notice = htmlSource.match(/<p[^>]*id="storageNotice"[^>]*>/s);
  assert.ok(notice && notice[0].includes('role="alert"'));
  const counter = htmlSource.match(/<strong[^>]*id="counter"[^>]*>/s);
  assert.ok(counter && counter[0].includes('aria-live="polite"'));
});

// ---- A-N7: reduced-motion aware smooth scrolling ----
test("A-N7 preferredScrollBehavior honours prefers-reduced-motion", () => {
  const original = globalThis.matchMedia;
  try {
    globalThis.matchMedia = () => ({ matches: true });
    assert.equal(preferredScrollBehavior(), "auto");
    globalThis.matchMedia = () => ({ matches: false });
    assert.equal(preferredScrollBehavior(), "smooth");
    delete globalThis.matchMedia;
    assert.equal(preferredScrollBehavior(), "smooth");
  } finally {
    if (original === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = original;
  }
});

test("A-N7 no unconditional smooth scrollIntoView remains", () => {
  assert.ok(!appSource.includes('scrollIntoView({ behavior: "smooth"'));
  assert.ok(!actionEditorSource.includes('scrollIntoView({ behavior: "smooth"'));
  assert.ok(appSource.includes('"(prefers-reduced-motion: reduce)"'));
  assert.ok(actionEditorSource.includes('"(prefers-reduced-motion: reduce)"'));
  // Both app.js call sites route through the helper.
  const uses = appSource.match(/behavior: preferredScrollBehavior\(\)/g) || [];
  assert.equal(uses.length, 2);
});

// ---- S-N3: v1 migration validates shape like v2/v3 ----
test("S-N3 parseLegacyV1 accepts only non-array objects", () => {
  const good = JSON.stringify({ code: "Sub A()", model: { A1: "1" } });
  const migrated = parseLegacyV1(good);
  assert.equal(migrated.kind, "draft");
  assert.deepEqual(migrated.draft, { code: "Sub A()", model: { A1: "1" } });
  // The defect inputs: strings and arrays expanded into numeric keys before.
  assert.deepEqual(parseLegacyV1('"hello"'), { kind: "empty" });
  assert.deepEqual(parseLegacyV1("[1,2]"), { kind: "empty" });
  assert.deepEqual(parseLegacyV1("123"), { kind: "empty" });
  assert.deepEqual(parseLegacyV1("true"), { kind: "empty" });
  assert.deepEqual(parseLegacyV1("null"), { kind: "empty" });
  assert.deepEqual(parseLegacyV1("{bad"), { kind: "empty" });
  assert.deepEqual(parseLegacyV1(null), { kind: "empty" });
  assert.deepEqual(parseLegacyV1(""), { kind: "empty" });
});

test("S-N3 a migrated v1 draft carries no numeric keys into fileDraft", () => {
  const { draft } = parseLegacyV1(JSON.stringify({ code: "x", model: {} }));
  const entry = fileDraft({}, { code: "x", model: {} }, "");
  assert.deepEqual(Object.keys(entry.freeDraft).sort(), ["code", "model"]);
  assert.deepEqual(Object.keys(draft).sort(), ["code", "model"]);
});

test("S-N3 startup v1 block routes through parseLegacyV1", () => {
  const start = appSource.indexOf('localStorage.getItem("vba-practice-v1")');
  assert.ok(start >= 0);
  const block = appSource.slice(start - 200, start + 200);
  assert.ok(block.includes("parseLegacyV1("));
  assert.ok(!appSource.includes("drafts.vba = legacy"));
});

// ---- S-N2: recovery writes are retried on save ----
test("S-N2 retryPendingRecoveries keeps only the writes that still fail", () => {
  const written = [];
  let failuresLeft = 1;
  const storage = {
    setItem(key, raw) {
      if (failuresLeft > 0) {
        failuresLeft--;
        throw new Error("QuotaExceededError");
      }
      written.push([key, raw]);
    },
  };
  const pending = [{ key: "programming-practice-recovery-v3", raw: "{bad" }];
  // First retry (storage still failing once): the item stays pending.
  assert.deepEqual(retryPendingRecoveries(pending, storage), pending);
  // After recovery: the item is written and nothing remains pending.
  assert.deepEqual(retryPendingRecoveries(pending, storage), []);
  assert.deepEqual(written, [["programming-practice-recovery-v3", "{bad"]]);
  assert.deepEqual(retryPendingRecoveries([], storage), []);
  assert.deepEqual(retryPendingRecoveries(null, storage), []);
});

test("S-N2 save() retries preservation before writing v3 and unblocks on success", () => {
  const start = appSource.indexOf("function save()");
  assert.ok(start >= 0);
  const block = appSource.slice(start, appSource.indexOf("function updateLines()", start));
  const retryAt = block.indexOf("retryPendingRecoveries(");
  const writeAt = block.indexOf('localStorage.setItem(\n      "programming-practice-v3"');
  assert.ok(retryAt >= 0, "save() does not retry pending recoveries");
  assert.ok(writeAt > retryAt, "retry must happen before the v3 write");
  assert.ok(block.includes("if (pendingRecoveries.length)"));
  assert.ok(block.includes("storageBlocked = false;"));
  // Both startup preservation failures register a pending retry.
  assert.equal(
    (appSource.match(/pendingRecoveries\.push\(/g) || []).length,
    2,
  );
});

// ---- S-N1: a successful save hides the failure notice ----
test("S-N1 save() hides #storageNotice on success and shows it on failure", () => {
  const start = appSource.indexOf("function save()");
  const block = appSource.slice(start, appSource.indexOf("function updateLines()", start));
  assert.ok(block.includes('$("storageNotice").hidden = true;'));
  assert.ok(block.includes('$("storageNotice").hidden = false;'));
  // The hide sits after the successful setItem, inside the try block.
  const writeAt = block.indexOf(
    'localStorage.setItem(\n      "programming-practice-v3"',
  );
  const hideAt = block.indexOf('$("storageNotice").hidden = true;');
  const catchAt = block.indexOf("} catch {", hideAt);
  assert.ok(writeAt < hideAt && hideAt < catchAt);
});

test("S-N1+S-N2 scenario: notice clears after recovery and blocked saves resume", () => {
  // Scenario reproduction built on the real retryPendingRecoveries helper,
  // mirroring save()'s control flow (asserted against the source above).
  const store = new Map();
  let failing = true;
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem(k, v) {
      if (failing) throw new Error("QuotaExceededError");
      store.set(k, v);
    },
  };
  const notice = { hidden: true };
  let blocked = true;
  let pending = [{ key: "programming-practice-recovery-v3", raw: "{bad" }];
  const saveFlow = (payload) => {
    try {
      if (blocked) {
        pending = retryPendingRecoveries(pending, storage);
        if (pending.length) throw new Error("protected");
        blocked = false;
      }
      storage.setItem("programming-practice-v3", payload);
      notice.hidden = true;
    } catch {
      notice.hidden = false;
    }
  };
  // While storage is down: notice shows, corrupted v3 is never overwritten.
  saveFlow("draft-1");
  assert.equal(notice.hidden, false);
  assert.equal(storage.getItem("programming-practice-v3"), null);
  // Storage recovers: preservation is retried first, then the save lands
  // and the stale failure notice is hidden (S-N1 + S-N2 together).
  failing = false;
  saveFlow("draft-2");
  assert.equal(storage.getItem("programming-practice-recovery-v3"), "{bad");
  assert.equal(storage.getItem("programming-practice-v3"), "draft-2");
  assert.equal(notice.hidden, true);
  assert.equal(blocked, false);
});
