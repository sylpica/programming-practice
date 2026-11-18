// ブロックB3（IJ-ENG-PURE）: ImageJ 純粋関数の高度ハンドラのテスト。
// 一次情報は公式 Built-in Macro Functions（2025-02-15 更新）と
// ImageJ 本体 Functions.java（master）。期待値は各関数の一次情報の
// 記述・実装から導いたもの（推測で作った期待値は入れない）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { definition } from '../js/types/imagej/index.js';
import { applyAdvancedEngine } from '../js/types/imagej/advanced-engine.js';

applyAdvancedEngine(definition);

const d = definition;
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
/* 未対応・未検証は「名指しで止まり、理由（cause）が表示される」ことを、
   結果全体（トレースには text + cause が入る）で確認する */
const stopsWith = async (code, nameRe, reasonRe) => {
  const r = await run(code + ' print("after");');
  const all = JSON.stringify(r);
  assert.ok(errors(r).some((m) => nameRe.test(m)), code + ' -> ' + JSON.stringify(errors(r)));
  if (reasonRe) assert.ok(reasonRe.test(all), code + ' -> reason not found in ' + all.slice(0, 400));
  assert.ok(!all.includes('"after"') || !outputs(r.paths[0] || { outputs: [] }).includes('after'), code);
  assert.ok(!(r.paths?.[0]?.outputs || []).some((o) => o.text === 'after'), code + ' should not reach after');
};

/* ---------- Array.concat（Functions.java concatArray） ---------- */

test('Array.concat joins arrays and scalar values into a new array', async () => {
  const p = await first('a = Array.concat(newArray(1, 2), newArray(3, 4), 5, "six"); print(String.join(a));');
  assert.deepEqual(outputs(p), ['1, 2, 3, 4, 5, six']);
});

test('Array.concat does not mutate the source arrays', async () => {
  const p = await first('a = newArray(1, 2); b = Array.concat(a, newArray(3, 4)); print(String.join(a)); print(String.join(b));');
  assert.deepEqual(outputs(p), ['1, 2', '1, 2, 3, 4']);
});

/* ---------- Array.deleteIndex / deleteValue ---------- */

test('Array.deleteIndex returns a new array without the element, original unchanged', async () => {
  const p = await first('a = newArray(10, 20, 30); b = Array.deleteIndex(a, 1); print(String.join(b)); print(String.join(a));');
  assert.deepEqual(outputs(p), ['10, 30', '10, 20, 30']);
});

