import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

// 修正バッチ2「ImageJ・拡張班」(fc-imagej): funcheck D1〜D13、R23-N12/N13、refacc RA-5〜RA-15 の回帰テスト。
const d = getDefinition('imagej');
const run = async (code, model) => d.simulate(code, model || structuredClone(d.model.defaults));
const errors = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const errText = (r) => JSON.stringify(errors(r));
const first = async (code, model) => {
  const r = await run(code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r.paths?.length));
  return r.paths[0];
};
const outputs = (p) => p.outputs.map((o) => o.text);
const ref = (n) => d.reference.find((x) => x.name === n);

/* D1: setVoxelSize の校正が保持され、getVoxelSize と面積に反映される */
test('D1 getVoxelSize returns the values set by setVoxelSize (um -> µm)', async () => {
  const p = await first('setVoxelSize(0.5, 0.5, 1.0, "um");\ngetVoxelSize(vw, vh, vd, u);\nprint(vw);\nprint(u);');
  assert.deepEqual(outputs(p), ['0.5', 'µm']);
  assert.equal(p.vars.vw, '0.5');
  assert.equal(p.vars.u, 'µm');
});
test('D1 getStatistics area is scaled by voxel size', async () => {
  const p = await first('setVoxelSize(0.5, 0.5, 1.0, "um");\ngetStatistics(area, mean, mn, mx, sd);\nprint(area);');
  assert.deepEqual(outputs(p), ['65536']);
});
test('D1 Measure result Area is scaled by voxel size', async () => {
  const p = await first('setVoxelSize(0.5, 0.5, 1.0, "um");\nrun("Measure");\nprint(getResult("Area", 0));');
  assert.deepEqual(outputs(p), ['65536']);
});
test('D1 run("Set Scale...") feeds the same calibration', async () => {
  const p = await first('run("Set Scale...", "distance=10 known=5 unit=um");\ngetVoxelSize(vw, vh, vd, u);\nprint(vw);');
  assert.deepEqual(outputs(p), ['0.5']);
});
test('D1 default voxel size stays 1x1x1 pixels', async () => {
  const p = await first('getVoxelSize(vw, vh, vd, u);\nprint(vw);\nprint(u);');
  assert.deepEqual(outputs(p), ['1', 'pixels']);
});

/* D2: requires はバージョン不足でマクロを中止する */
test('D2 requires("99.99") aborts the macro', async () => {
  const r = await run('requires("99.99");\nprint("after");');
  assert.ok(errors(r).length);
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});
test('D2 requires("1.54q") aborts (letter suffix compared)', async () => {
  const r = await run('requires("1.54q");\nprint("after");');
  assert.ok(errors(r).length);
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});
test('D2 requires at or below the model version passes', async () => {
  const p = await first('requires("1.50");\nrequires("1.54p");\nprint("after");');
  assert.deepEqual(outputs(p), ['after']);
});

/* D3: 引数個数の誤りは実行時点で止まり、後続の出力が出ない */
test('D3 builtin arity error stops execution (getWidth(1, 2))', async () => {
  const r = await run('print(getWidth(1, 2));\nprint("after");');
  assert.ok(errText(r).includes('getWidth の引数の数が違います'), errText(r));
  assert.ok(!(r.paths || []).some((p) => outputs(p).length));
});
test('D3 abs() and abs(1, 2) stop instead of fabricating values', async () => {
  for (const code of ['x = abs();\nprint("after");', 'x = abs(1, 2);\nprint("after");']) {
    const r = await run(code);
    assert.ok(errors(r).length, code);
    assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')), code);
  }
});
test('D3 user function arity error stops at the call site', async () => {
  const r = await run('function area2(w, h) { return w * h; }\nprint(area2(3, 4));\ny = area2(3);\nprint("after");');
  assert.ok(errText(r).includes('関数 area2 の引数の数が違います'), errText(r));
  assert.ok((r.paths || []).some((p) => outputs(p).join() === '12'));
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});
test('D3 correct-arity calls are unaffected', async () => {
  const p = await first('print(abs(-3));\nprint(getWidth());');
  assert.deepEqual(outputs(p), ['3', '512']);
});
test('D3 string method arity error stops (s.charAt(1, 2))', async () => {
  const r = await run('s = "abc";\nprint(s.charAt(1, 2));\nprint("after");');
  assert.ok(errText(r).includes('メソッド charAt の引数の数が違います'), errText(r));
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});

