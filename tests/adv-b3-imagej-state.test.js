// ブロックB3（IJ-ENG-STATE）: ImageJ 状態関数の高度ハンドラのテスト。
// 一次情報は公式 Built-in Macro Functions と本体 Functions.java。
// 期待値は一次情報から導いたものだけを書く（近似・推測の値は検証しない）。
//
// 既知の統合上の注意: 基礎エンジンの静的診断（simStaticChecks）は高度
// レジストリを参照しないため、基礎カタログにも SIM_OFFICIAL にも無い
// 23件（List.size, Table.size 等）では、実行が成功しても
// 「「X」は定義されていない関数です」の静的診断が p.error に併記される。
// first() はその診断だけを許容し、それ以外のエラーは失敗とする。
// 未対応・未検証の停止は trace の「ここで止まります：…」で確認する。
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
// 静的診断が p.error を先に占める名前では、実行時エラーの文面は trace 側に
// 現れる。エラー内容の確認は両方を合わせたテキストで行う。
const errText = (p) => ((p.error && p.error.message) || '') + '\n' + p.trace.map((t) => t.text).join('\n');
const stackModel = () => {
  const m = structuredClone(d.model.defaults);
  m.images = [{ title: 'stack.tif', w: 64, h: 64, bit: 8, channels: 2, slices: 6, frames: 1, slice: 1, zdim: 3, buckets: null, thr: null, pix: {}, spatial: false, kind: 'グレースケール' }];
  return m;
};
const twoImgModel = () => {
  const m = structuredClone(d.model.defaults);
  m.images = [
    { title: 'A.tif', w: 64, h: 64, bit: 8, channels: 1, slices: 1, frames: 1, slice: 1, buckets: null, thr: null, pix: {}, spatial: false, kind: 'グレースケール' },
    { title: 'B.tif', w: 32, h: 32, bit: 8, channels: 1, slices: 1, frames: 1, slice: 1, buckets: null, thr: null, pix: {}, spatial: false, kind: 'グレースケール' },
  ];
  return m;
};

/* ================= List.* ================= */
test('List: set/get/getValue/size/indexOf/getList', async () => {
  const p = await first('List.set("b", "2"); List.set("a", "1"); print(List.get("a")); print(List.get("zzz")); print(List.getValue("b")); print(List.size()); print(List.indexOf("b")); print(List.indexOf("q"));');
  assert.deepEqual(outputs(p), ['1', '', '2', '2', '1', '-1']);
});
test('List: getList は辞書順で key=value\\n 形式', async () => {
  const p = await first('List.set("b", "2"); List.set("a", "1"); x = List.getList(); print(x);');
  assert.deepEqual(outputs(p), ['a=1\nb=2\n']);
});
test('List: setList で一括設定し clear で空になる', async () => {
  const p = await first('List.setList("x=10\\ny: 20\\n# comment\\n"); print(List.get("x")); print(List.get("y")); List.clear(); print(List.size());');
  assert.deepEqual(outputs(p), ['10', '20', '0']);
});
test('List: fromArrays/toArrays は辞書順', async () => {
  const p = await first('k = newArray("b", "a"); v = newArray("2", "1"); List.fromArrays(k, v); kk = newArray(0); vv = newArray(0); List.toArrays(kk, vv); print(kk[0]); print(kk[1]); print(vv[0]); print(vv[1]);');
  assert.deepEqual(outputs(p), ['a', 'b', '1', '2']);
});
test('List: fromArrays の長さ不一致はエラー、getValue のキー無しはエラー', async () => {
  const r1 = await run('List.fromArrays(newArray("a"), newArray("1", "2"));');
  assert.ok(/長さが違います/.test(errText(r1.paths[0])), errText(r1.paths[0]));
  const r2 = await run('x = List.getValue("nothing");');
  assert.ok(/見つかりません/.test(errText(r2.paths[0])), errText(r2.paths[0]));
});
test('List.setMeasurements / setCommands は未検証で止まる', async () => {
  await stopped('List.setMeasurements();', 'List.setMeasurements', '未検証');
  await stopped('List.setCommands();', 'List.setCommands', '未検証');
});

