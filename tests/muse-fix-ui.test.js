import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { definitions, getDefinition } from "../js/types/registry.js";
import { refsInTrace } from "../js/core/contract.js";

// js/app.js cannot be imported in Node (it drives the DOM at module level),
// so the pure helpers under test are extracted from its source and evaluated.
const appSource = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
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
    "resolveReferenceName",
    "usedTraceNames",
    "isWordChar",
    "linkSegments",
    "normalizeLineEndings",
    "fileDraft",
    "pickTemplateDraft",
    "mergeDraftsForSave",
    "mergeActivePrevious",
  ]) +
    "\nreturn { resolveReferenceName, usedTraceNames, isWordChar, linkSegments, normalizeLineEndings, fileDraft, pickTemplateDraft, mergeDraftsForSave, mergeActivePrevious };",
)();
const {
  resolveReferenceName,
  usedTraceNames,
  isWordChar,
  linkSegments,
  normalizeLineEndings,
  fileDraft,
  pickTemplateDraft,
  mergeDraftsForSave,
  mergeActivePrevious,
} = helpers;

const run = async (id, code, model) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(model || d.model.defaults));
};

// ---- RG-28: trace refs with a receiver resolve to reference names ----
test("RG-28 receiver-qualified trace refs resolve to reference names", () => {
  const jsNames = getDefinition("javascript").reference.map((r) => r.name);
  assert.equal(resolveReferenceName("same.push", jsNames), "push");
  assert.equal(
    resolveReferenceName("document.body.appendChild", jsNames),
    "appendChild",
  );
  assert.equal(resolveReferenceName("console.log", jsNames), "console.log");
  assert.equal(resolveReferenceName("length", jsNames), null);
  // RG-58 で let／const／var の項目が追加され、const は解決できるようになった。
  assert.equal(resolveReferenceName("const", jsNames), "const");
  assert.equal(resolveReferenceName("function", jsNames), null);
  const vbaNames = getDefinition("vba").reference.map((r) => r.name);
  // Exact dotted names win over their suffixes.
  assert.equal(resolveReferenceName("Debug.Print", vbaNames), "Debug.Print");
  assert.equal(resolveReferenceName("Err.Number", vbaNames), "Err.Number");
  assert.deepEqual(
    usedTraceNames(["same.push", "for", "same.push", "length"], jsNames),
    ["push", "for"],
  );
});

test("RG-28 used chips keep push / appendChild after running target templates", async () => {
  const d = getDefinition("javascript");
  const names = d.reference.map((r) => r.name);
  for (const [id, expected] of [
    ["js-array", "push"],
    ["js-build-summary", "appendChild"],
  ]) {
    const t = d.templates.find((t) => t.id === id);
    const r = await run("javascript", t.code, t.model);
    assert.ok(!r.error, JSON.stringify(r.error));
    const used = usedTraceNames(refsInTrace(r.paths[0]), names);
    assert.ok(used.includes(expected), id + " used=" + used.join(","));
  }
});

test("RG-28 cross-check: no other receiver-qualified refs resolve anywhere", async () => {
  const suffixResolved = [];
  for (const d of definitions) {
    const names = d.reference.map((r) => r.name);
    for (const t of d.templates) {
      const r = await run(d.id, t.code, t.model);
      if (r.error) continue;
      for (const p of r.paths || [])
        for (const raw of refsInTrace(p)) {
          const resolved = resolveReferenceName(raw, names);
          if (resolved && resolved !== raw)
            suffixResolved.push(d.id + ":" + raw + "->" + resolved);
        }
    }
  }
  assert.deepEqual([...new Set(suffixResolved)].sort(), [
    "javascript:document.body.appendChild->appendChild",
    "javascript:same.push->push",
  ]);
});

// ---- RG-29: inline links respect word boundaries ----
const linksOf = (text, names) =>
  linkSegments(text, names)
    .filter((s) => s.name)
    .map((s) => s.name);

test("RG-29 no links inside words, correct links preserved", () => {
  const pyNames = getDefinition("python").reference.map((r) => r.name);
  const rNames = getDefinition("r").reference.map((r) => r.name);
  const vbaNames = getDefinition("vba").reference.map((r) => r.name);
  const jsNames = getDefinition("javascript").reference.map((r) => r.name);
  assert.deepEqual(linksOf("空白の除去（strip）", pyNames), []);
  assert.deepEqual(linksOf("logicalの行選択", rNames), []);
  assert.deepEqual(linksOf("str を使う", pyNames), ["str"]);
  assert.deepEqual(linksOf("Debug.Printの出力", vbaNames), ["Debug.Print"]);
  assert.deepEqual(linksOf("For Eachで回す", vbaNames), ["For Each"]);
  assert.deepEqual(linksOf("values.push(4)", jsNames), ["push"]);
  assert.deepEqual(linksOf("", pyNames), []);
});

