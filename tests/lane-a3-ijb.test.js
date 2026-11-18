// FIX-IJ-B（ImageJ 状態・書き戻し・Color・Fit系）の回帰テスト。
// 期待値は監査 T1 報告書（lane-a3-t1-w2-ij.md）の導出値と一次情報
// （CurveFitter.java／Colors.java／Roi.java／Plot.java／Functions.java）
// から導いたものだけを書く（近似・推測の値は検証しない）。
// ハーネスは adv-b3-imagej-state.test.js と同じ流儀。
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { applyAdvancedEngine } from '../js/types/imagej/advanced-engine.js';

const d = getDefinition('imagej');
applyAdvancedEngine(d);
const run = async (code, model) => d.simulate(code, model || structuredClone(d.model.defaults));
const STATIC_DIAG_NAMES = new Set([
  'reset', 'Table.size', 'Table.title', 'Table.headings', 'List.size', 'Property.getList',
  'Roi.size', 'RoiManager.size', 'selectionName', 'Overlay.size', 'Overlay.hidden',
  'Plot.appendToStack', 'File.directory', 'File.name', 'File.nameWithoutExtension',
  'Image.title', 'Image.width', 'Image.height', 'Fit.rSquared', 'Fit.nParams',
  'Fit.nEquations', 'Color.foreground', 'Color.background',
]);
const first = async (code, model) => {
  const r = await run(code, model);
  assert.equal(r.error, undefined, code + ' -> ' + (r.error && r.error.message));
  assert.equal(r.paths.length, 1, code);
  const p = r.paths[0];
  if (p.error) {
    const m = /「(.+)」は定義されていない関数です/.exec(p.error.message);
    assert.ok(m && STATIC_DIAG_NAMES.has(m[1]), code + ' -> unexpected error: ' + p.error.message);
  }
  return p;
};
const stopped = async (code, name, kind, model) => {
  const r = await run(code, model);
  assert.equal(r.paths.length, 1, code);
  const p = r.paths[0];
  const tail = p.trace.map((t) => t.text).join('\n');
  assert.ok(
    tail.includes('ここで止まります：' + kind + '：' + name),
    code + ' -> expected stop ' + kind + '：' + name + '\ntrace:\n' + tail,
  );
  return p;
};
const outputs = (p) => p.outputs.map((o) => o.text);
const traceText = (p) => p.trace.map((t) => t.text).join('\n');
const errText = (p) => ((p.error && p.error.message) || '') + '\n' + traceText(p);
const stackModel = () => {
  const m = structuredClone(d.model.defaults);
  m.images = [{ title: 'stack.tif', w: 64, h: 64, bit: 8, channels: 2, slices: 6, frames: 1, slice: 1, zdim: 3, buckets: null, thr: null, pix: {}, spatial: false, kind: 'グレースケール' }];
  return m;
};