/* D4: getInfo はモデルで確定しているキーを返す */
test('D4 getInfo("image.title") returns the active image title', async () => {
  const p = await first('print(getInfo("image.title"));');
  assert.deepEqual(outputs(p), ['demo.tif']);
});
test('D4 getInfo("log") returns the current log contents', async () => {
  const p = await first('print("hello");\nprint(getInfo("log"));');
  assert.deepEqual(outputs(p), ['hello', 'hello']);
});

/* D5: setResult は末尾を超える行を捏造しない */
test('D5 setResult beyond the tail is a range error', async () => {
  const r = await run('setResult("X", 99, 1);\nprint("after");');
  assert.ok(errText(r).includes('setResult の行（99）が結果表の範囲外です'), errText(r));
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});
test('D5 setResult can still append exactly at the tail', async () => {
  const p = await first('setResult("X", 0, 1);\nsetResult("X", 1, 2);\nprint(nResults);');
  assert.deepEqual(outputs(p), ['2']);
});

/* D6: getHistogram の nBins 検証 */
test('D6 8-bit image with nBins != 256 stops', async () => {
  const r = await run('getHistogram(v, c, 10);\nprint("after");');
  assert.ok(errors(r).length);
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});
test('D6 nBins of 0 or negative stops instead of writing empty arrays', async () => {
  for (const n of ['0', '-4']) {
    const r = await run('getHistogram(v, c, ' + n + ');\nprint("after");');
    assert.ok(errors(r).length, 'nBins=' + n);
  }
});
test('D6 8-bit with nBins=256 and 16-bit with custom nBins still work', async () => {
  const p = await first('getHistogram(v, c, 256);\nprint(c.length);');
  assert.deepEqual(outputs(p), ['256']);
  const p2 = await first('newImage("t16", "16-bit black", 100, 100, 1);\ngetHistogram(v, c, 10);\nprint(c.length);');
  assert.deepEqual(outputs(p2), ['10']);
});

/* D7: charCodeAt の範囲外はエラーで止まる */
test('D7 charCodeAt out of range stops (no silent NaN)', async () => {
  for (const ix of ['5', '2', '-1']) {
    const r = await run('print(charCodeAt("AB", ' + ix + '));\nprint("after");');
    assert.ok(errors(r).length, 'index=' + ix);
    assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')), 'index=' + ix);
  }
});
test('D7 charCodeAt in range still works', async () => {
  const p = await first('print(charCodeAt("AB", 1));');
  assert.deepEqual(outputs(p), ['66']);
});

/* D8: getResult は文字列セルを数値として解釈し直す */
test('D8 getResult of a non-numeric string cell is NaN', async () => {
  const p = await first('setResult("Note", 0, "ok");\nprint(isNaN(getResult("Note", 0)));');
  assert.deepEqual(outputs(p), ['1']);
});
test('D8 getResult of a numeric string cell parses it', async () => {
  const p = await first('setResult("N", 0, "3.5");\nprint(getResult("N", 0));');
  assert.deepEqual(outputs(p), ['3.5']);
});

/* D9: getResultLabel の範囲外はエラーで止まる */
test('D9 getResultLabel out of range stops', async () => {
  const r = await run('print(getResultLabel(99));\nprint("after");');
  assert.ok(errors(r).length);
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});
test('D9 getResultLabel of an existing row works', async () => {
  const p = await first('run("Measure");\nprint(getResultLabel(0));');
  assert.deepEqual(outputs(p), ['demo.tif']);
});

/* D10: getProfile は選択なし・不適な選択で止まる */
test('D10 getProfile without a selection stops ("Selection required")', async () => {
  const r = await run('p = getProfile();\nprint("after");');
  assert.ok(errText(r).includes('getProfile には選択（ROI）が必要です'), errText(r));
});
test('D10 getProfile with an oval selection stops', async () => {
  const r = await run('makeOval(10, 10, 50, 50);\np = getProfile();\nprint("after");');
  assert.ok(errors(r).length);
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});
test('D10 getProfile with rectangle or line selection still runs', async () => {
  const p = await first('makeRectangle(10, 10, 50, 50);\np = getProfile();\nprint("after");');
  assert.deepEqual(outputs(p), ['after']);
  const p2 = await first('makeLine(0, 0, 100, 100);\np = getProfile();\nprint("after");');
  assert.deepEqual(outputs(p2), ['after']);
});