test("RG-29 scan of all template intros: preserve legacy links and reject mid-word links", () => {
  const legacyKinds = new Set(JSON.parse(fs.readFileSync(new URL("../docs/audit/reference-r2.json",import.meta.url))).map(r=>r.kind));
  let templates = 0,
    total = 0,
    midWord = 0, legacyTemplates = 0, legacyLinks = 0;
  for (const d of definitions) {
    const names = d.reference.map((r) => r.name);
    for (const t of d.templates) {
      templates++;
      const legacy = legacyKinds.has(d.id);
      if (legacy) legacyTemplates++;
      let pos = 0;
      for (const s of linkSegments(t.intro, names)) {
        if (s.name) {
          total++;
          if (legacy) legacyLinks++;
          const before = t.intro[pos - 1] || "",
            after = t.intro[pos + s.name.length] || "";
          if (isWordChar(before) || isWordChar(after)) midWord++;
          pos += s.name.length;
        } else pos += s.text.length;
      }
    }
  }
  assert.equal(templates, definitions.reduce((n,d)=>n+d.templates.length,0));
  assert.equal(legacyTemplates,88);
  assert.equal(midWord, 0);
  // RG-58 で let／const／var の項目が増え、解説文からのリンクが4件増えた（83→87）。
  // リファレンス完全性修正（RG-116〜RG-135）で A_Index／PI／return／TypeError／$／NA の
  // 項目が増え、解説文中の正当な言及がリンク化されて6件増えた（87→93）。
  // 修正バッチ2の T-1 是正で each テンプレートの intro が For Each へ2回言及するようになり1件増えた（93→94）。
  assert.equal(legacyLinks, 94);
  assert.ok(total >= legacyLinks);
});

// ---- RG-35: CR-only pasted source is normalized at the simulate entry ----
test("RG-35 normalizeLineEndings converts CRLF and CR to LF", () => {
  assert.equal(normalizeLineEndings("a\rb\r\nc\nd"), "a\nb\nc\nd");
  assert.equal(normalizeLineEndings("a\nb\n"), "a\nb\n");
  assert.equal(normalizeLineEndings(""), "");
});

test("RG-35 CR-only source behaves identically to LF after normalization", async () => {
  const summarize = (r) =>
    JSON.stringify({
      error: r.error || null,
      paths: (r.paths || []).map((p) => ({
        error: p.error || null,
        outputs: p.outputs,
        trace: p.trace.map((t) => [t.line, t.text]),
      })),
    });
  const cases = [
    ["javascript", "let a = 1;\nlet b = 2;\nconsole.log(missing);"],
    ["javascript", "let a = 1;\nconsole.log(a + 1);"],
    ["r", "x <- 1\nprint(x + 1)"],
    ["python", "x = 1\nprint(x + 1)"],
    [
      "vba",
      'Sub M()\n    Dim n As Long\n    n = 1\n    Debug.Print n\nEnd Sub',
    ],
  ];
  for (const [id, lf] of cases) {
    const cr = lf.replace(/\n/g, "\r");
    const expected = summarize(await run(id, lf));
    const actual = summarize(await run(id, normalizeLineEndings(cr)));
    assert.equal(actual, expected, id);
  }
  const jsError = await run(
    "javascript",
    normalizeLineEndings("let a = 1;\rlet b = 2;\rconsole.log(missing);"),
  );
  assert.equal((jsError.error || jsError.paths[0].error).line, 3);
});

// ---- RG-37: accessibility / semantic structure (source-level checks) ----
test("RG-37 reset button is not nested inside <summary>", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const summaryStart = html.indexOf('<summary class="panel-heading">');
  const summaryEnd = html.indexOf("</summary>", summaryStart);
  assert.ok(summaryStart >= 0 && summaryEnd > summaryStart);
  assert.ok(!html.slice(summaryStart, summaryEnd).includes("<button"));
  assert.equal(html.split('id="resetModel"').length - 1, 1);
  const resetAt = html.indexOf('id="resetModel"');
  assert.ok(resetAt > summaryEnd, "reset button must follow the summary");
  assert.ok(resetAt < html.indexOf('id="sheetWrap"'));
  assert.ok(html.slice(summaryEnd, resetAt).includes('class="model-body"'));
});

test("RG-37 reference articles use h2 on the reference view, h3 elsewhere", () => {
  assert.ok(appSource.includes('function refArticle(r, expanded = false, heading = "h3")'));
  assert.ok(appSource.includes('refArticle(r, false, "h2")'));
  // Practice-side usages keep the default h3 under their h2 panel headings.
  assert.ok(appSource.includes("box.append(refArticle(r, true))"));
  assert.ok(appSource.includes("refArticle(r, true).childNodes"));
});

