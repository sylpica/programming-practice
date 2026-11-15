import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

// 修正バッチ5（ImageJ班）: R26-N9／N10／N11／N12 の回帰テスト。
// 一次情報: ij/macro/Functions.java（リポジトリ記録ハッシュ
// b8e62f4fe54e2ea5de437a9be7e6073f3c60a883370a43216d7cd16cb9f531f9 と一致する版）の
// getArg／getFirstArg／getNextArg／getLastArg（数値引数は getExpression で読み、
// Variable.getValue() が文字列を数値へ変換する）、d2s＝IJ.d2s(getFirstArg(),
// (int)getLastArg())、parseInt の radix＝(int)interp.getExpression()、
// setMinAndMax＝getFirstArg／getNextArg、fromCharCode＝(int)interp.getExpression()
// の繰り返し、math／math2、close()（パターンは getString()、WildcardMatch は
// 大文字小文字を区別しない、"\\Others" は最前面以外、一致なしは何も閉じない）、
// RESET_THRESHOLD＝interp.getParens()（引数なし）と、本アプリ自身のリファレンス
// （close 項目: パターン一致・close("*")・close("\\Others") の説明）。
const d = getDefinition('imagej');
const run = async (code, model) => d.simulate(code, model || structuredClone(d.model.defaults));
const errors = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const first = async (code, model) => {
  const r = await run(code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r.paths?.length));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const outputs = (p) => p.outputs.map((o) => o.text);
const HOST = /Cannot read properties|Cannot set properties|is not a function|is not defined/;

