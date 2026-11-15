import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

// 修正バッチ2（ImageJ班）: narrcheck NX-N7/N11/N12/N13/N20/N21、
// reffix検証 D1-1（.length 項目追加）、D2-7 追随（String.format の未確認停止）の回帰テスト。
const d = getDefinition('imagej');
const run = async (code, model) => d.simulate(code, model || structuredClone(d.model.defaults));
const errors = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const first = async (code, model) => {
  const r = await run(code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r.paths?.length));
  return r.paths[0];
};
const texts = (p) => p.trace.map((t) => t.text);
const outputs = (p) => p.outputs.map((o) => o.text);

/* NX-N7: 三項演算子は選ばれた側だけを評価する */
test('NX-N7 ternary evaluates only the selected branch (true side)', async () => {
  const p = await first('function f() { print("f called"); return 1; }\nfunction g() { print("g called"); return 2; }\nx = (1 == 1) ? f() : g();\nprint(x);');
  assert.deepEqual(outputs(p), ['f called', '1']);
  assert.ok(!texts(p).some((t) => t.includes('g()') || t.includes('g called')), JSON.stringify(texts(p)));
  assert.equal(p.vars.x, '1');
});
test('NX-N7 ternary evaluates only the selected branch (false side)', async () => {
  const p = await first('function f() { print("f called"); return 1; }\nfunction g() { print("g called"); return 2; }\nx = (1 == 0) ? f() : g();\nprint(x);');
  assert.deepEqual(outputs(p), ['g called', '2']);
  assert.ok(!texts(p).some((t) => t.includes('f called')), JSON.stringify(texts(p)));
  assert.equal(p.vars.x, '2');
});
test('NX-N7 error in the unselected branch does not stop execution', async () => {
  const p = await first('arr = newArray(10, 20);\nx = (1 == 1) ? 10 : arr[99];\nprint(x);');
  assert.deepEqual(outputs(p), ['10']);
  assert.equal(p.vars.x, '10');
});
test('NX-N7 error in the selected branch still stops execution', async () => {
  const r = await run('arr = newArray(10, 20);\nx = (1 == 0) ? 10 : arr[99];\nprint(x);');
  assert.ok(errors(r).length);
  assert.ok(!r.paths.some((p) => outputs(p).includes('10')));
});
test('NX-N7 sibling: speculative string-context probe does not re-execute calls', async () => {
  // 代入右辺の文字列判定（推測評価）が f()[0] や添字内の呼び出しを二重実行しないこと
  const p = await first('function f() { print("f called"); return newArray("a", "b"); }\nx = f()[0];\nprint(x);');
  assert.deepEqual(outputs(p), ['f called', 'a']);
  const q = await first('function f() { print("f called"); return 0; }\narr = newArray(10, 20);\nx = (1 == 1) ? arr[f()] : 99;\nprint(x);');
  assert.deepEqual(outputs(q), ['f called', '10']);
});

/* NX-N11: 打ち切り直後に「終了します」と断定しない */
test('NX-N11 100-iteration cap emits no false termination step (while)', async () => {
  const p = await first('i = 0;\nwhile (i < 150) { i++; }\nprint(i);');
  assert.ok(texts(p).some((t) => t.includes('100回で説明を打ち切りました')), JSON.stringify(texts(p)));
  assert.ok(!texts(p).some((t) => t.includes('終了します')), JSON.stringify(texts(p)));
  assert.deepEqual(outputs(p), []);
});
test('NX-N11 100-iteration cap emits no false termination step (for)', async () => {
  const p = await first('for (i = 0; i < 500; i++) { }\nprint("done");');
  assert.ok(texts(p).some((t) => t.includes('打ち切り')));
  assert.ok(!texts(p).some((t) => t.includes('終了します')), JSON.stringify(texts(p)));
});
test('NX-N11 undetermined-condition truncated path does not claim termination', async () => {
  const r = await run('x = getNumber("x", 0);\ni = 0;\nwhile (i < x) { i++; }\nprint(i);');
  const truncated = r.paths.filter((p) => texts(p).some((t) => t.includes('以降の状態は確定できません')));
  assert.ok(truncated.length >= 1, '打ち切りパスがありません');
  for (const p of truncated) assert.ok(!texts(p).some((t) => t.includes('終了します')), JSON.stringify(texts(p)));
});
test('NX-N11 nested truncation suppresses termination steps at both levels', async () => {
  const p = await first('for (a = 0; a < 3; a++) {\n  j = 0;\n  while (j < 150) { j++; }\n}\nprint("done");');
  assert.ok(texts(p).some((t) => t.includes('打ち切り')));
  assert.ok(!texts(p).some((t) => t.includes('終了します')), JSON.stringify(texts(p)));
});
test('NX-N11 normally finished loop still reports its total count', async () => {
  const p = await first('i = 0;\nwhile (i < 3) { i++; }\nprint(i);');
  assert.ok(texts(p).some((t) => t.includes('繰り返しは全 3 回で終了します')), JSON.stringify(texts(p)));
  assert.deepEqual(outputs(p), ['3']);
});

