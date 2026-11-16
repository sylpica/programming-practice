// バッチ13（imagej 班）: Codex 監査 R7 の ImageJ 系 B 裁定13件の回帰テスト。
// 一次情報は ImageJ 1.54p の Functions.java（lengthOf／sortArray／
// makeSelection／getFileList／getBounds）と公式 Built-in Macro Functions、
// Roi.getBounds() の整数矩形。裁定の正本は
// ~/workspace/programming-practice-audit/findings-step5-imagej.md。
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

const d = getDefinition('imagej');
const run = async (code, model) => d.simulate(code, model || structuredClone(d.model.defaults));
const first = async (code, model) => {
  const r = await run(code, model);
  assert.equal(r.error, undefined, code + ' -> ' + (r.error && r.error.message));
  assert.equal(r.paths.length, 1, code);
  const p = r.paths[0];
  assert.equal(p.error, undefined, code + ' -> ' + (p.error && p.error.message));
  return p;
};
const outputs = (p) => p.outputs.map((o) => o.text);
const errors = (r) => {
  const list = [];
  if (r.error) list.push(r.error.message);
  for (const p of r.paths || []) if (p.error) list.push(p.error.message);
  return list;
};
const imgModel = () => {
  const m = structuredClone(d.model.defaults);
  m.images = [{ title: 'img.tif', w: 64, h: 64, bit: 8, channels: 1, slices: 1, frames: 1, slice: 1, buckets: null, thr: null, pix: {}, spatial: false, kind: 'グレースケール' }];
  return m;
};
const twoImgModel = () => {
  const m = imgModel();
  m.images = [
    { title: 'A', w: 64, h: 64, bit: 8, channels: 1, slices: 1, frames: 1, slice: 1, buckets: null, thr: null, pix: {}, spatial: false, kind: 'グレースケール' },
    { title: 'B', w: 64, h: 64, bit: 8, channels: 1, slices: 1, frames: 1, slice: 1, buckets: null, thr: null, pix: {}, spatial: false, kind: 'グレースケール' },
  ];
  return m;
};
const fileModel = () => {
  const m = structuredClone(d.model.defaults);
  m.directories = { '/workspace/work/r7c/ij-fixtures/': '/workspace/work/r7c/ij-fixtures/', '/workspace/work/r7c/ij-fixtures/sub/': '/workspace/work/r7c/ij-fixtures/sub/' };
  m.files = {
    '/workspace/work/r7c/ij-fixtures/a.txt': { text: 'a' },
    '/workspace/work/r7c/ij-fixtures/.hidden': { text: 'h' },
    '/workspace/work/r7c/ij-fixtures/Thumbs.db': { text: 't' },
    '/workspace/work/r7c/ij-fixtures/sub/nested.txt': { text: 'n' },
  };
  return m;
};

/* ---------- R7-31: lengthOf は数値を文字列化しない（Functions.java） ---------- */

test('R7-31 lengthOf(number literal) stops with "String or array expected" semantics', async () => {
  for (const code of ['print(lengthOf(-1));', 'print(lengthOf(123));', 'print(lengthOf(1.5));']) {
    const r = await run(code + ' print("after");');
    assert.ok(errors(r).some((m) => /lengthOf には文字列か配列が必要です/.test(m)), code + ' -> ' + JSON.stringify(errors(r)));
    assert.ok(!JSON.stringify(r.paths).includes('after'), code);
  }
});