/* R26-N9: simNumArg 未適用の残存表面（誤値・虚偽原因側） */
test('R26-N9 d2s decimal places given as a string numeric are honored', async () => {
  const p = await first('print(d2s(1.23456, "2"));');
  assert.deepEqual(outputs(p), ['1.23']);
});
test('R26-N9 d2s value given as a string numeric is converted too', async () => {
  const p = await first('print(d2s("1.23456", 2));');
  assert.deepEqual(outputs(p), ['1.23']);
});
test('R26-N9 d2s numeric form is unchanged', async () => {
  const p = await first('print(d2s(1.23456, 2));');
  assert.deepEqual(outputs(p), ['1.23']);
});
test('R26-N9 parseInt radix given as a string numeric is interpreted', async () => {
  const p = await first('print(parseInt("ff", "16")); print(parseInt("42", "10"));');
  assert.deepEqual(outputs(p), ['255', '42']);
});
test('R26-N9 setResult with a string numeric row writes that row (no false out-of-range)', async () => {
  const p = await first('setResult("Area", "0", 42); print(getResult("Area", 0));');
  assert.deepEqual(outputs(p), ['42']);
});
test('R26-N9 setResult with a genuinely out-of-range string row still stops with the true cause', async () => {
  const r = await run('setResult("Area", "5", 7); print("after");');
  assert.ok(errors(r).some((e) => /setResult の行（5）が結果表の範囲外です/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R26-N9 setMinAndMax with string numeric bounds stores numbers', async () => {
  const p = await first('setMinAndMax(0, "100"); getMinAndMax(mn, mx); print(mn); print(mx);');
  assert.deepEqual(outputs(p), ['0', '100']);
  const p2 = await first('setMinAndMax("10", "100"); getMinAndMax(mn, mx); print(mn); print(mx);');
  assert.deepEqual(outputs(p2), ['10', '100']);
});

/* R26-N10: simNumArg 未適用の残存表面（未確定化側） */
test('R26-N10 getResult with a string numeric row returns the value', async () => {
  const p = await first('run("Measure"); print(getResult("Area", "0"));');
  assert.deepEqual(outputs(p), ['262144']);
});
test('R26-N10 getResultLabel with a string numeric row returns the label', async () => {
  const p = await first('run("Measure"); print(getResultLabel("0"));');
  assert.deepEqual(outputs(p), ['demo.tif']);
});
test('R26-N10 getResultLabel with an out-of-range string row stops naming the row', async () => {
  const r = await run('getResultLabel("9"); print("after");');
  assert.ok(errors(r).some((e) => /getResultLabel の行（9）が結果表の範囲外です/.test(e.message)), JSON.stringify(errors(r)));
});
test('R26-N10 String.pad with a string numeric digit count pads', async () => {
  const p = await first('print(String.pad(7, "3")); print(String.pad("7", "3"));');
  assert.deepEqual(outputs(p), ['007', '007']);
});
test('R26-N10 fromCharCode with string numeric codes converts every argument', async () => {
  const p = await first('print(fromCharCode("66")); print(fromCharCode(65, "66", 67.9));');
  assert.deepEqual(outputs(p), ['B', 'ABC']);
});
test('R26-N10 plain math functions accept string numeric arguments', async () => {
  const p = await first('print(pow("2","3")); print(abs("-5")); print(round("2.5")); print(sqrt("9")); print(floor("2.9")); print(exp("0")); print(log("1")); print(sin("0")); print(cos("0")); print(tan("0")); print(asin("0")); print(acos("1")); print(atan("1")); print(atan2("1","1"));');
  assert.deepEqual(outputs(p), ['8', '5', '3', '3', '2', '1', '0', '0', '1', '0', '0', '0', '0.7854', '0.7854']);
});
test('R26-N10 Math.* and minOf/maxOf accept string numeric arguments', async () => {
  const p = await first('print(Math.ceil("2.1")); print(Math.min("1","2")); print(Math.max("1","2")); print(minOf("1","2")); print(maxOf("1","2")); print(Math.abs("-5")); print(Math.sqrt("9")); print(Math.pow("2","3")); print(Math.floor("2.9")); print(Math.round("2.5")); print(Math.exp("0")); print(Math.log("1")); print(Math.log10("100")); print(Math.sin("0")); print(Math.sqr("3")); print(Math.atan2("1","1"));');
  assert.deepEqual(outputs(p), ['3', '1', '2', '1', '2', '5', '3', '8', '2', '3', '1', '0', '2', '0', '9', '0.7854']);
});
test('R26-N10 isNaN accepts a string numeric', async () => {
  const p = await first('print(isNaN("5")); print(isNaN(0/0));');
  assert.deepEqual(outputs(p), ['0', '1']);
});
test('R26-N10 unreadable strings stay undetermined (RG-188 convention, no invented NaN)', async () => {
  const p = await first('print(abs("abc")); print(pow("2", "x"));');
  assert.deepEqual(outputs(p), ['（実行時に決まる値）', '（実行時に決まる値）']);
});

/* R26-N9/N10 兄弟表面: 同じ根本原因で棚卸しして一掃した表面 */
test('R26-N9/N10 sibling: setThreshold stores string numeric bounds as numbers', async () => {
  const p = await first('setThreshold("10", "100"); getThreshold(lo, hi); print(hi + 1);');
  assert.deepEqual(outputs(p), ['101']);
});
test('R26-N9/N10 sibling: getHistogram nBins as a string numeric is honored (16-bit)', async () => {
  const p = await first('newImage("r","16-bit ramp",10,10,1); getHistogram(v, c, "4"); print(v.length); print(v[1]);');
  assert.deepEqual(outputs(p), ['4', '64']);
});
test('R26-N9/N10 sibling: getHistogram with nBins "0" stops like the numeric form', async () => {
  const r = await run('getHistogram(v, c, "0"); print("after");');
  assert.ok(errors(r).some((e) => /getHistogram の nBins（0）が不正です/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!HOST.test(JSON.stringify(r)));
});
test('R26-N9/N10 sibling: setVoxelSize string numeric dimensions drive calibrated area', async () => {
  const p = await first('setVoxelSize("2", "2", "1", "um"); getStatistics(a); print(a);');
  assert.deepEqual(outputs(p), ['1048576']);
});
test('R26-N9/N10 sibling: makeRectangle string numeric coords behave as numbers', async () => {
  const p = await first('makeRectangle("0", "0", "512", "512"); getStatistics(a, m); print(a); print(m);');
  assert.deepEqual(outputs(p), ['262144', '80.45']);
  const p2 = await first('makeRectangle("10", "10", "20", "20"); getBoundingRect(x, y, w, h); print(w + 1);');
  assert.deepEqual(outputs(p2), ['21']);
});
test('R26-N9/N10 sibling: makeLine / makePolygon string numeric coords are converted', async () => {
  const p = await first('makeLine("0", "0", "10", "0"); print(selectionType());');
  assert.deepEqual(outputs(p), ['5']);
  const p2 = await first('makePolygon("0", "0", "20", "0", "20", "20"); getSelectionBounds(x, y, w, h); print(w); print(h);');
  assert.deepEqual(outputs(p2), ['20', '20']);
});
test('R26-N9/N10 sibling: getPixel reads a pixel written with numeric coords via string coords', async () => {
  const p = await first('setPixel(3, 3, 9); print(getPixel("3", "3")); setPixel("4", "4", "7"); print(getPixel(4, 4));');
  assert.deepEqual(outputs(p), ['9', '7']);
});
test('R26-N9/N10 sibling: random seed as a string numeric is accepted', async () => {
  const p = await first('random("seed", "42"); print("ok");');
  assert.deepEqual(outputs(p), ['ok']);
});

/* R26-N11: close(パターン) はパターンで対象を選ぶ */
test('R26-N11 close("title") closes the matching image, not the active one', async () => {
  const p = await first('newImage("other", "8-bit black", 10, 10, 1); close("demo.tif"); print(getTitle()); print(nImages);');
  assert.deepEqual(outputs(p), ['other', '1']);
});
test('R26-N11 close with a non-matching pattern closes nothing', async () => {
  const p = await first('close("no-such-title"); print(getTitle()); print(nImages);');
  assert.deepEqual(outputs(p), ['demo.tif', '1']);
});
test('R26-N11 close("\\\\Others") closes all but the front image', async () => {
  const p = await first('newImage("other", "8-bit black", 10, 10, 1); close("\\\\Others"); print(getTitle()); print(nImages);');
  assert.deepEqual(outputs(p), ['other', '1']);
});
test('R26-N11 close("*") closes every image and matching is case-insensitive with wildcards', async () => {
  const p = await first('newImage("other", "8-bit black", 10, 10, 1); close("*"); print(nImages);');
  assert.deepEqual(outputs(p), ['0']);
  const p2 = await first('newImage("other", "8-bit black", 10, 10, 1); close("DEMO*"); print(nImages); print(getTitle());');
  assert.deepEqual(outputs(p2), ['1', 'other']);
});
test('R26-N11 close() with no argument still closes only the active image', async () => {
  const p = await first('newImage("other", "8-bit black", 10, 10, 1); close(); print(getTitle());');
  assert.deepEqual(outputs(p), ['demo.tif']);
});
test('R26-N11 close(99) is read as the string pattern "99" and closes nothing', async () => {
  const p = await first('close(99); print(nImages); print(getTitle());');
  assert.deepEqual(outputs(p), ['1', 'demo.tif']);
});
test('R26-N11 close(pattern, "keep") second argument is accepted and pattern still applies', async () => {
  const p = await first('newImage("other", "8-bit black", 10, 10, 1); close("demo.tif", "keep"); print(getTitle());');
  assert.deepEqual(outputs(p), ['other']);
});

/* R26-N12: resetThreshold の sig 是正と、全関数の sig 棚卸し */
test('R26-N12 resetThreshold(99) now stops with an arity error', async () => {
  const r = await run('resetThreshold(99); print("after");');
  assert.ok(errors(r).some((e) => /resetThreshold の引数の数が違います/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!HOST.test(JSON.stringify(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R26-N12 resetThreshold bare and empty-paren forms still work and clear the threshold', async () => {
  const p = await first('setThreshold(10, 100); resetThreshold; getThreshold(lo, hi); print(lo);');
  assert.deepEqual(outputs(p), ['-1']);
  const p2 = await first('setThreshold(10, 100); resetThreshold(); getThreshold(lo, hi); print(lo);');
  assert.deepEqual(outputs(p2), ['-1']);
});
test('R26-N12 resetThreshold syntax is now the parenthesized form', () => {
  const item = d.reference.find((r) => r.name === 'resetThreshold');
  assert.ok(item);
  assert.equal(item.syntax, 'resetThreshold()');
});
test('R26-N12 inventory: no supported callable function has a paren-less syntax that skips arity checks', () => {
  // 括弧なし sig が残るのは、定義済み変数（実行時ガードあり）・プロパティ・未対応項目だけ
  const parenless = d.reference.filter((r) => !/\(/.test(r.syntax)).map((r) => r.name).sort();
  assert.deepEqual(parenless, ['.length', 'File.separator', 'PI', 'Roi.getName', 'nImages', 'nResults', 'nSlices']);
});
test('R26-N12 inventory: every zero-argument function rejects an extra argument', async () => {
  const zeroArg = d.reference
    .filter((r) => /\((\s*)\)/.test(r.syntax) && r.supported)
    .map((r) => r.name)
    .filter((n) => n !== 'close' && n !== 'random'); // close／random は任意引数を取る（SIM_ARITY_OVERRIDE）
  assert.ok(zeroArg.length >= 15, zeroArg.join(','));
  for (const name of zeroArg) {
    const r = await run(name + '(99);');
    assert.ok(errors(r).some((e) => /引数の数が違います/.test(e.message)), name + ' ' + JSON.stringify(errors(r)));
  }
});
test('R26-N12 predefined variables with paren-less syntax still reject arguments at runtime', async () => {
  for (const name of ['nImages', 'nSlices', 'nResults']) {
    const r = await run('print(' + name + '(9));');
    assert.ok(errors(r).some((e) => /引数の数が違います/.test(e.message)), name + ' ' + JSON.stringify(errors(r)));
  }
});
