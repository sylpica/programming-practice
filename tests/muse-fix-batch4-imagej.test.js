import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getDefinition } from '../js/types/registry.js';

// 修正バッチ4（ImageJ班）: R25-N15／N18／N19／N20／N21／N22／N31 の回帰テスト。
// 一次情報: ij/macro/Functions.java（リポジトリ記録ハッシュ
// b8e62f4fe54e2ea5de437a9be7e6073f3c60a883370a43216d7cd16cb9f531f9 と一致する版）の
// isOpen／setPosition／getPosition／makePolygon／makeLine／newImage／getResult／
// getHistogram／sortArray／substring／charCodeAt と、公式ドキュメント
// （Built-in Macro Functions）の makeLine／getHistogram の項。
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
const traceTexts = (p) => p.trace.map((t) => t.text);
const HOST = /Cannot read properties|Cannot set properties|is not a function|is not defined/;

/* R25-N15: isOpen の説明は、照合に使われた変換後の ID を引用する */
test('R25-N15 isOpen(1.9) trace cites the truncated ID 1, not the raw argument', async () => {
  const p = await first('print(isOpen(1.9));');
  assert.deepEqual(outputs(p), ['1']);
  const t = traceTexts(p).join('\n');
  assert.match(t, /画像 ID 1（「demo\.tif」）が開かれているか/);
  assert.doesNotMatch(t, /画像「1\.9」/);
});
test('R25-N15 isOpen(0.5) trace cites ID 0', async () => {
  const p = await first('print(isOpen(0.5));');
  assert.deepEqual(outputs(p), ['0']);
  assert.match(traceTexts(p).join('\n'), /画像 ID 0が開かれているか/);
});
test('R25-N15 isOpen(title) trace still cites the title', async () => {
  const p = await first('print(isOpen("demo.tif"));');
  assert.deepEqual(outputs(p), ['1']);
  assert.match(traceTexts(p).join('\n'), /画像「demo\.tif」が開かれているか/);
});

/* R25-N18: Stack.setPosition は3引数すべてを保持し、getPosition は実値を返す */
test('R25-N18 Stack.setPosition(2,2,2) is fully kept and read back', async () => {
  const p = await first('newImage("hs","8-bit black",10,10,2,3,2); Stack.setPosition(2,2,2); Stack.getPosition(c,s,f); print(c); print(s); print(f);');
  assert.deepEqual(outputs(p), ['2', '2', '2']);
});
test('R25-N18 Stack.setPosition fractional args are simInt-truncated in all dimensions', async () => {
  const p = await first('newImage("hs","8-bit black",10,10,2,3,2); Stack.setPosition(1.9,2.9,1.9); Stack.getPosition(c,s,f); print(c); print(s); print(f);');
  assert.deepEqual(outputs(p), ['1', '2', '1']);
});
test('R25-N18 Stack.setPosition out-of-range dimensions keep the current position', async () => {
  const p = await first('newImage("hs","8-bit black",10,10,2,3,2); Stack.setPosition(99,1,99); Stack.getPosition(c,s,f); print(c); print(s); print(f);');
  assert.deepEqual(outputs(p), ['1', '1', '1']);
});
test('R25-N18 Stack.setPosition slice still drives getSliceNumber', async () => {
  const p = await first('newImage("hs","8-bit black",10,10,2,3,2); Stack.setPosition(2,3,2); print(getSliceNumber());');
  assert.deepEqual(outputs(p), ['3']);
});
test('R25-N18 default position is 1/1/1 before any setPosition', async () => {
  const p = await first('newImage("hs","8-bit black",10,10,2,3,2); Stack.getPosition(c,s,f); print(c); print(s); print(f);');
  assert.deepEqual(outputs(p), ['1', '1', '1']);
});