test('R7-31 lengthOf(numeric variable) also stops (Variable.getString() is null)', async () => {
  const r = await run('x = -1; print(lengthOf(x)); print("after");');
  assert.ok(errors(r).some((m) => /lengthOf には文字列か配列が必要です/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('after'));
});

test('R7-31 lengthOf(string / array) still returns the length', async () => {
  assert.deepEqual(outputs(await first('print(lengthOf("abc"));')), ['3']);
  assert.deepEqual(outputs(await first('a = newArray(1, 2, 3); print(lengthOf(a));')), ['3']);
  assert.deepEqual(outputs(await first('s = "sample"; print(lengthOf(s));')), ['6']);
});

test('R7-31 sibling string functions still stringify numbers (different code path)', async () => {
  assert.deepEqual(outputs(await first('print(startsWith(123, "1"));')), ['1']);
  assert.deepEqual(outputs(await first('print(substring(12345, 1, 3));')), ['23']);
});

/* ---------- R7-55: テンプレート ij-1 の guide 文面 ---------- */

test('R7-55 template ij-1 no longer claims conditions must always use ==', () => {
  const tpl = d.templates.find((t) => t.id === 'ij-1');
  assert.ok(tpl, 'ij-1 template exists');
  assert.ok(!/必ず ==/.test(tpl.intro), tpl.intro);
  assert.ok(/等しいかどうかの比較には ==/.test(tpl.intro), tpl.intro);
});

/* ---------- R7-88: eval は未対応として名指し停止 ---------- */

test('R7-88 eval stops as named-unsupported and inner output is not fabricated', async () => {
  const r = await run('eval("print(\\"INNER\\");"); print("AFTER");');
  assert.ok(errors(r).some((m) => /未対応：eval はモデルで未対応です/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('INNER'));
  assert.ok(!JSON.stringify(r.paths).includes('AFTER'));
});

test('R7-88 eval reference item discloses unsupported', () => {
  const ev = d.reference.find((r) => r.name === 'eval');
  assert.equal(ev.supported, false);
  assert.ok(ev.caution.includes('このアプリでは未対応として停止する。'), ev.caution);
});

test('R7-88 eval with an undetermined argument stays undetermined (no false stop)', async () => {
  const m = structuredClone(d.model.defaults);
  m.runtime = {};
  const p = await first('eval(getArgument()); print("after");', m);
  assert.deepEqual(outputs(p), ['after']);
});

/* ---------- R7-89: Array.sort の混在型 ---------- */

test('R7-89 Array.sort of a mixed string/number array stops ("Mixed strings and numbers")', async () => {
  for (const code of ['a = newArray("b", 1); Array.sort(a);', 'a = newArray(1, "b"); Array.sort(a);', 'a = newArray(3, "x", 1); Array.sort(a);']) {
    const r = await run(code + ' print("after");');
    assert.ok(errors(r).some((m) => /混在/.test(m)), code + ' -> ' + JSON.stringify(errors(r)));
    assert.ok(!JSON.stringify(r.paths).includes('after'), code);
  }
});

test('R7-89 homogeneous arrays still sort (numbers and strings)', async () => {
  assert.deepEqual(outputs(await first('a = newArray(3, 1, 2); Array.sort(a); print(a[0]); print(a[2]);')), ['1', '3']);
  assert.deepEqual(outputs(await first('a = newArray("b", "A", "c"); Array.sort(a); print(a[0]); print(a[1]); print(a[2]);')), ['A', 'b', 'c']);
});

/* ---------- R7-90: Array.sort の3個以上の並行配列 ---------- */

test('R7-90 Array.sort with three arrays sorts all in the same order', async () => {
  const p = await first('a = newArray(2, 1); b = newArray("b", "a"); c = newArray(4, 3); Array.sort(a, b, c); print(a[0]); print(b[0]); print(c[0]); print(a[1]); print(b[1]); print(c[1]);');
  assert.deepEqual(outputs(p), ['1', 'a', '3', '2', 'b', '4']);
});

test('R7-90 Array.sort with four arrays also works', async () => {
  const p = await first('a = newArray(2, 1); b = newArray(20, 10); c = newArray(200, 100); e = newArray(2000, 1000); Array.sort(a, b, c, e); print(a[0]); print(b[0]); print(c[0]); print(e[0]);');
  assert.deepEqual(outputs(p), ['1', '10', '100', '1000']);
});

test('R7-90 a later parallel array with a different length stops', async () => {
  const r = await run('a = newArray(2, 1); b = newArray(1, 2); c = newArray(1); Array.sort(a, b, c); print("after");');
  assert.ok(errors(r).some((m) => /Array\.sort の配列の長さが違います/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('after'));
});

test('R7-90 reference discloses the parallel-array form', () => {
  const as = d.reference.find((r) => r.name === 'Array.sort');
  assert.equal(as.syntax, 'Array.sort(array, ...)');
});

/* ---------- R7-91: getFileList のサブフォルダと除外規則 ---------- */

test('R7-91 getFileList includes subdirectories with trailing slash and excludes hidden/Thumbs.db', async () => {
  const p = await first('a = getFileList("/workspace/work/r7c/ij-fixtures/"); for (i = 0; i < a.length; i++) { print(a[i]); }', fileModel());
  assert.deepEqual(outputs(p), ['a.txt', 'sub/']);
});

test('R7-91 getFileList of the default model folder lists its files', async () => {
  const p = await first('a = getFileList("/model/input/"); for (i = 0; i < a.length; i++) { print(a[i]); }');
  assert.deepEqual(outputs(p), ['image1.tif', 'image2.tif', 'memo.txt']);
});

test('R7-91 getFileList of an unmodeled folder stays undetermined', async () => {
  const p = await first('print(getFileList("/outside/"));');
  assert.deepEqual(outputs(p), ['（実行時に決まる値）']);
});

/* ---------- R7-92: File.exists はフォルダも存在として返す ---------- */

test('R7-92 File.exists returns 1 for modeled folders (sub and root)', async () => {
  assert.deepEqual(outputs(await first('print(File.exists("/workspace/work/r7c/ij-fixtures/sub/"));', fileModel())), ['1']);
  assert.deepEqual(outputs(await first('print(File.exists("/workspace/work/r7c/ij-fixtures/"));', fileModel())), ['1']);
});

test('R7-92 File.exists still returns 1 for files and 0 for missing paths under a known folder', async () => {
  assert.deepEqual(outputs(await first('print(File.exists("/workspace/work/r7c/ij-fixtures/a.txt"));', fileModel())), ['1']);
  assert.deepEqual(outputs(await first('print(File.exists("/model/input/nope.tif"));')), ['0']);
  assert.deepEqual(outputs(await first('print(File.exists("/model/input/"));')), ['1']);
});

/* ---------- R7-99: 画像 ID の安定性 ---------- */

test('R7-99 image ID survives closing another image', async () => {
  const p = await first('selectImage("B"); id = getImageID(); selectImage("A"); close(); selectImage(id); print(getTitle()); print(nImages);', twoImgModel());
  assert.deepEqual(outputs(p), ['B', '1']);
});

test('R7-99 IDs are unique per image and new images get fresh IDs', async () => {
  const p = await first('print(getImageID()); newImage("C", "8-bit black", 10, 10, 1); print(getImageID()); selectImage(1); print(getImageID());');
  assert.deepEqual(outputs(p), ['-1', '-2', '-1']);
});

test('R7-99 isOpen resolves stable IDs after a close', async () => {
  const p = await first('newImage("C", "8-bit black", 10, 10, 1); id = getImageID(); close(); print(isOpen(id)); print(isOpen(-1));');
  assert.deepEqual(outputs(p), ['0', '1']);
});

test('R7-99 positional selectImage (1-based) still works', async () => {
  const p = await first('selectImage(2); print(getTitle()); selectImage(1); print(getTitle());', twoImgModel());
  assert.deepEqual(outputs(p), ['B', 'A']);
});

/* ---------- R7-187: ROI 外接矩形は整数矩形（Roi.getBounds） ---------- */

test('R7-187 line bounds include both endpoints and use the minimum corner', async () => {
  const p = await first('makeLine(10, 10, 0, 0); getSelectionBounds(x, y, w, h); print(x); print(y); print(w); print(h);', imgModel());
  assert.deepEqual(outputs(p), ['0', '0', '11', '11']);
  const p2 = await first('makeLine(10, 10, 0, 0); getBoundingRect(x, y, w, h); print(x); print(y); print(w); print(h);', imgModel());
  assert.deepEqual(outputs(p2), ['0', '0', '11', '11']);
});

test('R7-187 fractional rectangle/oval bounds are floored/ceiled to integers', async () => {
  const p = await first('makeRectangle(0, 2.5, 1, 1.5); getSelectionBounds(x, y, w, h); print(x); print(y); print(w); print(h);', imgModel());
  assert.deepEqual(outputs(p), ['0', '2', '1', '2']);
  const p2 = await first('makeOval(0, 2.5, 1, 1.5); getBoundingRect(x, y, w, h); print(x); print(y); print(w); print(h);', imgModel());
  assert.deepEqual(outputs(p2), ['0', '2', '1', '2']);
});

/* ---------- R7-188: 幅0の矩形は選択なし ---------- */

test('R7-188 a width-0 rectangle is no selection (selectionType -1, bounds = whole image)', async () => {
  const p = await first('makeRectangle(0, 2, 0, 1); print(selectionType()); getSelectionBounds(x, y, w, h); print(x); print(y); print(w); print(h);', imgModel());
  assert.deepEqual(outputs(p), ['-1', '0', '0', '64', '64']);
});

test('R7-188 a normal rectangle is still a selection', async () => {
  const p = await first('makeRectangle(0, 2, 3, 1); print(selectionType());', imgModel());
  assert.deepEqual(outputs(p), ['0']);
});

/* ---------- R7-189〜R7-191: makeSelection ---------- */

test('R7-189 makeSelection type strings follow the Functions.java contains rules', async () => {
  const cases = [['line', '6'], ['polyline', '6'], ['freeline', '7'], ['freehand', '3'], ['traced', '4'], ['angle', '8'], ['point', '10'], ['polygon', '2']];
  for (const [type, code] of cases) {
    const p = await first('xs = newArray(10, 0, 5); ys = newArray(10, 0, 7); makeSelection("' + type + '", xs, ys); print(selectionType());', imgModel());
    assert.deepEqual(outputs(p), [code], type);
  }
});

test('R7-190 makeSelection with mismatched X/Y lengths stops ("Arrays are not the same length")', async () => {
  const r = await run('xs = newArray(10, 0, 5); ys = newArray(10, 0); makeSelection("polygon", xs, ys); print("after");', imgModel());
  assert.ok(errors(r).some((m) => /長さが違います/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('after'));
});

test('R7-191 makeSelection 4th argument n uses only the first n points', async () => {
  const p = await first('xs = newArray(10, 0, 5); ys = newArray(10, 0, 7); makeSelection("point", xs, ys, 2); print(selectionType()); getSelectionBounds(x, y, w, h); print(x); print(y); print(w); print(h);', imgModel());
  assert.deepEqual(outputs(p), ['10', '0', '0', '10', '10']);
});

test('R7-191 makeSelection with n larger than the arrays stops ("Array too short")', async () => {
  const r = await run('xs = newArray(10, 0, 5); ys = newArray(10, 0, 7); makeSelection("point", xs, ys, 5); print("after");', imgModel());
  assert.ok(errors(r).some((m) => /点数（5）が座標配列の長さを超えています/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('after'));
});

test('R7-189 sibling: numeric selection types are accepted like selectionType values', async () => {
  const p = await first('xs = newArray(10, 0); ys = newArray(10, 0); makeSelection(5, xs, ys); print(selectionType());', imgModel());
  assert.deepEqual(outputs(p), ['5']);
  const p2 = await first('xs = newArray(10, 0, 5); ys = newArray(10, 0, 7); makeSelection(0, xs, ys); print(selectionType());', imgModel());
  assert.deepEqual(outputs(p2), ['2']);
});

test('R7-189 sibling: invalid numeric selection types stop ("Invalid selection type")', async () => {
  for (const n of ['9', '-1']) {
    const r = await run('xs = newArray(10, 0, 5); ys = newArray(10, 0, 7); makeSelection(' + n + ', xs, ys); print("after");', imgModel());
    assert.ok(errors(r).some((m) => /選択種別（/.test(m) && /不正です/.test(m)), n + ' -> ' + JSON.stringify(errors(r)));
    assert.ok(!JSON.stringify(r.paths).includes('after'), n);
  }
});

test('R7-189 sibling: numeric line type with != 2 points stops ("2 element arrays expected")', async () => {
  const r = await run('xs = newArray(10, 0, 5); ys = newArray(10, 0, 7); makeSelection(5, xs, ys); print("after");', imgModel());
  assert.ok(errors(r).some((m) => /2点の座標配列が必要/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('after'));
});

test('R7-191 reference discloses the optional 4th argument', () => {
  const ms = d.reference.find((r) => r.name === 'makeSelection');
  assert.equal(ms.syntax, 'makeSelection(type, xpoints, ypoints [, n])');
});