/* NX-N12: 分布を持たない画像のビット変換で値域を断定しない */
test('NX-N12 run("8-bit") on a distribution-less image states the range is undetermined', async () => {
  const p = await first('open("/model/input/image2.tif");\nprint(bitDepth());\nrun("8-bit");\nprint(bitDepth());');
  const step = texts(p).find((t) => t.includes('8 ビットに変換します'));
  assert.ok(step, JSON.stringify(texts(p)));
  assert.match(step, /現在の値の範囲はモデルでは未確定です/);
  assert.doesNotMatch(step, /現在の値の範囲（/);
  assert.deepEqual(outputs(p), ['16', '8']);
});
test('NX-N12 conversion with a known distribution still quotes the real range', async () => {
  const p = await first('run("16-bit");\nrun("8-bit");');
  const step = texts(p).find((t) => t.includes('8 ビットに変換します'));
  assert.ok(step, JSON.stringify(texts(p)));
  assert.match(step, /現在の値の範囲（0〜255）が 0〜255 に換算されます/);
});

/* NX-N13: saveAs は保存先が未確定なら断定ステップを出さずに止まる */
test('NX-N13 saveAs with undetermined path emits no save assertion before stopping', async () => {
  const r = await run('dir2 = getDirectory("no-such-key");\nsaveAs("Tiff", dir2 + "x.tif");\nprint("after");');
  assert.ok(errors(r).some((e) => /未確認：保存先のパスが未確定です/.test(e.message)), JSON.stringify(errors(r)));
  const p = r.paths[0];
  assert.ok(!texts(p).some((t) => t.includes('保存します')), JSON.stringify(texts(p)));
  assert.deepEqual(outputs(p), []);
});
test('NX-N13 saveAs("Results", ...) with undetermined path also stops first', async () => {
  const r = await run('dir2 = getDirectory("no-such-key");\nsaveAs("Results", dir2 + "r.csv");\nprint("after");');
  assert.ok(errors(r).length);
  assert.ok(!texts(r.paths[0]).some((t) => t.includes('保存します')), JSON.stringify(texts(r.paths[0])));
});
test('NX-N13 saveAs with a determined path still saves and explains', async () => {
  const p = await first('dir = getDirectory("保存先フォルダを選んでください");\nsaveAs("Tiff", dir + "x.tif");\nprint(File.exists("/model/output/x.tif"));');
  assert.ok(texts(p).some((t) => t.includes('保存します')), JSON.stringify(texts(p)));
  assert.deepEqual(outputs(p), ['1']);
});