// ---- RG-30: single records display / stringify as objects, not "[]" ----
test("RG-30 record built by member assignment displays as a record", async () => {
  const outs = async (code) => {
    const r = await run("javascript", code);
    assert.ok(!r.error, JSON.stringify(r.error));
    return r.paths[0].outputs.map((o) => o.text);
  };
  assert.deepEqual(await outs("let o = {}; o.a = 1; console.log(o);"), [
    '{\n  "a": 1\n}',
  ]);
  assert.deepEqual(
    await outs("let o = {}; o.a = 1; console.log(JSON.stringify(o));"),
    ['{"a":1}'],
  );
  assert.deepEqual(
    await outs("let o = {}; o.a = 1; console.log([o]); console.log(JSON.stringify([o]));"),
    ['[\n  {\n    "a": 1\n  }\n]', '[{"a":1}]'],
  );
  const r = await run("javascript", "let o = {}; o.a = 1; console.log(o);");
  assert.deepEqual(r.paths[0].groups[0].entries, [
    ["o", '{\n  "a": 1\n}'],
  ]);
});

test("RG-30 genuine arrays and record literals keep their display", async () => {
  const outs = async (code) => {
    const r = await run("javascript", code);
    assert.ok(!r.error, JSON.stringify(r.error));
    return r.paths[0].outputs.map((o) => o.text);
  };
  assert.deepEqual(
    await outs("console.log([1, 2]); console.log(JSON.stringify([1, 2]));"),
    ["[\n  1,\n  2\n]", "[1,2]"],
  );
  assert.deepEqual(
    await outs("let a = [1, 2]; a.push(3); console.log(a);"),
    ["[\n  1,\n  2,\n  3\n]"],
  );
  assert.deepEqual(
    await outs("console.log({a: 1}); console.log(JSON.stringify({a: 1}));"),
    ['{\n  "a": 1\n}', '{"a":1}'],
  );
  assert.deepEqual(await outs("console.log([]);"), ["[]"]);
});

// ---- RG-51 (display side): BigInt values use real JS n-suffixed notation ----
// The shared parser's BigInt literal support is owned by the core team, so
// these tests inject BigInt values through model variables, which exercises
// the same display paths the literal form will use once parsing lands.
test("RG-51 BigInt display in console.log, final state and conversions", async () => {
  const d = getDefinition("javascript");
  const model = () => {
    const m = structuredClone(d.model.defaults);
    m.variables = { x: 10n, arr: [10n] };
    return m;
  };
  const outs = async (code) => {
    const r = await d.simulate(code, model());
    assert.ok(!r.error, JSON.stringify(r.error));
    return r.paths[0];
  };
  assert.deepEqual((await outs("console.log(x);")).outputs.map((o) => o.text), ["10n"]);
  assert.deepEqual((await outs("console.log(x + x);")).outputs.map((o) => o.text), ["20n"]);
  assert.deepEqual((await outs("console.log(typeof x);")).outputs.map((o) => o.text), ["bigint"]);
  // String() conversion follows real JavaScript: no trailing n.
  assert.deepEqual((await outs("console.log(String(x));")).outputs.map((o) => o.text), ["10"]);
  // Final state shows the n suffix and no longer fails on BigInt in arrays.
  const p = await outs("console.log(x);");
  assert.deepEqual(p.groups[0].entries[0], ["x", "10n"]);
  assert.match(p.groups[0].entries[1][1], /10n/);
});

test("RG-51 JSON.stringify of BigInt stops with an honest TypeError", async () => {
  const d = getDefinition("javascript");
  const m = structuredClone(d.model.defaults);
  m.variables = { x: 10n };
  const r = await d.simulate("console.log(JSON.stringify(x));", m);
  const err = r.error || r.paths[0].error;
  assert.equal(err.category, "TypeError");
  assert.match(err.message, /BigInt/);
  assert.doesNotMatch(err.message, /循環参照/);
});

// RG-57: 下書きは由来テンプレートごとに保持され、2件目の編集で消えない
test("RG-57 drafts are filed per origin template and both survive", () => {
  const snap = (code, origin) => ({
    code,
    templateId: "",
    auto: false,
    sort: "original",
    pathId: undefined,
    model: {},
    modelText: null,
    draftOrigin: origin,
  });
  let entry = fileDraft({}, snap("A edited", "tpl-a"), "tpl-a");
  entry = fileDraft(entry, snap("B edited", "tpl-b"), "tpl-b");
  assert.equal(pickTemplateDraft(entry, "tpl-a").code, "A edited");
  assert.equal(pickTemplateDraft(entry, "tpl-b").code, "B edited");
  // 自由編集は freeDraft に入り、テンプレート下書きを消さない
  entry = fileDraft(entry, snap("free text", ""), "");
  assert.equal(entry.freeDraft.code, "free text");
  assert.equal(pickTemplateDraft(entry, "tpl-a").code, "A edited");
  // 下書きスナップショット自体に freeDraft／byTemplate は混入しない
  assert.equal(entry.byTemplate["tpl-a"].byTemplate, undefined);
  assert.equal(entry.byTemplate["tpl-a"].freeDraft, undefined);
  assert.equal(pickTemplateDraft(entry, "tpl-unknown"), null);
  assert.equal(pickTemplateDraft(undefined, "tpl-a"), null);
});

