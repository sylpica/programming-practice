// FIX-SH（画面開示・scanチップ）回帰テスト: 欠陥 T5-D01 の是正を固定する。
//
// 欠陥: 実行前の使用中チップ（scan 経路、「コード全体」スコープ）で、
// ImageJ／PowerShell の scan が基礎カタログに対してのみ名前照合していた
// ため、高度モードでも高度専用項目（IJ: doCommand 等、PS: Get-History 等）
// がチップに一切現れなかった。機構（app.js／worker.js）は合成カタログを
// definition.__catalogReference へ差し込むが、両 scan はそれを見ていなかった。
// 是正: 両 scan の照合先を（__catalogReference || 基礎カタログ）にする
// （cmd／Python／UI.Vision の既存先例と同じ形）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as ij } from "../js/types/imagej/index.js";
import { definition as ps } from "../js/types/powershell/index.js";
import {
  loadAdvanced,
  clearAdvancedCache,
} from "../js/core/advanced-loader.js";
import { mergeCatalog } from "../js/core/catalog.js";

// 機構（app.js の applyCatalog／worker.js の activateAdvanced）と同じ手順で
// 合成カタログ（loadAdvanced → mergeCatalog）を構築する。
async function mergedReference(def) {
  clearAdvancedCache();
  const adv = await loadAdvanced(def);
  assert.deepEqual(
    adv.failed,
    [],
    def.id + " の高度差分読み込みに失敗があってはならない",
  );
  const merged = mergeCatalog(
    { reference: def.reference, templates: def.templates, glossary: def.glossary },
    adv,
  );
  return merged.reference;
}

test("SH-IJ-1: 合成カタログ差し込みで IJ scan が高度専用項目を拾う", async () => {
  const merged = await mergedReference(ij);
  assert.ok(
    merged.some((r) => r.name === "doCommand"),
    "前提: 合成カタログに高度専用項目 doCommand が含まれる",
  );
  ij.__catalogReference = merged;
  try {
    // 監査 T5-D01 の再現コード: 修正前は [] （チップ「該当する項目はありません。」）
    assert.deepEqual(ij.scan('doCommand("Quit");'), ["doCommand"]);
    // 基礎項目も合成カタログ経由で従来どおり拾える
    assert.deepEqual(ij.scan('eval("x");'), ["eval"]);
    // ドット名の高度項目も、呼び出し形（名前(）の照合のまま拾える
    const fourier = ij.scan("a = newArray(1, 2); b = Array.fourier(a);");
    assert.ok(fourier.includes("Array.fourier"), JSON.stringify(fourier));
    assert.ok(fourier.includes("newArray"), JSON.stringify(fourier));
    const fit = ij.scan('Fit.doFit("Straight Line", x, y);');
    assert.ok(fit.includes("Fit.doFit"), JSON.stringify(fit));
  } finally {
    delete ij.__catalogReference;
  }
});

test("SH-PS-1: 合成カタログ差し込みで PS scan が高度専用項目を拾う", async () => {
  const merged = await mergedReference(ps);
  assert.ok(
    merged.some((r) => r.name === "Get-History"),
    "前提: 合成カタログに高度専用項目 Get-History が含まれる",
  );
  ps.__catalogReference = merged;
  try {
    // 監査 T5-D01 の再現コード: 修正前はいずれも含まれなかった
    assert.ok(ps.scan("Get-History").includes("Get-History"));
    assert.ok(ps.scan("Get-Verb").includes("Get-Verb"));
    assert.ok(ps.scan("1 | ConvertTo-Html").includes("ConvertTo-Html"));
    // 既存の擬似チップ（変数・文字列・パイプライン）の挙動は維持する
    const pseudo = ps.scan('$x = "abc" | ConvertTo-Html');
    for (const name of ["変数", "文字列", "パイプライン", "ConvertTo-Html"])
      assert.ok(pseudo.includes(name), name + " missing: " + JSON.stringify(pseudo));
  } finally {
    delete ps.__catalogReference;
  }
});

test("SH-BASE-1: __catalogReference 未設定では基礎項目のみ（簡易モード無傷）", () => {
  delete ij.__catalogReference;
  delete ps.__catalogReference;
  assert.deepEqual(ij.scan('doCommand("Quit");'), []);
  assert.deepEqual(ij.scan('eval("x");'), ["eval"]);
  assert.ok(!ps.scan("Get-History").includes("Get-History"));
  assert.ok(!ps.scan("Get-Verb").includes("Get-Verb"));
  assert.deepEqual(ps.scan("Get-Content file.txt"), ["Get-Content"]);
});

test("SH-BASE-2: 基礎カタログ差し込み（簡易モードの機構動作）でも高度項目は出ない", () => {
  // app.js の switchType は簡易モードで active.__catalogReference に
  // 基礎カタログ（active.reference）を差し込む。その状態でも従来どおり。
  ij.__catalogReference = ij.reference;
  ps.__catalogReference = ps.reference;
  try {
    assert.deepEqual(ij.scan('doCommand("Quit");'), []);
    assert.deepEqual(ij.scan('eval("x");'), ["eval"]);
    assert.ok(!ps.scan("Get-History").includes("Get-History"));
  } finally {
    delete ij.__catalogReference;
    delete ps.__catalogReference;
  }
});
