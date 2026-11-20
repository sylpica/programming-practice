// 修正バッチ20（RG-681）の回帰テスト：出荷集合（precache）の分類欠陥。
//
// 欠陥：scripts/precache.mjs と sw.js が共有するファイル名パターン
// （「-advanced を含む .js」）で分類していたため、静的 import される
// 起動必須ファイル38件が precache から落ちていた。オンラインでは無症状
// だが、新世代の初回起動をオフラインで行うとランタイムキャッシュが空で
// 簡易モードでも白紙になる（ブラウザ残件モップアップ班が precache 集合
// のみの配信で起動不能を実証し、不足38件を足すと起動することを切り分け
// た。台帳 RG-681）。
//
// 是正後は分類を到達方法で行う。本テストは生成器とは独立に閉包と宣言を
// 再計算し、生成物（precache.js）と突き合わせる：
//   (1) 静的 import 閉包 ⊆ precache 収載集合
//   (2) ローダーが項目データ本体として宣言するファイルは precache に
//       入らず、遅延集合に入る（SP-21 の遅延読み込み契約）
//   (3) 全 js ファイルが収載集合と遅延集合のどちらか一方にだけ属する
//   (4) sw.js の判定が生成された遅延集合への所属であり、ファイル名
//       パターンではないこと
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseGenerated() {
  const src = readFileSync(join(ROOT, "precache.js"), "utf8");
  const grab = (name) =>
    JSON.parse(src.match(new RegExp(`self\\.${name}=(\\[.*?\\]);`, "s"))[1]).map(
      (p) => p.replace(/^\.\//, ""),
    );
  return {
    assets: new Set(grab("PROGRAMMING_ASSETS")),
    lazy: new Set(grab("PROGRAMMING_LAZY_ASSETS")),
  };
}

function walkJs(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walkJs(dir + "/" + e.name)
      : e.name.endsWith(".js")
        ? [dir + "/" + e.name]
        : [],
  );
}

