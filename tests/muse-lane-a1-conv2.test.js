import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { loadAdvanced } from "../js/core/advanced-loader.js";
import { mergeCatalog } from "../js/core/catalog.js";
import { refsInTrace } from "../js/core/contract.js";
import {
  advancedActionHandlers,
  advancedStops,
} from "../js/types/uivision/advanced-engine.js";

// 高度A1班 収束判定ラウンド第2回・追加課題の回帰テスト。
// CONV2-A1-01: UI.Vision の高度コマンドは実行（ハンドラ照合・停止照合・
// classify）と scan では大文字小文字を区別せず正規名へ寄せるのに、
// trace refs だけが原文綴りのまま残り、実行後チップの照合（app.js の
// usedTraceNames は大小区別）から落ちていた。詳細は
// docs/audit/LANE-A1-CONV2.md。
// A3班の ImageJ 欠陥（trace 照合の基礎閉じ）とは機構が異なる: こちらは
// trace refs の「生成側」に基礎カタログでの絞り込みは無く、高度名の
// 正規化だけが refs 生成経路に欠けていた。

const ui = getDefinition("uivision");
const loaded = await loadAdvanced(ui);
const merged = mergeCatalog(
  {
    reference: ui.reference,
    templates: ui.templates,
    glossary: ui.glossary || [],
  },
  loaded,
);
ui.__catalogReference = merged.reference;
const engineModule = loaded.engineModule;
if (engineModule && typeof engineModule.applyAdvancedEngine === "function") {
  const hooked = engineModule.applyAdvancedEngine(ui, merged);
  if (hooked && hooked !== ui) {
    if (typeof hooked.scan === "function") ui.scan = hooked.scan;
    if (typeof hooked.simulate === "function") ui.simulate = hooked.simulate;
  }
}
const catalogNames = merged.reference.map((r) => r.name);

// app.js の resolveReferenceName と同一規則（完全一致→ドット接尾辞）。
function resolveReferenceName(name, referenceNames) {
  if (referenceNames.indexOf(name) >= 0) return name;
  const parts = name.split(".");
  for (let i = 1; i < parts.length; i++) {
    const candidate = parts.slice(i).join(".");
    if (referenceNames.indexOf(candidate) >= 0) return candidate;
  }
  return null;
}
const traceRefs = (r) => [
  ...new Set(r.paths.flatMap((p) => refsInTrace(p))),
];
const chipResolves = (r, name) =>
  traceRefs(r).some((n) => resolveReferenceName(n, catalogNames) === name);

const uc = (Command, Target = "", Value = "") => ({ Command, Target, Value });
const runU = async (cmds) =>
  ui.simulate(
    JSON.stringify({ Name: "m", Commands: cmds }),
    structuredClone(ui.model.defaults),
  );
const errOf = (r) =>
  r.error?.message ?? r.paths.map((p) => p.error?.message).find(Boolean);
const outOf = (r) => r.paths.flatMap((p) => (p.outputs ?? []).map((o) => o.text));

test("conv2-a1: uppercase advanced handler command executes and its canonical name reaches the post-execution chips", async () => {
  const r = await runU([
    uc("EXECUTESCRIPT", "return 1+1", "r"),
    uc("echo", "${r}"),
  ]);
  assert.equal(errOf(r), undefined);
  assert.deepEqual(outOf(r), ["2"]);
  assert.ok(traceRefs(r).includes("executeScript"));
  assert.ok(!traceRefs(r).includes("EXECUTESCRIPT"));
  assert.ok(chipResolves(r, "executeScript"));
});

test("conv2-a1: mixed-case advanced command also canonicalizes in trace refs", async () => {
  const r = await runU([
    uc("ExecuteScript", "return 1+1", "r"),
    uc("echo", "${r}"),
  ]);
  assert.equal(errOf(r), undefined);
  assert.ok(traceRefs(r).includes("executeScript"));
  assert.ok(chipResolves(r, "executeScript"));
});