/* ================= Table.* ================= */
test('Table: create/set/get/getString/headings/size と現在の表の切替', async () => {
  const p = await first([
    'Table.create("Data");',
    'Table.set("X", 0, 10); Table.set("Y", 0, "abc"); Table.set("X", 1, 20);',
    'print(Table.size()); print(Table.title()); print(Table.headings());',
    'print(Table.get("X", 1)); print(Table.getString("Y", 0)); print(Table.getString("Nope", 0));',
    'print(Table.size("Results"));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['2', 'Data', 'Label\tX\tY', '20', 'abc', 'null', '0']);
});
test('Table: getColumn/setColumn/columnExists/deleteColumn/renameColumn', async () => {
  const p = await first([
    'Table.create("T");',
    'Table.setColumn("A", newArray(3, 1, 2));',
    'c = Table.getColumn("A"); print(c[0] + c[1] + c[2]);',
    'print(Table.columnExists("A")); print(Table.columnExists("B"));',
    'Table.renameColumn("A", "B"); print(Table.headings());',
    'Table.deleteColumn("B"); print(Table.headings()); print(Table.size());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['6', '1', '0', 'Label\tB', 'Label', '3']);
});
test('Table: sort は指定列の昇順、deleteRows は範囲削除', async () => {
  const p = await first([
    'Table.create("T");',
    'Table.setColumn("V", newArray(30, 10, 20));',
    'Table.sort("V"); c = Table.getColumn("V"); print(c[0]); print(c[1]); print(c[2]);',
    'Table.deleteRows(0, 1); print(Table.size()); print(Table.get("V", 0));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['10', '20', '30', '1', '30']);
});
test('Table: setSelection/getSelectionStart/End', async () => {
  const p = await first('Table.create("T"); print(Table.getSelectionStart()); Table.setSelection(2, 5); print(Table.getSelectionStart()); print(Table.getSelectionEnd()); Table.setSelection(-1, -1); print(Table.getSelectionStart());');
  assert.deepEqual(outputs(p), ['-1', '2', '5', '-1']);
});
test('Table: rename（1引数＝現在の表）と update での切替', async () => {
  const p = await first('Table.create("T1"); Table.set("A", 0, 1); Table.rename("T2"); print(Table.title()); Table.create("T3"); print(Table.title()); Table.update("T2"); print(Table.title()); print(Table.get("A", 0));');
  assert.deepEqual(outputs(p), ['T2', 'T3', 'T2', '1']);
});
test('Table: open はモデルファイルのタブ区切りを読む', async () => {
  const m = structuredClone(d.model.defaults);
  m.files['/model/input/table.txt'] = { text: 'Label\tX\tY\nr1\t1\t2\nr2\t3\t4\n' };
  const p = await first('Table.open("/model/input/table.txt", "Loaded"); print(Table.size()); print(Table.headings()); print(Table.get("Y", 1)); print(Table.getString("Label", 0));', m);
  assert.deepEqual(outputs(p), ['2', 'Label\tX\tY', '4', 'r1']);
});
test('Table: save はモデルファイルを作る', async () => {
  const p = await first('setResult("A", 0, 1); Table.save("/model/output/res.txt"); print(File.exists("/model/output/res.txt"));');
  assert.deepEqual(outputs(p), ['1']);
});
/* FIX-IJB で格上げ（期待値変更の理由）: ResultsTable.defaultHeadings と
   Functions.java の getAllHeadings/showArrays が一次情報で確定したため、
   Table.allHeadings/showArrays は停止ではなく値を検証する（監査 T1 §4.7） */
test('Table: 存在しない表の指定はエラー、allHeadings/showArrays は値、applyMacro は停止', async () => {
  const r = await run('x = Table.size("Nope");');
  assert.ok(/見つかりません/.test(errText(r.paths[0])), errText(r.paths[0]));
  const p = await first('h = Table.allHeadings(); print(startsWith(h, "Area\tMean\tStdDev"));');
  assert.deepEqual(outputs(p), ['1']);
  const p2 = await first('a = newArray(1, 2); Table.showArrays("Data", a); print(Table.title()); print(Table.get("a", 1));');
  assert.deepEqual(outputs(p2), ['Data', '2']);
  await stopped('Table.applyMacro("code");', 'Table.applyMacro', '未対応');
  await stopped('Table.showHistogramTable();', 'Table.showHistogramTable', '未対応');
});

/* ================= getResultString / IJ.* ================= */
test('getResultString: 値・Label・無い列は "null"', async () => {
  const p = await first('setResult("Mean", 0, 12.5); setResult("Txt", 0, "hello"); print(getResultString("Txt")); print(getResultString("Label")); print(getResultString("Nope")); print(getResultString("Mean", 0));');
  assert.deepEqual(outputs(p), ['hello', 'demo.tif', 'null', '12.5']);
});
test('getResultString: 行が範囲外ならエラー', async () => {
  const r = await run('x = getResultString("Mean", 3);');
  assert.ok(/範囲外/.test(errText(r.paths[0])), errText(r.paths[0]));
});
test('IJ.log は Log に出す、IJ.deleteRows は結果表の行を消す', async () => {
  const p = await first('setResult("A", 0, 1); setResult("A", 1, 2); setResult("A", 2, 3); IJ.deleteRows(0, 1); print(nResults); IJ.log("marker");');
  assert.deepEqual(outputs(p), ['1', 'marker']);
});
test('IJ.renameResults で結果表のタイトルが変わる', async () => {
  const p = await first('setResult("A", 0, 7); IJ.renameResults("Data"); print(Table.title()); print(Table.get("A", 0));');
  assert.deepEqual(outputs(p), ['Data', '7']);
});

/* ================= Property.* / メタデータ ================= */
test('Property: set/get/getNumber/getValue、空文字列で削除', async () => {
  const p = await first([
    'Property.set("Author", "faris"); Property.set("Score", "42");',
    'print(Property.get("Author")); print(Property.getNumber("Score")); print(Property.getValue("Score"));',
    'print(Property.get("Missing")); print(isNaN(Property.getNumber("Missing")));',
    'Property.set("Author", ""); print(Property.get("Author"));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['faris', '42', '42', '', '1', '']);
});
test('Property: getList/setList と Info の共有（setMetadata/getMetadata）', async () => {
  const p = await first([
    'setMetadata("Info", "meta-info"); print(Property.getInfo()); print(Property.get("Info"));',
    'Property.setList("k1=v1\\nk2=v2"); print(Property.getList());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['meta-info', 'meta-info', 'k1=v1\nk2=v2\n']);
});
test('Property: スライスラベルと getMetadata("Label") の共有', async () => {
  const p = await first('Property.setSliceLabel("first line\\nsecond"); print(Property.getSliceLabel()); print(getMetadata("Label"));', stackModel());
  assert.deepEqual(outputs(p), ['first line\nsecond', 'first line']);
});
test('getImageInfo は未検証で止まる', async () => {
  await stopped('x = getImageInfo();', 'getImageInfo', '未検証');
});

/* ================= Roi.* ================= */
test('Roi: getType/size/contains/getBounds（矩形）', async () => {
  const p = await first([
    'makeRectangle(10, 20, 30, 40);',
    'print(Roi.getType()); print(Roi.size());',
    'print(Roi.contains(15, 25)); print(Roi.contains(40, 25)); print(selectionContains(10, 20));',
    'Roi.getBounds(bx, by, bw, bh); print(bx); print(by); print(bw); print(bh);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['rectangle', '4', '1', '0', '1', '10', '20', '30', '40']);
});
test('Roi: move/setName/setProperty/setGroup/setPosition の保持', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 10);',
    'Roi.move(5, 6); getBoundingRect(bx, by, bw, bh); print(bx); print(by);',
    'Roi.setName("roi-a"); print(Roi.getName()); print(selectionName());',
    'Roi.setProperty("key1", "v1"); print(Roi.getProperty("key1")); print(Roi.getProperty("none"));',
    'Roi.setGroup(3); print(Roi.getGroup());',
    'Roi.setPosition(2); Roi.getPosition(c, z, t); print(c); print(z); print(t);',
    'Roi.setStrokeWidth(2.5); print(Roi.getStrokeWidth());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['5', '6', 'roi-a', 'roi-a', 'v1', '', '3', '0', '2', '0', '2.5']);
});
test('Roi: copy/paste と remove', async () => {
  const p = await first([
    'makeRectangle(1, 2, 3, 4); Roi.copy(); Roi.remove(); print(selectionType());',
    'Roi.paste(); print(selectionType()); getBoundingRect(bx, by, bw, bh); print(bx); print(bw);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['-1', '0', '1', '3']);
});
/* FIX-IJB で格上げ（期待値変更の理由）: Roi.getFloatBounds は getBounds の
   double 化、getStrokeColor は Colors.colorToString、getContainedPoints は
   Functions.java getContainedFloatPoints の走査規則が一次情報で確定した
   ため、停止ではなく値を検証する（監査 T1 §4.2/§4.3/§4.6） */
test('Roi: getCoordinates（直線）と getFloatBounds/getStrokeColor/getContainedPoints', async () => {
  const p = await first('makeLine(5, 6, 50, 60); Roi.getCoordinates(xs, ys); print(xs[0]); print(xs[1]); print(ys[0]); print(ys[1]);');
  assert.deepEqual(outputs(p), ['5', '50', '6', '60']);
  const p2 = await first('makeRectangle(3, 4, 10, 20); Roi.getFloatBounds(fx, fy, fw, fh); print(fx); print(fy); print(fw); print(fh); print(Roi.getStrokeColor());');
  assert.deepEqual(outputs(p2), ['3', '4', '10', '20', 'none']);
  const p3 = await first('makeRectangle(0, 0, 2, 2); Roi.getContainedPoints(xs, ys); print(xs.length);');
  assert.deepEqual(outputs(p3), ['4']);
});
test('Roi: 点の選択（makePoint/size/getPointPosition）', async () => {
  const p = await first('makePoint(7, 8); print(Roi.getType()); print(Roi.size()); print(Roi.getPointPosition(0)); print(selectionType());');
  assert.deepEqual(outputs(p), ['point', '1', '0', '10']);
});

/* ================= RoiManager.* ================= */
test('RoiManager: size/getIndex/getName/select/selected', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 10); Roi.setName("one"); roiManager("add");',
    'makeRectangle(20, 20, 5, 5); Roi.setName("two"); roiManager("add");',
    'print(RoiManager.size()); print(RoiManager.getIndex("two")); print(RoiManager.getName(0)); print(RoiManager.getName(9));',
    'print(RoiManager.selected()); RoiManager.select(1); print(RoiManager.selected());',
    'getBoundingRect(bx, by, bw, bh); print(bx);',
    'RoiManager.selectByName("one"); getBoundingRect(cx, cy, cw, ch); print(cx);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['2', '1', 'one', '', '0', '1', '20', '0']);
});
test('RoiManager: setGroup/selectGroup/delete/translate', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 10); roiManager("add");',
    'makeRectangle(50, 50, 10, 10); roiManager("add");',
    'RoiManager.setGroup(2); RoiManager.selectGroup(2); print(RoiManager.selected());',
    'RoiManager.translate(5, 5); RoiManager.select(0); getBoundingRect(bx, by, bw, bh); print(bx); print(by);',
    'RoiManager.delete(0); print(RoiManager.size());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['2', '5', '5', '1']);
});
/* FIX-IJB で格上げ（期待値変更の理由）: RoiRotator の回転式と型変換規則が
   一次情報で確定し line/point/polygon/rectangle の範囲で実装したため
   （監査 T1 §4.5）。oval は弧サンプリング未確定で停止のまま */
test('RoiManager: rotate は対応形状で回転、oval は未検証、multiCrop は未対応', async () => {
  const p = await first('makeRectangle(0, 0, 10, 10); roiManager("add"); RoiManager.rotate(0); RoiManager.select(0); print(selectionType());');
  assert.deepEqual(outputs(p), ['2']);
  await stopped('makeEllipse(0, 0, 20, 0, 1); roiManager("add"); RoiManager.rotate(30);', 'RoiManager.rotate', '未検証');
  await stopped('RoiManager.multiCrop("/tmp", "tiff");', 'RoiManager.multiCrop', '未対応');
});

/* ================= Overlay.* ================= */
test('Overlay: addSelection/size/indexAt/hidden/removeSelection', async () => {
  const p = await first([
    'makeRectangle(10, 10, 20, 20); Overlay.addSelection();',
    'print(Overlay.size()); print(Overlay.indexAt(15, 15)); print(Overlay.indexAt(100, 100));',
    'print(Overlay.hidden()); Overlay.hide(); print(Overlay.hidden()); Overlay.show(); print(Overlay.hidden());',
    'Overlay.removeSelection(0); print(Overlay.size());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['1', '0', '-1', '0', '1', '0', '0']);
});
test('Overlay: drawRect/drawEllipse/drawLine とパス（moveTo/lineTo/add）', async () => {
  const p = await first([
    'Overlay.drawRect(0, 0, 10, 10); Overlay.drawEllipse(20, 20, 10, 10); Overlay.drawLine(0, 0, 5, 5);',
    'print(Overlay.size());',
    'Overlay.moveTo(30, 30); Overlay.lineTo(39, 30); Overlay.lineTo(39, 39); Overlay.add();',
    'print(Overlay.size()); print(Overlay.indexAt(35, 35)); print(Overlay.indexAt(5, 5));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['3', '4', '3', '0']);
});
test('Overlay: activateSelection で ROI とスライス位置が移る', async () => {
  const p = await first([
    'makeRectangle(3, 4, 10, 10); Overlay.addSelection(); Overlay.setPosition(2);',
    'makeRectangle(0, 0, 5, 5); print(getSliceNumber());',
    'Overlay.activateSelection(0); getBoundingRect(bx, by, bw, bh); print(bx); print(getSliceNumber());',
  ].join('\n'), stackModel());
  assert.deepEqual(outputs(p), ['1', '3', '2']);
});
test('Overlay: copy/paste（別画像へ）と measure', async () => {
  const p = await first([
    'makeRectangle(0, 0, 10, 20); Overlay.addSelection(); Overlay.copy();',
    'selectImage(2); print(Overlay.size()); Overlay.paste(); print(Overlay.size());',
    'Overlay.measure(); print(nResults); print(getResult("Area", 0));',
  ].join('\n'), twoImgModel());
  assert.deepEqual(outputs(p), ['0', '1', '1', '200']);
});
test('Overlay: remove と clear の区別、removeRois、paste の空エラー', async () => {
  const p = await first([
    'makeRectangle(0, 0, 5, 5); Roi.setName("keep"); Overlay.addSelection();',
    'makeRectangle(9, 9, 5, 5); Roi.setName("drop"); Overlay.addSelection();',
    'Overlay.removeRois("drop"); print(Overlay.size());',
    'Overlay.clear(); print(Overlay.size()); Overlay.setStrokeWidth(3);',
    'Overlay.remove(); print(Overlay.size());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['1', '0', '0']);
  const r = await run('Overlay.setStrokeWidth(3);');
  assert.ok(/オーバーレイが必要/.test(errText(r.paths[0])), errText(r.paths[0]));
  const r2 = await run('Overlay.paste();');
  assert.ok(/コピー済みのオーバーレイが必要/.test(errText(r2.paths[0])), errText(r2.paths[0]));
});
/* FIX-IJB で格上げ（期待値変更の理由）: Overlay.getBounds は REF_FNS_SKIP
   接続で要素 Roi の bounds を書き戻す形が Functions.java で確定したため
   （監査 T1 §4.6）。xor は未検証、flatten/cropAndSave は未対応のまま */
test('Overlay: getBounds は書き戻し、xor は未検証、flatten/cropAndSave は未対応', async () => {
  const p = await first('makeRectangle(3, 4, 10, 20); Overlay.addSelection(); Overlay.getBounds(0, bx, by, bw, bh); print(bx); print(by); print(bw); print(bh);');
  assert.deepEqual(outputs(p), ['3', '4', '10', '20']);
  await stopped('Overlay.xor(newArray(0));', 'Overlay.xor', '未検証');
  await stopped('Overlay.flatten();', 'Overlay.flatten', '未対応');
  await stopped('Overlay.cropAndSave("/tmp", "tiff");', 'Overlay.cropAndSave', '未対応');
});

/* ================= Plot.* ================= */
test('Plot: create→show→getValues（最初のデータ列が配列へ入る）', async () => {
  const p = await first([
    'Plot.create("T", "x", "y", newArray(10, 20, 30));',
    'Plot.show();',
    'xa = newArray(0); ya = newArray(0); Plot.getValues(xa, ya);',
    'print(xa.length); print(xa[0]); print(xa[2]); print(ya[1]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['3', '0', '2', '20']);
});
test('Plot: add/replace/removeNaNs のデータ列操作', async () => {
  const p = await first([
    'Plot.create("T", "x", "y");',
    'Plot.add("circle", newArray(1, 2), newArray(5, 6));',
    'Plot.add("line", newArray(0, 1, 2), newArray(7, 0/0, 9));',
    'rx = newArray(1); rx[0] = 3; ry = newArray(1); ry[0] = 4;',
    'Plot.replace(0, "line", rx, ry);',
    'Plot.removeNaNs(); Plot.show();',
    'xa = newArray(0); ya = newArray(0); Plot.getValues(xa, ya);',
    'print(xa.length); print(ya[0]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['1', '4']);
});
test('Plot: show 前の getValues はエラー、表示系の設定は通る', async () => {
  const r = await run('Plot.create("T", "x", "y", newArray(1)); xa = newArray(0); ya = newArray(0); Plot.getValues(xa, ya);');
  assert.ok(/表示済みのプロットが必要/.test(errText(r.paths[0])), errText(r.paths[0]));
  const p = await first('Plot.create("T", "x", "y", newArray(1, 2)); Plot.setLimits(0, 10, 0, 10); Plot.setLogScaleX(); Plot.freeze(true); Plot.addText("note", 0.5, 0.5); Plot.setLegend("a"); Plot.show(); Plot.update();');
  assert.equal(p.error, undefined);
});
/* FIX-IJB で格上げ（期待値変更の理由）: Plot.getLimits は setLimits 明示設定時
   の書き戻しが、addHistogram は Plot.java のビン計算が一次情報で確定したため
   （監査 T1 §4.4）。自動範囲の getLimits は軸スケーリング依存で停止のまま */
test('Plot: getLimits（明示設定）/addHistogram は値、自動範囲は未検証、eneableLive/drawBoxes は未対応', async () => {
  const p = await first('Plot.create("T", "x", "y"); Plot.setLimits(1, 9, 2, 8); Plot.getLimits(a, b, c, dd); print(a); print(b); print(c); print(dd);');
  assert.deepEqual(outputs(p), ['1', '9', '2', '8']);
  await stopped('a=0; b=0; c=0; dd=0; Plot.create("T", "x", "y"); Plot.getLimits(a, b, c, dd);', 'Plot.getLimits', '未検証');
  const p2 = await first('Plot.create("T", "x", "y"); Plot.addHistogram(newArray(0, 1, 2, 3), 2, 0); Plot.show(); xa = newArray(0); ya = newArray(0); Plot.getValues(xa, ya); print(xa.length);');
  assert.deepEqual(outputs(p2), ['3']);
  await stopped('Plot.create("T", "x", "y"); Plot.eneableLive(true);', 'Plot.eneableLive', '未対応');
  await stopped('Plot.create("T", "x", "y"); Plot.drawBoxes("boxes", newArray(1));', 'Plot.drawBoxes', '未対応');
  await stopped('Plot.create("T", "x", "y"); Plot.makeHighResolution(2, "");', 'Plot.makeHighResolution', '未対応');
});

/* ================= Stack.* ================= */
test('Stack: isHyperstack と setChannel/setSlice/setFrame', async () => {
  const p = await first([
    'print(Stack.isHyperstack());',
    'Stack.setChannel(2); Stack.setSlice(3); Stack.setFrame(1);',
    'Stack.getPosition(c, z, t); print(c); print(z); print(t);',
    'Stack.setSlice(99); Stack.getPosition(c2, z2, t2); print(z2);',
  ].join('\n'), stackModel());
  assert.deepEqual(outputs(p), ['1', '2', '3', '1', '3']);
});
test('Stack: setDimensions と setFrameRate/getFrameRate', async () => {
  const p = await first([
    'Stack.setDimensions(1, 6, 1); getDimensions(w, h, c, z, f); print(c); print(z); print(f);',
    'Stack.setFrameRate(5); print(Stack.getFrameRate());',
    'Stack.setFrameInterval(0.5); print(Stack.getFrameInterval());',
  ].join('\n'), stackModel());
  assert.deepEqual(outputs(p), ['1', '6', '1', '5', '0.5']);
});
test('Stack: toggleChannel（コンポジット必須）と swap（ラベル入替）', async () => {
  const p = await first([
    'Stack.toggleChannel(2);',
    'Property.setSliceLabel("one", 1); Property.setSliceLabel("two", 2);',
    'Stack.swap(1, 2); print(Property.getSliceLabel(1)); print(Property.getSliceLabel(2));',
  ].join('\n'), stackModel());
  assert.deepEqual(outputs(p), ['two', 'one']);
  const r = await run('Stack.toggleChannel(1);');
  assert.ok(/コンポジット/.test(errText(r.paths[0])), errText(r.paths[0]));
});
/* FIX-IJB で格上げ（期待値変更の理由）: Stack.getUnits/getDisplayMode/
   getActiveChannels はモデルの unitsArr/displayMode/activeChannels の
   書き戻しが Functions.java で確定し、getOrthoViews(IDs) は
   Orthogonal_Views.java の未起動時 {0,0,0} が確認できたため（監査 T1 §4.6） */
test('Stack: getUnits/getDisplayMode/getActiveChannels/OrthoViews は書き戻し、startOrthoViews は未対応', async () => {
  const p = await first([
    'Stack.getUnits(xu, yu, zu, tu, vu); print(xu); print(tu); print(vu);',
    'm = ""; Stack.getDisplayMode(m); print(lengthOf(m));',
    'Stack.getOrthoViews(a, b, c); print(a); print(b); print(c);',
    'Stack.getOrthoViewsIDs(a2, b2, c2); print(a2); print(b2); print(c2);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['pixels', 'sec', 'Gray Value', '0', '0', '0', '0', '0', '0', '0']);
  const p2 = await first('Stack.getActiveChannels(s); print(s);', stackModel());
  assert.deepEqual(outputs(p2), ['11']);
  await stopped('Stack.startOrthoViews();', 'Stack.startOrthoViews', '未対応');
  const p3 = await first('print(Stack.getOrthoViewsID());');
  assert.deepEqual(outputs(p3), ['0']);
});

/* ================= File.* ================= */
test('File: saveString/openAsString/append/length の往復', async () => {
  const p = await first([
    'File.saveString("hello", "/model/output/a.txt");',
    'print(File.openAsString("/model/output/a.txt"));',
    'File.append("!", "/model/output/a.txt");',
    'print(File.openAsString("/model/output/a.txt")); print(File.length("/model/output/a.txt"));',
    'print(File.length("/model/input/memo.txt"));',
    'print(File.openAsRawString("/model/output/a.txt", 3));',
    'File.saveString("hello!", "/model/output/a.dat"); print(File.openAsRawString("/model/output/a.dat", 3));',
  ].join('\n'));
  // .txt は打ち切られない（Functions.java の openRawString）。打ち切りは非 .txt で確認。
  assert.deepEqual(outputs(p), ['hello', 'hello!', '6', '18', 'hello!', 'hel']);
});
test('File: copy/rename/delete/isFile/isDirectory/makeDirectory', async () => {
  const p = await first([
    'File.copy("/model/input/memo.txt", "/model/output/copy.txt"); print(File.exists("/model/output/copy.txt"));',
    'print(File.rename("/model/output/copy.txt", "/model/output/renamed.txt"));',
    'print(File.isFile("/model/output/renamed.txt")); print(File.isDirectory("/model/output/renamed.txt"));',
    'print(File.delete("/model/output/renamed.txt")); print(File.exists("/model/output/renamed.txt"));',
    'File.makeDirectory("/model/output/newdir"); print(File.isDirectory("/model/output/newdir"));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['1', '1', '1', '0', '1', '0', '1']);
});
test('File: open/close のハンドルと二重オープンのエラー、直近ファイルの名前解決', async () => {
  const p = await first([
    'f = File.open("/model/output/log.txt"); print(f); File.close(f);',
    'x = File.openAsString("/model/input/memo.txt");',
    'print(File.name()); print(File.nameWithoutExtension()); print(File.directory());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['~0~', 'memo.txt', 'memo', '/model/input/']);
  const r = await run('f = File.open("/model/output/a.txt"); g = File.open("/model/output/b.txt");');
  assert.ok(/同時に1つ/.test(errText(r.paths[0])), errText(r.paths[0]));
});
test('File: lastModified/dateLastModified（モデルで与えた場合）', async () => {
  const m = structuredClone(d.model.defaults);
  m.files['/model/input/dated.txt'] = { text: 'x', lastModified: 0 };
  const p = await first('print(File.lastModified("/model/input/dated.txt")); print(File.dateLastModified("/model/input/dated.txt"));', m);
  assert.deepEqual(outputs(p), ['0', 'Thu Jan 01 09:00:00 JST 1970']);
});
test('File: openDialog/openUrlAsString/openSequence は未対応', async () => {
  await stopped('x = File.openDialog("選んでください");', 'File.openDialog', '未対応');
  await stopped('x = File.openUrlAsString("https://example.com/");', 'File.openUrlAsString', '未対応');
  await stopped('File.openSequence("/model/input/");', 'File.openSequence', '未対応');
});

/* ================= 色・getValue ================= */
test('色: setColor/getValue("rgb.foreground")/Color.setForegroundValue', async () => {
  const p = await first([
    'print(getValue("rgb.foreground")); print(getValue("rgb.background"));',
    'setColor("red"); print(getValue("rgb.foreground"));',
    'setColor(128); print(getValue("color.foreground"));',
    'Color.setForegroundValue(77); print(getValue("color.foreground"));',
    'setForegroundColor(10, 20, 30); print(getValue("rgb.foreground"));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['0', '16777215', '16711680', '128', '77', '660510']);
});
test('色: Color.toArray と setLut/getLut、範囲外の setColor はエラー', async () => {
  const p = await first([
    'a = Color.toArray("#ff0000"); print(a[0]); print(a[1]); print(a[2]);',
    'r = newArray(255, 128, 0); g = newArray(0, 128, 255); b = newArray(10, 20, 30);',
    'setLut(r, g, b); getLut(rr, gg, bb); print(rr[0]); print(rr[2]); print(gg[2]); print(bb[1]);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['255', '0', '0', '255', '0', '255', '20']);
  const r2 = await run('setColor(300);');
  assert.ok(/8ビット範囲/.test(errText(r2.paths[0])), errText(r2.paths[0]));
  /* FIX-IJB で格上げ（期待値変更の理由）: Color.foreground/background は
     モデルの colorState の fg/bg RGB を Colors.colorToString で文字列化する
     形が一次情報で確定したため（監査 T1 §4.2）。既定 fg=黒、bg=白 */
  const p2 = await first('print(Color.foreground()); print(Color.background());');
  assert.deepEqual(outputs(p2), ['black', 'white']);
});
test('getValue: 画素値（範囲外は NaN）と results.count', async () => {
  const p = await first([
    'print(getValue(0, 0)); print(isNaN(getValue(600, 0)));',
    'print(getValue("results.count")); setResult("A", 0, 1); print(getValue("results.count"));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['100', '1', '0', '1']);
});

/* ================= 基本の状態関数 ================= */
test('rename/calibrate/snapshot/reset/resetMinAndMax', async () => {
  const p = await first([
    'rename("new.tif"); print(getTitle()); print(calibrate(123));',
    'setPixel(0, 0, 55); snapshot(); setPixel(0, 0, 99); print(getPixel(0, 0));',
    'reset(); print(getPixel(0, 0));',
    'setMinAndMax(10, 100); resetMinAndMax(); getMinAndMax(mn, mx); print(mn); print(mx);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['new.tif', '123', '99', '55', '0', '255']);
});
test('is/isActive/getList/getDir', async () => {
  const p = await first([
    'print(is("binary")); setBatchMode(true); print(is("batch mode"));',
    'print(isActive("demo.tif")); print(isActive("nope.tif"));',
    't = getList("image.titles"); print(t[0]); print(t.length);',
    'print(getDir("フォルダ"));',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['0', '1', '1', '0', 'demo.tif', '1', '/model/input/']);
});
test('getBoolean は基礎のダイアログ慣行どおり未確定値', async () => {
  const p = await first('print(getBoolean("続けますか？"));');
  assert.deepEqual(outputs(p), ['（実行時に決まる値）']);
});
test('make系: makeEllipse の外接矩形、makeArrow/makeText の種別', async () => {
  const p = await first([
    'makeEllipse(0, 0, 100, 0, 0.5); getSelectionBounds(bx, by, bw, bh);',
    'print(bx); print(by); print(bw); print(bh); print(selectionType());',
    'makeArrow(0, 0, 10, 10); print(selectionType());',
    'makeText("abc", 5, 5); print(Roi.getType());',
    'makeRotatedRectangle(0, 0, 100, 0, 10); print(selectionType());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['0', '-25', '100', '50', '1', '5', 'text', '5']);
});
test('setKeyDown/isKeyDown と setTool', async () => {
  const p = await first('setKeyDown("shift"); print(isKeyDown("shift")); print(isKeyDown("alt")); setTool("rectangle");');
  assert.deepEqual(outputs(p), ['1', '0']);
});
test('Image.title/width/height（呼び出し形式）と Image.copy', async () => {
  const p = await first('print(Image.title()); print(Image.width()); print(Image.height()); Image.copy();', twoImgModel());
  assert.deepEqual(outputs(p), ['A.tif', '64', '64']);
  await stopped('Image.paste(0, 0);', 'Image.paste', '未検証');
});
/* FIX-IJB で格上げ（期待値変更の理由）: CurveFitter.java の静的表と閉形式の
   式種（Straight Line 等）が一次情報で確定したため（監査 T1 §4.1）。
   対応外の式種と showDialog は停止のまま */
test('Fit.* は閉形式の範囲で値、対応外は未検証、showDialog は未対応', async () => {
  const p = await first([
    'x = newArray(0, 1, 2); y = newArray(1, 3, 5);',
    'Fit.doFit("Straight Line", x, y);',
    'print(Fit.rSquared()); print(Fit.nParams()); print(Fit.f(10)); print(Fit.nEquations());',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['1', '2', '21', '25']);
  await stopped('x = newArray(0, 1); y = newArray(1, 2); Fit.doFit("Gaussian", x, y);', 'Fit.doFit', '未検証');
  await stopped('Fit.showDialog();', 'Fit.showDialog', '未対応');
});
test('実行・設定系の未対応（exec/runMacro/doCommand/debug/dump/saveSettings/newMenu）', async () => {
  await stopped('exec("ls");', 'exec', '未対応');
  await stopped('runMacro("x.ijm");', 'runMacro', '未対応');
  await stopped('doCommand("Quit");', 'doCommand', '未対応');
  await stopped('debug("dump");', 'debug', '未対応');
  await stopped('dump();', 'dump', '未対応');
  await stopped('saveSettings();', 'saveSettings', '未対応');
  await stopped('restoreSettings();', 'restoreSettings', '未対応');
  await stopped('newMenu("My Menu", newArray("a"));', 'newMenu', '未対応');
});
test('doWand/floodFill/imageCalculator は未検証で止まる', async () => {
  await stopped('doWand(10, 10);', 'doWand', '未検証');
  await stopped('floodFill(10, 10);', 'floodFill', '未検証');
  await stopped('imageCalculator("Add", "a", "b");', 'imageCalculator', '未検証');
});
/* FIX-IJB で格上げ（期待値変更の理由）: toScaled/toUnscaled は readRef 接続で
   Calibration の換算式（原点0・invertY=false）が一次情報で確定したため
   （監査 T1 §4.6） */
test('toScaled/toUnscaled は Calibration の換算で変数を書き換える', async () => {
  // toScaled は画素→実寸（×pixelWidth）、toUnscaled は実寸→画素（÷pixelWidth）
  const p = await first('setVoxelSize(2, 4, 1, "mm"); x = 10; toScaled(x); print(x); toUnscaled(x); print(x); y = 8; toScaled(x, y); print(x); print(y);');
  assert.deepEqual(outputs(p), ['20', '10', '20', '32']);
});
test('REF系: getPixelSize/getLine/getSelectionCoordinates', async () => {
  const p = await first([
    'setVoxelSize(2, 3, 4, "mm"); getPixelSize(u, pw, ph, pd); print(u); print(pw); print(ph); print(pd);',
    'makeLine(1, 2, 30, 40); getLine(x1, y1, x2, y2, lw); print(x1); print(x2);',
    'getSelectionCoordinates(xs, ys); print(xs[1]); print(ys[1]);',
    'makeRectangle(0, 0, 5, 5); getLine(a1, a2, a3, a4, a5); print(a1);',
  ].join('\n'));
  assert.deepEqual(outputs(p), ['mm', '2', '3', '4', '1', '30', '30', '40', '-1']);
});
test('save（名前空間なし）はモデルファイルを作る', async () => {
  const p = await first('save("/model/output/img.tif"); print(File.exists("/model/output/img.tif"));');
  assert.deepEqual(outputs(p), ['1']);
});