// 生成器とは独立の実装で、入口からの到達閉包（静的 import＋リテラルな
// 動的 import）を再計算する。
function bootClosure() {
  const STATIC_RE =
    /(?:import|export)\s*(?:[^"';]*?\bfrom\s*)?["']([^"']+)["']/g;
  const DYN_RE = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  const seen = new Set();
  const queue = ["js/app.js", "js/worker.js"];
  while (queue.length) {
    const rel = queue.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const src = readFileSync(join(ROOT, rel), "utf8");
    for (const re of [STATIC_RE, DYN_RE])
      for (const m of src.matchAll(re)) {
        if (!m[1].startsWith(".")) continue;
        const target = join(dirname(rel), m[1]).split("\\").join("/");
        if (target.endsWith(".js")) queue.push(target);
      }
  }
  return seen;
}

// ローダー（js/core/advanced-loader.js）が項目データ本体として読みうる
// ファイルを、manifest の実物から再計算する（engineFile は静的合成され
// る種別があるため対象外）。
async function loaderDataFiles() {
  const DEFAULTS = {
    referenceParts: ["reference-advanced.js"],
    templatesFile: "templates-advanced.js",
    glossaryFile: "glossary-advanced.js",
  };
  const declared = new Set();
  for (const entry of readdirSync(join(ROOT, "js/types"), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const dir = "js/types/" + entry.name;
    let manifest = DEFAULTS;
    const manifestAbs = join(ROOT, dir, "advanced-manifest.js");
    if (existsSync(manifestAbs)) {
      const mod = await import(pathToFileURL(manifestAbs).href);
      const m = mod?.advancedManifest;
      if (m && typeof m === "object" && !Array.isArray(m))
        manifest = {
          referenceParts: Array.isArray(m.referenceParts)
            ? m.referenceParts
            : DEFAULTS.referenceParts,
          templatesFile:
            m.templatesFile === undefined
              ? DEFAULTS.templatesFile
              : m.templatesFile,
          glossaryFile:
            m.glossaryFile === undefined
              ? DEFAULTS.glossaryFile
              : m.glossaryFile,
        };
    }
    for (const name of [
      ...manifest.referenceParts,
      manifest.templatesFile,
      manifest.glossaryFile,
    ].filter((f) => typeof f === "string" && f)) {
      const p = dir + "/" + name;
      if (existsSync(join(ROOT, p))) declared.add(p);
    }
  }
  return declared;
}

test("precache: 静的 import 閉包は全て precache 収載集合に含まれる", () => {
  const { assets } = parseGenerated();
  const closure = bootClosure();
  const missing = [...closure].filter((f) => !assets.has(f));
  assert.deepEqual(missing, []);
});

test("precache: 欠陥で落ちていた起動必須ファイル38件が収載されている", () => {
  const { assets } = parseGenerated();
  // RG-681 の事故記録（モップアップ班の機械照合で特定された38件）。
  for (const f of [
    "js/types/autohotkey/semantics-advanced.js",
    "js/types/cmd/advanced-engine.js",
    "js/types/csharp/advanced-engine.js",
    "js/types/javascript/advanced-engine.js",
    "js/types/powerapps/semantics-advanced.js",
    "js/types/powershell/engine-advanced-cmdlets.js",
    "js/types/powershell/engine-advanced-ops.js",
    "js/types/powershell/engine-advanced-vars.js",
    "js/types/powershell/engine-advanced.js",
    "js/types/r/functions-advanced-char.js",
    "js/types/r/functions-advanced-data.js",
    "js/types/r/functions-advanced-math.js",
    "js/types/r/functions-advanced-mopup.js",
    "js/types/r/functions-advanced-statsdesc.js",
    "js/types/r/functions-advanced-statsdist.js",
    "js/types/r/functions-advanced-statsmisc.js",
    "js/types/r/functions-advanced-statsmodel.js",
    "js/types/r/functions-advanced-statstest.js",
    "js/types/r/functions-advanced-statsts.js",
    "js/types/r/functions-advanced-utilsdata.js",
    "js/types/r/functions-advanced-utilsmisc.js",
    "js/types/r/functions-advanced.js",
    "js/types/r/names-advanced-part1.js",
    "js/types/r/names-advanced-part10.js",
    "js/types/r/names-advanced-part2.js",
    "js/types/r/names-advanced-part3.js",
    "js/types/r/names-advanced-part4.js",
    "js/types/r/names-advanced-part5.js",
    "js/types/r/names-advanced-part6.js",
    "js/types/r/names-advanced-part7.js",
    "js/types/r/names-advanced-part8.js",
    "js/types/r/names-advanced-part9.js",
    "js/types/r/names-advanced.js",
    "js/types/r/reference-advanced-names.js",
    "js/types/uivision/advanced-engine.js",
    "js/types/vba/constants-advanced.js",
    "js/types/vba/functions-advanced.js",
    "js/types/vba/reference-advanced-names.js",
  ])
    assert.ok(assets.has(f), `precache 未収載: ${f}`);
});

test("precache: 項目データ本体は precache に入らず遅延集合に入る（SP-21）", async () => {
  const { assets, lazy } = parseGenerated();
  const declared = await loaderDataFiles();
  assert.ok(declared.size > 0);
  for (const f of declared) {
    assert.ok(!assets.has(f), `データ本体が precache に混入: ${f}`);
    assert.ok(lazy.has(f), `データ本体が遅延集合に無い: ${f}`);
  }
});

test("precache: 全 js ファイルは収載集合と遅延集合へ過不足なく振り分けられる", () => {
  const { assets, lazy } = parseGenerated();
  const all = walkJs("js");
  for (const f of all) {
    assert.ok(
      assets.has(f) !== lazy.has(f),
      `振り分けが一意でない（両方または両方なし）: ${f}`,
    );
  }
  const assetJs = [...assets].filter(
    (f) => f.startsWith("js/") && f.endsWith(".js"),
  );
  assert.equal(assetJs.length + lazy.size, all.length);
});

test("sw: 遅延判定は生成された遅延集合への所属でありファイル名パターンではない", () => {
  const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
  assert.ok(!sw.includes("ADVANCED_FILE_RE"), "名前パターンの残存");
  assert.ok(sw.includes("PROGRAMMING_LAZY_ASSETS"), "遅延集合を参照していない");
  // R-9 の世代結びつけ（ランタイムキャッシュ名＝precache 世代＋接尾辞）は不変。
  assert.ok(sw.includes('CACHE + "-advanced"'), "R-9 の世代結びつけが変わっている");
});
