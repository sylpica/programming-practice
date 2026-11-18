// 収束判定ラウンド第2回 A3班 回帰テスト: ImageJ 実行後チップ（trace 経路）の
// 高度専用関数の欠落を固定する。
//
// 欠陥: 高度モードで高度専用関数（Color.toString 等）を実行しても、
// 実行後の使用中チップ（スコープ「表示中のパス」）にその関数が現れなかった。
// 原因は simulate の trace 変換が、ステップの used（実際に呼ばれた関数名）を
// 基礎カタログ（reference）だけで照合していたこと。実行前チップの scan は
// FIX-SH で有効カタログ（definition.__catalogReference）照合に是正済みだったが、
// trace 側に同根の基礎閉じが残っていた。
// 是正: trace の refs 照合も（__catalogReference || 基礎カタログ）にする
// （scan の FIX-SH と同じ形）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as ij } from "../js/types/imagej/index.js";
import { applyAdvancedEngine } from "../js/types/imagej/advanced-engine.js";
import {
  loadAdvanced,
  clearAdvancedCache,
} from "../js/core/advanced-loader.js";
import { mergeCatalog } from "../js/core/catalog.js";
import { refsInTrace } from "../js/core/contract.js";

applyAdvancedEngine(ij);

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

const run = async (code) =>
  ij.simulate(code, structuredClone(ij.model.defaults));

test("CONV2-IJ-1: 高度専用関数が実行後チップ（trace refs）に現れる", async () => {
  const merged = await mergedReference(ij);
  assert.ok(
    merged.some((r) => r.name === "Color.toString"),
    "前提: 合成カタログに高度専用項目 Color.toString が含まれる",
  );
  assert.ok(
    !ij.reference.some((r) => r.name === "Color.toString"),
    "前提: Color.toString は基礎カタログには無い",
  );
  ij.__catalogReference = merged;
  try {
    // 収束第2回の再現コード（実ブラウザでも実行後チップに print しか
    // 現れなかった）: 修正前は refs = ["print"] のみ
    const r = await run("s = Color.toString(255, 0, 0); print(s);");
    const refs = refsInTrace(r.paths[0]);
    assert.ok(refs.includes("Color.toString"), JSON.stringify(refs));
    assert.ok(refs.includes("print"), JSON.stringify(refs));
    // 同根のほかの高度専用関数（配列・表）でも欠落しない
    const r2 = await run(
      "a = Array.concat(newArray(1, 2), newArray(3)); print(a[0]);",
    );
    assert.ok(
      refsInTrace(r2.paths[0]).includes("Array.concat"),
      JSON.stringify(refsInTrace(r2.paths[0])),
    );
    const r3 = await run(
      'setResult("Value", 0, 7); v = Table.get("Value", 0); print(v);',
    );
    assert.ok(
      refsInTrace(r3.paths[0]).includes("Table.get"),
      JSON.stringify(refsInTrace(r3.paths[0])),
    );
    // 基礎項目は合成カタログ経由でも従来どおり現れる
    const r4 = await run("x = Math.pow(2, 10); print(x);");
    assert.ok(refsInTrace(r4.paths[0]).includes("Math.pow"));
  } finally {
    delete ij.__catalogReference;
  }
});

test("CONV2-IJ-2: カタログ未差し込みでは基礎照合のまま（簡易モード不変）", async () => {
  delete ij.__catalogReference;
  const r = await run("x = Math.pow(2, 10); print(x);");
  const refs = refsInTrace(r.paths[0]);
  assert.ok(refs.includes("Math.pow"), JSON.stringify(refs));
  assert.ok(refs.includes("print"), JSON.stringify(refs));
});
