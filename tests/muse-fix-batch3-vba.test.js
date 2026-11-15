import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { readFileSync } from 'node:fs';

// 修正バッチ3（VBA班）: R24-N17 — LBound／UBound の次元引数。
// 一次情報: VBA-Docs「UBound function」「LBound function」—
// 構文は UBound(arrayname, [dimension])／LBound(arrayname, [dimension])、
// dimension 省略時は 1。本アプリの配列は1次元のみのため、有効な次元は1だけ、
// 範囲外の次元はエラー9（添字が範囲を超えている）、
// 450（引数の数が一致していません）は個数が実際に合わない場合だけ。
const d = getDefinition('vba');
const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const first = async (code) => {
  const r = await run(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const outputs = async (code) => (await first(code)).outputs.map((o) => o.text);
const errCode = async (code) => {
  const r = await run(code);
  const e = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)[0];
  return e?.code;
};

test('R24-N17 UBound(x, 1) returns the upper bound of dimension 1', async () => {
  assert.deepEqual(await outputs('x = Array(5, 6, 7)\nDebug.Print UBound(x, 1)'), ['2']);
});
test('R24-N17 LBound(x, 1) returns the lower bound of dimension 1', async () => {
  assert.deepEqual(await outputs('x = Array(5, 6, 7)\nDebug.Print LBound(x, 1)'), ['0']);
});
test('R24-N17 For loop over LBound(x, 1) To UBound(x, 1) works', async () => {
  assert.deepEqual(
    await outputs('x = Array(5, 6, 7)\ns = 0\nFor i = LBound(x, 1) To UBound(x, 1)\n  s = s + x(i)\nNext i\nDebug.Print s'),
    ['18'],
  );
});
test('R24-N17 explicit bounds and Option Base are honoured with dimension 1', async () => {
  assert.deepEqual(await outputs('Dim a(2 To 4) As Long\nDebug.Print LBound(a, 1), UBound(a, 1)'), ['2, 4']);
  assert.deepEqual(await outputs('Option Base 1\nDim a(3) As Long\nDebug.Print LBound(a, 1), UBound(a, 1)'), ['1, 3']);
});
test('R24-N17 empty Array() with dimension 1 keeps LBound 0 / UBound -1', async () => {
  assert.deepEqual(await outputs('x = Array()\nDebug.Print LBound(x, 1), UBound(x, 1)'), ['0, -1']);
});
test('R24-N17 dimension 2 on a 1-D array is error 9, not 450', async () => {
  assert.equal(await errCode('x = Array(5, 6, 7)\nDebug.Print UBound(x, 2)'), 9);
  assert.equal(await errCode('x = Array(5, 6, 7)\nDebug.Print LBound(x, 2)'), 9);
});
test('R24-N17 dimension 0 and negative dimensions are error 9, not 450', async () => {
  assert.equal(await errCode('x = Array(5, 6, 7)\nDebug.Print UBound(x, 0)'), 9);
  assert.equal(await errCode('x = Array(5, 6, 7)\nDebug.Print UBound(x, -1)'), 9);
});
test('R24-N17 three arguments remain a genuine 450 count error', async () => {
  assert.equal(await errCode('x = Array(5, 6, 7)\nDebug.Print UBound(x, 1, 1)'), 450);
});
test('R24-N17 Err.Number sees 9 for a bad dimension under On Error Resume Next', async () => {
  assert.deepEqual(
    await outputs('On Error Resume Next\nx = Array(5, 6, 7)\ny = UBound(x, 2)\nDebug.Print Err.Number'),
    ['9'],
  );
  assert.deepEqual(
    await outputs('On Error Resume Next\nx = Array(5, 6, 7)\ny = UBound(x, 1)\nDebug.Print y, Err.Number'),
    ['2, 0'],
  );
});
test('R24-N17 dimension is a Long argument (banker rounding before the range check)', async () => {
  assert.deepEqual(await outputs('x = Array(5, 6, 7)\nDebug.Print UBound(x, 1.4)'), ['2']);
  assert.equal(await errCode('x = Array(5, 6, 7)\nDebug.Print UBound(x, 1.5)'), 9);
});
test('R24-N17 non-array first argument stays error 13 with a dimension', async () => {
  assert.equal(await errCode('x = 5\nDebug.Print UBound(x, 1)'), 13);
});
test('R24-N17 unallocated dynamic array with dimension 1 stays error 9', async () => {
  assert.equal(await errCode('Dim a() As Long\nDebug.Print UBound(a, 1)'), 9);
});
test('R24-N17 omitted dimension still works (unchanged behaviour)', async () => {
  assert.deepEqual(await outputs('x = Array(5, 6, 7)\nDebug.Print UBound(x), LBound(x)'), ['2, 0']);
});
test('R24-N17 IsNull/IsEmpty arity is unchanged (2 args still 450)', async () => {
  assert.equal(await errCode('Debug.Print IsNull(1, 2)'), 450);
});

/* リファレンス文面と実装の一致 */
test('R24-N17 reference syntax shows the optional dimension for LBound/UBound', () => {
  const lb = d.reference.find((r) => r.name === 'LBound');
  const ub = d.reference.find((r) => r.name === 'UBound');
  assert.equal(lb.syntax, 'LBound(配列, [次元])');
  assert.equal(ub.syntax, 'UBound(配列, [次元])');
  assert.match(lb.caution, /次元は省略でき/);
  assert.match(ub.caution, /次元は省略でき/);
  assert.match(lb.caution, /エラー9/);
  assert.match(ub.caution, /エラー9/);
});
test('R24-N17 reference examples for LBound/UBound still run', async () => {
  for (const name of ['LBound', 'UBound']) {
    const item = d.reference.find((r) => r.name === name);
    const p = await first(item.example);
    assert.ok(!p.error, `${name}: ${JSON.stringify(p.error)}`);
    assert.equal(p.outputs.length, 1);
  }
});
test('R24-N17 reference-r2.json rows for LBound/UBound match the definitions', () => {
  // sha256 本体の再計算（fields をキーソートした JSON の正規方式）は Python 側で
  // 全917行の再現を確認済み。ここでは定義実体と個票の文面一致を固定する。
  const rows = JSON.parse(readFileSync(new URL('../docs/audit/reference-r2.json', import.meta.url), 'utf8'));
  for (const name of ['LBound', 'UBound']) {
    const item = d.reference.find((r) => r.name === name);
    const row = rows.find((r) => r.kind === 'vba' && r.name === name);
    assert.ok(row, `${name} の個票行がありません`);
    assert.equal(row.fields.description, item.description);
    assert.equal(row.fields.caution, item.caution);
    assert.equal(row.fields.example, item.example);
    assert.equal(row.fields.returns, item.returns);
    assert.equal(row.fields.source, item.source);
    assert.match(row.sha256, /^[0-9a-f]{64}$/);
  }
});