test('Array.deleteIndex out of range stops (checkIndex)', async () => {
  const r = await run('a = newArray(1, 2); b = Array.deleteIndex(a, 2); print("after");');
  assert.ok(errors(r).some((m) => /Array\.deleteIndex の位置/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!(r.paths?.[0]?.outputs || []).some((o) => o.text === 'after'));
});

test('Array.deleteValue removes all numeric matches', async () => {
  const p = await first('a = newArray(1, 2, 1, 3); b = Array.deleteValue(a, 1); print(String.join(b));');
  assert.deepEqual(outputs(p), ['2, 3']);
});

test('Array.deleteValue removes NaN elements when value is NaN (Functions.java)', async () => {
  const p = await first('a = newArray(1, sqrt(-1), 2, sqrt(-1)); b = Array.deleteValue(a, sqrt(-1)); print(String.join(b));');
  assert.deepEqual(outputs(p), ['1, 2']);
});

test('Array.deleteValue with a string value only removes string elements', async () => {
  const p = await first('a = newArray("a", "b", "a"); b = Array.deleteValue(a, "a"); print(String.join(b));');
  assert.deepEqual(outputs(p), ['b']);
});

/* ---------- Array.fill / reverse / rotate（その場で書き換える） ---------- */

test('Array.fill assigns the value to every element in place', async () => {
  const p = await first('a = newArray(1, 2, 3); Array.fill(a, 7); print(String.join(a));');
  assert.deepEqual(outputs(p), ['7, 7, 7']);
});

test('Array.reverse reverses in place', async () => {
  const p = await first('a = newArray(1, 2, 3); Array.reverse(a); print(String.join(a));');
  assert.deepEqual(outputs(p), ['3, 2, 1']);
});

test('Array.rotate with positive d rotates right (official description)', async () => {
  const p = await first('a = newArray(1, 2, 3, 4); Array.rotate(a, 1); print(String.join(a));');
  assert.deepEqual(outputs(p), ['4, 1, 2, 3']);
});

test('Array.rotate with negative d rotates left', async () => {
  const p = await first('a = newArray(1, 2, 3, 4); Array.rotate(a, -1); print(String.join(a));');
  assert.deepEqual(outputs(p), ['2, 3, 4, 1']);
});

test('Array.rotate by the array length is identity, empty array is safe', async () => {
  const p = await first('a = newArray(1, 2, 3); Array.rotate(a, 3); print(String.join(a)); b = newArray(); Array.rotate(b, 2); print(lengthOf(b));');
  assert.deepEqual(outputs(p), ['1, 2, 3', '0']);
});

test('Array handlers reject a non-array argument like Array.sort does', async () => {
  const r = await run('Array.reverse(5); print("after");');
  assert.ok(errors(r).some((m) => /Array\.reverse の引数が配列ではありません/.test(m)), JSON.stringify(errors(r)));
});

/* ---------- Array.slice / trim（新しい配列を返す） ---------- */

test('Array.slice extracts a range and defaults end to the length', async () => {
  const p = await first('a = newArray(10, 20, 30, 40); print(String.join(Array.slice(a, 1, 3))); print(String.join(Array.slice(a, 2)));');
  assert.deepEqual(outputs(p), ['20, 30', '30, 40']);
});

test('Array.slice clamps an end beyond the length', async () => {
  const p = await first('a = newArray(1, 2, 3); print(String.join(Array.slice(a, 1, 99)));');
  assert.deepEqual(outputs(p), ['2, 3']);
});

test('Array.slice with a negative start stops ("Invalid argument")', async () => {
  const r = await run('a = newArray(1, 2); b = Array.slice(a, -1); print("after");');
  assert.ok(errors(r).some((m) => /Array\.slice の開始位置/.test(m)), JSON.stringify(errors(r)));
});

test('Array.trim returns the first n elements, original unchanged, n clamped', async () => {
  const p = await first('a = newArray(1, 2, 3, 4); print(String.join(Array.trim(a, 2))); print(String.join(a)); print(String.join(Array.trim(a, 99)));');
  assert.deepEqual(outputs(p), ['1, 2', '1, 2, 3, 4', '1, 2, 3, 4']);
});

/* ---------- Array.filter（文字列要素だけが対象、Functions.java filterArray） ---------- */

test('Array.filter keeps string elements containing the filter', async () => {
  const p = await first('a = newArray("abc", "abd", "xyz"); print(String.join(Array.filter(a, "ab")));');
  assert.deepEqual(outputs(p), ['abc, abd']);
});

test('Array.filter with a parenthesised filter uses regular expression matching', async () => {
  const p = await first('a = newArray("a1.tif", "a2.txt", "b3.tif"); print(String.join(Array.filter(a, "(\\\\.tif)")));');
  assert.deepEqual(outputs(p), ['a1.tif, b3.tif']);
});

test('Array.filter on a numeric array returns an empty array', async () => {
  const p = await first('a = newArray(1, 2, 3); print(lengthOf(Array.filter(a, "1")));');
  assert.deepEqual(outputs(p), ['0']);
});

/* ---------- Array.getSequence ---------- */

test('Array.getSequence returns 0..n-1 and handles 0', async () => {
  const p = await first('print(String.join(Array.getSequence(5))); print(lengthOf(Array.getSequence(0)));');
  assert.deepEqual(outputs(p), ['0, 1, 2, 3, 4', '0']);
});

test('Array.getSequence with a negative size stops', async () => {
  const r = await run('a = Array.getSequence(-1); print("after");');
  assert.ok(errors(r).some((m) => /Array\.getSequence の要素数/.test(m)), JSON.stringify(errors(r)));
});

/* ---------- Array.rankPositions（argsort、公式説明＋sortArray での使われ方） ---------- */

test('Array.rankPositions returns indexes starting with the smallest value', async () => {
  const p = await first('a = newArray(30, 10, 20); print(String.join(Array.rankPositions(a)));');
  assert.deepEqual(outputs(p), ['1, 2, 0']);
});

test('Array.rankPositions works for string arrays', async () => {
  const p = await first('a = newArray("b", "a", "c"); print(String.join(Array.rankPositions(a)));');
  assert.deepEqual(outputs(p), ['1, 0, 2']);
});

test('Array.rankPositions rejects mixed string/number arrays', async () => {
  const r = await run('a = newArray(1, "b"); r = Array.rankPositions(a); print("after");');
  assert.ok(errors(r).some((m) => /Array\.rankPositions の配列に数値と文字列が混在/.test(m)), JSON.stringify(errors(r)));
});

/* ---------- Array.getVertexAngles（Functions.java の式そのまま） ---------- */

test('Array.getVertexAngles of a square contour is 90 degrees at every vertex', async () => {
  const p = await first('x = newArray(0, 10, 10, 0); y = newArray(0, 0, 10, 10); print(String.join(Array.getVertexAngles(x, y, 1)));');
  assert.deepEqual(outputs(p), ['90, 90, 90, 90']);
});

test('Array.getVertexAngles of a straight vertex is 0 (official: straight=0)', async () => {
  // 中央の頂点 (5,0) は直線上で角度 0。両端の頂点は phi=180 になるが、
  // Functions.java の正規化（while (phi >= 180) phi -= 360）で -180 になる。
  const p = await first('x = newArray(0, 5, 10); y = newArray(0, 0, 0); print(String.join(Array.getVertexAngles(x, y, 1)));');
  assert.deepEqual(outputs(p), ['-180, 0, -180']);
});

test('Array.getVertexAngles with different lengths stops ("Same size expected")', async () => {
  const r = await run('x = newArray(0, 1); y = newArray(0, 1, 2); a = Array.getVertexAngles(x, y, 1); print("after");');
  assert.ok(errors(r).some((m) => /Array\.getVertexAngles の2つの配列の長さが違います/.test(m)), JSON.stringify(errors(r)));
});

/* ---------- Array.print（Log へ1行、Functions.java printArray） ---------- */

test('Array.print writes the array to the Log on a single line', async () => {
  const p = await first('Array.print(newArray(1, 2, 3)); Array.print(newArray("a", "b"));');
  assert.deepEqual(outputs(p), ['1, 2, 3', 'a, b']);
});

test('Array.print supports the prefix form', async () => {
  const p = await first('Array.print("vals:", newArray(1, 2));');
  assert.deepEqual(outputs(p), ['vals: 1, 2']);
});

/* ---------- Math.*（Functions.java doMath） ---------- */

test('Math.erf matches the error function at known points', async () => {
  const p = await first('print(Math.erf(0)); print(Math.erf(1)); print(Math.erf(-1)); print(Math.erf(2));');
  assert.deepEqual(outputs(p), ['0', '0.8427', '-0.8427', '0.9953']);
});

test('Math.toRadians and Math.toDegrees convert angles', async () => {
  const p = await first('print(Math.toRadians(180)); print(Math.toDegrees(3.141592653589793));');
  assert.deepEqual(outputs(p), ['3.1416', '180']);
});

test('Math.constrain clamps to the min-max range', async () => {
  const p = await first('print(Math.constrain(15, 0, 10)); print(Math.constrain(-5, 0, 10)); print(Math.constrain(5, 0, 10));');
  assert.deepEqual(outputs(p), ['10', '0', '5']);
});

test('Math.map linearly maps between ranges (Functions.java formula)', async () => {
  const p = await first('print(Math.map(5, 0, 10, 0, 100)); print(Math.map(0.5, 0, 1, 0, 255));');
  assert.deepEqual(outputs(p), ['50', '127.5']);
});

test('Math handlers validate arity at runtime', async () => {
  const r1 = await run('print(Math.erf(1, 2));');
  assert.ok(errors(r1).some((m) => /Math\.erf の引数の数が違います/.test(m)), JSON.stringify(errors(r1)));
  const r2 = await run('print(Math.map(1, 2, 3, 4));');
  assert.ok(errors(r2).some((m) => /Math\.map の引数の数が違います/.test(m)), JSON.stringify(errors(r2)));
});

/* ---------- String バッファ（Functions.java の Interpreter.buffer） ---------- */

test('String.append/String.buffer/String.resetBuffer share one buffer per run', async () => {
  // 既知事項: 基礎 engine.js の SIM_OFFICIAL に "String.buffer" が無いため、
  // 静的チェックの「定義されていない関数です」診断が併記される（実行時の
  // 戻り値そのものは正しい）。診断の除去は基礎側の修正事項として報告済み。
  const r = await run('String.resetBuffer(); String.append("ab"); String.append("cd"); print(String.buffer()); String.resetBuffer(); print(lengthOf(String.buffer()));');
  const p = r.paths[0];
  assert.deepEqual(outputs(p), ['abcd', '0']);
});

/* ---------- String.format（java.util.Formatter、引数はすべて Double） ---------- */

test('String.format %f uses Java HALF_UP rounding on the decimal digits', async () => {
  const p = await first('print(String.format("%.2f", 3.14159)); print(String.format("%.0f", 2.5)); print(String.format("%.2f", 1.005));');
  assert.deepEqual(outputs(p), ['3.14', '3', '1.01']);
});

test('String.format supports width, zero padding and left justification', async () => {
  const p = await first('print(String.format("%05.1f", 2.5)); print(String.format("[%10.3f]", 1.5)); print(String.format("[%-10.3f]", 1.5));');
  assert.deepEqual(outputs(p), ['002.5', '[     1.500]', '[1.500     ]']);
});

test('String.format %e and %g follow Java rules (no trailing-zero stripping for %g)', async () => {
  const p = await first('print(String.format("%.3e", 12345.678)); print(String.format("%g", 1234567)); print(String.format("%g", 100)); print(String.format("%g", 0.000012345));');
  assert.deepEqual(outputs(p), ['1.235e+04', '1.23457e+06', '100.000', '1.23450e-05']);
});

test('String.format %s formats a Double the Java way, %% and explicit indexes work', async () => {
  const p = await first('print(String.format("%s", 2)); print(String.format("%2$s %1$s", 1.5, 2.5)); print(String.format("100%%"));');
  assert.deepEqual(outputs(p), ['2.0', '2.5 1.5', '100%']);
});

test('String.format supports grouping and hex float', async () => {
  const p = await first('print(String.format("%,.2f", 12345.678)); print(String.format("%a", 1.5)); print(String.format("%a", 3));');
  assert.deepEqual(outputs(p), ['12,345.68', '0x1.8p0', '0x1.8p1']);
});

test('String.format result can be assigned to a string variable', async () => {
  const p = await first('s = String.format("%.1f", 2.25); print(s);');
  assert.deepEqual(outputs(p), ['2.3']);
});

test('String.format %d with a Double argument stops like Java (IllegalFormatConversionException)', async () => {
  const r = await run('print(String.format("%d", 3)); print("after");');
  assert.ok(errors(r).some((m) => /String\.format でエラーが発生しました/.test(m)), JSON.stringify(errors(r)));
  assert.ok(JSON.stringify(r).includes('IllegalFormatConversionException'));
  assert.ok(!(r.paths?.[0]?.outputs || []).some((o) => o.text === 'after'));
});

test('String.format with a missing argument stops (MissingFormatArgumentException)', async () => {
  const r = await run('print(String.format("%.2f %.2f", 1.5)); print("after");');
  assert.ok(JSON.stringify(r).includes('MissingFormatArgumentException'), JSON.stringify(errors(r)));
});

/* ---------- File のパス文字列操作（java.io.File、Functions.java doFile） ---------- */

test('File.getName extracts the file name from a path', async () => {
  const p = await first('print(File.getName("/model/input/image1.tif")); print(File.getName("/a/b/")); print(File.getName("image1.tif"));');
  assert.deepEqual(outputs(p), ['image1.tif', 'b', 'image1.tif']);
});

test('File.getName handles Windows-style separators', async () => {
  const p = await first('print(File.getName("C:\\\\Users\\\\wayne\\\\blobs.tif")); print(File.getDirectory("C:\\\\Users\\\\wayne\\\\blobs.tif"));');
  assert.deepEqual(outputs(p), ['blobs.tif', 'C:/Users/wayne/']);
});

test('File.getNameWithoutExtension strips only the last extension', async () => {
  const p = await first('print(File.getNameWithoutExtension("/a/b/archive.tar.gz")); print(File.getNameWithoutExtension("/a/b/blobs.tif")); print(File.getNameWithoutExtension("/a/b/README"));');
  assert.deepEqual(outputs(p), ['archive.tar', 'blobs', 'README']);
});

test('File.getDirectory returns the parent with a trailing separator, or empty', async () => {
  const p = await first('print(File.getDirectory("/a/b/c.txt")); print(lengthOf(File.getDirectory("c.txt")));');
  assert.deepEqual(outputs(p), ['/a/b/', '0']);
});

test('File.getParent returns the parent without a trailing separator, or empty', async () => {
  const p = await first('s = File.getParent("/a/b/c.txt"); print(s); print(lengthOf(File.getParent("c.txt")));');
  assert.deepEqual(outputs(p), ['/a/b', '0']);
});

/* ---------- IJ.pad / IJ.checksum ---------- */

test('IJ.pad pads numbers and strings with leading zeros (same pad() as String.pad)', async () => {
  const p = await first('print(IJ.pad(7, 3)); print(IJ.pad("ab", 4)); print(IJ.pad(1234, 3));');
  assert.deepEqual(outputs(p), ['007', '00ab', '1234']);
});

test('IJ.checksum of a string matches the published MD5/SHA-256 test vectors', async () => {
  const p = await first('print(IJ.checksum("MD5 string", "abc")); print(IJ.checksum("SHA-256 string", "abc")); print(IJ.checksum("MD5 string", ""));');
  assert.deepEqual(outputs(p), [
    '900150983cd24fb0d6963f7d28e17f72',
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'd41d8cd98f00b204e9800998ecf8427e',
  ]);
});

test('IJ.checksum file form hashes the model file text and returns "0" for a missing file', async () => {
  const m = structuredClone(d.model.defaults);
  m.files = { '/data/note.txt': { text: 'abc' } };
  const p = await first('print(IJ.checksum("MD5 file", "/data/note.txt")); print(IJ.checksum("MD5 file", "/data/missing.bin"));', m);
  assert.deepEqual(outputs(p), ['900150983cd24fb0d6963f7d28e17f72', '0']);
});

test('IJ.checksum with an invalid method stops with the ImageJ error text', async () => {
  const r = await run('print(IJ.checksum("CRC string", "abc")); print("after");');
  assert.ok(errors(r).some((m) => /IJ\.checksum の method が不正です/.test(m)), JSON.stringify(errors(r)));
  assert.ok(JSON.stringify(r).includes("must contain 'file' or 'string' and 'MD5' or 'SHA-256'"));
});

/* ---------- toHex / toBinary（(int) 変換＋ Java の Integer 文字列化） ---------- */

test('toHex and toBinary convert with (int) truncation', async () => {
  const p = await first('print(toHex(255)); print(toHex(255.9)); print(toBinary(5));');
  assert.deepEqual(outputs(p), ['ff', 'ff', '101']);
});

test('toHex and toBinary of negative numbers use 32-bit two\'s complement (Java)', async () => {
  const p = await first('print(toHex(-1)); print(toBinary(-1));');
  assert.deepEqual(outputs(p), ['ffffffff', '11111111111111111111111111111111']);
});

/* ---------- getTime / wait（実行時に決まる値・待機） ---------- */

test('getTime returns an execution-time value without stopping', async () => {
  const p = await first('t = getTime(); print("ok");');
  assert.deepEqual(outputs(p), ['ok']);
});

test('wait proceeds without actually waiting', async () => {
  const p = await first('wait(10); print("done");');
  assert.deepEqual(outputs(p), ['done']);
});

/* ---------- 未確定値の伝播（推測で値を返さない） ---------- */

test('pure handlers propagate undetermined arguments instead of guessing', async () => {
  const m = structuredClone(d.model.defaults);
  m.runtime = {};
  const p = await first('x = Array.getSequence(getArgument()); s = String.format("%.2f", getArgument()); print("after");', m);
  assert.deepEqual(outputs(p), ['after']);
});

/* ---------- 未対応（名指しで停止し、理由が表示される） ---------- */

test('getStringWidth stops as unsupported (font metrics are not modeled)', async () => {
  await stopsWith('print(getStringWidth("abc"));', /未対応：getStringWidth/, /フォント計測/);
});

test('String.copy stops as unsupported (clipboard is not modeled)', async () => {
  await stopsWith('String.copy("abc");', /未対応：String\.copy/, /クリップボード/);
});

test('String.paste stops and names the function', async () => {
  // 既知事項: 基礎の SIM_OFFICIAL に "String.paste" が無いため、表示される
  // エラーは静的チェックの「定義されていない関数です」が先行する。
  // 実行時ハンドラ側の未対応登録は engine-advanced-pure.js にある。
  const r = await run('s = String.paste(); print("after");');
  assert.ok(errors(r).some((m) => /String\.paste/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!(r.paths?.[0]?.outputs || []).some((o) => o.text === 'after'));
});

test('Array.show stops as unsupported (no array window in the model)', async () => {
  await stopsWith('a = newArray(1, 2); Array.show(a);', /未対応：Array\.show/, /ウィンドウ/);
});

test('String.show stops as unsupported (no text window in the model)', async () => {
  await stopsWith('String.show("hello");', /未対応：String\.show/, /テキストウィンドウ/);
});

test('IJ memory functions stop as unsupported (JVM state is not modeled)', async () => {
  await stopsWith('print(IJ.freeMemory());', /未対応：IJ\.freeMemory/, /JVM/);
});

test('File.getDefaultDir stops as unsupported (OS default directory)', async () => {
  await stopsWith('print(File.getDefaultDir());', /未対応：File\.getDefaultDir/, /既定ディレクトリ/);
});

test('screenWidth stops as unsupported (display size is not modeled)', async () => {
  await stopsWith('print(screenWidth());', /未対応：screenWidth/, /画面の幅/);
});

/* ---------- 未検証（名指しで停止し、理由が表示される） ---------- */

/* Array.fourier は FHT.java を追加取得（lane-a3-t1 監査の fetch.sh 台帳、
   sha256 1aadbb22…）して fourier1D の定義が確定したため実装に格上げ（FIX-IJ-A）。
   以前の「未検証で停止」の期待値は、一次情報の取得を根拠に置き換えた。
   定数 {1,1,1,1}・窓なしでは result[0] = 平均×√2 = √2、result[1] = 0。 */
test('Array.fourier is implemented per FHT.fourier1D (source fetched by audit)', async () => {
  const p = await first('a = newArray(1, 1, 1, 1); f = Array.fourier(a); print(String.join(f));');
  assert.deepEqual(outputs(p), ['1.4142, 0']);
});

test('Array.resample is implemented per Tools.resampleArray (source fetched at integration)', async () => {
  const p = await first('a = newArray(0, 10); b = Array.resample(a, 3); print(b[1]);');
  assert.deepEqual(outputs(p), ['5']);
});

/* Array.findMaxima / findMinima は MaximumFinder.java を追加取得（lane-a3-t1
   監査の fetch.sh 台帳、sha256 a13a6a1e…）して定義が確定したため実装に格上げ
   （FIX-IJ-A）。以前の「未検証で停止」の期待値は一次情報の取得を根拠に置き換えた。
   監査報告書の期待値例: {0,5,0,3,0}・tolerance 0・edgeMode 既定（0）→ {1,3}。 */
test('Array.findMaxima is implemented per MaximumFinder.findMaxima (source fetched by audit)', async () => {
  const p = await first('a = newArray(0, 5, 0, 3, 0); m = Array.findMaxima(a, 0); print(String.join(m));');
  assert.deepEqual(outputs(p), ['1, 3']);
});

test('Array.findMinima is implemented per MaximumFinder.findMinima (delegates to findMaxima)', async () => {
  const p = await first('a = newArray(0, -5, 0, -3, 0); m = Array.findMinima(a, 0); print(String.join(m));');
  assert.deepEqual(outputs(p), ['1, 3']);
});

/* FIX-IJB で格上げ（期待値変更の理由）: Colors.java が一次情報として
   取得でき、区間式・減衰・ガンマ（0.8）・floor(×255) と colorToString が
   確定したため、未検証停止ではなく導出値を検証する（監査 T1 §4.2） */
test('Color.wavelengthToColor returns Colors.java piecewise values', async () => {
  const p = await first('print(Color.wavelengthToColor(440)); print(Color.wavelengthToColor(490)); print(Color.wavelengthToColor(500)); print(Color.wavelengthToColor(510)); print(Color.wavelengthToColor(580)); print(Color.wavelengthToColor(645)); print(Color.wavelengthToColor(380)); print(Color.wavelengthToColor(300));');
  assert.deepEqual(outputs(p), ['blue', 'cyan', '#00ff92', 'green', 'yellow', 'red', '#610061', 'black']);
});

test('IJ.getFullVersion stops as unverified (exact format not in the sources)', async () => {
  await stopsWith('print(IJ.getFullVersion());', /未検証：IJ\.getFullVersion/, /書式/);
});

/* 統合時の追加検証（Tools.java 取得で確定した Array.resample） */
test("統合: Array.resample は Tools.resampleArray の線形補間そのまま", async () => {
  const p1 = await first('a = newArray(0, 10, 20); b = Array.resample(a, 5); print(b[1] + "," + b[3]);');
  assert.deepEqual(outputs(p1), ["5,15"]);
  // 長さ1への resample は元の末尾要素（factor=0 で補間ループが回らない実挙動）
  const p2 = await first('a = newArray(0, 10, 20); b = Array.resample(a, 1); print(b[0]);');
  assert.deepEqual(outputs(p2), ["20"]);
  // 元が長さ1なら全要素その値（newArray(7) は長さ7のゼロ配列なので deleteIndex で長さ1にする）
  const p3 = await first('a = Array.deleteIndex(newArray(7, 8), 1); b = Array.resample(a, 3); print(b[0] + "," + b[2]);');
  assert.deepEqual(outputs(p3), ["7,7"]);
  const ng = await run("a = newArray(1, 2); b = Array.resample(a, 0);");
  assert.ok(errors(ng).some((m) => /Array\.resample/.test(m)), JSON.stringify(errors(ng)));
});