test("conv2-a1: case-variant spelling of csvsave resolves to the catalog name csvsave", async () => {
  const r = await runU([uc("CSVSave", "data", "f.csv")]);
  assert.equal(errOf(r), undefined);
  assert.ok(traceRefs(r).includes("csvsave"));
  assert.ok(chipResolves(r, "csvsave"));
});

test("conv2-a1: advanced structural commands in variant case canonicalize (FOREACH / Do / REPEATIF)", async () => {
  const r1 = await runU([
    uc("executeScript_Sandbox", 'return ["a"];', "arr"),
    uc("FOREACH", "arr", "v"),
    uc("echo", "${v}"),
    uc("END"),
  ]);
  assert.equal(errOf(r1), undefined);
  assert.ok(traceRefs(r1).includes("forEach"));
  assert.ok(chipResolves(r1, "forEach"));

  const r2 = await runU([
    uc("store", "0", "i"),
    uc("Do"),
    uc("executeScript_Sandbox", "return ${i}+1;", "i"),
    uc("REPEATIF", "${i} < 3"),
    uc("echo", "${i}"),
  ]);
  assert.equal(errOf(r2), undefined);
  assert.ok(traceRefs(r2).includes("do"));
  assert.ok(traceRefs(r2).includes("repeatIf"));
  assert.ok(chipResolves(r2, "do"));
  assert.ok(chipResolves(r2, "repeatIf"));
});

test("conv2-a1: advanced stop in uppercase names the canonical command and keeps it in trace refs", async () => {
  const r = await runU([uc("GOTOIF", "true, l")]);
  assert.match(errOf(r) ?? "", /未対応：gotoIf（/);
  assert.ok(traceRefs(r).includes("gotoIf"));
  assert.ok(chipResolves(r, "gotoIf"));
});

test("conv2-a1: every advanced command name canonicalizes in trace refs when written in uppercase", async () => {
  const advNames = [
    ...new Set([
      ...Object.keys(advancedActionHandlers),
      ...Object.keys(advancedStops),
      "do",
      "repeatIf",
      "forEach",
    ]),
  ].filter((n) => catalogNames.includes(n));
  assert.equal(advNames.length, 108);
  const wrap = (name, spelled) => {
    const low = name.toLowerCase();
    if (low === "foreach")
      return [
        uc("executeScript_Sandbox", 'return ["a"];', "arr"),
        uc(spelled, "arr", "v"),
        uc("echo", "${v}"),
        uc("end"),
      ];
    if (low === "do") return [uc(spelled), uc("echo", "x"), uc("repeatIf", "false")];
    if (low === "repeatif") return [uc("do"), uc("echo", "x"), uc(spelled, "false")];
    return [uc(spelled, "x", "y")];
  };
  for (const name of advNames) {
    const r = await runU(wrap(name, name.toUpperCase()));
    assert.ok(
      traceRefs(r).includes(name),
      `${name}: 大文字形の trace refs に正規名が無い (${JSON.stringify(traceRefs(r))})`,
    );
    assert.ok(chipResolves(r, name), `${name}: チップ解決できない`);
  }
});

test("conv2-a1: canonical spellings and base names are unchanged in trace refs", async () => {
  const r = await runU([
    uc("store", "5", "x"),
    uc("executeScript", "return 1+1", "r"),
    uc("echo", "${x}${r}"),
  ]);
  assert.equal(errOf(r), undefined);
  assert.deepEqual(traceRefs(r), ["store", "executeScript", "echo"]);

  // D-5 の既存是正（elseIf→elseif）が壊れていないこと。
  const r2 = await runU([
    uc("store", "5", "x"),
    uc("if", "${x} == 6"),
    uc("echo", "A"),
    uc("elseIf", "${x} == 5"),
    uc("echo", "B"),
    uc("else"),
    uc("echo", "C"),
    uc("end"),
  ]);
  assert.equal(errOf(r2), undefined);
  assert.deepEqual(outOf(r2), ["B"]);
  assert.ok(traceRefs(r2).includes("elseif"));
  assert.ok(!traceRefs(r2).includes("elseIf"));
});