/* R25-N19: makePolygon は全頂点を保持し、全頂点から外接矩形を計算する */
test('R25-N19 makePolygon bounds come from all vertices', async () => {
  const p = await first('makePolygon(10.4, 10.4, 0, 0, 20, 20); getSelectionBounds(x, y, w, h); print(x); print(y); print(w); print(h);');
  assert.deepEqual(outputs(p), ['0', '0', '20', '20']);
});
test('R25-N19 makePolygon rounds every vertex ((int)Math.round)', async () => {
  const p = await first('makePolygon(10.6, 5.6, 20, 20, 30, 30); getSelectionBounds(x, y, w, h); print(x); print(y); print(w); print(h);');
  assert.deepEqual(outputs(p), ['11', '6', '19', '24']);
});
test('R25-N19 makePolygon with an odd argument count stops instead of dropping the tail', async () => {
  const r = await run('makePolygon(0, 0, 10, 0, 20, 20, 99); print("after");');
  assert.ok(errors(r).some((e) => /makePolygon の引数の数が違います/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});

/* R25-N20: 引数個数検証をすり抜ける5表面 */
test('R25-N20 newImage with 6 arguments stops (only 5 or 7 exist)', async () => {
  const r = await run('newImage("t","8-bit black",10,10,1,99); print("after");');
  assert.ok(errors(r).some((e) => /newImage の引数の数が違います/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!HOST.test(JSON.stringify(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R25-N20 makeLine with 7 or 9 arguments stops', async () => {
  for (const code of ['makeLine(0,0,10,0,10,10,99); print("after");', 'makeLine(0,0,10,0,10,10,20,20,99); print("after");']) {
    const r = await run(code);
    assert.ok(errors(r).some((e) => /makeLine の引数の数が違います/.test(e.message)), code + ' ' + JSON.stringify(errors(r)));
    assert.ok(!r.paths.some((p) => outputs(p).includes('after')), code);
  }
});
test('R25-N20 makeLine 5-argument form is the line-width form (Functions.java / official docs)', async () => {
  const p = await first('makeLine(0,0,10,0,3); print(selectionType());');
  assert.deepEqual(outputs(p), ['5']);
  assert.match(traceTexts(p).join('\n'), /線幅 3 の直線 ROI/);
});
test('R25-N20 makeLine polyline (6 args) still works', async () => {
  const p = await first('makeLine(0, 0, 10, 10, 20, 0); print(selectionType());');
  assert.deepEqual(outputs(p), ['6']);
});
test('R25-N20 getResult with a numeric third argument stops (no such table)', async () => {
  const r = await run('run("Measure"); print(getResult("Area", 0, 9));');
  assert.ok(errors(r).some((e) => /結果表「9」が見つかりません/.test(e.message)), JSON.stringify(errors(r)));
});
test('R25-N20 getResult with the "Results" title as third argument works (Functions.java)', async () => {
  const p = await first('run("Measure"); print(getResult("Area", 0, "Results"));');
  assert.deepEqual(outputs(p), ['262144']);
});
test('R25-N20 getHistogram with 4 arguments stops (histMin/histMax are a pair)', async () => {
  const r = await run('getHistogram(vv, cc, 256, 9); print("after");');
  assert.ok(errors(r).some((e) => /getHistogram の引数の数が違います/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R25-N20 getHistogram histMin/histMax on an 8-bit image stops (Functions.java)', async () => {
  const r = await run('getHistogram(vv, cc, 256, 0, 255); print("after");');
  assert.ok(errors(r).some((e) => /16bit・32bit 画像でのみ指定できます/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
test('R25-N20 getHistogram 5-arg form actually applies histMin/histMax (16-bit ramp)', async () => {
  const p = await first('newImage("r","16-bit ramp",10,10,1); getHistogram(vv, cc, 4, 0, 65536); print(vv[0]); print(vv[1]); print(cc[0]); print(cc[3]);');
  assert.deepEqual(outputs(p), ['0', '16384', '25', '25']);
});
test('R25-N20 getHistogram 5-arg form does not count pixels outside the range', async () => {
  const p = await first('newImage("b","16-bit black",10,10,1); getHistogram(vv, cc, 4, 100, 200); print(vv[0]); print(vv[1]); print(cc[0]); print(cc[3]);');
  assert.deepEqual(outputs(p), ['100', '125', '0', '0']);
});
test('R25-N20 nImages(9) stops; bare and empty-paren forms still work', async () => {
  const r = await run('print(nImages(9));');
  assert.ok(errors(r).some((e) => /nImages の引数の数が違います/.test(e.message)), JSON.stringify(errors(r)));
  const p = await first('print(nImages); print(nImages());');
  assert.deepEqual(outputs(p), ['1', '1']);
});
test('R25-N20 nSlices(9) and nResults(9) also stop', async () => {
  for (const code of ['print(nSlices(9));', 'print(nResults(9));']) {
    const r = await run(code);
    assert.ok(errors(r).some((e) => /引数の数が違います/.test(e.message)), code + ' ' + JSON.stringify(errors(r)));
  }
});

/* R25-N21: Array.sort は非配列引数を名指しで止める */
test('R25-N21 Array.sort(5) stops naming the cause instead of returning 5', async () => {
  const r = await run('print(Array.sort(5));');
  assert.ok(errors(r).some((e) => /Array\.sort の引数が配列ではありません/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('5')));
});
test('R25-N21 Array.sort("abc") stops as well', async () => {
  const r = await run('print(Array.sort("abc"));');
  assert.ok(errors(r).some((e) => /Array\.sort の引数が配列ではありません/.test(e.message)), JSON.stringify(errors(r)));
});
test('R25-N21 Array.sort on a real array still sorts; paired sort still works', async () => {
  const p = await first('a = newArray(3, 1, 2); Array.sort(a); print(a[0]); print(a[2]);');
  assert.deepEqual(outputs(p), ['1', '3']);
  const p2 = await first('a = newArray(2, 1); b = newArray("x", "y"); Array.sort(a, b); print(b[0]); print(b[1]);');
  assert.deepEqual(outputs(p2), ['y', 'x']);
});
test('R25-N21 Array.sort with mismatched pair lengths stops (Functions.java)', async () => {
  const r = await run('a = newArray(2, 1); b = newArray(1, 2, 3); Array.sort(a, b); print("after");');
  assert.ok(errors(r).some((e) => /Array\.sort の2つの配列の長さが違います/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});

/* R25-N22: 文字列数値引数の解釈を統一する */
test('R25-N22 substring function form accepts string numeric indices', async () => {
  const p = await first('print(substring("ABCDE", "1", 3));');
  assert.deepEqual(outputs(p), ['BC']);
});
test('R25-N22 substring method form accepts string numeric indices', async () => {
  const p = await first('s = "ABCDE"; print(s.substring("1", "3"));');
  assert.deepEqual(outputs(p), ['BC']);
});
test('R25-N22 substring still stops for a genuinely out-of-range range', async () => {
  const r = await run('print(substring("ABCDE", "1", 9));');
  assert.ok(errors(r).some((e) => /substring の範囲（1〜9）が文字列の長さ（5）を超えています/.test(e.message)), JSON.stringify(errors(r)));
});
test('R25-N22 charCodeAt accepts a string numeric index', async () => {
  const p = await first('print(charCodeAt("ABC", "1"));');
  assert.deepEqual(outputs(p), ['66']);
});
test('R25-N22 roiManager("select", "0") selects by the numeric value', async () => {
  const p = await first('makeRectangle(0,0,10,10); roiManager("add"); makeRectangle(50,50,5,5); roiManager("select", "0"); getSelectionBounds(x,y,w,h); print(x); print(y);');
  assert.deepEqual(outputs(p), ['0', '0']);
});
test('R25-N22 Stack.setPosition accepts a string numeric slice', async () => {
  const p = await first('newImage("hs","8-bit black",10,10,1,3,1); Stack.setPosition(1, "2", 1); Stack.getPosition(c,s,f); print(s);');
  assert.deepEqual(outputs(p), ['2']);
});
test('R25-N22 indexOf start position accepts a string numeric (function and method forms)', async () => {
  const p = await first('print(indexOf("ABC", "A", "1")); s = "ABC"; print(s.indexOf("A", "1"));');
  assert.deepEqual(outputs(p), ['-1', '-1']);
});
test('R25-N22 setSlice accepts a string numeric and stores a number', async () => {
  const p = await first('newImage("s","8-bit black",10,10,3); setSlice("2"); print(getSliceNumber());');
  assert.deepEqual(outputs(p), ['2']);
});

/* R25-N31: charCodeAt の caution は上限 length-1 を示す。個票 r2 も同期する */
test('R25-N31 charCodeAt caution states the length-1 upper bound', () => {
  const item = d.reference.find((r) => r.name === 'charCodeAt');
  assert.ok(item);
  assert.equal(item.caution, 'index は 0 から lengthOf(string) - 1 までの範囲で指定する。');
});
test('R25-N31 reference-r2.json charCodeAt row is in sync (fields + sha256)', () => {
  const rows = JSON.parse(readFileSync(new URL('../docs/audit/reference-r2.json', import.meta.url), 'utf8'));
  const row = rows.find((r) => r.kind === 'imagej' && r.name === 'charCodeAt');
  assert.ok(row);
  const item = d.reference.find((r) => r.name === 'charCodeAt');
  assert.deepEqual(row.fields, {
    description: item.description, returns: item.returns, caution: item.caution,
    example: item.example, source: item.source,
  });
  assert.equal(row.supported, item.supported);
  // sha256 はフィールド JSON（キーソート・ensure_ascii=False・Python 既定の区切り）の sha256
  const canon = (v) => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canon).join(', ') + ']';
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ': ' + canon(v[k])).join(', ') + '}';
  };
  assert.equal(createHash('sha256').update(canon(row.fields), 'utf8').digest('hex'), row.sha256);
});
