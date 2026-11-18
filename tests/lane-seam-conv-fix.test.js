// 収束ラウンド横断班（lane-seam-conv）の SP-21 欠陥修正の回帰テスト。
// 欠陥：VBA／R の index.js が高度項目データ本体（reference-advanced.js）を
// 静的 import していたため、簡易モードでも高度差分データ（約1.19MB）が
// ダウンロードされていた（契約 7.1／SP-21 違反）。
// 修正：名前照合に必要なのは名前だけのため、名前だけの照合表
// （reference-advanced-names.js）を静的に読み、データ本体はローダーの
// 遅延読み込みへ戻した。A4-F-04 の caution 開示はデータ側へ移設（内容同一）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDefinition } from "../js/types/registry.js";
import { mergeCatalog } from "../js/core/catalog.js";
import {
  referenceAdvanced as vbaAdvanced,
  referenceOverrides as vbaOverrides,
} from "../js/types/vba/reference-advanced.js";
import { referenceAdvancedNames as vbaNames } from "../js/types/vba/reference-advanced-names.js";
import { referenceAdvanced as rAdvanced } from "../js/types/r/reference-advanced.js";
import { referenceAdvancedNames as rNames } from "../js/types/r/reference-advanced-names.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("SP-21: VBA／R の index.js は高度データ本体を静的 import しない", () => {
  for (const p of ["js/types/vba/index.js", "js/types/r/index.js"]) {
    const src = readFileSync(join(ROOT, p), "utf8");
    assert.ok(
      !/from\s*["']\.\/reference-advanced\.js["']/.test(src),
      `${p} must not statically import reference-advanced.js`,
    );
    assert.ok(
      src.includes("./reference-advanced-names.js"),
      `${p} should use the names-only table`,
    );
  }
});

test("SP-21: 静的 import グラフに VBA／R の高度データ本体が到達しない", () => {
  const IMPORT_RE =
    /(?:import|export)[^"']*?from\s*["'](\.[^"']+)["']|import\s*["'](\.[^"']+)["']/g;
  const seen = new Set();
  const queue = ["js/types/registry.js", "js/app.js", "js/worker.js"].map((p) =>
    join(ROOT, p),
  );
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    let src;
    try {
      src = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    let m;
    while ((m = IMPORT_RE.exec(src))) {
      const target = resolve(dirname(f), m[1]);
      if (target.endsWith(".js")) queue.push(target);
    }
  }
  const bad = [...seen].filter(
    (f) =>
      /types\/(vba|r)\/reference-advanced/.test(f) &&
      !f.endsWith("reference-advanced-names.js"),
  );
  assert.deepEqual(bad, []);
});

test("SP-21: 名前照合表はデータ本体と完全同期している（VBA）", () => {
  assert.deepEqual(
    vbaNames,
    [...vbaOverrides, ...vbaAdvanced].map((r) => r.name),
  );
});

test("SP-21: 名前照合表はデータ本体と完全同期している（R）", () => {
  assert.deepEqual(
    rNames,
    rAdvanced.map((r) => r.name),
  );
});

test("SP-21: VBA の高度名は scan で従来どおり解決される", () => {
  const vba = getDefinition("vba");
  assert.ok(vba.scan('x = Asc("A")').includes("Asc"));
  assert.ok(vba.scan('x = Format(1.5, "0.0")').includes("Format"));
  assert.ok(
    vba.scan("x = FileAttributeConstants.Normal").includes(
      "FileAttributeConstants.Normal",
    ),
  );
  const refs = vba.scan("Debug.Print 1");
  assert.ok(refs.includes("Debug.Print"));
  assert.ok(!refs.includes("Print #"));
});

test("SP-21: R の高度名・ドット名は scan で従来どおり解決される", () => {
  const r = getDefinition("r");
  assert.ok(r.scan("print(abbreviate(x, 2))").includes("abbreviate"));
  assert.ok(r.scan("print(is.na(x))").includes("is.na"));
  assert.ok(r.scan('df <- read.csv("model.csv")').includes("read.csv"));
  assert.ok(r.scan("x <- as.data.frame(y)").includes("as.data.frame"));
  assert.ok(r.scan('print(setNames(c(1, 2, 3), "a"))').includes("setNames"));
});

test("SP-21: A4-F-04 の caution 開示はデータ側でも従来と同一に保たれる", () => {
  const vba = getDefinition("vba");
  const merged = mergeCatalog(
    { reference: vba.reference, templates: vba.templates, glossary: vba.glossary },
    { referenceAdvanced: vbaAdvanced, referenceOverrides: vbaOverrides },
  );
  const byName = (n) => merged.reference.find((r) => r.name === n);
  assert.ok(byName("VarType").caution.includes("Double として保持"));
  assert.ok(byName("VarType").caution.includes("vbDouble（5）"));
  assert.ok(byName("TypeName").caution.includes("Double として保持"));
  assert.ok(byName("Hex").caution.includes("最小の型の幅"));
  assert.ok(byName("Oct").caution.includes("最小の型の幅"));
  assert.equal(merged.reference.length, 539);
});