/* D11: newImage の負の寸法はエラー */
test('D11 newImage with a negative width stops', async () => {
  const r = await run('newImage("x", "8-bit black", -5, 10, 1);\nprint("after");');
  assert.ok(errors(r).length);
  assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')));
});
test('D11 newImage with normal dimensions still works', async () => {
  const p = await first('newImage("x", "8-bit black", 100, 100, 1);\nprint(getWidth());');
  assert.deepEqual(outputs(p), ['100']);
});

/* D12: parseInt の基数変換は Integer.parseInt と同じ厳密さ */
test('D12 parseInt with out-of-range radix falls back to base 10', async () => {
  const p = await first('print(parseInt("10", 99));\nprint(parseInt("10", 1));');
  assert.deepEqual(outputs(p), ['10', '10']);
});
test('D12 parseInt with radix is strict (trailing junk -> NaN)', async () => {
  const p = await first('print(parseInt("42xyz", 16));\nprint(parseInt("3.9", 16));');
  assert.deepEqual(outputs(p), ['NaN', 'NaN']);
});
test('D12 parseInt with radix converts valid digits incl. sign', async () => {
  const p = await first('print(parseInt("ff", 16));\nprint(parseInt("-ff", 16));');
  assert.deepEqual(outputs(p), ['255', '-255']);
});
test('D12 decimal parseInt keeps the rounding behaviour', async () => {
  const p = await first('print(parseInt("3.9"));');
  assert.deepEqual(outputs(p), ['4']);
});

/* D13: Array.getStatistics の空配列・非数値配列 */
test('D13 Array.getStatistics on an empty array writes Infinity/-Infinity/NaN', async () => {
  const p = await first('a = newArray();\nArray.getStatistics(a, mn, mx, mean, sd);\nprint(mn);\nprint(mx);\nprint(mean);');
  assert.deepEqual(outputs(p), ['Infinity', '-Infinity', 'NaN']);
});
test('D13 Array.getStatistics on a string array stops with the true cause', async () => {
  const r = await run('a = newArray("a", "b");\nArray.getStatistics(a, mn, mx, mean, sd);\nprint(mn);');
  assert.ok(errText(r).includes('Array.getStatistics の引数が数値の配列ではありません'), errText(r));
  assert.ok(!errText(r).includes('まだ値が代入されていません'), errText(r));
});
test('D13 Array.getStatistics on numbers still works', async () => {
  const p = await first('a = newArray(1, 2, 3, 4);\nArray.getStatistics(a, mn, mx, mean, sd);\nprint(mean);');
  assert.deepEqual(outputs(p), ['2.5']);
});

/* R23-N12: 文字列エスケープ（StreamTokenizer の規則） */
test('R23-N12 octal escapes work (\\101 = A, \\040 = space)', async () => {
  const p = await first('print("\\101");\nprint("x\\040y");');
  assert.deepEqual(outputs(p), ['A', 'x y']);
});
test('R23-N12 control escapes \\r \\b \\f \\v \\a become control characters', async () => {
  const p = await first('print(lengthOf("\\r"));\nprint(lengthOf("\\b"));\nprint(lengthOf("\\f"));\nprint(lengthOf("\\v"));\nprint(lengthOf("\\a"));');
  assert.deepEqual(outputs(p), ['1', '1', '1', '1', '1']);
  const p2 = await first('print(charCodeAt("\\r", 0));');
  assert.deepEqual(outputs(p2), ['13']);
});
test('R23-N12 unknown escapes drop the backslash like real ImageJ', async () => {
  const p = await first('print("\\q");\nprint("\\\\");');
  assert.deepEqual(outputs(p), ['q', '\\']);
});

