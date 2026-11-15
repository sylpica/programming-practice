import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

// 修正バッチ3（ImageJ班）: R24-N5／N6／N18／N19／N20／N21／N22 と、
// 共通根（数値引数の (int) 切捨て変換・引数個数・範囲検証）の兄弟表面の回帰テスト。
// 一次情報: ij/macro/Functions.java（selectImage／newImage／newArray／
// fromCharCode／pad／setSlice／setPosition／setPixel／substring ほか）と
// 公式ドキュメント（Math.min／Math.max は2引数形式のみ）。
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

/* R24-N5: selectImage の小数・NaN 引数でホスト例外が漏出しない */
test('R24-N5 selectImage(1.5) truncates to image 1 and continues (no host exception)', async () => {
  const p = await first('selectImage(1.5); print("after");');
  assert.deepEqual(outputs(p), ['after']);
});
test('R24-N5 selectImage(-1.5) truncates to ID -1 and continues', async () => {
  const p = await first('selectImage(-1.5); print("after");');
  assert.deepEqual(outputs(p), ['after']);
});
test('R24-N5 selectImage(NaN) stops with the honest not-found macro error, paths preserved', async () => {
  const r = await run('selectImage(parseFloat("x")); print("after");');
  assert.equal(r.paths.length, 1, 'パスが失われています');
  assert.ok(errors(r).some((e) => /存在しない画像/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!HOST.test(JSON.stringify(r)), 'ホスト例外が漏出しています');
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R24-N5 selectImage(0.5) truncates to 0 and stops as not found', async () => {
  const r = await run('selectImage(0.5); print("after");');
  assert.equal(r.paths.length, 1);
  assert.ok(errors(r).some((e) => /存在しない画像/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});

/* R24-N6: newImage の寸法は切捨て、<1 はエラー */
test('R24-N6 newImage fractional width is truncated', async () => {
  const p = await first('newImage("t", "8-bit black", 10.6, 10, 1); print(getWidth());');
  assert.deepEqual(outputs(p), ['10']);
});
test('R24-N6 newImage width 0.5 truncates to 0 and errors', async () => {
  const r = await run('newImage("t", "8-bit black", 0.5, 10, 1); print("after");');
  assert.ok(errors(r).some((e) => /1 未満/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R24-N6 newImage width 0 errors (no zero-size image is fabricated)', async () => {
  const r = await run('newImage("t", "8-bit black", 0, 10, 1); print(getWidth());');
  assert.ok(errors(r).length);
  assert.ok(!r.paths.some((p) => outputs(p).includes('0')));
});
test('R24-N6 newImage fractional slices are truncated', async () => {
  const p = await first('newImage("t", "8-bit black", 10, 10, 2.6); print(nSlices);');
  assert.deepEqual(outputs(p), ['2']);
});
test('R24-N6 newImage 7-arg dimensions are truncated per dimension', async () => {
  const p = await first('newImage("t", "8-bit black", 10, 10, 1.6, 2.6, 1.6); print(nSlices);');
  assert.deepEqual(outputs(p), ['2']);
});
test('R24-N6 newImage NaN dimension errors instead of fabricating a NaN-size image', async () => {
  const r = await run('newImage("t", "8-bit black", parseFloat("x"), 10, 1); print("after");');
  assert.ok(errors(r).length);
  assert.ok(!HOST.test(JSON.stringify(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R24-N6 newImage negative dimension still errors (D11 kept)', async () => {
  const r = await run('newImage("t", "8-bit black", -5, 10, 1); print("after");');
  assert.ok(errors(r).length);
});

/* R24-N18: setSlice／Stack.setPosition の位置は整数化 */
test('R24-N18 setSlice(1.6) keeps slice 1', async () => {
  const p = await first('newImage("s","8-bit black",10,10,3); setSlice(1.6); print(getSliceNumber());');
  assert.deepEqual(outputs(p), ['1']);
});
test('R24-N18 setSlice(2.9) keeps slice 2', async () => {
  const p = await first('newImage("s","8-bit black",10,10,3); setSlice(2.9); print(getSliceNumber());');
  assert.deepEqual(outputs(p), ['2']);
});
test('R24-N18 Stack.setPosition slice 1.6 keeps slice 1', async () => {
  const p = await first('newImage("s","8-bit black",10,10,3); Stack.setPosition(1, 1.6, 1); c=0; s=0; f=0; Stack.getPosition(c, s, f); print(s);');
  assert.deepEqual(outputs(p), ['1']);
});
test('R24-N18 setSlice(NaN) does not poison the slice number', async () => {
  const p = await first('newImage("s","8-bit black",10,10,3); setSlice(parseFloat("x")); print(getSliceNumber());');
  assert.deepEqual(outputs(p), ['1']);
});

/* R24-N19: newArray のサイズは切捨て、負サイズはエラー */
test('R24-N19 newArray(2.4) has length 2 (not rounded up to 3)', async () => {
  const p = await first('a = newArray(2.4); print(a.length);');
  assert.deepEqual(outputs(p), ['2']);
});
test('R24-N19 newArray(0.4) has length 0', async () => {
  const p = await first('a = newArray(0.4); print(a.length);');
  assert.deepEqual(outputs(p), ['0']);
});
test('R24-N19 newArray(3.5) has length 3', async () => {
  const p = await first('a = newArray(3.5); print(a.length);');
  assert.deepEqual(outputs(p), ['3']);
});
test('R24-N19 newArray(-1) stops with a Negative array size error', async () => {
  const r = await run('a = newArray(-1); print("after");');
  assert.ok(errors(r).some((e) => /newArray のサイズ（-1）が負です/.test(e.message)), JSON.stringify(errors(r)));
  const traceText = (r.paths[0]?.trace || []).map((t) => t.text).join(' ');
  assert.match(traceText, /Negative array size/, '原因に実 ImageJ のエラー名が含まれていません');
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R24-N19 newArray(NaN) is an empty array, like (int)NaN == 0', async () => {
  const p = await first('a = newArray(parseFloat("x")); print(a.length);');
  assert.deepEqual(outputs(p), ['0']);
});

/* R24-N20: String.pad の長さ・数値は切捨て */
test('R24-N20 String.pad length 2.4 pads to length 2', async () => {
  const p = await first('print(lengthOf(String.pad("7", 2.4)));');
  assert.deepEqual(outputs(p), ['2']);
});
test('R24-N20 String.pad length 3.4 pads to length 3', async () => {
  const p = await first('print(String.pad("7", 3.4));');
  assert.deepEqual(outputs(p), ['007']);
});
test('R24-N20 String.pad numeric argument is truncated, not rounded', async () => {
  const p = await first('print(String.pad(7.9, 3));');
  assert.deepEqual(outputs(p), ['007']);
});

/* R24-N21: fromCharCode は全引数を処理し、範囲外はエラー */
test('R24-N21 fromCharCode(65, 66) returns "AB"', async () => {
  const p = await first('print(fromCharCode(65, 66));');
  assert.deepEqual(outputs(p), ['AB']);
});
test('R24-N21 fromCharCode truncates each value', async () => {
  const p = await first('print(fromCharCode(65.9, 66.9));');
  assert.deepEqual(outputs(p), ['AB']);
});
test('R24-N21 fromCharCode(-1) stops as out of range', async () => {
  const r = await run('print(fromCharCode(-1)); print("after");');
  assert.ok(errors(r).some((e) => /0〜65535/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R24-N21 fromCharCode(65536) stops as out of range (no silent wrap)', async () => {
  const r = await run('print(fromCharCode(65536)); print("after");');
  assert.ok(errors(r).length);
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R24-N21 fromCharCode(0) and (65535) are in range', async () => {
  const p = await first('print(lengthOf(fromCharCode(0))); print(lengthOf(fromCharCode(65535)));');
  assert.deepEqual(outputs(p), ['1', '1']);
});

/* R24-N22: Math.min／Math.max は2引数のみ */
test('R24-N22 Math.min with 1 argument stops with an arity error', async () => {
  const r = await run('print(Math.min(5)); print("after");');
  assert.ok(errors(r).some((e) => /Math\.min の引数の数が違います/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R24-N22 Math.min with 3 arguments stops with an arity error', async () => {
  const r = await run('print(Math.min(5, 2, 9)); print("after");');
  assert.ok(errors(r).some((e) => /引数の数が違います/.test(e.message)), JSON.stringify(errors(r)));
});
test('R24-N22 Math.max with 3 arguments stops (no JS semantics)', async () => {
  const r = await run('print(Math.max(1, 2, 3) + 10); print("after");');
  assert.ok(errors(r).some((e) => /Math\.max の引数の数が違います/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('13')));
});
test('R24-N22 Math.min/max with 2 arguments still compute', async () => {
  const p = await first('print(Math.min(5, 2)); print(Math.max(5, 2)); print(minOf(5, 2)); print(maxOf(5, 2));');
  assert.deepEqual(outputs(p), ['2', '5', '2', '5']);
});

/* 兄弟表面: 添字の (int) 変換（読み・書き・複合代入） */
test('sibling: fractional array index reads the truncated element, never "undefined"', async () => {
  const p = await first('a = newArray(10, 20, 30); print(a[1.5]); print(a[-0.5]);');
  assert.deepEqual(outputs(p), ['20', '10']);
});
test('sibling: fractional array index assignment writes the truncated element', async () => {
  const p = await first('a = newArray(10, 20, 30); a[1.5] = 99; print(a[1]); a[0.9] += 1; print(a[0]);');
  assert.deepEqual(outputs(p), ['99', '11']);
});
/* 兄弟表面: isOpen の ID も (int) 変換 */
test('sibling: isOpen fractional IDs are truncated like selectImage', async () => {
  const p = await first('print(isOpen(-0.5)); print(isOpen(-1.5)); print(isOpen(0.5)); print(isOpen(1.5));');
  assert.deepEqual(outputs(p), ['0', '1', '0', '1']);
});
/* 兄弟表面: setPixel の座標・値（getPixel の小数座標は補間のため対象外） */
test('sibling: setPixel fractional coordinates/value write the truncated pixel', async () => {
  const p = await first('setPixel(1.6, 1.6, 77.9); print(getPixel(1, 1));');
  assert.deepEqual(outputs(p), ['77']);
});
/* 兄弟表面: roiManager("select") の番号 */
test('sibling: roiManager select with fractional index selects the truncated ROI', async () => {
  const p = await first('makeRectangle(0,0,5,5); roiManager("add"); makeRectangle(9,9,5,5); roiManager("add"); roiManager("select", 0.6); getSelectionBounds(x, y, w, h); print(x);');
  assert.deepEqual(outputs(p), ['0']);
});
/* 兄弟表面: 結果表の行は floor でなく (int) 切捨て（負の小数） */
test('sibling: getResult row -0.5 truncates to row 0', async () => {
  const p = await first('run("Measure"); print(getResult("Area", -0.5));');
  assert.deepEqual(outputs(p), ['262144']);
});
test('sibling: substring with negative fractional start truncates to 0', async () => {
  const p = await first('print(substring("ABC", -0.5, 2)); s = "ABC"; print(s.substring(-0.5, 2));');
  assert.deepEqual(outputs(p), ['AB', 'AB']);
});
test('sibling: string charAt with negative fractional position truncates to 0', async () => {
  const p = await first('s = "ABC"; print(s.charAt(-0.5));');
  assert.deepEqual(outputs(p), ['A']);
});
/* 兄弟表面: makeLine 折れ線・makePolygon の頂点は (int)Math.round（Functions.java） */
test('sibling: makePolygon first point is rounded per Functions.java', async () => {
  const p = await first('makePolygon(10.6, 5.6, 20, 20, 30, 30); getSelectionBounds(x, y, w, h); print(x); print(y);');
  assert.deepEqual(outputs(p), ['11', '6']);
});
/* double のまま扱う引数は切り捨てない（誤った一律整数化をしない） */
test('non-target: makeRectangle coordinates stay double (Functions.java)', async () => {
  const p = await first('makeRectangle(1.6, 2.6, 10.6, 5.6); getSelectionBounds(x, y, w, h); print(x); print(w);');
  assert.deepEqual(outputs(p), ['1.6', '10.6']);
});
test('non-target: getPixel with fractional coordinates stays undetermined (interpolation)', async () => {
  const p = await first('print(getPixel(0.6, 0.6));');
  assert.deepEqual(outputs(p), ['（実行時に決まる値）']);
});

/* 全数確認: 異常引数でもホスト例外が漏出しない（314プローブ相当の代表集合） */
test('sweep: abnormal arguments never leak a host exception', async () => {
  const vals = ['1.5', '-1.5', 'parseFloat("x")', '"str"', 'newArray(1,2)', '-999', '0', '99999'];
  const fns = [
    (v) => `selectImage(${v});`, (v) => `print(isOpen(${v}));`,
    (v) => `newImage("t","8-bit black",${v},10,1);`, (v) => `newImage("t","8-bit black",10,10,${v});`,
    (v) => `a=newArray(${v}); print(a.length);`, (v) => `print(fromCharCode(${v}));`, (v) => `print(fromCharCode(65,${v}));`,
    (v) => `print(String.pad("7",${v}));`, (v) => `newImage("s","8-bit black",10,10,3); setSlice(${v}); print(getSliceNumber());`,
    (v) => `print(Math.min(${v},2));`, (v) => `setPixel(${v},1,5);`, (v) => `setPixel(1,1,${v});`,
    (v) => `print(charCodeAt("ABC",${v}));`, (v) => `print(substring("ABC",${v},2));`,
    (v) => `a=newArray(10,20,30); print(a[${v}]);`, (v) => `a=newArray(10,20,30); a[${v}]=99;`,
    (v) => `run("Measure"); print(getResult("Area",${v}));`, (v) => `getHistogram(vv,cc,${v});`,
  ];
  for (const f of fns) for (const v of vals) {
    const r = await run(f(v));
    assert.ok((r.paths || []).length >= 1, `パスが失われました: ${f(v)}`);
    assert.ok(!HOST.test(JSON.stringify(r)), `ホスト例外が漏出しました: ${f(v)} -> ${JSON.stringify(r.error)}`);
  }
});