/* NX-N20: getPixel は画素値の由来（コードの書き込み／モデルの既定）を区別する */
test('NX-N20 getPixel distinguishes code-written pixels from model-preset pixels', async () => {
  const p = await first('setPixel(3, 4, 77); print(getPixel(3, 4)); print(getPixel(0, 0));');
  const written = texts(p).find((t) => t.includes('(3, 4)') && t.includes('を読みます'));
  const preset = texts(p).find((t) => t.includes('(0, 0)') && t.includes('を読みます'));
  assert.match(written, /画素値 77（このコードで書き込んだ値）を読みます/);
  assert.match(preset, /画素値 100（モデルで予め与えられた値）を読みます/);
  assert.deepEqual(outputs(p), ['77', '100']);
});
test('NX-N20 preset pixel of an opened model file is not described as code-written', async () => {
  const p = await first('open("/model/input/image1.tif"); print(getPixel(0, 0));');
  const step = texts(p).find((t) => t.includes('(0, 0)') && t.includes('を読みます'));
  assert.match(step, /画素値 10（モデルで予め与えられた値）を読みます/);
  assert.deepEqual(outputs(p), ['10']);
});
test('NX-N20 changeValues-transformed preset pixel counts as code-written value', async () => {
  const p = await first('changeValues(90, 110, 7); print(getPixel(0, 0));');
  const step = texts(p).find((t) => t.includes('(0, 0)') && t.includes('を読みます'));
  assert.match(step, /画素値 7（このコードで書き込んだ値）を読みます/);
  assert.deepEqual(outputs(p), ['7']);
});

/* NX-N21: for の var 初期化でも開始ステップに初期化内容を表示する */
test('NX-N21 for with var initialization shows the initializer, not a placeholder', async () => {
  const p = await first('for (var i = 0; i < 3; i++) { print(i); }');
  assert.ok(texts(p).some((t) => t.includes('for の繰り返しに入ります（var i = 0）')), JSON.stringify(texts(p)));
  assert.ok(!texts(p).some((t) => t.includes('（…）')), JSON.stringify(texts(p)));
  assert.deepEqual(outputs(p), ['0', '1', '2']);
});
test('NX-N21 for with multiple var declarations shows all of them', async () => {
  const p = await first('for (var i = 1, j = 2; i < 2; i++) { print(i + j); }');
  assert.ok(texts(p).some((t) => t.includes('（var i = 1, var j = 2）')), JSON.stringify(texts(p)));
  assert.deepEqual(outputs(p), ['3']);
});

/* D1-1: .length プロパティの独立項目（関数形 lengthOf とは別表面） */
test('D1-1 .length has its own supported reference item distinct from lengthOf', () => {
  const byName = new Map(d.reference.map((r) => [r.name, r]));
  const item = byName.get('.length');
  assert.ok(item, '.length 項目がありません');
  assert.equal(item.supported, true);
  assert.ok(item.description && item.returns && item.example && item.caution, '必須フィールド不足');
  assert.match(item.description, /lengthOf/, 'lengthOf との区別が明記されていません');
  assert.match(item.description, /\.length/);
  assert.ok(item.source && item.source.includes('imagej.net'), '出典がありません');
  assert.ok(byName.has('lengthOf'), 'lengthOf 項目がありません');
  assert.equal(d.reference.length, 201);
});
test('D1-1 .length example in the reference runs and returns string/array lengths', async () => {
  const item = d.reference.find((r) => r.name === '.length');
  const p = await first(item.example);
  assert.deepEqual(outputs(p), ['6', '3']);
});
test('D1-1 .length values match lengthOf for strings and arrays', async () => {
  const p = await first('a = newArray(1, 2, 3); print(a.length); print(lengthOf(a)); s = "hello"; print(s.length); print(lengthOf(s));');
  assert.deepEqual(outputs(p), ['3', '3', '5', '5']);
});

/* D2-7 追随: SIM_EXTRA のみの7件目は String.format。項目化せず、未対応で停止するのが正
   （R29-N4 で接頭辞を実体に合わせ「未対応：」へ統一。旧文言は「未確認：〜未対応です」の混在だった） */
test('D2-7 String.format is not itemized and stops as unsupported like the other SIM_EXTRA names', async () => {
  assert.ok(!d.reference.some((r) => r.name === 'String.format'), 'String.format は項目化しない裁定です');
  const r = await run('s = String.format("%d", 1);\nprint("after");');
  assert.ok(errors(r).some((e) => /未対応：String\.format はモデルで未対応です/.test(e.message)), JSON.stringify(errors(r)));
  assert.ok(!r.paths.some((p) => outputs(p).includes('after')));
});