// RG-86: 複数タブで開いたとき、他タブの下書きが保存の丸ごと上書きで
// 無言消失しない。変更した種類は自分の版、未変更の種類は保存済み版、
// 同じ種類の別テンプレート下書きは和集合で残る。
test("RG-86 mergeDraftsForSave keeps other tabs' drafts of untouched types", () => {
  const base = { python: { code: "p0" }, r: { code: "r0" } };
  const mine = { python: { code: "p1" }, r: { code: "r0" } };
  const stored = { python: { code: "p0" }, r: { code: "rB" }, vba: { code: "vB" } };
  const merged = mergeDraftsForSave(base, mine, stored, "python");
  assert.deepEqual(merged.python, { code: "p1" }); // 自分が変更 → 自分の版
  assert.deepEqual(merged.r, { code: "rB" }); // 未変更 → 他タブの版
  assert.deepEqual(merged.vba, { code: "vB" }); // 他タブの新規種類も残る
});
test("RG-86 mergeDraftsForSave without stored data keeps in-memory drafts", () => {
  const base = { python: { code: "p0" } };
  const mine = { python: { code: "p1" }, r: { code: "r1" } };
  assert.deepEqual(mergeDraftsForSave(base, mine, null, "python"), mine);
});
test("RG-86 mergeActivePrevious unions template drafts of the same type", () => {
  const baseEntry = { byTemplate: { a: { code: "a0" } }, freeDraft: { code: "f0" } };
  const mineEntry = { byTemplate: { a: { code: "a1" } }, freeDraft: { code: "f0" } };
  const storedEntry = { byTemplate: { a: { code: "a0" }, b: { code: "bB" } }, freeDraft: { code: "fB" } };
  const merged = mergeActivePrevious(baseEntry, mineEntry, storedEntry);
  assert.deepEqual(merged.byTemplate.a, { code: "a1" }); // 自分のスロットは自分の版
  assert.deepEqual(merged.byTemplate.b, { code: "bB" }); // 他タブの別テンプレートが残る
  assert.deepEqual(merged.freeDraft, { code: "fB" }); // freeDraft 未変更なら他タブの版
  const mineFree = { byTemplate: {}, freeDraft: { code: "f1" } };
  const merged2 = mergeActivePrevious(baseEntry, mineFree, storedEntry);
  assert.deepEqual(merged2.freeDraft, { code: "f1" }); // 自分が変更したら自分の版
  assert.deepEqual(mergeActivePrevious(baseEntry, mineEntry, null), mineEntry);
});

// RG-84: テンプレートのタイトルにレベル語を内包しない（UI が別途付ける
// レベルと二重表示にならない）。全種類・全テンプレートを走査する。
test("RG-84 no template title embeds its own level word", () => {
  for (const d of definitions) {
    for (const t of d.templates) {
      if (!t.level) continue;
      assert.ok(!t.title.startsWith(t.level), `${d.id}/${t.id}: ${t.title}`);
      assert.ok(!t.title.startsWith(`【${t.level}】`), `${d.id}/${t.id}: ${t.title}`);
      assert.ok(!t.title.includes(`${t.level} · `), `${d.id}/${t.id}: ${t.title}`);
    }
  }
  const ij = getDefinition("imagej");
  assert.equal(ij.templates[3].title, "関数の定義");
  assert.equal(ij.templates[3].level, "基礎");
  const vba = getDefinition("vba");
  assert.equal(vba.templates.find((t) => t.id === "cells").title, "セルに値を入れる");
  assert.equal(vba.templates.find((t) => t.id === "cells").level, "基礎");
  assert.equal(vba.templates.find((t) => t.id === "if").title, "点数で条件分岐");
});

// RG-83／RG-85: エディタのキーボード案内と、並び順ラベル（実指標は手順数）。
test("RG-83/RG-85 index.html carries the editor key hint and step-based sort labels", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes("Esc の次に Tab：エディタ外へ移動"), "editor key hint");
  assert.ok(html.includes('<option value="long">手順が多い順</option>'));
  assert.ok(html.includes('<option value="short">手順が短い順</option>'));
  assert.ok(!html.includes("コードが長い順"));
});