/* R23-N13: 関数形式 charAt / contains は真の原因で止まる */
test('R23-N13 charAt(s, i) reports the true cause, not an arity error', async () => {
  const r = await run('s = "abc";\nprint(charAt(s, 1));');
  assert.ok(errText(r).includes('charAt は関数形式では使えません'), errText(r));
  assert.ok(!errText(r).includes('引数の数が違います'), errText(r));
});
test('R23-N13 contains(s, sub) as a bare function reports the true cause', async () => {
  const r = await run('print(contains("abc", "b"));');
  assert.ok(errText(r).includes('contains は関数形式では使えません'), errText(r));
  assert.ok(!errText(r).includes('引数の数が違います'), errText(r));
});
test('R23-N13 the method form s.charAt(i) still works', async () => {
  const p = await first('s = "abc";\nprint(s.charAt(1));');
  assert.deepEqual(outputs(p), ['b']);
});

/* RA-5〜7: 実在しない Math.sinh / cosh / tanh は未対応として停止する */
test('RA-5..7 Math.sinh/cosh/tanh are marked unsupported with the reason', () => {
  for (const n of ['Math.sinh', 'Math.cosh', 'Math.tanh']) {
    const it = ref(n);
    assert.equal(it.supported, false, n);
    assert.ok(it.caution.includes('実物の ImageJ マクロ言語には ' + n + ' は存在しない'), n);
    assert.ok(it.caution.includes('このアプリでは未確認として停止する'), n);
  }
});
test('RA-5..7 calling Math.sinh/cosh/tanh stops as unconfirmed', async () => {
  for (const code of ['print(Math.sinh(0.5));', 'print(Math.cosh(0));', 'print(Math.tanh(0.5));']) {
    const r = await run(code + '\nprint("after");');
    assert.ok(errText(r).includes('未確認'), code + ' -> ' + errText(r));
    assert.ok(!(r.paths || []).some((p) => outputs(p).includes('after')), code);
  }
});

/* RA-8: replace の正規表現条件は old の長さだけに依存する */
test('RA-8 replace item text states the old-length-only rule', () => {
  const it = ref('replace');
  assert.ok(it.description.includes('new の長さは判定に関係しない'), it.description);
  assert.ok(it.caution.includes('old が2文字以上の場合だけ'), it.caution);
});
test('RA-8 engine replace treats a 1-char old literally even with a long new', async () => {
  const p = await first('print(replace("a+b", "+", "XYZ"));');
  assert.deepEqual(outputs(p), ['aXYZb']);
});

/* RA-9〜14: 項目文面の補完 */
test('RA-9 open item documents the open(path, n) stack form', () => {
  assert.ok(ref('open').caution.includes('open(path, n)'), ref('open').caution);
});
test('RA-10 setBatchMode item documents the string forms', () => {
  const desc = ref('setBatchMode').description;
  assert.ok(desc.includes('setBatchMode("show")'), desc);
  assert.ok(desc.includes('setBatchMode("hide")'), desc);
  assert.ok(desc.includes('setBatchMode("exit and display")'), desc);
});
test('RA-10 engine accepts the setBatchMode string forms', async () => {
  const p = await first('setBatchMode("hide");\nsetBatchMode("show");\nsetBatchMode("exit and display");\nprint("done");');
  assert.deepEqual(outputs(p), ['done']);
});
test('RA-11 getString item documents that an empty string aborts', () => {
  assert.ok(ref('getString').caution.includes('空文字列を入力して確定した場合もマクロは中止される'), ref('getString').caution);
});
test('RA-12 getNumber item documents the defaultValue fallback', () => {
  assert.ok(ref('getNumber').caution.includes('defaultValue が返る'), ref('getNumber').caution);
});
test('RA-13 Roi.contains item documents the no-ROI abort', () => {
  assert.ok(ref('Roi.contains').caution.includes('選択（ROI）が無い状態で呼び出すとマクロは中止される'), ref('Roi.contains').caution);
});
test('RA-14 getValue item documents RGB luminance and out-of-image NaN', () => {
  const desc = ref('getValue').description;
  assert.ok(desc.includes('輝度'), desc);
  assert.ok(desc.includes('画像外の座標を指定すると NaN を返す'), desc);
});

/* RA-15: 出典フラグメントが実在しない7件＋sinh系3件はアンカーなしURLにする */
test('RA-15 sources with nonexistent fragments are anchorless page URLs', () => {
  for (const n of ['getInfo', 'roiManager', 'Dialog.create', 'contains', 'charAt', 'minOf', 'maxOf', 'Math.sinh', 'Math.cosh', 'Math.tanh'])
    assert.equal(ref(n).source, 'https://imagej.net/ij/developer/macro/functions2.html', n);
});
