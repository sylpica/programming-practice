import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { applyAdvancedEngine } from '../js/types/imagej/advanced-engine.js';

// 簡易モード監査ライン（lane-simple）実行フェーズの回帰テスト。
// 対象は台帳 RG-606／RG-607（B3 申し送りの基礎側不整合2件＝KD-1／KD-2）と
// RG-634（R の NA 名 print 表示 artifact）。
// 期待値は一次情報からブラインドに導いたものだけを書く：
// - KD-1: Functions.java の getResult（第3引数＝結果表タイトル、
//   getResultsTable(title) で解決、列が無ければ NaN、文字列セルは
//   Double.parseDouble で解釈）と、高度側 resolveTable の解決規則。
// - KD-2: functions.html の Color.getLut／Color.setLut（現在の画像の
//   ルックアップテーブルを出し入れする）と、高度側 getLut の解決規則。
// - RG-634: 基礎層 names<- が NA 名を内部 null で保持し表示で prefix を
//   出さない既存規約（簡易モードの確定挙動）。names() の意味論は不変。

const ij = getDefinition('imagej');
applyAdvancedEngine(ij);
const runIJ = async (code, model) => ij.simulate(code, model || structuredClone(ij.model.defaults));
const ijErrors = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const ijFirst = async (code, model) => {
  const r = await runIJ(code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r.paths?.length));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const ijOut = (p) => p.outputs.map((o) => o.text);

/* KD-1: 基礎 getResult が名前付き結果表へ到達できること */
test('KD-1 getResult reads a named results table by title', async () => {
  const p = await ijFirst('Table.create("ProbeTable");\nTable.set("X", 0, 42);\nprint(getResult("X", 0, "ProbeTable"));');
  assert.deepEqual(ijOut(p), ['42']);
});
test('KD-1 getResult on the default Results table is unchanged (omitted and explicit title)', async () => {
  const p = await ijFirst('setResult("Y", 0, 7);\nprint(getResult("Y", 0));\nprint(getResult("Y", 0, "Results"));');
  assert.deepEqual(ijOut(p), ['7', '7']);
});
test('KD-1 getResult with a nonexistent title still stops by name', async () => {
  const r = await runIJ('print(getResult("X", 0, "NoSuchTable"));\nprint("after");');
  assert.ok(ijErrors(r).length);
  assert.ok(JSON.stringify(ijErrors(r)).includes('NoSuchTable'));
  assert.ok(!(r.paths || []).some((p) => ijOut(p).includes('after')));
});
test('KD-1 getResult on a named table: missing column is NaN, string cell is parsed', async () => {
  const p = await ijFirst('Table.create("T2");\nTable.set("X", 0, 1);\nTable.set("N", 0, "3.5");\nprint(isNaN(getResult("Z", 0, "T2")));\nprint(getResult("N", 0, "T2"));');
  assert.deepEqual(ijOut(p), ['1', '3.5']);
});
test('KD-1 getResult on a named table: row out of range stops', async () => {
  const r = await runIJ('Table.create("T2");\nTable.set("X", 0, 1);\nprint(getResult("X", 5, "T2"));\nprint("after");');
  assert.ok(ijErrors(r).length);
  // 範囲外の原因文は trace の error エントリに表タイトルつきで出る
  assert.ok(JSON.stringify(r.paths[0].trace).includes('結果表「T2」は現在 1 行です'));
  assert.ok(!(r.paths || []).some((p) => ijOut(p).includes('after')));
});
test('KD-1 getResult follows IJ.renameResults: new title resolves, old title no longer does', async () => {
  const p = await ijFirst('setResult("Y", 0, 7);\nIJ.renameResults("Renamed");\nprint(getResult("Y", 0, "Renamed"));\nprint(getResult("Y", 0));');
  assert.deepEqual(ijOut(p), ['7', '7']);
  const r = await runIJ('setResult("Y", 0, 7);\nIJ.renameResults("Renamed");\nprint(getResult("Y", 0, "Results"));');
  assert.ok(ijErrors(r).length);
});

/* KD-2: 基礎 Color.getLut が setLut／Color.setLut で保持した LUT を返すこと */
const lutSetup = 'r = Array.getSequence(256); g = Array.getSequence(256); b = Array.getSequence(256);\nr[0] = 255; r[255] = 0; g[10] = 99;\n';
test('KD-2 Color.getLut returns the LUT set by Color.setLut', async () => {
  const p = await ijFirst(lutSetup + 'Color.setLut(r, g, b);\nColor.getLut(r2, g2, b2);\nprint(r2[0]);\nprint(r2[255]);\nprint(g2[10]);');
  assert.deepEqual(ijOut(p), ['255', '0', '99']);
});
test('KD-2 Color.getLut returns the LUT set by plain setLut (cross-form consistency)', async () => {
  const p = await ijFirst(lutSetup + 'setLut(r, g, b);\nColor.getLut(r2, g2, b2);\nprint(r2[0]);\nprint(r2[255]);\nprint(g2[10]);');
  assert.deepEqual(ijOut(p), ['255', '0', '99']);
});
test('KD-2 Color.getLut without any setLut still returns the identity LUT (control)', async () => {
  const p = await ijFirst('Color.getLut(r2, g2, b2);\nprint(r2[0]);\nprint(r2[255]);\nprint(g2[10]);');
  assert.deepEqual(ijOut(p), ['0', '255', '10']);
});

/* RG-634: NA を含む名前属性の print 表示に [object Object] が出ないこと */
const rd = getDefinition('r');
const runR = async (code) => rd.simulate(code, structuredClone(rd.model.defaults));
const rFirst = async (code) => {
  const r = await runR(code);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const rOut = (p) => p.outputs.map((o) => o.text);

test('RG-634 print of a setNames vector with NA-filled names has no [object Object]', async () => {
  const p = await rFirst('x <- setNames(c(1, 2, 3), "a")\nprint(x)');
  assert.deepEqual(rOut(p), ['c(a = 1, 2, 3)']);
});
test('RG-634 print with digits (showFormatted path) also has no [object Object]', async () => {
  const p = await rFirst('x <- setNames(c(1.5, 2.5, 3.5), "a")\nprint(x, digits = 3)');
  assert.deepEqual(rOut(p), ['c(a = 1.5, 2.5, 3.5)']);
});
test('RG-634 names() semantics are unchanged (NA names still return as NA)', async () => {
  const p = await rFirst('x <- setNames(c(1, 2, 3), "a")\nprint(names(x))');
  assert.deepEqual(rOut(p), ['c("a", NA, NA)']);
});
test('RG-634 base names<- route display is unchanged (control)', async () => {
  const p = await rFirst('x <- c(1, 2)\nnames(x) <- c("a", NA)\nprint(x)');
  assert.deepEqual(rOut(p), ['c(a = 1, 2)']);
});
test('RG-634 fully named vector display is unchanged (control)', async () => {
  const p = await rFirst('x <- setNames(c(1, 2, 3), c("a", "b", "c"))\nprint(x)');
  assert.deepEqual(rOut(p), ['c(a = 1, b = 2, c = 3)']);
});