/* ================= A. Color 系 ================= */
test('IJB-A: Color.toString は13色名と #rrggbb、成分はクランプ', async () => {
  const p = await first([
    'print(Color.toString(255, 0, 0));',
    'print(Color.toString(255, 200, 0));',
    'print(Color.toString(1, 2, 3));',
    'print(Color.toString(300, -5, 0));',
    'print(Color.toString(192, 192, 192));',
    'print(Color.toString(64, 64, 64));',
    'print(Color.toString(128, 128, 128));',
    'print(Color.toString(255, 175, 175));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['red', 'orange', '#010203', 'red', 'lightGray', 'darkGray', 'gray', 'pink']);
});
test('IJB-A: Color.foreground/background は colorState の色を返す', async () => {
  const p = await first([
    'print(Color.foreground()); print(Color.background());',
    'setColor("red"); print(Color.foreground());',
    'setForegroundColor(0, 255, 0); print(Color.foreground());',
    'setBackgroundColor(0, 0, 255); print(Color.background());',
    'Color.setForeground("#010203"); print(Color.foreground());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['black', 'white', 'red', 'green', 'blue', '#010203']);
});
test('IJB-A: Color.foreground は値のみ設定の経路では未確定値に倒れる', async () => {
  const p = await first('setColor(200); c = Color.foreground(); print("done");');
  assert.deepEqual(outputs(p), ['done']);
  assert.ok(traceText(p).includes('Color.foreground：前景色が値のみで設定されているため'), traceText(p));
});
test('IJB-A: Color.wavelengthToColor の期待値列（Colors.java 区間式・γ=0.8）', async () => {
  const p = await first([
    'print(Color.wavelengthToColor(440));',
    'print(Color.wavelengthToColor(490));',
    'print(Color.wavelengthToColor(500));',
    'print(Color.wavelengthToColor(510));',
    'print(Color.wavelengthToColor(580));',
    'print(Color.wavelengthToColor(645));',
    'print(Color.wavelengthToColor(380));',
    'print(Color.wavelengthToColor(300));',
    'print(Color.wavelengthToColor(800));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['blue', 'cyan', '#00ff92', 'green', 'yellow', 'red', '#610061', 'black', 'black']);
});
test('IJB-A: Roi.getStrokeColor/getFillColor/getDefaultColor', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 10);',
    'print(Roi.getStrokeColor()); print(Roi.getFillColor()); print(Roi.getDefaultColor());',
    'Roi.setStrokeColor("red"); print(Roi.getStrokeColor());',
    'Roi.setStrokeColor(1, 2, 3); print(Roi.getStrokeColor());',
    'Roi.setFillColor(255, 200, 0); print(Roi.getFillColor());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['none', 'none', 'yellow', 'red', '#010203', 'orange']);
});
test('IJB-A/E2: Roi.setFillColor は面 ROI の線色を null に戻す（line は不変）', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 10);',
    'Roi.setStrokeColor("red");',
    'Roi.setFillColor("blue");',
    'print(Roi.getStrokeColor()); print(Roi.getFillColor());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['none', 'blue']);
  const q = await first([
    'makeLine(0, 0, 10, 10);',
    'Roi.setStrokeColor("red");',
    'Roi.setFillColor("blue");',
    'print(Roi.getStrokeColor());',
  ].join('\n'));
  assert.deepEqual(outputs(q), ['red']);
});

/* ================= B. Fit 系 ================= */
test('IJB-B: IJ-R1 Straight Line → rSquared=1, nParams=2, f(10)=21', async () => {
  const p = await first([
    'xs = newArray(0, 1, 2); ys = newArray(1, 3, 5);',
    'Fit.doFit("Straight Line", xs, ys);',
    'print(Fit.rSquared()); print(Fit.nParams()); print(Fit.f(10));',
    'print(Fit.p(0)); print(Fit.p(1));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['1', '2', '21', '1', '2']);
});
test('IJB-B: Fit.nEquations は 25、式番号でも doFit できる', async () => {
  const p = await first('print(Fit.nEquations()); xs = newArray(0, 1, 2); ys = newArray(1, 3, 5); Fit.doFit(0, xs, ys); print(Fit.f(10));');
  assert.deepEqual(outputs(p), ['25', '21']);
});
test('IJB-B: Fit.getEquation は静的表を未初期化変数へ書き戻す（REF_SKIP=1）', async () => {
  const p = await first([
    'Fit.getEquation(0, nm, fm); print(nm); print(fm);',
    'Fit.getEquation(12, nm2, fm2, mc2); print(nm2); print(fm2); print(mc2);',
    'Fit.getEquation(24, nm3, fm3); print(nm3); print(fm3);',
  ].join('\n'));
  assert.deepEqual(outputs(p), [
    'Straight Line', 'y = a+bx',
    'Gaussian', 'y = a + (b-a)*exp(-(x-c)*(x-c)/(2*d*d))', 'y = a+(b-a)*Math.exp(-(x-c)*(x-c)/(2*d*d))',
    'Error Function', 'y = a+b*erf((x-c)/d)',
  ]);
  const r = await run('Fit.getEquation(25, nm, fm);');
  assert.ok(/範囲外/.test(errText(r.paths[0])), errText(r.paths[0]));
});
test('IJB-B: 多項式は正規方程式の厳密解（2次: 1+2x+3x^2）', async () => {
  const p = await first([
    'xs = newArray(0, 1, 2, 3); ys = newArray(1, 6, 17, 34);',
    'Fit.doFit("2nd Degree Polynomial", xs, ys);',
    'print(Fit.p(0)); print(Fit.p(1)); print(Fit.p(2)); print(Fit.rSquared()); print(Fit.f(4)); print(Fit.nParams());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['1', '2', '3', '1', '57', '3']);
});
test('IJB-B: Exponential (linear regression) は対数変換後の直線回帰', async () => {
  const p = await first([
    'xs = newArray(0, 1, 2); ys = newArray(2, 3.2974425414002564, 5.43656365691809);',
    'Fit.doFit("Exponential (linear regression)", xs, ys);',
    'print(Fit.p(0)); print(Fit.p(1)); print(Fit.rSquared());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['2', '0.5', '1']);
});
test('IJB-B: Power (linear regression) は両対数変換後の直線回帰', async () => {
  const p = await first([
    'xs = newArray(1, 2, 4); ys = newArray(3, 12, 48);',
    'Fit.doFit("Power (linear regression)", xs, ys);',
    'print(Fit.p(0)); print(Fit.p(1)); print(Fit.f(3)); print(Fit.rSquared());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['3', '2', '27', '1']);
});
test('IJB-B: Fit.doWeightedFit（重み付き直線・2点は重みによらず厳密）', async () => {
  const p = await first([
    'xs = newArray(0, 1); ys = newArray(1, 3); ws = newArray(2, 5);',
    'Fit.doWeightedFit("Straight Line", xs, ys, ws);',
    'print(Fit.f(10)); print(Fit.rSquared());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['21', '1']);
});
test('IJB-B: 対応範囲外の組み込み式とカスタム式は式名を挙げて未検証停止', async () => {
  const p1 = await stopped('xs = newArray(0, 1, 2); ys = newArray(1, 2, 3); Fit.doFit("Gaussian", xs, ys);', 'Fit.doFit', '未検証');
  assert.ok(traceText(p1).includes('Gaussian'), traceText(p1));
  assert.ok(traceText(p1).includes('Nelder-Mead'), traceText(p1));
  const p2 = await stopped('xs = newArray(0, 1, 2); ys = newArray(1, 2, 3); Fit.doFit("y = a+b*x", xs, ys);', 'Fit.doFit', '未検証');
  assert.ok(traceText(p2).includes('y = a+b*x'), traceText(p2));
});
test('IJB-B: doFit 未実施の参照は実 ImageJ どおり "No fit" エラー', async () => {
  for (const code of ['x = Fit.rSquared();', 'x = Fit.p(0);', 'x = Fit.nParams();', 'x = Fit.f(1);', 'Fit.plot();']) {
    const r = await run(code);
    assert.ok(/No fit/.test(errText(r.paths[0])), code + ' -> ' + errText(r.paths[0]));
  }
});
test('IJB-B: Fit.plot は対応 doFit の後でも Fitter.java 未取得の理由で未検証停止', async () => {
  const p = await stopped('xs = newArray(0, 1, 2); ys = newArray(1, 3, 5); Fit.doFit("Straight Line", xs, ys); Fit.plot();', 'Fit.plot', '未検証');
  assert.ok(traceText(p).includes('Fitter.java'), traceText(p));
});
test('IJB-B: 不明な式名と長さ不一致は実 ImageJ どおりエラー', async () => {
  const r1 = await run('xs = newArray(0, 1); ys = newArray(1, 2); Fit.doFit("NoSuchFit", xs, ys);');
  assert.ok(/Unrecognized fit/.test(errText(r1.paths[0])), errText(r1.paths[0]));
  const r2 = await run('xs = newArray(0, 1); ys = newArray(1); Fit.doFit("Straight Line", xs, ys);');
  assert.ok(/Arrays not same length/.test(errText(r2.paths[0])), errText(r2.paths[0]));
});
test('IJB-B: Fit.logResults は後続 doFit の結果を Log へ出す（フラグは1回で解除）', async () => {
  const p = await first([
    'xs = newArray(0, 1, 2); ys = newArray(1, 3, 5);',
    'Fit.logResults();',
    'Fit.doFit("Straight Line", xs, ys);',
    'Fit.doFit("Straight Line", xs, ys);',
  ].join('\n'));
  /* Log 行は outputs に1行ずつ現れる。2回目の doFit では出ないこと */
  const outs = outputs(p);
  assert.equal(outs.filter((o) => o === 'Formula: y = a+bx').length, 1, outs.join('\n'));
  assert.ok(outs.includes('Macro code: y = a+x*b'), outs.join('\n'));
  assert.ok(outs.includes('R^2: 1'), outs.join('\n'));
  assert.ok(outs.includes('\ta = 1') && outs.includes('\tb = 2'), outs.join('\n'));
});

/* ================= C. Plot／Table／Roi／Stack ================= */
test('IJB-C: Table.allHeadings は既定見出し38件をタブ区切りで返す', async () => {
  const p = await first('print(Table.allHeadings());');
  assert.deepEqual(outputs(p), ['Area\tMean\tStdDev\tMode\tMin\tMax\tX\tY\tXM\tYM\tPerim.\tBX\tBY\tWidth\tHeight\tMajor\tMinor\tAngle\tCirc.\tFeret\tIntDen\tMedian\tSkew\tKurt\t%Area\tRawIntDen\tCh\tSlice\tFrame\tFeretX\tFeretY\tFeretAngle\tMinFeret\tAR\tRound\tSolidity\tMinThr\tMaxThr']);
});
test('IJB-C: Roi.getProperties はキーソート済みの "key: value\\n" 連結、無ければ ""', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 10);',
    'print(lengthOf(Roi.getProperties()));',
    'Roi.setProperty("b", "2"); Roi.setProperty("a", "1");',
    'print(Roi.getProperties());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['0', 'a: 1\nb: 2\n']);
});
test('IJB-C: RoiManager.rotate は直線を中心まわりに回転し型を保つ', async () => {
  const p = await first([
    'makeLine(0, 0, 10, 0); roiManager("add");',
    'RoiManager.rotate(90);',
    'roiManager("select", 0);',
    'Roi.getCoordinates(xs, ys);',
    'print(xs[0]); print(ys[0]); print(xs[1]); print(ys[1]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['5', '-5', '5', '5']);
});
test('IJB-C: RoiManager.rotate は rectangle を polygon 化する（種別コード 0→2）', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 20); roiManager("add");',
    'roiManager("select", 0); print(selectionType());',
    'RoiManager.rotate(0);',
    'roiManager("select", 0);',
    'print(selectionType());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['0', '2']);
});
test('IJB-C: RoiManager.rotate は oval を形状名つきで未検証停止する', async () => {
  const p = await stopped('makeOval(0, 0, 10, 10); roiManager("add"); RoiManager.rotate(30);', 'RoiManager.rotate', '未検証');
  assert.ok(traceText(p).includes('oval'), traceText(p));
});
test('IJB-C: Plot.addHistogram の作業例（values 0..9, binWidth 2, binCenter 0）', async () => {
  const p = await first([
    'Plot.create("h", "x", "count");',
    'vals = newArray(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);',
    'Plot.addHistogram(vals, 2, 0);',
    'Plot.show();',
    'xs = newArray(0); ys = newArray(0); Plot.getValues(xs, ys);',
    'print(xs.length); print(xs[0]); print(xs[5]);',
    'print(ys[0]); print(ys[1]); print(ys[2]); print(ys[3]); print(ys[4]); print(ys[5]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['6', '0', '10', '1', '2', '2', '2', '2', '1']);
});
test('IJB-C: Plot.addHistogram の自動ビニング（Scott の式）', async () => {
  const p = await first([
    'Plot.create("h", "x", "count");',
    'vals = newArray(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);',
    'Plot.addHistogram(vals, 0);',
    'Plot.show();',
    'xs = newArray(0); ys = newArray(0); Plot.getValues(xs, ys);',
    'print(xs.length); print(ys[0]); print(ys[1]); print(ys[2]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['3', '3', '4', '3']);
});
test('IJB-C: Plot.showValues は X/Y 列の表を作り、同一 X は共有する', async () => {
  const p = await first([
    'xs = newArray(0, 1, 2); y1 = newArray(10, 11, 12); y2 = newArray(20, 21, 22);',
    'Plot.create("t", "X", "Y", xs, y1);',
    'Plot.add("line", xs, y2);',
    'Plot.show();',
    'Plot.showValues();',
    'print(Table.headings()); print(Table.size());',
    'print(Table.get("X", 2)); print(Table.get("Y", 0)); print(Table.get("Y1", 1));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['Label\tX\tY\tY1', '3', '2', '10', '21']);
});
test('IJB-C: Plot.showValues は長さの違う列を "" で埋め、エラー列は ERR', async () => {
  const p = await first([
    'xs = newArray(0, 1, 2); ys = newArray(5, 6, 7);',
    'x2 = newArray(0, 1); y2 = newArray(8, 9);',
    'Plot.create("t", "X", "Y", xs, ys);',
    'Plot.add("line", x2, y2);',
    'Plot.show();',
    'Plot.showValues();',
    'print(Table.headings());',
    'print(Table.getString("Y1", 2));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['Label\tX\tY\tX1\tY1', '']);
  const q = await first([
    'xs = newArray(0, 1); ys = newArray(5, 6); es = newArray(1, 2);',
    'Plot.create("t", "X", "Y");',
    'Plot.add("line", xs, ys, es);',
    'Plot.show();',
    'Plot.showValues();',
    'print(Table.headings()); print(Table.get("ERR", 0));',
  ].join('\n'));
  assert.deepEqual(outputs(q), ['Label\tX\tY\tERR', '1']);
});
test('IJB-C: Plot.showValuesWithLabels はラベルを replaceSpacesEtc で変換する', async () => {
  const p = await first([
    'xs = newArray(0, 1); ys = newArray(5, 6);',
    'x2 = newArray(10, 11); y2 = newArray(7, 8);',
    'Plot.create("t", "Time (s)", "Signal, raw", xs, ys);',
    'Plot.add("line", x2, y2, "my data");',
    'Plot.show();',
    'Plot.showValuesWithLabels();',
    'print(Table.headings());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['Label\tTime_(s)\tSignal__raw\tX_my_data\tmy_data']);
});
test('IJB-C: Plot.showValues は表示済みプロットが無ければ "No plot window" エラー', async () => {
  const r = await run('Plot.showValues();');
  assert.ok(/No plot window/.test(errText(r.paths[0])), errText(r.paths[0]));
});

/* ================= D. 書き戻し（REF）系 ================= */
test('IJB-D: Plot.getLimits は setLimits の明示値を未初期化変数へ書き戻す', async () => {
  const p = await first([
    'Plot.create("t", "x", "y");',
    'Plot.setLimits(0, 10, -1, 1);',
    'Plot.getLimits(a, b, c, dd);',
    'print(a); print(b); print(c); print(dd);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['0', '10', '-1', '1']);
});
test('IJB-D: Plot.getLimits は自動範囲では未初期化変数でも名指し停止に届く', async () => {
  const p = await stopped('Plot.create("t", "x", "y"); Plot.getLimits(a, b, c, dd);', 'Plot.getLimits', '未検証');
  assert.ok(traceText(p).includes('自動範囲は軸スケーリング計算に依存するため'), traceText(p));
});
test('IJB-D: Roi.getFloatBounds は整数 bounds を書き戻す', async () => {
  const p = await first([
    'makeRectangle(3, 4, 10, 20);',
    'Roi.getFloatBounds(x, y, w, h);',
    'print(x); print(y); print(w); print(h);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['3', '4', '10', '20']);
});
test('IJB-D: Roi.getContainedPoints は外接矩形内を行優先に走査する', async () => {
  const p = await first([
    'makeRectangle(0, 0, 3, 2);',
    'Roi.getContainedPoints(xs, ys);',
    'print(xs.length); print(xs[3]); print(ys[3]); print(xs[5]); print(ys[5]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['6', '0', '1', '2', '1']);
  const q = await stopped('makeLine(0, 0, 5, 5); Roi.getContainedPoints(xs, ys);', 'Roi.getContainedPoints', '未検証');
  assert.ok(traceText(q).includes('line'), traceText(q));
});
test('IJB-D: Roi.getFeretPoints は正方形の最大点対（対角）と最小キャリパを返す', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 10);',
    'Roi.getFeretPoints(xs, ys);',
    'print(xs[0]); print(ys[0]); print(xs[1]); print(ys[1]);',
    'print(xs[2]); print(ys[2]); print(xs[3]); print(ys[3]);',
  ].join('\n'));
  const o = outputs(p).map(Number);
  assert.deepEqual(o.slice(0, 4), [0, 0, 10, 10]);
  const seg = Math.hypot(o[6] - o[4], o[7] - o[5]);
  assert.ok(Math.abs(seg - 10) < 1e-6, 'min Feret segment length: ' + seg);
});
test('IJB-D: Roi.getSplineAnchors は rectangle の4隅と line の端点を返す', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 20);',
    'Roi.getSplineAnchors(xs, ys);',
    'print(xs.length); print(xs[1]); print(xs[2]); print(ys[2]); print(ys[3]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['4', '10', '10', '20', '20']);
  const q = await first([
    'makeLine(1, 2, 30, 40);',
    'Roi.getSplineAnchors(xs, ys);',
    'print(xs[0]); print(ys[0]); print(xs[1]); print(ys[1]);',
  ].join('\n'));
  assert.deepEqual(outputs(q), ['1', '2', '30', '40']);
  const r = await stopped('makeOval(0, 0, 10, 10); Roi.getSplineAnchors(xs, ys);', 'Roi.getSplineAnchors', '未検証');
  assert.ok(traceText(r).includes('oval'), traceText(r));
});
test('IJB-D: Stack.getUnits は既定を Calibration どおり補完し、設定値を書き戻す', async () => {
  const p = await first([
    'Stack.getUnits(xu, yu, zu, tu, vu);',
    'print(xu); print(yu); print(zu); print(tu); print(vu);',
    'Stack.setUnits("mm", "mm", "mm", "min", "intensity");',
    'Stack.getUnits(a2, b2, c2, d2, e2);',
    'print(a2); print(c2); print(d2); print(e2);',
  ].join('\n'), stackModel());
  assert.deepEqual(outputs(p), ['pixels', 'pixels', 'pixels', 'sec', 'Gray Value', 'mm', 'mm', 'min', 'intensity']);
});
test('IJB-D: Stack.getDisplayMode は非コンポジットで ""、既定は composite', async () => {
  const p = await first('Stack.getDisplayMode(m); print("[" + m + "]");');
  assert.deepEqual(outputs(p), ['[]']);
  const q = await first([
    'Stack.getDisplayMode(m); print(m);',
    'Stack.setDisplayMode("color");',
    'Stack.getDisplayMode(m2); print(m2);',
  ].join('\n'), stackModel());
  assert.deepEqual(outputs(q), ['composite', 'color']);
});
test('IJB-D: Stack.getActiveChannels は既定 "1" の列、非コンポジットはエラー', async () => {
  const p = await first([
    'Stack.getActiveChannels(s); print(s);',
    'Stack.setActiveChannels("10");',
    'Stack.getActiveChannels(s2); print(s2);',
  ].join('\n'), stackModel());
  assert.deepEqual(outputs(p), ['11', '10']);
  const r = await run('Stack.getActiveChannels(s);');
  assert.ok(/コンポジット画像が必要/.test(errText(r.paths[0])), errText(r.paths[0]));
});
test('IJB-D: Stack.getOrthoViews／getOrthoViewsIDs は未起動のため常に {0,0,0}', async () => {
  const p = await first([
    'Stack.getOrthoViews(a, b, c); print(a); print(b); print(c);',
    'Stack.getOrthoViewsIDs(d, e2, f); print(d); print(e2); print(f);',
  ].join('\n'), stackModel());
  assert.deepEqual(outputs(p), ['0', '0', '0', '0', '0', '0']);
});
test('IJB-D: Overlay.getBounds は要素の外接矩形を書き戻し、範囲外は NaN', async () => {
  const p = await first([
    'makeRectangle(3, 4, 10, 20); Overlay.addSelection();',
    'Overlay.getBounds(0, x, y, w, h);',
    'print(x); print(y); print(w); print(h);',
    'v = Overlay.getBounds(5, x2, y2, w2, h2);',
    'print(isNaN(v));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['3', '4', '10', '20', '1']);
});
test('IJB-D: toScaled／toUnscaled は Calibration 換算で変数を書き換える', async () => {
  const p = await first([
    'setVoxelSize(0.5, 0.25, 2, "um");',
    'x = 10; toScaled(x); print(x);',
    'a = 10; b = 8; toScaled(a, b); print(a); print(b);',
    'c = 10; dd = 8; z = 3; toScaled(c, dd, z); print(z);',
    'u = 5; toUnscaled(u); print(u);',
    'xs = newArray(2, 4); ys = newArray(4, 8); toScaled(xs, ys);',
    'print(xs[0]); print(xs[1]); print(ys[0]); print(ys[1]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['5', '5', '2', '6', '10', '1', '2', '1', '2']);
});
test('IJB-D: toScaled は未初期化変数でも誤原因エラーにならず未確定値を書き戻す', async () => {
  const p = await first('toScaled(q); print("done");');
  assert.deepEqual(outputs(p), ['done']);
  assert.ok(traceText(p).includes('変換結果は省略します'), traceText(p));
});
test('IJB-D: Table.showArrays は変数名を見出しにし、1配列ならタイトル=変数名', async () => {
  const p = await first([
    'a = newArray(1, 2, 3);',
    'Table.showArrays(a);',
    'print(Table.title()); print(Table.headings()); print(Table.get("Value", 1));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['a', 'Label\tValue', '2']);
  const q = await first([
    'a = newArray(1, 2, 3); b = newArray("x", "y");',
    'Table.showArrays("Data", a, b);',
    'print(Table.headings()); print(Table.getString("b", 0)); print(Table.getString("b", 2));',
  ].join('\n'));
  assert.deepEqual(outputs(q), ['Label\ta\tb', 'x', '']);
});
test('IJB-D: Table.showArrays の "(indexes)" と "(row numbers)" オプション', async () => {
  const p = await first([
    'a = newArray(7, 8);',
    'Table.showArrays("Data (indexes)", a);',
    'print(Table.title()); print(Table.headings()); print(Table.getString("Index", 1));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['Data', 'Label\tIndex\ta', '1']);
  const q = await first([
    'a = newArray(7, 8);',
    'Table.showArrays("Data (row numbers)", a);',
    'print(Table.getString("Label", 0)); print(Table.getString("Label", 1));',
  ].join('\n'));
  assert.deepEqual(outputs(q), ['1', '2']);
});

/* ================= E. その他の是正 ================= */
test('IJB-E1: Overlay.setLabelFontSize は2引数（options つき）でも動作する', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 10); Overlay.addSelection();',
    'Overlay.setLabelFontSize(12, "bold");',
    'Overlay.setLabelFontSize(10);',
    'print("done");',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['done']);
});
test('IJB-E4: Overlay.flatten／Plot.appendToStack の例文は呼び出し形で名指し停止する', async () => {
  await stopped('makeRectangle(0, 0, 10, 10); Overlay.addSelection(); Overlay.flatten();', 'Overlay.flatten', '未対応');
  await stopped('Plot.create("t", "x", "y"); Plot.appendToStack();', 'Plot.appendToStack', '未対応');
});
test('IJB-E4: reset() と selectionName() は呼び出し形で動作する', async () => {
  const p = await first('reset(); print("done");');
  assert.deepEqual(outputs(p), ['done']);
  const q = await first('makeRectangle(0, 0, 5, 5); Roi.setName("abc"); n = selectionName(); print(n);');
  assert.deepEqual(outputs(q), ['abc']);
});
test('IJB-E3: 理由書き換え6件のうち、停止理由文が統一されていること', async () => {
  const p1 = await stopped('List.setMeasurements();', 'List.setMeasurements', '未検証');
  assert.ok(traceText(p1).includes('ALL_STATS+SLICE'), traceText(p1));
  const p2 = await stopped('x = 0; y = 0; w = 0; h = 0; Plot.getFrameBounds(x, y, w, h);', 'Plot.getFrameBounds', '未検証');
  assert.ok(traceText(p2).includes('フォントメトリクス'), traceText(p2));
  assert.ok(traceText(p2).includes('REF_FNS の拡張だけでは確定しない'), traceText(p2));
  const p3 = await stopped('xs = newArray(0, 1); ys = newArray(0, 1); Roi.setPolygonSplineAnchors(xs, ys);', 'Roi.setPolygonSplineAnchors', '未検証');
  assert.ok(traceText(p3).includes('キャンバス表示倍率'), traceText(p3));
  const p4 = await stopped('xs = newArray(0, 1); ys = newArray(0, 1); Roi.setPolylineSplineAnchors(xs, ys);', 'Roi.setPolylineSplineAnchors', '未検証');
  assert.ok(traceText(p4).includes('キャンバス表示倍率'), traceText(p4));
  const p5 = await stopped('v = IJ.getFullVersion();', 'IJ.getFullVersion', '未検証');
  assert.ok(traceText(p5).includes('書式は VERSION+BUILD と確定するが'), traceText(p5));
});
